/**
 * Static SVG track map geometry used by the TrackMap component.
 *
 * All other data previously in this file has been replaced with live data from
 * the OpenF1 API (see src/app/services/openf1Api.ts and src/app/hooks/useSessionData.ts).
 */

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
