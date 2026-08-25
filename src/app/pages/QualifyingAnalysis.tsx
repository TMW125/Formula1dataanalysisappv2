import { DriverSelectionCard } from "../components/DriverSelectionCard";
import { QualifyingTelemetryCharts } from "../components/charts/QualifyingTelemetryCharts";
import { EmptyState, ErrorState, PageLoading, PartialDataNotice } from "../components/AsyncState";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { SessionAvailability } from "../components/SessionAvailability";
import { SessionVariantToggle } from "../components/SessionVariantToggle";
import { useF1Data, useSessionMode } from "../context/F1DataContext";
import { useDriverSelection } from "../hooks/useDriverSelection";
import { useQualifyingTelemetryData } from "../hooks/useQualifyingTelemetryData";
import { useResolvedSession } from "../hooks/useSessionScope";
import { useDriversData, useLapsData, useSessionResultsData } from "../hooks/useSessionData";

export function QualifyingAnalysis() {
  const { setSessionMode } = useF1Data();
  const variant = useSessionMode("qualifying");
  const resolution = useResolvedSession("qualifying", variant);
  const session = resolution.session;
  const sessionKey = resolution.status === "completed" ? session?.session_key ?? null : null;
  const driversState = useDriversData(sessionKey);
  const lapsState = useLapsData(sessionKey);
  const resultsState = useSessionResultsData(sessionKey);
  const { data: drivers, loading: driversLoading } = driversState;
  const { data: laps, loading: lapsLoading } = lapsState;
  const { data: results, loading: resultsLoading } = resultsState;
  const selection = useDriverSelection({
    sessionKey,
    drivers,
    results,
    laps,
    loading: driversLoading || lapsLoading || resultsLoading,
  });
  const telemetry = useQualifyingTelemetryData(sessionKey, selection.selectedDrivers, laps);

  if (resolution.status === "loading") return <PageLoading message="Resolving qualifying session…" />;
  if (resolution.status !== "completed") {
    return <div className="space-y-5 p-4 md:p-6"><header className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-3xl tracking-tight">Qualifying</h1><p className="mt-2 text-muted-foreground">Choose drivers for future qualifying analysis.</p></div><SessionVariantToggle value={variant} onChange={(value) => setSessionMode("qualifying", value)} supportsSprint={resolution.supportsSprint} mainLabel="Qualifying" sprintLabel="Sprint Qualifying" ariaLabel="Qualifying session" /></header><SessionAvailability session={session} status={resolution.status} title="Qualifying session unavailable" /></div>;
  }
  const requiredErrors = [driversState.error, lapsState.error, resultsState.error].filter((error): error is string => Boolean(error));
  if (requiredErrors.length > 0) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <header><h1 className="text-3xl tracking-tight">Qualifying</h1><p className="mt-2 text-muted-foreground">{session?.session_name} · Fastest-lap comparison.</p></header>
        <ErrorState
          title="Qualifying data could not be loaded"
          message={requiredErrors.join("; ")}
          onRetry={() => {
            if (driversState.error) driversState.refetch();
            if (lapsState.error) lapsState.refetch();
            if (resultsState.error) resultsState.refetch();
          }}
        />
      </div>
    );
  }
  if (!selection.ready) return <PageLoading message="Loading qualifying drivers and laps…" />;
  if (drivers.length === 0 || laps.length === 0 || results.length === 0) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <header><h1 className="text-3xl tracking-tight">Qualifying</h1><p className="mt-2 text-muted-foreground">{session?.session_name}</p></header>
        <EmptyState title="No qualifying lap data" message="OpenF1 returned no drivers, completed laps, or final classification for this session." />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-3xl tracking-tight">Qualifying</h1><p className="mt-2 text-muted-foreground">{session?.session_name} · Compare selected drivers’ fastest valid laps.</p></div><SessionVariantToggle value={variant} onChange={(value) => setSessionMode("qualifying", value)} supportsSprint={resolution.supportsSprint} mainLabel="Qualifying" sprintLabel="Sprint Qualifying" ariaLabel="Qualifying session" /></header>
      <DriverSelectionCard selection={selection} description="The selection applies to every fastest-lap chart below." />
      {telemetry.loading ? (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground" role="status" aria-live="polite">
          <LoadingSpinner compact />
          <span>Loading fastest-lap telemetry: {telemetry.loadedCount} of {telemetry.totalCount} drivers resolved.</span>
        </div>
      ) : null}
      <PartialDataNotice messages={telemetry.errors} title="Some selected telemetry could not be loaded" />
      <QualifyingTelemetryCharts
          series={telemetry.series}
          driverStyles={selection.driverStyles}
          selectedDrivers={selection.selectedDriverData}
          referenceDriverNumber={telemetry.referenceDriverNumber}
          referenceTelemetryAvailable={telemetry.referenceTelemetryAvailable}
          missingLapDrivers={telemetry.missingLapDrivers}
          unavailableTelemetryDrivers={telemetry.unavailableTelemetryDrivers}
          errors={telemetry.errors}
      />
    </div>
  );
}
