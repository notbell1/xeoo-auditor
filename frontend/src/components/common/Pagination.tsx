import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../lib/utils";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  itemsPerPage?: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage = 5,
  onPageChange,
  className,
}) => {
  if (totalPages <= 1 && !totalItems) {
    return null;
  }

  // Calculate items range summary
  const startItem = totalItems !== undefined && totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endItem = totalItems !== undefined ? Math.min(currentPage * itemsPerPage, totalItems) : 0;

  // Generate page numbers with smart truncation
  const getPageNumbers = () => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);

      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  const pages = getPageNumbers();

  return (
    <nav
      aria-label="Pagination Navigation"
      className={cn(
        "flex flex-col sm:flex-row items-center justify-between gap-4 py-3 select-none text-xs",
        className
      )}
    >
      {/* Record Summary */}
      {totalItems !== undefined && (
        <p className="text-[var(--color-text-muted)] font-mono">
          Showing{" "}
          <span className="font-semibold text-[var(--color-text-primary)]">
            {startItem}–{endItem}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-[var(--color-text-primary)]">
            {totalItems}
          </span>{" "}
          records
        </p>
      )}

      {/* Navigation Controls */}
      <div className="flex items-center gap-1.5">
        {/* Previous Button */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Previous page"
          className={cn(
            "inline-flex items-center justify-center size-8 rounded-[var(--radius-sm)] border border-[var(--color-border)] text-[var(--color-text-secondary)] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[var(--color-focus)]",
            currentPage <= 1
              ? "opacity-40 cursor-not-allowed bg-[var(--color-surface-secondary)]"
              : "hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)] active:bg-[var(--color-surface-active)]"
          )}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </button>

        {/* Page Number Buttons */}
        {pages.map((p, idx) => {
          if (p === "...") {
            return (
              <span
                key={`ellipsis-${idx}`}
                className="size-8 flex items-center justify-center text-[var(--color-text-muted)] font-mono"
              >
                …
              </span>
            );
          }

          const isActive = p === currentPage;
          return (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              aria-label={`Page ${p}`}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "size-8 rounded-[var(--radius-sm)] font-mono font-medium text-xs transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[var(--color-focus)]",
                isActive
                  ? "bg-[var(--color-brand-primary)] text-white font-bold shadow-xs"
                  : "border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
              )}
            >
              {p}
            </button>
          );
        })}

        {/* Next Button */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Next page"
          className={cn(
            "inline-flex items-center justify-center size-8 rounded-[var(--radius-sm)] border border-[var(--color-border)] text-[var(--color-text-secondary)] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[var(--color-focus)]",
            currentPage >= totalPages
              ? "opacity-40 cursor-not-allowed bg-[var(--color-surface-secondary)]"
              : "hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)] active:bg-[var(--color-surface-active)]"
          )}
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
};

