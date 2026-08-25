import { useState } from "react";
import { Check, ChevronsUpDown, Search, Users, X } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button, buttonVariants } from "./ui/button";
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
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredDrivers = normalizedQuery
    ? selection.orderedDrivers.filter((driver) => (
        `${driver.full_name} ${driver.name_acronym} ${driver.team_name}`.toLocaleLowerCase().includes(normalizedQuery)
      ))
    : selection.orderedDrivers;

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
            <PopoverContent className="w-80 p-0" align="end" aria-label="Driver selection">
              <div className="overflow-hidden rounded-md bg-popover text-popover-foreground">
                <label htmlFor="driver-search" className="sr-only">Search drivers or teams</label>
                <div className="flex h-10 items-center gap-2 border-b px-3">
                  <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <input
                    id="driver-search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search drivers or teams…"
                    className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                </div>
                <div className="max-h-72 overflow-y-auto p-1" aria-label="Available drivers">
                  {filteredDrivers.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No drivers found.</p> : null}
                  {filteredDrivers.map((driver) => {
                      const selected = selection.selectedSet.has(driver.driver_number);
                      const style = selection.driverStyles.get(driver.driver_number);
                      return (
                        <button
                          type="button"
                          key={driver.driver_number}
                          onClick={() => selection.toggleDriver(driver.driver_number)}
                          aria-pressed={selected}
                          className="flex w-full items-center gap-3 rounded-sm px-2 py-2 text-left text-sm hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-pressed:bg-secondary"
                        >
                          <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border"}`} aria-hidden="true">
                            {selected ? <Check className="h-3 w-3" /> : null}
                          </span>
                          <DriverLineSwatch color={style?.color ?? toHexColor(driver.team_colour)} lineStyle={style?.lineStyle} className="h-2.5 w-5 shrink-0" />
                          <span className="min-w-0 flex-1"><span className="block truncate text-sm">{driver.full_name}</span><span className="block truncate text-xs text-muted-foreground">{driver.team_name}</span></span>
                          {selection.resultPosition.has(driver.driver_number) && <span className="font-mono text-xs text-muted-foreground">P{selection.resultPosition.get(driver.driver_number)}</span>}
                        </button>
                      );
                    })}
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Button variant="secondary" size="sm" disabled={selection.defaults.length === 0} onClick={() => selection.setSelectedDrivers(selection.defaults)}>Top 5</Button>
          <Button variant="ghost" size="sm" disabled={selection.orderedDrivers.length === 0} onClick={() => selection.setSelectedDrivers(selection.orderedDrivers.map((driver) => driver.driver_number))}>Select all</Button>
          <Button variant="ghost" size="sm" disabled={selection.selectedDrivers.length === 0} onClick={() => selection.setSelectedDrivers([])}>Clear</Button>
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
