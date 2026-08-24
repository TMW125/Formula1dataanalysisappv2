import { describe, expect, it } from "vitest";
import type { CarData, Lap } from "../types/openf1";
import {
  buildDeltaChartData,
  buildMetricChartData,
  buildNormalizedTelemetry,
  getFastestValidLap,
} from "./qualifyingTelemetry";

const lap = (driverNumber: number, lapNumber: number, duration: number | null, isPitOutLap = false): Lap => ({
  session_key: 10,
  meeting_key: 20,
  driver_number: driverNumber,
  lap_number: lapNumber,
  lap_duration: duration,
  duration_sector_1: null,
  duration_sector_2: null,
  duration_sector_3: null,
  i1_speed: null,
  i2_speed: null,
  st_speed: null,
  is_pit_out_lap: isPitOutLap,
  date_start: "2026-01-01T00:00:00Z",
});

const carData = (driverNumber: number): CarData[] => [
  { session_key: 10, meeting_key: 20, driver_number: driverNumber, date: "2026-01-01T00:00:00Z", speed: 100, rpm: 8_000, n_gear: 3, throttle: 80, brake: 0, drs: 0 },
  { session_key: 10, meeting_key: 20, driver_number: driverNumber, date: "2026-01-01T00:00:01Z", speed: 150, rpm: 9_000, n_gear: 5, throttle: 100, brake: 0, drs: 0 },
  { session_key: 10, meeting_key: 20, driver_number: driverNumber, date: "2026-01-01T00:00:02Z", speed: 100, rpm: 8_000, n_gear: 3, throttle: 40, brake: 100, drs: 0 },
];

describe("qualifying telemetry utilities", () => {
  it("selects the fastest valid lap and excludes pit-out or incomplete laps", () => {
    const laps = [
      lap(1, 1, 90, true),
      lap(1, 2, null),
      lap(1, 5, 0),
      lap(1, 6, -1),
      lap(1, 7, Number.NaN),
      lap(1, 3, 91),
      lap(1, 4, 89),
    ];

    expect(getFastestValidLap(laps, 1)?.lap_number).toBe(4);
    expect(getFastestValidLap(laps, 2)).toBeNull();
  });

  it("normalizes telemetry onto a shared lap-distance grid", () => {
    const points = buildNormalizedTelemetry(carData(1), lap(1, 1, 2), 5);

    expect(points).toHaveLength(5);
    expect(points[0].progress).toBe(0);
    expect(points.at(-1)?.progress).toBe(100);
    expect(points.at(-1)?.elapsed).toBe(2);
    expect(points[0].speed).toBe(100);
    expect(points[1].throttle).toBeGreaterThan(80);
    expect(points[1].throttle).toBeLessThan(100);
  });

  it("builds metric and delta chart rows using driver keys", () => {
    const first = buildNormalizedTelemetry(carData(1), lap(1, 1, 2), 3);
    const second = buildNormalizedTelemetry(carData(2), lap(2, 1, 2.5), 3);
    const series = [
      { driverNumber: 1, lap: lap(1, 1, 2), points: first },
      { driverNumber: 2, lap: lap(2, 1, 2.5), points: second },
    ];

    expect(buildMetricChartData(series, "speed")[0]).toMatchObject({ progress: 0, "driver-1": 100, "driver-2": 100 });
    expect(buildDeltaChartData(series, 1).at(-1)).toMatchObject({ progress: 100, "driver-1": 0, "driver-2": 0.5 });
  });
});
