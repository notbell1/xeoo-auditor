import React, { useId } from "react";
import { cn } from "../../lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  isMonospace?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  isMonospace = false,
  leftIcon,
  rightIcon,
  id: explicitId,
  className,
  disabled,
  ...props
}) => {
  const generatedId = useId();
  const inputId = explicitId || generatedId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold text-[var(--color-text-secondary)] select-none"
        >
          {label}
        </label>
      )}

      <div className="relative flex items-center w-full">
        {leftIcon && (
          <div className="absolute left-3 flex items-center pointer-events-none text-[var(--color-text-muted)]">
            {leftIcon}
          </div>
        )}

        <input
          id={inputId}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={cn(
            "w-full min-h-[38px] px-3 py-1.5 text-sm bg-[var(--color-surface)] text-[var(--color-text-primary)] border rounded-[var(--radius-sm)] transition-colors duration-150 placeholder:text-[var(--color-text-disabled)] focus-visible:outline-2 focus-visible:outline-[var(--color-focus)] focus-visible:outline-offset-1 disabled:bg-[var(--color-surface-secondary)] disabled:text-[var(--color-text-disabled)] disabled:cursor-not-allowed",
            isMonospace && "font-mono text-xs tracking-tight",
            leftIcon && "pl-9",
            rightIcon && "pr-9",
            error
              ? "border-[var(--color-status-fail)] focus-visible:outline-[var(--color-status-fail)]"
              : "border-[var(--color-border-strong)]",
            className
          )}
          {...props}
        />

        {rightIcon && (
          <div className="absolute right-3 flex items-center text-[var(--color-text-muted)]">
            {rightIcon}
          </div>
        )}
      </div>

      {error ? (
        <p id={errorId} className="text-xs text-[var(--color-status-fail)] font-medium" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-[var(--color-text-muted)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
};

