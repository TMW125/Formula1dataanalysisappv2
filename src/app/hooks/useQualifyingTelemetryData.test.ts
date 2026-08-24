import { describe, expect, it } from "vitest";
import type { Lap } from "../types/openf1";
import { getFastestValidLaps } from "../utils/qualifyingTelemetry";
import { buildQualifyingTelemetryRequests } from "./useQualifyingTelemetryData";

function lap(driverNumber: number, duration: number | null): Lap {
  return {
    session_key: 10,
    meeting_key: 20,
    driver_number: driverNumber,
    lap_number: 1,
    lap_duration: duration,
    duration_sector_1: null,
    duration_sector_2: null,
    duration_sector_3: null,
    i1_speed: null,
    i2_speed: null,
    st_speed: null,
    is_pit_out_lap: false,
    date_start: "2026-01-01T00:00:00Z",
  };
}

describe("qualifying telemetry requests", () => {
  it("requests car data only for selected drivers with a valid fastest lap", () => {
    const laps = [lap(1, 90), lap(2, null), lap(3, 91)];
    const fastestLaps = getFastestValidLaps(laps, [1, 2, 3, 4]);

    expect(buildQualifyingTelemetryRequests(10, [3, 4, 1], fastestLaps).map((request) => request.driverNumber)).toEqual([3, 1]);
  });

  it("does not create telemetry requests without a completed session", () => {
    const fastestLaps = getFastestValidLaps([lap(1, 90)], [1]);

    expect(buildQualifyingTelemetryRequests(null, [1], fastestLaps)).toEqual([]);
  });
});
