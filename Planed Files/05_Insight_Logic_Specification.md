# Insight Logic Specification

## Open-Access Site Sunlight & Massing Tool — Algorithms & Metrics

---

## 1. Sun Position Calculation

### 1.1 Core Algorithm

Uses the SunCalc.js library, which implements the NOAA Solar Calculator algorithm.

```typescript
// Input
interface SunInput {
  date: Date;
  latitude: number;   // -90 to 90
  longitude: number;  // -180 to 180
}

// Output
interface SunPosition {
  azimuth: number;    // Radians from south, west positive
  altitude: number;   // Radians above horizon
}

// Usage
import SunCalc from 'suncalc';

function getSunPosition(input: SunInput): SunPosition {
  const pos = SunCalc.getPosition(input.date, input.latitude, input.longitude);
  return {
    azimuth: pos.azimuth,      // Convert to degrees: azimuth * 180 / Math.PI
    altitude: pos.altitude      // Convert to degrees: altitude * 180 / Math.PI
  };
}

// Get sun times (sunrise, sunset, etc.)
function getSunTimes(date: Date, lat: number, lon: number) {
  return SunCalc.getTimes(date, lat, lon);
  // Returns: { sunrise, sunset, solarNoon, dawn, dusk, ... }
}
```

### 1.2 Sun Direction Vector

Convert sun position to 3D direction vector for shadow calculations:

```typescript
function sunToDirectionVector(azimuth: number, altitude: number): Vector3 {
  // Azimuth: 0 = South, positive = West
  // Convert to scene coordinates where Y is up, -Z is North

  const altRad = altitude * Math.PI / 180;
  const aziRad = azimuth * Math.PI / 180;

  // Direction FROM sun TO ground (shadow direction)
  return {
    x: -Math.sin(aziRad) * Math.cos(altRad),
    y: -Math.sin(altRad),
    z: -Math.cos(aziRad) * Math.cos(altRad)
  };
}
```

---

## 2. Shadow Calculation

### 2.1 Ray-Based Shadow Test

For each sample point, cast a ray toward the sun and check for intersections:

```typescript
function isPointInShadow(
  point: Vector3,
  sunDirection: Vector3,
  buildings: Building[]
): boolean {
  // Create ray from point toward sun
  const rayOrigin = point;
  const rayDirection = {
    x: -sunDirection.x,
    y: -sunDirection.y,
    z: -sunDirection.z
  };

  // Check intersection with all building geometries
  for (const building of buildings) {
    if (rayIntersectsBuilding(rayOrigin, rayDirection, building)) {
      return true;  // In shadow
    }
  }

  return false;  // Not in shadow
}

function rayIntersectsBuilding(
  origin: Vector3,
  direction: Vector3,
  building: Building
): boolean {
  // Use Three.js Raycaster for actual implementation
  // Simplified pseudo-code:

  // 1. Test against each face of the building
  // 2. If ray intersects face AND intersection is between origin and sun
  // 3. Return true

  // Three.js implementation:
  const raycaster = new THREE.Raycaster(
    new THREE.Vector3(origin.x, origin.y, origin.z),
    new THREE.Vector3(direction.x, direction.y, direction.z).normalize()
  );

  const intersects = raycaster.intersectObject(building.mesh, true);
  return intersects.length > 0;
}
```

### 2.2 Shadow Map Generation

For visualization, render shadows using Three.js shadow mapping:

```typescript
function setupShadows(scene: THREE.Scene, sunDirection: Vector3) {
  const light = new THREE.DirectionalLight(0xffffff, 1);

  // Position light far away in sun direction
  const sunDistance = 1000;
  light.position.set(
    -sunDirection.x * sunDistance,
    -sunDirection.y * sunDistance,
    -sunDirection.z * sunDistance
  );

  light.castShadow = true;
  light.shadow.mapSize.width = 2048;
  light.shadow.mapSize.height = 2048;
  light.shadow.camera.near = 0.5;
  light.shadow.camera.far = 2000;

  // Adjust shadow camera to cover scene
  const sceneSize = calculateSceneBounds(scene);
  light.shadow.camera.left = -sceneSize;
  light.shadow.camera.right = sceneSize;
  light.shadow.camera.top = sceneSize;
  light.shadow.camera.bottom = -sceneSize;

  scene.add(light);
}
```

---

## 3. Sunlight Timing Analysis

### 3.1 Sampling Strategy

```typescript
const SAMPLE_INTERVAL_MINUTES = 15;  // Sample every 15 minutes
const SAMPLES_PER_DAY = 24 * 60 / SAMPLE_INTERVAL_MINUTES;  // 96 samples

function generateSampleTimes(date: Date, lat: number, lon: number): Date[] {
  const sunTimes = SunCalc.getTimes(date, lat, lon);
  const samples: Date[] = [];

  // Only sample during daylight hours
  const startTime = sunTimes.sunrise;
  const endTime = sunTimes.sunset;

  let current = new Date(startTime);
  while (current <= endTime) {
    samples.push(new Date(current));
    current = new Date(current.getTime() + SAMPLE_INTERVAL_MINUTES * 60 * 1000);
  }

  return samples;
}
```

### 3.2 Sun Hours Calculation

```typescript
interface SunHoursResult {
  firstSunTime: Date | null;
  lastSunTime: Date | null;
  totalMinutes: number;
  directMinutes: number;
  samples: SampleResult[];
}

function calculateSunHours(
  targetPoints: Vector3[],
  date: Date,
  location: { lat: number; lon: number },
  buildings: Building[]
): SunHoursResult {
  const sampleTimes = generateSampleTimes(date, location.lat, location.lon);
  const results: SampleResult[] = [];

  let firstSunTime: Date | null = null;
  let lastSunTime: Date | null = null;
  let sunMinutes = 0;

  for (const time of sampleTimes) {
    const sunPos = SunCalc.getPosition(time, location.lat, location.lon);

    // Skip if sun is below horizon
    if (sunPos.altitude <= 0) continue;

    const sunDir = sunToDirectionVector(
      sunPos.azimuth * 180 / Math.PI,
      sunPos.altitude * 180 / Math.PI
    );

    // Check if ANY target point receives sun
    let receivingSun = false;
    let pointsInSun = 0;

    for (const point of targetPoints) {
      if (!isPointInShadow(point, sunDir, buildings)) {
        receivingSun = true;
        pointsInSun++;
      }
    }

    results.push({
      time,
      altitude: sunPos.altitude * 180 / Math.PI,
      azimuth: sunPos.azimuth * 180 / Math.PI,
      inSun: receivingSun,
      percentageInSun: pointsInSun / targetPoints.length * 100
    });

    if (receivingSun) {
      if (!firstSunTime) firstSunTime = time;
      lastSunTime = time;
      sunMinutes += SAMPLE_INTERVAL_MINUTES;
    }
  }

  return {
    firstSunTime,
    lastSunTime,
    totalMinutes: sunMinutes,
    directMinutes: sunMinutes,  // Same for now (no indirect model)
    samples: results
  };
}
```

### 3.3 Continuous vs Intermittent Detection

```typescript
interface TimeBlock {
  start: Date;
  end: Date;
  durationMinutes: number;
}

function findContinuousBlocks(samples: SampleResult[]): TimeBlock[] {
  const blocks: TimeBlock[] = [];
  let currentBlock: TimeBlock | null = null;

  for (const sample of samples) {
    if (sample.inSun) {
      if (!currentBlock) {
        // Start new block
        currentBlock = {
          start: sample.time,
          end: sample.time,
          durationMinutes: SAMPLE_INTERVAL_MINUTES
        };
      } else {
        // Extend current block
        currentBlock.end = sample.time;
        currentBlock.durationMinutes += SAMPLE_INTERVAL_MINUTES;
      }
    } else {
      if (currentBlock) {
        // End current block
        blocks.push(currentBlock);
        currentBlock = null;
      }
    }
  }

  // Don't forget last block
  if (currentBlock) {
    blocks.push(currentBlock);
  }

  return blocks;
}

function isIntermittent(blocks: TimeBlock[]): boolean {
  // Consider intermittent if more than 2 blocks
  // or any gap longer than 30 minutes during expected sun hours
  return blocks.length > 2;
}
```

---

## 4. Solar Irradiance Estimation

### 4.1 Clear-Sky Direct Normal Irradiance

Simplified model based on sun altitude:

```typescript
const SOLAR_CONSTANT = 1361;  // W/m² (extraterrestrial)
const ATMOSPHERIC_EXTINCTION = 0.14;  // Typical clear atmosphere

function calculateDirectNormalIrradiance(sunAltitudeDeg: number): number {
  if (sunAltitudeDeg <= 0) return 0;

  // Air mass calculation (Kasten-Young formula simplified)
  const altRad = sunAltitudeDeg * Math.PI / 180;
  const airMass = 1 / (Math.sin(altRad) + 0.50572 * Math.pow(6.07995 + sunAltitudeDeg, -1.6364));

  // Atmospheric attenuation
  const transmittance = Math.exp(-ATMOSPHERIC_EXTINCTION * airMass);

  // Direct normal irradiance
  const dni = SOLAR_CONSTANT * transmittance;

  return dni;
}
```

### 4.2 Surface Irradiance

Irradiance on a surface depends on angle of incidence:

```typescript
function calculateSurfaceIrradiance(
  dni: number,
  sunDirection: Vector3,
  surfaceNormal: Vector3
): number {
  // Cosine of angle between sun and surface normal
  const cosAngle = Math.max(0, dotProduct(
    normalize(negate(sunDirection)),  // Direction TO sun
    normalize(surfaceNormal)
  ));

  return dni * cosAngle;
}

// For horizontal surface (ground/roof):
function calculateHorizontalIrradiance(dni: number, sunAltitudeDeg: number): number {
  const altRad = sunAltitudeDeg * Math.PI / 180;
  return dni * Math.sin(altRad);
}
```

### 4.3 Daily Irradiation

Cumulative solar energy over the day:

```typescript
function calculateDailyIrradiation(
  samples: SampleResult[],
  surfaceNormal: Vector3
): number {
  let totalWh = 0;

  for (const sample of samples) {
    if (!sample.inSun) continue;

    const dni = calculateDirectNormalIrradiance(sample.altitude);
    const sunDir = sunToDirectionVector(sample.azimuth, sample.altitude);
    const surfaceIrradiance = calculateSurfaceIrradiance(dni, sunDir, surfaceNormal);

    // Convert W/m² to Wh/m² for sample interval
    const hoursInterval = SAMPLE_INTERVAL_MINUTES / 60;
    totalWh += surfaceIrradiance * hoursInterval;
  }

  return totalWh;  // Wh/m² per day
}
```

---

## 5. Heat Impact & Comfort Score

### 5.1 Solar Heat Gain Factor

Simplified model considering glazing:

```typescript
interface GlazingProperties {
  solarTransmittance: number;  // SHGC (0-1)
  uValue: number;              // W/m²K (not used in simple model)
}

const GLAZING_PRESETS: Record<string, GlazingProperties> = {
  'single': { solarTransmittance: 0.86, uValue: 5.8 },
  'double': { solarTransmittance: 0.76, uValue: 2.8 },
  'triple': { solarTransmittance: 0.65, uValue: 1.8 },
  'low-e':  { solarTransmittance: 0.40, uValue: 1.4 },
};

function calculateSolarHeatGain(
  irradiance: number,           // W/m²
  glazingArea: number,          // m²
  glazingType: string,
  shadingFactor: number = 1.0   // 1 = no shading, 0 = full shading
): number {
  const glazing = GLAZING_PRESETS[glazingType] || GLAZING_PRESETS['double'];

  // Solar heat gain in Watts
  return irradiance * glazingArea * glazing.solarTransmittance * shadingFactor;
}
```

### 5.2 Heat Impact Score

```typescript
interface HeatImpact {
  level: 'low' | 'medium' | 'high';
  score: number;        // 0-100 (higher = more heat)
  peakWatts: number;
  peakTime: Date;
}

function assessHeatImpact(
  samples: SampleResult[],
  dailyIrradiation: number
): HeatImpact {
  // Find peak
  let peakIrradiance = 0;
  let peakTime: Date | null = null;

  for (const sample of samples) {
    if (sample.inSun) {
      const irr = calculateDirectNormalIrradiance(sample.altitude);
      if (irr > peakIrradiance) {
        peakIrradiance = irr;
        peakTime = sample.time;
      }
    }
  }

  // Score based on daily irradiation
  // Thresholds based on typical clear-sky values
  // Max clear-sky horizontal irradiation ~7000 Wh/m²/day (summer, equator)
  const maxExpected = 7000;
  const score = Math.min(100, Math.round(dailyIrradiation / maxExpected * 100));

  // Level thresholds
  let level: 'low' | 'medium' | 'high';
  if (score < 30) level = 'low';
  else if (score < 60) level = 'medium';
  else level = 'high';

  return {
    level,
    score,
    peakWatts: peakIrradiance,
    peakTime: peakTime || new Date()
  };
}
```

### 5.3 Comfort Score

Inverse of heat impact, adjusted for desired conditions:

```typescript
interface ComfortResult {
  score: number;           // 0-100 (higher = more comfortable)
  riskLevel: 'low' | 'medium' | 'high';
  factors: string[];
}

function calculateComfortScore(
  sunHours: number,
  heatImpact: HeatImpact,
  scenario: Scenario
): ComfortResult {
  let score = 100;
  const factors: string[] = [];

  // Deduct for excessive sun exposure
  if (sunHours > 6) {
    score -= (sunHours - 6) * 5;  // -5 per hour over 6
    factors.push('Extended direct sun exposure');
  }

  // Deduct for high heat impact
  score -= heatImpact.score * 0.3;
  if (heatImpact.level === 'high') {
    factors.push('High solar heat gain');
  }

  // Adjust for scenario
  if (scenario.window.state === 'open') {
    score += 10;  // Ventilation helps
    factors.push('Ventilation available');
  }

  if (scenario.shading.interior !== 'none') {
    score += 15;  // Shading helps
    factors.push('Interior shading active');
  }

  if (scenario.glazing.type === 'low-e') {
    score += 10;  // Low-E reduces heat
    factors.push('Low-E glazing reduces heat gain');
  }

  // Clamp score
  score = Math.max(0, Math.min(100, Math.round(score)));

  // Risk level
  let riskLevel: 'low' | 'medium' | 'high';
  if (score >= 70) riskLevel = 'low';
  else if (score >= 40) riskLevel = 'medium';
  else riskLevel = 'high';

  return { score, riskLevel, factors };
}
```

---

## 6. Scenario Comparison

### 6.1 Scenario Modifiers

```typescript
interface ScenarioModifiers {
  heatGainMultiplier: number;
  comfortBonus: number;
}

function getScenarioModifiers(scenario: Scenario): ScenarioModifiers {
  let heatGainMultiplier = 1.0;
  let comfortBonus = 0;

  // Glazing effect
  const glazing = GLAZING_PRESETS[scenario.glazing.type];
  heatGainMultiplier *= glazing.solarTransmittance / GLAZING_PRESETS['double'].solarTransmittance;

  // Shading effect
  const shadingReduction: Record<string, number> = {
    'none': 1.0,
    'blinds': 0.6,
    'curtains': 0.5,
    'heavy-curtains': 0.3
  };
  heatGainMultiplier *= shadingReduction[scenario.shading.interior] || 1.0;

  // Exterior shading
  const exteriorReduction: Record<string, number> = {
    'none': 1.0,
    'awning': 0.5,
    'louvers': 0.4,
    'trees': 0.6
  };
  heatGainMultiplier *= exteriorReduction[scenario.shading.exterior] || 1.0;

  // Window state comfort bonus
  if (scenario.window.state === 'open') {
    comfortBonus += 10;
  }

  return { heatGainMultiplier, comfortBonus };
}
```

### 6.2 Comparison Output

```typescript
interface ScenarioComparison {
  baseline: AnalysisResults;
  modified: AnalysisResults;
  differences: {
    heatImpactChange: number;      // Percentage change
    comfortScoreChange: number;    // Absolute change
    recommendation: string;
  };
}

function compareScenarios(
  baseline: Scenario,
  modified: Scenario,
  baselineResults: AnalysisResults
): ScenarioComparison {
  const baseModifiers = getScenarioModifiers(baseline);
  const modModifiers = getScenarioModifiers(modified);

  // Calculate modified heat impact
  const heatRatio = modModifiers.heatGainMultiplier / baseModifiers.heatGainMultiplier;
  const modifiedHeatScore = baselineResults.comfort.score * heatRatio;

  // Calculate comfort change
  const comfortChange = modModifiers.comfortBonus - baseModifiers.comfortBonus;

  // Generate recommendation
  let recommendation = '';
  if (heatRatio < 0.7) {
    recommendation = 'Significant heat reduction with this configuration.';
  } else if (heatRatio > 1.2) {
    recommendation = 'This configuration increases heat gain.';
  } else {
    recommendation = 'Similar heat performance to baseline.';
  }

  return {
    baseline: baselineResults,
    modified: {
      ...baselineResults,
      comfort: {
        ...baselineResults.comfort,
        score: Math.round(modifiedHeatScore + comfortChange)
      }
    },
    differences: {
      heatImpactChange: Math.round((heatRatio - 1) * 100),
      comfortScoreChange: comfortChange,
      recommendation
    }
  };
}
```

---

## 7. Recommendation Generation

### 7.1 Rule-Based Recommendations

```typescript
interface Recommendation {
  category: 'timing' | 'comfort' | 'efficiency' | 'warning';
  icon: string;
  text: string;
  priority: number;  // 1 = highest
}

function generateRecommendations(
  results: AnalysisResults,
  scenario: Scenario
): Recommendation[] {
  const recs: Recommendation[] = [];

  // === TIMING RECOMMENDATIONS ===

  if (results.sunlight.firstSunTime) {
    const firstHour = results.sunlight.firstSunTime.getHours();

    if (firstHour < 8) {
      recs.push({
        category: 'timing',
        icon: '☀️',
        text: `Morning sun starts at ${formatTime(results.sunlight.firstSunTime)}. Good for natural wake-up light.`,
        priority: 2
      });
    }
  }

  // Best window opening time
  if (results.sunlight.firstSunTime && results.solar.peakTime) {
    const openStart = results.sunlight.firstSunTime;
    const peakHour = results.solar.peakTime.getHours();
    const closeBy = new Date(results.solar.peakTime);
    closeBy.setHours(peakHour - 1);

    recs.push({
      category: 'timing',
      icon: '🪟',
      text: `Best window opening: ${formatTime(openStart)} - ${formatTime(closeBy)} (before heat builds).`,
      priority: 1
    });
  }

  // === COMFORT RECOMMENDATIONS ===

  if (results.comfort.riskLevel === 'high') {
    recs.push({
      category: 'warning',
      icon: '⚠️',
      text: `High heat risk between ${formatTimeRange(results.comfort.peakHeatPeriod)}. Consider shading.`,
      priority: 1
    });
  }

  // Glare warning
  const afternoonSamples = results.hourlyData.filter(
    s => s.hour >= 14 && s.hour <= 16 && !s.inShadow
  );
  if (afternoonSamples.length > 0) {
    recs.push({
      category: 'warning',
      icon: '💻',
      text: 'Afternoon glare risk (14:00-16:00). Consider blinds for screens.',
      priority: 2
    });
  }

  // === EFFICIENCY RECOMMENDATIONS ===

  if (results.sunlight.totalHours > 4) {
    recs.push({
      category: 'efficiency',
      icon: '💡',
      text: `${Math.round(results.sunlight.totalHours)} hours of natural light. Minimize artificial lighting.`,
      priority: 3
    });
  }

  // === SCENARIO-SPECIFIC ===

  if (scenario.shading.interior === 'none' && results.comfort.riskLevel !== 'low') {
    recs.push({
      category: 'comfort',
      icon: '🪞',
      text: 'Adding blinds or curtains would reduce heat and glare.',
      priority: 2
    });
  }

  if (scenario.glazing.type === 'single') {
    recs.push({
      category: 'efficiency',
      icon: '🔄',
      text: 'Upgrading to double glazing would reduce heat gain by ~12%.',
      priority: 3
    });
  }

  // Sort by priority
  return recs.sort((a, b) => a.priority - b.priority);
}
```

### 7.2 Seasonal Comparison

```typescript
interface SeasonalComparison {
  summer: { sunHours: number; heatLevel: string };
  winter: { sunHours: number; heatLevel: string };
  recommendation: string;
}

function compareSeasons(
  location: { lat: number; lon: number },
  targetPoints: Vector3[],
  buildings: Building[]
): SeasonalComparison {
  const year = new Date().getFullYear();

  // Summer solstice (June 21 for Northern Hemisphere, Dec 21 for Southern)
  const summerDate = location.lat >= 0
    ? new Date(year, 5, 21)   // June 21
    : new Date(year, 11, 21); // Dec 21

  // Winter solstice
  const winterDate = location.lat >= 0
    ? new Date(year, 11, 21)  // Dec 21
    : new Date(year, 5, 21);  // June 21

  const summerResults = calculateSunHours(targetPoints, summerDate, location, buildings);
  const winterResults = calculateSunHours(targetPoints, winterDate, location, buildings);

  const summerHours = summerResults.totalMinutes / 60;
  const winterHours = winterResults.totalMinutes / 60;

  let recommendation = '';
  if (summerHours > winterHours * 2) {
    recommendation = 'Significant seasonal variation. Summer shading recommended.';
  } else if (winterHours > summerHours) {
    recommendation = 'More winter sun than summer. Check for summer obstructions.';
  } else {
    recommendation = 'Relatively consistent sun access year-round.';
  }

  return {
    summer: {
      sunHours: Math.round(summerHours * 10) / 10,
      heatLevel: summerHours > 6 ? 'high' : summerHours > 3 ? 'medium' : 'low'
    },
    winter: {
      sunHours: Math.round(winterHours * 10) / 10,
      heatLevel: winterHours > 6 ? 'high' : winterHours > 3 ? 'medium' : 'low'
    },
    recommendation
  };
}
```

---

## 8. Utility Functions

```typescript
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function formatTimeRange(block: TimeBlock): string {
  return `${formatTime(block.start)} - ${formatTime(block.end)}`;
}

function dotProduct(a: Vector3, b: Vector3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function normalize(v: Vector3): Vector3 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function negate(v: Vector3): Vector3 {
  return { x: -v.x, y: -v.y, z: -v.z };
}
```

---

*Document Version: 1.0*
*Date: January 2026*
