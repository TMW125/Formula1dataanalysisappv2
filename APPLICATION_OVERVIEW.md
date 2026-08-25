# Application overview

## Architecture

The application is a client-rendered React 18 and TypeScript SPA. React Router owns page routing, TanStack Query owns remote-data state, and OpenF1 requests pass through one rate-limited API service.

- `src/app/layouts/ApplicationShell.tsx` applies the 1024px support boundary before mounting the OpenF1 selection provider.
- `src/app/context/F1DataContext.tsx` owns in-memory season and meeting selection without adding it to the URL.
- `src/app/hooks/useSessionScope.ts` resolves page-specific Race, Sprint, and Qualifying sessions without leaking page toggles into global selection.
- `src/app/hooks/useSessionData.ts` supplies consistent query contracts for ordinary endpoints.
- `src/app/hooks/useReplayData.ts` incrementally loads replay sources and reports required and optional failures separately.
- `src/app/services/openf1Api.ts` builds requests, enforces the in-tab request budget, and supports abort signals.
- Route pages are lazy-loaded from `src/app/routes.tsx`.

## Route behavior

| Route | Version-1 behavior |
| --- | --- |
| `/` | Latest completed-session dashboard and classification |
| `/qualifying` | Qualifying/Sprint Qualifying fastest-lap comparison |
| `/race` | Race/Sprint strategy and lap analysis |
| `/live-replay` | Completed Race/Sprint replay |
| `/practice` | Static, non-fetching “Coming soon” placeholder |
| Any other path | Not-found page |

Season, meeting, Race/Sprint, and Qualifying/Sprint Qualifying selections are intentionally ephemeral in version 1.

## Data and state conventions

- Required endpoint failures block the affected page and provide Retry.
- Optional source failures retain usable panels and identify missing content.
- Loading, empty, unavailable, partial, and error states have distinct copy and semantics.
- Final classification positions are nullable; driver number is the stable row identity and DNF/DNS/DSQ/NC statuses remain visible.
- Qualifying car data is requested only for each selected fastest-lap time window. Unlimited driver selection is retained.
- Replay locations are chunked through the computed data-derived replay end, including late-running sessions.
- Query cache retention remains deliberately conservative pending post-release memory profiling.

## Known boundaries

The app is historical analysis software, not an official timing product. OpenF1 may omit or revise records. Pit-lane durations are presented as reported and may include red-flag or pit-lane holds. Formal mobile support, actual Practice analysis, full non-visual chart parity, and cross-tab rate-limit coordination are outside version 1.
