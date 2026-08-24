import { describe, expect, it } from "vitest";
import type { Interval, Lap, OpenF1Driver, Pit, Position, SessionResult, Stint } from "../types/openf1";
import {
  buildDriverVisualStyleMap,
  buildDefaultDriverSelection,
  buildDegradationSeries,
  buildLapTimeSeries,
  buildPositionSeries,
  buildRunningGapSeries,
  formatLapTime,
  getBestLap,
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

const interval = (
  driver_number: number,
  date: string,
  gap_to_leader: number | string | null,
  intervalValue: number | string | null = gap_to_leader,
): Interval => ({
  driver_number,
  date,
  gap_to_leader,
  interval: intervalValue,
  session_key: 10,
  meeting_key: 20,
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
  it("returns the fastest lap and keeps its driver number", () => {
    const laps = [lap(2, 1, 91.2), lap(1, 1, 90.5), lap(2, 2, 89.9), lap(1, 2, 0)];
    const best = getBestLap(laps);

    expect(best?.driver_number).toBe(2);
    expect(best?.lap_duration).toBe(89.9);
    expect(formatLapTime(best!.lap_duration)).toBe("1:29.900");
  });

  it("assigns stable solid and dashed styles within each team", () => {
    const alphaFirst = { ...driver(1, "ONE"), team_name: "Alpha" };
    const alphaSecond = { ...driver(11, "ELEVEN"), team_name: "Alpha" };
    const beta = { ...driver(2, "TWO"), team_name: "Beta" };
    const missingTeamFirst = { ...driver(4, "FOUR"), team_name: "", team_colour: "abcdef" };
    const missingTeamSecond = { ...driver(5, "FIVE"), team_name: "", team_colour: "abcdef" };
    const styles = buildDriverVisualStyleMap([alphaSecond, beta, missingTeamSecond, alphaFirst, missingTeamFirst]);

    expect(styles.get(1)).toEqual({ color: "#ff0000", lineStyle: "solid" });
    expect(styles.get(11)).toEqual({ color: "#0000ff", lineStyle: "dashed" });
    expect(styles.get(2)?.lineStyle).toBe("solid");
    expect(styles.get(4)?.lineStyle).toBe("solid");
    expect(styles.get(5)?.lineStyle).toBe("dashed");
  });

  it("selects the highest classified finishers and excludes retirements", () => {
    const drivers = [driver(1, "ONE"), driver(2, "TWO"), driver(3, "THR")];
    expect(buildDefaultDriverSelection(drivers, [result(3, 1, true), result(2, 2), result(1, 3)], [], 2)).toEqual([2, 1]);
  });

  it("normalizes lap-aligned running gaps against the official race winner", () => {
    const drivers = [driver(1, "ONE"), driver(2, "TWO")];
    const laps = [
      lap(1, 1, 90, "2026-01-01T00:00:00Z"), lap(1, 2, 90, "2026-01-01T00:01:30Z"), lap(1, 3, 90, "2026-01-01T00:03:00Z"),
      lap(2, 1, 90, "2026-01-01T00:00:00Z"), lap(2, 2, 90, "2026-01-01T00:01:30Z"), lap(2, 3, 90, "2026-01-01T00:03:00Z"),
    ];
    const intervals = [
      interval(1, "2026-01-01T00:00:20Z", null),
      interval(1, "2026-01-01T00:01:40Z", 1.0),
      interval(1, "2026-01-01T00:03:20Z", null),
      interval(2, "2026-01-01T00:00:20Z", 0.2),
      interval(2, "2026-01-01T00:01:40Z", 2.0),
      interval(2, "2026-01-01T00:02:20Z", 2.2),
      interval(2, "2026-01-01T00:03:20Z", "+1 LAP"),
    ];
    const built = buildRunningGapSeries(laps, intervals, drivers, [1, 2], [result(1, 1), result(2, 2)]);

    expect(built.find((line) => line.driverNumber === 1)?.lineStyle).toBe("solid");
    expect(built.find((line) => line.driverNumber === 1)?.values).toEqual([
      { lap: 1, value: 0 },
      { lap: 2, value: 0 },
      { lap: 3, value: 0 },
    ]);
    expect(built.find((line) => line.driverNumber === 2)?.lineStyle).toBe("dashed");
    expect(built.find((line) => line.driverNumber === 2)?.values).toEqual([
      { lap: 1, value: 0.2 },
      { lap: 2, value: 1.2 },
    ]);
  });

  it("interpolates missing and lapped lap gaps from surrounding samples", () => {
    const drivers = [driver(1, "ONE"), driver(2, "TWO")];
    const laps = [
      lap(1, 1, 90, "2026-01-01T00:00:00Z"), lap(1, 2, 90, "2026-01-01T00:01:30Z"), lap(1, 3, 90, "2026-01-01T00:03:00Z"),
      lap(2, 1, 90, "2026-01-01T00:00:00Z"), lap(2, 2, 90, "2026-01-01T00:01:30Z"), lap(2, 3, 90, "2026-01-01T00:03:00Z"),
    ];
    const intervals = [
      interval(1, "2026-01-01T00:00:20Z", null),
      interval(1, "2026-01-01T00:01:40Z", null, 0.2),
      interval(1, "2026-01-01T00:03:20Z", null),
      interval(2, "2026-01-01T00:00:20Z", 0.5),
      interval(2, "2026-01-01T00:01:40Z", "+1 LAP"),
      interval(2, "2026-01-01T00:03:20Z", 1.5),
    ];
    const built = buildRunningGapSeries(laps, intervals, drivers, [1, 2], [result(1, 1), result(2, 2)]);

    expect(built.find((line) => line.driverNumber === 1)?.values).toEqual([
      { lap: 1, value: 0 },
      { lap: 2, value: 0 },
      { lap: 3, value: 0 },
    ]);
    expect(built.find((line) => line.driverNumber === 2)?.values).toEqual([
      { lap: 1, value: 0.5 },
      { lap: 2, value: 1 },
      { lap: 3, value: 1.5 },
    ]);
  });

  it("keeps a complete running-gap series unchanged", () => {
    const drivers = [driver(1, "ONE"), driver(2, "TWO")];
    const laps = [
      lap(1, 1, 90, "2026-01-01T00:00:00Z"), lap(1, 2, 90, "2026-01-01T00:01:30Z"),
      lap(2, 1, 90, "2026-01-01T00:00:00Z"), lap(2, 2, 90, "2026-01-01T00:01:30Z"),
    ];
    const intervals = [interval(1, "2026-01-01T00:00:20Z", 0), interval(1, "2026-01-01T00:01:40Z", 0), interval(2, "2026-01-01T00:00:20Z", 0.5), interval(2, "2026-01-01T00:01:40Z", 1.5)];
    const built = buildRunningGapSeries(laps, intervals, drivers, [1, 2], [result(1, 1), result(2, 2)]);

    expect(built.find((line) => line.driverNumber === 2)?.values).toEqual([
      { lap: 1, value: 0.5 },
      { lap: 2, value: 1.5 },
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
