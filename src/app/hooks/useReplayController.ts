import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import { advanceReplayTime } from "../replay/replayEngine";

export const REPLAY_SPEEDS = [1, 2, 4, 8, 16] as const;
export type ReplaySpeed = (typeof REPLAY_SPEEDS)[number];

export function useReplayController(
  start: number,
  end: number,
  canAdvanceRef: MutableRefObject<boolean>,
  endRef?: MutableRefObject<number>
) {
  const [currentTime, setCurrentTime] = useState(start);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<ReplaySpeed>(1);
  const lastTickRef = useRef(0);
  const currentTimeRef = useRef(start);

  useEffect(() => {
    setCurrentTime(start);
    currentTimeRef.current = start;
    setPlaying(false);
    setSpeed(1);
    lastTickRef.current = performance.now();
  }, [start, end]);

  useEffect(() => {
    if (!playing) return;
    lastTickRef.current = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const elapsed = now - lastTickRef.current;
      lastTickRef.current = now;
      if (!canAdvanceRef.current) return;
      const next = advanceReplayTime(currentTimeRef.current, elapsed, speed, endRef?.current ?? end);
      currentTimeRef.current = next.time;
      setCurrentTime(next.time);
      if (next.complete) setPlaying(false);
    }, 250);
    return () => window.clearInterval(timer);
  }, [playing, speed, end, canAdvanceRef, endRef]);

  const seek = useCallback((time: number) => {
    const next = Math.min(endRef?.current ?? end, Math.max(start, time));
    currentTimeRef.current = next;
    setCurrentTime(next);
    lastTickRef.current = performance.now();
  }, [start, end, endRef]);

  const toggle = useCallback(() => {
    setPlaying((value) => {
      if (!value && currentTimeRef.current >= (endRef?.current ?? end)) {
        currentTimeRef.current = start;
        setCurrentTime(start);
      }
      return !value;
    });
  }, [end, endRef, start]);

  const restart = useCallback(() => {
    setCurrentTime(start);
    currentTimeRef.current = start;
    setPlaying(false);
    lastTickRef.current = performance.now();
  }, [start]);

  return { currentTime, playing, speed, setSpeed, seek, toggle, restart };
}
