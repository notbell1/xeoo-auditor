import React from "react";
import { cn } from "../../lib/utils";

export type AuditStatusType =
  | "pass"
  | "fail"
  | "warning"
  | "not_checked"
  | "manual"
  | "info"
  | "neutral";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status?: AuditStatusType;
  showDot?: boolean;
  icon?: React.ReactNode;
  size?: "sm" | "md";
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  status = "neutral",
  showDot = false,
  icon,
  size = "md",
  className,
  ...props
}) => {
  const baseClasses =
    "inline-flex items-center font-semibold font-sans uppercase tracking-wider select-none border rounded-[var(--radius-sm)]";

  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0.5 gap-1 leading-none",
    md: "text-xs px-2 py-0.5 gap-1.5 leading-tight",
  }[size];

  const statusClasses: Record<AuditStatusType, { badge: string; dot: string }> = {
    pass: {
      badge:
        "bg-[var(--color-status-pass-bg)] text-[var(--color-status-pass-text)] border-[var(--color-status-pass-border)]",
      dot: "bg-[var(--color-status-pass)]",
    },
    fail: {
      badge:
        "bg-[var(--color-status-fail-bg)] text-[var(--color-status-fail-text)] border-[var(--color-status-fail-border)]",
      dot: "bg-[var(--color-status-fail)]",
    },
    warning: {
      badge:
        "bg-[var(--color-status-warning-bg)] text-[var(--color-status-warning-text)] border-[var(--color-status-warning-border)]",
      dot: "bg-[var(--color-status-warning)]",
    },
    not_checked: {
      badge:
        "bg-[var(--color-status-not-checked-bg)] text-[var(--color-status-not-checked-text)] border-[var(--color-status-not-checked-border)]",
      dot: "bg-[var(--color-status-not-checked)]",
    },
    manual: {
      badge:
        "bg-[var(--color-status-manual-bg)] text-[var(--color-status-manual-text)] border-[var(--color-status-manual-border)]",
      dot: "bg-[var(--color-status-manual)]",
    },
    info: {
      badge: "bg-[var(--color-info-bg)] text-[var(--color-info)] border-[var(--cyan-200)]",
      dot: "bg-[var(--color-info)]",
    },
    neutral: {
      badge:
        "bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] border-[var(--color-border)]",
      dot: "bg-[var(--color-text-muted)]",
    },
  };

  const currentStatus = statusClasses[status];

  return (
    <span
      className={cn(baseClasses, sizeClasses, currentStatus.badge, className)}
      {...props}
    >
      {showDot && (
        <span
          className={cn("size-1.5 rounded-full shrink-0", currentStatus.dot)}
          aria-hidden="true"
        />
      )}
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};

