import "@testing-library/jest-dom/vitest";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ReplayDriverState } from "../replay/types";
import { ReplayTrackMap } from "./ReplayTrackMap";

function driver(number: number, name: string, position: number): ReplayDriverState {
  return {
    driver: {
      driver_number: number,
      broadcast_name: name,
      full_name: name,
      name_acronym: name.slice(0, 3).toUpperCase(),
      team_name: "Test Team",
      team_colour: number === 1 ? "ff0000" : "00ff00",
      country_code: "GBR",
      headshot_url: null,
      session_key: 1,
      meeting_key: 1,
    },
    position,
    lap: 1,
    gap: position === 1 ? "LEADER" : "+1.000",
    compound: "MEDIUM",
    inPit: false,
    location: { x: 50, y: 50 },
    markerOpacity: 1,
  };
}

describe("ReplayTrackMap marker stacking", () => {
  it("paints the leader last so it remains above cars behind", () => {
    const { container } = render(
      <ReplayTrackMap
        x={[0, 100]}
        y={[0, 100]}
        drivers={[driver(1, "Leader", 1), driver(2, "Follower", 2)]}
      />
    );
    const labels = [...container.querySelectorAll("svg > g")].map((element) => element.getAttribute("aria-label"));
    expect(labels).toEqual(["Follower, position 2", "Leader, position 1"]);
  });

  it("uses circular glow layers without a clipped SVG filter", () => {
    const { container } = render(
      <ReplayTrackMap x={[0, 100]} y={[0, 100]} drivers={[driver(1, "Leader", 1)]} />
    );
    expect(container.querySelector("filter")).not.toBeInTheDocument();
    expect(container.querySelectorAll("svg > g circle")).toHaveLength(3);
    expect(container.querySelector("svg > g")).toHaveAttribute("opacity", "1");
  });
});
