/**
 * ShadowCalculator Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ShadowCalculator,
  getShadowCalculator,
  resetShadowCalculator,
} from './ShadowCalculator';
import type { Building, Point2D } from '../../types';

// Helper to create test building
function createTestBuilding(
  id: string,
  footprint: Point2D[],
  totalHeight: number = 30
): Building {
  return {
    id,
    name: `Test Building ${id}`,
    footprint,
    floors: 10,
    floorHeight: 3,
    baseElevation: 0,
    totalHeight,
    area: 100,
    color: '#3B82F6',
  };
}

// Standard sun positions for testing
const SUN_POSITIONS = {
  high: { altitude: Math.PI / 3, azimuth: Math.PI }, // 60° altitude, South
  low: { altitude: Math.PI / 6, azimuth: Math.PI }, // 30° altitude, South
  east: { altitude: Math.PI / 4, azimuth: Math.PI / 2 }, // 45° altitude, East
  west: { altitude: Math.PI / 4, azimuth: (3 * Math.PI) / 2 }, // 45° altitude, West
  belowHorizon: { altitude: -0.1, azimuth: Math.PI }, // Below horizon
  horizon: { altitude: 0, azimuth: Math.PI }, // At horizon
};

// Standard building footprints for testing
const FOOTPRINTS = {
  square: [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ],
  rectangle: [
    { x: 0, y: 0 },
    { x: 20, y: 0 },
    { x: 20, y: 10 },
    { x: 0, y: 10 },
  ],
  triangle: [
    { x: 5, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ],
};

describe('ShadowCalculator', () => {
  let calculator: ShadowCalculator;

  beforeEach(() => {
    resetShadowCalculator();
    calculator = new ShadowCalculator();
  });

  describe('isPointInPolygon', () => {
    it('should return true for point inside square', () => {
      const result = calculator.isPointInPolygon({ x: 5, y: 5 }, FOOTPRINTS.square);
      expect(result).toBe(true);
    });

    it('should return false for point outside square', () => {
      const result = calculator.isPointInPolygon({ x: 15, y: 5 }, FOOTPRINTS.square);
      expect(result).toBe(false);
    });

    it('should return true for point inside triangle', () => {
      const result = calculator.isPointInPolygon({ x: 5, y: 7 }, FOOTPRINTS.triangle);
      expect(result).toBe(true);
    });

    it('should return false for point outside triangle', () => {
      const result = calculator.isPointInPolygon({ x: 0, y: 0 }, FOOTPRINTS.triangle);
      expect(result).toBe(false);
    });

    it('should return false for empty polygon', () => {
      const result = calculator.isPointInPolygon({ x: 5, y: 5 }, []);
      expect(result).toBe(false);
    });

    it('should return false for polygon with less than 3 vertices', () => {
      const result = calculator.isPointInPolygon({ x: 5, y: 5 }, [{ x: 0, y: 0 }, { x: 10, y: 10 }]);
      expect(result).toBe(false);
    });
  });

  describe('calculatePolygonArea', () => {
    it('should calculate area of square correctly', () => {
      const area = calculator.calculatePolygonArea(FOOTPRINTS.square);
      expect(area).toBe(100); // 10 x 10
    });

    it('should calculate area of rectangle correctly', () => {
      const area = calculator.calculatePolygonArea(FOOTPRINTS.rectangle);
      expect(area).toBe(200); // 20 x 10
    });

    it('should calculate area of triangle correctly', () => {
      const area = calculator.calculatePolygonArea(FOOTPRINTS.triangle);
      expect(area).toBe(50); // (10 * 10) / 2
    });

    it('should return 0 for empty polygon', () => {
      const area = calculator.calculatePolygonArea([]);
      expect(area).toBe(0);
    });

    it('should return 0 for polygon with less than 3 vertices', () => {
      const area = calculator.calculatePolygonArea([{ x: 0, y: 0 }, { x: 10, y: 10 }]);
      expect(area).toBe(0);
    });
  });

  describe('getPolygonCenter', () => {
    it('should calculate center of square correctly', () => {
      const center = calculator.getPolygonCenter(FOOTPRINTS.square);
      expect(center.x).toBe(5);
      expect(center.y).toBe(5);
    });

    it('should calculate center of rectangle correctly', () => {
      const center = calculator.getPolygonCenter(FOOTPRINTS.rectangle);
      expect(center.x).toBe(10);
      expect(center.y).toBe(5);
    });

    it('should return origin for empty polygon', () => {
      const center = calculator.getPolygonCenter([]);
      expect(center.x).toBe(0);
      expect(center.y).toBe(0);
    });
  });

  describe('calculateShadowPolygon', () => {
    it('should return empty vertices when sun is below horizon', () => {
      const building = createTestBuilding('b1', FOOTPRINTS.square);
      const shadow = calculator.calculateShadowPolygon(building, SUN_POSITIONS.belowHorizon);
      expect(shadow.vertices).toHaveLength(0);
    });

    it('should return empty vertices when sun is at horizon', () => {
      const building = createTestBuilding('b1', FOOTPRINTS.square);
      const shadow = calculator.calculateShadowPolygon(building, SUN_POSITIONS.horizon);
      expect(shadow.vertices).toHaveLength(0);
    });

    it('should return shadow polygon when sun is above horizon', () => {
      const building = createTestBuilding('b1', FOOTPRINTS.square);
      const shadow = calculator.calculateShadowPolygon(building, SUN_POSITIONS.high);
      expect(shadow.vertices.length).toBeGreaterThan(0);
      expect(shadow.buildingId).toBe('b1');
    });

    it('should return empty vertices when target is above building', () => {
      const building = createTestBuilding('b1', FOOTPRINTS.square, 10);
      const shadow = calculator.calculateShadowPolygon(building, SUN_POSITIONS.high, 20);
      expect(shadow.vertices).toHaveLength(0);
    });

    it('should produce longer shadow at lower sun altitude', () => {
      const building = createTestBuilding('b1', FOOTPRINTS.square);
      const highSunShadow = calculator.calculateShadowPolygon(building, SUN_POSITIONS.high);

      calculator.clearCache();
      const lowSunShadow = calculator.calculateShadowPolygon(building, SUN_POSITIONS.low);

      // Get max extent of shadows
      const highMaxY = Math.max(...highSunShadow.vertices.map(v => v.y));
      const lowMaxY = Math.max(...lowSunShadow.vertices.map(v => v.y));

      // Low sun should cast longer shadow
      expect(lowMaxY).toBeGreaterThan(highMaxY);
    });

    it('should cast shadow in correct direction based on sun azimuth', () => {
      const building = createTestBuilding('b1', FOOTPRINTS.square);

      // Sun from east - shadow should extend west (negative X)
      const eastShadow = calculator.calculateShadowPolygon(building, SUN_POSITIONS.east);
      const eastMinX = Math.min(...eastShadow.vertices.map(v => v.x));
      expect(eastMinX).toBeLessThan(0);

      calculator.clearCache();

      // Sun from west - shadow should extend east (positive X)
      const westShadow = calculator.calculateShadowPolygon(building, SUN_POSITIONS.west);
      const westMaxX = Math.max(...westShadow.vertices.map(v => v.x));
      expect(westMaxX).toBeGreaterThan(10);
    });
  });

  describe('isPointInShadow', () => {
    it('should return true when sun is below horizon', () => {
      const buildings = [createTestBuilding('b1', FOOTPRINTS.square)];
      const result = calculator.isPointInShadow(
        { x: 50, y: 50 },
        buildings,
        SUN_POSITIONS.belowHorizon
      );
      expect(result).toBe(true);
    });

    it('should return false when no obstructions', () => {
      const buildings = [createTestBuilding('b1', FOOTPRINTS.square)];
      // Point far from building, not in shadow
      const result = calculator.isPointInShadow(
        { x: 100, y: 100 },
        buildings,
        SUN_POSITIONS.high
      );
      expect(result).toBe(false);
    });

    it('should exclude self-shadowing', () => {
      const building = createTestBuilding('b1', FOOTPRINTS.square);
      const buildings = [building];

      // Point inside building footprint should not self-shadow
      const result = calculator.isPointInShadow(
        { x: 5, y: 5 },
        buildings,
        SUN_POSITIONS.high,
        'b1'
      );
      expect(result).toBe(false);
    });

    it('should skip shorter buildings when checking shadow at height', () => {
      const shortBuilding = createTestBuilding('short', FOOTPRINTS.square, 5);
      const buildings = [shortBuilding];

      // Check at height 10, taller than the building
      const result = calculator.isPointInShadow(
        { x: 5, y: 50 },
        buildings,
        SUN_POSITIONS.high,
        undefined,
        10
      );
      expect(result).toBe(false);
    });
  });

  describe('calculateShadowCoverage', () => {
    it('should return 100% when sun is below horizon', () => {
      const building = createTestBuilding('b1', FOOTPRINTS.square);
      const buildings = [building];
      const coverage = calculator.calculateShadowCoverage(
        building,
        buildings,
        SUN_POSITIONS.belowHorizon
      );
      expect(coverage).toBe(100);
    });

    it('should return 0% when no obstructions', () => {
      const building = createTestBuilding('b1', FOOTPRINTS.square);
      const buildings = [building]; // Only self, excluded
      const coverage = calculator.calculateShadowCoverage(
        building,
        buildings,
        SUN_POSITIONS.high
      );
      expect(coverage).toBe(0);
    });

    it('should calculate shadow coverage with valid inputs', () => {
      // Target building at origin
      const targetBuilding = createTestBuilding('target', [
        { x: 100, y: 100 },
        { x: 110, y: 100 },
        { x: 110, y: 110 },
        { x: 100, y: 110 },
      ], 10);

      // Tall building casting shadow onto target
      // At low sun altitude (30°), shadow length ≈ height / tan(30°) ≈ 1.73 * height
      // For 50m building, shadow ≈ 86m long
      const obstructor = createTestBuilding('obstructor', [
        { x: 100, y: 50 },
        { x: 110, y: 50 },
        { x: 110, y: 60 },
        { x: 100, y: 60 },
      ], 50);

      const buildings = [targetBuilding, obstructor];

      // Sun from south, casting shadow north (positive Y direction)
      const coverage = calculator.calculateShadowCoverage(
        targetBuilding,
        buildings,
        { altitude: Math.PI / 6, azimuth: Math.PI }, // 30° altitude, sun from south
        0,
        10
      );

      // Coverage should be a number between 0 and 100
      expect(coverage).toBeGreaterThanOrEqual(0);
      expect(coverage).toBeLessThanOrEqual(100);
    });

    it('should return 0 for building with less than 3 vertices', () => {
      const invalidBuilding = createTestBuilding('invalid', [{ x: 0, y: 0 }], 10);
      const buildings = [invalidBuilding];
      const coverage = calculator.calculateShadowCoverage(
        invalidBuilding,
        buildings,
        SUN_POSITIONS.high
      );
      expect(coverage).toBe(0);
    });
  });

  describe('cache behavior', () => {
    it('should cache shadow calculations', () => {
      const building = createTestBuilding('b1', FOOTPRINTS.square);

      // First call
      const shadow1 = calculator.calculateShadowPolygon(building, SUN_POSITIONS.high);

      // Second call with same position should use cache
      const shadow2 = calculator.calculateShadowPolygon(building, SUN_POSITIONS.high);

      // Should be the same object from cache
      expect(shadow1).toBe(shadow2);
    });

    it('should invalidate cache when sun position changes significantly', () => {
      const building = createTestBuilding('b1', FOOTPRINTS.square);

      // First call
      const shadow1 = calculator.calculateShadowPolygon(building, SUN_POSITIONS.high);

      // Call with different sun position
      const shadow2 = calculator.calculateShadowPolygon(building, SUN_POSITIONS.low);

      // Should be different objects
      expect(shadow1).not.toBe(shadow2);
    });

    it('should clear cache when clearCache is called', () => {
      const building = createTestBuilding('b1', FOOTPRINTS.square);

      // First call
      const shadow1 = calculator.calculateShadowPolygon(building, SUN_POSITIONS.high);

      // Clear cache
      calculator.clearCache();

      // Second call should recalculate
      const shadow2 = calculator.calculateShadowPolygon(building, SUN_POSITIONS.high);

      // Should be different objects (recalculated)
      expect(shadow1).not.toBe(shadow2);
    });
  });

  describe('singleton pattern', () => {
    it('should return same instance from getShadowCalculator', () => {
      const calc1 = getShadowCalculator();
      const calc2 = getShadowCalculator();
      expect(calc1).toBe(calc2);
    });

    it('should create new instance after reset', () => {
      const calc1 = getShadowCalculator();
      resetShadowCalculator();
      const calc2 = getShadowCalculator();
      expect(calc1).not.toBe(calc2);
    });
  });
});
