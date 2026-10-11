import React, { useState, useRef } from "react";
import { AdminSidebar } from "../components/navigation/AdminSidebar";
import { AdminHeader } from "../components/navigation/AdminHeader";
import { AdminMobileDrawer } from "../components/navigation/AdminMobileDrawer";

export interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex flex-row font-sans text-[var(--color-text-primary)]">
      {/* Accessible skip link */}
      <a
        href="#admin-main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--color-brand-primary)] focus:text-white focus:rounded-[var(--radius-sm)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] font-sans text-xs font-semibold"
      >
        Lewati ke konten utama
      </a>

      {/* Persistent Desktop Sidebar */}
      <AdminSidebar />

      {/* Main Admin Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader
          onOpenMobile={() => setIsOpenMobile(true)}
          triggerRef={hamburgerRef}
        />

        <main
          id="admin-main-content"
          tabIndex={-1}
          className="flex-1 w-full max-w-[var(--container-max)] mx-auto p-4 sm:p-6 lg:p-8 outline-none"
        >
          {children}
        </main>
      </div>

      {/* Mobile Navigation Drawer */}
      <AdminMobileDrawer
        isOpen={isOpenMobile}
        onClose={() => setIsOpenMobile(false)}
        triggerRef={hamburgerRef}
      />
    </div>
  );
};

