/**
 * Geometry Library - Public API
 *
 * Clean building projection pipeline from 2D Editor Canvas to 3D World Space.
 *
 * Usage:
 *   import { transformFootprint, createBuildingMesh, validateFootprint } from '@/lib/geometry';
 */

// Types
export type {
  Point2D,
  Point3D,
  SiteConfig,
  BuildingGeometry,
  BoundingBox2D,
  ValidationResult,
  DebugSettings,
  TransformationResult,
} from './types';

// Transformations
export {
  imageToWorld,
  worldToLocal,
  transformFootprint,
  calculatePolygonArea,
  calculateBoundingBox,
  hasSelfIntersection,
  logTransformation,
} from './transforms';

// Validation
export type { PolygonNormalizationResult } from './validation';
export {
  validateFootprint,
  validateSiteConfig,
  validateBuildingGeometry,
  validateBuildings,
  formatValidationMessage,
  getValidationSeverity,
  removeDuplicatePoints,
  getWindingOrder,
  normalizeToCounterClockwise,
  validateAndNormalizePolygon,
} from './validation';

// Triangulation
export type { TriangulationResult } from './triangulation';
export {
  triangulatePolygon,
  validateTriangulation,
  triangulateWithValidation,
  calculateTriangleQuality,
  analyzeTriangulationQuality,
} from './triangulation';

// Mesh Building
export type {
  MeshBuilderOptions,
  RobustMeshBuilderOptions,
  RobustMeshBuilderResult,
} from './meshBuilder';
export {
  createBuildingMesh,
  createFloorByFloorMesh,
  createRobustBuildingMesh,
  createExtrudedGeometry,
  createDebugWireframe,
  disposeMesh,
} from './meshBuilder';
