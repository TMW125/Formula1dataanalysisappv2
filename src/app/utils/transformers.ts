/**
 * Data transformation utilities.
 *
 * Convert raw OpenF1 API responses into the UI-layer types consumed by
 * presentational components.  All transformation logic lives here — never
 * inside UI components.
 */

import type { CarData, Lap, OpenF1Driver, Pit, Session, SessionResult, Stint, Weather } from "../types/openf1";
import type { LeaderboardRow, SessionInfoData, TireCompound } from "../types/ui";
import { TIRE_COLORS } from "../types/ui";

// ─── Formatting helpers ───────────────────────────────────────────────────────

/**
 * Format a lap duration in seconds to "m:ss.SSS", e.g. 91.72 → "1:31.720"
 */
export function formatLapTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = (seconds % 60).toFixed(3).padStart(6, "0");
  return `${m}:${s}`;
}

/**
 * Prefix a hex team colour string with "#" if it is missing.
 * OpenF1 returns team_colour without the # (e.g. "3671C6").
 */
export function toHexColor(raw: string | null | undefined): string {
  if (!raw) return "#888888";
  return raw.startsWith("#") ? raw : `#${raw}`;
}

/**
 * Capitalise the first character of a string, e.g. "SOFT" → "Soft".
 * Returns "Unknown" when the value is null or empty.
 */
export function capitalize(s: string | null | undefined): string {
  if (!s) return "Unknown";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

/**
 * Build a leaderboard sorted by best lap time.
 * Works for both qualifying (true fastest lap) and race (latest lap as proxy).
 */
export function buildLeaderboard(
  laps: Lap[],
  drivers: OpenF1Driver[]
): LeaderboardRow[] {
  const driverMap = new Map(drivers.map((d) => [d.driver_number, d]));

  // Find each driver's best lap duration
  const bestMap = new Map<number, number>();
  for (const lap of laps) {
    if (lap.lap_duration === null || lap.lap_duration <= 0) continue;
    const current = bestMap.get(lap.driver_number);
    if (current === undefined || lap.lap_duration < current) {
      bestMap.set(lap.driver_number, lap.lap_duration);
    }
  }

  if (bestMap.size === 0) return [];

  const sorted = [...bestMap.entries()].sort((a, b) => a[1] - b[1]);
  const leaderTime = sorted[0][1];

  return sorted.map(([driverNum, bestTime], idx) => {
    const d = driverMap.get(driverNum);
    return {
      position: idx + 1,
      driver: d?.full_name ?? `#${driverNum}`,
      time: formatLapTime(bestTime),
      gap: idx === 0 ? "-" : `+${(bestTime - leaderTime).toFixed(3)}`,
      team: d?.team_name ?? "Unknown",
      teamColor: toHexColor(d?.team_colour),
    };
  });
}

/**
 * Build a leaderboard from session_result endpoint data.
 */
export function buildLeaderboardFromResults(
  results: SessionResult[],
  drivers: OpenF1Driver[]
): LeaderboardRow[] {
  if (results.length === 0) return [];
  const driverMap = new Map(drivers.map((d) => [d.driver_number, d]));

  return results.map((r) => {
    const d = driverMap.get(r.driver_number);
    const rawGap = r.gap_to_leader;
    let gap: string;
    if (rawGap === null || r.position === 1) {
      gap = "-";
    } else {
      const gapNum = Number(rawGap);
      if (gapNum === 0) gap = "-";
      else if (isNaN(gapNum)) gap = String(rawGap);
      else gap = `+${gapNum.toFixed(3)}`;
    }
    return {
      position: r.position,
      driver: d?.full_name ?? `#${r.driver_number}`,
      time: String(r.number_of_laps),
      gap,
      team: d?.team_name ?? "Unknown",
      teamColor: toHexColor(d?.team_colour),
    };
  });
}

// ─── Session info panel ───────────────────────────────────────────────────────

export function buildSessionInfo(
  session: Session | null,
  latestWeather: Weather | null
): SessionInfoData {
  if (!session) {
    return {
      name: "—",
      track: "—",
      weather: "—",
      status: "No session selected",
      temperature: "—",
      remainingTime: "—",
    };
  }

  const now = Date.now();
  const endMs = new Date(session.date_end).getTime();
  const remainingSec = Math.max(0, (endMs - now) / 1000);

  let remainingTime: string;
  if (remainingSec > 0) {
    const m = Math.floor(remainingSec / 60);
    const s = String(Math.floor(remainingSec % 60)).padStart(2, "0");
    remainingTime = `${m}:${s}`;
  } else {
    remainingTime = "Finished";
  }

  return {
    name: session.session_name,
    track: `${session.location} — ${session.circuit_short_name}`,
    weather: latestWeather
      ? latestWeather.rainfall > 0
        ? "Rain"
        : "Clear"
      : "—",
    status: remainingSec > 0 ? "Session Active" : "Session Ended",
    temperature: latestWeather
      ? `${latestWeather.air_temperature}°C`
      : "—",
    remainingTime,
  };
}

// ─── Lap time chart ───────────────────────────────────────────────────────────

/**
 * Build data for LapTimeChart from laps for a set of drivers.
 *
 * Returns an array of `{ lap: number; [acronym]: number }` objects where each
 * key is the lower-cased driver acronym and the value is the lap duration in
 * seconds.
 */
export function buildLapTimeChartData(
  laps: Lap[],
  drivers: OpenF1Driver[],
  driverNumbers: number[]
): { lap: number; [key: string]: number }[] {
  const driverMap = new Map(drivers.map((d) => [d.driver_number, d]));

  const lapMap = new Map<number, { lap: number; [key: string]: number }>();

  for (const lap of laps) {
    if (!driverNumbers.includes(lap.driver_number)) continue;
    if (lap.lap_duration === null || lap.lap_duration <= 0) continue;
    const driver = driverMap.get(lap.driver_number);
    if (!driver) continue;

    const key = driver.name_acronym.toLowerCase();
    if (!lapMap.has(lap.lap_number)) {
      lapMap.set(lap.lap_number, { lap: lap.lap_number });
    }
    lapMap.get(lap.lap_number)![key] = lap.lap_duration;
  }

  return [...lapMap.values()].sort((a, b) => a.lap - b.lap);
}

// ─── Car telemetry ────────────────────────────────────────────────────────────

/**
 * Convert CarData[] to the telemetry chart data format (sample-indexed).
 * The `distance` field is a sequential index (× 10 for cosmetic spacing).
 */
export function buildCarTelemetry(
  carData: CarData[]
): Array<{
  distance: number;
  speed: number;
  throttle: number;
  brake: number;
  gear: number;
  rpm: number;
}> {
  return carData.map((pt, idx) => ({
    distance: idx * 10,
    speed: pt.speed,
    throttle: pt.throttle,
    brake: pt.brake > 0 ? 100 : 0,
    gear: pt.gear,
    rpm: pt.rpm,
  }));
}

// ─── Stint timeline ───────────────────────────────────────────────────────────

export interface StintTimelineRow {
  driverName: string;
  driverNumber: number;
  color: string;
  stints: Array<{
    compound: TireCompound;
    compoundColor: string;
    textColor: string;
    lapStart: number;
    lapEnd: number;
    widthPct: number;
  }>;
  pitMarkers: number[]; // lap numbers of pit stops
}

export function buildStintTimeline(
  stints: Stint[],
  drivers: OpenF1Driver[]
): StintTimelineRow[] {
  const driverMap = new Map(drivers.map((d) => [d.driver_number, d]));
  const TIRE_TEXT: Record<TireCompound, string> = {
    SOFT: "#ffffff",
    MEDIUM: "#111111",
    HARD: "#111111",
    INTERMEDIATE: "#ffffff",
    WET: "#ffffff",
    UNKNOWN: "#ffffff",
  };

  const totalLaps =
    Math.max(0, ...stints.map((s) => s.lap_end ?? s.lap_start)) || 1;

  // Group by driver
  const grouped = new Map<number, Stint[]>();
  for (const stint of stints) {
    const list = grouped.get(stint.driver_number) ?? [];
    list.push(stint);
    grouped.set(stint.driver_number, list);
  }

  return [...grouped.entries()].map(([driverNum, driverStints]) => {
    const d = driverMap.get(driverNum);
    const sorted = [...driverStints].sort((a, b) => a.lap_start - b.lap_start);

    return {
      driverName: d?.full_name ?? `#${driverNum}`,
      driverNumber: driverNum,
      color: toHexColor(d?.team_colour),
      stints: sorted.map((s) => {
        const compound = s.compound as TireCompound;
        const lapEnd = s.lap_end ?? s.lap_start;
        return {
          compound,
          compoundColor: TIRE_COLORS[compound] ?? "#888",
          textColor: TIRE_TEXT[compound] ?? "#fff",
          lapStart: s.lap_start,
          lapEnd,
          widthPct: ((lapEnd - s.lap_start + 1) / totalLaps) * 100,
        };
      }),
      pitMarkers: sorted.slice(1).map((s) => s.lap_start),
    };
  });
}

// ─── Pit stop table ───────────────────────────────────────────────────────────

export interface PitStopRow {
  driver: string;
  lap: number;
  duration: string;
  compound: string;
  compoundColor: string;
}

export function buildPitStops(
  pits: Pit[],
  drivers: OpenF1Driver[],
  stints: Stint[]
): PitStopRow[] {
  const driverMap = new Map(drivers.map((d) => [d.driver_number, d]));

  return pits
    .map((pit) => {
      const d = driverMap.get(pit.driver_number);
      // The newly fitted compound is in the stint that starts on or after pit lap
      const nextStint = stints.find(
        (s) =>
          s.driver_number === pit.driver_number &&
          s.lap_start >= pit.lap_number
      );
      const compound = nextStint
        ? capitalize(nextStint.compound)
        : "Unknown";
      const compoundKey = (nextStint?.compound ?? "UNKNOWN") as TireCompound;

      return {
        driver: d?.full_name ?? `#${pit.driver_number}`,
        lap: pit.lap_number,
        duration: pit.pit_duration != null ? `${pit.pit_duration.toFixed(1)}s` : "—",
        compound,
        compoundColor: TIRE_COLORS[compoundKey] ?? "#888",
      };
    })
    .sort((a, b) => a.lap - b.lap);
}

// ─── Average pace by stint ────────────────────────────────────────────────────

export interface PaceDataPoint {
  driver: string;
  stint: string;
  avgPace: number;
  color: string;
}

export function buildPaceData(
  laps: Lap[],
  stints: Stint[],
  drivers: OpenF1Driver[]
): PaceDataPoint[] {
  const driverMap = new Map(drivers.map((d) => [d.driver_number, d]));
  const lapMap = new Map<string, number[]>(); // "driverNum-stintNum" → durations

  for (const lap of laps) {
    if (lap.lap_duration === null || lap.is_pit_out_lap) continue;
    const stint = stints.find(
      (s) =>
        s.driver_number === lap.driver_number &&
        lap.lap_number >= s.lap_start &&
        lap.lap_number <= (s.lap_end ?? Infinity)
    );
    if (!stint) continue;
    const key = `${lap.driver_number}-${stint.stint_number}`;
    const list = lapMap.get(key) ?? [];
    list.push(lap.lap_duration);
    lapMap.set(key, list);
  }

  const result: PaceDataPoint[] = [];
  for (const stint of stints) {
    const key = `${stint.driver_number}-${stint.stint_number}`;
    const durations = lapMap.get(key);
    if (!durations || durations.length === 0) continue;
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const d = driverMap.get(stint.driver_number);
    result.push({
      driver: d?.name_acronym ?? `#${stint.driver_number}`,
      stint: `${d?.name_acronym ?? stint.driver_number} ${capitalize(stint.compound)} (${stint.lap_start}-${stint.lap_end ?? "?"})`,
      avgPace: parseFloat(avg.toFixed(3)),
      color: toHexColor(d?.team_colour),
    });
  }

  return result;
}

// ─── Stats helpers ────────────────────────────────────────────────────────────

/** Best lap from a set of laps, formatted as "m:ss.SSS" */
export function getBestLapFormatted(laps: Lap[]): string {
  const valid = laps
    .filter((l) => l.lap_duration !== null && l.lap_duration > 0)
    .map((l) => l.lap_duration as number);
  if (valid.length === 0) return "—";
  return formatLapTime(Math.min(...valid));
}

/** Best top speed across car data samples */
export function getTopSpeed(carData: CarData[]): string {
  if (carData.length === 0) return "—";
  return `${Math.max(...carData.map((d) => d.speed))} km/h`;
}
