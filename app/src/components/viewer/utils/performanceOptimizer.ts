/**
 * Performance Optimizer - Optimization utilities for 3D viewer
 *
 * Phase 4 Implementation:
 * - Frustum culling optimization
 * - LOD (Level of Detail) system for buildings
 * - Progressive loading with feedback
 * - Memory management and cleanup
 * - Performance monitoring
 */

import * as THREE from 'three';

export interface PerformanceStats {
  fps: number;
  frameTime: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  memoryUsed: number;
}

export interface LODLevel {
  /** Distance threshold for this LOD level */
  distance: number;
  /** Geometry simplification factor (1 = full detail, 0.5 = half triangles) */
  detail: number;
  /** Whether to show floor divisions at this level */
  showFloorDivisions: boolean;
  /** Shadow casting enabled */
  castShadow: boolean;
}

export interface PerformanceOptimizerConfig {
  /** Enable frustum culling */
  enableFrustumCulling?: boolean;
  /** Enable LOD system */
  enableLOD?: boolean;
  /** LOD levels configuration */
  lodLevels?: LODLevel[];
  /** Target frame rate */
  targetFPS?: number;
  /** Enable automatic quality adjustment */
  autoAdjustQuality?: boolean;
  /** Memory warning threshold (MB) */
  memoryWarningThreshold?: number;
}

const DEFAULT_LOD_LEVELS: LODLevel[] = [
  { distance: 0, detail: 1.0, showFloorDivisions: true, castShadow: true },
  { distance: 200, detail: 0.7, showFloorDivisions: true, castShadow: true },
  { distance: 500, detail: 0.4, showFloorDivisions: false, castShadow: true },
  { distance: 1000, detail: 0.2, showFloorDivisions: false, castShadow: false },
];

const DEFAULT_CONFIG: Required<PerformanceOptimizerConfig> = {
  enableFrustumCulling: true,
  enableLOD: true,
  lodLevels: DEFAULT_LOD_LEVELS,
  targetFPS: 60,
  autoAdjustQuality: true,
  memoryWarningThreshold: 512,
};

/**
 * Performance Optimizer - manages rendering performance
 */
export class PerformanceOptimizer {
  private config: Required<PerformanceOptimizerConfig>;
  private camera: THREE.PerspectiveCamera;
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;

  private frustum: THREE.Frustum;
  private projScreenMatrix: THREE.Matrix4;

  // Performance tracking
  private frameCount: number = 0;
  private lastTime: number = 0;
  private fps: number = 60;
  private frameTimeHistory: number[] = [];

  // LOD management
  private lodObjects: Map<string, THREE.LOD> = new Map();
  private buildingDistances: Map<string, number> = new Map();

  // Memory management
  private disposableObjects: Set<THREE.Object3D> = new Set();

  constructor(
    camera: THREE.PerspectiveCamera,
    scene: THREE.Scene,
    renderer: THREE.WebGLRenderer,
    config: PerformanceOptimizerConfig = {}
  ) {
    this.camera = camera;
    this.scene = scene;
    this.renderer = renderer;
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.frustum = new THREE.Frustum();
    this.projScreenMatrix = new THREE.Matrix4();
  }

  /**
   * Update frustum culling - call each frame before render
   */
  updateFrustumCulling(): void {
    if (!this.config.enableFrustumCulling) return;

    // Update frustum from camera
    this.camera.updateMatrixWorld();
    this.projScreenMatrix.multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse
    );
    this.frustum.setFromProjectionMatrix(this.projScreenMatrix);

    // Cull objects not in frustum
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.userData.cullable !== false) {
        // Use bounding sphere for fast culling
        if (!object.geometry.boundingSphere) {
          object.geometry.computeBoundingSphere();
        }

        if (object.geometry.boundingSphere) {
          const sphere = object.geometry.boundingSphere.clone();
          sphere.applyMatrix4(object.matrixWorld);
          object.visible = this.frustum.intersectsSphere(sphere);
        }
      }
    });
  }

  /**
   * Update LOD levels based on camera distance
   */
  updateLOD(): void {
    if (!this.config.enableLOD) return;

    const cameraPosition = this.camera.position;

    this.lodObjects.forEach((lod, id) => {
      lod.update(this.camera);

      // Track distance for analytics
      const distance = cameraPosition.distanceTo(lod.position);
      this.buildingDistances.set(id, distance);
    });
  }

  /**
   * Create LOD object for a building
   */
  createBuildingLOD(
    buildingId: string,
    meshes: { distance: number; mesh: THREE.Object3D }[]
  ): THREE.LOD {
    const lod = new THREE.LOD();
    lod.name = `LOD_${buildingId}`;

    meshes.forEach(({ distance, mesh }) => {
      lod.addLevel(mesh, distance);
    });

    this.lodObjects.set(buildingId, lod);
    return lod;
  }

  /**
   * Remove LOD object
   */
  removeBuildingLOD(buildingId: string): void {
    const lod = this.lodObjects.get(buildingId);
    if (lod) {
      this.disposeLOD(lod);
      this.lodObjects.delete(buildingId);
    }
  }

  /**
   * Update performance stats - call each frame
   */
  updateStats(): PerformanceStats {
    const now = performance.now();
    this.frameCount++;

    // Calculate FPS every second
    if (now - this.lastTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastTime = now;
    }

    // Track frame time
    const frameTime = now - (this.frameTimeHistory[this.frameTimeHistory.length - 1] || now);
    this.frameTimeHistory.push(now);
    if (this.frameTimeHistory.length > 60) {
      this.frameTimeHistory.shift();
    }

    const info = this.renderer.info;

    return {
      fps: this.fps,
      frameTime,
      drawCalls: info.render.calls,
      triangles: info.render.triangles,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      memoryUsed: this.estimateMemoryUsage(),
    };
  }

  /**
   * Estimate memory usage in MB
   */
  private estimateMemoryUsage(): number {
    const info = this.renderer.info;
    // Rough estimate: geometries + textures
    const geometryMB = info.memory.geometries * 0.5; // Average 0.5MB per geometry
    const textureMB = info.memory.textures * 2; // Average 2MB per texture
    return geometryMB + textureMB;
  }

  /**
   * Auto-adjust quality based on performance
   */
  autoAdjustQuality(): 'high' | 'medium' | 'low' {
    if (!this.config.autoAdjustQuality) return 'high';

    if (this.fps < 30) {
      return 'low';
    } else if (this.fps < 45) {
      return 'medium';
    }
    return 'high';
  }

  /**
   * Apply quality preset
   */
  applyQualityPreset(quality: 'high' | 'medium' | 'low'): void {
    switch (quality) {
      case 'high':
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        break;
      case 'medium':
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        this.renderer.shadowMap.enabled = true;
        break;
      case 'low':
        this.renderer.setPixelRatio(1);
        this.renderer.shadowMap.enabled = false;
        break;
    }
  }

  /**
   * Mark object for disposal
   */
  markForDisposal(object: THREE.Object3D): void {
    this.disposableObjects.add(object);
  }

  /**
   * Dispose marked objects
   */
  disposeMarkedObjects(): void {
    this.disposableObjects.forEach((object) => {
      this.disposeObject(object);
    });
    this.disposableObjects.clear();
  }

  /**
   * Dispose a Three.js object and its resources
   */
  private disposeObject(object: THREE.Object3D): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) {
          child.geometry.dispose();
        }
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => this.disposeMaterial(mat));
          } else {
            this.disposeMaterial(child.material);
          }
        }
      }
    });

    if (object.parent) {
      object.parent.remove(object);
    }
  }

  /**
   * Dispose material and its textures
   */
  private disposeMaterial(material: THREE.Material): void {
    material.dispose();

    // Dispose textures
    const mat = material as THREE.MeshStandardMaterial;
    if (mat.map) mat.map.dispose();
    if (mat.normalMap) mat.normalMap.dispose();
    if (mat.roughnessMap) mat.roughnessMap.dispose();
    if (mat.metalnessMap) mat.metalnessMap.dispose();
    if (mat.aoMap) mat.aoMap.dispose();
    if (mat.emissiveMap) mat.emissiveMap.dispose();
  }

  /**
   * Dispose LOD object
   */
  private disposeLOD(lod: THREE.LOD): void {
    lod.levels.forEach((level) => {
      this.disposeObject(level.object);
    });
  }

  /**
   * Get current LOD distances for all buildings
   */
  getBuildingDistances(): Map<string, number> {
    return new Map(this.buildingDistances);
  }

  /**
   * Check if memory warning should be shown
   */
  shouldShowMemoryWarning(): boolean {
    return this.estimateMemoryUsage() > this.config.memoryWarningThreshold;
  }

  /**
   * Dispose all resources
   */
  dispose(): void {
    this.lodObjects.forEach((lod) => this.disposeLOD(lod));
    this.lodObjects.clear();
    this.disposableObjects.clear();
    this.buildingDistances.clear();
  }
}

/**
 * Progressive loader with feedback
 */
export class ProgressiveLoader {
  private totalItems: number = 0;
  private loadedItems: number = 0;
  private onProgress?: (progress: number, message: string) => void;

  constructor(onProgress?: (progress: number, message: string) => void) {
    this.onProgress = onProgress;
  }

  /**
   * Set total items to load
   */
  setTotal(total: number): void {
    this.totalItems = total;
    this.loadedItems = 0;
  }

  /**
   * Mark an item as loaded
   */
  itemLoaded(message: string = ''): void {
    this.loadedItems++;
    const progress = this.totalItems > 0 ? this.loadedItems / this.totalItems : 1;
    this.onProgress?.(progress, message);
  }

  /**
   * Get current progress (0-1)
   */
  getProgress(): number {
    return this.totalItems > 0 ? this.loadedItems / this.totalItems : 1;
  }

  /**
   * Check if loading is complete
   */
  isComplete(): boolean {
    return this.loadedItems >= this.totalItems;
  }

  /**
   * Reset loader
   */
  reset(): void {
    this.totalItems = 0;
    this.loadedItems = 0;
  }
}

/**
 * Object pool for reusing geometries and materials
 */
export class ObjectPool<T> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn: (obj: T) => void;
  private maxSize: number;

  constructor(
    createFn: () => T,
    resetFn: (obj: T) => void = () => {},
    maxSize: number = 100
  ) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.maxSize = maxSize;
  }

  /**
   * Get an object from the pool or create a new one
   */
  acquire(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return this.createFn();
  }

  /**
   * Return an object to the pool
   */
  release(obj: T): void {
    if (this.pool.length < this.maxSize) {
      this.resetFn(obj);
      this.pool.push(obj);
    }
  }

  /**
   * Clear the pool
   */
  clear(): void {
    this.pool = [];
  }

  /**
   * Get pool size
   */
  size(): number {
    return this.pool.length;
  }
}

export default PerformanceOptimizer;
