import type { Page } from "@playwright/test";

const QUALIFYING_START = Date.parse("2024-01-01T12:00:00Z");
const RACE_START = Date.parse("2024-01-02T12:00:00Z");

export interface FixtureTracker {
  openF1Urls: string[];
}

interface EndpointFailure {
  status: number;
  /** Omit to fail every matching request. */
  times?: number;
}

export interface FixtureOptions {
  endpointFailures?: Record<string, EndpointFailure>;
  abortEndpoints?: string[];
  emptyEndpoints?: string[];
  delayMsByEndpoint?: Record<string, number>;
  malformedSessions?: boolean;
}

function drivers(sessionKey: number) {
  return Array.from({ length: 22 }, (_, index) => ({
    driver_number: index + 1,
    broadcast_name: `DRIVER ${index + 1}`,
    full_name: `Driver ${index + 1}`,
    name_acronym: `D${String(index + 1).padStart(2, "0")}`,
    team_name: `Team ${Math.floor(index / 2) + 1}`,
    team_colour: index % 2 === 0 ? "e10600" : "0090ff",
    country_code: "GBR",
    headshot_url: null,
    session_key: sessionKey,
    meeting_key: 1290,
  }));
}

function laps(sessionKey: number) {
  const start = sessionKey === 9001 ? QUALIFYING_START : RACE_START;
  return drivers(sessionKey).map((driver, index) => ({
    session_key: sessionKey,
    meeting_key: 1290,
    driver_number: driver.driver_number,
    lap_number: 1,
    lap_duration: 88 + index * 0.2,
    duration_sector_1: 29,
    duration_sector_2: 30,
    duration_sector_3: 29 + index * 0.2,
    i1_speed: 280,
    i2_speed: 290,
    st_speed: 310,
    is_pit_out_lap: false,
    date_start: new Date(start + 1_000).toISOString(),
  }));
}

function results(sessionKey: number) {
  return drivers(sessionKey).map((driver, index) => ({
    session_key: sessionKey,
    meeting_key: 1290,
    driver_number: driver.driver_number,
    position: index + 1,
    duration: 5_400 + index,
    gap_to_leader: index === 0 ? null : index * 1.25,
    number_of_laps: sessionKey === 9001 ? 1 : 60,
    dnf: false,
    dns: false,
    dsq: false,
  }));
}

function endpointPayload(url: URL) {
  const endpoint = url.pathname.split("/").at(-1);
  const sessionKey = Number(url.searchParams.get("session_key")) || 9002;
  if (endpoint === "meetings") {
    return [
      {
        meeting_key: 1289,
        meeting_name: "Pre-Season Testing",
        meeting_official_name: "Testing One",
        location: "Barcelona",
        country_name: "Spain",
        country_code: "ESP",
        circuit_short_name: "Catalunya",
        circuit_type: "Race",
        year: 2026,
        date_start: "2024-01-01T00:00:00Z",
        circuit_info_url: "https://fixtures.local/circuit.json",
      },
      {
        meeting_key: 1290,
        meeting_name: "Pre-Season Testing",
        meeting_official_name: "Testing Two",
        location: "Bahrain",
        country_name: "Bahrain",
        country_code: "BHR",
        circuit_short_name: "Sakhir",
        circuit_type: "Race",
        year: 2026,
        date_start: "2024-02-01T00:00:00Z",
        circuit_info_url: "https://fixtures.local/circuit.json",
      },
    ];
  }
  if (endpoint === "sessions") {
    return [
      {
        session_key: 9001,
        meeting_key: 1290,
        session_name: "Qualifying",
        session_type: "Qualifying",
        date_start: new Date(QUALIFYING_START).toISOString(),
        date_end: new Date(QUALIFYING_START + 60 * 60_000).toISOString(),
        year: 2026,
        location: "Bahrain",
        country_name: "Bahrain",
        circuit_short_name: "Sakhir",
      },
      {
        session_key: 9002,
        meeting_key: 1290,
        session_name: "Race",
        session_type: "Race",
        date_start: new Date(RACE_START).toISOString(),
        date_end: new Date(RACE_START + 2 * 60 * 60_000).toISOString(),
        year: 2026,
        location: "Bahrain",
        country_name: "Bahrain",
        circuit_short_name: "Sakhir",
      },
    ];
  }
  if (endpoint === "drivers") return drivers(sessionKey);
  if (endpoint === "laps") return laps(sessionKey);
  if (endpoint === "session_result") return results(sessionKey);
  if (endpoint === "car_data") {
    const driverNumber = Number(url.searchParams.get("driver_number"));
    const start = QUALIFYING_START + 1_000;
    return [0, 44_000, 88_000].map((offset, index) => ({
      session_key: sessionKey,
      meeting_key: 1290,
      driver_number: driverNumber,
      date: new Date(start + offset).toISOString(),
      speed: 220 + index * 30,
      rpm: 9_000 + index * 1_000,
      n_gear: 5 + index,
      throttle: index === 1 ? 50 : 100,
      brake: index === 1 ? 100 : 0,
      drs: index === 2 ? 12 : 0,
    }));
  }
  if (endpoint === "stints") {
    return drivers(sessionKey).map((driver) => ({
      session_key: sessionKey,
      meeting_key: 1290,
      driver_number: driver.driver_number,
      stint_number: 1,
      lap_start: 1,
      lap_end: 60,
      compound: "MEDIUM",
      tyre_age_at_start: 0,
    }));
  }
  if (endpoint === "position") {
    return drivers(sessionKey).map((driver, index) => ({
      session_key: sessionKey,
      meeting_key: 1290,
      driver_number: driver.driver_number,
      date: new Date(RACE_START + 10_000).toISOString(),
      position: index + 1,
    }));
  }
  if (endpoint === "intervals") {
    return drivers(sessionKey).map((driver, index) => ({
      session_key: sessionKey,
      meeting_key: 1290,
      driver_number: driver.driver_number,
      date: new Date(RACE_START + 20_000).toISOString(),
      interval: index === 0 ? null : 1.25,
      gap_to_leader: index === 0 ? null : index * 1.25,
    }));
  }
  if (endpoint === "weather") {
    return [{
      session_key: sessionKey,
      meeting_key: 1290,
      date: new Date(RACE_START).toISOString(),
      air_temperature: 25,
      track_temperature: 35,
      humidity: 45,
      pressure: 1_010,
      wind_speed: 2,
      wind_direction: 90,
      rainfall: 0,
    }];
  }
  if (endpoint === "race_control") {
    return ["RED", "SESSION STOPPED"].map((title, index) => ({
      session_key: sessionKey,
      meeting_key: 1290,
      date: new Date(RACE_START + 30_000).toISOString(),
      driver_number: null,
      lap_number: 1,
      category: "Flag",
      flag: index === 0 ? "RED" : null,
      scope: "Track",
      sector: null,
      message: title,
    }));
  }
  if (endpoint === "starting_grid") {
    return drivers(sessionKey).map((driver, index) => ({
      session_key: sessionKey,
      meeting_key: 1290,
      driver_number: driver.driver_number,
      position: index + 1,
      lap_duration: null,
    }));
  }
  if (endpoint === "location") {
    return drivers(sessionKey).flatMap((driver) => [0, 2_000].map((offset) => ({
      session_key: sessionKey,
      meeting_key: 1290,
      driver_number: driver.driver_number,
      date: new Date(RACE_START + offset).toISOString(),
      x: driver.driver_number * 10 + offset / 100,
      y: driver.driver_number * 5,
      z: 0,
    })));
  }
  return [];
}

export async function installOpenF1Fixtures(page: Page, options: FixtureOptions = {}): Promise<FixtureTracker> {
  const tracker: FixtureTracker = { openF1Urls: [] };
  const requestCounts = new Map<string, number>();
  await page.route("https://fonts.googleapis.com/**", (route) => route.fulfill({
    status: 200,
    contentType: "text/css",
    body: "",
  }));
  await page.route("https://api.openf1.org/v1/**", async (route) => {
    const requestUrl = route.request().url();
    tracker.openF1Urls.push(requestUrl);
    const parsedUrl = new URL(requestUrl);
    const endpoint = parsedUrl.pathname.split("/").at(-1) ?? "";
    const requestCount = (requestCounts.get(endpoint) ?? 0) + 1;
    requestCounts.set(endpoint, requestCount);

    if (options.abortEndpoints?.includes(endpoint)) {
      await route.abort("internetdisconnected");
      return;
    }

    const delayMs = options.delayMsByEndpoint?.[endpoint] ?? 0;
    if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));

    const configuredFailure = options.endpointFailures?.[endpoint];
    if (configuredFailure && (configuredFailure.times === undefined || requestCount <= configuredFailure.times)) {
      await route.fulfill({
        status: configuredFailure.status,
        contentType: "application/json",
        headers: configuredFailure.status === 429
          ? { "Retry-After": "0", "Access-Control-Expose-Headers": "Retry-After" }
          : undefined,
        body: JSON.stringify({ detail: `Fixture ${configuredFailure.status} for ${endpoint}` }),
      });
      return;
    }

    let payload: unknown = options.emptyEndpoints?.includes(endpoint) ? [] : endpointPayload(parsedUrl);
    if (endpoint === "sessions" && options.malformedSessions && Array.isArray(payload)) {
      payload = payload.map((session) => ({ ...session, date_end: "invalid-date" }));
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  });
  await page.route("https://fixtures.local/circuit.json", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ x: [0, 100, 100, 0, 0], y: [0, 0, 100, 100, 0], circuitName: "Fixture Circuit", rotation: 0 }),
  }));
  return tracker;
}
