import React, { useState, useEffect, useRef } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "../branding/Logo";
import { PUBLIC_NAV_LINKS } from "../../types/navigation";
import { cn } from "../../lib/utils";
import { useNavigate, useLocation } from "../../app/router-context";
import { trackCTA } from "../../lib/analytics";

export interface PublicHeaderProps {
  activeSectionId?: string;
  onNavigateSection?: (sectionId: string) => void;
}

export const PublicHeader: React.FC<PublicHeaderProps> = ({
  activeSectionId = "home",
  onNavigateSection,
}) => {
  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Manage body scroll lock & Escape key when mobile drawer is open
  useEffect(() => {
    if (isOpenMobile) {
      document.body.style.overflow = "hidden";
      const timer = setTimeout(() => closeButtonRef.current?.focus(), 50);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          e.preventDefault();
          setIsOpenMobile(false);
          hamburgerRef.current?.focus();
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = "";
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isOpenMobile]);

  const { pathname } = useLocation();
  const navigate = useNavigate();

  const handleLinkClick = (e: React.MouseEvent, link: (typeof PUBLIC_NAV_LINKS)[number]) => {
    e.preventDefault();
    setIsOpenMobile(false);
    hamburgerRef.current?.focus();

    if (link.href === "/contact") {
      trackCTA("cta_nav_contact", "header_contact_link");
      navigate("/contact");
      return;
    }

    if (link.href === "/") {
      trackCTA("cta_nav_home", "header_home_link");
      if (pathname !== "/") {
        navigate("/");
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }

    // Anchor hash links like /#features
    const targetHash = link.href.startsWith("/") ? link.href.slice(1) : link.href; // "#features"
    const sectionId = targetHash.replace(/^#/, ""); // "features"

    if (pathname !== "/") {
      navigate(`/${targetHash}`);
    } else {
      if (onNavigateSection) {
        onNavigateSection(sectionId);
      } else {
        const el = document.getElementById(sectionId);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          window.history.replaceState(null, "", targetHash);
        }
      }
    }
  };

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 h-[64px] bg-[var(--color-surface)]/95 backdrop-blur-md border-b border-[var(--color-border)] transition-shadow duration-150",
          isScrolled && "shadow-[var(--shadow-sm)]"
        )}
      >
        <div className="max-w-[var(--container-max)] h-full mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          {/* Left: Brand Identity & Mobile Hamburger Trigger */}
          <div className="flex items-center gap-3">
            <button
              ref={hamburgerRef}
              type="button"
              onClick={() => setIsOpenMobile(true)}
              aria-expanded={isOpenMobile}
              aria-controls="public-mobile-nav"
              aria-label="Open public navigation menu"
              className="lg:hidden p-1.5 -ml-1 rounded-[var(--radius-sm)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--color-focus)]"
            >
              <Menu className="size-5" aria-hidden="true" />
            </button>

            <Logo linkTo="/" showTagline={false} />
          </div>

          {/* Center / Right: Desktop & Tablet Section Navigation */}
          <nav
            aria-label="Public Main Navigation"
            className="hidden lg:flex items-center gap-1 xl:gap-2"
          >
            {PUBLIC_NAV_LINKS.map((link) => {
              const isActive = activeSectionId === link.id;
              return (
                <a
                  key={link.id}
                  href={link.href}
                  onClick={(e) => handleLinkClick(e, link)}
                  aria-current={isActive ? "location" : undefined}
                  className={cn(
                    "px-3.5 py-1.5 text-sm font-medium rounded-lg transition-colors duration-150 select-none focus-visible:outline-2 focus-visible:outline-[var(--color-focus)]",
                    isActive
                      ? "text-blue-600 font-semibold bg-blue-50/80"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                  )}
                >
                  {link.label}
                </a>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Mobile Drawer Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-slate-950/60 z-40 lg:hidden backdrop-blur-sm transition-opacity duration-200",
          isOpenMobile ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => {
          setIsOpenMobile(false);
          hamburgerRef.current?.focus();
        }}
        aria-hidden="true"
      />

      {/* Mobile Drawer Panel */}
      <div
        id="public-mobile-nav"
        role="dialog"
        aria-modal="true"
        aria-label="Public Navigation Menu"
        className={cn(
          "fixed inset-y-0 left-0 w-[min(20rem,calc(100vw-3rem))] z-50 lg:hidden bg-[var(--color-surface)] border-r border-[var(--color-border)] shadow-2xl flex flex-col transform transition-transform duration-200 ease-in-out",
          isOpenMobile ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-[64px] px-4 flex items-center justify-between border-b border-[var(--color-border)] shrink-0">
          <Logo linkTo="/" size="sm" />
          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => {
              setIsOpenMobile(false);
              hamburgerRef.current?.focus();
            }}
            aria-label="Close navigation menu"
            className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--color-focus)]"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Mobile Navigation" className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
            Navigation
          </div>

          {PUBLIC_NAV_LINKS.map((link) => {
            const isActive = activeSectionId === link.id;
            return (
              <a
                key={link.id}
                href={link.href}
                onClick={(e) => handleLinkClick(e, link)}
                aria-current={isActive ? "location" : undefined}
                className={cn(
                  "flex items-center px-3.5 py-2.5 text-sm font-medium rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-[var(--color-focus)]",
                  isActive
                    ? "text-blue-600 font-semibold bg-blue-50/80"
                    : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
                )}
              >
                <span>{link.label}</span>
              </a>
            );
          })}
        </nav>
      </div>
    </>
  );
};
