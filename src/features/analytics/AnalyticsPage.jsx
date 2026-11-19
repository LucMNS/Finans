import { useMemo } from "react";
import { ArrowDownRight, ArrowUpRight, Scale } from "lucide-react";
import { AnnualComparisonChart } from "../../components/charts/AnnualComparisonChart";
import { CategoryDistributionChart } from "../../components/charts/CategoryDistributionChart";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { useFinancialData } from "../../contexts/FinancialContext";
import { MONTHS } from "../../lib/constants";
import {
  calculateAnnualComparison,
  calculateCategoryDistribution,
} from "../../lib/financeRules";
import { formatCurrency } from "../../lib/formatters";

export function AnalyticsPage() {
  const {
    expenses,
    incomes,
    categories,
    recurringExpenses,
    kpis,
    selectedMonth,
    selectedYear,
  } = useFinancialData();

  const monthName =
    MONTHS.find((m) => m.value === selectedMonth)?.label || selectedMonth;

  const distributionData = useMemo(
    () =>
      calculateCategoryDistribution({
        expenses,
        categories,
        recurringExpenses,
        month: selectedMonth,
        year: selectedYear,
      }),
    [expenses, categories, recurringExpenses, selectedMonth, selectedYear],
  );

  const annualData = useMemo(
    () =>
      calculateAnnualComparison({
        incomes,
        expenses,
        recurringExpenses,
        year: selectedYear,
      }),
    [incomes, expenses, recurringExpenses, selectedYear],
  );

  const annualTotals = useMemo(() => {
    const totalIncomes = annualData.reduce((s, d) => s + d.incomes, 0);
    const totalExpenses = annualData.reduce((s, d) => s + d.expenses, 0);
    return {
      incomes: totalIncomes,
      expenses: totalExpenses,
      balance: totalIncomes - totalExpenses,
    };
  }, [annualData]);

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <h1 className="text-xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-2xl">
          Análises
        </h1>
        <Badge tone="primary">
          {monthName} / {selectedYear}
        </Badge>
      </div>

      {/* Resumo Anual */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <Card padding="p-4 sm:p-5" className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[var(--text-secondary)]">
              Receitas ({selectedYear})
            </p>
            <p className="tabular-nums mt-1 truncate text-lg font-extrabold text-emerald-500 sm:text-xl">
              {formatCurrency(annualTotals.incomes)}
            </p>
          </div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/12 text-emerald-500">
            <ArrowUpRight size={18} />
          </span>
        </Card>

        <Card padding="p-4 sm:p-5" className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[var(--text-secondary)]">
              Gastos ({selectedYear})
            </p>
            <p className="tabular-nums mt-1 truncate text-lg font-extrabold text-violet-500 sm:text-xl">
              {formatCurrency(annualTotals.expenses)}
            </p>
          </div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-500/12 text-violet-500">
            <ArrowDownRight size={18} />
          </span>
        </Card>

        <Card padding="p-4 sm:p-5" className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[var(--text-secondary)]">
              Balanço ({selectedYear})
            </p>
            <p
              className={`tabular-nums mt-1 truncate text-lg font-extrabold sm:text-xl ${
                annualTotals.balance >= 0 ? "text-emerald-500" : "text-rose-500"
              }`}
            >
              {formatCurrency(annualTotals.balance)}
            </p>
          </div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--bg-elevated)] text-[var(--text-secondary)]">
            <Scale size={18} />
          </span>
        </Card>
      </div>

      {/* Distribuição por Categoria */}
      <CategoryDistributionChart
        data={distributionData}
        totalExpenses={kpis.expensesTotal}
      />

      {/* Comparativo Anual Mês a Mês */}
      <AnnualComparisonChart
        data={annualData}
        year={selectedYear}
        initialMonth={selectedMonth}
      />
    </div>
  );
}
