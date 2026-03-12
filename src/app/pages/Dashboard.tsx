import { LeaderboardTable } from "../components/LeaderboardTable";
import { LapTimeChart } from "../components/charts/LapTimeChart";
import { TrackMap } from "../components/TrackMap";
import { SessionInfoPanel } from "../components/SessionInfoPanel";
import { StatsCard } from "../components/StatsCard";
import { mockLeaderboard, mockSessionInfo, mockLapTimeData } from "../data/mockData";
import { Users, Clock, Gauge, TrendingUp } from "lucide-react";

export function Dashboard() {
  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl tracking-tight text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Overview of the current race weekend</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Drivers"
          value="20"
          icon={Users}
          color="#E10600"
        />
        <StatsCard
          title="Session Time"
          value="60:00"
          icon={Clock}
          color="#0090ff"
        />
        <StatsCard
          title="Top Speed"
          value="342 km/h"
          icon={Gauge}
          color="#00D2BE"
          trend={{ value: "5.2%", direction: "up" }}
        />
        <StatsCard
          title="Best Lap"
          value="1:31.720"
          icon={TrendingUp}
          color="#ff8800"
          trend={{ value: "0.3s", direction: "down" }}
        />
      </div>

      {/* Top Row - Session Info and Track Map */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TrackMap />
        </div>
        <div>
          <SessionInfoPanel info={mockSessionInfo} />
        </div>
      </div>

      {/* Lap Time Chart */}
      <LapTimeChart data={mockLapTimeData.slice(0, 10)} height={250} />

      {/* Leaderboard */}
      <LeaderboardTable data={mockLeaderboard} />
    </div>
  );
}