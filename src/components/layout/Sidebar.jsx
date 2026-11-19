import { motion as Motion } from "framer-motion";
import {
  ArrowLeftRight,
  BarChart3,
  CreditCard,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Repeat,
  Settings,
  Sparkles,
  Wallet,
} from "lucide-react";
import { cn } from "../../lib/cn";
import { NAV_ITEMS } from "../../lib/constants";
import { getInitials } from "../../lib/formatters";

const ICON_MAP = {
  overview: LayoutDashboard,
  transactions: ArrowLeftRight,
  cards: CreditCard,
  recurring: Repeat,
  analytics: BarChart3,
  ai: Sparkles,
  settings: Settings,
};

export function Sidebar({
  activeTab,
  onSelectTab,
  collapsed,
  onToggleCollapse,
  displayName,
  email,
  onRequestLogout,
}) {
  const primaryItems = NAV_ITEMS.filter((item) => item.id !== "settings");
  const settingsItem = NAV_ITEMS.find((item) => item.id === "settings");

  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] transition-[width] duration-300 md:flex",
        collapsed ? "w-20" : "w-20 lg:w-64",
      )}
    >
      {/* Topo / Logo fixo no eixo de 40px */}
      <div className="flex h-16 items-center border-b border-[var(--border-subtle)] px-3">
        <button
          type="button"
          onClick={() => onSelectTab("overview")}
          className="flex w-full cursor-pointer items-center gap-3 pl-2 text-left"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-600/20">
            <Wallet size={20} />
          </div>
          {!collapsed ? (
            <span className="hidden truncate text-base font-extrabold tracking-tight text-[var(--text-primary)] lg:inline">
              Finans
            </span>
          ) : null}
        </button>
      </div>

      {/* Botão ancorado exatamente na mesma posição em ambos os estados */}
      <div className="hidden px-3 pt-3 pb-1 lg:block">
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
          title={collapsed ? "Expandir menu" : "Recolher menu"}
          className="flex h-10 w-full cursor-pointer items-center gap-3 rounded-2xl pr-3 pl-[18px] text-xs font-semibold text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center">
            {collapsed ? (
              <PanelLeftOpen size={18} />
            ) : (
              <PanelLeftClose size={18} />
            )}
          </span>
          {!collapsed ? <span className="truncate">Recolher menu</span> : null}
        </button>
      </div>

      {/* Navegação Principal */}
      <nav
        aria-label="Menu principal"
        className="custom-scrollbar flex-1 space-y-1 overflow-y-auto px-3 py-3"
      >
        {primaryItems.map((item) => {
          const Icon = ICON_MAP[item.id] || LayoutDashboard;
          const active = activeTab === item.id;
          const isAi = item.id === "ai";

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              title={item.label}
              className={cn(
                "group relative flex w-full cursor-pointer items-center gap-3 rounded-2xl py-2.5 pr-3 pl-[18px] text-sm font-semibold transition-colors",
                active
                  ? "text-white"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]",
              )}
            >
              {active ? (
                <Motion.span
                  layoutId="sidebar-active-pill"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  className={cn(
                    "absolute inset-0 rounded-2xl shadow-md",
                    isAi
                      ? "bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 shadow-indigo-600/20"
                      : "bg-gradient-to-r from-violet-600 to-indigo-600 shadow-violet-600/20",
                  )}
                />
              ) : null}

              <span className="relative z-10 flex h-5 w-5 shrink-0 items-center justify-center">
                <Icon
                  size={19}
                  className={cn(
                    !active && isAi && "text-violet-500 dark:text-cyan-400",
                  )}
                />
              </span>

              {!collapsed ? (
                <span className="relative z-10 hidden truncate lg:inline">
                  {item.label}
                </span>
              ) : null}

              {!collapsed && isAi && !active ? (
                <span className="relative z-10 ml-auto hidden rounded-full bg-violet-500/12 px-2 py-0.5 text-[10px] font-bold text-violet-500 dark:text-cyan-300 lg:inline">
                  AI
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      {/* Configurações, Perfil e Sair / Trocar Conta */}
      <div className="space-y-2 border-t border-[var(--border-subtle)] p-3">
        {settingsItem ? (
          <button
            type="button"
            onClick={() => onSelectTab(settingsItem.id)}
            title={settingsItem.label}
            className={cn(
              "relative flex w-full cursor-pointer items-center gap-3 rounded-2xl py-2.5 pr-3 pl-[18px] text-sm font-semibold transition-colors",
              activeTab === settingsItem.id
                ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-600/20"
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]",
            )}
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center">
              <Settings size={19} />
            </span>
            {!collapsed ? (
              <span className="hidden truncate lg:inline">
                {settingsItem.label}
              </span>
            ) : null}
          </button>
        ) : null}

        <div className="flex items-center gap-2.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] py-2 pr-2.5 pl-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600/20 to-indigo-600/20 text-xs font-extrabold text-violet-600 dark:text-violet-300">
            {getInitials(displayName)}
          </div>
          {!collapsed ? (
            <div className="hidden min-w-0 flex-1 lg:block">
              <p className="truncate text-xs font-bold text-[var(--text-primary)]">
                {displayName}
              </p>
              {email ? (
                <p className="truncate text-[10px] text-[var(--text-muted)]">
                  {email}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onRequestLogout}
          title="Sair / Trocar de conta"
          aria-label="Sair ou trocar de conta"
          className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-rose-500/15 bg-rose-500/8 py-2.5 pr-3 pl-[18px] text-xs font-bold text-rose-500 transition-colors hover:bg-rose-500/15"
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center">
            <LogOut size={17} />
          </span>
          {!collapsed ? (
            <span className="hidden truncate lg:inline">
              Sair / Trocar conta
            </span>
          ) : null}
        </button>
      </div>
    </aside>
  );
}
