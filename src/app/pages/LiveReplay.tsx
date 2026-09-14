import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CloudRain,
  Flag,
  Gauge,
  Pause,
  Play,
  Radio,
  SkipBack,
  Thermometer,
  Volume2,
} from "lucide-react";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { ErrorState, PageLoading, PanelLoading, PartialDataNotice } from "../components/AsyncState";
import { ReplayTrackMap } from "../components/ReplayTrackMap";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "../components/ui/tooltip";
import { useReplayController, REPLAY_SPEEDS, type ReplaySpeed } from "../hooks/useReplayController";
import { useReplayData } from "../hooks/useReplayData";
import { useCircuitInfo } from "../hooks/useSessionData";
import { useF1Data, useSessionMode } from "../context/F1DataContext";
import { useResolvedSession } from "../hooks/useSessionScope";
import { SessionAvailability } from "../components/SessionAvailability";
import { SessionVariantToggle } from "../components/SessionVariantToggle";
import { buildReplayFrame, clusterReplayEvents, createReplayIndex, getReplayEnd, isTimelineMarkerEvent } from "../replay/replayEngine";
import type { ReplayDriverState, ReplayEvent } from "../replay/types";
import { TIRE_COLORS } from "../types/ui";
import { toHexColor } from "../utils/transformers";

function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours > 0 ? `${hours}:` : ""}${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function eventColor(kind: ReplayEvent["kind"]): string {
  if (kind === "control") return "#E10600";
  if (kind === "pit") return "#FFD700";
  if (kind === "overtake") return "#27F4D2";
  return "#0090ff";
}

function eventKindLabel(kind: ReplayEvent["kind"]): string {
  if (kind === "control") return "Race control";
  if (kind === "pit") return "Pit stop";
  if (kind === "overtake") return "Overtake";
  return "Team radio";
}

function Classification({ drivers }: { drivers: ReplayDriverState[] }) {
  return (
    <section className="flex min-h-0 max-h-[520px] flex-col overflow-hidden rounded-lg border border-border bg-card xl:h-full xl:max-h-none" aria-labelledby="classification-heading">
      <div className="shrink-0 border-b border-border px-4 py-3">
        <h2 id="classification-heading" className="text-base font-semibold uppercase tracking-wider">Classification</h2>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-secondary text-xs uppercase text-muted-foreground">
            <tr><th className="px-3 py-2 text-left">Pos</th><th className="px-3 py-2 text-left">Driver</th><th className="px-3 py-2 text-right">Lap</th><th className="px-3 py-2 text-right">Gap</th><th className="px-3 py-2 text-right">Tyre</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {drivers.map((state) => (
              <tr key={state.driver.driver_number} className={state.inPit ? "bg-yellow-500/10" : ""}>
                <td className="px-3 py-2 font-mono font-bold">{state.position ?? "—"}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="h-8 w-1 rounded-full" style={{ backgroundColor: toHexColor(state.driver.team_colour) }} />
                    <span className="font-semibold">{state.driver.name_acronym}</span>
                    <span className="hidden text-xs text-muted-foreground xl:inline">{state.driver.driver_number}</span>
                    {state.inPit ? <span className="rounded bg-yellow-500 px-1.5 py-0.5 text-[10px] font-bold text-black">PIT</span> : null}
                  </div>
                </td>
                <td className="px-3 py-2 text-right font-mono">{state.lap || "—"}</td>
                <td className="px-3 py-2 text-right font-mono text-muted-foreground">{state.gap}</td>
                <td className="px-3 py-2 text-right">
                  <span
                    className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border text-[10px] font-bold"
                    style={{ borderColor: TIRE_COLORS[state.compound], color: TIRE_COLORS[state.compound] }}
                    title={state.compound}
                  >{state.compound.charAt(0)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

interface EventFeedProps {
  events: ReplayEvent[];
  sessionStart: number;
  activeRadio: string | null;
  onRadio: (url: string) => void;
}

function EventFeed({ events, sessionStart, activeRadio, onRadio }: EventFeedProps) {
  return (
    <section className="rounded-lg border border-border bg-card" aria-labelledby="event-feed-heading">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Radio className="h-4 w-4 text-primary" />
        <h2 id="event-feed-heading" className="text-base font-semibold uppercase tracking-wider">Replay feed</h2>
      </div>
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {events[0] ? `Latest replay event: ${events[0].title}. ${events[0].detail}` : ""}
      </div>
      <div className="max-h-80 divide-y divide-border overflow-auto">
        {events.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">No events yet</p> : events.map((event) => (
          <article key={event.id} className="flex gap-3 p-3">
            <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: eventColor(event.kind) }} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2">
                <span className="font-mono text-xs text-muted-foreground">{formatDuration(event.timestamp - sessionStart)}</span>
                {event.lapNumber ? <span className="text-xs text-muted-foreground">Lap {event.lapNumber}</span> : null}
              </div>
              <p className="text-sm font-semibold">{event.title}</p>
              <p className="text-xs text-muted-foreground">{event.detail}</p>
            </div>
            {event.recordingUrl ? (
              <button
                type="button"
                onClick={() => onRadio(event.recordingUrl!)}
                className="self-center rounded-md border border-border p-2 text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:ring-primary"
                aria-label={`${activeRadio === event.recordingUrl ? "Replay" : "Play"} team radio for car ${event.driverNumber}`}
              ><Volume2 className={`h-4 w-4 ${activeRadio === event.recordingUrl ? "text-primary" : ""}`} /></button>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

interface ControlsProps {
  start: number;
  end: number;
  current: number;
  playing: boolean;
  buffering: boolean;
  speed: ReplaySpeed;
  events: ReplayEvent[];
  disabled: boolean;
  onToggle: () => void;
  onRestart: () => void;
  onSeek: (time: number) => void;
  onSpeed: (speed: ReplaySpeed) => void;
}

export function ReplayControls(props: ControlsProps) {
  const duration = Math.max(1, props.end - props.start);
  const elapsed = Math.max(0, props.current - props.start);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [timelineWidth, setTimelineWidth] = useState(640);

  useEffect(() => {
    const element = timelineRef.current;
    if (!element) return undefined;
    const updateWidth = () => {
      const measuredWidth = element.getBoundingClientRect().width;
      if (measuredWidth > 0) setTimelineWidth(measuredWidth);
    };
    updateWidth();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const eventClusters = useMemo(
    () => clusterReplayEvents(props.events, props.start, props.end, timelineWidth),
    [props.end, props.events, props.start, timelineWidth],
  );

  return (
    <section className="rounded-lg border border-border bg-card p-4" aria-label="Replay controls">
      <div ref={timelineRef} className="relative mb-3 pt-8">
        {eventClusters.map((cluster) => cluster.events.length === 1 ? (
          <TimelineEventMarker
            key={cluster.id}
            event={cluster.events[0]}
            pixel={cluster.pixel}
            start={props.start}
            disabled={props.disabled}
            onSeek={props.onSeek}
          />
        ) : (
          <TimelineEventClusterMarker
            key={cluster.id}
            events={cluster.events}
            pixel={cluster.pixel}
            start={props.start}
            disabled={props.disabled}
            onSeek={props.onSeek}
          />
        ))}
        <input
          type="range"
          min={0}
          max={duration}
          step={1000}
          value={elapsed}
          onChange={(event) => props.onSeek(props.start + Number(event.target.value))}
          disabled={props.disabled}
          className="w-full accent-primary disabled:opacity-50"
          aria-label="Replay timeline"
          aria-valuetext={`${formatDuration(elapsed)} of ${formatDuration(duration)}`}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={props.onRestart} disabled={props.disabled} className="rounded-md border border-border p-2 hover:bg-secondary disabled:opacity-50" aria-label="Restart replay"><SkipBack className="h-5 w-5" /></button>
        <button type="button" onClick={props.onToggle} disabled={props.disabled} className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50" aria-label={props.playing ? "Pause replay" : "Play replay"}>
          {props.playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}{props.buffering ? "Buffering" : props.playing ? "Pause" : "Play"}
        </button>
        <span className="min-w-36 font-mono text-sm"><strong>{formatDuration(elapsed)}</strong> <span className="text-muted-foreground">/ {formatDuration(duration)}</span></span>
        <div className="ml-auto flex items-center gap-1" aria-label="Playback speed">
          <Gauge className="mr-1 h-4 w-4 text-muted-foreground" />
          {REPLAY_SPEEDS.map((speed) => (
            <button key={speed} type="button" onClick={() => props.onSpeed(speed)} aria-pressed={props.speed === speed} className={`rounded px-2 py-1 text-xs ${props.speed === speed ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>{speed}×</button>
          ))}
        </div>
      </div>
    </section>
  );
}

interface TimelineMarkerProps {
  pixel: number;
  start: number;
  disabled: boolean;
  onSeek: (time: number) => void;
}

function TimelineEventDetails({ event, start }: { event: ReplayEvent; start: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: eventColor(event.kind) }} aria-hidden="true" />
        <span>{eventKindLabel(event.kind)}</span>
        <span className="ml-auto font-mono normal-case tracking-normal">{formatDuration(event.timestamp - start)}</span>
      </div>
      <p className="text-sm font-semibold leading-tight">{event.title}</p>
      <p className="text-xs leading-relaxed text-muted-foreground">{event.detail}</p>
      <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-border/60 pt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>{event.lapNumber ? `Lap ${event.lapNumber}` : "Lap —"}</span>
        {event.driverNumber != null ? <span>Car {event.driverNumber}</span> : null}
      </div>
    </div>
  );
}

function TimelineEventMarker({ event, pixel, start, disabled, onSeek }: TimelineMarkerProps & { event: ReplayEvent }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSeek(event.timestamp)}
          className="absolute top-0 z-10 flex h-7 w-7 -translate-x-1/2 cursor-pointer items-center justify-center rounded-full border border-border bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:cursor-not-allowed disabled:opacity-50"
          style={{ left: pixel }}
          aria-label={`Jump to ${event.title} at ${formatDuration(event.timestamp - start)}`}
        >
          <span className="h-3 w-1 rounded-full" style={{ backgroundColor: eventColor(event.kind) }} aria-hidden="true" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={8} className="w-64 max-w-[calc(100vw-2rem)] border border-border bg-popover p-3 text-popover-foreground shadow-xl">
        <TimelineEventDetails event={event} start={start} />
      </TooltipContent>
    </Tooltip>
  );
}

function TimelineEventClusterMarker({ events, pixel, start, disabled, onSeek }: TimelineMarkerProps & { events: ReplayEvent[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="absolute top-0 z-10 flex h-7 min-w-7 -translate-x-1/2 cursor-pointer items-center justify-center rounded-full border border-primary bg-card px-1 text-[10px] font-bold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:cursor-not-allowed disabled:opacity-50"
          style={{ left: pixel }}
          aria-label={`${events.length} replay events at ${formatDuration(events[0].timestamp - start)}`}
        >
          {events.length}
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" sideOffset={8} className="max-h-80 w-80 overflow-y-auto p-3" aria-label="Clustered replay events">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{events.length} events</p>
        <ul className="space-y-2">
          {events.map((event) => (
            <li key={event.id}>
              <button
                type="button"
                className="w-full rounded-md border border-border p-3 text-left hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => {
                  onSeek(event.timestamp);
                  setOpen(false);
                }}
              >
                <TimelineEventDetails event={event} start={start} />
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

export function LiveReplay() {
  const { setSessionMode } = useF1Data();
  const variant = useSessionMode("liveReplay");
  const resolution = useResolvedSession("race", variant);
  const selectedSession = resolution.session;
  const { circuitInfo, error: circuitError, refetch: refetchCircuit } = useCircuitInfo();
  const rawStart = selectedSession ? Date.parse(selectedSession.date_start) : 0;
  const rawEnd = selectedSession ? Date.parse(selectedSession.date_end) : 0;
  const validDates = Number.isFinite(rawStart) && Number.isFinite(rawEnd) && rawEnd > rawStart;
  const completed = resolution.status === "completed" && validDates;
  const replaySession = selectedSession && completed ? selectedSession : null;
  const canAdvanceRef = useRef(false);
  const replayEndRef = useRef(validDates ? rawEnd : 0);
  const controller = useReplayController(validDates ? rawStart : 0, validDates ? rawEnd : 0, canAdvanceRef, replayEndRef);
  const replayData = useReplayData(replaySession, controller.currentTime);
  const replayEnd = replayData.dataset ? getReplayEnd(replayData.dataset) : rawEnd;

  useEffect(() => {
    canAdvanceRef.current = Boolean(replayData.dataset && replayData.locationReady);
  }, [replayData.dataset, replayData.locationReady]);

  useEffect(() => {
    replayEndRef.current = replayEnd;
  }, [replayEnd]);
  const replayIndex = useMemo(() => replayData.dataset ? createReplayIndex(replayData.dataset) : null, [replayData.dataset]);
  const frame = useMemo(() => replayIndex ? buildReplayFrame(replayIndex, controller.currentTime) : null, [replayIndex, controller.currentTime]);
  const timelineEvents = useMemo(
    () => replayIndex?.events.filter(isTimelineMarkerEvent) ?? [],
    [replayIndex]
  );
  const [activeRadio, setActiveRadio] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const replayDatasetKey = replayData.dataset?.session.session_key ?? null;
  const loadReplayOptional = replayData.loadOptional;
  const replayCurrentTime = controller.currentTime;
  const seekReplay = controller.seek;
  const toggleReplay = controller.toggle;

  // These sources are visible in the replay shell, but they are requested only
  // after the six core sources have produced the first replay dataset. The
  // hook queues them one at a time to avoid an optional-endpoint burst.
  useEffect(() => {
    if (replayDatasetKey === null) return;
    loadReplayOptional("weather");
    loadReplayOptional("raceControl");
    if (selectedSession?.session_type === "Race" || selectedSession?.session_type === "Sprint") {
      loadReplayOptional("intervals");
      loadReplayOptional("startingGrid");
    }
  }, [loadReplayOptional, replayDatasetKey, selectedSession?.session_type]);

  // Radio and overtake markers are only useful once the user starts moving
  // through the replay, so keep those two larger optional sources deferred.
  const replayHasProgress = controller.playing || controller.currentTime > rawStart;
  useEffect(() => {
    if (replayDatasetKey === null || !replayHasProgress) return;
    loadReplayOptional("teamRadio");
    loadReplayOptional("overtakes");
  }, [loadReplayOptional, replayDatasetKey, replayHasProgress]);

  const playRadio = useCallback((url: string) => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.src = url;
    audioRef.current.play().then(() => setActiveRadio(url)).catch(() => setActiveRadio(null));
  }, []);

  useEffect(() => {
    setActiveRadio(null);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute("src");
    }
  }, [selectedSession?.session_key]);

  useEffect(() => {
    if (replayCurrentTime > replayEnd) seekReplay(replayEnd);
  }, [replayCurrentTime, replayEnd, seekReplay]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, button, select, textarea, audio")) return;
      if (event.code === "Space") { event.preventDefault(); toggleReplay(); }
      else if (event.code === "ArrowLeft") seekReplay(replayCurrentTime - 5_000);
      else if (event.code === "ArrowRight") seekReplay(replayCurrentTime + 5_000);
      else if (event.code === "Home") seekReplay(rawStart);
      else if (event.code === "End") seekReplay(replayEnd);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [rawStart, replayCurrentTime, replayEnd, seekReplay, toggleReplay]);

  if (resolution.status === "loading") {
    return <PageLoading message="Resolving replay session…" />;
  }
  if (!validDates || !completed) {
    return <div className="space-y-5 p-4 lg:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3"><div><div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary"><span className="h-2 w-2 rounded-full bg-primary" />Live Replay</div><h1 className="text-3xl tracking-tight">{selectedSession?.session_name ?? "Live Replay"}</h1></div><SessionVariantToggle value={variant} onChange={(value) => setSessionMode("liveReplay", value)} supportsSprint={resolution.supportsSprint} mainLabel="Race" sprintLabel="Sprint" ariaLabel="Live replay session" /></header>
      {!validDates && resolution.status !== "missing" ? <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-6"><h2 className="text-xl">Replay unavailable</h2><p className="mt-2 text-sm text-muted-foreground">This session has invalid scheduling information.</p></div> : <SessionAvailability session={selectedSession} status={resolution.status} title="Replay session unavailable" />}
    </div>;
  }
  if (!selectedSession) {
    return <div className="p-6"><SessionAvailability session={null} status="missing" title="Replay session unavailable" /></div>;
  }

  const errorEntries = Object.entries(replayData.errors);
  const blockingReplaySources = new Set(["drivers", "laps", "positions", "results", "location"]);
  const blockingErrors = errorEntries.filter(([key]) => blockingReplaySources.has(key));
  const optionalErrors = errorEntries.filter(([key]) => !blockingReplaySources.has(key));
  return (
    <div className="space-y-5 p-4 lg:p-6">
      <audio ref={audioRef} onEnded={() => setActiveRadio(null)} className="hidden" aria-label="Team radio playback" />
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary"><span className="h-2 w-2 rounded-full bg-primary" />Live Replay</div><h1 className="text-3xl tracking-tight">{selectedSession.session_name}</h1><p className="text-sm text-muted-foreground">{selectedSession.location} · {selectedSession.circuit_short_name}</p></div>
        <SessionVariantToggle value={variant} onChange={(value) => setSessionMode("liveReplay", value)} supportsSprint={resolution.supportsSprint} mainLabel="Race" sprintLabel="Sprint" ariaLabel="Live replay session" />
        <div className="text-right"><p className="font-mono text-2xl font-bold">{formatDuration(controller.currentTime - rawStart)}</p><p className="text-xs uppercase tracking-wider text-muted-foreground">Lap {frame?.currentLap || "—"} · {controller.playing ? replayData.buffering ? "Buffering" : "Playing" : controller.currentTime >= replayEnd ? "Complete" : "Paused"}</p></div>
      </header>

      {replayData.loading && !replayData.dataset ? <PanelLoading message="Loading timing, events, and opening track positions…" /> : null}
      {blockingErrors.length > 0 ? <ErrorState compact title="Replay data could not be loaded" message={blockingErrors.map(([key, message]) => `${key}: ${message}`).join("; ")} onRetry={replayData.retry} /> : null}
      <PartialDataNotice
        title="Replay is available with partial data"
        messages={[
          ...optionalErrors.map(([key, message]) => `${key}: ${message}`),
          ...(circuitError ? [`Circuit map: ${circuitError}`] : []),
        ]}
      />
      {optionalErrors.length > 0 ? <button type="button" onClick={replayData.retry} className="text-sm font-semibold text-primary underline-offset-4 hover:underline">Retry</button> : null}
      {circuitError ? <button type="button" onClick={refetchCircuit} className="text-sm font-semibold text-primary underline-offset-4 hover:underline">Retry circuit map</button> : null}

      {frame && replayData.dataset && blockingErrors.length === 0 ? (
        <>
          <div className="grid gap-4 xl:h-[clamp(360px,52vh,520px)] xl:grid-cols-[minmax(0,3fr)_minmax(410px,2fr)]">
            <section className="relative min-h-[360px] overflow-hidden rounded-lg border border-border bg-card p-3 xl:h-full xl:min-h-0" aria-label="Circuit replay">
              <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-2">
                <span className="rounded bg-background/90 px-3 py-1.5 text-xs font-bold shadow"><Flag className="mr-1 inline h-3.5 w-3.5 text-primary" />{frame.flag}</span>
                {frame.weather ? <><span className="rounded bg-background/90 px-3 py-1.5 text-xs shadow"><Thermometer className="mr-1 inline h-3.5 w-3.5" />{frame.weather.air_temperature.toFixed(1)}°C air · {frame.weather.track_temperature.toFixed(1)}°C track</span><span className="rounded bg-background/90 px-3 py-1.5 text-xs shadow"><CloudRain className="mr-1 inline h-3.5 w-3.5" />{frame.weather.rainfall > 0 ? "Rain" : "Dry"}</span></> : null}
              </div>
              {replayData.buffering ? <div role="status" aria-live="polite" className="absolute left-1/2 top-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 items-center gap-3 whitespace-nowrap rounded-lg border border-border bg-card/95 px-5 py-3 shadow-xl backdrop-blur-sm"><LoadingSpinner compact /> Buffering track positions…</div> : null}
              <ReplayTrackMap x={circuitInfo?.x ?? []} y={circuitInfo?.y ?? []} drivers={frame.drivers} />
            </section>
            <Classification drivers={frame.drivers} />
          </div>
          <ReplayControls start={rawStart} end={replayEnd} current={controller.currentTime} playing={controller.playing} buffering={replayData.buffering} speed={controller.speed} events={timelineEvents} disabled={!replayData.locationReady} onToggle={controller.toggle} onRestart={controller.restart} onSeek={controller.seek} onSpeed={controller.setSpeed} />
          <EventFeed events={frame.events} sessionStart={rawStart} activeRadio={activeRadio} onRadio={playRadio} />
        </>
      ) : null}
    </div>
  );
}
