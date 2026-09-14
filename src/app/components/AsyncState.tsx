import type { ReactNode } from "react";
import { AlertTriangle, Info } from "lucide-react";
import { Button } from "./ui/button";
import { LoadingSpinner } from "./LoadingSpinner";

interface LoadingStateProps {
  message?: string;
}

export function PageLoading({ message = "Loading analysis…" }: LoadingStateProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-4 text-center">
        <LoadingSpinner />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

export function PanelLoading({ message = "Loading data…" }: LoadingStateProps) {
  return (
    <div className="flex min-h-48 items-center justify-center rounded-lg border border-border bg-card p-6" role="status" aria-live="polite">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <LoadingSpinner compact />
        <span>{message}</span>
      </div>
    </div>
  );
}

interface ErrorStateProps {
  title: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  compact?: boolean;
}

export function ErrorState({ title, message, onRetry, retryLabel = "Try again", compact = false }: ErrorStateProps) {
  return (
    <section
      className={`w-full rounded-lg border border-destructive/40 bg-destructive/10 ${compact ? "p-4" : "max-w-2xl p-6 text-center"}`}
      role="alert"
    >
      <AlertTriangle className={compact ? "mb-2 h-5 w-5 text-destructive" : "mx-auto mb-3 h-9 w-9 text-destructive"} aria-hidden="true" />
      <h2 className={compact ? "font-semibold text-foreground" : "text-xl text-foreground"}>{title}</h2>
      <p className="mt-2 break-words text-sm text-muted-foreground">{message}</p>
      {onRetry ? <Button className="mt-4" variant="outline" size="sm" onClick={onRetry}>{retryLabel}</Button> : null}
    </section>
  );
}

interface EmptyStateProps {
  title: string;
  message: string;
  action?: ReactNode;
}

export function EmptyState({ title, message, action }: EmptyStateProps) {
  return (
    <section className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-border bg-card p-8 text-center">
      <Info className="mb-3 h-9 w-9 text-muted-foreground" aria-hidden="true" />
      <h2 className="text-xl text-card-foreground">{title}</h2>
      <p className="mt-2 max-w-lg text-sm text-muted-foreground">{message}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </section>
  );
}

interface PartialDataNoticeProps {
  title?: string;
  messages: string[];
}

export function PartialDataNotice({ title = "Some data is unavailable", messages }: PartialDataNoticeProps) {
  if (messages.length === 0) return null;
  return (
    <aside className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm" role="status">
      <p className="font-semibold text-foreground">{title}</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
        {messages.map((message) => <li key={message}>{message}</li>)}
      </ul>
    </aside>
  );
}
