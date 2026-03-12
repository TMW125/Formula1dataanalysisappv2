import { useState } from "react";
import { TelemetryChart } from "../components/charts/TelemetryChart";
import { mockDrivers, mockTelemetryData, mockSectorTimes } from "../data/mockData";
import { Clock } from "lucide-react";

export function DriverAnalysis() {
  const [selectedDriver, setSelectedDriver] = useState(mockDrivers[0]);
  const [selectedLap, setSelectedLap] = useState(1);

  const tireCompounds = [
    { compound: "Soft", color: "#E10600", laps: "1-12" },
    { compound: "Medium", color: "#FFD700", laps: "13-37" },
    { compound: "Hard", color: "#f5f5f5", laps: "38-57" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl tracking-tight text-foreground mb-2">Driver Analysis</h1>
        <p className="text-muted-foreground">Detailed telemetry and performance analysis</p>
      </div>

      {/* Driver and Lap Selector */}
      <div className="flex gap-4 items-center">
        <div>
          <label className="block text-sm text-muted-foreground mb-2">Driver</label>
          <select
            value={selectedDriver.number}
            onChange={(e) => {
              const driver = mockDrivers.find((d) => d.number === Number(e.target.value));
              if (driver) setSelectedDriver(driver);
            }}
            className="bg-input text-foreground px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary min-w-[200px]"
          >
            {mockDrivers.map((driver) => (
              <option key={driver.number} value={driver.number}>
                {driver.name} - {driver.team}
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
          >
            {Array.from({ length: 20 }, (_, i) => i + 1).map((lap) => (
              <option key={lap} value={lap}>
                Lap {lap}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Driver Info Card */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center gap-6">
          <div
            className="w-24 h-24 rounded-lg flex items-center justify-center text-4xl font-bold"
            style={{ backgroundColor: selectedDriver.teamColor + "20", color: selectedDriver.teamColor }}
          >
            {selectedDriver.abbreviation}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl text-card-foreground mb-1">{selectedDriver.name}</h2>
            <p className="text-muted-foreground mb-2">{selectedDriver.team}</p>
            <div className="flex gap-4 mt-3">
              <div>
                <p className="text-xs text-muted-foreground">Car Number</p>
                <p className="text-lg font-bold text-card-foreground">#{selectedDriver.number}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Best Lap</p>
                <p className="text-lg font-bold text-card-foreground font-mono">1:31.720</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sector Times */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="mb-4 text-card-foreground flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Sector Times Breakdown
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {mockSectorTimes.map((sector) => (
            <div key={sector.sector} className="bg-secondary rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-1">Sector {sector.sector}</p>
              <p className="text-2xl font-mono text-card-foreground mb-1">{sector.time}</p>
              <p
                className={`text-sm font-mono ${
                  sector.diff.startsWith("-") ? "text-green-500" : "text-red-500"
                }`}
              >
                {sector.diff}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Telemetry Charts */}
      <div className="space-y-6">
        <TelemetryChart
          data={mockTelemetryData}
          dataKeys={[{ key: "speed", color: "#E10600", name: "Speed (km/h)" }]}
          xKey="distance"
          title="Speed vs Distance"
          yAxisLabel="Speed (km/h)"
          height={220}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TelemetryChart
            data={mockTelemetryData}
            dataKeys={[{ key: "throttle", color: "#00D2BE", name: "Throttle %" }]}
            xKey="distance"
            title="Throttle Application"
            yAxisLabel="Throttle %"
            height={200}
          />

          <TelemetryChart
            data={mockTelemetryData}
            dataKeys={[{ key: "brake", color: "#ff0050", name: "Brake %" }]}
            xKey="distance"
            title="Brake Application"
            yAxisLabel="Brake %"
            height={200}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TelemetryChart
            data={mockTelemetryData}
            dataKeys={[{ key: "gear", color: "#0090ff", name: "Gear" }]}
            xKey="distance"
            title="Gear Selection"
            yAxisLabel="Gear"
            height={200}
          />

          <TelemetryChart
            data={mockTelemetryData}
            dataKeys={[{ key: "rpm", color: "#ff8800", name: "RPM" }]}
            xKey="distance"
            title="Engine RPM"
            yAxisLabel="RPM"
            height={200}
          />
        </div>
      </div>

      {/* Tire Compound History */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="mb-4 text-card-foreground">Tire Compound & Stint History</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tireCompounds.map((tire) => (
            <div key={tire.compound} className="bg-secondary rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: tire.color }}></div>
                <p className="text-card-foreground font-semibold">{tire.compound}</p>
              </div>
              <p className="text-sm text-muted-foreground">Laps: {tire.laps}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
