import { lazy } from "react";
import { createBrowserRouter } from "react-router";
import { ApplicationShell } from "./layouts/ApplicationShell";
import { RouteErrorBoundary } from "./pages/RouteErrorBoundary";

const Dashboard = lazy(() => import("./pages/Dashboard").then((module) => ({ default: module.Dashboard })));
const PracticeAnalysis = lazy(() => import("./pages/PracticeAnalysis").then((module) => ({ default: module.PracticeAnalysis })));
const QualifyingAnalysis = lazy(() => import("./pages/QualifyingAnalysis").then((module) => ({ default: module.QualifyingAnalysis })));
const RaceStrategy = lazy(() => import("./pages/RaceStrategy").then((module) => ({ default: module.RaceStrategy })));
const LiveReplay = lazy(() => import("./pages/LiveReplay").then((module) => ({ default: module.LiveReplay })));
const NotFound = lazy(() => import("./pages/NotFound").then((module) => ({ default: module.NotFound })));

export const router = createBrowserRouter([
  {
    path: "/",
    Component: ApplicationShell,
    ErrorBoundary: RouteErrorBoundary,
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
