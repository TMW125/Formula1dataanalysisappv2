import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";

const mocks = vi.hoisted(() => ({
  getMeetingsBySeason: vi.fn(),
  getSessionsByMeeting: vi.fn(),
}));

vi.mock("../services/openf1Api", () => mocks);

import { ApplicationShell } from "./ApplicationShell";

afterEach(() => {
  cleanup();
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 });
  vi.clearAllMocks();
});

describe("ApplicationShell viewport support", () => {
  it("shows the intentional fallback without mounting the data provider below 1024px", () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1023 });

    render(<MemoryRouter><ApplicationShell /></MemoryRouter>);

    expect(screen.getByRole("heading", { name: "A larger screen is required" })).toBeInTheDocument();
    expect(mocks.getMeetingsBySeason).not.toHaveBeenCalled();
  });
});
