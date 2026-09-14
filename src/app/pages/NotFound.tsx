import { Link } from "react-router";
import { AlertTriangle } from "lucide-react";

export function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
      <AlertTriangle className="mb-4 h-12 w-12 text-primary" aria-hidden="true" />
      <h1 className="text-3xl tracking-tight">Page not found</h1>
      <p className="mt-2 text-muted-foreground">This analysis page is no longer available.</p>
      <Link to="/" className="mt-6 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Return to Dashboard</Link>
    </div>
  );
}
