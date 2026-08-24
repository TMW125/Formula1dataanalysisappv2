/**
 * Data transformation utilities.
 *
 * Convert raw OpenF1 API responses into the UI-layer types consumed by
 * presentational components.  All transformation logic lives here — never
 * inside UI components.
 */

import type { CarData, Interval, Lap, OpenF1Driver, Pit, Position, Session, SessionResult, Stint, Weather } from "../types/openf1";
import type { DriverLineStyle, LeaderboardRow, SessionInfoData, TireCompound } from "../types/ui";
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

export interface DriverVisualStyle {
  color: string;
  lineStyle: DriverLineStyle;
}

function getDriverTeamKey(driver: OpenF1Driver): string {
  const teamName = driver.team_name?.trim().replace(/\s+/g, " ").toLocaleLowerCase();
  return teamName ? `name:${teamName}` : `color:${toHexColor(driver.team_colour).toLocaleLowerCase()}`;
}

/**
 * Build stable visual styles for a session roster. Drivers retain their team
 * colour, while the higher-numbered teammate uses a dashed line style.
 */
export function buildDriverVisualStyleMap(drivers: OpenF1Driver[]): Map<number, DriverVisualStyle> {
  const driversByTeam = new Map<string, OpenF1Driver[]>();
  for (const driver of drivers) {
    const teamKey = getDriverTeamKey(driver);
    const teamDrivers = driversByTeam.get(teamKey) ?? [];
    teamDrivers.push(driver);
    driversByTeam.set(teamKey, teamDrivers);
  }

  const styles = new Map<number, DriverVisualStyle>();
  for (const teamDrivers of driversByTeam.values()) {
    [...teamDrivers]
      .sort((a, b) => a.driver_number - b.driver_number)
      .forEach((driver, index) => {
        styles.set(driver.driver_number, {
          color: toHexColor(driver.team_colour),
          lineStyle: index === 0 ? "solid" : "dashed",
        });
      });
  }
  return styles;
}

/**
 * Capitalise the first character of a string, e.g. "SOFT" → "Soft".
 * Returns "Unknown" when the value is null or empty.
 */
export function capitalize(s: string | null | undefined): string {
  if (!s) return "Unknown";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/** Convert an API compound value into the non-null value expected by the UI. */
export function toTireCompound(value: string | null | undefined): TireCompound {
  return Object.prototype.hasOwnProperty.call(TIRE_COLORS, value ?? "")
    ? (value as TireCompound)
    : "UNKNOWN";
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
    const rawGap = Array.isArray(r.gap_to_leader)
      ? [...r.gap_to_leader].reverse().find((value) => value !== null) ?? null
      : r.gap_to_leader;
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
      status: "No completed session",
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
 * Convert CarData[] to the telemetry chart data format.
 * The `time` field is elapsed seconds from the first included sample.
 * The `distance` field is kept as a sequential index for existing consumers.
 *
 * When `lap` is supplied (and has a valid `date_start` + `lap_duration`), only
 * samples that fall within that lap's time window are included.
 */
export function buildCarTelemetry(
  carData: CarData[],
  lap?: Lap | null
): Array<{
  time: number;
  distance: number;
  speed: number;
  throttle: number;
  brake: number;
  gear: number;
  rpm: number;
}> {
  let filtered = carData;
  if (lap && lap.date_start && lap.lap_duration !== null) {
    const lapStart = new Date(lap.date_start).getTime();
    const lapEnd = lapStart + lap.lap_duration * 1000;
    filtered = carData.filter((pt) => {
      const t = new Date(pt.date).getTime();
      return t >= lapStart && t < lapEnd;
    });
  }
  const firstTimestamp = filtered.length > 0 ? new Date(filtered[0].date).getTime() : 0;
  return filtered.map((pt, idx) => ({
    time: (new Date(pt.date).getTime() - firstTimestamp) / 1000,
    distance: idx * 10,
    speed: pt.speed,
    throttle: pt.throttle,
    brake: pt.brake > 0 ? 100 : 0,
    gear: pt.n_gear,
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
        const compound = toTireCompound(s.compound);
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
  driverNumber: number;
  driver: string;
  lap: number;
  duration: string;
  laneDuration: string;
  stopDuration: string;
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
      const nextStint = [...stints]
        .filter(
          (s) =>
            s.driver_number === pit.driver_number &&
            s.lap_start >= pit.lap_number &&
            s.lap_start <= pit.lap_number + 2
        )
        .sort((a, b) => a.lap_start - b.lap_start)[0];
      const compound = nextStint
        ? capitalize(nextStint.compound)
        : "Unknown";
      const compoundKey = toTireCompound(nextStint?.compound);

      return {
        driverNumber: pit.driver_number,
        driver: d?.full_name ?? `#${pit.driver_number}`,
        lap: pit.lap_number,
        duration: (pit.lane_duration ?? pit.pit_duration) != null
          ? `${(pit.lane_duration ?? pit.pit_duration)!.toFixed(1)}s`
          : "—",
        laneDuration: (pit.lane_duration ?? pit.pit_duration) != null
          ? `${(pit.lane_duration ?? pit.pit_duration)!.toFixed(1)}s`
          : "—",
        stopDuration: pit.stop_duration != null ? `${pit.stop_duration.toFixed(1)}s` : "—",
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
  compound: TireCompound;
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
    const compound = toTireCompound(stint.compound);
    result.push({
      driver: d?.name_acronym ?? `#${stint.driver_number}`,
      stint: `${d?.name_acronym ?? stint.driver_number} ${capitalize(stint.compound)} (${stint.lap_start}-${stint.lap_end ?? "?"})`,
      avgPace: parseFloat(avg.toFixed(3)),
      color: toHexColor(d?.team_colour),
      compound,
    });
  }

  return result.sort((a, b) => a.avgPace - b.avgPace);
}

// ─── Race strategy comparison ───────────────────────────────────────────────

export function buildDefaultDriverSelection(
  drivers: OpenF1Driver[],
  results: SessionResult[],
  laps: Lap[],
  limit = 5
): number[] {
  const available = new Set(drivers.map((driver) => driver.driver_number));
  const classified = [...results]
    .filter((result) => available.has(result.driver_number) && !result.dnf && !result.dns && !result.dsq)
    .sort((a, b) => a.position - b.position)
    .map((result) => result.driver_number);

  if (classified.length > 0) return classified.slice(0, limit);

  const lapCounts = new Map<number, number>();
  for (const lap of laps) {
    if (!available.has(lap.driver_number)) continue;
    lapCounts.set(lap.driver_number, (lapCounts.get(lap.driver_number) ?? 0) + 1);
  }

  return [...drivers]
    .sort((a, b) => {
      const countDelta = (lapCounts.get(b.driver_number) ?? 0) - (lapCounts.get(a.driver_number) ?? 0);
      return countDelta || a.name_acronym.localeCompare(b.name_acronym);
    })
    .slice(0, limit)
    .map((driver) => driver.driver_number);
}

export interface StrategyLinePoint {
  lap: number;
  value: number;
}

export interface StrategyLineSeries {
  key: string;
  driverNumber: number;
  name: string;
  color: string;
  lineStyle: DriverLineStyle;
  values: StrategyLinePoint[];
}

function driverDetails(drivers: OpenF1Driver[], styles: Map<number, DriverVisualStyle>, driverNumber: number) {
  const driver = drivers.find((entry) => entry.driver_number === driverNumber);
  const visualStyle = styles.get(driverNumber) ?? { color: toHexColor(driver?.team_colour), lineStyle: "solid" as const };
  return {
    name: driver?.name_acronym ?? `#${driverNumber}`,
    ...visualStyle,
  };
}

export function buildLapTimeSeries(
  laps: Lap[],
  pits: Pit[],
  drivers: OpenF1Driver[],
  selectedDriverNumbers: number[],
  styles: Map<number, DriverVisualStyle> = buildDriverVisualStyleMap(drivers),
): StrategyLineSeries[] {
  return selectedDriverNumbers.map((driverNumber) => {
    const details = driverDetails(drivers, styles, driverNumber);
    const pitLapNumbers = new Set(
      pits
        .filter((pit) => pit.driver_number === driverNumber)
        .map((pit) => pit.lap_number)
    );
    const validLaps = laps
      .filter(
        (lap): lap is Lap & { lap_duration: number } =>
          lap.driver_number === driverNumber &&
          lap.lap_duration != null &&
          lap.lap_duration > 0 &&
          !lap.is_pit_out_lap &&
          !pitLapNumbers.has(lap.lap_number)
      );
    const center = median(validLaps.map((lap) => lap.lap_duration));
    const deviations = validLaps.map((lap) => Math.abs(lap.lap_duration - center));
    const slowLapThreshold = Math.max(3, median(deviations) * 3);
    return {
      key: `lap-time-${driverNumber}`,
      driverNumber,
      ...details,
      values: validLaps
        .filter((lap) => lap.lap_duration <= center + slowLapThreshold)
        .sort((a, b) => a.lap_number - b.lap_number)
        .map((lap) => ({ lap: lap.lap_number, value: lap.lap_duration })),
    };
  });
}

function parseRunningGap(interval: Interval): number | null {
  const value = interval.gap_to_leader;
  // A true race-leader sample has both gaps set to null. A null leader gap
  // with a numeric interval is an incomplete sample and should be filled.
  if (value == null) return interval.interval == null ? 0 : null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (!value.trim()) return null;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function interpolateRunningGapHoles(values: Map<number, number>): Map<number, number> {
  const knownLaps = [...values.keys()].sort((a, b) => a - b);
  if (knownLaps.length < 2) return values;

  const filledValues = new Map(values);
  for (let index = 0; index < knownLaps.length - 1; index += 1) {
    const startLap = knownLaps[index];
    const endLap = knownLaps[index + 1];
    const span = endLap - startLap;
    if (span <= 1) continue;

    const startValue = values.get(startLap)!;
    const endValue = values.get(endLap)!;
    for (let lap = startLap + 1; lap < endLap; lap += 1) {
      const progress = (lap - startLap) / span;
      const value = startValue + (endValue - startValue) * progress;
      filledValues.set(lap, Number(value.toFixed(3)));
    }
  }

  return filledValues;
}

function buildRunningGapByLap(
  laps: Lap[],
  intervals: Interval[],
  driverNumber: number,
): Map<number, number> {
  const driverLaps = laps
    .filter((lap) => lap.driver_number === driverNumber && Number.isFinite(Date.parse(lap.date_start)))
    .sort((a, b) => Date.parse(a.date_start) - Date.parse(b.date_start) || a.lap_number - b.lap_number);
  const driverIntervals = intervals
    .filter((interval) => interval.driver_number === driverNumber && Number.isFinite(Date.parse(interval.date)))
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  const values = new Map<number, number>();
  if (driverLaps.length === 0 || driverIntervals.length === 0) return values;

  let intervalIndex = 0;
  for (let lapIndex = 0; lapIndex < driverLaps.length; lapIndex += 1) {
    const lap = driverLaps[lapIndex];
    const lapStart = Date.parse(lap.date_start);
    const nextLap = driverLaps[lapIndex + 1];
    const nextLapStart = nextLap ? Date.parse(nextLap.date_start) : Number.POSITIVE_INFINITY;
    const hasConsecutiveNextLap = nextLap?.lap_number === lap.lap_number + 1;
    const durationEnd = lap.lap_duration != null && lap.lap_duration > 0
      ? lapStart + lap.lap_duration * 1000
      : Number.POSITIVE_INFINITY;
    const lapEnd = hasConsecutiveNextLap ? nextLapStart : Math.min(nextLapStart, durationEnd);

    while (intervalIndex < driverIntervals.length && Date.parse(driverIntervals[intervalIndex].date) < lapStart) {
      intervalIndex += 1;
    }

    let latestGap: number | null = null;
    while (intervalIndex < driverIntervals.length) {
      const interval = driverIntervals[intervalIndex];
      const timestamp = Date.parse(interval.date);
      if (timestamp >= lapEnd) break;
      latestGap = parseRunningGap(interval);
      intervalIndex += 1;
    }

    if (latestGap != null) values.set(lap.lap_number, Number(latestGap.toFixed(3)));
  }

  return interpolateRunningGapHoles(values);
}

export function buildRunningGapSeries(
  laps: Lap[],
  intervals: Interval[],
  drivers: OpenF1Driver[],
  selectedDriverNumbers: number[],
  results: SessionResult[],
  styles: Map<number, DriverVisualStyle> = buildDriverVisualStyleMap(drivers),
): StrategyLineSeries[] {
  if (selectedDriverNumbers.length === 0) return [];

  const winnerNumber = results.find(
    (result) => result.position === 1 && !result.dnf && !result.dns && !result.dsq,
  )?.driver_number ?? selectedDriverNumbers[0];
  const driversToSample = [...new Set([winnerNumber, ...selectedDriverNumbers])];
  const gapsByDriver = new Map(
    driversToSample.map((driverNumber) => [driverNumber, buildRunningGapByLap(laps, intervals, driverNumber)]),
  );
  const winnerGaps = gapsByDriver.get(winnerNumber);
  if (!winnerGaps || winnerGaps.size === 0) return [];

  return selectedDriverNumbers.flatMap((driverNumber) => {
    const driverGaps = gapsByDriver.get(driverNumber);
    if (!driverGaps) return [];
    const values: StrategyLinePoint[] = [...driverGaps.entries()]
      .filter(([lapNumber]) => winnerGaps.has(lapNumber))
      .sort(([lapA], [lapB]) => lapA - lapB)
      .map(([lapNumber, gap]) => ({
        lap: lapNumber,
        value: Number((gap - winnerGaps.get(lapNumber)!).toFixed(3)),
      }));
    if (values.length === 0) return [];
    const details = driverDetails(drivers, styles, driverNumber);
    return [{ key: `running-gap-${driverNumber}`, driverNumber, ...details, values }];
  });
}

export interface DegradationSeries extends StrategyLineSeries {
  stintNumber: number;
  compound: TireCompound;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

export function buildDegradationSeries(
  laps: Lap[],
  stints: Stint[],
  drivers: OpenF1Driver[],
  selectedDriverNumbers: number[],
  styles: Map<number, DriverVisualStyle> = buildDriverVisualStyleMap(drivers),
): DegradationSeries[] {
  const selected = new Set(selectedDriverNumbers);

  return stints
    .filter((stint) => selected.has(stint.driver_number))
    .sort((a, b) => a.driver_number - b.driver_number || a.stint_number - b.stint_number)
    .flatMap((stint) => {
      const stintLaps = laps
        .filter(
          (lap) =>
            lap.driver_number === stint.driver_number &&
            lap.lap_number >= stint.lap_start &&
            lap.lap_number <= (stint.lap_end ?? Infinity) &&
            lap.lap_duration != null &&
            lap.lap_duration > 0 &&
            !lap.is_pit_out_lap
        )
        .sort((a, b) => a.lap_number - b.lap_number) as Array<Lap & { lap_duration: number }>;

      if (stintLaps.length < 2) return [];
      const durations = stintLaps.map((lap) => lap.lap_duration);
      const center = median(durations);
      const absoluteDeviations = durations.map((duration) => Math.abs(duration - center));
      const threshold = Math.max(3, median(absoluteDeviations) * 3);
      const cleanLaps = stintLaps.filter((lap) => Math.abs(lap.lap_duration - center) <= threshold);
      if (cleanLaps.length < 2) return [];

      const baseline = median(cleanLaps.slice(0, 3).map((lap) => lap.lap_duration));
      const rawValues = cleanLaps.map((lap) => ({
        lap: stint.tyre_age_at_start + (lap.lap_number - stint.lap_start),
        value: lap.lap_duration - baseline,
      }));
      const values = rawValues.map((point, index) => ({
        lap: point.lap,
        value: Number(median(rawValues.slice(Math.max(0, index - 2), index + 1).map((item) => item.value)).toFixed(3)),
      }));

      const details = driverDetails(drivers, styles, stint.driver_number);
      const compound = toTireCompound(stint.compound);
      return [{
        key: `degradation-${stint.driver_number}-${stint.stint_number}`,
        driverNumber: stint.driver_number,
        name: `${details.name} S${stint.stint_number} ${capitalize(compound)}`,
        color: details.color,
        lineStyle: details.lineStyle,
        stintNumber: stint.stint_number,
        compound,
        values,
      }];
    });
}

export function buildPositionSeries(
  laps: Lap[],
  positions: Position[],
  drivers: OpenF1Driver[],
  selectedDriverNumbers: number[],
  styles: Map<number, DriverVisualStyle> = buildDriverVisualStyleMap(drivers),
): StrategyLineSeries[] {
  return selectedDriverNumbers.flatMap((driverNumber) => {
    const driverLaps = laps
      .filter((lap) => lap.driver_number === driverNumber)
      .sort((a, b) => a.lap_number - b.lap_number);
    const driverPositions = positions
      .filter((position) => position.driver_number === driverNumber)
      .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
    if (driverLaps.length === 0 || driverPositions.length === 0) return [];

    let positionIndex = 0;
    let latestPosition: number | null = null;
    const values: StrategyLinePoint[] = [];

    for (let index = 0; index < driverLaps.length; index += 1) {
      const lap = driverLaps[index];
      const nextLap = driverLaps[index + 1];
      const endTimestamp = nextLap ? Date.parse(nextLap.date_start) : Number.POSITIVE_INFINITY;
      while (
        positionIndex < driverPositions.length &&
        Date.parse(driverPositions[positionIndex].date) <= endTimestamp
      ) {
        latestPosition = driverPositions[positionIndex].position;
        positionIndex += 1;
      }
      if (latestPosition != null) values.push({ lap: lap.lap_number, value: latestPosition });
    }

    const details = driverDetails(drivers, styles, driverNumber);
    return values.length > 0
      ? [{ key: `position-${driverNumber}`, driverNumber, ...details, values }]
      : [];
  });
}

// ─── Stats helpers ────────────────────────────────────────────────────────────

export type BestLap = Lap & { lap_duration: number };

/** Return the fastest valid lap from a set of laps. */
export function getBestLap(laps: Lap[]): BestLap | null {
  let best: BestLap | null = null;
  for (const lap of laps) {
    if (lap.lap_duration == null || lap.lap_duration <= 0) continue;
    if (best === null || lap.lap_duration < best.lap_duration) best = lap as BestLap;
  }
  return best;
}

/** Best lap from a set of laps, formatted as "m:ss.SSS" */
export function getBestLapFormatted(laps: Lap[]): string {
  const best = getBestLap(laps);
  return best ? formatLapTime(best.lap_duration) : "—";
}

/** Best top speed across car data samples */
export function getTopSpeed(carData: CarData[]): string {
  if (carData.length === 0) return "—";
  return `${Math.max(...carData.map((d) => d.speed))} km/h`;
}
