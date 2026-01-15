# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SunScope Pro is an open-access browser-based web tool for analyzing sunlight exposure, heat, and comfort for buildings. Users upload site plan images to receive insights through 3D visualization and shadow simulation. All processing is client-side with no server storage.

## Development Commands

All commands run from the `app/` directory:

```bash
npm run dev          # Start Vite dev server with HMR
npm run build        # Type-check with TypeScript, then build with Vite
npm run lint         # Run ESLint
npm run test         # Run Vitest in watch mode
npm run test:run     # Single test run
npm run test:coverage # Generate coverage report
```

## Architecture

### Application Flow

The app follows a 6-step wizard flow managed by `currentStep` in Zustand store:

1. **upload** - Image upload/drag-drop
2. **validate** - Auto-detection preview (buildings, amenities, compass, scale)
3. **setup** - Site configuration (location, scale, north orientation)
4. **editor** - Manual building footprint annotation on canvas
5. **viewer** - Interactive 3D Three.js scene with sun/shadow simulation
6. **results** - Analysis results, recommendations, and export

### Key Directories

```
app/src/
├── components/          # UI organized by step/feature
│   ├── editor/         # Canvas-based massing editor
│   │   ├── hooks/      # useCanvasRenderer, useEditorKeyboard
│   │   └── utils/      # Shape manipulation utilities
│   ├── viewer/         # Three.js 3D scene
│   │   └── utils/      # buildingMesh creation
│   └── results/        # SeasonalComparison, ScenarioComparison
├── modules/            # Core business logic (no React)
│   ├── analysis/       # AnalysisEngine, ShadowCalculator
│   ├── export/         # PDF, CSV, JSON, PNG, GIF export
│   └── image/          # ImageAnalyzer for auto-detection
├── store/              # Zustand store (projectStore.ts)
└── types/              # TypeScript definitions (index.ts)
```

### State Management

Single Zustand store at `src/store/projectStore.ts` manages:

- **Project data**: buildings array, site config, analysis settings
- **UI state**: currentStep, isLoading, error
- **Detection results**: auto-detected buildings/amenities from image analysis
- **3D viewer**: currentTime (for sun position), displaySettings, viewerSnapshot
- **Scenarios**: window/glazing/shading configurations for comparison

Persistence uses localStorage with key `'sunscope-project'`. Large dataUrls are excluded to avoid quota errors.

### Core Technologies

- **React 19** + **TypeScript** - UI framework
- **Three.js** - 3D visualization and shadow rendering
- **SunCalc** - Astronomical sun position calculations
- **Zustand** - State management with localStorage persistence
- **Tailwind CSS** - Styling
- **Vite** - Build tooling
- **Vitest** - Testing

### Key Type Definitions

Located in `src/types/index.ts`:

- `Building` - Footprint polygon, floors, height, color
- `Project` - Complete project state
- `AnalysisResults` - Sunlight hours, solar irradiance, comfort metrics
- `Scenario` - Window state, glazing type, shading configuration
- `DetectedBuilding/Amenity/Compass/Scale` - Image analysis outputs

### Analysis Pipeline

1. `ImageAnalyzer` processes uploaded image to detect buildings/features
2. User confirms/edits detections in editor with canvas overlay
3. `AnalysisEngine` calculates sun exposure using SunCalc
4. `ShadowCalculator` computes shadow geometry from building heights
5. Results include hourly data, comfort scores, and recommendations

### Export Capabilities

- **PDF** - Full report with 3D snapshot (jsPDF)
- **CSV** - Hourly data for spreadsheet analysis
- **JSON** - Structured data export
- **PNG** - 3D view snapshot (html2canvas)
- **GIF** - Animated sun movement (gif.js)
