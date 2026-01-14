# Version 2 Research Report: User & Industry Perspectives

## Target User Segments

Based on industry research, SunScope Pro serves multiple user types:

| User Type | Primary Needs | Key Pain Points |
|-----------|--------------|-----------------|
| **Architects** | Early-stage design validation, daylight optimization, client presentations | Need quick massing studies without complex setups |
| **Urban Planners** | Shadow impact on public spaces, compliance verification, rights-to-light | Need to assess multi-building scenarios |
| **Real Estate Developers** | Maximize floor value, optimize unit pricing, marketing materials | Need floor-by-floor sunlight data |
| **Sustainability Consultants** | LEED/BREEAM compliance, daylight autonomy metrics | Need quantitative reports |
| **Homebuyers/Tenants** | Understand sunlight exposure before purchase | Need simple, intuitive visualization |

---

## Industry Best Practices (From Leading Tools)

### 1. Shadowmap Studio - Current Industry Leader
- Real-time 3D shadow simulation with time scrubbing
- Custom model upload (IFC, OBJ, FBX, GLB)
- Monthly sunlight statistics and irradiance maps
- Shareable projects without software installation
- Interior/exterior view switching

### 2. Aurora Solar / PVcase
- AI-assisted layout suggestions
- LiDAR-based accuracy (±1-2%)
- Interactive sales proposals
- Automated shading analysis

### 3. Cove.tool
- Floor-by-floor massing model subdivision
- Climate-Based Daylight Modelling (CBDM)
- Daylight Autonomy (DA) calculations

---

## Critical UX Findings for Version 2

### Section 1: Validate (Auto-Detection)
**User Expectation**: Imported elements should persist and be traceable throughout the workflow.

**Industry pattern**: Progressive disclosure - show what was detected, let users confirm/edit, then carry forward. Tools like Shadowmap allow toggling between data sources contextually.

**Recommendation**: Add clear visual confirmation of what's imported + "Import & Continue" CTA as specified.

---

### Section 2: Buildings Editor

#### Zoom Controls - Industry Best Practices

**Zoom UI Camera Model** (from Steve Ruiz's research):
```typescript
interface Camera {
  x: number;  // horizontal position
  y: number;  // vertical position
  z: number;  // zoom level (1 = 100%)
}
```

**Coordinate Conversion Formulas**:
- Screen to Canvas: `canvasX = screenX / zoom - cameraX`
- Canvas to Screen: `screenX = (canvasX + cameraX) * zoom`

**Cursor-Centered Zooming** (Critical UX Pattern):
- Zoom should focus on cursor position, not canvas center
- Calculate point before/after zoom, adjust camera to keep point stationary
- Formula: `newCameraPos = oldCameraPos + (pointAfterZoom - pointBeforeZoom)`

**Zoom Level Presets** (from Figma/Photoshop patterns):
| Zoom Level | Use Case |
|------------|----------|
| 2-10% | Full site overview |
| 25-50% | Multi-building context |
| 100% | Standard editing (1:1) |
| 200-400% | Precision edge work |
| 800%+ | Pixel-perfect alignment |

**Zoom Snapping** (from UXPin/Godot research):
- Standardize zoom increments when using scroll wheel
- Common presets: 25%, 33%, 50%, 66%, 100%, 150%, 200%, 300%, 400%
- ALT+SCROLL can lock to nearest 100% increment for precision
- Double-click zoom control = reset to 100%

**Pan Implementation**:
- Divide pan deltas by current zoom for consistent feel
- Formula: `newCameraPos = oldCameraPos - (delta / zoom)`
- Middle mouse button drag = pan (industry standard)
- Spacebar + drag = temporary pan mode

**Keyboard Shortcuts** (CAD Industry Standard):
| Shortcut | Action |
|----------|--------|
| Scroll wheel | Zoom in/out at cursor |
| Ctrl + 0 | Fit to all / Zoom extents |
| Ctrl + 1 | Zoom to 100% |
| Shift + 1 | Fit to selection |
| Middle mouse drag | Pan |
| Spacebar + drag | Temporary pan |

---

#### Precision Editing & Snapping Research

**Zoom-Dependent Snapping Threshold**:
The key insight is that hit-testing thresholds should be calculated in **screen space**, then converted to canvas space:

```typescript
// Screen-space threshold (constant feel regardless of zoom)
const SCREEN_THRESHOLD_PX = 10;  // pixels

// Convert to canvas space for hit testing
const canvasThreshold = SCREEN_THRESHOLD_PX / currentZoom;

// Now use canvasThreshold for distance calculations
```

**APERTURE Variable** (from CAD systems):
- Controls snap sensitivity in pixels (default: 10, range: 1-50)
- Larger values = easier snapping at greater distances
- Should remain constant in screen space regardless of zoom

**Snap Modes** (Priority Order):
1. **Endpoint** - Vertices of existing polygons
2. **Midpoint** - Center of edges
3. **Intersection** - Where edges cross
4. **Perpendicular** - 90° to an edge
5. **Grid** - Background grid intersections
6. **Parallel** - Maintain parallel to existing edge

**Visual Feedback Requirements**:
- Edge highlighting when cursor approaches (within threshold)
- Snap indicator icon showing active snap type
- Different colors for different snap modes
- Cursor change when near snappable element

**Grid Display Based on Zoom**:
| Zoom Range | Grid Visibility |
|------------|-----------------|
| < 50% | Major grid only (10m) |
| 50-100% | Standard grid (1m) |
| 100-400% | Fine grid (0.5m) |
| > 400% | Pixel grid visible |

---

#### Canvas Auto-Pan When Panels Expand

**Problem Statement**:
When both Tools and Buildings panels are expanded, the editor canvas shrinks. The edited building may become hidden or cut off.

**Solution Pattern**:
1. Track the center/bounds of currently selected building
2. When panels expand/collapse, calculate new visible area
3. Smoothly animate camera to keep selection visible
4. Transition duration: 200-300ms (match panel animation)

**Implementation Approach**:
```typescript
// On panel state change
const buildingCenter = getBuildingCenter(selectedBuilding);
const newVisibleBounds = calculateVisibleBounds(panelStates);

if (!isPointInBounds(buildingCenter, newVisibleBounds)) {
  animateCameraTo(buildingCenter, { duration: 300 });
}
```

**Collapsible Panels**:
- Collapsed by default to maximize canvas space
- Smooth expand/collapse animations (CSS transitions)
- Use CSS variables like `--panel-width` for responsive canvas sizing
- Canvas should reflow smoothly, not jump

---

### Section 3: Analyze - Floor Insights
**Industry Standards**:

| Metric | Threshold | Standard |
|--------|-----------|----------|
| Spatial Daylight Autonomy (sDA) | ≥300 lux for 50% of hours | LEED/IES |
| Annual Sunlight Exposure (ASE) | ≤1000 lux for 250+ hours | Glare prevention |
| Daylight Factor (UK) | 2% kitchen, 1.5% living, 1% bedroom | BS 8206-2 |
| EN 17037 (EU) | 300 lux over 50% space for 2190 hours | European standard |

**Per-Floor Popup Content**:
- Floor number
- Direct sunlight hours (daily/seasonal)
- Peak sunlight time windows
- Sunlight autonomy percentage
- Comfort indicator (excellent/good/fair/poor)

**Real Estate Value Impact**:
Annual sunlight exposure and useful daylight illuminance were found to be significant factors affecting real estate prices.

Users expect floor visualization because:
- Higher floors = more natural light = higher value
- South-facing units command premium pricing
- Buyers make multiple visits at different times to check light

---

### Section 4: Sun Path Accuracy
**Technical Requirements**:
- Accurate altitude/azimuth calculations per latitude/longitude
- Seasonal variation: summer solstice (longest), winter solstice (shortest), equinoxes
- Smooth orbital animation along mathematically correct path

**Winter Solstice Rule**:
Many jurisdictions require 2 consecutive hours of direct sunlight on winter solstice for residential buildings.

---

### Section 5: Collapsible Panel UX
**Best Practices**:
- Collapsed by default to simplify interface
- Smooth expand/collapse animations (200-300ms)
- Clear visual affordance (chevron icons)
- Content hidden until needed reduces cognitive load

**3D Canvas Response**:
- Canvas should smoothly expand when panels collapse
- Maintain focus on edited/selected building
- Animation duration should match panel transitions

---

## User Journey Expectations

```
VALIDATE → SETUP → ANALYZE → RESULTS
    │         │         │         │
    ▼         ▼         ▼         ▼
 Confirm   Define    Explore    Export
 imports   masses    insights   reports
```

Each transition should:
1. Confirm what data carries forward
2. Provide clear next-step guidance
3. Allow backward navigation without data loss

---

## Competitive Gaps to Address

| Feature | Shadowmap | Aurora | SunScope v2 Target |
|---------|-----------|--------|-------------------|
| Floor-by-floor insights | No | No | Yes |
| Interactive hover popups | No | No | Yes |
| Building auto-detection | No | Yes | Yes |
| Free-form polygon drawing | Yes | No | Yes |
| Seasonal sun path animation | Yes | No | Yes |

---

## Summary Recommendations

1. **Floor visualization with insights** is a market differentiator - no competitor does this well
2. **Precision editing** needs zoom-aware snapping thresholds and visual edge highlighting
3. **Collapsible panels** should default collapsed with smooth 300ms animations
4. **Sun path** must reflect real-world seasonal variations accurately
5. **Import flow** needs confirmation step showing what transfers to next section

---

## Sources

### Sunlight & Solar Analysis
- Shade Analysis Guide 2025 - https://solartechonline.com/blog/shade-analysis-guide/
- Shadowmap Studio Architects - https://shadowmap.org/solutions/shadowmap-studio/architect
- Shadowmap Studio Urban Planners - https://shadowmap.org/solutions/shadowmap-studio/urban-planner
- WBDG Daylighting Guide - https://www.wbdg.org/resources/daylighting
- Daylight Requirements in Building Codes - https://www.velux.com/what-we-do/research-and-knowledge/deic-basic-book/daylight/daylight-requirements-in-building-codes
- Sunlight Autonomy Research - https://www.tandfonline.com/doi/full/10.1080/15502724.2023.2297967
- Condo Value & Sunlight - https://www.mattrichling.com/blog/understanding-how-condo-location-within-a-building-affects-value-and-livability

### Zoom & Canvas Controls
- Creating a Zoom UI (Steve Ruiz) - https://www.steveruiz.me/posts/zoom-ui
- UXPin Precise Zoom - https://www.uxpin.com/studio/blog/the-strikingly-precise-zoom/
- Godot Zoom Controls Proposal - https://github.com/godotengine/godot-proposals/issues/2658
- Salesforce Zoom Controls - https://www.lightningdesignsystem.com/2e1ef8501/p/3447c3-zoom-controls
- Canvas Panning and Zooming - https://harrisonmilbradt.com/blog/canvas-panning-and-zooming
- MDN devicePixelRatio - https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio

### CAD & Precision Editing
- Blender Snapping Improvements - https://projects.blender.org/blender/blender/issues/73993
- AutoCAD Zoom & Pan Best Practices - https://novedge.com/blogs/design-news/autocad-tip-optimizing-autocad-navigation-mastering-zoom-and-pan-techniques
- GstarCAD Object Snap Sensitivity - https://blog.gstarcad.net/how-to-change-the-object-snap-sensitivity/
- Fusion 360 Pan/Zoom/Orbit Controls - https://www.autodesk.com/products/fusion-360/blog/quick-tip-pan-zoom-orbit-preferences/
- Onshape Rotate Pan Zoom - https://www.onshape.com/en/resource-center/tech-tips/tech-tip-changing-rotate-pan-and-zoom

### UI Components
- Radix UI Collapsible - https://www.radix-ui.com/primitives/docs/components/collapsible
- Map UI Patterns Zoom Control - https://mapuipatterns.com/zoom-control/
