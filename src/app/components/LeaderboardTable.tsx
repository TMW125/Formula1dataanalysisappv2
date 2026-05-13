import type { LeaderboardRow } from "../types/ui";

interface LeaderboardTableProps {
  data: LeaderboardRow[];
}

export function LeaderboardTable({ data }: LeaderboardTableProps) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="p-4 border-b border-border">
        <h3 className="text-card-foreground">Driver Leaderboard</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px]">
          <thead>
            <tr className="bg-secondary border-b border-border">
              <th className="px-4 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">Pos</th>
              <th className="px-4 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">Driver</th>
              <th className="px-4 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">Team</th>
              <th className="px-4 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">Laps</th>
              <th className="px-4 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">Gap</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((entry) => (
              <tr key={entry.position} className="hover:bg-secondary/50 transition-colors">
                <td className="px-4 py-3">
                  <div
                    className={`w-8 h-8 rounded flex items-center justify-center text-sm font-bold ${
                      entry.position === 1
                        ? "bg-yellow-500/20 text-yellow-500"
                        : entry.position === 2
                        ? "bg-gray-400/20 text-gray-400"
                        : entry.position === 3
                        ? "bg-amber-700/20 text-amber-700"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {entry.position}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-1 h-8 rounded-full shrink-0"
                      style={{ backgroundColor: entry.teamColor }}
                    ></div>
                    <span className="text-card-foreground whitespace-nowrap">{entry.driver}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{entry.team}</td>
                <td className="px-4 py-3 text-card-foreground font-mono">{entry.time}</td>
                <td className="px-4 py-3">
                  <span
                    className={`font-mono ${
                      entry.gap === "-" ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {entry.gap}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
