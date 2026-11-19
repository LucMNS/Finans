import { useState } from "react";
import {
  CheckCircle2,
  CreditCard,
  Edit2,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { Input } from "../../components/ui/Input";
import { useFinancialData } from "../../contexts/FinancialContext";
import { useToast } from "../../contexts/ToastContext";
import { CARD_COLORS, MONTHS } from "../../lib/constants";
import { calculateCardInvoiceStats } from "../../lib/financeRules";
import { formatCurrency, parseCurrencyInput } from "../../lib/formatters";

export function CardsPage() {
  const {
    creditCards,
    expenses,
    recurringExpenses,
    selectedMonth,
    selectedYear,
    saveCard,
    deleteCard,
    payInvoice,
  } = useFinancialData();
  const { toast } = useToast();

  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState("");
  const [closingDay, setClosingDay] = useState("");
  const [spendingGoal, setSpendingGoal] = useState("");
  const [brandColor, setBrandColor] = useState(CARD_COLORS[0].value);
  const [saving, setSaving] = useState(false);

  const [cardToDelete, setCardToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [payingCardId, setPayingCardId] = useState(null);

  const monthName =
    MONTHS.find((m) => m.value === selectedMonth)?.label || selectedMonth;

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setClosingDay("");
    setSpendingGoal("");
    setBrandColor(CARD_COLORS[0].value);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const day = parseInt(closingDay, 10);
    if (!name.trim() || !Number.isFinite(day) || day < 1 || day > 31) {
      toast("Informe o nome e um dia de fechamento entre 1 e 31.", "warning");
      return;
    }

    let parsedGoal = null;
    if (spendingGoal.trim()) {
      parsedGoal = parseCurrencyInput(spendingGoal);
      if (!Number.isFinite(parsedGoal) || parsedGoal <= 0) {
        toast("Meta inválida.", "warning");
        return;
      }
    }

    setSaving(true);
    try {
      await saveCard({
        id: editingId,
        name,
        closingDay: day,
        spendingGoal: parsedGoal,
        brandColor,
      });
      resetForm();
    } catch (err) {
      toast(err.message || "Erro ao salvar cartão.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = (card) => {
    setEditingId(card.id);
    setName(card.name);
    setClosingDay(String(card.closing_day));
    setSpendingGoal(
      card.spending_goal
        ? String(card.spending_goal).replace(".", ",")
        : "",
    );
    setBrandColor(card.brand_color || CARD_COLORS[0].value);
  };

  const handlePayInvoice = async (cardId) => {
    setPayingCardId(cardId);
    try {
      await payInvoice({ cardId });
    } catch (err) {
      toast(err.message || "Erro ao pagar fatura.", "error");
    } finally {
      setPayingCardId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!cardToDelete) return;
    setDeleting(true);
    try {
      await deleteCard(cardToDelete.id);
      if (editingId === cardToDelete.id) resetForm();
      setCardToDelete(null);
    } catch (err) {
      toast(err.message || "Erro ao excluir cartão.", "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
          Cartões de Crédito
        </h1>
        <Badge tone="primary">
          {monthName} / {selectedYear}
        </Badge>
      </div>

      {/* Formulário Cadastro / Edição */}
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[var(--text-primary)]">
              {editingId ? "Editar cartão" : "Novo cartão"}
            </h2>
            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X size={14} />
                Cancelar edição
              </button>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              id="card-name"
              label="Nome do cartão"
              placeholder="Nubank, Itaú..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              id="card-closing"
              label="Dia de fechamento"
              type="number"
              min="1"
              max="31"
              numeric
              placeholder="10"
              value={closingDay}
              onChange={(e) => setClosingDay(e.target.value)}
              required
            />
            <Input
              id="card-goal"
              label="Meta mensal (opcional)"
              numeric
              inputMode="decimal"
              placeholder="2.000,00"
              value={spendingGoal}
              onChange={(e) => setSpendingGoal(e.target.value)}
            />
            <div className="flex items-end">
              <Button type="submit" loading={saving} className="w-full">
                {editingId ? <Save size={15} /> : <Plus size={15} />}
                {editingId ? "Atualizar" : "Adicionar"}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {CARD_COLORS.map((color) => (
              <button
                key={color.value}
                type="button"
                title={color.label}
                aria-label={`Cor ${color.label}`}
                onClick={() => setBrandColor(color.value)}
                className={`h-6 w-6 cursor-pointer rounded-full transition-transform ${
                  brandColor === color.value
                    ? "scale-115 ring-2 ring-[var(--text-primary)] ring-offset-2 ring-offset-[var(--bg-surface)]"
                    : "opacity-75 hover:opacity-100"
                }`}
                style={{ backgroundColor: color.value }}
              />
            ))}
          </div>
        </form>
      </Card>

      {/* Lista de Cartões */}
      {creditCards.length === 0 ? (
        <Card className="py-12 text-center">
          <CreditCard
            size={28}
            className="mx-auto mb-3 text-[var(--text-muted)]"
          />
          <p className="text-sm font-semibold text-[var(--text-secondary)]">
            Nenhum cartão cadastrado.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {creditCards.map((card) => {
            const stats = calculateCardInvoiceStats({
              card,
              expenses,
              recurringExpenses,
              month: selectedMonth,
              year: selectedYear,
            });

            const badgeTone =
              stats.status === "paid"
                ? "income"
                : stats.status === "closed"
                  ? "danger"
                  : "neutral";

            const barColor =
              stats.goalTone === "danger"
                ? "bg-gradient-to-r from-rose-500 to-red-500"
                : stats.goalTone === "warning"
                  ? "bg-gradient-to-r from-amber-500 to-orange-500"
                  : "bg-gradient-to-r from-violet-600 to-indigo-500";

            const goalLabel =
              stats.goalTone === "danger"
                ? "Meta ultrapassada"
                : stats.goalTone === "warning"
                  ? "Atenção à meta (75%+)"
                  : "Meta pessoal";

            return (
              <Card
                key={card.id}
                className={`relative overflow-hidden ${
                  stats.isClosedOrOverdue
                    ? "border-rose-500/40"
                    : stats.isPaid
                      ? "border-emerald-500/40"
                      : ""
                }`}
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-1"
                  style={{ backgroundColor: card.brand_color || "#7c3aed" }}
                />

                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm"
                      style={{
                        backgroundColor: card.brand_color || "#7c3aed",
                      }}
                    >
                      <CreditCard size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-base font-bold text-[var(--text-primary)]">
                          {card.name}
                        </h3>
                        <Badge tone={badgeTone}>{stats.statusLabel}</Badge>
                      </div>
                      <p className="text-xs text-[var(--text-muted)]">
                        Fecha dia {card.closing_day}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(card)}
                      aria-label={`Editar ${card.name}`}
                      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-violet-500"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCardToDelete(card)}
                      aria-label={`Excluir ${card.name}`}
                      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl text-[var(--text-muted)] transition-colors hover:bg-rose-500/12 hover:text-rose-500"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-[var(--text-secondary)]">
                      Fatura do mês
                    </p>
                    <p className="tabular-nums mt-0.5 whitespace-nowrap text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
                      {formatCurrency(stats.total)}
                    </p>
                    {stats.recurringTotal > 0 ? (
                      <p className="tabular-nums mt-0.5 text-[11px] font-medium text-[var(--text-muted)]">
                        Inclui {formatCurrency(stats.recurringTotal)} de fixas
                      </p>
                    ) : null}
                  </div>

                  {stats.canPayInvoice ? (
                    <Button
                      size="sm"
                      variant={stats.isClosedOrOverdue ? "danger" : "primary"}
                      loading={payingCardId === card.id}
                      onClick={() => handlePayInvoice(card.id)}
                      className="shrink-0"
                    >
                      <CheckCircle2 size={14} />
                      Pagar fatura
                    </Button>
                  ) : null}
                </div>

                {stats.goal > 0 ? (
                  <div className="mt-5 space-y-2 border-t border-[var(--border-subtle)] pt-4">
                    <div className="flex items-center justify-between text-xs">
                      <span
                        className={`font-bold ${
                          stats.goalTone === "danger"
                            ? "text-rose-500"
                            : stats.goalTone === "warning"
                              ? "text-amber-500"
                              : "text-violet-500"
                        }`}
                      >
                        {goalLabel} ({Math.round(stats.rawGoalPct)}%)
                      </span>
                      <span className="tabular-nums font-semibold text-[var(--text-secondary)]">
                        {formatCurrency(stats.total)} /{" "}
                        {formatCurrency(stats.goal)}
                      </span>
                    </div>

                    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                        style={{ width: `${stats.goalPct}%` }}
                      />
                    </div>
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(cardToDelete)}
        onClose={() => setCardToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Excluir cartão?"
        message={
          cardToDelete
            ? `Isso apagará "${cardToDelete.name}" e todos os gastos vinculados a ele.`
            : ""
        }
        confirmLabel="Excluir tudo"
        cancelLabel="Cancelar"
        tone="danger"
        loading={deleting}
      />
    </div>
  );
}
