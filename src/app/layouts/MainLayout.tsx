import { Outlet, NavLink } from "react-router";
import { Activity, ChevronRight, Dumbbell, LayoutDashboard, RadioTower, Target, TrendingUp } from "lucide-react";
import { useF1Data, useMeetings, useSessions } from "../context/F1DataContext";

/** Seasons available in the selector — extend as new seasons are released. */
const AVAILABLE_SEASONS = ["2026", "2025", "2024", "2023", "2022", "2021", "2020"];

export function MainLayout() {
  const { state, setSeason, setMeetingKey } = useF1Data();
  const { meetings, loading: meetingsLoading } = useMeetings();
  const { sessions, loading: sessionsLoading } = useSessions();
  const sessionTabsLoading = sessionsLoading || state.selectedMeetingKey === null;
  const hasSessionType = (...sessionTypes: string[]) => sessions.some((session) => sessionTypes.includes(session.session_type));

  const navItems = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard", available: true },
    { to: "/practice", icon: Dumbbell, label: "Practice", available: !sessionTabsLoading && hasSessionType("Practice") },
    { to: "/qualifying", icon: Target, label: "Qualifying", available: !sessionTabsLoading && hasSessionType("Qualifying", "Sprint Qualifying") },
    { to: "/race", icon: TrendingUp, label: "Race", available: !sessionTabsLoading && hasSessionType("Race", "Sprint") },
    { to: "/live-replay", icon: RadioTower, label: "Live Replay", available: !sessionTabsLoading && hasSessionType("Race", "Sprint") },
  ];

  return (
    <div className="flex h-screen min-w-0 overflow-hidden bg-background">
      <aside className="flex w-64 shrink-0 flex-col overflow-y-auto border-r border-sidebar-border bg-sidebar">
        <div className="border-b border-sidebar-border p-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-primary">
              <Activity className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold tracking-tight text-sidebar-foreground">F1 Analytics</h1>
              <p className="text-xs text-muted-foreground">OpenF1 Data Platform</p>
            </div>
          </div>
        </div>

        <section className="space-y-3 border-b border-sidebar-border p-4">
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
              disabled={meetingsLoading || meetings.length === 0}
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Select race weekend"
            >
              <option value="">{meetingsLoading ? "Loading…" : "Select race weekend"}</option>
              {meetings.map((meeting) => (
                <option key={meeting.meeting_key} value={meeting.meeting_key}>{meeting.meeting_name}</option>
              ))}
            </select>
          </label>
        </section>

        <nav className="flex-1 space-y-1 p-4" aria-label="Primary navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              aria-disabled={!item.available}
              tabIndex={item.available ? undefined : -1}
              title={item.available ? undefined : "Not available for this race weekend"}
              onClick={(event) => {
                if (!item.available) event.preventDefault();
              }}
              className={({ isActive }) => `group flex items-center gap-3 rounded-lg px-4 py-3 transition-all ${!item.available ? "cursor-not-allowed text-sidebar-foreground/40 opacity-60" : isActive ? "bg-primary text-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent"}`}
            >
              {({ isActive }) => (
                <>
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  <ChevronRight className={`h-4 w-4 transition-transform ${!item.available ? "opacity-0" : isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`} />
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-4">
          <p className="text-xs text-muted-foreground">Version 1.0.0</p>
          <p className="text-xs text-muted-foreground">OpenF1 API</p>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
