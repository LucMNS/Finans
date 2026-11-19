import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  Calendar,
  CreditCard,
  FileText,
  Settings2,
  Tag,
  TrendingUp,
} from "lucide-react";
import { AdaptiveSheet } from "../../components/ui/AdaptiveSheet";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { SelectPill } from "../../components/ui/SelectPill";
import { useAuth } from "../../contexts/AuthContext";
import { useFinancialData } from "../../contexts/FinancialContext";
import { useToast } from "../../contexts/ToastContext";
import { MONTHS, getAvailableYears } from "../../lib/constants";
import {
  resolveExpenseCompetence,
  toLocalDateTimeInput,
} from "../../lib/financeRules";
import { parseCurrencyInput } from "../../lib/formatters";
import { CategoriesModal } from "./CategoriesModal";

export function QuickEntrySheet({
  isOpen,
  onClose,
  initialType = "expense",
}) {
  const { preferences } = useAuth();
  const {
    categories,
    creditCards,
    selectedMonth,
    selectedYear,
    addIncome,
    addExpense,
  } = useFinancialData();
  const { toast } = useToast();

  const [entryType, setEntryType] = useState(initialType);
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [paymentTarget, setPaymentTarget] = useState("cash_pix");
  const [occurredAt, setOccurredAt] = useState(() => toLocalDateTimeInput());
  const [competenceMonth, setCompetenceMonth] = useState(selectedMonth);
  const [competenceYear, setCompetenceYear] = useState(selectedYear);
  const [submitting, setSubmitting] = useState(false);
  const [catModalOpen, setCatModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEntryType(initialType);
      setOccurredAt(toLocalDateTimeInput());
      setCompetenceMonth(selectedMonth);
      setCompetenceYear(selectedYear);
      if (!categoryId && categories.length > 0) {
        setCategoryId(categories[0].id);
      }
    }
  }, [isOpen, initialType, selectedMonth, selectedYear, categories, categoryId]);

  const categoryOptions = useMemo(
    () => categories.map((c) => ({ value: c.id, label: c.name })),
    [categories],
  );

  const selectedCard = useMemo(
    () =>
      paymentTarget !== "cash_pix"
        ? creditCards.find((c) => c.id === paymentTarget)
        : null,
    [paymentTarget, creditCards],
  );

  const forwardPreview = useMemo(() => {
    if (!selectedCard) return null;
    const refDate = occurredAt ? new Date(occurredAt) : new Date();
    const res = resolveExpenseCompetence({
      selectedMonth: competenceMonth,
      selectedYear: competenceYear,
      card: selectedCard,
      autoForward: Boolean(preferences.auto_forward_card_expenses),
      referenceDate: refDate,
    });
    if (!res.forwarded) return null;
    const monthLabel =
      MONTHS.find((m) => m.value === res.month)?.label || res.month;
    return `Fatura fechada: irá para ${monthLabel}/${res.year}.`;
  }, [
    selectedCard,
    occurredAt,
    competenceMonth,
    competenceYear,
    preferences.auto_forward_card_expenses,
  ]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const numericAmount = parseCurrencyInput(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      toast("Informe um valor válido.", "warning");
      return;
    }

    const isoDate = occurredAt
      ? new Date(occurredAt).toISOString()
      : new Date().toISOString();

    setSubmitting(true);
    try {
      if (entryType === "income") {
        if (!source.trim()) {
          toast("Informe a fonte da receita.", "warning");
          setSubmitting(false);
          return;
        }
        await addIncome({
          source,
          amount: numericAmount,
          occurredAt: isoDate,
          month: competenceMonth,
          year: competenceYear,
          notes,
        });
      } else {
        const chosenCategory = categories.find((c) => c.id === categoryId);
        if (!chosenCategory) {
          toast("Selecione ou crie uma categoria.", "warning");
          setSubmitting(false);
          return;
        }
        await addExpense({
          categoryId: chosenCategory.id,
          categoryName: chosenCategory.name,
          creditCardId:
            paymentTarget === "cash_pix" ? null : paymentTarget,
          amount: numericAmount,
          description: notes,
          occurredAt: isoDate,
          month: competenceMonth,
          year: competenceYear,
        });
      }

      setAmount("");
      setSource("");
      setNotes("");
      onClose();
    } catch (err) {
      toast(err.message || "Erro ao salvar lançamento.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <AdaptiveSheet
        isOpen={isOpen}
        onClose={onClose}
        title="Novo lançamento"
        desktopMode="drawer"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo */}
          <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-[var(--bg-elevated)] p-1">
            {[
              { id: "expense", label: "Despesa" },
              { id: "income", label: "Receita" },
            ].map((tab) => {
              const active = entryType === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setEntryType(tab.id)}
                  className={`cursor-pointer rounded-xl py-2.5 text-xs font-bold transition-all ${
                    active
                      ? tab.id === "income"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <Input
            id="entry-amount"
            label="Valor (R$)"
            numeric
            inputMode="decimal"
            placeholder="0,00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />

          {entryType === "income" ? (
            <Input
              id="entry-source"
              label="Fonte"
              leftIcon={TrendingUp}
              placeholder="Salário, Freelance, Pix..."
              value={source}
              onChange={(e) => setSource(e.target.value)}
              required
            />
          ) : (
            <>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--text-secondary)]">
                    Categoria
                  </span>
                  <button
                    type="button"
                    onClick={() => setCatModalOpen(true)}
                    className="inline-flex cursor-pointer items-center gap-1 text-xs font-bold text-violet-500 hover:text-violet-400"
                  >
                    <Settings2 size={13} />
                    Gerenciar
                  </button>
                </div>

                <SelectPill
                  value={categoryId}
                  options={categoryOptions}
                  onChange={setCategoryId}
                  icon={Tag}
                  placeholder="Selecione uma categoria"
                />
              </div>

              <div className="space-y-1.5">
                <span className="block text-xs font-semibold text-[var(--text-secondary)]">
                  Pagamento
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentTarget("cash_pix")}
                    className={`flex cursor-pointer items-center gap-2 rounded-2xl border px-3 py-2.5 text-xs font-semibold transition-all ${
                      paymentTarget === "cash_pix"
                        ? "border-violet-500 bg-violet-500/12 text-[var(--text-primary)]"
                        : "border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]"
                    }`}
                  >
                    <Banknote size={15} className="shrink-0 text-violet-500" />
                    <span className="truncate">Dinheiro / Pix</span>
                  </button>

                  {creditCards.map((card) => {
                    const active = paymentTarget === card.id;
                    return (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => setPaymentTarget(card.id)}
                        className={`flex cursor-pointer items-center gap-2 rounded-2xl border px-3 py-2.5 text-xs font-semibold transition-all ${
                          active
                            ? "border-violet-500 bg-violet-500/12 text-[var(--text-primary)]"
                            : "border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]"
                        }`}
                      >
                        <CreditCard
                          size={15}
                          className="shrink-0"
                          style={{ color: card.brand_color || "#6366f1" }}
                        />
                        <span className="truncate">{card.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {forwardPreview ? (
                <p className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-600 dark:text-amber-300">
                  {forwardPreview}
                </p>
              ) : null}
            </>
          )}

          <Input
            id="entry-notes"
            label="Descrição (opcional)"
            leftIcon={FileText}
            placeholder="Detalhes do lançamento"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1.5">
              <span className="block text-xs font-semibold text-[var(--text-secondary)]">
                Competência
              </span>
              <SelectPill
                value={competenceMonth}
                options={MONTHS}
                onChange={(v) => setCompetenceMonth(Number(v))}
                icon={Calendar}
                size="sm"
              />
            </div>

            <div className="space-y-1.5">
              <span className="block text-xs font-semibold text-[var(--text-secondary)]">
                Ano
              </span>
              <SelectPill
                value={competenceYear}
                options={getAvailableYears(competenceYear)}
                onChange={(v) => setCompetenceYear(Number(v))}
                size="sm"
              />
            </div>
          </div>

          <Input
            id="entry-datetime"
            label="Data e hora"
            type="datetime-local"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
          />

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" loading={submitting} className="flex-1">
              Salvar
            </Button>
          </div>
        </form>
      </AdaptiveSheet>

      <CategoriesModal
        isOpen={catModalOpen}
        onClose={() => setCatModalOpen(false)}
        onSelectCategory={(id) => setCategoryId(id)}
      />
    </>
  );
}
