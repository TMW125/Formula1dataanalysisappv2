import type { CarData, Lap } from "../types/openf1";

export const QUALIFYING_TELEMETRY_SAMPLE_COUNT = 101;

export type QualifyingTelemetryMetric = "speed" | "throttle" | "brake" | "gear" | "rpm";

export interface NormalizedTelemetryPoint {
  progress: number;
  elapsed: number;
  speed: number;
  throttle: number;
  brake: number;
  gear: number;
  rpm: number;
}

export interface QualifyingTelemetrySeries {
  driverNumber: number;
  lap: Lap;
  points: NormalizedTelemetryPoint[];
}

export type QualifyingChartPoint = { progress: number } & Record<string, number>;

interface TimedTelemetryPoint {
  progress: number;
  elapsed: number;
  speed: number;
  throttle: number;
  brake: number;
  gear: number;
  rpm: number;
}

export function getFastestValidLap(laps: Lap[], driverNumber: number): Lap | null {
  let fastest: Lap | null = null;

  for (const lap of laps) {
    if (
      lap.driver_number !== driverNumber
      || lap.lap_duration === null
      || !Number.isFinite(lap.lap_duration)
      || lap.lap_duration <= 0
      || lap.is_pit_out_lap
    ) continue;

    if (
      fastest === null
      || lap.lap_duration < fastest.lap_duration!
      || (lap.lap_duration === fastest.lap_duration && lap.lap_number < fastest.lap_number)
    ) {
      fastest = lap;
    }
  }

  return fastest;
}

export function getFastestValidLaps(laps: Lap[], driverNumbers: number[]): Map<number, Lap> {
  const fastest = new Map<number, Lap>();
  for (const driverNumber of driverNumbers) {
    const lap = getFastestValidLap(laps, driverNumber);
    if (lap) fastest.set(driverNumber, lap);
  }
  return fastest;
}

export function filterCarDataToLap(carData: CarData[], lap: Lap): CarData[] {
  if (lap.lap_duration === null || lap.lap_duration <= 0) return [];

  const lapStart = Date.parse(lap.date_start);
  if (!Number.isFinite(lapStart)) return [];
  const lapEnd = lapStart + lap.lap_duration * 1000;

  return carData
    .filter((point) => {
      const timestamp = Date.parse(point.date);
      return Number.isFinite(timestamp) && timestamp >= lapStart && timestamp <= lapEnd;
    })
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
}

function interpolate(points: TimedTelemetryPoint[], progress: number, key: keyof Omit<TimedTelemetryPoint, "progress">): number {
  if (points.length === 0) return 0;
  if (progress <= points[0].progress) return points[0][key];
  if (progress >= points.at(-1)!.progress) return points.at(-1)![key];

  for (let index = 1; index < points.length; index += 1) {
    const right = points[index];
    if (right.progress < progress) continue;
    const left = points[index - 1];
    const span = right.progress - left.progress;
    if (span <= 0) return right[key];
    const ratio = (progress - left.progress) / span;
    return left[key] + (right[key] - left[key]) * ratio;
  }

  return points.at(-1)![key];
}

export function buildNormalizedTelemetry(
  carData: CarData[],
  lap: Lap,
  sampleCount = QUALIFYING_TELEMETRY_SAMPLE_COUNT,
): NormalizedTelemetryPoint[] {
  const filtered = filterCarDataToLap(carData, lap);
  if (filtered.length < 2 || lap.lap_duration === null || lap.lap_duration <= 0) return [];

  const firstTimestamp = Date.parse(filtered[0].date);
  const timed = filtered.map((point, index) => {
    const timestamp = Date.parse(point.date);
    const elapsed = Math.max(0, (timestamp - firstTimestamp) / 1000);
    const previous = index > 0 ? filtered[index - 1] : null;
    const previousTimestamp = previous ? Date.parse(previous.date) : timestamp;
    const deltaSeconds = Math.max(0, (timestamp - previousTimestamp) / 1000);
    const previousSpeed = previous?.speed ?? point.speed;
    const distance = index === 0
      ? 0
      : ((previousSpeed + point.speed) / 2 / 3.6) * deltaSeconds;

    return {
      elapsed,
      distance,
      speed: point.speed,
      throttle: point.throttle,
      brake: point.brake > 0 ? 100 : 0,
      gear: point.n_gear,
      rpm: point.rpm,
    };
  });

  let cumulativeDistance = 0;
  const distancePoints = timed.map((point, index) => {
    if (index > 0) cumulativeDistance += point.distance;
    return { ...point, distance: cumulativeDistance };
  });
  const totalDistance = distancePoints.at(-1)!.distance;
  const observedElapsed = distancePoints.at(-1)!.elapsed;
  if (observedElapsed <= 0) return [];
  const elapsedScale = lap.lap_duration / observedElapsed;
  const progressPoints: TimedTelemetryPoint[] = distancePoints.map((point, index) => ({
    progress: totalDistance > 0 ? (point.distance / totalDistance) * 100 : (index / (distancePoints.length - 1)) * 100,
    elapsed: point.elapsed * elapsedScale,
    speed: point.speed,
    throttle: point.throttle,
    brake: point.brake,
    gear: point.gear,
    rpm: point.rpm,
  }));

  return Array.from({ length: Math.max(2, sampleCount) }, (_, index) => {
    const progress = (index / (Math.max(2, sampleCount) - 1)) * 100;
    return {
      progress,
      elapsed: interpolate(progressPoints, progress, "elapsed"),
      speed: interpolate(progressPoints, progress, "speed"),
      throttle: interpolate(progressPoints, progress, "throttle"),
      brake: interpolate(progressPoints, progress, "brake"),
      gear: Math.round(interpolate(progressPoints, progress, "gear")),
      rpm: interpolate(progressPoints, progress, "rpm"),
    };
  });
}

export function buildMetricChartData(
  series: QualifyingTelemetrySeries[],
  metric: QualifyingTelemetryMetric,
): QualifyingChartPoint[] {
  if (series.length === 0) return [];
  const sampleCount = Math.min(...series.map((item) => item.points.length));

  return Array.from({ length: sampleCount }, (_, index) => {
    const point: QualifyingChartPoint = { progress: series[0].points[index].progress };
    for (const item of series) {
      point[`driver-${item.driverNumber}`] = item.points[index][metric];
    }
    return point;
  });
}

export function buildDeltaChartData(
  series: QualifyingTelemetrySeries[],
  referenceDriverNumber: number | null,
): QualifyingChartPoint[] {
  const reference = series.find((item) => item.driverNumber === referenceDriverNumber);
  if (!reference || series.length === 0) return [];
  const sampleCount = Math.min(...series.map((item) => item.points.length));

  return Array.from({ length: sampleCount }, (_, index) => {
    const referencePoint = reference.points[index];
    const point: QualifyingChartPoint = { progress: referencePoint.progress };
    for (const item of series) {
      point[`driver-${item.driverNumber}`] = Number((item.points[index].elapsed - referencePoint.elapsed).toFixed(3));
    }
    return point;
  });
}
