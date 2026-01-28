/**
 * Building Mesh Builder - REWRITTEN FOR CORRECT VERTICAL EXTRUSION
 *
 * Creates 3D building meshes from 2D footprint polygons using earcut triangulation.
 *
 * KEY CONCEPTS:
 * - Input: 2D footprint points in XZ plane (Y=0 is ground)
 * - Output: 3D building extruded UPWARD along Y-axis
 * - Each floor has a distinct color
 * - Floor edges are visible as lines
 *
 * COORDINATE SYSTEM:
 * - X = East/West
 * - Y = Height (UP)
 * - Z = North/South
 */

import earcut from "earcut";
import * as THREE from "three";
import type { Point2D } from "./types";

/**
 * Accessible floor color palette for clear floor differentiation
 *
 * Design principles:
 * - Good contrast against ground/land colors
 * - Distinguishable for color blindness (uses varied hues + luminance)
 * - WCAG 2.1 accessible color combinations
 * - Professional, architectural appearance
 * - Alternating warm/cool tones for better visual separation
 * - Avoids browns/grays that blend with ground
 */
const FLOOR_COLORS_PASTEL = [
  0x7cb9e8, // Floor 1 - Sky blue (distinct from ground)
  0xf4a460, // Floor 2 - Sandy orange
  0x98d8c8, // Floor 3 - Seafoam green
  0xdda0dd, // Floor 4 - Plum/lavender
  0xffd700, // Floor 5 - Gold yellow
  0x87ceeb, // Floor 6 - Light sky blue
  0xffb6c1, // Floor 7 - Light pink
  0x90ee90, // Floor 8 - Light green
  0xdeb887, // Floor 9 - Burlywood tan
  0xb0c4de, // Floor 10 - Light steel blue
  0xffa07a, // Floor 11 - Light salmon
  0x98fb98, // Floor 12 - Pale green
  0xe6e6fa, // Floor 13 - Lavender
  0xffefd5, // Floor 14 - Papaya whip
  0xafeeee, // Floor 15+ - Pale turquoise
];

// Edge colors for floor separation - slightly darker than floor colors
const FLOOR_EDGE_COLOR = 0xbbbbbb; // Light gray for subtle floor lines
const FLOOR_EDGE_COLOR_DARK = 0x999999; // Darker for base and vertical edges

// Selected floor highlight color
const FLOOR_COLOR_SELECTED = 0xfbbf24; // Warm amber - stands out against pastels

export interface MeshBuilderOptions {
  color: string;
  floors: number;
  floorHeight: number;
  showFloorDivisions?: boolean;
  isSelected?: boolean;
  selectedFloor?: number;
  floorOpacity?: number;
  castShadow?: boolean;
  receiveShadow?: boolean;
}

export interface RobustMeshBuilderOptions extends MeshBuilderOptions {
  validateInput?: boolean;
  minArea?: number;
  maxAspectRatio?: number;
  epsilon?: number;
  generateDebugWireframe?: boolean;
  logValidation?: boolean;
}

export interface RobustMeshBuilderResult {
  mesh: THREE.Object3D;
  validation: {
    valid: boolean;
    normalized: Point2D[];
    errors: string[];
    warnings: string[];
    metadata: {
      originalVertexCount: number;
      normalizedVertexCount: number;
      area: number;
      windingOrder: "CW" | "CCW";
      wasReversed: boolean;
      duplicatesRemoved: number;
    };
  };
  triangulation: {
    indices: number[];
    triangleCount: number;
    valid: boolean;
    validation: { relativeError: number };
  };
  debugWireframe?: THREE.LineSegments;
}

/**
 * Triangulate a 2D polygon using earcut
 * Returns array of triangle indices
 */
function triangulatePolygon(points: Point2D[]): number[] {
  // Flatten points for earcut: [x1, y1, x2, y2, ...]
  const flatPoints: number[] = [];
  for (const p of points) {
    flatPoints.push(p.x, p.y);
  }

  // Run earcut triangulation
  return earcut(flatPoints);
}

/**
 * Calculate polygon area using shoelace formula
 */
function calculateArea(points: Point2D[]): number {
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
 * Get winding order of polygon
 */
function getWindingOrder(points: Point2D[]): "CW" | "CCW" {
  let sum = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    sum += (points[j].x - points[i].x) * (points[j].y + points[i].y);
  }
  return sum > 0 ? "CW" : "CCW";
}

/**
 * Ensure polygon is counter-clockwise (required for correct face normals)
 */
function ensureCCW(points: Point2D[]): Point2D[] {
  if (getWindingOrder(points) === "CW") {
    return points.slice().reverse();
  }
  return points;
}

/**
 * Remove duplicate/near-duplicate points
 */
function removeDuplicates(
  points: Point2D[],
  epsilon: number = 0.001,
): Point2D[] {
  const result: Point2D[] = [];
  for (let i = 0; i < points.length; i++) {
    const curr = points[i];
    const next = points[(i + 1) % points.length];
    const dist = Math.sqrt((next.x - curr.x) ** 2 + (next.y - curr.y) ** 2);
    if (dist > epsilon) {
      result.push(curr);
    }
  }
  return result.length >= 3 ? result : points;
}

/**
 * Create a single floor mesh with proper vertical extrusion
 *
 * @param footprint - 2D points in XZ plane (Point2D where x=X, y=Z)
 * @param floorBottom - Y coordinate of floor bottom
 * @param floorTop - Y coordinate of floor top
 * @param color - Floor color
 * @param isHighlighted - Whether this floor is highlighted
 */
function createFloorMesh(
  footprint: Point2D[],
  floorBottom: number,
  floorTop: number,
  color: THREE.Color,
  isHighlighted: boolean = false,
): THREE.Mesh {
  // Triangulate the footprint
  const triangles = triangulatePolygon(footprint);

  // Build geometry manually for correct orientation
  const vertices: number[] = [];
  const indices: number[] = [];
  const normals: number[] = [];

  const n = footprint.length;

  // === BOTTOM FACE (Y = floorBottom, normal pointing DOWN) ===
  for (const p of footprint) {
    vertices.push(p.x, floorBottom, p.y); // Note: p.y is Z coordinate
    normals.push(0, -1, 0);
  }

  // Add bottom triangles (reversed winding for downward normal)
  for (let i = 0; i < triangles.length; i += 3) {
    indices.push(triangles[i + 2], triangles[i + 1], triangles[i]);
  }

  // === TOP FACE (Y = floorTop, normal pointing UP) ===
  const topOffset = n;
  for (const p of footprint) {
    vertices.push(p.x, floorTop, p.y);
    normals.push(0, 1, 0);
  }

  // Add top triangles
  for (let i = 0; i < triangles.length; i += 3) {
    indices.push(
      triangles[i] + topOffset,
      triangles[i + 1] + topOffset,
      triangles[i + 2] + topOffset,
    );
  }

  // === SIDE FACES (vertical walls) ===
  const sideOffset = n * 2;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const p1 = footprint[i];
    const p2 = footprint[j];

    // Calculate outward normal for this wall
    const dx = p2.x - p1.x;
    const dz = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dz * dz);
    const nx = dz / len; // Perpendicular in XZ plane
    const nz = -dx / len;

    const baseIdx = sideOffset + i * 4;

    // Four vertices for this wall quad
    // Bottom-left
    vertices.push(p1.x, floorBottom, p1.y);
    normals.push(nx, 0, nz);

    // Bottom-right
    vertices.push(p2.x, floorBottom, p2.y);
    normals.push(nx, 0, nz);

    // Top-right
    vertices.push(p2.x, floorTop, p2.y);
    normals.push(nx, 0, nz);

    // Top-left
    vertices.push(p1.x, floorTop, p1.y);
    normals.push(nx, 0, nz);

    // Two triangles for this quad - reversed winding for OUTWARD facing walls
    indices.push(
      baseIdx,
      baseIdx + 2,
      baseIdx + 1,
      baseIdx,
      baseIdx + 3,
      baseIdx + 2,
    );
  }

  // Create BufferGeometry
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  // Create material with settings optimized for shadow visibility on building surfaces
  const material = new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.85, // Matte surface - critical for shadow visibility on walls
    metalness: 0.0, // No metalness - prevents reflection washing out shadows
    transparent: true, // MUST be true for building-to-building shadows
    opacity: isHighlighted ? 0.95 : 0.99,
    side: THREE.FrontSide,
    flatShading: false,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  return mesh;
}

/**
 * Create floor edge lines
 */
function createFloorEdges(
  footprint: Point2D[],
  floorY: number,
  color: number,
  isHighlighted: boolean = false,
): THREE.Line {
  const points: THREE.Vector3[] = [];

  for (const p of footprint) {
    points.push(new THREE.Vector3(p.x, floorY, p.y));
  }
  // Close the loop
  points.push(new THREE.Vector3(footprint[0].x, floorY, footprint[0].y));

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: isHighlighted ? 0xffd700 : color,
    linewidth: isHighlighted ? 2 : 1,
  });

  return new THREE.Line(geometry, material);
}

/**
 * Create vertical edge lines at corners
 */
function createVerticalEdges(
  footprint: Point2D[],
  bottomY: number,
  topY: number,
  color: number,
): THREE.LineSegments {
  const points: THREE.Vector3[] = [];

  for (const p of footprint) {
    points.push(new THREE.Vector3(p.x, bottomY, p.y));
    points.push(new THREE.Vector3(p.x, topY, p.y));
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: color,
    linewidth: 1,
  });

  return new THREE.LineSegments(geometry, material);
}

/**
 * Create roof mesh with distinct appearance
 * Roofs are slightly lighter and have different material properties
 */
function createRoofMesh(
  footprint: Point2D[],
  roofY: number,
  color: THREE.Color,
): THREE.Mesh {
  const triangles = triangulatePolygon(footprint);

  const vertices: number[] = [];
  const normals: number[] = [];

  for (const p of footprint) {
    vertices.push(p.x, roofY, p.y);
    normals.push(0, 1, 0);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(triangles);

  // Roof is lighter and has matte finish to show shadows clearly
  const roofColor = color.clone().lerp(new THREE.Color(0xf8f8f8), 0.4);
  const material = new THREE.MeshStandardMaterial({
    color: roofColor,
    roughness: 0.9,
    metalness: 0.0,
    transparent: true, // Required for shadows from taller buildings
    opacity: 0.99,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  mesh.castShadow = true; // V2: Roof casts shadows for building-to-building shadow effects

  return mesh;
}

/**
 * Create floor number label as a sprite
 * Semi-transparent pill background for visibility on any background
 */
function createFloorLabel(
  footprint: Point2D[],
  floorNumber: number,
  floorMidY: number,
  isSelected: boolean = false,
  floorHeight: number = 3, // Used to scale label proportionally
): THREE.Sprite {
  // Find the centroid of the footprint
  let sumZ = 0;
  for (const p of footprint) {
    sumZ += p.y;
  }
  const centroidZ = sumZ / footprint.length;

  // Find the max X extent and calculate building radius
  let maxX = -Infinity;
  let minX = Infinity;
  let maxZ = -Infinity;
  let minZ = Infinity;
  for (const p of footprint) {
    if (p.x > maxX) maxX = p.x;
    if (p.x < minX) minX = p.x;
    if (p.y > maxZ) maxZ = p.y;
    if (p.y < minZ) minZ = p.y;
  }

  // Create canvas for the label with semi-transparent pill background
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;

  const text = String(floorNumber);
  ctx.font = "normal 36px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Measure text to size the pill
  const metrics = ctx.measureText(text);
  const textWidth = metrics.width;
  const pillPadding = 16;
  const pillWidth = Math.max(textWidth + pillPadding * 2, 45);
  const pillHeight = 40;
  const pillX = (128 - pillWidth) / 2;
  const pillY = (64 - pillHeight) / 2;
  const pillRadius = pillHeight / 2;

  // Draw semi-transparent pill background
  ctx.fillStyle = isSelected
    ? "rgba(251, 191, 36, 0.85)"
    : "rgba(60, 60, 60, 0.45)";
  ctx.beginPath();
  ctx.roundRect(pillX, pillY, pillWidth, pillHeight, pillRadius);
  ctx.fill();

  // Draw text (no stroke needed with pill background)
  ctx.fillStyle = isSelected ? "#000000" : "#ffffff";
  ctx.fillText(text, 64, 32);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
  });

  const sprite = new THREE.Sprite(material);

  // Scale label proportionally to floor height
  // Base scale for standard 3m floor, scales up for larger floor heights
  const scaleFactor = Math.max(1, floorHeight / 3);
  const labelWidth = 12 * scaleFactor;
  const labelHeight = 6 * scaleFactor;

  // Position label just outside the building edge, with gap proportional to scale
  const labelOffset = maxX + 3 * scaleFactor;

  sprite.position.set(labelOffset, floorMidY, centroidZ);
  sprite.scale.set(labelWidth, labelHeight, 1);
  sprite.name = `FloorLabel_${floorNumber}`;

  return sprite;
}

/**
 * MAIN FUNCTION: Create robust building mesh with proper vertical extrusion
 *
 * @param localFootprint - Building footprint in local coordinates (centered at origin)
 *                         Point2D where x=X axis, y=Z axis
 * @param options - Building options (floors, height, colors, etc.)
 */
export function createRobustBuildingMesh(
  localFootprint: Point2D[],
  options: RobustMeshBuilderOptions,
): RobustMeshBuilderResult {
  const {
    color,
    floors,
    floorHeight,
    showFloorDivisions = true,
    isSelected = false,
    selectedFloor,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    logValidation: _logValidation = false,
  } = options;

  const errors: string[] = [];
  const warnings: string[] = [];

  // Validation
  if (localFootprint.length < 3) {
    errors.push("Footprint must have at least 3 points");
    return {
      mesh: new THREE.Group(),
      validation: {
        valid: false,
        normalized: [],
        errors,
        warnings,
        metadata: {
          originalVertexCount: localFootprint.length,
          normalizedVertexCount: 0,
          area: 0,
          windingOrder: "CCW",
          wasReversed: false,
          duplicatesRemoved: 0,
        },
      },
      triangulation: {
        indices: [],
        triangleCount: 0,
        valid: false,
        validation: { relativeError: 0 },
      },
    };
  }

  // Clean and normalize footprint
  const cleaned = removeDuplicates(localFootprint);
  const duplicatesRemoved = localFootprint.length - cleaned.length;
  const originalWinding = getWindingOrder(cleaned);
  const normalized = ensureCCW(cleaned);
  const wasReversed = originalWinding === "CW";
  const area = calculateArea(normalized);

  if (duplicatesRemoved > 0) {
    warnings.push(`Removed ${duplicatesRemoved} duplicate vertices`);
  }
  if (wasReversed) {
    warnings.push("Reversed winding order to CCW");
  }
  if (area < 1) {
    warnings.push(`Very small area: ${area.toFixed(2)} m²`);
  }

  // Triangulate
  const triangles = triangulatePolygon(normalized);
  const triangleCount = triangles.length / 3;

  // logValidation flag available for debugging if needed

  // Create the building group
  const group = new THREE.Group();
  group.name = "Building";

  const totalHeight = floors * floorHeight;
  const baseColor = new THREE.Color(color);

  // Create each floor with professional gradient coloring
  for (let floor = 1; floor <= floors; floor++) {
    const floorBottom = (floor - 1) * floorHeight;
    const floorTop = floor * floorHeight;
    const isSelectedFloor = isSelected && floor === selectedFloor;

    // Get floor color - cycle through pastel palette for clear differentiation
    // Each floor gets a distinct color, cycling through the palette
    const colorIndex = (floor - 1) % FLOOR_COLORS_PASTEL.length;
    const floorColor = isSelectedFloor
      ? new THREE.Color(FLOOR_COLOR_SELECTED) // Amber for selected floor
      : new THREE.Color(FLOOR_COLORS_PASTEL[colorIndex]);

    // Create floor mesh
    const floorMesh = createFloorMesh(
      normalized,
      floorBottom,
      floorTop,
      floorColor,
      isSelectedFloor,
    );
    floorMesh.name = `Floor_${floor}`;
    group.add(floorMesh);

    // Add floor division lines for clear floor separation
    if (showFloorDivisions) {
      const edgeColor = isSelectedFloor
        ? FLOOR_COLOR_SELECTED
        : FLOOR_EDGE_COLOR;
      const topEdge = createFloorEdges(
        normalized,
        floorTop,
        edgeColor,
        isSelectedFloor,
      );
      topEdge.name = `FloorEdge_${floor}`;
      group.add(topEdge);

      // Add bottom edge for first floor for grounding
      if (floor === 1) {
        const bottomEdge = createFloorEdges(
          normalized,
          floorBottom + 0.01,
          FLOOR_EDGE_COLOR_DARK,
          false,
        );
        bottomEdge.name = `FloorEdge_0_base`;
        group.add(bottomEdge);
      }
    }

    // Add floor number labels
    // Show labels for: first floor, selected floor, top floor, and every 5th floor for tall buildings
    const showLabel =
      floor === 1 ||
      floor === floors ||
      isSelectedFloor ||
      (floors > 10 && floor % 5 === 0) ||
      floors <= 10;

    if (showLabel) {
      const floorMidY = (floorBottom + floorTop) / 2;
      const label = createFloorLabel(
        normalized,
        floor,
        floorMidY,
        isSelectedFloor,
        floorHeight, // Pass floor height for proportional scaling
      );
      group.add(label);
    }
  }

  // Add vertical edge lines at corners for building definition
  const verticalEdges = createVerticalEdges(
    normalized,
    0,
    totalHeight,
    FLOOR_EDGE_COLOR_DARK,
  );
  verticalEdges.name = "VerticalEdges";
  group.add(verticalEdges);

  // Add roof with subtle tint from building color
  const roofColor = baseColor.clone().lerp(new THREE.Color(0xffffff), 0.3);
  const roofMesh = createRoofMesh(normalized, totalHeight + 0.02, roofColor);
  roofMesh.name = "Roof";
  group.add(roofMesh);

  // Add prominent base edge for visual grounding
  const baseEdge = createFloorEdges(normalized, 0.02, FLOOR_EDGE_COLOR_DARK);
  baseEdge.name = "BaseEdge";
  group.add(baseEdge);

  return {
    mesh: group,
    validation: {
      valid: errors.length === 0,
      normalized,
      errors,
      warnings,
      metadata: {
        originalVertexCount: localFootprint.length,
        normalizedVertexCount: normalized.length,
        area,
        windingOrder: originalWinding,
        wasReversed,
        duplicatesRemoved,
      },
    },
    triangulation: {
      indices: triangles,
      triangleCount,
      valid: true,
      validation: { relativeError: 0 },
    },
  };
}

/**
 * Legacy function for compatibility
 */
export function createBuildingMesh(
  localFootprint: Point2D[],
  options: MeshBuilderOptions,
): THREE.Object3D {
  const result = createRobustBuildingMesh(localFootprint, options);
  return result.mesh;
}

/**
 * Create floor-by-floor mesh (alias for compatibility)
 */
export function createFloorByFloorMesh(
  localFootprint: Point2D[],
  options: MeshBuilderOptions,
): THREE.Object3D {
  return createBuildingMesh(localFootprint, options);
}

/**
 * Create extruded geometry (for compatibility)
 */
export function createExtrudedGeometry(
  footprint: Point2D[],
  height: number,
  triangulation: number[],
): THREE.BufferGeometry {
  const vertices: number[] = [];
  const indices: number[] = [];
  const normals: number[] = [];

  const n = footprint.length;

  // Bottom face
  for (const p of footprint) {
    vertices.push(p.x, 0, p.y);
    normals.push(0, -1, 0);
  }
  for (let i = 0; i < triangulation.length; i += 3) {
    indices.push(triangulation[i + 2], triangulation[i + 1], triangulation[i]);
  }

  // Top face
  const topOffset = n;
  for (const p of footprint) {
    vertices.push(p.x, height, p.y);
    normals.push(0, 1, 0);
  }
  for (let i = 0; i < triangulation.length; i += 3) {
    indices.push(
      triangulation[i] + topOffset,
      triangulation[i + 1] + topOffset,
      triangulation[i + 2] + topOffset,
    );
  }

  // Side faces
  const sideOffset = n * 2;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const p1 = footprint[i];
    const p2 = footprint[j];

    const dx = p2.x - p1.x;
    const dz = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dz * dz);
    const nx = dz / len;
    const nz = -dx / len;

    const baseIdx = sideOffset + i * 4;

    vertices.push(p1.x, 0, p1.y);
    normals.push(nx, 0, nz);
    vertices.push(p2.x, 0, p2.y);
    normals.push(nx, 0, nz);
    vertices.push(p2.x, height, p2.y);
    normals.push(nx, 0, nz);
    vertices.push(p1.x, height, p1.y);
    normals.push(nx, 0, nz);

    indices.push(baseIdx, baseIdx + 1, baseIdx + 2);
    indices.push(baseIdx, baseIdx + 2, baseIdx + 3);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  return geometry;
}

/**
 * Create debug wireframe
 */
export function createDebugWireframe(
  footprint: Point2D[],
  height: number,
): THREE.LineSegments {
  const points: THREE.Vector3[] = [];

  // Base outline
  for (let i = 0; i < footprint.length; i++) {
    const p1 = footprint[i];
    const p2 = footprint[(i + 1) % footprint.length];
    points.push(new THREE.Vector3(p1.x, 0, p1.y));
    points.push(new THREE.Vector3(p2.x, 0, p2.y));
  }

  // Top outline
  for (let i = 0; i < footprint.length; i++) {
    const p1 = footprint[i];
    const p2 = footprint[(i + 1) % footprint.length];
    points.push(new THREE.Vector3(p1.x, height, p1.y));
    points.push(new THREE.Vector3(p2.x, height, p2.y));
  }

  // Vertical edges
  for (const p of footprint) {
    points.push(new THREE.Vector3(p.x, 0, p.y));
    points.push(new THREE.Vector3(p.x, height, p.y));
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color: 0x00ff00 });

  return new THREE.LineSegments(geometry, material);
}

/**
 * Dispose mesh resources
 */
export function disposeMesh(mesh: THREE.Object3D): void {
  mesh.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry?.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach((m) => m.dispose());
      } else {
        child.material?.dispose();
      }
    }
  });
}
