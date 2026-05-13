import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { ChartLineConfig } from "../../types/ui";

interface LapTimeChartProps {
  data: any[];
  /** Each entry describes one plotted line. */
  lines: ChartLineConfig[];
  height?: number;
}

export function LapTimeChart({ data, lines, height = 300 }: LapTimeChartProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-3 sm:p-4">
      <h3 className="mb-4 text-card-foreground">Lap Times Comparison</h3>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a36" />
          <XAxis
            dataKey="lap"
            stroke="#9ca3af"
            tick={{ fill: "#9ca3af", fontSize: 10 }}
            label={{ value: "Lap", position: "insideBottom", offset: -5, fill: "#9ca3af" }}
          />
          <YAxis
            stroke="#9ca3af"
            tick={{ fill: "#9ca3af", fontSize: 10 }}
            label={{ value: "Lap Time (s)", angle: -90, position: "insideLeft", fill: "#9ca3af" }}
            domain={["dataMin - 1", "dataMax + 1"]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#15151c",
              border: "1px solid #2a2a36",
              borderRadius: "0.375rem",
              color: "#f5f5f5",
            }}
            labelStyle={{ color: "#9ca3af" }}
            formatter={(value: number) => [`${value.toFixed(3)}s`, ""]}
          />
          <Legend
            wrapperStyle={{ paddingTop: "10px" }}
            iconType="line"
            formatter={(value) => <span style={{ color: "#f5f5f5" }}>{value}</span>}
          />
          {lines.map((line) => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              stroke={line.color}
              name={line.name}
              dot={false}
              strokeWidth={2}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
