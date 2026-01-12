/**
 * AnimatedExportService
 *
 * Generates animated GIF exports showing sun movement and shadow changes
 * throughout the day for sunlight analysis visualization.
 */

import GIF from 'gif.js';
import type * as THREE from 'three';

export interface AnimatedExportOptions {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  sunLight: THREE.DirectionalLight;
  location: {
    latitude: number;
    longitude: number;
  };
  date: Date;
  startHour?: number; // Default: sunrise
  endHour?: number; // Default: sunset
  frameInterval?: number; // Minutes between frames, default: 30
  frameDelay?: number; // ms per frame in GIF, default: 200
  width?: number;
  height?: number;
  quality?: number; // 1-30, lower is better quality, default: 10
  onProgress?: (progress: number, stage: string) => void;
}

export interface AnimatedExportResult {
  blob: Blob;
  frameCount: number;
  duration: number; // Total animation duration in ms
}

/**
 * Calculate sun position for a given time
 * This is a simplified calculation - in production, use SunCalc
 */
async function getSunPosition(date: Date, latitude: number, longitude: number) {
  const SunCalc = (await import('suncalc')).default;
  return SunCalc.getPosition(date, latitude, longitude);
}

/**
 * Get sunrise and sunset times for a date
 */
async function getSunTimes(date: Date, latitude: number, longitude: number) {
  const SunCalc = (await import('suncalc')).default;
  return SunCalc.getTimes(date, latitude, longitude);
}

/**
 * Draw time overlay on canvas
 */
function drawTimeOverlay(
  ctx: CanvasRenderingContext2D,
  time: Date,
  date: Date,
  width: number,
  _height: number
): void {
  const timeStr = time.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  const dateStr = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Background box
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.beginPath();
  ctx.roundRect(width - 120, 10, 110, 50, 5);
  ctx.fill();

  // Time text
  ctx.fillStyle = '#FBBF24'; // Amber
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'right';
  ctx.fillText(timeStr, width - 20, 35);

  // Date text
  ctx.fillStyle = '#9CA3AF'; // Gray
  ctx.font = '12px Arial';
  ctx.fillText(dateStr, width - 20, 52);

  // Sun icon
  ctx.fillStyle = '#FBBF24';
  ctx.beginPath();
  ctx.arc(width - 100, 30, 8, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Draw north arrow on canvas
 */
function drawNorthArrow(ctx: CanvasRenderingContext2D): void {
  // Background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.beginPath();
  ctx.roundRect(10, 10, 35, 35, 5);
  ctx.fill();

  // Arrow
  ctx.fillStyle = '#EF4444'; // Red
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('▲', 27, 30);

  // N label
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 10px Arial';
  ctx.fillText('N', 27, 42);
}

/**
 * Draw progress bar for timeline
 */
function drawTimeline(
  ctx: CanvasRenderingContext2D,
  progress: number,
  startHour: number,
  endHour: number,
  width: number,
  height: number
): void {
  const barWidth = width - 40;
  const barHeight = 8;
  const barY = height - 25;
  const barX = 20;

  // Background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.beginPath();
  ctx.roundRect(barX - 5, barY - 5, barWidth + 10, barHeight + 20, 5);
  ctx.fill();

  // Track
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.beginPath();
  ctx.roundRect(barX, barY, barWidth, barHeight, 4);
  ctx.fill();

  // Progress
  ctx.fillStyle = '#FBBF24';
  ctx.beginPath();
  ctx.roundRect(barX, barY, barWidth * progress, barHeight, 4);
  ctx.fill();

  // Hour labels
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '10px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(`${startHour}:00`, barX, barY + barHeight + 12);
  ctx.textAlign = 'right';
  ctx.fillText(`${endHour}:00`, barX + barWidth, barY + barHeight + 12);

  // Sun marker
  const markerX = barX + barWidth * progress;
  ctx.fillStyle = '#FBBF24';
  ctx.beginPath();
  ctx.arc(markerX, barY + barHeight / 2, 6, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Generate animated GIF of sun movement
 */
export async function generateAnimatedExport(
  options: AnimatedExportOptions
): Promise<AnimatedExportResult> {
  const {
    renderer,
    scene,
    camera,
    sunLight,
    location,
    date,
    frameInterval = 30,
    frameDelay = 200,
    width = 800,
    height = 600,
    quality = 10,
    onProgress,
  } = options;

  // Get sun times for the day
  const sunTimes = await getSunTimes(date, location.latitude, location.longitude);
  const sunrise = sunTimes.sunrise;
  const sunset = sunTimes.sunset;

  if (!sunrise || !sunset || isNaN(sunrise.getTime()) || isNaN(sunset.getTime())) {
    throw new Error('Cannot calculate sunrise/sunset for this location and date');
  }

  const startHour = options.startHour ?? sunrise.getHours();
  const endHour = options.endHour ?? sunset.getHours();

  // Calculate frame times
  const frameTimes: Date[] = [];
  const startTime = new Date(date);
  startTime.setHours(startHour, 0, 0, 0);
  const endTime = new Date(date);
  endTime.setHours(endHour, 0, 0, 0);

  let currentTime = new Date(startTime);
  while (currentTime <= endTime) {
    frameTimes.push(new Date(currentTime));
    currentTime = new Date(currentTime.getTime() + frameInterval * 60 * 1000);
  }

  if (frameTimes.length === 0) {
    throw new Error('No frames to generate');
  }

  onProgress?.(0, 'Initializing');

  // Create GIF encoder
  const gif = new GIF({
    workers: 2,
    quality,
    width,
    height,
    workerScript: '/gif.worker.js', // Will need to be served
    repeat: 0, // Loop forever
  });

  // Create offscreen canvas for compositing
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Store original renderer size
  const originalSize = renderer.getSize(new (await import('three')).Vector2());

  // Resize renderer for export
  renderer.setSize(width, height);
  camera.updateProjectionMatrix();

  // Calculate scene center for sun positioning
  let sceneCenter = { x: 0, z: 0 };
  scene.traverse((obj) => {
    if (obj.userData.buildingId) {
      sceneCenter.x = obj.position.x;
      sceneCenter.z = obj.position.z;
    }
  });

  // Generate frames
  for (let i = 0; i < frameTimes.length; i++) {
    const frameTime = frameTimes[i];
    const progress = i / (frameTimes.length - 1);

    onProgress?.(progress * 0.8, `Rendering frame ${i + 1}/${frameTimes.length}`);

    // Update sun position
    const sunPos = await getSunPosition(frameTime, location.latitude, location.longitude);

    if (sunPos.altitude > 0) {
      const distance = 500;
      const x = sceneCenter.x - Math.sin(sunPos.azimuth) * Math.cos(sunPos.altitude) * distance;
      const y = Math.sin(sunPos.altitude) * distance;
      const z = sceneCenter.z - Math.cos(sunPos.azimuth) * Math.cos(sunPos.altitude) * distance;

      sunLight.position.set(x, y, z);
      sunLight.target.position.set(sceneCenter.x, 0, sceneCenter.z);
      sunLight.target.updateMatrixWorld();
      sunLight.intensity = 0.6 + Math.sin(sunPos.altitude) * 0.6;
    }

    // Render the scene
    renderer.render(scene, camera);

    // Composite frame with overlays
    ctx.clearRect(0, 0, width, height);

    // Draw 3D view
    ctx.drawImage(renderer.domElement, 0, 0, width, height);

    // Add overlays
    drawTimeOverlay(ctx, frameTime, date, width, height);
    drawNorthArrow(ctx);
    drawTimeline(ctx, progress, startHour, endHour, width, height);

    // Add frame to GIF
    gif.addFrame(ctx, { delay: frameDelay, copy: true });
  }

  // Restore renderer size
  renderer.setSize(originalSize.x, originalSize.y);

  // Render GIF
  onProgress?.(0.8, 'Encoding GIF');

  return new Promise((resolve, reject) => {
    gif.on('finished', (blob: Blob) => {
      onProgress?.(1, 'Complete');
      resolve({
        blob,
        frameCount: frameTimes.length,
        duration: frameTimes.length * frameDelay,
      });
    });

    gif.on('progress', (p: number) => {
      onProgress?.(0.8 + p * 0.2, 'Encoding GIF');
    });

    try {
      gif.render();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Download the generated GIF
 */
export async function downloadAnimatedExport(
  result: AnimatedExportResult,
  filename?: string
): Promise<void> {
  const { saveAs } = await import('file-saver');
  const name = filename || `sun-animation-${new Date().toISOString().split('T')[0]}.gif`;
  saveAs(result.blob, name);
}
