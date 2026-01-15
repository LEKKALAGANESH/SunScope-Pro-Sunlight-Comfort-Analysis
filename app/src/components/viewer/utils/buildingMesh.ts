import * as THREE from "three";
import type { Building } from "../../../types";

/**
 * Create building mesh with LOD (Level of Detail) for performance
 */
export function createBuildingMesh(
  building: Building,
  scale: number,
  selectedFloor?: number,
  isSelected?: boolean
): THREE.LOD {
  const lod = new THREE.LOD();

  // Scale footprint points
  const points = building.footprint.map((p) => ({
    x: p.x * scale,
    y: p.y * scale,
  }));

  // Calculate center and bounding box
  const centerX =
    points.length > 0
      ? points.reduce((sum, p) => sum + p.x, 0) / points.length
      : 0;
  const centerZ =
    points.length > 0
      ? points.reduce((sum, p) => sum + p.y, 0) / points.length
      : 0;

  // Calculate width and depth for LOD box
  const minX = Math.min(...points.map((p) => p.x - centerX));
  const maxX = Math.max(...points.map((p) => p.x - centerX));
  const minZ = Math.min(...points.map((p) => p.y - centerZ));
  const maxZ = Math.max(...points.map((p) => p.y - centerZ));
  const width = maxX - minX || 10;
  const depth = maxZ - minZ || 10;

  // Shared material for all LOD levels
  const buildingColor = new THREE.Color(building.color);
  const material = new THREE.MeshStandardMaterial({
    color: buildingColor,
    roughness: 0.6,
    metalness: 0.15,
    transparent: isSelected && selectedFloor !== undefined,
    opacity: isSelected && selectedFloor !== undefined ? 0.4 : 1.0,
  });

  // LOW LOD: Simplified polygon (for far distances) - still preserves building shape
  const lowGroup = new THREE.Group();
  if (points.length >= 3) {
    const lowShape = new THREE.Shape();
    points.forEach((point, index) => {
      const x = point.x - centerX;
      const z = point.y - centerZ; // rotateX(-PI/2) will flip Y to -Z, so no manual negation needed
      if (index === 0) lowShape.moveTo(x, z);
      else lowShape.lineTo(x, z);
    });
    lowShape.closePath();

    const lowGeo = new THREE.ExtrudeGeometry(lowShape, {
      steps: 1,
      depth: building.totalHeight,
      bevelEnabled: false,
    });
    lowGeo.rotateX(-Math.PI / 2);

    const lowMesh = new THREE.Mesh(lowGeo, material);
    lowMesh.castShadow = true;
    lowMesh.receiveShadow = true;
    lowGroup.add(lowMesh);
  } else {
    // Fallback to box for invalid shapes
    const lowGeo = new THREE.BoxGeometry(width, building.totalHeight, depth);
    const lowMesh = new THREE.Mesh(lowGeo, material);
    lowMesh.position.y = building.totalHeight / 2;
    lowMesh.castShadow = true;
    lowMesh.receiveShadow = true;
    lowGroup.add(lowMesh);
  }

  // Color palette for floors (cycling through distinct colors) - used by HIGH and MEDIUM LOD
  const floorPalette = [
    0x4CAF50,  // Green
    0x2196F3,  // Blue
    0xFF9800,  // Orange
    0x9C27B0,  // Purple
    0x00BCD4,  // Cyan
    0xE91E63,  // Pink
    0x8BC34A,  // Light Green
    0x3F51B5,  // Indigo
    0xFFC107,  // Amber
    0x009688,  // Teal
    0xF44336,  // Red
    0x673AB7,  // Deep Purple
    0x03A9F4,  // Light Blue
    0xCDDC39,  // Lime
    0xFF5722,  // Deep Orange
  ];

  // Generate floor colors array
  const floorColors: THREE.Color[] = [];
  for (let i = 0; i < building.floors; i++) {
    const paletteIndex = i % floorPalette.length;
    const floorColor = new THREE.Color(floorPalette[paletteIndex]);
    const brightnessFactor = 0.9 + (i / Math.max(building.floors - 1, 1)) * 0.2;
    floorColor.multiplyScalar(brightnessFactor);
    floorColor.r = Math.min(1, Math.max(0, floorColor.r));
    floorColor.g = Math.min(1, Math.max(0, floorColor.g));
    floorColor.b = Math.min(1, Math.max(0, floorColor.b));
    floorColors.push(floorColor);
  }

  // MEDIUM LOD: Extruded shape with floor colors but no labels/roof detail
  const medGroup = new THREE.Group();
  if (points.length >= 3) {
    // Create individual floor sections with colors
    for (let floor = 1; floor <= building.floors; floor++) {
      const floorBottom = (floor - 1) * building.floorHeight;
      const floorHeight = building.floorHeight;
      const isSelectedFloor = isSelected && floor === selectedFloor;

      const floorShape = new THREE.Shape();
      points.forEach((point, index) => {
        const x = point.x - centerX;
        const z = point.y - centerZ; // rotateX(-PI/2) will flip Y to -Z
        if (index === 0) floorShape.moveTo(x, z);
        else floorShape.lineTo(x, z);
      });
      floorShape.closePath();

      const floorGeo = new THREE.ExtrudeGeometry(floorShape, {
        steps: 1,
        depth: floorHeight - 0.1,
        bevelEnabled: false,
      });
      floorGeo.rotateX(-Math.PI / 2);

      const floorMat = new THREE.MeshStandardMaterial({
        color: isSelectedFloor ? 0xfbbf24 : floorColors[floor - 1],
        roughness: 0.6,
        metalness: 0.15,
        transparent: isSelectedFloor,
        opacity: isSelectedFloor ? 0.8 : 1.0,
      });

      const floorMesh = new THREE.Mesh(floorGeo, floorMat);
      floorMesh.position.y = floorBottom;
      floorMesh.castShadow = true;
      floorMesh.receiveShadow = true;
      medGroup.add(floorMesh);
    }
  } else {
    // Fallback for invalid shapes
    const fallbackGeo = new THREE.BoxGeometry(width, building.totalHeight, depth);
    const fallbackMesh = new THREE.Mesh(fallbackGeo, material);
    fallbackMesh.position.y = building.totalHeight / 2;
    fallbackMesh.castShadow = true;
    medGroup.add(fallbackMesh);
  }

  // HIGH LOD: Full detail with floor visualization and labels
  const highGroup = new THREE.Group();
  if (points.length >= 3) {
    // Add roof detail
    const roofShape = new THREE.Shape();
    points.forEach((point, index) => {
      const x = point.x - centerX;
      const z = point.y - centerZ; // rotateX(-PI/2) will flip Y to -Z
      if (index === 0) roofShape.moveTo(x, z);
      else roofShape.lineTo(x, z);
    });
    roofShape.closePath();

    const roofGeo = new THREE.ShapeGeometry(roofShape);
    roofGeo.rotateX(-Math.PI / 2);
    const roofMat = new THREE.MeshStandardMaterial({
      color: buildingColor.clone().multiplyScalar(0.8),
      roughness: 0.4,
      metalness: 0.1,
    });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = building.totalHeight + 0.1;
    roof.receiveShadow = true;
    highGroup.add(roof);

    // Create individual floor sections (using shared floorColors)
    for (let floor = 1; floor <= building.floors; floor++) {
      const floorBottom = (floor - 1) * building.floorHeight;
      const floorHeight = building.floorHeight;
      const isSelectedFloor = isSelected && floor === selectedFloor;

      const floorShape = new THREE.Shape();
      points.forEach((point, index) => {
        const x = point.x - centerX;
        const z = point.y - centerZ; // rotateX(-PI/2) will flip Y to -Z
        if (index === 0) floorShape.moveTo(x, z);
        else floorShape.lineTo(x, z);
      });
      floorShape.closePath();

      const floorGeo = new THREE.ExtrudeGeometry(floorShape, {
        steps: 1,
        depth: floorHeight - 0.1,
        bevelEnabled: false,
      });
      floorGeo.rotateX(-Math.PI / 2);

      const floorMat = new THREE.MeshStandardMaterial({
        color: isSelectedFloor ? 0xfbbf24 : floorColors[floor - 1],
        roughness: 0.6,
        metalness: 0.15,
        transparent: isSelectedFloor,
        opacity: isSelectedFloor ? 0.8 : 1.0,
      });

      const floorMesh = new THREE.Mesh(floorGeo, floorMat);
      floorMesh.position.y = floorBottom;
      floorMesh.castShadow = true;
      floorMesh.receiveShadow = true;
      highGroup.add(floorMesh);

      // Add floor divider line (Z negated to match post-rotation shape coordinates)
      const outlinePoints = points.map(
        (p) => new THREE.Vector3(p.x - centerX, floorBottom + floorHeight, -(p.y - centerZ))
      );
      outlinePoints.push(outlinePoints[0]);
      const outlineGeo = new THREE.BufferGeometry().setFromPoints(outlinePoints);
      const outlineMat = new THREE.LineBasicMaterial({
        color: isSelectedFloor ? 0xfbbf24 : 0x333333,
        linewidth: isSelectedFloor ? 2 : 1,
      });
      const outline = new THREE.Line(outlineGeo, outlineMat);
      highGroup.add(outline);
    }

    // Add floor labels
    for (let floor = 1; floor <= building.floors; floor++) {
      const showLabel = building.floors <= 20 || floor === 1 || floor === building.floors || floor % 5 === 0;
      const isSelectedFloor = isSelected && floor === selectedFloor;

      if (showLabel || isSelectedFloor) {
        const floorHeight = floor * building.floorHeight - building.floorHeight / 2;

        const canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 32;
        const ctx = canvas.getContext("2d")!;

        ctx.fillStyle = isSelectedFloor ? "rgba(251, 191, 36, 0.9)" : "rgba(0, 0, 0, 0.6)";
        ctx.beginPath();
        ctx.roundRect(4, 4, 56, 24, 4);
        ctx.fill();

        ctx.fillStyle = isSelectedFloor ? "#000000" : "#ffffff";
        ctx.font = "bold 18px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${floor}`, 32, 16);

        const texture = new THREE.CanvasTexture(canvas);
        const labelMat = new THREE.SpriteMaterial({ map: texture });
        const label = new THREE.Sprite(labelMat);
        label.position.set(maxX + 8, floorHeight, 0);
        label.scale.set(6, 3, 1);
        highGroup.add(label);
      }
    }
  } else {
    // Fallback for invalid shapes
    const fallbackGeo = new THREE.BoxGeometry(width, building.totalHeight, depth);
    const fallbackMesh = new THREE.Mesh(fallbackGeo, material);
    fallbackMesh.position.y = building.totalHeight / 2;
    fallbackMesh.castShadow = true;
    fallbackMesh.receiveShadow = true;
    highGroup.add(fallbackMesh);
  }

  // Add LOD levels - increased thresholds to show detailed polygon shapes at further distances
  lod.addLevel(highGroup, 0);      // 0-1000: Full detail with floor colors
  lod.addLevel(medGroup, 1000);    // 1000-3000: Polygon shape without floor detail
  lod.addLevel(lowGroup, 3000);    // 3000+: Simple box (only for very far distances)

  lod.position.set(centerX, 0, -centerZ); // Negate Z to match flipped coordinates
  lod.userData = { buildingId: building.id };

  return lod;
}
