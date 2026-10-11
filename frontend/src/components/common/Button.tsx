import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  leftIcon,
  rightIcon,
  className,
  disabled,
  type = "button",
  ...props
}) => {
  const baseClasses =
    "inline-flex items-center justify-center font-medium font-sans select-none whitespace-nowrap transition-colors duration-150 rounded-[var(--radius-sm)] focus-visible:outline-2 focus-visible:outline-[var(--color-focus)] focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const sizeClasses = {
    sm: "min-h-[30px] px-2.5 py-1 text-xs gap-1.5",
    md: "min-h-[36px] px-3.5 py-1.5 text-sm gap-2",
    lg: "min-h-[42px] px-4 py-2 text-base gap-2.5",
  }[size];

  const variantClasses = {
    primary:
      "bg-[var(--color-brand-primary)] text-[var(--color-text-inverse)] hover:bg-[var(--color-brand-primary-hover)] border border-[var(--color-brand-primary)]",
    secondary:
      "bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border-strong)]",
    outline:
      "bg-transparent text-[var(--color-brand-primary)] hover:bg-[var(--color-brand-subtle)] border border-[var(--color-brand-border)]",
    ghost:
      "bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)] border border-transparent",
    danger:
      "bg-[var(--color-status-fail)] text-white hover:opacity-90 border border-[var(--color-status-fail)]",
  }[variant];

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={cn(baseClasses, sizeClasses, variantClasses, className)}
      aria-busy={isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="size-4 animate-spin shrink-0" aria-hidden="true" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};

