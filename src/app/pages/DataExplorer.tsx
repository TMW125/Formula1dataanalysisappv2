import { useState } from "react";
import { Download, Filter } from "lucide-react";
import { useDriversData, useExplorerData } from "../hooks/useSessionData";
import { useSelectedSessionKey } from "../context/F1DataContext";
import { LoadingSpinner } from "../components/LoadingSpinner";

type ExplorerEndpoint = "laps" | "car_data" | "drivers" | "positions" | "stints" | "weather";

const ENDPOINTS: ExplorerEndpoint[] = ["laps", "car_data", "drivers", "positions", "stints", "weather"];

export function DataExplorer() {
  const sessionKey = useSelectedSessionKey();
  const [endpoint, setEndpoint] = useState<ExplorerEndpoint>("laps");
  const [driverNumber, setDriverNumber] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"json" | "table">("table");

  const { data: drivers } = useDriversData();
  const { data, loading, error, refetch } = useExplorerData(endpoint, driverNumber);

  const handleExport = () => {
    if (data.length === 0) return;
    const csv = convertToCSV(data);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `f1-${endpoint}-data.csv`;
    a.click();
  };

  const convertToCSV = (rows: Record<string, unknown>[]) => {
    if (rows.length === 0) return "";
    const headers = Object.keys(rows[0]).join(",");
    const csvRows = rows.map((obj) =>
      Object.values(obj)
        .map((v) => (typeof v === "string" && v.includes(",") ? `"${v}"` : String(v ?? "")))
        .join(",")
    );
    return [headers, ...csvRows].join("\n");
  };

  if (!sessionKey) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Filter className="w-12 h-12 text-muted-foreground mb-4" />
        <h2 className="text-xl text-foreground mb-2">No Session Selected</h2>
        <p className="text-muted-foreground">Select a season, event, and session from the sidebar to explore raw data.</p>
      </div>
    );
  }

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
              onChange={(e) => setEndpoint(e.target.value as ExplorerEndpoint)}
              className="w-full bg-input text-foreground px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {ENDPOINTS.map((ep) => (
                <option key={ep} value={ep}>
                  /{ep}
                </option>
              ))}
            </select>
          </div>

          {/* Driver Filter */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm text-muted-foreground mb-2">Filter by Driver</label>
            <select
              value={driverNumber ?? ""}
              onChange={(e) => setDriverNumber(e.target.value ? Number(e.target.value) : null)}
              className="w-full bg-input text-foreground px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Drivers</option>
              {drivers.map((driver) => (
                <option key={driver.driver_number} value={driver.driver_number}>
                  {driver.full_name} ({driver.name_acronym})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={refetch}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Filter className="w-4 h-4" />
            Apply Filters
          </button>
          <button
            onClick={handleExport}
            disabled={data.length === 0}
            className="flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-lg hover:bg-secondary/80 transition-colors border border-border disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* Loading / Error */}
      {loading && <LoadingSpinner />}
      {error && (
        <div className="bg-red-950/30 border border-red-800 text-red-400 px-4 py-3 rounded-lg text-sm">
          Error: {error}
        </div>
      )}

      {/* Data Display */}
      {!loading && !error && data.length === 0 && (
        <p className="text-muted-foreground text-sm">
          No results yet. Select an endpoint and click <strong>Apply Filters</strong>.
        </p>
      )}

      {!loading && data.length > 0 && (
        viewMode === "table" ? (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="text-card-foreground">Data Results</h3>
              <span className="text-sm text-muted-foreground">{data.length} records</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-secondary border-b border-border">
                    {Object.keys(data[0]).map((key) => (
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
                  {data.slice(0, 200).map((row, idx) => (
                    <tr key={idx} className="hover:bg-secondary/50 transition-colors">
                      {Object.values(row).map((value, cellIdx) => (
                        <td key={cellIdx} className="px-4 py-3 text-muted-foreground font-mono text-sm">
                          {value === null || value === undefined ? "—" : String(value)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.length > 200 && (
                <p className="text-xs text-muted-foreground p-4">Showing first 200 of {data.length} records.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="text-card-foreground">JSON Response</h3>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(data, null, 2));
                }}
                className="text-sm text-primary hover:underline"
              >
                Copy to clipboard
              </button>
            </div>
            <div className="p-4 overflow-x-auto max-h-[600px] overflow-y-auto">
              <pre className="text-sm text-foreground font-mono">
                <code>{JSON.stringify(data.slice(0, 100), null, 2)}</code>
              </pre>
              {data.length > 100 && (
                <p className="text-xs text-muted-foreground mt-2">Showing first 100 of {data.length} records.</p>
              )}
            </div>
          </div>
        )
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
