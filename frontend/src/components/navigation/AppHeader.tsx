import React from "react";
import { Menu, Activity, LogOut } from "lucide-react";
import { useNavigate, useLocation } from "../../app/router-context";
import { Button } from "../common/Button";
import { APP_NAV_ITEMS } from "../../types/navigation";
import { logoutAdmin } from "../../services/adminAuth";

export interface AppHeaderProps {
  onOpenMobile: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  onOpenMobile,
  triggerRef,
}) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const currentItem = APP_NAV_ITEMS.find((item) => {
    if (item.path === pathname) return true;
    if (item.path === "/audits" && pathname.startsWith("/audits/")) return true;
    return false;
  });

  const pageTitle = currentItem?.label || (pathname.startsWith("/audits/") ? "Audit Details" : "Workspace");

  return (
    <header className="h-[56px] px-4 sm:px-6 bg-[var(--color-surface)] border-b border-[var(--color-border)] sticky top-0 z-20 flex items-center justify-between shrink-0">
      {/* Left: Mobile Toggle & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          ref={triggerRef}
          type="button"
          onClick={onOpenMobile}
          aria-expanded={false}
          aria-controls="app-mobile-nav"
          aria-label="Open application navigation"
          className="md:hidden p-1.5 -ml-1 rounded-[var(--radius-sm)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--color-focus)]"
        >
          <Menu className="size-5" aria-hidden="true" />
        </button>

        <div className="flex items-center gap-2 text-xs font-mono text-[var(--color-text-muted)]">
          <span className="hidden sm:inline">xeoo_auditor</span>
          <span className="hidden sm:inline">/</span>
          <span className="font-semibold font-sans text-sm text-[var(--color-text-primary)]">
            {pageTitle}
          </span>
        </div>
      </div>

      {/* Right: Operational Status & Action */}
      <div className="flex items-center gap-3">
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-sm)] bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[11px] font-mono text-[var(--color-text-secondary)]">
          <span className="size-2 rounded-full bg-[var(--color-status-pass)] inline-block animate-pulse" aria-hidden="true" />
          <Activity className="size-3 text-[var(--color-text-muted)]" aria-hidden="true" />
          <span>ENGINE: READY</span>
        </div>

        <Button
          size="sm"
          variant="secondary"
          leftIcon={<LogOut className="size-3.5" aria-hidden="true" />}
          onClick={async () => {
            await logoutAdmin();
            navigate("/login/mimin");
          }}
        >
          Logout
        </Button>
      </div>
    </header>
  );
};

