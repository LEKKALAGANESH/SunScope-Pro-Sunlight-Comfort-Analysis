/**
 * Sun Path Visualization Utilities
 *
 * Extracted from Scene3D.tsx to reduce file size.
 * Contains all functions related to sun path, seasonal arcs,
 * and direction label rendering.
 */

import SunCalc from "suncalc";
import * as THREE from "three";
import {
  CARDINAL_DIRECTIONS_CONFIG,
  LABEL_CONFIG,
  SUN_ORBIT_CONFIG,
  calculateSunOrbitRadius,
} from "../../../store/sceneConfig";
import type { Point2D } from "../../../types";

/**
 * Create a direction label (N, S, E, W)
 */
export function createDirectionLabel(
  text: string,
  color: number,
): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
  ctx.font = "bold 24px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 16, 16);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(8, 8, 1);
  return sprite;
}

/**
 * Create a season label sprite
 */
export function createSeasonLabel(text: string, color: number): THREE.Sprite {
  const canvas = document.createElement("canvas");
  const lines = text.split("\n");
  canvas.width = 120;
  canvas.height = lines.length > 1 ? 40 : 24;
  const ctx = canvas.getContext("2d")!;

  // Background
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Border
  ctx.strokeStyle = `#${color.toString(16).padStart(6, "0")}`;
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);

  // Text
  ctx.fillStyle = "#333333";
  ctx.font = "12px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (lines.length > 1) {
    ctx.fillText(lines[0], canvas.width / 2, 12);
    ctx.fillText(lines[1], canvas.width / 2, 28);
  } else {
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(lines.length > 1 ? 18 : 15, lines.length > 1 ? 6 : 4, 1);
  return sprite;
}

/**
 * Create a seasonal sun arc (East to West) for a specific date
 */
export function createSeasonalArc(
  center: Point2D,
  arcRadius: number,
  latitude: number,
  longitude: number,
  date: Date,
  color: number,
): {
  line: THREE.Line;
  peakPoint: THREE.Vector3 | null;
  labelPoint: THREE.Vector3 | null;
} | null {
  const sunTimes = SunCalc.getTimes(date, latitude, longitude);
  const sunrise = sunTimes.sunrise;
  const sunset = sunTimes.sunset;

  if (
    !sunrise ||
    !sunset ||
    isNaN(sunrise.getTime()) ||
    isNaN(sunset.getTime())
  ) {
    return null;
  }

  const pathPoints: THREE.Vector3[] = [];
  const numSamples = SUN_ORBIT_CONFIG.arcSamples;
  let peakPoint: THREE.Vector3 | null = null;
  let labelPoint: THREE.Vector3 | null = null;
  let maxAltitude = 0;

  for (let i = 0; i <= numSamples; i++) {
    const t = i / numSamples;
    const sampleTime = new Date(
      sunrise.getTime() + t * (sunset.getTime() - sunrise.getTime()),
    );
    const sunPos = SunCalc.getPosition(sampleTime, latitude, longitude);

    if (sunPos.altitude <= 0) continue;

    // Position arc around center - E to W trajectory, tilted towards South
    // SunCalc azimuth: 0=South, π/2=West, π=North, -π/2=East (measured from South, clockwise)
    // We want: East=+X, West=-X, South=+Z, North=-Z
    // At East (az=-π/2): -sin(-π/2)=1 → +X ✓
    // At South (az=0): cos(0)=1 → +Z ✓
    const x =
      center.x -
      Math.sin(sunPos.azimuth) * Math.cos(sunPos.altitude) * arcRadius;
    const y = Math.sin(sunPos.altitude) * arcRadius;
    const z =
      center.y +
      Math.cos(sunPos.azimuth) *
        Math.cos(sunPos.altitude) *
        arcRadius *
        SUN_ORBIT_CONFIG.ellipseCompression;

    const point = new THREE.Vector3(x, y, z);
    pathPoints.push(point);

    if (sunPos.altitude > maxAltitude) {
      maxAltitude = sunPos.altitude;
      peakPoint = point.clone();
    }

    // Label point at ~25% along the arc
    if (i === Math.floor(numSamples * 0.25)) {
      labelPoint = new THREE.Vector3(x - 15, y + 5, z);
    }
  }

  if (pathPoints.length < 2) return null;

  // Create arc line
  const pathGeo = new THREE.BufferGeometry().setFromPoints(pathPoints);
  const pathMaterial = new THREE.LineBasicMaterial({
    color: color,
    transparent: true,
    opacity: SUN_ORBIT_CONFIG.arcOpacity,
    linewidth: 2,
  });
  const pathLine = new THREE.Line(pathGeo, pathMaterial);

  return { line: pathLine, peakPoint, labelPoint };
}

/**
 * Update the sun path arc visualization
 * Shows seasonal sun paths:
 * - Summer solstice (highest arc)
 * - Spring/Autumn equinox (middle arc)
 * - Winter solstice (lowest arc)
 * All arcs span from East to West with sun icons along them
 * The current sun position is shown as a glowing sphere on its orbit
 *
 * The orbit radius is calculated based on BOTH site size AND building heights
 * to ensure 10-floor equivalent clearance above the tallest building.
 * This creates realistic proportions where the sun paths are visually
 * clear of all buildings regardless of their height.
 */
export function updateSunPath(
  group: THREE.Group,
  center: Point2D,
  sceneSize: number,
  maxBuildingHeight: number,
  latitude: number,
  longitude: number,
  date: Date,
  currentTime: Date,
  scaledFloorHeight: number = 10.0, // Visual floor height for proper 10-floor clearance
): void {
  // Clear existing children
  while (group.children.length > 0) {
    const child = group.children[0];
    if (child instanceof THREE.Line || child instanceof THREE.Mesh) {
      child.geometry.dispose();
      if (child.material instanceof THREE.Material) {
        child.material.dispose();
      }
    } else if (child instanceof THREE.Sprite) {
      if (child.material.map) child.material.map.dispose();
      child.material.dispose();
    }
    group.remove(child);
  }

  // Arc radius - size of the dome
  // Uses auto-scaling formula: max(siteSize × 1.2, maxBuildingHeight + 30m, minRadius)
  // The 30m clearance = 10 floors × 8m/floor above tallest building
  // Example: 10-story building (30m) → orbit radius = 30m + 30m = 60m (20 floors)
  // Example: 15-story building (45m) → orbit radius = 45m + 30m = 75m (25 floors)
  // Note: maxBuildingHeight already includes buildingHeightScale from Scene3D
  // scaledFloorHeight ensures 10-floor clearance matches visual proportions
  const arcRadius = calculateSunOrbitRadius(
    sceneSize,
    maxBuildingHeight,
    scaledFloorHeight,
  );

  // Debug: Log orbit calculation to verify it updates with building heights
  // console.log(
  //   `[SunPath] maxBuildingHeight=${maxBuildingHeight.toFixed(1)}m, arcRadius=${arcRadius.toFixed(1)}m`,
  // );
  const currentYear = date.getFullYear();

  // Define seasonal dates with their characteristics
  const seasons = [
    {
      name: "Summer solstice",
      date: new Date(currentYear, 5, 21),
      color: SUN_ORBIT_CONFIG.seasonColors.summer,
      lineWidth: 2,
    },
    {
      name: "Spring and Autumn\nsolstice",
      date: new Date(currentYear, 2, 21),
      color: SUN_ORBIT_CONFIG.seasonColors.springAutumn,
      lineWidth: 2,
    },
    {
      name: "Winter solstice",
      date: new Date(currentYear, 11, 21),
      color: SUN_ORBIT_CONFIG.seasonColors.winter,
      lineWidth: 2,
    },
  ];

  // Create horizon ellipse (ground plane)
  const horizonPoints: THREE.Vector3[] = [];
  for (let i = 0; i <= SUN_ORBIT_CONFIG.horizonSegments; i++) {
    const angle = (i / SUN_ORBIT_CONFIG.horizonSegments) * Math.PI * 2;
    horizonPoints.push(
      new THREE.Vector3(
        center.x + Math.cos(angle) * arcRadius,
        0.5,
        center.y +
          Math.sin(angle) * arcRadius * SUN_ORBIT_CONFIG.ellipseCompression,
      ),
    );
  }
  const horizonGeo = new THREE.BufferGeometry().setFromPoints(horizonPoints);
  const horizonMat = new THREE.LineBasicMaterial({
    color: 0x666666,
    transparent: true,
    opacity: 0.5,
  });
  const horizonLine = new THREE.Line(horizonGeo, horizonMat);
  group.add(horizonLine);

  // Add "Horizontal surface" label
  const surfaceLabel = createSeasonLabel("Horizontal surface", 0x888888);
  surfaceLabel.position.set(
    center.x + arcRadius * 0.5,
    2,
    center.y + arcRadius * 0.25,
  );
  surfaceLabel.scale.set(
    LABEL_CONFIG.surfaceLabel.width,
    LABEL_CONFIG.surfaceLabel.height,
    1,
  );
  group.add(surfaceLabel);

  // Add cardinal direction markers on horizon (matching reference: N=back, S=front, E=right, W=left)
  const directions = [
    {
      label: "N",
      x: center.x + CARDINAL_DIRECTIONS_CONFIG.directionOffsets.north.x,
      z:
        center.y +
        arcRadius *
          CARDINAL_DIRECTIONS_CONFIG.directionOffsets.north.zMultiplier,
      color: CARDINAL_DIRECTIONS_CONFIG.colors.north,
    }, // Back (negative Z)
    {
      label: "S",
      x: center.x + CARDINAL_DIRECTIONS_CONFIG.directionOffsets.south.x,
      z:
        center.y +
        arcRadius *
          CARDINAL_DIRECTIONS_CONFIG.directionOffsets.south.zMultiplier,
      color: CARDINAL_DIRECTIONS_CONFIG.colors.south,
    }, // Front (positive Z)
    {
      label: "E",
      x:
        center.x +
        arcRadius *
          CARDINAL_DIRECTIONS_CONFIG.directionOffsets.east.xMultiplier,
      z: center.y + CARDINAL_DIRECTIONS_CONFIG.directionOffsets.east.z,
      color: CARDINAL_DIRECTIONS_CONFIG.colors.east,
    }, // Right (positive X)
    {
      label: "W",
      x:
        center.x +
        arcRadius *
          CARDINAL_DIRECTIONS_CONFIG.directionOffsets.west.xMultiplier,
      z: center.y + CARDINAL_DIRECTIONS_CONFIG.directionOffsets.west.z,
      color: CARDINAL_DIRECTIONS_CONFIG.colors.west,
    }, // Left (negative X)
  ];

  directions.forEach(({ label, x, z, color }) => {
    const dirLabel = createDirectionLabel(label, color);
    dirLabel.position.set(x, 1, z);
    group.add(dirLabel);
  });

  // Create seasonal arcs (East to West) - only show paths, no sun icons
  seasons.forEach((season) => {
    const pathData = createSeasonalArc(
      center,
      arcRadius,
      latitude,
      longitude,
      season.date,
      season.color,
    );
    if (pathData) {
      group.add(pathData.line);

      // Add season label (no sun icon - only current sun shown)
      const label = createSeasonLabel(season.name, season.color);
      if (pathData.labelPoint) {
        label.position.copy(pathData.labelPoint);
        group.add(label);
      }
    }
  });

  // Add current day path (dashed line)
  const currentPath = createSeasonalArc(
    center,
    arcRadius,
    latitude,
    longitude,
    date,
    SUN_ORBIT_CONFIG.seasonColors.currentDay,
  );
  if (currentPath) {
    // Make current day path dashed to distinguish from seasonal paths
    const dashedMat = new THREE.LineDashedMaterial({
      color: SUN_ORBIT_CONFIG.seasonColors.currentDay,
      dashSize: SUN_ORBIT_CONFIG.currentDayDash.dashSize,
      gapSize: SUN_ORBIT_CONFIG.currentDayDash.gapSize,
      transparent: true,
      opacity: SUN_ORBIT_CONFIG.arcOpacity,
    });
    currentPath.line.material = dashedMat;
    currentPath.line.computeLineDistances();
    group.add(currentPath.line);
  }

  // Add CURRENT SUN POSITION on the orbit (smaller glowing sphere)
  const currentSunPos = SunCalc.getPosition(currentTime, latitude, longitude);
  if (currentSunPos.altitude > 0) {
    // Calculate sun position on the orbit path (same formula as createSeasonalArc)
    // SunCalc azimuth: 0=South, π/2=West, π=North, -π/2=East
    const sunX =
      center.x -
      Math.sin(currentSunPos.azimuth) *
        Math.cos(currentSunPos.altitude) *
        arcRadius;
    const sunY = Math.sin(currentSunPos.altitude) * arcRadius;
    const sunZ =
      center.y +
      Math.cos(currentSunPos.azimuth) *
        Math.cos(currentSunPos.altitude) *
        arcRadius *
        SUN_ORBIT_CONFIG.ellipseCompression;

    // Create sun sphere (smaller size)
    const sunSize = arcRadius * SUN_ORBIT_CONFIG.sunSizeMultiplier;
    const sunGeo = new THREE.SphereGeometry(sunSize, 24, 24);
    const sunMat = new THREE.MeshBasicMaterial({
      color: 0xffdd00,
    });
    const sunSphere = new THREE.Mesh(sunGeo, sunMat);
    sunSphere.position.set(sunX, sunY, sunZ);
    group.add(sunSphere);

    // Add subtle glow effect
    const glowGeo = new THREE.SphereGeometry(
      sunSize * SUN_ORBIT_CONFIG.sunGlowMultiplier,
      24,
      24,
    );
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.25,
    });
    const glowSphere = new THREE.Mesh(glowGeo, glowMat);
    glowSphere.position.set(sunX, sunY, sunZ);
    group.add(glowSphere);

    // Add small rays emanating from sun
    const rayCount = SUN_ORBIT_CONFIG.sunRayCount;
    const rayLength = sunSize * SUN_ORBIT_CONFIG.sunRayLengthMultiplier;
    for (let i = 0; i < rayCount; i++) {
      const angle = (i / rayCount) * Math.PI * 2;
      const rayGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(
          Math.cos(angle) * rayLength,
          Math.sin(angle) * rayLength,
          0,
        ),
      ]);
      const rayMat = new THREE.LineBasicMaterial({
        color: 0xffaa00,
        transparent: true,
        opacity: 0.5,
      });
      const ray = new THREE.Line(rayGeo, rayMat);
      ray.position.set(sunX, sunY, sunZ);
      ray.lookAt(center.x, 0, center.y);
      group.add(ray);
    }

    // Add time label next to sun
    const timeStr = currentTime.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    const timeLabel = createSeasonLabel(
      timeStr,
      SUN_ORBIT_CONFIG.seasonColors.currentDay,
    );
    timeLabel.position.set(sunX + 8, sunY + 5, sunZ);
    timeLabel.scale.set(
      LABEL_CONFIG.timeLabel.width,
      LABEL_CONFIG.timeLabel.height,
      1,
    );
    group.add(timeLabel);
  } else {
    // Sun below horizon - show indicator
    const belowLabel = createSeasonLabel("Sun below horizon", 0x666666);
    belowLabel.position.set(center.x, 10, center.y);
    group.add(belowLabel);
  }
}
