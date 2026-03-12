// Mock F1 Data for OpenF1 API
export interface Driver {
  number: number;
  name: string;
  team: string;
  teamColor: string;
  abbreviation: string;
}

export interface LapTime {
  position: number;
  driver: string;
  time: string;
  gap: string;
  team: string;
  teamColor: string;
}

export interface SessionInfo {
  name: string;
  track: string;
  weather: string;
  status: string;
  temperature: string;
  remainingTime: string;
}

export interface TelemetryPoint {
  distance: number;
  speed: number;
  throttle: number;
  brake: number;
  gear: number;
  rpm: number;
}

export interface SectorTime {
  sector: number;
  time: string;
  diff: string;
}

export interface TireStint {
  driver: string;
  compound: string;
  laps: number;
  startLap: number;
  endLap: number;
}

export const mockDrivers: Driver[] = [
  { number: 1, name: "Max Verstappen", team: "Red Bull Racing", teamColor: "#3671C6", abbreviation: "VER" },
  { number: 11, name: "Sergio Perez", team: "Red Bull Racing", teamColor: "#3671C6", abbreviation: "PER" },
  { number: 44, name: "Lewis Hamilton", team: "Mercedes", teamColor: "#27F4D2", abbreviation: "HAM" },
  { number: 63, name: "George Russell", team: "Mercedes", teamColor: "#27F4D2", abbreviation: "RUS" },
  { number: 16, name: "Charles Leclerc", team: "Ferrari", teamColor: "#E8002D", abbreviation: "LEC" },
  { number: 55, name: "Carlos Sainz", team: "Ferrari", teamColor: "#E8002D", abbreviation: "SAI" },
  { number: 4, name: "Lando Norris", team: "McLaren", teamColor: "#FF8000", abbreviation: "NOR" },
  { number: 81, name: "Oscar Piastri", team: "McLaren", teamColor: "#FF8000", abbreviation: "PIA" },
  { number: 14, name: "Fernando Alonso", team: "Aston Martin", teamColor: "#229971", abbreviation: "ALO" },
  { number: 18, name: "Lance Stroll", team: "Aston Martin", teamColor: "#229971", abbreviation: "STR" },
];

export const mockLeaderboard: LapTime[] = [
  { position: 1, driver: "Max Verstappen", time: "1:31.720", gap: "-", team: "Red Bull Racing", teamColor: "#3671C6" },
  { position: 2, driver: "Charles Leclerc", time: "1:31.912", gap: "+0.192", team: "Ferrari", teamColor: "#E8002D" },
  { position: 3, driver: "Lando Norris", time: "1:32.045", gap: "+0.325", team: "McLaren", teamColor: "#FF8000" },
  { position: 4, driver: "Lewis Hamilton", time: "1:32.156", gap: "+0.436", team: "Mercedes", teamColor: "#27F4D2" },
  { position: 5, driver: "Carlos Sainz", time: "1:32.234", gap: "+0.514", team: "Ferrari", teamColor: "#E8002D" },
  { position: 6, driver: "George Russell", time: "1:32.389", gap: "+0.669", team: "Mercedes", teamColor: "#27F4D2" },
  { position: 7, driver: "Sergio Perez", time: "1:32.512", gap: "+0.792", team: "Red Bull Racing", teamColor: "#3671C6" },
  { position: 8, driver: "Fernando Alonso", time: "1:32.678", gap: "+0.958", team: "Aston Martin", teamColor: "#229971" },
  { position: 9, driver: "Oscar Piastri", time: "1:32.845", gap: "+1.125", team: "McLaren", teamColor: "#FF8000" },
  { position: 10, driver: "Lance Stroll", time: "1:33.012", gap: "+1.292", team: "Aston Martin", teamColor: "#229971" },
];

export const mockSessionInfo: SessionInfo = {
  name: "Qualifying",
  track: "Bahrain International Circuit",
  weather: "Clear",
  status: "Session Active",
  temperature: "28°C",
  remainingTime: "12:45",
};

export const mockTelemetryData: TelemetryPoint[] = Array.from({ length: 100 }, (_, i) => ({
  distance: i * 50,
  speed: 150 + Math.sin(i / 10) * 100 + Math.random() * 20,
  throttle: Math.max(0, Math.min(100, 50 + Math.sin(i / 8) * 50 + Math.random() * 10)),
  brake: Math.max(0, Math.random() > 0.8 ? Math.random() * 100 : 0),
  gear: Math.floor(Math.min(8, Math.max(1, 3 + Math.sin(i / 10) * 3))),
  rpm: 8000 + Math.sin(i / 5) * 4000 + Math.random() * 1000,
}));

export const mockSectorTimes: SectorTime[] = [
  { sector: 1, time: "29.456", diff: "-0.042" },
  { sector: 2, time: "31.234", diff: "+0.089" },
  { sector: 3, time: "31.030", diff: "-0.124" },
];

export const mockTireStints: TireStint[] = [
  { driver: "Max Verstappen", compound: "Soft", laps: 12, startLap: 1, endLap: 12 },
  { driver: "Max Verstappen", compound: "Medium", laps: 25, startLap: 13, endLap: 37 },
  { driver: "Max Verstappen", compound: "Hard", laps: 20, startLap: 38, endLap: 57 },
  { driver: "Charles Leclerc", compound: "Soft", laps: 10, startLap: 1, endLap: 10 },
  { driver: "Charles Leclerc", compound: "Medium", laps: 28, startLap: 11, endLap: 38 },
  { driver: "Charles Leclerc", compound: "Hard", laps: 19, startLap: 39, endLap: 57 },
];

export const mockLapTimeData = Array.from({ length: 57 }, (_, i) => ({
  lap: i + 1,
  verstappen: 92 + Math.random() * 3 + (i > 12 ? 1 : 0) + (i > 37 ? 1.5 : 0),
  leclerc: 92.5 + Math.random() * 3 + (i > 10 ? 1 : 0) + (i > 38 ? 1.5 : 0),
  norris: 93 + Math.random() * 3,
}));

export const sessions = [
  "Practice 1",
  "Practice 2",
  "Practice 3",
  "Qualifying",
  "Race",
];

export const raceWeekends = [
  "Bahrain Grand Prix",
  "Saudi Arabian Grand Prix",
  "Australian Grand Prix",
  "Japanese Grand Prix",
  "Chinese Grand Prix",
];

export const seasons = [
  "2026",
  "2025",
  "2024",
  "2023",
  "2022",
  "2021",
  "2020",
];

// Track map coordinates (simplified)
export const trackMapPoints = [
  { x: 100, y: 200 },
  { x: 150, y: 150 },
  { x: 250, y: 120 },
  { x: 350, y: 150 },
  { x: 400, y: 220 },
  { x: 380, y: 300 },
  { x: 300, y: 350 },
  { x: 200, y: 330 },
  { x: 120, y: 280 },
  { x: 100, y: 200 },
];

export const driverPositions = [
  { driver: "VER", x: 100, y: 200, color: "#3671C6" },
  { driver: "LEC", x: 150, y: 150, color: "#E8002D" },
  { driver: "NOR", x: 180, y: 140, color: "#FF8000" },
  { driver: "HAM", x: 210, y: 125, color: "#27F4D2" },
  { driver: "SAI", x: 240, y: 120, color: "#E8002D" },
];