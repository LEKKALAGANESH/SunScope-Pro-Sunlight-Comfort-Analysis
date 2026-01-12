/**
 * Analysis Web Worker
 *
 * Runs the sun analysis calculations off the main thread
 * to keep the UI responsive during heavy computations.
 */

import SunCalc from 'suncalc';
import type {
  Building,
  Location,
  AnalysisResults,
  HourlyDataPoint,
  TimeBlock,
  SunlightResults,
  SolarResults,
  ComfortResults,
  Point2D,
  Scenario,
} from '../types';

const SAMPLE_INTERVAL_MINUTES = 15;
const SOLAR_CONSTANT = 1361;
const ATMOSPHERIC_EXTINCTION = 0.14;
const DIFFUSE_RATIO = 0.15;

// Default scenario
const DEFAULT_SCENARIO: Scenario = {
  id: 'default',
  name: 'Default',
  isActive: true,
  window: { state: 'closed', ventilationFactor: 0 },
  glazing: { type: 'double', solarTransmittance: 0.76 },
  shading: { interior: 'none', exterior: 'none', reductionFactor: 1 },
};

interface AnalysisMessage {
  type: 'analyze';
  payload: {
    date: string; // ISO string
    location: Location;
    buildings: Building[];
    targetBuildingId?: string;
    targetFloor?: number;
    scenario?: Scenario;
  };
}

interface AnalysisResponse {
  type: 'result' | 'error' | 'progress';
  payload: AnalysisResults | string | number;
}

// Shadow calculation helpers
function isPointInPolygon(point: Point2D, polygon: Point2D[]): boolean {
  let inside = false;
  const n = polygon.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;

    if ((yi > point.y) !== (yj > point.y) &&
        point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }

  return inside;
}

function getPolygonCenter(points: Point2D[]): Point2D {
  const x = points.reduce((sum, p) => sum + p.x, 0) / points.length;
  const y = points.reduce((sum, p) => sum + p.y, 0) / points.length;
  return { x, y };
}

function isPointInShadow(
  point: Point2D,
  buildings: Building[],
  sunAltitude: number,
  sunAzimuth: number,
  excludeBuildingId?: string,
  targetHeight: number = 0
): boolean {
  for (const building of buildings) {
    if (building.id === excludeBuildingId) continue;
    if (building.totalHeight <= targetHeight) continue;

    const effectiveHeight = building.totalHeight - targetHeight;
    const shadowLength = effectiveHeight / Math.tan(sunAltitude);
    const shadowDirX = Math.sin(sunAzimuth);
    const shadowDirY = -Math.cos(sunAzimuth);

    const shadowPolygon = building.footprint.map((p) => ({
      x: p.x + shadowDirX * shadowLength,
      y: p.y + shadowDirY * shadowLength,
    }));

    const combinedPolygon = [...building.footprint, ...shadowPolygon];

    if (isPointInPolygon(point, combinedPolygon)) {
      return true;
    }
  }

  return false;
}

function calculateIrradiance(
  altitudeDeg: number,
  inShadow: boolean,
  scenario: Scenario
): { direct: number; diffuse: number; total: number } {
  if (altitudeDeg <= 0) {
    return { direct: 0, diffuse: 0, total: 0 };
  }

  const altRad = (altitudeDeg * Math.PI) / 180;
  const airMass = 1 / (Math.sin(altRad) + 0.50572 * Math.pow(6.07995 + altitudeDeg, -1.6364));
  const transmittance = Math.exp(-ATMOSPHERIC_EXTINCTION * airMass);
  const dni = SOLAR_CONSTANT * transmittance;
  const ghi = dni * Math.sin(altRad);
  const dhi = ghi * DIFFUSE_RATIO;

  const glazingFactor = scenario.glazing.solarTransmittance;
  const shadingFactor = scenario.shading.reductionFactor;

  let directComponent = 0;
  let diffuseComponent = dhi * glazingFactor * shadingFactor;

  if (!inShadow) {
    directComponent = ghi * glazingFactor * shadingFactor;
  }

  const total = inShadow ? diffuseComponent : directComponent + diffuseComponent;

  return { direct: directComponent, diffuse: diffuseComponent, total };
}

function generateHourlyData(
  date: Date,
  location: Location,
  buildings: Building[],
  targetBuilding: Building | null,
  targetFloor: number | null,
  scenario: Scenario
): HourlyDataPoint[] {
  const { latitude, longitude } = location;
  const sunTimes = SunCalc.getTimes(date, latitude, longitude);
  const data: HourlyDataPoint[] = [];

  const startTime = new Date(sunTimes.sunrise);
  const endTime = new Date(sunTimes.sunset);

  const targetHeight = targetFloor && targetBuilding
    ? (targetFloor - 0.5) * targetBuilding.floorHeight
    : targetBuilding
      ? targetBuilding.totalHeight / 2
      : 0;

  const targetPoint = targetBuilding
    ? getPolygonCenter(targetBuilding.footprint)
    : buildings.length > 0
      ? getPolygonCenter(buildings[0].footprint)
      : { x: 0, y: 0 };

  let current = new Date(startTime);
  while (current <= endTime) {
    const sunPosition = SunCalc.getPosition(current, latitude, longitude);
    const altitudeDeg = (sunPosition.altitude * 180) / Math.PI;
    const azimuthDeg = (sunPosition.azimuth * 180) / Math.PI;

    let inShadow = false;

    if (targetBuilding && buildings.length > 1 && altitudeDeg > 0) {
      inShadow = isPointInShadow(
        targetPoint,
        buildings,
        sunPosition.altitude,
        sunPosition.azimuth,
        targetBuilding.id,
        targetHeight
      );
    }

    const { total: irradianceTotal } = calculateIrradiance(altitudeDeg, inShadow, scenario);

    data.push({
      hour: current.getHours(),
      time: new Date(current),
      sunAltitude: altitudeDeg,
      sunAzimuth: azimuthDeg,
      inShadow,
      irradiance: irradianceTotal,
      shadowPercent: inShadow ? 100 : 0,
    });

    current = new Date(current.getTime() + SAMPLE_INTERVAL_MINUTES * 60 * 1000);
  }

  return data;
}

function findContinuousBlocks(hourlyData: HourlyDataPoint[]): TimeBlock[] {
  const blocks: TimeBlock[] = [];
  let currentBlock: TimeBlock | null = null;

  for (const sample of hourlyData) {
    if (!sample.inShadow && sample.sunAltitude > 0) {
      if (!currentBlock) {
        currentBlock = {
          start: sample.time,
          end: sample.time,
          durationMinutes: SAMPLE_INTERVAL_MINUTES,
        };
      } else {
        currentBlock.end = sample.time;
        currentBlock.durationMinutes += SAMPLE_INTERVAL_MINUTES;
      }
    } else {
      if (currentBlock) {
        blocks.push(currentBlock);
        currentBlock = null;
      }
    }
  }

  if (currentBlock) {
    blocks.push(currentBlock);
  }

  return blocks;
}

function analyzeSunlight(hourlyData: HourlyDataPoint[]): SunlightResults {
  const sunnyPoints = hourlyData.filter((d) => !d.inShadow && d.sunAltitude > 0);

  const firstSunTime = sunnyPoints.length > 0 ? sunnyPoints[0].time : null;
  const lastSunTime = sunnyPoints.length > 0 ? sunnyPoints[sunnyPoints.length - 1].time : null;

  const totalMinutes = sunnyPoints.length * SAMPLE_INTERVAL_MINUTES;
  const totalHours = totalMinutes / 60;

  const continuousBlocks = findContinuousBlocks(hourlyData);

  return {
    firstSunTime,
    lastSunTime,
    totalHours,
    directHours: totalHours,
    continuousBlocks,
  };
}

function analyzeSolar(hourlyData: HourlyDataPoint[]): SolarResults {
  let peakIrradiance = 0;
  let peakTime: Date | null = null;
  let totalIrradiation = 0;

  for (const sample of hourlyData) {
    if (sample.irradiance > peakIrradiance) {
      peakIrradiance = sample.irradiance;
      peakTime = sample.time;
    }
    totalIrradiation += sample.irradiance * (SAMPLE_INTERVAL_MINUTES / 60);
  }

  return {
    peakIrradiance,
    dailyIrradiation: totalIrradiation,
    peakTime,
  };
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function generateRecommendations(
  sunlight: SunlightResults,
  solar: SolarResults,
  _score: number,
  scenario: Scenario
): string[] {
  const recommendations: string[] = [];

  if (sunlight.firstSunTime && sunlight.lastSunTime) {
    recommendations.push(
      `Best natural light: ${formatTime(sunlight.firstSunTime)} to ${formatTime(sunlight.lastSunTime)} (${sunlight.totalHours.toFixed(1)} hours total)`
    );
  }

  if (sunlight.firstSunTime && solar.peakTime && solar.peakIrradiance > 500) {
    const closeBy = new Date(solar.peakTime);
    closeBy.setHours(closeBy.getHours() - 1);

    recommendations.push(
      `Morning ventilation: Open windows ${formatTime(sunlight.firstSunTime)} - ${formatTime(closeBy)} before heat builds`
    );
  }

  if (solar.peakIrradiance > 700 && solar.peakTime) {
    const startTime = new Date(solar.peakTime);
    startTime.setHours(startTime.getHours() - 1);
    const endTime = new Date(solar.peakTime);
    endTime.setHours(endTime.getHours() + 2);

    if (scenario.shading.reductionFactor >= 0.9) {
      recommendations.push(
        `Peak heat at ${formatTime(solar.peakTime)} (${Math.round(solar.peakIrradiance)} W/m²). Close blinds ${formatTime(startTime)} - ${formatTime(endTime)}`
      );
    }
  }

  if (sunlight.totalHours >= 4) {
    recommendations.push(
      `${sunlight.totalHours.toFixed(1)} hours of natural light available. Minimize artificial lighting.`
    );
  }

  if (sunlight.totalHours < 2) {
    recommendations.push(
      `Only ${sunlight.totalHours.toFixed(1)} hrs sunlight. Use 400+ lux task lighting for workspaces`
    );
  }

  return recommendations;
}

function analyzeComfort(
  sunlight: SunlightResults,
  solar: SolarResults,
  scenario: Scenario
): ComfortResults {
  let score = 70;

  if (sunlight.totalHours < 2) {
    score -= 20;
  } else if (sunlight.totalHours > 8) {
    score -= (sunlight.totalHours - 8) * 3;
  } else if (sunlight.totalHours >= 4 && sunlight.totalHours <= 6) {
    score += 10;
  }

  if (solar.peakIrradiance > 800) {
    score -= 15;
  } else if (solar.peakIrradiance > 600) {
    score -= 10;
  }

  // Glazing bonus
  switch (scenario.glazing.type) {
    case 'low-e': score += 8; break;
    case 'triple': score += 5; break;
    case 'double': score += 2; break;
    case 'single': score -= 5; break;
  }

  // Shading bonus
  if (sunlight.totalHours > 4 && scenario.shading.reductionFactor < 0.8) {
    score += Math.round((1 - scenario.shading.reductionFactor) * 15);
  }

  // Ventilation bonus
  if (scenario.window.state === 'open') {
    const ventilationBonus = scenario.window.ventilationFactor * 10;
    if (solar.peakIrradiance > 700) {
      score += ventilationBonus * 0.3;
    } else {
      score += ventilationBonus;
    }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let riskLevel: 'low' | 'medium' | 'high';
  if (score >= 70) riskLevel = 'low';
  else if (score >= 40) riskLevel = 'medium';
  else riskLevel = 'high';

  const peakHeatPeriod = sunlight.continuousBlocks.length > 0
    ? sunlight.continuousBlocks.reduce((longest, block) =>
        block.durationMinutes > longest.durationMinutes ? block : longest
      )
    : null;

  const recommendations = generateRecommendations(sunlight, solar, score, scenario);

  return {
    riskLevel,
    score,
    peakHeatPeriod,
    recommendations,
  };
}

function runAnalysis(
  date: Date,
  location: Location,
  buildings: Building[],
  targetBuildingId?: string,
  targetFloor?: number,
  scenario?: Scenario
): AnalysisResults {
  const activeScenario = scenario || DEFAULT_SCENARIO;
  const targetBuilding = targetBuildingId
    ? buildings.find((b) => b.id === targetBuildingId) || null
    : null;

  const hourlyData = generateHourlyData(
    date,
    location,
    buildings,
    targetBuilding,
    targetFloor || null,
    activeScenario
  );

  const sunlight = analyzeSunlight(hourlyData);
  const solar = analyzeSolar(hourlyData);
  const comfort = analyzeComfort(sunlight, solar, activeScenario);

  return {
    targetId: targetBuilding?.id || 'site',
    targetType: targetBuilding ? (targetFloor ? 'floor' : 'building') : 'site',
    floor: targetFloor || undefined,
    date,
    sunlight,
    solar,
    comfort,
    hourlyData,
  };
}

// Worker message handler
self.onmessage = (event: MessageEvent<AnalysisMessage>) => {
  const { type, payload } = event.data;

  if (type === 'analyze') {
    try {
      // Report progress
      self.postMessage({ type: 'progress', payload: 10 } as AnalysisResponse);

      const date = new Date(payload.date);

      self.postMessage({ type: 'progress', payload: 30 } as AnalysisResponse);

      const results = runAnalysis(
        date,
        payload.location,
        payload.buildings,
        payload.targetBuildingId,
        payload.targetFloor,
        payload.scenario
      );

      self.postMessage({ type: 'progress', payload: 90 } as AnalysisResponse);

      // Send results back
      self.postMessage({ type: 'result', payload: results } as AnalysisResponse);
    } catch (error) {
      self.postMessage({
        type: 'error',
        payload: error instanceof Error ? error.message : 'Analysis failed',
      } as AnalysisResponse);
    }
  }
};

export {};
