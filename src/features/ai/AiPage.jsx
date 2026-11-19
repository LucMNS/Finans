import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  KeyRound,
  Lightbulb,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  User,
} from "lucide-react";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { useAuth } from "../../contexts/AuthContext";
import { useFinancialData } from "../../contexts/FinancialContext";
import { useToast } from "../../contexts/ToastContext";
import { MONTHS } from "../../lib/constants";
import { formatCurrency } from "../../lib/formatters";
import {
  buildLocalInsight,
  buildLocalSnapshot,
  clearAiMessages,
  getActiveByokCredentials,
  loadAiMessages,
  loadCachedInsight,
  requestProactiveInsights,
  sendChatMessage,
  subscribeByokUpdates,
} from "../../services/aiService";
import { ByokSetupCard } from "./ByokSetupCard";

const QUICK_PROMPTS = [
  "Quanto gastei com comida?",
  "Qual cartão está perto da meta?",
  "Onde estou gastando à toa?",
  "Consigo gastar R$ 300 hoje?",
  "Resumo sincero do mês",
];

const HUMOR_MODES = [
  { id: "mild", label: "Leve" },
  { id: "sarcastic_friendly", label: "Irônico" },
  { id: "roast", label: "Sincerão" },
];

export function AiPage() {
  const { user, preferences, updatePreferences } = useAuth();
  const {
    kpis,
    categories,
    creditCards,
    recurringExpenses,
    expenses,
    selectedMonth,
    selectedYear,
  } = useFinancialData();
  const { toast } = useToast();

  const [byok, setByok] = useState(() => getActiveByokCredentials(user?.id));
  const [showKeyPanel, setShowKeyPanel] = useState(false);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingChat, setLoadingChat] = useState(true);
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  const [insight, setInsight] = useState(null);
  const [loadingInsight, setLoadingInsight] = useState(false);

  const messagesEndRef = useRef(null);

  const humorLevel = preferences.ai_humor_level || "sarcastic_friendly";
  const monthName =
    MONTHS.find((m) => m.value === selectedMonth)?.label || selectedMonth;

  useEffect(() => {
    const sync = () => setByok(getActiveByokCredentials(user?.id));
    sync();
    return subscribeByokUpdates(sync);
  }, [user?.id]);

  const fullSnapshot = useMemo(
    () =>
      buildLocalSnapshot({
        kpis,
        categories,
        creditCards,
        recurringExpenses,
        expenses,
        month: selectedMonth,
        year: selectedYear,
      }),
    [
      kpis,
      categories,
      creditCards,
      recurringExpenses,
      expenses,
      selectedMonth,
      selectedYear,
    ],
  );

  useEffect(() => {
    let active = true;
    setLoadingChat(true);
    loadAiMessages(user?.id)
      .then((rows) => {
        if (active) setMessages(rows);
      })
      .catch(() => {
        if (active) setMessages([]);
      })
      .finally(() => {
        if (active) setLoadingChat(false);
      });
    return () => {
      active = false;
    };
  }, [user?.id]);

  const hydrateInsight = useCallback(
    async (force = false) => {
      if (!user?.id) return;
      if (!byok.configured) {
        toast("Salve uma chave de API para gerar o diagnóstico por IA.", "warning");
        return;
      }

      setLoadingInsight(true);
      try {
        const next = await requestProactiveInsights({
          userId: user.id,
          month: selectedMonth,
          year: selectedYear,
          humorLevel,
          forceRefresh: force,
          snapshot: fullSnapshot,
        });
        setInsight(next);
      } catch (err) {
        toast(err?.message || "Erro ao gerar diagnóstico.", "error");
      } finally {
        setLoadingInsight(false);
      }
    },
    [
      user?.id,
      byok.configured,
      selectedMonth,
      selectedYear,
      humorLevel,
      fullSnapshot,
      toast,
    ],
  );

  useEffect(() => {
    let mounted = true;
    loadCachedInsight({
      userId: user?.id,
      month: selectedMonth,
      year: selectedYear,
    })
      .then((cached) => {
        if (!mounted) return;
        if (cached && new Date(cached.expires_at).getTime() > Date.now()) {
          setInsight(cached);
        } else {
          setInsight(null);
        }
      })
      .catch(() => {
        if (mounted) setInsight(null);
      });
    return () => {
      mounted = false;
    };
  }, [user?.id, selectedMonth, selectedYear]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const handleHumorChange = async (level) => {
    try {
      await updatePreferences({ ai_humor_level: level });
    } catch {
      // mantém localmente
    }
  };

  const handleSend = async (customText) => {
    const text = (customText ?? input).trim();
    if (!text || sending) return;

    if (!byok.configured) {
      setShowKeyPanel(true);
      toast("Configure sua chave de API para conversar com a FinanscIA.", "warning");
      return;
    }

    const recentHistory = messages.slice(-5);
    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: tempId, role: "user", content: text },
    ]);
    if (!customText) setInput("");
    setSending(true);

    try {
      const res = await sendChatMessage({
        userId: user?.id,
        message: text,
        month: selectedMonth,
        year: selectedYear,
        humorLevel,
        snapshot: fullSnapshot,
        recentMessages: recentHistory,
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `reply-${Date.now()}`,
          role: "assistant",
          content: res.reply,
        },
      ]);
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      if (!customText) setInput(text);
      toast(err?.message || "Erro ao consultar o provedor de IA.", "error");
    } finally {
      setSending(false);
    }
  };

  const handleConfirmClear = async () => {
    setClearing(true);
    try {
      await clearAiMessages(user?.id);
      setMessages([]);
      setClearModalOpen(false);
      toast("Conversa limpa.", "success");
    } catch {
      toast("Erro ao limpar conversa.", "error");
    } finally {
      setClearing(false);
    }
  };

  const displayedInsight = insight || buildLocalInsight(fullSnapshot);

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 text-white shadow-md shadow-indigo-600/20">
            <Sparkles size={17} />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-2xl">
            FinanscIA
          </h1>
          <Badge tone="ai">
            {monthName} / {selectedYear}
          </Badge>

          {byok.configured ? (
            <button
              type="button"
              onClick={() => setShowKeyPanel((prev) => !prev)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-600 transition-colors hover:bg-emerald-500/20 dark:text-emerald-400"
            >
              <KeyRound size={12} />
              {byok.providerMeta.shortName}
            </button>
          ) : null}
        </div>

        {/* Tom da IA */}
        <div className="grid grid-cols-3 rounded-2xl bg-[var(--bg-elevated)] p-1 sm:w-auto">
          {HUMOR_MODES.map((m) => {
            const active = humorLevel === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => handleHumorChange(m.id)}
                className={`cursor-pointer rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                  active
                    ? "bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Painel BYOK */}
      {!byok.configured || showKeyPanel ? (
        <ByokSetupCard
          compact
          onConfigured={() => setShowKeyPanel(false)}
        />
      ) : null}

      {/* Grid Principal */}
      <div className="grid gap-5 lg:grid-cols-12">
        {/* Diagnóstico Proativo */}
        <div className="space-y-4 lg:order-2 lg:col-span-5">
          <Card variant="ai" padding="p-4 sm:p-5" className="space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-violet-500 dark:text-cyan-300">
                  Diagnóstico do mês
                </span>
                <h2 className="mt-0.5 text-base font-extrabold text-[var(--text-primary)]">
                  {displayedInsight.title}
                </h2>
              </div>

              <Button
                size="sm"
                variant="secondary"
                loading={loadingInsight}
                onClick={() => hydrateInsight(true)}
                className="shrink-0"
              >
                <RefreshCw size={13} />
                Gerar
              </Button>
            </div>

            <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
              {displayedInsight.summary}
            </p>

            {Array.isArray(displayedInsight.tips) &&
            displayedInsight.tips.length > 0 ? (
              <div className="space-y-2 border-t border-[var(--border-subtle)] pt-3">
                <p className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                  <Lightbulb size={14} className="text-amber-500" />
                  Dicas práticas
                </p>
                <ul className="space-y-1.5">
                  {displayedInsight.tips.map((tip, idx) => (
                    <li
                      key={`${idx}-${tip.slice(0, 12)}`}
                      className="rounded-xl bg-[var(--bg-surface)]/80 px-3 py-2 text-xs leading-snug text-[var(--text-secondary)]"
                    >
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Card>

          <Card padding="p-4" className="grid grid-cols-3 gap-2.5">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-[var(--text-muted)]">
                Saldo Livre
              </p>
              <p className="tabular-nums mt-0.5 truncate text-xs font-extrabold text-emerald-500 sm:text-sm">
                {formatCurrency(kpis.freeBalance)}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-[var(--text-muted)]">
                Gastos
              </p>
              <p className="tabular-nums mt-0.5 truncate text-xs font-extrabold text-[var(--text-primary)] sm:text-sm">
                {formatCurrency(kpis.expensesTotal)}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-[var(--text-muted)]">
                Crédito
              </p>
              <p className="tabular-nums mt-0.5 truncate text-xs font-extrabold text-indigo-500 sm:text-sm">
                {formatCurrency(kpis.creditCardTotal)}
              </p>
            </div>
          </Card>
        </div>

        {/* Chat Conversacional */}
        <Card
          padding="p-0"
          className="flex min-h-[440px] flex-col overflow-hidden sm:min-h-[520px] lg:order-1 lg:col-span-7 lg:h-[600px]"
        >
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3 sm:px-5">
            <div className="flex items-center gap-2">
              <Bot size={17} className="text-violet-500" />
              <span className="text-sm font-bold text-[var(--text-primary)]">
                Chat financeiro
              </span>
            </div>

            {messages.length > 0 ? (
              <button
                type="button"
                onClick={() => setClearModalOpen(true)}
                className="inline-flex cursor-pointer items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-[var(--text-muted)] transition-colors hover:bg-rose-500/10 hover:text-rose-500"
              >
                <Trash2 size={13} />
                Limpar
              </button>
            ) : null}
          </div>

          <div className="custom-scrollbar flex-1 space-y-3.5 overflow-y-auto px-4 py-4 sm:px-5">
            {loadingChat ? (
              <p className="py-10 text-center text-xs text-[var(--text-muted)]">
                Carregando conversa...
              </p>
            ) : messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center py-6 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600/15 to-cyan-500/15 text-violet-500">
                  <Sparkles size={22} />
                </div>
                <p className="text-sm font-bold text-[var(--text-primary)]">
                  Pergunte sobre suas finanças
                </p>
                <p className="mt-1 max-w-xs text-xs text-[var(--text-secondary)]">
                  {byok.configured
                    ? "Analiso seus gastos, metas de cartão e faturas em tempo real."
                    : "Salve sua chave de API acima para começar a conversar."}
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isUser = msg.role === "user";
                return (
                  <div
                    key={msg.id}
                    className={`flex items-end gap-2.5 ${
                      isUser ? "justify-end" : "justify-start"
                    }`}
                  >
                    {!isUser ? (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 text-white">
                        <Sparkles size={13} />
                      </div>
                    ) : null}

                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed sm:max-w-[78%] ${
                        isUser
                          ? "rounded-br-md bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
                          : "rounded-bl-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                      }`}
                    >
                      {msg.content}
                    </div>

                    {isUser ? (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-elevated)] text-[var(--text-secondary)]">
                        <User size={13} />
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}

            {sending ? (
              <div className="flex items-end gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 text-white">
                  <Sparkles size={13} />
                </div>
                <div className="rounded-2xl rounded-bl-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3">
                  <div className="flex gap-1.5">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-500 [animation-delay:-0.2s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-500 [animation-delay:-0.1s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-500" />
                  </div>
                </div>
              </div>
            ) : null}

            <div ref={messagesEndRef} />
          </div>

          <div className="space-y-2.5 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 sm:p-4">
            <div className="custom-scrollbar flex gap-1.5 overflow-x-auto pb-1">
              {QUICK_PROMPTS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  disabled={sending}
                  onClick={() => handleSend(chip)}
                  className="shrink-0 cursor-pointer rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] transition-colors hover:border-violet-500/45 hover:text-[var(--text-primary)]"
                >
                  {chip}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  byok.configured
                    ? "Pergunte sobre seus gastos..."
                    : "Configure uma API Key acima para conversar..."
                }
                className="h-11 flex-1 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 text-sm font-medium text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-violet-500/70 focus:outline-none"
              />
              <Button
                type="submit"
                variant="ai"
                size="icon"
                disabled={!input.trim() || sending}
                aria-label="Enviar mensagem"
                className="h-11 w-11 shrink-0 rounded-2xl"
              >
                <Send size={16} />
              </Button>
            </form>
          </div>
        </Card>
      </div>

      <ConfirmModal
        isOpen={clearModalOpen}
        onClose={() => setClearModalOpen(false)}
        onConfirm={handleConfirmClear}
        title="Limpar conversa?"
        message="Todas as mensagens do chat serão apagadas."
        confirmLabel="Limpar"
        cancelLabel="Cancelar"
        tone="danger"
        loading={clearing}
      />
    </div>
  );
}
