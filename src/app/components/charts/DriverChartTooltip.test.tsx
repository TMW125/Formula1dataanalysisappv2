import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DriverChartTooltip } from "./DriverChartTooltip";

describe("DriverChartTooltip", () => {
  it("renders formatted driver values with their line styles", () => {
    const { container } = render(
      <DriverChartTooltip
        title="Cumulative race-time delta"
        subtitle="Lap 16"
        xValue={16}
        xDomain={[1, 43]}
        data={{ lap: 16, deltaOne: 1.234, deltaTwo: -0.5 }}
        series={[
          { key: "deltaOne", name: "ONE", color: "#ff0000", lineStyle: "solid" },
          { key: "deltaTwo", name: "TWO", color: "#ff0000", lineStyle: "dashed" },
        ]}
        formatValue={(value) => `${value.toFixed(3)}s`}
        chartMargin={{ left: 8, right: 18 }}
        yAxisWidth={58}
      />,
    );

    expect(screen.getByText("Cumulative race-time delta")).toBeInTheDocument();
    expect(screen.getByText("Lap 16")).toBeInTheDocument();
    expect(screen.getByText("1.234s")).toBeInTheDocument();
    expect(screen.getByText("-0.500s")).toBeInTheDocument();

    const lines = [...container.querySelectorAll("line[data-line-style]")];
    expect(lines[0]).toHaveAttribute("data-line-style", "solid");
    expect(lines[1]).toHaveAttribute("data-line-style", "dashed");
    expect(lines[1]).toHaveAttribute("stroke-dasharray", "6 4");
  });
});
