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
  ChampionshipDriver,
  ChampionshipDriversParams,
  ChampionshipTeam,
  ChampionshipTeamsParams,
  DriversParams,
  Interval,
  IntervalsParams,
  Lap,
  LapsParams,
  Location,
  LocationParams,
  LocationRangeParams,
  Meeting,
  MeetingsParams,
  OpenF1Driver,
  Overtake,
  OvertakesParams,
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
  StartingGrid,
  StartingGridParams,
  Stint,
  StintsParams,
  TeamRadio,
  TeamRadioParams,
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
export function buildQueryString(params: object): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      // OpenF1 parses comparison filters from the raw query string. Encoding
      // the operator into the parameter name (e.g. date%3E%3D=...) causes the
      // location endpoint to return HTTP 500. It must remain date>=... instead.
      const comparison = key.match(/^(.+?)(>=|<=|>|<)$/);
      if (comparison) {
        parts.push(
          `${encodeURIComponent(comparison[1])}${comparison[2]}${encodeURIComponent(String(value))}`
        );
      } else {
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
      }
    }
  }
  return parts.length > 0 ? `?${parts.join("&")}` : "";
}

// ─── Rate Limiter (free tier: 3 req/sec and 30 req/min) ───────────────────────

export const OPENF1_RATE_LIMITS = {
  perSecond: 3,
  // Keep two requests in reserve for clock skew and other tabs using the same IP.
  perMinute: 28,
  secondWindowMs: 1_000,
  minuteWindowMs: 60_000,
} as const;

/** Timestamps (ms) of requests dispatched within the current minute window. */
const _reqTimestamps: number[] = [];
let _serverCooldownUntil = 0;

/**
 * Return how long a request must wait before both sliding-window quotas have
 * capacity. Exported so the scheduling policy can be regression tested.
 */
export function getRateLimitWaitMs(now: number, timestamps: readonly number[]): number {
  const minuteTimestamps = timestamps.filter(
    (value) => now - value < OPENF1_RATE_LIMITS.minuteWindowMs
  );
  const secondTimestamps = minuteTimestamps.filter(
    (value) => now - value < OPENF1_RATE_LIMITS.secondWindowMs
  );
  let waitMs = 0;
  if (secondTimestamps.length >= OPENF1_RATE_LIMITS.perSecond) {
    waitMs = Math.max(
      waitMs,
      OPENF1_RATE_LIMITS.secondWindowMs - (now - secondTimestamps[0]) + 25
    );
  }
  if (minuteTimestamps.length >= OPENF1_RATE_LIMITS.perMinute) {
    waitMs = Math.max(
      waitMs,
      OPENF1_RATE_LIMITS.minuteWindowMs - (now - minuteTimestamps[0]) + 250
    );
  }
  return waitMs;
}

function abortError(): DOMException {
  return new DOMException("The OpenF1 request was cancelled", "AbortError");
}

function rateLimited<T>(fn: () => Promise<T>, signal?: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onAbort = () => {
      if (timer !== null) clearTimeout(timer);
      reject(abortError());
    };
    signal?.addEventListener("abort", onAbort, { once: true });

    const attempt = () => {
      if (signal?.aborted) {
        onAbort();
        return;
      }
      const now = Date.now();
      while (
        _reqTimestamps.length > 0
        && now - _reqTimestamps[0] >= OPENF1_RATE_LIMITS.minuteWindowMs
      ) {
        _reqTimestamps.shift();
      }
      const waitMs = Math.max(
        getRateLimitWaitMs(now, _reqTimestamps),
        _serverCooldownUntil - now
      );
      if (waitMs === 0) {
        _reqTimestamps.push(now);
        signal?.removeEventListener("abort", onAbort);
        fn().then(resolve).catch(reject);
      } else {
        timer = setTimeout(attempt, waitMs);
      }
    };
    attempt();
  });
}

function retryAfterMs(response: Response): number {
  const value = response.headers.get("Retry-After");
  if (!value) return OPENF1_RATE_LIMITS.minuteWindowMs + 250;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000) + 250;
  const date = Date.parse(value);
  return Number.isFinite(date)
    ? Math.max(0, date - Date.now()) + 250
    : OPENF1_RATE_LIMITS.minuteWindowMs + 250;
}

function waitFor(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortError());
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Core fetch wrapper.  Validates HTTP status and deserialises JSON.
 * All calls are routed through the rate limiter before being dispatched.
 */
interface ApiFetchOptions<T> {
  notFoundValue?: T;
}

async function apiFetch<T>(
  endpoint: string,
  params: object = {},
  signal?: AbortSignal,
  options?: ApiFetchOptions<T>
): Promise<T> {
  const url = `${BASE_URL}${endpoint}${buildQueryString(params)}`;
  const request = (retryCount: number): Promise<T> => rateLimited(() =>
    fetch(url, { headers: { Accept: "application/json" }, signal }).then(async (response) => {
      if (response.status === 429 && retryCount < 2) {
        const backoffMs = retryAfterMs(response);
        _serverCooldownUntil = Math.max(_serverCooldownUntil, Date.now() + backoffMs);
        await waitFor(backoffMs, signal);
        return request(retryCount + 1);
      }
      // Some collection endpoints use 404 "No results found" instead of an
      // empty array. Callers can opt into treating that as valid missing data.
      if (response.status === 404 && options && "notFoundValue" in options) {
        return options.notFoundValue as T;
      }
      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(
          `OpenF1 API error: ${response.status} ${response.statusText}${detail ? ` — ${detail}` : ""}`
        );
      }
      return response.json() as Promise<T>;
    })
  , signal);
  return request(0);
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
export async function getDrivers(sessionKey: number, driverNumber?: number, signal?: AbortSignal): Promise<OpenF1Driver[]> {
  const params: DriversParams = { session_key: sessionKey };
  if (driverNumber !== undefined) params.driver_number = driverNumber;
  return apiFetch<OpenF1Driver[]>("/drivers", params, signal);
}

// ─── Laps ─────────────────────────────────────────────────────────────────────

/**
 * Fetch all laps for a given session, optionally filtered by driver.
 *
 * @example
 * const laps = await getLaps(9158);
 * const verstappenLaps = await getLaps(9158, 1);
 */
export async function getLaps(sessionKey: number, driverNumber?: number, signal?: AbortSignal): Promise<Lap[]> {
  const params: LapsParams = { session_key: sessionKey };
  if (driverNumber !== undefined) params.driver_number = driverNumber;
  return apiFetch<Lap[]>("/laps", params, signal);
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
export async function getCarData(sessionKey: number, driverNumber?: number, signal?: AbortSignal): Promise<CarData[]> {
  const params: CarDataParams = { session_key: sessionKey };
  if (driverNumber !== undefined) params.driver_number = driverNumber;
  return apiFetch<CarData[]>("/car_data", params, signal);
}

// ─── Positions ────────────────────────────────────────────────────────────────

/**
 * Fetch on-track race/qualifying positions for a session.
 *
 * @example
 * const positions = await getPositions(9158);
 */
export async function getPositions(sessionKey: number, driverNumber?: number, signal?: AbortSignal): Promise<Position[]> {
  const params: PositionsParams = { session_key: sessionKey };
  if (driverNumber !== undefined) params.driver_number = driverNumber;
  return apiFetch<Position[]>("/position", params, signal);
}

// ─── Intervals ────────────────────────────────────────────────────────────────

/**
 * Fetch interval/gap data (gap to car ahead and gap to leader) for a session.
 */
export async function getIntervals(sessionKey: number, driverNumber?: number, signal?: AbortSignal): Promise<Interval[]> {
  const params: IntervalsParams = { session_key: sessionKey };
  if (driverNumber !== undefined) params.driver_number = driverNumber;
  return apiFetch<Interval[]>("/intervals", params, signal);
}

// ─── Stints ──────────────────────────────────────────────────────────────────

/**
 * Fetch tyre stint data for a session.
 */
export async function getStints(sessionKey: number, driverNumber?: number, signal?: AbortSignal): Promise<Stint[]> {
  const params: StintsParams = { session_key: sessionKey };
  if (driverNumber !== undefined) params.driver_number = driverNumber;
  return apiFetch<Stint[]>("/stints", params, signal);
}

// ─── Pit Stops ────────────────────────────────────────────────────────────────

/**
 * Fetch pit stop data for a session.
 */
export async function getPits(sessionKey: number, driverNumber?: number, signal?: AbortSignal): Promise<Pit[]> {
  const params: PitsParams = { session_key: sessionKey };
  if (driverNumber !== undefined) params.driver_number = driverNumber;
  return apiFetch<Pit[]>("/pit", params, signal);
}

// ─── Weather ──────────────────────────────────────────────────────────────────

/**
 * Fetch weather samples recorded during a session.
 */
export async function getWeather(sessionKey: number, signal?: AbortSignal): Promise<Weather[]> {
  const params: WeatherParams = { session_key: sessionKey };
  return apiFetch<Weather[]>("/weather", params, signal);
}

// ─── Race Control ────────────────────────────────────────────────────────────

/**
 * Fetch race control messages (flags, safety car, VSC, DRS zones, etc.) for a
 * session.
 */
export async function getRaceControl(sessionKey: number, signal?: AbortSignal): Promise<RaceControlEvent[]> {
  const params: RaceControlParams = { session_key: sessionKey };
  return apiFetch<RaceControlEvent[]>("/race_control", params, signal);
}
// ─── Session Results ────────────────────────────────────────────────────────────

/**
 * Fetch final session results (positions, gaps, DNF/DNS/DSQ flags).
 */
export async function getSessionResults(sessionKey: number, signal?: AbortSignal): Promise<SessionResult[]> {
  const params: SessionResultParams = { session_key: sessionKey };
  return apiFetch<SessionResult[]>("/session_result", params, signal);
}// ─── Location ────────────────────────────────────────────────────────────────────

/**
 * Fetch approximate car location data (~3.7 Hz) for a session.
 *
 * ⚠️  This endpoint returns very large payloads for full sessions.
 * Always filter by driver_number in the explorer.
 */
export async function getLocation(sessionKey: number, driverNumber?: number, signal?: AbortSignal): Promise<Location[]> {
  const params: LocationParams = { session_key: sessionKey };
  if (driverNumber !== undefined) params.driver_number = driverNumber;
  return apiFetch<Location[]>("/location", params, signal);
}

/** Fetch one bounded location window for all drivers in a session. */
export async function getLocationRange(
  sessionKey: number,
  from: string,
  to: string,
  signal?: AbortSignal
): Promise<Location[]> {
  const params: LocationRangeParams = {
    session_key: sessionKey,
    "date>=": from,
    "date<": to,
  };
  return apiFetch<Location[]>("/location", params, signal);
}

// ─── Team Radio ────────────────────────────────────────────────────────────────

/**
 * Fetch team radio recordings for a session.
 * Note: only a limited selection of communications are included.
 */
export async function getTeamRadio(sessionKey: number, driverNumber?: number, signal?: AbortSignal): Promise<TeamRadio[]> {
  const params: TeamRadioParams = { session_key: sessionKey };
  if (driverNumber !== undefined) params.driver_number = driverNumber;
  return apiFetch<TeamRadio[]>("/team_radio", params, signal);
}

// ─── Overtakes ────────────────────────────────────────────────────────────────

/**
 * Fetch overtake data for a session.
 * Only available during races and may be incomplete.
 */
export async function getOvertakes(sessionKey: number, signal?: AbortSignal): Promise<Overtake[]> {
  const params: OvertakesParams = { session_key: sessionKey };
  return apiFetch<Overtake[]>("/overtakes", params, signal);
}

// ─── Starting Grid ───────────────────────────────────────────────────────────

/**
 * Fetch the starting grid for a race session.
 * Data becomes available a few minutes after official results are published.
 */
export async function getStartingGrid(sessionKey: number, signal?: AbortSignal): Promise<StartingGrid[]> {
  const params: StartingGridParams = { session_key: sessionKey };
  // OpenF1 returns HTTP 404 when a valid race session has no published grid.
  // Missing grid data is recoverable; replay falls back to unclassified cars
  // until its first timing position sample.
  return apiFetch<StartingGrid[]>("/starting_grid", params, signal, { notFoundValue: [] });
}

// ─── Championship Drivers (beta) ──────────────────────────────────────────────

/**
 * Fetch driver championship standings for a (race) session.
 * Only available for race sessions.
 */
export async function getChampionshipDrivers(sessionKey: number, signal?: AbortSignal): Promise<ChampionshipDriver[]> {
  const params: ChampionshipDriversParams = { session_key: sessionKey };
  return apiFetch<ChampionshipDriver[]>("/championship_drivers", params, signal);
}

// ─── Championship Teams (beta) ────────────────────────────────────────────────

/**
 * Fetch team championship standings for a (race) session.
 * Only available for race sessions.
 */
export async function getChampionshipTeams(sessionKey: number, signal?: AbortSignal): Promise<ChampionshipTeam[]> {
  const params: ChampionshipTeamsParams = { session_key: sessionKey };
  return apiFetch<ChampionshipTeam[]>("/championship_teams", params, signal);
}
// ─── Convenience re-exports ──────────────────────────────────────────────────

export { BASE_URL };
