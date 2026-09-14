import { CalendarClock, Flag, Info } from "lucide-react";
import type { Session } from "../types/openf1";
import type { SessionStatus } from "../hooks/useSessionScope";

interface SessionAvailabilityProps {
  session: Session | null;
  status: Exclude<SessionStatus, "loading">;
  title?: string;
}

function formatSchedule(session: Session) {
  const start = new Date(session.date_start).toLocaleString();
  const end = new Date(session.date_end).toLocaleString();
  return `${start} – ${end}`;
}

export function SessionAvailability({ session, status, title = "Session unavailable" }: SessionAvailabilityProps) {
  if (status === "missing" || !session) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-border bg-card p-8 text-center">
        <Info className="mb-3 h-10 w-10 text-muted-foreground" aria-hidden="true" />
        <h2 className="text-xl">{title}</h2>
        <p className="mt-2 max-w-lg text-sm text-muted-foreground">Select a season and race weekend from the sidebar, or this weekend may not include the requested session.</p>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-6">
        <h2 className="text-xl">{session.session_name} unavailable</h2>
        <p className="mt-2 text-sm text-muted-foreground">This session has invalid scheduling information.</p>
      </div>
    );
  }

  const inProgress = status === "in_progress";
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-border bg-card p-8 text-center">
      {inProgress ? <Flag className="mb-3 h-10 w-10 text-primary" aria-hidden="true" /> : <CalendarClock className="mb-3 h-10 w-10 text-primary" aria-hidden="true" />}
      <h2 className="text-xl">{inProgress ? `${session.session_name} is in progress` : `${session.session_name} has not occurred yet`}</h2>
      <p className="mt-2 max-w-lg text-sm text-muted-foreground">Analysis and replay will be available after the session ends.</p>
      <p className="mt-3 text-xs text-muted-foreground">Scheduled: {formatSchedule(session)}</p>
    </div>
  );
}
