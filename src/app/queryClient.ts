import { QueryClient } from "@tanstack/react-query";

export const QUERY_STALE_TIME = {
  standard: 30 * 60 * 1000,
  historical: 6 * 60 * 60 * 1000,
  location: 6 * 60 * 60 * 1000,
} as const;

export const QUERY_GC_TIME = {
  standard: 24 * 60 * 60 * 1000,
  location: 12 * 60 * 60 * 1000,
} as const;

export function isNotFoundError(error: unknown): boolean {
  return error instanceof Error && /OpenF1 API error:\s*404\b/.test(error.message);
}

/**
 * One in-memory cache for the whole app.  OpenF1 data is deliberately not
 * persisted: telemetry and location payloads can be very large.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: QUERY_STALE_TIME.standard,
        gcTime: QUERY_GC_TIME.standard,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => failureCount < 1 && !isNotFoundError(error),
      },
    },
  });
}

export const queryClient = createQueryClient();
