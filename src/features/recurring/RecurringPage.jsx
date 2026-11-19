import { useMemo, useState } from "react";
import {
  Banknote,
  Calendar,
  CreditCard,
  Edit2,
  Plus,
  Repeat,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { Input } from "../../components/ui/Input";
import { SelectPill } from "../../components/ui/SelectPill";
import { useFinancialData } from "../../contexts/FinancialContext";
import { useToast } from "../../contexts/ToastContext";
import { MONTHS, getAvailableYears } from "../../lib/constants";
import {
  isRecurringActiveInPeriod,
  isRecurringStartedInPeriod,
} from "../../lib/financeRules";
import { formatCurrency, parseCurrencyInput } from "../../lib/formatters";

export function RecurringPage() {
  const {
    recurringExpenses,
    creditCards,
    selectedMonth,
    selectedYear,
    saveRecurring,
    toggleRecurring,
    deleteRecurring,
  } = useFinancialData();
  const { toast } = useToast();

  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [billingDay, setBillingDay] = useState("");
  const [paymentTarget, setPaymentTarget] = useState("cash_pix");
  const [startMonth, setStartMonth] = useState(selectedMonth);
  const [startYear, setStartYear] = useState(selectedYear);
  const [saving, setSaving] = useState(false);

  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const cardMap = useMemo(() => {
    const map = new Map();
    creditCards.forEach((c) => map.set(c.id, c));
    return map;
  }, [creditCards]);

  const paymentOptions = useMemo(
    () => [
      { value: "cash_pix", label: "Débito Automático (Dinheiro/Pix)" },
      ...creditCards.map((c) => ({ value: c.id, label: `Cartão: ${c.name}` })),
    ],
    [creditCards],
  );

  const yearOptions = useMemo(
    () => getAvailableYears(startYear),
    [startYear],
  );

  const summary = useMemo(() => {
    const periodActive = recurringExpenses.filter((i) =>
      isRecurringActiveInPeriod(i, selectedMonth, selectedYear),
    );
    const cashTotal = periodActive
      .filter((i) => !i.credit_card_id)
      .reduce((s, i) => s + Number(i.amount || 0), 0);
    const cardTotal = periodActive
      .filter((i) => Boolean(i.credit_card_id))
      .reduce((s, i) => s + Number(i.amount || 0), 0);

    return {
      activeTotal: cashTotal + cardTotal,
      cashTotal,
      cardTotal,
      activeCount: periodActive.length,
      pausedCount: recurringExpenses.filter((i) => !i.is_active).length,
    };
  }, [recurringExpenses, selectedMonth, selectedYear]);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setAmount("");
    setBillingDay("");
    setPaymentTarget("cash_pix");
    setStartMonth(selectedMonth);
    setStartYear(selectedYear);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const numericAmount = parseCurrencyInput(amount);
    if (!name.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      toast("Preencha o nome e um valor válido.", "warning");
      return;
    }

    let parsedDay = null;
    if (billingDay.trim()) {
      parsedDay = parseInt(billingDay, 10);
      if (!Number.isFinite(parsedDay) || parsedDay < 1 || parsedDay > 31) {
        toast("Dia de cobrança deve estar entre 1 e 31.", "warning");
        return;
      }
    }

    setSaving(true);
    try {
      await saveRecurring({
        id: editingId,
        name,
        amount: numericAmount,
        billingDay: parsedDay,
        creditCardId: paymentTarget === "cash_pix" ? null : paymentTarget,
        startMonth,
        startYear,
      });
      resetForm();
    } catch (err) {
      toast(err.message || "Erro ao salvar mensalidade.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (item) => {
    try {
      await toggleRecurring({ id: item.id, isActive: !item.is_active });
    } catch (err) {
      toast(err.message || "Erro ao alterar status.", "error");
    }
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setDeleting(true);
    try {
      await deleteRecurring(itemToDelete.id);
      if (editingId === itemToDelete.id) resetForm();
      setItemToDelete(null);
    } catch (err) {
      toast(err.message || "Erro ao excluir mensalidade.", "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-2xl">
          Mensalidades
        </h1>

        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="primary">
            No mês: {formatCurrency(summary.activeTotal)}
          </Badge>
          {summary.cashTotal > 0 ? (
            <Badge tone="neutral">
              Pix/Débito: {formatCurrency(summary.cashTotal)}
            </Badge>
          ) : null}
          {summary.cardTotal > 0 ? (
            <Badge tone="income">
              Cartão: {formatCurrency(summary.cardTotal)}
            </Badge>
          ) : null}
          {summary.pausedCount > 0 ? (
            <Badge tone="neutral">{summary.pausedCount} pausadas</Badge>
          ) : null}
        </div>
      </div>

      {/* Formulário */}
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[var(--text-primary)]">
              {editingId ? "Editar mensalidade" : "Nova mensalidade"}
            </h2>
            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X size={14} />
                Cancelar
              </button>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Input
              id="rec-name"
              label="Nome"
              placeholder="Aluguel, Internet, Streaming..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              id="rec-amount"
              label="Valor mensal (R$)"
              numeric
              inputMode="decimal"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <Input
              id="rec-day"
              label="Dia (opcional)"
              type="number"
              min="1"
              max="31"
              numeric
              placeholder="05"
              value={billingDay}
              onChange={(e) => setBillingDay(e.target.value)}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
              <span className="block text-xs font-semibold text-[var(--text-secondary)]">
                Forma de cobrança
              </span>
              <SelectPill
                value={paymentTarget}
                options={paymentOptions}
                onChange={setPaymentTarget}
                icon={paymentTarget === "cash_pix" ? Banknote : CreditCard}
              />
            </div>

            <div className="space-y-1.5">
              <span className="block text-xs font-semibold text-[var(--text-secondary)]">
                Início (Mês)
              </span>
              <SelectPill
                value={startMonth}
                options={MONTHS}
                onChange={(val) => setStartMonth(Number(val))}
                icon={Calendar}
              />
            </div>

            <div className="space-y-1.5">
              <span className="block text-xs font-semibold text-[var(--text-secondary)]">
                Início (Ano)
              </span>
              <SelectPill
                value={startYear}
                options={yearOptions}
                onChange={(val) => setStartYear(Number(val))}
              />
            </div>

            <div className="flex items-end">
              <Button type="submit" loading={saving} className="w-full">
                {editingId ? <Save size={15} /> : <Plus size={15} />}
                {editingId ? "Atualizar" : "Adicionar"}
              </Button>
            </div>
          </div>
        </form>
      </Card>

      {/* Lista */}
      {recurringExpenses.length === 0 ? (
        <Card className="py-12 text-center">
          <Repeat size={28} className="mx-auto mb-3 text-[var(--text-muted)]" />
          <p className="text-sm font-semibold text-[var(--text-secondary)]">
            Nenhuma mensalidade cadastrada.
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {recurringExpenses.map((item) => {
            const card = item.credit_card_id
              ? cardMap.get(item.credit_card_id)
              : null;
            const started = isRecurringStartedInPeriod(
              item,
              selectedMonth,
              selectedYear,
            );
            const countsThisMonth = item.is_active && started;
            const startMonthShort =
              MONTHS.find((m) => m.value === Number(item.start_month))?.short ||
              item.start_month;

            return (
              <Card
                key={item.id}
                padding="p-4 sm:p-5"
                className={`flex items-center justify-between gap-3 ${
                  !countsThisMonth ? "opacity-65" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="truncate text-sm font-bold text-[var(--text-primary)]">
                      {item.name}
                    </p>
                    <Badge tone={item.is_active ? "income" : "neutral"}>
                      {item.is_active ? "Ativa" : "Pausada"}
                    </Badge>
                    {!started ? (
                      <Badge tone="warning">
                        Inicia {startMonthShort}/{item.start_year}
                      </Badge>
                    ) : null}
                  </div>

                  <p className="tabular-nums mt-1 whitespace-nowrap text-lg font-extrabold text-[var(--text-primary)]">
                    {formatCurrency(item.amount)}
                  </p>

                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-[var(--text-muted)]">
                    <span className="inline-flex items-center gap-1 font-semibold text-[var(--text-secondary)]">
                      {card ? (
                        <>
                          <CreditCard
                            size={12}
                            style={{ color: card.brand_color || "#7c3aed" }}
                          />
                          {card.name}
                        </>
                      ) : (
                        <>
                          <Banknote size={12} className="text-violet-500" />
                          Débito / Pix
                        </>
                      )}
                    </span>

                    <span>
                      Desde {startMonthShort}/{item.start_year || selectedYear}
                    </span>

                    {item.billing_day ? (
                      <span>Dia {item.billing_day}</span>
                    ) : null}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={item.is_active}
                    aria-label={
                      item.is_active
                        ? `Pausar ${item.name}`
                        : `Ativar ${item.name}`
                    }
                    onClick={() => handleToggle(item)}
                    className={`relative h-7 w-12 cursor-pointer rounded-full transition-colors ${
                      item.is_active
                        ? "bg-emerald-500"
                        : "border border-[var(--border-strong)] bg-[var(--bg-elevated)]"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                        item.is_active ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(item.id);
                      setName(item.name);
                      setAmount(String(item.amount).replace(".", ","));
                      setBillingDay(
                        item.billing_day ? String(item.billing_day) : "",
                      );
                      setPaymentTarget(item.credit_card_id || "cash_pix");
                      setStartMonth(
                        Number(item.start_month) || selectedMonth,
                      );
                      setStartYear(Number(item.start_year) || selectedYear);
                    }}
                    aria-label={`Editar ${item.name}`}
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-violet-500"
                  >
                    <Edit2 size={15} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setItemToDelete(item)}
                    aria-label={`Excluir ${item.name}`}
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl text-[var(--text-muted)] transition-colors hover:bg-rose-500/12 hover:text-rose-500"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(itemToDelete)}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Excluir mensalidade?"
        message={
          itemToDelete
            ? `"${itemToDelete.name}" deixará de ser somada aos gastos mensais.`
            : ""
        }
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        tone="danger"
        loading={deleting}
      />
    </div>
  );
}
