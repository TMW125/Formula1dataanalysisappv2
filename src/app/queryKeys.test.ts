import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { QUERY_STALE_TIME } from "./queryClient";
import { openF1QueryKeys } from "./queryKeys";

function createClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
    },
  });
}

describe("OpenF1 query keys", () => {
  it("deduplicates identical in-flight requests", async () => {
    const client = createClient();
    const fetcher = vi.fn(() => new Promise<string[]>((resolve) => {
      setTimeout(() => resolve(["shared"]), 0);
    }));
    const queryKey = openF1QueryKeys.session("2024", 1, 10, "laps");

    const [first, second] = await Promise.all([
      client.fetchQuery({ queryKey, queryFn: fetcher, staleTime: QUERY_STALE_TIME.standard }),
      client.fetchQuery({ queryKey, queryFn: fetcher, staleTime: QUERY_STALE_TIME.standard }),
    ]);

    expect(first).toEqual(["shared"]);
    expect(second).toEqual(["shared"]);
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("reuses fresh cached data when navigating back to a page", async () => {
    const client = createClient();
    const firstFetcher = vi.fn().mockResolvedValue(["cached"]);
    const secondFetcher = vi.fn().mockResolvedValue(["network"]);
    const queryKey = openF1QueryKeys.session("2024", 1, 10, "drivers");

    await client.fetchQuery({ queryKey, queryFn: firstFetcher, staleTime: QUERY_STALE_TIME.standard });
    await expect(client.fetchQuery({ queryKey, queryFn: secondFetcher, staleTime: QUERY_STALE_TIME.standard }))
      .resolves.toEqual(["cached"]);

    expect(firstFetcher).toHaveBeenCalledOnce();
    expect(secondFetcher).not.toHaveBeenCalled();
  });

  it("separates session and driver dimensions", async () => {
    const client = createClient();
    const fetcher = vi.fn().mockResolvedValue([]);
    const keys = [
      openF1QueryKeys.session("2024", 1, 10, "laps"),
      openF1QueryKeys.session("2024", 1, 11, "laps"),
      openF1QueryKeys.session("2024", 1, 10, "car_data", 1),
      openF1QueryKeys.session("2024", 1, 10, "car_data", 11),
    ];

    for (const queryKey of keys) {
      await client.fetchQuery({ queryKey, queryFn: fetcher, staleTime: QUERY_STALE_TIME.standard });
    }

    expect(fetcher).toHaveBeenCalledTimes(4);
    expect(new Set(keys.map((key) => JSON.stringify(key))).size).toBe(4);
  });

  it("includes the bounded location window and chunk in the cache key", () => {
    const first = openF1QueryKeys.locationRange(
      "2024",
      1,
      10,
      "2024-01-01T12:00:00.000Z",
      "2024-01-01T12:05:00.000Z",
      0,
    );
    const second = openF1QueryKeys.locationRange(
      "2024",
      1,
      10,
      "2024-01-01T12:05:00.000Z",
      "2024-01-01T12:10:00.000Z",
      1,
    );

    expect(first).not.toEqual(second);
  });
});
