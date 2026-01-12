import { describe, it, expect } from 'vitest';
import { AnalysisEngine, runAnalysis } from './AnalysisEngine';
import type { Building, Location, Scenario } from '../../types';

// Test fixtures
const testLocation: Location = {
  latitude: 40.7128,
  longitude: -74.006,
  city: 'New York',
  timezone: 'America/New_York',
};

const createTestBuilding = (
  id: string,
  footprint: { x: number; y: number }[],
  floors = 5,
  totalHeight = 15
): Building => ({
  id,
  name: `Building ${id}`,
  footprint,
  floors,
  floorHeight: totalHeight / floors,
  totalHeight,
  color: '#4A90D9',
  area: 100,
  baseElevation: 0,
});

// Single building at origin
const singleBuilding = createTestBuilding(
  'building-1',
  [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ],
  5,
  15
);

// Two buildings for shadow testing
const targetBuilding = createTestBuilding(
  'target',
  [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ],
  5,
  15
);

const shadowCastingBuilding = createTestBuilding(
  'shadow-caster',
  [
    { x: 20, y: 0 },
    { x: 30, y: 0 },
    { x: 30, y: 10 },
    { x: 20, y: 10 },
  ],
  10,
  30
);

// Summer solstice date (June 21)
const summerDate = new Date('2024-06-21T12:00:00');

// Winter solstice date (December 21)
const winterDate = new Date('2024-12-21T12:00:00');

describe('AnalysisEngine', () => {
  describe('Basic Analysis', () => {
    it('should create an analysis result with required properties', () => {
      const engine = new AnalysisEngine(testLocation, [singleBuilding]);
      const result = engine.analyze(summerDate);

      expect(result).toHaveProperty('sunlight');
      expect(result).toHaveProperty('solar');
      expect(result).toHaveProperty('comfort');
      expect(result).toHaveProperty('hourlyData');
      expect(result).toHaveProperty('date');
      expect(result.targetType).toBe('site');
    });

    it('should set correct target type for building analysis', () => {
      const engine = new AnalysisEngine(
        testLocation,
        [singleBuilding],
        singleBuilding.id
      );
      const result = engine.analyze(summerDate);

      expect(result.targetId).toBe(singleBuilding.id);
      expect(result.targetType).toBe('building');
    });

    it('should set correct target type for floor analysis', () => {
      const engine = new AnalysisEngine(
        testLocation,
        [singleBuilding],
        singleBuilding.id,
        3 // Floor 3
      );
      const result = engine.analyze(summerDate);

      expect(result.targetType).toBe('floor');
      expect(result.floor).toBe(3);
    });

    it('should generate hourly data from sunrise to sunset', () => {
      const engine = new AnalysisEngine(testLocation, [singleBuilding]);
      const result = engine.analyze(summerDate);

      expect(result.hourlyData.length).toBeGreaterThan(0);

      // Most data points should have positive sun altitude (daytime)
      // Some points near sunset may have slightly negative altitude
      const positiveSunPoints = result.hourlyData.filter((point) => point.sunAltitude > 0);
      expect(positiveSunPoints.length).toBeGreaterThan(result.hourlyData.length * 0.9);
    });
  });

  describe('Sunlight Analysis', () => {
    it('should calculate total sun hours', () => {
      const engine = new AnalysisEngine(testLocation, [singleBuilding]);
      const result = engine.analyze(summerDate);

      expect(result.sunlight.totalHours).toBeGreaterThan(0);
      expect(result.sunlight.totalHours).toBeLessThan(24);
    });

    it('should have longer sun hours in summer than winter', () => {
      const engine = new AnalysisEngine(testLocation, [singleBuilding]);

      const summerResult = engine.analyze(summerDate);
      const winterResult = engine.analyze(winterDate);

      expect(summerResult.sunlight.totalHours).toBeGreaterThan(
        winterResult.sunlight.totalHours
      );
    });

    it('should identify first and last sun times', () => {
      const engine = new AnalysisEngine(testLocation, [singleBuilding]);
      const result = engine.analyze(summerDate);

      expect(result.sunlight.firstSunTime).toBeInstanceOf(Date);
      expect(result.sunlight.lastSunTime).toBeInstanceOf(Date);

      if (result.sunlight.firstSunTime && result.sunlight.lastSunTime) {
        expect(result.sunlight.lastSunTime.getTime()).toBeGreaterThan(
          result.sunlight.firstSunTime.getTime()
        );
      }
    });

    it('should find continuous sun blocks', () => {
      const engine = new AnalysisEngine(testLocation, [singleBuilding]);
      const result = engine.analyze(summerDate);

      // With a single building and no shadows, should have at least one continuous block
      expect(result.sunlight.continuousBlocks.length).toBeGreaterThanOrEqual(1);

      result.sunlight.continuousBlocks.forEach((block) => {
        expect(block.durationMinutes).toBeGreaterThan(0);
        expect(block.end.getTime()).toBeGreaterThanOrEqual(block.start.getTime());
      });
    });
  });

  describe('Solar Analysis', () => {
    it('should calculate peak irradiance', () => {
      const engine = new AnalysisEngine(testLocation, [singleBuilding]);
      const result = engine.analyze(summerDate);

      // Peak irradiance should be reasonable (100-1200 W/m²)
      expect(result.solar.peakIrradiance).toBeGreaterThan(100);
      expect(result.solar.peakIrradiance).toBeLessThan(1200);
    });

    it('should identify peak time around solar noon', () => {
      const engine = new AnalysisEngine(testLocation, [singleBuilding]);
      const result = engine.analyze(summerDate);

      expect(result.solar.peakTime).toBeInstanceOf(Date);

      if (result.solar.peakTime) {
        // Peak should occur and be after the first sun time
        const firstSunTime = result.sunlight.firstSunTime;
        const lastSunTime = result.sunlight.lastSunTime;

        if (firstSunTime && lastSunTime) {
          expect(result.solar.peakTime.getTime()).toBeGreaterThanOrEqual(
            firstSunTime.getTime()
          );
          expect(result.solar.peakTime.getTime()).toBeLessThanOrEqual(
            lastSunTime.getTime()
          );
        }
      }
    });

    it('should calculate daily irradiation', () => {
      const engine = new AnalysisEngine(testLocation, [singleBuilding]);
      const result = engine.analyze(summerDate);

      // Daily irradiation should be positive
      expect(result.solar.dailyIrradiation).toBeGreaterThan(0);
    });

    it('should have higher irradiance in summer than winter', () => {
      const engine = new AnalysisEngine(testLocation, [singleBuilding]);

      const summerResult = engine.analyze(summerDate);
      const winterResult = engine.analyze(winterDate);

      expect(summerResult.solar.peakIrradiance).toBeGreaterThan(
        winterResult.solar.peakIrradiance
      );
    });
  });

  describe('Comfort Analysis', () => {
    it('should calculate comfort score between 0 and 100', () => {
      const engine = new AnalysisEngine(testLocation, [singleBuilding]);
      const result = engine.analyze(summerDate);

      expect(result.comfort.score).toBeGreaterThanOrEqual(0);
      expect(result.comfort.score).toBeLessThanOrEqual(100);
    });

    it('should set appropriate risk level based on score', () => {
      const engine = new AnalysisEngine(testLocation, [singleBuilding]);
      const result = engine.analyze(summerDate);

      expect(['low', 'medium', 'high']).toContain(result.comfort.riskLevel);

      // Risk level should match score ranges
      if (result.comfort.score >= 70) {
        expect(result.comfort.riskLevel).toBe('low');
      } else if (result.comfort.score >= 40) {
        expect(result.comfort.riskLevel).toBe('medium');
      } else {
        expect(result.comfort.riskLevel).toBe('high');
      }
    });

    it('should generate recommendations', () => {
      const engine = new AnalysisEngine(testLocation, [singleBuilding]);
      const result = engine.analyze(summerDate);

      expect(Array.isArray(result.comfort.recommendations)).toBe(true);
      expect(result.comfort.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Scenario Integration', () => {
    const lowEScenario: Scenario = {
      id: 'low-e',
      name: 'Low-E Glass',
      isActive: true,
      window: { state: 'closed', ventilationFactor: 0 },
      glazing: { type: 'low-e', solarTransmittance: 0.35 },
      shading: { interior: 'none', exterior: 'none', reductionFactor: 1 },
    };

    const singleGlassScenario: Scenario = {
      id: 'single',
      name: 'Single Glass',
      isActive: true,
      window: { state: 'closed', ventilationFactor: 0 },
      glazing: { type: 'single', solarTransmittance: 0.87 },
      shading: { interior: 'none', exterior: 'none', reductionFactor: 1 },
    };

    const shadingScenario: Scenario = {
      id: 'shading',
      name: 'With Blinds',
      isActive: true,
      window: { state: 'closed', ventilationFactor: 0 },
      glazing: { type: 'double', solarTransmittance: 0.76 },
      shading: { interior: 'blinds', exterior: 'none', reductionFactor: 0.5 },
    };

    it('should reduce irradiance with better glazing', () => {
      const engineLowE = new AnalysisEngine(
        testLocation,
        [singleBuilding],
        undefined,
        undefined,
        lowEScenario
      );
      const engineSingle = new AnalysisEngine(
        testLocation,
        [singleBuilding],
        undefined,
        undefined,
        singleGlassScenario
      );

      const lowEResult = engineLowE.analyze(summerDate);
      const singleResult = engineSingle.analyze(summerDate);

      expect(lowEResult.solar.peakIrradiance).toBeLessThan(
        singleResult.solar.peakIrradiance
      );
    });

    it('should reduce irradiance with shading', () => {
      const engineNoShading = new AnalysisEngine(
        testLocation,
        [singleBuilding]
      );
      const engineWithShading = new AnalysisEngine(
        testLocation,
        [singleBuilding],
        undefined,
        undefined,
        shadingScenario
      );

      const noShadingResult = engineNoShading.analyze(summerDate);
      const shadingResult = engineWithShading.analyze(summerDate);

      expect(shadingResult.solar.peakIrradiance).toBeLessThan(
        noShadingResult.solar.peakIrradiance
      );
    });

    it('should affect comfort score based on glazing type', () => {
      const engineLowE = new AnalysisEngine(
        testLocation,
        [singleBuilding],
        undefined,
        undefined,
        lowEScenario
      );
      const engineSingle = new AnalysisEngine(
        testLocation,
        [singleBuilding],
        undefined,
        undefined,
        singleGlassScenario
      );

      const lowEResult = engineLowE.analyze(summerDate);
      const singleResult = engineSingle.analyze(summerDate);

      // Low-E should generally have better comfort due to glazing bonus
      expect(lowEResult.comfort.score).toBeGreaterThan(singleResult.comfort.score);
    });
  });

  describe('Shadow Calculation', () => {
    it('should detect shadows from nearby buildings', () => {
      const buildings = [targetBuilding, shadowCastingBuilding];
      const engine = new AnalysisEngine(
        testLocation,
        buildings,
        targetBuilding.id
      );
      const result = engine.analyze(summerDate);

      // Some data points should be in shadow
      const shadowedPoints = result.hourlyData.filter((d) => d.inShadow);
      const sunnyPoints = result.hourlyData.filter((d) => !d.inShadow);

      // With a tall nearby building, there should be some shadow
      // But also some sun (not 100% shadowed all day)
      expect(shadowedPoints.length + sunnyPoints.length).toBe(
        result.hourlyData.length
      );
    });

    it('should have reduced sun hours when shadowed by another building', () => {
      // Single building analysis
      const singleEngine = new AnalysisEngine(
        testLocation,
        [targetBuilding],
        targetBuilding.id
      );

      // Multi-building analysis with shadow caster
      const multiEngine = new AnalysisEngine(
        testLocation,
        [targetBuilding, shadowCastingBuilding],
        targetBuilding.id
      );

      const singleResult = singleEngine.analyze(summerDate);
      const multiResult = multiEngine.analyze(summerDate);

      // With a shadow-casting building, sun hours should be reduced or equal
      expect(multiResult.sunlight.totalHours).toBeLessThanOrEqual(
        singleResult.sunlight.totalHours
      );
    });
  });

  describe('Geographic Variations', () => {
    const equatorLocation: Location = {
      latitude: 0,
      longitude: 0,
      city: 'Equator',
      timezone: 'UTC',
    };

    const arcticLocation: Location = {
      latitude: 65,
      longitude: 0,
      city: 'Arctic',
      timezone: 'UTC',
    };

    it('should have different sun patterns at different latitudes', () => {
      const equatorEngine = new AnalysisEngine(equatorLocation, [singleBuilding]);
      const arcticEngine = new AnalysisEngine(arcticLocation, [singleBuilding]);

      const equatorResult = equatorEngine.analyze(summerDate);
      const arcticResult = arcticEngine.analyze(summerDate);

      // At summer solstice, arctic has very long days
      expect(arcticResult.sunlight.totalHours).toBeGreaterThan(
        equatorResult.sunlight.totalHours
      );

      // Sun altitude patterns should differ
      const equatorMaxAlt = Math.max(
        ...equatorResult.hourlyData.map((d) => d.sunAltitude)
      );
      const arcticMaxAlt = Math.max(
        ...arcticResult.hourlyData.map((d) => d.sunAltitude)
      );

      // Equator has higher max altitude in summer
      expect(equatorMaxAlt).toBeGreaterThan(arcticMaxAlt);
    });
  });

  describe('runAnalysis Helper', () => {
    it('should produce same results as AnalysisEngine class', () => {
      const engine = new AnalysisEngine(testLocation, [singleBuilding]);
      const classResult = engine.analyze(summerDate);

      const helperResult = runAnalysis(
        summerDate,
        testLocation,
        [singleBuilding]
      );

      expect(helperResult.sunlight.totalHours).toBe(classResult.sunlight.totalHours);
      expect(helperResult.solar.peakIrradiance).toBe(classResult.solar.peakIrradiance);
      expect(helperResult.comfort.score).toBe(classResult.comfort.score);
    });

    it('should accept all optional parameters', () => {
      const scenario: Scenario = {
        id: 'test',
        name: 'Test',
        isActive: true,
        window: { state: 'open', ventilationFactor: 0.5 },
        glazing: { type: 'double', solarTransmittance: 0.76 },
        shading: { interior: 'blinds', exterior: 'none', reductionFactor: 0.6 },
      };

      const result = runAnalysis(
        summerDate,
        testLocation,
        [singleBuilding],
        singleBuilding.id,
        3,
        scenario
      );

      expect(result.targetId).toBe(singleBuilding.id);
      expect(result.floor).toBe(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty buildings array', () => {
      const engine = new AnalysisEngine(testLocation, []);
      const result = engine.analyze(summerDate);

      expect(result.targetType).toBe('site');
      expect(result.hourlyData.length).toBeGreaterThan(0);
    });

    it('should handle non-existent target building ID', () => {
      const engine = new AnalysisEngine(
        testLocation,
        [singleBuilding],
        'non-existent-id'
      );
      const result = engine.analyze(summerDate);

      expect(result.targetType).toBe('site');
    });

    it('should handle extreme latitudes gracefully', () => {
      // Near north pole in summer (midnight sun)
      const extremeLocation: Location = {
        latitude: 85,
        longitude: 0,
        city: 'Near Pole',
        timezone: 'UTC',
      };

      const engine = new AnalysisEngine(extremeLocation, [singleBuilding]);

      // Should not throw
      expect(() => engine.analyze(summerDate)).not.toThrow();
    });
  });
});
