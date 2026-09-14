import { memo, useMemo } from "react";
import type { ReplayDriverState } from "../replay/types";
import { toHexColor } from "../utils/transformers";

interface ReplayTrackMapProps {
  x: number[];
  y: number[];
  drivers: ReplayDriverState[];
}

const VIEW_SIZE = 1000;
const PADDING = 55;

export const ReplayTrackMap = memo(function ReplayTrackMap({ x, y, drivers }: ReplayTrackMapProps) {
  const geometry = useMemo(() => {
    const validTrack = x.length > 1 && x.length === y.length;
    const locationPoints = drivers.flatMap((driver) => driver.location ? [driver.location] : []);
    const sourceX = validTrack ? x : locationPoints.map((point) => point.x);
    const sourceY = validTrack ? y : locationPoints.map((point) => point.y);
    if (sourceX.length < 2) return null;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (let index = 0; index < sourceX.length; index += 1) {
      minX = Math.min(minX, sourceX[index]);
      maxX = Math.max(maxX, sourceX[index]);
      minY = Math.min(minY, sourceY[index]);
      maxY = Math.max(maxY, sourceY[index]);
    }
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const drawable = VIEW_SIZE - PADDING * 2;
    const scale = Math.min(drawable / rangeX, drawable / rangeY);
    const width = rangeX * scale;
    const height = rangeY * scale;
    const offsetX = (VIEW_SIZE - width) / 2;
    const offsetY = (VIEW_SIZE - height) / 2;
    const project = (pointX: number, pointY: number) => ({
      x: (pointX - minX) * scale + offsetX,
      y: (maxY - pointY) * scale + offsetY,
    });
    const points = validTrack
      ? x.map((pointX, index) => {
          const point = project(pointX, y[index]);
          return `${point.x.toFixed(1)},${point.y.toFixed(1)}`;
        }).join(" ")
      : "";
    return { points, project };
  }, [x, y, drivers]);

  if (!geometry) {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Location data unavailable</div>;
  }

  return (
    <svg viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`} className="h-full w-full" role="img" aria-label="Animated circuit positions">
      {geometry.points ? (
        <>
          <polyline points={geometry.points} fill="none" stroke="#050507" strokeWidth="35" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points={geometry.points} fill="none" stroke="#34343f" strokeWidth="21" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points={geometry.points} fill="none" stroke="#696976" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : null}
      {[...drivers].reverse().map((state) => {
        if (!state.location) return null;
        const point = geometry.project(state.location.x, state.location.y);
        const color = toHexColor(state.driver.team_colour);
        return (
          <g
            key={state.driver.driver_number}
            transform={`translate(${point.x.toFixed(1)} ${point.y.toFixed(1)})`}
            opacity={state.markerOpacity}
            className="transition-[transform,opacity] duration-200 ease-linear"
            aria-label={`${state.driver.full_name}, position ${state.position ?? "unclassified"}`}
          >
            <circle r="27" fill={color} opacity="0.08" />
            <circle r="24" fill={color} opacity="0.16" />
            <circle r="20" fill="#0a0a0f" stroke={color} strokeWidth="6" />
            <text y="7" textAnchor="middle" fill="#fff" fontSize="19" fontWeight="700">{state.driver.driver_number}</text>
          </g>
        );
      })}
    </svg>
  );
});
