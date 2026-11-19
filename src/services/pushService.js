import { calculateCardInvoiceStats } from "../lib/financeRules";
import { formatCurrency } from "../lib/formatters";
import { supabase } from "../lib/supabase";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function getNotificationEnvironment() {
  if (typeof window === "undefined") {
    return {
      supportsNotifications: false,
      supportsServiceWorker: false,
      supportsPushManager: false,
      permission: "default",
      isStandalone: false,
      needsAppleHomeScreen: false,
    };
  }

  const supportsNotifications = "Notification" in window;
  const supportsServiceWorker = "serviceWorker" in navigator;
  const supportsPushManager = "PushManager" in window;
  const permission = supportsNotifications ? Notification.permission : "denied";
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

  const ua = navigator.userAgent || "";
  const isAppleHandheld =
    /iPhone|iPad|iPod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  return {
    supportsNotifications,
    supportsServiceWorker,
    supportsPushManager,
    permission,
    isStandalone,
    needsAppleHomeScreen: isAppleHandheld && !isStandalone,
  };
}

export async function sendLocalNotification({
  title,
  body,
  tag = "finans-alert",
  url = "/",
}) {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return false;
  }

  if ("serviceWorker" in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, {
        body,
        icon: "/pwa-192x192.png",
        badge: "/pwa-192x192.png",
        tag,
        renotify: false,
        data: { url },
      });
      return true;
    } catch {
      // fallback para Notification padrao
    }
  }

  try {
    new Notification(title, {
      body,
      icon: "/pwa-192x192.png",
      tag,
    });
    return true;
  } catch {
    return false;
  }
}

export async function enableDeviceNotifications({ userId }) {
  const env = getNotificationEnvironment();
  if (!env.supportsNotifications) {
    throw new Error("Este navegador não suporta notificações.");
  }

  const permission =
    Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();

  if (permission !== "granted") {
    return { granted: false, pushSubscribed: false, permission };
  }

  let pushSubscribed = false;
  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;

  if (
    userId &&
    vapidPublicKey &&
    env.supportsServiceWorker &&
    env.supportsPushManager
  ) {
    try {
      const reg = await navigator.serviceWorker.ready;
      let subscription = await reg.pushManager.getSubscription();
      if (!subscription) {
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      }

      const json = subscription.toJSON();
      if (json.endpoint && json.keys?.p256dh && json.keys?.auth) {
        await supabase.from("push_subscriptions").upsert(
          {
            user_id: userId,
            endpoint: json.endpoint,
            p256dh: json.keys.p256dh,
            auth: json.keys.auth,
            user_agent: navigator.userAgent.slice(0, 240),
          },
          { onConflict: "user_id,endpoint" },
        );
        pushSubscribed = true;
      }
    } catch {
      // Notificacoes locais continuam disponiveis mesmo sem VAPID
    }
  }

  return { granted: true, pushSubscribed, permission };
}

export async function disableDeviceNotifications({ userId }) {
  if (!("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager?.getSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      if (userId && endpoint) {
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("user_id", userId)
          .eq("endpoint", endpoint);
      }
    }
  } catch {
    // ignora falha de limpeza de endpoint
  }
}

export async function sendTestNotification() {
  const localOk = await sendLocalNotification({
    title: "Finans",
    body: "Alertas ativos. Você receberá avisos de metas, faturas e da FinanscIA.",
    tag: `finans-test-${Date.now()}`,
  });

  let remoteDelivered = 0;
  try {
    const { data } = await supabase.functions.invoke("send-push", {
      body: { mode: "test" },
    });
    remoteDelivered = Number(data?.delivered || 0);
  } catch {
    // Edge Function opcional caso ainda nao implantada
  }

  return { localOk, remoteDelivered };
}

async function tryLogNotificationOnce({ userId, dedupeKey, title, body }) {
  const { data: existing } = await supabase
    .from("notification_logs")
    .select("id")
    .eq("user_id", userId)
    .eq("dedupe_key", dedupeKey)
    .maybeSingle();

  if (existing) return false;

  const { error } = await supabase.from("notification_logs").insert([
    {
      user_id: userId,
      dedupe_key: dedupeKey,
      title,
      body,
    },
  ]);

  return !error;
}

export async function evaluateAndTriggerSmartAlerts({
  userId,
  preferences,
  creditCards = [],
  expenses = [],
  recurringExpenses = [],
  selectedMonth,
  selectedYear,
}) {
  if (
    !userId ||
    !preferences?.notifications_enabled ||
    !("Notification" in window) ||
    Notification.permission !== "granted"
  ) {
    return;
  }

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  if (
    Number(selectedMonth) !== currentMonth ||
    Number(selectedYear) !== currentYear
  ) {
    return;
  }

  for (const card of creditCards) {
    const stats = calculateCardInvoiceStats({
      card,
      expenses,
      recurringExpenses,
      month: currentMonth,
      year: currentYear,
      now,
    });

    if (stats.goal > 0 && stats.total >= stats.goal && preferences.notify_card_goal_100) {
      const key = `card_100:${card.id}:${currentYear}-${currentMonth}`;
      const title = `${card.name} bateu 100% da meta`;
      const body = `Fatura em ${formatCurrency(stats.total)} (meta de ${formatCurrency(stats.goal)}). Hora de segurar o cartão.`;
      const canSend = await tryLogNotificationOnce({
        userId,
        dedupeKey: key,
        title,
        body,
      });
      if (canSend) {
        await sendLocalNotification({ title, body, tag: key });
      }
    } else if (
      stats.goal > 0 &&
      stats.total >= stats.goal * 0.75 &&
      preferences.notify_card_goal_75
    ) {
      const key = `card_75:${card.id}:${currentYear}-${currentMonth}`;
      const title = `${card.name} chegou em ${Math.round(stats.rawGoalPct)}% da meta`;
      const body = `Já foram ${formatCurrency(stats.total)} de ${formatCurrency(stats.goal)}. Olho vivo até o fechamento dia ${card.closing_day}.`;
      const canSend = await tryLogNotificationOnce({
        userId,
        dedupeKey: key,
        title,
        body,
      });
      if (canSend) {
        await sendLocalNotification({ title, body, tag: key });
      }
    }

    if (
      preferences.notify_invoice_closing &&
      !stats.isPaid &&
      stats.total > 0 &&
      now.getDate() >= Number(card.closing_day)
    ) {
      const key = `invoice_closed:${card.id}:${currentYear}-${currentMonth}`;
      const title = `Fatura ${card.name} fechada`;
      const body = `Total de ${formatCurrency(stats.unpaidTotal)} aguardando pagamento.`;
      const canSend = await tryLogNotificationOnce({
        userId,
        dedupeKey: key,
        title,
        body,
      });
      if (canSend) {
        await sendLocalNotification({ title, body, tag: key });
      }
    }
  }
}
