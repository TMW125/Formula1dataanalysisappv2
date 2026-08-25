import { useMemo } from "react";
import { Cloud, MapPin, Route, TrendingUp } from "lucide-react";
import { LeaderboardTable } from "../components/LeaderboardTable";
import { EmptyState, ErrorState, PageLoading, PanelLoading, PartialDataNotice } from "../components/AsyncState";
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

  const driversState = useDriversData(sessionKey);
  const lapsState = useLapsData(sessionKey);
  const resultsState = useSessionResultsData(sessionKey);
  const weatherState = useWeatherData(sessionKey);
  const circuitState = useCircuitInfo();
  const { data: drivers, loading: driversLoading } = driversState;
  const { data: laps, loading: lapsLoading } = lapsState;
  const { data: sessionResults, loading: resultsLoading } = resultsState;
  const { data: weatherData } = weatherState;
  const { circuitInfo } = circuitState;

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
    return <PageLoading message="Loading the latest completed session…" />;
  }

  if (!currentMeeting) {
    return <div className="p-6"><EmptyState title="Choose a race weekend" message="Select a season and race weekend from the sidebar to begin." /></div>;
  }

  const requiredErrors = [driversState.error, lapsState.error, resultsState.error].filter((error): error is string => Boolean(error));
  const optionalWarnings = [
    weatherState.error ? `Weather: ${weatherState.error}` : null,
    circuitState.error ? `Circuit map: ${circuitState.error}` : null,
  ].filter((message): message is string => Boolean(message));

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header>
        <h1 className="text-3xl tracking-tight text-foreground">Dashboard</h1>
        <p className="mt-2 text-muted-foreground">{currentMeeting.meeting_name} · {currentMeeting.location} · Latest completed session: {latestCompletedSession?.session_name ?? "None"}</p>
      </header>

      {requiredErrors.length > 0 ? <ErrorState compact title="Latest session data could not be loaded" message={requiredErrors.join("; ")} onRetry={() => {
        if (driversState.error) driversState.refetch();
        if (lapsState.error) lapsState.refetch();
        if (resultsState.error) resultsState.refetch();
      }} /> : null}
      <PartialDataNotice messages={optionalWarnings} />
      {optionalWarnings.length > 0 ? <div className="flex gap-3 text-sm">
        {weatherState.error ? <button type="button" onClick={weatherState.refetch} className="font-semibold text-primary hover:underline">Retry weather</button> : null}
        {circuitState.error ? <button type="button" onClick={circuitState.refetch} className="font-semibold text-primary hover:underline">Retry circuit map</button> : null}
      </div> : null}

      {requiredErrors.length > 0 ? null : latestCompletedSession ? (
        <>
          <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">
            <div className="flex flex-col gap-6">
              <StatsCard title="Track" value={sessionInfo.track} icon={MapPin} color="#7C3AED" />
              <StatsCard title="Circuit Type" value={currentMeeting.circuit_type ?? "—"} icon={Route} color="#E10600" />
              <StatsCard title="Weather" value={sessionInfo.weather} icon={Cloud} color="#0EA5E9" />
              <StatsCard title="Best Lap" value={bestLap} icon={TrendingUp} color="#ff8800" />
            </div>
            {circuitState.loading ? <PanelLoading message="Loading circuit map…" /> : circuitInfo && circuitInfo.x.length > 0 ? <div className="flex min-h-[360px] flex-col overflow-hidden rounded-lg border border-border bg-card p-4"><div className="min-h-0 flex-1"><TrackMap x={circuitInfo.x} y={circuitInfo.y} className="h-full w-full" /></div></div> : <div className="flex min-h-[360px] items-center justify-center rounded-lg border border-border bg-card text-sm text-muted-foreground">Track map unavailable</div>}
          </div>
          {leaderboard.length > 0 ? <LeaderboardTable data={leaderboard} /> : <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">No leaderboard data is available for the latest completed session.</div>}
        </>
      ) : (
        <div className="rounded-lg border border-border bg-card p-8 text-center"><TrendingUp className="mx-auto mb-3 h-10 w-10 text-muted-foreground" /><h2 className="text-xl">No completed session yet</h2><p className="mt-2 text-sm text-muted-foreground">The leaderboard will appear after the first session of this weekend has ended.</p></div>
      )}
    </div>
  );
}
