import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { useSelectedMeetingKey, useSelectedSeason } from "../context/F1DataContext";
import { getDrivers } from "../services/openf1Api";
import type { OpenF1Driver } from "../types/openf1";
import { QUERY_GC_TIME, QUERY_STALE_TIME } from "../queryClient";
import { openF1QueryKeys } from "../queryKeys";
import type { PracticeSessionStatus } from "./useSessionScope";

export interface PracticeAnalysisDataset {
  sessionKey: number;
  drivers: OpenF1Driver[];
  loading: boolean;
  error: string | null;
}

export function usePracticeAnalysisData(practiceSessions: PracticeSessionStatus[]): PracticeAnalysisDataset[] {
  const season = useSelectedSeason();
  const meetingKey = useSelectedMeetingKey();
  const completed = useMemo(
    () => practiceSessions.filter((item) => item.status === "completed"),
    [practiceSessions],
  );
  const queries = useQueries({
    queries: completed.map(({ session }) => ({
        queryKey: openF1QueryKeys.session(season, meetingKey ?? session.meeting_key, session.session_key, "drivers"),
        queryFn: ({ signal }: { signal: AbortSignal }) => getDrivers(session.session_key, undefined, signal),
        enabled: meetingKey !== null,
        staleTime: QUERY_STALE_TIME.historical,
        gcTime: QUERY_GC_TIME.standard,
      })),
  });

  return completed.map(({ session }, index) => {
    const drivers = queries[index];
    return {
      sessionKey: session.session_key,
      drivers: (drivers.data as OpenF1Driver[] | undefined) ?? [],
      loading: drivers.isPending,
      error: drivers.error instanceof Error ? drivers.error.message : drivers.error ? "Unable to load practice data" : null,
    };
  });
}
