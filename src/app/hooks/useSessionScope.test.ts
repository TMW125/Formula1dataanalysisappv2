import { describe, expect, it } from "vitest";
import type { Session } from "../types/openf1";
import { getLatestCompletedSession, getSessionStatus, resolveSession } from "./useSessionScope";

function session(
  sessionKey: number,
  start: string,
  end: string,
  sessionName = `Session ${sessionKey}`,
  sessionType: Session["session_type"] = "Practice",
): Session {
  return {
    session_key: sessionKey,
    meeting_key: 1,
    session_name: sessionName,
    session_type: sessionType,
    date_start: start,
    date_end: end,
    year: 2026,
    location: "Test",
    country_name: "GB",
    circuit_short_name: "Test Ring",
  };
}

describe("session scope helpers", () => {
  const now = Date.parse("2026-08-24T12:00:00Z");

  it("classifies scheduled, in-progress, and completed sessions", () => {
    expect(getSessionStatus(session(1, "2026-08-24T13:00:00Z", "2026-08-24T14:00:00Z"), now)).toBe("scheduled");
    expect(getSessionStatus(session(2, "2026-08-24T11:00:00Z", "2026-08-24T13:00:00Z"), now)).toBe("in_progress");
    expect(getSessionStatus(session(3, "2026-08-24T09:00:00Z", "2026-08-24T10:00:00Z"), now)).toBe("completed");
  });

  it("returns the latest completed session by end time", () => {
    const sessions = [
      session(1, "2026-08-24T09:00:00Z", "2026-08-24T10:00:00Z"),
      session(2, "2026-08-24T10:00:00Z", "2026-08-24T11:00:00Z"),
      session(3, "2026-08-24T13:00:00Z", "2026-08-24T14:00:00Z"),
    ];
    expect(getLatestCompletedSession(sessions, now)?.session_key).toBe(2);
  });

  it("does not select a future session as completed", () => {
    expect(getLatestCompletedSession([session(1, "2026-08-24T13:00:00Z", "2026-08-24T14:00:00Z")], now)).toBeNull();
  });

  it("recognises sprint sessions by their names when OpenF1 uses the broad session type", () => {
    const sessions = [
      session(1, "2026-08-24T09:00:00Z", "2026-08-24T10:00:00Z", "Sprint Qualifying", "Qualifying"),
      session(2, "2026-08-24T10:00:00Z", "2026-08-24T11:00:00Z", "Qualifying", "Qualifying"),
      session(3, "2026-08-24T11:00:00Z", "2026-08-24T12:00:00Z", "Sprint", "Race"),
      session(4, "2026-08-24T12:00:00Z", "2026-08-24T13:00:00Z", "Race", "Race"),
    ];

    expect(resolveSession(sessions, "qualifying", "sprint", now).session?.session_key).toBe(1);
    expect(resolveSession(sessions, "qualifying", "sprint", now).supportsSprint).toBe(true);
    expect(resolveSession(sessions, "qualifying", "main", now).session?.session_key).toBe(2);
    expect(resolveSession(sessions, "race", "sprint", now).session?.session_key).toBe(3);
    expect(resolveSession(sessions, "race", "sprint", now).supportsSprint).toBe(true);
    expect(resolveSession(sessions, "race", "main", now).session?.session_key).toBe(4);
  });
});
