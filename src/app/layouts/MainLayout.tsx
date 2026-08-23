import { Outlet, NavLink } from "react-router";
import { LayoutDashboard, Activity, GitCompare, TrendingUp, Database, ChevronRight, RadioTower } from "lucide-react";
import { useF1Data, useMeetings, useSessions } from "../context/F1DataContext";

/** Seasons available in the selector — extend as new seasons are released. */
const AVAILABLE_SEASONS = ["2026", "2025", "2024", "2023", "2022", "2021", "2020"];

export function MainLayout() {
  const { state, setSeason, setMeetingKey, setSessionKey } = useF1Data();
  const { meetings, loading: meetingsLoading } = useMeetings();
  const { sessions, loading: sessionsLoading } = useSessions();

  const navItems = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/driver-analysis", icon: Activity, label: "Driver Analysis" },
    { to: "/driver-comparison", icon: GitCompare, label: "Driver Comparison" },
    { to: "/race-strategy", icon: TrendingUp, label: "Race Strategy" },
    { to: "/live-replay", icon: RadioTower, label: "Live Replay" },
    { to: "/data-explorer", icon: Database, label: "Data Explorer" },
  ];

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-16 md:w-64 shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col transition-[width]">
        {/* Logo */}
        <div className="p-3 md:p-6 border-b border-sidebar-border">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
              <Activity className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="hidden md:block">
              <h1 className="font-bold tracking-tight text-sidebar-foreground">F1 Analytics</h1>
              <p className="text-xs text-muted-foreground">OpenF1 Data Platform</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 md:p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center justify-center md:justify-start gap-3 px-2 md:px-4 py-3 rounded-lg transition-all group ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className="w-5 h-5" />
                  <span className="hidden md:block flex-1">{item.label}</span>
                  <ChevronRight
                    className={`hidden md:block w-4 h-4 transition-transform ${
                      isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    }`}
                  />
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Version Info */}
        <div className="hidden md:block p-4 border-t border-sidebar-border">
          <p className="text-xs text-muted-foreground">Version 1.0.0</p>
          <p className="text-xs text-muted-foreground">OpenF1 API</p>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-card border-b border-border px-3 md:px-6 py-4 flex items-center gap-3 md:gap-4 overflow-x-auto">
          {/* Season Selector */}
          <select
            value={state.selectedSeason}
            onChange={(e) => setSeason(e.target.value)}
            className="bg-input text-foreground px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Select season"
          >
            {AVAILABLE_SEASONS.map((season) => (
              <option key={season} value={season}>
                {season}
              </option>
            ))}
          </select>

          {/* Race Weekend (Meeting) Selector */}
          <select
            value={state.selectedMeetingKey ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              setMeetingKey(val === "" ? null : Number(val));
            }}
            disabled={meetingsLoading || meetings.length === 0}
            className="bg-input text-foreground px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Select race weekend"
          >
            <option value="">
              {meetingsLoading ? "Loading…" : "Select race weekend"}
            </option>
            {meetings.map((meeting) => (
              <option key={meeting.meeting_key} value={meeting.meeting_key}>
                {meeting.meeting_name}
              </option>
            ))}
          </select>

          {/* Session Selector */}
          <select
            value={state.selectedSessionKey ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              setSessionKey(val === "" ? null : Number(val));
            }}
            disabled={sessionsLoading || sessions.length === 0 || state.selectedMeetingKey === null}
            className="bg-input text-foreground px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Select session"
          >
            <option value="">
              {sessionsLoading ? "Loading…" : "Select session"}
            </option>
            {sessions.map((session) => (
              <option key={session.session_key} value={session.session_key}>
                {session.session_name}
              </option>
            ))}
          </select>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
