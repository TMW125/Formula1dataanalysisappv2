import { RouterProvider } from "react-router";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { router } from "./routes";
import { F1DataProvider } from "./context/F1DataContext";

export default function App() {
  return (
    <F1DataProvider>
      <RouterProvider router={router} />
      <Analytics />
      <SpeedInsights />
    </F1DataProvider>
  );
}