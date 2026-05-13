import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  Cell,
} from "recharts";
import { Flag, Clock, TrendingDown } from "lucide-react";
import { useDriversData, useLapsData, usePitsData, useStintsData } from "../hooks/useSessionData";
import { useSelectedSessionKey } from "../context/F1DataContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  buildPaceData,
  buildPitStops,
  buildStintTimeline,
  getBestLapFormatted,
} from "../utils/transformers";
import { LoadingSpinner } from "../components/LoadingSpinner";

export function RaceStrategy() {
  const sessionKey = useSelectedSessionKey();
  const { data: drivers, loading: driversLoading } = useDriversData();
  const { data: laps, loading: lapsLoading } = useLapsData();
  const { data: stints, loading: stintsLoading } = useStintsData();
  const { data: pits, loading: pitsLoading } = usePitsData();

  const loading = driversLoading || lapsLoading || stintsLoading || pitsLoading;

  const stintTimeline = useMemo(() => buildStintTimeline(stints, drivers), [stints, drivers]);
  const pitStops = useMemo(() => buildPitStops(pits, drivers, stints), [pits, drivers, stints]);
  const paceData = useMemo(() => buildPaceData(laps, stints, drivers), [laps, stints, drivers]);
  const paceDataByCompound = useMemo(
    () => ({
      SOFT: paceData.filter((entry) => entry.compound === "SOFT"),
      MEDIUM: paceData.filter((entry) => entry.compound === "MEDIUM"),
      HARD: paceData.filter((entry) => entry.compound === "HARD"),
    }),
    [paceData]
  );

  // Per-driver lap scatter data: top 5 drivers by number of laps
  const lapScatterSeries = useMemo(() => {
    const driverMap = new Map(drivers.map((d) => [d.driver_number, d]));
    const grouped = new Map<number, { lap: number; time: number }[]>();
    for (const lap of laps) {
      if (lap.lap_duration === null || lap.is_pit_out_lap) continue;
      const list = grouped.get(lap.driver_number) ?? [];
      list.push({ lap: lap.lap_number, time: lap.lap_duration });
      grouped.set(lap.driver_number, list);
    }
    return [...grouped.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 5)
      .map(([num, data]) => {
        const d = driverMap.get(num);
        return {
          name: d?.name_acronym ?? `#${num}`,
          color: d?.team_colour ? `#${d.team_colour}` : "#888888",
          data,
        };
      });
  }, [laps, drivers]);

  // Stats
  const totalLaps = laps.length > 0 ? Math.max(...laps.map((l) => l.lap_number)) : 0;
  const avgPitDuration =
    pits.length > 0
      ? (
          pits
            .filter((p) => p.pit_duration != null)
            .reduce((sum, p) => sum + (p.pit_duration ?? 0), 0) /
          pits.filter((p) => p.pit_duration != null).length
        ).toFixed(2) + "s"
      : "—";
  const fastestLap = getBestLapFormatted(laps);

  if (!sessionKey) {
    return (
      <div className="p-4 sm:p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Flag className="w-12 h-12 text-muted-foreground mb-4" />
        <h2 className="text-xl text-foreground mb-2">No Session Selected</h2>
        <p className="text-muted-foreground">Select a season, event, and session from the sidebar to view race strategy.</p>
      </div>
    );
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl tracking-tight text-foreground mb-1 sm:mb-2">Race Strategy</h1>
        <p className="text-muted-foreground">Analyze race pace and tire strategy</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Flag className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-card-foreground">Total Laps</h3>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-card-foreground">{totalLaps || "—"}</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-card-foreground">Avg Pit Stop</h3>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-card-foreground font-mono">{avgPitDuration}</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-card-foreground">Fastest Lap</h3>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-card-foreground font-mono">{fastestLap}</p>
        </div>
      </div>

      {/* Stint Timeline Visualization */}
      <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
        <h3 className="mb-6 text-card-foreground">Stint Timeline Visualization</h3>
        {stintTimeline.length === 0 ? (
          <p className="text-muted-foreground text-sm">No stint data available for this session.</p>
        ) : (
          <div className="space-y-4">
            {stintTimeline.map((row) => (
              <div key={row.driverNumber}>
                <p className="text-sm text-muted-foreground mb-2" style={{ color: row.color }}>
                  {row.driverName}
                </p>
                <div className="overflow-x-auto">
                  <div className="min-w-[520px]">
                    <div className="flex gap-1 h-12">
                      {row.stints.map((s, i) => (
                        <div
                          key={i}
                          className="rounded flex items-center justify-center text-xs font-semibold overflow-hidden"
                          style={{
                            width: `${s.widthPct}%`,
                            backgroundColor: s.compoundColor,
                            color: s.textColor,
                            minWidth: "2rem",
                          }}
                          title={`${s.compound} — Laps ${s.lapStart}–${s.lapEnd}`}
                        >
                          {s.compound.charAt(0)}
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Lap 1</span>
                      {row.stints.map((s, i) => (
                        <span key={i}>Lap {s.lapEnd}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lap Times per Stint */}
      <div className="bg-card border border-border rounded-lg p-3 sm:p-4">
        <h3 className="mb-4 text-card-foreground">Lap Times Throughout Race</h3>
        {lapScatterSeries.length === 0 ? (
          <p className="text-muted-foreground text-sm">No lap data available.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a36" />
              <XAxis
                dataKey="lap"
                type="number"
                stroke="#9ca3af"
                tick={{ fill: "#9ca3af", fontSize: 10 }}
                label={{ value: "Lap", position: "insideBottom", offset: -5, fill: "#9ca3af" }}
              />
              <YAxis
                dataKey="time"
                stroke="#9ca3af"
                tick={{ fill: "#9ca3af", fontSize: 10 }}
                label={{ value: "Lap Time (s)", angle: -90, position: "insideLeft", fill: "#9ca3af" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#15151c",
                  border: "1px solid #2a2a36",
                  borderRadius: "0.375rem",
                  color: "#f5f5f5",
                }}
                labelStyle={{ color: "#9ca3af" }}
                formatter={(value: number) => [value.toFixed(3) + "s", "Lap time"]}
              />
              {lapScatterSeries.map((series) => (
                <Scatter key={series.name} name={series.name} data={series.data} fill={series.color} />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Average Pace Comparison */}
      <div className="bg-card border border-border rounded-lg p-3 sm:p-4">
        <h3 className="mb-4 text-card-foreground">Average Pace by Stint</h3>
        {paceData.length === 0 ? (
          <p className="text-muted-foreground text-sm">No pace data available.</p>
        ) : (
          <Tabs defaultValue="SOFT" className="w-full">
            <TabsList className="mb-4 w-full flex-wrap h-auto gap-2">
              <TabsTrigger value="SOFT">Soft</TabsTrigger>
              <TabsTrigger value="MEDIUM">Medium</TabsTrigger>
              <TabsTrigger value="HARD">Hard</TabsTrigger>
            </TabsList>

            {(["SOFT", "MEDIUM", "HARD"] as const).map((compound) => {
              const compoundData = paceDataByCompound[compound];
              return (
                <TabsContent key={compound} value={compound}>
                  {compoundData.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No {compound.toLowerCase()} compound pace data available.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={compoundData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a36" />
                        <XAxis
                          dataKey="stint"
                          stroke="#9ca3af"
                          tick={{ fill: "#9ca3af", fontSize: 9 }}
                          interval={0}
                          angle={-25}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis
                          stroke="#9ca3af"
                          tick={{ fill: "#9ca3af", fontSize: 10 }}
                          label={{ value: "Avg Lap Time (s)", angle: -90, position: "insideLeft", fill: "#9ca3af" }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#15151c",
                            border: "1px solid #2a2a36",
                            borderRadius: "0.375rem",
                            color: "#f5f5f5",
                          }}
                          labelStyle={{ color: "#9ca3af" }}
                          formatter={(value: number) => [value.toFixed(3) + "s", "Avg pace"]}
                        />
                        <Bar dataKey="avgPace" radius={[4, 4, 0, 0]}>
                          {compoundData.map((entry) => (
                            <Cell key={`cell-${compound}-${entry.stint}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        )}
      </div>

      {/* Pit Stop Summary */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="text-card-foreground">Pit Stop Summary</h3>
        </div>
        {pitStops.length === 0 ? (
          <p className="text-muted-foreground text-sm p-4">No pit stop data available.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px]">
              <thead>
                <tr className="bg-secondary border-b border-border">
                  <th className="px-4 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">Driver</th>
                  <th className="px-4 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">Lap</th>
                  <th className="px-4 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">Duration</th>
                  <th className="px-4 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">Compound</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pitStops.map((stop, idx) => (
                  <tr key={idx} className="hover:bg-secondary/50 transition-colors">
                    <td className="px-4 py-3 text-card-foreground">{stop.driver}</td>
                    <td className="px-4 py-3 text-muted-foreground">Lap {stop.lap}</td>
                    <td className="px-4 py-3 text-card-foreground font-mono">{stop.duration}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: stop.compoundColor }}
                        />
                        <span className="text-muted-foreground">{stop.compound}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
