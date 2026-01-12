# Define Buildings - Implementation Plan

## Overview
This plan outlines the phased implementation of UX improvements to the MassingEditor component based on the research findings in `DefineBuildingsUXResearch.md`.

---

## Phase 1: Foundation (Critical Fixes) ✅ COMPLETED

### 1.1 Multi-Level Undo/Redo System
- [x] Create action history store (max 50 actions)
- [x] Track: add building, delete building, update building, add point, complete shape
- [x] Implement Ctrl+Z (undo) and Ctrl+Y/Ctrl+Shift+Z (redo)
- [x] Add undo/redo buttons to toolbar
- [x] Show toast notification on undo: "Undo: Building deleted"

### 1.2 Snap-to-Grid
- [x] Add grid overlay to canvas (20px intervals)
- [x] Snap points when snap-to-grid is enabled
- [x] Add toggle button: "Snap to Grid" (on by default)
- [x] Visual indicator when point snaps

### 1.3 Orthogonal Constraint
- [x] Hold Shift while drawing to constrain to 90° angles
- [x] Show constraint indicator (preview line)
- [x] Visual feedback when constraint is active

### 1.4 Close-Loop Indicator
- [x] Highlight starting point when cursor is within 15px
- [x] Show "Click to close" tooltip near starting point
- [x] Visual connection line from current point to start

### 1.5 Enhanced Selection States
- [x] Unselected: 30% opacity fill
- [x] Hovered: 50% opacity + cursor change
- [x] Selected: 70% opacity + white border (3px)
- [ ] Multi-selected: Same as selected + count badge (Phase 2)

### 1.6 Complete Keyboard Shortcuts
- [x] D = Draw tool
- [x] V = Select tool
- [x] X = Delete tool
- [x] Enter = Complete building (while drawing)
- [x] Escape = Cancel drawing / Deselect all
- [x] Delete/Backspace = Delete selected
- [x] Ctrl+A = Select all buildings (placeholder for multi-select)

---

## Phase 2: Selection & Editing ✅ COMPLETED

### 2.1 Multi-Select
- [x] Shift+Click to add/remove from selection
- [x] Track selectedBuildingIds as Set (not single ID)
- [x] Update Properties panel to show "X buildings selected"
- [x] Bulk edit applies to all selected

### 2.2 Marquee Selection
- [x] Click+drag on empty space to start marquee
- [x] Draw selection rectangle (blue dashed)
- [x] Select all buildings intersecting rectangle
- [x] Shift+marquee to add to selection

### 2.3 Vertex Editing Mode
- [x] Add "Edit Shape" button in Properties panel
- [x] Show vertex handles on selected building
- [x] Drag vertices to reshape
- [x] E key to enter edit mode
- [ ] Double-click edge to add vertex (Future)
- [ ] Double-click vertex to remove (Future)

### 2.4 Duplicate Building
- [x] Ctrl+D duplicates selected building(s)
- [x] Offset copy by 20px diagonally
- [x] New building gets incremented name with "(copy)" suffix

### 2.5 Contextual Floating Toolbar
- [x] Quick actions in Properties panel: Edit Shape, Duplicate
- [x] Multi-select actions: Duplicate All, Delete All
- [x] Inline floor count stepper with +/- buttons

---

## Phase 3: Professional Polish ✅ COMPLETED

### 3.1 Shape Templates
- [x] Rectangle tool: click+drag to create
- [x] Square tool (Shift+Rectangle)
- [x] L-Shape template
- [x] Tower template (small footprint)
- [x] U-Shape template (added)

### 3.2 Building Presets
- [x] "Residential Low-Rise": 4 floors, 3.0m
- [x] "Residential High-Rise": 20 floors, 2.8m
- [x] "Commercial Office": 10 floors, 4.0m
- [x] "Industrial": 2 floors, 6.0m
- [x] "Mixed-Use Podium": 6 floors, 3.5m (added)
- [x] Quick-apply via dropdown

### 3.3 Live 3D Mini-Preview
- [ ] Small 3D inset (200x150px) in corner (Future enhancement)
- [ ] Updates in real-time as buildings change
- [ ] Highlight selected building in preview
- [ ] Toggle to expand/collapse

### 3.4 Measurement Tools
- [x] Show footprint area in Properties
- [x] Display dimensions while drawing (rectangle tool)
- [ ] Distance between buildings on hover (Future enhancement)

---

## Phase 4: Advanced Delight ✅ COMPLETED

### 4.1 Building Grouping
- [x] Select multiple → "Group" button
- [x] Visual group indicator (colored badge)
- [x] Click group badge to select all group members
- [x] Ungroup option

### 4.2 Array Tool
- [x] Create grid of buildings
- [x] Specify rows, columns, spacing
- [x] Preview count before confirming

### 4.3 Import/Export
- [x] Export building config as JSON
- [x] Import previously saved config
- [x] Includes buildings, footprints, floors, heights, and groups

---

## File Changes Required

| File | Changes |
|------|---------|
| `MassingEditor.tsx` | Main implementation - all phases |
| `projectStore.ts` | Add undo/redo history, multi-select state |
| `types/index.ts` | Add EditorAction type for undo history |
| `DrawingCanvas.tsx` | New component for canvas with grid/snap |
| `BuildingToolbar.tsx` | New component for floating toolbar |
| `Mini3DPreview.tsx` | New component for live 3D preview |

---

## Current Status

- [x] Research completed
- [x] Plan documented
- [x] Phase 1 implementation ✅ (Completed: Undo/Redo, Snap-to-Grid, Orthogonal Constraint, Close-Loop Indicator, Keyboard Shortcuts)
- [x] Phase 2 implementation ✅ (Completed: Multi-Select, Marquee Selection, Vertex Editing, Duplicate, Enhanced Properties Panel)
- [x] Phase 3 implementation ✅ (Completed: Rectangle Tool, Shape Templates, Building Presets, Measurement Display)
- [x] Phase 4 implementation ✅ (Completed: Building Grouping, Array Tool, Import/Export)

---

## Notes

- Maintain backward compatibility with existing building data
- All new features should be toggleable or non-intrusive
- Test with touch devices for mobile compatibility
- Keep bundle size reasonable (lazy load 3D preview)
