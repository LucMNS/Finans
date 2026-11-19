import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "../../lib/cn";

export function SelectPill({
  value,
  options = [],
  onChange,
  icon: Icon,
  placeholder = "Selecione...",
  align = "left",
  size = "md",
  className = "",
  menuClassName = "",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const normalized = options.map((opt) =>
    typeof opt === "object" && opt !== null
      ? opt
      : { value: opt, label: String(opt) },
  );

  const selectedOption = normalized.find(
    (opt) => String(opt.value) === String(value),
  );

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div
      ref={containerRef}
      className={cn("relative", isOpen ? "z-50" : "z-10", className)}
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        className={cn(
          "flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm transition-all duration-150 hover:border-violet-500/45",
          size === "sm" ? "h-9 px-3 text-xs" : "h-10 px-3.5 text-xs sm:text-sm",
        )}
      >
        <span className="flex min-w-0 items-center gap-2 font-semibold">
          {Icon ? <Icon size={15} className="shrink-0 text-violet-500" /> : null}
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>
        <ChevronDown
          size={14}
          className={cn(
            "shrink-0 text-[var(--text-muted)] transition-transform duration-200",
            isOpen && "rotate-180 text-violet-500",
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen ? (
          <Motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className={cn(
              "absolute mt-2 min-w-[160px] overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-1.5 shadow-[var(--shadow-float)]",
              align === "right" ? "right-0" : "left-0 right-0",
              menuClassName,
            )}
          >
            <div className="custom-scrollbar max-h-64 overflow-y-auto space-y-0.5">
              {normalized.length === 0 ? (
                <p className="px-3 py-4 text-center text-xs font-medium text-[var(--text-muted)]">
                  Nenhuma opção disponível
                </p>
              ) : (
                normalized.map((opt) => {
                  const active = String(opt.value) === String(value);
                  return (
                    <button
                      key={String(opt.value)}
                      type="button"
                      onClick={() => {
                        onChange(opt.value);
                        setIsOpen(false);
                      }}
                      className={cn(
                        "flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold transition-colors",
                        active
                          ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
                          : "text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]",
                      )}
                    >
                      <span className="truncate">{opt.label}</span>
                      {active ? <Check size={14} className="shrink-0" /> : null}
                    </button>
                  );
                })
              )}
            </div>
          </Motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
