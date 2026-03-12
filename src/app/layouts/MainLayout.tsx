import { Outlet, NavLink } from "react-router";
import { LayoutDashboard, Activity, GitCompare, TrendingUp, Database, ChevronRight, Search } from "lucide-react";
import { sessions, raceWeekends } from "../data/mockData";

export function MainLayout() {
  const navItems = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/driver-analysis", icon: Activity, label: "Driver Analysis" },
    { to: "/driver-comparison", icon: GitCompare, label: "Driver Comparison" },
    { to: "/race-strategy", icon: TrendingUp, label: "Race Strategy" },
    { to: "/data-explorer", icon: Database, label: "Data Explorer" },
  ];

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-sidebar-border">
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
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all group ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className="w-5 h-5" />
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
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-card border-b border-border px-6 py-4 flex items-center gap-4">
          {/* Session Selector */}
          <select className="bg-input text-foreground px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary">
            {sessions.map((session) => (
              <option key={session}>{session}</option>
            ))}
          </select>

          {/* Race Weekend Selector */}
          <select className="bg-input text-foreground px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary">
            {raceWeekends.map((weekend) => (
              <option key={weekend}>{weekend}</option>
            ))}
          </select>

          {/* Search */}
          <div className="flex-1 max-w-md ml-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search driver..."
                className="w-full bg-input text-foreground pl-10 pr-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
