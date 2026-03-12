/**
 * F1DataContext
 *
 * Global state for the currently selected season, meeting and session.
 * Also drives the cascading fetches:
 *
 *   Season selected  →  fetch meetings, reset meeting + session
 *   Meeting selected →  fetch sessions, reset session
 *
 * All other data (laps, car data, positions, …) must be fetched by individual
 * pages/components using `selectedSessionKey` from this context.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";

import { getMeetingsBySeason, getSessionsByMeeting } from "../services/openf1Api";
import type { Meeting, Session } from "../types/openf1";

// ─── State ────────────────────────────────────────────────────────────────────

export interface F1DataState {
  // ─── Selections ──────────────────────────────────────────────────────────
  selectedSeason: string;
  selectedMeetingKey: number | null;
  selectedSessionKey: number | null;

  // ─── Meetings ─────────────────────────────────────────────────────────────
  meetings: Meeting[];
  meetingsLoading: boolean;
  meetingsError: string | null;

  // ─── Sessions ─────────────────────────────────────────────────────────────
  sessions: Session[];
  sessionsLoading: boolean;
  sessionsError: string | null;
}

const currentYear = String(new Date().getFullYear());

const initialState: F1DataState = {
  selectedSeason: currentYear,
  selectedMeetingKey: null,
  selectedSessionKey: null,

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
  | { type: "SET_SESSION_KEY"; payload: number | null }

  | { type: "MEETINGS_LOADING" }
  | { type: "MEETINGS_SUCCESS"; payload: Meeting[] }
  | { type: "MEETINGS_ERROR"; payload: string }

  | { type: "SESSIONS_LOADING" }
  | { type: "SESSIONS_SUCCESS"; payload: Session[] }
  | { type: "SESSIONS_ERROR"; payload: string };

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
        selectedSessionKey: null,
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
        selectedSessionKey: null,
        sessions: [],
        sessionsError: null,
      };

    case "SET_SESSION_KEY":
      return { ...state, selectedSessionKey: action.payload };

    // ── Meetings ──────────────────────────────────────────────────────────
    case "MEETINGS_LOADING":
      return { ...state, meetingsLoading: true, meetingsError: null };

    case "MEETINGS_SUCCESS":
      return { ...state, meetingsLoading: false, meetings: action.payload };

    case "MEETINGS_ERROR":
      return { ...state, meetingsLoading: false, meetingsError: action.payload };

    // ── Sessions ──────────────────────────────────────────────────────────
    case "SESSIONS_LOADING":
      return { ...state, sessionsLoading: true, sessionsError: null };

    case "SESSIONS_SUCCESS":
      return { ...state, sessionsLoading: false, sessions: action.payload };

    case "SESSIONS_ERROR":
      return { ...state, sessionsLoading: false, sessionsError: action.payload };

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
  setSessionKey: (sessionKey: number | null) => void;
}

const F1DataContext = createContext<F1DataContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

interface F1DataProviderProps {
  children: ReactNode;
}

export function F1DataProvider({ children }: F1DataProviderProps) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // ── Convenience setters ────────────────────────────────────────────────────

  const setSeason = useCallback((season: string) => {
    dispatch({ type: "SET_SEASON", payload: season });
  }, []);

  const setMeetingKey = useCallback((meetingKey: number | null) => {
    dispatch({ type: "SET_MEETING_KEY", payload: meetingKey });
  }, []);

  const setSessionKey = useCallback((sessionKey: number | null) => {
    dispatch({ type: "SET_SESSION_KEY", payload: sessionKey });
  }, []);

  // ── Effect: fetch meetings whenever the season changes ─────────────────────

  useEffect(() => {
    if (!state.selectedSeason) return;

    let cancelled = false;

    async function fetchMeetings() {
      dispatch({ type: "MEETINGS_LOADING" });
      try {
        const meetings = await getMeetingsBySeason(state.selectedSeason);
        if (!cancelled) {
          // Sort chronologically
          const sorted = [...meetings].sort(
            (a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime()
          );
          dispatch({ type: "MEETINGS_SUCCESS", payload: sorted });
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Failed to fetch meetings";
          dispatch({ type: "MEETINGS_ERROR", payload: message });
        }
      }
    }

    void fetchMeetings();
    return () => {
      cancelled = true;
    };
  }, [state.selectedSeason]);

  // ── Effect: fetch sessions whenever the selected meeting changes ───────────

  useEffect(() => {
    if (state.selectedMeetingKey === null) return;

    let cancelled = false;

    async function fetchSessions() {
      dispatch({ type: "SESSIONS_LOADING" });
      try {
        const sessions = await getSessionsByMeeting(state.selectedMeetingKey!);
        if (!cancelled) {
          // Sort chronologically so session options appear in weekend order
          const sorted = [...sessions].sort(
            (a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime()
          );
          dispatch({ type: "SESSIONS_SUCCESS", payload: sorted });
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Failed to fetch sessions";
          dispatch({ type: "SESSIONS_ERROR", payload: message });
        }
      }
    }

    void fetchSessions();
    return () => {
      cancelled = true;
    };
  }, [state.selectedMeetingKey]);

  return (
    <F1DataContext.Provider value={{ state, dispatch, setSeason, setMeetingKey, setSessionKey }}>
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
 * const { state, setSeason, setMeetingKey, setSessionKey } = useF1Data();
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

/** Returns the currently selected session_key (or null). */
export function useSelectedSessionKey() {
  return useF1Data().state.selectedSessionKey;
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
