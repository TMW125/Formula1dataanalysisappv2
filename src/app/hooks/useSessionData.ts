/**
 * Session-scoped data hooks.
 *
 * Every OpenF1 request is backed by a TanStack Query. The query key contains
 * the complete request identity, so pages can safely mount/unmount while the
 * same result and in-flight request remain shared in the app cache.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  useF1Data,
  useMeetings,
  useSelectedMeetingKey,
  useSelectedSeason,
  useSelectedSessionKey,
  useSessions,
} from "../context/F1DataContext";
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
import { QUERY_GC_TIME, QUERY_STALE_TIME } from "../queryClient";
import { explorerEndpointKey, openF1QueryKey, openF1QueryKeys, type OpenF1Endpoint } from "../queryKeys";

// ─── Shared result shape ──────────────────────────────────────────────────────

export interface FetchState<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

function errorMessage(error: unknown): string | null {
  return error instanceof Error ? error.message : error ? "Unknown error" : null;
}

function emptyQueryKey(endpoint: Exclude<OpenF1Endpoint, "meetings" | "sessions">) {
  return openF1QueryKey({ endpoint });
}

function useSessionQuery<T>(
  endpoint: Exclude<OpenF1Endpoint, "meetings" | "sessions">,
  fetcher: (sessionKey: number, signal: AbortSignal) => Promise<T[]>,
  enabledOverride = true,
): FetchState<T> {
  const season = useSelectedSeason();
  const meetingKey = useSelectedMeetingKey();
  const sessionKey = useSelectedSessionKey();
  const enabled = enabledOverride && sessionKey !== null && meetingKey !== null;
  const query = useQuery<T[], Error>({
    queryKey: enabled
      ? openF1QueryKeys.session(season, meetingKey, sessionKey, endpoint)
      : emptyQueryKey(endpoint),
    queryFn: ({ signal }) => fetcher(sessionKey!, signal),
    enabled,
    staleTime: QUERY_STALE_TIME.standard,
    gcTime: QUERY_GC_TIME.standard,
  });

  return {
    data: query.data ?? [],
    loading: enabled && query.isPending,
    error: enabled ? errorMessage(query.error) : null,
    refetch: () => { void query.refetch(); },
  };
}

// ─── Current session object ───────────────────────────────────────────────────

/** Returns the full Session object for the currently selected session key. */
export function useCurrentSession(): Session | null {
  const { state } = useF1Data();
  const { sessions } = useSessions();
  return sessions.find((session) => session.session_key === state.selectedSessionKey) ?? null;
}

// ─── Per-resource hooks ───────────────────────────────────────────────────────

/** All drivers who participated in the current session. */
export function useDriversData(options: { enabled?: boolean } = {}): FetchState<OpenF1Driver> {
  return useSessionQuery(
    "drivers",
    (sessionKey, signal) => getDrivers(sessionKey, undefined, signal),
    options.enabled ?? true,
  );
}

/** All lap records for the current session. */
export function useLapsData(): FetchState<Lap> {
  return useSessionQuery("laps", (sessionKey, signal) => getLaps(sessionKey, undefined, signal));
}

/** Weather samples for the current session. */
export function useWeatherData(): FetchState<Weather> {
  return useSessionQuery("weather", (sessionKey, signal) => getWeather(sessionKey, signal));
}

/** Tyre stints for the current session. */
export function useStintsData(): FetchState<Stint> {
  return useSessionQuery("stints", (sessionKey, signal) => getStints(sessionKey, undefined, signal));
}

/** Pit stop records for the current session. */
export function usePitsData(): FetchState<Pit> {
  return useSessionQuery("pits", (sessionKey, signal) => getPits(sessionKey, undefined, signal));
}

/** Position history for the current session. */
export function usePositionsData(): FetchState<Position> {
  return useSessionQuery("positions", (sessionKey, signal) => getPositions(sessionKey, undefined, signal));
}

/** Interval/gap data for the current session. */
export function useIntervalsData(): FetchState<Interval> {
  return useSessionQuery("intervals", (sessionKey, signal) => getIntervals(sessionKey, undefined, signal));
}

/** Race control messages for the current session. */
export function useRaceControlData(): FetchState<RaceControlEvent> {
  return useSessionQuery("race_control", (sessionKey, signal) => getRaceControl(sessionKey, signal));
}

/** Final session results (positions, gaps, DNF/DNS/DSQ). */
export function useSessionResultsData(): FetchState<SessionResult> {
  return useSessionQuery("session_result", (sessionKey, signal) => getSessionResults(sessionKey, signal));
}

// ─── Driver-scoped car data ───────────────────────────────────────────────────

/** Car telemetry for one selected driver in the current session. */
export function useCarDataForDriver(driverNumber: number | null): FetchState<CarData> {
  const season = useSelectedSeason();
  const meetingKey = useSelectedMeetingKey();
  const sessionKey = useSelectedSessionKey();
  const enabled = sessionKey !== null && meetingKey !== null && driverNumber !== null;
  const query = useQuery<CarData[], Error>({
    queryKey: enabled
      ? openF1QueryKeys.session(season, meetingKey, sessionKey, "car_data", driverNumber)
      : openF1QueryKey({
          season,
          meetingKey,
          sessionKey,
          endpoint: "car_data",
          driverNumber,
        }),
    queryFn: ({ signal }) => getCarData(sessionKey!, driverNumber!, signal),
    enabled,
    staleTime: QUERY_STALE_TIME.historical,
    gcTime: QUERY_GC_TIME.location,
  });

  return {
    data: query.data ?? [],
    loading: enabled && query.isPending,
    error: enabled ? errorMessage(query.error) : null,
    refetch: () => { void query.refetch(); },
  };
}

// ─── Data Explorer generic hook ───────────────────────────────────────────────

export type ExplorerEndpoint =
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

const NO_DRIVER_FILTER: ReadonlySet<ExplorerEndpoint> = new Set([
  "weather",
  "race_control",
  "session_result",
  "overtakes",
  "starting_grid",
  "championship_drivers",
  "championship_teams",
  "meetings",
  "sessions",
]);

function explorerCanFetch(endpoint: ExplorerEndpoint, sessionKey: number | null, meetingKey: number | null) {
  return endpoint === "meetings" || endpoint === "sessions" ? meetingKey !== null : sessionKey !== null;
}

/**
 * Data Explorer is intentionally disabled until its returned `refetch` action
 * is called. Changing endpoint or driver resets that request gate, so merely
 * browsing the selector never starts a new OpenF1 request.
 */
export function useExplorerData(
  endpoint: ExplorerEndpoint,
  driverNumber: number | null,
): FetchState<Record<string, unknown>> {
  const season = useSelectedSeason();
  const sessionKey = useSelectedSessionKey();
  const selectedMeetingKey = useSelectedMeetingKey();
  const currentSession = useCurrentSession();
  const meetingKey = currentSession?.meeting_key ?? selectedMeetingKey;
  const effectiveDriverNumber = NO_DRIVER_FILTER.has(endpoint) ? null : driverNumber;
  const canonicalEndpoint = explorerEndpointKey(endpoint);
  const queryKey = useMemo(() => {
    if (endpoint === "meetings" || endpoint === "sessions") {
      return openF1QueryKey({ season, meetingKey, endpoint: canonicalEndpoint });
    }
    return openF1QueryKey({
      season,
      meetingKey,
      sessionKey,
      endpoint: canonicalEndpoint,
      driverNumber: effectiveDriverNumber,
    });
  }, [canonicalEndpoint, effectiveDriverNumber, endpoint, meetingKey, season, sessionKey]);
  const queryHash = JSON.stringify(queryKey);
  const [requestedKey, setRequestedKey] = useState<string | null>(null);
  const canFetch = explorerCanFetch(endpoint, sessionKey, meetingKey);

  useEffect(() => {
    setRequestedKey(null);
  }, [queryHash]);

  const query = useQuery<unknown[], Error>({
    queryKey,
    queryFn: ({ signal }) => {
      const driver = effectiveDriverNumber ?? undefined;
      switch (endpoint) {
        case "laps": return getLaps(sessionKey!, driver, signal);
        case "car_data": return getCarData(sessionKey!, driver, signal);
        case "drivers": return getDrivers(sessionKey!, driver, signal);
        case "positions": return getPositions(sessionKey!, driver, signal);
        case "stints": return getStints(sessionKey!, driver, signal);
        case "weather": return getWeather(sessionKey!, signal);
        case "intervals": return getIntervals(sessionKey!, driver, signal);
        case "pit": return getPits(sessionKey!, driver, signal);
        case "race_control": return getRaceControl(sessionKey!, signal);
        case "session_result": return getSessionResults(sessionKey!, signal);
        case "location": return getLocation(sessionKey!, driver, signal);
        case "team_radio": return getTeamRadio(sessionKey!, driver, signal);
        case "overtakes": return getOvertakes(sessionKey!, signal);
        case "starting_grid": return getStartingGrid(sessionKey!, signal);
        case "championship_drivers": return getChampionshipDrivers(sessionKey!, signal);
        case "championship_teams": return getChampionshipTeams(sessionKey!, signal);
        case "meetings": return meetingKey === null ? Promise.resolve([]) : getMeetingByKey(meetingKey);
        case "sessions": return meetingKey === null ? Promise.resolve([]) : getSessionsByMeeting(meetingKey);
      }
    },
    enabled: canFetch && requestedKey === queryHash,
    staleTime: QUERY_STALE_TIME.standard,
    gcTime: QUERY_GC_TIME.standard,
  });

  const requested = requestedKey === queryHash;
  const refetch = useCallback(() => {
    if (requested) void query.refetch();
    setRequestedKey(queryHash);
  }, [query.refetch, queryHash, requested]);

  return {
    data: requested ? (query.data as Record<string, unknown>[] | undefined) ?? [] : [],
    loading: requested && query.isPending,
    error: requested ? errorMessage(query.error) : null,
    refetch,
  };
}

// ─── Circuit info ─────────────────────────────────────────────────────────────

export function useCircuitInfo(): { circuitInfo: CircuitInfo | null; loading: boolean } {
  const meetingKey = useSelectedMeetingKey();
  const { meetings } = useMeetings();
  const meeting = meetings.find((item) => item.meeting_key === meetingKey);
  const url = meeting?.circuit_info_url ?? null;
  const query = useQuery<CircuitInfo, Error>({
    queryKey: ["circuit-info", meetingKey, url],
    queryFn: async ({ signal }) => {
      const response = await fetch(url!, { headers: { Accept: "application/json" }, signal });
      if (!response.ok) throw new Error(`circuit_info fetch failed: ${response.status}`);
      const raw = await response.json() as { x: number[]; y: number[]; circuitName?: string; rotation?: number };
      return {
        x: raw.x ?? [],
        y: raw.y ?? [],
        circuitName: raw.circuitName ?? null,
        rotation: raw.rotation ?? null,
      };
    },
    enabled: Boolean(url),
    staleTime: QUERY_STALE_TIME.historical,
    gcTime: QUERY_GC_TIME.standard,
  });

  return { circuitInfo: query.data ?? null, loading: Boolean(url) && query.isPending };
}
