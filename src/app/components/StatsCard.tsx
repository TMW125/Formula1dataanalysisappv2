import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    direction: "up" | "down";
  };
  color?: string;
}

export function StatsCard({ title, value, icon: Icon, trend, color = "#E10600" }: StatsCardProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 sm:p-6 hover:border-primary/50 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: color + "20" }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        {trend && (
          <span
            className={`text-sm font-mono ${
              trend.direction === "up" ? "text-green-500" : "text-red-500"
            }`}
          >
            {trend.direction === "up" ? "↑" : "↓"} {trend.value}
          </span>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-1">{title}</p>
      <p className="text-xl sm:text-2xl font-bold text-card-foreground break-words">{value}</p>
    </div>
  );
}
