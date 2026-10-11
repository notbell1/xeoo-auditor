import React, { useEffect, useRef } from "react";
import { X, ArrowLeft, Globe } from "lucide-react";
import { Link } from "../../app/router";
import { useLocation } from "../../app/router-context";
import { Logo } from "../branding/Logo";
import { APP_NAV_ITEMS } from "../../types/navigation";
import { cn } from "../../lib/utils";

export interface AppMobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

export const AppMobileDrawer: React.FC<AppMobileDrawerProps> = ({
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
    if (routePath === "/dashboard" && pathname === "/dashboard") return true;
    if (routePath === "/audit" && pathname === "/audit") return true;
    if (routePath === "/audits" && (pathname === "/audits" || pathname.startsWith("/audits/"))) return true;
    if (routePath === "/settings" && pathname === "/settings") return true;
    return false;
  };

  const handleLinkClick = () => {
    onClose();
    triggerRef.current?.focus();
  };

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 bg-slate-950/60 z-40 md:hidden backdrop-blur-sm transition-opacity duration-200",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => {
          onClose();
          triggerRef.current?.focus();
        }}
        aria-hidden="true"
      />

      <div
        id="app-mobile-nav"
        role="dialog"
        aria-modal="true"
        aria-label="Application Navigation Drawer"
        className={cn(
          "fixed inset-y-0 left-0 w-[min(20rem,calc(100vw-3rem))] z-50 md:hidden bg-[var(--color-surface)] border-r border-[var(--color-border)] shadow-2xl flex flex-col transform transition-transform duration-200 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-[56px] px-4 flex items-center justify-between border-b border-[var(--color-border)] shrink-0">
          <Logo linkTo="/dashboard" size="sm" />
          <button
            ref={closeBtnRef}
            type="button"
            onClick={() => {
              onClose();
              triggerRef.current?.focus();
            }}
            aria-label="Close navigation menu"
            className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--color-focus)]"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Mobile Application Navigation" className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] font-mono">
            Navigation
          </div>

          {APP_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = isRouteActive(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={handleLinkClick}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-[var(--radius-sm)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--color-focus)]",
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
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-[var(--color-border)] bg-[var(--color-surface-secondary)] shrink-0">
          <Link
            to="/"
            onClick={handleLinkClick}
            className="flex items-center justify-between px-3 py-2 rounded-[var(--radius-sm)] text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-brand-primary)] transition-colors"
          >
            <span className="flex items-center gap-2">
              <ArrowLeft className="size-4" />
              <span>Back to Public Website</span>
            </span>
            <Globe className="size-3.5 text-[var(--color-brand-secondary)]" />
          </Link>
        </div>
      </div>
    </>
  );
};

