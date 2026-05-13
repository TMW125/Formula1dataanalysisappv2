import { useEffect, useRef, useState } from "react";
import { Outlet, NavLink, useLocation } from "react-router";
import { LayoutDashboard, Activity, GitCompare, TrendingUp, Database, ChevronRight, Search, Menu, X } from "lucide-react";
import { useF1Data, useMeetings, useSessions } from "../context/F1DataContext";

/** Seasons available in the selector — extend as new seasons are released. */
const AVAILABLE_SEASONS = ["2026", "2025", "2024", "2023", "2022", "2021", "2020"];

export function MainLayout() {
  const location = useLocation();
  const { state, setSeason, setMeetingKey, setSessionKey } = useF1Data();
  const { meetings, loading: meetingsLoading } = useMeetings();
  const { sessions, loading: sessionsLoading } = useSessions();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const firstNavItemRef = useRef<HTMLAnchorElement | null>(null);

  const navItems = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/driver-analysis", icon: Activity, label: "Driver Analysis" },
    { to: "/driver-comparison", icon: GitCompare, label: "Driver Comparison" },
    { to: "/race-strategy", icon: TrendingUp, label: "Race Strategy" },
    { to: "/data-explorer", icon: Database, label: "Data Explorer" },
  ];

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (!isSidebarOpen) return;
    firstNavItemRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isSidebarOpen]);

  const closeSidebar = () => setIsSidebarOpen(false);

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="p-4 sm:p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
            <Activity className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold tracking-tight text-sidebar-foreground">F1 Analytics</h1>
            <p className="text-xs text-muted-foreground">OpenF1 Data Platform</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 sm:p-4 space-y-1 overflow-y-auto">
        {navItems.map((item, index) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            ref={index === 0 ? firstNavItemRef : undefined}
            onClick={closeSidebar}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-all group min-h-11 ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className="w-5 h-5 shrink-0" />
                <span className="flex-1">{item.label}</span>
                <ChevronRight
                  className={`w-4 h-4 transition-transform ${
                    isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  }`}
                />
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Version Info */}
      <div className="p-4 border-t border-sidebar-border">
        <p className="text-xs text-muted-foreground">Version 1.0.0</p>
        <p className="text-xs text-muted-foreground">OpenF1 API</p>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-64 bg-sidebar border-r border-sidebar-border lg:flex-col lg:overflow-hidden">
        {sidebarContent}
      </aside>

      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar overlay"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[1px] lg:hidden"
          onClick={closeSidebar}
        />
      )}

      <aside
        id="mobile-navigation"
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-300 ease-out lg:hidden ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-end border-b border-sidebar-border px-4 py-3">
          <button
            type="button"
            onClick={closeSidebar}
            aria-label="Close menu"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {sidebarContent}
      </aside>

      <div className="flex min-h-screen flex-col lg:pl-64">
        {/* Top Bar */}
        <header className="bg-card border-b border-border px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex w-full flex-wrap items-center gap-3 sm:gap-4">
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-input text-foreground hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-primary lg:hidden"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={isSidebarOpen}
              aria-controls="mobile-navigation"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Season Selector */}
            <select
              value={state.selectedSeason}
              onChange={(e) => setSeason(e.target.value)}
              className="h-11 w-full sm:w-auto sm:min-w-32 bg-input text-foreground px-4 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
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
              className="h-11 w-full sm:w-auto sm:min-w-56 bg-input text-foreground px-4 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="h-11 w-full sm:w-auto sm:min-w-44 bg-input text-foreground px-4 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
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

            {/* Search */}
            <div className="w-full lg:ml-auto lg:max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search driver..."
                  className="w-full h-11 bg-input text-foreground pl-10 pr-4 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
