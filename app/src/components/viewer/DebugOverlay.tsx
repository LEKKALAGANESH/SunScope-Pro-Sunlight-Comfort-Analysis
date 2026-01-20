/**
 * Debug Overlay Component
 *
 * Provides visual debugging tools for the building projection system.
 * Helps verify coordinate transformations, rotations, and geometry correctness.
 *
 * Usage:
 *   <DebugOverlay scene={scene} buildings={buildings} siteConfig={siteConfig} enabled={debugMode} />
 */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { Building } from '../../types';
import type { SiteConfig } from '../../lib/geometry';
import { transformFootprint } from '../../lib/geometry';

export interface DebugOverlayProps {
  /** Three.js scene to add debug visualizations to */
  scene: THREE.Scene | null;

  /** Buildings to visualize */
  buildings: Building[];

  /** Site configuration */
  siteConfig: SiteConfig;

  /** Enable/disable debug overlay */
  enabled: boolean;

  /** Debug settings */
  settings?: {
    showWireframes?: boolean;
    showFootprintPoints?: boolean;
    showCentroids?: boolean;
    showBoundingBoxes?: boolean;
    showCoordinateAxes?: boolean;
    showGridPlane?: boolean;
  };
}

export function DebugOverlay({
  scene,
  buildings,
  siteConfig,
  enabled,
  settings = {},
}: DebugOverlayProps) {
  const debugGroupRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    if (!scene || !enabled) {
      // Remove existing debug visualizations
      if (debugGroupRef.current && scene) {
        scene.remove(debugGroupRef.current);
        disposeDebugGroup(debugGroupRef.current);
        debugGroupRef.current = null;
      }
      return;
    }

    // Create debug group
    const debugGroup = new THREE.Group();
    debugGroup.name = 'DebugOverlay';

    // Add coordinate axes
    if (settings.showCoordinateAxes !== false) {
      const axesHelper = new THREE.AxesHelper(100);
      axesHelper.name = 'CoordinateAxes';
      debugGroup.add(axesHelper);

      // Add labels for axes
      addAxisLabels(debugGroup);
    }

    // Add reference grid
    if (settings.showGridPlane !== false) {
      const gridHelper = new THREE.GridHelper(500, 50, 0x00ff00, 0x008800);
      gridHelper.position.y = 0.05; // Slightly above ground
      gridHelper.name = 'ReferenceGrid';
      debugGroup.add(gridHelper);
    }

    // Visualize each building
    buildings.forEach((building) => {
      try {
        const transformResult = transformFootprint(building.footprint, siteConfig);
        const { worldFootprint, centroid } = transformResult.data;

        // Show centroid marker
        if (settings.showCentroids !== false) {
          const centroidMarker = new THREE.Mesh(
            new THREE.SphereGeometry(2, 16, 16),
            new THREE.MeshBasicMaterial({ color: 0xff0000 })
          );
          centroidMarker.position.set(centroid.x, 0, centroid.y);
          centroidMarker.name = `Centroid_${building.name}`;
          debugGroup.add(centroidMarker);

          // Add label
          const label = createTextSprite(building.name, 0xffffff);
          label.position.set(centroid.x, 5, centroid.y);
          debugGroup.add(label);
        }

        // Show footprint points
        if (settings.showFootprintPoints !== false) {
          worldFootprint.forEach((point, index) => {
            const pointMarker = new THREE.Mesh(
              new THREE.SphereGeometry(1, 8, 8),
              new THREE.MeshBasicMaterial({ color: 0x0000ff })
            );
            pointMarker.position.set(point.x, 0, point.y);
            pointMarker.name = `Point_${building.name}_${index}`;
            debugGroup.add(pointMarker);
          });

          // Connect points with lines
          const linePoints = worldFootprint.map(
            (p) => new THREE.Vector3(p.x, 0.5, p.y)
          );
          linePoints.push(linePoints[0]); // Close the loop

          const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
          const lineMaterial = new THREE.LineBasicMaterial({
            color: 0xffff00,
            linewidth: 2,
          });
          const line = new THREE.Line(lineGeometry, lineMaterial);
          line.name = `Footprint_${building.name}`;
          debugGroup.add(line);
        }

        // Show bounding box
        if (settings.showBoundingBoxes !== false) {
          const bbox = calculateBoundingBox2D(worldFootprint);
          const boxHelper = createBoundingBoxHelper(bbox, building.floors * building.floorHeight);
          boxHelper.position.set(centroid.x, (building.floors * building.floorHeight) / 2, centroid.y);
          boxHelper.name = `BBox_${building.name}`;
          debugGroup.add(boxHelper);
        }
      } catch (error) {
        console.error(`[DebugOverlay] Failed to create debug viz for ${building.name}:`, error);
      }
    });

    // Add to scene
    scene.add(debugGroup);
    debugGroupRef.current = debugGroup;

    // Cleanup on unmount or when dependencies change
    return () => {
      if (debugGroupRef.current) {
        scene.remove(debugGroupRef.current);
        disposeDebugGroup(debugGroupRef.current);
        debugGroupRef.current = null;
      }
    };
  }, [scene, buildings, siteConfig, enabled, settings]);

  return null; // This is a visual-only component
}

/**
 * Helper: Create text sprite for labels
 */
function createTextSprite(text: string, color: number): THREE.Sprite {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  canvas.width = 256;
  canvas.height = 64;

  context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
  context.font = 'bold 48px Arial';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, 128, 32);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(10, 2.5, 1);

  return sprite;
}

/**
 * Helper: Create bounding box visualization
 */
function createBoundingBoxHelper(
  bbox: { minX: number; minY: number; maxX: number; maxY: number },
  height: number
): THREE.LineSegments {
  const width = bbox.maxX - bbox.minX;
  const depth = bbox.maxY - bbox.minY;

  const geometry = new THREE.BoxGeometry(width, height, depth);
  const edges = new THREE.EdgesGeometry(geometry);
  const material = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 2 });

  return new THREE.LineSegments(edges, material);
}

/**
 * Helper: Add axis labels
 */
function addAxisLabels(group: THREE.Group): void {
  // X axis (East)
  const xLabel = createTextSprite('X (East)', 0xff0000);
  xLabel.position.set(110, 0, 0);
  group.add(xLabel);

  // Y axis (Up)
  const yLabel = createTextSprite('Y (Up)', 0x00ff00);
  yLabel.position.set(0, 110, 0);
  group.add(yLabel);

  // Z axis (South)
  const zLabel = createTextSprite('Z (South)', 0x0000ff);
  zLabel.position.set(0, 0, 110);
  group.add(zLabel);
}

/**
 * Helper: Calculate 2D bounding box
 */
function calculateBoundingBox2D(points: Array<{ x: number; y: number }>): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  return { minX, minY, maxX, maxY };
}

/**
 * Helper: Dispose debug group and free memory
 */
function disposeDebugGroup(group: THREE.Group): void {
  group.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.Sprite) {
      if ('geometry' in child && child.geometry) {
        child.geometry.dispose();
      }

      if ('material' in child && child.material) {
        const material = child.material;
        if (Array.isArray(material)) {
          material.forEach((m) => {
            if (m.map) m.map.dispose();
            m.dispose();
          });
        } else {
          if (material.map) material.map.dispose();
          material.dispose();
        }
      }
    }
  });
}
