# Interface and interaction conventions

## Presentation

The interface uses a dark, high-contrast motorsport palette. Rajdhani is used for headings and controls; Inter is used for body copy. Driver series use OpenF1 team colors plus line style so teammates remain distinguishable without relying on color alone.

The supported layout begins at 1024px. At narrower widths the application shows one clear support message instead of compressing the fixed navigation and charts into an unusable layout.

## Shared states

`src/app/components/AsyncState.tsx` defines the shared meanings for page loading, panel loading, blocking error, empty content, and partial-data warning. A page must not render a required-source failure as an empty result. Optional-source failures must leave unaffected content interactive.

Loading and error announcements are concise and owned by their surrounding state. The spinner itself is decorative. Retry buttons remain available for blocking failures and for recoverable optional failures.

## Driver selection

Driver selection has no maximum and retains Select all. Each driver is represented by one button with `aria-pressed`; the check mark is presentational rather than a nested control. Zero, one, several, and the full field are intentional states.

## Charts

- Charts that share the same semantic x-axis share hover position: qualifying charts synchronize by lap progress, while race line charts synchronize by lap number.
- Legends and tooltips reuse shared driver-series meaning, including teammate dash patterns.
- Chart animation is disabled so selection and hover do not replay motion. Global reduced-motion styles also suppress incidental interface animation.
- The 22-driver violin plot uses a minimum width per driver and horizontal scrolling rather than collapsing labels and marks.
- Position domains are derived from actual data and field size rather than assuming 20 drivers.

Version 1 provides best-effort structural accessibility. Complete keyboard exploration and equivalent non-visual data tables for every chart are explicit post-release work.

## Replay

Replay controls precede the visualizations in reading and document order. Timeline targets are at least 24×24px. Events too close to address independently are grouped by rendered pixel distance; the cluster opens a keyboard-accessible list where each event seeks to its exact timestamp. Only the newest event is announced, rather than marking the entire feed as live.

Unknown data is shown as unavailable, never inferred as a leader or zero value. Pre-session events may establish the initial race-control state but do not appear as false `00:00` feed entries.
