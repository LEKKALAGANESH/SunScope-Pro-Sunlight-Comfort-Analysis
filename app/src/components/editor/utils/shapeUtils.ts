import type { Point2D } from "../../../types";
import type { ShapeTemplate } from "../types";

/**
 * Create a rectangle footprint from two corner points
 */
export function createRectangleFootprint(
  start: Point2D,
  end: Point2D,
  isSquare: boolean = false
): Point2D[] {
  let width = end.x - start.x;
  let height = end.y - start.y;

  if (isSquare) {
    const size = Math.max(Math.abs(width), Math.abs(height));
    width = width >= 0 ? size : -size;
    height = height >= 0 ? size : -size;
  }

  return [
    { x: start.x, y: start.y },
    { x: start.x + width, y: start.y },
    { x: start.x + width, y: start.y + height },
    { x: start.x, y: start.y + height },
  ];
}

/**
 * Create a template shape at the given center point
 */
export function createTemplateShape(
  center: Point2D,
  template: ShapeTemplate,
  size: number
): Point2D[] {
  const halfSize = size / 2;

  switch (template) {
    case "square":
      return [
        { x: center.x - halfSize, y: center.y - halfSize },
        { x: center.x + halfSize, y: center.y - halfSize },
        { x: center.x + halfSize, y: center.y + halfSize },
        { x: center.x - halfSize, y: center.y + halfSize },
      ];

    case "rectangle":
      return [
        { x: center.x - halfSize * 1.5, y: center.y - halfSize },
        { x: center.x + halfSize * 1.5, y: center.y - halfSize },
        { x: center.x + halfSize * 1.5, y: center.y + halfSize },
        { x: center.x - halfSize * 1.5, y: center.y + halfSize },
      ];

    case "l-shape":
      return [
        { x: center.x - halfSize, y: center.y - halfSize },
        { x: center.x + halfSize, y: center.y - halfSize },
        { x: center.x + halfSize, y: center.y },
        { x: center.x, y: center.y },
        { x: center.x, y: center.y + halfSize },
        { x: center.x - halfSize, y: center.y + halfSize },
      ];

    case "tower":
      // Octagonal tower shape
      const oct = halfSize * 0.4;
      return [
        { x: center.x - oct, y: center.y - halfSize },
        { x: center.x + oct, y: center.y - halfSize },
        { x: center.x + halfSize, y: center.y - oct },
        { x: center.x + halfSize, y: center.y + oct },
        { x: center.x + oct, y: center.y + halfSize },
        { x: center.x - oct, y: center.y + halfSize },
        { x: center.x - halfSize, y: center.y + oct },
        { x: center.x - halfSize, y: center.y - oct },
      ];

    case "u-shape":
      return [
        { x: center.x - halfSize * 1.5, y: center.y - halfSize },
        { x: center.x + halfSize * 1.5, y: center.y - halfSize },
        { x: center.x + halfSize * 1.5, y: center.y + halfSize },
        { x: center.x + halfSize * 0.5, y: center.y + halfSize },
        { x: center.x + halfSize * 0.5, y: center.y },
        { x: center.x - halfSize * 0.5, y: center.y },
        { x: center.x - halfSize * 0.5, y: center.y + halfSize },
        { x: center.x - halfSize * 1.5, y: center.y + halfSize },
      ];

    default:
      return createTemplateShape(center, "square", size);
  }
}

/**
 * Check if a point is inside a polygon using ray casting algorithm
 */
export function isPointInPolygon(point: Point2D, polygon: Point2D[]): boolean {
  if (polygon.length < 3) return false;

  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    if (
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Calculate the centroid of a polygon
 */
export function getPolygonCentroid(polygon: Point2D[]): Point2D {
  if (polygon.length === 0) return { x: 0, y: 0 };

  const sumX = polygon.reduce((sum, p) => sum + p.x, 0);
  const sumY = polygon.reduce((sum, p) => sum + p.y, 0);

  return {
    x: sumX / polygon.length,
    y: sumY / polygon.length,
  };
}

/**
 * Offset a polygon by a given amount
 */
export function offsetPolygon(polygon: Point2D[], offsetX: number, offsetY: number): Point2D[] {
  return polygon.map((p) => ({
    x: p.x + offsetX,
    y: p.y + offsetY,
  }));
}

/**
 * Calculate bounding box of a polygon
 */
export function getPolygonBounds(polygon: Point2D[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
} {
  if (polygon.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  const xs = polygon.map((p) => p.x);
  const ys = polygon.map((p) => p.y);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}
