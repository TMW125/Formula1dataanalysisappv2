import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { useSelectedMeetingKey, useSelectedSeason } from "../context/F1DataContext";
import { getCarDataRange } from "../services/openf1Api";
import type { CarData, Lap } from "../types/openf1";
import { QUERY_GC_TIME, QUERY_STALE_TIME } from "../queryClient";
import { openF1QueryKey } from "../queryKeys";
import {
  buildNormalizedTelemetry,
  getFastestValidLaps,
  type QualifyingTelemetrySeries,
} from "../utils/qualifyingTelemetry";

export interface QualifyingTelemetryDriverState {
  driverNumber: number;
  lap: Lap;
  points: QualifyingTelemetrySeries["points"];
  loading: boolean;
  error: string | null;
}

export interface QualifyingTelemetryState {
  series: QualifyingTelemetrySeries[];
  referenceDriverNumber: number | null;
  referenceTelemetryAvailable: boolean;
  loading: boolean;
  loadedCount: number;
  totalCount: number;
  missingLapDrivers: number[];
  unavailableTelemetryDrivers: number[];
  errors: string[];
}

export interface QualifyingTelemetryRequest {
  driverNumber: number;
  lap: Lap;
  from: string;
  to: string;
}

export const QUALIFYING_TELEMETRY_GUARD_MS = 2_000;

export function getQualifyingTelemetryBounds(lap: Lap): { from: string; to: string } | null {
  const start = Date.parse(lap.date_start);
  if (!Number.isFinite(start) || lap.lap_duration === null || !Number.isFinite(lap.lap_duration) || lap.lap_duration <= 0) {
    return null;
  }
  return {
    from: new Date(start - QUALIFYING_TELEMETRY_GUARD_MS).toISOString(),
    to: new Date(start + lap.lap_duration * 1_000 + QUALIFYING_TELEMETRY_GUARD_MS).toISOString(),
  };
}

export function buildQualifyingTelemetryRequests(
  sessionKey: number | null,
  selectedDriverNumbers: number[],
  fastestLaps: ReadonlyMap<number, Lap>,
): QualifyingTelemetryRequest[] {
  if (sessionKey === null) return [];

  return selectedDriverNumbers.flatMap((driverNumber) => {
    const lap = fastestLaps.get(driverNumber);
    if (!lap) return [];
    const bounds = getQualifyingTelemetryBounds(lap);
    return bounds ? [{ driverNumber, lap, ...bounds }] : [];
  });
}

function errorMessage(error: unknown): string | null {
  return error instanceof Error ? error.message : error ? "Unable to load car telemetry" : null;
}

export function useQualifyingTelemetryData(
  sessionKey: number | null,
  selectedDriverNumbers: number[],
  laps: Lap[],
): QualifyingTelemetryState {
  const season = useSelectedSeason();
  const meetingKey = useSelectedMeetingKey();
  const fastestLaps = useMemo(
    () => getFastestValidLaps(laps, selectedDriverNumbers),
    [laps, selectedDriverNumbers],
  );
  const requests = useMemo<QualifyingTelemetryRequest[]>(
    () => buildQualifyingTelemetryRequests(sessionKey, selectedDriverNumbers, fastestLaps),
    [fastestLaps, selectedDriverNumbers, sessionKey],
  );
  const referenceDriverNumber = useMemo(() => {
    const fastest = [...fastestLaps.entries()].sort((a, b) => {
      return (a[1].lap_duration ?? Infinity) - (b[1].lap_duration ?? Infinity);
    });
    return fastest[0]?.[0] ?? null;
  }, [fastestLaps]);
  const queries = useQueries({
    queries: requests.map(({ driverNumber, lap, from, to }) => ({
      queryKey: openF1QueryKey({
        season,
        meetingKey: meetingKey ?? lap.meeting_key,
        sessionKey: sessionKey ?? lap.session_key,
        endpoint: "car_data",
        driverNumber,
        from,
        to,
      }),
      queryFn: ({ signal }: { signal: AbortSignal }) => getCarDataRange(sessionKey!, driverNumber, from, to, signal),
      enabled: sessionKey !== null && meetingKey !== null,
      staleTime: QUERY_STALE_TIME.historical,
      gcTime: QUERY_GC_TIME.location,
    })),
  });

  const driverStates = useMemo<QualifyingTelemetryDriverState[]>(
    () => requests.map(({ driverNumber, lap }, index) => {
      const query = queries[index];
      const points = buildNormalizedTelemetry((query.data as CarData[] | undefined) ?? [], lap);
      return {
        driverNumber,
        lap,
        points,
        loading: query.isPending,
        error: errorMessage(query.error),
      };
    }),
    [queries, requests],
  );
  const series = useMemo(
    () => driverStates
      .filter((state) => state.points.length > 1)
      .map(({ driverNumber, lap, points }) => ({ driverNumber, lap, points })),
    [driverStates],
  );
  const missingLapDrivers = useMemo(
    () => selectedDriverNumbers.filter((driverNumber) => !fastestLaps.has(driverNumber)),
    [fastestLaps, selectedDriverNumbers],
  );
  const unavailableTelemetryDrivers = useMemo(
    () => {
      const requested = new Set(requests.map((request) => request.driverNumber));
      const invalidBounds = selectedDriverNumbers.filter(
        (driverNumber) => fastestLaps.has(driverNumber) && !requested.has(driverNumber),
      );
      const settledWithoutData = driverStates
        .filter((state) => !state.loading && (state.error !== null || state.points.length < 2))
        .map((state) => state.driverNumber);
      return [...invalidBounds, ...settledWithoutData];
    },
    [driverStates, fastestLaps, requests, selectedDriverNumbers],
  );
  const errors = useMemo(
    () => driverStates.flatMap((state) => state.error ? [`Driver #${state.driverNumber}: ${state.error}`] : []),
    [driverStates],
  );

  return {
    series,
    referenceDriverNumber,
    referenceTelemetryAvailable: referenceDriverNumber !== null && series.some((item) => item.driverNumber === referenceDriverNumber),
    loading: queries.some((query) => query.isPending),
    loadedCount: missingLapDrivers.length
      + unavailableTelemetryDrivers.filter((driverNumber) => !requests.some((request) => request.driverNumber === driverNumber)).length
      + queries.filter((query) => !query.isPending).length,
    totalCount: selectedDriverNumbers.length,
    missingLapDrivers,
    unavailableTelemetryDrivers,
    errors,
  };
}
