import React, { useState, useEffect } from "react";
import { ChevronUp } from "lucide-react";
import { cn } from "../../lib/utils";

export interface BackToTopProps {
  className?: string;
  thresholdPercent?: number;
}

export const BackToTop: React.FC<BackToTopProps> = ({
  className,
  thresholdPercent = 15,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight > 0) {
        const currentPct = (window.scrollY / scrollHeight) * 100;
        setIsVisible(currentPct >= thresholdPercent);
      } else {
        setIsVisible(window.scrollY > 250);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [thresholdPercent]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  if (!isVisible) return null;

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Back to top"
      className={cn(
        "fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40",
        "size-9 sm:size-10 rounded-full bg-white/95 text-slate-700 hover:text-blue-600 hover:bg-white",
        "border border-slate-200 shadow-[0_4px_14px_rgba(15,23,42,0.12)] backdrop-blur-sm",
        "flex items-center justify-center transition-all duration-200 ease-out",
        "hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-2",
        "animate-in fade-in zoom-in-75 duration-200 cursor-pointer select-none",
        className
      )}
    >
      <ChevronUp className="size-4.5 sm:size-5" aria-hidden="true" />
    </button>
  );
};

