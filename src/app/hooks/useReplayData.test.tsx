import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Session } from "../types/openf1";

const mocks = vi.hoisted(() => ({
  getDrivers: vi.fn().mockResolvedValue([]),
  getLaps: vi.fn().mockResolvedValue([]),
  getPositions: vi.fn().mockResolvedValue([]),
  getStints: vi.fn().mockResolvedValue([]),
  getPits: vi.fn().mockResolvedValue([]),
  getSessionResults: vi.fn().mockResolvedValue([]),
  getWeather: vi.fn().mockResolvedValue([]),
  getRaceControl: vi.fn().mockResolvedValue([]),
  getIntervals: vi.fn().mockResolvedValue([]),
  getStartingGrid: vi.fn().mockResolvedValue([]),
  getTeamRadio: vi.fn().mockResolvedValue([]),
  getOvertakes: vi.fn().mockResolvedValue([]),
  getLocationRange: vi.fn().mockResolvedValue([]),
}));

vi.mock("../services/openf1Api", () => mocks);

import { LOCATION_WINDOW_MS, useReplayData } from "./useReplayData";

const session: Session = {
  session_key: 10,
  meeting_key: 1,
  session_name: "Race",
  session_type: "Race",
  date_start: "2024-01-01T12:00:00Z",
  date_end: "2024-01-01T13:00:00Z",
  year: 2024,
  location: "Test",
  country_name: "GB",
  circuit_short_name: "Test Ring",
};
const start = Date.parse(session.date_start);

function makeWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("useReplayData", () => {
  it("loads the six core sources before optional replay sources", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useReplayData(session, start), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.dataset).not.toBeNull());
    await waitFor(() => expect(mocks.getLocationRange).toHaveBeenCalledOnce());

    expect(mocks.getDrivers).toHaveBeenCalledOnce();
    expect(mocks.getLaps).toHaveBeenCalledOnce();
    expect(mocks.getPositions).toHaveBeenCalledOnce();
    expect(mocks.getStints).toHaveBeenCalledOnce();
    expect(mocks.getPits).toHaveBeenCalledOnce();
    expect(mocks.getSessionResults).toHaveBeenCalledOnce();
    expect(mocks.getWeather).not.toHaveBeenCalled();
    expect(mocks.getRaceControl).not.toHaveBeenCalled();
    expect(mocks.getIntervals).not.toHaveBeenCalled();
    expect(mocks.getTeamRadio).not.toHaveBeenCalled();
    expect(mocks.getOvertakes).not.toHaveBeenCalled();
    expect(mocks.getStartingGrid).not.toHaveBeenCalled();

    act(() => result.current.loadOptional("weather"));
    await waitFor(() => expect(mocks.getWeather).toHaveBeenCalledOnce());
    expect(mocks.getRaceControl).not.toHaveBeenCalled();
  });

  it("caches location chunks when scrubbing back to an earlier window", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    let currentTime = start;
    const { result, rerender } = renderHook(() => useReplayData(session, currentTime), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.locationReady).toBe(true));
    expect(mocks.getLocationRange).toHaveBeenCalledOnce();

    act(() => {
      currentTime = start + LOCATION_WINDOW_MS + 1_000;
      rerender();
    });
    await waitFor(() => expect(mocks.getLocationRange).toHaveBeenCalledTimes(2));

    act(() => {
      currentTime = start + 1_000;
      rerender();
    });
    await waitFor(() => expect(result.current.locationReady).toBe(true));
    expect(mocks.getLocationRange).toHaveBeenCalledTimes(2);
  });

  it("loads a location window beyond the scheduled end when timing data runs late", async () => {
    const lateTimestamp = Date.parse(session.date_end) + 10 * 60_000;
    mocks.getPositions.mockResolvedValueOnce([{
      session_key: session.session_key,
      meeting_key: session.meeting_key,
      driver_number: 1,
      position: 1,
      date: new Date(lateTimestamp).toISOString(),
    }]);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    renderHook(() => useReplayData(session, lateTimestamp), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(mocks.getLocationRange).toHaveBeenCalled());
    const [, from, to] = mocks.getLocationRange.mock.calls.at(-1)!;
    expect(Date.parse(from)).toBeGreaterThanOrEqual(Date.parse(session.date_end));
    expect(Date.parse(to)).toBeGreaterThan(Date.parse(session.date_end));
  });
});
