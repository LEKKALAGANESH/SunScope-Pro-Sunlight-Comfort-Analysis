# Assumptions & Limitations Document

## Open-Access Site Sunlight & Massing Tool

---

## 1. Accuracy Statement

> **This tool provides conceptual, early-stage sunlight and comfort insights based on simplified geometry and clear-sky assumptions. Results are intended for relative comparison, daily-life decision support, and preliminary design exploration—not for detailed engineering analysis, regulatory compliance, or construction documentation.**

---

## 2. Physical Simplifications

### 2.1 Sky Model

| Assumption | Description | Impact |
|------------|-------------|--------|
| **Clear sky only** | All calculations assume cloudless conditions | Overestimates direct sunlight; actual exposure varies with weather |
| **No atmospheric scattering** | Diffuse sky light simplified to uniform ambient | Underestimates indirect daylight contribution |
| **No pollution/haze modeling** | Air clarity assumed constant | May overestimate irradiance in urban areas |
| **Standard atmosphere** | Sea-level atmospheric conditions | Minor error at high altitudes |

### 2.2 Shadow Calculations

| Assumption | Description | Impact |
|------------|-------------|--------|
| **Sharp shadows** | Binary shadow (in/out), no penumbra | Real shadows have soft edges |
| **No reflections** | Light bouncing off surfaces ignored | Underestimates light in shaded areas near bright surfaces |
| **Flat terrain** | Ground plane is horizontal | Hills/slopes affect actual shadow patterns |
| **No vegetation** | Trees and plants not modeled | May miss significant shading sources |

### 2.3 Building Geometry

| Assumption | Description | Impact |
|------------|-------------|--------|
| **Block massing only** | Buildings as extruded footprints | No balconies, setbacks, or complex facades |
| **Uniform floor heights** | All floors same height | Some buildings have varying floor heights |
| **Vertical walls** | No sloped roofs or angled facades | Actual roof geometry affects shadows |
| **No windows modeled** | Facades treated as solid surfaces | Window-specific analysis requires additional input |

### 2.4 Solar Radiation

| Assumption | Description | Impact |
|------------|-------------|--------|
| **Direct beam only** | Irradiance from sun direction only | Diffuse radiation (15-30% of total) ignored |
| **Cosine law** | Simple angle-based intensity | Ignores atmospheric path length variation |
| **No spectral analysis** | Broadband solar radiation | UV and IR components not differentiated |

### 2.5 Thermal & Comfort

| Assumption | Description | Impact |
|------------|-------------|--------|
| **No air temperature modeling** | Comfort based on solar exposure only | Actual comfort depends on air temp, humidity, wind |
| **No thermal mass** | Instantaneous heat gain assumed | Buildings store and release heat over time |
| **No HVAC interaction** | Mechanical systems not considered | Air conditioning changes comfort equation |
| **Simplified glazing model** | Fixed transmittance values | Real glass has angle-dependent properties |

---

## 3. What This Tool Cannot Do

### 3.1 Not Provided

- Exact indoor temperature calculations
- Energy consumption estimates
- HVAC sizing recommendations
- Regulatory compliance certification (e.g., LEED, BREEAM)
- Glare analysis (visual comfort)
- CFD (computational fluid dynamics) for airflow
- Acoustic analysis
- Structural analysis
- Code compliance checking

### 3.2 Not Intended For

- Final design documentation
- Construction drawings
- Building permits
- Energy audits
- Legal disputes
- Insurance claims
- Real estate valuations (as sole basis)

---

## 4. Input Sensitivity

### 4.1 Critical Inputs

| Input | Sensitivity | Quality Requirements |
|-------|-------------|---------------------|
| **Location (lat/lon)** | HIGH | ±0.01° affects sun angles by ~1° |
| **North orientation** | HIGH | ±5° can shift sun timing by 20+ minutes |
| **Scale** | HIGH | ±10% error propagates to all area calculations |
| **Building heights** | MEDIUM | ±1 floor changes shadow lengths significantly |
| **Date selection** | MEDIUM | Summer vs winter dramatically different |

### 4.2 Minimum Input Requirements

For reliable output, users MUST provide:

1. **Image quality**
   - Minimum resolution: 800 x 800 pixels
   - Clear building boundaries visible
   - No excessive distortion or rotation

2. **Site information**
   - Geographic location (city or coordinates)
   - North direction (within ±10°)
   - Scale reference (known dimension)

3. **Building data**
   - Number of floors per building
   - Approximate floor height (default 3m if unknown)
   - Footprint traced with reasonable accuracy

### 4.3 Optional Inputs (Improve Accuracy)

- Exact coordinates (not just city center)
- Surveyed building dimensions
- Actual floor-to-floor heights
- Glazing specifications (if known)
- Existing shading elements

---

## 5. Confidence Levels by Output Type

### 5.1 High Confidence (Geometry-Based)

These outputs depend primarily on geometric calculations and are generally reliable:

| Output | Confidence | Notes |
|--------|------------|-------|
| Shadow patterns | HIGH | Direct geometric raycast |
| First/last sunlight time | HIGH | Based on sun position + geometry |
| Total sunlight duration | HIGH | Sum of exposure periods |
| Continuous vs intermittent | HIGH | Pattern analysis |
| Relative comparison between areas | HIGH | Same assumptions apply to all |

### 5.2 Medium Confidence (Estimated Physics)

These outputs involve physical approximations:

| Output | Confidence | Notes |
|--------|------------|-------|
| Solar irradiance (W/m²) | MEDIUM | Clear-sky model, no diffuse |
| Relative heat impact | MEDIUM | Proportional to exposure |
| Peak heat hours | MEDIUM | Based on irradiance timing |
| Seasonal variation | MEDIUM | Sun path is accurate, weather is not |

### 5.3 Lower Confidence (Scenario-Based)

These outputs depend heavily on assumptions:

| Output | Confidence | Notes |
|--------|------------|-------|
| Comfort score | LOWER | Many factors not modeled |
| Window open/closed impact | LOWER | Simplified ventilation model |
| Glass type comparison | LOWER | Generic transmittance values |
| Shading effectiveness | LOWER | Idealized shading behavior |

---

## 6. Comparison with Professional Tools

| Feature | This Tool | Professional Tools (e.g., ClimateStudio, Ladybug) |
|---------|-----------|---------------------------------------------------|
| Accuracy | Conceptual (±20-30%) | Engineering-grade (±5-10%) |
| Weather data | Clear sky only | TMY/EPW hourly data |
| Diffuse radiation | Ignored | Full sky model |
| Reflections | None | Radiance-based ray tracing |
| Validation | Not validated | Peer-reviewed algorithms |
| Certification | Not suitable | LEED/BREEAM ready |
| Setup time | Minutes | Hours to days |
| Learning curve | None | Significant |
| Cost | Free | $$$ - $$$$ |

---

## 7. Disclaimer Text (Display in Application)

### Short Version (Always Visible)
> Results are estimates for early-stage exploration. Not for engineering or regulatory purposes.

### Long Version (Help/About Section)
> This tool provides conceptual sunlight and comfort insights using simplified geometric calculations and clear-sky assumptions. Results are intended for:
> - Early-stage design exploration
> - Daily-life decision support (when to open windows, etc.)
> - Relative comparison between options
> - Educational understanding of sun movement
>
> Results are NOT suitable for:
> - Final engineering analysis
> - Building code compliance
> - Energy performance certification
> - Legal or contractual documentation
>
> For detailed analysis, consult a qualified architect, engineer, or use validated simulation software.

---

## 8. Known Limitations by Feature

### 8.1 Image Upload
- PDF parsing may lose quality
- Very dark or low-contrast images may be hard to trace
- Fisheye or heavily distorted images not supported

### 8.2 Massing Editor
- Complex curves must be approximated with straight segments
- Cannot model interior spaces (only exterior massing)
- Maximum 25 buildings recommended for performance

### 8.3 Sun Simulation
- Times shown in local timezone (may differ from input image timezone)
- Daylight saving transitions may cause discontinuities
- Arctic/Antarctic locations (extreme latitudes) may behave unexpectedly

### 8.4 Analysis
- Hourly sampling (not continuous)
- No sub-floor analysis (whole floor treated uniformly)
- Facade analysis treats each wall as single surface

### 8.5 Export
- PDF layout fixed (not customizable)
- GLTF export loses analysis data (geometry only)
- Large projects may take longer to export

---

## 9. Recommendations for Users

1. **Validate with real observation** — Compare tool results with actual sun patterns you observe on site
2. **Use for relative decisions** — "Area A gets more sun than Area B" is more reliable than exact hour counts
3. **Check critical dates** — Test both summer and winter solstices for complete picture
4. **When in doubt, consult a professional** — For major decisions (home purchase, renovation), get expert analysis
5. **Understand the weather caveat** — Cloudy days will reduce actual sunlight significantly

---

## 10. Future Improvements (Not in Current Version)

The following features are not included but could improve accuracy in future versions:
- Weather data integration (cloud cover statistics)
- Terrain/topography modeling
- Vegetation/tree shading
- Reflection analysis
- Validated comfort models (e.g., UTCI, PET)
- BIM file import (IFC)

---

*Document Version: 1.0*
*Date: January 2026*
