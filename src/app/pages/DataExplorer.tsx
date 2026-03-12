import { useState } from "react";
import { mockDrivers, mockLeaderboard } from "../data/mockData";
import { Download, Filter } from "lucide-react";

export function DataExplorer() {
  const [endpoint, setEndpoint] = useState("laps");
  const [viewMode, setViewMode] = useState<"json" | "table">("table");

  const endpoints = ["laps", "telemetry", "drivers", "sessions", "car_data", "positions"];

  // Mock API response
  const mockResponse = {
    laps: mockLeaderboard.map((entry) => ({
      driver_number: entry.position,
      driver_name: entry.driver,
      lap_time: entry.time,
      lap_number: 1,
      session_key: 9158,
    })),
    drivers: mockDrivers.map((driver) => ({
      driver_number: driver.number,
      full_name: driver.name,
      team_name: driver.team,
      team_colour: driver.teamColor,
      name_acronym: driver.abbreviation,
    })),
  };

  const currentData = endpoint === "laps" ? mockResponse.laps : mockResponse.drivers;

  const handleExport = () => {
    const csv = convertToCSV(currentData);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `f1-${endpoint}-data.csv`;
    a.click();
  };

  const convertToCSV = (data: any[]) => {
    if (data.length === 0) return "";
    const headers = Object.keys(data[0]).join(",");
    const rows = data.map((obj) => Object.values(obj).join(","));
    return [headers, ...rows].join("\n");
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl tracking-tight text-foreground mb-2">Raw Data Explorer</h1>
        <p className="text-muted-foreground">Advanced data access and export tools</p>
      </div>

      {/* Controls */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Endpoint Selector */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm text-muted-foreground mb-2">API Endpoint</label>
            <select
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              className="w-full bg-input text-foreground px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {endpoints.map((ep) => (
                <option key={ep} value={ep}>
                  /{ep}
                </option>
              ))}
            </select>
          </div>

          {/* Driver Filter */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm text-muted-foreground mb-2">Filter by Driver</label>
            <select className="w-full bg-input text-foreground px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary">
              <option>All Drivers</option>
              {mockDrivers.map((driver) => (
                <option key={driver.number} value={driver.number}>
                  {driver.name}
                </option>
              ))}
            </select>
          </div>

          {/* Session Filter */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm text-muted-foreground mb-2">Session</label>
            <select className="w-full bg-input text-foreground px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary">
              <option>Qualifying</option>
              <option>Race</option>
              <option>Practice 1</option>
              <option>Practice 2</option>
              <option>Practice 3</option>
            </select>
          </div>

          {/* Lap Filter */}
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm text-muted-foreground mb-2">Lap</label>
            <input
              type="number"
              placeholder="All laps"
              className="w-full bg-input text-foreground px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-4">
          <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
            <Filter className="w-4 h-4" />
            Apply Filters
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-lg hover:bg-secondary/80 transition-colors border border-border"
          >
            <Download className="w-4 h-4" />
            Export to CSV
          </button>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setViewMode("table")}
          className={`px-4 py-2 rounded-lg transition-colors ${
            viewMode === "table"
              ? "bg-primary text-primary-foreground"
              : "bg-card text-card-foreground border border-border hover:bg-secondary"
          }`}
        >
          Table View
        </button>
        <button
          onClick={() => setViewMode("json")}
          className={`px-4 py-2 rounded-lg transition-colors ${
            viewMode === "json"
              ? "bg-primary text-primary-foreground"
              : "bg-card text-card-foreground border border-border hover:bg-secondary"
          }`}
        >
          JSON View
        </button>
      </div>

      {/* Data Display */}
      {viewMode === "table" ? (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="text-card-foreground">Data Results</h3>
            <span className="text-sm text-muted-foreground">{currentData.length} records</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-secondary border-b border-border">
                  {Object.keys(currentData[0] || {}).map((key) => (
                    <th
                      key={key}
                      className="px-4 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider"
                    >
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {currentData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-secondary/50 transition-colors">
                    {Object.values(row).map((value, cellIdx) => (
                      <td key={cellIdx} className="px-4 py-3 text-muted-foreground font-mono text-sm">
                        {String(value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="text-card-foreground">JSON Response</h3>
            <button
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(currentData, null, 2));
              }}
              className="text-sm text-primary hover:underline"
            >
              Copy to clipboard
            </button>
          </div>
          <div className="p-4 overflow-x-auto">
            <pre className="text-sm text-foreground font-mono">
              <code>{JSON.stringify(currentData, null, 2)}</code>
            </pre>
          </div>
        </div>
      )}

      {/* API Info */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="mb-4 text-card-foreground">API Information</h3>
        <div className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">Endpoint URL</p>
            <code className="text-sm text-primary bg-primary/10 px-3 py-1 rounded mt-1 inline-block">
              https://api.openf1.org/v1/{endpoint}
            </code>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Documentation</p>
            <a
              href="https://openf1.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              https://openf1.org
            </a>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Response Format</p>
            <p className="text-sm text-card-foreground">JSON</p>
          </div>
        </div>
      </div>
    </div>
  );
}
