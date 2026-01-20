/**
 * Coordinate Transformation Functions - SIMPLIFIED
 *
 * Transforms building footprints from 2D editor canvas to 3D world space.
 *
 * COORDINATE SYSTEMS:
 *
 * 1. IMAGE SPACE (2D Editor Canvas):
 *    - Origin: Top-left corner of image
 *    - X-axis: Points RIGHT (East)
 *    - Y-axis: Points DOWN (South)
 *    - Units: Pixels
 *
 * 2. WORLD SPACE (3D Scene):
 *    - Origin: Center of site at ground level
 *    - X-axis: Points EAST (right)
 *    - Y-axis: Points UP (height)
 *    - Z-axis: Points SOUTH (into screen when viewing from above looking north)
 *    - Units: Meters
 *
 * 3. BUILDING LOCAL SPACE:
 *    - Origin: Building centroid at ground level
 *    - Same axes as world space
 *    - Units: Meters
 *
 * TRANSFORMATION PIPELINE:
 *   Image (px) → Center at origin → Scale to meters → Rotate for north → World coordinates
 */

import type { Point2D, SiteConfig, TransformationResult } from './types';

/**
 * Transform a single point from image space to world XZ coordinates
 *
 * @param imagePoint - Point in image pixels (x=right, y=down)
 * @param imageWidth - Image width in pixels
 * @param imageHeight - Image height in pixels
 * @param scale - Meters per pixel
 * @param northAngle - North rotation in degrees (0 = north is up)
 * @returns Point in world XZ plane (x=east, y=south which maps to Z in 3D)
 */
function transformPoint(
  imagePoint: Point2D,
  imageWidth: number,
  imageHeight: number,
  scale: number,
  northAngle: number
): Point2D {
  // Step 1: Translate to make image center the origin
  const relX = imagePoint.x - imageWidth / 2;
  const relY = imagePoint.y - imageHeight / 2;

  // Step 2: Scale from pixels to meters
  const meterX = relX * scale;
  const meterZ = relY * scale; // Image Y maps to World Z

  // Step 3: Apply north rotation (rotate around Y axis in 3D, which is XZ plane rotation)
  const angleRad = (northAngle * Math.PI) / 180;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);

  // Rotation in XZ plane: positive angle rotates counterclockwise when viewed from above
  const rotatedX = meterX * cos - meterZ * sin;
  const rotatedZ = meterX * sin + meterZ * cos;

  return {
    x: rotatedX,
    y: rotatedZ, // Store Z as 'y' in Point2D (it represents Z-coordinate in world space)
  };
}

/**
 * Transform polygon from Image Space to World Space
 *
 * @param imageFootprint - Polygon vertices in image pixels
 * @param siteConfig - Site configuration
 * @returns Polygon in world XZ plane (meters)
 */
export function imageToWorld(
  imageFootprint: Point2D[],
  siteConfig: SiteConfig
): Point2D[] {
  const { imageWidth, imageHeight, scale, northAngle } = siteConfig;

  return imageFootprint.map((point) =>
    transformPoint(point, imageWidth, imageHeight, scale, northAngle)
  );
}

/**
 * Transform polygon from World Space to Building Local Space
 *
 * Centers the polygon at origin by subtracting centroid.
 *
 * @param worldFootprint - Polygon in world meters
 * @returns Local footprint and world centroid position
 */
export function worldToLocal(worldFootprint: Point2D[]): {
  localFootprint: Point2D[];
  centroid: Point2D;
} {
  if (worldFootprint.length === 0) {
    return {
      localFootprint: [],
      centroid: { x: 0, y: 0 },
    };
  }

  // Calculate centroid (arithmetic mean of all vertices)
  const n = worldFootprint.length;
  const centroid = {
    x: worldFootprint.reduce((sum, p) => sum + p.x, 0) / n,
    y: worldFootprint.reduce((sum, p) => sum + p.y, 0) / n,
  };

  // Translate to local coordinates (centered at origin)
  const localFootprint = worldFootprint.map((point) => ({
    x: point.x - centroid.x,
    y: point.y - centroid.y,
  }));

  return { localFootprint, centroid };
}

/**
 * Complete transformation pipeline: Image → World → Local
 *
 * This is the main entry point for transforming building footprints.
 *
 * @param imageFootprint - Footprint drawn in editor (pixels)
 * @param siteConfig - Site configuration
 * @returns Transformation result with world and local coordinates
 */
export function transformFootprint(
  imageFootprint: Point2D[],
  siteConfig: SiteConfig
): TransformationResult<{
  worldFootprint: Point2D[];
  localFootprint: Point2D[];
  centroid: Point2D;
}> {
  // Stage 1: Image → World
  const worldFootprint = imageToWorld(imageFootprint, siteConfig);

  // Stage 2: World → Local
  const { localFootprint, centroid } = worldToLocal(worldFootprint);

  return {
    data: {
      worldFootprint,
      localFootprint,
      centroid,
    },
    metadata: {
      inputPoints: imageFootprint.length,
      outputPoints: localFootprint.length,
      appliedRotation: siteConfig.northAngle,
      appliedScale: siteConfig.scale,
    },
  };
}

/**
 * Calculate polygon area using shoelace formula
 */
export function calculatePolygonArea(points: Point2D[]): number {
  if (points.length < 3) return 0;

  let area = 0;
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }

  return Math.abs(area / 2);
}

/**
 * Calculate bounding box for polygon
 */
export function calculateBoundingBox(points: Point2D[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
} {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Check if two line segments intersect
 */
function segmentsIntersect(
  p1: Point2D,
  p2: Point2D,
  p3: Point2D,
  p4: Point2D
): boolean {
  const ccw = (a: Point2D, b: Point2D, c: Point2D) => {
    return (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
  };

  return ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4);
}

/**
 * Check if polygon has self-intersecting edges
 */
export function hasSelfIntersection(points: Point2D[]): boolean {
  const n = points.length;
  if (n < 4) return false;

  for (let i = 0; i < n; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % n];

    for (let j = i + 2; j < n; j++) {
      if (j === (i + n - 1) % n) continue;

      const p3 = points[j];
      const p4 = points[(j + 1) % n];

      if (segmentsIntersect(p1, p2, p3, p4)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Log transformation for debugging
 */
export function logTransformation(
  stageName: string,
  input: Point2D[],
  output: Point2D[],
  config?: Record<string, unknown>
): void {
  console.group(`🔄 ${stageName}`);
  console.log('Input:', input.length, 'points');
  if (input[0]) {
    console.log('  First:', `(${input[0].x.toFixed(2)}, ${input[0].y.toFixed(2)})`);
  }
  console.log('Output:', output.length, 'points');
  if (output[0]) {
    console.log('  First:', `(${output[0].x.toFixed(2)}, ${output[0].y.toFixed(2)})`);
  }
  if (config) {
    console.log('Config:', config);
  }
  console.groupEnd();
}
