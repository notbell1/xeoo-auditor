import React, { useEffect, useRef } from "react";
import { X, ExternalLink, LockKeyhole } from "lucide-react";
import type { NavViewId } from "../../types/navigation";
import { NAV_ITEMS } from "../../types/navigation";
import { cn } from "../../lib/utils";

export interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentView: NavViewId;
  onSelectView: (view: NavViewId) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  currentView,
  onSelectView,
  triggerRef,
}) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Manage body scroll lock
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Manage Escape key and focus return
  useEffect(() => {
    if (!isOpen) return;

    // Focus close button on open for accessibility
    const timer = setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        triggerRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose, triggerRef]);

  const handleCloseAndReturnFocus = () => {
    onClose();
    triggerRef.current?.focus();
  };

  const handleSelect = (view: NavViewId) => {
    onSelectView(view);
    onClose();
    triggerRef.current?.focus();
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-slate-950/60 z-40 md:hidden backdrop-blur-sm transition-opacity duration-200",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={handleCloseAndReturnFocus}
        aria-hidden="true"
      />

      {/* Mobile Drawer Panel */}
      <div
        id="mobile-navigation-drawer"
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile Navigation Drawer"
        className={cn(
          "fixed inset-y-0 left-0 w-[min(20rem,calc(100vw-3rem))] z-50 md:hidden bg-[var(--color-surface)] border-r border-[var(--color-border)] shadow-2xl flex flex-col transform transition-transform duration-200 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Drawer Header */}
        <div className="h-[56px] px-4 flex items-center justify-between border-b border-[var(--color-border)] shrink-0">
          <div className="flex items-center gap-2.5">
            <img
              src="/brand/xeoo-auditor-icon.svg"
              alt=""
              className="size-7 rounded-[var(--radius-sm)] shrink-0"
              aria-hidden="true"
            />
            <div className="flex flex-col">
              <span className="font-sans font-bold text-sm tracking-tight text-[var(--color-text-primary)] leading-none">
                XeooAuditor
              </span>
              <span className="font-mono text-[9px] text-[var(--color-text-muted)] tracking-wider mt-0.5">
                WEBSITE AUDIT
              </span>
            </div>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={handleCloseAndReturnFocus}
            aria-label="Close navigation menu"
            className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--color-focus)]"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        {/* Drawer Navigation Links */}
        <nav aria-label="Mobile Drawer Navigation" className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
            Main Menu
          </div>

          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <a
                key={item.id}
                href={item.path}
                onClick={(e) => {
                  e.preventDefault();
                  handleSelect(item.id);
                }}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-[var(--radius-sm)] text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[var(--color-focus)]",
                  isActive
                    ? "bg-[var(--color-brand-subtle)] text-[var(--color-brand-primary)] font-semibold border-l-3 border-[var(--color-brand-primary)]"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
                )}
              >
                <Icon
                  className={cn(
                    "size-4.5 shrink-0 transition-colors",
                    isActive ? "text-[var(--color-brand-primary)]" : "text-[var(--color-text-muted)]"
                  )}
                  aria-hidden="true"
                />
                <div className="flex flex-col min-w-0">
                  <span className="truncate">{item.label}</span>
                  <span className="text-[11px] text-[var(--color-text-muted)] font-normal truncate">
                    {item.description}
                  </span>
                </div>
              </a>
            );
          })}
        </nav>

        {/* Drawer Footer */}
        <div className="p-3 border-t border-[var(--color-border)] shrink-0 bg-[var(--color-surface-secondary)]">
          <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-text-secondary)]">
            <LockKeyhole className="size-4 text-[var(--color-brand-primary)]" aria-hidden="true" />
            <span>Privacy-First Architecture</span>
          </div>
          <p className="text-[11px] text-[var(--color-text-muted)] mt-1 leading-relaxed">
            No visitor cookies or credentials tracked.
          </p>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--color-text-link)] hover:underline mt-2"
          >
            <span>Technical Docs</span>
            <ExternalLink className="size-3" aria-hidden="true" />
          </a>
        </div>
      </div>
    </>
  );
};

