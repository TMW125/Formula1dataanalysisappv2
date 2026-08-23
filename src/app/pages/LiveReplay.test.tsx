import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "../types/openf1";

if (typeof ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

const mocks = vi.hoisted(() => ({
  session: null as Session | null,
  useReplayData: vi.fn(),
}));

vi.mock("../hooks/useSessionData", () => ({
  useCurrentSession: () => mocks.session,
  useCircuitInfo: () => ({ circuitInfo: null, loading: false }),
}));

vi.mock("../hooks/useReplayData", () => ({
  useReplayData: (...args: unknown[]) => mocks.useReplayData(...args),
}));

import { LiveReplay, ReplayControls } from "./LiveReplay";

afterEach(cleanup);

describe("LiveReplay", () => {
  beforeEach(() => {
    HTMLMediaElement.prototype.pause = vi.fn();
    HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    mocks.session = null;
    mocks.useReplayData.mockReturnValue({ dataset: null, loading: false, locationReady: false, buffering: false, errors: {}, retry: vi.fn() });
  });

  it("guides the user when no session is selected", () => {
    render(<LiveReplay />);
    expect(screen.getByRole("heading", { name: "No session selected" })).toBeInTheDocument();
  });

  it("does not request replay data for an unfinished session", () => {
    mocks.session = { session_key: 1, meeting_key: 1, session_name: "Race", session_type: "Race", date_start: new Date(Date.now() - 1000).toISOString(), date_end: new Date(Date.now() + 60_000).toISOString(), year: 2026, location: "Test", country_name: "GB", circuit_short_name: "Test Ring" };
    render(<LiveReplay />);
    expect(screen.getByText("Replay available after the session ends")).toBeInTheDocument();
    expect(mocks.useReplayData).toHaveBeenCalledWith(null, expect.any(Number));
  });

  it("offers retry when a supporting endpoint fails", () => {
    const retry = vi.fn();
    mocks.session = { session_key: 1, meeting_key: 1, session_name: "Race", session_type: "Race", date_start: "2024-01-01T12:00:00Z", date_end: "2024-01-01T13:00:00Z", year: 2024, location: "Test", country_name: "GB", circuit_short_name: "Test Ring" };
    mocks.useReplayData.mockReturnValue({ dataset: null, loading: false, locationReady: false, buffering: false, errors: { radio: "failed" }, retry });
    render(<LiveReplay />);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(retry).toHaveBeenCalledOnce();
  });
});

describe("ReplayControls", () => {
  it("seeks to a timeline event when its marker is activated", () => {
    const onSeek = vi.fn();
    const start = Date.parse("2024-01-01T12:00:00Z");
    render(
      <ReplayControls
        start={start}
        end={start + 60_000}
        current={start}
        playing={false}
        buffering={false}
        speed={1}
        events={[{
          id: "red-flag",
          date: new Date(start + 30_000).toISOString(),
          timestamp: start + 30_000,
          kind: "control",
          title: "RED",
          detail: "Red flag",
          driverNumber: null,
          lapNumber: null,
          flag: "RED",
        }]}
        disabled={false}
        onToggle={vi.fn()}
        onRestart={vi.fn()}
        onSeek={onSeek}
        onSpeed={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Jump to RED at 00:30" }));
    expect(onSeek).toHaveBeenCalledWith(start + 30_000);
  });

  it("shows event details when a timeline marker receives focus", async () => {
    const start = Date.parse("2024-01-01T12:00:00Z");
    render(
      <ReplayControls
        start={start}
        end={start + 60_000}
        current={start}
        playing={false}
        buffering={false}
        speed={1}
        events={[{
          id: "red-flag",
          date: new Date(start + 30_000).toISOString(),
          timestamp: start + 30_000,
          kind: "control",
          title: "RED",
          detail: "Red flag deployed",
          driverNumber: null,
          lapNumber: 12,
          flag: "RED",
        }]}
        disabled={false}
        onToggle={vi.fn()}
        onRestart={vi.fn()}
        onSeek={vi.fn()}
        onSpeed={vi.fn()}
      />
    );

    fireEvent.focus(screen.getByRole("button", { name: "Jump to RED at 00:30" }));
    await waitFor(() => {
      expect(screen.getByRole("tooltip")).toHaveTextContent("Red flag deployed");
    });
    expect(screen.getByRole("tooltip")).toHaveTextContent("Lap 12");
  });
});
