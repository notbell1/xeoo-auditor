import React from "react";
import { Link } from "../../app/router";
import { cn } from "../../lib/utils";

export interface LogoProps {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  linkTo?: string;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = "md",
  showTagline = false,
  linkTo = "/",
  className,
}) => {
  const iconSizeClasses = {
    sm: "size-6",
    md: "size-8",
    lg: "size-10",
  }[size];

  const textClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-xl",
  }[size];

  const content = (
    <div
      className={cn("inline-flex items-center gap-2.5 select-none", className)}
    >
      <img
        src="/brand/xeoo-auditor-icon.svg"
        alt=""
        aria-hidden="true"
        className={cn(
          "rounded-[var(--radius-sm)] shrink-0 shadow-xs",
          iconSizeClasses,
        )}
        width={32}
        height={32}
      />
      <div className="flex flex-col leading-none">
        <span
          className={cn(
            "font-sans font-bold tracking-tight text-[var(--color-text-primary)] flex items-center gap-1",
            textClasses,
          )}
        >
          <span>Xeoo</span>
          <span className="text-[var(--color-brand-secondary)] font-semibold">
            Auditor
          </span>
        </span>
        {showTagline && (
          <span className="font-mono text-[9px] text-[var(--color-text-muted)] tracking-wider mt-1">
            PRIVACY-FIRST WEBSITE AUDITING
          </span>
        )}
      </div>
    </div>
  );

  if (linkTo) {
    return (
      <Link
        to={linkTo}
        className="rounded-[var(--radius-sm)] focus-visible:outline-2 focus-visible:outline-[var(--color-focus)] focus-visible:outline-offset-2"
        aria-label="XeooAuditor Home"
      >
        {content}
      </Link>
    );
  }

  return content;
};
