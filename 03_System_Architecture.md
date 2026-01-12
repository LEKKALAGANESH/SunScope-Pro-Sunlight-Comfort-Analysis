# System Architecture Document

## Open-Access Site Sunlight & Massing Tool

---

## 1. Technology Stack Recommendation

### Frontend (Client-Side)

| Layer | Technology | Justification |
|-------|------------|---------------|
| **Framework** | React 18+ | Component-based, large ecosystem, excellent TypeScript support, hooks for state management |
| **Language** | TypeScript | Type safety, better IDE support, reduced runtime errors |
| **3D Engine** | Three.js | Industry standard for WebGL, extensive documentation, active community, no dependencies |
| **UI Library** | Tailwind CSS + Headless UI | Utility-first CSS, accessible components, rapid development |
| **State Management** | Zustand | Lightweight, simple API, good TypeScript support, no boilerplate |
| **Sun Calculations** | SunCalc.js | Proven accuracy, lightweight (~4KB), well-documented algorithm |
| **Image Processing** | Canvas API | Native browser support, no dependencies, GPU-accelerated |
| **PDF Generation** | jsPDF + html2canvas | Client-side PDF creation, no server needed |
| **File Export** | FileSaver.js | Cross-browser download handling |
| **Build Tool** | Vite | Fast HMR, optimized builds, excellent DX |

### Backend (Optional - Minimal)

| Component | Technology | Justification |
|-----------|------------|---------------|
| **Static Hosting** | Vercel / Netlify / Cloudflare Pages | Free tier, global CDN, automatic HTTPS |
| **API (if needed)** | Cloudflare Workers / Vercel Edge Functions | Serverless, low latency, minimal cost |

**Note:** The architecture prioritizes client-side processing to maximize privacy and minimize server costs. All calculations run in the browser.

---

## 2. System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT BROWSER                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        REACT APPLICATION                            │    │
│  │                                                                     │    │
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────────────┐   │    │
│  │  │   PAGES /     │  │   SHARED      │  │    GLOBAL STATE       │   │    │
│  │  │   VIEWS       │  │   COMPONENTS  │  │    (Zustand)          │   │    │
│  │  │               │  │               │  │                       │   │    │
│  │  │  - Upload     │  │  - Header     │  │  - project            │   │    │
│  │  │  - Validate   │  │  - Sidebar    │  │  - buildings[]        │   │    │
│  │  │  - Setup      │  │  - Modal      │  │  - selectedArea       │   │    │
│  │  │  - Editor     │  │  - Slider     │  │  - dateTime           │   │    │
│  │  │  - Viewer     │  │  - Button     │  │  - scenarios          │   │    │
│  │  │  - Results    │  │  - Card       │  │  - analysisResults    │   │    │
│  │  │  - Export     │  │  - Tooltip    │  │                       │   │    │
│  │  └───────────────┘  └───────────────┘  └───────────────────────┘   │    │
│  │                                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         CORE MODULES                                │    │
│  │                                                                     │    │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  ┌───────────┐  │    │
│  │  │  IMAGE      │  │   MASSING    │  │   3D       │  │   SUN     │  │    │
│  │  │  PROCESSOR  │  │   ENGINE     │  │   VIEWER   │  │   ENGINE  │  │    │
│  │  │             │  │              │  │            │  │           │  │    │
│  │  │ - validate  │  │ - footprint  │  │ - scene    │  │ - position│  │    │
│  │  │ - resize    │  │ - extrude    │  │ - camera   │  │ - shadows │  │    │
│  │  │ - transform │  │ - floors     │  │ - controls │  │ - animate │  │    │
│  │  │ - overlay   │  │ - select     │  │ - render   │  │ - irrad.  │  │    │
│  │  └─────────────┘  └──────────────┘  └────────────┘  └───────────┘  │    │
│  │                                                                     │    │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  ┌───────────┐  │    │
│  │  │  ANALYSIS   │  │   SCENARIO   │  │  INSIGHT   │  │  EXPORT   │  │    │
│  │  │  ENGINE     │  │   MANAGER    │  │  GENERATOR │  │  SERVICE  │  │    │
│  │  │             │  │              │  │            │  │           │  │    │
│  │  │ - sunHours  │  │ - window     │  │ - comfort  │  │ - PDF     │  │    │
│  │  │ - shadows   │  │ - glazing    │  │ - recommend│  │ - CSV     │  │    │
│  │  │ - exposure  │  │ - shading    │  │ - warnings │  │ - PNG     │  │    │
│  │  │ - heatGain  │  │ - compare    │  │ - seasonal │  │ - GLTF    │  │    │
│  │  └─────────────┘  └──────────────┘  └────────────┘  └───────────┘  │    │
│  │                                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         LIBRARIES                                   │    │
│  │                                                                     │    │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐   │    │
│  │  │Three.js │  │SunCalc  │  │ Canvas  │  │ jsPDF   │  │FileSaver│   │    │
│  │  │         │  │         │  │   API   │  │         │  │         │   │    │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘   │    │
│  │                                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           STATIC HOSTING (CDN)                              │
│                      Vercel / Netlify / Cloudflare Pages                    │
│                                                                             │
│                    HTML / JS / CSS / Assets (no backend)                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Models

### 3.1 Project Model

```typescript
interface Project {
  id: string;                    // UUID
  createdAt: Date;

  // Image data
  image: {
    dataUrl: string;             // Base64 encoded image
    width: number;               // Pixels
    height: number;              // Pixels
    originalName: string;
  };

  // Site configuration
  site: {
    northAngle: number;          // Degrees from image top (0-360)
    scale: number;               // Meters per pixel
    location: {
      latitude: number;          // -90 to 90
      longitude: number;         // -180 to 180
      timezone: string;          // IANA timezone
      city?: string;             // Display name
    };
  };

  // Buildings array
  buildings: Building[];

  // Analysis settings
  analysis: {
    date: Date;
    timeRange: { start: number; end: number };  // Hours (0-24)
    selectedBuildingId?: string;
    selectedFloor?: number;
    selectedArea?: CustomArea;
  };

  // Active scenarios
  scenarios: Scenario[];
}
```

### 3.2 Building Model

```typescript
interface Building {
  id: string;                    // UUID
  name: string;                  // User-defined name

  // Geometry
  footprint: Point2D[];          // Array of [x, y] in meters (site coordinates)
  floors: number;                // Total floor count
  floorHeight: number;           // Meters per floor
  baseElevation: number;         // Meters (usually 0)

  // Computed properties
  totalHeight: number;           // floors * floorHeight
  area: number;                  // Footprint area in m²

  // Optional metadata
  buildingType?: 'residential' | 'commercial' | 'mixed';
  color?: string;                // Hex color for visualization
}

interface Point2D {
  x: number;                     // Meters from origin
  y: number;                     // Meters from origin
}

interface Point3D extends Point2D {
  z: number;                     // Meters (height)
}
```

### 3.3 Analysis Results Model

```typescript
interface AnalysisResults {
  targetId: string;              // Building or area ID
  targetType: 'building' | 'floor' | 'area';
  floor?: number;
  date: Date;

  // Sunlight timing
  sunlight: {
    firstSunTime: Date | null;   // null if never receives sun
    lastSunTime: Date | null;
    totalHours: number;          // Hours of any sunlight
    directHours: number;         // Hours of direct sunlight
    continuousBlocks: TimeBlock[];
  };

  // Solar metrics
  solar: {
    peakIrradiance: number;      // W/m² maximum
    dailyIrradiation: number;    // Wh/m² cumulative
    peakTime: Date;
    exposureMap?: Float32Array;  // Per-sample exposure data
  };

  // Heat and comfort
  comfort: {
    riskLevel: 'low' | 'medium' | 'high';
    score: number;               // 0-100
    peakHeatPeriod: TimeBlock;
    recommendations: string[];
  };

  // Hourly data for charts
  hourlyData: HourlyDataPoint[];
}

interface TimeBlock {
  start: Date;
  end: Date;
  duration: number;              // Minutes
}

interface HourlyDataPoint {
  hour: number;                  // 0-23
  sunAltitude: number;           // Degrees
  sunAzimuth: number;            // Degrees
  inShadow: boolean;
  irradiance: number;            // W/m²
  shadowPercent: number;         // 0-100
}
```

### 3.4 Scenario Model

```typescript
interface Scenario {
  id: string;
  name: string;
  isActive: boolean;

  // Window parameters
  window: {
    state: 'open' | 'closed';
    ventilationFactor: number;   // 0-1
  };

  // Glazing parameters
  glazing: {
    type: 'single' | 'double' | 'triple' | 'low-e';
    uValue: number;              // W/m²K
    solarTransmittance: number;  // SHGC (0-1)
  };

  // Shading parameters
  shading: {
    interior: 'none' | 'blinds' | 'curtains' | 'heavy-curtains';
    exterior: 'none' | 'awning' | 'louvers' | 'trees';
    reductionFactor: number;     // 0-1
  };
}
```

### 3.5 Custom Area Model

```typescript
interface CustomArea {
  id: string;
  buildingId: string;
  floor: number;
  name: string;

  // 2D polygon on floor plane
  polygon: Point2D[];

  // Facade selection (for facade analysis)
  facades?: {
    direction: 'north' | 'south' | 'east' | 'west';
    area: number;                // m²
  }[];
}
```

---

## 4. Component Architecture

### 4.1 Module Responsibilities

| Module | Responsibility | Key Functions |
|--------|----------------|---------------|
| **ImageProcessor** | Handle image upload, validation, transformation | `validate()`, `resize()`, `getDataUrl()`, `createOverlay()` |
| **MassingEngine** | Create and manage building geometry | `createFootprint()`, `extrudeBuilding()`, `updateHeight()`, `calculateArea()` |
| **Viewer3D** | Render 3D scene with Three.js | `initScene()`, `addBuilding()`, `updateShadows()`, `animate()`, `captureImage()` |
| **SunEngine** | Calculate sun positions and lighting | `getSunPosition()`, `getSunTimes()`, `calculateShadows()`, `animateSun()` |
| **AnalysisEngine** | Run sunlight and heat analysis | `analyzeSunHours()`, `calculateExposure()`, `estimateHeatGain()` |
| **ScenarioManager** | Manage scenario configurations | `createScenario()`, `applyScenario()`, `compareScenarios()` |
| **InsightGenerator** | Generate human-readable insights | `generateRecommendations()`, `assessComfort()`, `formatResults()` |
| **ExportService** | Handle all export formats | `toPDF()`, `toCSV()`, `toPNG()`, `toGLTF()` |

### 4.2 File Structure

```
src/
├── components/
│   ├── common/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Modal.tsx
│   │   ├── Slider.tsx
│   │   ├── Tooltip.tsx
│   │   └── index.ts
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Footer.tsx
│   │   └── PageLayout.tsx
│   ├── upload/
│   │   ├── DropZone.tsx
│   │   ├── ImagePreview.tsx
│   │   └── ValidationChecklist.tsx
│   ├── editor/
│   │   ├── DrawingCanvas.tsx
│   │   ├── BuildingList.tsx
│   │   ├── PropertyPanel.tsx
│   │   └── Toolbar.tsx
│   ├── viewer/
│   │   ├── Scene3D.tsx
│   │   ├── Controls3D.tsx
│   │   ├── SunPath.tsx
│   │   └── TimeSlider.tsx
│   ├── results/
│   │   ├── MetricCard.tsx
│   │   ├── RecommendationList.tsx
│   │   ├── ChartPanel.tsx
│   │   └── ScenarioToggle.tsx
│   └── export/
│       ├── ExportModal.tsx
│       └── FormatSelector.tsx
│
├── modules/
│   ├── image/
│   │   ├── ImageProcessor.ts
│   │   ├── validators.ts
│   │   └── transforms.ts
│   ├── massing/
│   │   ├── MassingEngine.ts
│   │   ├── geometry.ts
│   │   └── operations.ts
│   ├── viewer/
│   │   ├── Viewer3D.ts
│   │   ├── materials.ts
│   │   ├── lights.ts
│   │   └── controls.ts
│   ├── sun/
│   │   ├── SunEngine.ts
│   │   ├── calculations.ts
│   │   └── shadows.ts
│   ├── analysis/
│   │   ├── AnalysisEngine.ts
│   │   ├── sunlight.ts
│   │   ├── heat.ts
│   │   └── comfort.ts
│   ├── scenarios/
│   │   ├── ScenarioManager.ts
│   │   └── presets.ts
│   ├── insights/
│   │   ├── InsightGenerator.ts
│   │   └── templates.ts
│   └── export/
│       ├── ExportService.ts
│       ├── pdf.ts
│       ├── csv.ts
│       └── gltf.ts
│
├── store/
│   ├── projectStore.ts
│   ├── uiStore.ts
│   └── index.ts
│
├── hooks/
│   ├── useProject.ts
│   ├── useViewer.ts
│   ├── useSunPosition.ts
│   └── useAnalysis.ts
│
├── utils/
│   ├── geometry.ts
│   ├── time.ts
│   ├── colors.ts
│   └── constants.ts
│
├── types/
│   ├── project.ts
│   ├── building.ts
│   ├── analysis.ts
│   └── index.ts
│
├── pages/
│   ├── HomePage.tsx
│   ├── EditorPage.tsx
│   ├── ViewerPage.tsx
│   └── ResultsPage.tsx
│
├── App.tsx
├── main.tsx
└── index.css
```

---

## 5. Export File Formats

### 5.1 CSV Export Schema

```csv
# Header row
timestamp,sun_altitude,sun_azimuth,in_shadow,irradiance_wm2,shadow_percent

# Data rows (hourly)
2024-06-21T06:00:00,5.2,78.4,false,120,15
2024-06-21T07:00:00,15.8,92.1,false,350,0
...
```

### 5.2 JSON Export Schema

```json
{
  "version": "1.0",
  "exportDate": "2024-06-21T10:30:00Z",
  "project": {
    "location": { "lat": 40.7128, "lon": -74.006 },
    "analysisDate": "2024-06-21",
    "target": { "building": "Building 2", "floor": 4 }
  },
  "results": {
    "sunlight": {
      "firstSun": "06:42",
      "lastSun": "19:18",
      "totalHours": 8.2,
      "directHours": 5.4
    },
    "solar": {
      "peakIrradiance": 890,
      "dailyIrradiation": 4250,
      "peakTime": "12:45"
    },
    "comfort": {
      "riskLevel": "medium",
      "score": 62
    }
  },
  "hourlyData": [ /* ... */ ],
  "recommendations": [ /* ... */ ]
}
```

### 5.3 GLTF Export

Standard glTF 2.0 format with:
- Building meshes as separate nodes
- Material colors preserved
- Floor segmentation as child nodes
- Scene orientation matching site north

---

## 6. Performance Considerations

### 6.1 Performance Budgets

| Metric | Target | Maximum |
|--------|--------|---------|
| Initial load | < 2s | 4s |
| 3D scene init | < 1s | 2s |
| Shadow update | < 100ms | 200ms |
| Analysis run | < 500ms | 1s |
| Export PDF | < 3s | 5s |

### 6.2 Complexity Limits

| Parameter | Recommended | Maximum |
|-----------|-------------|---------|
| Buildings | 10 | 25 |
| Vertices per building | 50 | 200 |
| Total faces | 500 | 2000 |
| Image resolution | 2048x2048 | 4096x4096 |
| Animation FPS | 30 | 60 |

### 6.3 Optimization Strategies

1. **Level of Detail (LOD):** Simplify geometry at distance
2. **Shadow map caching:** Cache shadow maps between frames when sun hasn't moved
3. **Web Workers:** Offload heavy calculations (analysis) to workers
4. **Lazy loading:** Load modules on demand (e.g., export only when needed)
5. **Debounced updates:** Debounce slider interactions to prevent excessive recalculation

---

## 7. Security Considerations

1. **No server storage:** All data stays in browser memory/localStorage
2. **Input validation:** Sanitize all user inputs
3. **CSP headers:** Strict Content Security Policy
4. **No external tracking:** No analytics that transmit user data
5. **HTTPS only:** Force secure connections

---

*Document Version: 1.0*
*Date: January 2026*
