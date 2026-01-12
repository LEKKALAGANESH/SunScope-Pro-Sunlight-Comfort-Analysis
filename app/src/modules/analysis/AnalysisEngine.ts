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
} from '../../types';
import { getShadowCalculator } from './ShadowCalculator';

const SAMPLE_INTERVAL_MINUTES = 15;
const SOLAR_CONSTANT = 1361; // W/m²
const ATMOSPHERIC_EXTINCTION = 0.14;
const DIFFUSE_RATIO = 0.15; // ~15% diffuse component for clear sky

// Default scenario values when no scenario is provided
const DEFAULT_SCENARIO: Scenario = {
  id: 'default',
  name: 'Default',
  isActive: true,
  window: { state: 'closed', ventilationFactor: 0 },
  glazing: { type: 'double', solarTransmittance: 0.76 },
  shading: { interior: 'none', exterior: 'none', reductionFactor: 1 },
};

export class AnalysisEngine {
  private location: Location;
  private buildings: Building[];
  private targetBuilding: Building | null;
  private targetFloor: number | null;
  private scenario: Scenario;

  constructor(
    location: Location,
    buildings: Building[],
    targetBuildingId?: string,
    targetFloor?: number,
    scenario?: Scenario
  ) {
    this.location = location;
    this.buildings = buildings;
    this.targetBuilding = targetBuildingId
      ? buildings.find((b) => b.id === targetBuildingId) || null
      : null;
    this.targetFloor = targetFloor || null;
    this.scenario = scenario || DEFAULT_SCENARIO;
  }

  analyze(date: Date): AnalysisResults {
    const hourlyData = this.generateHourlyData(date);
    const sunlight = this.analyzeSunlight(hourlyData);
    const solar = this.analyzeSolar(hourlyData);
    const comfort = this.analyzeComfort(sunlight, solar);

    return {
      targetId: this.targetBuilding?.id || 'site',
      targetType: this.targetBuilding ? (this.targetFloor ? 'floor' : 'building') : 'site',
      floor: this.targetFloor || undefined,
      date,
      sunlight,
      solar,
      comfort,
      hourlyData,
    };
  }

  private generateHourlyData(date: Date): HourlyDataPoint[] {
    const { latitude, longitude } = this.location;
    const sunTimes = SunCalc.getTimes(date, latitude, longitude);
    const data: HourlyDataPoint[] = [];

    // Get shadow calculator and clear cache for new analysis
    const shadowCalc = getShadowCalculator();
    shadowCalc.clearCache();

    // Generate samples from sunrise to sunset
    const startTime = new Date(sunTimes.sunrise);
    const endTime = new Date(sunTimes.sunset);

    // Calculate target height for shadow analysis
    const targetHeight = this.targetFloor && this.targetBuilding
      ? (this.targetFloor - 0.5) * this.targetBuilding.floorHeight
      : this.targetBuilding
        ? this.targetBuilding.totalHeight / 2
        : 0;

    // Get target point for shadow analysis (center of target building or site center)
    const targetPoint = this.targetBuilding
      ? this.getPolygonCenter(this.targetBuilding.footprint)
      : this.getSiteCenter();

    let current = new Date(startTime);
    while (current <= endTime) {
      const sunPosition = SunCalc.getPosition(current, latitude, longitude);
      const altitudeDeg = (sunPosition.altitude * 180) / Math.PI;
      const azimuthDeg = (sunPosition.azimuth * 180) / Math.PI;

      // Sun position in radians for shadow calculator
      const sunPosRad = {
        altitude: sunPosition.altitude,
        azimuth: sunPosition.azimuth,
      };

      // Calculate shadow status using improved shadow calculator
      let inShadow = false;
      let shadowPercent = 0;

      if (this.targetBuilding && this.buildings.length > 1) {
        // Use improved shadow polygon testing
        inShadow = shadowCalc.isPointInShadow(
          targetPoint,
          this.buildings,
          sunPosRad,
          this.targetBuilding.id,
          targetHeight
        );

        // Calculate shadow coverage percentage for the building footprint
        if (altitudeDeg > 0) {
          shadowPercent = shadowCalc.calculateShadowCoverage(
            this.targetBuilding,
            this.buildings,
            sunPosRad,
            targetHeight,
            8 // Sample density
          );
        } else {
          shadowPercent = 100;
        }
      }

      // Calculate irradiance with diffuse component
      const { total: irradianceTotal } = this.calculateIrradiance(
        altitudeDeg,
        inShadow
      );

      data.push({
        hour: current.getHours(),
        time: new Date(current),
        sunAltitude: altitudeDeg,
        sunAzimuth: azimuthDeg,
        inShadow,
        irradiance: irradianceTotal,
        shadowPercent,
      });

      current = new Date(current.getTime() + SAMPLE_INTERVAL_MINUTES * 60 * 1000);
    }

    return data;
  }

  /**
   * Get the center of the entire site (average of all building centers)
   */
  private getSiteCenter(): Point2D {
    if (this.buildings.length === 0) {
      return { x: 0, y: 0 };
    }

    const centers = this.buildings.map((b) => this.getPolygonCenter(b.footprint));
    const x = centers.reduce((sum, c) => sum + c.x, 0) / centers.length;
    const y = centers.reduce((sum, c) => sum + c.y, 0) / centers.length;

    return { x, y };
  }

  /**
   * Calculate irradiance including both direct and diffuse components
   *
   * Direct Normal Irradiance (DNI): Solar radiation from the sun's direction
   * Diffuse Horizontal Irradiance (DHI): Scattered skylight from all directions
   *
   * When in shadow, only diffuse radiation is received.
   * Clear-sky model with ~15% diffuse component.
   */
  private calculateIrradiance(
    altitudeDeg: number,
    inShadow: boolean
  ): { direct: number; diffuse: number; total: number } {
    if (altitudeDeg <= 0) {
      return { direct: 0, diffuse: 0, total: 0 };
    }

    const altRad = (altitudeDeg * Math.PI) / 180;

    // Calculate air mass using Kasten-Young formula
    const airMass =
      1 / (Math.sin(altRad) + 0.50572 * Math.pow(6.07995 + altitudeDeg, -1.6364));

    // Atmospheric transmittance
    const transmittance = Math.exp(-ATMOSPHERIC_EXTINCTION * airMass);

    // Direct Normal Irradiance (on a surface perpendicular to sun)
    const dni = SOLAR_CONSTANT * transmittance;

    // Global Horizontal Irradiance (on horizontal surface)
    const ghi = dni * Math.sin(altRad);

    // Diffuse Horizontal Irradiance (simplified isotropic sky model)
    // Typically 10-20% of GHI for clear sky, using 15%
    const dhi = ghi * DIFFUSE_RATIO;

    // Apply scenario modifiers
    const glazingFactor = this.scenario.glazing.solarTransmittance;
    const shadingFactor = this.scenario.shading.reductionFactor;

    // Calculate effective irradiance based on shadow status
    let directComponent = 0;
    let diffuseComponent = dhi * glazingFactor * shadingFactor;

    if (!inShadow) {
      // Full direct + diffuse when not in shadow
      directComponent = ghi * glazingFactor * shadingFactor;
    }

    // Total irradiance
    const total = inShadow
      ? diffuseComponent // Only diffuse when in shadow
      : directComponent + diffuseComponent;

    return {
      direct: directComponent,
      diffuse: diffuseComponent,
      total,
    };
  }

  private getPolygonCenter(points: Point2D[]): Point2D {
    const x = points.reduce((sum, p) => sum + p.x, 0) / points.length;
    const y = points.reduce((sum, p) => sum + p.y, 0) / points.length;
    return { x, y };
  }

  private analyzeSunlight(hourlyData: HourlyDataPoint[]): SunlightResults {
    const sunnyPoints = hourlyData.filter((d) => !d.inShadow && d.sunAltitude > 0);

    const firstSunTime = sunnyPoints.length > 0 ? sunnyPoints[0].time : null;
    const lastSunTime =
      sunnyPoints.length > 0 ? sunnyPoints[sunnyPoints.length - 1].time : null;

    const totalMinutes = sunnyPoints.length * SAMPLE_INTERVAL_MINUTES;
    const totalHours = totalMinutes / 60;

    // Find continuous blocks
    const continuousBlocks = this.findContinuousBlocks(hourlyData);

    return {
      firstSunTime,
      lastSunTime,
      totalHours,
      directHours: totalHours, // Same for now (no indirect model)
      continuousBlocks,
    };
  }

  private findContinuousBlocks(hourlyData: HourlyDataPoint[]): TimeBlock[] {
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

  private analyzeSolar(hourlyData: HourlyDataPoint[]): SolarResults {
    let peakIrradiance = 0;
    let peakTime: Date | null = null;
    let totalIrradiation = 0;

    for (const sample of hourlyData) {
      if (sample.irradiance > peakIrradiance) {
        peakIrradiance = sample.irradiance;
        peakTime = sample.time;
      }

      // Convert W/m² to Wh/m² for interval
      totalIrradiation += sample.irradiance * (SAMPLE_INTERVAL_MINUTES / 60);
    }

    return {
      peakIrradiance,
      dailyIrradiation: totalIrradiation,
      peakTime,
    };
  }

  private analyzeComfort(
    sunlight: SunlightResults,
    solar: SolarResults
  ): ComfortResults {
    // Calculate comfort score (0-100)
    let score = 70; // Base score

    // Adjust for sun hours
    if (sunlight.totalHours < 2) {
      score -= 20; // Too little sun
    } else if (sunlight.totalHours > 8) {
      score -= (sunlight.totalHours - 8) * 3; // Too much direct sun
    } else if (sunlight.totalHours >= 4 && sunlight.totalHours <= 6) {
      score += 10; // Ideal range
    }

    // Adjust for peak irradiance (already modified by scenario glazing/shading)
    if (solar.peakIrradiance > 800) {
      score -= 15;
    } else if (solar.peakIrradiance > 600) {
      score -= 10;
    }

    // Apply scenario-based adjustments

    // Glazing quality bonus (better glazing = more comfort)
    const glazingBonus = this.getGlazingComfortBonus();
    score += glazingBonus;

    // Shading effectiveness bonus (good shading = more comfort in sunny conditions)
    if (sunlight.totalHours > 4 && this.scenario.shading.reductionFactor < 0.8) {
      // Effective shading when there's significant sun exposure
      score += Math.round((1 - this.scenario.shading.reductionFactor) * 15);
    }

    // Ventilation bonus (open windows = better comfort if not too hot)
    if (this.scenario.window.state === 'open') {
      const ventilationBonus = this.scenario.window.ventilationFactor * 10;
      // Reduce bonus if peak irradiance is very high (hot outside)
      if (solar.peakIrradiance > 700) {
        score += ventilationBonus * 0.3; // Less benefit when it's hot
      } else {
        score += ventilationBonus;
      }
    }

    // Clamp score
    score = Math.max(0, Math.min(100, Math.round(score)));

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high';
    if (score >= 70) {
      riskLevel = 'low';
    } else if (score >= 40) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'high';
    }

    // Find peak heat period
    const peakHeatPeriod =
      sunlight.continuousBlocks.length > 0
        ? sunlight.continuousBlocks.reduce((longest, block) =>
            block.durationMinutes > longest.durationMinutes ? block : longest
          )
        : null;

    // Generate recommendations
    const recommendations = this.generateRecommendations(sunlight, solar, score);

    return {
      riskLevel,
      score,
      peakHeatPeriod,
      recommendations,
    };
  }

  private getGlazingComfortBonus(): number {
    // Better glazing types provide comfort advantages
    switch (this.scenario.glazing.type) {
      case 'low-e':
        return 8; // Best insulation and solar control
      case 'triple':
        return 5; // Excellent insulation
      case 'double':
        return 2; // Standard modern glazing
      case 'single':
        return -5; // Poor insulation, less comfort
      default:
        return 0;
    }
  }

  private generateRecommendations(
    sunlight: SunlightResults,
    solar: SolarResults,
    score: number
  ): string[] {
    const recommendations: string[] = [];

    // Best natural light period
    if (sunlight.firstSunTime && sunlight.lastSunTime) {
      recommendations.push(
        `Best natural light: ${this.formatTime(sunlight.firstSunTime)} to ${this.formatTime(sunlight.lastSunTime)} (${sunlight.totalHours.toFixed(1)} hours total)`
      );
    }

    // Window opening strategy with specific times
    if (sunlight.firstSunTime && solar.peakTime) {
      const openTime = sunlight.firstSunTime;
      const peakTime = solar.peakTime;

      // Calculate optimal ventilation window (before peak heat)
      const closeBy = new Date(peakTime);
      closeBy.setHours(closeBy.getHours() - 1);

      // Calculate when to re-open (after peak passes)
      const reopenTime = new Date(peakTime);
      reopenTime.setHours(reopenTime.getHours() + 2);

      if (solar.peakIrradiance > 500) {
        recommendations.push(
          `Morning ventilation: Open windows ${this.formatTime(openTime)} - ${this.formatTime(closeBy)} before heat builds`
        );

        if (sunlight.lastSunTime && reopenTime < sunlight.lastSunTime) {
          recommendations.push(
            `Evening ventilation: Re-open windows after ${this.formatTime(reopenTime)} when heat subsides`
          );
        }
      } else {
        recommendations.push(
          `Windows can remain open throughout the day (low heat risk)`
        );
      }
    }

    // Heat warning with specific peak time and duration
    const effectiveIrradiance = solar.peakIrradiance;
    if (effectiveIrradiance > 700 && solar.peakTime) {
      const startTime = new Date(solar.peakTime);
      startTime.setHours(startTime.getHours() - 1);
      const endTime = new Date(solar.peakTime);
      endTime.setHours(endTime.getHours() + 2);

      // Different message based on current shading setup
      if (this.scenario.shading.reductionFactor >= 0.9) {
        recommendations.push(
          `Peak heat at ${this.formatTime(solar.peakTime)} (${Math.round(effectiveIrradiance)} W/m²). Close blinds ${this.formatTime(startTime)} - ${this.formatTime(endTime)}`
        );
      } else {
        const reductionPercent = Math.round((1 - this.scenario.shading.reductionFactor) * 100);
        recommendations.push(
          `Heat managed: ${this.scenario.shading.interior} active reduces peak heat (${this.formatTime(solar.peakTime)}) by ${reductionPercent}%`
        );
      }
    } else if (effectiveIrradiance > 500 && solar.peakTime) {
      recommendations.push(
        `Moderate heat at ${this.formatTime(solar.peakTime)} (${Math.round(effectiveIrradiance)} W/m²). Consider shading.`
      );
    }

    // Glazing-specific recommendations with energy impact
    if (this.scenario.glazing.type === 'single' && solar.dailyIrradiation > 3000) {
      const potentialReduction = Math.round(solar.dailyIrradiation * 0.45);
      recommendations.push(
        `Upgrade glazing: Low-E glass could reduce daily heat gain by ~${potentialReduction} Wh/m²`
      );
    } else if (this.scenario.glazing.type === 'low-e') {
      const reductionPercent = Math.round((1 - this.scenario.glazing.solarTransmittance) * 100);
      recommendations.push(
        `Low-E glass blocking ${reductionPercent}% of solar heat (saving ~${Math.round(solar.dailyIrradiation * 0.3)} Wh/m² daily)`
      );
    }

    // Glare warning with specific times from continuous blocks
    if (sunlight.continuousBlocks.length > 0) {
      const afternoonBlocks = sunlight.continuousBlocks.filter(b => {
        const hour = b.start.getHours();
        return hour >= 14 && hour < 18;
      });

      if (afternoonBlocks.length > 0) {
        const block = afternoonBlocks[0];
        if (this.scenario.shading.interior === 'none') {
          recommendations.push(
            `Glare risk: ${this.formatTime(block.start)} - ${this.formatTime(block.end)}. Add blinds for screen visibility`
          );
        } else {
          recommendations.push(
            `Deploy ${this.scenario.shading.interior} during ${this.formatTime(block.start)} - ${this.formatTime(block.end)} to prevent glare`
          );
        }
      }
    }

    // Ventilation impact estimation
    if (this.scenario.window.state === 'closed' && score < 60 && solar.peakIrradiance < 700) {
      recommendations.push(
        `Tip: Opening windows could improve comfort score from ${score} to ~${Math.min(100, score + 10)}`
      );
    } else if (this.scenario.window.state === 'open' && solar.peakIrradiance > 700 && solar.peakTime) {
      const closeStart = new Date(solar.peakTime);
      closeStart.setMinutes(closeStart.getMinutes() - 30);
      const closeEnd = new Date(solar.peakTime);
      closeEnd.setHours(closeEnd.getHours() + 1);
      recommendations.push(
        `Close windows ${this.formatTime(closeStart)} - ${this.formatTime(closeEnd)} to block hot outside air`
      );
    }

    // Morning sun for plants with specific time
    if (sunlight.firstSunTime) {
      const hour = sunlight.firstSunTime.getHours();
      if (hour < 10) {
        recommendations.push(
          `Morning sun ${this.formatTime(sunlight.firstSunTime)}: Ideal for plants needing gentle light`
        );
      }
    }

    // Low sun warning with artificial light suggestion
    if (sunlight.totalHours < 2) {
      recommendations.push(
        `Only ${sunlight.totalHours.toFixed(1)} hrs sunlight. Use 400+ lux task lighting for workspaces`
      );
    }

    return recommendations;
  }

  private formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }
}

// Factory function for easy use
export function runAnalysis(
  date: Date,
  location: Location,
  buildings: Building[],
  targetBuildingId?: string,
  targetFloor?: number,
  scenario?: Scenario
): AnalysisResults {
  const engine = new AnalysisEngine(
    location,
    buildings,
    targetBuildingId,
    targetFloor,
    scenario
  );
  return engine.analyze(date);
}
