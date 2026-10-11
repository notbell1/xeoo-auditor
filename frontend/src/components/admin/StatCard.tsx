import React from "react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "../common/Card";
import { cn } from "../../lib/utils";

export interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: LucideIcon;
  variant?: "default" | "pass" | "fail" | "warning";
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtext,
  icon: Icon,
  variant = "default",
  className,
}) => {
  const valueColorClass = {
    default: "text-[var(--color-text-primary)]",
    pass: "text-[var(--color-status-pass-text)]",
    fail: "text-[var(--color-status-fail-text)]",
    warning: "text-[var(--color-status-warning-text)]",
  }[variant];

  return (
    <Card className={cn("transition-all duration-150 hover:border-[var(--color-border-strong)]", className)}>
      <CardContent className="p-4 flex flex-col gap-1.5 justify-between h-full">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
            {label}
          </span>
          {Icon && (
            <div className="p-1.5 rounded-[var(--radius-sm)] bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]">
              <Icon className="size-3.5" aria-hidden="true" />
            </div>
          )}
        </div>

        <div className="flex items-baseline gap-2 mt-0.5">
          <span className={cn("text-2xl sm:text-3xl font-bold font-mono tracking-tight", valueColorClass)}>
            {value}
          </span>
        </div>

        {subtext && (
          <span className="text-[11px] text-[var(--color-text-muted)] line-clamp-1">
            {subtext}
          </span>
        )}
      </CardContent>
    </Card>
  );
};

