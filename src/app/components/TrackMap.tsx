import { trackMapPoints, driverPositions } from "../data/mockData";

export function TrackMap() {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <h3 className="mb-4 text-card-foreground">Track Map</h3>
      <div className="bg-secondary rounded-lg p-4 relative">
        <svg viewBox="0 0 500 400" className="w-full h-auto">
          {/* Track outline */}
          <path
            d={`M ${trackMapPoints.map((p) => `${p.x},${p.y}`).join(" L ")}`}
            fill="none"
            stroke="#2a2a36"
            strokeWidth="30"
          />
          <path
            d={`M ${trackMapPoints.map((p) => `${p.x},${p.y}`).join(" L ")}`}
            fill="none"
            stroke="#1a1a24"
            strokeWidth="20"
          />

          {/* Start/Finish line */}
          <line x1="95" y1="190" x2="105" y2="210" stroke="#E10600" strokeWidth="4" strokeDasharray="2,2" />

          {/* Driver positions */}
          {driverPositions.map((pos, idx) => (
            <g key={pos.driver}>
              <circle cx={pos.x} cy={pos.y} r="8" fill={pos.color} />
              <text
                x={pos.x}
                y={pos.y + 20}
                fontSize="10"
                fill="#f5f5f5"
                textAnchor="middle"
                fontWeight="bold"
              >
                {pos.driver}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
