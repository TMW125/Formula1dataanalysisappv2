import { useMemo } from "react";
import { LeaderboardTable } from "../components/LeaderboardTable";
import { StatsCard } from "../components/StatsCard";
import { TrackMap } from "../components/TrackMap";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { useDriversData, useLapsData, useWeatherData, useCurrentSession, useSessionResultsData, useCircuitInfo } from "../hooks/useSessionData";
import { useSelectedSessionKey, useMeetings, useSelectedMeetingKey } from "../context/F1DataContext";
import { buildSessionInfo, getBestLapFormatted, buildLeaderboardFromResults } from "../utils/transformers";
import { TrendingUp, MapPin, Cloud, Route } from "lucide-react";

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
  const meetingKey = useSelectedMeetingKey();
  const { meetings } = useMeetings();
  const currentMeeting = meetings.find((m) => m.meeting_key === meetingKey) ?? null;
  const session = useCurrentSession();

  const { data: drivers, loading: driversLoading } = useDriversData();
  const { data: laps, loading: lapsLoading, error: lapsError } = useLapsData();
  const { data: sessionResults, loading: resultsLoading, error: resultsError } = useSessionResultsData();
  const { data: weatherData } = useWeatherData();
  const { circuitInfo } = useCircuitInfo();

  const isLoading = driversLoading || lapsLoading || resultsLoading;

  const latestWeather = weatherData.length > 0 ? weatherData[weatherData.length - 1] : null;

  const leaderboard = useMemo(() => buildLeaderboardFromResults(sessionResults, drivers), [sessionResults, drivers]);
  const sessionInfo = useMemo(() => buildSessionInfo(session, latestWeather), [session, latestWeather]);
  const bestLap = useMemo(() => getBestLapFormatted(laps), [laps]);

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl tracking-tight text-foreground mb-1 sm:mb-2">Dashboard</h1>
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
          {/* Stats Cards + Track Map */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-stretch">
            {/* Stats column */}
            <div className="flex flex-col gap-6">
              <StatsCard title="Track" value={sessionInfo.track} icon={MapPin} color="#7C3AED" />
              <StatsCard title="Circuit Type" value={currentMeeting?.circuit_type ?? "—"} icon={Route} color="#E10600" />
              <StatsCard title="Weather" value={sessionInfo.weather} icon={Cloud} color="#0EA5E9" />
              <StatsCard title="Best Lap" value={bestLap} icon={TrendingUp} color="#ff8800" />
            </div>

            {/* Track Map */}
            {circuitInfo && circuitInfo.x.length > 0 ? (
              <div className="bg-card border border-border rounded-lg p-3 sm:p-4 flex flex-col h-0 min-h-full overflow-hidden">
                <div className="flex-1 min-h-0">
                  <TrackMap x={circuitInfo.x} y={circuitInfo.y} className="w-full h-full" />
                </div>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-lg p-4 flex items-center justify-center text-muted-foreground text-sm h-0 min-h-full">
                Track map unavailable
              </div>
            )}
          </div>

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
