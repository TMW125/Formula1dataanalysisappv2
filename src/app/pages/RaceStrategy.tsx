import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ScatterChart, Scatter, Cell } from "recharts";
import { mockLapTimeData, mockTireStints } from "../data/mockData";
import { Flag, Clock, TrendingDown } from "lucide-react";

export function RaceStrategy() {
  const tireColors: { [key: string]: string } = {
    Soft: "#E10600",
    Medium: "#FFD700",
    Hard: "#f5f5f5",
  };

  // Pit stop data
  const pitStops = [
    { driver: "Verstappen", lap: 12, duration: "2.3s", compound: "Medium" },
    { driver: "Verstappen", lap: 37, duration: "2.5s", compound: "Hard" },
    { driver: "Leclerc", lap: 10, duration: "2.6s", compound: "Medium" },
    { driver: "Leclerc", lap: 38, duration: "2.4s", compound: "Hard" },
  ];

  // Average pace by stint
  const paceData = [
    { driver: "Verstappen", stint: "Soft (1-12)", avgPace: 93.2, color: "#3671C6" },
    { driver: "Verstappen", stint: "Medium (13-37)", avgPace: 94.1, color: "#3671C6" },
    { driver: "Verstappen", stint: "Hard (38-57)", avgPace: 95.3, color: "#3671C6" },
    { driver: "Leclerc", stint: "Soft (1-10)", avgPace: 93.5, color: "#E8002D" },
    { driver: "Leclerc", stint: "Medium (11-38)", avgPace: 94.3, color: "#E8002D" },
    { driver: "Leclerc", stint: "Hard (39-57)", avgPace: 95.5, color: "#E8002D" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl tracking-tight text-foreground mb-2">Race Strategy</h1>
        <p className="text-muted-foreground">Analyze race pace and tire strategy</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Flag className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-card-foreground">Total Laps</h3>
          </div>
          <p className="text-3xl font-bold text-card-foreground">57</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-card-foreground">Avg Pit Stop</h3>
          </div>
          <p className="text-3xl font-bold text-card-foreground font-mono">2.45s</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-card-foreground">Fastest Lap</h3>
          </div>
          <p className="text-3xl font-bold text-card-foreground font-mono">1:31.720</p>
        </div>
      </div>

      {/* Stint Timeline Visualization */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="mb-6 text-card-foreground">Stint Timeline Visualization</h3>
        <div className="space-y-4">
          {/* Verstappen */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">Max Verstappen</p>
            <div className="flex gap-1 h-12">
              <div
                className="rounded flex items-center justify-center text-xs font-semibold text-white"
                style={{ width: "21%", backgroundColor: tireColors.Soft }}
              >
                Soft
              </div>
              <div
                className="rounded flex items-center justify-center text-xs font-semibold text-gray-900"
                style={{ width: "44%", backgroundColor: tireColors.Medium }}
              >
                Medium
              </div>
              <div
                className="rounded flex items-center justify-center text-xs font-semibold text-gray-900"
                style={{ width: "35%", backgroundColor: tireColors.Hard }}
              >
                Hard
              </div>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Lap 1</span>
              <span>Lap 12</span>
              <span>Lap 37</span>
              <span>Lap 57</span>
            </div>
          </div>

          {/* Leclerc */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">Charles Leclerc</p>
            <div className="flex gap-1 h-12">
              <div
                className="rounded flex items-center justify-center text-xs font-semibold text-white"
                style={{ width: "17.5%", backgroundColor: tireColors.Soft }}
              >
                Soft
              </div>
              <div
                className="rounded flex items-center justify-center text-xs font-semibold text-gray-900"
                style={{ width: "49.1%", backgroundColor: tireColors.Medium }}
              >
                Medium
              </div>
              <div
                className="rounded flex items-center justify-center text-xs font-semibold text-gray-900"
                style={{ width: "33.4%", backgroundColor: tireColors.Hard }}
              >
                Hard
              </div>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Lap 1</span>
              <span>Lap 10</span>
              <span>Lap 38</span>
              <span>Lap 57</span>
            </div>
          </div>
        </div>
      </div>

      {/* Lap Times per Stint */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="mb-4 text-card-foreground">Lap Times Throughout Race</h3>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a36" />
            <XAxis
              dataKey="lap"
              type="number"
              stroke="#9ca3af"
              tick={{ fill: "#9ca3af", fontSize: 12 }}
              label={{ value: "Lap", position: "insideBottom", offset: -5, fill: "#9ca3af" }}
            />
            <YAxis
              dataKey="verstappen"
              stroke="#9ca3af"
              tick={{ fill: "#9ca3af", fontSize: 12 }}
              label={{ value: "Lap Time (s)", angle: -90, position: "insideLeft", fill: "#9ca3af" }}
              domain={[91, 99]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#15151c",
                border: "1px solid #2a2a36",
                borderRadius: "0.375rem",
                color: "#f5f5f5",
              }}
              labelStyle={{ color: "#9ca3af" }}
            />
            <Legend
              wrapperStyle={{ paddingTop: "10px" }}
              formatter={(value) => <span style={{ color: "#f5f5f5" }}>{value}</span>}
            />
            <Scatter key="verstappen" name="Verstappen" data={mockLapTimeData} fill="#3671C6" />
            <Scatter key="leclerc" name="Leclerc" data={mockLapTimeData.map(d => ({ ...d, lap: d.lap, verstappen: d.leclerc }))} fill="#E8002D" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Average Pace Comparison */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="mb-4 text-card-foreground">Average Pace by Stint</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={paceData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a36" />
            <XAxis
              dataKey="stint"
              stroke="#9ca3af"
              tick={{ fill: "#9ca3af", fontSize: 12 }}
            />
            <YAxis
              stroke="#9ca3af"
              tick={{ fill: "#9ca3af", fontSize: 12 }}
              label={{ value: "Avg Lap Time (s)", angle: -90, position: "insideLeft", fill: "#9ca3af" }}
              domain={[92, 96]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#15151c",
                border: "1px solid #2a2a36",
                borderRadius: "0.375rem",
                color: "#f5f5f5",
              }}
              labelStyle={{ color: "#9ca3af" }}
            />
            <Bar dataKey="avgPace" radius={[4, 4, 0, 0]}>
              {paceData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Pit Stop Summary */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="text-card-foreground">Pit Stop Summary</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
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
                        style={{ backgroundColor: tireColors[stop.compound] }}
                      ></div>
                      <span className="text-muted-foreground">{stop.compound}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}