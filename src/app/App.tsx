import { RouterProvider } from "react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { router } from "./routes";
import { F1DataProvider } from "./context/F1DataContext";
import { queryClient } from "./queryClient";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <F1DataProvider>
        <RouterProvider router={router} />
        <Analytics />
        <SpeedInsights />
      </F1DataProvider>
    </QueryClientProvider>
  );
}
