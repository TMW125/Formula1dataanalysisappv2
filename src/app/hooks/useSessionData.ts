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
import { useF1Data, useSelectedSessionKey, useSessions } from "../context/F1DataContext";
import {
  getCarData,
  getDrivers,
  getIntervals,
  getLaps,
  getPits,
  getPositions,
  getRaceControl,
  getStints,
  getWeather,
} from "../services/openf1Api";
import type {
  CarData,
  Interval,
  Lap,
  OpenF1Driver,
  Pit,
  Position,
  RaceControlEvent,
  Session,
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
  | "weather";

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

    const fetchers: Record<ExplorerEndpoint, () => Promise<unknown[]>> = {
      laps: () => getLaps(sessionKey, driverNumber ?? undefined),
      car_data: () => getCarData(sessionKey, driverNumber ?? undefined),
      drivers: () => getDrivers(sessionKey, driverNumber ?? undefined),
      positions: () => getPositions(sessionKey, driverNumber ?? undefined),
      stints: () => getStints(sessionKey, driverNumber ?? undefined),
      weather: () => getWeather(sessionKey),
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
  }, [sessionKey, endpoint, driverNumber, trigger]);

  return { data, loading, error, refetch };
}
