/**
 * Image Analysis Web Worker
 *
 * Runs image detection algorithms off the main thread
 * for responsive UI during heavy pixel processing.
 * Sends progressive updates as each detection stage completes.
 */

import type { Point2D } from '../types';

// Message types
interface AnalyzeMessage {
  type: 'analyze';
  payload: {
    imageData: ImageData;
    width: number;
    height: number;
    originalWidth?: number;
    originalHeight?: number;
    scale?: number; // Scale factor to multiply coordinates back to original
    options?: {
      skipAmenities?: boolean;
    };
  };
}

interface ProgressMessage {
  type: 'progress';
  payload: {
    stage: string;
    percent: number;
    message: string;
  };
}

interface PartialResultMessage {
  type: 'partial';
  payload: {
    resultType: 'buildings' | 'amenities' | 'compass' | 'scale' | 'roads' | 'vegetation' | 'waterBodies';
    data: unknown;
  };
}

interface CompleteMessage {
  type: 'complete';
  payload: AnalysisResult;
}

interface ErrorMessage {
  type: 'error';
  payload: string;
}

type WorkerMessage = AnalyzeMessage;

// Result types
interface DetectedBuilding {
  id: string;
  footprint: Point2D[];
  boundingBox: { x: number; y: number; width: number; height: number };
  area: number;
  confidence: number;
  suggestedName: string;
  color: string;
  centroid: Point2D;
}

interface DetectedAmenity {
  id: string;
  type: string;
  position: Point2D;
  boundingBox: { x: number; y: number; width: number; height: number };
  confidence: number;
}

interface AnalysisResult {
  buildings: DetectedBuilding[];
  amenities: DetectedAmenity[];
  compass: { position: Point2D; northAngle: number; confidence: number } | null;
  scale: { position: Point2D; pixelLength: number; suggestedMeters?: number; confidence: number } | null;
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

// Color profiles for detection
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

// Helper: Send progress update
function sendProgress(stage: string, percent: number, message: string): void {
  self.postMessage({
    type: 'progress',
    payload: { stage, percent, message },
  } as ProgressMessage);
}

// Helper: Send partial result
function sendPartial(resultType: string, data: unknown): void {
  self.postMessage({
    type: 'partial',
    payload: { resultType, data },
  } as PartialResultMessage);
}

// Helper: Create color mask
function createColorMask(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  colorRanges: Array<{ r: number[]; g: number[]; b: number[] }>
): boolean[] {
  const mask: boolean[] = new Array(width * height).fill(false);

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

// Helper: Find connected components using BFS
function findConnectedComponents(
  mask: boolean[],
  width: number,
  height: number,
  minSize: number = 50
): Array<{
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

    const component: number[] = [];
    const queue = [i];
    let minX = width, maxX = 0, minY = height, maxY = 0;
    let sumX = 0, sumY = 0;

    while (queue.length > 0) {
      const pixel = queue.shift()!;
      if (visited.has(pixel)) continue;

      visited.add(pixel);
      component.push(pixel);

      const x = pixel % width;
      const y = Math.floor(pixel / width);

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
        pixel - width,
        pixel + width,
      ];

      for (const neighbor of neighbors) {
        if (
          neighbor >= 0 &&
          neighbor < mask.length &&
          mask[neighbor] &&
          !visited.has(neighbor)
        ) {
          const nx = neighbor % width;
          const ox = pixel % width;
          if (Math.abs(nx - ox) <= 1) {
            queue.push(neighbor);
          }
        }
      }
    }

    if (component.length > minSize) {
      const outline: Point2D[] = [
        { x: minX, y: minY },
        { x: maxX, y: minY },
        { x: maxX, y: maxY },
        { x: minX, y: maxY },
      ];

      components.push({
        pixels: component,
        outline,
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

// Building colors
function getBuildingColor(index: number): string {
  const colors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
  ];
  return colors[index % colors.length];
}

// Detection functions
function detectBuildings(
  data: Uint8ClampedArray,
  width: number,
  height: number
): DetectedBuilding[] {
  const buildings: DetectedBuilding[] = [];

  const buildingMask = createColorMask(
    data, width, height,
    Object.values(COLOR_PROFILES.building)
  );

  const components = findConnectedComponents(buildingMask, width, height);

  let buildingIndex = 0;
  for (const component of components) {
    const minArea = (width * height) * 0.001;
    const maxArea = (width * height) * 0.15;

    if (component.area < minArea || component.area > maxArea) continue;

    const aspectRatio = component.boundingBox.width / component.boundingBox.height;
    if (aspectRatio < 0.2 || aspectRatio > 5) continue;

    const rectangularity = component.area / (component.boundingBox.width * component.boundingBox.height);
    const confidence = Math.min(0.95, rectangularity + 0.3);

    if (confidence < 0.4) continue;

    buildingIndex++;
    buildings.push({
      id: `building-${buildingIndex}`,
      footprint: component.outline,
      boundingBox: component.boundingBox,
      area: component.area,
      confidence,
      suggestedName: `Tower ${buildingIndex}`,
      color: getBuildingColor(buildingIndex),
      centroid: component.centroid,
    });
  }

  // Sort by position
  buildings.sort((a, b) => {
    const rowA = Math.floor(a.centroid.y / (height / 5));
    const rowB = Math.floor(b.centroid.y / (height / 5));
    if (rowA !== rowB) return rowA - rowB;
    return a.centroid.x - b.centroid.x;
  });

  buildings.forEach((b, i) => {
    b.suggestedName = `Tower ${i + 1}`;
  });

  return buildings;
}

function detectAmenities(
  data: Uint8ClampedArray,
  width: number,
  height: number
): DetectedAmenity[] {
  const amenities: DetectedAmenity[] = [];

  // Detect pools
  const poolMask = createColorMask(data, width, height, Object.values(COLOR_PROFILES.pool));
  const poolComponents = findConnectedComponents(poolMask, width, height, 20);

  let amenityIndex = 0;
  for (const component of poolComponents) {
    const minPoolArea = (width * height) * 0.0005;
    const maxPoolArea = (width * height) * 0.02;

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

  return amenities;
}

function detectRoads(
  data: Uint8ClampedArray,
  width: number,
  height: number
): Point2D[][] {
  const roadMask = createColorMask(data, width, height, Object.values(COLOR_PROFILES.road));
  const components = findConnectedComponents(roadMask, width, height);

  return components
    .filter((c) => {
      const aspectRatio = Math.max(
        c.boundingBox.width / c.boundingBox.height,
        c.boundingBox.height / c.boundingBox.width
      );
      return aspectRatio > 3 || c.area > (width * height) * 0.05;
    })
    .map((c) => c.outline);
}

function detectVegetation(
  data: Uint8ClampedArray,
  width: number,
  height: number
): Point2D[][] {
  const vegMask = createColorMask(data, width, height, Object.values(COLOR_PROFILES.vegetation));
  const components = findConnectedComponents(vegMask, width, height);

  return components
    .filter((c) => c.area > (width * height) * 0.001)
    .map((c) => c.outline);
}

function detectWaterBodies(
  data: Uint8ClampedArray,
  width: number,
  height: number
): Point2D[][] {
  const waterMask = createColorMask(data, width, height, [COLOR_PROFILES.water.blue]);
  const components = findConnectedComponents(waterMask, width, height);

  return components
    .filter((c) => c.area > (width * height) * 0.02)
    .map((c) => c.outline);
}

function analyzeImageStats(
  data: Uint8ClampedArray
): { dominantColors: string[]; brightness: number; contrast: number } {
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

    // Quantize colors
    const qr = Math.round(r / 32) * 32;
    const qg = Math.round(g / 32) * 32;
    const qb = Math.round(b / 32) * 32;
    const colorKey = `rgb(${qr},${qg},${qb})`;
    colorCounts.set(colorKey, (colorCounts.get(colorKey) || 0) + 1);
  }

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

// Main analysis function
async function runAnalysis(imageData: ImageData, width: number, height: number): Promise<AnalysisResult> {
  const data = imageData.data;

  // Stage 1: Buildings (most important, send first)
  sendProgress('buildings', 10, 'Detecting buildings...');
  const buildings = detectBuildings(data, width, height);
  sendPartial('buildings', buildings);
  sendProgress('buildings', 30, `Found ${buildings.length} building(s)`);

  // Stage 2: Amenities
  sendProgress('amenities', 35, 'Finding amenities...');
  const amenities = detectAmenities(data, width, height);
  sendPartial('amenities', amenities);
  sendProgress('amenities', 50, `Found ${amenities.length} amenity(ies)`);

  // Stage 3: Roads and infrastructure
  sendProgress('roads', 55, 'Detecting roads...');
  const roads = detectRoads(data, width, height);
  sendPartial('roads', roads);
  sendProgress('roads', 65, `Found ${roads.length} road segment(s)`);

  // Stage 4: Vegetation
  sendProgress('vegetation', 70, 'Identifying vegetation...');
  const vegetation = detectVegetation(data, width, height);
  sendPartial('vegetation', vegetation);
  sendProgress('vegetation', 80, `Found ${vegetation.length} green area(s)`);

  // Stage 5: Water bodies
  sendProgress('water', 85, 'Finding water bodies...');
  const waterBodies = detectWaterBodies(data, width, height);
  sendPartial('waterBodies', waterBodies);
  sendProgress('water', 90, 'Almost done...');

  // Stage 6: Image stats
  sendProgress('stats', 95, 'Finalizing analysis...');
  const imageStats = analyzeImageStats(data);

  return {
    buildings,
    amenities,
    compass: null, // Simplified for performance
    scale: null,
    roads,
    vegetation,
    waterBodies,
    siteOutline: null,
    imageStats,
  };
}

// Helper: Scale coordinates back to original image space
function scaleResult(result: AnalysisResult, scale: number): AnalysisResult {
  if (scale === 1) return result;

  const scalePoint = (p: Point2D): Point2D => ({
    x: Math.round(p.x * scale),
    y: Math.round(p.y * scale),
  });

  const scaleBBox = (b: { x: number; y: number; width: number; height: number }) => ({
    x: Math.round(b.x * scale),
    y: Math.round(b.y * scale),
    width: Math.round(b.width * scale),
    height: Math.round(b.height * scale),
  });

  return {
    ...result,
    buildings: result.buildings.map((b) => ({
      ...b,
      footprint: b.footprint.map(scalePoint),
      boundingBox: scaleBBox(b.boundingBox),
      area: Math.round(b.area * scale * scale),
      centroid: scalePoint(b.centroid),
    })),
    amenities: result.amenities.map((a) => ({
      ...a,
      position: scalePoint(a.position),
      boundingBox: scaleBBox(a.boundingBox),
    })),
    roads: result.roads.map((road) => road.map(scalePoint)),
    vegetation: result.vegetation.map((veg) => veg.map(scalePoint)),
    waterBodies: result.waterBodies.map((water) => water.map(scalePoint)),
    siteOutline: result.siteOutline?.map(scalePoint) || null,
    compass: result.compass
      ? { ...result.compass, position: scalePoint(result.compass.position) }
      : null,
    scale: result.scale
      ? {
          ...result.scale,
          position: scalePoint(result.scale.position),
          pixelLength: Math.round(result.scale.pixelLength * scale),
        }
      : null,
  };
}

// Worker message handler
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type, payload } = event.data;

  if (type === 'analyze') {
    try {
      const scale = payload.scale || 1;
      const isDownsampled = scale !== 1;

      sendProgress('init', 5, isDownsampled ? 'Processing optimized image...' : 'Preparing image...');

      let result = await runAnalysis(
        payload.imageData,
        payload.width,
        payload.height
      );

      // Scale coordinates back to original image dimensions
      if (scale !== 1) {
        sendProgress('scaling', 98, 'Adjusting coordinates...');
        result = scaleResult(result, scale);
      }

      sendProgress('complete', 100, 'Analysis complete!');

      self.postMessage({
        type: 'complete',
        payload: result,
      } as CompleteMessage);
    } catch (error) {
      self.postMessage({
        type: 'error',
        payload: error instanceof Error ? error.message : 'Analysis failed',
      } as ErrorMessage);
    }
  }
};

export {};
