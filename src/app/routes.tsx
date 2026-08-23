import { createBrowserRouter } from "react-router";
import { MainLayout } from "./layouts/MainLayout";
import { Dashboard } from "./pages/Dashboard";
import { DriverAnalysis } from "./pages/DriverAnalysis";
import { DriverComparison } from "./pages/DriverComparison";
import { RaceStrategy } from "./pages/RaceStrategy";
import { DataExplorer } from "./pages/DataExplorer";
import { LiveReplay } from "./pages/LiveReplay";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: MainLayout,
    children: [
      { index: true, Component: Dashboard },
      { path: "driver-analysis", Component: DriverAnalysis },
      { path: "driver-comparison", Component: DriverComparison },
      { path: "race-strategy", Component: RaceStrategy },
      { path: "data-explorer", Component: DataExplorer },
      { path: "live-replay", Component: LiveReplay },
    ],
  },
]);
