import type { SessionVariant } from "../context/F1DataContext";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";

interface SessionVariantToggleProps {
  value: SessionVariant;
  onChange: (value: SessionVariant) => void;
  supportsSprint: boolean;
  mainLabel: string;
  sprintLabel: string;
  ariaLabel: string;
}

export function SessionVariantToggle({
  value,
  onChange,
  supportsSprint,
  mainLabel,
  sprintLabel,
  ariaLabel,
}: SessionVariantToggleProps) {
  if (!supportsSprint) return null;

  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(next) => {
        if (next === "main" || next === "sprint") onChange(next);
      }}
      variant="outline"
      size="sm"
      aria-label={ariaLabel}
      className="min-w-max shrink-0"
    >
      <ToggleGroupItem value="main">{mainLabel}</ToggleGroupItem>
      <ToggleGroupItem value="sprint">{sprintLabel}</ToggleGroupItem>
    </ToggleGroup>
  );
}
