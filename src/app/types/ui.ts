/**
 * UI-layer types.
 *
 * These are the shapes that presentational components consume.
 * Transformer functions (utils/transformers.ts) convert raw OpenF1 API
 * responses into these types.
 */

// ─── Leaderboard ─────────────────────────────────────────────────────────────

export interface LeaderboardRow {
  position: number;
  /** Full name, e.g. "Max Verstappen" */
  driver: string;
  /** Formatted lap time string, e.g. "1:31.720" */
  time: string;
  /** Gap to leader, e.g. "+0.192" or "-" for P1 */
  gap: string;
  team: string;
  /** CSS hex colour including #, e.g. "#3671C6" */
  teamColor: string;
}

// ─── Session Info Panel ───────────────────────────────────────────────────────

export interface SessionInfoData {
  name: string;
  track: string;
  weather: string;
  status: string;
  temperature: string;
  remainingTime: string;
}

// ─── Tire Compounds ───────────────────────────────────────────────────────────

export type TireCompound =
  | "SOFT"
  | "MEDIUM"
  | "HARD"
  | "INTERMEDIATE"
  | "WET"
  | "UNKNOWN";

export const TIRE_COLORS: Record<TireCompound, string> = {
  SOFT: "#E10600",
  MEDIUM: "#FFD700",
  HARD: "#f5f5f5",
  INTERMEDIATE: "#39B54A",
  WET: "#0067FF",
  UNKNOWN: "#888888",
};

export const TIRE_TEXT_COLORS: Record<TireCompound, string> = {
  SOFT: "#ffffff",
  MEDIUM: "#111111",
  HARD: "#111111",
  INTERMEDIATE: "#ffffff",
  WET: "#ffffff",
  UNKNOWN: "#ffffff",
};

// ─── Chart line config ────────────────────────────────────────────────────────

export interface ChartLineConfig {
  key: string;
  color: string;
  name: string;
}
