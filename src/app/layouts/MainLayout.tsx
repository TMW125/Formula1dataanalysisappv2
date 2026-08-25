import { Suspense, useMemo } from "react";
import { NavLink, Outlet } from "react-router";
import { Activity, ChevronRight, Dumbbell, LayoutDashboard, RadioTower, Target, TrendingUp } from "lucide-react";
import packageMetadata from "../../../package.json";
import { ErrorState, PageLoading } from "../components/AsyncState";
import { Badge } from "../components/ui/badge";
import { useF1Data, useMeetings, useSessions } from "../context/F1DataContext";

const currentYear = new Date().getFullYear();
const AVAILABLE_SEASONS = Array.from(
  { length: currentYear - 2023 + 1 },
  (_, index) => String(currentYear - index),
);

function formatMeetingLabel(meeting: { meeting_name: string; location: string }) {
  return `${meeting.meeting_name} — ${meeting.location}`;
}

function buildMeetingLabels(meetings: Array<{ meeting_key: number; meeting_name: string; location: string }>) {
  const totals = new Map<string, number>();
  for (const meeting of meetings) {
    const label = formatMeetingLabel(meeting);
    totals.set(label, (totals.get(label) ?? 0) + 1);
  }

  const occurrences = new Map<string, number>();
  return new Map(meetings.map((meeting) => {
    const label = formatMeetingLabel(meeting);
    if ((totals.get(label) ?? 0) === 1) return [meeting.meeting_key, label];
    const occurrence = (occurrences.get(label) ?? 0) + 1;
    occurrences.set(label, occurrence);
    return [meeting.meeting_key, `${meeting.meeting_name} ${occurrence} — ${meeting.location}`];
  }));
}

export function MainLayout() {
  const { state, setSeason, setMeetingKey } = useF1Data();
  const { meetings, loading: meetingsLoading, error: meetingsError, refetch: refetchMeetings } = useMeetings();
  const { sessions, loading: sessionsLoading, error: sessionsError, refetch: refetchSessions } = useSessions();
  const meetingLabels = useMemo(() => buildMeetingLabels(meetings), [meetings]);
  const sessionTabsLoading = sessionsLoading || state.selectedMeetingKey === null;
  const hasSessionType = (...sessionTypes: string[]) => sessions.some((session) => sessionTypes.includes(session.session_type));

  const navItems = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard", available: true, comingSoon: false },
    { to: "/practice", icon: Dumbbell, label: "Practice", available: false, comingSoon: true },
    { to: "/qualifying", icon: Target, label: "Qualifying", available: !sessionTabsLoading && hasSessionType("Qualifying", "Sprint Qualifying"), comingSoon: false },
    { to: "/race", icon: TrendingUp, label: "Race", available: !sessionTabsLoading && hasSessionType("Race", "Sprint"), comingSoon: false },
    { to: "/live-replay", icon: RadioTower, label: "Live Replay", available: !sessionTabsLoading && hasSessionType("Race", "Sprint"), comingSoon: false },
  ];

  const shellError = meetingsError
    ? { title: "Race weekends could not be loaded", message: meetingsError, retry: refetchMeetings }
    : sessionsError
      ? { title: "Weekend sessions could not be loaded", message: sessionsError, retry: refetchSessions }
      : null;

  return (
    <div className="flex h-screen min-w-0 overflow-hidden bg-background">
      <aside className="flex w-64 shrink-0 flex-col overflow-y-auto border-r border-sidebar-border bg-sidebar">
        <div className="border-b border-sidebar-border p-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-primary">
              <Activity className="h-5 w-5 text-primary-foreground" aria-hidden="true" />
            </div>
            <div>
              <h1 className="font-bold tracking-tight text-sidebar-foreground">F1 Analytics</h1>
              <p className="text-xs text-muted-foreground">OpenF1 Data Platform</p>
            </div>
          </div>
        </div>

        <section className="space-y-3 border-b border-sidebar-border p-4" aria-label="Race weekend selection">
          <label className="block text-xs text-sidebar-foreground">
            <span className="mb-1 block text-muted-foreground">Year</span>
            <select
              value={state.selectedSeason}
              onChange={(event) => setSeason(event.target.value)}
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Select season"
            >
              {AVAILABLE_SEASONS.map((season) => <option key={season} value={season}>{season}</option>)}
            </select>
          </label>
          <label className="block text-xs text-sidebar-foreground">
            <span className="mb-1 block text-muted-foreground">Race weekend</span>
            <select
              value={state.selectedMeetingKey ?? ""}
              onChange={(event) => setMeetingKey(event.target.value ? Number(event.target.value) : null)}
              disabled={meetingsLoading || Boolean(meetingsError) || meetings.length === 0}
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Select race weekend"
            >
              <option value="">{meetingsLoading ? "Loading…" : meetingsError ? "Failed to load" : "Select race weekend"}</option>
              {meetings.map((meeting) => (
                <option key={meeting.meeting_key} value={meeting.meeting_key}>{meetingLabels.get(meeting.meeting_key)}</option>
              ))}
            </select>
          </label>
        </section>

        <nav className="flex-1 space-y-1 p-4" aria-label="Primary navigation">
          {navItems.map((item) => {
            const content = (
              <>
                <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span className="flex-1">{item.label}</span>
                {item.comingSoon
                  ? <Badge variant="outline" className="px-1.5 text-[10px]">Coming soon</Badge>
                  : <ChevronRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />}
              </>
            );

            if (!item.available) {
              return (
                <div
                  key={item.to}
                  aria-disabled="true"
                  title={item.comingSoon ? "Practice analysis is planned after version 1" : "Not available for this race weekend"}
                  className="flex cursor-not-allowed items-center gap-3 rounded-lg px-4 py-3 text-sidebar-foreground/40 opacity-60"
                >
                  {content}
                </div>
              );
            }

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) => `group flex items-center gap-3 rounded-lg px-4 py-3 transition-colors ${isActive ? "bg-primary text-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent"}`}
              >
                {content}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-4">
          <p className="text-xs text-muted-foreground">Version {packageMetadata.version}</p>
          <p className="text-xs text-muted-foreground">OpenF1 API</p>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-auto">
        {shellError ? (
          <div className="flex min-h-[70vh] items-center justify-center p-6">
            <ErrorState title={shellError.title} message={shellError.message} onRetry={shellError.retry} />
          </div>
        ) : (
          <Suspense fallback={<PageLoading message="Loading page…" />}>
            <Outlet />
          </Suspense>
        )}
      </main>
    </div>
  );
}
