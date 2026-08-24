import type { DriverLineStyle } from "../../types/ui";
import { DRIVER_DASH_PATTERN } from "../../types/ui";

export interface DriverSeriesLegendItem {
  key: string;
  name: string;
  color: string;
  lineStyle?: DriverLineStyle;
}

interface DriverLineSwatchProps {
  color: string;
  lineStyle?: DriverLineStyle;
  className?: string;
}

export function DriverLineSwatch({ color, lineStyle = "solid", className = "h-2.5 w-5" }: DriverLineSwatchProps) {
  return (
    <svg className={className} viewBox="0 0 20 8" aria-hidden="true">
      <line
        x1="1"
        y1="4"
        x2="19"
        y2="4"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={lineStyle === "dashed" ? DRIVER_DASH_PATTERN : undefined}
        data-line-style={lineStyle}
      />
    </svg>
  );
}

export function DriverLineStyleLegend({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground ${className}`.trim()} aria-label="Driver line style key">
      <span className="inline-flex items-center gap-1.5"><DriverLineSwatch color="#9ca3af" />First driver</span>
      <span className="inline-flex items-center gap-1.5"><DriverLineSwatch color="#9ca3af" lineStyle="dashed" />Second driver</span>
    </div>
  );
}

export function DriverSeriesLegend({ series, className = "" }: { series: DriverSeriesLegendItem[]; className?: string }) {
  if (series.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground ${className}`.trim()} aria-label="Driver series legend">
      {series.map((item) => (
        <span key={item.key} className="inline-flex min-w-0 items-center gap-1.5">
          <DriverLineSwatch color={item.color} lineStyle={item.lineStyle} />
          <span className="truncate">{item.name}</span>
        </span>
      ))}
    </div>
  );
}
