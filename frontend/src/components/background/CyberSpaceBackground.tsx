import React, { useEffect, useRef, useMemo } from "react";
import { AUDIT_MODULES } from "../../types/modules";
import { cn } from "../../lib/utils";

interface FixedNodeCoord {
  pctX: number;
  pctY: number;
}

// 20 Organically Balanced Fixed Positions surrounding the centered hero space
const FIXED_NODE_COORDS: FixedNodeCoord[] = [
  { pctX: 8, pctY: 18 },  // 0: A01 (Top Left)
  { pctX: 18, pctY: 12 }, // 1: A02 (Top Left-Center)
  { pctX: 12, pctY: 34 }, // 2: A03 (Mid-Upper Left)
  { pctX: 6, pctY: 52 },  // 3: A04 (Mid Left)
  { pctX: 20, pctY: 48 }, // 4: A05 (Inner Mid Left)
  { pctX: 10, pctY: 68 }, // 5: A06 (Lower Left)
  { pctX: 21, pctY: 76 }, // 6: A07 (Bottom Left)
  { pctX: 13, pctY: 88 }, // 7: A08 (Bottom Far Left)
  { pctX: 34, pctY: 10 }, // 8: A09 (Top Center-Left)
  { pctX: 52, pctY: 7 },  // 9: A10 (Top Center)
  { pctX: 67, pctY: 11 }, // 10: A11 (Top Center-Right)
  { pctX: 82, pctY: 16 }, // 11: A12 (Top Right)
  { pctX: 92, pctY: 28 }, // 12: A13 (Upper Far Right)
  { pctX: 79, pctY: 38 }, // 13: A14 (Inner Upper Right)
  { pctX: 93, pctY: 52 }, // 14: A15 (Mid Far Right)
  { pctX: 81, pctY: 62 }, // 15: A16 (Inner Mid Right)
  { pctX: 90, pctY: 74 }, // 16: A17 (Lower Far Right)
  { pctX: 77, pctY: 84 }, // 17: A18 (Bottom Right)
  { pctX: 36, pctY: 89 }, // 18: A19 (Bottom Center-Left)
  { pctX: 64, pctY: 88 }, // 19: A20 (Bottom Center-Right)
];

// Mobile displays 5 well-spaced outer perimeter icons
const MOBILE_VISIBLE_INDICES = [0, 6, 9, 12, 17];

// Distinct vibrant color themes displayed during the smooth 3s blink apex
const BLINK_THEMES = [
  { color: "#0284c7", border: "rgba(2, 132, 199, 0.45)", bg: "rgba(2, 132, 199, 0.10)", glow: "rgba(2, 132, 199, 0.25)" }, // 0: Sky
  { color: "#059669", border: "rgba(5, 150, 105, 0.45)", bg: "rgba(5, 150, 105, 0.10)", glow: "rgba(5, 150, 105, 0.25)" }, // 1: Emerald
  { color: "#d97706", border: "rgba(217, 119, 6, 0.45)", bg: "rgba(217, 119, 6, 0.10)", glow: "rgba(217, 119, 6, 0.25)" }, // 2: Amber
  { color: "#0891b2", border: "rgba(8, 145, 178, 0.45)", bg: "rgba(8, 145, 178, 0.10)", glow: "rgba(8, 145, 178, 0.25)" }, // 3: Cyan
  { color: "#7c3aed", border: "rgba(124, 58, 237, 0.45)", bg: "rgba(124, 58, 237, 0.10)", glow: "rgba(124, 58, 237, 0.25)" }, // 4: Violet
  { color: "#ea580c", border: "rgba(234, 88, 12, 0.45)", bg: "rgba(234, 88, 12, 0.10)", glow: "rgba(234, 88, 12, 0.25)" }, // 5: Orange
  { color: "#2563eb", border: "rgba(37, 99, 235, 0.45)", bg: "rgba(37, 99, 235, 0.10)", glow: "rgba(37, 99, 235, 0.25)" }, // 6: Blue
  { color: "#e11d48", border: "rgba(225, 29, 72, 0.45)", bg: "rgba(225, 29, 72, 0.10)", glow: "rgba(225, 29, 72, 0.25)" }, // 7: Rose
  { color: "#9333ea", border: "rgba(147, 51, 234, 0.45)", bg: "rgba(147, 51, 234, 0.10)", glow: "rgba(147, 51, 234, 0.25)" }, // 8: Purple
  { color: "#65a30d", border: "rgba(101, 163, 13, 0.45)", bg: "rgba(101, 163, 13, 0.10)", glow: "rgba(101, 163, 13, 0.25)" }, // 9: Lime
  { color: "#dc2626", border: "rgba(220, 38, 38, 0.45)", bg: "rgba(220, 38, 38, 0.10)", glow: "rgba(220, 38, 38, 0.25)" }, // 10: Red
  { color: "#0d9488", border: "rgba(13, 148, 136, 0.45)", bg: "rgba(13, 148, 136, 0.10)", glow: "rgba(13, 148, 136, 0.25)" }, // 11: Teal
  { color: "#4f46e5", border: "rgba(79, 70, 229, 0.45)", bg: "rgba(79, 70, 229, 0.10)", glow: "rgba(79, 70, 229, 0.25)" }, // 12: Indigo
  { color: "#ca8a04", border: "rgba(202, 138, 4, 0.45)", bg: "rgba(202, 138, 4, 0.10)", glow: "rgba(202, 138, 4, 0.25)" }, // 13: Yellow
  { color: "#16a34a", border: "rgba(22, 163, 74, 0.45)", bg: "rgba(22, 163, 74, 0.10)", glow: "rgba(22, 163, 74, 0.25)" }, // 14: Green
  { color: "#c026d3", border: "rgba(192, 38, 211, 0.45)", bg: "rgba(192, 38, 211, 0.10)", glow: "rgba(192, 38, 211, 0.25)" }, // 15: Fuchsia
  { color: "#db2777", border: "rgba(219, 39, 119, 0.45)", bg: "rgba(219, 39, 119, 0.10)", glow: "rgba(219, 39, 119, 0.25)" }, // 16: Pink
  { color: "#b45309", border: "rgba(180, 83, 9, 0.45)", bg: "rgba(180, 83, 9, 0.10)", glow: "rgba(180, 83, 9, 0.25)" }, // 17: Amber-Dark
  { color: "#047857", border: "rgba(4, 120, 87, 0.45)", bg: "rgba(4, 120, 87, 0.10)", glow: "rgba(4, 120, 87, 0.25)" }, // 18: Emerald-Dark
  { color: "#0369a1", border: "rgba(3, 105, 161, 0.45)", bg: "rgba(3, 105, 161, 0.10)", glow: "rgba(3, 105, 161, 0.25)" }, // 19: Sky-Dark
];

// Keyframes and initial state for ultra-smooth 4s breathing animation
const BLINK_STYLES = `
.cyber-node-inner {
  opacity: var(--base-opacity, 0.20);
  color: #475569;
  border-color: rgba(51, 65, 85, 0.08);
  background-color: rgba(255, 255, 255, 0.55);
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.02);
  transform: translateY(0px) scale(1);
}
@keyframes cyber-smooth-blink {
  0%, 100% {
    opacity: var(--base-opacity, 0.20);
    color: #475569;
    border-color: rgba(51, 65, 85, 0.08);
    background-color: rgba(255, 255, 255, 0.55);
    box-shadow: 0 1px 4px rgba(15, 23, 42, 0.02);
    transform: translateY(0px) scale(1);
  }
  50% {
    opacity: var(--peak-opacity, 0.62);
    color: var(--blink-color);
    border-color: var(--blink-border);
    background-color: var(--blink-bg);
    box-shadow: 0 0 12px var(--blink-glow), 0 2px 8px rgba(15, 23, 42, 0.03);
    transform: translateY(-2.5px) scale(1.03);
  }
}
@media (prefers-reduced-motion: reduce) {
  .cyber-node-inner {
    animation: none !important;
  }
}
`;

interface DotParticle {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

interface PulseParticle {
  lineIdx: number;
  progress: number;
  speed: number;
}

export interface CyberSpaceBackgroundProps {
  className?: string;
}

export const CyberSpaceBackground: React.FC<CyberSpaceBackgroundProps> = ({
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let animationFrameId: number;
    let lastTime = performance.now();
    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || 600;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resizeCanvas = () => {
      if (!container || !canvas) return;
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || 600;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
    };

    resizeCanvas();

    // Subtle micro tech dots on white background
    const dotCount = width < 640 ? 16 : 32;
    const dots: DotParticle[] = Array.from({ length: dotCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 0.9 + 0.3,
      alpha: Math.random() * 0.15 + 0.05,
      twinkleSpeed: Math.random() * 1.0 + 0.5,
      twinklePhase: Math.random() * Math.PI * 2,
    }));

    // Traveling packet pulses along network lines
    const pulses: PulseParticle[] = Array.from({ length: 5 }, (_, idx) => ({
      lineIdx: idx,
      progress: Math.random(),
      speed: Math.random() * 0.18 + 0.1,
    }));

    const animate = (currentTime: number) => {
      const deltaSec = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      // 1. Clean Crisp Pure White Background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);

      // 2. Subtle Micro Tech Dots (low contrast, refined)
      const timeInSec = currentTime / 1000;
      for (const dot of dots) {
        const twinkle = Math.sin(timeInSec * dot.twinkleSpeed + dot.twinklePhase);
        const currentAlpha = Math.max(0.03, Math.min(0.2, dot.alpha + twinkle * 0.05));

        ctx.fillStyle = "rgba(15, 23, 42, " + currentAlpha + ")";
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. Compute Fixed Node Positions in Canvas Pixels
      const isMobile = width < 768;
      const currentPoints = FIXED_NODE_COORDS.map((coord) => ({
        x: (coord.pctX / 100) * width,
        y: (coord.pctY / 100) * height,
      }));

      // 4. Fixed Constellation Connection Lines
      const maxConnDist = isMobile ? 180 : 220;
      const connectionLimits = new Uint8Array(currentPoints.length);
      const lines: { x1: number; y1: number; x2: number; y2: number; alpha: number; p1Idx: number; p2Idx: number }[] = [];

      for (let i = 0; i < currentPoints.length; i++) {
        if (isMobile && !MOBILE_VISIBLE_INDICES.includes(i)) continue;

        for (let j = i + 1; j < currentPoints.length; j++) {
          if (isMobile && !MOBILE_VISIBLE_INDICES.includes(j)) continue;
          if (connectionLimits[i] >= 3 || connectionLimits[j] >= 3) continue;

          const p1 = currentPoints[i];
          const p2 = currentPoints[j];
          const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);

          if (dist < maxConnDist) {
            connectionLimits[i]++;
            connectionLimits[j]++;

            const norm = 1 - dist / maxConnDist;
            const midX = (p1.x + p2.x) * 0.5;
            const pctFromLeft = midX / width;
            const lineFade = pctFromLeft >= 0.70 ? 1.0 : 0.15 + (pctFromLeft / 0.70) * 0.85;
            const alpha = norm * 0.08 * lineFade;

            lines.push({
              x1: p1.x,
              y1: p1.y,
              x2: p2.x,
              y2: p2.y,
              alpha,
              p1Idx: i,
              p2Idx: j,
            });
          }
        }
      }

      // Draw Network Lines (subtle slate lines on white)
      ctx.lineWidth = 0.8;
      for (const line of lines) {
        ctx.save();
        ctx.strokeStyle = `rgba(15, 23, 42, ${Math.min(0.12, line.alpha)})`;
        ctx.beginPath();
        ctx.moveTo(line.x1, line.y1);
        ctx.lineTo(line.x2, line.y2);
        ctx.stroke();
        ctx.restore();
      }

      // 5. Traveling Packet Pulses on Network Lines (subtle blue telemetry dots)
      if (!prefersReducedMotion && lines.length > 0) {
        for (let pIdx = 0; pIdx < pulses.length; pIdx++) {
          const pulse = pulses[pIdx];
          pulse.progress += pulse.speed * deltaSec;
          if (pulse.progress > 1) {
            pulse.progress = 0;
            pulse.lineIdx = Math.floor(Math.random() * lines.length);
          }

          const activeLine = lines[pulse.lineIdx % lines.length];
          if (activeLine) {
            const px = activeLine.x1 + (activeLine.x2 - activeLine.x1) * pulse.progress;
            const py = activeLine.y1 + (activeLine.y2 - activeLine.y1) * pulse.progress;

            ctx.save();
            ctx.fillStyle = "#0284c7";
            ctx.globalAlpha = 0.4;
            ctx.beginPath();
            ctx.arc(px, py, 1.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
    };
  }, [prefersReducedMotion]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "absolute inset-0 overflow-hidden pointer-events-none select-none z-0 bg-white",
        className
      )}
      aria-hidden="true"
    >
      {/* 1. Technical Precision Grid Pattern on White Background */}
      <div
        className="absolute inset-0 opacity-[0.4] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(15,23,42,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.04) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(ellipse 85% 70% at 50% 40%, black 25%, transparent 88%)",
          WebkitMaskImage: "radial-gradient(ellipse 85% 70% at 50% 40%, black 25%, transparent 88%)",
        }}
      />

      {/* 2. Soft Airy Ambient Tint Highlights */}
      <div
        className="absolute -top-24 right-[-5rem] w-[460px] h-[460px] rounded-full blur-[140px] opacity-[0.06] pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(14,165,233,0.8) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute -bottom-32 left-[-6rem] w-[500px] h-[500px] rounded-full blur-[140px] opacity-[0.05] pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(99,102,241,0.8) 0%, transparent 70%)",
        }}
      />

      {/* 3. Canvas Layer: Clean White Canvas, Faint Lines, Subtle Pulses */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {/* Injected Keyframes for smooth 3s colored blinking */}
      <style>{BLINK_STYLES}</style>

      {/* 4. DOM Layer: Fixed Audit Module Nodes (Anchored by CSS %, Smooth Dynamic 3s Blinking, Never Disappears) */}
      <div className="absolute inset-0 w-full h-full pointer-events-none">
        {AUDIT_MODULES.map((module, idx) => {
          const Icon = module.icon;
          const coord = FIXED_NODE_COORDS[idx];
          const theme = BLINK_THEMES[idx % BLINK_THEMES.length];
          const isMobileVisible = MOBILE_VISIBLE_INDICES.includes(idx);
          // Semakin ke kiri semakin pudar iconnya, dengan rasio transisi 30% dari kanan (pctX >= 70% penuh, pctX < 70% memudar lembut ke ~15%)
          const fadeRatio = coord.pctX >= 70
            ? 1.0
            : 0.15 + (coord.pctX / 70) * 0.85;

          const baseOpacity = Number((0.26 * fadeRatio).toFixed(2));
          const peakOpacity = Number((0.62 * fadeRatio).toFixed(2));
          const delay = `${((idx * 0.65) % 4).toFixed(2)}s`;

          return (
            <div
              key={module.id}
              aria-hidden="true"
              style={{
                left: `${coord.pctX}%`,
                top: `${coord.pctY}%`,
              }}
              className={cn(
                "absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none",
                isMobileVisible ? "block" : "hidden md:block"
              )}
            >
              {/* Inner card: Ultra-smooth 4s breathing animation, softer and more faded */}
              <div
                style={{
                  opacity: baseOpacity,
                  ["--base-opacity" as string]: baseOpacity,
                  ["--peak-opacity" as string]: peakOpacity,
                  ["--blink-color" as string]: theme.color,
                  ["--blink-border" as string]: theme.border,
                  ["--blink-bg" as string]: theme.bg,
                  ["--blink-glow" as string]: theme.glow,
                  animation: "cyber-smooth-blink 4s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite both",
                  animationDelay: delay,
                }}
                className="cyber-node-inner size-11 sm:size-12 rounded-xl flex items-center justify-center border backdrop-blur-sm transition-colors duration-700"
              >
                <Icon
                  className="size-5.5 sm:size-6 transition-all duration-300"
                  aria-hidden="true"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
