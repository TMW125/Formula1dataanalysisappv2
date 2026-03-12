Design a modern Formula 1 data retrieval and analysis web app UI that uses the OpenF1 API (https://openf1.org
) to visualize race telemetry and session data.

The app is aimed at motorsport enthusiasts and data analysts who want to explore F1 telemetry, lap data, and driver performance.

Use a dark theme inspired by F1 broadcast graphics with red accents, sleek typography, and a technical motorsport aesthetic.

Main Screens
1. Dashboard

A high-level overview of the current race weekend.

Components:

Session selector (Practice 1, Practice 2, Practice 3, Qualifying, Race)

Driver leaderboard with:

Position

Driver name

Team

Best lap time

Gap to leader

Mini lap-time chart showing top 10 drivers

Track map with live driver positions

Session info panel:

Track name

Weather

Session status

Remaining time

2. Driver Analysis Page

Detailed telemetry and performance analysis for a selected driver.

Components:

Driver selector dropdown

Lap selector

Telemetry charts:

Speed vs distance

Throttle %

Brake %

Gear

RPM

Sector times breakdown

Tire compound and stint history

Comparison toggle to compare another driver

3. Driver Comparison Page

Compare two drivers across a lap.

Components:

Driver A selector

Driver B selector

Lap selector

Overlay telemetry charts:

Speed comparison

Throttle comparison

Delta time graph across the lap

Corner-by-corner gain/loss visualization

Track map with highlighted faster segments

4. Race Strategy Page

Analyze race pace and tire strategy.

Components:

Stint timeline visualization

Tire compound usage

Lap times per stint

Pit stop markers

Average pace comparison chart

5. Raw Data Explorer

For advanced users.

Components:

Endpoint selector (laps, telemetry, drivers, sessions)

Filters:

Driver

Session

Lap

JSON/table data viewer

Export to CSV button

Navigation

Left sidebar navigation:

Dashboard

Driver Analysis

Driver Comparison

Race Strategy

Data Explorer

Top bar:

Session selector

Race weekend selector

Search driver

Visual Style

Dark motorsport theme

Carbon-fiber inspired backgrounds

Accent color: F1 red

Use modern data visualization charts

Clean telemetry graphs similar to F1 TV graphics

Typography:

Bold condensed headings

Clean sans-serif body text

Data Integration Notes

Design components assuming data will come from the OpenF1 API endpoints such as:

/sessions

/drivers

/laps

/telemetry

/car_data

/positions

Design reusable components for charts and telemetry panels.