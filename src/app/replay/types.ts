import type {
  Interval,
  Lap,
  Location,
  OpenF1Driver,
  Overtake,
  Pit,
  Position,
  RaceControlEvent,
  Session,
  SessionResult,
  StartingGrid,
  Stint,
  TeamRadio,
  Weather,
} from "../types/openf1";
import type { TireCompound } from "../types/ui";

export interface ReplayDataset {
  session: Session;
  drivers: OpenF1Driver[];
  laps: Lap[];
  positions: Position[];
  intervals: Interval[];
  stints: Stint[];
  pits: Pit[];
  weather: Weather[];
  raceControl: RaceControlEvent[];
  overtakes: Overtake[];
  teamRadio: TeamRadio[];
  startingGrid: StartingGrid[];
  results: SessionResult[];
  locations: Location[];
}

export type ReplayEventKind = "control" | "pit" | "overtake" | "radio";

export interface ReplayEvent {
  id: string;
  date: string;
  timestamp: number;
  kind: ReplayEventKind;
  title: string;
  detail: string;
  driverNumber: number | null;
  lapNumber: number | null;
  recordingUrl?: string;
  flag?: string | null;
}

export interface ReplayDriverState {
  driver: OpenF1Driver;
  position: number | null;
  lap: number;
  gap: string;
  compound: TireCompound;
  inPit: boolean;
  location: { x: number; y: number } | null;
  /** Marker visibility; DNF drivers fade from 1 to 0 over replay time. */
  markerOpacity: number;
}

export interface ReplayFrame {
  timestamp: number;
  elapsedMs: number;
  currentLap: number;
  flag: string;
  weather: Weather | null;
  drivers: ReplayDriverState[];
  events: ReplayEvent[];
}

export interface ReplayLoadState {
  dataset: ReplayDataset | null;
  loading: boolean;
  locationReady: boolean;
  buffering: boolean;
  errors: Record<string, string>;
  retry: () => void;
  loadOptional: (endpoint: ReplayOptionalDataKey) => void;
}

export type ReplayOptionalDataKey =
  | "weather"
  | "raceControl"
  | "teamRadio"
  | "intervals"
  | "overtakes"
  | "startingGrid";
