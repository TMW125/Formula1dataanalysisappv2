import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { OpenF1Driver } from "../../types/openf1";
import type { QualifyingTelemetrySeries } from "../../utils/qualifyingTelemetry";
import { buildDriverVisualStyleMap } from "../../utils/transformers";

vi.mock("recharts", () => ({
  CartesianGrid: () => null,
  Line: ({ dataKey, strokeDasharray }: { dataKey?: string; strokeDasharray?: string }) => (
    <span data-testid={`mock-line-${dataKey}`} data-stroke-dasharray={strokeDasharray ?? "solid"} />
  ),
  LineChart: ({ children, onMouseMove, onMouseLeave }: { children: ReactNode; onMouseMove?: (state: unknown) => void; onMouseLeave?: () => void }) => (
    <div
      data-testid="mock-line-chart"
      onMouseMove={() => onMouseMove?.({ activeLabel: 50, activePayload: [{ payload: { progress: 50 } }] })}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>
  ),
  ReferenceLine: () => null,
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  XAxis: () => null,
  YAxis: () => null,
}));

import { QualifyingTelemetryCharts } from "./QualifyingTelemetryCharts";

const drivers: OpenF1Driver[] = [
  {
    driver_number: 1,
    broadcast_name: "A DRIVER",
    full_name: "A Driver",
    name_acronym: "AAA",
    team_name: "Test Team A",
    team_colour: "ff0000",
    country_code: "GBR",
    headshot_url: null,
    session_key: 10,
    meeting_key: 20,
  },
  {
    driver_number: 2,
    broadcast_name: "B DRIVER",
    full_name: "B Driver",
    name_acronym: "BBB",
    team_name: "Test Team B",
    team_colour: "00ff00",
    country_code: "GBR",
    headshot_url: null,
    session_key: 10,
    meeting_key: 20,
  },
];

const series: QualifyingTelemetrySeries[] = drivers.map((driver, driverIndex) => ({
  driverNumber: driver.driver_number,
  lap: {
    session_key: 10,
    meeting_key: 20,
    driver_number: driver.driver_number,
    lap_number: 1,
    lap_duration: driverIndex === 0 ? 90 : 90.5,
    duration_sector_1: null,
    duration_sector_2: null,
    duration_sector_3: null,
    i1_speed: null,
    i2_speed: null,
    st_speed: null,
    is_pit_out_lap: false,
    date_start: "2026-01-01T00:00:00Z",
  },
  points: [0, 50, 100].map((progress) => ({
    progress,
    elapsed: (progress / 100) * (driverIndex === 0 ? 90 : 90.5),
    speed: 200 + progress,
    throttle: 80,
    brake: 0,
    gear: 5,
    rpm: 10_000,
  })),
}));

describe("QualifyingTelemetryCharts", () => {
  it("renders all six chart titles", () => {
    render(
      <QualifyingTelemetryCharts
        series={series}
        driverStyles={buildDriverVisualStyleMap(drivers)}
        selectedDrivers={drivers}
        referenceDriverNumber={1}
        referenceTelemetryAvailable
        missingLapDrivers={[]}
        unavailableTelemetryDrivers={[]}
        errors={[]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Speed" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Throttle" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Brake" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Gear" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "RPM" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Delta to fastest selected lap" })).toBeInTheDocument();
  });

  it("shares the hovered lap distance and tooltip across every chart", () => {
    render(
      <QualifyingTelemetryCharts
        series={series}
        driverStyles={buildDriverVisualStyleMap(drivers)}
        selectedDrivers={drivers}
        referenceDriverNumber={1}
        referenceTelemetryAvailable
        missingLapDrivers={[]}
        unavailableTelemetryDrivers={[]}
        errors={[]}
      />,
    );

    fireEvent.mouseMove(screen.getAllByTestId("mock-line-chart")[0]);
    expect(screen.getAllByText("50% lap distance")).toHaveLength(6);
    expect(screen.getAllByText("AAA")).toHaveLength(6);
    expect(screen.getAllByText("BBB")).toHaveLength(6);

    fireEvent.mouseLeave(screen.getAllByTestId("mock-line-chart")[0]);
    expect(screen.queryByText("50% lap distance")).not.toBeInTheDocument();
  });

  it("keeps the tooltip offset from the hover marker", () => {
    render(
      <QualifyingTelemetryCharts
        series={series}
        driverStyles={buildDriverVisualStyleMap(drivers)}
        selectedDrivers={drivers}
        referenceDriverNumber={1}
        referenceTelemetryAvailable
        missingLapDrivers={[]}
        unavailableTelemetryDrivers={[]}
        errors={[]}
      />,
    );

    fireEvent.mouseMove(screen.getAllByTestId("mock-line-chart")[0]);
    const tooltip = screen.getAllByText("50% lap distance")[0].closest('[aria-live="polite"]');

    expect(tooltip).toHaveStyle({ transform: "translateX(12px)" });
    expect(tooltip).not.toHaveClass("-translate-x-1/2");
  });

  it("uses a dashed line for the higher-numbered teammate", () => {
    const sameTeamDrivers = drivers.map((driver) => ({
      ...driver,
      team_name: "Test Team",
      team_colour: "ff0000",
    }));

    render(
      <QualifyingTelemetryCharts
        series={series}
        driverStyles={buildDriverVisualStyleMap(sameTeamDrivers)}
        selectedDrivers={sameTeamDrivers}
        referenceDriverNumber={1}
        referenceTelemetryAvailable
        missingLapDrivers={[]}
        unavailableTelemetryDrivers={[]}
        errors={[]}
      />,
    );

    expect(screen.getAllByTestId("mock-line-driver-1").slice(-6).map((line) => line.getAttribute("data-stroke-dasharray"))).toEqual(Array(6).fill("solid"));
    expect(screen.getAllByTestId("mock-line-driver-2").slice(-6).map((line) => line.getAttribute("data-stroke-dasharray"))).toEqual(Array(6).fill("6 4"));
  });
});
