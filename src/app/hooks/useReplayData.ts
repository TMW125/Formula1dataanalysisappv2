import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import type {
  Interval,
  Lap,
  Location,
  OpenF1Driver,
  Overtake,
  Pit,
  Position,
  RaceControlEvent,
  Session,
  SessionResult,
  StartingGrid,
  Stint,
  TeamRadio,
  Weather,
} from "../types/openf1";
import type { ReplayDataset, ReplayLoadState } from "../replay/types";

export const LOCATION_WINDOW_MS = 5 * 60 * 1000;

type Baseline = Omit<ReplayDataset, "session" | "locations">;

const EMPTY_BASELINE: Baseline = {
  drivers: [], laps: [], positions: [], intervals: [], stints: [], pits: [],
  weather: [], raceControl: [], overtakes: [], teamRadio: [], startingGrid: [], results: [],
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown replay data error";
}

export function useReplayData(session: Session | null, currentTime: number): ReplayLoadState {
  const [baseline, setBaseline] = useState<Baseline | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [locationVersion, setLocationVersion] = useState(0);
  const [retryVersion, setRetryVersion] = useState(0);
  const locationCache = useRef(new Map<number, Location[]>());
  const locationRequests = useRef(new Map<number, AbortController>());

  const start = session ? Date.parse(session.date_start) : 0;
  const end = session ? Date.parse(session.date_end) : 0;
  const duration = Math.max(0, end - start);
  const maxChunk = Math.max(0, Math.ceil(duration / LOCATION_WINDOW_MS) - 1);
  const currentChunk = Math.min(maxChunk, Math.max(0, Math.floor((currentTime - start) / LOCATION_WINDOW_MS)));

  const fetchWindow = useCallback((chunk: number) => {
    if (!session || chunk < 0 || chunk > maxChunk || locationCache.current.has(chunk) || locationRequests.current.has(chunk)) return;
    const controller = new AbortController();
    locationRequests.current.set(chunk, controller);
    const from = start + chunk * LOCATION_WINDOW_MS;
    const to = Math.min(end + 1, from + LOCATION_WINDOW_MS);
    getLocationRange(session.session_key, new Date(from).toISOString(), new Date(to).toISOString(), controller.signal)
      .then((locations) => {
        locationCache.current.set(chunk, locations);
        setLocationVersion((version) => version + 1);
        setErrors((current) => {
          if (!current.location) return current;
          const next = { ...current };
          delete next.location;
          return next;
        });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setErrors((current) => ({ ...current, location: errorMessage(error) }));
      })
      .finally(() => locationRequests.current.delete(chunk));
  }, [session, start, end, maxChunk, retryVersion]);

  useEffect(() => {
    for (const controller of locationRequests.current.values()) controller.abort();
    locationRequests.current.clear();
    locationCache.current.clear();
    setLocationVersion((version) => version + 1);
    setBaseline(null);
    setErrors({});

    if (!session) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const signal = controller.signal;
    const sessionKey = session.session_key;
    setLoading(true);
    fetchWindow(0);

    const entries: Array<[keyof Baseline, Promise<unknown[]>]> = [
      ["drivers", getDrivers(sessionKey, undefined, signal)],
      ["laps", getLaps(sessionKey, undefined, signal)],
      ["positions", getPositions(sessionKey, undefined, signal)],
      ["stints", getStints(sessionKey, undefined, signal)],
      ["pits", getPits(sessionKey, undefined, signal)],
      ["weather", getWeather(sessionKey, signal)],
      ["raceControl", getRaceControl(sessionKey, signal)],
      ["teamRadio", getTeamRadio(sessionKey, undefined, signal)],
      ["results", getSessionResults(sessionKey, signal)],
    ];
    const isRace = session.session_type === "Race" || session.session_type === "Sprint";
    if (isRace) {
      entries.push(
        ["intervals", getIntervals(sessionKey, undefined, signal)],
        ["overtakes", getOvertakes(sessionKey, signal)],
        ["startingGrid", getStartingGrid(sessionKey, signal)]
      );
    }

    Promise.allSettled(entries.map(([, request]) => request)).then((settled) => {
      if (signal.aborted) return;
      const next: Baseline = { ...EMPTY_BASELINE };
      const nextErrors: Record<string, string> = {};
      settled.forEach((result, index) => {
        const key = entries[index][0] as keyof Baseline;
        if (result.status === "fulfilled") {
          (next[key] as unknown[]) = result.value as unknown[];
        } else if (!(result.reason instanceof DOMException && result.reason.name === "AbortError")) {
          nextErrors[key] = errorMessage(result.reason);
        }
      });
      setBaseline(next);
      setErrors((current) => ({ ...current, ...nextErrors }));
      setLoading(false);
    });

    return () => controller.abort();
  }, [session?.session_key, retryVersion, fetchWindow]);

  useEffect(() => {
    if (!session) return;
    fetchWindow(currentChunk);
    const chunkStart = start + currentChunk * LOCATION_WINDOW_MS;
    if (currentTime - chunkStart >= LOCATION_WINDOW_MS * 0.7) fetchWindow(currentChunk + 1);
  }, [session, currentChunk, currentTime, start, fetchWindow]);

  const locationReady = locationCache.current.has(currentChunk);
  const locations = useMemo(() => {
    const combined: Location[] = [];
    for (let chunk = currentChunk - 1; chunk <= currentChunk + 1; chunk += 1) {
      const values = locationCache.current.get(chunk);
      if (values) combined.push(...values);
    }
    return combined;
  }, [currentChunk, locationVersion]);

  const dataset = useMemo<ReplayDataset | null>(() => (
    session && baseline ? { session, ...baseline, locations } : null
  ), [session, baseline, locations]);

  return {
    dataset,
    loading,
    locationReady,
    buffering: Boolean(session && baseline && !locationReady),
    errors,
    retry: () => setRetryVersion((version) => version + 1),
  };
}
