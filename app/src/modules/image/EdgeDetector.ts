/**
 * EdgeDetector - Canny edge detection using WebAssembly
 * Uses edge-detection-wasm for fast, accurate edge detection
 */

import type { Point2D } from '../../types';

// Dynamic import for WASM module
let wasmModule: typeof import('edge-detection-wasm') | null = null;

async function loadWasm() {
  if (!wasmModule) {
    wasmModule = await import('edge-detection-wasm');
  }
  return wasmModule;
}

export interface EdgeDetectionResult {
  edgePixels: Set<number>;
  edgeImage: ImageData;
  width: number;
  height: number;
}

export interface ContourResult {
  points: Point2D[];
  area: number;
  boundingBox: { x: number; y: number; width: number; height: number };
  centroid: Point2D;
  isConvex: boolean;
}

/**
 * Run Canny edge detection on an image
 * @param imageData - The image data to process
 * @param edgeColor - Hex color for edge highlighting (default: white)
 * @param useThickEdges - Whether to use thick edges for better visibility
 */
export async function detectEdges(
  imageData: ImageData,
  edgeColor: number = 0xFFFFFFFF, // White edges
  useThickEdges: boolean = true // Use thick edges for better contour detection
): Promise<EdgeDetectionResult> {
  const wasm = await loadWasm();

  // Run edge detection - the wasm module returns Uint8ClampedArray
  // Arguments: buffer, width, height, hue (color), use_thick (boolean)
  const edgeData = wasm.detect(
    imageData.data,
    imageData.width,
    imageData.height,
    edgeColor,
    useThickEdges
  ) as Uint8ClampedArray;

  // Create edge pixel set for fast lookup
  const edgePixels = new Set<number>();

  for (let i = 0; i < edgeData.length; i += 4) {
    // Check if this pixel is an edge (non-black)
    if (edgeData[i] > 128 || edgeData[i + 1] > 128 || edgeData[i + 2] > 128) {
      edgePixels.add(i / 4);
    }
  }

  // Create a new Uint8ClampedArray to ensure correct type for ImageData
  const imageDataArray = new Uint8ClampedArray(edgeData);

  return {
    edgePixels,
    edgeImage: new ImageData(imageDataArray, imageData.width, imageData.height),
    width: imageData.width,
    height: imageData.height,
  };
}

/**
 * Extract contours from edge detection result within a region of interest
 */
export function extractContoursFromEdges(
  edgeResult: EdgeDetectionResult,
  regionMask?: boolean[] // Optional mask to limit search area
): ContourResult[] {
  const { edgePixels, width, height } = edgeResult;
  const contours: ContourResult[] = [];
  const visited = new Set<number>();

  // Find all edge pixels that haven't been visited
  for (const pixelIndex of edgePixels) {
    if (visited.has(pixelIndex)) continue;
    if (regionMask && !regionMask[pixelIndex]) continue;

    // Trace this contour
    const contourPoints = traceContourFromEdge(
      pixelIndex,
      edgePixels,
      visited,
      width,
      height
    );

    if (contourPoints.length >= 10) { // Minimum points for a valid contour
      const simplified = simplifyContour(contourPoints, 3);

      if (simplified.length >= 4) {
        const boundingBox = calculateBoundingBox(simplified);
        const area = calculatePolygonArea(simplified);
        const centroid = calculateCentroid(simplified);
        const isConvex = checkConvexity(simplified);

        contours.push({
          points: simplified,
          area,
          boundingBox,
          centroid,
          isConvex,
        });
      }
    }
  }

  return contours;
}

/**
 * Trace a contour starting from a given edge pixel
 */
function traceContourFromEdge(
  startPixel: number,
  edgePixels: Set<number>,
  visited: Set<number>,
  width: number,
  height: number
): Point2D[] {
  const contour: Point2D[] = [];
  const queue: number[] = [startPixel];

  // 8-connected neighbor offsets
  const neighbors = [
    -1, 1, -width, width,
    -width - 1, -width + 1, width - 1, width + 1
  ];

  while (queue.length > 0) {
    const pixel = queue.shift()!;
    if (visited.has(pixel)) continue;

    visited.add(pixel);

    const x = pixel % width;
    const y = Math.floor(pixel / width);
    contour.push({ x, y });

    // Check neighbors for connected edge pixels
    for (const offset of neighbors) {
      const neighborPixel = pixel + offset;

      // Bounds check
      if (neighborPixel < 0 || neighborPixel >= width * height) continue;

      // Prevent horizontal wrapping
      const nx = neighborPixel % width;
      if (Math.abs(nx - x) > 1) continue;

      if (edgePixels.has(neighborPixel) && !visited.has(neighborPixel)) {
        queue.push(neighborPixel);
      }
    }
  }

  // Order points to form a proper contour
  return orderContourPoints(contour);
}

/**
 * Order contour points to form a proper closed loop
 */
function orderContourPoints(points: Point2D[]): Point2D[] {
  if (points.length < 3) return points;

  // Use convex hull as a starting point for ordering
  const hull = computeConvexHull(points);

  // If we have enough hull points, use them
  if (hull.length >= 4) {
    return hull;
  }

  // Fallback: order by angle from centroid
  const cx = points.reduce((sum, p) => sum + p.x, 0) / points.length;
  const cy = points.reduce((sum, p) => sum + p.y, 0) / points.length;

  return [...points].sort((a, b) => {
    const angleA = Math.atan2(a.y - cy, a.x - cx);
    const angleB = Math.atan2(b.y - cy, b.x - cx);
    return angleA - angleB;
  });
}

/**
 * Compute convex hull using Graham scan algorithm
 */
function computeConvexHull(points: Point2D[]): Point2D[] {
  if (points.length < 3) return points;

  // Find the lowest point (and leftmost if tied)
  let lowest = 0;
  for (let i = 1; i < points.length; i++) {
    if (points[i].y < points[lowest].y ||
        (points[i].y === points[lowest].y && points[i].x < points[lowest].x)) {
      lowest = i;
    }
  }

  const pivot = points[lowest];

  // Sort by polar angle with respect to pivot
  const sorted = points
    .filter((_, i) => i !== lowest)
    .map(p => ({
      point: p,
      angle: Math.atan2(p.y - pivot.y, p.x - pivot.x),
      dist: Math.hypot(p.x - pivot.x, p.y - pivot.y)
    }))
    .sort((a, b) => a.angle - b.angle || a.dist - b.dist)
    .map(p => p.point);

  // Build hull
  const hull: Point2D[] = [pivot];

  for (const point of sorted) {
    while (hull.length > 1 && crossProduct(hull[hull.length - 2], hull[hull.length - 1], point) <= 0) {
      hull.pop();
    }
    hull.push(point);
  }

  return hull;
}

function crossProduct(o: Point2D, a: Point2D, b: Point2D): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

/**
 * Simplify contour using Douglas-Peucker algorithm
 */
function simplifyContour(points: Point2D[], epsilon: number): Point2D[] {
  if (points.length < 3) return points;

  let maxDist = 0;
  let maxIndex = 0;

  const first = points[0];
  const last = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], first, last);
    if (dist > maxDist) {
      maxDist = dist;
      maxIndex = i;
    }
  }

  if (maxDist > epsilon) {
    const left = simplifyContour(points.slice(0, maxIndex + 1), epsilon);
    const right = simplifyContour(points.slice(maxIndex), epsilon);
    return [...left.slice(0, -1), ...right];
  }

  return [first, last];
}

function perpendicularDistance(point: Point2D, lineStart: Point2D, lineEnd: Point2D): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;

  if (dx === 0 && dy === 0) {
    return Math.hypot(point.x - lineStart.x, point.y - lineStart.y);
  }

  const t = Math.max(0, Math.min(1,
    ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (dx * dx + dy * dy)
  ));

  return Math.hypot(
    point.x - (lineStart.x + t * dx),
    point.y - (lineStart.y + t * dy)
  );
}

/**
 * Calculate bounding box of a set of points
 */
function calculateBoundingBox(points: Point2D[]): { x: number; y: number; width: number; height: number } {
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Calculate polygon area using shoelace formula
 */
function calculatePolygonArea(points: Point2D[]): number {
  let area = 0;
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }

  return Math.abs(area) / 2;
}

/**
 * Calculate centroid of a polygon
 */
function calculateCentroid(points: Point2D[]): Point2D {
  const cx = points.reduce((sum, p) => sum + p.x, 0) / points.length;
  const cy = points.reduce((sum, p) => sum + p.y, 0) / points.length;
  return { x: cx, y: cy };
}

/**
 * Check if a polygon is convex
 */
function checkConvexity(points: Point2D[]): boolean {
  if (points.length < 3) return true;

  let sign: number | null = null;
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const cross = crossProduct(
      points[i],
      points[(i + 1) % n],
      points[(i + 2) % n]
    );

    if (cross !== 0) {
      if (sign === null) {
        sign = cross > 0 ? 1 : -1;
      } else if ((cross > 0 ? 1 : -1) !== sign) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Merge nearby contours that likely belong to the same building
 */
export function mergeNearbyContours(
  contours: ContourResult[],
  maxDistance: number
): ContourResult[] {
  if (contours.length < 2) return contours;

  const merged: ContourResult[] = [];
  const used = new Set<number>();

  for (let i = 0; i < contours.length; i++) {
    if (used.has(i)) continue;

    const toMerge: ContourResult[] = [contours[i]];
    used.add(i);

    for (let j = i + 1; j < contours.length; j++) {
      if (used.has(j)) continue;

      // Check if centroids are close enough
      const dist = Math.hypot(
        contours[i].centroid.x - contours[j].centroid.x,
        contours[i].centroid.y - contours[j].centroid.y
      );

      if (dist < maxDistance) {
        toMerge.push(contours[j]);
        used.add(j);
      }
    }

    if (toMerge.length === 1) {
      merged.push(toMerge[0]);
    } else {
      // Merge all contours into one
      const allPoints = toMerge.flatMap(c => c.points);
      const hull = computeConvexHull(allPoints);
      const simplified = simplifyContour(hull, 5);

      merged.push({
        points: simplified,
        area: calculatePolygonArea(simplified),
        boundingBox: calculateBoundingBox(simplified),
        centroid: calculateCentroid(simplified),
        isConvex: checkConvexity(simplified),
      });
    }
  }

  return merged;
}

/**
 * Find rectangular approximation of a contour (for building detection)
 */
export function findRectangularApproximation(contour: ContourResult): Point2D[] {
  const { points, boundingBox } = contour;

  // Try to fit a minimum bounding rectangle
  // For now, use the convex hull and simplify aggressively
  const hull = computeConvexHull(points);

  // Simplify to get 4-8 points (typical building shape)
  let simplified = simplifyContour(hull, 10);

  // If we got too few points, use bounding box
  if (simplified.length < 4) {
    return [
      { x: boundingBox.x, y: boundingBox.y },
      { x: boundingBox.x + boundingBox.width, y: boundingBox.y },
      { x: boundingBox.x + boundingBox.width, y: boundingBox.y + boundingBox.height },
      { x: boundingBox.x, y: boundingBox.y + boundingBox.height },
    ];
  }

  // If we got too many points, simplify more
  while (simplified.length > 12) {
    simplified = simplifyContour(simplified, simplified.length);
  }

  return simplified;
}
