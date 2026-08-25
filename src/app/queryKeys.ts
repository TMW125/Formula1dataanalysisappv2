/**
 * Stable cache keys for OpenF1 requests.
 *
 * Keeping the request dimensions in one object means that hooks used by
 * different pages can address the same query and share both its data and its
 * in-flight promise.  `null` is used consistently for omitted filters so
 * `undefined`/`null` call sites cannot accidentally create different entries.
 */

export type OpenF1Endpoint =
  | "meetings"
  | "sessions"
  | "drivers"
  | "laps"
  | "car_data"
  | "positions"
  | "intervals"
  | "stints"
  | "pits"
  | "weather"
  | "race_control"
  | "session_result"
  | "location"
  | "team_radio"
  | "overtakes"
  | "starting_grid";

interface OpenF1QueryDimensions {
  season?: string | number | null;
  meetingKey?: number | null;
  sessionKey?: number | null;
  endpoint: OpenF1Endpoint;
  driverNumber?: number | null;
  from?: string | null;
  to?: string | null;
  chunk?: number | null;
}

export function openF1QueryKey({
  season = null,
  meetingKey = null,
  sessionKey = null,
  endpoint,
  driverNumber = null,
  from = null,
  to = null,
  chunk = null,
}: OpenF1QueryDimensions) {
  return [
    "openf1",
    {
      season: season === null ? null : String(season),
      meeting_key: meetingKey,
      session_key: sessionKey,
      endpoint,
      driver_number: driverNumber,
      from,
      to,
      chunk,
    },
  ] as const;
}

export const openF1QueryKeys = {
  meetingsBySeason: (season: string | number) => openF1QueryKey({ season, endpoint: "meetings" }),
  meetingByKey: (season: string | number, meetingKey: number) =>
    openF1QueryKey({ season, meetingKey, endpoint: "meetings" }),
  sessionsByMeeting: (season: string | number, meetingKey: number) =>
    openF1QueryKey({ season, meetingKey, endpoint: "sessions" }),
  session: (
    season: string | number,
    meetingKey: number,
    sessionKey: number,
    endpoint: Exclude<OpenF1Endpoint, "meetings" | "sessions">,
    driverNumber?: number | null,
  ) => openF1QueryKey({ season, meetingKey, sessionKey, endpoint, driverNumber }),
  locationRange: (
    season: string | number,
    meetingKey: number,
    sessionKey: number,
    from: string,
    to: string,
    chunk: number,
  ) => openF1QueryKey({ season, meetingKey, sessionKey, endpoint: "location", from, to, chunk }),
};

/** Map the explorer's labels to the canonical labels used by session hooks. */
export function explorerEndpointKey(endpoint: string): OpenF1Endpoint {
  if (endpoint === "pit") return "pits";
  if (endpoint === "session_result") return "session_result";
  return endpoint as OpenF1Endpoint;
}
