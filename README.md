# SunScope Pro

**Open-Access Browser-Based Sunlight, Heat & Comfort Analysis Tool**

SunScope Pro is a free, browser-based web application that enables users to analyze sunlight exposure, shadow patterns, and thermal comfort for buildings. Simply upload a site plan image, define building footprints, and receive comprehensive 3D visualization with shadow simulation and actionable insights.

---

## Key Features

- **No Login Required** - Zero barrier to entry, completely free to use
- **Client-Side Processing** - All data stays in your browser, nothing is uploaded to servers
- **Image-Assisted Building Definition** - Upload site plans and trace building footprints
- **Real-Time 3D Shadow Simulation** - Interactive Three.js visualization with sun movement
- **Floor-Level Analysis** - Analyze specific floors for sunlight exposure
- **Time-Lapse Animation** - Watch shadows move throughout the day
- **Scenario Comparison** - Compare different glazing types and shading options
- **Seasonal Analysis** - Compare sunlight patterns across different seasons
- **Multiple Export Formats** - PDF reports, CSV data, PNG snapshots, GIF animations, JSON data

---

## Screenshots

| Upload Site Plan                 | 3D Viewer                     | Analysis Results               |
| -------------------------------- | ----------------------------- | ------------------------------ |
| Upload and auto-detect buildings | Interactive shadow simulation | Comprehensive sunlight metrics |

---

## Tech Stack

| Category         | Technology               |
| ---------------- | ------------------------ |
| Framework        | React 19 + TypeScript    |
| 3D Engine        | Three.js                 |
| Sun Calculations | SunCalc                  |
| State Management | Zustand                  |
| Styling          | Tailwind CSS             |
| Build Tool       | Vite                     |
| Testing          | Vitest + Testing Library |
| PDF Export       | jsPDF                    |
| GIF Export       | gif.js                   |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/SunScope-Pro-Sunlight-Comfort-Analysis.git

# Navigate to the app directory
cd SunScope-Pro-Sunlight-Comfort-Analysis/app

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`

### Build for Production

```bash
cd app
npm run build
```

The production build will be in the `app/dist` directory.

---

## Application Workflow

SunScope Pro follows a 6-step wizard flow:

### 1. Upload

Upload your site plan image (PNG, JPG, or PDF). The tool accepts floor plans, site layouts, or aerial views.

### 2. Setup

Configure site parameters:

- Set geographic location (latitude/longitude)
- Define north orientation
- Calibrate scale (meters per pixel)

### 3. Validate

Review auto-detected buildings, amenities, compass orientation, and scale markers. Confirm or adjust detections.

### 4. Editor

Define building footprints using the canvas-based massing editor:

- Draw polygon footprints
- Set floor counts and heights
- Name and color-code buildings
- Import/export building data

### 5. 3D Viewer

Explore the interactive 3D visualization:

- Real-time shadow rendering
- Time-of-day scrubber with playback
- Date selection for seasonal analysis
- Floor transparency controls
- Distance measurement tool
- Camera orbit and zoom

### 6. Results

View comprehensive analysis results:

- Sunlight hours and timing
- Solar irradiance data
- Thermal comfort indicators
- Actionable recommendations
- Seasonal and scenario comparisons
- Export reports in multiple formats

---

## Project Structure

```
SunScope-Pro-Sunlight-Comfort-Analysis/
├── app/                          # Main application
│   ├── src/
│   │   ├── components/           # React components
│   │   │   ├── common/           # Shared UI components
│   │   │   ├── editor/           # Canvas-based massing editor
│   │   │   ├── layout/           # Header, navigation, step indicator
│   │   │   ├── results/          # Analysis results and comparisons
│   │   │   ├── setup/            # Site configuration
│   │   │   ├── upload/           # Image upload and detection preview
│   │   │   └── viewer/           # 3D Three.js visualization
│   │   ├── modules/              # Core business logic
│   │   │   ├── analysis/         # AnalysisEngine, ShadowCalculator
│   │   │   ├── export/           # PDF, CSV, JSON, PNG, GIF export
│   │   │   └── image/            # Image analysis and detection
│   │   ├── store/                # Zustand state management
│   │   ├── types/                # TypeScript type definitions
│   │   ├── hooks/                # Custom React hooks
│   │   ├── utils/                # Utility functions
│   │   └── workers/              # Web workers for heavy computation
│   ├── public/                   # Static assets
│   └── package.json
├── docs/                         # Documentation and screenshots
├── Planed Files/                 # Design documents and specifications
│   ├── 01_Research_Report.md
│   ├── 02_UX_Product_Design.md
│   ├── 03_System_Architecture.md
│   ├── 04_Assumptions_Limitations.md
│   ├── 05_Insight_Logic_Specification.md
│   └── 06_Acceptance_Criteria_QA.md
├── CLAUDE.md                     # AI assistant instructions
├── LICENSE                       # MIT License
└── README.md                     # This file
```

---

## Development Commands

All commands should be run from the `app/` directory:

| Command                 | Description                         |
| ----------------------- | ----------------------------------- |
| `npm run dev`           | Start development server with HMR   |
| `npm run build`         | Type-check and build for production |
| `npm run lint`          | Run ESLint                          |
| `npm run test`          | Run tests in watch mode             |
| `npm run test:run`      | Single test run                     |
| `npm run test:coverage` | Generate test coverage report       |
| `npm run preview`       | Preview production build            |

---

## Core Modules

### Analysis Engine

Located in `src/modules/analysis/AnalysisEngine.ts`

Calculates sunlight exposure metrics using SunCalc library:

- Sun position (altitude, azimuth) for any date/time/location
- Direct sunlight hours
- Solar irradiance calculations
- Comfort score estimation

### Shadow Calculator

Located in `src/modules/analysis/ShadowCalculator.ts`

Computes shadow geometry from building heights:

- Shadow projection based on sun angle
- Shadow overlap detection
- Shadow coverage percentage

### Export Service

Located in `src/modules/export/`

Supports multiple export formats:

- **PDF** - Full analysis report with 3D snapshot
- **CSV** - Hourly data for spreadsheet analysis
- **JSON** - Structured data export
- **PNG** - 3D view snapshot
- **GIF** - Animated sun movement time-lapse

---

## Key Type Definitions

```typescript
// Building definition
interface Building {
  id: string;
  name: string;
  footprint: Point2D[];
  floors: number;
  floorHeight: number;
  totalHeight: number;
  color: string;
}

// Analysis results
interface AnalysisResults {
  sunlight: SunlightResults;
  solar: SolarResults;
  comfort: ComfortResults;
  hourlyData: HourlyDataPoint[];
}

// Scenario for comparison
interface Scenario {
  window: WindowConfig;
  glazing: GlazingConfig;
  shading: ShadingConfig;
}
```

---

## Privacy & Security

- **100% Client-Side** - All processing happens in your browser
- **No Server Storage** - Your data never leaves your device
- **No Login Required** - Complete anonymity
- **No Tracking** - No analytics that transmit user data
- **LocalStorage Persistence** - Projects saved locally for convenience

---

## Use Cases

- **Home Buyers** - Evaluate apartment sunlight before purchasing
- **Architects** - Early-stage design analysis and client presentations
- **Urban Planners** - Assess shadow impact of new developments
- **Real Estate Professionals** - Generate sunlight reports for properties
- **Students** - Learn about solar geometry and building orientation
- **General Public** - Understand sunlight patterns in living spaces

---

## Limitations & Disclaimers

This tool provides **conceptual insights** based on:

- Simplified 3D massing (extruded footprints)
- Clear-sky solar assumptions
- Standard floor heights

**Results are intended for:**

- Early-stage decision-making
- Comparative analysis
- Educational exploration

**Not suitable for:**

- Detailed engineering calculations
- HVAC sizing
- Building code compliance verification
- Energy simulation

---

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```
MIT License
Copyright (c) 2026 LEKKALA GANESH
```

---

## Acknowledgments

- [Three.js](https://threejs.org/) - 3D graphics library
- [SunCalc](https://github.com/mourner/suncalc) - Sun position calculations
- [jsPDF](https://github.com/parallax/jsPDF) - PDF generation
- [gif.js](https://jnordberg.github.io/gif.js/) - GIF animation creation

---

## Contact

For questions, suggestions, or feedback, please open an issue on GitHub.

---

_Built with React, Three.js, and SunCalc_
