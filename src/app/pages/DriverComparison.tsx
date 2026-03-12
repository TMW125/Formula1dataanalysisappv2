import { useState } from "react";
import { TelemetryChart } from "../components/charts/TelemetryChart";
import { mockDrivers, mockTelemetryData } from "../data/mockData";
import { ArrowLeftRight } from "lucide-react";

export function DriverComparison() {
  const [driverA, setDriverA] = useState(mockDrivers[0]);
  const [driverB, setDriverB] = useState(mockDrivers[4]);
  const [selectedLap, setSelectedLap] = useState(1);

  // Generate slightly different telemetry for driver B
  const telemetryB = mockTelemetryData.map((point) => ({
    ...point,
    speedB: point.speed - 5 + Math.random() * 10,
    throttleB: Math.max(0, Math.min(100, point.throttle - 5 + Math.random() * 10)),
  }));

  // Delta time calculation (simplified)
  const deltaData = mockTelemetryData.map((point, idx) => ({
    distance: point.distance,
    delta: (telemetryB[idx].speedB - point.speed) / 50, // Simplified delta
  }));

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl tracking-tight text-foreground mb-2">Driver Comparison</h1>
        <p className="text-muted-foreground">Compare two drivers across a lap</p>
      </div>

      {/* Driver Selectors */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-end">
        <div>
          <label className="block text-sm text-muted-foreground mb-2">Driver A</label>
          <select
            value={driverA.number}
            onChange={(e) => {
              const driver = mockDrivers.find((d) => d.number === Number(e.target.value));
              if (driver) setDriverA(driver);
            }}
            className="w-full bg-input text-foreground px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {mockDrivers.map((driver) => (
              <option key={driver.number} value={driver.number}>
                {driver.name}
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
            value={driverB.number}
            onChange={(e) => {
              const driver = mockDrivers.find((d) => d.number === Number(e.target.value));
              if (driver) setDriverB(driver);
            }}
            className="w-full bg-input text-foreground px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {mockDrivers.map((driver) => (
              <option key={driver.number} value={driver.number}>
                {driver.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Lap Selector */}
      <div>
        <label className="block text-sm text-muted-foreground mb-2">Lap Number</label>
        <select
          value={selectedLap}
          onChange={(e) => setSelectedLap(Number(e.target.value))}
          className="bg-input text-foreground px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary min-w-[120px]"
        >
          {Array.from({ length: 20 }, (_, i) => i + 1).map((lap) => (
            <option key={lap} value={lap}>
              Lap {lap}
            </option>
          ))}
        </select>
      </div>

      {/* Driver Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-4">
            <div
              className="w-20 h-20 rounded-lg flex items-center justify-center text-3xl font-bold"
              style={{ backgroundColor: driverA.teamColor + "20", color: driverA.teamColor }}
            >
              {driverA.abbreviation}
            </div>
            <div>
              <h3 className="text-xl text-card-foreground mb-1">{driverA.name}</h3>
              <p className="text-sm text-muted-foreground">{driverA.team}</p>
              <p className="text-xs text-muted-foreground mt-1">#{driverA.number}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Best Lap</span>
              <span className="text-lg font-mono text-card-foreground">1:31.720</span>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-4">
            <div
              className="w-20 h-20 rounded-lg flex items-center justify-center text-3xl font-bold"
              style={{ backgroundColor: driverB.teamColor + "20", color: driverB.teamColor }}
            >
              {driverB.abbreviation}
            </div>
            <div>
              <h3 className="text-xl text-card-foreground mb-1">{driverB.name}</h3>
              <p className="text-sm text-muted-foreground">{driverB.team}</p>
              <p className="text-xs text-muted-foreground mt-1">#{driverB.number}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Best Lap</span>
              <span className="text-lg font-mono text-card-foreground">1:31.912</span>
            </div>
          </div>
        </div>
      </div>

      {/* Delta Time Graph */}
      <TelemetryChart
        data={deltaData}
        dataKeys={[{ key: "delta", color: "#E10600", name: "Time Delta (s)" }]}
        xKey="distance"
        title="Delta Time Across the Lap"
        yAxisLabel="Delta (s)"
        height={220}
      />

      {/* Speed Comparison */}
      <TelemetryChart
        data={telemetryB.map((point, idx) => ({
          distance: point.distance,
          speedA: mockTelemetryData[idx].speed,
          speedB: point.speedB,
        }))}
        dataKeys={[
          { key: "speedA", color: driverA.teamColor, name: driverA.name },
          { key: "speedB", color: driverB.teamColor, name: driverB.name },
        ]}
        xKey="distance"
        title="Speed Comparison"
        yAxisLabel="Speed (km/h)"
        height={250}
      />

      {/* Throttle Comparison */}
      <TelemetryChart
        data={telemetryB.map((point, idx) => ({
          distance: point.distance,
          throttleA: mockTelemetryData[idx].throttle,
          throttleB: point.throttleB,
        }))}
        dataKeys={[
          { key: "throttleA", color: driverA.teamColor, name: driverA.name },
          { key: "throttleB", color: driverB.teamColor, name: driverB.name },
        ]}
        xKey="distance"
        title="Throttle Application Comparison"
        yAxisLabel="Throttle %"
        height={250}
      />

      {/* Corner Analysis */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="mb-4 text-card-foreground">Corner-by-Corner Analysis</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((corner) => {
            const diff = (Math.random() - 0.5) * 0.2;
            return (
              <div key={corner} className="bg-secondary rounded-lg p-4 text-center">
                <p className="text-xs text-muted-foreground mb-2">Turn {corner}</p>
                <p
                  className={`text-lg font-mono font-bold ${
                    diff < 0 ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {diff > 0 ? "+" : ""}
                  {diff.toFixed(3)}s
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {diff < 0 ? driverA.abbreviation : driverB.abbreviation} faster
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
