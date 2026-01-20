/**
 * Unit Tests for Building Projection Transformations
 *
 * Tests the core transformation pipeline to ensure mathematical correctness.
 *
 * Run with: npm test
 */

import { describe, it, expect } from 'vitest';
import {
  imageToWorld,
  worldToLocal,
  transformFootprint,
  calculatePolygonArea,
  calculateBoundingBox,
  hasSelfIntersection,
} from './transforms';
import type { SiteConfig } from './types';

describe('imageToWorld', () => {
  it('should handle identity transform (no rotation, 1:1 scale)', () => {
    const square = [
      { x: 100, y: 100 },
      { x: 200, y: 100 },
      { x: 200, y: 200 },
      { x: 100, y: 200 },
    ];

    const siteConfig: SiteConfig = {
      imageWidth: 300,
      imageHeight: 300,
      scale: 1, // 1 meter per pixel
      northAngle: 0, // No rotation
    };

    const result = imageToWorld(square, siteConfig);

    // Image center is (150, 150), so points should be relative to that
    expect(result[0].x).toBeCloseTo(-50, 5); // 100 - 150 = -50
    expect(result[0].y).toBeCloseTo(-50, 5); // 100 - 150 = -50
    expect(result[1].x).toBeCloseTo(50, 5);
    expect(result[1].y).toBeCloseTo(-50, 5);
    expect(result[2].x).toBeCloseTo(50, 5);
    expect(result[2].y).toBeCloseTo(50, 5);
    expect(result[3].x).toBeCloseTo(-50, 5);
    expect(result[3].y).toBeCloseTo(50, 5);
  });

  it('should apply scaling correctly', () => {
    const points = [{ x: 250, y: 150 }]; // 100px east of center

    const siteConfig: SiteConfig = {
      imageWidth: 300,
      imageHeight: 300,
      scale: 0.5, // 0.5 meters per pixel
      northAngle: 0,
    };

    const result = imageToWorld(points, siteConfig);

    // (250 - 150) * 0.5 = 50 * 0.5 = 25 meters
    expect(result[0].x).toBeCloseTo(50, 5);
    expect(result[0].y).toBeCloseTo(0, 5);
  });

  it('should rotate 90° clockwise correctly', () => {
    const points = [{ x: 250, y: 150 }]; // East of center

    const siteConfig: SiteConfig = {
      imageWidth: 300,
      imageHeight: 300,
      scale: 1,
      northAngle: 90, // 90° rotation
    };

    const result = imageToWorld(points, siteConfig);

    // East (100, 0) should become South (0, 100) after 90° clockwise
    expect(result[0].x).toBeCloseTo(0, 1);
    expect(result[0].y).toBeCloseTo(100, 1);
  });

  it('should rotate 180° correctly', () => {
    const points = [{ x: 250, y: 150 }]; // 100px east of center

    const siteConfig: SiteConfig = {
      imageWidth: 300,
      imageHeight: 300,
      scale: 1,
      northAngle: 180,
    };

    const result = imageToWorld(points, siteConfig);

    // East (100, 0) should become West (-100, 0) after 180°
    expect(result[0].x).toBeCloseTo(-100, 1);
    expect(result[0].y).toBeCloseTo(0, 1);
  });

  it('should preserve square shape after rotation', () => {
    const square = [
      { x: 100, y: 100 },
      { x: 200, y: 100 },
      { x: 200, y: 200 },
      { x: 100, y: 200 },
    ];

    const siteConfig: SiteConfig = {
      imageWidth: 300,
      imageHeight: 300,
      scale: 1,
      northAngle: 45,
    };

    const result = imageToWorld(square, siteConfig);

    // Calculate area before and after
    const areaBefore = calculatePolygonArea(square);
    const areaAfter = calculatePolygonArea(result);

    // Area should be preserved (rotation is isometric)
    expect(areaAfter).toBeCloseTo(areaBefore, 1);
  });
});

describe('worldToLocal', () => {
  it('should center polygon at origin', () => {
    const worldFootprint = [
      { x: 100, y: 100 },
      { x: 200, y: 100 },
      { x: 200, y: 200 },
      { x: 100, y: 200 },
    ];

    const { localFootprint, centroid } = worldToLocal(worldFootprint);

    // Centroid should be (150, 150)
    expect(centroid.x).toBeCloseTo(150, 5);
    expect(centroid.y).toBeCloseTo(150, 5);

    // Local points should be relative to centroid
    expect(localFootprint[0].x).toBeCloseTo(-50, 5); // 100 - 150
    expect(localFootprint[0].y).toBeCloseTo(-50, 5);
    expect(localFootprint[1].x).toBeCloseTo(50, 5);
    expect(localFootprint[1].y).toBeCloseTo(-50, 5);
  });

  it('should handle empty footprint', () => {
    const { localFootprint, centroid } = worldToLocal([]);

    expect(localFootprint).toEqual([]);
    expect(centroid).toEqual({ x: 0, y: 0 });
  });

  it('should calculate centroid correctly for triangle', () => {
    const triangle = [
      { x: 0, y: 0 },
      { x: 6, y: 0 },
      { x: 3, y: 3 },
    ];

    const { centroid } = worldToLocal(triangle);

    // Centroid of triangle: average of vertices
    expect(centroid.x).toBeCloseTo(3, 5);
    expect(centroid.y).toBeCloseTo(1, 5);
  });
});

describe('transformFootprint (complete pipeline)', () => {
  it('should produce consistent results', () => {
    const imageFootprint = [
      { x: 100, y: 100 },
      { x: 200, y: 100 },
      { x: 200, y: 200 },
      { x: 100, y: 200 },
    ];

    const siteConfig: SiteConfig = {
      imageWidth: 300,
      imageHeight: 300,
      scale: 1,
      northAngle: 0,
    };

    const result1 = transformFootprint(imageFootprint, siteConfig);
    const result2 = transformFootprint(imageFootprint, siteConfig);

    // Same inputs should produce same outputs (deterministic)
    expect(result1.data.centroid).toEqual(result2.data.centroid);
    expect(result1.data.localFootprint).toEqual(result2.data.localFootprint);
  });

  it('should include correct metadata', () => {
    const imageFootprint = [
      { x: 100, y: 100 },
      { x: 200, y: 100 },
      { x: 200, y: 200 },
    ];

    const siteConfig: SiteConfig = {
      imageWidth: 300,
      imageHeight: 300,
      scale: 2.5,
      northAngle: 45,
    };

    const result = transformFootprint(imageFootprint, siteConfig);

    expect(result.metadata.inputPoints).toBe(3);
    expect(result.metadata.outputPoints).toBe(3);
    expect(result.metadata.appliedScale).toBe(2.5);
    expect(result.metadata.appliedRotation).toBe(45);
  });
});

describe('calculatePolygonArea', () => {
  it('should calculate square area correctly', () => {
    const square = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];

    const area = calculatePolygonArea(square);
    expect(area).toBeCloseTo(100, 5); // 10 × 10 = 100
  });

  it('should calculate triangle area correctly', () => {
    const triangle = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 5, y: 10 },
    ];

    const area = calculatePolygonArea(triangle);
    expect(area).toBeCloseTo(50, 5); // (base × height) / 2 = (10 × 10) / 2 = 50
  });

  it('should return 0 for fewer than 3 points', () => {
    expect(calculatePolygonArea([])).toBe(0);
    expect(calculatePolygonArea([{ x: 0, y: 0 }])).toBe(0);
    expect(calculatePolygonArea([{ x: 0, y: 0 }, { x: 1, y: 1 }])).toBe(0);
  });

  it('should handle negative coordinates', () => {
    const square = [
      { x: -5, y: -5 },
      { x: 5, y: -5 },
      { x: 5, y: 5 },
      { x: -5, y: 5 },
    ];

    const area = calculatePolygonArea(square);
    expect(area).toBeCloseTo(100, 5);
  });
});

describe('calculateBoundingBox', () => {
  it('should calculate bbox correctly', () => {
    const points = [
      { x: 10, y: 20 },
      { x: 50, y: 30 },
      { x: 40, y: 60 },
    ];

    const bbox = calculateBoundingBox(points);

    expect(bbox.minX).toBe(10);
    expect(bbox.maxX).toBe(50);
    expect(bbox.minY).toBe(20);
    expect(bbox.maxY).toBe(60);
    expect(bbox.width).toBe(40); // 50 - 10
    expect(bbox.height).toBe(40); // 60 - 20
  });

  it('should handle empty array', () => {
    const bbox = calculateBoundingBox([]);

    expect(bbox.minX).toBe(0);
    expect(bbox.maxX).toBe(0);
    expect(bbox.width).toBe(0);
    expect(bbox.height).toBe(0);
  });
});

describe('hasSelfIntersection', () => {
  it('should detect self-intersection in figure-8', () => {
    const figure8 = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 10, y: 0 },
      { x: 0, y: 10 },
    ];

    expect(hasSelfIntersection(figure8)).toBe(true);
  });

  it('should not detect intersection in simple square', () => {
    const square = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];

    expect(hasSelfIntersection(square)).toBe(false);
  });

  it('should return false for triangles (cannot self-intersect)', () => {
    const triangle = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 5, y: 10 },
    ];

    expect(hasSelfIntersection(triangle)).toBe(false);
  });
});

describe('Regression tests for known bugs', () => {
  it('should not flip triangles', () => {
    // Triangle pointing east (right)
    const triangle = [
      { x: 150, y: 150 },
      { x: 200, y: 150 },
      { x: 175, y: 125 },
    ];

    const siteConfig: SiteConfig = {
      imageWidth: 300,
      imageHeight: 300,
      scale: 1,
      northAngle: 0,
    };

    const result = transformFootprint(triangle, siteConfig);

    // Check that rightmost point is still on positive X axis
    const maxX = Math.max(...result.data.worldFootprint.map(p => p.x));
    expect(maxX).toBeGreaterThan(0);
  });

  it('should handle all quadrants identically', () => {
    const siteConfig: SiteConfig = {
      imageWidth: 400,
      imageHeight: 400,
      scale: 1,
      northAngle: 45,
    };

    // 4 identical triangles in each quadrant
    const triangles = [
      // NE quadrant
      [{ x: 300, y: 100 }, { x: 350, y: 100 }, { x: 325, y: 75 }],
      // SE quadrant
      [{ x: 300, y: 300 }, { x: 350, y: 300 }, { x: 325, y: 325 }],
      // SW quadrant
      [{ x: 100, y: 300 }, { x: 150, y: 300 }, { x: 125, y: 325 }],
      // NW quadrant
      [{ x: 100, y: 100 }, { x: 150, y: 100 }, { x: 125, y: 75 }],
    ];

    const results = triangles.map(t => transformFootprint(t, siteConfig));

    // All should have same area (rotation preserves area)
    const areas = results.map(r => calculatePolygonArea(r.data.worldFootprint));
    const firstArea = areas[0];

    areas.forEach(area => {
      expect(area).toBeCloseTo(firstArea, 1);
    });
  });
});
