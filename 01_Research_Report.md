# Research Report: Best-in-Class Tools Analysis

## Open-Access Site Sunlight & Massing Tool — Pre-Implementation Research

---

## Executive Summary

This report documents 12 best-in-class tools across sun-path visualization, daylight analysis, early-stage architectural massing, and public environmental simulation. Each tool is analyzed for core features, UX strengths/weaknesses, licensing, and technical implementation details.

---

## Tool Analysis (12 Tools)

### 1. Shadowmap / Shadowmap Studio

**URL:** https://shadowmap.org/

**Core Feature Set:**
- Global real-time 3D sunlight simulation
- Shadow analysis and solar irradiance evaluation
- Support for IFC, OBJ, FBX, DAE, and GLB file imports
- Time-of-day scrubbing and animation
- Browser-based operation

**UX Strengths:**
- Intuitive time slider interface
- Real-time shadow updates
- No installation required
- Beautiful 3D visualization

**Weaknesses:**
- Requires pre-existing 3D models (no massing creation tools)
- Limited analysis reporting features
- No image-to-massing workflow

**Licensing/Cost:** Free tier available; Studio version for professionals (paid subscription)

**Technical Notes:**
- WebGL-based 3D rendering
- Client-side processing
- Supports multiple 3D file formats

---

### 2. Andrew Marsh's 3D Sun-Path Tool

**URL:** https://andrewmarsh.com/software/sunpath3d-web/

**Core Feature Set:**
- Interactive sun-path diagram generation
- Geographic location integration via Google Maps
- Shadow projection visualization
- 2D SVG chart export
- Educational annotations

**UX Strengths:**
- Extremely simple interface
- Direct map interaction for location selection
- Free for commercial and personal use
- Excellent for understanding solar geometry

**Weaknesses:**
- No 3D building massing capabilities
- Cannot import site plans
- Limited to sun-path visualization only

**Licensing/Cost:** Free, open for commercial and personal use

**Technical Notes:**
- Pure client-side JavaScript
- SVG-based diagrams
- Google Maps API integration

---

### 3. Sun Path View

**URL:** https://www.sunpathview.com/

**Core Feature Set:**
- Location-based sunrise/sunset analysis
- Solar pattern visualization
- Simple search-based interface

**UX Strengths:**
- Zero signup required
- Instant results
- Mobile-friendly
- Professional-quality output

**Weaknesses:**
- No 3D capabilities
- No building analysis
- Limited to sun position data only

**Licensing/Cost:** Completely free

**Technical Notes:**
- Lightweight web application
- Client-side calculations

---

### 4. SunCalc

**URL:** https://www.suncalc.org/

**Core Feature Set:**
- Sun position calculation
- Shadow length computation
- Solar eclipse tracking
- Interactive map-based interface
- Photovoltaic system planning support

**UX Strengths:**
- Clean, intuitive interface
- Real-time updates as time changes
- Comprehensive sun data (azimuth, altitude, phases)
- Free and accessible

**Weaknesses:**
- No 3D visualization
- No building shadow analysis
- Single-point analysis only

**Licensing/Cost:** Free

**Technical Notes:**
- JavaScript library (suncalc.js) available for integration
- Client-side astronomical calculations
- Well-documented algorithm

---

### 5. ClimateStudio (Solemma)

**URL:** https://www.solemma.com/climatestudio

**Core Feature Set:**
- Comprehensive environmental performance analysis
- Energy efficiency optimization
- Daylight access analysis (sDA, ASE metrics)
- Electric lighting performance
- Visual and thermal comfort analysis
- Sun angle and shadow visualization

**UX Strengths:**
- Industry-standard accuracy
- LEED/LM-83 compliance support
- Rich visualization options
- Professional reporting

**Weaknesses:**
- Requires Rhinoceros 3D (plugin architecture)
- Steep learning curve
- Not browser-based
- Commercial license required

**Licensing/Cost:** Commercial software (requires Rhino 6/7/8)

**Technical Notes:**
- Radiance-based simulation engine
- Integration with Grasshopper for parametric workflows
- High computational requirements

---

### 6. Ladybug Tools

**URL:** https://www.ladybug.tools/

**Core Feature Set:**
- Weather data visualization
- Sun-path diagrams
- Wind rose analysis
- Radiation analysis
- Shadow studies
- View analysis
- Psychrometric charts

**UX Strengths:**
- Extremely comprehensive analysis suite
- Open-source and free
- Strong community support
- Excellent documentation

**Weaknesses:**
- Requires Grasshopper/Rhino knowledge
- Complex setup for beginners
- Not browser-based (desktop only)

**Licensing/Cost:** Free, open-source (GPL)

**Technical Notes:**
- Python-based components
- Radiance integration for daylight
- EnergyPlus integration for thermal analysis
- Spider module provides some web capabilities (Three.js)

---

### 7. Autodesk Forma (formerly Spacemaker)

**URL:** https://www.autodesk.com/products/forma/

**Core Feature Set:**
- AI-powered early-stage design
- Sun hours analysis
- Daylight potential analysis (VSC, Obstruction angle)
- Wind analysis (AI-rapid and detailed simulation)
- Microclimate analysis
- Noise analysis
- Solar energy analysis
- Embodied carbon analysis

**UX Strengths:**
- Browser-based (no installation)
- Real-time analysis feedback
- AI-powered rapid analysis
- Comprehensive environmental metrics
- Excellent UX for early-stage design

**Weaknesses:**
- Commercial subscription required
- No image-to-massing workflow
- Requires manual geometry creation
- Learning curve for full capabilities

**Licensing/Cost:** Subscription (part of AEC Collection or standalone)

**Technical Notes:**
- Cloud-based processing
- Machine learning for rapid analyses
- WebGL 3D visualization
- Proprietary data formats

---

### 8. TestFit

**URL:** https://www.testfit.io/

**Core Feature Set:**
- Real estate feasibility analysis
- Generative design for building optimization
- Site layout optimization
- Massing studies
- Pro forma integration
- Multi-family and industrial building types

**UX Strengths:**
- AI-generated design options in seconds
- KPI-based sorting and optimization
- Fast iteration (30 minutes vs weeks)
- Urban planning capabilities

**Weaknesses:**
- Focused on real estate feasibility, not environmental analysis
- No detailed sunlight/comfort analysis
- Commercial product
- Limited building type support

**Licensing/Cost:** Commercial subscription

**Technical Notes:**
- Cloud-based platform
- AI/ML optimization algorithms
- Real-time 3D visualization

---

### 9. Hypar

**URL:** https://hypar.io/

**Core Feature Set:**
- Cloud-native generative design
- Text-to-BIM functionality
- Modular function marketplace
- Building envelope, structure, and floorplan generation
- IFC and Revit export

**UX Strengths:**
- Chat-style interface for building descriptions
- Open-standards approach
- Function marketplace (app-store model)
- Cloud-based (no installation)

**Weaknesses:**
- Focused on generative design, less on environmental analysis
- Requires understanding of parametric workflows
- Limited free tier

**Licensing/Cost:** Freemium model with paid tiers

**Technical Notes:**
- Cloud-native architecture
- LLM integration for natural language input
- IFC export support
- API-driven extensibility

---

### 10. Sefaira (SketchUp/Revit Plugin)

**URL:** https://support.sefaira.com/

**Core Feature Set:**
- Daylighting visualization
- Energy analysis
- Glazing and shading strategy comparison
- LEED daylight compliance evaluation
- Annual and point-in-time analysis

**UX Strengths:**
- Integrated into SketchUp/Revit workflows
- Clear metrics (Underlit, Well Lit, Overlit)
- Visual comparison tools
- LEED-oriented reporting

**Weaknesses:**
- Plugin architecture (requires SketchUp/Revit)
- Not standalone browser tool
- Commercial license

**Licensing/Cost:** Commercial (part of SketchUp Studio)

**Technical Notes:**
- Radiance and Daysim simulation engines
- Cloud-based computation
- Spatial Daylight Autonomy (sDA) calculations

---

### 11. VELUX Daylight Visualizer

**URL:** https://commercial.velux.com/inspiration/daylight-visualizer

**Core Feature Set:**
- Professional daylight simulation
- Luminance, illuminance, and daylight factor mapping
- Photorealistic rendering
- EN 17037 compliance evaluation
- Embedded modeling tool
- Import from CAD programs (DWG, DXF, SKP, OBJ)

**UX Strengths:**
- Free professional-grade tool
- Good import capabilities
- Automated reporting
- Standards compliance checking

**Weaknesses:**
- Desktop application (not browser-based)
- Focused primarily on skylights
- Limited to daylight (no thermal/comfort analysis)

**Licensing/Cost:** Free

**Technical Notes:**
- Windows and Mac support
- Radiance-based simulation
- Multiple CAD format support

---

### 12. DIALux

**URL:** https://www.dialux.com/

**Core Feature Set:**
- Comprehensive lighting analysis
- Sunlight simulation
- LEED daylighting credit calculations
- Indoor and outdoor lighting design
- Luminaire database integration

**UX Strengths:**
- Industry standard for lighting design
- Free to use
- Extensive luminaire library
- Professional reporting

**Weaknesses:**
- Desktop application only
- Steep learning curve
- Primarily focused on artificial lighting
- Complex interface

**Licensing/Cost:** Free

**Technical Notes:**
- Windows application
- Proprietary simulation engine
- IES/LDT luminaire file support

---

## UX & UI Pattern Analysis

### Best Patterns to Replicate

#### 1. Image Upload Flow (Recommended: Shadowmap + Forma approach)
- **Drag-and-drop zone** with clear visual feedback
- **File validation** with immediate error messaging
- **Preview thumbnail** after upload
- **Progress indicator** during processing

#### 2. Time Scrubbing Interface (Recommended: Shadowmap)
- **Horizontal time slider** with hour markers
- **Date picker** (calendar widget)
- **Play/pause animation** controls
- **Speed control** for animation
- **Current time display** prominently shown

#### 3. 3D Viewport Controls (Recommended: Forma + Three.js standard)
- **Orbit, pan, zoom** with mouse/touch
- **Preset view buttons** (top, front, isometric)
- **Home/reset view** button
- **Full-screen toggle**
- **Shadow toggle** control

#### 4. Model Editing (Recommended: Forma massing approach)
- **Click-to-select** buildings
- **Drag handles** for height adjustment
- **Numeric input** for precise values
- **Undo/redo** functionality
- **Snap-to-grid** option

#### 5. Results Dashboard (Recommended: Sefaira + ClimateStudio)
- **Clear metric cards** with values and units
- **Color-coded indicators** (green/yellow/red)
- **Expandable detail panels**
- **Comparison view** for scenarios
- **Export button** prominently placed

#### 6. Scenario Comparison (Recommended: Sefaira)
- **Side-by-side panels**
- **Differential highlighting**
- **Toggle switches** for parameters
- **Summary comparison table**

#### 7. Guidance & Onboarding (Recommended: Forma)
- **Step-by-step wizard** for first-time users
- **Contextual tooltips**
- **Progress indicator** for workflow steps
- **Sample project** option

---

## Recommendations for This Project

### Primary UX Patterns to Implement:

1. **Upload Flow:** Drag-and-drop with validation checklist (detected/missing data)
2. **Massing Editor:** Image overlay + click-to-draw footprints + height input
3. **Time Control:** Horizontal slider + calendar + play button
4. **3D Viewer:** Three.js-based with standard orbit controls
5. **Results:** Card-based dashboard with color-coded comfort levels
6. **Scenarios:** Toggle switches with instant visual update
7. **Export:** Modal with format options (PDF, CSV, PNG)

### Technical Stack Recommendation:

Based on analysis:
- **3D Engine:** Three.js (most flexible, well-documented, client-side)
- **Sun Calculations:** SunCalc.js library (proven, accurate, lightweight)
- **UI Framework:** React or Vue (component-based, good ecosystem)
- **Image Processing:** Client-side Canvas API
- **Export:** jsPDF, html2canvas, FileSaver.js

### Key Differentiators from Existing Tools:

1. **Image-assisted massing** (no existing tool offers this well)
2. **No login required** (most professional tools require accounts)
3. **Daily-life insights** (unique focus on practical recommendations)
4. **Transparent assumptions** (honest about limitations)
5. **Comfort-focused** (not just technical metrics)

---

## Sources

- [Shadowmap](https://shadowmap.org/)
- [Andrew Marsh 3D Sun-Path](https://andrewmarsh.com/software/sunpath3d-web/)
- [Sun Path View](https://www.sunpathview.com/)
- [SunCalc](https://www.suncalc.org/)
- [ClimateStudio](https://www.solemma.com/climatestudio)
- [Ladybug Tools](https://www.ladybug.tools/)
- [Autodesk Forma](https://www.autodesk.com/products/forma/)
- [TestFit](https://www.testfit.io/)
- [Hypar](https://hypar.io/)
- [Sefaira](https://support.sefaira.com/)
- [VELUX Daylight Visualizer](https://commercial.velux.com/inspiration/daylight-visualizer)
- [DIALux](https://www.dialux.com/)

---

*Document Version: 1.0*
*Date: January 2026*
