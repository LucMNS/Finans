import { useState } from "react";
import {
  ArrowLeftRight,
  BarChart3,
  LogOut,
  Moon,
  Repeat,
  Settings,
  Sun,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import { cn } from "../../lib/cn";
import { getInitials } from "../../lib/formatters";
import { AdaptiveSheet } from "../ui/AdaptiveSheet";
import { ConfirmModal } from "../ui/ConfirmModal";
import { MobileBottomNav } from "./MobileBottomNav";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

const MORE_ITEMS = [
  {
    id: "transactions",
    label: "Movimentações",
    icon: ArrowLeftRight,
  },
  {
    id: "recurring",
    label: "Mensalidades",
    icon: Repeat,
  },
  {
    id: "analytics",
    label: "Análises",
    icon: BarChart3,
  },
  {
    id: "settings",
    label: "Configurações",
    icon: Settings,
  },
];

export function AppShell({
  activeTab,
  onSelectTab,
  selectedMonth,
  selectedYear,
  onChangeMonth,
  onChangeYear,
  quickEntrySheet,
  onOpenQuickEntry,
  children,
}) {
  const { user, displayName, signOut } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { toast } = useToast();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleConfirmLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut();
      toast("Sessão encerrada.", "info");
    } catch {
      toast("Erro ao encerrar sessão.", "error");
    } finally {
      setLoggingOut(false);
      setLogoutModalOpen(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] bg-[var(--bg-canvas)] text-[var(--text-primary)] transition-colors duration-300">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        displayName={displayName}
        email={user?.email}
        onRequestLogout={() => setLogoutModalOpen(true)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          displayName={displayName}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          onChangeMonth={onChangeMonth}
          onChangeYear={onChangeYear}
          onOpenQuickEntry={onOpenQuickEntry}
          onOpenAI={() => onSelectTab("ai")}
          isDark={isDark}
          onToggleTheme={toggleTheme}
        />

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-5 pb-[calc(7.5rem+env(safe-area-inset-bottom))] sm:px-6 sm:pt-6 md:pb-10 lg:px-8">
          {children}
        </main>
      </div>

      <MobileBottomNav
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        onOpenQuickEntry={onOpenQuickEntry}
        onOpenMoreMenu={() => setMoreMenuOpen(true)}
      />

      <AdaptiveSheet
        isOpen={moreMenuOpen}
        onClose={() => setMoreMenuOpen(false)}
        title="Menu"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3.5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600/20 to-indigo-600/20 text-xs font-extrabold text-violet-600 dark:text-violet-300">
                {getInitials(displayName)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-[var(--text-primary)]">
                  {displayName}
                </p>
                <p className="truncate text-xs text-[var(--text-muted)]">
                  {user?.email}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Alternar tema"
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)]"
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {MORE_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelectTab(item.id);
                    setMoreMenuOpen(false);
                  }}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-2xl border p-3 text-left transition-all",
                    active
                      ? "border-violet-500/45 bg-violet-500/10"
                      : "border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:border-[var(--border-strong)]",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                      active
                        ? "bg-violet-600 text-white"
                        : "bg-[var(--bg-surface)] text-violet-500",
                    )}
                  >
                    <Icon size={18} />
                  </div>
                  <p className="min-w-0 truncate text-xs font-bold text-[var(--text-primary)]">
                    {item.label}
                  </p>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              setMoreMenuOpen(false);
              setLogoutModalOpen(true);
            }}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 py-3 text-sm font-semibold text-rose-500 transition-colors hover:bg-rose-500/15"
          >
            <LogOut size={16} />
            Sair / Trocar de conta
          </button>
        </div>
      </AdaptiveSheet>

      {quickEntrySheet}

      <ConfirmModal
        isOpen={logoutModalOpen}
        onClose={() => setLogoutModalOpen(false)}
        onConfirm={handleConfirmLogout}
        title="Sair ou trocar de conta?"
        message="Você voltará para a tela de login."
        confirmLabel="Sair"
        cancelLabel="Cancelar"
        tone="warning"
        loading={loggingOut}
      />
    </div>
  );
}
