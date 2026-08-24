import { createBrowserRouter } from "react-router";
import { MainLayout } from "./layouts/MainLayout";
import { Dashboard } from "./pages/Dashboard";
import { PracticeAnalysis } from "./pages/PracticeAnalysis";
import { QualifyingAnalysis } from "./pages/QualifyingAnalysis";
import { RaceStrategy } from "./pages/RaceStrategy";
import { LiveReplay } from "./pages/LiveReplay";
import { NotFound } from "./pages/NotFound";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: MainLayout,
    children: [
      { index: true, Component: Dashboard },
      { path: "practice", Component: PracticeAnalysis },
      { path: "qualifying", Component: QualifyingAnalysis },
      { path: "race", Component: RaceStrategy },
      { path: "live-replay", Component: LiveReplay },
      { path: "*", Component: NotFound },
    ],
  },
]);
