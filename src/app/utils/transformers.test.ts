import { describe, expect, it } from "vitest";
import type { Lap, OpenF1Driver, Pit, Position, SessionResult, Stint } from "../types/openf1";
import {
  buildCumulativeDeltaSeries,
  buildDefaultDriverSelection,
  buildDegradationSeries,
  buildLapTimeSeries,
  buildPositionSeries,
} from "./transformers";

const driver = (driver_number: number, name_acronym: string): OpenF1Driver => ({
  driver_number,
  name_acronym,
  full_name: name_acronym,
  broadcast_name: name_acronym,
  team_name: "Test Team",
  team_colour: driver_number === 1 ? "ff0000" : "0000ff",
  country_code: "GBR",
  headshot_url: null,
  session_key: 10,
  meeting_key: 20,
});

const lap = (driver_number: number, lap_number: number, lap_duration: number, date_start = `2026-01-01T00:0${lap_number}:00Z`): Lap => ({
  driver_number,
  lap_number,
  lap_duration,
  date_start,
  session_key: 10,
  meeting_key: 20,
  duration_sector_1: null,
  duration_sector_2: null,
  duration_sector_3: null,
  i1_speed: null,
  i2_speed: null,
  st_speed: null,
  is_pit_out_lap: false,
});

const result = (driver_number: number, position: number, dnf = false): SessionResult => ({
  driver_number,
  position,
  dnf,
  dns: false,
  dsq: false,
  duration: null,
  gap_to_leader: null,
  number_of_laps: dnf ? 1 : 3,
  session_key: 10,
  meeting_key: 20,
});

describe("race strategy transformers", () => {
  it("selects the highest classified finishers and excludes retirements", () => {
    const drivers = [driver(1, "ONE"), driver(2, "TWO"), driver(3, "THR")];
    expect(buildDefaultDriverSelection(drivers, [result(3, 1, true), result(2, 2), result(1, 3)], [], 2)).toEqual([2, 1]);
  });

  it("normalizes cumulative time after lap one and stops at missing data", () => {
    const drivers = [driver(1, "ONE"), driver(2, "TWO")];
    const laps = [lap(1, 1, 100), lap(1, 2, 90), lap(1, 3, 90), lap(2, 1, 102), lap(2, 2, 91)];
    const built = buildCumulativeDeltaSeries(laps, drivers, [1, 2], [result(1, 1), result(2, 2)]);
    expect(built.referenceDriverNumber).toBe(1);
    expect(built.series.find((line) => line.driverNumber === 2)?.values).toEqual([
      { lap: 1, value: 0 },
      { lap: 2, value: 1 },
    ]);
  });

  it("builds lap-time series for the selected drivers", () => {
    const drivers = [driver(1, "ONE"), driver(2, "TWO")];
    const pitOutLap = { ...lap(1, 3, 110), is_pit_out_lap: true };
    const laps = [lap(1, 2, 91.5), lap(2, 1, 93), lap(1, 1, 90), pitOutLap, lap(1, 4, 115), lap(1, 5, 140), lap(2, 2, 0)];
    const pits: Pit[] = [{
      driver_number: 1, lap_number: 4, pit_duration: null, lane_duration: 20,
      stop_duration: 2.5, date: "2026-01-01T00:04:00Z", session_key: 10, meeting_key: 20,
    }];
    const built = buildLapTimeSeries(laps, pits, drivers, [1]);
    expect(built).toHaveLength(1);
    expect(built[0].values).toEqual([
      { lap: 1, value: 90 },
      { lap: 2, value: 91.5 },
    ]);
  });

  it("calculates tyre age while filtering an obvious slow-lap outlier", () => {
    const drivers = [driver(1, "ONE")];
    const laps = [lap(1, 1, 90), lap(1, 2, 91), lap(1, 3, 120), lap(1, 4, 92)];
    const stints: Stint[] = [{
      driver_number: 1, stint_number: 1, lap_start: 1, lap_end: 4,
      compound: "MEDIUM", tyre_age_at_start: 2, session_key: 10, meeting_key: 20,
    }];
    const built = buildDegradationSeries(laps, stints, drivers, [1]);
    expect(built[0].values.map((point) => point.lap)).toEqual([2, 3, 5]);
    expect(built[0].values.every((point) => Math.abs(point.value) < 5)).toBe(true);
  });

  it("maps the latest position sample to each completed lap", () => {
    const drivers = [driver(1, "ONE")];
    const laps = [lap(1, 1, 90, "2026-01-01T00:00:00Z"), lap(1, 2, 90, "2026-01-01T00:02:00Z")];
    const positions: Position[] = [
      { driver_number: 1, position: 4, date: "2026-01-01T00:01:30Z", session_key: 10, meeting_key: 20 },
      { driver_number: 1, position: 2, date: "2026-01-01T00:03:30Z", session_key: 10, meeting_key: 20 },
    ];
    expect(buildPositionSeries(laps, positions, drivers, [1])[0].values).toEqual([
      { lap: 1, value: 4 },
      { lap: 2, value: 2 },
    ]);
  });
});
