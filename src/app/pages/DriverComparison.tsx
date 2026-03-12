import { useMemo, useState } from "react";
import { TelemetryChart } from "../components/charts/TelemetryChart";
import { LapTimeChart } from "../components/charts/LapTimeChart";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { useCarDataForDriver, useDriversData, useLapsData } from "../hooks/useSessionData";
import { useSelectedSessionKey } from "../context/F1DataContext";
import { buildCarTelemetry, buildLapTimeChartData, formatLapTime, toHexColor } from "../utils/transformers";
import { ArrowLeftRight, TrendingUp } from "lucide-react";

function NoSessionBanner() {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center space-y-3 bg-card border border-border rounded-lg p-8">
      <TrendingUp className="w-10 h-10 text-muted-foreground opacity-50" />
      <p className="text-lg text-muted-foreground">No session selected</p>
      <p className="text-sm text-muted-foreground">
        Use the selectors above to choose a season, race weekend, and session.
      </p>
    </div>
  );
}

export function DriverComparison() {
  const sessionKey = useSelectedSessionKey();
  const { data: drivers, loading: driversLoading } = useDriversData();
  const { data: laps, loading: lapsLoading } = useLapsData();

  const [driverANum, setDriverANum] = useState<number | null>(null);
  const [driverBNum, setDriverBNum] = useState<number | null>(null);

  // Default to first two drivers once the list loads
  const effectiveA = driverANum ?? (drivers.length > 0 ? drivers[0].driver_number : null);
  const effectiveB = driverBNum ?? (drivers.length > 1 ? drivers[1].driver_number : null);

  const driverA = drivers.find((d) => d.driver_number === effectiveA) ?? null;
  const driverB = drivers.find((d) => d.driver_number === effectiveB) ?? null;

  const colorA = toHexColor(driverA?.team_colour);
  const colorB = toHexColor(driverB?.team_colour);

  // Car data for each driver
  const { data: carDataA, loading: carALoading } = useCarDataForDriver(effectiveA);
  const { data: carDataB, loading: carBLoading } = useCarDataForDriver(effectiveB);

  const telA = useMemo(() => buildCarTelemetry(carDataA), [carDataA]);
  const telB = useMemo(() => buildCarTelemetry(carDataB), [carDataB]);

  // Sample both to same length
  const sampleCount = 400;
  const sampleTel = (data: ReturnType<typeof buildCarTelemetry>) => {
    if (data.length === 0) return [];
    const step = Math.max(1, Math.ceil(data.length / sampleCount));
    return data.filter((_, i) => i % step === 0);
  };
  const sampledA = useMemo(() => sampleTel(telA), [telA]);
  const sampledB = useMemo(() => sampleTel(telB), [telB]);

  // Merge for combined comparison charts (use shorter length)
  const len = Math.min(sampledA.length, sampledB.length);
  const speedComparison = useMemo(
    () =>
      Array.from({ length: len }, (_, i) => ({
        distance: i * 10,
        speedA: sampledA[i]?.speed ?? 0,
        speedB: sampledB[i]?.speed ?? 0,
      })),
    [sampledA, sampledB, len]
  );
  const throttleComparison = useMemo(
    () =>
      Array.from({ length: len }, (_, i) => ({
        distance: i * 10,
        throttleA: sampledA[i]?.throttle ?? 0,
        throttleB: sampledB[i]?.throttle ?? 0,
      })),
    [sampledA, sampledB, len]
  );

  // Lap time chart for both drivers
  const driverNums = useMemo(
    () => [effectiveA, effectiveB].filter((n): n is number => n !== null),
    [effectiveA, effectiveB]
  );
  const lapChartData = useMemo(
    () => buildLapTimeChartData(laps, drivers, driverNums),
    [laps, drivers, driverNums]
  );
  const lapChartLines = useMemo(
    () =>
      [driverA, driverB]
        .filter((d) => d !== null)
        .map((d) => ({
          key: d!.name_acronym.toLowerCase(),
          color: toHexColor(d!.team_colour),
          name: d!.full_name,
        })),
    [driverA, driverB]
  );

  // Best lap per driver
  const bestLapA = useMemo(() => {
    const valid = laps
      .filter((l) => l.driver_number === effectiveA && l.lap_duration !== null && l.lap_duration > 0)
      .map((l) => l.lap_duration!);
    return valid.length > 0 ? formatLapTime(Math.min(...valid)) : "—";
  }, [laps, effectiveA]);

  const bestLapB = useMemo(() => {
    const valid = laps
      .filter((l) => l.driver_number === effectiveB && l.lap_duration !== null && l.lap_duration > 0)
      .map((l) => l.lap_duration!);
    return valid.length > 0 ? formatLapTime(Math.min(...valid)) : "—";
  }, [laps, effectiveB]);

  // Sector comparison from best laps
  const bestLapDataA = useMemo(() => {
    const valid = laps.filter(
      (l) => l.driver_number === effectiveA && l.lap_duration !== null && l.lap_duration > 0
    );
    return valid.sort((a, b) => a.lap_duration! - b.lap_duration!)[0] ?? null;
  }, [laps, effectiveA]);

  const bestLapDataB = useMemo(() => {
    const valid = laps.filter(
      (l) => l.driver_number === effectiveB && l.lap_duration !== null && l.lap_duration > 0
    );
    return valid.sort((a, b) => a.lap_duration! - b.lap_duration!)[0] ?? null;
  }, [laps, effectiveB]);

  const sectorDiffs = [1, 2, 3].map((sectorNum) => {
    const keyA = `duration_sector_${sectorNum}` as keyof typeof bestLapDataA;
    const keyB = `duration_sector_${sectorNum}` as keyof typeof bestLapDataB;
    const timeA = bestLapDataA ? (bestLapDataA[keyA] as number | null) : null;
    const timeB = bestLapDataB ? (bestLapDataB[keyB] as number | null) : null;
    const diff = timeA !== null && timeB !== null ? timeA - timeB : null;
    return { sector: sectorNum, timeA, timeB, diff };
  });

  const isLoading = driversLoading || lapsLoading;
  const carLoading = carALoading || carBLoading;

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl tracking-tight text-foreground mb-2">Driver Comparison</h1>
        <p className="text-muted-foreground">Compare two drivers across a session</p>
      </div>

      {!sessionKey ? (
        <NoSessionBanner />
      ) : isLoading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      ) : (
        <>
          {/* Driver Selectors */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm text-muted-foreground mb-2">Driver A</label>
              <select
                value={effectiveA ?? ""}
                onChange={(e) => setDriverANum(Number(e.target.value))}
                className="w-full bg-input text-foreground px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {drivers.map((d) => (
                  <option key={d.driver_number} value={d.driver_number}>
                    {d.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <ArrowLeftRight className="w-6 h-6 text-primary" />
              </div>
            </div>

            <div>
              <label className="block text-sm text-muted-foreground mb-2">Driver B</label>
              <select
                value={effectiveB ?? ""}
                onChange={(e) => setDriverBNum(Number(e.target.value))}
                className="w-full bg-input text-foreground px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {drivers.map((d) => (
                  <option key={d.driver_number} value={d.driver_number}>
                    {d.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Driver Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[{ driver: driverA, bestLap: bestLapA, color: colorA }, { driver: driverB, bestLap: bestLapB, color: colorB }].map(
              ({ driver, bestLap, color }, idx) =>
                driver ? (
                  <div key={idx} className="bg-card border border-border rounded-lg p-6">
                    <div className="flex items-center gap-4">
                      <div
                        className="w-20 h-20 rounded-lg flex items-center justify-center text-3xl font-bold"
                        style={{ backgroundColor: color + "20", color }}
                      >
                        {driver.name_acronym}
                      </div>
                      <div>
                        <h3 className="text-xl text-card-foreground mb-1">{driver.full_name}</h3>
                        <p className="text-sm text-muted-foreground">{driver.team_name}</p>
                        <p className="text-xs text-muted-foreground mt-1">#{driver.driver_number}</p>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Best Lap</span>
                        <span className="text-lg font-mono text-card-foreground">{bestLap}</span>
                      </div>
                    </div>
                  </div>
                ) : null
            )}
          </div>

          {/* Lap Times Comparison */}
          {lapChartData.length > 0 && lapChartLines.length >= 2 ? (
            <LapTimeChart data={lapChartData} lines={lapChartLines} height={250} />
          ) : null}

          {/* Telemetry comparison */}
          {carLoading ? (
            <div className="flex items-center justify-center h-32">
              <LoadingSpinner />
            </div>
          ) : speedComparison.length > 0 ? (
            <>
              <TelemetryChart
                data={speedComparison}
                dataKeys={[
                  { key: "speedA", color: colorA, name: driverA?.full_name ?? "Driver A" },
                  { key: "speedB", color: colorB, name: driverB?.full_name ?? "Driver B" },
                ]}
                xKey="distance"
                title="Speed Comparison (session sample)"
                yAxisLabel="Speed (km/h)"
                xLabel="Sample"
                height={250}
              />

              <TelemetryChart
                data={throttleComparison}
                dataKeys={[
                  { key: "throttleA", color: colorA, name: driverA?.full_name ?? "Driver A" },
                  { key: "throttleB", color: colorB, name: driverB?.full_name ?? "Driver B" },
                ]}
                xKey="distance"
                title="Throttle Application Comparison (session sample)"
                yAxisLabel="Throttle %"
                xLabel="Sample"
                height={250}
              />
            </>
          ) : null}

          {/* Sector Comparison */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="mb-4 text-card-foreground">Best Lap — Sector Comparison</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {sectorDiffs.map(({ sector, timeA, timeB, diff }) => (
                <div key={sector} className="bg-secondary rounded-lg p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-2">Sector {sector}</p>
                  <div className="flex justify-between text-xs text-muted-foreground mb-2">
                    <span style={{ color: colorA }}>{timeA != null ? `${timeA.toFixed(3)}s` : "—"}</span>
                    <span style={{ color: colorB }}>{timeB != null ? `${timeB.toFixed(3)}s` : "—"}</span>
                  </div>
                  {diff !== null ? (
                    <p className={`text-lg font-mono font-bold ${diff < 0 ? "text-green-500" : diff > 0 ? "text-red-500" : "text-muted-foreground"}`}>
                      {diff > 0 ? "+" : ""}
                      {diff.toFixed(3)}s
                    </p>
                  ) : (
                    <p className="text-lg font-mono text-muted-foreground">—</p>
                  )}
                  {diff !== null && diff !== 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {diff < 0 ? driverA?.name_acronym : driverB?.name_acronym} faster
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}