/**
 * Session-scoped data hooks.
 *
 * Every hook reads `selectedSessionKey` from global context and automatically
 * re-fetches when it changes.  All hooks return `{ data, loading, error }`.
 *
 * IMPORTANT: hooks return an empty array (not null) when no session is
 * selected, so consumers can safely call `.length`, `.map()`, etc.
 */

import { useEffect, useState } from "react";
import { useF1Data, useMeetings, useSelectedMeetingKey, useSelectedSessionKey, useSessions } from "../context/F1DataContext";
import {
  getCarData,
  getChampionshipDrivers,
  getChampionshipTeams,
  getDrivers,
  getIntervals,
  getLaps,
  getLocation,
  getMeetingByKey,
  getOvertakes,
  getPits,
  getPositions,
  getRaceControl,
  getSessionResults,
  getSessionsByMeeting,
  getStartingGrid,
  getStints,
  getTeamRadio,
  getWeather,
} from "../services/openf1Api";
import type {
  CarData,
  CircuitInfo,
  Interval,
  Lap,
  OpenF1Driver,
  Pit,
  Position,
  RaceControlEvent,
  Session,
  SessionResult,
  Stint,
  Weather,
} from "../types/openf1";

// ─── Internal helper ──────────────────────────────────────────────────────────

interface FetchState<T> {
  data: T[];
  loading: boolean;
  error: string | null;
}

function useFetchList<T>(
  fetcher: (sessionKey: number) => Promise<T[]>,
  sessionKey: number | null
): FetchState<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionKey) {
      setData([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetcher(sessionKey)
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message ?? "Unknown error");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [sessionKey]); // fetcher reference intentionally excluded – it's always stable

  return { data, loading, error };
}

// ─── Current session object ───────────────────────────────────────────────────

/**
 * Returns the full `Session` object for the currently selected session key,
 * or `null` when nothing is selected.
 */
export function useCurrentSession(): Session | null {
  const { state } = useF1Data();
  const { sessions } = useSessions();
  return (
    sessions.find((s) => s.session_key === state.selectedSessionKey) ?? null
  );
}

// ─── Per-resource hooks ───────────────────────────────────────────────────────

/** All drivers who participated in the current session. */
export function useDriversData(): FetchState<OpenF1Driver> {
  const sessionKey = useSelectedSessionKey();
  return useFetchList(getDrivers, sessionKey);
}

/** All lap records for the current session. */
export function useLapsData(): FetchState<Lap> {
  const sessionKey = useSelectedSessionKey();
  return useFetchList(getLaps, sessionKey);
}

/** Weather samples for the current session. */
export function useWeatherData(): FetchState<Weather> {
  const sessionKey = useSelectedSessionKey();
  return useFetchList(getWeather, sessionKey);
}

/** Tyre stints for the current session. */
export function useStintsData(): FetchState<Stint> {
  const sessionKey = useSelectedSessionKey();
  return useFetchList(getStints, sessionKey);
}

/** Pit stop records for the current session. */
export function usePitsData(): FetchState<Pit> {
  const sessionKey = useSelectedSessionKey();
  return useFetchList(getPits, sessionKey);
}

/** Position history for the current session. */
export function usePositionsData(): FetchState<Position> {
  const sessionKey = useSelectedSessionKey();
  return useFetchList(getPositions, sessionKey);
}

/** Interval/gap data for the current session. */
export function useIntervalsData(): FetchState<Interval> {
  const sessionKey = useSelectedSessionKey();
  return useFetchList(getIntervals, sessionKey);
}

/** Race control messages for the current session. */
export function useRaceControlData(): FetchState<RaceControlEvent> {
  const sessionKey = useSelectedSessionKey();
  return useFetchList(getRaceControl, sessionKey);
}

/** Final session results (positions, gaps, DNF/DNS/DSQ). */
export function useSessionResultsData(): FetchState<SessionResult> {
  const sessionKey = useSelectedSessionKey();
  return useFetchList(getSessionResults, sessionKey);
}

// ─── Driver-scoped car data ───────────────────────────────────────────────────

/**
 * Car telemetry for a single driver in the current session.
 * Fetching is skipped when `driverNumber` is null.
 */
export function useCarDataForDriver(
  driverNumber: number | null
): FetchState<CarData> {
  const sessionKey = useSelectedSessionKey();
  const [data, setData] = useState<CarData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionKey || driverNumber === null) {
      setData([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    getCarData(sessionKey, driverNumber)
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message ?? "Unknown error");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [sessionKey, driverNumber]);

  return { data, loading, error };
}

// ─── DataExplorer generic hook ────────────────────────────────────────────────

type ExplorerEndpoint =
  | "laps"
  | "car_data"
  | "drivers"
  | "positions"
  | "stints"
  | "weather"
  | "intervals"
  | "pit"
  | "race_control"
  | "session_result"
  | "location"
  | "team_radio"
  | "overtakes"
  | "starting_grid"
  | "championship_drivers"
  | "championship_teams"
  | "meetings"
  | "sessions";

/**
 * Fetches data for a given endpoint in the current session.
 * Used by the DataExplorer page.  Does NOT auto-fetch on mount; call
 * `refetch()` to trigger a fetch.
 */
export function useExplorerData(
  endpoint: ExplorerEndpoint,
  driverNumber: number | null
): FetchState<Record<string, unknown>> & { refetch: () => void } {
  const sessionKey = useSelectedSessionKey();
  const currentSession = useCurrentSession();
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trigger, setTrigger] = useState(0);

  const refetch = () => setTrigger((n) => n + 1);

  useEffect(() => {
    if (!sessionKey || trigger === 0) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    const meetingKey = currentSession?.meeting_key;
    const fetchers: Record<ExplorerEndpoint, () => Promise<unknown[]>> = {
      laps: () => getLaps(sessionKey, driverNumber ?? undefined),
      car_data: () => getCarData(sessionKey, driverNumber ?? undefined),
      drivers: () => getDrivers(sessionKey, driverNumber ?? undefined),
      positions: () => getPositions(sessionKey, driverNumber ?? undefined),
      stints: () => getStints(sessionKey, driverNumber ?? undefined),
      weather: () => getWeather(sessionKey),
      intervals: () => getIntervals(sessionKey, driverNumber ?? undefined),
      pit: () => getPits(sessionKey, driverNumber ?? undefined),
      race_control: () => getRaceControl(sessionKey),
      session_result: () => getSessionResults(sessionKey),
      location: () => getLocation(sessionKey, driverNumber ?? undefined),
      team_radio: () => getTeamRadio(sessionKey, driverNumber ?? undefined),
      overtakes: () => getOvertakes(sessionKey),
      starting_grid: () => getStartingGrid(sessionKey),
      championship_drivers: () => getChampionshipDrivers(sessionKey),
      championship_teams: () => getChampionshipTeams(sessionKey),
      meetings: () => meetingKey ? getMeetingByKey(meetingKey) : Promise.resolve([]),
      sessions: () => meetingKey ? getSessionsByMeeting(meetingKey) : Promise.resolve([]),
    };

    (fetchers[endpoint] ?? fetchers.laps)()
      .then((result) => {
        if (!cancelled) {
          setData(result as Record<string, unknown>[]);
          setLoading(false);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message ?? "Unknown error");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [sessionKey, currentSession, endpoint, driverNumber, trigger]);

  return { data, loading, error, refetch };
}

// ─── Circuit info ─────────────────────────────────────────────────────────────

/**
 * Fetches circuit track-layout data (x/y coordinates) from the
 * `circuit_info_url` field of the currently selected meeting.
 *
 * Returns `null` while loading or when no URL is available.
 */
export function useCircuitInfo(): { circuitInfo: CircuitInfo | null; loading: boolean } {
  const meetingKey = useSelectedMeetingKey();
  const { meetings } = useMeetings();
  const [circuitInfo, setCircuitInfo] = useState<CircuitInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const meeting = meetings.find((m) => m.meeting_key === meetingKey);
    const url = meeting?.circuit_info_url ?? null;

    if (!url) {
      setCircuitInfo(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch(url, { headers: { Accept: "application/json" } })
      .then((res) => {
        if (!res.ok) throw new Error(`circuit_info fetch failed: ${res.status}`);
        return res.json() as Promise<{ x: number[]; y: number[]; circuitName?: string; rotation?: number }>;
      })
      .then((raw) => {
        if (!cancelled) {
          setCircuitInfo({
            x: raw.x ?? [],
            y: raw.y ?? [],
            circuitName: raw.circuitName ?? null,
            rotation: raw.rotation ?? null,
          });
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCircuitInfo(null);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [meetingKey, meetings]);

  return { circuitInfo, loading };
}
