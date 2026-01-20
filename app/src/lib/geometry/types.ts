/**
 * Core Geometry Types for Building Projection System
 *
 * Defines the fundamental data structures used in the transformation pipeline
 * from 2D Editor Canvas to 3D World Space.
 */

/**
 * 2D Point in any coordinate system
 */
export interface Point2D {
  x: number;
  y: number;
}

/**
 * 3D Point in world space
 */
export interface Point3D {
  x: number;
  y: number;
  z: number;
}

/**
 * Site Configuration
 * Contains parameters for Image Space → World Space transformation
 */
export interface SiteConfig {
  /** Image width in pixels */
  imageWidth: number;

  /** Image height in pixels */
  imageHeight: number;

  /** Scale factor: meters per pixel */
  scale: number;

  /** North angle rotation in degrees (0 = north is up in image) */
  northAngle: number;
}

/**
 * Building Footprint Geometry
 * Represents a building at various stages of transformation
 */
export interface BuildingGeometry {
  /** Footprint polygon in Image Space (pixels) */
  imageFootprint: Point2D[];

  /** Footprint polygon in World Space (meters, XZ plane) */
  worldFootprint?: Point2D[];

  /** Footprint polygon in Building Local Space (meters, centered at origin) */
  localFootprint?: Point2D[];

  /** World space position of building centroid */
  centroid?: Point2D;

  /** Total building height in meters */
  totalHeight: number;

  /** Number of floors */
  floors: number;

  /** Height of each floor in meters */
  floorHeight: number;
}

/**
 * Bounding Box in 2D
 */
export interface BoundingBox2D {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

/**
 * Validation result for geometry checks
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Debug visualization settings
 */
export interface DebugSettings {
  showWireframes: boolean;
  showFootprintPoints: boolean;
  showCentroids: boolean;
  showBoundingBoxes: boolean;
  showCoordinateAxes: boolean;
  showGridPlane: boolean;
  highlightFloors: boolean;
  logTransformations: boolean;
}

/**
 * Transformation result with metadata
 */
export interface TransformationResult<T> {
  data: T;
  metadata: {
    inputPoints: number;
    outputPoints: number;
    appliedRotation: number;
    appliedScale: number;
  };
}
