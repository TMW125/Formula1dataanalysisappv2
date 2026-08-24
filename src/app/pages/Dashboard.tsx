import { useMemo } from "react";
import { Cloud, MapPin, Route, TrendingUp } from "lucide-react";
import { LeaderboardTable } from "../components/LeaderboardTable";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { StatsCard } from "../components/StatsCard";
import { TrackMap } from "../components/TrackMap";
import { useMeetings, useSelectedMeetingKey } from "../context/F1DataContext";
import { useLatestCompletedSession } from "../hooks/useSessionScope";
import { useCircuitInfo, useDriversData, useLapsData, useSessionResultsData, useWeatherData } from "../hooks/useSessionData";
import { buildLeaderboardFromResults, buildSessionInfo, formatLapTime, getBestLap } from "../utils/transformers";

export function Dashboard() {
  const meetingKey = useSelectedMeetingKey();
  const { meetings } = useMeetings();
  const { session: latestCompletedSession, loading: latestSessionLoading } = useLatestCompletedSession();
  const currentMeeting = meetings.find((meeting) => meeting.meeting_key === meetingKey) ?? null;
  const sessionKey = latestCompletedSession?.session_key ?? null;

  const { data: drivers, loading: driversLoading } = useDriversData(sessionKey);
  const { data: laps, loading: lapsLoading, error: lapsError } = useLapsData(sessionKey);
  const { data: sessionResults, loading: resultsLoading, error: resultsError } = useSessionResultsData(sessionKey);
  const { data: weatherData } = useWeatherData(sessionKey);
  const { circuitInfo } = useCircuitInfo();

  const isLoading = latestSessionLoading || driversLoading || lapsLoading || resultsLoading;
  const latestWeather = weatherData.at(-1) ?? null;
  const leaderboard = useMemo(() => buildLeaderboardFromResults(sessionResults, drivers), [drivers, sessionResults]);
  const sessionInfo = useMemo(() => buildSessionInfo(latestCompletedSession, latestWeather), [latestCompletedSession, latestWeather]);
  const bestLap = useMemo(() => {
    const lap = getBestLap(laps);
    if (!lap) return "—";
    const driverName = drivers.find((driver) => driver.driver_number === lap.driver_number)?.full_name ?? `#${lap.driver_number}`;
    return `${formatLapTime(lap.lap_duration)} · ${driverName}`;
  }, [drivers, laps]);

  if (isLoading && meetingKey !== null) {
    return <div className="flex min-h-[60vh] items-center justify-center"><LoadingSpinner /></div>;
  }

  if (!currentMeeting) {
    return <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center"><h1 className="text-3xl tracking-tight">Dashboard</h1><p className="mt-2 text-muted-foreground">Select a season and race weekend from the sidebar to begin.</p></div>;
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header>
        <h1 className="text-3xl tracking-tight text-foreground">Dashboard</h1>
        <p className="mt-2 text-muted-foreground">{currentMeeting.meeting_name} · {currentMeeting.location} · Latest completed session: {latestCompletedSession?.session_name ?? "None"}</p>
      </header>

      {lapsError || resultsError ? <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">Failed to load the latest completed session: {lapsError ?? resultsError}</div> : null}

      {latestCompletedSession ? (
        <>
          <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">
            <div className="flex flex-col gap-6">
              <StatsCard title="Track" value={sessionInfo.track} icon={MapPin} color="#7C3AED" />
              <StatsCard title="Circuit Type" value={currentMeeting.circuit_type ?? "—"} icon={Route} color="#E10600" />
              <StatsCard title="Weather" value={sessionInfo.weather} icon={Cloud} color="#0EA5E9" />
              <StatsCard title="Best Lap" value={bestLap} icon={TrendingUp} color="#ff8800" />
            </div>
            {circuitInfo && circuitInfo.x.length > 0 ? <div className="flex min-h-[360px] flex-col overflow-hidden rounded-lg border border-border bg-card p-4"><div className="min-h-0 flex-1"><TrackMap x={circuitInfo.x} y={circuitInfo.y} className="h-full w-full" /></div></div> : <div className="flex min-h-[360px] items-center justify-center rounded-lg border border-border bg-card text-sm text-muted-foreground">Track map unavailable</div>}
          </div>
          {leaderboard.length > 0 ? <LeaderboardTable data={leaderboard} /> : <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">No leaderboard data is available for the latest completed session.</div>}
        </>
      ) : (
        <div className="rounded-lg border border-border bg-card p-8 text-center"><TrendingUp className="mx-auto mb-3 h-10 w-10 text-muted-foreground" /><h2 className="text-xl">No completed session yet</h2><p className="mt-2 text-sm text-muted-foreground">The leaderboard will appear after the first session of this weekend has ended.</p></div>
      )}
    </div>
  );
}
