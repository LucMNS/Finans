import { cn } from "../../lib/cn";

const BADGE_TONES = {
  neutral:
    "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border-subtle)]",
  primary:
    "bg-violet-500/12 text-violet-600 dark:text-violet-300 border-violet-500/25",
  income:
    "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
  warning:
    "bg-amber-500/12 text-amber-600 dark:text-amber-400 border-amber-500/25",
  danger:
    "bg-rose-500/12 text-rose-600 dark:text-rose-400 border-rose-500/25",
  ai:
    "bg-gradient-to-r from-violet-500/15 to-cyan-500/15 text-violet-600 dark:text-cyan-300 border-violet-500/25",
};

export function Badge({ children, tone = "neutral", className = "" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-tight",
        BADGE_TONES[tone] || BADGE_TONES.neutral,
        className,
      )}
    >
      {children}
    </span>
  );
}
