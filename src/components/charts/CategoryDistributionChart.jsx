import { useState } from "react";
import { AlignLeft, BarChart2, PieChart as PieIcon } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Sector,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "../ui/Badge";
import { Card } from "../ui/Card";
import { formatCurrency } from "../../lib/formatters";

const VIEW_MODES = [
  { id: "donut", label: "Rosca", icon: PieIcon },
  { id: "horizontal", label: "Barras", icon: AlignLeft },
  { id: "vertical", label: "Colunas", icon: BarChart2 },
];

function formatCompactAxis(value) {
  const num = Number(value || 0);
  if (num >= 1000) {
    const k = num / 1000;
    return `R$${Number.isInteger(k) ? k : k.toFixed(1)}k`;
  }
  return `R$${num}`;
}

export function CategoryDistributionChart({ data = [], totalExpenses = 0 }) {
  const [viewMode, setViewMode] = useState("donut");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const safeIndex =
    data.length === 0 ? 0 : Math.min(selectedIndex, data.length - 1);
  const activeItem = data[safeIndex] || null;
  const maxItemValue =
    data.length > 0 ? Math.max(...data.map((d) => d.value), 1) : 1;

  const renderDonutSector = (props, index) => {
    const isActive = index === safeIndex;
    return (
      <Sector
        cx={props.cx}
        cy={props.cy}
        innerRadius={props.innerRadius}
        outerRadius={isActive ? props.outerRadius + 6 : props.outerRadius}
        startAngle={props.startAngle}
        endAngle={props.endAngle}
        fill={props.fill}
        cornerRadius={6}
        fillOpacity={isActive ? 1 : 0.42}
        style={{
          outline: "none",
          cursor: "pointer",
          transition: "all 220ms ease",
        }}
      />
    );
  };

  return (
    <Card padding="p-4 sm:p-6" className="min-w-0 space-y-5">
      {/* Cabeçalho + Seletor de Visualização */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-[var(--text-primary)] sm:text-lg">
            Gastos por Categoria
          </h2>
          {activeItem ? (
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: activeItem.color }}
              />
              <span className="font-bold text-[var(--text-primary)]">
                {activeItem.name}
              </span>
              <span className="tabular-nums font-extrabold text-violet-500">
                {formatCurrency(activeItem.value)}
              </span>
              <Badge tone="neutral">{activeItem.percLabel}</Badge>
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-3 rounded-2xl bg-[var(--bg-elevated)] p-1 sm:w-auto">
          {VIEW_MODES.map((mode) => {
            const Icon = mode.icon;
            const active = viewMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => setViewMode(mode.id)}
                className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                  active
                    ? "bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                <Icon size={14} />
                <span>{mode.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex h-56 items-center justify-center rounded-2xl border border-dashed border-[var(--border-strong)]">
          <p className="text-xs font-semibold text-[var(--text-muted)]">
            Sem gastos registrados neste período.
          </p>
        </div>
      ) : (
        <div className="grid items-center gap-6 lg:grid-cols-12">
          {/* Área do Gráfico */}
          <div className="min-w-0 lg:col-span-7">
            {viewMode === "donut" ? (
              <div className="relative mx-auto h-64 w-full max-w-[320px] sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius="62%"
                      outerRadius="84%"
                      paddingAngle={3}
                      stroke="none"
                      isAnimationActive={true}
                      shape={renderDonutSector}
                      onClick={(_, index) => {
                        if (typeof index === "number") setSelectedIndex(index);
                      }}
                    >
                      {data.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>

                {/* Leitura Central Limpa */}
                {activeItem ? (
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-10 text-center">
                    <span className="max-w-full truncate text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      {activeItem.name}
                    </span>
                    <span className="tabular-nums mt-0.5 text-lg font-extrabold tracking-tight text-[var(--text-primary)] sm:text-xl">
                      {formatCurrency(activeItem.value)}
                    </span>
                    <span
                      className="mt-1 rounded-full px-2 py-0.5 text-[11px] font-bold"
                      style={{
                        backgroundColor: `${activeItem.color}20`,
                        color: activeItem.color,
                      }}
                    >
                      {activeItem.percLabel} do total
                    </span>
                  </div>
                ) : null}
              </div>
            ) : viewMode === "horizontal" ? (
              <div className="space-y-3 py-1">
                {data.map((entry, idx) => {
                  const isActive = idx === safeIndex;
                  const widthPct = Math.max(
                    (entry.value / maxItemValue) * 100,
                    6,
                  );

                  return (
                    <button
                      key={entry.name}
                      type="button"
                      onClick={() => setSelectedIndex(idx)}
                      className={`w-full cursor-pointer rounded-2xl border p-3 text-left transition-all ${
                        isActive
                          ? "border-violet-500/45 bg-[var(--bg-elevated)]"
                          : "border-transparent bg-[var(--bg-elevated)]/60 opacity-75 hover:opacity-100"
                      }`}
                    >
                      <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                        <span className="truncate font-bold text-[var(--text-primary)]">
                          {entry.name}
                        </span>
                        <span className="tabular-nums shrink-0 font-extrabold text-[var(--text-primary)]">
                          {formatCurrency(entry.value)}{" "}
                          <span className="text-[var(--text-muted)]">
                            ({entry.percLabel})
                          </span>
                        </span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--bg-surface)]">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${widthPct}%`,
                            backgroundColor: entry.color,
                          }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="h-64 w-full sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.slice(0, 8)}
                    margin={{ top: 12, right: 8, left: -12, bottom: 4 }}
                  >
                    <CartesianGrid
                      vertical={false}
                      stroke="currentColor"
                      strokeOpacity={0.08}
                      strokeDasharray="4 4"
                    />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      tick={{
                        fill: "var(--text-muted)",
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                      tickFormatter={(val) =>
                        val.length > 8 ? `${val.slice(0, 7)}.` : val
                      }
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
                      dataKey="value"
                      radius={[8, 8, 2, 2]}
                      maxBarSize={42}
                      cursor="pointer"
                      onClick={(_, index) => {
                        if (typeof index === "number") setSelectedIndex(index);
                      }}
                    >
                      {data.slice(0, 8).map((entry, idx) => (
                        <Cell
                          key={entry.name}
                          fill={entry.color}
                          fillOpacity={idx === safeIndex ? 1 : 0.38}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Legenda Interativa Sincronizada */}
          <div className="space-y-2 lg:col-span-5">
            <div className="flex items-center justify-between px-1 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              <span>Categorias ({data.length})</span>
              <span className="tabular-nums">
                Total: {formatCurrency(totalExpenses)}
              </span>
            </div>

            <div className="custom-scrollbar max-h-64 space-y-1.5 overflow-y-auto pr-1">
              {data.map((entry, idx) => {
                const isActive = idx === safeIndex;
                return (
                  <button
                    key={entry.name}
                    type="button"
                    onClick={() => setSelectedIndex(idx)}
                    className={`flex w-full cursor-pointer items-center justify-between gap-2.5 rounded-2xl border px-3 py-2.5 text-left transition-all ${
                      isActive
                        ? "border-violet-500/45 bg-[var(--bg-elevated)] shadow-sm"
                        : "border-transparent bg-transparent hover:bg-[var(--bg-elevated)]/60"
                    }`}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="truncate text-xs font-bold text-[var(--text-primary)]">
                        {entry.name}
                      </span>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <span className="tabular-nums whitespace-nowrap text-xs font-extrabold text-[var(--text-primary)]">
                        {formatCurrency(entry.value)}
                      </span>
                      <span
                        className="tabular-nums min-w-[38px] rounded-full px-1.5 py-0.5 text-center text-[11px] font-bold"
                        style={{
                          backgroundColor: `${entry.color}18`,
                          color: entry.color,
                        }}
                      >
                        {entry.percLabel}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
