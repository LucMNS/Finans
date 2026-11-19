import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

interface PushSubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

async function deliverToSubscriptions({
  supabaseAdmin,
  subscriptions,
  payload,
}: {
  supabaseAdmin: ReturnType<typeof createClient>;
  subscriptions: PushSubscriptionRow[];
  payload: { title: string; body: string; tag: string; url?: string };
}) {
  let delivered = 0;

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload),
      );
      delivered += 1;
    } catch (err) {
      const statusCode =
        typeof err === "object" && err && "statusCode" in err
          ? Number((err as { statusCode: number }).statusCode)
          : 0;
      if (statusCode === 404 || statusCode === 410) {
        await supabaseAdmin
          .from("push_subscriptions")
          .delete()
          .eq("id", sub.id);
      }
    }
  }

  return delivered;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const vapidSubject =
      Deno.env.get("VAPID_SUBJECT") || "mailto:contato@finans.app";
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
    const cronSecret = Deno.env.get("CRON_SECRET") ?? "";

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({
          error: "VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY nao configuradas.",
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const body = await req.json().catch(() => ({}));
    const mode = body.mode || "test";

    if (mode === "test") {
      const authHeader = req.headers.get("Authorization") ?? "";
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const {
        data: { user },
        error: authErr,
      } = await userClient.auth.getUser();

      if (authErr || !user) {
        return new Response(JSON.stringify({ error: "Nao autenticado." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: subs } = await supabaseAdmin
        .from("push_subscriptions")
        .select("id, user_id, endpoint, p256dh, auth")
        .eq("user_id", user.id);

      const delivered = await deliverToSubscriptions({
        supabaseAdmin,
        subscriptions: (subs ?? []) as PushSubscriptionRow[],
        payload: {
          title: body.title || "Finans",
          body:
            body.body ||
            "Notificações Web Push ativas neste dispositivo.",
          tag: "finans-test-push",
          url: "/",
        },
      });

      return new Response(JSON.stringify({ delivered }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!cronSecret || req.headers.get("x-cron-secret") !== cronSecret) {
      return new Response(JSON.stringify({ error: "Nao autorizado." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const todayDay = now.getUTCDate();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowDay = tomorrow.getUTCDate();
    const month = now.getUTCMonth() + 1;
    const year = now.getUTCFullYear();

    const { data: prefs } = await supabaseAdmin
      .from("user_preferences")
      .select("user_id, notify_invoice_closing, notify_ai_pills")
      .eq("notifications_enabled", true);

    let totalSent = 0;

    for (const pref of prefs ?? []) {
      const { data: subs } = await supabaseAdmin
        .from("push_subscriptions")
        .select("id, user_id, endpoint, p256dh, auth")
        .eq("user_id", pref.user_id);

      if (!subs || subs.length === 0) continue;

      if (pref.notify_invoice_closing) {
        const { data: cards } = await supabaseAdmin
          .from("credit_cards")
          .select("id, name, closing_day")
          .eq("user_id", pref.user_id)
          .in("closing_day", [todayDay, tomorrowDay]);

        for (const card of cards ?? []) {
          const dedupeKey = `push_closing:${card.id}:${year}-${month}`;
          const { data: existing } = await supabaseAdmin
            .from("notification_logs")
            .select("id")
            .eq("user_id", pref.user_id)
            .eq("dedupe_key", dedupeKey)
            .maybeSingle();

          if (existing) continue;

          const title = `${card.name}: fechamento proximo`;
          const msg =
            card.closing_day === todayDay
              ? `A fatura de ${card.name} fecha hoje (dia ${card.closing_day}).`
              : `A fatura de ${card.name} fecha amanha (dia ${card.closing_day}).`;

          const count = await deliverToSubscriptions({
            supabaseAdmin,
            subscriptions: subs as PushSubscriptionRow[],
            payload: { title, body: msg, tag: dedupeKey, url: "/" },
          });

          if (count > 0) {
            await supabaseAdmin.from("notification_logs").insert([
              {
                user_id: pref.user_id,
                dedupe_key: dedupeKey,
                title,
                body: msg,
              },
            ]);
            totalSent += count;
          }
        }
      }
    }

    return new Response(JSON.stringify({ totalSent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno.";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
