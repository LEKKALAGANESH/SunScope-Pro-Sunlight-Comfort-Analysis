/**
 * ImageAnalyzer - Advanced image analysis for site plan detection
 * Detects buildings, amenities, compass, and other site elements
 * Uses Canny edge detection (WASM) for accurate building outlines
 */

import type { Point2D, DetectedBuilding, DetectedAmenity, DetectedCompass, DetectedScale } from '../../types';
import {
  detectEdges,
  extractContoursFromEdges,
  mergeNearbyContours,
  findRectangularApproximation,
  type EdgeDetectionResult,
  type ContourResult,
} from './EdgeDetector';

// Internal analysis result type (without selected flag)
export interface AnalysisResult {
  buildings: Omit<DetectedBuilding, 'selected'>[];
  amenities: Omit<DetectedAmenity, 'selected'>[];
  compass: DetectedCompass | null;
  scale: DetectedScale | null;
  roads: Point2D[][];
  vegetation: Point2D[][];
  waterBodies: Point2D[][];
  siteOutline: Point2D[] | null;
  imageStats: {
    dominantColors: string[];
    brightness: number;
    contrast: number;
  };
}

// Color definitions for detection
const COLOR_PROFILES = {
  building: {
    white: { r: [200, 255], g: [200, 255], b: [200, 255] },
    lightGray: { r: [180, 220], g: [180, 220], b: [180, 220] },
    cream: { r: [230, 255], g: [220, 250], b: [200, 240] },
  },
  pool: {
    lightBlue: { r: [100, 200], g: [180, 240], b: [220, 255] },
    turquoise: { r: [0, 150], g: [180, 255], b: [200, 255] },
  },
  vegetation: {
    green: { r: [50, 150], g: [120, 200], b: [50, 150] },
    darkGreen: { r: [30, 100], g: [80, 160], b: [30, 100] },
  },
  road: {
    gray: { r: [100, 160], g: [100, 160], b: [100, 160] },
    darkGray: { r: [60, 120], g: [60, 120], b: [60, 120] },
  },
  water: {
    blue: { r: [50, 150], g: [100, 200], b: [180, 255] },
  },
  boundary: {
    red: { r: [180, 255], g: [0, 100], b: [0, 100] },
    orange: { r: [200, 255], g: [100, 180], b: [0, 80] },
  },
};

export class ImageAnalyzer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private imageData: ImageData | null = null;
  private edgeResult: EdgeDetectionResult | null = null;
  private width: number = 0;
  private height: number = 0;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
  }

  async analyze(imageDataUrl: string): Promise<AnalysisResult> {
    // Load image
    await this.loadImage(imageDataUrl);

    // Run edge detection first (used by building detection)
    if (this.imageData) {
      try {
        this.edgeResult = await detectEdges(this.imageData);
      } catch (error) {
        console.warn('Edge detection failed, falling back to color-based detection:', error);
        this.edgeResult = null;
      }
    }

    // Run all detection algorithms
    const [buildings, amenities, compass, scale, roads, vegetation, waterBodies, siteOutline] =
      await Promise.all([
        this.detectBuildings(),
        this.detectAmenities(),
        this.detectCompass(),
        this.detectScale(),
        this.detectRoads(),
        this.detectVegetation(),
        this.detectWaterBodies(),
        this.detectSiteOutline(),
      ]);

    // Get image statistics
    const imageStats = this.analyzeImageStats();

    return {
      buildings,
      amenities,
      compass,
      scale,
      roads,
      vegetation,
      waterBodies,
      siteOutline,
      imageStats,
    };
  }

  private async loadImage(dataUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.width = img.width;
        this.height = img.height;
        this.canvas.width = img.width;
        this.canvas.height = img.height;
        this.ctx.drawImage(img, 0, 0);
        this.imageData = this.ctx.getImageData(0, 0, img.width, img.height);
        resolve();
      };
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

  private async detectBuildings(): Promise<Omit<DetectedBuilding, 'selected'>[]> {
    if (!this.imageData) return [];

    const buildings: Omit<DetectedBuilding, 'selected'>[] = [];

    // Create binary mask for building-colored pixels
    const buildingMask = this.createColorMask(
      Object.values(COLOR_PROFILES.building)
    );

    // Find connected components (building footprints)
    const components = this.findConnectedComponents(buildingMask);

    // Filter and process components
    let buildingIndex = 0;
    for (const component of components) {
      // Filter by size (buildings should be reasonably large)
      const minArea = (this.width * this.height) * 0.001; // At least 0.1% of image
      const maxArea = (this.width * this.height) * 0.15; // At most 15% of image

      if (component.area < minArea || component.area > maxArea) continue;

      // Filter by aspect ratio (buildings are usually somewhat rectangular)
      const aspectRatio = component.boundingBox.width / component.boundingBox.height;
      if (aspectRatio < 0.2 || aspectRatio > 5) continue;

      // Calculate confidence based on rectangularity
      const rectangularity = component.area / (component.boundingBox.width * component.boundingBox.height);
      const confidence = Math.min(0.95, rectangularity + 0.3);

      if (confidence < 0.4) continue;

      // Try to get better outline using edge detection
      let finalOutline = component.outline;
      let finalArea = component.area;

      if (this.edgeResult) {
        const improvedOutline = this.refineOutlineWithEdges(component, this.edgeResult);
        if (improvedOutline) {
          finalOutline = improvedOutline.points;
          finalArea = improvedOutline.area;
        }
      }

      buildingIndex++;
      buildings.push({
        id: `building-${buildingIndex}`,
        footprint: finalOutline,
        boundingBox: component.boundingBox,
        area: finalArea,
        confidence,
        suggestedName: `Building ${String.fromCharCode(64 + buildingIndex)}`,
        color: this.getBuildingColor(buildingIndex),
        centroid: component.centroid,
      });
    }

    // Remove overlapping buildings (keep the larger one)
    const nonOverlappingBuildings = this.removeOverlappingBuildings(buildings);

    // Sort by position (top-left to bottom-right)
    nonOverlappingBuildings.sort((a, b) => {
      const rowA = Math.floor(a.centroid.y / (this.height / 5));
      const rowB = Math.floor(b.centroid.y / (this.height / 5));
      if (rowA !== rowB) return rowA - rowB;
      return a.centroid.x - b.centroid.x;
    });

    // Rename after sorting
    nonOverlappingBuildings.forEach((b, i) => {
      b.suggestedName = `Tower ${i + 1}`;
      b.id = `building-${i + 1}`;
    });

    return nonOverlappingBuildings;
  }

  /**
   * Refine building outline using edge detection results
   */
  private refineOutlineWithEdges(
    component: {
      pixels: number[];
      outline: Point2D[];
      boundingBox: { x: number; y: number; width: number; height: number };
      area: number;
      centroid: Point2D;
    },
    edgeResult: EdgeDetectionResult
  ): ContourResult | null {
    const { boundingBox } = component;
    const padding = 10; // Add some padding around the bounding box

    // Create a mask for the region of interest (expanded bounding box)
    const regionMask: boolean[] = new Array(this.width * this.height).fill(false);

    const startX = Math.max(0, boundingBox.x - padding);
    const startY = Math.max(0, boundingBox.y - padding);
    const endX = Math.min(this.width, boundingBox.x + boundingBox.width + padding);
    const endY = Math.min(this.height, boundingBox.y + boundingBox.height + padding);

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        regionMask[y * this.width + x] = true;
      }
    }

    // Extract contours from edges within this region
    const contours = extractContoursFromEdges(edgeResult, regionMask);

    if (contours.length === 0) {
      return null;
    }

    // Merge nearby contours that might be parts of the same building
    const mergedContours = mergeNearbyContours(contours, 20);

    // Find the contour that best matches our building region
    let bestContour: ContourResult | null = null;
    let bestScore = 0;

    for (const contour of mergedContours) {
      // Score based on:
      // 1. Overlap with original component
      // 2. Area similarity
      // 3. Centroid proximity

      const centroidDist = Math.hypot(
        contour.centroid.x - component.centroid.x,
        contour.centroid.y - component.centroid.y
      );

      const areaDiff = Math.abs(contour.area - component.area) / component.area;

      // Check if contour centroid is within bounding box
      const inBounds =
        contour.centroid.x >= boundingBox.x &&
        contour.centroid.x <= boundingBox.x + boundingBox.width &&
        contour.centroid.y >= boundingBox.y &&
        contour.centroid.y <= boundingBox.y + boundingBox.height;

      if (!inBounds) continue;

      // Calculate score (higher is better)
      const distScore = 1 / (1 + centroidDist / 50);
      const areaScore = 1 / (1 + areaDiff);
      const score = distScore * areaScore;

      if (score > bestScore && contour.area > component.area * 0.3) {
        bestScore = score;
        bestContour = contour;
      }
    }

    if (bestContour && bestContour.points.length >= 4) {
      // Get a clean rectangular approximation
      const approximated = findRectangularApproximation(bestContour);
      return {
        ...bestContour,
        points: approximated,
      };
    }

    return null;
  }

  /**
   * Remove overlapping buildings, keeping the larger one
   */
  private removeOverlappingBuildings(
    buildings: Omit<DetectedBuilding, 'selected'>[]
  ): Omit<DetectedBuilding, 'selected'>[] {
    const result: Omit<DetectedBuilding, 'selected'>[] = [];
    const removed = new Set<string>();

    // Sort by area (largest first)
    const sorted = [...buildings].sort((a, b) => b.area - a.area);

    for (const building of sorted) {
      if (removed.has(building.id)) continue;

      let shouldAdd = true;

      // Check overlap with already accepted buildings
      for (const existing of result) {
        const overlapRatio = this.calculateOverlapRatio(building.boundingBox, existing.boundingBox);

        // If significant overlap (>30%), mark as duplicate
        if (overlapRatio > 0.3) {
          // Keep the one with higher confidence, or the larger one
          if (building.confidence > existing.confidence || building.area > existing.area) {
            // Remove the existing one and add this one
            const index = result.findIndex(b => b.id === existing.id);
            if (index !== -1) {
              result.splice(index, 1);
            }
          } else {
            shouldAdd = false;
          }
          break;
        }
      }

      if (shouldAdd) {
        result.push(building);
      }
    }

    return result;
  }

  /**
   * Calculate the overlap ratio between two bounding boxes
   */
  private calculateOverlapRatio(
    box1: { x: number; y: number; width: number; height: number },
    box2: { x: number; y: number; width: number; height: number }
  ): number {
    const x1 = Math.max(box1.x, box2.x);
    const y1 = Math.max(box1.y, box2.y);
    const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
    const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);

    if (x2 <= x1 || y2 <= y1) {
      return 0; // No overlap
    }

    const overlapArea = (x2 - x1) * (y2 - y1);
    const area1 = box1.width * box1.height;
    const area2 = box2.width * box2.height;
    const smallerArea = Math.min(area1, area2);

    return overlapArea / smallerArea;
  }

  private async detectAmenities(): Promise<Omit<DetectedAmenity, 'selected'>[]> {
    if (!this.imageData) return [];

    const amenities: Omit<DetectedAmenity, 'selected'>[] = [];

    // Detect swimming pools (blue areas)
    const poolMask = this.createColorMask(Object.values(COLOR_PROFILES.pool));
    const poolComponents = this.findConnectedComponents(poolMask);

    let amenityIndex = 0;
    for (const component of poolComponents) {
      const minPoolArea = (this.width * this.height) * 0.0005;
      const maxPoolArea = (this.width * this.height) * 0.02;

      if (component.area < minPoolArea || component.area > maxPoolArea) continue;

      amenityIndex++;
      amenities.push({
        id: `amenity-${amenityIndex}`,
        type: 'swimming_pool',
        position: component.centroid,
        boundingBox: component.boundingBox,
        confidence: 0.7,
      });
    }

    // Detect tennis/sports courts (green rectangles with high aspect ratio)
    const greenMask = this.createColorMask([COLOR_PROFILES.vegetation.green]);
    const greenComponents = this.findConnectedComponents(greenMask);

    for (const component of greenComponents) {
      const aspectRatio = component.boundingBox.width / component.boundingBox.height;

      // Tennis courts have specific aspect ratio (~2:1)
      if (aspectRatio > 1.8 && aspectRatio < 2.5) {
        const courtArea = (this.width * this.height) * 0.002;
        if (Math.abs(component.area - courtArea) < courtArea * 0.5) {
          amenityIndex++;
          amenities.push({
            id: `amenity-${amenityIndex}`,
            type: 'tennis_court',
            position: component.centroid,
            boundingBox: component.boundingBox,
            confidence: 0.5,
          });
        }
      }
    }

    return amenities;
  }

  private async detectCompass(): Promise<DetectedCompass | null> {
    if (!this.imageData) return null;

    // Look for compass in corners and edges (typical locations)
    const searchRegions = [
      { x: this.width * 0.75, y: this.height * 0.75, w: this.width * 0.25, h: this.height * 0.25, priority: 1 }, // Bottom-right (most common)
      { x: this.width * 0.75, y: 0, w: this.width * 0.25, h: this.height * 0.25, priority: 2 }, // Top-right
      { x: 0, y: 0, w: this.width * 0.25, h: this.height * 0.25, priority: 3 }, // Top-left
      { x: 0, y: this.height * 0.75, w: this.width * 0.25, h: this.height * 0.25, priority: 4 }, // Bottom-left
      { x: this.width * 0.4, y: 0, w: this.width * 0.2, h: this.height * 0.15, priority: 5 }, // Top center
      { x: this.width * 0.4, y: this.height * 0.85, w: this.width * 0.2, h: this.height * 0.15, priority: 5 }, // Bottom center
    ];

    // Sort by priority
    searchRegions.sort((a, b) => a.priority - b.priority);

    for (const region of searchRegions) {
      // Look for compass indicators:
      // 1. High contrast small regions (arrows)
      // 2. Triangular shapes (north arrow)
      // 3. Circular elements
      const compassResult = this.analyzeRegionForCompass(region);

      if (compassResult) {
        return compassResult;
      }
    }

    return null;
  }

  private analyzeRegionForCompass(region: { x: number; y: number; w: number; h: number }): DetectedCompass | null {
    if (!this.imageData) return null;

    const data = this.imageData.data;
    const regionStartX = Math.floor(region.x);
    const regionStartY = Math.floor(region.y);
    const regionEndX = Math.min(this.width, Math.floor(region.x + region.w));
    const regionEndY = Math.min(this.height, Math.floor(region.y + region.h));

    // Look for high-contrast pixels (compass arrows are usually bold colors)
    let darkPixelCount = 0;
    let totalPixels = 0;
    let sumX = 0, sumY = 0;
    let redPixels = 0;

    for (let y = regionStartY; y < regionEndY; y++) {
      for (let x = regionStartX; x < regionEndX; x++) {
        const i = (y * this.width + x) * 4;
        const r = data[i], g = data[i + 1], b = data[i + 2];

        totalPixels++;

        // Check for dark pixels (compass typically has black elements)
        if (r < 50 && g < 50 && b < 50) {
          darkPixelCount++;
          sumX += x;
          sumY += y;
        }

        // Check for red pixels (north arrow often red)
        if (r > 180 && g < 80 && b < 80) {
          redPixels++;
          sumX += x;
          sumY += y;
        }
      }
    }

    const darkRatio = darkPixelCount / totalPixels;
    const redRatio = redPixels / totalPixels;

    // Compass typically has 1-10% dark pixels and sometimes red
    // Too few = no compass, too many = probably not a compass
    if ((darkRatio > 0.005 && darkRatio < 0.15) || redRatio > 0.002) {
      const centerCount = darkPixelCount + redPixels;
      const compassCenter = centerCount > 0
        ? { x: sumX / centerCount, y: sumY / centerCount }
        : { x: region.x + region.w / 2, y: region.y + region.h / 2 };

      // Estimate north angle based on red pixel distribution (if any)
      // For now, default to 0 (north = up)
      return {
        position: compassCenter,
        northAngle: 0,
        confidence: redRatio > 0.002 ? 0.7 : 0.5,
      };
    }

    return null;
  }

  private async detectScale(): Promise<DetectedScale | null> {
    if (!this.imageData) return null;

    // Look for scale bars - typically horizontal lines with markings
    // Common locations: bottom of image, near legend
    const searchRegions = [
      { x: 0, y: this.height * 0.85, w: this.width, h: this.height * 0.15 }, // Bottom
      { x: 0, y: this.height * 0.7, w: this.width * 0.3, h: this.height * 0.3 }, // Bottom-left
      { x: this.width * 0.7, y: this.height * 0.7, w: this.width * 0.3, h: this.height * 0.3 }, // Bottom-right
    ];

    for (const region of searchRegions) {
      const scaleResult = this.analyzeRegionForScale(region);
      if (scaleResult) {
        return scaleResult;
      }
    }

    return null;
  }

  private analyzeRegionForScale(region: { x: number; y: number; w: number; h: number }): DetectedScale | null {
    if (!this.imageData) return null;

    const data = this.imageData.data;
    const regionStartX = Math.floor(region.x);
    const regionStartY = Math.floor(region.y);
    const regionEndX = Math.min(this.width, Math.floor(region.x + region.w));
    const regionEndY = Math.min(this.height, Math.floor(region.y + region.h));

    // Look for horizontal lines (scale bars are typically horizontal)
    const horizontalLines: { y: number; startX: number; endX: number }[] = [];

    for (let y = regionStartY; y < regionEndY; y++) {
      let lineStart = -1;
      let lineLength = 0;

      for (let x = regionStartX; x < regionEndX; x++) {
        const i = (y * this.width + x) * 4;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const isDark = r < 100 && g < 100 && b < 100;

        if (isDark) {
          if (lineStart === -1) lineStart = x;
          lineLength++;
        } else {
          if (lineLength > 30 && lineLength < region.w * 0.5) {
            // Found a potential scale bar
            horizontalLines.push({ y, startX: lineStart, endX: lineStart + lineLength });
          }
          lineStart = -1;
          lineLength = 0;
        }
      }
    }

    // Find the most prominent horizontal line
    if (horizontalLines.length > 0) {
      // Sort by length and pick the longest
      horizontalLines.sort((a, b) => (b.endX - b.startX) - (a.endX - a.startX));
      const bestLine = horizontalLines[0];

      return {
        position: {
          x: (bestLine.startX + bestLine.endX) / 2,
          y: bestLine.y,
        },
        pixelLength: bestLine.endX - bestLine.startX,
        suggestedMeters: undefined, // Would need OCR to read the label
        confidence: 0.4,
      };
    }

    return null;
  }

  private async detectRoads(): Promise<Point2D[][]> {
    if (!this.imageData) return [];

    const roadMask = this.createColorMask(Object.values(COLOR_PROFILES.road));
    const components = this.findConnectedComponents(roadMask);

    // Filter for road-like shapes (elongated)
    return components
      .filter((c) => {
        const aspectRatio = Math.max(
          c.boundingBox.width / c.boundingBox.height,
          c.boundingBox.height / c.boundingBox.width
        );
        return aspectRatio > 3 || c.area > (this.width * this.height) * 0.05;
      })
      .map((c) => c.outline);
  }

  private async detectVegetation(): Promise<Point2D[][]> {
    if (!this.imageData) return [];

    const vegMask = this.createColorMask(Object.values(COLOR_PROFILES.vegetation));
    const components = this.findConnectedComponents(vegMask);

    return components
      .filter((c) => c.area > (this.width * this.height) * 0.001)
      .map((c) => c.outline);
  }

  private async detectWaterBodies(): Promise<Point2D[][]> {
    if (!this.imageData) return [];

    const waterMask = this.createColorMask([COLOR_PROFILES.water.blue]);
    const components = this.findConnectedComponents(waterMask);

    // Filter for larger water bodies (not pools)
    return components
      .filter((c) => c.area > (this.width * this.height) * 0.02)
      .map((c) => c.outline);
  }

  private async detectSiteOutline(): Promise<Point2D[] | null> {
    if (!this.imageData) return null;

    // Look for red/orange boundary lines
    const boundaryMask = this.createColorMask(Object.values(COLOR_PROFILES.boundary));
    const components = this.findConnectedComponents(boundaryMask);

    // Find the largest boundary component
    const largest = components.reduce(
      (max, c) => (c.area > (max?.area || 0) ? c : max),
      null as (typeof components)[0] | null
    );

    return largest?.outline || null;
  }

  private createColorMask(colorRanges: Array<{ r: number[]; g: number[]; b: number[] }>): boolean[] {
    if (!this.imageData) return [];

    const mask: boolean[] = new Array(this.width * this.height).fill(false);
    const data = this.imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      for (const range of colorRanges) {
        if (
          r >= range.r[0] && r <= range.r[1] &&
          g >= range.g[0] && g <= range.g[1] &&
          b >= range.b[0] && b <= range.b[1]
        ) {
          mask[i / 4] = true;
          break;
        }
      }
    }

    return mask;
  }

  private findConnectedComponents(mask: boolean[]): Array<{
    pixels: number[];
    outline: Point2D[];
    boundingBox: { x: number; y: number; width: number; height: number };
    area: number;
    centroid: Point2D;
  }> {
    const components: Array<{
      pixels: number[];
      outline: Point2D[];
      boundingBox: { x: number; y: number; width: number; height: number };
      area: number;
      centroid: Point2D;
    }> = [];

    const visited = new Set<number>();

    for (let i = 0; i < mask.length; i++) {
      if (!mask[i] || visited.has(i)) continue;

      // BFS to find connected component
      const component: number[] = [];
      const queue = [i];
      let minX = this.width, maxX = 0, minY = this.height, maxY = 0;
      let sumX = 0, sumY = 0;

      while (queue.length > 0) {
        const pixel = queue.shift()!;
        if (visited.has(pixel)) continue;

        visited.add(pixel);
        component.push(pixel);

        const x = pixel % this.width;
        const y = Math.floor(pixel / this.width);

        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
        sumX += x;
        sumY += y;

        // Check 4-connected neighbors
        const neighbors = [
          pixel - 1,
          pixel + 1,
          pixel - this.width,
          pixel + this.width,
        ];

        for (const neighbor of neighbors) {
          if (
            neighbor >= 0 &&
            neighbor < mask.length &&
            mask[neighbor] &&
            !visited.has(neighbor)
          ) {
            // Check horizontal wrapping
            const nx = neighbor % this.width;
            const ox = pixel % this.width;
            if (Math.abs(nx - ox) <= 1) {
              queue.push(neighbor);
            }
          }
        }
      }

      if (component.length > 50) { // Minimum size threshold
        // Extract actual outline using contour tracing
        const outline = this.traceContour(component, minX, minY, maxX, maxY);

        // Simplify the outline to reduce points while preserving shape
        const simplifiedOutline = this.simplifyOutline(outline, 5);

        components.push({
          pixels: component,
          outline: simplifiedOutline.length >= 3 ? simplifiedOutline : outline,
          boundingBox: {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
          },
          area: component.length,
          centroid: {
            x: sumX / component.length,
            y: sumY / component.length,
          },
        });
      }
    }

    return components;
  }

  /**
   * Trace the contour of a connected component using a simple boundary following algorithm
   */
  private traceContour(
    componentPixels: number[],
    minX: number,
    minY: number,
    maxX: number,
    maxY: number
  ): Point2D[] {
    // Create a local grid for the component
    const width = maxX - minX + 3; // Add padding
    const height = maxY - minY + 3;
    const grid: boolean[][] = Array(height).fill(null).map(() => Array(width).fill(false));

    // Fill the grid with component pixels
    for (const pixel of componentPixels) {
      const x = (pixel % this.width) - minX + 1;
      const y = Math.floor(pixel / this.width) - minY + 1;
      if (x >= 0 && x < width && y >= 0 && y < height) {
        grid[y][x] = true;
      }
    }

    // Find starting point (topmost-leftmost boundary pixel)
    let startX = -1, startY = -1;
    outer: for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (grid[y][x]) {
          startX = x;
          startY = y;
          break outer;
        }
      }
    }

    if (startX === -1) {
      // Fallback to bounding box
      return [
        { x: minX, y: minY },
        { x: maxX, y: minY },
        { x: maxX, y: maxY },
        { x: minX, y: maxY },
      ];
    }

    // Moore neighborhood boundary tracing
    const outline: Point2D[] = [];
    const directions = [
      { dx: 1, dy: 0 },   // 0: right
      { dx: 1, dy: 1 },   // 1: right-down
      { dx: 0, dy: 1 },   // 2: down
      { dx: -1, dy: 1 },  // 3: left-down
      { dx: -1, dy: 0 },  // 4: left
      { dx: -1, dy: -1 }, // 5: left-up
      { dx: 0, dy: -1 },  // 6: up
      { dx: 1, dy: -1 },  // 7: right-up
    ];

    let x = startX, y = startY;
    let dir = 7; // Start looking up-right
    const maxIterations = componentPixels.length * 4;
    let iterations = 0;

    do {
      outline.push({
        x: x + minX - 1, // Convert back to image coordinates
        y: y + minY - 1
      });

      // Look for next boundary pixel
      let found = false;
      for (let i = 0; i < 8; i++) {
        const checkDir = (dir + 5 + i) % 8; // Start checking from back-left
        const nx = x + directions[checkDir].dx;
        const ny = y + directions[checkDir].dy;

        if (nx >= 0 && nx < width && ny >= 0 && ny < height && grid[ny][nx]) {
          x = nx;
          y = ny;
          dir = checkDir;
          found = true;
          break;
        }
      }

      if (!found) break;
      iterations++;
    } while ((x !== startX || y !== startY) && iterations < maxIterations);

    // If outline is too short, fall back to bounding box
    if (outline.length < 4) {
      return [
        { x: minX, y: minY },
        { x: maxX, y: minY },
        { x: maxX, y: maxY },
        { x: minX, y: maxY },
      ];
    }

    return outline;
  }

  /**
   * Simplify outline using Ramer-Douglas-Peucker algorithm
   */
  private simplifyOutline(points: Point2D[], epsilon: number): Point2D[] {
    if (points.length < 3) return points;

    // Find the point with the maximum distance from the line between first and last
    let maxDist = 0;
    let maxIndex = 0;

    const first = points[0];
    const last = points[points.length - 1];

    for (let i = 1; i < points.length - 1; i++) {
      const dist = this.perpendicularDistance(points[i], first, last);
      if (dist > maxDist) {
        maxDist = dist;
        maxIndex = i;
      }
    }

    // If max distance is greater than epsilon, recursively simplify
    if (maxDist > epsilon) {
      const left = this.simplifyOutline(points.slice(0, maxIndex + 1), epsilon);
      const right = this.simplifyOutline(points.slice(maxIndex), epsilon);

      // Combine results (remove duplicate point at the junction)
      return [...left.slice(0, -1), ...right];
    } else {
      // Return just the endpoints
      return [first, last];
    }
  }

  /**
   * Calculate perpendicular distance from point to line
   */
  private perpendicularDistance(point: Point2D, lineStart: Point2D, lineEnd: Point2D): number {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;

    if (dx === 0 && dy === 0) {
      // Line is a point
      return Math.sqrt(
        Math.pow(point.x - lineStart.x, 2) + Math.pow(point.y - lineStart.y, 2)
      );
    }

    const t = Math.max(0, Math.min(1,
      ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (dx * dx + dy * dy)
    ));

    const projX = lineStart.x + t * dx;
    const projY = lineStart.y + t * dy;

    return Math.sqrt(Math.pow(point.x - projX, 2) + Math.pow(point.y - projY, 2));
  }

  private analyzeImageStats(): { dominantColors: string[]; brightness: number; contrast: number } {
    if (!this.imageData) {
      return { dominantColors: [], brightness: 0.5, contrast: 0.5 };
    }

    const data = this.imageData.data;
    let totalBrightness = 0;
    let minBrightness = 255;
    let maxBrightness = 0;

    const colorCounts: Map<string, number> = new Map();

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const brightness = (r + g + b) / 3;
      totalBrightness += brightness;
      minBrightness = Math.min(minBrightness, brightness);
      maxBrightness = Math.max(maxBrightness, brightness);

      // Quantize colors for counting
      const qr = Math.round(r / 32) * 32;
      const qg = Math.round(g / 32) * 32;
      const qb = Math.round(b / 32) * 32;
      const colorKey = `rgb(${qr},${qg},${qb})`;
      colorCounts.set(colorKey, (colorCounts.get(colorKey) || 0) + 1);
    }

    // Get dominant colors
    const sortedColors = Array.from(colorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([color]) => color);

    const avgBrightness = totalBrightness / (data.length / 4) / 255;
    const contrast = (maxBrightness - minBrightness) / 255;

    return {
      dominantColors: sortedColors,
      brightness: avgBrightness,
      contrast,
    };
  }

  private getBuildingColor(index: number): string {
    const colors = [
      '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
      '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
      '#14B8A6', '#F43F5E', '#A855F7', '#22C55E', '#EAB308',
    ];
    return colors[index % colors.length];
  }
}

// Export singleton instance
export const imageAnalyzer = new ImageAnalyzer();
