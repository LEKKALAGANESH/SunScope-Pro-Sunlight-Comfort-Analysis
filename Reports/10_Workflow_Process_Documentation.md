# Workflow Process Documentation

## SunScope Pro - Application Flow & Process Guide

**Document Date:** January 2026
**Version:** 1.0

---

## 1. Application Overview

SunScope Pro is a browser-based sunlight analysis tool that guides users through a 6-step wizard to analyze building sunlight exposure. All processing occurs client-side with no server storage requirements.

---

## 2. User Workflow Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           USER WORKFLOW                                       │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  STEP 1: UPLOAD                                                              │
│  ─────────────────                                                           │
│  • User drags/drops or selects site plan image                               │
│  • Supported formats: PNG, JPG, JPEG                                         │
│  • Image stored as Base64 dataUrl in state                                   │
│  • Validation: file type, size limits                                        │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  STEP 2: SETUP                                                               │
│  ─────────────────                                                           │
│  • Configure site location (latitude/longitude/timezone)                     │
│  • Set scale (meters per pixel)                                              │
│  • Define north orientation angle                                            │
│  • Select analysis date                                                      │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  STEP 3: VALIDATE                                                            │
│  ─────────────────                                                           │
│  • Auto-detection preview (optional)                                         │
│  • ImageAnalyzer processes uploaded image                                    │
│  • Detects: buildings, amenities, compass, scale markers                     │
│  • User confirms or adjusts detection results                                │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  STEP 4: EDITOR                                                              │
│  ─────────────────                                                           │
│  • Canvas-based massing editor                                               │
│  • Draw/edit building footprints                                             │
│  • Set floor count and height per building                                   │
│  • Name and color-code buildings                                             │
│  • Tools: select, draw polygon, edit vertices                                │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  STEP 5: VIEWER                                                              │
│  ─────────────────                                                           │
│  • Interactive 3D Three.js scene                                             │
│  • Real-time shadow simulation                                               │
│  • Sun path visualization                                                    │
│  • Time controls (slider, animation)                                         │
│  • Camera controls (orbit, pan, zoom)                                        │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  STEP 6: RESULTS                                                             │
│  ─────────────────                                                           │
│  • Analysis results display                                                  │
│  • Sunlight hours, comfort scores                                            │
│  • Seasonal comparisons                                                      │
│  • Scenario comparisons                                                      │
│  • Export: PDF, CSV, JSON, PNG, GIF                                          │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Flow Architecture

### 3.1 State Management Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ZUSTAND STORE (projectStore.ts)                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐ │
│  │  currentStep │   │  imageData   │   │  siteConfig  │   │  buildings   │ │
│  │  (1-6)       │   │  (dataUrl)   │   │  (location)  │   │  (array)     │ │
│  └──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘ │
│                                                                              │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐ │
│  │  currentTime │   │  displaySett │   │  scenarios   │   │  analysis    │ │
│  │  (Date)      │   │  (3D opts)   │   │  (configs)   │   │  (results)   │ │
│  └──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PERSISTENCE LAYER                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  • localStorage key: 'sunscope-project'                                     │
│  • Large dataUrls excluded to avoid quota errors                            │
│  • Auto-save on state changes                                               │
│  • Hydration on app load                                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Component Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         COMPONENT HIERARCHY                                  │
└─────────────────────────────────────────────────────────────────────────────┘

App.tsx
    │
    ├── UploadPage.tsx
    │       │
    │       └── DropZone.tsx ──────────────────► imageData (store)
    │
    ├── SiteSetup.tsx
    │       │
    │       ├── LocationPicker.tsx ───────────► siteConfig.location (store)
    │       ├── ScaleInput.tsx ───────────────► siteConfig.scale (store)
    │       └── NorthAngle.tsx ───────────────► siteConfig.northAngle (store)
    │
    ├── ValidatePage.tsx
    │       │
    │       └── ImageAnalyzer.ts ─────────────► detectedBuildings (store)
    │
    ├── EditorPage.tsx
    │       │
    │       ├── EditorCanvas.tsx ─────────────► buildings[] (store)
    │       ├── EditorToolbar.tsx ────────────► selectedTool (local)
    │       └── BuildingList.tsx ─────────────► selectedBuilding (store)
    │
    ├── ViewerPage.tsx
    │       │
    │       ├── Scene3D.tsx ──────────────────► 3D render (Three.js)
    │       │       │
    │       │       ├── buildingMesh.ts ──────► Building geometry
    │       │       ├── cameraController.ts ──► Camera state
    │       │       └── environmentLighting.ts► Sun/shadow
    │       │
    │       └── TimeControls.tsx ─────────────► currentTime (store)
    │
    └── ResultsPage.tsx
            │
            ├── AnalysisEngine.ts ────────────► analysisResults (store)
            ├── SeasonalComparison.tsx ───────► comparison charts
            └── ExportPanel.tsx ──────────────► file downloads
```

---

## 4. Step-by-Step Process Details

### 4.1 Step 1: Upload Process

**Entry Point:** `app/src/components/upload/UploadPage.tsx`

**Process Flow:**
1. User selects or drops image file
2. File validation (type, size)
3. Convert to Base64 dataUrl
4. Store in Zustand state
5. Navigate to Setup step

**Key Files:**
| File | Purpose |
|------|---------|
| `UploadPage.tsx` | Main upload UI container |
| `DropZone.tsx` | Drag-and-drop file handling |
| `projectStore.ts` | State storage |

**Validation Rules:**
- File types: `.png`, `.jpg`, `.jpeg`
- Maximum file size: 10MB
- Minimum dimensions: 200x200 pixels

---

### 4.2 Step 2: Site Setup Process

**Entry Point:** `app/src/components/setup/SiteSetup.tsx`

**Process Flow:**
1. User enters location (search or coordinates)
2. System resolves timezone from coordinates
3. User sets scale (meters per pixel)
4. User adjusts north orientation
5. User selects analysis date
6. Navigate to Validate step

**Key Configuration:**
| Setting | Default | Range |
|---------|---------|-------|
| Latitude | User location | -90 to 90 |
| Longitude | User location | -180 to 180 |
| Scale | 1.0 | 0.1 to 100 m/px |
| North Angle | 0 | 0 to 360 degrees |
| Analysis Date | Today | Any date |

---

### 4.3 Step 3: Validate Process

**Entry Point:** `app/src/components/validate/ValidatePage.tsx`

**Process Flow:**
1. ImageAnalyzer processes uploaded image
2. Auto-detect building footprints
3. Auto-detect amenities (trees, parking, etc.)
4. Auto-detect compass direction
5. Auto-detect scale markers
6. Display detection results overlay
7. User confirms or adjusts detections
8. Navigate to Editor step

**Detection Pipeline:**
```
Image ──► Canvas ──► Edge Detection ──► Shape Recognition ──► Classification
                                              │
                                              ▼
                                    DetectedBuilding[]
                                    DetectedAmenity[]
                                    DetectedCompass
                                    DetectedScale
```

---

### 4.4 Step 4: Editor Process

**Entry Point:** `app/src/components/editor/EditorPage.tsx`

**Process Flow:**
1. Load site plan image as background
2. Display detected/existing buildings
3. User draws building footprints
4. User sets building properties (floors, height)
5. User names and colors buildings
6. Footprint validation
7. Navigate to Viewer step

**Editor Tools:**
| Tool | Function |
|------|----------|
| Select | Click to select building |
| Draw Polygon | Click to add vertices |
| Edit Vertices | Drag vertices to modify |
| Delete | Remove selected building |

**Building Properties:**
| Property | Default | Range |
|----------|---------|-------|
| Floors | 1 | 1 to 100 |
| Floor Height | 3.0m | 2.0 to 10.0m |
| Color | Auto-assigned | Any hex color |
| Name | "Building N" | User-defined |

---

### 4.5 Step 5: Viewer Process

**Entry Point:** `app/src/components/viewer/ViewerPage.tsx`

**Process Flow:**
1. Initialize Three.js scene
2. Create building meshes from data
3. Calculate sun position using SunCalc
4. Render shadows from directional light
5. Display sun path visualization
6. User interacts with time controls
7. User manipulates camera view
8. Capture snapshot for export
9. Navigate to Results step

**3D Scene Components:**
```
Scene
  ├── Ambient Light (soft fill)
  ├── Directional Light (sun)
  │       └── Shadow Camera
  ├── Ground Plane
  ├── Buildings Group
  │       └── Building Meshes (per building)
  │               ├── Floor Meshes
  │               └── Floor Labels (CSS2D)
  ├── Sun Path Arc
  ├── Sun Sphere
  └── Camera Controls (Orbit)
```

**Time Control Features:**
| Feature | Description |
|---------|-------------|
| Slider | Drag to change time |
| Play/Pause | Animate sun movement |
| Speed Control | 1x, 2x, 4x animation |
| Jump Buttons | Sunrise, Noon, Sunset |

---

### 4.6 Step 6: Results Process

**Entry Point:** `app/src/components/results/ResultsPage.tsx`

**Process Flow:**
1. AnalysisEngine calculates metrics
2. Display sunlight hours
3. Display comfort scores
4. Display heat exposure data
5. Generate recommendations
6. User compares scenarios
7. User exports results
8. Session complete

**Analysis Metrics:**
| Metric | Description |
|--------|-------------|
| Total Sun Hours | Hours receiving any sunlight |
| Direct Sun Hours | Hours of unobstructed sunlight |
| Peak Irradiance | Maximum W/m² |
| Comfort Score | 0-100 scale |
| Risk Level | Low/Medium/High |

**Export Options:**
| Format | Content |
|--------|---------|
| PDF | Full report with 3D snapshot |
| CSV | Hourly data table |
| JSON | Structured data |
| PNG | 3D view snapshot |
| GIF | Animated sun movement |

---

## 5. Technical Pipeline Details

### 5.1 Coordinate Transformation Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    COORDINATE TRANSFORMATION PIPELINE                        │
└─────────────────────────────────────────────────────────────────────────────┘

Editor Canvas (pixels)
        │
        │  1. Center at origin
        │     subtract image center
        ▼
    Centered Pixels
        │
        │  2. Scale to meters
        │     multiply by (meters/pixel)
        ▼
    Site Meters (2D)
        │
        │  3. Apply north rotation
        │     rotate around origin
        ▼
    World Meters (2D)
        │
        │  4. Transform to 3D
        │     X → X (East)
        │     Y → Z (South)
        │     add Y = height
        ▼
    World 3D Coordinates
```

### 5.2 Sun Position Calculation Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SUN POSITION CALCULATION PIPELINE                         │
└─────────────────────────────────────────────────────────────────────────────┘

Input: Date + Time + Location
              │
              ▼
┌─────────────────────────┐
│     SunCalc Library     │
│  ─────────────────────  │
│  getPosition(date,      │
│              lat, lon)  │
└───────────┬─────────────┘
            │
            ▼
    ┌───────────────┐
    │   altitude    │ ──► Sun angle above horizon (radians)
    │   azimuth     │ ──► Sun direction from south (radians)
    └───────────────┘
            │
            │  Convert to 3D position
            ▼
    ┌───────────────────────────────────────────────┐
    │  sunX = radius * cos(alt) * sin(azimuth)     │
    │  sunY = radius * sin(alt)                     │
    │  sunZ = radius * cos(alt) * cos(azimuth)     │
    └───────────────────────────────────────────────┘
            │
            ▼
    Directional Light Position
            │
            ▼
    Shadow Rendering
```

### 5.3 Analysis Engine Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ANALYSIS ENGINE PIPELINE                                │
└─────────────────────────────────────────────────────────────────────────────┘

Buildings + Site Config + Analysis Settings
                    │
                    ▼
        ┌───────────────────────┐
        │   For each hour       │
        │   (sunrise to sunset) │
        └───────────┬───────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │  Calculate sun pos    │
        │  (SunCalc)           │
        └───────────┬───────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │  Shadow intersection  │
        │  (ShadowCalculator)   │
        └───────────┬───────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │  Calculate irradiance │
        │  (if not in shadow)   │
        └───────────┬───────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │  Aggregate hourly     │
        │  data into results    │
        └───────────────────────┘
                    │
                    ▼
            AnalysisResults
            ├── sunlight hours
            ├── peak irradiance
            ├── comfort score
            └── recommendations
```

---

## 6. Error Handling Workflow

### 6.1 Error Types and Handling

| Error Type | Location | Current Handling | Recommended |
|------------|----------|------------------|-------------|
| File upload failure | UploadPage | Toast notification | Maintained |
| Invalid image | UploadPage | Validation error | Add specific messages |
| WebGL not supported | Scene3D | **None** | Add fallback message |
| Building creation fail | Scene3D | Silent skip | Add user notification |
| Storage quota exceeded | projectStore | Partial save | Add warning |
| Export failure | ExportService | Console error | Add user notification |

### 6.2 Recommended Error Flow

```
Error Occurs
     │
     ▼
┌─────────────────┐
│  Log to console │
│  (dev only)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Categorize     │
│  error type     │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
Recoverable  Fatal
    │         │
    ▼         ▼
Toast      Error
Message    Boundary
    │         │
    ▼         ▼
Continue   Recovery
Operation  Options
```

---

## 7. Performance Workflow

### 7.1 Critical Performance Paths

| Path | Current State | Target | Status |
|------|---------------|--------|--------|
| Initial load | ~2.5s | <2s | Needs optimization |
| 3D scene init | ~1.5s | <1s | Acceptable |
| Shadow update | ~150ms | <100ms | Acceptable |
| Time slider drag | ~80ms | <50ms | Acceptable |
| Heatmap render | ~2000ms | <500ms | **Needs work** |
| PDF export | ~3s | <3s | Acceptable |

### 7.2 Optimization Opportunities

1. **Heatmap Raycasting** - Currently 65k+ raycasts/frame
   - Implement caching when sun position unchanged
   - Use lower resolution for real-time preview

2. **Debug Logging Removal** - Console.log calls in production
   - Remove or conditionally enable

3. **Scene Configuration** - Constants scattered across files
   - Complete centralization to sceneConfig.ts

---

## 8. File Dependencies

### 8.1 Core Module Dependencies

```
projectStore.ts
     │
     ├──► types/index.ts (Building, Project, etc.)
     │
     └──► utils/errors.ts (Error handling)

Scene3D.tsx
     │
     ├──► store/projectStore.ts (State)
     ├──► store/sceneConfig.ts (Configuration)
     ├──► utils/buildingMesh.ts (Geometry)
     ├──► utils/cameraController.ts (Camera)
     ├──► utils/environmentLighting.ts (Lighting)
     ├──► utils/sceneHelpersUtils.ts (Helpers)
     ├──► utils/sunPathUtils.ts (Sun path)
     └──► lib/geometry/validation.ts (Validation)

EditorPage.tsx
     │
     ├──► hooks/useCanvasRenderer.ts (Canvas)
     ├──► hooks/useEditorKeyboard.ts (Keyboard)
     ├──► components/EditorCanvas.tsx
     ├──► components/EditorToolbar.tsx
     └──► utils/* (Shape manipulation)

ResultsPage.tsx
     │
     ├──► modules/analysis/AnalysisEngine.ts
     ├──► modules/export/ExportService.ts
     ├──► components/SeasonalComparison.tsx
     └──► components/ScenarioComparison.tsx
```

---

## 9. State Persistence Workflow

### 9.1 Save Process

```
State Change
     │
     ▼
Zustand Middleware
     │
     ▼
Filter Large Data
(exclude dataUrls > 1MB)
     │
     ▼
Serialize to JSON
     │
     ▼
localStorage.setItem()
     │
     ▼
Quota Check
     │
     ├── Success ──► Complete
     │
     └── QuotaExceeded ──► Partial Save (warning)
```

### 9.2 Load Process

```
App Initialize
     │
     ▼
localStorage.getItem()
     │
     ▼
Parse JSON
     │
     ├── Success ──► Hydrate Store
     │                    │
     │                    ▼
     │              Restore Step
     │
     └── Failure ──► Initialize Empty
                          │
                          ▼
                    Start at Upload
```

---

*Document Version: 1.0*
*Generated: January 2026*
