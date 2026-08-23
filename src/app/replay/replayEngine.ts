import type {
  Interval,
  Lap,
  Location,
  Position,
  RaceControlEvent,
  SessionResult,
} from "../types/openf1";
import { toTireCompound } from "../utils/transformers";
import type { ReplayDataset, ReplayEvent, ReplayFrame } from "./types";

type Timed = { date: string };

export const LOCATION_STALE_MS = 5_000;
export const DNF_FADE_MS = 10_000;
const RETIREMENT_MESSAGE = /\b(retired|stopped|out of the race|dnf)\b/i;
const YELLOW_FLAG = /^(?:DOUBLE\s+)?YELLOW$/i;
const PIT_ENTRY_MESSAGE = /\bentered\s+(?:the\s+)?pit(?:s|\s+lane)?\b/i;
const EXCLUDED_TIMELINE_TITLES = new Set(["other", "blue", "clear", "black and white"]);

export interface ReplayIndex {
  dataset: ReplayDataset;
  positions: Map<number, Position[]>;
  intervals: Map<number, Interval[]>;
  laps: Map<number, Lap[]>;
  locations: Map<number, Location[]>;
  weather: ReplayDataset["weather"];
  raceControl: ReplayDataset["raceControl"];
  events: ReplayEvent[];
  retirementTimes: Map<number, number>;
}

function timestamp(item: Timed): number {
  return Date.parse(item.date);
}

function sortTimed<T extends Timed>(items: T[]): T[] {
  return [...items].sort((a, b) => timestamp(a) - timestamp(b));
}

function groupByDriver<T extends { driver_number: number }>(items: T[], getTime: (item: T) => number): Map<number, T[]> {
  const grouped = new Map<number, T[]>();
  for (const item of items) {
    const group = grouped.get(item.driver_number) ?? [];
    group.push(item);
    grouped.set(item.driver_number, group);
  }
  for (const group of grouped.values()) group.sort((a, b) => getTime(a) - getTime(b));
  return grouped;
}

/** Index of the first item whose timestamp is greater than target. */
export function upperBound<T>(items: T[], target: number, getTime: (item: T) => number): number {
  let low = 0;
  let high = items.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (getTime(items[middle]) <= target) low = middle + 1;
    else high = middle;
  }
  return low;
}

function latestAt<T>(items: T[] | undefined, target: number, getTime: (item: T) => number): T | null {
  if (!items?.length) return null;
  const index = upperBound(items, target, getTime) - 1;
  return index >= 0 ? items[index] : null;
}

function scalarResultValue(
  value: SessionResult["gap_to_leader"]
): number | string | null {
  if (!Array.isArray(value)) return value;
  return [...value].reverse().find((part) => part !== null) ?? null;
}

export function formatReplayGap(value: number | string | null, leader = false): string {
  if (leader || value === null || value === 0) return "LEADER";
  if (typeof value === "string") return value.startsWith("+") ? value : `+${value}`;
  return `+${value.toFixed(3)}`;
}

function completedBestLaps(laps: Lap[], target: number): Map<number, number> {
  const best = new Map<number, number>();
  for (const lap of laps) {
    if (!lap.date_start || lap.lap_duration === null || lap.lap_duration <= 0) continue;
    const completedAt = Date.parse(lap.date_start) + lap.lap_duration * 1000;
    if (completedAt > target) continue;
    const current = best.get(lap.driver_number);
    if (current === undefined || lap.lap_duration < current) best.set(lap.driver_number, lap.lap_duration);
  }
  return best;
}

function interpolateLocation(
  items: Location[] | undefined,
  target: number,
  maximumStaleMs = LOCATION_STALE_MS
) {
  if (!items?.length) return null;
  const nextIndex = upperBound(items, target, timestamp);
  const previous = nextIndex > 0 ? items[nextIndex - 1] : null;
  const next = nextIndex < items.length ? items[nextIndex] : null;
  const previousDistance = previous ? target - timestamp(previous) : Infinity;
  const nextDistance = next ? timestamp(next) - target : Infinity;

  if (Math.min(previousDistance, nextDistance) > maximumStaleMs) return null;
  if (!previous) return next ? { x: next.x, y: next.y } : null;
  if (!next || previousDistance > maximumStaleMs || nextDistance > maximumStaleMs) {
    return { x: previous.x, y: previous.y };
  }

  const span = timestamp(next) - timestamp(previous);
  const ratio = span > 0 ? previousDistance / span : 0;
  return {
    x: previous.x + (next.x - previous.x) * ratio,
    y: previous.y + (next.y - previous.y) * ratio,
  };
}

export function buildReplayEvents(dataset: ReplayDataset): ReplayEvent[] {
  const events: ReplayEvent[] = [];
  dataset.raceControl.forEach((event, index) => {
    events.push({
      id: `control-${index}-${event.date}`,
      date: event.date,
      timestamp: Date.parse(event.date),
      kind: "control",
      title: event.flag ?? event.category,
      detail: event.message,
      driverNumber: event.driver_number,
      lapNumber: event.lap_number,
      flag: event.flag,
    });
  });
  dataset.pits.forEach((pit, index) => {
    events.push({
      id: `pit-${index}-${pit.date}`,
      date: pit.date,
      timestamp: Date.parse(pit.date),
      kind: "pit",
      title: `Car ${pit.driver_number} entered the pits`,
      detail: pit.stop_duration != null
        ? `${pit.stop_duration.toFixed(1)}s stationary · ${pit.lane_duration?.toFixed(1) ?? "—"}s lane`
        : `${pit.lane_duration?.toFixed(1) ?? "—"}s in pit lane`,
      driverNumber: pit.driver_number,
      lapNumber: pit.lap_number,
    });
  });
  dataset.overtakes.forEach((overtake, index) => {
    events.push({
      id: `overtake-${index}-${overtake.date}`,
      date: overtake.date,
      timestamp: Date.parse(overtake.date),
      kind: "overtake",
      title: `Car ${overtake.overtaking_driver_number} overtook car ${overtake.overtaken_driver_number}`,
      detail: `Moved into P${overtake.position}`,
      driverNumber: overtake.overtaking_driver_number,
      lapNumber: null,
    });
  });
  dataset.teamRadio.forEach((radio, index) => {
    events.push({
      id: `radio-${index}-${radio.date}`,
      date: radio.date,
      timestamp: Date.parse(radio.date),
      kind: "radio",
      title: `Team radio · Car ${radio.driver_number}`,
      detail: "Radio message available",
      driverNumber: radio.driver_number,
      lapNumber: null,
      recordingUrl: radio.recording_url,
    });
  });
  return events.sort((a, b) => a.timestamp - b.timestamp);
}

/** Race-control events shown above the replay scrubber. */
export function isTimelineMarkerEvent(event: ReplayEvent): boolean {
  if (event.kind !== "control") return false;
  if (EXCLUDED_TIMELINE_TITLES.has(event.title.trim().toLowerCase())) return false;
  if (YELLOW_FLAG.test((event.flag ?? "").trim())) return false;
  return !PIT_ENTRY_MESSAGE.test(`${event.title} ${event.detail}`);
}

export function createReplayIndex(dataset: ReplayDataset): ReplayIndex {
  const locations = groupByDriver<Location>(dataset.locations, timestamp);
  const retirementTimes = new Map<number, number>();
  for (const result of dataset.results) {
    if (!result.dnf) continue;
    const explicitEvents = dataset.raceControl.filter(
      (event) => event.driver_number === result.driver_number && RETIREMENT_MESSAGE.test(event.message)
    );
    const explicitTime = explicitEvents.length > 0
      ? Math.max(...explicitEvents.map(timestamp))
      : null;
    const driverLocations = locations.get(result.driver_number);
    const lastLocationTime = driverLocations?.length
      ? timestamp(driverLocations[driverLocations.length - 1])
      : null;
    const retirementTime = explicitTime ?? lastLocationTime;
    if (retirementTime !== null) retirementTimes.set(result.driver_number, retirementTime);
  }
  return {
    dataset,
    positions: groupByDriver<Position>(dataset.positions, timestamp),
    intervals: groupByDriver<Interval>(dataset.intervals, timestamp),
    laps: groupByDriver<Lap>(dataset.laps, (lap) => Date.parse(lap.date_start)),
    locations,
    weather: sortTimed(dataset.weather),
    raceControl: sortTimed(dataset.raceControl),
    events: buildReplayEvents(dataset),
    retirementTimes,
  };
}

function latestFlag(events: RaceControlEvent[], target: number): string {
  const relevant = events.filter(
    (event) => timestamp(event) <= target && (event.flag || event.category === "SessionStatus" || event.category === "SafetyCar")
  );
  const event = relevant[relevant.length - 1];
  if (!event) return "NO FLAG DATA";
  return event.flag ?? event.message;
}

export function buildReplayFrame(index: ReplayIndex, target: number): ReplayFrame {
  const { dataset } = index;
  const sessionStart = Date.parse(dataset.session.date_start);
  const sessionEnd = Date.parse(dataset.session.date_end);
  const replayTime = Math.min(sessionEnd, Math.max(sessionStart, target));
  const visibleEventCount = upperBound(index.events, replayTime, (event) => event.timestamp);
  const isRace = dataset.session.session_type === "Race" || dataset.session.session_type === "Sprint";
  const isFinished = replayTime >= sessionEnd;
  const grid = new Map(dataset.startingGrid.map((entry) => [entry.driver_number, entry.position]));
  const results = new Map(dataset.results.map((entry) => [entry.driver_number, entry]));
  const bestLaps = completedBestLaps(dataset.laps, replayTime);
  const sessionBest = bestLaps.size > 0 ? Math.min(...bestLaps.values()) : null;

  const drivers = dataset.drivers.map((driver) => {
    const driverLaps = index.laps.get(driver.driver_number);
    const currentLapRecord = latestAt(driverLaps, replayTime, (lap) => Date.parse(lap.date_start));
    const currentLap = currentLapRecord?.lap_number ?? 0;
    const positionSample = latestAt(index.positions.get(driver.driver_number), replayTime, timestamp);
    const official = isFinished ? results.get(driver.driver_number) : null;
    const position = official?.position ?? positionSample?.position ?? (isRace ? grid.get(driver.driver_number) ?? null : null);
    const interval = latestAt(index.intervals.get(driver.driver_number), replayTime, timestamp);
    const best = bestLaps.get(driver.driver_number);
    const raceGap = official ? scalarResultValue(official.gap_to_leader) : interval?.gap_to_leader ?? null;
    const gap = isRace
      ? formatReplayGap(raceGap, position === 1 && raceGap === null)
      : best !== undefined && sessionBest !== null
        ? formatReplayGap(best - sessionBest, best === sessionBest)
        : "—";
    const stint = dataset.stints.find(
      (entry) => entry.driver_number === driver.driver_number
        && currentLap >= entry.lap_start
        && currentLap <= (entry.lap_end ?? Infinity)
    );
    const activePit = [...dataset.pits].reverse().find((pit) => {
      if (pit.driver_number !== driver.driver_number) return false;
      const start = Date.parse(pit.date);
      return start <= replayTime && replayTime <= start + (pit.lane_duration ?? 25) * 1000;
    });
    const retirementTime = index.retirementTimes.get(driver.driver_number);
    const retirementElapsed = retirementTime === undefined ? -1 : replayTime - retirementTime;
    const markerOpacity = retirementElapsed <= 0
      ? 1
      : Math.max(0, 1 - retirementElapsed / DNF_FADE_MS);
    const location = markerOpacity === 0
      ? null
      : interpolateLocation(
          index.locations.get(driver.driver_number),
          replayTime,
          retirementElapsed >= 0 ? DNF_FADE_MS + LOCATION_STALE_MS : LOCATION_STALE_MS
        );

    return {
      driver,
      position,
      lap: currentLap,
      gap,
      compound: toTireCompound(stint?.compound),
      inPit: Boolean(activePit),
      location,
      markerOpacity,
    };
  });

  drivers.sort((a, b) => {
    if (a.position !== null && b.position !== null) return a.position - b.position;
    if (a.position !== null) return -1;
    if (b.position !== null) return 1;
    const aBest = bestLaps.get(a.driver.driver_number) ?? Infinity;
    const bBest = bestLaps.get(b.driver.driver_number) ?? Infinity;
    return aBest - bBest || a.driver.driver_number - b.driver.driver_number;
  });

  return {
    timestamp: replayTime,
    elapsedMs: replayTime - sessionStart,
    currentLap: drivers.reduce((maximum, driver) => Math.max(maximum, driver.lap), 0),
    flag: latestFlag(index.raceControl, replayTime),
    weather: latestAt(index.weather, replayTime, timestamp),
    drivers,
    events: index.events.slice(Math.max(0, visibleEventCount - 50), visibleEventCount).reverse(),
  };
}

export function advanceReplayTime(
  current: number,
  elapsedRealMs: number,
  speed: number,
  end: number
): { time: number; complete: boolean } {
  const time = Math.min(end, current + Math.max(0, elapsedRealMs) * speed);
  return { time, complete: time >= end };
}
