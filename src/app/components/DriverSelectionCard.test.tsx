import "@testing-library/jest-dom/vitest";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { OpenF1Driver } from "../types/openf1";
import type { DriverSelectionState } from "../hooks/useDriverSelection";
import { buildDriverVisualStyleMap } from "../utils/transformers";
import { DriverSelectionCard } from "./DriverSelectionCard";

const drivers: OpenF1Driver[] = [
  {
    driver_number: 1,
    broadcast_name: "FIRST DRIVER",
    full_name: "First Driver",
    name_acronym: "ONE",
    team_name: "Test Team",
    team_colour: "ff0000",
    country_code: "GBR",
    headshot_url: null,
    session_key: 10,
    meeting_key: 20,
  },
  {
    driver_number: 11,
    broadcast_name: "SECOND DRIVER",
    full_name: "Second Driver",
    name_acronym: "TWO",
    team_name: "Test Team",
    team_colour: "ff0000",
    country_code: "GBR",
    headshot_url: null,
    session_key: 10,
    meeting_key: 20,
  },
];

function createSelection(): DriverSelectionState {
  return {
    selectedDrivers: [1, 11],
    setSelectedDrivers: vi.fn(),
    defaults: [1, 11],
    selectedSet: new Set([1, 11]),
    orderedDrivers: drivers,
    selectedDriverData: drivers,
    driverStyles: buildDriverVisualStyleMap(drivers),
    resultPosition: new Map(),
    toggleDriver: vi.fn(),
    ready: true,
  };
}

describe("DriverSelectionCard", () => {
  it("uses solid and dashed swatches for the two teammates", () => {
    const { container } = render(<DriverSelectionCard selection={createSelection()} description="Choose drivers" />);
    const swatches = [...container.querySelectorAll("line[data-line-style]")];

    expect(swatches).toHaveLength(2);
    expect(swatches[0]).toHaveAttribute("data-line-style", "solid");
    expect(swatches[0]).not.toHaveAttribute("stroke-dasharray");
    expect(swatches[1]).toHaveAttribute("data-line-style", "dashed");
    expect(swatches[1]).toHaveAttribute("stroke-dasharray", "6 4");
  });
});
