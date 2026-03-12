import { Cloud, MapPin, Activity, Clock } from "lucide-react";
import { SessionInfo } from "../data/mockData";

interface SessionInfoPanelProps {
  info: SessionInfo;
}

export function SessionInfoPanel({ info }: SessionInfoPanelProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="mb-4 text-card-foreground">Session Information</h3>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Track</p>
            <p className="text-card-foreground">{info.track}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Cloud className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Weather</p>
            <p className="text-card-foreground">{info.weather} • {info.temperature}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Activity className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <p className="text-card-foreground flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              {info.status}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Clock className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Remaining</p>
            <p className="text-card-foreground font-mono text-lg">{info.remainingTime}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
