import { Construction } from "lucide-react";

export function PracticeAnalysis() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center p-6 text-center">
      <section className="max-w-xl rounded-xl border border-border bg-card p-8">
        <Construction className="mx-auto h-11 w-11 text-primary" aria-hidden="true" />
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-primary">Coming soon</p>
        <h1 className="mt-2 text-3xl tracking-tight text-card-foreground">Practice analysis</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Practice analysis is intentionally not included in version 1. This placeholder does not request Practice data; the full feature is planned for a later release.
        </p>
      </section>
    </div>
  );
}
