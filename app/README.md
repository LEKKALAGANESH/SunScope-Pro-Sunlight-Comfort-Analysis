# SunScope Pro - Application

This is the main application directory for SunScope Pro.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR at `localhost:5173` |
| `npm run build` | Type-check with TypeScript, then build with Vite |
| `npm run lint` | Run ESLint for code quality |
| `npm run preview` | Preview production build locally |
| `npm run test` | Run Vitest in watch mode |
| `npm run test:run` | Single test run |
| `npm run test:coverage` | Generate coverage report |

## Directory Structure

```
src/
├── components/          # React UI components by feature
│   ├── common/          # Toast, ErrorBoundary, Modals
│   ├── editor/          # Canvas-based building editor
│   ├── layout/          # Header, StepIndicator
│   ├── results/         # Analysis results display
│   ├── setup/           # Site configuration
│   ├── upload/          # Image upload, detection preview
│   └── viewer/          # Three.js 3D scene
├── modules/             # Core business logic (no React)
│   ├── analysis/        # AnalysisEngine, ShadowCalculator
│   ├── export/          # PDF, CSV, JSON, PNG, GIF exports
│   └── image/           # Image analysis/detection
├── store/               # Zustand state (projectStore.ts)
├── types/               # TypeScript definitions
├── hooks/               # Custom React hooks
├── utils/               # Utility functions
└── workers/             # Web Workers for heavy tasks
```

## Tech Stack

- **React 19** + TypeScript
- **Three.js** for 3D visualization
- **SunCalc** for sun position calculations
- **Zustand** for state management
- **Tailwind CSS** for styling
- **Vite** for build tooling
- **Vitest** for testing

## Testing

```bash
# Run tests in watch mode
npm run test

# Run tests once
npm run test:run

# Generate coverage report
npm run test:coverage
```

## Building

```bash
# Production build
npm run build

# Output will be in dist/
```

The build process:
1. Type-checks with TypeScript
2. Bundles with Vite
3. Outputs to `dist/` directory

## Environment

No environment variables required - all processing is client-side.
