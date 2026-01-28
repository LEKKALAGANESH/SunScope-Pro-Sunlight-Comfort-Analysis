# SunScope Pro - Technical Reference Guide

## Table of Contents
1. [Solar Position Calculations](#solar-position-calculations)
2. [Coordinate Systems](#coordinate-systems)
3. [Irradiance Calculations](#irradiance-calculations)
4. [3D Scene Architecture](#3d-scene-architecture)
5. [Data Export Specifications](#data-export-specifications)
6. [Known Technical Considerations](#known-technical-considerations)

---

## Solar Position Calculations

### SunCalc Library

SunScope Pro uses the **SunCalc** library for astronomical calculations. This is the same algorithm used by many professional solar analysis tools.

#### Key Functions Used:
```javascript
import SunCalc from 'suncalc';

// Get sun position (altitude & azimuth)
const sunPosition = SunCalc.getPosition(date, latitude, longitude);

// Get sun times (sunrise, sunset, solar noon, etc.)
const sunTimes = SunCalc.getTimes(date, latitude, longitude);
```

#### Output Values:
- **altitude**: Sun's angle above horizon in radians (convert to degrees: `altitude * 180 / Math.PI`)
- **azimuth**: Sun's compass direction in radians (see Azimuth Convention below)

### Accuracy Notes
- SunCalc accuracy: typically within 0.01° for sun position
- Best accuracy between 72°N and 72°S latitude
- Atmospheric refraction is approximated, not precisely calculated

---

## Coordinate Systems

### Azimuth Convention Difference

**IMPORTANT**: SunScope Pro uses SunCalc's azimuth convention, which differs from standard geographic convention.

#### Standard Geographic Convention (NOAA, TimeAndDate, etc.)
```
           N (0°)
            |
            |
   W (270°) +-------- E (90°)
            |
            |
           S (180°)

Measurement: Clockwise from North (0° to 360°)
```

#### SunCalc Convention (Used in SunScope Pro)
```
           N (±180°)
            |
            |
   W (+90°) +-------- E (-90°)
            |
            |
           S (0°)

Measurement: From South
- Negative values = East of South
- Positive values = West of South
- Range: -180° to +180°
```

#### Conversion Formulas

**SunCalc to Standard Geographic:**
```javascript
standardAzimuth = (sunCalcAzimuth * 180 / Math.PI) + 180;
// Normalize to 0-360 range
if (standardAzimuth < 0) standardAzimuth += 360;
if (standardAzimuth >= 360) standardAzimuth -= 360;
```

**Standard Geographic to SunCalc:**
```javascript
sunCalcAzimuth = (standardAzimuth - 180) * Math.PI / 180;
```

#### Example Conversions

| Direction | Standard (from N) | SunCalc Convention |
|-----------|-------------------|-------------------|
| North     | 0° / 360°         | ±180°             |
| East      | 90°               | -90°              |
| South     | 180°              | 0°                |
| West      | 270°              | +90°              |
| Sunrise (Jan, 17°N) | 109° | -71° |
| Sunset (Jan, 17°N)  | 251° | +71° |

### 3D World Coordinate System

SunScope Pro uses a right-handed coordinate system for 3D visualization:

```
        Y (Up/Height)
        |
        |
        |________ X (East)
       /
      /
     Z (South)
```

- **X-axis**: Points East (positive) / West (negative)
- **Y-axis**: Points Up (height above ground)
- **Z-axis**: Points South (positive) / North (negative)
- **Origin**: Center of the site plan at ground level

### Image to World Transformation

Buildings drawn in the 2D editor are transformed to 3D world coordinates:

```
Image Space (pixels) → World Space (meters) → Local Space (building-centered)
```

1. **Center at origin**: Subtract image center from coordinates
2. **Scale to meters**: Multiply by site scale (meters/pixel)
3. **Apply north rotation**: Rotate around Y-axis based on north angle
4. **Center building**: Subtract building centroid for local coordinates

---

## Irradiance Calculations

### Solar Irradiance Formula

The app calculates Direct Normal Irradiance (DNI) using:

```javascript
// Simplified clear-sky irradiance model
const solarConstant = 1361; // W/m² (at top of atmosphere)
const atmosphericTransmittance = 0.7; // Clear sky approximation

// Air mass calculation (Kasten-Young formula)
const zenithAngle = Math.PI / 2 - sunAltitude; // radians
const airMass = 1 / (Math.cos(zenithAngle) + 0.50572 * Math.pow(96.07995 - zenithAngle * 180 / Math.PI, -1.6364));

// Direct Normal Irradiance
const DNI = solarConstant * Math.pow(atmosphericTransmittance, airMass);

// Irradiance on horizontal surface
const horizontalIrradiance = DNI * Math.sin(sunAltitude);
```

### Irradiance Value Ranges

| Condition | Typical Range |
|-----------|---------------|
| Sunrise/Sunset | 0-50 W/m² |
| Morning (8-9 AM) | 200-400 W/m² |
| Midday (Clear Sky) | 800-1000 W/m² |
| Solar Noon (Summer) | 900-1100 W/m² |
| Overcast | 50-300 W/m² |

### Limitations
- Assumes clear sky conditions
- Does not account for clouds, pollution, or humidity
- Simplified atmospheric model
- Does not include diffuse radiation

---

## 3D Scene Architecture

### Rendering Pipeline

```
┌─────────────────┐
│  Building Data  │
│  (from Editor)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Transform      │
│  Footprint      │
│  (pixels→meters)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Create Mesh    │
│  (Three.js)     │
│  - Floors       │
│  - Walls        │
│  - Roof         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Position in    │
│  World Space    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Render with    │
│  Shadows        │
└─────────────────┘
```

### Shadow Calculation

Shadows are rendered using Three.js shadow mapping:

- **Shadow Map Type**: PCFSoftShadowMap (soft shadows)
- **Shadow Map Size**: 4096 x 4096 pixels
- **Shadow Camera**: Directional light with orthographic projection
- **Update Frequency**: On sun position change (throttled)

### Performance Optimizations

1. **Shadow map caching**: Only update when sun moves > 0.5°
2. **Geometry instancing**: Reuse floor geometries
3. **Level of Detail**: Reduce detail for distant buildings
4. **Render throttling**: 60 FPS cap with requestAnimationFrame

---

## Data Export Specifications

### PDF Export

**Content Structure:**
1. Header with project name and date
2. 3D view snapshot (if available)
3. Site information (location, coordinates)
4. Building summary table
5. Hourly solar data table
6. Recommendations

**Image Requirements:**
- Format: PNG embedded as base64
- Resolution: Canvas native resolution
- Requires `preserveDrawingBuffer: true` in WebGL renderer

### CSV Export

**Columns:**
```
Hour, Sun_Altitude_deg, Sun_Azimuth_deg, Irradiance_Wm2, Shadow_Percent, Status
```

**Data Format:**
- Delimiter: Comma
- Decimal: Period
- Encoding: UTF-8
- Line endings: CRLF

### PNG Export

**3D View Snapshot:**
- Captured from WebGL canvas using `toDataURL('image/png')`
- Requires `preserveDrawingBuffer: true` in renderer
- Full canvas resolution

---

## Known Technical Considerations

### 1. WebGL Screenshot Capture

**Issue**: Blank images when exporting PNG or including 3D view in PDF.

**Cause**: WebGL clears the drawing buffer after each frame by default.

**Solution**: Set `preserveDrawingBuffer: true` in WebGLRenderer:
```javascript
const renderer = new THREE.WebGLRenderer({
  preserveDrawingBuffer: true, // Required for screenshots
});
```

### 2. Time Slider Thumb Overflow

**Issue**: Time slider thumb moves outside track bounds at extreme times.

**Cause**: Percentage-based positioning without boundary clamping.

**Solution**: Use CSS `clamp()` function:
```javascript
const thumbPosition = `clamp(0px, calc(${percent}% - 10px), calc(100% - 20px))`;
```

### 3. Large Scale Scene Issues

**Issue**: Buildings appear tiny or scene looks distorted with high scale values.

**Cause**: Applying height scale to footprint dimensions causes massive scenes.

**Solution**: Apply height scale only to vertical dimensions (floor height), not horizontal (footprint).

### 4. Azimuth Display Confusion

**Issue**: Users may be confused by negative azimuth values.

**Cause**: SunCalc uses South-referenced convention vs standard North-referenced.

**Solution**:
- Document the convention difference (this guide)
- Optionally convert to standard convention for display:
```javascript
const standardAzimuth = (sunCalcAzimuth * 180 / Math.PI + 180) % 360;
```

### 5. Mouse Zoom Speed

**Issue**: Mouse wheel zoom is too fast/sensitive.

**Cause**: Default zoomSpeed value too high.

**Solution**: Reduce zoomSpeed in CameraController:
```javascript
zoomSpeed: 0.1, // Reduced from 1.2
```

### 6. Floor Label Visibility

**Issue**: Floor labels hard to see against certain backgrounds.

**Cause**: Label background too similar to building/ground colors.

**Solution**: Use semi-transparent contrasting background:
```javascript
ctx.fillStyle = "rgba(60, 60, 60, 0.45)"; // Lighter semi-transparent
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | Initial | Base solar analysis functionality |
| 1.1.0 | Current | Enhanced 3D visualization, export fixes |

---

## References

- [SunCalc Library](https://github.com/mourner/suncalc)
- [Three.js Documentation](https://threejs.org/docs/)
- [NOAA Solar Calculator](https://gml.noaa.gov/grad/solcalc/)
- [Solar Position Algorithm (NREL)](https://www.nrel.gov/docs/fy08osti/34302.pdf)
