/**
 * Camera Controller - Enhanced camera controls for 3D viewer
 *
 * Phase 1 Implementation:
 * - Enhanced OrbitControls with damping
 * - Zoom toward cursor position
 * - Camera constraints (polar angle, distance)
 * - Smooth animated transitions
 * - Home/reset view functionality
 * - Fit-to-view functionality
 * - Touch gesture support
 * - Keyboard navigation
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { SceneBounds } from './sceneTypes';

// Re-export for convenience
export type { SceneBounds };

export interface CameraControllerOptions {
  /** Enable smooth damping for camera movement */
  enableDamping?: boolean;
  /** Damping factor (0-1, lower = more inertia) */
  dampingFactor?: number;
  /** Minimum camera distance from target */
  minDistance?: number;
  /** Maximum camera distance from target */
  maxDistance?: number;
  /** Maximum polar angle (prevents going underground) */
  maxPolarAngle?: number;
  /** Minimum polar angle (prevents top-down lock) */
  minPolarAngle?: number;
  /** Enable zoom toward cursor position */
  zoomToCursor?: boolean;
  /** Zoom speed multiplier */
  zoomSpeed?: number;
  /** Rotation speed multiplier */
  rotateSpeed?: number;
  /** Pan speed multiplier */
  panSpeed?: number;
  /** Enable keyboard controls */
  enableKeyboard?: boolean;
}

export interface ViewState {
  position: THREE.Vector3;
  target: THREE.Vector3;
  zoom?: number;
}

const DEFAULT_OPTIONS: Required<CameraControllerOptions> = {
  enableDamping: true,
  dampingFactor: 0.08,
  minDistance: 10,
  maxDistance: 5000,
  maxPolarAngle: Math.PI / 2 - 0.05,
  minPolarAngle: 0.1,
  zoomToCursor: true,
  zoomSpeed: 1.2,
  rotateSpeed: 0.8,
  panSpeed: 1.0,
  enableKeyboard: true,
};

export class CameraController {
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private domElement: HTMLElement;
  private options: Required<CameraControllerOptions>;

  private homeView: ViewState | null = null;
  private isAnimating: boolean = false;
  private animationFrame: number | null = null;

  // For zoom-to-cursor
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private groundPlane: THREE.Plane;

  constructor(
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement,
    options: CameraControllerOptions = {}
  ) {
    this.camera = camera;
    this.domElement = domElement;
    this.options = { ...DEFAULT_OPTIONS, ...options };

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    // Create OrbitControls with enhanced settings
    this.controls = new OrbitControls(camera, domElement);
    this.applyControlSettings();

    // Setup event listeners
    this.setupEventListeners();
  }

  private applyControlSettings(): void {
    const { options, controls } = this;

    controls.enableDamping = options.enableDamping;
    controls.dampingFactor = options.dampingFactor;
    controls.minDistance = options.minDistance;
    controls.maxDistance = options.maxDistance;
    controls.maxPolarAngle = options.maxPolarAngle;
    controls.minPolarAngle = options.minPolarAngle;
    controls.zoomSpeed = options.zoomSpeed;
    controls.rotateSpeed = options.rotateSpeed;
    controls.panSpeed = options.panSpeed;

    // Enable all interaction modes
    controls.enableZoom = true;
    controls.enableRotate = true;
    controls.enablePan = true;

    // Screen space panning (more intuitive)
    controls.screenSpacePanning = true;

    // Touch settings
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };

    // Mouse buttons
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    };
  }

  private setupEventListeners(): void {
    // Zoom toward cursor
    if (this.options.zoomToCursor) {
      this.domElement.addEventListener('wheel', this.handleWheel, { passive: false });
    }

    // Keyboard navigation
    if (this.options.enableKeyboard) {
      this.domElement.setAttribute('tabindex', '0');
      this.domElement.addEventListener('keydown', this.handleKeyDown);
    }

    // Touch gestures (enhanced)
    this.domElement.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    this.domElement.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    this.domElement.addEventListener('touchend', this.handleTouchEnd, { passive: true });
  }

  private handleWheel = (event: WheelEvent): void => {
    if (!this.options.zoomToCursor) return;

    event.preventDefault();

    // Get mouse position in normalized device coordinates
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Cast ray from camera through mouse position
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Find intersection with ground plane
    const intersectPoint = new THREE.Vector3();
    const hasIntersection = this.raycaster.ray.intersectPlane(this.groundPlane, intersectPoint);

    if (hasIntersection) {
      // Calculate zoom factor
      const zoomFactor = event.deltaY > 0 ? 1.1 : 0.9;
      const currentDistance = this.camera.position.distanceTo(this.controls.target);
      const newDistance = currentDistance * zoomFactor;

      // Check distance constraints
      if (newDistance < this.options.minDistance || newDistance > this.options.maxDistance) {
        return;
      }

      // Move target toward cursor position during zoom in
      if (zoomFactor < 1) {
        // Zooming in - move target toward cursor
        const targetOffset = intersectPoint.clone().sub(this.controls.target);
        const moveAmount = 0.1; // Move 10% toward cursor
        this.controls.target.add(targetOffset.multiplyScalar(moveAmount));
      }

      // Apply zoom
      const direction = this.camera.position.clone().sub(this.controls.target).normalize();
      this.camera.position.copy(this.controls.target.clone().add(direction.multiplyScalar(newDistance)));

      this.controls.update();
    }
  };

  private handleKeyDown = (event: KeyboardEvent): void => {
    const panAmount = 10;
    const zoomAmount = 0.9;
    const rotateAmount = 0.1;

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        if (event.shiftKey) {
          // Tilt up - rotate camera around horizontal axis
          this.rotateVertical(rotateAmount);
        } else {
          // Pan forward
          this.pan(0, -panAmount);
        }
        break;

      case 'ArrowDown':
        event.preventDefault();
        if (event.shiftKey) {
          // Tilt down
          this.rotateVertical(-rotateAmount);
        } else {
          // Pan backward
          this.pan(0, panAmount);
        }
        break;

      case 'ArrowLeft':
        event.preventDefault();
        if (event.shiftKey) {
          // Rotate left - orbit horizontally
          this.rotateHorizontal(rotateAmount);
        } else {
          // Pan left
          this.pan(-panAmount, 0);
        }
        break;

      case 'ArrowRight':
        event.preventDefault();
        if (event.shiftKey) {
          // Rotate right
          this.rotateHorizontal(-rotateAmount);
        } else {
          // Pan right
          this.pan(panAmount, 0);
        }
        break;

      case '+':
      case '=':
        event.preventDefault();
        this.zoom(zoomAmount);
        break;

      case '-':
      case '_':
        event.preventDefault();
        this.zoom(1 / zoomAmount);
        break;

      case 'Home':
        event.preventDefault();
        this.resetToHome();
        break;

      case 'f':
      case 'F':
        if (!event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          // Fit to view would be called externally with bounds
        }
        break;

      case 'n':
      case 'N':
        event.preventDefault();
        this.alignToNorth();
        break;
    }

    this.controls.update();
  };

  /**
   * Rotate camera horizontally around target (azimuth)
   */
  private rotateHorizontal(angle: number): void {
    const offset = this.camera.position.clone().sub(this.controls.target);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    spherical.theta += angle;
    offset.setFromSpherical(spherical);
    this.camera.position.copy(this.controls.target.clone().add(offset));
  }

  /**
   * Rotate camera vertically around target (polar angle)
   */
  private rotateVertical(angle: number): void {
    const offset = this.camera.position.clone().sub(this.controls.target);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    spherical.phi = Math.max(
      this.options.minPolarAngle,
      Math.min(this.options.maxPolarAngle, spherical.phi - angle)
    );
    offset.setFromSpherical(spherical);
    this.camera.position.copy(this.controls.target.clone().add(offset));
  }

  // Touch state for enhanced gestures
  private touchState = {
    startDistance: 0,
    startAngle: 0,
    lastDistance: 0,
    lastAngle: 0,
    isTwoFinger: false,
  };

  private handleTouchStart = (event: TouchEvent): void => {
    if (event.touches.length === 2) {
      event.preventDefault();
      this.touchState.isTwoFinger = true;
      this.touchState.startDistance = this.getTouchDistance(event.touches);
      this.touchState.startAngle = this.getTouchAngle(event.touches);
      this.touchState.lastDistance = this.touchState.startDistance;
      this.touchState.lastAngle = this.touchState.startAngle;
    }
  };

  private handleTouchMove = (event: TouchEvent): void => {
    if (event.touches.length === 2 && this.touchState.isTwoFinger) {
      event.preventDefault();

      // Pinch zoom
      const distance = this.getTouchDistance(event.touches);
      const scale = distance / this.touchState.lastDistance;

      if (Math.abs(scale - 1) > 0.01) {
        this.zoom(scale > 1 ? 0.95 : 1.05);
        this.touchState.lastDistance = distance;
      }

      // Two-finger rotate
      const angle = this.getTouchAngle(event.touches);
      const rotation = angle - this.touchState.lastAngle;

      if (Math.abs(rotation) > 0.01) {
        this.rotateHorizontal(rotation * 0.5);
        this.touchState.lastAngle = angle;
      }

      this.controls.update();
    }
  };

  private handleTouchEnd = (_event: TouchEvent): void => {
    this.touchState.isTwoFinger = false;
  };

  private getTouchDistance(touches: TouchList): number {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private getTouchAngle(touches: TouchList): number {
    return Math.atan2(
      touches[1].clientY - touches[0].clientY,
      touches[1].clientX - touches[0].clientX
    );
  }

  /**
   * Pan the camera by screen-space offset
   */
  private pan(deltaX: number, deltaZ: number): void {
    const offset = new THREE.Vector3();

    // Get camera's right and forward vectors
    const eye = this.camera.position.clone().sub(this.controls.target);
    const right = new THREE.Vector3().crossVectors(this.camera.up, eye).normalize();
    const forward = new THREE.Vector3().crossVectors(right, this.camera.up).normalize();

    offset.add(right.multiplyScalar(deltaX));
    offset.add(forward.multiplyScalar(deltaZ));

    this.camera.position.add(offset);
    this.controls.target.add(offset);
  }

  /**
   * Zoom by a factor (< 1 = zoom in, > 1 = zoom out)
   */
  zoom(factor: number): void {
    const currentDistance = this.camera.position.distanceTo(this.controls.target);
    const newDistance = Math.max(
      this.options.minDistance,
      Math.min(this.options.maxDistance, currentDistance * factor)
    );

    const direction = this.camera.position.clone().sub(this.controls.target).normalize();
    this.camera.position.copy(this.controls.target.clone().add(direction.multiplyScalar(newDistance)));
    this.controls.update();
  }

  /**
   * Zoom in one step
   */
  zoomIn(): void {
    this.zoom(0.8);
  }

  /**
   * Zoom out one step
   */
  zoomOut(): void {
    this.zoom(1.25);
  }

  /**
   * Align camera to face north (negative Z direction)
   */
  alignToNorth(animate: boolean = true): void {
    const distance = this.camera.position.distanceTo(this.controls.target);
    const targetHeight = this.controls.target.y;

    // Calculate new position looking from south toward north
    const newPosition = new THREE.Vector3(
      this.controls.target.x,
      targetHeight + distance * 0.7, // Maintain some height
      this.controls.target.z + distance * 0.7
    );

    if (animate) {
      this.animateTo({ position: newPosition, target: this.controls.target.clone() });
    } else {
      this.camera.position.copy(newPosition);
      this.controls.update();
    }
  }

  /**
   * Set the home view state
   */
  setHomeView(state: ViewState): void {
    this.homeView = {
      position: state.position.clone(),
      target: state.target.clone(),
      zoom: state.zoom,
    };
  }

  /**
   * Get the current home view state
   */
  getHomeView(): ViewState | null {
    return this.homeView;
  }

  /**
   * Reset camera to home view with smooth animation
   */
  resetToHome(animate: boolean = true): void {
    if (!this.homeView) {
      console.warn('CameraController: No home view set');
      return;
    }

    if (animate) {
      this.animateTo(this.homeView);
    } else {
      this.camera.position.copy(this.homeView.position);
      this.controls.target.copy(this.homeView.target);
      this.controls.update();
    }
  }

  /**
   * Fit camera to show all content within bounds
   */
  fitToView(bounds: SceneBounds, padding: number = 1.5, animate: boolean = true): void {
    const { center, size, maxHeight } = bounds;

    // Calculate optimal camera position
    const cameraDistance = size * padding;
    const cameraHeight = Math.max(size * 0.8, maxHeight * 3);

    const newPosition = new THREE.Vector3(
      center.x + cameraDistance * 0.7,
      cameraHeight,
      center.y + cameraDistance * 0.7
    );

    const newTarget = new THREE.Vector3(center.x, maxHeight / 2, center.y);

    if (animate) {
      this.animateTo({ position: newPosition, target: newTarget });
    } else {
      this.camera.position.copy(newPosition);
      this.controls.target.copy(newTarget);
      this.controls.update();
    }
  }

  /**
   * Animate camera to a new view state
   */
  animateTo(targetState: ViewState, duration: number = 800): Promise<void> {
    return new Promise((resolve) => {
      if (this.isAnimating && this.animationFrame) {
        cancelAnimationFrame(this.animationFrame);
      }

      this.isAnimating = true;

      const startPosition = this.camera.position.clone();
      const startTarget = this.controls.target.clone();
      const startTime = performance.now();

      const animate = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease out cubic for smooth deceleration
        const eased = 1 - Math.pow(1 - progress, 3);

        // Interpolate position and target
        this.camera.position.lerpVectors(startPosition, targetState.position, eased);
        this.controls.target.lerpVectors(startTarget, targetState.target, eased);
        this.controls.update();

        if (progress < 1) {
          this.animationFrame = requestAnimationFrame(animate);
        } else {
          this.isAnimating = false;
          this.animationFrame = null;
          resolve();
        }
      };

      this.animationFrame = requestAnimationFrame(animate);
    });
  }

  /**
   * Get current view state
   */
  getCurrentViewState(): ViewState {
    return {
      position: this.camera.position.clone(),
      target: this.controls.target.clone(),
    };
  }

  /**
   * Set view state directly
   */
  setViewState(state: ViewState, animate: boolean = false): void {
    if (animate) {
      this.animateTo(state);
    } else {
      this.camera.position.copy(state.position);
      this.controls.target.copy(state.target);
      this.controls.update();
    }
  }

  /**
   * Get the underlying OrbitControls instance
   */
  getControls(): OrbitControls {
    return this.controls;
  }

  /**
   * Phase 3: Set camera to a view preset
   */
  setViewPreset(
    preset: 'aerial' | 'street' | 'top' | 'oblique',
    bounds: SceneBounds,
    animate: boolean = true
  ): void {
    const { center, size, maxHeight } = bounds;
    let newPosition: THREE.Vector3;
    let newTarget: THREE.Vector3;

    switch (preset) {
      case 'aerial':
        // Bird's eye view - high altitude, looking down at 60° angle
        newPosition = new THREE.Vector3(
          center.x + size * 0.3,
          maxHeight + size * 1.5,
          center.y + size * 0.3
        );
        newTarget = new THREE.Vector3(center.x, maxHeight / 3, center.y);
        break;

      case 'street':
        // Ground level view - eye height, looking at buildings
        newPosition = new THREE.Vector3(
          center.x + size * 0.8,
          5,  // Eye height ~5m
          center.y + size * 0.8
        );
        newTarget = new THREE.Vector3(center.x, maxHeight / 2, center.y);
        break;

      case 'top':
        // Plan view - directly above, looking straight down
        newPosition = new THREE.Vector3(
          center.x,
          Math.max(size * 2, maxHeight * 4),
          center.y + 0.01  // Tiny offset to prevent gimbal lock
        );
        newTarget = new THREE.Vector3(center.x, 0, center.y);
        break;

      case 'oblique':
        // 45° oblique view - classic architectural rendering angle
        newPosition = new THREE.Vector3(
          center.x + size * 0.8,
          maxHeight + size * 0.5,
          center.y + size * 0.8
        );
        newTarget = new THREE.Vector3(center.x, maxHeight / 3, center.y);
        break;
    }

    if (animate) {
      this.animateTo({ position: newPosition, target: newTarget });
    } else {
      this.camera.position.copy(newPosition);
      this.controls.target.copy(newTarget);
      this.controls.update();
    }
  }

  /**
   * Focus on a specific point with optional offset
   */
  focusOn(
    point: THREE.Vector3,
    distance: number = 100,
    animate: boolean = true
  ): void {
    const offset = new THREE.Vector3(distance * 0.6, distance * 0.8, distance * 0.6);
    const newPosition = point.clone().add(offset);

    if (animate) {
      this.animateTo({ position: newPosition, target: point });
    } else {
      this.camera.position.copy(newPosition);
      this.controls.target.copy(point);
      this.controls.update();
    }
  }

  /**
   * Update controls - call this in animation loop
   */
  update(): void {
    this.controls.update();
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }

    this.domElement.removeEventListener('wheel', this.handleWheel);
    this.domElement.removeEventListener('keydown', this.handleKeyDown);
    this.domElement.removeEventListener('touchstart', this.handleTouchStart);
    this.domElement.removeEventListener('touchmove', this.handleTouchMove);
    this.domElement.removeEventListener('touchend', this.handleTouchEnd);

    this.controls.dispose();
  }
}

export default CameraController;
