import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";

export interface LoadingStateProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = "Loading data...",
  size = "md",
  className,
}) => {
  const spinnerSize = {
    sm: "size-4",
    md: "size-6",
    lg: "size-8",
  }[size];

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center p-8 gap-3 text-[var(--color-text-muted)]",
        className
      )}
    >
      <Loader2
        className={cn("animate-spin text-[var(--color-brand-primary)]", spinnerSize)}
        aria-hidden="true"
      />
      {message && <span className="text-xs sm:text-sm font-sans">{message}</span>}
      <span className="sr-only">{message}</span>
    </div>
  );
};

