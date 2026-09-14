import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { DriverChartTooltip } from "./DriverChartTooltip";
import type { OpenF1Driver } from "../../types/openf1";
import type { DriverVisualStyle } from "../../utils/transformers";
import { DRIVER_DASH_PATTERN } from "../../types/ui";
import { toHexColor } from "../../utils/transformers";
import {
  buildDeltaChartData,
  buildMetricChartData,
  type QualifyingChartPoint,
  type QualifyingTelemetryMetric,
  type QualifyingTelemetrySeries,
} from "../../utils/qualifyingTelemetry";

const METRICS: Array<{
  key: QualifyingTelemetryMetric;
  title: string;
  yAxisLabel: string;
  format: (value: number) => string;
}> = [
  { key: "speed", title: "Speed", yAxisLabel: "km/h", format: (value) => `${value.toFixed(0)} km/h` },
  { key: "throttle", title: "Throttle", yAxisLabel: "%", format: (value) => `${value.toFixed(0)}%` },
  { key: "brake", title: "Brake", yAxisLabel: "%", format: (value) => `${value.toFixed(0)}%` },
  { key: "gear", title: "Gear", yAxisLabel: "Gear", format: (value) => `${Math.round(value)}` },
  { key: "rpm", title: "RPM", yAxisLabel: "RPM", format: (value) => `${Math.round(value).toLocaleString()} rpm` },
];

const DELTA_CONFIG = {
  key: "delta" as const,
  title: "Delta to fastest selected lap",
  yAxisLabel: "Seconds",
  format: (value: number) => `${value > 0 ? "+" : ""}${value.toFixed(3)}s`,
};

const CHART_HEIGHT = 320;
const GRID_TICKS = [0, 25, 50, 75, 100];
const CHART_MARGIN = { top: 10, right: 18, left: 8, bottom: 22 };
const Y_AXIS_WIDTH = 60;

interface QualifyingTelemetryChartsProps {
  series: QualifyingTelemetrySeries[];
  driverStyles: Map<number, DriverVisualStyle>;
  selectedDrivers: OpenF1Driver[];
  referenceDriverNumber: number | null;
  referenceTelemetryAvailable: boolean;
  missingLapDrivers: number[];
  unavailableTelemetryDrivers: number[];
  errors: string[];
}

interface ChartSeries {
  key: string;
  name: string;
  color: string;
  lineStyle: "solid" | "dashed";
}

interface ChartPanelProps {
  title: string;
  yAxisLabel: string;
  data: QualifyingChartPoint[];
  series: ChartSeries[];
  hoveredProgress: number | null;
  onHover: (progress: number | null) => void;
  formatValue: (value: number) => string;
  fullWidth?: boolean;
}

function getDriverName(driver: OpenF1Driver | undefined, driverNumber: number): string {
  return driver?.name_acronym ?? `#${driverNumber}`;
}

function getNearestPoint(data: QualifyingChartPoint[], progress: number): QualifyingChartPoint | null {
  if (data.length === 0) return null;
  return data.reduce((nearest, point) => (
    Math.abs(point.progress - progress) < Math.abs(nearest.progress - progress) ? point : nearest
  ));
}

function ChartPanel({
  title,
  yAxisLabel,
  data,
  series,
  hoveredProgress,
  onHover,
  formatValue,
  fullWidth = false,
}: ChartPanelProps) {
  const handleMouseMove = (state: { activeLabel?: string | number; activePayload?: Array<{ payload?: QualifyingChartPoint }> }) => {
    const payloadProgress = state.activePayload?.[0]?.payload?.progress;
    const activeLabel = state.activeLabel;
    const progress = typeof payloadProgress === "number" ? payloadProgress : Number(activeLabel);
    if (Number.isFinite(progress)) onHover(progress);
  };
  const hoveredPoint = hoveredProgress === null ? null : getNearestPoint(data, hoveredProgress);

  return (
    <section className={`relative min-w-0 rounded-lg border border-border bg-card p-4 ${fullWidth ? "md:col-span-2" : ""}`} aria-label={`${title} chart`}>
      <h3 className="mb-1 text-card-foreground">{title}</h3>
      <p className="mb-3 text-xs text-muted-foreground">Hover any chart to compare every selected driver at the same lap distance.</p>
      {data.length === 0 ? (
        <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">No chart data is available.</div>
      ) : (
        <div className="relative">
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <LineChart
              data={data}
              margin={CHART_MARGIN}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => onHover(null)}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a36" />
              <XAxis
                dataKey="progress"
                type="number"
                domain={[0, 100]}
                ticks={GRID_TICKS}
                allowDecimals={false}
                stroke="#9ca3af"
                tick={{ fill: "#9ca3af", fontSize: 12 }}
                label={{ value: "Lap distance (%)", position: "insideBottom", offset: -10, fill: "#9ca3af" }}
              />
              <YAxis
                width={Y_AXIS_WIDTH}
                stroke="#9ca3af"
                tick={{ fill: "#9ca3af", fontSize: 12 }}
                tickFormatter={(value: number) => value.toLocaleString()}
                label={{ value: yAxisLabel, angle: -90, position: "insideLeft", fill: "#9ca3af" }}
              />
              {hoveredProgress !== null && <ReferenceLine x={hoveredProgress} stroke="#f5f5f5" strokeDasharray="4 4" strokeOpacity={0.7} />}
              {series.map((item) => (
                <Line
                  key={item.key}
                  type="monotone"
                  dataKey={item.key}
                  name={item.name}
                  stroke={item.color}
                  strokeDasharray={item.lineStyle === "dashed" ? DRIVER_DASH_PATTERN : undefined}
                  dot={false}
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
          {hoveredProgress !== null && hoveredPoint && (
            <DriverChartTooltip
              title={title}
              subtitle={`${hoveredPoint.progress.toFixed(0)}% lap distance`}
              xValue={hoveredProgress}
              xDomain={[0, 100]}
              data={hoveredPoint}
              series={series}
              formatValue={formatValue}
              chartMargin={CHART_MARGIN}
              yAxisWidth={Y_AXIS_WIDTH}
            />
          )}
        </div>
      )}
    </section>
  );
}

function OmittedDriversNote({
  selectedDrivers,
  missingLapDrivers,
  unavailableTelemetryDrivers,
}: Pick<QualifyingTelemetryChartsProps, "selectedDrivers" | "missingLapDrivers" | "unavailableTelemetryDrivers">) {
  const omittedNumbers = [...new Set([...missingLapDrivers, ...unavailableTelemetryDrivers])];
  if (omittedNumbers.length === 0) return null;

  const driverMap = new Map(selectedDrivers.map((driver) => [driver.driver_number, driver]));
  const names = omittedNumbers.map((driverNumber) => getDriverName(driverMap.get(driverNumber), driverNumber));
  return <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">Not plotted because a valid fastest lap or usable car telemetry was unavailable: {names.join(", ")}.</p>;
}

function DeltaEmptyState() {
  return <div className="flex min-h-48 items-center justify-center rounded-md border border-dashed border-border px-4 text-center text-sm text-muted-foreground">The fastest selected lap has no usable car telemetry, so a delta trace cannot be calculated.</div>;
}

export function QualifyingTelemetryCharts({
  series,
  driverStyles,
  selectedDrivers,
  referenceDriverNumber,
  referenceTelemetryAvailable,
  missingLapDrivers,
  unavailableTelemetryDrivers,
  errors,
}: QualifyingTelemetryChartsProps) {
  const [hoveredProgress, setHoveredProgress] = useState<number | null>(null);
  const driverMap = useMemo(() => new Map(selectedDrivers.map((driver) => [driver.driver_number, driver])), [selectedDrivers]);
  const chartSeries = useMemo<ChartSeries[]>(
    () => series.map((item) => {
      const driver = driverMap.get(item.driverNumber);
      const style = driverStyles.get(item.driverNumber);
      return {
        key: `driver-${item.driverNumber}`,
        name: getDriverName(driver, item.driverNumber),
        color: style?.color ?? toHexColor(driver?.team_colour),
        lineStyle: style?.lineStyle ?? "solid",
      };
    }),
    [driverMap, driverStyles, series],
  );
  const metricData = useMemo(
    () => new Map(METRICS.map((metric) => [metric.key, buildMetricChartData(series, metric.key)])),
    [series],
  );
  const deltaData = useMemo(
    () => buildDeltaChartData(series, referenceDriverNumber),
    [referenceDriverNumber, series],
  );

  return (
    <section className="space-y-4" aria-labelledby="qualifying-telemetry-heading">
      <div>
        <h2 id="qualifying-telemetry-heading" className="text-xl tracking-tight">Fastest-lap comparison</h2>
        <p className="mt-1 text-sm text-muted-foreground">Telemetry is aligned to lap distance so each selected driver can be compared through the same track position.</p>
      </div>
      <OmittedDriversNote selectedDrivers={selectedDrivers} missingLapDrivers={missingLapDrivers} unavailableTelemetryDrivers={unavailableTelemetryDrivers} />
      {errors.length > 0 && <p className="text-xs text-muted-foreground">Some telemetry requests failed, so those drivers have been omitted from the charts.</p>}
      {series.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">No usable telemetry is available for the selected drivers.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            {referenceTelemetryAvailable ? (
              <ChartPanel
                title={DELTA_CONFIG.title}
                yAxisLabel={DELTA_CONFIG.yAxisLabel}
                data={deltaData}
                series={chartSeries}
                hoveredProgress={hoveredProgress}
                onHover={setHoveredProgress}
                formatValue={DELTA_CONFIG.format}
                fullWidth
              />
            ) : (
              <section className="rounded-lg border border-border bg-card p-4" aria-label="Delta to fastest selected lap chart">
                <h3 className="mb-1 text-card-foreground">{DELTA_CONFIG.title}</h3>
                <p className="mb-3 text-xs text-muted-foreground">The fastest selected lap remains the reference for this comparison.</p>
                <DeltaEmptyState />
              </section>
            )}
          </div>
          {METRICS.map((metric) => (
            <ChartPanel
              key={metric.key}
              title={metric.title}
              yAxisLabel={metric.yAxisLabel}
              data={metricData.get(metric.key) ?? []}
              series={chartSeries}
              hoveredProgress={hoveredProgress}
              onHover={setHoveredProgress}
              formatValue={metric.format}
            />
          ))}
        </div>
      )}
    </section>
  );
}
