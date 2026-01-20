/**
 * Visual Effects - Enhanced visual quality for 3D viewer
 *
 * Phase 2 Implementation:
 * - Atmospheric fog for depth perception
 * - Enhanced shadow settings
 * - Building outline effect
 * - Improved building materials
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';

export interface VisualEffectsConfig {
  /** Enable atmospheric fog */
  enableFog?: boolean;
  /** Fog color (default: light sky blue) */
  fogColor?: number;
  /** Fog near distance */
  fogNear?: number;
  /** Fog far distance */
  fogFar?: number;
  /** Enable outline effect for selected objects */
  enableOutline?: boolean;
  /** Outline color for hover state */
  hoverOutlineColor?: number;
  /** Outline color for selected state */
  selectedOutlineColor?: number;
  /** Outline edge strength */
  outlineEdgeStrength?: number;
  /** Outline edge glow */
  outlineEdgeGlow?: number;
  /** Enable FXAA anti-aliasing */
  enableFXAA?: boolean;
}

const DEFAULT_CONFIG: Required<VisualEffectsConfig> = {
  enableFog: true,
  fogColor: 0xd4e5f7,  // Light sky blue for depth perception
  fogNear: 100,
  fogFar: 2000,
  enableOutline: true,
  hoverOutlineColor: 0x4fc3f7,  // Light blue for hover
  selectedOutlineColor: 0xffc107,  // Amber for selection
  outlineEdgeStrength: 3.0,
  outlineEdgeGlow: 0.5,
  enableFXAA: true,
};

/**
 * Visual Effects Manager - handles post-processing and scene effects
 */
export class VisualEffectsManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private config: Required<VisualEffectsConfig>;

  private composer: EffectComposer | null = null;
  private outlinePass: OutlinePass | null = null;
  private hoverOutlinePass: OutlinePass | null = null;

  private hoveredObjects: THREE.Object3D[] = [];
  private selectedObjects: THREE.Object3D[] = [];

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    config: VisualEffectsConfig = {}
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.setupEffects();
  }

  private setupEffects(): void {
    // Setup fog
    if (this.config.enableFog) {
      this.setupFog();
    }

    // Setup post-processing composer
    if (this.config.enableOutline || this.config.enableFXAA) {
      this.setupComposer();
    }
  }

  /**
   * Setup atmospheric fog for depth perception
   */
  private setupFog(): void {
    // Use exponential fog for more natural falloff
    this.scene.fog = new THREE.Fog(
      this.config.fogColor,
      this.config.fogNear,
      this.config.fogFar
    );

    // Update scene background to match fog color for seamless blending
    const bgColor = this.scene.background;
    if (bgColor instanceof THREE.Color) {
      // Blend background with fog color
      const fogColorObj = new THREE.Color(this.config.fogColor);
      bgColor.lerp(fogColorObj, 0.3);
    }
  }

  /**
   * Setup post-processing composer with outline and FXAA
   */
  private setupComposer(): void {
    const size = this.renderer.getSize(new THREE.Vector2());

    this.composer = new EffectComposer(this.renderer);

    // Render pass - renders the scene
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    // Outline pass for selected objects (primary)
    if (this.config.enableOutline) {
      this.outlinePass = new OutlinePass(
        new THREE.Vector2(size.x, size.y),
        this.scene,
        this.camera
      );
      this.outlinePass.edgeStrength = this.config.outlineEdgeStrength;
      this.outlinePass.edgeGlow = this.config.outlineEdgeGlow;
      this.outlinePass.edgeThickness = 2.0;
      this.outlinePass.visibleEdgeColor.set(this.config.selectedOutlineColor);
      this.outlinePass.hiddenEdgeColor.set(this.config.selectedOutlineColor);
      this.outlinePass.pulsePeriod = 0;  // No pulse for selected
      this.composer.addPass(this.outlinePass);

      // Separate outline pass for hovered objects (with different color)
      this.hoverOutlinePass = new OutlinePass(
        new THREE.Vector2(size.x, size.y),
        this.scene,
        this.camera
      );
      this.hoverOutlinePass.edgeStrength = 2.0;
      this.hoverOutlinePass.edgeGlow = 0.3;
      this.hoverOutlinePass.edgeThickness = 1.5;
      this.hoverOutlinePass.visibleEdgeColor.set(this.config.hoverOutlineColor);
      this.hoverOutlinePass.hiddenEdgeColor.set(this.config.hoverOutlineColor);
      this.hoverOutlinePass.pulsePeriod = 2;  // Subtle pulse for hover
      this.composer.addPass(this.hoverOutlinePass);
    }

    // FXAA pass for anti-aliasing
    if (this.config.enableFXAA) {
      const fxaaPass = new ShaderPass(FXAAShader);
      fxaaPass.uniforms['resolution'].value.set(1 / size.x, 1 / size.y);
      this.composer.addPass(fxaaPass);
    }

    // Output pass for correct color space
    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);
  }

  /**
   * Update fog settings dynamically
   */
  updateFog(near?: number, far?: number, color?: number): void {
    if (!this.scene.fog) return;

    if (near !== undefined) {
      (this.scene.fog as THREE.Fog).near = near;
    }
    if (far !== undefined) {
      (this.scene.fog as THREE.Fog).far = far;
    }
    if (color !== undefined) {
      (this.scene.fog as THREE.Fog).color.setHex(color);
    }
  }

  /**
   * Set objects to highlight on hover
   */
  setHoveredObjects(objects: THREE.Object3D[]): void {
    this.hoveredObjects = objects;
    if (this.hoverOutlinePass) {
      // Filter out selected objects from hover
      const filtered = objects.filter(obj => !this.selectedObjects.includes(obj));
      this.hoverOutlinePass.selectedObjects = filtered;
    }
  }

  /**
   * Set objects to highlight as selected
   */
  setSelectedObjects(objects: THREE.Object3D[]): void {
    this.selectedObjects = objects;
    if (this.outlinePass) {
      this.outlinePass.selectedObjects = objects;
    }
    // Update hover to exclude selected
    if (this.hoverOutlinePass) {
      const filtered = this.hoveredObjects.filter(obj => !objects.includes(obj));
      this.hoverOutlinePass.selectedObjects = filtered;
    }
  }

  /**
   * Clear hover highlight
   */
  clearHover(): void {
    this.hoveredObjects = [];
    if (this.hoverOutlinePass) {
      this.hoverOutlinePass.selectedObjects = [];
    }
  }

  /**
   * Clear selection highlight
   */
  clearSelection(): void {
    this.selectedObjects = [];
    if (this.outlinePass) {
      this.outlinePass.selectedObjects = [];
    }
  }

  /**
   * Handle window resize
   */
  resize(width: number, height: number): void {
    if (this.composer) {
      this.composer.setSize(width, height);
    }
  }

  /**
   * Render the scene with effects
   * Returns true if composer was used, false otherwise
   */
  render(): boolean {
    if (this.composer) {
      this.composer.render();
      return true;
    }
    return false;
  }

  /**
   * Check if composer is active
   */
  hasComposer(): boolean {
    return this.composer !== null;
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    if (this.composer) {
      this.composer.dispose();
    }
  }
}

/**
 * Create enhanced building material with better visual quality
 */
export function createEnhancedBuildingMaterial(
  color: string | number,
  options: {
    metalness?: number;
    roughness?: number;
    opacity?: number;
    transparent?: boolean;
    emissive?: number;
    emissiveIntensity?: number;
    isSelected?: boolean;
    isHovered?: boolean;
  } = {}
): THREE.MeshStandardMaterial {
  const {
    metalness = 0.1,
    roughness = 0.7,
    opacity = 1.0,
    transparent = opacity < 1,
    emissive = 0x000000,
    emissiveIntensity = 0,
    isSelected = false,
    isHovered = false,
  } = options;

  // Calculate adjusted values based on state
  let finalEmissive = emissive;
  let finalEmissiveIntensity = emissiveIntensity;

  if (isSelected) {
    finalEmissive = 0xffc107;  // Amber glow
    finalEmissiveIntensity = 0.15;
  } else if (isHovered) {
    finalEmissive = 0x4fc3f7;  // Light blue glow
    finalEmissiveIntensity = 0.1;
  }

  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    metalness,
    roughness,
    opacity,
    transparent,
    emissive: new THREE.Color(finalEmissive),
    emissiveIntensity: finalEmissiveIntensity,
    side: THREE.DoubleSide,
    // Enhanced features
    flatShading: false,  // Smooth shading
    envMapIntensity: 0.5,  // Subtle environment reflection
  });
}

/**
 * Create glass-like material for windows
 */
export function createGlassMaterial(
  tint: number = 0x88ccff,
  opacity: number = 0.3
): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: tint,
    metalness: 0.0,
    roughness: 0.1,
    transmission: 0.9,  // Glass-like transmission
    thickness: 0.5,
    opacity,
    transparent: true,
    side: THREE.DoubleSide,
  });
}

/**
 * Apply highlight effect to a building mesh
 */
export function applyBuildingHighlight(
  mesh: THREE.Object3D,
  state: 'none' | 'hover' | 'selected'
): void {
  mesh.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
      const material = child.material;

      switch (state) {
        case 'hover':
          material.emissive.setHex(0x4fc3f7);
          material.emissiveIntensity = 0.15;
          break;
        case 'selected':
          material.emissive.setHex(0xffc107);
          material.emissiveIntensity = 0.2;
          break;
        case 'none':
        default:
          material.emissive.setHex(0x000000);
          material.emissiveIntensity = 0;
          break;
      }
    }
  });
}

/**
 * Calculate fog parameters based on scene size
 */
export function calculateFogParameters(sceneSize: number): { near: number; far: number } {
  return {
    near: Math.max(sceneSize * 0.5, 50),
    far: Math.max(sceneSize * 5, 500),
  };
}

export default VisualEffectsManager;
