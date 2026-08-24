import { useLayoutEffect, useRef, useState } from "react";
import type { DriverLineStyle } from "../../types/ui";
import { DriverLineSwatch } from "./DriverLineStyleLegend";

const TOOLTIP_OFFSET_PX = 12;

export interface DriverChartTooltipSeries {
  key: string;
  name: string;
  color: string;
  lineStyle?: DriverLineStyle;
}

interface DriverChartTooltipProps {
  title: string;
  subtitle: string;
  xValue: number;
  xDomain: readonly [number, number];
  data: Record<string, number> | null;
  series: DriverChartTooltipSeries[];
  formatValue: (value: number) => string;
  chartMargin: { left: number; right: number };
  yAxisWidth: number;
}

function getChartLinePosition(
  xValue: number,
  xDomain: readonly [number, number],
  chartWidth: number,
  chartMargin: { left: number; right: number },
  yAxisWidth: number,
) {
  if (chartWidth <= 0) return 0;

  const domainSpan = Math.max(1, xDomain[1] - xDomain[0]);
  const progress = Math.min(1, Math.max(0, (xValue - xDomain[0]) / domainSpan));
  const plotStart = chartMargin.left + yAxisWidth;
  const plotWidth = Math.max(0, chartWidth - plotStart - chartMargin.right);
  return plotStart + plotWidth * progress;
}

function getTooltipPlacement(
  xValue: number,
  xDomain: readonly [number, number],
  placeOnRight: boolean,
  chartMargin: { left: number; right: number },
  yAxisWidth: number,
) {
  const domainSpan = Math.max(1, xDomain[1] - xDomain[0]);
  const progress = Math.min(1, Math.max(0, (xValue - xDomain[0]) / domainSpan));
  const plotStart = chartMargin.left + yAxisWidth;
  return {
    left: `calc(${progress * 100}% + ${plotStart - (plotStart + chartMargin.right) * progress}px)`,
    transform: placeOnRight
      ? `translateX(${TOOLTIP_OFFSET_PX}px)`
      : `translateX(calc(-100% - ${TOOLTIP_OFFSET_PX}px))`,
  };
}

export function DriverChartTooltip({
  title,
  subtitle,
  xValue,
  xDomain,
  data,
  series,
  formatValue,
  chartMargin,
  yAxisWidth,
}: DriverChartTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [placeOnRight, setPlaceOnRight] = useState(xValue <= xDomain[0] + (xDomain[1] - xDomain[0]) / 2);

  useLayoutEffect(() => {
    const tooltip = tooltipRef.current;
    const container = tooltip?.parentElement;
    if (!tooltip || !container) return undefined;

    const updatePlacement = () => {
      const linePosition = getChartLinePosition(xValue, xDomain, container.clientWidth, chartMargin, yAxisWidth);
      const tooltipWidth = tooltip.offsetWidth;
      const rightSpace = container.clientWidth - linePosition;
      const leftSpace = linePosition;
      const fitsRight = rightSpace >= tooltipWidth + TOOLTIP_OFFSET_PX;
      const fitsLeft = leftSpace >= tooltipWidth + TOOLTIP_OFFSET_PX;
      const nextPlaceOnRight = fitsRight || (!fitsLeft && rightSpace >= leftSpace);
      setPlaceOnRight(nextPlaceOnRight);
    };

    updatePlacement();
    if (typeof ResizeObserver === "undefined") return undefined;

    const observer = new ResizeObserver(updatePlacement);
    observer.observe(container);
    return () => observer.disconnect();
  }, [chartMargin.left, chartMargin.right, xDomain, xValue, yAxisWidth]);

  if (!data) return null;
  const placement = getTooltipPlacement(xValue, xDomain, placeOnRight, chartMargin, yAxisWidth);

  return (
    <div
      ref={tooltipRef}
      className="pointer-events-none absolute top-3 z-10 min-w-36 rounded-md border border-border bg-popover/95 px-3 py-2 text-xs text-popover-foreground shadow-lg"
      style={placement}
      aria-live="polite"
    >
      <p className="font-medium">{title}</p>
      <p className="mt-0.5 text-muted-foreground">{subtitle}</p>
      <div className="mt-2 space-y-1">
        {series.map((item) => {
          const value = data[item.key];
          return (
            <div key={item.key} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5">
                <DriverLineSwatch color={item.color} lineStyle={item.lineStyle} />
                {item.name}
              </span>
              <span className="font-mono">{typeof value === "number" ? formatValue(value) : "—"}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
