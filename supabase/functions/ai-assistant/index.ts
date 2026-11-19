import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const HUMOR_INSTRUCTIONS: Record<string, string> = {
  mild:
    "Use um tom leve e amigavel, com observacoes diretas, sinceras e dicas praticas de economia.",
  sarcastic_friendly:
    "Use um tom ironico, leve e espirituoso, sempre acompanhado de opiniao sincera e dicas praticas baseadas nos numeros reais do mes.",
  roast:
    "Use humor ironico e afiado para comentar gastos por impulso e faturas apertadas, mantendo respeito, opiniao clara e recomendacoes praticas.",
};

function sanitizeNoDash(text: string): string {
  return text.replace(/[—–]/g, ",");
}

function buildFingerprint(context: Record<string, unknown>): string {
  const curr = (context.current_month ?? {}) as Record<string, unknown>;
  const cards = Array.isArray(context.credit_cards) ? context.credit_cards : [];
  const raw = JSON.stringify({
    inc: curr.income_total ?? 0,
    exp: curr.expenses_total ?? 0,
    card: curr.credit_card_total ?? 0,
    cats: context.top_categories ?? [],
    cards: cards.map((c) => ({
      n: (c as Record<string, unknown>).name,
      s: (c as Record<string, unknown>).spent,
      u: (c as Record<string, unknown>).unpaid,
    })),
  });

  let hash = 0;
  for (let i = 0; i < raw.length; i += 1) {
    hash = (hash * 31 + raw.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16);
}

async function callGemini({
  apiKey,
  model,
  systemInstruction,
  contents,
  jsonMode = false,
}: {
  apiKey: string;
  model: string;
  systemInstruction: string;
  contents: Array<{ role: string; parts: Array<{ text: string }> }>;
  jsonMode?: boolean;
}) {
  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body: Record<string, unknown> = {
    systemInstruction: {
      parts: [{ text: systemInstruction }],
    },
    contents,
    generationConfig: {
      temperature: 0.75,
      maxOutputTokens: jsonMode ? 450 : 320,
      ...(/gemini-2\.5/i.test(model)
        ? { thinkingConfig: { thinkingBudget: 0 } }
        : {}),
      ...(jsonMode ? { responseMimeType: "application/json" } : {}),
    },
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API erro (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  if (!text) {
    throw new Error("Resposta vazia da Gemini API.");
  }
  return sanitizeNoDash(text.trim());
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY") ?? "";
    const geminiModel = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash-lite";

    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY nao configurada nos Secrets." }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Nao autenticado." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json();
    const action = payload.action || "chat";
    const month = Number(payload.month) || new Date().getMonth() + 1;
    const year = Number(payload.year) || new Date().getFullYear();
    const humorLevel = String(payload.humorLevel || "sarcastic_friendly");

    const { data: contextData, error: ctxErr } = await supabase.rpc(
      "get_ai_financial_context",
      { p_month: month, p_year: year },
    );

    if (ctxErr) throw ctxErr;

    const humorPrompt =
      HUMOR_INSTRUCTIONS[humorLevel] || HUMOR_INSTRUCTIONS.sarcastic_friendly;

    const baseRules = [
      "Voce e a FinanscIA, assistente financeira do Finans em portugues do Brasil (BRL).",
      humorPrompt,
      "Seja muito breve e direto: responda saudacoes simples (como 'Oi') em apenas 1 frase curta e leve sem citar numeros. Em perguntas financeiras, responda em no maximo 1 a 2 paragrafos curtos com humor ironico e 1 dica pratica objetiva usando apenas os dados reais do JSON abaixo.",
      "Nunca invente valores ou cartoes. Nunca use travessoes.",
      `Contexto financeiro atual:\n${JSON.stringify(contextData)}`,
    ].join("\n\n");

    if (action === "insights") {
      const forceRefresh = Boolean(payload.forceRefresh);
      const fingerprint = buildFingerprint(contextData ?? {});

      if (!forceRefresh) {
        const { data: cached } = await supabase
          .from("ai_insights")
          .select("*")
          .eq("user_id", user.id)
          .eq("competence_month", month)
          .eq("competence_year", year)
          .eq("insight_type", "monthly_diagnosis")
          .maybeSingle();

        if (
          cached &&
          cached.context_fingerprint === fingerprint &&
          new Date(cached.expires_at).getTime() > Date.now()
        ) {
          return new Response(
            JSON.stringify({ insight: cached, cached: true }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
      }

      const prompt = [
        "Gere um diagnostico financeiro proativo para este mes em JSON valido com as chaves:",
        '{ "title": string (curto, ate 6 palavras), "summary": string (2 a 3 frases bem-humoradas e objetivas analisando saldo, maior categoria ou comparacao com mes anterior), "tips": string[] (exatamente 3 dicas curtas e acionaveis para economizar), "pill": string (1 frase curta para notificacao push) }',
      ].join("\n");

      const rawJson = await callGemini({
        apiKey: geminiApiKey,
        model: geminiModel,
        systemInstruction: baseRules,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        jsonMode: true,
      });

      const parsed = JSON.parse(rawJson);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const record = {
        user_id: user.id,
        competence_month: month,
        competence_year: year,
        insight_type: "monthly_diagnosis",
        title: sanitizeNoDash(String(parsed.title || "Pulso do mes")),
        summary: sanitizeNoDash(String(parsed.summary || "")),
        tips: Array.isArray(parsed.tips)
          ? parsed.tips.slice(0, 3).map((t) => sanitizeNoDash(String(t)))
          : [],
        context_fingerprint: fingerprint,
        expires_at: expiresAt,
      };

      await supabase
        .from("ai_insights")
        .upsert(record, {
          onConflict: "user_id,competence_month,competence_year,insight_type",
        });

      return new Response(
        JSON.stringify({
          insight: record,
          pill: sanitizeNoDash(String(parsed.pill || "")),
          cached: false,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const userMessage = sanitizeNoDash(String(payload.message || "").trim());
    if (!userMessage) {
      return new Response(JSON.stringify({ error: "Mensagem vazia." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: recentHistory } = await supabase
      .from("ai_messages")
      .select("role, content")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    const historyTurns = (recentHistory ?? []).reverse().map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const reply = await callGemini({
      apiKey: geminiApiKey,
      model: geminiModel,
      systemInstruction: baseRules,
      contents: [
        ...historyTurns,
        { role: "user", parts: [{ text: userMessage }] },
      ],
    });

    await supabase.from("ai_messages").insert([
      { user_id: user.id, role: "user", content: userMessage },
      { user_id: user.id, role: "assistant", content: reply },
    ]);

    return new Response(JSON.stringify({ reply, mode: "gemini" }), {
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
