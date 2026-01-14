import * as THREE from "three";
import SunCalc from "suncalc";
import type { Point2D } from "../../../types";

/**
 * Create sun path arc group
 */
export function createSunPath(): THREE.Group {
  const group = new THREE.Group();
  group.name = "SunPath";
  return group;
}

/**
 * Update sun path visualization for the given date and location
 */
export function updateSunPath(
  group: THREE.Group,
  center: Point2D,
  size: number,
  latitude: number,
  longitude: number,
  date: Date
): void {
  // Clear existing sun path
  while (group.children.length > 0) {
    const child = group.children[0];
    group.remove(child);
    if (child instanceof THREE.Line) {
      child.geometry.dispose();
      (child.material as THREE.Material).dispose();
    }
  }

  // Calculate sun positions throughout the day
  const sunPositions: THREE.Vector3[] = [];
  const pathRadius = size * 0.4;

  // Get sunrise and sunset times
  const times = SunCalc.getTimes(date, latitude, longitude);
  const sunrise = times.sunrise;
  const sunset = times.sunset;

  // Sample sun positions every 15 minutes
  const currentTime = new Date(sunrise);
  while (currentTime <= sunset) {
    const pos = SunCalc.getPosition(currentTime, latitude, longitude);

    if (pos.altitude > 0) {
      const altitude = pos.altitude;
      const azimuth = pos.azimuth;

      // Convert spherical to Cartesian
      // In Three.js: Y is up, Z is forward (south in SunCalc convention)
      const x = center.x - Math.sin(azimuth) * Math.cos(altitude) * pathRadius;
      const y = Math.sin(altitude) * pathRadius;
      const z = center.y - Math.cos(azimuth) * Math.cos(altitude) * pathRadius;

      sunPositions.push(new THREE.Vector3(x, y, z));
    }

    currentTime.setMinutes(currentTime.getMinutes() + 15);
  }

  if (sunPositions.length > 1) {
    // Create smooth curve through sun positions
    const curve = new THREE.CatmullRomCurve3(sunPositions);
    const curvePoints = curve.getPoints(100);

    // Create gradient material for sun path
    const pathGeo = new THREE.BufferGeometry().setFromPoints(curvePoints);
    const pathMat = new THREE.LineBasicMaterial({
      color: 0xffa500,
      linewidth: 2,
    });

    const sunPathLine = new THREE.Line(pathGeo, pathMat);
    group.add(sunPathLine);

    // Add hour markers
    for (let hour = Math.ceil(sunrise.getHours()); hour <= Math.floor(sunset.getHours()); hour++) {
      const markerTime = new Date(date);
      markerTime.setHours(hour, 0, 0, 0);

      const pos = SunCalc.getPosition(markerTime, latitude, longitude);
      if (pos.altitude > 0) {
        const x = center.x - Math.sin(pos.azimuth) * Math.cos(pos.altitude) * pathRadius;
        const y = Math.sin(pos.altitude) * pathRadius;
        const z = center.y - Math.cos(pos.azimuth) * Math.cos(pos.altitude) * pathRadius;

        // Hour marker sphere
        const markerGeo = new THREE.SphereGeometry(1.5, 8, 8);
        const markerMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
        const marker = new THREE.Mesh(markerGeo, markerMat);
        marker.position.set(x, y, z);
        group.add(marker);

        // Hour label
        const canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 32;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#ffcc00";
        ctx.font = "bold 20px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${hour}:00`, 32, 16);

        const texture = new THREE.CanvasTexture(canvas);
        const labelMat = new THREE.SpriteMaterial({ map: texture });
        const label = new THREE.Sprite(labelMat);
        label.position.set(x, y + 5, z);
        label.scale.set(10, 5, 1);
        group.add(label);
      }
    }
  }
}

/**
 * Create sun ray line
 */
export function createSunRay(): THREE.Line {
  const geometry = new THREE.BufferGeometry();
  const material = new THREE.LineBasicMaterial({
    color: 0xffaa00,
    linewidth: 2,
    transparent: true,
    opacity: 0.7,
  });

  const line = new THREE.Line(geometry, material);
  line.name = "SunRay";

  return line;
}

/**
 * Update sun ray to point from sun to center
 */
export function updateSunRay(
  sunRay: THREE.Line,
  sunPosition: THREE.Vector3,
  targetPosition: THREE.Vector3
): void {
  const points = [sunPosition, targetPosition];
  sunRay.geometry.setFromPoints(points);
  sunRay.geometry.attributes.position.needsUpdate = true;
}

/**
 * Create sun sphere visualization
 */
export function createSunSphere(): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(5, 16, 16);
  const material = new THREE.MeshStandardMaterial({
    color: 0xffff00,
    emissive: 0xffff00,
    emissiveIntensity: 0.5,
  });

  const sun = new THREE.Mesh(geometry, material);
  sun.name = "SunSphere";

  return sun;
}

/**
 * Calculate sun position in 3D space
 */
export function calculateSunPosition3D(
  time: Date,
  latitude: number,
  longitude: number,
  center: Point2D,
  distance: number
): { position: THREE.Vector3; altitude: number; azimuth: number } {
  const sunPos = SunCalc.getPosition(time, latitude, longitude);
  const altitude = sunPos.altitude;
  const azimuth = sunPos.azimuth;

  // Convert to 3D coordinates
  const x = center.x - Math.sin(azimuth) * Math.cos(altitude) * distance;
  const y = Math.sin(altitude) * distance;
  const z = center.y - Math.cos(azimuth) * Math.cos(altitude) * distance;

  return {
    position: new THREE.Vector3(x, y, z),
    altitude: (altitude * 180) / Math.PI,
    azimuth: (azimuth * 180) / Math.PI,
  };
}
