import { useMemo, useState, type ReactNode } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { Clock3, Gauge, Users } from "lucide-react";
import {
  useDriversData, useLapsData, usePitsData, usePositionsData,
  useIntervalsData, useSessionResultsData, useStintsData,
} from "../hooks/useSessionData";
import { useF1Data, useSessionMode } from "../context/F1DataContext";
import { useResolvedSession } from "../hooks/useSessionScope";
import { useDriverSelection } from "../hooks/useDriverSelection";
import {
  buildLapTimeSeries, buildRunningGapSeries,
  buildPitStops, buildPositionSeries, buildStintTimeline, formatLapTime, getBestLapFormatted,
  toHexColor, type StrategyLineSeries,
} from "../utils/transformers";
import { DRIVER_DASH_PATTERN, TIRE_COLORS, type TireCompound } from "../types/ui";
import { DriverSelectionCard } from "../components/DriverSelectionCard";
import { EmptyState, ErrorState, PageLoading, PanelLoading, PartialDataNotice } from "../components/AsyncState";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { DriverChartTooltip } from "../components/charts/DriverChartTooltip";
import { DriverSeriesLegend } from "../components/charts/DriverLineStyleLegend";
import { LapTimeViolinChart } from "../components/charts/LapTimeViolinChart";
import { Button } from "../components/ui/button";
import { SessionAvailability } from "../components/SessionAvailability";
import { SessionVariantToggle } from "../components/SessionVariantToggle";

const CHART_GRID = "#2a2a36";
const CHART_TEXT = "#9ca3af";
const CHART_MARGIN = { top: 8, right: 18, left: 8, bottom: 12 };
type WideChartPoint = { lap: number } & Record<string, number>;

function mergeSeries(series: StrategyLineSeries[]): WideChartPoint[] {
  const rows = new Map<number, WideChartPoint>();
  for (const line of series) {
    for (const point of line.values) {
      const row: WideChartPoint = rows.get(point.lap) ?? { lap: point.lap };
      row[line.key] = point.value;
      rows.set(point.lap, row);
    }
  }
  return [...rows.values()].sort((a, b) => a.lap - b.lap);
}

function ChartCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <section className="bg-card border border-border rounded-lg p-4 md:p-6">
    <div className="mb-5"><h2 className="text-lg text-card-foreground">{title}</h2><p className="text-sm text-muted-foreground mt-1">{description}</p></div>
    {children}
  </section>;
}

function ChartEmpty({ children }: { children: ReactNode }) {
  return <div className="h-[280px] flex items-center justify-center border border-dashed border-border rounded-md text-sm text-muted-foreground text-center px-6">{children}</div>;
}

export function RaceStrategy() {
  const [hoveredLap, setHoveredLap] = useState<number | null>(null);
  const { setSessionMode } = useF1Data();
  const variant = useSessionMode("raceStrategy");
  const resolution = useResolvedSession("race", variant);
  const selectedSession = resolution.session;
  const sessionKey = resolution.status === "completed" ? selectedSession?.session_key ?? null : null;
  const driversState = useDriversData(sessionKey);
  const lapsState = useLapsData(sessionKey);
  const stintsState = useStintsData(sessionKey);
  const pitsState = usePitsData(sessionKey);
  const positionsState = usePositionsData(sessionKey);
  const intervalsState = useIntervalsData(sessionKey);
  const resultsState = useSessionResultsData(sessionKey);
  const { data: drivers, loading: driversLoading } = driversState;
  const { data: laps, loading: lapsLoading } = lapsState;
  const { data: stints, loading: stintsLoading } = stintsState;
  const { data: pits, loading: pitsLoading } = pitsState;
  const { data: positions, loading: positionsLoading } = positionsState;
  const { data: intervals, loading: intervalsLoading } = intervalsState;
  const { data: results, loading: resultsLoading } = resultsState;
  const requiredLoading = driversLoading || lapsLoading || resultsLoading;
  const optionalLoading = stintsLoading || pitsLoading || positionsLoading || intervalsLoading;
  const selection = useDriverSelection({ sessionKey, drivers, results, laps, loading: requiredLoading });
  const { selectedDrivers, selectedSet, defaults, driverStyles } = selection;
  const filteredLaps = useMemo(() => laps.filter((lap) => selectedSet.has(lap.driver_number)), [laps, selectedSet]);
  const filteredStints = useMemo(() => stints.filter((stint) => selectedSet.has(stint.driver_number)), [stints, selectedSet]);
  const filteredPits = useMemo(() => pits.filter((pit) => selectedSet.has(pit.driver_number)), [pits, selectedSet]);
  const stintTimeline = useMemo(() => {
    const order = new Map(selectedDrivers.map((number, index) => [number, index]));
    return buildStintTimeline(filteredStints, drivers).sort((a, b) => (order.get(a.driverNumber) ?? 0) - (order.get(b.driverNumber) ?? 0));
  }, [filteredStints, drivers, selectedDrivers]);
  const pitStops = useMemo(() => buildPitStops(filteredPits, drivers, filteredStints), [filteredPits, drivers, filteredStints]);
  const runningGapSeries = useMemo(() => buildRunningGapSeries(laps, intervals, drivers, selectedDrivers, results, driverStyles), [laps, intervals, drivers, selectedDrivers, results, driverStyles]);
  const lapTimeSeries = useMemo(() => buildLapTimeSeries(laps, pits, drivers, selectedDrivers, driverStyles), [laps, pits, drivers, selectedDrivers, driverStyles]);
  const positionSeries = useMemo(() => buildPositionSeries(laps, positions, drivers, selectedDrivers, driverStyles), [laps, positions, drivers, selectedDrivers, driverStyles]);
  const runningGapData = useMemo(() => mergeSeries(runningGapSeries), [runningGapSeries]);
  const lapTimeData = useMemo(() => mergeSeries(lapTimeSeries), [lapTimeSeries]);
  const positionData = useMemo(() => mergeSeries(positionSeries), [positionSeries]);
  const positionMaximum = useMemo(
    () => Math.max(1, drivers.length, ...positions.map((position) => position.position)),
    [drivers.length, positions],
  );
  const totalLaps = laps.length ? Math.max(...laps.map((lap) => lap.lap_number)) : 0;
  const timelineTicks = useMemo(() => {
    if (!totalLaps) return [];
    const interval = totalLaps <= 30 ? 5 : 10;
    const ticks = [1];
    for (let lap = interval; lap < totalLaps; lap += interval) ticks.push(lap);
    if (ticks.at(-1) !== totalLaps) ticks.push(totalLaps);
    return ticks;
  }, [totalLaps]);
  const fastestSelectedLap = getBestLapFormatted(filteredLaps.filter((lap) => !lap.is_pit_out_lap));

  if (resolution.status === "loading") return <PageLoading message="Resolving race session…" />;
  if (resolution.status !== "completed") {
    return <div className="space-y-5 p-4 md:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-3xl tracking-tight text-foreground">Race</h1><p className="mt-2 text-muted-foreground">Compare race pace, tyre life, pit timing, and track position.</p></div><SessionVariantToggle value={variant} onChange={(value) => setSessionMode("raceStrategy", value)} supportsSprint={resolution.supportsSprint} mainLabel="Race" sprintLabel="Sprint" ariaLabel="Race strategy session" /></header>
      <SessionAvailability session={selectedSession} status={resolution.status} title="Race session unavailable" />
    </div>;
  }
  const requiredErrors = [driversState.error, lapsState.error, resultsState.error].filter((error): error is string => Boolean(error));
  if (requiredErrors.length > 0) {
    return <div className="space-y-6 p-4 md:p-6">
      <header><h1 className="text-3xl tracking-tight text-foreground">Race</h1><p className="mt-2 text-muted-foreground">{selectedSession?.session_name} · Race strategy analysis.</p></header>
      <ErrorState title="Required race data could not be loaded" message={requiredErrors.join("; ")} onRetry={() => {
        if (driversState.error) driversState.refetch();
        if (lapsState.error) lapsState.refetch();
        if (resultsState.error) resultsState.refetch();
      }} />
    </div>;
  }
  if (requiredLoading || !selection.ready) return <PageLoading message="Loading race drivers, laps, and results…" />;
  if (drivers.length === 0 || laps.length === 0 || results.length === 0) {
    return <div className="space-y-6 p-4 md:p-6">
      <header><h1 className="text-3xl tracking-tight text-foreground">Race</h1><p className="mt-2 text-muted-foreground">{selectedSession?.session_name}</p></header>
      <EmptyState title="No completed race analysis data" message="OpenF1 returned no drivers, completed laps, or final classification for this session." />
    </div>;
  }

  const optionalWarnings = [
    stintsState.error ? `Tyre stints: ${stintsState.error}` : null,
    pitsState.error ? `Pit stops: ${pitsState.error}` : null,
    positionsState.error ? `Position history: ${positionsState.error}` : null,
    intervalsState.error ? `Running gaps: ${intervalsState.error}` : null,
  ].filter((message): message is string => Boolean(message));

  return <div className="p-4 md:p-6 space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-3xl tracking-tight text-foreground">Race</h1><p className="mt-2 text-muted-foreground">{selectedSession?.session_name} · Compare race pace, tyre life, pit timing, and track position.</p></div><SessionVariantToggle value={variant} onChange={(value) => setSessionMode("raceStrategy", value)} supportsSprint={resolution.supportsSprint} mainLabel="Race" sprintLabel="Sprint" ariaLabel="Race strategy session" /></header>

    <DriverSelectionCard selection={selection} description="The selection applies to every chart and table below." />

    {optionalLoading ? <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground" role="status"><LoadingSpinner compact />Loading supplemental strategy data…</div> : null}
    <PartialDataNotice title="Race analysis is available with partial data" messages={optionalWarnings} />

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Metric icon={<Users />} label="Selected drivers" value={`${selectedDrivers.length}`} />
      <Metric icon={<Clock3 />} label="Pit stops" value={`${filteredPits.length}`} />
      <Metric icon={<Gauge />} label="Fastest clean lap" value={fastestSelectedLap} mono />
    </div>

    {!selectedDrivers.length ? <div className="bg-card border border-dashed border-border rounded-lg py-20 px-6 text-center"><Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" /><h2 className="text-lg text-card-foreground">Select drivers to compare</h2><p className="text-sm text-muted-foreground mt-1">Use the driver picker above or restore the top five finishers.</p><Button className="mt-5" onClick={() => selection.setSelectedDrivers(defaults)}>Show top 5</Button></div> : <>
      <ChartCard title="Lap-time distribution" description="The width shows where each driver’s cleaned lap times are concentrated; the white marker is the median.">
        <LapTimeViolinChart series={lapTimeSeries} />
      </ChartCard>

      <ChartCard title="Tyre strategy" description="Every stint is aligned to the same race-lap axis; vertical markers indicate pit stops.">
        {stintsLoading ? <PanelLoading message="Loading tyre stints…" /> : !stintTimeline.length ? <ChartEmpty>No stint data is available for the selected drivers.</ChartEmpty> : <div className="min-w-0 space-y-3">
          {stintTimeline.map((row) => <div key={row.driverNumber} className="flex items-center gap-3">
            <div className="w-20 shrink-0 text-sm font-semibold text-right" style={{ color: row.color }}>{drivers.find((driver) => driver.driver_number === row.driverNumber)?.name_acronym ?? row.driverName}</div>
            <div className="relative h-9 flex-1 bg-secondary/70 rounded overflow-hidden">
              {row.stints.map((stint, index) => <div key={`${stint.lapStart}-${index}`} className="absolute top-0 h-full flex items-center justify-center text-xs font-bold border-x border-black/20" style={{ left: `${((stint.lapStart - 1) / Math.max(totalLaps, 1)) * 100}%`, width: `${((stint.lapEnd - stint.lapStart + 1) / Math.max(totalLaps, 1)) * 100}%`, backgroundColor: stint.compoundColor, color: stint.textColor }} title={`${stint.compound}: laps ${stint.lapStart}–${stint.lapEnd}`}><span className="truncate px-1">{stint.compound.charAt(0)}</span></div>)}
              {row.pitMarkers.map((lap) => <span key={lap} className="absolute top-0 h-full w-px bg-white/80 z-10" style={{ left: `${((lap - 1) / Math.max(totalLaps, 1)) * 100}%` }} title={`Pit stop: lap ${lap}`} />)}
            </div>
          </div>)}
          <div className="flex items-start gap-3"><div className="w-20 shrink-0" /><div className="relative h-5 flex-1 border-t border-border">{timelineTicks.map((lap) => <span key={lap} className="absolute top-1 -translate-x-1/2 text-[10px] text-muted-foreground" style={{ left: `${((lap - 1) / Math.max(totalLaps - 1, 1)) * 100}%` }}>{lap}</span>)}</div></div>
          <div className="flex flex-wrap gap-3 pl-[5.75rem] pt-1">{(Object.keys(TIRE_COLORS) as TireCompound[]).filter((compound) => filteredStints.some((stint) => (stint.compound ?? "UNKNOWN") === compound)).map((compound) => <span key={compound} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><span className="w-2.5 h-2.5 rounded-full border border-white/20" style={{ backgroundColor: TIRE_COLORS[compound] }} />{compound}</span>)}</div>
        </div>}
      </ChartCard>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <StrategyLineChart title="Running gap to race winner" description="Timestamped OpenF1 gap normalized to the official race winner, sampled at the latest available interval in each race lap. Missing or lapped samples are interpolated from surrounding laps." data={runningGapData} series={runningGapSeries} yLabel="Gap to winner (s)" yFormatter={(value) => `${value > 0 ? "+" : ""}${value.toFixed(0)}s`} tooltipFormatter={(value) => `${value > 0 ? "+" : ""}${value.toFixed(3)}s`} empty="Running gap data is unavailable for the selected drivers." zeroLine hoveredLap={hoveredLap} onHover={setHoveredLap} />
        <StrategyLineChart title="Position progression" description="End-of-lap running position, with P1 at the top of the chart." data={positionData} series={positionSeries} yFormatter={(value) => `P${value}`} tooltipFormatter={(value) => `P${value}`} empty="Position history is unavailable for the selected drivers." reversed position positionMaximum={positionMaximum} hoveredLap={hoveredLap} onHover={setHoveredLap} />
      </div>

      <StrategyLineChart title="Lap times" description="Completed non-pit laps for each selected driver; abnormally slow laps are excluded." data={lapTimeData} series={lapTimeSeries} yLabel="Lap time" yFormatter={formatLapTime} tooltipFormatter={formatLapTime} empty="Lap-time data is unavailable for the selected drivers." fullWidth hoveredLap={hoveredLap} onHover={setHoveredLap} />

      <section className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="p-4 md:p-6 border-b border-border"><h2 className="text-lg text-card-foreground">Pit-stop summary</h2><p className="text-sm text-muted-foreground mt-1">Pit-lane transit and stationary time are reported separately when available. Lane duration is shown exactly as OpenF1 reports it and can include red-flag or pit-lane holds.</p></div>
        {pitsLoading ? <div className="p-4"><PanelLoading message="Loading pit stops…" /></div> : !pitStops.length ? <p className="text-muted-foreground text-sm p-6">No pit-stop data is available for the selected drivers.</p> : <div className="overflow-x-auto"><table className="w-full"><thead><tr className="bg-secondary border-b border-border">
          {['Driver', 'Lap', 'Pit lane', 'Stationary', 'New tyre'].map((heading) => <th key={heading} className="px-4 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">{heading}</th>)}
        </tr></thead><tbody className="divide-y divide-border">{pitStops.map((stop, index) => <tr key={`${stop.driverNumber}-${stop.lap}-${index}`} className="hover:bg-secondary/50 transition-colors">
          <td className="px-4 py-3 text-card-foreground"><span className="inline-flex items-center gap-2"><span className="w-1 h-4 rounded-full" style={{ backgroundColor: toHexColor(drivers.find((driver) => driver.driver_number === stop.driverNumber)?.team_colour) }} />{stop.driver}</span></td>
          <td className="px-4 py-3 text-muted-foreground">Lap {stop.lap}</td><td className="px-4 py-3 text-card-foreground font-mono">{stop.laneDuration}</td><td className="px-4 py-3 text-card-foreground font-mono">{stop.stopDuration}</td>
          <td className="px-4 py-3"><span className="inline-flex items-center gap-2 text-muted-foreground"><span className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: stop.compoundColor }} />{stop.compound}</span></td>
        </tr>)}</tbody></table></div>}
      </section>
    </>}
  </div>;
}

function Metric({ icon, label, value, mono = false }: { icon: ReactNode; label: string; value: string; mono?: boolean }) {
  return <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-3"><span className="text-primary [&>svg]:w-5 [&>svg]:h-5">{icon}</span><div><p className="text-xs text-muted-foreground">{label}</p><p className={`text-xl font-bold ${mono ? "font-mono" : ""}`}>{value}</p></div></div>;
}

interface StrategyLineChartProps {
  title: string; description: string; data: WideChartPoint[]; series: StrategyLineSeries[];
  yFormatter: (value: number) => string; tooltipFormatter: (value: number) => string; empty: string;
  xLabel?: string; yLabel?: string; zeroLine?: boolean; reversed?: boolean; position?: boolean; fullWidth?: boolean;
  positionMaximum?: number; hoveredLap: number | null; onHover: (lap: number | null) => void;
}

function StrategyLineChart({ title, description, data, series, yFormatter, tooltipFormatter, empty, xLabel = "Race lap", yLabel, zeroLine, reversed, position, fullWidth, positionMaximum = 1, hoveredLap, onHover }: StrategyLineChartProps) {
  const hoveredPoint = useMemo(() => {
    if (hoveredLap === null || data.length === 0) return null;
    return data.reduce((nearest, point) => Math.abs(point.lap - hoveredLap) < Math.abs(nearest.lap - hoveredLap) ? point : nearest);
  }, [data, hoveredLap]);
  const xDomain = useMemo<readonly [number, number]>(() => {
    const minimum = xLabel === "Race lap" ? 1 : data[0]?.lap ?? 0;
    const maximum = data.at(-1)?.lap ?? minimum + 1;
    return [minimum, Math.max(maximum, minimum + 1)];
  }, [data, xLabel]);
  const yAxisWidth = position ? 38 : 58;
  const handleMouseMove = (state: { activeLabel?: string | number; activePayload?: Array<{ payload?: WideChartPoint }> }) => {
    const point = state.activePayload?.[0]?.payload;
    const activeLap = typeof point?.lap === "number" ? point.lap : Number(state.activeLabel);
    if (Number.isFinite(activeLap)) onHover(activeLap);
  };

  return <ChartCard title={title} description={description}>{!data.length ? <ChartEmpty>{empty}</ChartEmpty> : <div className="relative">
    <DriverSeriesLegend series={series} className="mb-3" />
    <ResponsiveContainer width="100%" height={fullWidth ? 380 : 340}>
      <LineChart data={data} margin={CHART_MARGIN} onMouseMove={handleMouseMove} onMouseLeave={() => onHover(null)}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
        <XAxis dataKey="lap" type="number" domain={xLabel === "Race lap" ? [1, "dataMax"] : ["dataMin", "dataMax"]} allowDecimals={false} stroke={CHART_TEXT} tick={{ fill: CHART_TEXT, fontSize: 11 }} label={{ value: xLabel, position: "insideBottom", offset: -8, fill: CHART_TEXT }} />
        <YAxis reversed={reversed} domain={position ? [1, positionMaximum] : ["auto", "auto"]} allowDecimals={!position} stroke={CHART_TEXT} tick={{ fill: CHART_TEXT, fontSize: 11 }} tickFormatter={yFormatter} label={yLabel ? { value: yLabel, angle: -90, position: "insideLeft", fill: CHART_TEXT } : undefined} width={yAxisWidth} />
        {zeroLine && <ReferenceLine y={0} stroke="#f5f5f5" strokeOpacity={0.5} />}
        {hoveredLap !== null && <ReferenceLine x={hoveredLap} stroke="#f5f5f5" strokeDasharray="4 4" strokeOpacity={0.7} />}
        {series.map((line) => (
          <Line
            key={line.key}
            type={position ? "stepAfter" : "linear"}
            dataKey={line.key}
            name={line.name}
            stroke={line.color}
            strokeDasharray={line.lineStyle === "dashed" ? DRIVER_DASH_PATTERN : undefined}
            isAnimationActive={false}
            strokeWidth={2}
            dot={false}
            connectNulls={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
    {hoveredPoint && hoveredLap !== null && (
      <DriverChartTooltip
        title={title}
        subtitle={`${xLabel === "Race lap" ? "Lap" : "Tyre age"} ${hoveredLap}`}
        xValue={hoveredLap}
        xDomain={xDomain}
        data={hoveredPoint}
        series={series}
        formatValue={tooltipFormatter}
        chartMargin={CHART_MARGIN}
        yAxisWidth={yAxisWidth}
      />
    )}
  </div>}</ChartCard>;
}
