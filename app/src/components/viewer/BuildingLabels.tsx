/**
 * Building Labels - 3D labels for buildings with decluttering
 *
 * Phase 5 Implementation:
 * - HTML-based labels projected from 3D positions
 * - Automatic decluttering to prevent overlap
 * - Visibility based on zoom level
 * - Interactive labels (click to select)
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import * as THREE from 'three';
import type { Building } from '../../types';

export interface BuildingLabel {
  id: string;
  name: string;
  position: THREE.Vector3;
  screenPosition: { x: number; y: number };
  visible: boolean;
  priority: number;
  height: number;
}

export interface BuildingLabelsProps {
  /** Buildings to show labels for */
  buildings: Building[];
  /** Three.js camera */
  camera: THREE.PerspectiveCamera | null;
  /** Container element for label positioning */
  container: HTMLElement | null;
  /** Building meshes for position calculation */
  buildingMeshes: Map<string, THREE.Object3D>;
  /** Currently selected building ID */
  selectedBuildingId?: string;
  /** Callback when label is clicked */
  onLabelClick?: (buildingId: string) => void;
  /** Minimum zoom distance to show labels */
  minZoomDistance?: number;
  /** Maximum zoom distance to show labels */
  maxZoomDistance?: number;
  /** Enable decluttering */
  enableDeclutter?: boolean;
  /** Show all labels regardless of overlap */
  showAllLabels?: boolean;
}

export function BuildingLabels({
  buildings,
  camera,
  container,
  buildingMeshes,
  selectedBuildingId,
  onLabelClick,
  minZoomDistance = 20,
  maxZoomDistance = 1000,
  enableDeclutter = true,
  showAllLabels = false,
}: BuildingLabelsProps) {
  const [labels, setLabels] = useState<BuildingLabel[]>([]);
  const animationFrameRef = useRef<number>(0);
  const lastUpdateRef = useRef<number>(0);

  // Project 3D position to screen coordinates
  const projectToScreen = useCallback(
    (position: THREE.Vector3): { x: number; y: number; visible: boolean } => {
      if (!camera || !container) {
        return { x: 0, y: 0, visible: false };
      }

      const vector = position.clone();
      vector.project(camera);

      // Check if behind camera
      if (vector.z > 1) {
        return { x: 0, y: 0, visible: false };
      }

      const rect = container.getBoundingClientRect();
      const x = (vector.x * 0.5 + 0.5) * rect.width;
      const y = (vector.y * -0.5 + 0.5) * rect.height;

      // Check if on screen
      const visible = x >= -50 && x <= rect.width + 50 && y >= -50 && y <= rect.height + 50;

      return { x, y, visible };
    },
    [camera, container]
  );

  // Declutter labels to prevent overlap
  const declutterLabels = useCallback((labelList: BuildingLabel[]): BuildingLabel[] => {
    if (!enableDeclutter || showAllLabels) {
      return labelList;
    }

    const decluttered: BuildingLabel[] = [];
    const occupiedRects: { x: number; y: number; width: number; height: number }[] = [];

    // Sort by priority (selected first, then by height)
    const sorted = [...labelList].sort((a, b) => {
      if (a.id === selectedBuildingId) return -1;
      if (b.id === selectedBuildingId) return 1;
      return b.priority - a.priority;
    });

    const labelWidth = 100;
    const labelHeight = 30;
    const padding = 10;

    for (const label of sorted) {
      if (!label.visible) continue;

      const rect = {
        x: label.screenPosition.x - labelWidth / 2,
        y: label.screenPosition.y - labelHeight / 2,
        width: labelWidth,
        height: labelHeight,
      };

      // Check for overlap with existing labels
      const overlaps = occupiedRects.some(
        (occupied) =>
          rect.x < occupied.x + occupied.width + padding &&
          rect.x + rect.width + padding > occupied.x &&
          rect.y < occupied.y + occupied.height + padding &&
          rect.y + rect.height + padding > occupied.y
      );

      if (!overlaps || label.id === selectedBuildingId) {
        decluttered.push({ ...label, visible: true });
        occupiedRects.push(rect);
      } else {
        decluttered.push({ ...label, visible: false });
      }
    }

    return decluttered;
  }, [enableDeclutter, showAllLabels, selectedBuildingId]);

  // Update label positions
  const updateLabels = useCallback(() => {
    if (!camera || !container) return;

    // Throttle updates to 30fps
    const now = performance.now();
    if (now - lastUpdateRef.current < 33) return;
    lastUpdateRef.current = now;

    // Calculate camera distance from scene center
    const cameraDistance = camera.position.length();

    // Check if within zoom range for showing labels
    if (cameraDistance < minZoomDistance || cameraDistance > maxZoomDistance) {
      setLabels([]);
      return;
    }

    const newLabels: BuildingLabel[] = buildings.map((building) => {
      const mesh = buildingMeshes.get(building.id);
      let position = new THREE.Vector3(0, building.totalHeight + 5, 0);

      if (mesh) {
        // Get world position from mesh
        const box = new THREE.Box3().setFromObject(mesh);
        const center = box.getCenter(new THREE.Vector3());
        position = new THREE.Vector3(center.x, box.max.y + 5, center.z);
      }

      const screenPos = projectToScreen(position);

      return {
        id: building.id,
        name: building.name,
        position,
        screenPosition: { x: screenPos.x, y: screenPos.y },
        visible: screenPos.visible,
        priority: building.totalHeight, // Higher buildings get higher priority
        height: building.totalHeight,
      };
    });

    const decluttered = declutterLabels(newLabels);
    setLabels(decluttered);
  }, [
    buildings,
    camera,
    container,
    buildingMeshes,
    minZoomDistance,
    maxZoomDistance,
    projectToScreen,
    declutterLabels,
  ]);

  // Animation loop for updating labels
  useEffect(() => {
    const animate = () => {
      updateLabels();
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [updateLabels]);

  if (!container || labels.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {labels.map((label) => {
        if (!label.visible) return null;

        const isSelected = label.id === selectedBuildingId;

        return (
          <div
            key={label.id}
            className={`
              absolute transform -translate-x-1/2 -translate-y-full
              pointer-events-auto cursor-pointer
              transition-all duration-150
              ${isSelected ? 'z-20' : 'z-10'}
            `}
            style={{
              left: `${label.screenPosition.x}px`,
              top: `${label.screenPosition.y}px`,
            }}
            onClick={() => onLabelClick?.(label.id)}
          >
            {/* Label connector line */}
            <div
              className={`
                absolute left-1/2 bottom-0 w-px h-3 -translate-x-1/2 translate-y-full
                ${isSelected ? 'bg-amber-500' : 'bg-gray-400'}
              `}
            />

            {/* Label box */}
            <div
              className={`
                px-2 py-1 rounded-lg shadow-lg
                text-xs font-medium whitespace-nowrap
                transition-colors
                ${isSelected
                  ? 'bg-amber-500 text-white'
                  : 'bg-white/95 text-gray-700 hover:bg-amber-50 border border-gray-200'}
              `}
            >
              <div className="flex items-center gap-1.5">
                <span>{label.name}</span>
                <span className={`
                  text-[10px] px-1 py-0.5 rounded
                  ${isSelected ? 'bg-amber-600' : 'bg-gray-100 text-gray-500'}
                `}>
                  {label.height}m
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default BuildingLabels;
