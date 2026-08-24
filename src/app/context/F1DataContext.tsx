/**
 * F1DataContext
 *
 * Global state for the currently selected season and meeting.
 * Also drives the cascading fetches:
 *
 *   Season selected  →  fetch meetings, reset meeting
 *   Meeting selected →  fetch sessions
 *
 * All other data (laps, car data, positions, …) must be fetched by individual
 * pages after resolving a session from the current meeting's session list.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";

import { getMeetingsBySeason, getSessionsByMeeting } from "../services/openf1Api";
import type { Meeting, Session } from "../types/openf1";
import { QUERY_STALE_TIME, QUERY_GC_TIME } from "../queryClient";
import { openF1QueryKeys } from "../queryKeys";

// ─── State ────────────────────────────────────────────────────────────────────

export interface F1DataState {
  // ─── Selections ──────────────────────────────────────────────────────────
  selectedSeason: string;
  selectedMeetingKey: number | null;
  sessionModes: SessionModeState;

  // ─── Meetings ─────────────────────────────────────────────────────────────
  meetings: Meeting[];
  meetingsLoading: boolean;
  meetingsError: string | null;

  // ─── Sessions ─────────────────────────────────────────────────────────────
  sessions: Session[];
  sessionsLoading: boolean;
  sessionsError: string | null;
}

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

const currentYear = String(new Date().getFullYear());

const initialState: F1DataState = {
  selectedSeason: currentYear,
  selectedMeetingKey: null,
  sessionModes: DEFAULT_SESSION_MODES,

  meetings: [],
  meetingsLoading: false,
  meetingsError: null,

  sessions: [],
  sessionsLoading: false,
  sessionsError: null,
};

// ─── Actions ──────────────────────────────────────────────────────────────────

type Action =
  | { type: "SET_SEASON"; payload: string }
  | { type: "SET_MEETING_KEY"; payload: number | null }
  | { type: "SET_SESSION_MODE"; payload: { scope: SessionModeScope; variant: SessionVariant } };

// ─── Reducer ──────────────────────────────────────────────────────────────────

function reducer(state: F1DataState, action: Action): F1DataState {
  switch (action.type) {
    // ── Selections ────────────────────────────────────────────────────────
    case "SET_SEASON":
      return {
        ...state,
        selectedSeason: action.payload,
        // Reset downstream selections and data
        selectedMeetingKey: null,
        sessionModes: DEFAULT_SESSION_MODES,
        meetings: [],
        sessions: [],
        meetingsError: null,
        sessionsError: null,
      };

    case "SET_MEETING_KEY":
      return {
        ...state,
        selectedMeetingKey: action.payload,
        // Reset downstream selections and data
        sessionModes: DEFAULT_SESSION_MODES,
        sessions: [],
        sessionsError: null,
      };

    case "SET_SESSION_MODE":
      return {
        ...state,
        sessionModes: {
          ...state.sessionModes,
          [action.payload.scope]: action.payload.variant,
        },
      };

    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface F1DataContextValue {
  state: F1DataState;
  dispatch: Dispatch<Action>;

  // Convenience setters (wrap dispatch so consumers don't need to know about
  // action shapes)
  setSeason: (season: string) => void;
  setMeetingKey: (meetingKey: number | null) => void;
  setSessionMode: (scope: SessionModeScope, variant: SessionVariant) => void;
}

const F1DataContext = createContext<F1DataContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

interface F1DataProviderProps {
  children: ReactNode;
}

export function F1DataProvider({ children }: F1DataProviderProps) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const meetingsQuery = useQuery({
    queryKey: openF1QueryKeys.meetingsBySeason(state.selectedSeason),
    queryFn: () => getMeetingsBySeason(state.selectedSeason),
    enabled: Boolean(state.selectedSeason),
    staleTime: QUERY_STALE_TIME.historical,
    gcTime: QUERY_GC_TIME.standard,
  });

  const meetings = useMemo(() => {
    const now = new Date();
    return [...(meetingsQuery.data ?? [])]
      .filter((meeting) => new Date(meeting.date_start) <= now)
      .sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime());
  }, [meetingsQuery.data]);

  const sessionsQuery = useQuery({
    queryKey: openF1QueryKeys.sessionsByMeeting(
      state.selectedSeason,
      state.selectedMeetingKey ?? 0,
    ),
    queryFn: () => getSessionsByMeeting(state.selectedMeetingKey!),
    enabled: state.selectedMeetingKey !== null,
    staleTime: QUERY_STALE_TIME.historical,
    gcTime: QUERY_GC_TIME.standard,
  });

  const sessions = useMemo(
    () => [...(sessionsQuery.data ?? [])].sort(
      (a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime(),
    ),
    [sessionsQuery.data],
  );

  // ── Convenience setters ────────────────────────────────────────────────────

  const setSeason = useCallback((season: string) => {
    dispatch({ type: "SET_SEASON", payload: season });
  }, []);

  const setMeetingKey = useCallback((meetingKey: number | null) => {
    dispatch({ type: "SET_MEETING_KEY", payload: meetingKey });
  }, []);

  const setSessionMode = useCallback((scope: SessionModeScope, variant: SessionVariant) => {
    dispatch({ type: "SET_SESSION_MODE", payload: { scope, variant } });
  }, []);

  // Default to the latest meeting when a season's cached/query data arrives.
  useEffect(() => {
    if (state.selectedMeetingKey !== null || meetings.length === 0) return;
    dispatch({ type: "SET_MEETING_KEY", payload: meetings[meetings.length - 1].meeting_key });
  }, [meetings, state.selectedMeetingKey]);

  const contextState = useMemo<F1DataState>(() => ({
    ...state,
    meetings,
    meetingsLoading: meetingsQuery.isLoading,
    meetingsError: meetingsQuery.error instanceof Error ? meetingsQuery.error.message : null,
    sessions,
    sessionsLoading: sessionsQuery.isLoading,
    sessionsError: sessionsQuery.error instanceof Error ? sessionsQuery.error.message : null,
  }), [
    meetings,
    meetingsQuery.error,
    meetingsQuery.isLoading,
    sessions,
    sessionsQuery.error,
    sessionsQuery.isLoading,
    state,
  ]);

  return (
    <F1DataContext.Provider value={{ state: contextState, dispatch, setSeason, setMeetingKey, setSessionMode }}>
      {children}
    </F1DataContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Access the global F1 data context.
 *
 * @throws If used outside of `<F1DataProvider>`.
 *
 * @example
 * const { state, setSeason, setMeetingKey, setSessionMode } = useF1Data();
 */
export function useF1Data(): F1DataContextValue {
  const ctx = useContext(F1DataContext);
  if (!ctx) {
    throw new Error("useF1Data must be used within a <F1DataProvider>");
  }
  return ctx;
}

// ─── Selector Hooks ───────────────────────────────────────────────────────────
// Fine-grained hooks that avoid unnecessary re-renders in consuming components.

/** Returns the currently selected season year as a string, e.g. "2024". */
export function useSelectedSeason() {
  return useF1Data().state.selectedSeason;
}

/** Returns the currently selected meeting_key (or null). */
export function useSelectedMeetingKey() {
  return useF1Data().state.selectedMeetingKey;
}

/** Returns the selected page-specific main/sprint mode. */
export function useSessionMode(scope: SessionModeScope): SessionVariant {
  return useF1Data().state.sessionModes[scope];
}

/** Returns the full list of meetings for the current season. */
export function useMeetings() {
  const { state } = useF1Data();
  return {
    meetings: state.meetings,
    loading: state.meetingsLoading,
    error: state.meetingsError,
  };
}

/** Returns the full list of sessions for the current meeting. */
export function useSessions() {
  const { state } = useF1Data();
  return {
    sessions: state.sessions,
    loading: state.sessionsLoading,
    error: state.sessionsError,
  };
}
