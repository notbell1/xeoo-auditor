import React, { useEffect, useRef } from "react";
import { X, Globe } from "lucide-react";
import { Link } from "../../app/router";
import { useLocation } from "../../app/router-context";
import { Logo } from "../branding/Logo";
import { ADMIN_NAV_SECTIONS } from "../../types/navigation";
import { cn } from "../../lib/utils";

export interface AdminMobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

export const AdminMobileDrawer: React.FC<AdminMobileDrawerProps> = ({
  isOpen,
  onClose,
  triggerRef,
}) => {
  const { pathname } = useLocation();
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      const timer = setTimeout(() => closeBtnRef.current?.focus(), 50);

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
        document.body.style.overflow = "";
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isOpen, onClose, triggerRef]);

  const isRouteActive = (routePath: string) => {
    if (routePath === "/mimin/dashboard") {
      return pathname === "/mimin" || pathname === "/mimin/dashboard";
    }
    return pathname === routePath || pathname.startsWith(routePath + "/");
  };

  const handleLinkClick = () => {
    onClose();
    triggerRef.current?.focus();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-slate-950/60 z-40 lg:hidden backdrop-blur-sm transition-opacity duration-200",
          isOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none",
        )}
        onClick={() => {
          onClose();
          triggerRef.current?.focus();
        }}
        aria-hidden="true"
      />

      {/* Slide-over Drawer */}
      <div
        id="admin-mobile-nav"
        role="dialog"
        aria-modal="true"
        aria-label="Admin Mobile Navigation Menu"
        className={cn(
          "fixed inset-y-0 left-0 w-[min(20rem,calc(100vw-3rem))] z-50 lg:hidden bg-[var(--color-surface)] border-r border-[var(--color-border)] shadow-2xl flex flex-col transform transition-transform duration-200 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="h-[60px] px-4 flex items-center justify-between border-b border-[var(--color-border)] shrink-0">
          <Logo linkTo="/mimin/dashboard" size="sm" />
          <button
            ref={closeBtnRef}
            type="button"
            onClick={() => {
              onClose();
              triggerRef.current?.focus();
            }}
            aria-label="Close navigation"
            className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--color-focus)] cursor-pointer"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <nav
          aria-label="Admin Menu List"
          className="flex-1 p-3 space-y-4 overflow-y-auto"
        >
          {ADMIN_NAV_SECTIONS.map((section) => (
            <div key={section.title} className="space-y-1">
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] font-mono">
                {section.title}
              </div>

              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = isRouteActive(item.path);

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={handleLinkClick}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-[var(--radius-sm)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--color-focus)]",
                      isActive
                        ? "bg-[var(--color-brand-subtle)] text-[var(--color-brand-primary)] font-semibold border-l-3 border-[var(--color-brand-primary)]"
                        : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]",
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-4 shrink-0",
                        isActive
                          ? "text-[var(--color-brand-primary)]"
                          : "text-[var(--color-text-muted)]",
                      )}
                      aria-hidden="true"
                    />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-[var(--color-border)] space-y-2 shrink-0 bg-[var(--color-surface-secondary)]">
          <Link
            to="/"
            onClick={handleLinkClick}
            className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-[var(--radius-sm)] text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-brand-primary)] border border-[var(--color-border)] transition-colors"
          >
            <Globe className="size-3.5" />
            <span>Visit Public Website</span>
          </Link>
        </div>
      </div>
    </>
  );
};
