import React, { useState, useEffect, useRef } from "react";
import { Menu, Plus, Activity } from "lucide-react";
import type { NavViewId } from "../../types/navigation";
import { NAV_ITEMS } from "../../types/navigation";
import { Button } from "../common/Button";
import { MobileDrawer } from "./MobileDrawer";
import { cn } from "../../lib/utils";

export interface HeaderProps {
  currentView: NavViewId;
  onSelectView: (view: NavViewId) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onSelectView,
}) => {
  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  // Monitor scroll position for subtle sticky header elevation
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 h-[56px] bg-[var(--color-surface)]/95 backdrop-blur-sm border-b border-[var(--color-border)] transition-shadow duration-150",
          isScrolled && "shadow-[var(--shadow-xs)]"
        )}
      >
        <div className="max-w-[var(--container-max)] h-full mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          {/* Left: Brand Identity & Mobile Hamburger */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Hamburger trigger for mobile/small tablet */}
            <button
              ref={hamburgerRef}
              type="button"
              onClick={() => setIsOpenMobile(true)}
              aria-expanded={isOpenMobile}
              aria-controls="mobile-navigation-drawer"
              aria-label="Open main navigation menu"
              className="md:hidden p-1.5 -ml-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--color-focus)]"
            >
              <Menu className="size-5" aria-hidden="true" />
            </button>

            {/* Brand Logo Link (Always links to Home) */}
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                onSelectView("home");
              }}
              className="flex items-center gap-2.5 rounded-[var(--radius-sm)] focus-visible:outline-2 focus-visible:outline-[var(--color-focus)] focus-visible:outline-offset-2"
              aria-label="XeooAuditor Home"
            >
              <img
                src="/brand/xeoo-auditor-icon.svg"
                alt=""
                className="size-8 rounded-[var(--radius-sm)] shrink-0 shadow-xs"
                width={32}
                height={32}
              />
              <div className="flex flex-col">
                <span className="font-sans font-bold text-base tracking-tight text-[var(--color-text-primary)] leading-tight flex items-center gap-1">
                  <span>Xeoo</span>
                  <span className="text-[var(--color-brand-secondary)] font-semibold">Auditor</span>
                </span>
                <span className="hidden sm:inline-block font-mono text-[9px] text-[var(--color-text-muted)] tracking-wider">
                  PRIVACY-FIRST AUDITING
                </span>
              </div>
            </a>
          </div>

          {/* Center / Right: Desktop & Tablet Horizontal Navigation */}
          <nav
            aria-label="Primary Navigation"
            className="hidden md:flex items-center gap-1 lg:gap-1.5"
          >
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;

              return (
                <a
                  key={item.id}
                  href={item.path}
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectView(item.id);
                  }}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center gap-2 px-3 py-1.5 text-xs lg:text-sm font-medium rounded-[var(--radius-sm)] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[var(--color-focus)] focus-visible:outline-offset-1 select-none",
                    isActive
                      ? "bg-[var(--color-brand-subtle)] text-[var(--color-brand-primary)] font-semibold border-b-2 border-[var(--color-brand-primary)]"
                      : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4 shrink-0 transition-colors",
                      isActive ? "text-[var(--color-brand-primary)]" : "text-[var(--color-text-muted)]"
                    )}
                    aria-hidden="true"
                  />
                  <span>{item.label}</span>
                </a>
              );
            })}
          </nav>

          {/* Right: Operational Controls & Actions */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Live Engine Status (Desktop & Tablet) */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-sm)] bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[11px] font-mono text-[var(--color-text-secondary)] select-none">
              <span className="size-2 rounded-full bg-[var(--color-status-pass)] inline-block animate-pulse" aria-hidden="true" />
              <Activity className="size-3 text-[var(--color-text-muted)]" aria-hidden="true" />
              <span>ENGINE: READY</span>
            </div>

            {/* Quick Action Button */}
            {currentView !== "new-audit" && (
              <Button
                size="sm"
                variant="primary"
                leftIcon={<Plus className="size-3.5" aria-hidden="true" />}
                onClick={() => onSelectView("new-audit")}
                className="hidden sm:inline-flex"
              >
                New Audit
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Accessible Mobile Drawer */}
      <MobileDrawer
        isOpen={isOpenMobile}
        onClose={() => setIsOpenMobile(false)}
        currentView={currentView}
        onSelectView={onSelectView}
        triggerRef={hamburgerRef}
      />
    </>
  );
};
