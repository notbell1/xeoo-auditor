import React, { useState } from "react";
import { cn } from "../../lib/utils";

export interface ChartDataPoint {
  date: string;
  total: number;
  completed?: number;
  failed?: number;
}

export interface AuditVolumeChartProps {
  data: ChartDataPoint[];
  title?: string;
  height?: number;
  className?: string;
}

export const AuditVolumeChart: React.FC<AuditVolumeChartProps> = ({
  data,
  title = "Daily Audit Volume Trend",
  height = 200,
  className,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div
        className={cn(
          "w-full flex items-center justify-center border border-dashed border-[var(--color-border)] rounded-[var(--radius-sm)] p-6 text-xs text-[var(--color-text-muted)]",
          className
        )}
        style={{ height }}
      >
        No audit volume data for this period.
      </div>
    );
  }

  const padding = { top: 20, right: 20, bottom: 30, left: 35 };
  const width = 600;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxVal = Math.max(...data.map((d) => d.total), 5);
  const yTicks = [0, Math.round(maxVal * 0.5), maxVal];

  const points = data.map((d, index) => {
    const x = padding.left + (index / (Math.max(data.length - 1, 1))) * chartWidth;
    const y = padding.top + chartHeight - (d.total / maxVal) * chartHeight;
    return { x, y, data: d };
  });

  const pathD = points.reduce((acc, p, i) => `${acc} ${i === 0 ? "M" : "L"} ${p.x} ${p.y}`, "");
  const areaD = `${pathD} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`;

  return (
    <div className={cn("w-full relative select-none", className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-[var(--color-text-primary)]">
          {title}
        </span>
        <span className="text-[11px]  text-[var(--color-text-muted)]">
          Last {data.length} days
        </span>
      </div>

      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="auditAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines & Y-axis labels */}
          {yTicks.map((tick, i) => {
            const y = padding.top + chartHeight - (tick / maxVal) * chartHeight;
            return (
              <g key={i}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="var(--color-border-subtle)"
                  strokeDasharray="3 3"
                />
                <text
                  x={padding.left - 6}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[10px] fill-[var(--color-text-muted)] "
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Area Fill */}
          <path d={areaD} fill="url(#auditAreaGradient)" />

          {/* Volume Line */}
          <path
            d={pathD}
            fill="none"
            stroke="var(--color-brand-primary)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Interactive Data Dots & Hover Hitboxes */}
          {points.map((p, i) => {
            const isHovered = hoveredIndex === i;
            return (
              <g key={i}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 5 : 3.5}
                  fill="var(--color-surface)"
                  stroke="var(--color-brand-primary)"
                  strokeWidth={isHovered ? 2.5 : 2}
                  className="transition-all duration-150"
                />
                {/* Invisible hover capture target */}
                <rect
                  x={p.x - 12}
                  y={padding.top}
                  width={24}
                  height={chartHeight}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              </g>
            );
          })}

          {/* X-axis date labels (show first, middle, last) */}
          {points.length > 0 && (
            <>
              <text
                x={points[0].x}
                y={height - 6}
                textAnchor="start"
                className="text-[10px] fill-[var(--color-text-muted)] "
              >
                {points[0].data.date.slice(5)}
              </text>
              {points.length > 2 && (
                <text
                  x={points[Math.floor(points.length / 2)].x}
                  y={height - 6}
                  textAnchor="middle"
                  className="text-[10px] fill-[var(--color-text-muted)] "
                >
                  {points[Math.floor(points.length / 2)].data.date.slice(5)}
                </text>
              )}
              <text
                x={points[points.length - 1].x}
                y={height - 6}
                textAnchor="end"
                className="text-[10px] fill-[var(--color-text-muted)] "
              >
                {points[points.length - 1].data.date.slice(5)}
              </text>
            </>
          )}
        </svg>

        {/* Hover Tooltip Popup */}
        {hoveredIndex !== null && points[hoveredIndex] && (
          <div
            className="absolute z-20 pointer-events-none -translate-x-1/2 -translate-y-full px-2.5 py-1.5 rounded-[var(--radius-sm)] bg-slate-900 text-white text-[11px] shadow-lg border border-slate-700 whitespace-nowrap"
            style={{
              left: `${(points[hoveredIndex].x / width) * 100}%`,
              top: `${(points[hoveredIndex].y / height) * 100 - 8}%`,
            }}
          >
            <div className=" text-slate-300 font-semibold mb-0.5">
              {points[hoveredIndex].data.date}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-400 font-bold">
                {points[hoveredIndex].data.total} Total
              </span>
              {points[hoveredIndex].data.completed !== undefined && (
                <span className="text-emerald-400">
                  {points[hoveredIndex].data.completed} Passed
                </span>
              )}
              {points[hoveredIndex].data.failed !== undefined && points[hoveredIndex].data.failed > 0 && (
                <span className="text-rose-400">
                  {points[hoveredIndex].data.failed} Failed
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

