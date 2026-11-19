import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { FinancialContext } from "../../contexts/FinancialContext";
import { useToast } from "../../contexts/ToastContext";
import { MONTHS } from "../../lib/constants";
import {
  calculateMonthlyKpis,
  resolveExpenseCompetence,
} from "../../lib/financeRules";
import * as api from "../../services/financialApi";
import { evaluateAndTriggerSmartAlerts } from "../../services/pushService";

export function FinancialProvider({
  selectedMonth,
  selectedYear,
  children,
}) {
  const { user, preferences } = useAuth();
  const { toast } = useToast();

  const [categories, setCategories] = useState([]);
  const [creditCards, setCreditCards] = useState([]);
  const [recurringExpenses, setRecurringExpenses] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const loadYear = useCallback(
    async (silent = false) => {
      if (!user) {
        setCategories([]);
        setCreditCards([]);
        setRecurringExpenses([]);
        setIncomes([]);
        setExpenses([]);
        setIsLoading(false);
        return;
      }

      if (!silent) setIsLoading(true);
      else setIsSyncing(true);

      try {
        const result = await api.fetchWorkspaceYearData(selectedYear);
        setCategories(result.categories);
        setCreditCards(result.creditCards);
        setRecurringExpenses(result.recurringExpenses);
        setIncomes(result.incomes);
        setExpenses(result.expenses);
      } catch (err) {
        toast(
          err.message || "Erro ao carregar dados do Supabase.",
          "error",
        );
      } finally {
        setIsLoading(false);
        setIsSyncing(false);
      }
    },
    [user, selectedYear, toast],
  );

  useEffect(() => {
    loadYear(false);
  }, [loadYear]);

  useEffect(() => {
    if (isLoading || !user) return;
    evaluateAndTriggerSmartAlerts({
      userId: user.id,
      preferences,
      creditCards,
      expenses,
      recurringExpenses,
      selectedMonth,
      selectedYear,
    }).catch(() => {});
  }, [
    isLoading,
    user,
    preferences,
    creditCards,
    expenses,
    recurringExpenses,
    selectedMonth,
    selectedYear,
  ]);

  const kpis = useMemo(
    () =>
      calculateMonthlyKpis({
        incomes,
        expenses,
        recurringExpenses,
        month: selectedMonth,
        year: selectedYear,
      }),
    [incomes, expenses, recurringExpenses, selectedMonth, selectedYear],
  );

  const addIncome = useCallback(
    async ({ source, amount, occurredAt, month, year, notes }) => {
      if (!user) return;
      const targetMonth = Number(month ?? selectedMonth);
      const targetYear = Number(year ?? selectedYear);

      const created = await api.createIncome({
        userId: user.id,
        source,
        amount,
        occurredAt,
        month: targetMonth,
        year: targetYear,
        notes,
      });

      if (targetYear === Number(selectedYear)) {
        setIncomes((prev) => [created, ...prev]);
      }
      toast("Receita registrada.", "success");
      return created;
    },
    [user, selectedMonth, selectedYear, toast],
  );

  const deleteIncome = useCallback(
    async (id) => {
      await api.removeIncome(id);
      setIncomes((prev) => prev.filter((item) => item.id !== id));
      toast("Receita excluída.", "success");
    },
    [toast],
  );

  const addExpense = useCallback(
    async ({
      categoryId,
      categoryName,
      creditCardId,
      amount,
      description,
      occurredAt,
      month,
      year,
    }) => {
      if (!user) return;
      const card = creditCardId
        ? creditCards.find((c) => c.id === creditCardId)
        : null;

      const refDate = occurredAt ? new Date(occurredAt) : new Date();
      const { month: targetMonth, year: targetYear, forwarded } =
        resolveExpenseCompetence({
          selectedMonth: month ?? selectedMonth,
          selectedYear: year ?? selectedYear,
          card,
          autoForward: Boolean(preferences.auto_forward_card_expenses),
          referenceDate: refDate,
        });

      const created = await api.createExpense({
        userId: user.id,
        categoryId,
        categoryName,
        creditCardId,
        amount,
        description,
        occurredAt: refDate.toISOString(),
        month: targetMonth,
        year: targetYear,
      });

      if (targetYear === Number(selectedYear)) {
        setExpenses((prev) => [created, ...prev]);
      }

      if (forwarded) {
        const monthName =
          MONTHS.find((m) => m.value === targetMonth)?.label || targetMonth;
        toast(
          `Fatura fechada. Gasto enviado para ${monthName}/${targetYear}.`,
          "info",
        );
      } else {
        toast("Despesa registrada.", "success");
      }

      return created;
    },
    [
      user,
      creditCards,
      selectedMonth,
      selectedYear,
      preferences.auto_forward_card_expenses,
      toast,
    ],
  );

  const deleteExpense = useCallback(
    async (id) => {
      await api.removeExpense(id);
      setExpenses((prev) => prev.filter((item) => item.id !== id));
      toast("Despesa excluída.", "success");
    },
    [toast],
  );

  const addCategory = useCallback(
    async ({ name, color }) => {
      if (!user) return;
      const created = await api.createCategory({
        userId: user.id,
        name,
        color,
      });
      setCategories((prev) =>
        [...prev, created].sort((a, b) => a.name.localeCompare(b.name)),
      );
      toast("Categoria criada.", "success");
      return created;
    },
    [user, toast],
  );

  const renameCategory = useCallback(
    async ({ id, name }) => {
      const updated = await api.renameCategory({ id, name });
      setCategories((prev) =>
        prev
          .map((cat) => (cat.id === id ? updated : cat))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
      setExpenses((prev) =>
        prev.map((exp) =>
          exp.category_id === id
            ? { ...exp, category_name: updated.name }
            : exp,
        ),
      );
      toast("Categoria atualizada.", "success");
      return updated;
    },
    [toast],
  );

  const deleteCategory = useCallback(
    async (id) => {
      await api.removeCategory(id);
      setCategories((prev) => prev.filter((cat) => cat.id !== id));
      setExpenses((prev) =>
        prev.map((exp) =>
          exp.category_id === id ? { ...exp, category_id: null } : exp,
        ),
      );
      toast("Categoria excluída.", "success");
    },
    [toast],
  );

  const saveCard = useCallback(
    async ({ id, name, closingDay, spendingGoal, brandColor }) => {
      if (!user) return;
      const saved = await api.saveCreditCard({
        id,
        userId: user.id,
        name,
        closingDay,
        spendingGoal,
        brandColor,
      });

      setCreditCards((prev) =>
        id
          ? prev.map((card) => (card.id === id ? saved : card))
          : [...prev, saved],
      );
      toast(id ? "Cartão atualizado." : "Cartão criado.", "success");
      return saved;
    },
    [user, toast],
  );

  const deleteCard = useCallback(
    async (id) => {
      await api.removeCreditCard(id);
      setCreditCards((prev) => prev.filter((card) => card.id !== id));
      setExpenses((prev) =>
        prev.filter((exp) => exp.credit_card_id !== id),
      );
      setRecurringExpenses((prev) =>
        prev.map((rec) =>
          rec.credit_card_id === id ? { ...rec, credit_card_id: null } : rec,
        ),
      );
      toast("Cartão e gastos vinculados excluídos.", "success");
    },
    [toast],
  );

  const payInvoice = useCallback(
    async ({ cardId, month = selectedMonth, year = selectedYear }) => {
      await api.payCardInvoice({ cardId, month, year });
      setExpenses((prev) =>
        prev.map((exp) =>
          exp.credit_card_id === cardId &&
          Number(exp.competence_month) === Number(month) &&
          Number(exp.competence_year) === Number(year)
            ? { ...exp, is_invoice_paid: true }
            : exp,
        ),
      );
      toast("Fatura paga.", "success");
    },
    [selectedMonth, selectedYear, toast],
  );

  const saveRecurring = useCallback(
    async ({
      id,
      name,
      amount,
      billingDay,
      creditCardId,
      startMonth,
      startYear,
    }) => {
      if (!user) return;
      const saved = await api.saveRecurringExpense({
        id,
        userId: user.id,
        name,
        amount,
        billingDay,
        creditCardId,
        startMonth,
        startYear,
      });

      setRecurringExpenses((prev) =>
        id
          ? prev.map((item) => (item.id === id ? saved : item))
          : [saved, ...prev],
      );
      toast(id ? "Mensalidade atualizada." : "Mensalidade criada.", "success");
      return saved;
    },
    [user, toast],
  );

  const toggleRecurring = useCallback(async ({ id, isActive }) => {
    const updated = await api.toggleRecurringExpense({ id, isActive });
    setRecurringExpenses((prev) =>
      prev.map((item) => (item.id === id ? updated : item)),
    );
  }, []);

  const deleteRecurring = useCallback(
    async (id) => {
      await api.removeRecurringExpense(id);
      setRecurringExpenses((prev) => prev.filter((item) => item.id !== id));
      toast("Mensalidade excluída.", "success");
    },
    [toast],
  );

  const value = useMemo(
    () => ({
      categories,
      creditCards,
      recurringExpenses,
      incomes,
      expenses,
      kpis,
      isLoading,
      isSyncing,
      selectedMonth,
      selectedYear,
      refresh: () => loadYear(true),
      addIncome,
      deleteIncome,
      addExpense,
      deleteExpense,
      addCategory,
      renameCategory,
      deleteCategory,
      saveCard,
      deleteCard,
      payInvoice,
      saveRecurring,
      toggleRecurring,
      deleteRecurring,
    }),
    [
      categories,
      creditCards,
      recurringExpenses,
      incomes,
      expenses,
      kpis,
      isLoading,
      isSyncing,
      selectedMonth,
      selectedYear,
      loadYear,
      addIncome,
      deleteIncome,
      addExpense,
      deleteExpense,
      addCategory,
      renameCategory,
      deleteCategory,
      saveCard,
      deleteCard,
      payInvoice,
      saveRecurring,
      toggleRecurring,
      deleteRecurring,
    ],
  );

  return (
    <FinancialContext.Provider value={value}>
      {children}
    </FinancialContext.Provider>
  );
}
