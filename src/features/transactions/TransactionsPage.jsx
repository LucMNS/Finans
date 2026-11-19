import { useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  Plus,
  Search,
  Settings2,
  Trash2,
} from "lucide-react";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { Input } from "../../components/ui/Input";
import { SelectPill } from "../../components/ui/SelectPill";
import { useFinancialData } from "../../contexts/FinancialContext";
import { useToast } from "../../contexts/ToastContext";
import { MONTHS } from "../../lib/constants";
import { groupItemsByDate } from "../../lib/financeRules";
import { formatCurrency, formatDateTimeLabel } from "../../lib/formatters";
import { CategoriesModal } from "./CategoriesModal";

function MovementRow({ item, cardMap, onRequestDelete }) {
  const isIncome = item.entryKind === "income";
  const dt = formatDateTimeLabel(item.occurred_at);
  const card = item.credit_card_id ? cardMap.get(item.credit_card_id) : null;

  return (
    <div className="flex items-center justify-between gap-2.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2.5 transition-colors hover:border-[var(--border-strong)] sm:px-3.5 sm:py-3">
      <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            isIncome
              ? "bg-emerald-500/12 text-emerald-500"
              : card
                ? "bg-indigo-500/12 text-indigo-500"
                : "bg-rose-500/12 text-rose-500"
          }`}
        >
          {isIncome ? (
            <ArrowUpRight size={17} />
          ) : card ? (
            <CreditCard
              size={16}
              style={{ color: card.brand_color || undefined }}
            />
          ) : (
            <ArrowDownLeft size={17} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate text-xs font-bold text-[var(--text-primary)] sm:text-sm">
              {isIncome ? item.source : item.category_name}
            </p>
            {card ? <Badge tone="primary">{card.name}</Badge> : null}
            {card && item.is_invoice_paid ? (
              <Badge tone="income">Paga</Badge>
            ) : null}
          </div>

          <p className="truncate text-[11px] text-[var(--text-muted)]">
            {dt ? dt.time : ""}
            {item.description || item.notes
              ? ` • ${item.description || item.notes}`
              : ""}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <span
          className={`tabular-nums whitespace-nowrap text-xs font-extrabold sm:text-sm ${
            isIncome ? "text-emerald-500" : "text-[var(--text-primary)]"
          }`}
        >
          {isIncome ? "+" : "-"} {formatCurrency(item.amount)}
        </span>

        <button
          type="button"
          onClick={() => onRequestDelete(item)}
          aria-label="Excluir lançamento"
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl text-[var(--text-muted)] transition-colors hover:bg-rose-500/12 hover:text-rose-500"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}

export function TransactionsPage({ onOpenQuickEntry }) {
  const {
    incomes,
    expenses,
    creditCards,
    selectedMonth,
    selectedYear,
    deleteIncome,
    deleteExpense,
  } = useFinancialData();
  const { toast } = useToast();

  const [mobileSection, setMobileSection] = useState("main");
  const [searchMain, setSearchMain] = useState("");
  const [searchCredit, setSearchCredit] = useState("");
  const [cardFilter, setCardFilter] = useState("all");
  const [catModalOpen, setCatModalOpen] = useState(false);

  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const monthName =
    MONTHS.find((m) => m.value === selectedMonth)?.label || selectedMonth;

  const cardMap = useMemo(() => {
    const map = new Map();
    creditCards.forEach((c) => map.set(c.id, c));
    return map;
  }, [creditCards]);

  const cardFilterOptions = useMemo(
    () => [
      { value: "all", label: "Todos os cartões" },
      ...creditCards.map((c) => ({ value: c.id, label: c.name })),
    ],
    [creditCards],
  );

  const mainGroups = useMemo(() => {
    const q = searchMain.trim().toLowerCase();
    const list = [
      ...incomes
        .filter(
          (i) =>
            Number(i.competence_month) === Number(selectedMonth) &&
            Number(i.competence_year) === Number(selectedYear),
        )
        .map((i) => ({ ...i, entryKind: "income" })),
      ...expenses
        .filter(
          (e) =>
            !e.credit_card_id &&
            Number(e.competence_month) === Number(selectedMonth) &&
            Number(e.competence_year) === Number(selectedYear),
        )
        .map((e) => ({ ...e, entryKind: "expense" })),
    ].filter((item) => {
      if (!q) return true;
      const hay = `${item.source || ""} ${item.category_name || ""} ${
        item.description || ""
      } ${item.notes || ""}`.toLowerCase();
      return hay.includes(q);
    });

    return groupItemsByDate(list);
  }, [incomes, expenses, selectedMonth, selectedYear, searchMain]);

  const creditGroups = useMemo(() => {
    const q = searchCredit.trim().toLowerCase();
    const list = expenses
      .filter(
        (e) =>
          Boolean(e.credit_card_id) &&
          Number(e.competence_month) === Number(selectedMonth) &&
          Number(e.competence_year) === Number(selectedYear) &&
          (cardFilter === "all" || e.credit_card_id === cardFilter),
      )
      .map((e) => ({ ...e, entryKind: "expense" }))
      .filter((item) => {
        if (!q) return true;
        const cardName = cardMap.get(item.credit_card_id)?.name || "";
        const hay = `${item.category_name || ""} ${
          item.description || ""
        } ${cardName}`.toLowerCase();
        return hay.includes(q);
      });

    return groupItemsByDate(list);
  }, [expenses, selectedMonth, selectedYear, cardFilter, searchCredit, cardMap]);

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setDeleting(true);
    try {
      if (itemToDelete.entryKind === "income") {
        await deleteIncome(itemToDelete.id);
      } else {
        await deleteExpense(itemToDelete.id);
      }
      setItemToDelete(null);
    } catch (err) {
      toast(err.message || "Erro ao excluir lançamento.", "error");
    } finally {
      setDeleting(false);
    }
  };

  const renderGroupList = (groups, emptyLabel) => {
    if (groups.length === 0) {
      return (
        <p className="py-10 text-center text-xs font-medium text-[var(--text-muted)]">
          {emptyLabel}
        </p>
      );
    }

    return (
      <div className="space-y-4">
        {groups.map((group) => (
          <div key={group.key} className="space-y-2">
            <p className="px-1 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              {group.label}
            </p>
            <div className="space-y-2">
              {group.items.map((item) => (
                <MovementRow
                  key={`${item.entryKind}-${item.id}`}
                  item={item}
                  cardMap={cardMap}
                  onRequestDelete={setItemToDelete}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-2xl">
            Movimentações
          </h1>
          <Badge tone="primary">
            {monthName} / {selectedYear}
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setCatModalOpen(true)}
            className="w-full sm:w-auto"
          >
            <Settings2 size={14} />
            <span className="truncate">Categorias</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onOpenQuickEntry("income")}
            className="w-full sm:w-auto"
          >
            <Plus size={14} />
            Receita
          </Button>
          <Button
            size="sm"
            onClick={() => onOpenQuickEntry("expense")}
            className="w-full sm:w-auto"
          >
            <Plus size={14} />
            Despesa
          </Button>
        </div>
      </div>

      {/* Seletor Mobile/Tablet entre Conta Principal e Crédito */}
      <div className="grid grid-cols-2 rounded-2xl bg-[var(--bg-elevated)] p-1 lg:hidden">
        {[
          { id: "main", label: "Conta Principal" },
          { id: "credit", label: "Faturas de Crédito" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setMobileSection(tab.id)}
            className={`cursor-pointer rounded-xl py-2.5 text-xs font-bold transition-all ${
              mobileSection === tab.id
                ? "bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm"
                : "text-[var(--text-muted)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card
          padding="p-4 sm:p-6"
          className={
            mobileSection === "main"
              ? "block min-w-0 space-y-4"
              : "hidden min-w-0 space-y-4 lg:block"
          }
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              Conta Principal
            </h2>
            <Badge tone="neutral">Dinheiro/Pix e Receitas</Badge>
          </div>

          <Input
            id="search-main"
            leftIcon={Search}
            placeholder="Buscar lançamento..."
            value={searchMain}
            onChange={(e) => setSearchMain(e.target.value)}
          />

          <div className="custom-scrollbar max-h-[540px] overflow-y-auto pr-1">
            {renderGroupList(mainGroups, "Nenhum lançamento neste período.")}
          </div>
        </Card>

        <Card
          padding="p-4 sm:p-6"
          className={
            mobileSection === "credit"
              ? "block min-w-0 space-y-4"
              : "hidden min-w-0 space-y-4 lg:block"
          }
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              Faturas de Crédito
            </h2>
            <Badge tone="primary">Cartões</Badge>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-[1fr_180px]">
            <Input
              id="search-credit"
              leftIcon={Search}
              placeholder="Buscar no crédito..."
              value={searchCredit}
              onChange={(e) => setSearchCredit(e.target.value)}
            />
            <SelectPill
              value={cardFilter}
              options={cardFilterOptions}
              onChange={setCardFilter}
              icon={CreditCard}
              align="right"
            />
          </div>

          <div className="custom-scrollbar max-h-[540px] overflow-y-auto pr-1">
            {renderGroupList(
              creditGroups,
              "Nenhum gasto no crédito neste período.",
            )}
          </div>
        </Card>
      </div>

      <CategoriesModal
        isOpen={catModalOpen}
        onClose={() => setCatModalOpen(false)}
      />

      <ConfirmModal
        isOpen={Boolean(itemToDelete)}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Excluir lançamento?"
        message="Este registro será removido permanentemente."
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        tone="danger"
        loading={deleting}
      />
    </div>
  );
}
