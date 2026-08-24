import { useState } from "react";
import { Check, ChevronsUpDown, Search, Users, X } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button, buttonVariants } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import type { DriverSelectionState } from "../hooks/useDriverSelection";
import { toHexColor } from "../utils/transformers";
import { DriverLineSwatch } from "./charts/DriverLineStyleLegend";

interface DriverSelectionCardProps {
  selection: DriverSelectionState;
  description: string;
}

export function DriverSelectionCard({ selection, description }: DriverSelectionCardProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <section className="space-y-4 rounded-lg border border-border bg-card p-4 md:p-5" aria-labelledby="drivers-card-heading">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
        <div>
          <h2 id="drivers-card-heading" className="flex items-center gap-2 text-card-foreground"><Users className="h-4 w-4 text-primary" /> Drivers</h2>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <button type="button" className={buttonVariants({ variant: "outline", className: "min-w-52 justify-between" })} aria-expanded={pickerOpen}>
                <span className="inline-flex items-center gap-2"><Search className="h-4 w-4" />{selection.selectedDrivers.length ? `${selection.selectedDrivers.length} selected` : "Choose drivers"}</span>
                <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <Command>
                <CommandInput placeholder="Search drivers or teams…" />
                <CommandList className="max-h-72">
                  <CommandEmpty>No drivers found.</CommandEmpty>
                  <CommandGroup>
                    {selection.orderedDrivers.map((driver) => {
                      const selected = selection.selectedSet.has(driver.driver_number);
                      const style = selection.driverStyles.get(driver.driver_number);
                      return (
                        <CommandItem
                          key={driver.driver_number}
                          value={`${driver.full_name} ${driver.name_acronym} ${driver.team_name}`}
                          onSelect={() => selection.toggleDriver(driver.driver_number)}
                          className="gap-3 data-[selected=true]:bg-secondary data-[selected=true]:text-foreground"
                        >
                          <Checkbox checked={selected} aria-label={`Select ${driver.full_name}`} />
                          <DriverLineSwatch color={style?.color ?? toHexColor(driver.team_colour)} lineStyle={style?.lineStyle} className="h-2.5 w-5 shrink-0" />
                          <span className="min-w-0 flex-1"><span className="block truncate text-sm">{driver.full_name}</span><span className="block truncate text-xs text-muted-foreground">{driver.team_name}</span></span>
                          {selection.resultPosition.has(driver.driver_number) && <span className="font-mono text-xs text-muted-foreground">P{selection.resultPosition.get(driver.driver_number)}</span>}
                          {selected && <Check className="h-4 w-4 text-primary" />}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <Button variant="secondary" size="sm" onClick={() => selection.setSelectedDrivers(selection.defaults)}>Top 5</Button>
          <Button variant="ghost" size="sm" onClick={() => selection.setSelectedDrivers(selection.orderedDrivers.map((driver) => driver.driver_number))}>Select all</Button>
          <Button variant="ghost" size="sm" onClick={() => selection.setSelectedDrivers([])}>Clear</Button>
        </div>
      </div>

      {selection.selectedDriverData.length ? (
        <div className="flex flex-wrap gap-2">
          {selection.selectedDriverData.map((driver) => (
            <Badge key={driver.driver_number} variant="outline" className="gap-2 py-1 pl-2.5 pr-1">
              <DriverLineSwatch color={selection.driverStyles.get(driver.driver_number)?.color ?? toHexColor(driver.team_colour)} lineStyle={selection.driverStyles.get(driver.driver_number)?.lineStyle} className="h-2.5 w-5" />
              {driver.name_acronym}
              <button type="button" onClick={() => selection.toggleDriver(driver.driver_number)} className="rounded-sm p-0.5 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Remove ${driver.full_name}`}><X className="h-3 w-3" /></button>
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No drivers selected. Choose one or more drivers to populate the analysis.</p>
      )}
    </section>
  );
}
