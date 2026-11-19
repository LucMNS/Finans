import { cn } from "../../lib/cn";

const CARD_VARIANTS = {
  default:
    "bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-[var(--shadow-card)]",
  elevated:
    "bg-[var(--bg-elevated)] border border-[var(--border-subtle)]",
  glass:
    "bg-[var(--bg-glass)] border border-[var(--border-subtle)] backdrop-blur-xl shadow-[var(--shadow-card)]",
  ai:
    "relative overflow-hidden bg-gradient-to-br from-violet-600/10 via-[var(--bg-surface)] to-cyan-500/10 border border-violet-500/25 shadow-[var(--shadow-card)]",
  hero:
    "relative overflow-hidden bg-gradient-to-br from-violet-600 via-indigo-600 to-indigo-700 text-white border border-white/15 shadow-xl shadow-indigo-950/20",
};

export function Card({
  children,
  variant = "default",
  padding = "p-5 sm:p-6",
  className = "",
  ...props
}) {
  return (
    <div
      className={cn(
        "rounded-3xl transition-colors duration-200",
        CARD_VARIANTS[variant] || CARD_VARIANTS.default,
        padding,
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
