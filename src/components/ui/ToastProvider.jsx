import { useCallback, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  Sparkles,
  X,
} from "lucide-react";
import { ToastContext } from "../../contexts/ToastContext";

const TONE_STYLES = {
  success: {
    icon: CheckCircle2,
    ring: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    bar: "bg-emerald-500",
  },
  error: {
    icon: AlertCircle,
    ring: "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400",
    bar: "bg-rose-500",
  },
  warning: {
    icon: AlertTriangle,
    ring: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    bar: "bg-amber-500",
  },
  info: {
    icon: Info,
    ring: "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400",
    bar: "bg-sky-500",
  },
  ai: {
    icon: Sparkles,
    ring: "border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400",
    bar: "bg-gradient-to-r from-violet-500 to-cyan-500",
  },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const dismiss = useCallback((id) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (message, options = {}) => {
      const {
        type = "success",
        title,
        duration = 4200,
      } = typeof options === "string" ? { type: options } : options;

      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-3), { id, message, title, type }]);

      if (duration > 0) {
        const timer = setTimeout(() => dismiss(id), duration);
        timersRef.current.set(id, timer);
      }

      return id;
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-5 sm:top-5 sm:items-end"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((item) => {
            const style = TONE_STYLES[item.type] || TONE_STYLES.info;
            const Icon = style.icon;

            return (
              <Motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: -16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
                role="status"
                className="pointer-events-auto relative flex w-full max-w-sm items-start gap-3 overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-glass)] px-4 py-3.5 text-sm shadow-[var(--shadow-float)] backdrop-blur-xl"
              >
                <span
                  className={`absolute inset-y-0 left-0 w-1 ${style.bar}`}
                  aria-hidden="true"
                />
                <div
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${style.ring}`}
                >
                  <Icon size={16} />
                </div>
                <div className="min-w-0 flex-1 pr-1">
                  {item.title ? (
                    <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                      {item.title}
                    </p>
                  ) : null}
                  <p className="font-medium leading-snug text-[var(--text-primary)]">
                    {item.message}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(item.id)}
                  aria-label="Fechar notificação"
                  className="rounded-lg p-1 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
                >
                  <X size={15} />
                </button>
              </Motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
