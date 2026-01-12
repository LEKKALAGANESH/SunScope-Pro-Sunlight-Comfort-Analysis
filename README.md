# SunScope Pro

## Open-Access Site Sunlight, Heat & Comfort Analysis Web Tool

An open-access, browser-based web tool that allows users to upload a site plan image and receive sunlight, heat, and comfort insights for selected floors or custom areas. No login required.

---

## Project Status: Pre-Implementation Phase Complete

All pre-implementation deliverables have been created and are ready for review before coding begins.

---

## Pre-Implementation Documents

| Document | Description | File |
|----------|-------------|------|
| **Research Report** | Analysis of 12 best-in-class tools with UX pattern recommendations | `01_Research_Report.md` |
| **UX & Product Design** | User flows, wireframes for all screens, accessibility guidelines | `02_UX_Product_Design.md` |
| **System Architecture** | Tech stack, data models, component structure, file organization | `03_System_Architecture.md` |
| **Assumptions & Limitations** | Physical simplifications, accuracy bands, disclaimers | `04_Assumptions_Limitations.md` |
| **Insight Logic Specification** | Algorithms and pseudo-code for all metrics and calculations | `05_Insight_Logic_Specification.md` |
| **Acceptance Criteria & QA** | Feature acceptance criteria, test scenarios, release checklist | `06_Acceptance_Criteria_QA.md` |

---

## Project Overview

### Primary Goals

- Convert site plan images into simplified 3D massing models
- Simulate sun movement and shadows
- Analyze sunlight timing for selected floors or areas
- Estimate solar heat impact using transparent assumptions
- Provide actionable, easy-to-understand daily comfort insights

### What This Tool IS

- Image-assisted 3D massing generator
- Sun-path and shadow visualizer
- Solar exposure and comfort insight tool
- Decision-support system for daily use and early design

### What This Tool IS NOT

- Fully automatic image-to-3D converter
- BIM or IFC modeling system
- Exact indoor temperature calculator
- HVAC or energy consumption simulator

---

## Recommended Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 18+ with TypeScript |
| 3D Engine | Three.js |
| UI | Tailwind CSS + Headless UI |
| State | Zustand |
| Sun Calculations | SunCalc.js |
| Build | Vite |
| Hosting | Vercel / Netlify / Cloudflare Pages |

---

## Implementation Phases

### Phase 1: Core Infrastructure
- Image upload + validation + guidance UI
- Basic state management
- Project data model

### Phase 2: Massing Editor
- Image-assisted massing editor
- Manual annotation tools
- 3D extrusion from footprints

### Phase 3: 3D Viewer
- Interactive 3D viewer
- Time-of-day scrubber and playback
- Shadow visualization

### Phase 4: Analysis Engine
- Sunlight timing maps
- Per-area metrics (sun-hours, direct exposure)
- Heat impact calculations

### Phase 5: Insights & Scenarios
- Simplified solar heat and comfort indicators
- Human-readable recommendations
- Scenario comparison UI

### Phase 6: Export & Polish
- Export functionality (CSV/JSON/PNG/GLTF/PDF)
- Accessibility and performance audits
- Final polish and testing

---

## Key Features

- **No Login Required** - Zero barrier to entry
- **Image-Assisted Massing** - Upload site plan, trace buildings
- **Real-Time Shadows** - See shadows change as you scrub time
- **Floor-Level Analysis** - Select specific floors for analysis
- **Daily-Life Insights** - Practical recommendations (when to open windows, etc.)
- **Scenario Comparison** - Compare glazing types, shading options
- **Export Options** - PDF reports, CSV data, PNG snapshots, GLTF 3D models
- **Transparent Assumptions** - Honest about limitations

---

## Target Users

- Home residents and apartment buyers
- Architects (early-stage design)
- Urban planners
- Real estate professionals
- General public exploring sunlight and comfort

---

## Privacy & Security

- All processing happens client-side in the browser
- No user data stored on servers
- No login or account required
- HTTPS enforced
- No tracking or analytics that transmit user data

---

## Disclaimers

> This tool provides conceptual sunlight and comfort insights based on simplified geometry and clear-sky assumptions. Results are intended for early-stage decision-making and comparison, not detailed engineering or energy analysis.

---

## Next Steps

1. Review all pre-implementation documents
2. Approve or request revisions
3. Begin implementation phase

---

## License

TBD

---

*Version: Pre-Implementation 1.0*
*Date: January 2026*
