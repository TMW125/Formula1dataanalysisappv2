/**
 * TypeScript types for the OpenF1 REST API.
 * Reference: https://openf1.org
 */

// ─── Meetings ────────────────────────────────────────────────────────────────

export interface Meeting {
  meeting_key: number;
  meeting_name: string;
  meeting_official_name: string;
  location: string;
  country_name: string;
  country_code: string;
  circuit_short_name: string;
  circuit_type: string | null;
  year: number;
  date_start: string;
  circuit_info_url: string | null;
}

// ─── Circuit Info ────────────────────────────────────────────────────────────

export interface CircuitInfo {
  /** X coordinates of the track outline (Cartesian). */
  x: number[];
  /** Y coordinates of the track outline (Cartesian). */
  y: number[];
  circuitName: string | null;
  rotation: number | null;
}

// ─── Sessions ────────────────────────────────────────────────────────────────

export type SessionType =
  | "Practice"
  | "Qualifying"
  | "Sprint"
  | "Sprint Qualifying"
  | "Race";

export interface Session {
  session_key: number;
  meeting_key: number;
  session_name: string;        // e.g. "Practice 1", "Qualifying", "Race"
  session_type: SessionType;
  date_start: string;          // ISO 8601
  date_end: string;
  year: number;
  location: string;
  country_name: string;
  circuit_short_name: string;
}

// ─── Drivers ─────────────────────────────────────────────────────────────────

export interface OpenF1Driver {
  driver_number: number;
  broadcast_name: string;      // e.g. "M VERSTAPPEN"
  full_name: string;
  name_acronym: string;        // e.g. "VER"
  team_name: string;
  team_colour: string;         // Hex without '#'
  country_code: string;
  headshot_url: string | null;
  session_key: number;
  meeting_key: number;
}

// ─── Laps ─────────────────────────────────────────────────────────────────────

export interface Lap {
  session_key: number;
  meeting_key: number;
  driver_number: number;
  lap_number: number;
  lap_duration: number | null; // seconds, null if lap was not completed
  duration_sector_1: number | null;
  duration_sector_2: number | null;
  duration_sector_3: number | null;
  i1_speed: number | null;     // km/h at intermediate 1
  i2_speed: number | null;
  st_speed: number | null;     // speed trap
  is_pit_out_lap: boolean;
  date_start: string;
}

// ─── Car Data ─────────────────────────────────────────────────────────────────

export interface CarData {
  session_key: number;
  meeting_key: number;
  driver_number: number;
  date: string;
  speed: number;               // km/h
  rpm: number;
  n_gear: number;
  throttle: number;            // 0–100
  brake: number;               // 0 or 100 (boolean-like in the API)
  drs: number;                 // 0=off, 10/12/14=on
}

// ─── Positions ────────────────────────────────────────────────────────────────

export interface Position {
  session_key: number;
  meeting_key: number;
  driver_number: number;
  date: string;
  position: number;
}

// ─── Intervals ────────────────────────────────────────────────────────────────

export interface Interval {
  session_key: number;
  meeting_key: number;
  driver_number: number;
  date: string;
  interval: number | null;      // gap to car ahead (seconds)
  gap_to_leader: number | null; // gap to race leader (seconds)
}

// ─── Stints ──────────────────────────────────────────────────────────────────

export interface Stint {
  session_key: number;
  meeting_key: number;
  driver_number: number;
  stint_number: number;
  lap_start: number;
  lap_end: number;
  compound: "SOFT" | "MEDIUM" | "HARD" | "INTERMEDIATE" | "WET" | "UNKNOWN";
  tyre_age_at_start: number;
}

// ─── Pit Stops ────────────────────────────────────────────────────────────────

export interface Pit {
  session_key: number;
  meeting_key: number;
  driver_number: number;
  lap_number: number;
  /** @deprecated Use lane_duration instead */
  pit_duration: number | null;
  lane_duration: number | null;  // time in pit lane, seconds
  stop_duration: number | null;  // stationary time, seconds (from 2024 US GP)
  date: string;
}

// ─── Weather ──────────────────────────────────────────────────────────────────

export interface Weather {
  session_key: number;
  meeting_key: number;
  date: string;
  air_temperature: number;      // °C
  track_temperature: number;    // °C
  humidity: number;             // %
  pressure: number;             // mbar
  wind_speed: number;           // m/s
  wind_direction: number;       // degrees
  rainfall: number;             // mm
}

// ─── Session Result ─────────────────────────────────────────────────────────

export interface SessionResult {
  session_key: number;
  meeting_key: number;
  driver_number: number;
  position: number;
  duration: number | null;      // best lap time in seconds
  gap_to_leader: number | null; // gap to leader in seconds
  number_of_laps: number;
  dnf: boolean;
  dns: boolean;
  dsq: boolean;
}

// ─── Location ────────────────────────────────────────────────────────────────

export interface Location {
  session_key: number;
  meeting_key: number;
  driver_number: number;
  date: string;
  x: number;
  y: number;
  z: number;
}

// ─── Team Radio ───────────────────────────────────────────────────────────────

export interface TeamRadio {
  session_key: number;
  meeting_key: number;
  driver_number: number;
  date: string;
  recording_url: string;
}

// ─── Overtakes ────────────────────────────────────────────────────────────────

export interface Overtake {
  session_key: number;
  meeting_key: number;
  date: string;
  overtaking_driver_number: number;
  overtaken_driver_number: number;
  position: number;
}

// ─── Starting Grid ────────────────────────────────────────────────────────────

export interface StartingGrid {
  session_key: number;
  meeting_key: number;
  driver_number: number;
  position: number;
  lap_duration: number | null;
}

// ─── Championship Drivers (beta) ──────────────────────────────────────────────

export interface ChampionshipDriver {
  session_key: number;
  meeting_key: number;
  driver_number: number;
  points_current: number;
  points_start: number;
  position_current: number;
  position_start: number;
}

// ─── Championship Teams (beta) ────────────────────────────────────────────────

export interface ChampionshipTeam {
  session_key: number;
  meeting_key: number;
  team_name: string;
  points_current: number;
  points_start: number;
  position_current: number;
  position_start: number;
}

// ─── Race Control ────────────────────────────────────────────────────────────

export interface RaceControlEvent {
  session_key: number;
  meeting_key: number;
  date: string;
  driver_number: number | null;
  lap_number: number | null;
  category: string;             // e.g. "Flag", "SafetyCar", "Drs"
  flag: string | null;          // e.g. "GREEN", "YELLOW", "RED"
  scope: string | null;
  sector: number | null;
  message: string;
}

// ─── API Query Parameter Shapes ──────────────────────────────────────────────

export interface MeetingsParams {
  year?: number | string;
  meeting_key?: number;
}

export interface SessionsParams {
  meeting_key?: number;
  session_key?: number;
  year?: number | string;
  session_name?: string;
}

export interface DriversParams {
  session_key: number;
  driver_number?: number;
}

export interface LapsParams {
  session_key: number;
  driver_number?: number;
  lap_number?: number;
}

export interface CarDataParams {
  session_key: number;
  driver_number?: number;
}

export interface PositionsParams {
  session_key: number;
  driver_number?: number;
}

export interface IntervalsParams {
  session_key: number;
  driver_number?: number;
}

export interface StintsParams {
  session_key: number;
  driver_number?: number;
}

export interface PitsParams {
  session_key: number;
  driver_number?: number;
}

export interface WeatherParams {
  session_key: number;
}

export interface RaceControlParams {
  session_key: number;
}

export interface SessionResultParams {
  session_key: number;
}

export interface LocationParams {
  session_key: number;
  driver_number?: number;
}

export interface TeamRadioParams {
  session_key: number;
  driver_number?: number;
}

export interface OvertakesParams {
  session_key: number;
  overtaking_driver_number?: number;
  overtaken_driver_number?: number;
}

export interface StartingGridParams {
  session_key: number;
}

export interface ChampionshipDriversParams {
  session_key: number;
  driver_number?: number;
}

export interface ChampionshipTeamsParams {
  session_key: number;
  team_name?: string;
}
