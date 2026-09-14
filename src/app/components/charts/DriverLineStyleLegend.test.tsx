import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DriverLineStyleLegend, DriverSeriesLegend } from "./DriverLineStyleLegend";

describe("DriverLineStyleLegend", () => {
  it("shows solid and dashed samples for the teammate convention", () => {
    render(<DriverLineStyleLegend />);

    const lines = screen.getByLabelText("Driver line style key").querySelectorAll("line");
    expect(lines[0]).not.toHaveAttribute("stroke-dasharray");
    expect(lines[1]).toHaveAttribute("stroke-dasharray", "6 4");
  });

  it("preserves each series line style in the named legend", () => {
    render(
      <DriverSeriesLegend
        series={[
          { key: "one", name: "ONE", color: "#ff0000", lineStyle: "solid" },
          { key: "two", name: "TWO", color: "#ff0000", lineStyle: "dashed" },
        ]}
      />,
    );

    const lines = screen.getByLabelText("Driver series legend").querySelectorAll("line");
    expect(lines[0]).not.toHaveAttribute("stroke-dasharray");
    expect(lines[1]).toHaveAttribute("stroke-dasharray", "6 4");
  });
});
