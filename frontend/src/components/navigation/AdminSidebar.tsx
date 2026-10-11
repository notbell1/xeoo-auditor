import React from "react";
import { Globe } from "lucide-react";
import { Link } from "../../app/router";
import { useLocation } from "../../app/router-context";
import { Logo } from "../branding/Logo";
import { ADMIN_NAV_SECTIONS } from "../../types/navigation";
import { cn } from "../../lib/utils";

export const AdminSidebar: React.FC = () => {
  const { pathname } = useLocation();

  // Route-aware matching rather than fragile substring checks
  const isRouteActive = (routePath: string) => {
    if (routePath === "/mimin/dashboard") {
      return pathname === "/mimin" || pathname === "/mimin/dashboard";
    }
    return pathname === routePath || pathname.startsWith(routePath + "/");
  };

  return (
    <aside className="hidden lg:flex flex-col w-[260px] h-screen sticky top-0 shrink-0 bg-[var(--color-surface)] border-r border-[var(--color-border)] select-none z-30">
      {/* Brand Header */}
      <div className="h-[60px] px-4 flex items-center justify-between border-b border-[var(--color-border)] shrink-0">
        <Logo linkTo="/mimin/dashboard" size="sm" />
      </div>

      {/* Navigation Sections */}
      <nav
        aria-label="Admin Sidebar Navigation"
        className="flex-1 p-3 space-y-4 overflow-y-auto"
      >
        {ADMIN_NAV_SECTIONS.map((section) => (
          <div key={section.title} className="space-y-1">
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
              {section.title}
            </div>

            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = isRouteActive(item.path);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-[var(--radius-sm)] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[var(--color-focus)]",
                    isActive
                      ? "bg-[var(--color-brand-subtle)] text-[var(--color-brand-primary)] font-semibold border-l-3 border-[var(--color-brand-primary)] shadow-xs"
                      : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4 shrink-0 transition-colors",
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

      {/* Sidebar Footer Controls */}
      <div className="p-3 border-t border-[var(--color-border)] space-y-2 shrink-0 bg-[var(--color-surface-secondary)]">
        <div className="flex items-center gap-1.5 pt-1">
          <Link
            to="/"
            className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-brand-primary)] border border-transparent hover:border-[var(--color-border)] transition-colors"
          >
            <Globe className="size-3.5" />
            <span>Public Website</span>
          </Link>
        </div>
      </div>
    </aside>
  );
};
