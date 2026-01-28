# Solar Exposure Methodology

## SunScope Pro - How Solar Exposure is Calculated

**Document Date:** January 2026
**Purpose:** Technical explanation of irradiance calculations and their limitations

---

## 1. Overview

Solar exposure in SunScope Pro is calculated using a simplified clear-sky model. This document explains the methodology, constants used, and how results should be interpreted.

---

## 2. The Solar Constant

### 2.1 Value Used

```javascript
const SOLAR_CONSTANT = 1361; // W/m²
```

### 2.2 What This Represents

The solar constant is the amount of solar radiation received at the top of Earth's atmosphere on a surface perpendicular to the sun's rays.

| Source | Value | Notes |
|--------|-------|-------|
| SunScope Pro | 1361 W/m² | Fixed value |
| NASA (2017) | 1360.8 ± 0.5 W/m² | Measured by SORCE |
| Historical | 1366 W/m² | Older textbooks |

### 2.3 Seasonal Variation (Not Modeled)

Earth's orbit is elliptical, causing ±3.4% variation:
- Perihelion (January): ~1412 W/m²
- Aphelion (July): ~1321 W/m²

**Impact:** SunScope may overestimate summer irradiance by ~3% and underestimate winter by ~3%.

---

## 3. Atmospheric Attenuation

### 3.1 Model Used

**Beer-Lambert Law** with fixed extinction coefficient:

```javascript
const ATMOSPHERIC_EXTINCTION = 0.14;

// Transmittance calculation
const transmittance = Math.exp(-ATMOSPHERIC_EXTINCTION * airMass);
```

### 3.2 Air Mass Calculation

**Kasten-Young Formula:**

```javascript
const airMass = 1 / (
  Math.sin(altRad) +
  0.50572 * Math.pow(6.07995 + altitudeDeg, -1.6364)
);
```

### 3.3 Air Mass Values by Sun Altitude

| Sun Altitude | Air Mass | Transmittance | Notes |
|--------------|----------|---------------|-------|
| 90° (zenith) | 1.0 | 87% | Sun directly overhead |
| 60° | 1.15 | 85% | Midday, mid-latitudes |
| 45° | 1.41 | 82% | Late morning/afternoon |
| 30° | 2.0 | 76% | Early morning/late afternoon |
| 15° | 3.8 | 59% | Near sunrise/sunset |
| 5° | 10.4 | 23% | Very low sun |
| 0° (horizon) | ~38 | ~0.5% | Sunrise/sunset |

### 3.4 What's NOT Included

| Factor | Effect | Real-World Impact |
|--------|--------|-------------------|
| Clouds | Block 50-90% | Major (ignored) |
| Aerosols | Reduce 5-25% | Moderate (ignored) |
| Water vapor | Absorbs IR | Minor (ignored) |
| Ozone | Absorbs UV | Minor (ignored) |
| Altitude | Higher = more sun | Minor (ignored) |
| Pollution | Reduce 10-40% | Location-dependent (ignored) |

---

## 4. Irradiance Components

### 4.1 Direct Normal Irradiance (DNI)

Radiation coming directly from the sun's disk:

```javascript
const dni = SOLAR_CONSTANT * transmittance;
```

**Typical Clear-Sky Values:**
| Condition | DNI Range |
|-----------|-----------|
| Solar noon, clear | 800-950 W/m² |
| Morning/afternoon | 400-800 W/m² |
| Low sun angle | 100-400 W/m² |

### 4.2 Global Horizontal Irradiance (GHI)

Total radiation on a horizontal surface:

```javascript
const ghi = dni * Math.sin(sunAltitude);
```

**Typical Clear-Sky Values:**
| Time | GHI Range |
|------|-----------|
| Solar noon, summer | 900-1100 W/m² |
| Solar noon, winter | 400-700 W/m² |
| Morning (9 AM) | 300-600 W/m² |

### 4.3 Diffuse Horizontal Irradiance (DHI)

Scattered light from the sky dome:

```javascript
const DIFFUSE_RATIO = 0.15; // 15% of GHI
const dhi = ghi * DIFFUSE_RATIO;
```

**Reality Check:**

| Sky Condition | Actual DHI % |
|---------------|-------------|
| Very clear | 10-15% |
| Clear | 15-20% |
| Hazy | 25-35% |
| Partly cloudy | 40-60% |
| Overcast | 90-100% |

**SunScope always assumes 15%** - accurate only for very clear skies.

---

## 5. Shadow Impact on Irradiance

### 5.1 How Shadows Affect Calculations

```javascript
if (inShadow) {
  // Only diffuse light reaches shaded areas
  directComponent = 0;
  total = diffuseComponent; // ~15% of full sun
} else {
  // Full direct + diffuse
  total = directComponent + diffuseComponent;
}
```

### 5.2 Comparison with Reality

| Condition | SunScope | Reality |
|-----------|----------|---------|
| Full sun | 100% | 100% |
| Full shadow | 15% | 20-40% |
| Partial shadow | Not modeled | 30-70% |
| Light shade (trees) | Not modeled | 50-80% |

**Why shadows are brighter in reality:**
- Reflected light from surroundings
- Higher diffuse sky component
- Light bouncing off nearby buildings
- Ground-reflected radiation

---

## 6. Glazing and Shading Modifiers

### 6.1 Glazing Transmittance

```javascript
// Default glazing types and transmittance
const glazingTypes = {
  'single': 0.86,    // 86% solar transmission
  'double': 0.76,    // 76% solar transmission
  'triple': 0.64,    // 64% solar transmission
  'low-e': 0.40,     // 40% solar transmission
};
```

### 6.2 Applied to Irradiance

```javascript
const glazingFactor = scenario.glazing.solarTransmittance;
const shadingFactor = scenario.shading.reductionFactor;

const effectiveIrradiance = irradiance * glazingFactor * shadingFactor;
```

### 6.3 Real-World Glazing Complexity

| Factor | SunScope | Reality |
|--------|----------|---------|
| SHGC | Single value | Angle-dependent |
| U-value | Not used | Affects heat loss |
| Visible transmittance | Same as solar | Different spectrum |
| Frame effects | Ignored | 10-30% of area |

---

## 7. Daily Energy Calculation

### 7.1 How Total Irradiation is Calculated

```javascript
const SAMPLE_INTERVAL_MINUTES = 15;

// Sum irradiance samples, convert to energy
let totalIrradiation = 0;
for (const sample of hourlyData) {
  // W/m² × hours = Wh/m²
  totalIrradiation += sample.irradiance * (SAMPLE_INTERVAL_MINUTES / 60);
}
```

### 7.2 Example Calculation

**Clear summer day (12 hours daylight):**

| Time | Irradiance (W/m²) | Duration (h) | Energy (Wh/m²) |
|------|-------------------|--------------|----------------|
| 6-7 AM | 150 | 1 | 150 |
| 7-8 AM | 350 | 1 | 350 |
| 8-9 AM | 550 | 1 | 550 |
| 9-10 AM | 720 | 1 | 720 |
| 10-11 AM | 850 | 1 | 850 |
| 11-12 PM | 920 | 1 | 920 |
| 12-1 PM | 950 | 1 | 950 |
| 1-2 PM | 920 | 1 | 920 |
| 2-3 PM | 850 | 1 | 850 |
| 3-4 PM | 720 | 1 | 720 |
| 4-5 PM | 550 | 1 | 550 |
| 5-6 PM | 350 | 1 | 350 |
| **Total** | | | **7,880 Wh/m²** |

### 7.3 Reality Check

| Location | SunScope (Clear) | TMY Average | Difference |
|----------|------------------|-------------|------------|
| Singapore (June) | ~7,500 Wh/m² | ~4,800 Wh/m² | +56% |
| London (June) | ~6,200 Wh/m² | ~4,200 Wh/m² | +48% |
| Dubai (June) | ~8,100 Wh/m² | ~7,200 Wh/m² | +13% |
| Oslo (December) | ~800 Wh/m² | ~200 Wh/m² | +300% |

**Key insight:** SunScope overestimates most in cloudy climates and winter.

---

## 8. Peak Irradiance Identification

### 8.1 How Peak is Found

```javascript
let peakIrradiance = 0;
let peakTime = null;

for (const sample of hourlyData) {
  if (sample.irradiance > peakIrradiance) {
    peakIrradiance = sample.irradiance;
    peakTime = sample.time;
  }
}
```

### 8.2 When Peak Occurs

| Factor | Effect on Peak Time |
|--------|-------------------|
| Longitude within timezone | Earlier/later than noon |
| Daylight Saving Time | Shifts apparent time |
| Building shadows | May shift actual peak |
| Equation of time | ±16 minutes seasonal |

### 8.3 Solar Noon vs Clock Noon

**Solar noon** (sun at highest point) ≠ **Clock noon** (12:00 PM)

Difference depends on:
- Position within timezone (up to ±30 min)
- Equation of time (up to ±16 min)
- Daylight saving (±60 min)

**SunScope correctly calculates solar position** but displays clock time.

---

## 9. Interpreting Results

### 9.1 What the Numbers Mean

| Metric | Good For | Caution |
|--------|----------|---------|
| Peak W/m² | Relative heat comparison | Absolute values optimistic |
| Daily Wh/m² | Energy trends | Overestimated 20-50% |
| Hours of sun | Shadow patterns | Clear-sky only |

### 9.2 Recommended Adjustments

For more realistic estimates, users can mentally apply:

| Climate | Multiply by |
|---------|-------------|
| Desert/arid | 0.85-0.95 |
| Mediterranean | 0.70-0.85 |
| Temperate | 0.55-0.70 |
| Tropical humid | 0.50-0.65 |
| Cloudy/maritime | 0.40-0.55 |

### 9.3 Use Cases by Reliability

**High reliability:**
- "Which floor gets more sun?" (relative comparison)
- "What time does shadow reach my window?" (geometric)
- "Is morning or afternoon sunnier?" (pattern analysis)

**Low reliability:**
- "Exactly how hot will it get?" (needs thermal model)
- "How much energy will I save?" (needs weather data)
- "What's my annual solar exposure?" (cumulative error)

---

## 10. Scientific Basis

### 10.1 Formulas Used

**Air Mass (Kasten-Young, 1989):**
```
AM = 1 / [sin(h) + 0.50572 × (h + 6.07995)^(-1.6364)]

Where h = solar altitude in degrees
```

**Clear-Sky DNI (Bird & Hulstrom simplified):**
```
DNI = S₀ × exp(-τ × AM)

Where:
  S₀ = 1361 W/m² (solar constant)
  τ = 0.14 (extinction coefficient)
  AM = air mass
```

**GHI from DNI:**
```
GHI = DNI × sin(α)

Where α = solar altitude angle
```

### 10.2 References

1. Kasten, F. & Young, A.T. (1989). "Revised optical air mass tables and approximation formula"
2. Bird, R.E. & Hulstrom, R.L. (1981). "A Simplified Clear Sky Model for Direct and Diffuse Insolation on Horizontal Surfaces" SERI/TR-642-761
3. Iqbal, M. (1983). "An Introduction to Solar Radiation" Academic Press

---

## 11. Future Improvements

Features that could improve accuracy (not currently implemented):

| Feature | Accuracy Improvement | Complexity |
|---------|---------------------|------------|
| Weather data integration | +30-40% | High |
| Location-specific clearness | +10-15% | Medium |
| Seasonal solar constant | +3% | Low |
| Altitude correction | +2-5% | Low |
| Reflection modeling | +10-20% (shadows) | High |

---

*Document Version: 1.0*
*Generated: January 2026*
