# F1 Analytics Platform - Application Overview

## 🏎️ Introduction
A professional Formula 1 data analysis web application built with React, TypeScript, and Tailwind CSS. Features a dark motorsport theme inspired by F1 broadcast graphics with comprehensive telemetry visualization and race strategy analysis.

## 📁 Project Structure

```
/src/app/
├── App.tsx                     # Main application entry with React Router
├── routes.tsx                  # Route configuration
├── layouts/
│   └── MainLayout.tsx         # Main layout with sidebar controls
├── pages/
│   ├── Dashboard.tsx          # Race weekend overview
│   ├── PracticeAnalysis.tsx   # Per-session practice performance
│   ├── QualifyingAnalysis.tsx # Qualifying and sprint qualifying analysis
│   ├── RaceStrategy.tsx       # Race pace and tire strategy
│   └── LiveReplay.tsx         # Completed race/sprint replay
├── components/
│   ├── charts/
│   │   ├── TelemetryChart.tsx # Reusable telemetry visualization
│   │   └── LapTimeChart.tsx   # Lap time comparison chart
│   ├── DriverCard.tsx         # Driver information card
│   ├── LeaderboardTable.tsx   # Race position table
│   ├── SessionInfoPanel.tsx   # Session information display
│   ├── StatsCard.tsx          # Statistics card component
│   ├── TrackMap.tsx           # SVG track visualization
│   ├── LoadingSpinner.tsx     # Loading state component
│   └── index.ts               # Component exports
└── data/
    └── mockData.ts            # Mock F1 data for demonstration

/src/styles/
├── theme.css                  # F1 dark theme with custom colors
└── fonts.css                  # Rajdhani and Inter font imports
```

## 🎨 Design System

### Color Palette
- **Primary (F1 Red)**: `#E10600`
- **Background**: `#0a0a0f` with carbon fiber texture
- **Cards**: `#15151c`
- **Borders**: `#2a2a36`

### Typography
- **Headings**: Rajdhani (bold, condensed motorsport font)
- **Body**: Inter (clean, readable)

### Team Colors
- Red Bull Racing: `#3671C6`
- Mercedes: `#27F4D2`
- Ferrari: `#E8002D`
- McLaren: `#FF8000`
- Aston Martin: `#229971`

## 📊 Features by Page

### 1. Dashboard (`/`)
- **Overview**: High-level race weekend summary
- **Leaderboard**: Existing leaderboard sourced from the latest completed session
- **Components**:
  - Latest completed session context
  - 4 stats cards for the latest completed session
  - Interactive track map with driver positions
  - Full driver leaderboard from the latest completed session

### 2. Practice (`/practice`)
- **Purpose**: Select drivers for the latest completed practice session
- **Features**:
  - Race-style Drivers card
  - Scheduled/in-progress messaging for unavailable sessions

### 3. Qualifying (`/qualifying`)
- **Purpose**: Compare selected drivers’ fastest valid Qualifying or Sprint Qualifying laps
- **Features**:
  - Race-style Drivers card
  - Qualifying/Sprint Qualifying toggle on sprint weekends
  - Speed, throttle, brake, gear, and RPM telemetry charts aligned by lap distance
  - Running delta to the fastest selected lap with synchronized hover tooltips

### 4. Race (`/race`)
- **Purpose**: Analyze race pace and pit strategy
- **Features**:
  - Key metrics cards (laps, avg pit stop, fastest lap)
  - Visual stint timeline for multiple drivers
  - Lap times scatter plot across race
  - Average pace by stint bar chart
  - Pit stop summary table

### 5. Live Replay (`/live-replay`)
- **Purpose**: Replay completed Race or Sprint sessions
- **Features**:
  - Track replay and classification
  - Replay controls and event feed
  - Independent Race/Sprint toggle on sprint weekends

## 🎯 Key Components

### Chart Components
- **TelemetryChart**: Flexible multi-line chart for telemetry data
- **LapTimeChart**: Specialized lap time comparison visualization

### UI Components
- **DriverCard**: Displays driver info with team branding
- **LeaderboardTable**: Position-based table with highlighting
- **SessionInfoPanel**: Icon-based session information
- **TrackMap**: SVG track visualization with live positions
- **StatsCard**: Reusable metric display with trends

## 🔌 Data Integration

### Mock Data Structure
The application uses comprehensive mock data including:
- 10 drivers with team information
- Lap times and leaderboard positions
- 100-point telemetry datasets
- Sector timing data
- Tire stint information
- Session metadata

### OpenF1 API Ready
Designed to integrate with OpenF1 API endpoints:
- `/sessions` - Session data
- `/drivers` - Driver information
- `/laps` - Lap timing
- `/telemetry` - Car telemetry
- `/car_data` - Sensor data
- `/positions` - Track positions

## 🚀 Navigation

### Sidebar Navigation
- Dashboard
- Practice
- Qualifying
- Race
- Live Replay

### Sidebar Data Selection
- Year selector
- Race weekend selector
- No manual session selector; pages resolve their own session automatically

## 📱 Responsive Design

- **Desktop**: Full multi-column layouts
- **Tablet**: 2-3 column grids
- **Mobile**: Single column stacked layout

## 🎨 Visual Design

### Motorsport Aesthetic
- Carbon fiber-inspired background texture
- F1 broadcast graphics influence
- Team color-coded elements
- Monospace fonts for timing data
- Premium dark theme

### Interactive Elements
- Hover states on all clickable items
- Smooth transitions (200-300ms)
- Focus rings with F1 red
- Active navigation indicators
- Responsive chart tooltips

## 🔧 Technical Stack

- **Framework**: React 18.3 with TypeScript
- **Routing**: React Router v7 (Data mode)
- **Styling**: Tailwind CSS v4
- **Charts**: Recharts
- **Icons**: Lucide React
- **Fonts**: Google Fonts (Rajdhani, Inter)

## 📈 Performance Features

- Lazy loading ready
- Optimized SVG rendering
- Efficient data filtering
- Memoization opportunities
- Component-based architecture

## 🎓 Learning Resources

See `/DESIGN_SYSTEM.md` for comprehensive design system documentation including:
- Complete color palette
- Typography guidelines
- Component API documentation
- Layout patterns
- Accessibility standards
- Future enhancement roadmap

## 🎉 Ready to Use

The application is fully functional with:
- ✅ Complete navigation system
- ✅ Session-focused analysis pages implemented
- ✅ Reusable component library
- ✅ Professional F1 design theme
- ✅ Mock data for demonstration
- ✅ Responsive layouts
- ✅ Export functionality
- ✅ Interactive data visualizations

Start exploring Formula 1 data with a professional-grade analytics platform!
