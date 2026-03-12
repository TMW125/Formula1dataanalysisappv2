# F1 Analytics - Design System Documentation

## Overview
A professional Formula 1 data analysis platform featuring a dark motorsport theme inspired by F1 broadcast graphics, with emphasis on data visualization and telemetry analysis.

## Color Palette

### Primary Colors
- **F1 Red**: `#E10600` - Primary brand color, used for CTAs and important highlights
- **Background**: `#0a0a0f` - Deep dark background with subtle carbon fiber texture
- **Card Background**: `#15151c` - Elevated surface for content cards
- **Secondary**: `#1a1a24` - Input fields and secondary surfaces

### Team Colors (from mockData.ts)
- **Red Bull Racing**: `#3671C6`
- **Mercedes**: `#27F4D2`
- **Ferrari**: `#E8002D`
- **McLaren**: `#FF8000`
- **Aston Martin**: `#229971`

### Chart Colors
- Chart 1: `#E10600` (F1 Red)
- Chart 2: `#0090ff` (Cyan Blue)
- Chart 3: `#00D2BE` (Teal)
- Chart 4: `#ff8800` (Orange)
- Chart 5: `#ff0050` (Pink)

## Typography

### Fonts
- **Headings**: Rajdhani (Google Fonts) - Bold, condensed motorsport aesthetic
- **Body**: Inter (Google Fonts) - Clean, readable sans-serif

### Font Weights
- Normal: 400
- Medium: 500-600
- Bold: 700

## Components

### Reusable Chart Components

#### TelemetryChart
Location: `/src/app/components/charts/TelemetryChart.tsx`
- Multi-line chart for telemetry data visualization
- Configurable data keys, colors, and labels
- Used for speed, throttle, brake, gear, and RPM data

#### LapTimeChart
Location: `/src/app/components/charts/LapTimeChart.tsx`
- Line chart for lap time comparison
- Shows multiple drivers over race distance
- Supports stint visualization

### UI Components

#### DriverCard
Location: `/src/app/components/DriverCard.tsx`
- Displays driver information with team colors
- Shows driver number, name, team, and abbreviation
- Hover effects for interactivity

#### LeaderboardTable
Location: `/src/app/components/LeaderboardTable.tsx`
- Sortable table showing driver positions
- Highlights top 3 positions with medals
- Shows lap times and gaps with monospace font

#### SessionInfoPanel
Location: `/src/app/components/SessionInfoPanel.tsx`
- Displays current session information
- Track name, weather, status, remaining time
- Icon-based information cards

#### TrackMap
Location: `/src/app/components/TrackMap.tsx`
- SVG-based track visualization
- Real-time driver positions
- Start/finish line indicator

#### StatsCard
Location: `/src/app/components/StatsCard.tsx`
- Reusable stats display component
- Icon support with custom colors
- Optional trend indicators

## Pages

### 1. Dashboard (`/`)
**Purpose**: High-level race weekend overview

**Components**:
- Session selector (top bar)
- Track map with driver positions
- Session information panel
- Driver leaderboard table
- Lap time comparison chart

### 2. Driver Analysis (`/driver-analysis`)
**Purpose**: Detailed telemetry and performance analysis

**Components**:
- Driver selector dropdown
- Lap selector
- Driver info card
- Sector times breakdown
- Telemetry charts (Speed, Throttle, Brake, Gear, RPM)
- Tire compound history

### 3. Driver Comparison (`/driver-comparison`)
**Purpose**: Side-by-side driver comparison

**Components**:
- Dual driver selectors
- Delta time graph
- Speed comparison overlay
- Throttle comparison
- Corner-by-corner analysis

### 4. Race Strategy (`/race-strategy`)
**Purpose**: Race pace and tire strategy analysis

**Components**:
- Key metrics cards
- Stint timeline visualization
- Lap times scatter plot
- Average pace by stint chart
- Pit stop summary table

### 5. Data Explorer (`/data-explorer`)
**Purpose**: Raw data access and export

**Components**:
- API endpoint selector
- Filter controls (driver, session, lap)
- Table/JSON view toggle
- CSV export functionality
- API documentation panel

## Layout Structure

### MainLayout
Location: `/src/app/layouts/MainLayout.tsx`

**Sidebar Navigation** (left):
- Logo and branding
- Navigation links with active states
- Version information

**Top Bar**:
- Session selector
- Race weekend selector
- Driver search

**Main Content Area**:
- Responsive page container
- Scroll support for large datasets

## Design Patterns

### Interactive Elements
- Hover states on all clickable elements
- Focus rings with F1 red color
- Smooth transitions (200-300ms)
- Active state indicators

### Data Visualization
- Dark backgrounds for charts
- Team colors for driver identification
- Monospace fonts for timing data
- Clear axis labels and legends

### Spacing
- Page padding: 24px (1.5rem)
- Card padding: 24px
- Grid gaps: 24px
- Component spacing: 16-24px

### Border Radius
- Cards: 6px (0.375rem)
- Buttons: 8px (0.5rem)
- Small elements: 4px

## Responsive Behavior

### Breakpoints
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

### Grid Layouts
- 1 column on mobile
- 2-3 columns on tablet
- 3-4 columns on desktop

## Data Integration

### Mock Data Structure
Location: `/src/app/data/mockData.ts`

**Data Types**:
- Driver information
- Lap times and leaderboard
- Session information
- Telemetry points
- Sector times
- Tire stints

**OpenF1 API Endpoints** (for production):
- `/sessions` - Session data
- `/drivers` - Driver information
- `/laps` - Lap time data
- `/telemetry` - Car telemetry
- `/car_data` - Car sensor data
- `/positions` - Track position data

## Accessibility

- Semantic HTML elements
- ARIA labels on interactive elements
- Keyboard navigation support
- High contrast ratios (WCAG AA compliant)
- Focus visible states

## Performance Considerations

- Lazy loading for large datasets
- Optimized SVG rendering
- Memoized chart components
- Efficient data filtering
- Virtualized tables (recommended for production)

## Future Enhancements

1. Real-time data updates via WebSocket
2. User preferences and saved views
3. Advanced filtering and sorting
4. Team comparison mode
5. Historical data analysis
6. Mobile-optimized layouts
7. Dark/light theme toggle (currently dark-only)
8. Custom dashboard widgets
9. Data annotations and notes
10. Export to PDF/PNG functionality
