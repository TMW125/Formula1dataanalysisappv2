import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LeaderboardRow } from "../types/ui";
import { LeaderboardTable } from "./LeaderboardTable";

afterEach(() => vi.restoreAllMocks());

describe("LeaderboardTable", () => {
  it("uses driver identity for unclassified rows and renders each status", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const statuses: LeaderboardRow["classificationStatus"][] = ["DNF", "DNS", "DSQ", "NC", "NC"];
    const rows: LeaderboardRow[] = statuses.map((status, index) => ({
      driverNumber: index + 1,
      position: null,
      classificationStatus: status,
      driver: `Driver ${index + 1}`,
      team: "Test Team",
      teamColor: "#ffffff",
      time: "50",
      gap: "—",
    }));

    render(<LeaderboardTable data={rows} />);

    expect(consoleError).not.toHaveBeenCalled();
    expect(screen.getByText("DNF")).toBeInTheDocument();
    expect(screen.getByText("DNS")).toBeInTheDocument();
    expect(screen.getByText("DSQ")).toBeInTheDocument();
    expect(screen.getAllByText("NC")).toHaveLength(2);
  });
});
