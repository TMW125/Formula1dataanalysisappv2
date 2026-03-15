import { useMemo } from "react";
import { LeaderboardTable } from "../components/LeaderboardTable";
import { LapTimeChart } from "../components/charts/LapTimeChart";
import { SessionInfoPanel } from "../components/SessionInfoPanel";
import { StatsCard } from "../components/StatsCard";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { useDriversData, useLapsData, useWeatherData, useCurrentSession, useSessionResultsData } from "../hooks/useSessionData";
import { useSelectedSessionKey } from "../context/F1DataContext";
import { buildSessionInfo, buildLapTimeChartData, getBestLapFormatted, buildLeaderboardFromResults } from "../utils/transformers";
import { Users, Clock, Gauge, TrendingUp } from "lucide-react";

function NoSessionBanner() {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center space-y-3 bg-card border border-border rounded-lg p-8">
      <TrendingUp className="w-10 h-10 text-muted-foreground opacity-50" />
      <p className="text-lg text-muted-foreground">No session selected</p>
      <p className="text-sm text-muted-foreground">
        Use the selectors above to choose a season, race weekend, and session.
      </p>
    </div>
  );
}

export function Dashboard() {
  const sessionKey = useSelectedSessionKey();
  const session = useCurrentSession();

  const { data: drivers, loading: driversLoading } = useDriversData();
  const { data: laps, loading: lapsLoading, error: lapsError } = useLapsData();
  const { data: sessionResults, loading: resultsLoading, error: resultsError } = useSessionResultsData();
  const { data: weatherData } = useWeatherData();

  const isLoading = driversLoading || lapsLoading || resultsLoading;

  const latestWeather = weatherData.length > 0 ? weatherData[weatherData.length - 1] : null;

  const leaderboard = useMemo(() => buildLeaderboardFromResults(sessionResults, drivers), [sessionResults, drivers]);
  const sessionInfo = useMemo(() => buildSessionInfo(session, latestWeather), [session, latestWeather]);
  const bestLap = useMemo(() => getBestLapFormatted(laps), [laps]);

  // Top 5 drivers for lap time chart
  const top5DriverNums = useMemo(
    () =>
      leaderboard
        .slice(0, 5)
        .map((r) => drivers.find((d) => d.full_name === r.driver)?.driver_number)
        .filter((n): n is number => n !== undefined),
    [leaderboard, drivers]
  );

  const lapChartLines = useMemo(
    () =>
      leaderboard.slice(0, 5).map((row) => {
        const d = drivers.find((drv) => drv.full_name === row.driver);
        return {
          key: (d?.name_acronym ?? row.driver.split(" ").pop() ?? "").toLowerCase(),
          color: row.teamColor,
          name: row.driver,
        };
      }),
    [leaderboard, drivers]
  );

  const lapChartData = useMemo(
    () => buildLapTimeChartData(laps, drivers, top5DriverNums),
    [laps, drivers, top5DriverNums]
  );

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl tracking-tight text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Overview of the current race weekend</p>
      </div>

      {!sessionKey ? (
        <NoSessionBanner />
      ) : isLoading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      ) : lapsError || resultsError ? (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-destructive text-sm">
          Failed to load session data: {lapsError ?? resultsError}
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard title="Total Drivers" value={drivers.length > 0 ? String(drivers.length) : "—"} icon={Users} color="#E10600" />
            <StatsCard title="Session" value={session?.session_name ?? "—"} icon={Clock} color="#0090ff" />
            <StatsCard title="Air Temp" value={latestWeather ? `${latestWeather.air_temperature}°C` : "—"} icon={Gauge} color="#00D2BE" />
            <StatsCard title="Best Lap" value={bestLap} icon={TrendingUp} color="#ff8800" />
          </div>

          {/* Session Info */}
          <SessionInfoPanel info={sessionInfo} />

          {/* Lap Time Chart */}
          {lapChartData.length > 0 && lapChartLines.length > 0 ? (
            <LapTimeChart data={lapChartData} lines={lapChartLines} height={250} />
          ) : (
            <div className="bg-card border border-border rounded-lg p-6 text-center text-muted-foreground text-sm">
              No lap time data available for this session yet.
            </div>
          )}

          {/* Leaderboard */}
          {leaderboard.length > 0 ? (
            <LeaderboardTable data={leaderboard} />
          ) : (
            <div className="bg-card border border-border rounded-lg p-6 text-center text-muted-foreground text-sm">
              No leaderboard data available yet.
            </div>
          )}
        </>
      )}
    </div>
  );
}