import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useQueries,
  useQueryClient,
  type QueryFunctionContext,
  type UseQueryResult,
} from "@tanstack/react-query";
import {
  getDrivers,
  getIntervals,
  getLaps,
  getLocationRange,
  getOvertakes,
  getPits,
  getPositions,
  getRaceControl,
  getSessionResults,
  getStartingGrid,
  getStints,
  getTeamRadio,
  getWeather,
} from "../services/openf1Api";
import type { Location, Session } from "../types/openf1";
import { getReplayEnd } from "../replay/replayEngine";
import type { ReplayDataset, ReplayLoadState, ReplayOptionalDataKey } from "../replay/types";
import { QUERY_GC_TIME, QUERY_STALE_TIME } from "../queryClient";
import { openF1QueryKey, type OpenF1Endpoint } from "../queryKeys";

export const LOCATION_WINDOW_MS = 5 * 60 * 1000;

type Baseline = Omit<ReplayDataset, "session" | "locations">;
export type ReplayOptionalEndpoint = ReplayOptionalDataKey;

interface ReplayQueryDefinition {
  key: string;
  endpoint: string;
  queryKey: ReturnType<typeof openF1QueryKey>;
  queryFn: (context: QueryFunctionContext) => Promise<unknown[]>;
}

interface OptionalRequestState {
  requested: ReadonlySet<ReplayOptionalEndpoint>;
  queue: ReplayOptionalEndpoint[];
}

const EMPTY_BASELINE: Baseline = {
  drivers: [],
  laps: [],
  positions: [],
  intervals: [],
  stints: [],
  pits: [],
  weather: [],
  raceControl: [],
  overtakes: [],
  teamRadio: [],
  startingGrid: [],
  results: [],
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown replay data error";
}

function isSettled(query: UseQueryResult<unknown, Error>): boolean {
  return query.isSuccess || query.isError;
}

function dataFor<T>(query: UseQueryResult<unknown, Error> | undefined): T[] {
  return (query?.data as T[] | undefined) ?? [];
}

function sessionQueryKey(
  season: number,
  meetingKey: number,
  sessionKey: number,
  endpoint: OpenF1Endpoint,
) {
  return openF1QueryKey({ season, meetingKey, sessionKey, endpoint });
}

function sessionDataStaleTime(session: Session): number {
  return Date.parse(session.date_end) <= Date.now()
    ? QUERY_STALE_TIME.historical
    : QUERY_STALE_TIME.standard;
}

function locationWindow(session: Session, chunk: number, end: number) {
  const fromMs = Date.parse(session.date_start) + chunk * LOCATION_WINDOW_MS;
  const toMs = Math.min(end + 1, fromMs + LOCATION_WINDOW_MS);
  return {
    from: new Date(fromMs).toISOString(),
    to: new Date(toMs).toISOString(),
  };
}

/**
 * Loads replay data in two tiers:
 *
 * 1. The six sources needed to draw the first classification and map frame.
 * 2. Optional sources explicitly requested by the visible replay UI, one at a
 *    time, so a replay never creates an optional request burst.
 *
 * Location is a separate bounded query per five-minute chunk. TanStack Query
 * owns those chunks in memory, so scrubbing back to a previous window reuses
 * the cached result and never asks for the full-session location payload.
 */
export function useReplayData(session: Session | null, currentTime: number): ReplayLoadState {
  const queryClient = useQueryClient();
  const [optionalState, setOptionalState] = useState<OptionalRequestState>({
    requested: new Set(),
    queue: [],
  });

  const sessionKey = session?.session_key ?? null;
  const season = session?.year ?? null;
  const meetingKey = session?.meeting_key ?? null;
  const start = session ? Date.parse(session.date_start) : 0;
  const sessionEnd = session ? Date.parse(session.date_end) : 0;
  const staleTime = session ? sessionDataStaleTime(session) : QUERY_STALE_TIME.standard;

  useEffect(() => {
    setOptionalState({ requested: new Set(), queue: [] });
  }, [sessionKey]);

  const coreDefinitions = useMemo<ReplayQueryDefinition[]>(() => {
    if (!session || season === null || meetingKey === null) return [];
    const key = session.session_key;
    return [
      {
        key: "drivers",
        endpoint: "drivers",
        queryKey: sessionQueryKey(season, meetingKey, key, "drivers"),
        queryFn: ({ signal }) => getDrivers(key, undefined, signal),
      },
      {
        key: "laps",
        endpoint: "laps",
        queryKey: sessionQueryKey(season, meetingKey, key, "laps"),
        queryFn: ({ signal }) => getLaps(key, undefined, signal),
      },
      {
        key: "positions",
        endpoint: "positions",
        queryKey: sessionQueryKey(season, meetingKey, key, "positions"),
        queryFn: ({ signal }) => getPositions(key, undefined, signal),
      },
      {
        key: "stints",
        endpoint: "stints",
        queryKey: sessionQueryKey(season, meetingKey, key, "stints"),
        queryFn: ({ signal }) => getStints(key, undefined, signal),
      },
      {
        key: "pits",
        endpoint: "pits",
        queryKey: sessionQueryKey(season, meetingKey, key, "pits"),
        queryFn: ({ signal }) => getPits(key, undefined, signal),
      },
      {
        key: "results",
        endpoint: "results",
        queryKey: sessionQueryKey(season, meetingKey, key, "session_result"),
        queryFn: ({ signal }) => getSessionResults(key, signal),
      },
    ];
  }, [meetingKey, season, session]);

  const coreQueries = useQueries({
    queries: coreDefinitions.map((definition) => ({
      queryKey: definition.queryKey,
      queryFn: definition.queryFn,
      enabled: Boolean(session),
      staleTime,
      gcTime: QUERY_GC_TIME.standard,
    })),
  });
  const coreReady = Boolean(session)
    && coreQueries.length === coreDefinitions.length
    && coreQueries.every(isSettled);
  const coreLoading = Boolean(session) && coreQueries.some((query) => query.isPending);

  const baseline = useMemo<Baseline | null>(() => {
    if (!coreReady) return null;
    const next: Baseline = { ...EMPTY_BASELINE };
    coreDefinitions.forEach((definition, index) => {
      (next[definition.key as keyof Baseline] as unknown[]) = dataFor(coreQueries[index]);
    });
    return next;
  }, [coreDefinitions, coreQueries, coreReady]);

  const optionalDefinitions = useMemo<ReplayQueryDefinition[]>(() => {
    if (!session || season === null || meetingKey === null) return [];
    const key = session.session_key;
    return [
      {
        key: "weather",
        endpoint: "weather",
        queryKey: sessionQueryKey(season, meetingKey, key, "weather"),
        queryFn: ({ signal }) => getWeather(key, signal),
      },
      {
        key: "raceControl",
        endpoint: "raceControl",
        queryKey: sessionQueryKey(season, meetingKey, key, "race_control"),
        queryFn: ({ signal }) => getRaceControl(key, signal),
      },
      {
        key: "intervals",
        endpoint: "intervals",
        queryKey: sessionQueryKey(season, meetingKey, key, "intervals"),
        queryFn: ({ signal }) => getIntervals(key, undefined, signal),
      },
      {
        key: "startingGrid",
        endpoint: "startingGrid",
        queryKey: sessionQueryKey(season, meetingKey, key, "starting_grid"),
        queryFn: ({ signal }) => getStartingGrid(key, signal),
      },
      {
        key: "teamRadio",
        endpoint: "teamRadio",
        queryKey: sessionQueryKey(season, meetingKey, key, "team_radio"),
        queryFn: ({ signal }) => getTeamRadio(key, undefined, signal),
      },
      {
        key: "overtakes",
        endpoint: "overtakes",
        queryKey: sessionQueryKey(season, meetingKey, key, "overtakes"),
        queryFn: ({ signal }) => getOvertakes(key, signal),
      },
    ];
  }, [meetingKey, season, session]);

  const activeOptional = optionalState.queue[0] ?? null;
  const optionalQueries = useQueries({
    queries: optionalDefinitions.map((definition) => ({
      queryKey: definition.queryKey,
      queryFn: definition.queryFn,
      enabled: coreReady && activeOptional === definition.endpoint,
      staleTime,
      gcTime: QUERY_GC_TIME.standard,
    })),
  });

  useEffect(() => {
    if (!coreReady || activeOptional === null) return;
    const index = optionalDefinitions.findIndex((definition) => definition.endpoint === activeOptional);
    const query = index >= 0 ? optionalQueries[index] : undefined;
    if (!query || !isSettled(query)) return;
    setOptionalState((current) => current.queue[0] === activeOptional
      ? { ...current, queue: current.queue.slice(1) }
      : current);
  }, [activeOptional, coreReady, optionalDefinitions, optionalQueries]);

  const optionalData = useMemo<Partial<Baseline>>(() => {
    const next: Partial<Baseline> = {};
    optionalDefinitions.forEach((definition, index) => {
      (next[definition.key as keyof Baseline] as unknown[]) = dataFor(optionalQueries[index]);
    });
    return next;
  }, [optionalDefinitions, optionalQueries]);

  const replayEnd = session && baseline
    ? getReplayEnd({ session, ...baseline, ...optionalData, locations: [] })
    : sessionEnd;
  const locationEnd = Number.isFinite(replayEnd) && replayEnd > start
    ? replayEnd
    : Math.max(start, sessionEnd);
  const duration = Math.max(0, locationEnd - start);
  const maxChunk = Math.max(0, Math.ceil(duration / LOCATION_WINDOW_MS) - 1);
  const currentChunk = Math.min(
    maxChunk,
    Math.max(0, Math.floor((currentTime - start) / LOCATION_WINDOW_MS)),
  );
  const chunkStart = start + currentChunk * LOCATION_WINDOW_MS;
  const shouldPrefetchNext = currentTime - chunkStart >= LOCATION_WINDOW_MS * 0.7;
  const nextChunk = currentChunk + 1;

  const locationDefinitions = useMemo(() => {
    if (!session || season === null || meetingKey === null || baseline === null) {
      return [null, null] as const;
    }
    const makeDefinition = (chunk: number): ReplayQueryDefinition | null => {
      if (chunk < 0 || chunk > maxChunk) return null;
      const window = locationWindow(session, chunk, locationEnd);
      return {
        key: "locations",
        endpoint: "location",
        queryKey: openF1QueryKey({
          season,
          meetingKey,
          sessionKey,
          endpoint: "location",
          from: window.from,
          to: window.to,
          chunk,
        }),
        queryFn: ({ signal }) => getLocationRange(session.session_key, window.from, window.to, signal),
      };
    };
    return [makeDefinition(currentChunk), makeDefinition(nextChunk)] as const;
  }, [baseline, currentChunk, locationEnd, maxChunk, meetingKey, nextChunk, season, session, sessionKey]);

  const locationQueries = useQueries({
    queries: locationDefinitions.map((definition, index) => ({
      queryKey: definition?.queryKey ?? openF1QueryKey({ endpoint: "location", chunk: index }),
      queryFn: definition?.queryFn ?? (async () => []),
      enabled: Boolean(definition) && (index === 0 || shouldPrefetchNext),
      staleTime: QUERY_STALE_TIME.location,
      gcTime: QUERY_GC_TIME.location,
    })),
  });
  const currentLocationQuery = locationQueries[0];
  const nextLocationQuery = locationQueries[1];

  const locations = useMemo(() => {
    if (!session || baseline === null) return [];
    const combined: Location[] = [];
    const previousChunk = currentChunk - 1;
    if (previousChunk >= 0) {
      const previousWindow = locationWindow(session, previousChunk, locationEnd);
      const previousKey = openF1QueryKey({
        season: season!,
        meetingKey: meetingKey!,
        sessionKey: session.session_key,
        endpoint: "location",
        from: previousWindow.from,
        to: previousWindow.to,
        chunk: previousChunk,
      });
      combined.push(...(queryClient.getQueryData<Location[]>(previousKey) ?? []));
    }
    combined.push(...dataFor<Location>(currentLocationQuery));
    combined.push(...dataFor<Location>(nextLocationQuery));
    return combined;
  }, [
    baseline,
    currentChunk,
    currentLocationQuery,
    locationEnd,
    meetingKey,
    nextLocationQuery,
    queryClient,
    season,
    session,
  ]);

  const dataset = useMemo<ReplayDataset | null>(() => (
    session && baseline
      ? { session, ...baseline, ...optionalData, locations }
      : null
  ), [baseline, locations, optionalData, session]);

  const errors = useMemo<Record<string, string>>(() => {
    const next: Record<string, string> = {};
    coreDefinitions.forEach((definition, index) => {
      const error = coreQueries[index]?.error;
      if (error) next[definition.key] = errorMessage(error);
    });
    optionalDefinitions.forEach((definition, index) => {
      const error = optionalQueries[index]?.error;
      if (error) next[definition.key] = errorMessage(error);
    });
    if (currentLocationQuery?.error) next.location = errorMessage(currentLocationQuery.error);
    return next;
  }, [coreDefinitions, coreQueries, currentLocationQuery?.error, optionalDefinitions, optionalQueries]);

  const loadOptional = useCallback((endpoint: ReplayOptionalEndpoint) => {
    if (sessionKey === null) return;
    setOptionalState((current) => {
      if (current.requested.has(endpoint)) return current;
      return {
        requested: new Set([...current.requested, endpoint]),
        queue: [...current.queue, endpoint],
      };
    });
  }, [sessionKey]);

  const retry = useCallback(() => {
    coreQueries.forEach((query) => {
      if (query.isError) void query.refetch();
    });
    optionalQueries.forEach((query) => {
      if (query.isError) void query.refetch();
    });
    if (currentLocationQuery?.isError) void currentLocationQuery.refetch();
  }, [coreQueries, currentLocationQuery, optionalQueries]);

  return {
    dataset,
    loading: coreLoading,
    locationReady: Boolean(currentLocationQuery?.isSuccess),
    buffering: Boolean(session && baseline && !currentLocationQuery?.isSuccess),
    errors,
    retry,
    loadOptional,
  };
}
