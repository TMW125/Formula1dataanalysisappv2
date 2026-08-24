/**
 * Explicit session-scoped data hooks.
 *
 * Session keys are passed by page-level resolvers. This keeps the selected
 * weekend global while preventing one page's session choice from leaking into
 * another page.
 */

import { useQuery } from "@tanstack/react-query";
import { useMeetings, useSelectedMeetingKey, useSelectedSeason, useSessions } from "../context/F1DataContext";
import {
  getCarData,
  getDrivers,
  getIntervals,
  getLaps,
  getPits,
  getPositions,
  getRaceControl,
  getSessionResults,
  getStints,
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
import { openF1QueryKey, openF1QueryKeys, type OpenF1Endpoint } from "../queryKeys";

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
  sessionKey: number | null,
  enabledOverride = true,
): FetchState<T> {
  const season = useSelectedSeason();
  const meetingKey = useSelectedMeetingKey();
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

export function useCurrentSession(sessionKey: number | null): Session | null {
  const { sessions } = useSessions();
  return sessions.find((session) => session.session_key === sessionKey) ?? null;
}

export function useDriversData(sessionKey: number | null, options: { enabled?: boolean } = {}): FetchState<OpenF1Driver> {
  return useSessionQuery("drivers", (key, signal) => getDrivers(key, undefined, signal), sessionKey, options.enabled ?? true);
}

export function useLapsData(sessionKey: number | null): FetchState<Lap> {
  return useSessionQuery("laps", (key, signal) => getLaps(key, undefined, signal), sessionKey);
}

export function useWeatherData(sessionKey: number | null): FetchState<Weather> {
  return useSessionQuery("weather", (key, signal) => getWeather(key, signal), sessionKey);
}

export function useStintsData(sessionKey: number | null): FetchState<Stint> {
  return useSessionQuery("stints", (key, signal) => getStints(key, undefined, signal), sessionKey);
}

export function usePitsData(sessionKey: number | null): FetchState<Pit> {
  return useSessionQuery("pits", (key, signal) => getPits(key, undefined, signal), sessionKey);
}

export function usePositionsData(sessionKey: number | null): FetchState<Position> {
  return useSessionQuery("positions", (key, signal) => getPositions(key, undefined, signal), sessionKey);
}

export function useIntervalsData(sessionKey: number | null): FetchState<Interval> {
  return useSessionQuery("intervals", (key, signal) => getIntervals(key, undefined, signal), sessionKey);
}

export function useRaceControlData(sessionKey: number | null): FetchState<RaceControlEvent> {
  return useSessionQuery("race_control", (key, signal) => getRaceControl(key, signal), sessionKey);
}

export function useSessionResultsData(sessionKey: number | null): FetchState<SessionResult> {
  return useSessionQuery("session_result", (key, signal) => getSessionResults(key, signal), sessionKey);
}

export function useCarDataForDriver(sessionKey: number | null, driverNumber: number | null): FetchState<CarData> {
  const season = useSelectedSeason();
  const meetingKey = useSelectedMeetingKey();
  const enabled = sessionKey !== null && meetingKey !== null && driverNumber !== null;
  const query = useQuery<CarData[], Error>({
    queryKey: enabled
      ? openF1QueryKeys.session(season, meetingKey, sessionKey, "car_data", driverNumber)
      : openF1QueryKey({ season, meetingKey, sessionKey, endpoint: "car_data", driverNumber }),
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
