import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { Lap, OpenF1Driver, SessionResult } from "../types/openf1";
import { buildDefaultDriverSelection, buildDriverVisualStyleMap, type DriverVisualStyle } from "../utils/transformers";

export interface DriverSelectionState {
  selectedDrivers: number[];
  setSelectedDrivers: Dispatch<SetStateAction<number[]>>;
  defaults: number[];
  selectedSet: Set<number>;
  orderedDrivers: OpenF1Driver[];
  selectedDriverData: OpenF1Driver[];
  driverStyles: Map<number, DriverVisualStyle>;
  resultPosition: Map<number, number>;
  toggleDriver: (driverNumber: number) => void;
  ready: boolean;
}

interface UseDriverSelectionOptions {
  sessionKey: number | null;
  drivers: OpenF1Driver[];
  results: SessionResult[];
  laps: Lap[];
  loading: boolean;
}

export function useDriverSelection({
  sessionKey,
  drivers,
  results,
  laps,
  loading,
}: UseDriverSelectionOptions): DriverSelectionState {
  const [selectedDrivers, setSelectedDrivers] = useState<number[]>([]);
  const initializedSession = useRef<number | null>(null);

  const sessionDrivers = useMemo(
    () => sessionKey === null ? [] : drivers.filter((driver) => driver.session_key === sessionKey),
    [drivers, sessionKey],
  );
  const sessionResults = useMemo(
    () => sessionKey === null ? [] : results.filter((result) => result.session_key === sessionKey),
    [results, sessionKey],
  );
  const sessionLaps = useMemo(
    () => sessionKey === null ? [] : laps.filter((lap) => lap.session_key === sessionKey),
    [laps, sessionKey],
  );
  const driverStyles = useMemo(
    () => buildDriverVisualStyleMap(sessionDrivers),
    [sessionDrivers],
  );
  const defaults = useMemo(
    () => buildDefaultDriverSelection(sessionDrivers, sessionResults, sessionLaps),
    [sessionDrivers, sessionLaps, sessionResults],
  );
  const resultPosition = useMemo(
    () => new Map(sessionResults.flatMap((result) => result.position === null ? [] : [[result.driver_number, result.position] as const])),
    [sessionResults],
  );
  const orderedDrivers = useMemo(
    () => [...sessionDrivers].sort((a, b) => {
      const aPosition = resultPosition.get(a.driver_number) ?? Infinity;
      const bPosition = resultPosition.get(b.driver_number) ?? Infinity;
      return aPosition - bPosition || a.name_acronym.localeCompare(b.name_acronym);
    }),
    [resultPosition, sessionDrivers],
  );
  const selectedSet = useMemo(() => new Set(selectedDrivers), [selectedDrivers]);
  const selectedDriverData = useMemo(
    () => selectedDrivers
      .map((number) => sessionDrivers.find((driver) => driver.driver_number === number))
      .filter((driver): driver is OpenF1Driver => driver != null),
    [selectedDrivers, sessionDrivers],
  );

  useEffect(() => {
    if (sessionKey === null) {
      if (initializedSession.current !== null) {
        initializedSession.current = null;
        setSelectedDrivers([]);
      }
      return;
    }
    if (initializedSession.current === sessionKey || loading) return;

    initializedSession.current = sessionKey;
    setSelectedDrivers(defaults);
  }, [defaults, loading, sessionKey]);

  const toggleDriver = useCallback((driverNumber: number) => {
    setSelectedDrivers((current) => current.includes(driverNumber)
      ? current.filter((number) => number !== driverNumber)
      : [...current, driverNumber]);
  }, []);

  return {
    selectedDrivers,
    setSelectedDrivers,
    defaults,
    selectedSet,
    orderedDrivers,
    selectedDriverData,
    driverStyles,
    resultPosition,
    toggleDriver,
    ready: sessionKey !== null && initializedSession.current === sessionKey,
  };
}
