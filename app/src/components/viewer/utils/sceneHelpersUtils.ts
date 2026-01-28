/**
 * Scene Helper Utilities
 *
 * Extracted from Scene3D.tsx to reduce file size.
 * Contains functions for creating and updating scene indicators:
 * - North arrow
 * - Sun ray visualization
 * - Scale bar
 * - Cardinal directions
 * - Building labels
 */

import * as THREE from "three";
import type { Point2D } from "../../../types";
import {
  CARDINAL_DIRECTIONS_CONFIG,
  SCALE_BAR_CONFIG,
  SUN_RAY_CONFIG,
} from "../../../store/sceneConfig";

/**
 * Create a north arrow indicator for the 3D scene
 * Points towards geographic north (negative Z in Three.js convention)
 */
export function createNorthArrow(): THREE.Group {
  const group = new THREE.Group();
  group.name = "NorthArrow";

  // Arrow body (cylinder pointing up, then we'll rotate)
  const arrowLength = 15;
  const arrowRadius = 1;

  // North arrow shaft
  const shaftGeo = new THREE.CylinderGeometry(
    arrowRadius * 0.5,
    arrowRadius * 0.5,
    arrowLength,
    8,
  );
  const northMaterial = new THREE.MeshStandardMaterial({
    color: 0xcc0000, // Red for north
    roughness: 0.5,
    metalness: 0.3,
  });
  const shaft = new THREE.Mesh(shaftGeo, northMaterial);
  shaft.position.y = arrowLength / 2;
  group.add(shaft);

  // Arrow head (cone)
  const coneGeo = new THREE.ConeGeometry(arrowRadius * 1.5, arrowRadius * 4, 8);
  const cone = new THREE.Mesh(coneGeo, northMaterial);
  cone.position.y = arrowLength + arrowRadius * 2;
  group.add(cone);

  // South indicator (shorter, different color)
  const southMaterial = new THREE.MeshStandardMaterial({
    color: 0x666666, // Gray for south
    roughness: 0.5,
    metalness: 0.3,
  });
  const southShaftGeo = new THREE.CylinderGeometry(
    arrowRadius * 0.3,
    arrowRadius * 0.3,
    arrowLength * 0.5,
    8,
  );
  const southShaft = new THREE.Mesh(southShaftGeo, southMaterial);
  southShaft.position.y = arrowLength * 0.25;
  southShaft.position.z = arrowLength * 0.6;
  southShaft.rotation.x = Math.PI / 2;
  group.add(southShaft);

  // "N" label using a plane with text texture
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#cc0000";
  ctx.font = "bold 48px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("N", 32, 32);

  const texture = new THREE.CanvasTexture(canvas);
  const labelMaterial = new THREE.SpriteMaterial({ map: texture });
  const label = new THREE.Sprite(labelMaterial);
  label.position.y = arrowLength + arrowRadius * 6;
  label.scale.set(8, 8, 1);
  group.add(label);

  // Base circle
  const baseGeo = new THREE.RingGeometry(arrowRadius * 3, arrowRadius * 4, 32);
  const baseMaterial = new THREE.MeshStandardMaterial({
    color: 0x333333,
    roughness: 0.8,
    side: THREE.DoubleSide,
  });
  const base = new THREE.Mesh(baseGeo, baseMaterial);
  base.rotation.x = -Math.PI / 2;
  base.position.y = 0.1;
  group.add(base);

  return group;
}

/**
 * Update the sun ray visualization
 * Creates a dashed line from sun position to ground with an arrow
 */
export function updateSunRay(
  group: THREE.Group,
  sunPos: { x: number; y: number; z: number },
  center: Point2D,
  maxHeight: number,
): void {
  // Clear existing children
  while (group.children.length > 0) {
    const child = group.children[0];
    if (child instanceof THREE.Line || child instanceof THREE.Mesh) {
      child.geometry.dispose();
      if (child.material instanceof THREE.Material) {
        child.material.dispose();
      }
    }
    group.remove(child);
  }

  // Create ray from sun to ground center
  const groundPoint = new THREE.Vector3(center.x, maxHeight / 2, center.y);
  const sunPoint = new THREE.Vector3(sunPos.x, sunPos.y, sunPos.z);

  // Direction from sun to ground
  const direction = groundPoint.clone().sub(sunPoint).normalize();

  // Ray line (dashed)
  const rayLength =
    sunPoint.distanceTo(groundPoint) * SUN_RAY_CONFIG.rayLengthPercent;
  const rayStart = sunPoint
    .clone()
    .add(
      direction
        .clone()
        .multiplyScalar(
          sunPoint.distanceTo(groundPoint) *
            SUN_RAY_CONFIG.rayStartOffsetPercent,
        ),
    );
  const rayEnd = groundPoint.clone();

  const rayGeo = new THREE.BufferGeometry().setFromPoints([rayStart, rayEnd]);
  const rayMaterial = new THREE.LineDashedMaterial({
    color: SUN_RAY_CONFIG.rayColor,
    dashSize: SUN_RAY_CONFIG.dash.dashSize,
    gapSize: SUN_RAY_CONFIG.dash.gapSize,
    linewidth: 2,
  });
  const ray = new THREE.Line(rayGeo, rayMaterial);
  ray.computeLineDistances();
  group.add(ray);

  // Arrow head at ground level pointing down
  const arrowSize = Math.max(
    rayLength * SUN_RAY_CONFIG.arrowSizeMultiplier,
    SUN_RAY_CONFIG.minArrowSize,
  );
  const arrowGeo = new THREE.ConeGeometry(arrowSize, arrowSize * 2, 8);
  const arrowMaterial = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
  const arrow = new THREE.Mesh(arrowGeo, arrowMaterial);
  arrow.position.copy(rayEnd);

  // Point arrow in direction of sun ray
  arrow.lookAt(sunPoint);
  arrow.rotateX(Math.PI / 2);

  group.add(arrow);

  // Sun direction indicator on ground (shadow of arrow)
  const groundArrowGeo = new THREE.ConeGeometry(
    arrowSize * 1.5,
    arrowSize * 3,
    8,
  );
  const groundArrowMaterial = new THREE.MeshBasicMaterial({
    color: 0x333333,
    transparent: true,
    opacity: 0.5,
  });
  const groundArrow = new THREE.Mesh(groundArrowGeo, groundArrowMaterial);
  groundArrow.position.set(center.x, 0.5, center.y);

  // Point towards where shadow will fall (opposite of sun)
  const shadowDir = new THREE.Vector3(
    -direction.x,
    0,
    -direction.z,
  ).normalize();
  groundArrow.position.add(shadowDir.multiplyScalar(arrowSize * 4));
  groundArrow.rotation.x = -Math.PI / 2;
  groundArrow.rotation.z = Math.atan2(-direction.x, -direction.z);

  group.add(groundArrow);
}

/**
 * Update the scale bar visualization
 * Shows a reference bar with distance markings
 */
export function updateScaleBar(
  group: THREE.Group,
  center: Point2D,
  sceneSize: number,
  metersPerPixel: number,
): void {
  // Parameter kept for API compatibility (may be used for precise scale calculations in future)
  void metersPerPixel;

  // Clear existing children
  while (group.children.length > 0) {
    const child = group.children[0];
    if (
      child instanceof THREE.Line ||
      child instanceof THREE.Mesh ||
      child instanceof THREE.Sprite
    ) {
      if ("geometry" in child) child.geometry.dispose();
      if ("material" in child) {
        const mat = child.material;
        if (mat instanceof THREE.Material) mat.dispose();
      }
    }
    group.remove(child);
  }

  // Calculate a nice round scale bar length
  const targetLength = sceneSize * SCALE_BAR_CONFIG.targetLengthPercent;
  const possibleLengths = SCALE_BAR_CONFIG.possibleLengths;
  let scaleLength = possibleLengths.find((l) => l >= targetLength * 0.5) || 100;
  if (scaleLength > targetLength * 2) scaleLength = targetLength;

  // Position at bottom-right corner of scene
  const startX = center.x + sceneSize * SCALE_BAR_CONFIG.positionXMultiplier;
  const startZ = center.y + sceneSize * SCALE_BAR_CONFIG.positionZMultiplier;

  // Main bar
  const barHeight = SCALE_BAR_CONFIG.barHeight;
  const barGeo = new THREE.BoxGeometry(
    scaleLength,
    barHeight,
    SCALE_BAR_CONFIG.barDepth,
  );
  const barMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
  const bar = new THREE.Mesh(barGeo, barMaterial);
  bar.position.set(startX + scaleLength / 2, barHeight / 2, startZ);
  group.add(bar);

  // End caps
  const capGeo = new THREE.BoxGeometry(
    SCALE_BAR_CONFIG.capWidth,
    barHeight * SCALE_BAR_CONFIG.capHeightMultiplier,
    SCALE_BAR_CONFIG.barDepth,
  );
  const leftCap = new THREE.Mesh(capGeo, barMaterial);
  leftCap.position.set(startX, barHeight * 1.5, startZ);
  group.add(leftCap);

  const rightCap = new THREE.Mesh(capGeo, barMaterial);
  rightCap.position.set(startX + scaleLength, barHeight * 1.5, startZ);
  group.add(rightCap);

  // Label with distance
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#333333";
  ctx.font = "bold 32px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const labelText =
    scaleLength >= 1000 ? `${scaleLength / 1000}km` : `${scaleLength}m`;
  ctx.fillText(labelText, 64, 32);

  const texture = new THREE.CanvasTexture(canvas);
  const labelMaterial = new THREE.SpriteMaterial({ map: texture });
  const label = new THREE.Sprite(labelMaterial);
  label.position.set(
    startX + scaleLength / 2,
    barHeight * SCALE_BAR_CONFIG.labelYMultiplier,
    startZ,
  );
  label.scale.set(
    scaleLength * SCALE_BAR_CONFIG.labelScaleWidth,
    scaleLength * SCALE_BAR_CONFIG.labelScaleHeight,
    1,
  );
  group.add(label);

  // Zero label
  const zeroCanvas = document.createElement("canvas");
  zeroCanvas.width = 64;
  zeroCanvas.height = 64;
  const zeroCtx = zeroCanvas.getContext("2d")!;
  zeroCtx.fillStyle = "#666666";
  zeroCtx.font = "bold 24px Arial";
  zeroCtx.textAlign = "center";
  zeroCtx.textBaseline = "middle";
  zeroCtx.fillText("0", 32, 32);

  const zeroTexture = new THREE.CanvasTexture(zeroCanvas);
  const zeroMaterial = new THREE.SpriteMaterial({ map: zeroTexture });
  const zeroLabel = new THREE.Sprite(zeroMaterial);
  zeroLabel.position.set(
    startX,
    barHeight * SCALE_BAR_CONFIG.labelYMultiplier,
    startZ,
  );
  zeroLabel.scale.set(
    scaleLength * SCALE_BAR_CONFIG.zeroLabelScale,
    scaleLength * SCALE_BAR_CONFIG.zeroLabelScale,
    1,
  );
  group.add(zeroLabel);
}

/**
 * Update the cardinal direction labels (N, S, E, W)
 * V2: Enhanced with compass rose and fixed world-space positioning
 * Creates 3D sprites positioned at the edges of the scene
 * Sprites billboard to always face the camera for readability
 */
export function updateCardinalDirections(
  group: THREE.Group,
  center: Point2D,
  sceneSize: number,
): void {
  // Clear existing children
  while (group.children.length > 0) {
    const child = group.children[0];
    if (child instanceof THREE.Sprite) {
      if (child.material.map) child.material.map.dispose();
      child.material.dispose();
    } else if (child instanceof THREE.Line) {
      child.geometry?.dispose();
      if (child.material instanceof THREE.Material) {
        child.material.dispose();
      }
    } else if (child instanceof THREE.Mesh) {
      child.geometry?.dispose();
      if (child.material instanceof THREE.Material) {
        child.material.dispose();
      }
    }
    group.remove(child);
  }

  // Push direction labels FAR outside the building area to avoid obstructing view
  const offset = sceneSize * CARDINAL_DIRECTIONS_CONFIG.offsetMultiplier;
  const labelSize = Math.max(
    sceneSize * CARDINAL_DIRECTIONS_CONFIG.labelSizeMultiplier,
    CARDINAL_DIRECTIONS_CONFIG.minLabelSize,
  );

  // V2: Enhanced cardinal direction markers with better styling
  // Positioned at far edges of the scene, at ground level
  const directions = [
    {
      label: "N",
      x: center.x,
      z: center.y - offset,
      color: "#DC2626", // Red for North
      bgColor: "#FEF2F2",
      isNorth: true,
    },
    {
      label: "S",
      x: center.x,
      z: center.y + offset,
      color: "#1F2937", // Dark gray
      bgColor: "#F9FAFB",
      isNorth: false,
    },
    {
      label: "E",
      x: center.x + offset,
      z: center.y,
      color: "#1F2937",
      bgColor: "#F9FAFB",
      isNorth: false,
    },
    {
      label: "W",
      x: center.x - offset,
      z: center.y,
      color: "#1F2937",
      bgColor: "#F9FAFB",
      isNorth: false,
    },
  ];

  directions.forEach(({ label, x, z, color, bgColor, isNorth }) => {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d")!;

    // Background circle with shadow effect
    ctx.shadowColor = "rgba(0, 0, 0, 0.2)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    ctx.beginPath();
    ctx.arc(64, 64, 52, 0, Math.PI * 2);
    ctx.fillStyle = bgColor;
    ctx.fill();

    // Reset shadow for border
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = color;
    ctx.lineWidth = isNorth ? 8 : 4;
    ctx.stroke();

    // Draw label
    ctx.fillStyle = color;
    ctx.font = isNorth ? "bold 72px Arial" : "bold 60px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: true, // Enable depth test so labels go behind buildings
    });
    const sprite = new THREE.Sprite(material);
    sprite.position.set(x, CARDINAL_DIRECTIONS_CONFIG.labelYPosition, z); // At ground level, not floating
    sprite.scale.set(labelSize, labelSize, 1);
    sprite.renderOrder = 1; // Lower render order - behind buildings
    sprite.name = `Cardinal_${label}`;
    group.add(sprite);
  });

  // V2: Compass rose at center
  const compassSize =
    sceneSize * CARDINAL_DIRECTIONS_CONFIG.compassSizeMultiplier;

  // North arrow on compass
  const arrowPoints: THREE.Vector3[] = [
    new THREE.Vector3(center.x, 0.3, center.y - compassSize * 2),
    new THREE.Vector3(
      center.x - compassSize * 0.5,
      0.3,
      center.y - compassSize * 0.5,
    ),
    new THREE.Vector3(center.x, 0.3, center.y - compassSize),
    new THREE.Vector3(
      center.x + compassSize * 0.5,
      0.3,
      center.y - compassSize * 0.5,
    ),
    new THREE.Vector3(center.x, 0.3, center.y - compassSize * 2),
  ];
  const arrowGeometry = new THREE.BufferGeometry().setFromPoints(arrowPoints);
  const arrowMaterial = new THREE.LineBasicMaterial({ color: 0xdc2626 });
  const northArrow = new THREE.Line(arrowGeometry, arrowMaterial);
  northArrow.name = "CompassNorthArrow";
  group.add(northArrow);

  // Compass cross lines
  const crossMaterial = new THREE.LineBasicMaterial({
    color: 0x9ca3af,
    transparent: true,
    opacity: 0.5,
  });

  // N-S axis line (full length to direction markers)
  const nsPoints = [
    new THREE.Vector3(center.x, 0.2, center.y - offset + labelSize * 0.6),
    new THREE.Vector3(center.x, 0.2, center.y + offset - labelSize * 0.6),
  ];
  const nsGeometry = new THREE.BufferGeometry().setFromPoints(nsPoints);
  const nsLine = new THREE.Line(nsGeometry, crossMaterial);
  nsLine.name = "NS_Axis";
  group.add(nsLine);

  // E-W axis line
  const ewPoints = [
    new THREE.Vector3(center.x - offset + labelSize * 0.6, 0.2, center.y),
    new THREE.Vector3(center.x + offset - labelSize * 0.6, 0.2, center.y),
  ];
  const ewGeometry = new THREE.BufferGeometry().setFromPoints(ewPoints);
  const ewLine = new THREE.Line(ewGeometry, crossMaterial);
  ewLine.name = "EW_Axis";
  group.add(ewLine);

  // Center circle (compass rose center)
  const centerRingGeo = new THREE.RingGeometry(
    compassSize * 0.4,
    compassSize * 0.6,
    32,
  );
  const centerRingMat = new THREE.MeshBasicMaterial({
    color: 0x9ca3af,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.5,
  });
  const centerRing = new THREE.Mesh(centerRingGeo, centerRingMat);
  centerRing.rotation.x = -Math.PI / 2;
  centerRing.position.set(center.x, 0.25, center.y);
  centerRing.name = "CompassCenter";
  group.add(centerRing);
}

/**
 * V2: Create billboard building name label
 * Sprite that always faces the camera for maximum readability
 */
export function createBuildingLabel(
  name: string,
  position: THREE.Vector3,
  buildingHeight: number,
  isSelected: boolean = false,
): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;

  // Background with rounded corners
  const bgColor = isSelected
    ? "rgba(245, 158, 11, 0.95)"
    : "rgba(255, 255, 255, 0.92)";
  const borderColor = isSelected ? "#D97706" : "#6B7280";
  const textColor = isSelected ? "#FFFFFF" : "#1F2937";

  // Shadow effect
  ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;

  // Rounded rectangle background
  const radius = 12;
  const padding = 8;
  ctx.beginPath();
  ctx.moveTo(padding + radius, padding);
  ctx.lineTo(canvas.width - padding - radius, padding);
  ctx.quadraticCurveTo(
    canvas.width - padding,
    padding,
    canvas.width - padding,
    padding + radius,
  );
  ctx.lineTo(canvas.width - padding, canvas.height - padding - radius);
  ctx.quadraticCurveTo(
    canvas.width - padding,
    canvas.height - padding,
    canvas.width - padding - radius,
    canvas.height - padding,
  );
  ctx.lineTo(padding + radius, canvas.height - padding);
  ctx.quadraticCurveTo(
    padding,
    canvas.height - padding,
    padding,
    canvas.height - padding - radius,
  );
  ctx.lineTo(padding, padding + radius);
  ctx.quadraticCurveTo(padding, padding, padding + radius, padding);
  ctx.closePath();

  ctx.fillStyle = bgColor;
  ctx.fill();

  // Border
  ctx.shadowColor = "transparent";
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Building name text
  ctx.fillStyle = textColor;
  ctx.font = "bold 28px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Truncate long names
  let displayName = name;
  const maxWidth = canvas.width - 40;
  while (
    ctx.measureText(displayName).width > maxWidth &&
    displayName.length > 3
  ) {
    displayName = displayName.slice(0, -1);
  }
  if (displayName !== name) {
    displayName += "...";
  }

  ctx.fillText(displayName, canvas.width / 2, canvas.height / 2);

  // Create sprite
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: true,
    sizeAttenuation: true,
  });

  const sprite = new THREE.Sprite(material);

  // Position above the building
  sprite.position.set(position.x, buildingHeight + 5, position.z);

  // Scale based on name length (adaptive sizing)
  const baseScale = 12;
  const aspectRatio = canvas.width / canvas.height;
  sprite.scale.set(baseScale * aspectRatio, baseScale, 1);

  sprite.name = `BuildingLabel_${name}`;

  return sprite;
}
