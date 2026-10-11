import React from "react";
import { cn } from "../../lib/utils";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  "aria-label": string;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  icon: React.ReactNode;
}

export const IconButton: React.FC<IconButtonProps> = ({
  "aria-label": ariaLabel,
  variant = "ghost",
  size = "md",
  icon,
  className,
  disabled,
  type = "button",
  ...props
}) => {
  const baseClasses =
    "inline-flex items-center justify-center font-sans select-none transition-colors duration-150 rounded-[var(--radius-sm)] focus-visible:outline-2 focus-visible:outline-[var(--color-focus)] focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const sizeClasses = {
    sm: "size-7 p-1 text-xs",
    md: "size-9 p-1.5 text-sm",
    lg: "size-10 p-2 text-base",
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
  }[variant];

  return (
    <button
      type={type}
      aria-label={ariaLabel}
      disabled={disabled}
      className={cn(baseClasses, sizeClasses, variantClasses, className)}
      {...props}
    >
      {icon}
    </button>
  );
};

