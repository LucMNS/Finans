import {
  CreditCard,
  LayoutDashboard,
  Menu,
  Plus,
  Sparkles,
} from "lucide-react";
import { cn } from "../../lib/cn";

function NavButton({ id, label, icon, active, onClick }) {
  const IconComponent = icon;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "flex flex-1 cursor-pointer flex-col items-center justify-center gap-1 py-1.5 text-[10px] font-semibold transition-colors",
        active
          ? id === "ai"
            ? "text-cyan-500 dark:text-cyan-400"
            : "text-violet-600 dark:text-violet-400"
          : "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
      )}
    >
      <IconComponent size={20} strokeWidth={active ? 2.4 : 1.9} />
      <span>{label}</span>
    </button>
  );
}

export function MobileBottomNav({
  activeTab,
  onSelectTab,
  onOpenQuickEntry,
  onOpenMoreMenu,
}) {
  const isMoreTabActive =
    activeTab === "transactions" ||
    activeTab === "recurring" ||
    activeTab === "analytics" ||
    activeTab === "settings";

  return (
    <nav
      aria-label="Navegação rápida mobile"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border-subtle)] bg-[var(--bg-glass)] px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl md:hidden"
    >
      <div className="mx-auto flex max-w-md items-end justify-between">
        <NavButton
          id="overview"
          label="Início"
          icon={LayoutDashboard}
          active={activeTab === "overview"}
          onClick={() => onSelectTab("overview")}
        />

        <NavButton
          id="cards"
          label="Cartões"
          icon={CreditCard}
          active={activeTab === "cards"}
          onClick={() => onSelectTab("cards")}
        />

        {/* Botão Central Ergonomico para Lançamento Rápido */}
        <div className="flex flex-1 justify-center">
          <button
            type="button"
            onClick={onOpenQuickEntry}
            aria-label="Novo lançamento rápido"
            className="-mt-6 flex h-14 w-14 cursor-pointer items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-xl shadow-violet-600/35 ring-4 ring-[var(--bg-canvas)] transition-transform active:scale-95"
          >
            <Plus size={26} strokeWidth={2.5} />
          </button>
        </div>

        <NavButton
          id="ai"
          label="FinanscIA"
          icon={Sparkles}
          active={activeTab === "ai"}
          onClick={() => onSelectTab("ai")}
        />

        <NavButton
          id="more"
          label="Menu"
          icon={Menu}
          active={isMoreTabActive}
          onClick={onOpenMoreMenu}
        />
      </div>
    </nav>
  );
}
