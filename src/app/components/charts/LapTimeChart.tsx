import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface LapTimeChartProps {
  data: any[];
  height?: number;
}

export function LapTimeChart({ data, height = 300 }: LapTimeChartProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <h3 className="mb-4 text-card-foreground">Lap Times Comparison</h3>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a36" />
          <XAxis
            dataKey="lap"
            stroke="#9ca3af"
            tick={{ fill: "#9ca3af", fontSize: 12 }}
            label={{ value: "Lap", position: "insideBottom", offset: -5, fill: "#9ca3af" }}
          />
          <YAxis
            stroke="#9ca3af"
            tick={{ fill: "#9ca3af", fontSize: 12 }}
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
            formatter={(value: any) => [`${value.toFixed(3)}s`, ""]}
          />
          <Legend
            wrapperStyle={{ paddingTop: "10px" }}
            iconType="line"
            formatter={(value) => <span style={{ color: "#f5f5f5" }}>{value}</span>}
          />
          <Line key="verstappen" type="monotone" dataKey="verstappen" stroke="#3671C6" name="Verstappen" dot={false} strokeWidth={2} />
          <Line key="leclerc" type="monotone" dataKey="leclerc" stroke="#E8002D" name="Leclerc" dot={false} strokeWidth={2} />
          <Line key="norris" type="monotone" dataKey="norris" stroke="#FF8000" name="Norris" dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}