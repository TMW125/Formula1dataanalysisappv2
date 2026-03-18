import { useMemo } from "react";

interface TrackMapProps {
  x: number[];
  y: number[];
  className?: string;
}

const PADDING = 16;

/**
 * Renders a 2-D SVG track map from the raw x/y Cartesian coordinate arrays
 * returned by the OpenF1 circuit_info_url endpoint.
 *
 * The coordinate system is normalised to fit within the SVG viewport while
 * preserving the circuit's true aspect ratio.
 */
export function TrackMap({ x, y, className }: TrackMapProps) {
  const { points, viewBox } = useMemo(() => {
    if (x.length === 0 || y.length === 0 || x.length !== y.length) {
      return { points: "", viewBox: "0 0 200 200" };
    }

    const minX = Math.min(...x);
    const maxX = Math.max(...x);
    const minY = Math.min(...y);
    const maxY = Math.max(...y);

    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;

    // Target canvas size (before adding padding)
    const canvasW = 200;
    const canvasH = 200;

    // Scale uniformly so the track fits without distortion
    const scale = Math.min(canvasW / rangeX, canvasH / rangeY);

    // Scaled track dimensions
    const scaledW = rangeX * scale;
    const scaledH = rangeY * scale;

    // Offsets to centre the track in the canvas
    const offsetX = (canvasW - scaledW) / 2;
    const offsetY = (canvasH - scaledH) / 2;

    // Build SVG polyline points string.
    // Note: the y-axis is inverted in SVG (positive y goes down),
    //       so we flip y by using (maxY - yi) instead of (yi - minY).
    const pts = x
      .map((xi, i) => {
        const svgX = (xi - minX) * scale + offsetX + PADDING;
        const svgY = (maxY - y[i]) * scale + offsetY + PADDING;
        return `${svgX.toFixed(2)},${svgY.toFixed(2)}`;
      })
      .join(" ");

    const vbW = canvasW + PADDING * 2;
    const vbH = canvasH + PADDING * 2;

    return { points: pts, viewBox: `0 0 ${vbW} ${vbH}` };
  }, [x, y]);

  if (!points) return null;

  return (
    <svg
      viewBox={viewBox}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Circuit track map"
    >
      {/* Subtle glow / shadow for depth */}
      <defs>
        <filter id="track-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Shadow layer */}
      <polyline
        points={points}
        fill="none"
        stroke="rgba(0,0,0,0.4)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Main track line */}
      <polyline
        points={points}
        fill="none"
        stroke="#E10600"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#track-glow)"
      />
    </svg>
  );
}
