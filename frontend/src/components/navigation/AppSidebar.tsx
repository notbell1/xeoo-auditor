import React from "react";
import { ArrowLeft, Globe, Activity } from "lucide-react";
import { Link } from "../../app/router";
import { useLocation } from "../../app/router-context";
import { Logo } from "../branding/Logo";
import { APP_NAV_ITEMS } from "../../types/navigation";
import { cn } from "../../lib/utils";

export const AppSidebar: React.FC = () => {
  const { pathname } = useLocation();

  const isRouteActive = (routePath: string) => {
    if (routePath === "/dashboard" && pathname === "/dashboard") return true;
    if (routePath === "/audit" && pathname === "/audit") return true;
    if (routePath === "/audits" && (pathname === "/audits" || pathname.startsWith("/audits/"))) return true;
    if (routePath === "/settings" && pathname === "/settings") return true;
    return false;
  };

  return (
    <aside className="hidden md:flex flex-col w-[240px] h-screen sticky top-0 shrink-0 bg-[var(--color-surface)] border-r border-[var(--color-border)] select-none z-30">
      {/* Brand Header */}
      <div className="h-[56px] px-4 flex items-center border-b border-[var(--color-border)] shrink-0">
        <Logo linkTo="/dashboard" size="sm" />
      </div>

      {/* Navigation Links */}
      <nav aria-label="Application Sidebar Navigation" className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] font-mono">
          Audit Workspace
        </div>

        {APP_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = isRouteActive(item.path);

          return (
            <Link
              key={item.path}
              to={item.path}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-[var(--radius-sm)] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[var(--color-focus)]",
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
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-3 border-t border-[var(--color-border)] space-y-2 shrink-0 bg-[var(--color-surface-secondary)]">
        <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-mono text-[var(--color-text-secondary)]">
          <Activity className="size-3 text-[var(--color-status-pass)] animate-pulse" />
          <span>ENGINE: SYNCHRONOUS</span>
        </div>

        <Link
          to="/"
          className="flex items-center justify-between px-2.5 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-brand-primary)] transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <ArrowLeft className="size-3.5" />
            <span>Public Website</span>
          </span>
          <Globe className="size-3 text-[var(--color-brand-secondary)]" />
        </Link>
      </div>
    </aside>
  );
};

