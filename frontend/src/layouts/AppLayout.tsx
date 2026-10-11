import React, { useState, useRef } from "react";
import { AppSidebar } from "../components/navigation/AppSidebar";
import { AppHeader } from "../components/navigation/AppHeader";
import { AppMobileDrawer } from "../components/navigation/AppMobileDrawer";

export interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex flex-row font-sans text-[var(--color-text-primary)]">
      {/* Accessible skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--color-brand-primary)] focus:text-white focus:rounded-[var(--radius-sm)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] font-sans text-xs font-semibold"
      >
        Skip to main content
      </a>

      {/* Persistent Desktop / Tablet Sidebar */}
      <AppSidebar />

      {/* Main App Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader
          onOpenMobile={() => setIsOpenMobile(true)}
          triggerRef={hamburgerRef}
        />

        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 w-full max-w-[var(--container-max)] mx-auto p-4 sm:p-6 lg:p-8 outline-none"
        >
          {children}
        </main>
      </div>

      {/* Mobile Drawer */}
      <AppMobileDrawer
        isOpen={isOpenMobile}
        onClose={() => setIsOpenMobile(false)}
        triggerRef={hamburgerRef}
      />
    </div>
  );
};

