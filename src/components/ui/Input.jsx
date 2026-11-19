import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "../../lib/cn";

export const Input = forwardRef(function Input(
  {
    label,
    hint,
    error,
    leftIcon: LeftIcon,
    rightElement,
    type = "text",
    className = "",
    inputClassName = "",
    numeric = false,
    id,
    ...props
  },
  ref,
) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const resolvedType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <div className={cn("w-full space-y-1.5", className)}>
      {label ? (
        <label
          htmlFor={id}
          className="block text-xs font-semibold tracking-wide text-[var(--text-secondary)]"
        >
          {label}
        </label>
      ) : null}

      <div
        className={cn(
          "group relative flex items-center rounded-2xl border bg-[var(--bg-elevated)] transition-all duration-200",
          error
            ? "border-rose-500/60 ring-2 ring-rose-500/15"
            : "border-[var(--border-subtle)] focus-within:border-violet-500/70 focus-within:bg-[var(--bg-surface)] focus-within:ring-4 focus-within:ring-violet-500/10",
        )}
      >
        {LeftIcon ? (
          <LeftIcon
            size={17}
            className="ml-3.5 shrink-0 text-[var(--text-muted)] transition-colors group-focus-within:text-violet-500"
          />
        ) : null}

        <input
          ref={ref}
          id={id}
          type={resolvedType}
          className={cn(
            "h-11 w-full bg-transparent px-3.5 text-sm font-medium text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none",
            numeric && "tabular-nums",
            LeftIcon && "pl-2.5",
            (isPassword || rightElement) && "pr-2",
            inputClassName,
          )}
          {...props}
        />

        {isPassword ? (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            className="mr-2 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-xl text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        ) : rightElement ? (
          <div className="mr-2.5 shrink-0">{rightElement}</div>
        ) : null}
      </div>

      {error ? (
        <p className="text-xs font-medium text-rose-500">{error}</p>
      ) : hint ? (
        <p className="text-xs text-[var(--text-muted)]">{hint}</p>
      ) : null}
    </div>
  );
});
