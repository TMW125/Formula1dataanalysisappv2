import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
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
  afterEach(cleanup);

  it("uses solid and dashed swatches for the two teammates", () => {
    const { container } = render(<DriverSelectionCard selection={createSelection()} description="Choose drivers" />);
    const swatches = [...container.querySelectorAll("line[data-line-style]")];

    expect(swatches).toHaveLength(2);
    expect(swatches[0]).toHaveAttribute("data-line-style", "solid");
    expect(swatches[0]).not.toHaveAttribute("stroke-dasharray");
    expect(swatches[1]).toHaveAttribute("data-line-style", "dashed");
    expect(swatches[1]).toHaveAttribute("stroke-dasharray", "6 4");
  });

  it("uses one pressed option per driver without nested controls", () => {
    const selection = createSelection();
    render(<DriverSelectionCard selection={selection} description="Choose drivers" />);

    fireEvent.click(screen.getByRole("button", { name: /2 selected/ }));
    const options = [...document.querySelectorAll<HTMLButtonElement>("button[aria-pressed]")];

    expect(options).toHaveLength(2);
    expect(options.every((option) => option.getAttribute("aria-pressed") === "true")).toBe(true);
    expect(document.querySelector("button button")).toBeNull();
    expect(screen.queryByRole("checkbox")).toBeNull();
    fireEvent.click(options[0]);
    expect(selection.toggleDriver).toHaveBeenCalledWith(1);
  });
});
