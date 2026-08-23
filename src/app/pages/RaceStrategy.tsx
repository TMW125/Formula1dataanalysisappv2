import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Check, ChevronsUpDown, Clock3, Flag, Gauge, Search, Users, X } from "lucide-react";
import {
  useDriversData, useLapsData, usePitsData, usePositionsData,
  useSessionResultsData, useStintsData,
} from "../hooks/useSessionData";
import { useSelectedSessionKey } from "../context/F1DataContext";
import {
  buildCumulativeDeltaSeries, buildDefaultDriverSelection, buildLapTimeSeries,
  buildPitStops, buildPositionSeries, buildStintTimeline, formatLapTime, getBestLapFormatted,
  toHexColor, type StrategyLineSeries,
} from "../utils/transformers";
import { TIRE_COLORS, type TireCompound } from "../types/ui";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { LapTimeViolinChart } from "../components/charts/LapTimeViolinChart";
import { Badge } from "../components/ui/badge";
import { Button, buttonVariants } from "../components/ui/button";
import { Checkbox } from "../components/ui/checkbox";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";

const CHART_GRID = "#2a2a36";
const CHART_TEXT = "#9ca3af";
const TOOLTIP_STYLE = { backgroundColor: "#15151c", border: "1px solid #2a2a36", borderRadius: "0.375rem", color: "#f5f5f5" };
type WideChartPoint = { lap: number } & Record<string, number>;

function mergeSeries(series: StrategyLineSeries[]): WideChartPoint[] {
  const rows = new Map<number, WideChartPoint>();
  for (const line of series) {
    for (const point of line.values) {
      const row = rows.get(point.lap) ?? { lap: point.lap };
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
  const sessionKey = useSelectedSessionKey();
  const { data: drivers, loading: driversLoading } = useDriversData();
  const { data: laps, loading: lapsLoading } = useLapsData();
  const { data: stints, loading: stintsLoading } = useStintsData();
  const { data: pits, loading: pitsLoading } = usePitsData();
  const { data: positions, loading: positionsLoading } = usePositionsData();
  const { data: results, loading: resultsLoading } = useSessionResultsData();
  const [selectedDrivers, setSelectedDrivers] = useState<number[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const initializedSession = useRef<number | null>(null);
  const loading = driversLoading || lapsLoading || stintsLoading || pitsLoading || positionsLoading || resultsLoading;

  useEffect(() => {
    if (sessionKey == null) {
      initializedSession.current = null;
      setSelectedDrivers([]);
      return;
    }
    if (initializedSession.current === sessionKey) return;
    setSelectedDrivers([]);
    const currentDrivers = drivers.filter((driver) => driver.session_key === sessionKey);
    if (loading || currentDrivers.length === 0) return;
    const currentResults = results.filter((result) => result.session_key === sessionKey);
    const currentLaps = laps.filter((lap) => lap.session_key === sessionKey);
    setSelectedDrivers(buildDefaultDriverSelection(currentDrivers, currentResults, currentLaps));
    initializedSession.current = sessionKey;
  }, [sessionKey, loading, drivers, results, laps]);

  const selectedSet = useMemo(() => new Set(selectedDrivers), [selectedDrivers]);
  const defaults = useMemo(() => buildDefaultDriverSelection(drivers, results, laps), [drivers, results, laps]);
  const resultPosition = useMemo(() => new Map(results.map((result) => [result.driver_number, result.position])), [results]);
  const orderedDrivers = useMemo(() => [...drivers].sort((a, b) => {
    const aPosition = resultPosition.get(a.driver_number) ?? Infinity;
    const bPosition = resultPosition.get(b.driver_number) ?? Infinity;
    return aPosition - bPosition || a.name_acronym.localeCompare(b.name_acronym);
  }), [drivers, resultPosition]);
  const selectedDriverData = useMemo(() => selectedDrivers.map((number) => drivers.find((driver) => driver.driver_number === number)).filter((driver) => driver != null), [selectedDrivers, drivers]);
  const filteredLaps = useMemo(() => laps.filter((lap) => selectedSet.has(lap.driver_number)), [laps, selectedSet]);
  const filteredStints = useMemo(() => stints.filter((stint) => selectedSet.has(stint.driver_number)), [stints, selectedSet]);
  const filteredPits = useMemo(() => pits.filter((pit) => selectedSet.has(pit.driver_number)), [pits, selectedSet]);
  const stintTimeline = useMemo(() => {
    const order = new Map(selectedDrivers.map((number, index) => [number, index]));
    return buildStintTimeline(filteredStints, drivers).sort((a, b) => (order.get(a.driverNumber) ?? 0) - (order.get(b.driverNumber) ?? 0));
  }, [filteredStints, drivers, selectedDrivers]);
  const pitStops = useMemo(() => buildPitStops(filteredPits, drivers, filteredStints), [filteredPits, drivers, filteredStints]);
  const cumulative = useMemo(() => buildCumulativeDeltaSeries(laps, drivers, selectedDrivers, results), [laps, drivers, selectedDrivers, results]);
  const lapTimeSeries = useMemo(() => buildLapTimeSeries(laps, pits, drivers, selectedDrivers), [laps, pits, drivers, selectedDrivers]);
  const positionSeries = useMemo(() => buildPositionSeries(laps, positions, drivers, selectedDrivers), [laps, positions, drivers, selectedDrivers]);
  const cumulativeData = useMemo(() => mergeSeries(cumulative.series), [cumulative.series]);
  const lapTimeData = useMemo(() => mergeSeries(lapTimeSeries), [lapTimeSeries]);
  const positionData = useMemo(() => mergeSeries(positionSeries), [positionSeries]);
  const totalLaps = laps.length ? Math.max(...laps.map((lap) => lap.lap_number)) : 0;
  const timelineTicks = useMemo(() => {
    if (!totalLaps) return [];
    const interval = totalLaps <= 30 ? 5 : 10;
    const ticks = [1];
    for (let lap = interval; lap < totalLaps; lap += interval) ticks.push(lap);
    if (ticks.at(-1) !== totalLaps) ticks.push(totalLaps);
    return ticks;
  }, [totalLaps]);
  const referenceName = drivers.find((driver) => driver.driver_number === cumulative.referenceDriverNumber)?.name_acronym;
  const fastestSelectedLap = getBestLapFormatted(filteredLaps.filter((lap) => !lap.is_pit_out_lap));

  const toggleDriver = (driverNumber: number) => setSelectedDrivers((current) => current.includes(driverNumber)
    ? current.filter((number) => number !== driverNumber)
    : [...current, driverNumber]);

  if (!sessionKey) return <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
    <Flag className="w-12 h-12 text-muted-foreground mb-4" /><h2 className="text-xl text-foreground mb-2">No Session Selected</h2>
    <p className="text-muted-foreground">Select a season, event, and session from the sidebar to view race strategy.</p>
  </div>;
  if (loading || initializedSession.current !== sessionKey) return <LoadingSpinner />;

  return <div className="p-4 md:p-6 space-y-6">
    <header><h1 className="text-3xl tracking-tight text-foreground mb-2">Race Strategy</h1><p className="text-muted-foreground">Compare race pace, tyre life, pit timing, and track position.</p></header>

    <section className="bg-card border border-border rounded-lg p-4 md:p-5 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div><h2 className="text-card-foreground flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Drivers</h2><p className="text-xs text-muted-foreground mt-1">The selection applies to every chart and table below.</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild><button type="button" className={buttonVariants({ variant: "outline", className: "min-w-52 justify-between" })} aria-expanded={pickerOpen}>
              <span className="inline-flex items-center gap-2"><Search className="w-4 h-4" />{selectedDrivers.length ? `${selectedDrivers.length} selected` : "Choose drivers"}</span><ChevronsUpDown className="w-4 h-4 text-muted-foreground" />
            </button></PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end"><Command><CommandInput placeholder="Search drivers or teams…" /><CommandList className="max-h-72"><CommandEmpty>No drivers found.</CommandEmpty><CommandGroup>
              {orderedDrivers.map((driver) => {
                const selected = selectedSet.has(driver.driver_number);
                return <CommandItem
                  key={driver.driver_number}
                  value={`${driver.full_name} ${driver.name_acronym} ${driver.team_name}`}
                  onSelect={() => toggleDriver(driver.driver_number)}
                  className="gap-3 data-[selected=true]:bg-secondary data-[selected=true]:text-foreground"
                >
                  <Checkbox checked={selected} aria-label={`Select ${driver.full_name}`} /><span className="w-1 h-7 rounded-full" style={{ backgroundColor: toHexColor(driver.team_colour) }} />
                  <span className="min-w-0 flex-1"><span className="block text-sm truncate">{driver.full_name}</span><span className="block text-xs text-muted-foreground truncate">{driver.team_name}</span></span>
                  {resultPosition.has(driver.driver_number) && <span className="text-xs font-mono text-muted-foreground">P{resultPosition.get(driver.driver_number)}</span>}{selected && <Check className="w-4 h-4 text-primary" />}
                </CommandItem>;
              })}
            </CommandGroup></CommandList></Command></PopoverContent>
          </Popover>
          <Button variant="secondary" size="sm" onClick={() => setSelectedDrivers(defaults)}>Top 5</Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedDrivers(orderedDrivers.map((driver) => driver.driver_number))}>Select all</Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedDrivers([])}>Clear</Button>
        </div>
      </div>
      {selectedDriverData.length ? <div className="flex flex-wrap gap-2">{selectedDriverData.map((driver) => <Badge key={driver.driver_number} variant="outline" className="gap-2 py-1 pl-2.5 pr-1">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: toHexColor(driver.team_colour) }} />{driver.name_acronym}
        <button type="button" onClick={() => toggleDriver(driver.driver_number)} className="rounded-sm p-0.5 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Remove ${driver.full_name}`}><X className="w-3 h-3" /></button>
      </Badge>)}</div> : <p className="text-sm text-muted-foreground">No drivers selected. Choose one or more drivers to populate the analysis.</p>}
    </section>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Metric icon={<Users />} label="Selected drivers" value={`${selectedDrivers.length}`} />
      <Metric icon={<Clock3 />} label="Pit stops" value={`${filteredPits.length}`} />
      <Metric icon={<Gauge />} label="Fastest clean lap" value={fastestSelectedLap} mono />
    </div>

    {!selectedDrivers.length ? <div className="bg-card border border-dashed border-border rounded-lg py-20 px-6 text-center"><Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" /><h2 className="text-lg text-card-foreground">Select drivers to compare</h2><p className="text-sm text-muted-foreground mt-1">Use the driver picker above or restore the top five finishers.</p><Button className="mt-5" onClick={() => setSelectedDrivers(defaults)}>Show top 5</Button></div> : <>
      <ChartCard title="Lap-time distribution" description="The width shows where each driver’s cleaned lap times are concentrated; the white marker is the median.">
        <LapTimeViolinChart series={lapTimeSeries} />
      </ChartCard>

      <ChartCard title="Tyre strategy" description="Every stint is aligned to the same race-lap axis; vertical markers indicate pit stops.">
        {!stintTimeline.length ? <ChartEmpty>No stint data is available for the selected drivers.</ChartEmpty> : <div className="min-w-0 space-y-3">
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
        <StrategyLineChart title="Cumulative race-time delta" description={`Time gained or lost through the race${referenceName ? ` relative to ${referenceName}` : ""}. Pit-loss laps are included.`} data={cumulativeData} series={cumulative.series} yLabel="Delta (s)" yFormatter={(value) => `${value > 0 ? "+" : ""}${value.toFixed(0)}s`} tooltipFormatter={(value) => `${value > 0 ? "+" : ""}${value.toFixed(3)}s`} empty="Comparable lap-time data is unavailable." zeroLine />
        <StrategyLineChart title="Position progression" description="End-of-lap running position, with P1 at the top of the chart." data={positionData} series={positionSeries} yFormatter={(value) => `P${value}`} tooltipFormatter={(value) => `P${value}`} empty="Position history is unavailable for the selected drivers." reversed position />
      </div>

      <StrategyLineChart title="Lap times" description="Completed non-pit laps for each selected driver; abnormally slow laps are excluded." data={lapTimeData} series={lapTimeSeries} yLabel="Lap time" yFormatter={formatLapTime} tooltipFormatter={formatLapTime} empty="Lap-time data is unavailable for the selected drivers." fullWidth />

      <section className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="p-4 md:p-6 border-b border-border"><h2 className="text-lg text-card-foreground">Pit-stop summary</h2><p className="text-sm text-muted-foreground mt-1">Pit-lane transit and stationary time are reported separately when available.</p></div>
        {!pitStops.length ? <p className="text-muted-foreground text-sm p-6">No pit-stop data is available for the selected drivers.</p> : <div className="overflow-x-auto"><table className="w-full"><thead><tr className="bg-secondary border-b border-border">
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
}

function StrategyLineChart({ title, description, data, series, yFormatter, tooltipFormatter, empty, xLabel = "Race lap", yLabel, zeroLine, reversed, position, fullWidth }: StrategyLineChartProps) {
  return <ChartCard title={title} description={description}>{!data.length ? <ChartEmpty>{empty}</ChartEmpty> : <ResponsiveContainer width="100%" height={fullWidth ? 380 : 340}>
    <LineChart data={data} margin={{ top: 8, right: 18, left: 8, bottom: 12 }}>
      <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
      <XAxis dataKey="lap" type="number" domain={xLabel === "Race lap" ? [1, "dataMax"] : ["dataMin", "dataMax"]} allowDecimals={false} stroke={CHART_TEXT} tick={{ fill: CHART_TEXT, fontSize: 11 }} label={{ value: xLabel, position: "insideBottom", offset: -8, fill: CHART_TEXT }} />
      <YAxis reversed={reversed} domain={position ? [1, 20] : ["auto", "auto"]} allowDecimals={!position} stroke={CHART_TEXT} tick={{ fill: CHART_TEXT, fontSize: 11 }} tickFormatter={yFormatter} label={yLabel ? { value: yLabel, angle: -90, position: "insideLeft", fill: CHART_TEXT } : undefined} width={position ? 38 : 58} />
      {zeroLine && <ReferenceLine y={0} stroke="#f5f5f5" strokeOpacity={0.5} />}
      <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={(value) => `${xLabel === "Race lap" ? "Lap" : "Tyre age"} ${value}`} formatter={(value: number, name: string) => [tooltipFormatter(value), name]} />
      <Legend wrapperStyle={{ paddingTop: 12 }} />
      {series.map((line) => {
        return <Line key={line.key} type={position ? "stepAfter" : "linear"} dataKey={line.key} name={line.name} stroke={line.color} strokeWidth={2} dot={false} connectNulls={false} />;
      })}
    </LineChart>
  </ResponsiveContainer>}</ChartCard>;
}
