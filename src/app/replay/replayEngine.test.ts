import { describe, expect, it } from "vitest";
import { advanceReplayTime, buildReplayEvents, buildReplayFrame, clusterReplayEvents, createReplayIndex, formatReplayGap, getReplayEnd, isTimelineMarkerEvent } from "./replayEngine";
import type { ReplayDataset, ReplayEvent } from "./types";

const START = Date.parse("2024-01-01T12:00:00Z");
const END = START + 60_000;

function dataset(): ReplayDataset {
  return {
    session: { session_key: 1, meeting_key: 1, session_name: "Race", session_type: "Race", date_start: new Date(START).toISOString(), date_end: new Date(END).toISOString(), year: 2024, location: "Test", country_name: "GB", circuit_short_name: "Test Ring" },
    drivers: [
      { driver_number: 1, broadcast_name: "ONE", full_name: "Driver One", name_acronym: "ONE", team_name: "Alpha", team_colour: "ff0000", country_code: "GB", headshot_url: null, session_key: 1, meeting_key: 1 },
      { driver_number: 2, broadcast_name: "TWO", full_name: "Driver Two", name_acronym: "TWO", team_name: "Beta", team_colour: "00ff00", country_code: "GB", headshot_url: null, session_key: 1, meeting_key: 1 },
    ],
    laps: [
      { session_key: 1, meeting_key: 1, driver_number: 1, lap_number: 1, lap_duration: 10, duration_sector_1: 3, duration_sector_2: 3, duration_sector_3: 4, i1_speed: null, i2_speed: null, st_speed: null, is_pit_out_lap: false, date_start: new Date(START + 1_000).toISOString() },
      { session_key: 1, meeting_key: 1, driver_number: 2, lap_number: 1, lap_duration: 11, duration_sector_1: 3, duration_sector_2: 4, duration_sector_3: 4, i1_speed: null, i2_speed: null, st_speed: null, is_pit_out_lap: false, date_start: new Date(START + 1_000).toISOString() },
    ],
    positions: [{ session_key: 1, meeting_key: 1, driver_number: 2, position: 1, date: new Date(START + 20_000).toISOString() }],
    intervals: [{ session_key: 1, meeting_key: 1, driver_number: 1, interval: "+1 LAP", gap_to_leader: "+1 LAP", date: new Date(START + 20_000).toISOString() }],
    stints: [{ session_key: 1, meeting_key: 1, driver_number: 1, stint_number: 1, lap_start: 1, lap_end: 3, compound: "SOFT", tyre_age_at_start: 0 }],
    pits: [{ session_key: 1, meeting_key: 1, driver_number: 1, lap_number: 1, pit_duration: 20, lane_duration: 20, stop_duration: 2.4, date: new Date(START + 25_000).toISOString() }],
    weather: [{ session_key: 1, meeting_key: 1, date: new Date(START).toISOString(), air_temperature: 20, track_temperature: 30, humidity: 50, pressure: 1000, wind_speed: 2, wind_direction: 90, rainfall: 0 }],
    raceControl: [{ session_key: 1, meeting_key: 1, date: new Date(START + 5_000).toISOString(), driver_number: null, lap_number: null, category: "Flag", flag: "GREEN", scope: "Track", sector: null, message: "GREEN LIGHT" }],
    overtakes: [{ session_key: 1, meeting_key: 1, date: new Date(START + 22_000).toISOString(), overtaking_driver_number: 2, overtaken_driver_number: 1, position: 1 }],
    teamRadio: [{ session_key: 1, meeting_key: 1, driver_number: 1, date: new Date(START + 10_000).toISOString(), recording_url: "https://example.com/radio.mp3" }],
    startingGrid: [{ session_key: 1, meeting_key: 1, driver_number: 1, position: 1, lap_duration: null }, { session_key: 1, meeting_key: 1, driver_number: 2, position: 2, lap_duration: null }],
    results: [{ session_key: 1, meeting_key: 1, driver_number: 2, position: 1, duration: 60, gap_to_leader: null, number_of_laps: 3, dnf: false, dns: false, dsq: false }, { session_key: 1, meeting_key: 1, driver_number: 1, position: 2, duration: 60, gap_to_leader: "+1 LAP", number_of_laps: 2, dnf: false, dns: false, dsq: false }],
    locations: [
      { session_key: 1, meeting_key: 1, driver_number: 1, date: new Date(START).toISOString(), x: 0, y: 0, z: 0 },
      { session_key: 1, meeting_key: 1, driver_number: 1, date: new Date(START + 2_000).toISOString(), x: 20, y: 10, z: 0 },
    ],
  };
}

describe("replay clock", () => {
  it.each([1, 2, 4, 8, 16])("advances at %sx", (speed) => {
    expect(advanceReplayTime(START, 250, speed, END).time).toBe(START + 250 * speed);
  });

  it("clamps at the session end", () => {
    expect(advanceReplayTime(END - 100, 1000, 16, END)).toEqual({ time: END, complete: true });
  });
});

describe("replay frames", () => {
  it("uses the grid at the start and interpolates fresh locations", () => {
    const frame = buildReplayFrame(createReplayIndex(dataset()), START + 1_000);
    expect(frame.drivers.map((driver) => driver.position)).toEqual([1, 2]);
    expect(frame.drivers[0].location).toEqual({ x: 10, y: 5 });
  });

  it("shows one known leader and lap-one tyres before a lap is completed", () => {
    const frame = buildReplayFrame(createReplayIndex(dataset()), START);
    const leaderLabels = frame.drivers.filter((driver) => driver.gap === "LEADER");

    expect(leaderLabels).toHaveLength(1);
    expect(leaderLabels[0].driver.driver_number).toBe(1);
    expect(frame.drivers.find((driver) => driver.driver.driver_number === 2)?.gap).toBe("—");
    expect(frame.drivers.find((driver) => driver.driver.driver_number === 1)?.compound).toBe("SOFT");
  });

  it("reconstructs pits, flags, events, lap gaps, and final results", () => {
    const index = createReplayIndex(dataset());
    const pitFrame = buildReplayFrame(index, START + 30_000);
    expect(pitFrame.flag).toBe("GREEN");
    expect(pitFrame.events.map((event) => event.kind)).toEqual(expect.arrayContaining(["pit", "overtake", "radio", "control"]));
    expect(pitFrame.drivers.find((driver) => driver.driver.driver_number === 1)?.inPit).toBe(true);
    expect(pitFrame.drivers.find((driver) => driver.driver.driver_number === 1)?.gap).toBe("+1 LAP");

    const finalFrame = buildReplayFrame(index, END);
    expect(finalFrame.drivers[0].driver.driver_number).toBe(2);
    expect(finalFrame.drivers[1].position).toBe(2);
  });

  it("hides stale locations and formats all gap variants", () => {
    expect(buildReplayFrame(createReplayIndex(dataset()), START + 10_000).drivers[0].location).toBeNull();
    expect(formatReplayGap(null, true)).toBe("LEADER");
    expect(formatReplayGap(null)).toBe("—");
    expect(formatReplayGap(0)).toBe("+0.000");
    expect(formatReplayGap(1.234)).toBe("+1.234");
    expect(formatReplayGap("+2 LAPS")).toBe("+2 LAPS");
  });

  it("holds a DNF driver's final location and fades it over ten replay seconds", () => {
    const retired = dataset();
    retired.results.find((result) => result.driver_number === 1)!.dnf = true;
    retired.raceControl.push({
      session_key: 1,
      meeting_key: 1,
      date: new Date(START + 20_000).toISOString(),
      driver_number: 1,
      lap_number: 1,
      category: "CarEvent",
      flag: null,
      scope: "Driver",
      sector: null,
      message: "CAR 1 STOPPED ON TRACK",
    });
    retired.locations.push({
      session_key: 1,
      meeting_key: 1,
      driver_number: 1,
      date: new Date(START + 20_000).toISOString(),
      x: 80,
      y: 40,
      z: 0,
    });
    const index = createReplayIndex(retired);

    const atRetirement = buildReplayFrame(index, START + 20_000).drivers.find(
      (driver) => driver.driver.driver_number === 1
    )!;
    expect(atRetirement.markerOpacity).toBe(1);
    expect(atRetirement.location).toEqual({ x: 80, y: 40 });

    const halfway = buildReplayFrame(index, START + 25_000).drivers.find(
      (driver) => driver.driver.driver_number === 1
    )!;
    expect(halfway.markerOpacity).toBeCloseTo(0.5);
    expect(halfway.location).toEqual({ x: 80, y: 40 });

    const faded = buildReplayFrame(index, START + 30_000).drivers.find(
      (driver) => driver.driver.driver_number === 1
    )!;
    expect(faded.markerOpacity).toBe(0);
    expect(faded.location).toBeNull();
  });
});

describe("replay bounds", () => {
  it("shrinks to the last recorded data and extends past the nominal end when needed", () => {
    const short = dataset();
    expect(getReplayEnd(short)).toBe(START + 35_000);

    const extended = dataset();
    extended.positions.push({
      session_key: 1,
      meeting_key: 1,
      driver_number: 1,
      position: 1,
      date: new Date(START + 150_000).toISOString(),
    });
    extended.raceControl.push({
      session_key: 1,
      meeting_key: 1,
      date: new Date(START + 90_000).toISOString(),
      driver_number: null,
      lap_number: null,
      category: "Flag",
      flag: "RED",
      scope: "Track",
      sector: null,
      message: "RED FLAG",
    });
    extended.raceControl.push({
      session_key: 1,
      meeting_key: 1,
      date: new Date(START + 110_000).toISOString(),
      driver_number: null,
      lap_number: null,
      category: "Flag",
      flag: "CHEQUERED",
      scope: "Track",
      sector: null,
      message: "CHEQUERED FLAG",
    });
    expect(getReplayEnd(extended)).toBe(START + 120_000);
  });
});

describe("timeline markers", () => {
  const event = (overrides: Partial<ReplayEvent>): ReplayEvent => ({
    id: "event",
    date: new Date(START).toISOString(),
    timestamp: START,
    kind: "control",
    title: "Race control",
    detail: "Safety car deployed",
    driverNumber: null,
    lapNumber: null,
    ...overrides,
  });

  it("shows race-control events except yellow flags and pit-entry messages", () => {
    expect(isTimelineMarkerEvent(event({ flag: "RED" }))).toBe(true);
    expect(isTimelineMarkerEvent(event({ flag: "YELLOW" }))).toBe(false);
    expect(isTimelineMarkerEvent(event({ flag: "DOUBLE YELLOW" }))).toBe(false);
    expect(isTimelineMarkerEvent(event({ title: "Other" }))).toBe(false);
    expect(isTimelineMarkerEvent(event({ title: "Blue" }))).toBe(false);
    expect(isTimelineMarkerEvent(event({ title: "Clear" }))).toBe(false);
    expect(isTimelineMarkerEvent(event({ title: "BLACK AND WHITE" }))).toBe(false);
    expect(isTimelineMarkerEvent(event({ detail: "CAR 4 ENTERED THE PIT LANE" }))).toBe(false);
  });

  it("does not mark feed events from other sources", () => {
    expect(isTimelineMarkerEvent(event({ kind: "overtake" }))).toBe(false);
    expect(isTimelineMarkerEvent(event({ kind: "pit" }))).toBe(false);
    expect(isTimelineMarkerEvent(event({ kind: "radio" }))).toBe(false);
  });

  it("excludes pre-session feed events while retaining their initial flag state", () => {
    const replay = dataset();
    replay.raceControl.unshift({
      session_key: 1,
      meeting_key: 1,
      date: new Date(START - 30_000).toISOString(),
      driver_number: null,
      lap_number: null,
      category: "Flag",
      flag: "RED",
      scope: "Track",
      sector: null,
      message: "SESSION START DELAYED",
    });

    expect(buildReplayEvents(replay).every((item) => item.timestamp >= START)).toBe(true);
    const initialFrame = buildReplayFrame(createReplayIndex(replay), START);
    expect(initialFrame.flag).toBe("RED");
    expect(initialFrame.events).toEqual([]);
  });

  it("clusters marker hit targets while keeping exact events", () => {
    const events = [
      event({ id: "a", timestamp: START + 30_000 }),
      event({ id: "b", timestamp: START + 30_000 }),
      event({ id: "c", timestamp: START + 31_000 }),
      event({ id: "d", timestamp: START + 50_000 }),
    ];
    const clusters = clusterReplayEvents(events, START, END, 600);

    expect(clusters).toHaveLength(2);
    expect(clusters[0].events.map((item) => item.id)).toEqual(["a", "b", "c"]);
    expect(clusters.flatMap((cluster) => cluster.events)).toHaveLength(events.length);
    expect(clusters[1].pixel - clusters[0].pixel).toBeGreaterThanOrEqual(28);
  });
});
