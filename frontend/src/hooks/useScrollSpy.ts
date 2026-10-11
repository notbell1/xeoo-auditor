import { useState, useEffect, useCallback, useRef } from "react";

export interface UseScrollSpyOptions {
  /**
   * Root margin string for IntersectionObserver.
   * Default accounts for sticky header (e.g. -70px from top, 0px, -40% from bottom).
   */
  rootMargin?: string;
  /**
   * Intersection threshold(s).
   */
  threshold?: number | number[];
  /**
   * Default active section ID if none is intersecting.
   */
  defaultActiveId?: string;
}

/**
 * Custom hook to track active visible section on scroll using IntersectionObserver.
 * Does not use redundant global scroll listeners.
 */
export function useScrollSpy(
  sectionIds: string[],
  options: UseScrollSpyOptions = {}
): [string, (sectionId: string) => void] {
  const {
    rootMargin = "-80px 0px -40% 0px",
    threshold = [0, 0.25, 0.5, 0.75, 1],
    defaultActiveId = sectionIds[0] || "",
  } = options;

  const [activeId, setActiveId] = useState<string>(defaultActiveId);
  const visibleMapRef = useRef<Map<string, IntersectionObserverEntry>>(new Map());

  useEffect(() => {
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      return;
    }

    if (sectionIds.length === 0) return;

    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const visibleMap = visibleMapRef.current;

    const observer = new IntersectionObserver(
      (entries) => {
        // Update visibility map for observed elements
        entries.forEach((entry) => {
          visibleMap.set(entry.target.id, entry);
        });

        // Determine which section is currently active
        // Find all currently intersecting entries
        const intersectingEntries = Array.from(visibleMap.values()).filter(
          (entry) => entry.isIntersecting
        );

        if (intersectingEntries.length > 0) {
          // Sort intersecting entries by proximity of their top edge to the top of viewport
          // The section whose top is closest to the reading position (top of viewport) wins
          intersectingEntries.sort((a, b) => {
            const topA = Math.abs(a.boundingClientRect.top);
            const topB = Math.abs(b.boundingClientRect.top);
            return topA - topB;
          });

          setActiveId(intersectingEntries[0].target.id);
        }
      },
      {
        root: null,
        rootMargin,
        threshold,
      }
    );

    elements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
      visibleMap.clear();
    };
  }, [sectionIds, rootMargin, threshold]);

  const scrollToSection = useCallback((sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (!element) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    element.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start",
    });

    setActiveId(sectionId);
  }, []);

  return [activeId, scrollToSection];
}
