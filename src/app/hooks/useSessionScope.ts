import { useEffect, useMemo, useState } from "react";
import { useSelectedMeetingKey, useSessions } from "../context/F1DataContext";
import type { Session } from "../types/openf1";

export type SessionStatus = "loading" | "scheduled" | "in_progress" | "completed" | "missing" | "invalid";
export type ResolvedSessionScope = "race" | "qualifying";
export type ResolvedSessionVariant = "main" | "sprint";

export interface SessionResolution {
  session: Session | null;
  status: SessionStatus;
  supportsSprint: boolean;
}

export function getSessionStatus(session: Session, now = Date.now()): Exclude<SessionStatus, "loading" | "missing"> {
  const start = Date.parse(session.date_start);
  const end = Date.parse(session.date_end);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return "invalid";
  if (now < start) return "scheduled";
  if (now < end) return "in_progress";
  return "completed";
}

export function getLatestCompletedSession(sessions: Session[], now = Date.now()): Session | null {
  return sessions
    .filter((session) => getSessionStatus(session, now) === "completed")
    .sort((a, b) => Date.parse(b.date_end) - Date.parse(a.date_end))[0] ?? null;
}

function useCurrentTime() {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  return now;
}

function normalizedSessionName(session: Session) {
  return session.session_name.trim().toLowerCase();
}

export function isSprintSession(session: Session, scope: ResolvedSessionScope) {
  const sessionName = normalizedSessionName(session);
  if (scope === "qualifying") {
    return session.session_type === "Sprint Qualifying"
      || (session.session_type === "Qualifying" && sessionName === "sprint qualifying");
  }
  return session.session_type === "Sprint"
    || (session.session_type === "Race" && sessionName === "sprint");
}

function isMainSession(session: Session, scope: ResolvedSessionScope) {
  const sessionType = scope === "qualifying" ? "Qualifying" : "Race";
  return session.session_type === sessionType && !isSprintSession(session, scope);
}

export function resolveSession(
  sessions: Session[],
  scope: ResolvedSessionScope,
  variant: ResolvedSessionVariant,
  now = Date.now(),
): SessionResolution {
  const supportsSprint = sessions.some((session) => isSprintSession(session, scope));
  const session = sessions.find((candidate) => variant === "sprint"
    ? isSprintSession(candidate, scope)
    : isMainSession(candidate, scope)) ?? null;

  return {
    session,
    status: session ? getSessionStatus(session, now) : "missing",
    supportsSprint,
  };
}

export function useResolvedSession(
  scope: ResolvedSessionScope,
  variant: ResolvedSessionVariant,
): SessionResolution {
  const meetingKey = useSelectedMeetingKey();
  const { sessions, loading } = useSessions();
  const now = useCurrentTime();

  return useMemo(() => {
    if (meetingKey === null || loading) {
      return { session: null, status: "loading", supportsSprint: false };
    }

    return resolveSession(sessions, scope, variant, now);
  }, [loading, meetingKey, now, scope, sessions, variant]);
}

export function useLatestCompletedSession(): { session: Session | null; loading: boolean } {
  const { sessions, loading } = useSessions();
  const now = useCurrentTime();
  return {
    session: useMemo(() => getLatestCompletedSession(sessions, now), [now, sessions]),
    loading,
  };
}
