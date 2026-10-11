import React from "react";
import { cn } from "../../lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  isInteractive?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  isInteractive = false,
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        "bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] shadow-[var(--shadow-xs)] overflow-hidden transition-colors duration-150",
        isInteractive && "hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-sm)] cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className,
  ...props
}) => {
  return (
    <div className={cn("p-4 sm:p-5 flex flex-col gap-1 border-b border-[var(--color-border-subtle)]", className)} {...props}>
      {children}
    </div>
  );
};

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  children,
  className,
  ...props
}) => {
  return (
    <h3
      className={cn("text-base font-semibold text-[var(--color-text-primary)] font-sans tracking-tight", className)}
      {...props}
    >
      {children}
    </h3>
  );
};

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  children,
  className,
  ...props
}) => {
  return (
    <p className={cn("text-xs text-[var(--color-text-muted)] font-sans", className)} {...props}>
      {children}
    </p>
  );
};

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className,
  ...props
}) => {
  return (
    <div className={cn("p-4 sm:p-5", className)} {...props}>
      {children}
    </div>
  );
};

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        "p-4 sm:p-5 bg-[var(--color-surface-secondary)] border-t border-[var(--color-border-subtle)] flex items-center justify-between",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

