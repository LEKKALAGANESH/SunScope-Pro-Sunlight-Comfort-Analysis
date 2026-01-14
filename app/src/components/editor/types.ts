// Tool types for the editor
export type Tool =
  | "select"
  | "draw"
  | "edit"
  | "delete"
  | "rectangle"
  | "template"
  | "move"
  | "pan";

// Camera state for zoom/pan
export interface Camera {
  x: number;  // horizontal offset in canvas space
  y: number;  // vertical offset in canvas space
  zoom: number; // zoom level (1 = 100%)
}

// Zoom limits for mouse wheel zoom
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 10;

// Default camera state
export const DEFAULT_CAMERA: Camera = {
  x: 0,
  y: 0,
  zoom: 1,
};

// Shape template types
export type ShapeTemplate =
  | "rectangle"
  | "square"
  | "l-shape"
  | "tower"
  | "u-shape";

// Building presets
export interface BuildingPreset {
  name: string;
  floors: number;
  floorHeight: number;
  description: string;
  color: string;
}

// Editor settings
export interface EditorSettings {
  snapToGrid: boolean;
  gridSize: number; // in pixels (will be converted to meters)
  showGrid: boolean;
  orthogonalConstraint: boolean; // Shift key held
}

// Validation error state for building properties
export interface BuildingValidationErrors {
  floors?: string;
  floorHeight?: string;
}

// Validation error state for bulk edit
export interface BulkEditValidationErrors {
  floors?: string;
  floorHeight?: string;
}

// Array tool configuration
export interface ArrayConfig {
  rows: number;
  columns: number;
  spacingX: number;
  spacingY: number;
}

// Default settings
export const DEFAULT_SETTINGS: EditorSettings = {
  snapToGrid: false, // Default to free drawing for continuous placement
  gridSize: 20, // 20px grid
  showGrid: false, // Hide grid by default
  orthogonalConstraint: false,
};

// Close loop threshold in pixels
export const CLOSE_LOOP_THRESHOLD = 15;

// Building presets
export const BUILDING_PRESETS: BuildingPreset[] = [
  {
    name: "Residential Low-Rise",
    floors: 4,
    floorHeight: 3.0,
    description: "Apartments, townhouses",
    color: "#10b981",
  },
  {
    name: "Residential High-Rise",
    floors: 20,
    floorHeight: 2.8,
    description: "Condo towers",
    color: "#3b82f6",
  },
  {
    name: "Commercial Office",
    floors: 10,
    floorHeight: 4.0,
    description: "Office buildings",
    color: "#8b5cf6",
  },
  {
    name: "Industrial",
    floors: 2,
    floorHeight: 6.0,
    description: "Warehouses, factories",
    color: "#f59e0b",
  },
  {
    name: "Mixed-Use Podium",
    floors: 6,
    floorHeight: 3.5,
    description: "Retail + residential",
    color: "#ec4899",
  },
];

// Group colors for building grouping
export const GROUP_COLORS = [
  "#3B82F6", // Blue
  "#10B981", // Green
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#F97316", // Orange
];
