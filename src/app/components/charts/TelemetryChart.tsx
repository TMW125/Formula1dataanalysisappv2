import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface TelemetryChartProps {
  data: any[];
  dataKeys: { key: string; color: string; name: string }[];
  xKey: string;
  title: string;
  yAxisLabel?: string;
  /** Override the x-axis label. Defaults to "Distance (m)". */
  xLabel?: string;
  /** Optional Recharts sync id for cross-chart tooltip/brush synchronization. */
  syncId?: string;
  xTicks?: number[];
  height?: number;
}

export function TelemetryChart({
  data,
  dataKeys,
  xKey,
  title,
  yAxisLabel,
  xLabel = "Distance (m)",
  syncId,
  xTicks,
  height = 200,
}: TelemetryChartProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <h3 className="mb-4 text-card-foreground">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} syncId={syncId}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a36" />
          <XAxis
            dataKey={xKey}
            type="number"
            ticks={xTicks}
            domain={
              xTicks && xTicks.length > 1
                ? [xTicks[0], xTicks[xTicks.length - 1]]
                : ["dataMin", "dataMax"]
            }
            allowDecimals
            stroke="#9ca3af"
            tick={{ fill: "#9ca3af", fontSize: 12 }}
            label={{ value: xLabel, position: "insideBottom", offset: -5, fill: "#9ca3af" }}
          />
          <YAxis
            stroke="#9ca3af"
            tick={{ fill: "#9ca3af", fontSize: 12 }}
            label={{ value: yAxisLabel || "", angle: -90, position: "insideLeft", fill: "#9ca3af" }}
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
            iconType="line"
            formatter={(value) => <span style={{ color: "#f5f5f5" }}>{value}</span>}
          />
          {dataKeys.map((item) => (
            <Line
              key={item.key}
              type="monotone"
              dataKey={item.key}
              stroke={item.color}
              name={item.name}
              dot={false}
              strokeWidth={2}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
