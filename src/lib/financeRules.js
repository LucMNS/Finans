import { CATEGORY_COLORS, MONTHS } from "./constants";

export function isRecurringActiveInPeriod(item, month, year) {
  if (!item || !item.is_active) return false;
  const targetValue = Number(year) * 12 + Number(month);
  const startYear = Number(item.start_year);
  const startMonth = Number(item.start_month);
  if (!Number.isFinite(startYear) || !Number.isFinite(startMonth)) {
    return true;
  }
  return startYear * 12 + startMonth <= targetValue;
}

export function isRecurringStartedInPeriod(item, month, year) {
  if (!item) return true;
  const targetValue = Number(year) * 12 + Number(month);
  const startYear = Number(item.start_year);
  const startMonth = Number(item.start_month);
  if (!Number.isFinite(startYear) || !Number.isFinite(startMonth)) {
    return true;
  }
  return startYear * 12 + startMonth <= targetValue;
}

export function resolveExpenseCompetence({
  selectedMonth,
  selectedYear,
  card,
  autoForward,
  referenceDate = new Date(),
}) {
  let month = Number(selectedMonth);
  let year = Number(selectedYear);
  let forwarded = false;

  if (autoForward && card && referenceDate.getDate() > Number(card.closing_day)) {
    if (month === 12) {
      month = 1;
      year += 1;
    } else {
      month += 1;
    }
    forwarded = true;
  }

  return { month, year, forwarded };
}

export function calculateMonthlyKpis({
  incomes = [],
  expenses = [],
  recurringExpenses = [],
  month,
  year,
}) {
  const targetMonth = Number(month);
  const targetYear = Number(year);

  const incomeTotal = incomes
    .filter(
      (item) =>
        Number(item.competence_month) === targetMonth &&
        Number(item.competence_year) === targetYear,
    )
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const monthExpenses = expenses.filter(
    (item) =>
      Number(item.competence_month) === targetMonth &&
      Number(item.competence_year) === targetYear,
  );

  const cashPixVariable = monthExpenses
    .filter((item) => !item.credit_card_id)
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const cardVariable = monthExpenses
    .filter((item) => Boolean(item.credit_card_id))
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const recurringForPeriod = recurringExpenses.filter((item) =>
    isRecurringActiveInPeriod(item, targetMonth, targetYear),
  );

  const recurringCashTotal = recurringForPeriod
    .filter((item) => !item.credit_card_id)
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const recurringCardTotal = recurringForPeriod
    .filter((item) => Boolean(item.credit_card_id))
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const recurringActiveTotal = recurringCashTotal + recurringCardTotal;
  const cashPixTotal = cashPixVariable + recurringCashTotal;
  const creditCardTotal = cardVariable + recurringCardTotal;
  const expensesTotal = cashPixTotal + creditCardTotal;
  const freeBalance = incomeTotal - expensesTotal;

  return {
    incomeTotal,
    cashPixVariable,
    recurringCashTotal,
    recurringCardTotal,
    recurringActiveTotal,
    cashPixTotal,
    creditCardTotal,
    expensesTotal,
    freeBalance,
  };
}

export function calculateCardInvoiceStats({
  card,
  expenses = [],
  recurringExpenses = [],
  month,
  year,
  now = new Date(),
}) {
  const targetMonth = Number(month);
  const targetYear = Number(year);

  const cardExpenses = expenses.filter(
    (item) =>
      item.credit_card_id === card.id &&
      Number(item.competence_month) === targetMonth &&
      Number(item.competence_year) === targetYear,
  );

  const variableTotal = cardExpenses.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0,
  );

  const recurringTotal = recurringExpenses
    .filter(
      (item) =>
        item.credit_card_id === card.id &&
        isRecurringActiveInPeriod(item, targetMonth, targetYear),
    )
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const total = variableTotal + recurringTotal;

  const unpaidVariable = cardExpenses
    .filter((item) => !item.is_invoice_paid)
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const hasVariableExpenses = cardExpenses.length > 0;
  const canPayInvoice = unpaidVariable > 0;
  const isPaid = hasVariableExpenses && unpaidVariable === 0;
  const unpaidTotal = canPayInvoice
    ? unpaidVariable + recurringTotal
    : isPaid
      ? 0
      : recurringTotal;

  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const isCurrentPeriod =
    targetMonth === currentMonth && targetYear === currentYear;
  const isPastPeriod =
    targetYear < currentYear ||
    (targetYear === currentYear && targetMonth < currentMonth);

  const isClosedOrOverdue =
    total > 0 &&
    !isPaid &&
    canPayInvoice &&
    ((isCurrentPeriod && now.getDate() > Number(card.closing_day)) ||
      isPastPeriod);

  const status = isPaid ? "paid" : isClosedOrOverdue ? "closed" : "open";
  const statusLabel = isPaid ? "Paga" : isClosedOrOverdue ? "Fechada" : "Aberta";

  const goal = Number(card.spending_goal) || 0;
  const rawGoalPct = goal > 0 ? (total / goal) * 100 : 0;
  const goalPct = goal > 0 ? Math.min(rawGoalPct, 100) : 0;

  let goalTone = "normal";
  if (goal > 0 && total >= goal) {
    goalTone = "danger";
  } else if (goal > 0 && total >= goal * 0.75) {
    goalTone = "warning";
  }

  return {
    total,
    variableTotal,
    recurringTotal,
    unpaidTotal,
    unpaidVariable,
    canPayInvoice,
    count: cardExpenses.length,
    isPaid,
    isClosedOrOverdue,
    status,
    statusLabel,
    goal,
    rawGoalPct,
    goalPct,
    goalTone,
  };
}

export function calculateCategoryDistribution({
  expenses = [],
  categories = [],
  recurringExpenses = [],
  month,
  year,
}) {
  const targetMonth = Number(month);
  const targetYear = Number(year);

  const colorByName = new Map();
  const colorById = new Map();
  categories.forEach((cat) => {
    if (cat.color) {
      colorById.set(cat.id, cat.color);
      colorByName.set(cat.name.trim().toLowerCase(), cat.color);
    }
  });

  const totals = new Map();

  expenses
    .filter(
      (item) =>
        Number(item.competence_month) === targetMonth &&
        Number(item.competence_year) === targetYear,
    )
    .forEach((item) => {
      const name = item.category_name || "Outros";
      const existing = totals.get(name) || {
        name,
        value: 0,
        color:
          (item.category_id && colorById.get(item.category_id)) ||
          colorByName.get(name.trim().toLowerCase()) ||
          null,
      };
      existing.value += Number(item.amount || 0);
      totals.set(name, existing);
    });

  const recurringTotal = recurringExpenses
    .filter((item) => isRecurringActiveInPeriod(item, targetMonth, targetYear))
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  if (recurringTotal > 0) {
    const existing = totals.get("Mensalidades") || {
      name: "Mensalidades",
      value: 0,
      color: "#8b5cf6",
    };
    existing.value += recurringTotal;
    totals.set("Mensalidades", existing);
  }

  const grandTotal = Array.from(totals.values()).reduce(
    (sum, entry) => sum + entry.value,
    0,
  );

  return Array.from(totals.values())
    .sort((a, b) => b.value - a.value)
    .map((entry, idx) => {
      const percentage = grandTotal > 0 ? (entry.value / grandTotal) * 100 : 0;
      return {
        name: entry.name,
        value: entry.value,
        color: entry.color || CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
        percentage,
        percLabel: `${Math.round(percentage)}%`,
      };
    });
}

export function calculateAnnualComparison({
  incomes = [],
  expenses = [],
  recurringExpenses = [],
  year,
}) {
  const targetYear = Number(year);

  return MONTHS.map((m) => {
    const monthIncomes = incomes
      .filter(
        (item) =>
          Number(item.competence_year) === targetYear &&
          Number(item.competence_month) === m.value,
      )
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const monthVariableExpenses = expenses
      .filter(
        (item) =>
          Number(item.competence_year) === targetYear &&
          Number(item.competence_month) === m.value,
      )
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const monthRecurring = recurringExpenses
      .filter((item) => isRecurringActiveInPeriod(item, m.value, targetYear))
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const expensesTotal = monthVariableExpenses + monthRecurring;

    return {
      month: m.value,
      short: m.short,
      label: m.label,
      incomes: monthIncomes,
      expenses: expensesTotal,
      balance: monthIncomes - expensesTotal,
    };
  });
}

export function groupItemsByDate(items = []) {
  const sorted = [...items].sort(
    (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime(),
  );

  const today = new Date();
  const todayKey = today.toLocaleDateString("pt-BR");
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = yesterday.toLocaleDateString("pt-BR");

  const groupsMap = new Map();

  for (const item of sorted) {
    const dt = new Date(item.occurred_at);
    const rawDate = Number.isNaN(dt.getTime())
      ? "Sem data"
      : dt.toLocaleDateString("pt-BR");

    let label = rawDate;
    if (rawDate === todayKey) label = "Hoje";
    else if (rawDate === yesterdayKey) label = "Ontem";

    if (!groupsMap.has(rawDate)) {
      groupsMap.set(rawDate, { key: rawDate, label, items: [] });
    }
    groupsMap.get(rawDate).items.push(item);
  }

  return Array.from(groupsMap.values());
}

export function toLocalDateTimeInput(date = new Date()) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}
