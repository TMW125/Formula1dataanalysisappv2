import { useMemo, useState } from "react";
import { TelemetryChart } from "../components/charts/TelemetryChart";
import { LoadingSpinner } from "../components/LoadingSpinner";
import {
  useCarDataForDriver,
  useCurrentSession,
  useDriversData,
  useLapsData,
  useStintsData,
} from "../hooks/useSessionData";
import { useSelectedSessionKey } from "../context/F1DataContext";
import { buildCarTelemetry, capitalize, formatLapTime, toHexColor } from "../utils/transformers";
import { TIRE_COLORS } from "../types/ui";
import type { TireCompound } from "../types/ui";
import { Clock, TrendingUp } from "lucide-react";

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

export function DriverAnalysis() {
  const sessionKey = useSelectedSessionKey();
  const telemetrySyncId = "driver-analysis-telemetry";

  const { data: drivers, loading: driversLoading } = useDriversData();
  const { data: laps, loading: lapsLoading } = useLapsData();
  const { data: stints } = useStintsData();

  const sortedDrivers = useMemo(
    () =>
      [...drivers].sort(
        (a, b) => a.team_name.localeCompare(b.team_name) || a.full_name.localeCompare(b.full_name)
      ),
    [drivers]
  );

  // Selected driver state — default to first driver once loaded
  const [selectedDriverNumber, setSelectedDriverNumber] = useState<number | null>(null);

  // Resolve driver once list arrives
  const effectiveDriverNum =
    selectedDriverNumber ?? (sortedDrivers.length > 0 ? sortedDrivers[0].driver_number : null);

  const selectedDriver = drivers.find((d) => d.driver_number === effectiveDriverNum) ?? null;

  // Car data for the selected driver
  const { data: carData, loading: carDataLoading } = useCarDataForDriver(effectiveDriverNum);

  // Laps for the selected driver
  const driverLaps = useMemo(
    () =>
      laps
        .filter((l) => l.driver_number === effectiveDriverNum && l.lap_duration !== null)
        .sort((a, b) => a.lap_number - b.lap_number),
    [laps, effectiveDriverNum]
  );

  const [selectedLap, setSelectedLap] = useState<number>(1);
  const lapData = driverLaps.find((l) => l.lap_number === selectedLap) ?? driverLaps[0] ?? null;

  // Sector times from lap data
  const sectorTimes = lapData
    ? [
        { sector: 1, time: lapData.duration_sector_1?.toFixed(3) ?? "—", diff: "—" },
        { sector: 2, time: lapData.duration_sector_2?.toFixed(3) ?? "—", diff: "—" },
        { sector: 3, time: lapData.duration_sector_3?.toFixed(3) ?? "—", diff: "—" },
      ]
    : [];

  // Best lap for driver
  const bestLap = useMemo(() => {
    const valid = driverLaps.filter((l) => l.lap_duration! > 0).map((l) => l.lap_duration!);
    return valid.length > 0 ? formatLapTime(Math.min(...valid)) : "—";
  }, [driverLaps]);

  // Telemetry built from car data, filtered to the selected lap's time window
  const telemetry = useMemo(() => buildCarTelemetry(carData, lapData), [carData, lapData]);

  // Sample down for performance (show max 500 points in chart)
  const telemetrySampled = useMemo(() => {
    if (telemetry.length <= 500) return telemetry;
    const step = Math.ceil(telemetry.length / 500);
    return telemetry.filter((_, i) => i % step === 0);
  }, [telemetry]);

  // Tire stints for this driver
  const driverStints = useMemo(
    () =>
      stints
        .filter((s) => s.driver_number === effectiveDriverNum)
        .sort((a, b) => a.lap_start - b.lap_start),
    [stints, effectiveDriverNum]
  );

  const isLoading = driversLoading || lapsLoading;
  const teamColor = selectedDriver ? toHexColor(selectedDriver.team_colour) : "#888";

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl tracking-tight text-foreground mb-2">Driver Analysis</h1>
        <p className="text-muted-foreground">Detailed telemetry and performance analysis</p>
      </div>

      {!sessionKey ? (
        <NoSessionBanner />
      ) : isLoading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      ) : (
        <>
          {/* Driver and Lap Selector */}
          <div className="flex gap-4 items-center">
            <div>
              <label className="block text-sm text-muted-foreground mb-2">Driver</label>
              <select
                value={effectiveDriverNum ?? ""}
                onChange={(e) => {
                  setSelectedDriverNumber(Number(e.target.value));
                  setSelectedLap(1);
                }}
                className="bg-input text-foreground px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary min-w-[200px]"
              >
                {sortedDrivers.map((d) => (
                  <option key={d.driver_number} value={d.driver_number}>
                    {d.full_name} — {d.team_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-muted-foreground mb-2">Lap Number</label>
              <select
                value={selectedLap}
                onChange={(e) => setSelectedLap(Number(e.target.value))}
                className="bg-input text-foreground px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary min-w-[120px]"
                disabled={driverLaps.length === 0}
              >
                {driverLaps.length > 0 ? (
                  driverLaps.map((lap) => (
                    <option key={lap.lap_number} value={lap.lap_number}>
                      Lap {lap.lap_number}
                    </option>
                  ))
                ) : (
                  <option>No laps</option>
                )}
              </select>
            </div>
          </div>

          {/* Driver Info Card */}
          {selectedDriver && (
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-6">
                <div
                  className="w-24 h-24 rounded-lg flex items-center justify-center text-4xl font-bold"
                  style={{ backgroundColor: teamColor + "20", color: teamColor }}
                >
                  {selectedDriver.name_acronym}
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl text-card-foreground mb-1">{selectedDriver.full_name}</h2>
                  <p className="text-muted-foreground mb-2">{selectedDriver.team_name}</p>
                  <div className="flex gap-4 mt-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Car Number</p>
                      <p className="text-lg font-bold text-card-foreground">#{selectedDriver.driver_number}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Best Lap</p>
                      <p className="text-lg font-bold text-card-foreground font-mono">{bestLap}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Country</p>
                      <p className="text-lg font-bold text-card-foreground">{selectedDriver.country_code}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sector Times */}
          {sectorTimes.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="mb-4 text-card-foreground flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Sector Times — Lap {lapData?.lap_number}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {sectorTimes.map((sector) => (
                  <div key={sector.sector} className="bg-secondary rounded-lg p-4">
                    <p className="text-xs text-muted-foreground mb-1">Sector {sector.sector}</p>
                    <p className="text-2xl font-mono text-card-foreground mb-1">{sector.time}</p>
                    <p className="text-sm font-mono text-muted-foreground">{sector.diff}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Telemetry Charts */}
          {carDataLoading ? (
            <div className="flex items-center justify-center h-32">
              <LoadingSpinner />
            </div>
          ) : telemetrySampled.length > 0 ? (
            <div className="space-y-6">
              <TelemetryChart
                data={telemetrySampled}
                dataKeys={[{ key: "speed", color: teamColor, name: "Speed (km/h)" }]}
                xKey="distance"
                syncId={telemetrySyncId}
                title="Speed vs Sample"
                yAxisLabel="Speed (km/h)"
                xLabel="Sample"
                height={220}
              />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TelemetryChart
                  data={telemetrySampled}
                  dataKeys={[{ key: "throttle", color: "#00D2BE", name: "Throttle %" }]}
                  xKey="distance"
                  syncId={telemetrySyncId}
                  title="Throttle Application"
                  yAxisLabel="Throttle %"
                  xLabel="Sample"
                  height={200}
                />
                <TelemetryChart
                  data={telemetrySampled}
                  dataKeys={[{ key: "brake", color: "#ff0050", name: "Brake %" }]}
                  xKey="distance"
                  syncId={telemetrySyncId}
                  title="Brake Application"
                  yAxisLabel="Brake %"
                  xLabel="Sample"
                  height={200}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TelemetryChart
                  data={telemetrySampled}
                  dataKeys={[{ key: "gear", color: "#0090ff", name: "Gear" }]}
                  xKey="distance"
                  syncId={telemetrySyncId}
                  title="Gear Selection"
                  yAxisLabel="Gear"
                  xLabel="Sample"
                  height={200}
                />
                <TelemetryChart
                  data={telemetrySampled}
                  dataKeys={[{ key: "rpm", color: "#ff8800", name: "RPM" }]}
                  xKey="distance"
                  syncId={telemetrySyncId}
                  title="Engine RPM"
                  yAxisLabel="RPM"
                  xLabel="Sample"
                  height={200}
                />
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg p-6 text-center text-muted-foreground text-sm">
              No telemetry data available for this driver in the current session.
            </div>
          )}

          {/* Tire Compound History */}
          {driverStints.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="mb-4 text-card-foreground">Tire Compound &amp; Stint History</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {driverStints.map((stint, idx) => {
                  const compound = stint.compound as TireCompound;
                  return (
                    <div key={idx} className="bg-secondary rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: TIRE_COLORS[compound] }}
                        />
                        <p className="text-card-foreground font-semibold">
                          {capitalize(compound)}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Laps: {stint.lap_start}–{stint.lap_end ?? "?"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Age at start: {stint.tyre_age_at_start} laps
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
