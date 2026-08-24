import { DriverSelectionCard } from "../components/DriverSelectionCard";
import { QualifyingTelemetryCharts } from "../components/charts/QualifyingTelemetryCharts";
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
  const { data: drivers, loading: driversLoading } = useDriversData(sessionKey);
  const { data: laps, loading: lapsLoading } = useLapsData(sessionKey);
  const { data: results, loading: resultsLoading } = useSessionResultsData(sessionKey);
  const selection = useDriverSelection({
    sessionKey,
    drivers,
    results,
    laps,
    loading: driversLoading || lapsLoading || resultsLoading,
  });
  const telemetry = useQualifyingTelemetryData(sessionKey, selection.selectedDrivers, laps);

  if (resolution.status === "loading") return <div className="flex min-h-[60vh] items-center justify-center"><LoadingSpinner /></div>;
  if (resolution.status !== "completed") {
    return <div className="space-y-5 p-4 md:p-6"><header className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-3xl tracking-tight">Qualifying</h1><p className="mt-2 text-muted-foreground">Choose drivers for future qualifying analysis.</p></div><SessionVariantToggle value={variant} onChange={(value) => setSessionMode("qualifying", value)} supportsSprint={resolution.supportsSprint} mainLabel="Qualifying" sprintLabel="Sprint Qualifying" ariaLabel="Qualifying session" /></header><SessionAvailability session={session} status={resolution.status} title="Qualifying session unavailable" /></div>;
  }
  if (!selection.ready) return <div className="flex min-h-[60vh] items-center justify-center"><LoadingSpinner /></div>;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-3xl tracking-tight">Qualifying</h1><p className="mt-2 text-muted-foreground">{session?.session_name} · Compare selected drivers’ fastest valid laps.</p></div><SessionVariantToggle value={variant} onChange={(value) => setSessionMode("qualifying", value)} supportsSprint={resolution.supportsSprint} mainLabel="Qualifying" sprintLabel="Sprint Qualifying" ariaLabel="Qualifying session" /></header>
      <DriverSelectionCard selection={selection} description="The selection applies to every fastest-lap chart below." />
      {telemetry.loading ? (
        <div className="flex min-h-48 items-center justify-center rounded-lg border border-border bg-card"><LoadingSpinner /></div>
      ) : (
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
      )}
    </div>
  );
}
