import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "../ui/Badge";
import { Card } from "../ui/Card";
import { formatCurrency } from "../../lib/formatters";

function formatCompactAxis(value) {
  const num = Number(value || 0);
  if (num >= 1000) {
    const k = num / 1000;
    return `R$${Number.isInteger(k) ? k : k.toFixed(1)}k`;
  }
  return `R$${num}`;
}

export function AnnualComparisonChart({
  data = [],
  year,
  initialMonth = 1,
}) {
  const periodKey = `${year}-${initialMonth}`;
  const [selection, setSelection] = useState({
    key: periodKey,
    month: initialMonth,
  });

  const activeMonth =
    selection.key === periodKey ? selection.month : initialMonth;

  const setActiveMonth = (month) => {
    setSelection({ key: periodKey, month });
  };

  const activeData =
    data.find((d) => d.month === activeMonth) || data[0] || null;

  const handleMonthSelect = (entry) => {
    if (entry && entry.month) {
      setActiveMonth(entry.month);
    }
  };

  return (
    <Card padding="p-4 sm:p-6" className="min-w-0 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-base font-bold text-[var(--text-primary)] sm:text-lg">
            Receitas vs Despesas ({year})
          </h2>
          <div className="flex items-center gap-3 text-xs font-semibold text-[var(--text-secondary)]">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              Receitas
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
              Despesas
            </span>
          </div>
        </div>

        {activeData ? (
          <Badge tone={activeData.balance >= 0 ? "income" : "danger"}>
            {activeData.label}
          </Badge>
        ) : null}
      </div>

      {/* Resumo dinâmico do mês selecionado */}
      {activeData ? (
        <div className="grid grid-cols-3 gap-2.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3 sm:gap-4 sm:p-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-[var(--text-muted)]">
              Receitas ({activeData.short})
            </p>
            <p className="tabular-nums mt-0.5 truncate text-xs font-extrabold text-emerald-500 sm:text-base">
              {formatCurrency(activeData.incomes)}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-[var(--text-muted)]">
              Despesas ({activeData.short})
            </p>
            <p className="tabular-nums mt-0.5 truncate text-xs font-extrabold text-violet-500 sm:text-base">
              {formatCurrency(activeData.expenses)}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-[var(--text-muted)]">
              Saldo ({activeData.short})
            </p>
            <p
              className={`tabular-nums mt-0.5 truncate text-xs font-extrabold sm:text-base ${
                activeData.balance >= 0 ? "text-emerald-500" : "text-rose-500"
              }`}
            >
              {formatCurrency(activeData.balance)}
            </p>
          </div>
        </div>
      ) : null}

      {/* Gráfico Anual */}
      <div className="h-60 w-full sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 4, left: -14, bottom: 0 }}
            barGap={3}
          >
            <CartesianGrid
              vertical={false}
              stroke="currentColor"
              strokeOpacity={0.08}
              strokeDasharray="4 4"
            />
            <XAxis
              dataKey="short"
              axisLine={false}
              tickLine={false}
              interval={0}
              tick={{
                fill: "var(--text-muted)",
                fontSize: 11,
                fontWeight: 600,
              }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{
                fill: "var(--text-muted)",
                fontSize: 11,
                fontWeight: 600,
              }}
              tickFormatter={formatCompactAxis}
            />
            <Bar
              dataKey="incomes"
              name="Receitas"
              radius={[6, 6, 2, 2]}
              maxBarSize={20}
              cursor="pointer"
              onClick={(entry) => handleMonthSelect(entry)}
            >
              {data.map((entry) => (
                <Cell
                  key={`inc-${entry.month}`}
                  fill="#10b981"
                  fillOpacity={entry.month === activeMonth ? 1 : 0.36}
                />
              ))}
            </Bar>
            <Bar
              dataKey="expenses"
              name="Despesas"
              radius={[6, 6, 2, 2]}
              maxBarSize={20}
              cursor="pointer"
              onClick={(entry) => handleMonthSelect(entry)}
            >
              {data.map((entry) => (
                <Cell
                  key={`exp-${entry.month}`}
                  fill="#8b5cf6"
                  fillOpacity={entry.month === activeMonth ? 1 : 0.36}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Seletor rápido de mês para toque fácil mesmo em meses zerados */}
      <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-12">
        {data.map((entry) => {
          const isActive = entry.month === activeMonth;
          return (
            <button
              key={entry.month}
              type="button"
              onClick={() => setActiveMonth(entry.month)}
              className={`cursor-pointer rounded-xl py-1.5 text-[11px] font-bold transition-colors ${
                isActive
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm"
                  : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {entry.short}
            </button>
          );
        })}
      </div>
    </Card>
  );
}
