/**
 * OpenF1 API Service
 *
 * Centralised module for all OpenF1 REST API calls.
 * Base URL: https://api.openf1.org/v1
 *
 * All functions return typed responses.  Raw fetch errors (network, non-2xx)
 * are surfaced as thrown Error objects so callers can handle them with
 * try/catch or React Query's error boundaries.
 */

import type {
  CarData,
  CarDataParams,
  DriversParams,
  Interval,
  IntervalsParams,
  Lap,
  LapsParams,
  Meeting,
  MeetingsParams,
  OpenF1Driver,
  Pit,
  PitsParams,
  Position,
  PositionsParams,
  RaceControlEvent,
  RaceControlParams,
  Session,
  SessionResult,
  SessionResultParams,
  SessionsParams,
  Stint,
  StintsParams,
  Weather,
  WeatherParams,
} from "../types/openf1";

// ─── Base Config ─────────────────────────────────────────────────────────────

const BASE_URL = "https://api.openf1.org/v1";

// ─── Internal Helpers ─────────────────────────────────────────────────────────

/**
 * Serialise a params object into a query string, omitting keys whose value is
 * `undefined` or `null`.
 */
function buildQueryString(params: object): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts.length > 0 ? `?${parts.join("&")}` : "";
}

// ─── Rate Limiter (max 3 req/sec) ─────────────────────────────────────────────

/** Timestamps (ms) of requests dispatched within the current sliding window. */
const _reqTimestamps: number[] = [];

/**
 * Schedule `fn` so that no more than 3 requests are dispatched per second.
 * Uses a sliding-window check; retries after the oldest in-window request
 * falls outside the 1-second boundary.
 */
function rateLimited<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const attempt = () => {
      const now = Date.now();
      // Drop timestamps older than 1 second
      while (_reqTimestamps.length > 0 && now - _reqTimestamps[0] >= 1000) {
        _reqTimestamps.shift();
      }
      if (_reqTimestamps.length < 3) {
        _reqTimestamps.push(now);
        fn().then(resolve).catch(reject);
      } else {
        // Wait until the oldest slot leaves the 1-second window (+ 20 ms buffer)
        const waitMs = 1000 - (now - _reqTimestamps[0]) + 20;
        setTimeout(attempt, waitMs);
      }
    };
    attempt();
  });
}

/**
 * Core fetch wrapper.  Validates HTTP status and deserialises JSON.
 * All calls are routed through the rate limiter before being dispatched.
 */
async function apiFetch<T>(endpoint: string, params: object = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}${buildQueryString(params)}`;
  return rateLimited(() =>
    fetch(url, { headers: { Accept: "application/json" } }).then((response) => {
      if (!response.ok) {
        throw new Error(
          `OpenF1 API error: ${response.status} ${response.statusText} — ${url}`
        );
      }
      return response.json() as Promise<T>;
    })
  );
}

// ─── Meetings ────────────────────────────────────────────────────────────────

/**
 * Fetch all meetings (race weekends) for a given season year.
 *
 * @example
 * const meetings = await getMeetingsBySeason(2024);
 */
export async function getMeetingsBySeason(season: number | string): Promise<Meeting[]> {
  return apiFetch<Meeting[]>("/meetings", { year: season } satisfies MeetingsParams);
}

/**
 * Fetch a single meeting by its unique key.
 */
export async function getMeetingByKey(meetingKey: number): Promise<Meeting[]> {
  return apiFetch<Meeting[]>("/meetings", { meeting_key: meetingKey } satisfies MeetingsParams);
}

// ─── Sessions ────────────────────────────────────────────────────────────────

/**
 * Fetch all sessions that belong to a given meeting.
 *
 * @example
 * const sessions = await getSessionsByMeeting(1219);
 */
export async function getSessionsByMeeting(meetingKey: number): Promise<Session[]> {
  return apiFetch<Session[]>("/sessions", { meeting_key: meetingKey } satisfies SessionsParams);
}

/**
 * Fetch all sessions for an entire season.
 */
export async function getSessionsBySeason(season: number | string): Promise<Session[]> {
  return apiFetch<Session[]>("/sessions", { year: season } satisfies SessionsParams);
}

/**
 * Fetch a single session by its unique key.
 */
export async function getSessionByKey(sessionKey: number): Promise<Session[]> {
  return apiFetch<Session[]>("/sessions", { session_key: sessionKey } satisfies SessionsParams);
}

// ─── Drivers ─────────────────────────────────────────────────────────────────

/**
 * Fetch all drivers who participated in a given session.
 *
 * @example
 * const drivers = await getDrivers(9158);
 */
export async function getDrivers(sessionKey: number, driverNumber?: number): Promise<OpenF1Driver[]> {
  const params: DriversParams = { session_key: sessionKey };
  if (driverNumber !== undefined) params.driver_number = driverNumber;
  return apiFetch<OpenF1Driver[]>("/drivers", params);
}

// ─── Laps ─────────────────────────────────────────────────────────────────────

/**
 * Fetch all laps for a given session, optionally filtered by driver.
 *
 * @example
 * const laps = await getLaps(9158);
 * const verstappenLaps = await getLaps(9158, 1);
 */
export async function getLaps(sessionKey: number, driverNumber?: number): Promise<Lap[]> {
  const params: LapsParams = { session_key: sessionKey };
  if (driverNumber !== undefined) params.driver_number = driverNumber;
  return apiFetch<Lap[]>("/laps", params);
}

// ─── Car Data ─────────────────────────────────────────────────────────────────

/**
 * Fetch sampled car telemetry (speed, RPM, throttle, brake, gear, DRS) for a
 * session, optionally filtered by driver.
 *
 * ⚠️  This endpoint can return very large payloads.  Consider filtering by
 * driver_number and adding date range parameters if performance is a concern.
 *
 * @example
 * const carData = await getCarData(9158, 1); // Verstappen only
 */
export async function getCarData(sessionKey: number, driverNumber?: number): Promise<CarData[]> {
  const params: CarDataParams = { session_key: sessionKey };
  if (driverNumber !== undefined) params.driver_number = driverNumber;
  return apiFetch<CarData[]>("/car_data", params);
}

// ─── Positions ────────────────────────────────────────────────────────────────

/**
 * Fetch on-track race/qualifying positions for a session.
 *
 * @example
 * const positions = await getPositions(9158);
 */
export async function getPositions(sessionKey: number, driverNumber?: number): Promise<Position[]> {
  const params: PositionsParams = { session_key: sessionKey };
  if (driverNumber !== undefined) params.driver_number = driverNumber;
  return apiFetch<Position[]>("/position", params);
}

// ─── Intervals ────────────────────────────────────────────────────────────────

/**
 * Fetch interval/gap data (gap to car ahead and gap to leader) for a session.
 */
export async function getIntervals(sessionKey: number, driverNumber?: number): Promise<Interval[]> {
  const params: IntervalsParams = { session_key: sessionKey };
  if (driverNumber !== undefined) params.driver_number = driverNumber;
  return apiFetch<Interval[]>("/intervals", params);
}

// ─── Stints ──────────────────────────────────────────────────────────────────

/**
 * Fetch tyre stint data for a session.
 */
export async function getStints(sessionKey: number, driverNumber?: number): Promise<Stint[]> {
  const params: StintsParams = { session_key: sessionKey };
  if (driverNumber !== undefined) params.driver_number = driverNumber;
  return apiFetch<Stint[]>("/stints", params);
}

// ─── Pit Stops ────────────────────────────────────────────────────────────────

/**
 * Fetch pit stop data for a session.
 */
export async function getPits(sessionKey: number, driverNumber?: number): Promise<Pit[]> {
  const params: PitsParams = { session_key: sessionKey };
  if (driverNumber !== undefined) params.driver_number = driverNumber;
  return apiFetch<Pit[]>("/pit", params);
}

// ─── Weather ──────────────────────────────────────────────────────────────────

/**
 * Fetch weather samples recorded during a session.
 */
export async function getWeather(sessionKey: number): Promise<Weather[]> {
  const params: WeatherParams = { session_key: sessionKey };
  return apiFetch<Weather[]>("/weather", params);
}

// ─── Race Control ────────────────────────────────────────────────────────────

/**
 * Fetch race control messages (flags, safety car, VSC, DRS zones, etc.) for a
 * session.
 */
export async function getRaceControl(sessionKey: number): Promise<RaceControlEvent[]> {
  const params: RaceControlParams = { session_key: sessionKey };
  return apiFetch<RaceControlEvent[]>("/race_control", params);
}
// ─── Session Results ────────────────────────────────────────────────────────────

/**
 * Fetch final session results (positions, gaps, DNF/DNS/DSQ flags).
 */
export async function getSessionResults(sessionKey: number): Promise<SessionResult[]> {
  const params: SessionResultParams = { session_key: sessionKey };
  return apiFetch<SessionResult[]>("/session_result", params);
}
// ─── Convenience re-exports ──────────────────────────────────────────────────

export { BASE_URL };
