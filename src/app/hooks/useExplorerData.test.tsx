import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Session } from "../types/openf1";

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

const mocks = vi.hoisted(() => ({
  selection: { selectedSeason: "2024", selectedMeetingKey: 1, selectedSessionKey: 10 },
  getWeather: vi.fn().mockResolvedValue([]),
  getLaps: vi.fn().mockResolvedValue([]),
  getCarData: vi.fn().mockResolvedValue([]),
  getDrivers: vi.fn().mockResolvedValue([]),
  getPositions: vi.fn().mockResolvedValue([]),
  getStints: vi.fn().mockResolvedValue([]),
  getIntervals: vi.fn().mockResolvedValue([]),
  getPits: vi.fn().mockResolvedValue([]),
  getRaceControl: vi.fn().mockResolvedValue([]),
  getSessionResults: vi.fn().mockResolvedValue([]),
  getLocation: vi.fn().mockResolvedValue([]),
  getTeamRadio: vi.fn().mockResolvedValue([]),
  getOvertakes: vi.fn().mockResolvedValue([]),
  getStartingGrid: vi.fn().mockResolvedValue([]),
  getChampionshipDrivers: vi.fn().mockResolvedValue([]),
  getChampionshipTeams: vi.fn().mockResolvedValue([]),
  getMeetingByKey: vi.fn().mockResolvedValue([]),
  getSessionsByMeeting: vi.fn().mockResolvedValue([]),
  useF1Data: vi.fn(() => ({ state: mocks.selection })),
  useMeetings: vi.fn(() => ({ meetings: [], loading: false, error: null })),
  useSessions: vi.fn(() => ({ sessions: [session], loading: false, error: null })),
  useSelectedSeason: vi.fn(() => mocks.selection.selectedSeason),
  useSelectedMeetingKey: vi.fn(() => mocks.selection.selectedMeetingKey),
  useSelectedSessionKey: vi.fn(() => mocks.selection.selectedSessionKey),
}));

vi.mock("../services/openf1Api", () => mocks);
vi.mock("../context/F1DataContext", () => mocks);

import { useExplorerData } from "./useSessionData";
import { useDriversData } from "./useSessionData";

function makeWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

afterEach(() => {
  mocks.selection.selectedSessionKey = 10;
  vi.clearAllMocks();
});

describe("useExplorerData", () => {
  it("does not fetch until its explicit action is called", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useExplorerData("weather", null), {
      wrapper: makeWrapper(client),
    });

    expect(mocks.getWeather).not.toHaveBeenCalled();
    expect(result.current.data).toEqual([]);

    act(() => result.current.refetch());
    await waitFor(() => expect(mocks.getWeather).toHaveBeenCalledOnce());
    expect(result.current.error).toBeNull();
  });

  it("shares an identical session query between two consumers", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result, rerender } = renderHook(() => ({ first: useDriversData(), second: useDriversData() }), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.first.loading).toBe(false));
    expect(mocks.getDrivers).toHaveBeenCalledOnce();

    act(() => {
      mocks.selection.selectedSessionKey = 11;
      rerender();
    });
    await waitFor(() => expect(mocks.getDrivers).toHaveBeenCalledTimes(2));
  });
});
