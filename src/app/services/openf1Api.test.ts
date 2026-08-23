import { afterEach, describe, expect, it, vi } from "vitest";
import { buildQueryString, getRateLimitWaitMs, getStartingGrid } from "./openf1Api";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("OpenF1 query serialization", () => {
  it("keeps comparison operators literal for OpenF1's raw filter syntax", () => {
    expect(buildQueryString({
      session_key: 9161,
      "date>=": "2023-09-16T13:03:35.200Z",
      "date<": "2023-09-16T13:03:35.800Z",
    })).toBe(
      "?session_key=9161&date>=2023-09-16T13%3A03%3A35.200Z&date<2023-09-16T13%3A03%3A35.800Z"
    );
  });

  it("continues to encode ordinary parameter names and values", () => {
    expect(buildQueryString({ session_key: 1, session_name: "Sprint Qualifying" }))
      .toBe("?session_key=1&session_name=Sprint%20Qualifying");
  });
});

describe("OpenF1 rate-limit scheduling", () => {
  const now = 100_000;

  it("allows a request while both windows have capacity", () => {
    expect(getRateLimitWaitMs(now, [now - 10_000, now - 2_000])).toBe(0);
  });

  it("waits for the per-second window after three recent requests", () => {
    expect(getRateLimitWaitMs(now, [now - 900, now - 800, now - 700])).toBe(125);
  });

  it("waits for the oldest minute-window request after reaching the safe quota", () => {
    const timestamps = Array.from({ length: 28 }, (_, index) => now - 59_000 + index * 2_000);
    expect(getRateLimitWaitMs(now, timestamps)).toBe(1_250);
  });

  it("ignores timestamps outside the rolling minute", () => {
    expect(getRateLimitWaitMs(now, [now - 61_000, now - 60_000])).toBe(0);
  });
});

describe("OpenF1 optional collection data", () => {
  it("treats a missing starting grid as an empty collection", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ detail: "No results found." }),
      { status: 404, statusText: "Not Found", headers: { "Content-Type": "application/json" } }
    ));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getStartingGrid(11342)).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.openf1.org/v1/starting_grid?session_key=11342",
      expect.objectContaining({ headers: { Accept: "application/json" } })
    );
  });
});
