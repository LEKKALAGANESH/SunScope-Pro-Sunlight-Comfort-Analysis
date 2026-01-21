/**
 * Polygon Triangulation Module
 *
 * Provides robust triangulation for complex polygons using the earcut algorithm.
 * Handles concave polygons, holes, and complex topology correctly.
 *
 * Earcut is industry-standard, used by Mapbox, THREE.js, and many other libraries.
 */

import earcut from 'earcut';
import type { Point2D } from './types';
import { calculatePolygonArea } from './transforms';

/**
 * Triangulation result with validation metadata
 */
export interface TriangulationResult {
  /** Triangle indices (groups of 3) */
  indices: number[];

  /** Number of triangles generated */
  triangleCount: number;

  /** Whether triangulation passed validation */
  valid: boolean;

  /** Validation metadata */
  validation: {
    inputArea: number;
    triangulatedArea: number;
    relativeError: number;
  };
}

/**
 * Triangulate a polygon using the earcut algorithm
 *
 * Earcut is a fast, robust polygon triangulation library that:
 * - Handles concave polygons correctly
 * - Supports holes (for future courtyard buildings)
 * - Uses ear-clipping algorithm with robustness improvements
 * - O(n log n) performance
 *
 * @param points - Polygon vertices (must be CCW winding for exterior boundary)
 * @param holes - Optional array of hole polygons (for future use)
 * @returns Triangle indices array (groups of 3)
 */
export function triangulatePolygon(
  points: Point2D[],
  holes?: Point2D[][]
): number[] {
  if (points.length < 3) {
    throw new Error('Cannot triangulate polygon with fewer than 3 vertices');
  }

  // Flatten coordinates to format earcut expects: [x1, y1, x2, y2, ...]
  const flatCoords: number[] = [];
  for (const p of points) {
    flatCoords.push(p.x, p.y);
  }

  // Handle holes if provided (for future courtyard buildings)
  let holeIndices: number[] | undefined;
  if (holes && holes.length > 0) {
    holeIndices = [];
    for (const hole of holes) {
      holeIndices.push(flatCoords.length / 2); // Index where this hole starts
      for (const p of hole) {
        flatCoords.push(p.x, p.y);
      }
    }
  }

  // Triangulate
  let indices: number[];
  try {
    indices = earcut(flatCoords, holeIndices);
  } catch (error) {
    throw new Error(
      `Triangulation failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  // Validate output
  if (indices.length === 0) {
    throw new Error('Triangulation produced no triangles - polygon may be degenerate');
  }

  if (indices.length % 3 !== 0) {
    throw new Error(
      `Invalid triangulation: ${indices.length} indices (not divisible by 3)`
    );
  }

  // Check for out-of-bounds indices
  const maxIndex = points.length - 1;
  for (let i = 0; i < indices.length; i++) {
    if (indices[i] < 0 || indices[i] > maxIndex) {
      throw new Error(
        `Invalid index ${indices[i]} at position ${i} (valid range: 0-${maxIndex})`
      );
    }
  }

  return indices;
}

/**
 * Validate triangulation by comparing areas
 *
 * The sum of triangle areas should equal the input polygon area.
 * This detects:
 * - Missing triangles
 * - Inverted triangles
 * - Overlapping triangles
 *
 * @param points - Original polygon vertices
 * @param indices - Triangle indices from triangulation
 * @param tolerance - Relative error tolerance (default: 1%)
 * @returns Validation result with detailed metrics
 */
export function validateTriangulation(
  points: Point2D[],
  indices: number[],
  tolerance: number = 0.01
): {
  valid: boolean;
  inputArea: number;
  triangulatedArea: number;
  relativeError: number;
  message: string;
} {
  // Calculate input polygon area
  const inputArea = calculatePolygonArea(points);

  // Calculate sum of triangle areas
  let triangulatedArea = 0;
  for (let i = 0; i < indices.length; i += 3) {
    const p1 = points[indices[i]];
    const p2 = points[indices[i + 1]];
    const p3 = points[indices[i + 2]];

    // Triangle area using cross product: 0.5 * |cross(AB, AC)|
    const area = 0.5 * Math.abs(
      (p2.x - p1.x) * (p3.y - p1.y) - (p3.x - p1.x) * (p2.y - p1.y)
    );

    triangulatedArea += area;
  }

  const error = Math.abs(inputArea - triangulatedArea);
  const relativeError = inputArea > 0 ? error / inputArea : 0;
  const valid = relativeError <= tolerance;

  let message = '';
  if (!valid) {
    message =
      `Triangulation area mismatch: ` +
      `input=${inputArea.toFixed(2)}, ` +
      `triangulated=${triangulatedArea.toFixed(2)}, ` +
      `error=${(relativeError * 100).toFixed(2)}%`;
  }

  return {
    valid,
    inputArea,
    triangulatedArea,
    relativeError,
    message,
  };
}

/**
 * Triangulate polygon with automatic validation
 *
 * Convenience function that triangulates and validates in one call.
 *
 * @param points - Polygon vertices (CCW winding)
 * @param validateResult - Whether to validate triangulation (default: true)
 * @returns Triangulation result with validation metadata
 */
export function triangulateWithValidation(
  points: Point2D[],
  validateResult: boolean = true
): TriangulationResult {
  const indices = triangulatePolygon(points);
  const triangleCount = indices.length / 3;

  let validation = {
    inputArea: 0,
    triangulatedArea: 0,
    relativeError: 0,
  };
  let valid = true;

  if (validateResult) {
    const result = validateTriangulation(points, indices);
    validation = {
      inputArea: result.inputArea,
      triangulatedArea: result.triangulatedArea,
      relativeError: result.relativeError,
    };
    valid = result.valid;

  }

  return {
    indices,
    triangleCount,
    valid,
    validation,
  };
}

/**
 * Calculate the quality of a triangle (aspect ratio)
 *
 * Used for debugging and optimization.
 * Quality = 1.0 for equilateral triangle, approaches 0 for degenerate.
 *
 * @param p1 - First vertex
 * @param p2 - Second vertex
 * @param p3 - Third vertex
 * @returns Quality metric [0, 1]
 */
export function calculateTriangleQuality(
  p1: Point2D,
  p2: Point2D,
  p3: Point2D
): number {
  // Calculate edge lengths
  const a = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
  const b = Math.sqrt((p3.x - p2.x) ** 2 + (p3.y - p2.y) ** 2);
  const c = Math.sqrt((p1.x - p3.x) ** 2 + (p1.y - p3.y) ** 2);

  // Semi-perimeter
  const s = (a + b + c) / 2;

  // Area using Heron's formula
  const areaSquared = s * (s - a) * (s - b) * (s - c);
  if (areaSquared <= 0) return 0; // Degenerate

  const area = Math.sqrt(areaSquared);

  // Quality metric: 4 * sqrt(3) * area / (a² + b² + c²)
  // This gives 1.0 for equilateral, lower for thin triangles
  const sumSquares = a * a + b * b + c * c;
  const quality = (4 * Math.sqrt(3) * area) / sumSquares;

  return Math.max(0, Math.min(1, quality));
}

/**
 * Analyze triangulation quality
 *
 * Returns statistics about the generated triangles.
 * Useful for debugging and optimization.
 *
 * @param points - Polygon vertices
 * @param indices - Triangle indices
 * @returns Quality statistics
 */
export function analyzeTriangulationQuality(
  points: Point2D[],
  indices: number[]
): {
  minQuality: number;
  maxQuality: number;
  avgQuality: number;
  degenerateCount: number;
  lowQualityCount: number;
} {
  let minQuality = 1;
  let maxQuality = 0;
  let sumQuality = 0;
  let degenerateCount = 0;
  let lowQualityCount = 0;

  const triangleCount = indices.length / 3;

  for (let i = 0; i < indices.length; i += 3) {
    const p1 = points[indices[i]];
    const p2 = points[indices[i + 1]];
    const p3 = points[indices[i + 2]];

    const quality = calculateTriangleQuality(p1, p2, p3);

    minQuality = Math.min(minQuality, quality);
    maxQuality = Math.max(maxQuality, quality);
    sumQuality += quality;

    if (quality < 0.01) degenerateCount++;
    if (quality < 0.3) lowQualityCount++;
  }

  return {
    minQuality,
    maxQuality,
    avgQuality: sumQuality / triangleCount,
    degenerateCount,
    lowQualityCount,
  };
}
