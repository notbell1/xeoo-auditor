import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "./Button";
import { cn } from "../../lib/utils";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-[var(--radius-md)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)]",
        className
      )}
    >
      {icon && (
        <div
          className="size-12 rounded-full flex items-center justify-center mb-4 text-[var(--color-text-muted)] bg-[var(--color-surface-secondary)] border border-[var(--color-border)]"
          aria-hidden="true"
        >
          {icon}
        </div>
      )}

      <h3 className="text-base font-semibold text-[var(--color-text-primary)] font-sans mb-1">
        {title}
      </h3>

      <p className="text-xs sm:text-sm text-[var(--color-text-muted)] font-sans max-w-md mb-6">
        {description}
      </p>

      {action && <div>{action}</div>}
    </div>
  );
};

export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "An Error Occurred",
  description = "Failed to load data from server.",
  onRetry,
  className,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-[var(--radius-md)] border border-dashed border-[var(--color-status-fail-border)] bg-[var(--color-surface)]",
        className
      )}
    >
      <div
        className="size-12 rounded-full flex items-center justify-center mb-4 text-[var(--color-status-fail)] bg-[var(--color-status-fail-bg)] border border-[var(--color-status-fail-border)]"
        aria-hidden="true"
      >
        <AlertCircle className="size-6" />
      </div>

      <h3 className="text-base font-semibold text-[var(--color-text-primary)] font-sans mb-1">
        {title}
      </h3>

      <p className="text-xs sm:text-sm text-[var(--color-text-muted)] font-sans max-w-md mb-6">
        {description}
      </p>

      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<RefreshCw className="size-3.5" />}
          onClick={onRetry}
        >
          Retry
        </Button>
      )}
    </div>
  );
};
