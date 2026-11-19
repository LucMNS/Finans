import { useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  BarChart3,
  CheckCircle2,
  CreditCard,
  Plus,
  Receipt,
  Repeat,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { useFinancialData } from "../../contexts/FinancialContext";
import { useToast } from "../../contexts/ToastContext";
import { MONTHS } from "../../lib/constants";
import {
  calculateCardInvoiceStats,
  calculateCategoryDistribution,
  isRecurringActiveInPeriod,
} from "../../lib/financeRules";
import { formatCurrency, formatDateTimeLabel } from "../../lib/formatters";

export function OverviewPage({ onOpenQuickEntry, onNavigateTab }) {
  const {
    kpis,
    categories,
    creditCards,
    recurringExpenses,
    incomes,
    expenses,
    selectedMonth,
    selectedYear,
    isLoading,
    payInvoice,
  } = useFinancialData();
  const { toast } = useToast();
  const [payingCardId, setPayingCardId] = useState(null);

  const monthName =
    MONTHS.find((m) => m.value === selectedMonth)?.label || "Mês";

  const activeRecurring = useMemo(
    () =>
      recurringExpenses.filter((r) =>
        isRecurringActiveInPeriod(r, selectedMonth, selectedYear),
      ),
    [recurringExpenses, selectedMonth, selectedYear],
  );

  const topCategory = useMemo(() => {
    const dist = calculateCategoryDistribution({
      expenses,
      categories,
      recurringExpenses,
      month: selectedMonth,
      year: selectedYear,
    });
    return dist[0] || null;
  }, [expenses, categories, recurringExpenses, selectedMonth, selectedYear]);

  const recentMovements = useMemo(() => {
    const monthIncomes = incomes
      .filter(
        (i) =>
          Number(i.competence_month) === Number(selectedMonth) &&
          Number(i.competence_year) === Number(selectedYear),
      )
      .map((i) => ({ ...i, entryKind: "income" }));

    const monthExpenses = expenses
      .filter(
        (e) =>
          Number(e.competence_month) === Number(selectedMonth) &&
          Number(e.competence_year) === Number(selectedYear),
      )
      .map((e) => ({ ...e, entryKind: "expense" }));

    return [...monthIncomes, ...monthExpenses]
      .sort(
        (a, b) =>
          new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime(),
      )
      .slice(0, 6);
  }, [incomes, expenses, selectedMonth, selectedYear]);

  const handlePayCard = async (cardId) => {
    setPayingCardId(cardId);
    try {
      await payInvoice({ cardId });
    } catch (err) {
      toast(err.message || "Erro ao pagar fatura.", "error");
    } finally {
      setPayingCardId(null);
    }
  };

  const secondaryKpis = [
    {
      label: "Receitas",
      value: kpis.incomeTotal,
      hint: "Entradas",
      icon: TrendingUp,
      tone: "text-emerald-500 bg-emerald-500/12",
    },
    {
      label: "Dinheiro / Pix",
      value: kpis.cashPixTotal,
      hint: `${formatCurrency(kpis.recurringCashTotal)} fixas`,
      icon: Banknote,
      tone: "text-violet-500 bg-violet-500/12",
    },
    {
      label: "Cartão",
      value: kpis.creditCardTotal,
      hint:
        kpis.recurringCardTotal > 0
          ? `${formatCurrency(kpis.recurringCardTotal)} fixas`
          : "Faturas",
      icon: CreditCard,
      tone: "text-indigo-500 bg-indigo-500/12",
    },
    {
      label: "Total Gastos",
      value: kpis.expensesTotal,
      hint: "Pix + Cartão",
      icon: Receipt,
      tone: "text-rose-500 bg-rose-500/12",
    },
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* KPIs */}
      <div className="grid gap-4 lg:grid-cols-12">
        <Card
          variant="hero"
          padding="p-5 sm:p-6"
          className="flex flex-col justify-between lg:col-span-5"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white/95">
                <Wallet size={12} />
                {monthName} {selectedYear}
              </span>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-white/75">
                Saldo Livre
              </p>
              <p className="tabular-nums mt-1 truncate text-2xl font-extrabold tracking-tight min-[400px]:text-3xl sm:text-4xl">
                {isLoading ? "..." : formatCurrency(kpis.freeBalance)}
              </p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/15 sm:h-11 sm:w-11">
              <ArrowUpRight size={20} />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-white/90">
              <span className="tabular-nums whitespace-nowrap">
                Receitas: {formatCurrency(kpis.incomeTotal)}
              </span>
              <span className="tabular-nums whitespace-nowrap">
                Gastos: {formatCurrency(kpis.expensesTotal)}
              </span>
            </div>
            <Button
              size="sm"
              variant="surface"
              onClick={() => onOpenQuickEntry("expense")}
              className="border-white/20 bg-white text-indigo-700 hover:bg-white/95 dark:bg-white dark:text-indigo-700"
            >
              <Plus size={14} />
              Lançar
            </Button>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 lg:col-span-7 lg:grid-cols-2">
          {secondaryKpis.map((item) => {
            const Icon = item.icon;
            return (
              <Card
                key={item.label}
                padding="p-3.5 sm:p-5"
                className="flex min-w-0 flex-col justify-between"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-semibold text-[var(--text-secondary)]">
                    {item.label}
                  </span>
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl sm:h-9 sm:w-9 ${item.tone}`}
                  >
                    <Icon size={16} />
                  </span>
                </div>
                <div className="mt-3 min-w-0">
                  <p className="tabular-nums truncate text-base font-extrabold tracking-tight text-[var(--text-primary)] min-[400px]:text-lg sm:text-xl lg:text-2xl">
                    {isLoading ? "..." : formatCurrency(item.value)}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]">
                    {item.hint}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Cartões & Últimos Lançamentos */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card padding="p-4 sm:p-6" className="min-w-0 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              Cartões & Metas
            </h2>
            <button
              type="button"
              onClick={() => onNavigateTab("cards")}
              className="inline-flex shrink-0 cursor-pointer items-center gap-1 text-xs font-bold text-violet-500 hover:text-violet-400"
            >
              Gerenciar
              <ArrowRight size={13} />
            </button>
          </div>

          {creditCards.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border-strong)] p-6 text-center">
              <p className="text-xs font-medium text-[var(--text-muted)]">
                Nenhum cartão cadastrado.
              </p>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onNavigateTab("cards")}
                className="mt-3"
              >
                <Plus size={14} />
                Adicionar cartão
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {creditCards.slice(0, 4).map((card) => {
                const stats = calculateCardInvoiceStats({
                  card,
                  expenses,
                  recurringExpenses,
                  month: selectedMonth,
                  year: selectedYear,
                });

                const barColor =
                  stats.goalTone === "danger"
                    ? "bg-rose-500"
                    : stats.goalTone === "warning"
                      ? "bg-amber-500"
                      : "bg-violet-500";

                const statusTone =
                  stats.status === "paid"
                    ? "income"
                    : stats.status === "closed"
                      ? "danger"
                      : "neutral";

                return (
                  <div
                    key={card.id}
                    className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{
                              backgroundColor: card.brand_color || "#7c3aed",
                            }}
                          />
                          <p className="truncate text-sm font-bold text-[var(--text-primary)]">
                            {card.name}
                          </p>
                          <Badge tone={statusTone}>{stats.statusLabel}</Badge>
                        </div>
                        <p className="tabular-nums mt-1 whitespace-nowrap text-base font-extrabold text-[var(--text-primary)]">
                          {formatCurrency(stats.total)}
                        </p>
                      </div>

                      {stats.canPayInvoice ? (
                        <Button
                          size="sm"
                          variant={stats.isClosedOrOverdue ? "danger" : "secondary"}
                          loading={payingCardId === card.id}
                          onClick={() => handlePayCard(card.id)}
                          className="shrink-0"
                        >
                          <CheckCircle2 size={14} />
                          Pagar
                        </Button>
                      ) : null}
                    </div>

                    {stats.goal > 0 ? (
                      <div className="mt-3 space-y-1.5">
                        <div className="flex items-center justify-between gap-2 text-[11px] font-semibold">
                          <span
                            className={
                              stats.goalTone === "danger"
                                ? "text-rose-500"
                                : stats.goalTone === "warning"
                                  ? "text-amber-500"
                                  : "text-[var(--text-secondary)]"
                            }
                          >
                            Meta: {Math.round(stats.rawGoalPct)}%
                          </span>
                          <span className="tabular-nums whitespace-nowrap text-[var(--text-muted)]">
                            {formatCurrency(stats.goal)}
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-surface)]">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                            style={{ width: `${stats.goalPct}%` }}
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card padding="p-4 sm:p-6" className="min-w-0 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              Últimos lançamentos
            </h2>
            <button
              type="button"
              onClick={() => onNavigateTab("transactions")}
              className="inline-flex shrink-0 cursor-pointer items-center gap-1 text-xs font-bold text-violet-500 hover:text-violet-400"
            >
              Ver extrato
              <ArrowRight size={13} />
            </button>
          </div>

          {recentMovements.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border-strong)] p-6 text-center">
              <p className="text-xs font-medium text-[var(--text-muted)]">
                Nenhuma movimentação neste mês.
              </p>
              <Button
                size="sm"
                onClick={() => onOpenQuickEntry("expense")}
                className="mt-3"
              >
                <Plus size={14} />
                Novo lançamento
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {recentMovements.map((item) => {
                const isIncome = item.entryKind === "income";
                const dt = formatDateTimeLabel(item.occurred_at);
                return (
                  <div
                    key={`${item.entryKind}-${item.id}`}
                    className="flex items-center justify-between gap-2.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2.5 sm:px-3.5"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                          isIncome
                            ? "bg-emerald-500/12 text-emerald-500"
                            : "bg-rose-500/12 text-rose-500"
                        }`}
                      >
                        {isIncome ? (
                          <ArrowUpRight size={15} />
                        ) : (
                          <ArrowDownLeft size={15} />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-[var(--text-primary)]">
                          {isIncome ? item.source : item.category_name}
                        </p>
                        <p className="truncate text-[11px] text-[var(--text-muted)]">
                          {dt ? `${dt.date} ${dt.time}` : ""}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`tabular-nums shrink-0 whitespace-nowrap text-xs font-extrabold ${
                        isIncome
                          ? "text-emerald-500"
                          : "text-[var(--text-primary)]"
                      }`}
                    >
                      {isIncome ? "+" : "-"} {formatCurrency(item.amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Atalhos Rápidos */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        <Card
          padding="p-4"
          className="flex cursor-pointer items-center justify-between gap-3 hover:border-violet-500/40"
          onClick={() => onNavigateTab("recurring")}
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-500/12 text-violet-500">
              <Repeat size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[var(--text-secondary)]">
                Mensalidades ativas
              </p>
              <p className="tabular-nums truncate text-sm font-extrabold text-[var(--text-primary)]">
                {activeRecurring.length} ({formatCurrency(kpis.recurringActiveTotal)})
              </p>
            </div>
          </div>
          <ArrowRight size={15} className="shrink-0 text-[var(--text-muted)]" />
        </Card>

        <Card
          padding="p-4"
          className="flex cursor-pointer items-center justify-between gap-3 hover:border-violet-500/40"
          onClick={() => onNavigateTab("analytics")}
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/12 text-indigo-500">
              <BarChart3 size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[var(--text-secondary)]">
                Maior categoria
              </p>
              <p className="tabular-nums truncate text-sm font-extrabold text-[var(--text-primary)]">
                {topCategory
                  ? `${topCategory.name} (${topCategory.percLabel})`
                  : "Ver análises"}
              </p>
            </div>
          </div>
          <ArrowRight size={15} className="shrink-0 text-[var(--text-muted)]" />
        </Card>

        <Card
          variant="ai"
          padding="p-4"
          className="flex cursor-pointer items-center justify-between gap-3 hover:border-violet-500/50 sm:col-span-2 lg:col-span-1"
          onClick={() => onNavigateTab("ai")}
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 text-white">
              <Sparkles size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[var(--text-secondary)]">
                FinanscIA
              </p>
              <p className="truncate text-sm font-extrabold text-[var(--text-primary)]">
                Chat e insights
              </p>
            </div>
          </div>
          <ArrowRight size={15} className="shrink-0 text-[var(--text-muted)]" />
        </Card>
      </div>
    </div>
  );
}
