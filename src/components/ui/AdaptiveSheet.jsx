import { useEffect, useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "../../lib/cn";

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(min-width: 768px)").matches
      : true,
  );

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const listener = (event) => setIsDesktop(event.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  return isDesktop;
}

/**
 * Em mobile renderiza como Bottom Sheet ergonômico;
 * em tablet/desktop renderiza como Drawer lateral ou Modal central.
 */
export function AdaptiveSheet({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  desktopMode = "drawer",
  className = "",
}) {
  const isDesktop = useIsDesktop();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  const panelMotion = !isDesktop
    ? {
        initial: { y: "100%" },
        animate: { y: 0 },
        exit: { y: "100%" },
        transition: { type: "spring", stiffness: 360, damping: 34 },
      }
    : desktopMode === "modal"
      ? {
          initial: { opacity: 0, scale: 0.96, y: 12 },
          animate: { opacity: 1, scale: 1, y: 0 },
          exit: { opacity: 0, scale: 0.96, y: 12 },
          transition: { type: "spring", stiffness: 380, damping: 32 },
        }
      : {
          initial: { x: "100%" },
          animate: { x: 0 },
          exit: { x: "100%" },
          transition: { type: "spring", stiffness: 360, damping: 34 },
        };

  return (
    <AnimatePresence>
      {isOpen ? (
        <Motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className={cn(
            "fixed inset-0 z-[75] flex bg-slate-950/60 backdrop-blur-sm",
            !isDesktop
              ? "items-end justify-center"
              : desktopMode === "modal"
                ? "items-center justify-center p-4"
                : "items-stretch justify-end",
          )}
          role="dialog"
          aria-modal="true"
        >
          <Motion.div
            {...panelMotion}
            onClick={(event) => event.stopPropagation()}
            className={cn(
              "flex flex-col border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[var(--shadow-float)]",
              !isDesktop
                ? "max-h-[90dvh] w-full rounded-t-[2rem] pb-[max(1.25rem,env(safe-area-inset-bottom))]"
                : desktopMode === "modal"
                  ? "max-h-[88vh] w-full max-w-lg rounded-[2rem]"
                  : "h-full w-full max-w-md border-y-0 border-r-0",
              className,
            )}
          >
            {!isDesktop ? (
              <div className="flex justify-center pt-3 pb-1">
                <span className="h-1.5 w-11 rounded-full bg-[var(--border-strong)]" />
              </div>
            ) : null}

            <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-6 py-4">
              <div className="min-w-0">
                {title ? (
                  <h2 className="text-base font-bold tracking-tight text-[var(--text-primary)] sm:text-lg">
                    {title}
                  </h2>
                ) : null}
                {subtitle ? (
                  <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                    {subtitle}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar painel"
                className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-[var(--bg-elevated)] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="custom-scrollbar flex-1 overflow-y-auto px-6 py-5">
              {children}
            </div>
          </Motion.div>
        </Motion.div>
      ) : null}
    </AnimatePresence>
  );
}
