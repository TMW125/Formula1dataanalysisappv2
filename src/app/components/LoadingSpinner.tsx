interface LoadingSpinnerProps {
  compact?: boolean;
}

export function LoadingSpinner({ compact = false }: LoadingSpinnerProps) {
  return (
    <div
      aria-hidden="true"
      data-slot="loading-spinner"
      className="inline-flex shrink-0 items-center justify-center"
    >
      <div className={`relative shrink-0 ${compact ? "h-6 w-6" : "h-16 w-16"}`}>
        <div className={`absolute inset-0 rounded-full border-border ${compact ? "border-2" : "border-4"}`} />
        <div
          className={`absolute inset-0 animate-spin rounded-full border-primary border-t-transparent ${compact ? "border-2" : "border-4"}`}
        />
      </div>
    </div>
  );
}
