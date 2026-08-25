# Formula 1 Data Analysis

A desktop-first React application for exploring historical Formula 1 sessions with data from the [OpenF1 API](https://openf1.org/).

## Version 1 scope

- Dashboard: latest completed session overview and classification.
- Qualifying: fastest-lap speed, throttle, brake, gear, RPM, and delta comparisons with synchronized hover.
- Race: stint, lap-time distribution, pace, position, and gap analysis with synchronized lap hover.
- Live Replay: completed Race and Sprint playback with circuit positions, classification, controls, and seekable event clusters.
- Practice: an intentionally non-functional, non-fetching “Coming soon” placeholder.
- Historical coverage: 2023 onward, matching OpenF1 availability.
- Supported viewport: 1024 CSS pixels and wider. Smaller viewports receive an explicit unsupported-device message and do not start analysis requests.

Season and race-weekend selection is held in application state and remains stable while navigating between pages. It is intentionally omitted from the URL; refreshing starts from the newest available meeting.

## Local development

Prerequisites are Node.js 24.x and pnpm 10.34.5.

```bash
corepack pnpm@10.34.5 install --frozen-lockfile
corepack pnpm@10.34.5 run dev
```

The app calls OpenF1 directly from the browser. No application secrets are required.

## Verification

```bash
corepack pnpm@10.34.5 audit --prod --audit-level high
corepack pnpm@10.34.5 audit --audit-level high
corepack pnpm@10.34.5 run lint
corepack pnpm@10.34.5 run typecheck
corepack pnpm@10.34.5 run test
corepack pnpm@10.34.5 run build
corepack pnpm@10.34.5 run test:e2e:install
corepack pnpm@10.34.5 run test:e2e
```

Playwright uses deterministic network fixtures and covers Chromium, Firefox, and WebKit. Perform one separate live OpenF1 smoke test against a known historical meeting after deterministic checks pass.

## Deployment

Vercel is the version-1 target. [`vercel.json`](./vercel.json) provides the SPA history rewrite required for direct route refreshes. Pull requests should deploy a Git preview after CI passes.

Release procedure:

1. Validate the preview at 1024×768, 1280×800, 1440×900, and 1920×1080.
2. Hard-refresh every route, inspect browser diagnostics, and run the live OpenF1 smoke test.
3. Record the tested Vercel deployment identifier.
4. Promote that exact preview artifact; do not rebuild production independently.
5. If validation fails, immediately re-promote the previously recorded production deployment.

See [`APPLICATION_OVERVIEW.md`](./APPLICATION_OVERVIEW.md) for architecture and [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) for interaction and presentation conventions.

## Explicit post-version-1 work

- Implement Practice analysis.
- Support responsive layouts below 1024px.
- Provide complete keyboard and non-visual chart equivalents and pursue formal WCAG 2.2 AA validation.
- Coordinate OpenF1 rate limiting across browser tabs.
- Add stronger runtime schema validation, richer pit-hold context, advanced chart controls, and broader security/privacy hardening.
