import React from "react";
import type { NavViewId } from "../../types/navigation";
import { Header } from "./Header";
import { LockKeyhole } from "lucide-react";

export interface AppShellProps {
  currentView: NavViewId;
  onSelectView: (view: NavViewId) => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentView,
  onSelectView,
  children,
}) => {
  return (
    <div className="min-h-screen bg-[var(--color-background)] flex flex-col">
      {/* Accessible skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--color-brand-primary)] focus:text-white focus:rounded-[var(--radius-sm)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] font-sans text-xs font-semibold"
      >
        Skip to main content
      </a>

      {/* Branded Responsive Header with Desktop Horizontal Nav & Mobile Drawer */}
      <Header currentView={currentView} onSelectView={onSelectView} />

      {/* Main Content Area */}
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 w-full max-w-[var(--container-max)] mx-auto p-4 sm:p-6 lg:p-8 outline-none"
      >
        {children}
      </main>

      {/* Clean Global Footer */}
      <footer className="w-full border-t border-[var(--color-border)] bg-[var(--color-surface)] py-6 mt-12 text-xs text-[var(--color-text-muted)]">
        <div className="max-w-[var(--container-max)] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <LockKeyhole className="size-4 text-[var(--color-brand-primary)]" aria-hidden="true" />
            <span className="font-semibold text-[var(--color-text-primary)]">XeooAuditor</span>
            <span>— Privacy-First Public Website Auditing Toolkit</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span>ROLE: ADMIN ONLY</span>
            <span>•</span>
            <span>EPHEMERAL RUNS</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
