/**
 * ShadowCalculator - Accurate shadow polygon calculation for buildings
 *
 * This module provides geometric shadow calculations based on sun position
 * and building geometry. It uses shadow projection to create shadow polygons
 * and point-in-polygon testing to determine shadow status.
 */

import type { Building, Point2D } from '../../types';

export interface SunPosition {
  altitude: number; // radians
  azimuth: number; // radians (0 = North, clockwise)
}

export interface ShadowPolygon {
  buildingId: string;
  vertices: Point2D[];
  buildingHeight: number;
}

/**
 * ShadowCalculator class for accurate shadow analysis
 */
export class ShadowCalculator {
  private shadowCache: Map<string, ShadowPolygon> = new Map();
  private lastSunPosition: SunPosition | null = null;

  /**
   * Clear the shadow cache (call when sun position changes significantly)
   * @param buildingId - Optional building ID to clear cache for a specific building
   */
  clearCache(buildingId?: string): void {
    if (buildingId) {
      this.shadowCache.forEach((_, key) => {
        if (key.startsWith(buildingId)) {
          this.shadowCache.delete(key);
        }
      });
    } else {
      this.shadowCache.clear();
      this.lastSunPosition = null;
    }
  }

  /**
   * Check if cache is valid for current sun position
   */
  private isCacheValid(sunPosition: SunPosition): boolean {
    if (!this.lastSunPosition) return false;

    // Consider cache valid if sun position changed less than 0.5 degrees
    const altDiff = Math.abs(sunPosition.altitude - this.lastSunPosition.altitude);
    const azDiff = Math.abs(sunPosition.azimuth - this.lastSunPosition.azimuth);
    const threshold = (0.5 * Math.PI) / 180; // 0.5 degrees in radians

    return altDiff < threshold && azDiff < threshold;
  }

  /**
   * Calculate shadow polygon for a building at given sun position
   *
   * The shadow is created by projecting each vertex of the building footprint
   * in the direction opposite to the sun, by a distance determined by
   * the building height and sun altitude.
   *
   * @param building - The building to calculate the shadow for
   * @param sunPosition - The current sun position
   * @param targetHeight - The height of the target point above ground
   * @returns The shadow polygon for the building
   */
  calculateShadowPolygon(
    building: Building,
    sunPosition: SunPosition,
    targetHeight: number = 0
  ): ShadowPolygon {
    const cacheKey = `${building.id}-${targetHeight.toFixed(1)}`;

    // Return cached result if sun position hasn't changed significantly
    if (this.isCacheValid(sunPosition) && this.shadowCache.has(cacheKey)) {
      return this.shadowCache.get(cacheKey)!;
    }

    const { altitude, azimuth } = sunPosition;

    // If sun is at or below horizon, no shadow
    if (altitude <= 0) {
      return {
        buildingId: building.id,
        vertices: [],
        buildingHeight: building.totalHeight,
      };
    }

    // Calculate effective height (building height above target level)
    const effectiveHeight = Math.max(0, building.totalHeight - targetHeight);

    if (effectiveHeight <= 0) {
      // Target is above or at building top - no shadow from this building
      return {
        buildingId: building.id,
        vertices: [],
        buildingHeight: building.totalHeight,
      };
    }

    // Shadow length = height / tan(altitude)
    const shadowLength = effectiveHeight / Math.tan(altitude);

    // Shadow direction is opposite to sun azimuth
    // Azimuth: 0 = North, 90 = East, 180 = South, 270 = West
    // Shadow points away from sun
    const shadowDirX = -Math.sin(azimuth);
    const shadowDirY = -Math.cos(azimuth);

    // Project each footprint vertex to create shadow vertices
    const projectedVertices: Point2D[] = building.footprint.map((vertex) => ({
      x: vertex.x + shadowDirX * shadowLength,
      y: vertex.y + shadowDirY * shadowLength,
    }));

    // Create shadow polygon by combining footprint and projected vertices
    // The shadow polygon is the convex hull of building base + projected base
    const shadowPolygon = this.createShadowPolygonFromProjection(
      building.footprint,
      projectedVertices
    );

    const result: ShadowPolygon = {
      buildingId: building.id,
      vertices: shadowPolygon,
      buildingHeight: building.totalHeight,
    };

    // Cache the result
    this.shadowCache.set(cacheKey, result);
    this.lastSunPosition = { ...sunPosition };

    return result;
  }

  /**
   * Create shadow polygon from building footprint and projected vertices
   *
   * For simple cases, we create a polygon that connects the building
   * footprint to the projected footprint (the shadow outline).
   */
  private createShadowPolygonFromProjection(
    footprint: Point2D[],
    projected: Point2D[]
  ): Point2D[] {
    if (footprint.length < 3) return [];

    // For a simple shadow polygon, we need to trace around the outside
    // of the combined shape (building base + projected base)

    // Simple approach: create polygon by going around footprint,
    // then around projected vertices in reverse
    // This works well for convex or nearly convex footprints

    const polygon: Point2D[] = [];

    // Add footprint vertices
    footprint.forEach((v) => polygon.push({ ...v }));

    // Add projected vertices in reverse order to close the polygon correctly
    for (let i = projected.length - 1; i >= 0; i--) {
      polygon.push({ ...projected[i] });
    }

    return polygon;
  }

  /**
   * Test if a point is inside any building's shadow
   *
   * @param point - The point to test (in image coordinates)
   * @param buildings - All buildings that might cast shadows
   * @param sunPosition - Current sun position
   * @param targetBuildingId - ID of the target building (to exclude self-shadowing)
   * @param targetHeight - Height of the target point above ground
   */
  isPointInShadow(
    point: Point2D,
    buildings: Building[],
    sunPosition: SunPosition,
    targetBuildingId?: string,
    targetHeight: number = 0
  ): boolean {
    // If sun is below horizon, everything is in shadow
    if (sunPosition.altitude <= 0) {
      return true;
    }

    for (const building of buildings) {
      // Skip self-shadowing check
      if (building.id === targetBuildingId) continue;

      // Skip buildings that are shorter than the target height
      if (building.totalHeight <= targetHeight) continue;

      const shadowPoly = this.calculateShadowPolygon(
        building,
        sunPosition,
        targetHeight
      );

      if (shadowPoly.vertices.length >= 3) {
        if (this.isPointInPolygon(point, shadowPoly.vertices)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Calculate shadow coverage percentage for a building footprint
   *
   * @param targetBuilding - Building to analyze
   * @param buildings - All buildings (including obstacles)
   * @param sunPosition - Current sun position
   * @param targetHeight - Height level to analyze (e.g., specific floor)
   * @param sampleDensity - Number of sample points per axis
   */
  calculateShadowCoverage(
    targetBuilding: Building,
    buildings: Building[],
    sunPosition: SunPosition,
    targetHeight: number = 0,
    sampleDensity: number = 10
  ): number {
    if (sunPosition.altitude <= 0) {
      return 100; // Fully in shadow when sun is down
    }

    const footprint = targetBuilding.footprint;
    if (footprint.length < 3) return 0;

    // Get bounding box of footprint
    const minX = Math.min(...footprint.map((p) => p.x));
    const maxX = Math.max(...footprint.map((p) => p.x));
    const minY = Math.min(...footprint.map((p) => p.y));
    const maxY = Math.max(...footprint.map((p) => p.y));

    const stepX = (maxX - minX) / sampleDensity;
    const stepY = (maxY - minY) / sampleDensity;

    let totalSamples = 0;
    let shadowedSamples = 0;

    // Sample points within the footprint
    for (let x = minX; x <= maxX; x += stepX) {
      for (let y = minY; y <= maxY; y += stepY) {
        const point = { x, y };

        // Only count points inside the footprint
        if (!this.isPointInPolygon(point, footprint)) continue;

        totalSamples++;

        if (
          this.isPointInShadow(
            point,
            buildings,
            sunPosition,
            targetBuilding.id,
            targetHeight
          )
        ) {
          shadowedSamples++;
        }
      }
    }

    if (totalSamples === 0) return 0;

    return (shadowedSamples / totalSamples) * 100;
  }

  /**
   * Point-in-polygon test using ray casting algorithm
   *
   * This is the standard ray casting algorithm:
   * Cast a ray from the point to infinity (in +X direction)
   * and count intersections with polygon edges.
   * Odd count = inside, even count = outside.
   */
  isPointInPolygon(point: Point2D, polygon: Point2D[]): boolean {
    if (polygon.length < 3) return false;

    let inside = false;
    const n = polygon.length;

    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = polygon[i].x;
      const yi = polygon[i].y;
      const xj = polygon[j].x;
      const yj = polygon[j].y;

      // Check if ray from point intersects this edge
      const intersect =
        yi > point.y !== yj > point.y &&
        point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;

      if (intersect) {
        inside = !inside;
      }
    }

    return inside;
  }

  /**
   * Get the center point of a polygon
   */
  getPolygonCenter(polygon: Point2D[]): Point2D {
    if (polygon.length === 0) return { x: 0, y: 0 };

    const x = polygon.reduce((sum, p) => sum + p.x, 0) / polygon.length;
    const y = polygon.reduce((sum, p) => sum + p.y, 0) / polygon.length;

    return { x, y };
  }

  /**
   * Calculate the area of a polygon using the Shoelace formula
   */
  calculatePolygonArea(polygon: Point2D[]): number {
    if (polygon.length < 3) return 0;

    let area = 0;
    const n = polygon.length;

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += polygon[i].x * polygon[j].y;
      area -= polygon[j].x * polygon[i].y;
    }

    return Math.abs(area / 2);
  }
}

// Singleton instance for reuse
let shadowCalculatorInstance: ShadowCalculator | null = null;

export function getShadowCalculator(): ShadowCalculator {
  if (!shadowCalculatorInstance) {
    shadowCalculatorInstance = new ShadowCalculator();
  }
  return shadowCalculatorInstance;
}

// Reset the calculator (useful for testing or when buildings change)
export function resetShadowCalculator(): void {
  if (shadowCalculatorInstance) {
    shadowCalculatorInstance.clearCache();
  }
  shadowCalculatorInstance = null;
}
