import { useMemo } from "react";
import { Flag } from "lucide-react";
import { DriverSelectionCard } from "../components/DriverSelectionCard";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { SessionAvailability } from "../components/SessionAvailability";
import { useDriverSelection } from "../hooks/useDriverSelection";
import { usePracticeAnalysisData } from "../hooks/usePracticeAnalysisData";
import { usePracticeSessions } from "../hooks/useSessionScope";

export function PracticeAnalysis() {
  const { sessions, loading } = usePracticeSessions();
  const completedSessions = useMemo(
    () => sessions.filter((item) => item.status === "completed"),
    [sessions],
  );
  const selectedPractice = completedSessions.at(-1) ?? sessions[0] ?? null;
  const completedPractice = selectedPractice?.status === "completed" ? selectedPractice : null;
  const datasets = usePracticeAnalysisData(completedPractice ? [completedPractice] : []);
  const dataset = datasets[0];
  const sessionKey = completedPractice?.session.session_key ?? null;
  const selection = useDriverSelection({
    sessionKey,
    drivers: dataset?.drivers ?? [],
    results: [],
    laps: [],
    loading: dataset?.loading ?? false,
  });

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><LoadingSpinner /></div>;
  if (sessions.length === 0) return <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center"><Flag className="mb-3 h-10 w-10 text-muted-foreground" /><h1 className="text-3xl">Practice</h1><p className="mt-2 text-muted-foreground">No practice sessions are available for the selected race weekend.</p></div>;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header>
        <h1 className="text-3xl tracking-tight">Practice</h1>
        <p className="mt-2 text-muted-foreground">{selectedPractice?.session.session_name} · Choose drivers for future practice analysis.</p>
      </header>

      {!completedPractice ? <SessionAvailability session={selectedPractice?.session ?? null} status={selectedPractice?.status ?? "missing"} title="Practice session unavailable" />
        : dataset?.error ? <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">Failed to load {completedPractice.session.session_name}: {dataset.error}</div>
          : dataset?.loading || !selection.ready ? <div className="flex min-h-[360px] items-center justify-center rounded-lg border border-border bg-card"><LoadingSpinner /></div>
            : <DriverSelectionCard selection={selection} description="The selection will apply to future practice charts and tables." />}
    </div>
  );
}
