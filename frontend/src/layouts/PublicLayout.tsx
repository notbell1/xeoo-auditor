import React from "react";
import { PublicHeader } from "../components/navigation/PublicHeader";
import { PublicFooter } from "../components/navigation/PublicFooter";
import { BackToTop } from "../components/common/BackToTop";

export interface PublicLayoutProps {
  children: React.ReactNode;
  activeSectionId?: string;
  onNavigateSection?: (sectionId: string) => void;
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({
  children,
  activeSectionId,
  onNavigateSection,
}) => {
  return (
    <div className="min-h-screen bg-[var(--color-background)] flex flex-col font-sans text-[var(--color-text-primary)]">
      {/* Accessible skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--color-brand-primary)] focus:text-white focus:rounded-[var(--radius-sm)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] font-sans text-xs font-semibold"
      >
        Skip to main content
      </a>

      {/* Shared Public Header with Scroll-Spy & Mobile Drawer */}
      <PublicHeader
        activeSectionId={activeSectionId}
        onNavigateSection={onNavigateSection}
      />

      {/* Main Landing Page Content */}
      <main id="main-content" tabIndex={-1} className="flex-1 w-full outline-none">
        {children}
      </main>

      {/* Public Footer */}
      <PublicFooter />

      {/* Responsive Back-To-Top button triggering at 15% scroll */}
      <BackToTop thresholdPercent={15} />
    </div>
  );
};

