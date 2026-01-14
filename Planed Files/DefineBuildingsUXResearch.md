# Define Buildings Section: UX Research & Recommendations
## For Web-Based Sunlight Analysis Tools

---

## Part 1: Research Insights

### How Industry Tools Handle Building Definition

Based on analysis of leading tools including [Autodesk Forma](https://archilabs.ai/posts/autodesk-forma), [TestFit](https://www.testfit.io/product/urban-planner), [SketchUp](https://sketchup.trimble.com/), and [Modelur](https://modelur.com/), several patterns emerge for building footprint creation and editing:

| Tool | Drawing Method | Floor Input | Multi-Select | Key Strength |
|------|---------------|-------------|--------------|--------------|
| Autodesk Forma | Parameter-driven generation | Preset + custom | Yes with grouping | AI-assisted optimization |
| TestFit | Constraint-based drawing | Slider + numeric | Yes | Rule-based validation |
| SketchUp | Click-to-draw with guides | Push/pull extrusion | Yes with outliner | Immediate visual feedback |
| Modelur | Shape + extrude | Slider + presets | Yes | Zoning compliance warnings |
| ArcGIS CityEngine | Template-based | Rule scripts | Yes | Large-scale editing |

### Common User Frustrations

Research from [CAD Software UX benchmarking](https://lab.interface-design.co.uk/cad-software-ui-design-patterns-benchmarking-97cc7834ad02) and usability studies reveal these pain points:

1. **Imprecise Drawing** — Without snap-to-grid or alignment guides, users create irregular shapes unintentionally
2. **Unclear Selection State** — Users can't tell what's selected, editable, or locked
3. **Destructive Actions Without Recovery** — Accidentally deleting work with no way to restore
4. **Cognitive Overload** — Too many tools with unclear relationships
5. **Disconnect Between 2D and 3D** — Changes in footprint don't immediately reflect in 3D preview
6. **No Graceful Handling of Mistakes** — Users feel punished for exploration

### Patterns That Build User Trust

From [Material Design selection patterns](https://m1.material.io/patterns/selection.html) and [Apple's undo guidelines](https://developer.apple.com/design/human-interface-guidelines/patterns/undo-and-redo/):

- **Immediate Visual Feedback** — Every action should produce visible confirmation
- **Multi-Level Undo** — Users should be able to step back through multiple actions
- **Clear Mode Indicators** — Current tool/mode should be unambiguous
- **Progressive Disclosure** — Show advanced options only when needed
- **Non-Destructive Workflows** — Prefer hiding/disabling over permanent deletion

---

## Part 2: Essential Improvements (Must-Have)

### 2.1 Drawing Experience Enhancements

| Feature | Implementation | User Trust Impact |
|---------|---------------|-------------------|
| **Snap-to-Grid** | 1m or 5m grid overlay, points snap when within threshold | Reduces accidental irregular shapes |
| **Orthogonal Constraint** | Hold Shift to lock to 90° angles | Creates professional-looking footprints |
| **Edge Alignment Guides** | Show alignment lines when near existing buildings | Ensures consistent spacing |
| **Close-Loop Indicator** | Highlight when cursor is near starting point | Clarifies when shape can be completed |
| **Point Count Display** | "4 points (click to complete)" | Shows progress and next action |

**Visual Guides During Drawing:**
```
┌─────────────────────────────────────────────┐
│                                             │
│     ●━━━━━━━━━━━━●                         │
│     │            ┊                         │
│     │      ┌─────┊─────┐ ← Alignment guide │
│     │      │     ┊     │                   │
│     ●━━━━━━┊━━━━━○ ← Cursor with snap     │
│            ┊                               │
│     ┊┊┊┊┊┊┊┊┊┊┊┊┊ ← Grid lines           │
└─────────────────────────────────────────────┘
```

### 2.2 Selection & Multi-Select

| Feature | Implementation | User Trust Impact |
|---------|---------------|-------------------|
| **Click to Select** | Single click selects one building | Familiar interaction |
| **Shift+Click Multi-Select** | Add/remove from selection | Power user capability |
| **Marquee/Box Selection** | Drag rectangle to select multiple | Fast bulk selection |
| **Select All Shortcut** | Ctrl/Cmd+A | Standard expectation |
| **Deselect All** | Click empty area or Escape | Clear exit path |

**Visual Selection States:**
- **Unselected**: Subtle fill (30% opacity)
- **Hovered**: Medium fill (50% opacity) + cursor change
- **Selected**: Strong fill (70% opacity) + white border + handles
- **Multi-Selected**: Matching selection style + grouped indicator

### 2.3 Undo/Redo System

Per [undo/redo best practices](https://developer.apple.com/design/human-interface-guidelines/patterns/undo-and-redo/):

| Action | Undo Behavior | Keyboard Shortcut |
|--------|--------------|-------------------|
| Add point while drawing | Remove last point | Ctrl+Z |
| Complete building | Remove entire building | Ctrl+Z |
| Delete building | Restore building | Ctrl+Z |
| Edit floor count | Revert to previous value | Ctrl+Z |
| Bulk edit | Revert all changes | Ctrl+Z |
| Any undo | Redo the action | Ctrl+Y or Ctrl+Shift+Z |

**Implementation Requirements:**
- Store action history (minimum 20 steps)
- Clear visual undo/redo buttons in toolbar
- Keyboard shortcuts always active
- Toast notification: "Building deleted. Press Ctrl+Z to undo"

### 2.4 Floor Count & Height Input

| Feature | Implementation | User Trust Impact |
|---------|---------------|-------------------|
| **Stepper Buttons** | +/- buttons for quick adjustment | Low-friction changes |
| **Direct Input** | Numeric field for exact values | Professional precision |
| **Visual Slider** | Drag slider for floor count (1-20 range) | Intuitive for exploration |
| **Floor Presets** | "Low-rise (3F)", "Mid-rise (8F)", "High-rise (20F)" | Reduces decision fatigue |
| **Live Height Display** | Show "Total: 24.0m" as floors change | Immediate feedback |

**Recommended Slider Design:**
```
Floors: [━━━━━━●━━━━━━━━━━] 8
        1              20

        Low-rise  Mid-rise  High-rise
           ○         ●          ○

Total Height: 24.0m (8 floors × 3.0m)
```

### 2.5 Real-Time 3D Preview

| Feature | Implementation | User Trust Impact |
|---------|---------------|-------------------|
| **Split View Option** | 2D editor + live 3D panel side-by-side | See changes instantly |
| **3D Mini-Preview** | Small 3D inset in corner during editing | Context without mode switch |
| **Highlight Active Building** | Selected building pulses/glows in 3D | Clear correspondence |
| **Floor Animation** | Building "grows" as floors increase | Satisfying feedback |

---

## Part 3: Advanced Enhancements (Impressive Additions)

### 3.1 Smart Drawing Assistance

**Rectangle Tool:**
- Single-click + drag to create rectangular footprints
- Shows dimensions while drawing: "15.2m × 8.4m"
- Snaps to common aspect ratios (1:1, 1:2, 2:3)

**Building Templates:**
```
┌──────────────────────────────────────┐
│ Quick Templates                       │
│                                       │
│  ┌───┐   ┌─────┐   ┌─┐    ┌────────┐ │
│  │   │   │     │   │ │    │   __   │ │
│  └───┘   └─────┘   │ │    │  |  |  │ │
│ Square  Rectangle  │ │    │  |__|  │ │
│                   Tower  L-Shape    │
│                                       │
│ Click to place, then adjust          │
└──────────────────────────────────────┘
```

### 3.2 Vertex Editing Mode

After completing a building:
- Click "Edit Shape" to enter vertex mode
- Drag vertices to reshape footprint
- Add vertices by clicking on edges
- Remove vertices by double-clicking
- Constrain to original aspect ratio (optional)

### 3.3 Building Grouping

| Feature | Description |
|---------|-------------|
| **Create Group** | Select multiple buildings → "Group" button |
| **Group Operations** | Move, delete, edit floor count together |
| **Visual Indicator** | Grouped buildings share colored badge |
| **Ungroup** | Restore individual selection |

### 3.4 Copy/Duplicate Buildings

- **Duplicate Selected**: Ctrl+D creates copy offset by 10m
- **Copy Properties**: Copy floor count/height from one building to another
- **Array Tool**: Create grid of identical buildings with spacing input

### 3.5 Contextual Toolbar

When building(s) selected, show floating toolbar:
```
┌────────────────────────────────────────┐
│ 🏢 Building A  │ ✏️ Edit │ 📋 Copy │ 🗑️ Delete │
│                │ Floors: [-] 8 [+]            │
└────────────────────────────────────────┘
```

### 3.6 Smart Presets for Common Scenarios

| Preset | Configuration | Use Case |
|--------|--------------|----------|
| **Residential Low-Rise** | 3-5 floors, 3.0m height | Apartments, townhouses |
| **Residential High-Rise** | 15-25 floors, 2.8m height | Condo towers |
| **Commercial Office** | 8-12 floors, 4.0m height | Office buildings |
| **Industrial** | 1-2 floors, 6.0m height | Warehouses, factories |
| **Mixed-Use Podium** | 4F podium + tower | Retail + residential |

### 3.7 Measurement & Distance Tools

- **Ruler Tool**: Click two points to measure distance
- **Area Display**: Show footprint area in corner
- **Building-to-Building Distance**: Hover shows gap to neighbors
- **Setback Indicators**: Visual lines showing distance from site edge

---

## Part 4: Error Prevention & Recovery

### 4.1 Validation & Guardrails

| Potential Error | Prevention | Recovery |
|-----------------|------------|----------|
| Self-intersecting polygon | Show error highlight, prevent completion | "This shape crosses itself. Adjust points." |
| Too few points (< 3) | Disable "Complete" until 3+ points | Gray out completion action |
| Building outside site | Warning indicator | "Building extends beyond site boundary" |
| Overlapping buildings | Show overlap highlight | Allow but warn: "Buildings overlap. OK?" |
| Extreme floor count (> 50) | Confirm dialog | "50+ floors is unusual. Continue?" |
| Zero-area footprint | Reject automatically | "Building must have area" |

### 4.2 Confirmation Dialogs

**Use confirmation for:**
- Delete All Buildings
- Clear and Start Over
- Applying bulk edits to many buildings
- Closing editor with unsaved changes

**Skip confirmation for:**
- Single building delete (use undo instead)
- Individual property changes (use undo)

### 4.3 Auto-Save & Recovery

- Auto-save state every 30 seconds
- "Recover previous session?" prompt on return
- Export/import building configurations

---

## Part 5: Visual Design & Feedback

### 5.1 Color System for Building States

| State | Fill | Stroke | Opacity |
|-------|------|--------|---------|
| Default | Building color | Building color | 40% |
| Hovered | Building color | White | 60% |
| Selected | Building color | White (3px) | 80% |
| Drawing (in progress) | Amber | Amber dashed | 60% |
| Error/Invalid | Red | Red | 50% |
| Locked/Imported | Gray | Gray | 30% |

### 5.2 Cursor States

| Mode/State | Cursor |
|------------|--------|
| Draw mode | Crosshair |
| Select mode | Pointer |
| Delete mode | Pointer with X badge |
| Over draggable vertex | Move arrows |
| Over edge (to add vertex) | Plus sign |
| Over building (hovering) | Pointer highlight |
| Panning canvas | Grab hand |

### 5.3 Feedback Animations

| Action | Animation |
|--------|-----------|
| Building completed | Brief pulse/glow |
| Building deleted | Fade out |
| Selection change | Subtle scale (1.02x) |
| Error | Shake animation |
| Undo/redo | Flash highlight |

---

## Part 6: Microcopy & Guidance

### 6.1 Contextual Help Text

| Context | Message |
|---------|---------|
| Empty canvas | "Click to place the first corner of your building footprint" |
| 1-2 points placed | "Keep clicking to add corners. Need at least 3 points." |
| 3+ points placed | "Double-click or press Enter to complete the building" |
| Building selected | "Drag corners to reshape. Use panel to set floors." |
| Multiple selected | "3 buildings selected. Edit properties to change all." |
| Delete mode active | "Click buildings to delete them. Ctrl+Z to undo." |

### 6.2 Onboarding Tips (First-Time Users)

Show dismissible tooltips:
1. "Use the Draw tool to trace building footprints on your site plan"
2. "Double-click to complete a shape"
3. "Set the number of floors in the Properties panel"
4. "Continue to 3D View to see shadows and sunlight"

### 6.3 Error Messages

| Scenario | Message |
|----------|---------|
| Too few points | "Add at least 3 points to create a building" |
| Invalid floor count | "Floor count must be between 1 and 100" |
| Invalid floor height | "Floor height must be between 2m and 10m" |
| No buildings to continue | "Add at least one building before viewing 3D" |

---

## Part 7: Keyboard Shortcuts

| Action | Shortcut | Context |
|--------|----------|---------|
| Draw tool | D | Any |
| Select tool | V | Any |
| Delete tool | X | Any |
| Undo | Ctrl+Z | Any |
| Redo | Ctrl+Y / Ctrl+Shift+Z | Any |
| Delete selected | Delete / Backspace | When selected |
| Complete building | Enter | While drawing |
| Cancel drawing | Escape | While drawing |
| Select all | Ctrl+A | Select mode |
| Deselect all | Escape | When selected |
| Duplicate | Ctrl+D | When selected |
| Hold for orthogonal | Shift (while drawing) | Draw mode |
| Multi-select | Shift+Click | Select mode |

---

## Part 8: What NOT to Include

| Avoid | Reason |
|-------|--------|
| **Complex CAD tools** | Users are not architects; keep it simple |
| **BIM-level detail** | This is massing, not construction documents |
| **Automatic building detection editing** | Detection should be one-way import |
| **3D drawing/editing** | 2D footprint + floor count is sufficient |
| **Bezier curves** | Buildings have straight edges |
| **Layer management** | Overkill for this use case |
| **Material/texture selection** | Not relevant for shadow analysis |
| **Interior floor plans** | Out of scope for sunlight massing |
| **Construction-grade dimensions** | False precision |

---

## Part 9: Implementation Roadmap

### Phase 1: Foundation (Critical Fixes)
1. Multi-level undo/redo with history
2. Snap-to-grid option
3. Orthogonal constraint (Shift key)
4. Close-loop indicator for drawing
5. Clear visual selection states
6. Keyboard shortcuts complete

### Phase 2: Selection & Editing
7. Multi-select with Shift+Click
8. Marquee selection (drag box)
9. Vertex editing mode
10. Duplicate building (Ctrl+D)
11. Contextual floating toolbar

### Phase 3: Professional Polish
12. Rectangle/shape templates
13. Building presets (residential, commercial)
14. Live 3D mini-preview
15. Measurement/distance tools
16. Smart alignment guides

### Phase 4: Advanced Delight
17. Building grouping
18. Copy properties between buildings
19. Array/repeat tool
20. Import/export building configurations

---

## Summary

Effective building definition requires balancing **simplicity** for non-expert users with **precision** for those who need it. The key principles:

1. **Immediate Feedback** — Every click produces visible results
2. **Forgiveness** — Undo everything, prevent nothing (just warn)
3. **Clear States** — User always knows what's selected/active
4. **Progressive Complexity** — Simple by default, powerful when needed
5. **2D/3D Connection** — Footprint changes reflect in massing preview

The goal is to make users feel **confident** and **in control**, even without CAD experience. When done well, building definition becomes the most satisfying part of the workflow—not the most frustrating.

---

## Sources

- [Autodesk Forma AI Workflows](https://archilabs.ai/posts/autodesk-forma) — AI-driven massing generation
- [TestFit Urban Planner](https://www.testfit.io/product/urban-planner) — Rule-based building configuration
- [SketchUp Drawing Help](https://help.sketchup.com/en/sketchup/modeling-specific-shapes-objects-and-building-features-3d) — Footprint tracing techniques
- [Modelur Urban Design](https://modelur.com/) — Zoning-aware parametric modeling
- [CAD Software UX Patterns](https://lab.interface-design.co.uk/cad-software-ui-design-patterns-benchmarking-97cc7834ad02) — Usability benchmarking
- [Material Design Selection](https://m1.material.io/patterns/selection.html) — Multi-select patterns
- [Apple Undo/Redo Guidelines](https://developer.apple.com/design/human-interface-guidelines/patterns/undo-and-redo/) — Error recovery best practices
- [GoJS Polygon Drawing](https://gojs.net/latest/samples/PolygonDrawing.html) — Web-based polygon tools
- [ArcGIS Dynamic Constraints](https://pro.arcgis.com/en/pro-app/latest/help/editing/enable-dynamic-constraints.htm) — Snap and orthogonal constraints
- [Slider UI Examples](https://www.eleken.co/blog-posts/slider-ui) — Real-world slider patterns
- [3D User Interface Design](https://viartisan.com/2025/05/28/3d-ui-ux-design/) — 2D/3D synchronization principles
