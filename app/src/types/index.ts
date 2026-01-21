// Core geometry types
export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D extends Point2D {
  z: number;
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

// Building types
export interface Building {
  id: string;
  name: string;
  footprint: Point2D[];
  floors: number;
  floorHeight: number;
  baseElevation: number;
  totalHeight: number;
  area: number;
  color: string;
}

// Location types
export interface Location {
  latitude: number;
  longitude: number;
  timezone: string;
  city?: string;
}

// Project types
export interface ProjectImage {
  dataUrl: string;
  width: number;
  height: number;
  originalName: string;
}

export interface SiteConfig {
  northAngle: number;
  scale: number;
  location: Location;
}

export interface AnalysisSettings {
  date: Date;
  timeRange: { start: number; end: number };
  selectedBuildingId?: string;
  selectedFloor?: number;
}

// Imported amenity (from detection)
export interface Amenity {
  id: string;
  type: AmenityType;
  name: string;
  position: Point2D;
  boundingBox: { x: number; y: number; width: number; height: number };
  confidence: number;
}

// Import summary for tracking what was imported from detection
export interface ImportSummary {
  buildingsImported: number;
  amenitiesImported: number;
  compassApplied: boolean;
  scaleApplied: boolean;
  importedAt: Date;
}

export interface Project {
  id: string;
  createdAt: Date;
  image: ProjectImage | null;
  site: SiteConfig;
  buildings: Building[];
  amenities: Amenity[];
  importSummary: ImportSummary | null;
  analysis: AnalysisSettings;
}

// Analysis result types
export interface TimeBlock {
  start: Date;
  end: Date;
  durationMinutes: number;
}

export interface HourlyDataPoint {
  hour: number;
  time: Date;
  sunAltitude: number;
  sunAzimuth: number;
  inShadow: boolean;
  irradiance: number;
  shadowPercent: number;
}

export interface SunlightResults {
  firstSunTime: Date | null;
  lastSunTime: Date | null;
  totalHours: number;
  directHours: number;
  continuousBlocks: TimeBlock[];
}

export interface SolarResults {
  peakIrradiance: number;
  dailyIrradiation: number;
  peakTime: Date | null;
}

export interface ComfortResults {
  riskLevel: 'low' | 'medium' | 'high';
  score: number;
  peakHeatPeriod: TimeBlock | null;
  recommendations: string[];
}

export interface AnalysisResults {
  targetId: string;
  targetType: 'building' | 'floor' | 'site';
  floor?: number;
  date: Date;
  sunlight: SunlightResults;
  solar: SolarResults;
  comfort: ComfortResults;
  hourlyData: HourlyDataPoint[];
}

// Scenario types
export interface WindowConfig {
  state: 'open' | 'closed';
  ventilationFactor: number;
}

export interface GlazingConfig {
  type: 'single' | 'double' | 'triple' | 'low-e';
  solarTransmittance: number;
}

export interface ShadingConfig {
  interior: 'none' | 'blinds' | 'curtains' | 'heavy-curtains';
  exterior: 'none' | 'awning' | 'louvers' | 'trees';
  reductionFactor: number;
}

export interface Scenario {
  id: string;
  name: string;
  isActive: boolean;
  window: WindowConfig;
  glazing: GlazingConfig;
  shading: ShadingConfig;
}

// UI State types
export type AppStep = 'upload' | 'setup' | 'validate' | 'editor' | 'viewer' | 'results';

export interface ValidationItem {
  label: string;
  status: 'detected' | 'needs-confirmation' | 'missing';
  description?: string;
}

// Sun position type
export interface SunPosition {
  azimuth: number;
  altitude: number;
  isAboveHorizon: boolean;
}

// Display settings for 3D viewer
export interface DisplaySettings {
  floorTransparency: number; // 0.1-1.0
  showFloorLabels: boolean;
  showShadowHeatmap: boolean;
  heatmapOpacity: number; // 0-1
  shadowIntensity: number; // 0.3-1.0, controls how dark shadows appear
  buildingHeightScale: number; // 1.0-3.0, multiplier to make buildings appear taller
  // Enhanced shadow visualization
  shadowVisualizationMode: 'natural' | 'enhanced' | 'analysis'; // Shadow display mode
  // 'natural' - realistic shadows with dynamic softness
  // 'enhanced' - higher contrast shadows for clearer visibility
  // 'analysis' - color-coded shadow visualization (blue=sun, red=shadow)
}

// Measurement type for distance tool
export interface Measurement {
  id: string;
  point1: Vector3;
  point2: Vector3;
  distance: number;
  createdAt: Date;
}

// Image Analysis Detection Types
export type AmenityType =
  | 'swimming_pool'
  | 'tennis_court'
  | 'basketball_court'
  | 'playground'
  | 'clubhouse'
  | 'parking'
  | 'garden'
  | 'water_body'
  | 'jogging_track'
  | 'unknown';

export interface DetectedBuilding {
  id: string;
  footprint: Point2D[];
  boundingBox: { x: number; y: number; width: number; height: number };
  area: number;
  confidence: number;
  suggestedName: string;
  color: string;
  centroid: Point2D;
  selected: boolean;
}

export interface DetectedAmenity {
  id: string;
  type: AmenityType;
  position: Point2D;
  boundingBox: { x: number; y: number; width: number; height: number };
  confidence: number;
  label?: string;
  selected: boolean;
}

export interface DetectedCompass {
  position: Point2D;
  northAngle: number;
  confidence: number;
}

export interface DetectedScale {
  position: Point2D;
  pixelLength: number;
  suggestedMeters?: number;
  confidence: number;
}

export interface ImageAnalysisResult {
  buildings: DetectedBuilding[];
  amenities: DetectedAmenity[];
  compass: DetectedCompass | null;
  scale: DetectedScale | null;
  roads: Point2D[][];
  vegetation: Point2D[][];
  waterBodies: Point2D[][];
  siteOutline: Point2D[] | null;
  imageStats: {
    dominantColors: string[];
    brightness: number;
    contrast: number;
  };
  analyzedAt: Date;
}
