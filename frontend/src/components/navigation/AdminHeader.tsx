import React, { useState, useEffect } from "react";
import { Menu, LogOut, User } from "lucide-react";
import { useNavigate, useLocation } from "../../app/router-context";
import { Button } from "../common/Button";
import { ADMIN_NAV_SECTIONS } from "../../types/navigation";
import { logoutAdmin, verifyAdminSession } from "../../services/adminAuth";

export interface AdminHeaderProps {
  onOpenMobile: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  onOpenMobile,
  triggerRef,
}) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [adminUsername, setAdminUsername] = useState<string>("nttbell");

  useEffect(() => {
    verifyAdminSession().then((res) => {
      if (res.authenticated && res.user?.username) {
        setAdminUsername(res.user.username);
      }
    });
  }, []);

  // Find page title from nav sections
  let currentPageTitle = "Dashboard";
  for (const section of ADMIN_NAV_SECTIONS) {
    for (const item of section.items) {
      if (
        (item.path === "/mimin/dashboard" &&
          (pathname === "/mimin" || pathname === "/mimin/dashboard")) ||
        pathname === item.path ||
        pathname.startsWith(item.path + "/")
      ) {
        currentPageTitle = item.label;
        break;
      }
    }
  }

  const handleLogout = async () => {
    await logoutAdmin();
    navigate("/login/mimin");
  };

  return (
    <header className="h-[60px] px-4 sm:px-6 bg-[var(--color-surface)] border-b border-[var(--color-border)] sticky top-0 z-20 flex items-center justify-between shrink-0">
      {/* Left: Mobile Navigation Trigger & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          ref={triggerRef}
          type="button"
          onClick={onOpenMobile}
          aria-expanded={false}
          aria-controls="admin-mobile-nav"
          aria-label="Open admin navigation menu"
          className="lg:hidden p-1.5 -ml-1 rounded-[var(--radius-sm)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--color-focus)] cursor-pointer"
        >
          <Menu className="size-5" aria-hidden="true" />
        </button>

        <div className="flex items-center gap-2 text-xs font-mono text-[var(--color-text-muted)]">
          <span className="font-semibold font-sans text-sm text-[var(--color-text-primary)]">
            {currentPageTitle}
          </span>
        </div>
      </div>

      {/* Right: Operational Status & Admin User Controls */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-xs text-[var(--color-text-secondary)]">
          <User className="size-3.5 text-[var(--color-text-muted)]" />
          <span className="font-medium text-[var(--color-text-primary)] uppercase">
            {adminUsername}
          </span>
        </div>

        <Button
          size="sm"
          variant="secondary"
          leftIcon={<LogOut className="size-3.5" aria-hidden="true" />}
          onClick={handleLogout}
        >
          Sign Out
        </Button>
      </div>
    </header>
  );
};
