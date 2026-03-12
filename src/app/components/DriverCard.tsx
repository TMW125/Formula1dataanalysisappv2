interface DriverCardProps {
  name: string;
  team: string;
  number: number;
  teamColor: string;
  abbreviation: string;
}

export function DriverCard({ name, team, number, teamColor, abbreviation }: DriverCardProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 hover:border-primary transition-colors cursor-pointer">
      <div className="flex items-center gap-4">
        <div
          className="w-16 h-16 rounded-lg flex items-center justify-center text-2xl font-bold"
          style={{ backgroundColor: teamColor + "20", color: teamColor }}
        >
          {abbreviation}
        </div>
        <div className="flex-1">
          <h3 className="text-card-foreground mb-1">{name}</h3>
          <p className="text-sm text-muted-foreground">{team}</p>
          <p className="text-xs text-muted-foreground mt-1">#{number}</p>
        </div>
      </div>
    </div>
  );
}
