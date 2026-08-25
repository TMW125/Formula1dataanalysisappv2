import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, useLocation } from "react-router";
import type { Meeting } from "../types/openf1";

const mocks = vi.hoisted(() => ({
  getMeetingsBySeason: vi.fn(),
  getSessionsByMeeting: vi.fn().mockResolvedValue([]),
}));

vi.mock("../services/openf1Api", () => mocks);

import { F1DataProvider, useF1Data } from "./F1DataContext";

const meetings: Meeting[] = [1, 2].map((meetingKey) => ({
  meeting_key: meetingKey,
  meeting_name: meetingKey === 1 ? "Test One" : "Test Two",
  meeting_official_name: `Test ${meetingKey}`,
  location: `Location ${meetingKey}`,
  country_name: "Testland",
  country_code: "TST",
  circuit_short_name: `Circuit ${meetingKey}`,
  circuit_type: "Race",
  year: 2026,
  date_start: `2024-0${meetingKey}-01T12:00:00Z`,
  circuit_info_url: null,
}));

function Harness() {
  const { state, setMeetingKey, setSeason } = useF1Data();
  const location = useLocation();
  return (
    <div>
      <output data-testid="location">{location.pathname}{location.search}</output>
      <output data-testid="selection">{state.selectedSeason}:{state.selectedMeetingKey ?? "none"}</output>
      <button type="button" onClick={() => setMeetingKey(2)}>Meeting two</button>
      <button type="button" onClick={() => setSeason("2025")}>Season 2025</button>
    </div>
  );
}

function renderProvider(initialEntry: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <F1DataProvider><Harness /></F1DataProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mocks.getMeetingsBySeason.mockResolvedValue(meetings);
  mocks.getSessionsByMeeting.mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("F1DataProvider selection", () => {
  it("removes legacy selection parameters and selects the latest started meeting", async () => {
    renderProvider("/?season=2020&meeting=999");
    const currentYear = String(new Date().getFullYear());

    await waitFor(() => expect(screen.getByTestId("selection")).toHaveTextContent(`${currentYear}:2`));
    expect(screen.getByTestId("location")).toHaveTextContent(/^\/$/);
  });

  it("keeps user selection in provider state without changing the URL", async () => {
    renderProvider("/");
    await waitFor(() => expect(screen.getByTestId("selection")).toHaveTextContent(`${new Date().getFullYear()}:2`));

    fireEvent.click(screen.getByRole("button", { name: "Season 2025" }));
    await waitFor(() => expect(screen.getByTestId("selection")).toHaveTextContent("2025:2"));
    expect(screen.getByTestId("location")).toHaveTextContent(/^\/$/);
  });

  it("falls back to the newest supported season with a started meeting", async () => {
    const currentYear = new Date().getFullYear();
    mocks.getMeetingsBySeason.mockImplementation((season: string) => (
      Number(season) === currentYear ? Promise.resolve([]) : Promise.resolve(meetings)
    ));
    renderProvider("/");

    await waitFor(() => expect(screen.getByTestId("selection")).toHaveTextContent(`${currentYear - 1}:2`));
  });
});
