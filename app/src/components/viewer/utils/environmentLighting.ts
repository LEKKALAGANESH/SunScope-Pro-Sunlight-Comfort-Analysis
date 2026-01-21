/**
 * Environment Lighting System
 *
 * Provides physically-accurate, time-of-day responsive lighting for the 3D scene.
 * Simulates realistic sky colors, sun intensity, and ambient lighting throughout
 * the day cycle from sunrise through sunset to night.
 */

import * as THREE from 'three';

/**
 * Time of day phases for lighting calculations
 */
export type TimePhase = 'night' | 'dawn' | 'morning' | 'midday' | 'afternoon' | 'dusk' | 'evening';

/**
 * Environment lighting configuration for a specific time
 */
export interface EnvironmentLighting {
  // Sky colors
  skyColor: THREE.Color;
  horizonColor: THREE.Color;
  groundColor: THREE.Color;

  // Sun properties
  sunColor: THREE.Color;
  sunIntensity: number;

  // Ambient lighting
  ambientColor: THREE.Color;
  ambientIntensity: number;

  // Hemisphere light
  hemiSkyColor: THREE.Color;
  hemiGroundColor: THREE.Color;
  hemiIntensity: number;

  // Shadow properties
  shadowDarkness: number; // 0-1, how dark shadows appear
  shadowSoftness: number; // 0-1, affects shadow blur

  // Scene fog (for depth)
  fogColor: THREE.Color;
  fogDensity: number;
}

/**
 * Predefined lighting configurations for different times of day
 */
const LIGHTING_PRESETS: Record<TimePhase, EnvironmentLighting> = {
  night: {
    skyColor: new THREE.Color(0x0a1628),        // Deep midnight blue
    horizonColor: new THREE.Color(0x1a2a3f),    // Slightly lighter blue
    groundColor: new THREE.Color(0x0d1520),     // Very dark ground

    sunColor: new THREE.Color(0x8899bb),        // Cool moonlight
    sunIntensity: 0.15,

    ambientColor: new THREE.Color(0x2a3a5a),    // Cool blue ambient
    ambientIntensity: 0.1,

    hemiSkyColor: new THREE.Color(0x1a2a4a),
    hemiGroundColor: new THREE.Color(0x0a1020),
    hemiIntensity: 0.15,

    shadowDarkness: 0.3,
    shadowSoftness: 0.8,

    fogColor: new THREE.Color(0x0a1628),
    fogDensity: 0.0002,
  },

  dawn: {
    skyColor: new THREE.Color(0x4a6080),        // Pre-dawn blue-gray
    horizonColor: new THREE.Color(0xffa07a),    // Warm salmon horizon
    groundColor: new THREE.Color(0x3a4a5a),     // Cool gray ground

    sunColor: new THREE.Color(0xffd4a0),        // Warm golden
    sunIntensity: 0.5,

    ambientColor: new THREE.Color(0x6080a0),    // Cool blue-gray
    ambientIntensity: 0.2,

    hemiSkyColor: new THREE.Color(0x8090b0),
    hemiGroundColor: new THREE.Color(0x605040),
    hemiIntensity: 0.3,

    shadowDarkness: 0.4,
    shadowSoftness: 0.6,

    fogColor: new THREE.Color(0x7090b0),
    fogDensity: 0.00015,
  },

  morning: {
    skyColor: new THREE.Color(0x87ceeb),        // Clear morning sky
    horizonColor: new THREE.Color(0xffe4b5),    // Soft warm horizon
    groundColor: new THREE.Color(0xd0e0d0),     // Fresh green-tinted

    sunColor: new THREE.Color(0xfff5e0),        // Bright warm white
    sunIntensity: 0.9,

    ambientColor: new THREE.Color(0xc0d8e8),    // Cool light blue
    ambientIntensity: 0.25,

    hemiSkyColor: new THREE.Color(0xb4d4e8),
    hemiGroundColor: new THREE.Color(0xd0c8b0),
    hemiIntensity: 0.35,

    shadowDarkness: 0.55,
    shadowSoftness: 0.4,

    fogColor: new THREE.Color(0xd0e8f0),
    fogDensity: 0.0001,
  },

  midday: {
    skyColor: new THREE.Color(0x6cb4ee),        // Bright clear sky
    horizonColor: new THREE.Color(0xc0e0ff),    // Pale blue horizon
    groundColor: new THREE.Color(0xe8e8e0),     // Neutral bright ground

    sunColor: new THREE.Color(0xffffff),        // Pure white sunlight
    sunIntensity: 1.4,

    ambientColor: new THREE.Color(0xd8e8f0),    // Very light blue
    ambientIntensity: 0.3,

    hemiSkyColor: new THREE.Color(0xc0d8f0),
    hemiGroundColor: new THREE.Color(0xe0d8c8),
    hemiIntensity: 0.4,

    shadowDarkness: 0.7,
    shadowSoftness: 0.2,

    fogColor: new THREE.Color(0xe0f0ff),
    fogDensity: 0.00005,
  },

  afternoon: {
    skyColor: new THREE.Color(0x7ec0ee),        // Warm afternoon sky
    horizonColor: new THREE.Color(0xffecd0),    // Warm cream horizon
    groundColor: new THREE.Color(0xe8e0d0),     // Warm ground

    sunColor: new THREE.Color(0xfff0d0),        // Warm white
    sunIntensity: 1.2,

    ambientColor: new THREE.Color(0xe0d8c8),    // Warm light
    ambientIntensity: 0.28,

    hemiSkyColor: new THREE.Color(0xb8d0e0),
    hemiGroundColor: new THREE.Color(0xe0d0b8),
    hemiIntensity: 0.38,

    shadowDarkness: 0.6,
    shadowSoftness: 0.3,

    fogColor: new THREE.Color(0xe8e0d8),
    fogDensity: 0.00008,
  },

  dusk: {
    skyColor: new THREE.Color(0x6a8caa),        // Fading blue
    horizonColor: new THREE.Color(0xff8c60),    // Orange sunset
    groundColor: new THREE.Color(0xb0a090),     // Warm ground

    sunColor: new THREE.Color(0xffa060),        // Deep orange
    sunIntensity: 0.7,

    ambientColor: new THREE.Color(0xc0a890),    // Warm amber
    ambientIntensity: 0.22,

    hemiSkyColor: new THREE.Color(0x8090b0),
    hemiGroundColor: new THREE.Color(0xc0a080),
    hemiIntensity: 0.3,

    shadowDarkness: 0.5,
    shadowSoftness: 0.5,

    fogColor: new THREE.Color(0xc0a090),
    fogDensity: 0.00012,
  },

  evening: {
    skyColor: new THREE.Color(0x3a506b),        // Deep blue
    horizonColor: new THREE.Color(0xc06040),    // Red-orange glow
    groundColor: new THREE.Color(0x504840),     // Dark warm ground

    sunColor: new THREE.Color(0xff7040),        // Deep red-orange
    sunIntensity: 0.4,

    ambientColor: new THREE.Color(0x6070a0),    // Cool blue
    ambientIntensity: 0.15,

    hemiSkyColor: new THREE.Color(0x506080),
    hemiGroundColor: new THREE.Color(0x604830),
    hemiIntensity: 0.25,

    shadowDarkness: 0.4,
    shadowSoftness: 0.6,

    fogColor: new THREE.Color(0x504860),
    fogDensity: 0.00018,
  },
};

/**
 * Determine the time phase based on sun altitude
 * @param sunAltitude - Sun altitude in degrees (-90 to 90)
 * @returns Current time phase
 */
export function getTimePhase(sunAltitude: number): TimePhase {
  if (sunAltitude < -12) return 'night';      // Astronomical twilight
  if (sunAltitude < -6) return 'evening';     // Civil twilight (evening)
  if (sunAltitude < 0) return 'dusk';         // Golden hour (sunset)
  if (sunAltitude < 10) return 'dawn';        // Golden hour (sunrise)
  if (sunAltitude < 30) return 'morning';     // Morning
  if (sunAltitude < 60) return 'afternoon';   // Afternoon
  return 'midday';                             // Midday
}

/**
 * Smoothly interpolate between two colors
 */
function lerpColor(a: THREE.Color, b: THREE.Color, t: number): THREE.Color {
  return new THREE.Color().lerpColors(a, b, t);
}

/**
 * Smoothly interpolate between two numbers
 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Calculate smooth transition factor between phases
 * @param sunAltitude - Current sun altitude
 * @returns Object containing from/to phases and blend factor
 */
function getPhaseTransition(sunAltitude: number): {
  from: TimePhase;
  to: TimePhase;
  t: number;
} {
  // Define altitude thresholds for each phase transition
  const thresholds: { phase: TimePhase; min: number; max: number }[] = [
    { phase: 'night', min: -90, max: -12 },
    { phase: 'evening', min: -12, max: -6 },
    { phase: 'dusk', min: -6, max: 0 },
    { phase: 'dawn', min: 0, max: 10 },
    { phase: 'morning', min: 10, max: 30 },
    { phase: 'afternoon', min: 30, max: 60 },
    { phase: 'midday', min: 60, max: 90 },
  ];

  // Find current and next phase
  for (let i = 0; i < thresholds.length; i++) {
    const current = thresholds[i];
    if (sunAltitude >= current.min && sunAltitude < current.max) {
      // Calculate position within current phase
      const range = current.max - current.min;
      const position = (sunAltitude - current.min) / range;

      // If in first half, transition from previous phase
      if (position < 0.5 && i > 0) {
        const prev = thresholds[i - 1];
        return {
          from: prev.phase,
          to: current.phase,
          t: 0.5 + position,
        };
      }
      // If in second half, transition to next phase
      else if (position >= 0.5 && i < thresholds.length - 1) {
        const next = thresholds[i + 1];
        return {
          from: current.phase,
          to: next.phase,
          t: (position - 0.5) * 2,
        };
      }

      // No transition needed
      return { from: current.phase, to: current.phase, t: 0 };
    }
  }

  return { from: 'midday', to: 'midday', t: 0 };
}

/**
 * Calculate environment lighting based on sun altitude
 * Provides smooth transitions between time phases
 *
 * @param sunAltitude - Sun altitude in degrees (-90 to 90)
 * @returns Interpolated environment lighting configuration
 */
export function calculateEnvironmentLighting(sunAltitude: number): EnvironmentLighting {
  const { from, to, t } = getPhaseTransition(sunAltitude);
  const fromPreset = LIGHTING_PRESETS[from];
  const toPreset = LIGHTING_PRESETS[to];

  // Smooth easing for more natural transitions
  const easeT = t < 0.5
    ? 2 * t * t
    : 1 - Math.pow(-2 * t + 2, 2) / 2;

  return {
    skyColor: lerpColor(fromPreset.skyColor, toPreset.skyColor, easeT),
    horizonColor: lerpColor(fromPreset.horizonColor, toPreset.horizonColor, easeT),
    groundColor: lerpColor(fromPreset.groundColor, toPreset.groundColor, easeT),

    sunColor: lerpColor(fromPreset.sunColor, toPreset.sunColor, easeT),
    sunIntensity: lerp(fromPreset.sunIntensity, toPreset.sunIntensity, easeT),

    ambientColor: lerpColor(fromPreset.ambientColor, toPreset.ambientColor, easeT),
    ambientIntensity: lerp(fromPreset.ambientIntensity, toPreset.ambientIntensity, easeT),

    hemiSkyColor: lerpColor(fromPreset.hemiSkyColor, toPreset.hemiSkyColor, easeT),
    hemiGroundColor: lerpColor(fromPreset.hemiGroundColor, toPreset.hemiGroundColor, easeT),
    hemiIntensity: lerp(fromPreset.hemiIntensity, toPreset.hemiIntensity, easeT),

    shadowDarkness: lerp(fromPreset.shadowDarkness, toPreset.shadowDarkness, easeT),
    shadowSoftness: lerp(fromPreset.shadowSoftness, toPreset.shadowSoftness, easeT),

    fogColor: lerpColor(fromPreset.fogColor, toPreset.fogColor, easeT),
    fogDensity: lerp(fromPreset.fogDensity, toPreset.fogDensity, easeT),
  };
}

/**
 * Create a gradient sky texture for the scene background
 * @param topColor - Color at top of sky
 * @param horizonColor - Color at horizon
 * @param size - Texture size (default 512)
 */
export function createSkyGradientTexture(
  topColor: THREE.Color,
  horizonColor: THREE.Color,
  size: number = 512
): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createLinearGradient(0, 0, 0, size);
  gradient.addColorStop(0, `#${topColor.getHexString()}`);
  gradient.addColorStop(0.4, `#${topColor.clone().lerp(horizonColor, 0.3).getHexString()}`);
  gradient.addColorStop(0.7, `#${horizonColor.getHexString()}`);
  gradient.addColorStop(1, `#${horizonColor.clone().lerp(topColor, 0.2).getHexString()}`);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  return texture;
}

/**
 * Apply environment lighting to scene
 * @param scene - Three.js scene
 * @param lighting - Lighting configuration
 * @param ambientLight - Ambient light reference
 * @param hemiLight - Hemisphere light reference
 * @param sunLight - Directional sun light reference
 */
export function applyEnvironmentLighting(
  scene: THREE.Scene,
  lighting: EnvironmentLighting,
  ambientLight: THREE.AmbientLight | null,
  hemiLight: THREE.HemisphereLight | null,
  sunLight: THREE.DirectionalLight | null
): void {
  // Update scene background
  scene.background = lighting.skyColor;

  // Update ambient light
  // Ambient intensity is modulated by shadow darkness - darker shadows = less ambient fill
  if (ambientLight) {
    ambientLight.color.copy(lighting.ambientColor);
    // Reduce ambient when shadows should be darker (higher shadowDarkness)
    const ambientModifier = 1 - (lighting.shadowDarkness * 0.3);
    ambientLight.intensity = lighting.ambientIntensity * ambientModifier;
  }

  // Update hemisphere light
  if (hemiLight) {
    hemiLight.color.copy(lighting.hemiSkyColor);
    hemiLight.groundColor.copy(lighting.hemiGroundColor);
    hemiLight.intensity = lighting.hemiIntensity;
  }

  // Update sun light and shadow properties
  if (sunLight) {
    sunLight.color.copy(lighting.sunColor);
    sunLight.intensity = lighting.sunIntensity;

    // Apply dynamic shadow softness based on sun angle
    // Low sun = soft, diffuse shadows (higher radius)
    // High sun = sharp, defined shadows (lower radius)
    // shadowSoftness ranges from 0.2 (midday) to 0.8 (night)
    // Map to shadow.radius: 1.0 (sharp) to 4.0 (soft)
    const shadowRadius = 1.0 + (lighting.shadowSoftness * 3.75);
    sunLight.shadow.radius = shadowRadius;

    // Shadow bias settings for building-to-building shadows
    // normalBias MUST be 0 for shadows to appear on vertical walls
    sunLight.shadow.bias = -0.001;
    sunLight.shadow.normalBias = 0; // CRITICAL: Must be 0 for wall shadows
  }

  // Update fog if present
  if (scene.fog) {
    if (scene.fog instanceof THREE.Fog) {
      scene.fog.color.copy(lighting.fogColor);
    } else if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.color.copy(lighting.fogColor);
      scene.fog.density = lighting.fogDensity;
    }
  }
}

/**
 * Get a human-readable description of the current time phase
 */
export function getTimePhaseDescription(phase: TimePhase): string {
  const descriptions: Record<TimePhase, string> = {
    night: 'Night',
    dawn: 'Dawn / Golden Hour',
    morning: 'Morning',
    midday: 'Midday',
    afternoon: 'Afternoon',
    dusk: 'Dusk / Golden Hour',
    evening: 'Evening / Twilight',
  };
  return descriptions[phase];
}
