import { getProviderMeta } from "../lib/aiProviders";
import { MONTHS } from "../lib/constants";
import {
  calculateCardInvoiceStats,
  calculateCategoryDistribution,
  isRecurringActiveInPeriod,
} from "../lib/financeRules";
import { formatCurrency } from "../lib/formatters";
import { supabase } from "../lib/supabase";

const BYOK_EVENT = "finans:byok-updated";
const REQUEST_TIMEOUT_MS = 7000;
const DISCOVERY_TIMEOUT_MS = 5000;
const SUPABASE_TIMEOUT_MS = 2000;
const CONTEXT_CACHE_TTL_MS = 30000;

const contextCache = new Map();

function getStorageKey(userId) {
  return `finans_byok_v3:${userId || "default"}`;
}

function getDefaultByokState() {
  return {
    provider: "gemini",
    keys: {
      gemini: "",
      groq: "",
      openai: "",
      anthropic: "",
    },
    autoModels: {},
  };
}

export function getByokConfig(userId) {
  const defaults = getDefaultByokState();
  if (typeof window === "undefined") return defaults;

  try {
    const rawV3 = localStorage.getItem(getStorageKey(userId));
    if (rawV3) {
      const parsed = JSON.parse(rawV3);
      return {
        provider: parsed.provider || defaults.provider,
        keys: { ...defaults.keys, ...(parsed.keys || {}) },
        autoModels: { ...(parsed.autoModels || {}) },
      };
    }

    // Migra provedor e chaves de v2/v1 descartando modelos lentos em cache antigo
    const legacyRaw =
      localStorage.getItem(`finans_byok_v2:${userId || "default"}`) ||
      localStorage.getItem(`finans_byok_v1:${userId || "default"}`);
    if (!legacyRaw) return defaults;

    const legacyParsed = JSON.parse(legacyRaw);
    const migrated = {
      provider: legacyParsed.provider || defaults.provider,
      keys: { ...defaults.keys, ...(legacyParsed.keys || {}) },
      autoModels: {},
    };
    localStorage.setItem(getStorageKey(userId), JSON.stringify(migrated));
    return migrated;
  } catch {
    return defaults;
  }
}

export function saveByokConfig(userId, updater) {
  const current = getByokConfig(userId);
  const next =
    typeof updater === "function" ? updater(current) : { ...current, ...updater };

  localStorage.setItem(getStorageKey(userId), JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(BYOK_EVENT));
  return next;
}

export function removeByokKey(userId, providerId) {
  return saveByokConfig(userId, (curr) => {
    const nextAuto = { ...(curr.autoModels || {}) };
    delete nextAuto[providerId];
    return {
      ...curr,
      keys: { ...curr.keys, [providerId]: "" },
      autoModels: nextAuto,
    };
  });
}

export function subscribeByokUpdates(listener) {
  window.addEventListener(BYOK_EVENT, listener);
  return () => window.removeEventListener(BYOK_EVENT, listener);
}

export function getActiveByokCredentials(userId) {
  const cfg = getByokConfig(userId);
  const meta = getProviderMeta(cfg.provider);
  const apiKey = (cfg.keys[meta.id] || "").trim();
  return {
    configured: Boolean(apiKey),
    provider: meta.id,
    providerMeta: meta,
    apiKey,
    cachedModel: (cfg.autoModels?.[meta.id] || "").trim(),
  };
}

function sanitizeNoDash(text = "") {
  return String(text).replace(/[—–]/g, ",");
}

function parseJsonResponse(rawText) {
  const cleaned = String(rawText || "")
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
    }
    throw new Error("Não foi possível interpretar a resposta da IA.");
  }
}

async function fetchWithTimeout(url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (err) {
    if (err?.name === "AbortError") {
      const timeoutErr = new Error("Tempo limite atingido na requisição.");
      timeoutErr.isTimeout = true;
      throw timeoutErr;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function withTimeout(promise, timeoutMs = SUPABASE_TIMEOUT_MS, fallbackValue = null) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((resolve) => {
        timer = setTimeout(() => resolve(fallbackValue), timeoutMs);
      }),
    ]);
  } catch {
    return fallbackValue;
  } finally {
    clearTimeout(timer);
  }
}

function buildContextFingerprint(context = {}) {
  const curr = context.current_month ?? {};
  const cards = Array.isArray(context.credit_cards) ? context.credit_cards : [];
  const raw = JSON.stringify({
    inc: curr.income_total ?? 0,
    exp: curr.expenses_total ?? 0,
    card: curr.credit_card_total ?? 0,
    cats: context.top_categories ?? [],
    cards: cards.map((c) => ({
      n: c.name,
      s: c.spent,
      u: c.unpaid,
    })),
  });

  let hash = 0;
  for (let i = 0; i < raw.length; i += 1) {
    hash = (hash * 31 + raw.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16);
}

const HUMOR_INSTRUCTIONS = {
  mild:
    "Use um tom leve e amigável, com observações diretas, sinceras e dicas práticas de economia.",
  sarcastic_friendly:
    "Use um tom irônico, leve e espirituoso, com opinião sincera e dicas práticas baseadas nos números reais quando o assunto for finanças.",
  roast:
    "Use humor irônico e afiado para comentar gastos por impulso e faturas apertadas, mantendo respeito, opinião clara e recomendações práticas.",
};

function buildSystemPrompt({ contextData, humorLevel }) {
  const humorInstruction =
    HUMOR_INSTRUCTIONS[humorLevel] || HUMOR_INSTRUCTIONS.sarcastic_friendly;

  return [
    "Você é a FinanscIA, assistente financeira do Finans (português do Brasil, BRL).",
    humorInstruction,
    "Seja muito breve e direto: responda saudações simples (como 'Oi') em apenas 1 frase curta e leve sem citar números. Em perguntas financeiras, responda em no máximo 1 a 2 parágrafos curtos com humor irônico e 1 dica prática objetiva usando apenas os dados reais do JSON abaixo.",
    "Nunca invente valores ou cartões. Nunca use travessões.",
    `Contexto financeiro:\n${JSON.stringify(contextData)}`,
  ].join("\n\n");
}

function buildSnapshotSignature(fallbackSnapshot) {
  const kpis = fallbackSnapshot?.kpis;
  if (!kpis) return "none";
  return `${kpis.incomeTotal ?? 0}|${kpis.expensesTotal ?? 0}|${kpis.creditCardTotal ?? 0}|${kpis.recurringActiveTotal ?? 0}`;
}

function compactContextForPrompt(contextData) {
  if (!contextData || typeof contextData !== "object") return contextData;
  return {
    ...contextData,
    top_categories: Array.isArray(contextData.top_categories)
      ? contextData.top_categories.slice(0, 6)
      : [],
    recent_expenses: Array.isArray(contextData.recent_expenses)
      ? contextData.recent_expenses.slice(0, 6)
      : [],
  };
}

function buildFallbackContextFromSnapshot(month, year, fallbackSnapshot) {
  return {
    period: { month: Number(month), year: Number(year) },
    current_month: {
      income_total: fallbackSnapshot?.kpis?.incomeTotal ?? 0,
      cash_pix_total: fallbackSnapshot?.kpis?.cashPixTotal ?? 0,
      credit_card_total: fallbackSnapshot?.kpis?.creditCardTotal ?? 0,
      expenses_total: fallbackSnapshot?.kpis?.expensesTotal ?? 0,
      free_balance: fallbackSnapshot?.kpis?.freeBalance ?? 0,
      recurring_active_total: fallbackSnapshot?.kpis?.recurringActiveTotal ?? 0,
    },
    top_categories: (fallbackSnapshot?.distribution ?? []).slice(0, 6).map((c) => ({
      category: c.name,
      total: c.value,
    })),
    credit_cards: (fallbackSnapshot?.cardStats ?? []).map((c) => ({
      name: c.name,
      closing_day: c.closingDay,
      spending_goal: c.goal || null,
      spent: c.total,
      goal_pct: c.goal > 0 ? Number(c.rawGoalPct.toFixed(1)) : null,
    })),
    active_recurring: (fallbackSnapshot?.activeRecurring ?? []).map((r) => ({
      name: r.name,
      amount: r.amount,
      payment_method: r.credit_card_id ? "credit_card" : "cash_pix",
    })),
  };
}

async function fetchCompactFinancialContext({
  userId,
  month,
  year,
  fallbackSnapshot,
}) {
  const cacheKey = `${userId || "anon"}:${Number(year)}-${Number(month)}`;
  const snapshotSig = buildSnapshotSignature(fallbackSnapshot);
  const cached = contextCache.get(cacheKey);

  if (
    cached &&
    cached.snapshotSig === snapshotSig &&
    cached.expiresAt > Date.now()
  ) {
    return cached.data;
  }

  const rpcPromise = supabase
    .rpc("get_ai_financial_context", {
      p_month: Number(month),
      p_year: Number(year),
    })
    .then(({ data, error }) => (!error && data ? data : null))
    .catch(() => null);

  const rpcData = await withTimeout(rpcPromise, SUPABASE_TIMEOUT_MS, null);
  const resolved = compactContextForPrompt(
    rpcData || buildFallbackContextFromSnapshot(month, year, fallbackSnapshot),
  );

  contextCache.set(cacheKey, {
    data: resolved,
    snapshotSig,
    expiresAt: Date.now() + CONTEXT_CACHE_TTL_MS,
  });

  return resolved;
}

function createProviderHttpError(providerName, status, bodyText) {
  let detail = "";
  try {
    const parsed = JSON.parse(bodyText);
    detail =
      parsed?.error?.message ||
      parsed?.message ||
      parsed?.error ||
      "";
  } catch {
    detail = "";
  }

  const isAuth = status === 401 || status === 403;
  const message = isAuth
    ? `Chave inválida ou sem autorização em ${providerName}.`
    : status === 429
      ? `Cota ou limite atingido em ${providerName}.`
      : detail
        ? `${providerName}: ${detail}`
        : `Erro ${status} em ${providerName}.`;

  const err = new Error(message);
  err.status = status;
  err.isAuthError = isAuth;
  return err;
}

async function discoverProviderModels(provider, apiKey) {
  const cleanKey = (apiKey || "").trim();
  if (!cleanKey) return [];

  try {
    if (provider === "gemini") {
      const res = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(
          cleanKey,
        )}`,
        { method: "GET" },
        DISCOVERY_TIMEOUT_MS,
      );
      if (!res.ok) return [];
      const data = await res.json();
      const models = (data?.models || [])
        .filter(
          (m) =>
            Array.isArray(m.supportedGenerationMethods) &&
            m.supportedGenerationMethods.includes("generateContent") &&
            !/embedding|imagen|veo|tts|audio|aqa|robotics/i.test(m.name || "") &&
            /gemini/i.test(m.name || ""),
        )
        .map((m) => String(m.name).replace(/^models\//, ""));

      return models.sort((a, b) => {
        const score = (id) =>
          id.includes("flash-lite") ? 0 : id.includes("flash") ? 1 : 2;
        return score(a) - score(b);
      });
    }

    if (provider === "groq") {
      const res = await fetchWithTimeout(
        "https://api.groq.com/openai/v1/models",
        {
          method: "GET",
          headers: { Authorization: `Bearer ${cleanKey}` },
        },
        DISCOVERY_TIMEOUT_MS,
      );
      if (!res.ok) return [];
      const data = await res.json();
      const models = (data?.data || [])
        .map((m) => m.id)
        .filter(
          (id) =>
            id &&
            !/whisper|guard|tts|orpheus|playai|prompt-guard/i.test(id),
        );

      return models.sort((a, b) => {
        const score = (id) =>
          id.includes("instant") ? 0 : id.includes("llama") ? 1 : 2;
        return score(a) - score(b);
      });
    }

    if (provider === "openai") {
      const res = await fetchWithTimeout(
        "https://api.openai.com/v1/models",
        {
          method: "GET",
          headers: { Authorization: `Bearer ${cleanKey}` },
        },
        DISCOVERY_TIMEOUT_MS,
      );
      if (!res.ok) return [];
      const data = await res.json();
      const models = (data?.data || [])
        .map((m) => m.id)
        .filter(
          (id) =>
            id &&
            /^(gpt-|o1|o3|o4|chatgpt-)/i.test(id) &&
            !/realtime|audio|transcribe|tts|search|image|dall-e|embedding|whisper|moderation|instruct/i.test(
              id,
            ),
        );

      return models.sort((a, b) => {
        const score = (id) =>
          id.includes("nano") ? 0 : id.includes("mini") ? 1 : 2;
        return score(a) - score(b);
      });
    }

    if (provider === "anthropic") {
      const res = await fetchWithTimeout(
        "https://api.anthropic.com/v1/models",
        {
          method: "GET",
          headers: {
            "x-api-key": cleanKey,
            "anthropic-version": "2023-06-01",
            "anthropic-dangerous-direct-browser-access": "true",
          },
        },
        DISCOVERY_TIMEOUT_MS,
      );
      if (!res.ok) return [];
      const data = await res.json();
      const models = (data?.data || []).map((m) => m.id).filter(Boolean);
      return models.sort((a, b) => {
        const score = (id) => (id.includes("haiku") ? 0 : 1);
        return score(a) - score(b);
      });
    }
  } catch {
    return [];
  }

  return [];
}

async function invokeSingleModel({
  provider,
  apiKey,
  model,
  systemInstruction,
  messages,
  jsonMode = false,
}) {
  const meta = getProviderMeta(provider);
  const resolvedModel = String(model || "").trim();
  const cleanKey = (apiKey || "").trim();

  if (!cleanKey) {
    const err = new Error(`Configure sua API Key de ${meta.name} primeiro.`);
    err.isAuthError = true;
    throw err;
  }

  if (provider === "gemini") {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      resolvedModel,
    )}:generateContent?key=${encodeURIComponent(cleanKey)}`;

    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const res = await fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents,
        generationConfig: {
          temperature: 0.75,
          maxOutputTokens: jsonMode ? 450 : 320,
          ...(/gemini-2\.5/i.test(resolvedModel)
            ? { thinkingConfig: { thinkingBudget: 0 } }
            : {}),
          ...(jsonMode ? { responseMimeType: "application/json" } : {}),
        },
      }),
    });

    if (!res.ok) {
      throw createProviderHttpError(meta.name, res.status, await res.text());
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!text) throw new Error("Resposta vazia do Google Gemini.");
    return sanitizeNoDash(text.trim());
  }

  if (provider === "anthropic") {
    const res = await fetchWithTimeout("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": cleanKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: resolvedModel,
        max_tokens: jsonMode ? 450 : 320,
        system: jsonMode
          ? `${systemInstruction}\n\nResponda exclusivamente com JSON válido, sem markdown.`
          : systemInstruction,
        messages: messages.map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        })),
      }),
    });

    if (!res.ok) {
      throw createProviderHttpError(meta.name, res.status, await res.text());
    }

    const data = await res.json();
    const text =
      data?.content?.find((block) => block.type === "text")?.text || "";
    if (!text) throw new Error("Resposta vazia da Anthropic.");
    return sanitizeNoDash(text.trim());
  }

  const endpoint =
    provider === "groq"
      ? "https://api.groq.com/openai/v1/chat/completions"
      : "https://api.openai.com/v1/chat/completions";

  const res = await fetchWithTimeout(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cleanKey}`,
    },
    body: JSON.stringify({
      model: resolvedModel,
      temperature: 0.75,
      max_tokens: jsonMode ? 450 : 320,
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
      messages: [
        { role: "system", content: systemInstruction },
        ...messages.map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        })),
      ],
    }),
  });

  if (!res.ok) {
    throw createProviderHttpError(meta.name, res.status, await res.text());
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content || "";
  if (!text) throw new Error(`Resposta vazia de ${meta.name}.`);
  return sanitizeNoDash(text.trim());
}

async function tryCandidateModels({
  userId,
  provider,
  apiKey,
  candidates,
  cachedModel,
  systemInstruction,
  messages,
  jsonMode,
}) {
  let lastError = null;
  let consecutiveNetworkFailures = 0;

  for (const candidateModel of candidates) {
    try {
      const text = await invokeSingleModel({
        provider,
        apiKey,
        model: candidateModel,
        systemInstruction,
        messages,
        jsonMode,
      });

      if (userId && candidateModel !== cachedModel) {
        saveByokConfig(userId, (curr) => ({
          ...curr,
          autoModels: { ...(curr.autoModels || {}), [provider]: candidateModel },
        }));
      }

      return { text, modelUsed: candidateModel };
    } catch (err) {
      lastError = err;
      if (err?.isAuthError) {
        throw err;
      }

      if (err?.isTimeout || !err?.status) {
        consecutiveNetworkFailures += 1;
        if (consecutiveNetworkFailures >= 2) {
          return { error: err, networkFailed: true };
        }
      } else {
        consecutiveNetworkFailures = 0;
      }

      if (jsonMode && err?.status === 400) {
        try {
          const textFallback = await invokeSingleModel({
            provider,
            apiKey,
            model: candidateModel,
            systemInstruction: `${systemInstruction}\n\nRetorne apenas JSON válido.`,
            messages,
            jsonMode: false,
          });
          if (userId && candidateModel !== cachedModel) {
            saveByokConfig(userId, (curr) => ({
              ...curr,
              autoModels: {
                ...(curr.autoModels || {}),
                [provider]: candidateModel,
              },
            }));
          }
          return { text: textFallback, modelUsed: candidateModel };
        } catch (innerErr) {
          lastError = innerErr;
        }
      }
    }
  }

  return { error: lastError, networkFailed: false };
}

/**
 * Seleciona automaticamente o modelo mais rapido e funcional para o provedor,
 * com fallback silencioso na lista fixa e descoberta dinamica via API /models.
 */
async function invokeProviderWithFallback({
  userId,
  provider,
  apiKey,
  cachedModel = "",
  systemInstruction,
  messages,
  jsonMode = false,
}) {
  const meta = getProviderMeta(provider);
  const staticCandidates = [];

  if (cachedModel && cachedModel.trim()) {
    staticCandidates.push(cachedModel.trim());
  }
  for (const m of meta.models) {
    if (!staticCandidates.includes(m)) {
      staticCandidates.push(m);
    }
  }

  const staticAttempt = await tryCandidateModels({
    userId,
    provider,
    apiKey,
    candidates: staticCandidates,
    cachedModel,
    systemInstruction,
    messages,
    jsonMode,
  });

  if (staticAttempt.text) {
    return { text: staticAttempt.text, modelUsed: staticAttempt.modelUsed };
  }

  if (staticAttempt.networkFailed) {
    throw (
      staticAttempt.error ||
      new Error(`Sem resposta de ${meta.name}. Verifique sua conexão.`)
    );
  }

  // Se todos os modelos fixos falharam (sem ser erro de autenticacao ou rede), consulta a listagem ativa da API
  const discovered = await discoverProviderModels(provider, apiKey);
  const freshCandidates = discovered
    .filter((m) => !staticCandidates.includes(m))
    .slice(0, 4);

  if (freshCandidates.length > 0) {
    const dynamicAttempt = await tryCandidateModels({
      userId,
      provider,
      apiKey,
      candidates: freshCandidates,
      cachedModel,
      systemInstruction,
      messages,
      jsonMode,
    });

    if (dynamicAttempt.text) {
      return { text: dynamicAttempt.text, modelUsed: dynamicAttempt.modelUsed };
    }
    throw (
      dynamicAttempt.error ||
      staticAttempt.error ||
      new Error(`Falha ao consultar ${meta.name}.`)
    );
  }

  throw (
    staticAttempt.error ||
    new Error(`Nenhum modelo disponível em ${meta.name}.`)
  );
}

export async function testAiConnection({ userId, provider, apiKey }) {
  const cfg = getByokConfig(userId);
  return invokeProviderWithFallback({
    userId,
    provider,
    apiKey,
    cachedModel: cfg.autoModels?.[provider] || "",
    systemInstruction: "Responda apenas com: OK",
    messages: [{ role: "user", content: "Oi" }],
  });
}

export function buildLocalSnapshot({
  kpis,
  categories,
  creditCards,
  recurringExpenses,
  expenses,
  month,
  year,
}) {
  const monthLabel =
    MONTHS.find((m) => m.value === Number(month))?.label || String(month);
  const distribution = calculateCategoryDistribution({
    expenses,
    categories,
    recurringExpenses,
    month,
    year,
  });

  const cardStats = creditCards.map((card) => ({
    name: card.name,
    closingDay: card.closing_day,
    ...calculateCardInvoiceStats({
      card,
      expenses,
      recurringExpenses,
      month,
      year,
    }),
  }));

  return {
    month: Number(month),
    year: Number(year),
    monthLabel,
    kpis,
    distribution,
    cardStats,
    activeRecurring: recurringExpenses.filter((r) =>
      isRecurringActiveInPeriod(r, month, year),
    ),
  };
}

export async function loadAiMessages(userId) {
  if (!userId) return [];
  const res = await withTimeout(
    supabase
      .from("ai_messages")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(60),
    SUPABASE_TIMEOUT_MS,
    { data: [], error: null },
  );

  if (!res || res.error) return [];
  return res.data ?? [];
}

export async function clearAiMessages(userId) {
  if (!userId) return;
  const { error } = await supabase
    .from("ai_messages")
    .delete()
    .eq("user_id", userId);
  if (error) throw error;
}

export async function loadCachedInsight({ userId, month, year }) {
  if (!userId) return null;
  const res = await withTimeout(
    supabase
      .from("ai_insights")
      .select("*")
      .eq("user_id", userId)
      .eq("competence_month", Number(month))
      .eq("competence_year", Number(year))
      .eq("insight_type", "monthly_diagnosis")
      .maybeSingle(),
    SUPABASE_TIMEOUT_MS,
    { data: null },
  );

  return res?.data || null;
}

export function buildLocalInsight(snapshot) {
  const { kpis, distribution, cardStats, monthLabel } = snapshot;
  const top = distribution[0];
  const riskyCard = [...cardStats]
    .filter((c) => c.goal > 0)
    .sort((a, b) => b.rawGoalPct - a.rawGoalPct)[0];

  let title = `Raio X de ${monthLabel}`;
  let summary = "";

  if (kpis.incomeTotal === 0 && kpis.expensesTotal === 0) {
    title = `${monthLabel} sem lançamentos`;
    summary =
      "Nenhum lançamento registrado neste mês ainda. Adicione suas receitas e despesas para destravar a análise real.";
  } else if (kpis.freeBalance < 0) {
    title = "Saldo no vermelho";
    summary = `Seu Saldo Livre está em ${formatCurrency(kpis.freeBalance)}. Suas despesas (${formatCurrency(kpis.expensesTotal)}) já passaram das receitas.${top ? ` ${top.name} puxou ${formatCurrency(top.value)} dessa conta.` : ""}`;
  } else if (riskyCard && riskyCard.rawGoalPct >= 75) {
    title = `${riskyCard.name} em alerta`;
    summary = `Cartão em ${Math.round(riskyCard.rawGoalPct)}% da meta (${formatCurrency(riskyCard.total)}). Que tal segurar os gastos por impulso até o dia ${riskyCard.closingDay}?`;
  } else {
    title = `Contas em ordem em ${monthLabel}`;
    summary = `Sobraram ${formatCurrency(kpis.freeBalance)} de Saldo Livre.${top ? ` Sua maior categoria foi ${top.name} (${top.percLabel}, ${formatCurrency(top.value)}).` : ""}`;
  }

  const tips = [];
  if (top) {
    tips.push(
      `Corte 15% em ${top.name}, hoje responsável por ${top.percLabel} do seu mês.`,
    );
  }
  if (riskyCard && riskyCard.goal > 0) {
    tips.push(
      `Segure novas compras no ${riskyCard.name} até o fechamento no dia ${riskyCard.closingDay}.`,
    );
  }
  if (kpis.recurringActiveTotal > 0) {
    tips.push(
      `Revise suas mensalidades ativas (${formatCurrency(kpis.recurringActiveTotal)}/mês) e pause o que não usa.`,
    );
  }
  while (tips.length < 3) {
    tips.push("Guarde parte do Saldo Livre antes de começar o próximo mês.");
  }

  return {
    title,
    summary,
    tips: tips.slice(0, 3),
    source: "summary",
  };
}

export async function requestProactiveInsights({
  userId,
  month,
  year,
  humorLevel,
  forceRefresh = false,
  snapshot,
}) {
  const creds = getActiveByokCredentials(userId);
  if (!creds.configured) {
    return buildLocalInsight(snapshot);
  }

  const contextData = await fetchCompactFinancialContext({
    userId,
    month,
    year,
    fallbackSnapshot: snapshot,
  });
  const fingerprint = buildContextFingerprint(contextData);

  if (!forceRefresh && userId) {
    const cached = await loadCachedInsight({ userId, month, year });
    if (
      cached &&
      cached.context_fingerprint === fingerprint &&
      new Date(cached.expires_at).getTime() > Date.now()
    ) {
      return {
        ...cached,
        source: creds.provider,
        cached: true,
      };
    }
  }

  const systemInstruction = buildSystemPrompt({ contextData, humorLevel });
  const prompt = [
    "Gere um diagnóstico financeiro proativo para este mês em JSON válido com estas chaves exatas:",
    '{ "title": "título curto até 6 palavras", "summary": "2 a 3 frases irônicas e sinceras comentando saldo, maior categoria, cartões perto da meta ou comparação com mês anterior", "tips": ["dica prática 1", "dica prática 2", "dica prática 3"] }',
  ].join("\n");

  const { text: raw, modelUsed } = await invokeProviderWithFallback({
    userId,
    provider: creds.provider,
    apiKey: creds.apiKey,
    cachedModel: creds.cachedModel,
    systemInstruction,
    messages: [{ role: "user", content: prompt }],
    jsonMode: true,
  });

  const parsed = parseJsonResponse(raw);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const record = {
    user_id: userId,
    competence_month: Number(month),
    competence_year: Number(year),
    insight_type: "monthly_diagnosis",
    title: sanitizeNoDash(String(parsed.title || "Pulso do mês")),
    summary: sanitizeNoDash(String(parsed.summary || "")),
    tips: Array.isArray(parsed.tips)
      ? parsed.tips.slice(0, 3).map((t) => sanitizeNoDash(String(t)))
      : [],
    context_fingerprint: fingerprint,
    expires_at: expiresAt,
  };

  if (userId) {
    await withTimeout(
      supabase.from("ai_insights").upsert(record, {
        onConflict: "user_id,competence_month,competence_year,insight_type",
      }),
      SUPABASE_TIMEOUT_MS,
      null,
    );
  }

  return {
    ...record,
    source: creds.provider,
    modelUsed,
    cached: false,
  };
}

export async function sendChatMessage({
  userId,
  message,
  month,
  year,
  humorLevel,
  snapshot,
  recentMessages,
}) {
  const creds = getActiveByokCredentials(userId);
  if (!creds.configured) {
    throw new Error("Configure uma chave de API para conversar com a FinanscIA.");
  }

  const cleanMessage = sanitizeNoDash(message.trim());

  const hasInMemoryHistory = Array.isArray(recentMessages);
  const [contextData, recentRows] = await Promise.all([
    fetchCompactFinancialContext({
      userId,
      month,
      year,
      fallbackSnapshot: snapshot,
    }),
    hasInMemoryHistory
      ? Promise.resolve(recentMessages.slice(-5))
      : userId
        ? withTimeout(
            supabase
              .from("ai_messages")
              .select("role, content")
              .eq("user_id", userId)
              .order("created_at", { ascending: false })
              .limit(5),
            SUPABASE_TIMEOUT_MS,
            { data: [] },
          ).then((res) => (res?.data ?? []).reverse())
        : Promise.resolve([]),
  ]);

  const history = (recentRows ?? []).slice(-5).map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content,
  }));

  const systemInstruction = buildSystemPrompt({ contextData, humorLevel });
  const { text: reply, modelUsed } = await invokeProviderWithFallback({
    userId,
    provider: creds.provider,
    apiKey: creds.apiKey,
    cachedModel: creds.cachedModel,
    systemInstruction,
    messages: [...history, { role: "user", content: cleanMessage }],
  });

  if (userId) {
    Promise.resolve(
      supabase.from("ai_messages").insert([
        { user_id: userId, role: "user", content: cleanMessage },
        { user_id: userId, role: "assistant", content: reply },
      ]),
    ).then(
      () => {},
      () => {},
    );
  }

  return {
    reply,
    provider: creds.provider,
    modelUsed,
  };
}
