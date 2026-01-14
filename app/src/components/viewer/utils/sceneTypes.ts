import type { Building, DisplaySettings, Measurement, Point2D, Vector3 } from "../../../types";
import * as THREE from "three";

export interface SunPositionInfo {
  altitude: number; // degrees
  azimuth: number; // degrees
  isAboveHorizon: boolean;
}

export interface SectionCutConfig {
  enabled: boolean;
  axis: "x" | "y" | "z";
  position: number; // 0-1 normalized
  flip: boolean;
}

export interface Scene3DProps {
  onSceneReady?: (
    scene: THREE.Scene,
    renderer: THREE.WebGLRenderer,
    camera: THREE.PerspectiveCamera,
    sunLight: THREE.DirectionalLight
  ) => void;
  onSunPositionChange?: (info: SunPositionInfo) => void;
  onBuildingHover?: (building: Building | null) => void;
  onMeasurementClick?: (point: Vector3) => void;
  showNorthArrow?: boolean;
  showSunRay?: boolean;
  showScaleBar?: boolean;
  showSunPath?: boolean;
  sectionCut?: SectionCutConfig;
  displaySettings?: DisplaySettings;
  measurements?: Measurement[];
  measurementMode?: boolean;
  pendingMeasurementPoint?: Vector3 | null;
}

export interface SceneBounds {
  center: Point2D;
  size: number;
  maxHeight: number;
}
