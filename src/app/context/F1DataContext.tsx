import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router";
import { getMeetingsBySeason, getSessionsByMeeting } from "../services/openf1Api";
import type { Meeting, Session } from "../types/openf1";
import { QUERY_GC_TIME, QUERY_STALE_TIME } from "../queryClient";
import { openF1QueryKeys } from "../queryKeys";

const FIRST_SUPPORTED_SEASON = 2023;

export type SessionVariant = "main" | "sprint";
export type SessionModeScope = "raceStrategy" | "liveReplay" | "qualifying";

export interface SessionModeState {
  raceStrategy: SessionVariant;
  liveReplay: SessionVariant;
  qualifying: SessionVariant;
}

const DEFAULT_SESSION_MODES: SessionModeState = {
  raceStrategy: "main",
  liveReplay: "main",
  qualifying: "main",
};

export interface F1DataState {
  selectedSeason: string;
  selectedMeetingKey: number | null;
  sessionModes: SessionModeState;
  meetings: Meeting[];
  meetingsLoading: boolean;
  meetingsError: string | null;
  sessions: Session[];
  sessionsLoading: boolean;
  sessionsError: string | null;
}

interface F1DataContextValue {
  state: F1DataState;
  setSeason: (season: string) => void;
  setMeetingKey: (meetingKey: number | null) => void;
  setSessionMode: (scope: SessionModeScope, variant: SessionVariant) => void;
  refetchMeetings: () => void;
  refetchSessions: () => void;
}

const F1DataContext = createContext<F1DataContextValue | null>(null);

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : error ? "Unknown error" : null;
}

function parseSeason(value: string | null) {
  const currentYear = new Date().getFullYear();
  const year = Number(value);
  return Number.isInteger(year) && year >= FIRST_SUPPORTED_SEASON && year <= currentYear
    ? year
    : currentYear;
}

interface ModeSelection {
  selectionKey: string;
  modes: SessionModeState;
}

export function F1DataProvider({ children, enabled = true }: { children: ReactNode; enabled?: boolean }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedSeason, setSelectedSeason] = useState(() => String(new Date().getFullYear()));
  const [requestedMeetingKey, setRequestedMeetingKey] = useState<number | null>(null);

  useEffect(() => {
    if (!searchParams.has("season") && !searchParams.has("meeting")) return;
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("season");
      next.delete("meeting");
      return next;
    }, { replace: true });
  }, [searchParams, setSearchParams]);

  const meetingsQuery = useQuery({
    queryKey: openF1QueryKeys.meetingsBySeason(selectedSeason),
    queryFn: () => getMeetingsBySeason(selectedSeason),
    enabled,
    staleTime: QUERY_STALE_TIME.historical,
    gcTime: QUERY_GC_TIME.standard,
  });

  const meetings = useMemo(() => {
    const now = Date.now();
    return [...(meetingsQuery.data ?? [])]
      .filter((meeting) => {
        const start = Date.parse(meeting.date_start);
        return Number.isFinite(start) && start <= now;
      })
      .sort((a, b) => Date.parse(a.date_start) - Date.parse(b.date_start));
  }, [meetingsQuery.data]);

  const selectedMeetingKey = meetings.some((meeting) => meeting.meeting_key === requestedMeetingKey)
    ? requestedMeetingKey
    : null;

  useEffect(() => {
    if (!enabled || !meetingsQuery.isSuccess) return;

    if (meetings.length > 0) {
      if (selectedMeetingKey === null) setRequestedMeetingKey(meetings.at(-1)!.meeting_key);
      return;
    }

    if (Number(selectedSeason) > FIRST_SUPPORTED_SEASON) {
      setSelectedSeason(String(Number(selectedSeason) - 1));
      setRequestedMeetingKey(null);
    } else if (requestedMeetingKey !== null) {
      setRequestedMeetingKey(null);
    }
  }, [
    meetings,
    enabled,
    meetingsQuery.isSuccess,
    requestedMeetingKey,
    selectedMeetingKey,
    selectedSeason,
  ]);

  const sessionsQuery = useQuery({
    queryKey: openF1QueryKeys.sessionsByMeeting(selectedSeason, selectedMeetingKey ?? 0),
    queryFn: () => getSessionsByMeeting(selectedMeetingKey!),
    enabled: enabled && selectedMeetingKey !== null,
    staleTime: QUERY_STALE_TIME.historical,
    gcTime: QUERY_GC_TIME.standard,
  });

  const sessions = useMemo(
    () => [...(sessionsQuery.data ?? [])].sort((a, b) => Date.parse(a.date_start) - Date.parse(b.date_start)),
    [sessionsQuery.data],
  );

  const selectionKey = `${selectedSeason}:${selectedMeetingKey ?? "none"}`;
  const [modeSelection, setModeSelection] = useState<ModeSelection>({
    selectionKey,
    modes: DEFAULT_SESSION_MODES,
  });
  const sessionModes = modeSelection.selectionKey === selectionKey
    ? modeSelection.modes
    : DEFAULT_SESSION_MODES;

  const setSeason = useCallback((season: string) => {
    setSelectedSeason(String(parseSeason(season)));
    setRequestedMeetingKey(null);
  }, []);

  const setMeetingKey = useCallback((meetingKey: number | null) => {
    setRequestedMeetingKey(meetingKey);
  }, []);

  const setSessionMode = useCallback((scope: SessionModeScope, variant: SessionVariant) => {
    setModeSelection((current) => ({
      selectionKey,
      modes: {
        ...(current.selectionKey === selectionKey ? current.modes : DEFAULT_SESSION_MODES),
        [scope]: variant,
      },
    }));
  }, [selectionKey]);

  const state = useMemo<F1DataState>(() => ({
    selectedSeason,
    selectedMeetingKey,
    sessionModes,
    meetings,
    meetingsLoading: enabled && meetingsQuery.isPending,
    meetingsError: enabled ? errorMessage(meetingsQuery.error) : null,
    sessions,
    sessionsLoading: enabled && selectedMeetingKey !== null && sessionsQuery.isPending,
    sessionsError: enabled && selectedMeetingKey !== null ? errorMessage(sessionsQuery.error) : null,
  }), [
    meetings,
    enabled,
    meetingsQuery.error,
    meetingsQuery.isPending,
    selectedMeetingKey,
    selectedSeason,
    sessionModes,
    sessions,
    sessionsQuery.error,
    sessionsQuery.isPending,
  ]);

  const value = useMemo<F1DataContextValue>(() => ({
    state,
    setSeason,
    setMeetingKey,
    setSessionMode,
    refetchMeetings: () => { void meetingsQuery.refetch(); },
    refetchSessions: () => { void sessionsQuery.refetch(); },
  }), [meetingsQuery, sessionsQuery, setMeetingKey, setSeason, setSessionMode, state]);

  return <F1DataContext.Provider value={value}>{children}</F1DataContext.Provider>;
}

export function useF1Data(): F1DataContextValue {
  const context = useContext(F1DataContext);
  if (!context) throw new Error("useF1Data must be used within a <F1DataProvider>");
  return context;
}

export function useSelectedSeason() {
  return useF1Data().state.selectedSeason;
}

export function useSelectedMeetingKey() {
  return useF1Data().state.selectedMeetingKey;
}

export function useSessionMode(scope: SessionModeScope): SessionVariant {
  return useF1Data().state.sessionModes[scope];
}

export function useMeetings() {
  const { state, refetchMeetings } = useF1Data();
  return {
    meetings: state.meetings,
    loading: state.meetingsLoading,
    error: state.meetingsError,
    refetch: refetchMeetings,
  };
}

export function useSessions() {
  const { state, refetchSessions } = useF1Data();
  return {
    sessions: state.sessions,
    loading: state.sessionsLoading,
    error: state.sessionsError,
    refetch: refetchSessions,
  };
}
