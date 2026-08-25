import { useEffect, useState } from "react";
import { Monitor } from "lucide-react";
import { useLocation } from "react-router";
import { F1DataProvider } from "../context/F1DataContext";
import { MainLayout } from "./MainLayout";

const MINIMUM_VIEWPORT_WIDTH = 1024;

function viewportIsSupported() {
  return typeof window === "undefined" || window.innerWidth >= MINIMUM_VIEWPORT_WIDTH;
}

export function ApplicationShell() {
  const [supported, setSupported] = useState(viewportIsSupported);
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => setSupported(viewportIsSupported());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!supported) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6 text-center">
        <div className="max-w-lg rounded-xl border border-border bg-card p-8 shadow-sm">
          <Monitor className="mx-auto h-12 w-12 text-primary" aria-hidden="true" />
          <h1 className="mt-4 text-2xl tracking-tight text-card-foreground">A larger screen is required</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Version 1 of F1 Analytics supports browser viewports at least 1024 pixels wide. Resize this window or open the site on a desktop-sized display.
          </p>
        </div>
      </main>
    );
  }

  return (
    <F1DataProvider enabled={location.pathname !== "/practice"}>
      <MainLayout />
    </F1DataProvider>
  );
}
