import { useEffect, useMemo, useRef, useState } from "react";
import { DRIVER_DASH_PATTERN } from "../../types/ui";
import { formatLapTime, type StrategyLineSeries } from "../../utils/transformers";

const CHART_HEIGHT = 340;
const MARGIN = { top: 16, right: 20, bottom: 48, left: 76 };
const DENSITY_STEPS = 48;
const MINIMUM_DRIVER_SLOT_WIDTH = 88;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function kernelDensity(values: number[], minimum: number, maximum: number) {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  const bandwidth = Math.max(0.35, 1.06 * Math.sqrt(variance) * values.length ** -0.2);

  return Array.from({ length: DENSITY_STEPS + 1 }, (_, index) => {
    const value = minimum + ((maximum - minimum) * index) / DENSITY_STEPS;
    const density = values.reduce((sum, sample) => {
      const scaled = (value - sample) / bandwidth;
      return sum + Math.exp(-0.5 * scaled * scaled);
    }, 0) / (values.length * bandwidth * Math.sqrt(2 * Math.PI));
    return { value, density };
  });
}

export function LapTimeViolinChart({ series }: { series: StrategyLineSeries[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const updateWidth = () => setWidth(element.getBoundingClientRect().width);
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const plot = useMemo(() => {
    const populated = series.filter((line) => line.values.length > 0);
    const allValues = populated.flatMap((line) => line.values.map((point) => point.value));
    if (!allValues.length) return null;

    let minimum = Infinity;
    let maximum = -Infinity;
    for (const value of allValues) {
      minimum = Math.min(minimum, value);
      maximum = Math.max(maximum, value);
    }
    const padding = Math.max(0.5, (maximum - minimum) * 0.08);
    const domainMinimum = minimum - padding;
    const domainMaximum = maximum + padding;

    return {
      domainMinimum,
      domainMaximum,
      ticks: Array.from({ length: 5 }, (_, index) => domainMinimum + ((domainMaximum - domainMinimum) * index) / 4),
      violins: populated.map((line) => {
        const values = line.values.map((point) => point.value);
        return {
          ...line,
          median: median(values),
          density: kernelDensity(values, domainMinimum, domainMaximum),
        };
      }),
    };
  }, [series]);

  const innerHeight = CHART_HEIGHT - MARGIN.top - MARGIN.bottom;
  const chartWidth = plot
    ? Math.max(width, MARGIN.left + MARGIN.right + plot.violins.length * MINIMUM_DRIVER_SLOT_WIDTH)
    : width;
  const yFor = (value: number) => plot
    ? MARGIN.top + ((plot.domainMaximum - value) / (plot.domainMaximum - plot.domainMinimum)) * innerHeight
    : MARGIN.top;

  return <div ref={containerRef} className="w-full min-w-0 overflow-x-auto" tabIndex={plot && chartWidth > width ? 0 : undefined} aria-label={plot && chartWidth > width ? "Scrollable lap-time distribution chart" : undefined}>
    {!plot ? <div className="h-[280px] flex items-center justify-center border border-dashed border-border rounded-md text-sm text-muted-foreground text-center px-6">Lap-time distribution data is unavailable for the selected drivers.</div> : width > 0 ? <div>
      <svg
        width={chartWidth}
        height={CHART_HEIGHT}
        role="img"
        aria-label="Violin plot comparing the distribution of cleaned lap times for each selected driver"
        className="block overflow-visible"
      >
      <title>Lap-time distribution by driver</title>
      {plot.ticks.map((tick) => {
        const y = yFor(tick);
        return <g key={tick}>
          <line x1={MARGIN.left} x2={chartWidth - MARGIN.right} y1={y} y2={y} stroke="#2a2a36" strokeDasharray="3 3" />
          <text x={MARGIN.left - 10} y={y + 4} textAnchor="end" fill="#9ca3af" fontSize={11}>{formatLapTime(tick)}</text>
        </g>;
      })}
      <line x1={MARGIN.left} x2={MARGIN.left} y1={MARGIN.top} y2={CHART_HEIGHT - MARGIN.bottom} stroke="#9ca3af" />
      <text x={16} y={MARGIN.top + innerHeight / 2} transform={`rotate(-90 16 ${MARGIN.top + innerHeight / 2})`} textAnchor="middle" fill="#9ca3af" fontSize={11}>Lap time</text>
      {plot.violins.map((violin, index) => {
        const plotWidth = chartWidth - MARGIN.left - MARGIN.right;
        const slotWidth = plotWidth / plot.violins.length;
        const centerX = MARGIN.left + slotWidth * (index + 0.5);
        const halfWidth = Math.min(54, slotWidth * 0.38);
        const maximumDensity = Math.max(...violin.density.map((point) => point.density));
        const left = violin.density.map((point) => `${(centerX - (point.density / maximumDensity) * halfWidth).toFixed(2)},${yFor(point.value).toFixed(2)}`);
        const right = [...violin.density].reverse().map((point) => `${(centerX + (point.density / maximumDensity) * halfWidth).toFixed(2)},${yFor(point.value).toFixed(2)}`);
        const medianY = yFor(violin.median);
        return <g key={violin.key} tabIndex={0} aria-label={`${violin.name}: ${violin.values.length} laps, median ${formatLapTime(violin.median)}`}>
          <title>{`${violin.name}: ${violin.values.length} laps, median ${formatLapTime(violin.median)}`}</title>
          <path d={`M${left[0]} L${left.slice(1).join(" L")} L${right.join(" L")} Z`} fill={violin.color} fillOpacity={0.45} stroke={violin.color} strokeWidth={2} strokeDasharray={violin.lineStyle === "dashed" ? DRIVER_DASH_PATTERN : undefined} />
          <line x1={centerX - halfWidth * 0.42} x2={centerX + halfWidth * 0.42} y1={medianY} y2={medianY} stroke="#f5f5f5" strokeWidth={2} />
          <text x={centerX} y={CHART_HEIGHT - 18} textAnchor="middle" fill={violin.color} fontSize={12} fontWeight={600}>{violin.name}</text>
        </g>;
      })}
      </svg>
    </div> : <div className="h-[340px]" />}
  </div>;
}
