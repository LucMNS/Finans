import { Calendar, Moon, Plus, Sparkles, Sun, Wallet } from "lucide-react";
import { MONTHS, getAvailableYears } from "../../lib/constants";
import { getGreeting } from "../../lib/formatters";
import { Button } from "../ui/Button";
import { SelectPill } from "../ui/SelectPill";

export function TopBar({
  displayName,
  selectedMonth,
  selectedYear,
  onChangeMonth,
  onChangeYear,
  onOpenQuickEntry,
  onOpenAI,
  isDark,
  onToggleTheme,
}) {
  const greeting = getGreeting();
  const yearOptions = getAvailableYears(selectedYear);

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border-subtle)] bg-[var(--bg-glass)] px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        {/* Linha 1: Saudação + Botões rápidos no mobile */}
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-600/20 md:hidden">
              <Wallet size={18} />
            </div>

            <p className="truncate text-sm font-extrabold tracking-tight text-[var(--text-primary)] sm:text-base lg:text-lg">
              {greeting},{" "}
              <span className="bg-gradient-to-r from-violet-500 to-indigo-500 bg-clip-text text-transparent">
                {displayName}
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
            title={isDark ? "Modo claro" : "Modo escuro"}
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] shadow-sm transition-colors hover:border-violet-500/40 hover:text-[var(--text-primary)] sm:hidden"
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>

        {/* Linha 2 (mobile) / Direita (tablet e desktop): Filtros + Ações */}
        <div className="flex items-center gap-2 sm:justify-end">
          <SelectPill
            value={selectedMonth}
            options={MONTHS}
            onChange={(val) => onChangeMonth(Number(val))}
            icon={Calendar}
            size="sm"
            className="min-w-0 flex-1 sm:w-[144px] sm:flex-none"
            align="left"
          />
          <SelectPill
            value={selectedYear}
            options={yearOptions}
            onChange={(val) => onChangeYear(Number(val))}
            size="sm"
            className="w-[88px] shrink-0"
            align="right"
          />

          <button
            type="button"
            onClick={onOpenAI}
            aria-label="FinanscIA"
            title="FinanscIA"
            className="hidden h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-violet-500/25 bg-gradient-to-r from-violet-500/10 to-cyan-500/10 px-3 text-xs font-bold text-violet-600 transition-all hover:border-violet-500/45 dark:text-cyan-300 sm:inline-flex"
          >
            <Sparkles size={14} />
            <span className="hidden lg:inline">FinanscIA</span>
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
            title={isDark ? "Modo claro" : "Modo escuro"}
            className="hidden h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] shadow-sm transition-colors hover:border-violet-500/40 hover:text-[var(--text-primary)] sm:flex"
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <Button
            size="sm"
            onClick={onOpenQuickEntry}
            className="hidden shrink-0 md:inline-flex"
          >
            <Plus size={15} />
            Lançar
          </Button>
        </div>
      </div>
    </header>
  );
}
