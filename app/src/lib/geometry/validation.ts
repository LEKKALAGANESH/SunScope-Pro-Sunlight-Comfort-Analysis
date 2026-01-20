/**
 * Geometry Validation Functions
 *
 * Validates footprints and site configurations before transformation and mesh creation.
 * Provides detailed error messages and warnings to help users understand issues.
 */

import type { Point2D, SiteConfig, ValidationResult } from './types';
import { calculatePolygonArea, calculateBoundingBox, hasSelfIntersection } from './transforms';

/**
 * Validate building footprint polygon
 *
 * Checks for:
 * - Sufficient number of points (minimum 3)
 * - Valid numeric coordinates (no NaN, Infinity)
 * - Reasonable area (not too small)
 * - Reasonable aspect ratio (not extremely thin)
 * - Self-intersection (warning only)
 *
 * @param points - Footprint polygon vertices
 * @param coordinateSystem - 'image' or 'world' (affects area thresholds)
 * @returns Validation result with errors and warnings
 */
export function validateFootprint(
  points: Point2D[],
  coordinateSystem: 'image' | 'world' = 'image'
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Error: Too few points
  if (points.length < 3) {
    errors.push('Footprint must have at least 3 points to form a polygon');
    return { valid: false, errors, warnings };
  }

  // Error: Non-finite coordinates
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      errors.push(`Point ${i} has invalid coordinates: (${point.x}, ${point.y})`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  // Calculate area for further checks
  const area = calculatePolygonArea(points);

  // Warning: Very small area
  const minArea = coordinateSystem === 'world' ? 1 : 100; // 1m² or 100px²
  if (area < minArea) {
    warnings.push(
      `Building footprint is very small (${area.toFixed(2)} ${coordinateSystem === 'world' ? 'm²' : 'px²'}). ` +
        `Minimum recommended: ${minArea} ${coordinateSystem === 'world' ? 'm²' : 'px²'}`
    );
  }

  // Warning: Zero area (degenerate polygon)
  if (area === 0) {
    errors.push('Footprint has zero area - all points are collinear');
    return { valid: false, errors, warnings };
  }

  // Warning: Very thin shape
  const bbox = calculateBoundingBox(points);
  if (bbox.width > 0 && bbox.height > 0) {
    const aspectRatio = bbox.width / bbox.height;
    if (aspectRatio > 20 || aspectRatio < 0.05) {
      warnings.push(
        `Building footprint has extreme aspect ratio (${aspectRatio.toFixed(2)}:1). ` +
          `This may indicate a drawing error.`
      );
    }
  }

  // Warning: Self-intersection (computationally expensive, so only for < 100 points)
  if (points.length < 100 && hasSelfIntersection(points)) {
    warnings.push(
      'Footprint has self-intersecting edges. This may cause rendering artifacts.'
    );
  }

  // Warning: Very many points (performance concern)
  if (points.length > 200) {
    warnings.push(
      `Footprint has ${points.length} points. Consider simplifying for better performance.`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate site configuration
 *
 * Checks for:
 * - Positive image dimensions
 * - Valid scale factor
 * - Valid north angle
 *
 * @param config - Site configuration
 * @returns Validation result
 */
export function validateSiteConfig(config: SiteConfig): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Error: Invalid image dimensions
  if (!Number.isFinite(config.imageWidth) || config.imageWidth <= 0) {
    errors.push(`Invalid image width: ${config.imageWidth}. Must be a positive number.`);
  }

  if (!Number.isFinite(config.imageHeight) || config.imageHeight <= 0) {
    errors.push(`Invalid image height: ${config.imageHeight}. Must be a positive number.`);
  }

  // Error: Invalid scale
  if (!Number.isFinite(config.scale) || config.scale <= 0) {
    errors.push(`Invalid scale: ${config.scale}. Must be a positive number.`);
  } else if (config.scale < 0.01 || config.scale > 100) {
    warnings.push(
      `Scale ${config.scale} m/px is outside typical range (0.01 - 100). ` +
        `Verify this is correct.`
    );
  }

  // Error: Invalid north angle
  if (!Number.isFinite(config.northAngle)) {
    errors.push(`Invalid north angle: ${config.northAngle}. Must be a number.`);
  }

  // Warning: Unusual north angle
  const normalizedAngle = ((config.northAngle % 360) + 360) % 360;
  if (normalizedAngle !== config.northAngle) {
    warnings.push(
      `North angle ${config.northAngle}° will be normalized to ${normalizedAngle}°`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate building geometry (comprehensive check)
 *
 * Validates:
 * - Footprint polygon
 * - Floor count and height
 * - Derived measurements
 *
 * @param imageFootprint - Footprint in image coordinates
 * @param floors - Number of floors
 * @param floorHeight - Height of each floor in meters
 * @returns Validation result
 */
export function validateBuildingGeometry(
  imageFootprint: Point2D[],
  floors: number,
  floorHeight: number
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate footprint
  const footprintValidation = validateFootprint(imageFootprint, 'image');
  errors.push(...footprintValidation.errors);
  warnings.push(...footprintValidation.warnings);

  // Validate floor count
  if (!Number.isInteger(floors) || floors < 1) {
    errors.push(`Floor count must be a positive integer, got: ${floors}`);
  } else if (floors > 200) {
    warnings.push(`Building has ${floors} floors. This seems unusually tall.`);
  }

  // Validate floor height
  if (!Number.isFinite(floorHeight) || floorHeight <= 0) {
    errors.push(`Floor height must be positive, got: ${floorHeight}m`);
  } else if (floorHeight < 2 || floorHeight > 10) {
    warnings.push(
      `Floor height ${floorHeight}m is outside typical range (2-10m). ` +
        `Typical values: 3m (residential), 4m (commercial)`
    );
  }

  // Calculate total height
  const totalHeight = floors * floorHeight;
  if (totalHeight > 1000) {
    warnings.push(`Total building height is ${totalHeight}m (${floors} × ${floorHeight}m). This is extremely tall.`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Batch validate multiple buildings
 *
 * @param buildings - Array of buildings to validate
 * @param siteConfig - Site configuration
 * @returns Array of validation results, one per building
 */
export function validateBuildings(
  buildings: Array<{
    name: string;
    imageFootprint: Point2D[];
    floors: number;
    floorHeight: number;
  }>,
  siteConfig: SiteConfig
): Array<{ buildingName: string; validation: ValidationResult }> {
  // First validate site config (applies to all buildings)
  const siteValidation = validateSiteConfig(siteConfig);
  if (!siteValidation.valid) {
    return buildings.map((b) => ({
      buildingName: b.name,
      validation: {
        valid: false,
        errors: [`Site configuration invalid: ${siteValidation.errors.join(', ')}`],
        warnings: [],
      },
    }));
  }

  // Validate each building
  return buildings.map((building) => ({
    buildingName: building.name,
    validation: validateBuildingGeometry(
      building.imageFootprint,
      building.floors,
      building.floorHeight
    ),
  }));
}

/**
 * Format validation result as user-friendly message
 *
 * @param result - Validation result
 * @param buildingName - Optional building name for context
 * @returns Human-readable message
 */
export function formatValidationMessage(
  result: ValidationResult,
  buildingName?: string
): string {
  const prefix = buildingName ? `Building "${buildingName}": ` : '';

  if (result.valid && result.warnings.length === 0) {
    return `${prefix}Validation passed ✓`;
  }

  const parts: string[] = [];

  if (result.errors.length > 0) {
    parts.push(`ERRORS:\n${result.errors.map((e) => `  • ${e}`).join('\n')}`);
  }

  if (result.warnings.length > 0) {
    parts.push(`WARNINGS:\n${result.warnings.map((w) => `  ⚠ ${w}`).join('\n')}`);
  }

  return `${prefix}\n${parts.join('\n\n')}`;
}

/**
 * Get severity level from validation result
 *
 * @param result - Validation result
 * @returns 'error' | 'warning' | 'success'
 */
export function getValidationSeverity(
  result: ValidationResult
): 'error' | 'warning' | 'success' {
  if (result.errors.length > 0) return 'error';
  if (result.warnings.length > 0) return 'warning';
  return 'success';
}

/**
 * Remove duplicate and near-duplicate points from polygon
 *
 * Removes points that are extremely close to their successor,
 * which can cause numerical issues in triangulation.
 *
 * @param points - Polygon vertices
 * @param epsilon - Distance threshold for considering points duplicate (default: 0.001m or 0.001px)
 * @returns Cleaned polygon with duplicates removed
 */
export function removeDuplicatePoints(
  points: Point2D[],
  epsilon: number = 0.001
): Point2D[] {
  if (points.length < 3) return points;

  const cleaned: Point2D[] = [];
  const epsilonSq = epsilon * epsilon;

  for (let i = 0; i < points.length; i++) {
    const current = points[i];
    const next = points[(i + 1) % points.length];

    const dx = next.x - current.x;
    const dy = next.y - current.y;
    const distSq = dx * dx + dy * dy;

    // Only add point if it's sufficiently far from the next point
    if (distSq > epsilonSq) {
      cleaned.push(current);
    }
  }

  return cleaned.length >= 3 ? cleaned : points;
}

/**
 * Determine winding order of polygon using signed area
 *
 * Uses the shoelace formula to calculate signed area.
 * Positive area indicates CCW winding, negative indicates CW.
 *
 * Note: In screen coordinates (Y-down), the sign is inverted.
 *
 * @param points - Polygon vertices
 * @returns 'CW' for clockwise, 'CCW' for counter-clockwise
 */
export function getWindingOrder(points: Point2D[]): 'CW' | 'CCW' {
  if (points.length < 3) return 'CCW';

  let signedArea = 0;
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    signedArea += (points[j].x - points[i].x) * (points[j].y + points[i].y);
  }

  // In screen coordinates (Y-down), positive area = CW, negative = CCW
  // In math coordinates (Y-up), positive area = CCW, negative = CW
  // We use screen coordinate convention since input is from canvas
  return signedArea > 0 ? 'CW' : 'CCW';
}

/**
 * Normalize polygon to counter-clockwise winding order
 *
 * THREE.js Shape expects CCW winding for exterior boundaries.
 *
 * @param points - Polygon vertices
 * @returns Polygon with CCW winding (reversed if needed)
 */
export function normalizeToCounterClockwise(points: Point2D[]): Point2D[] {
  const winding = getWindingOrder(points);
  return winding === 'CCW' ? points : points.slice().reverse();
}

/**
 * Extended validation result with normalized polygon
 */
export interface PolygonNormalizationResult {
  valid: boolean;
  normalized: Point2D[];
  errors: string[];
  warnings: string[];
  metadata: {
    originalVertexCount: number;
    normalizedVertexCount: number;
    area: number;
    windingOrder: 'CW' | 'CCW';
    wasReversed: boolean;
    duplicatesRemoved: number;
  };
}

/**
 * Validate and normalize polygon for robust mesh construction
 *
 * This is the complete validation pipeline that:
 * 1. Removes duplicate points
 * 2. Validates the polygon
 * 3. Normalizes winding order to CCW
 * 4. Checks for self-intersections
 *
 * @param points - Raw polygon vertices from user input
 * @param options - Validation options
 * @returns Normalized polygon ready for triangulation
 */
export function validateAndNormalizePolygon(
  points: Point2D[],
  options?: {
    epsilon?: number;
    minArea?: number;
    maxAspectRatio?: number;
    coordinateSystem?: 'image' | 'world';
  }
): PolygonNormalizationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const coordinateSystem = options?.coordinateSystem || 'image';

  // Step 1: Check minimum vertex count
  if (points.length < 3) {
    return {
      valid: false,
      normalized: [],
      errors: ['Polygon must have at least 3 vertices'],
      warnings: [],
      metadata: {
        originalVertexCount: points.length,
        normalizedVertexCount: 0,
        area: 0,
        windingOrder: 'CCW',
        wasReversed: false,
        duplicatesRemoved: 0,
      },
    };
  }

  // Step 2: Remove duplicates
  const cleaned = removeDuplicatePoints(points, options?.epsilon);
  const duplicatesRemoved = points.length - cleaned.length;

  if (duplicatesRemoved > 0) {
    warnings.push(`Removed ${duplicatesRemoved} duplicate or near-duplicate vertices`);
  }

  if (cleaned.length < 3) {
    return {
      valid: false,
      normalized: [],
      errors: ['After removing duplicates, polygon has fewer than 3 vertices'],
      warnings,
      metadata: {
        originalVertexCount: points.length,
        normalizedVertexCount: cleaned.length,
        area: 0,
        windingOrder: 'CCW',
        wasReversed: false,
        duplicatesRemoved,
      },
    };
  }

  // Step 3: Check for non-finite coordinates
  for (let i = 0; i < cleaned.length; i++) {
    const point = cleaned[i];
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      errors.push(`Point ${i} has invalid coordinates: (${point.x}, ${point.y})`);
    }
  }

  if (errors.length > 0) {
    return {
      valid: false,
      normalized: [],
      errors,
      warnings,
      metadata: {
        originalVertexCount: points.length,
        normalizedVertexCount: cleaned.length,
        area: 0,
        windingOrder: 'CCW',
        wasReversed: false,
        duplicatesRemoved,
      },
    };
  }

  // Step 4: Calculate area
  const area = calculatePolygonArea(cleaned);
  const minArea = options?.minArea || (coordinateSystem === 'world' ? 1 : 100);

  if (area === 0) {
    errors.push('Polygon has zero area - all points are collinear');
  } else if (area < minArea) {
    warnings.push(
      `Polygon area is very small: ${area.toFixed(2)} ${coordinateSystem === 'world' ? 'm²' : 'px²'} ` +
      `(minimum recommended: ${minArea})`
    );
  }

  // Step 5: Check for self-intersections (expensive, so limit to reasonable sizes)
  // NOTE: Self-intersection is a WARNING, not an error - buildings should still render
  // Auto-detected footprints may have slight self-intersections
  if (cleaned.length < 100 && hasSelfIntersection(cleaned)) {
    warnings.push('Polygon has self-intersecting edges (may cause minor rendering artifacts)');
  }

  // Step 6: Normalize winding order to CCW
  const originalWinding = getWindingOrder(cleaned);
  const normalized = normalizeToCounterClockwise(cleaned);
  const wasReversed = originalWinding === 'CW';

  if (wasReversed) {
    warnings.push('Polygon winding order was reversed from clockwise to counter-clockwise');
  }

  // Step 7: Check aspect ratio
  const bbox = calculateBoundingBox(normalized);
  if (bbox.width > 0 && bbox.height > 0) {
    const aspectRatio = Math.max(bbox.width, bbox.height) / Math.min(bbox.width, bbox.height);
    const maxAspect = options?.maxAspectRatio || 100;

    if (aspectRatio > maxAspect) {
      warnings.push(
        `Polygon has extreme aspect ratio: ${aspectRatio.toFixed(1)}:1 ` +
        `(maximum recommended: ${maxAspect}:1)`
      );
    }
  }

  return {
    valid: errors.length === 0,
    normalized,
    errors,
    warnings,
    metadata: {
      originalVertexCount: points.length,
      normalizedVertexCount: normalized.length,
      area,
      windingOrder: originalWinding,
      wasReversed,
      duplicatesRemoved,
    },
  };
}
