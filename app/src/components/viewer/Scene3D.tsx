import { useEffect, useMemo, useRef } from "react";
import SunCalc from "suncalc";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { useProjectStore } from "../../store/projectStore";
import type {
  Building,
  DisplaySettings,
  Measurement,
  Point2D,
  Vector3,
} from "../../types";
import { createBuildingMesh } from "./utils/buildingMesh";

interface SunPositionInfo {
  altitude: number; // degrees
  azimuth: number; // degrees
  isAboveHorizon: boolean;
}

interface FloorHoverInfo {
  building: Building;
  floor: number | null; // null means hovering building but no specific floor
  floorHeight: { min: number; max: number } | null;
}

interface SectionCutConfig {
  enabled: boolean;
  axis: "x" | "y" | "z";
  position: number; // 0-1 normalized
  flip: boolean;
}

interface Scene3DProps {
  onSceneReady?: (
    scene: THREE.Scene,
    renderer: THREE.WebGLRenderer,
    camera: THREE.PerspectiveCamera,
    sunLight: THREE.DirectionalLight
  ) => void;
  onSunPositionChange?: (info: SunPositionInfo) => void;
  onBuildingHover?: (
    building: Building | null,
    floorInfo?: FloorHoverInfo | null
  ) => void;
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

// Calculate bounding box for all buildings
function calculateSceneBounds(
  buildings: Building[],
  scale: number
): {
  center: Point2D;
  size: number;
  maxHeight: number;
} {
  if (buildings.length === 0) {
    return { center: { x: 0, y: 0 }, size: 200, maxHeight: 50 };
  }

  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;
  let maxHeight = 0;

  buildings.forEach((building) => {
    building.footprint.forEach((p) => {
      const x = p.x * scale;
      const y = p.y * scale;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    });
    maxHeight = Math.max(maxHeight, building.totalHeight);
  });

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const sizeX = maxX - minX;
  const sizeY = maxY - minY;
  // Reduced multiplier from 1.5 to 1.2 for more realistic building spacing
  const size = Math.max(sizeX, sizeY, 100) * 1.2;

  return {
    // Negate Y to match 3D coordinate system (canvas Y down → 3D Z flipped)
    center: { x: centerX, y: -centerY },
    size,
    maxHeight: Math.max(maxHeight, 20),
  };
}

export function Scene3D({
  onSceneReady,
  onSunPositionChange,
  onBuildingHover,
  onMeasurementClick,
  showNorthArrow = false,
  showSunRay = true,
  showScaleBar = true,
  showSunPath = true,
  sectionCut,
  displaySettings,
  measurements = [],
  measurementMode = false,
  pendingMeasurementPoint,
}: Scene3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const clippingPlaneRef = useRef<THREE.Plane>(
    new THREE.Plane(new THREE.Vector3(0, -1, 0), 0)
  );
  const sectionHelperRef = useRef<THREE.PlaneHelper | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const groundRef = useRef<THREE.Mesh | null>(null);
  const gridRef = useRef<THREE.GridHelper | null>(null);
  const buildingMeshesRef = useRef<Map<string, THREE.Object3D>>(new Map());
  const animationRef = useRef<number>(0);
  const sceneCenterRef = useRef<Point2D>({ x: 0, y: 0 });

  // Phase 1 refs
  const northArrowRef = useRef<THREE.Group | null>(null);
  const sunRayRef = useRef<THREE.Group | null>(null);

  // Phase 2 refs
  const scaleBarRef = useRef<THREE.Group | null>(null);
  const sunPathRef = useRef<THREE.Group | null>(null);
  const cardinalDirectionsRef = useRef<THREE.Group | null>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const hoveredBuildingRef = useRef<string | null>(null);

  // Measurement and heatmap refs
  const measurementGroupRef = useRef<THREE.Group | null>(null);
  const heatmapMeshRef = useRef<THREE.Mesh | null>(null);
  const pendingPointMarkerRef = useRef<THREE.Mesh | null>(null);

  // Shadow caching: track last sun position to avoid unnecessary updates
  const lastSunPositionRef = useRef<{
    altitude: number;
    azimuth: number;
  } | null>(null);
  const shadowUpdateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const isScrubbingRef = useRef<boolean>(false);

  const { project, currentTime } = useProjectStore();
  const { buildings, site, analysis } = project;

  // Calculate scene bounds
  const sceneBounds = useMemo(
    () => calculateSceneBounds(buildings, site.scale),
    [buildings, site.scale]
  );

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Sky blue
    sceneRef.current = scene;

    // Camera - position will be adjusted based on scene bounds
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 50000);
    cameraRef.current = camera;

    // Renderer with enhanced shadow settings
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.localClippingEnabled = true;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.minDistance = 10;
    controls.maxDistance = 10000;
    controlsRef.current = controls;

    // Ground plane - will be sized based on scene (large initial size)
    const groundGeo = new THREE.PlaneGeometry(10000, 10000);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x8fbc8f, // Lighter green for grass
      roughness: 0.9,
      metalness: 0,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    groundRef.current = ground;

    // Grid helper (large initial size)
    const gridHelper = new THREE.GridHelper(5000, 200, 0x888888, 0x666666);
    gridHelper.position.y = 0.1;
    scene.add(gridHelper);
    gridRef.current = gridHelper;

    // Measurement visualization group
    const measurementGroup = new THREE.Group();
    measurementGroup.name = "Measurements";
    scene.add(measurementGroup);
    measurementGroupRef.current = measurementGroup;

    // Shadow heatmap plane (initially hidden)
    const heatmapSize = 500;
    const heatmapGeo = new THREE.PlaneGeometry(heatmapSize, heatmapSize);
    const heatmapMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      visible: false,
    });
    const heatmapMesh = new THREE.Mesh(heatmapGeo, heatmapMat);
    heatmapMesh.rotation.x = -Math.PI / 2;
    heatmapMesh.position.y = 0.2; // Slightly above ground
    scene.add(heatmapMesh);
    heatmapMeshRef.current = heatmapMesh;

    // Ambient light - softer for more realistic lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    // Hemisphere light - sky/ground
    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x8fbc8f, 0.4);
    scene.add(hemiLight);

    // Directional light (sun) - enhanced shadow settings
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
    sunLight.position.set(100, 200, 100);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 4096;
    sunLight.shadow.mapSize.height = 4096;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 5000;
    sunLight.shadow.bias = -0.0001;
    sunLight.shadow.normalBias = 0.02;
    scene.add(sunLight);
    // IMPORTANT: Add sun light target to scene for shadows to work correctly
    scene.add(sunLight.target);
    sunLightRef.current = sunLight;

    // North Arrow - always visible compass indicator
    if (showNorthArrow) {
      const northArrowGroup = createNorthArrow();
      scene.add(northArrowGroup);
      northArrowRef.current = northArrowGroup;
    }

    // Sun Ray - line from sun to ground showing light direction
    if (showSunRay) {
      const sunRayGroup = new THREE.Group();
      sunRayGroup.name = "SunRay";
      scene.add(sunRayGroup);
      sunRayRef.current = sunRayGroup;
    }

    // Scale Bar - visual reference for distances
    if (showScaleBar) {
      const scaleBarGroup = new THREE.Group();
      scaleBarGroup.name = "ScaleBar";
      scene.add(scaleBarGroup);
      scaleBarRef.current = scaleBarGroup;
    }

    // Sun Path Arc - shows daily sun trajectory
    if (showSunPath) {
      const sunPathGroup = new THREE.Group();
      sunPathGroup.name = "SunPath";
      scene.add(sunPathGroup);
      sunPathRef.current = sunPathGroup;
    }

    // Cardinal Directions (N, S, E, W) - 3D labels that rotate with scene
    const cardinalGroup = new THREE.Group();
    cardinalGroup.name = "CardinalDirections";
    scene.add(cardinalGroup);
    cardinalDirectionsRef.current = cardinalGroup;

    // Mouse move handler for building hover detection
    const handleMouseMove = (event: MouseEvent) => {
      if (!containerRef.current || !cameraRef.current) return;

      const rect = container.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

      // Check intersections with buildings
      const buildingObjects = Array.from(buildingMeshesRef.current.values());
      const intersects = raycasterRef.current.intersectObjects(
        buildingObjects,
        true
      );

      if (intersects.length > 0) {
        // Find the building ID from the intersected object
        let obj = intersects[0].object;
        while (obj.parent && !obj.userData.buildingId) {
          obj = obj.parent as THREE.Object3D;
        }
        const buildingId = obj.userData.buildingId;

        if (buildingId) {
          hoveredBuildingRef.current = buildingId;
          container.style.cursor = "pointer";
          if (onBuildingHover) {
            const building = buildings.find((b) => b.id === buildingId);
            if (building) {
              // Calculate which floor is being hovered based on intersection Y position
              const intersectionY = intersects[0].point.y;
              const floorNumber = Math.min(
                building.floors,
                Math.max(1, Math.ceil(intersectionY / building.floorHeight))
              );
              const floorInfo: FloorHoverInfo = {
                building,
                floor: floorNumber,
                floorHeight: {
                  min: (floorNumber - 1) * building.floorHeight,
                  max: floorNumber * building.floorHeight,
                },
              };
              onBuildingHover(building, floorInfo);
            } else {
              onBuildingHover(null, null);
            }
          }
        }
      } else {
        if (hoveredBuildingRef.current) {
          hoveredBuildingRef.current = null;
          container.style.cursor = "grab";
          if (onBuildingHover) {
            onBuildingHover(null, null);
          }
        }
      }
    };

    container.addEventListener("mousemove", handleMouseMove);

    // Click handler for measurement mode
    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current || !cameraRef.current || !groundRef.current)
        return;

      const rect = container.getBoundingClientRect();
      const mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(
        new THREE.Vector2(mouseX, mouseY),
        cameraRef.current
      );

      // Raycast against ground plane
      const groundIntersects = raycasterRef.current.intersectObject(
        groundRef.current
      );
      if (groundIntersects.length > 0) {
        const point = groundIntersects[0].point;
        // Store the click point for external handling
        container.dispatchEvent(
          new CustomEvent("measurementclick", {
            detail: { x: point.x, y: point.y, z: point.z },
          })
        );
      }
    };

    container.addEventListener("click", handleClick);

    // Animation loop
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // Callback
    if (onSceneReady) {
      onSceneReady(scene, renderer, camera, sunLight);
    }

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("click", handleClick);
      cancelAnimationFrame(animationRef.current);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  // Update camera, ground, and shadow camera when scene bounds change
  useEffect(() => {
    if (!cameraRef.current || !controlsRef.current || !sunLightRef.current)
      return;

    const { center, size, maxHeight } = sceneBounds;
    sceneCenterRef.current = center;

    // Position camera to see all buildings
    const cameraDistance = size * 1.5;
    const cameraHeight = Math.max(size * 0.8, maxHeight * 3);
    cameraRef.current.position.set(
      center.x + cameraDistance,
      cameraHeight,
      center.y + cameraDistance
    );

    // Look at the center of the scene
    controlsRef.current.target.set(center.x, maxHeight / 2, center.y);
    controlsRef.current.update();

    // Update shadow camera frustum to cover all buildings with generous margin
    const shadowSize = Math.max(size * 2, 1000);
    sunLightRef.current.shadow.camera.left = -shadowSize;
    sunLightRef.current.shadow.camera.right = shadowSize;
    sunLightRef.current.shadow.camera.top = shadowSize;
    sunLightRef.current.shadow.camera.bottom = -shadowSize;
    sunLightRef.current.shadow.camera.near = 0.5;
    sunLightRef.current.shadow.camera.far = shadowSize * 6;
    sunLightRef.current.shadow.camera.updateProjectionMatrix();

    // Update sun light target position to scene center
    sunLightRef.current.target.position.set(center.x, 0, center.y);
    sunLightRef.current.target.updateMatrixWorld();

    // Update ground position
    if (groundRef.current) {
      groundRef.current.position.set(center.x, 0, center.y);
    }

    // Update grid position
    if (gridRef.current) {
      gridRef.current.position.set(center.x, 0.1, center.y);
    }

    // Update north arrow position - place at corner of scene
    if (northArrowRef.current) {
      const arrowSize = Math.max(size * 0.15, 30);
      northArrowRef.current.position.set(
        center.x - size * 0.45,
        0.5,
        center.y - size * 0.45
      );
      northArrowRef.current.scale.setScalar(arrowSize / 20); // Normalize to base size
    }

    // Update scale bar - place at opposite corner from north arrow
    if (scaleBarRef.current) {
      updateScaleBar(scaleBarRef.current, center, size, site.scale);
    }

    // Update cardinal directions
    if (cardinalDirectionsRef.current) {
      updateCardinalDirections(cardinalDirectionsRef.current, center, size);
    }
  }, [sceneBounds, site.scale]);

  // Update sun path when date, time, or location changes
  useEffect(() => {
    if (!sunPathRef.current || !showSunPath) return;

    updateSunPath(
      sunPathRef.current,
      sceneCenterRef.current,
      sceneBounds.size,
      site.location.latitude,
      site.location.longitude,
      project.analysis.date,
      currentTime // Pass current time to show sun position on orbit
    );
  }, [
    project.analysis.date,
    currentTime,
    site.location.latitude,
    site.location.longitude,
    sceneBounds,
    showSunPath,
  ]);

  // Update buildings
  useEffect(() => {
    if (!sceneRef.current) return;

    const scene = sceneRef.current;
    const existingGroups = buildingMeshesRef.current;
    const newGroups = new Map<string, THREE.Object3D>();

    // Remove buildings that no longer exist
    existingGroups.forEach((obj, id) => {
      if (!buildings.find((b) => b.id === id)) {
        scene.remove(obj);
        // Dispose geometry and materials
        obj.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach((m) => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        });
      }
    });

    // Add or update buildings
    buildings.forEach((building) => {
      let buildingObj = existingGroups.get(building.id);

      if (buildingObj) {
        // Remove existing
        scene.remove(buildingObj);
        buildingObj.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach((m) => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        });
      }

      // Create new building group with floor visualization
      const isSelected = building.id === analysis.selectedBuildingId;
      buildingObj = createBuildingMesh(
        building,
        site.scale,
        isSelected ? analysis.selectedFloor : undefined,
        isSelected
      );
      scene.add(buildingObj);

      // Highlight selected building with emissive
      if (isSelected && !analysis.selectedFloor) {
        buildingObj.traverse((child) => {
          if (
            child instanceof THREE.Mesh &&
            child.material instanceof THREE.MeshStandardMaterial
          ) {
            child.material.emissive = new THREE.Color(0x333333);
          }
        });
      }

      newGroups.set(building.id, buildingObj);
    });

    buildingMeshesRef.current = newGroups;
  }, [
    buildings,
    site.scale,
    analysis.selectedBuildingId,
    analysis.selectedFloor,
  ]);

  // Update sun position based on time with shadow caching
  useEffect(() => {
    if (!sunLightRef.current || !rendererRef.current) return;

    const { latitude, longitude } = site.location;
    const sunPosition = SunCalc.getPosition(currentTime, latitude, longitude);
    const center = sceneCenterRef.current;

    // Convert sun position to 3D coordinates
    const distance = Math.max(sceneBounds.size * 2, 500);
    const altitude = sunPosition.altitude;
    const azimuth = sunPosition.azimuth;

    // Check if sun position changed significantly (>0.5 degrees)
    // This avoids unnecessary shadow map updates for tiny changes
    const lastPos = lastSunPositionRef.current;
    const THRESHOLD = 0.008727; // ~0.5 degrees in radians
    const positionChanged =
      !lastPos ||
      Math.abs(altitude - lastPos.altitude) > THRESHOLD ||
      Math.abs(azimuth - lastPos.azimuth) > THRESHOLD;

    // If sun is below horizon, dim the light and position below ground
    if (altitude <= 0) {
      sunLightRef.current.intensity = 0.1;
      sunLightRef.current.position.set(center.x, -100, center.y);
      sunLightRef.current.target.position.set(center.x, 0, center.y);
      lastSunPositionRef.current = { altitude, azimuth };

      // Hide sun ray when below horizon
      if (sunRayRef.current) {
        sunRayRef.current.visible = false;
      }

      // Notify parent
      if (onSunPositionChange) {
        onSunPositionChange({
          altitude: (altitude * 180) / Math.PI,
          azimuth: (azimuth * 180) / Math.PI,
          isAboveHorizon: false,
        });
      }
      return;
    }

    // Show sun ray when above horizon
    if (sunRayRef.current) {
      sunRayRef.current.visible = true;
    }

    // Intensity varies with sun altitude
    sunLightRef.current.intensity = 0.6 + Math.sin(altitude) * 0.6;

    // Calculate sun position relative to scene center
    // SunCalc azimuth: 0=South, π/2=West, π=North, -π/2=East
    // Three.js: +X=East, +Z=South, +Y=Up
    // Sun position matches the orbit path formula
    const x = center.x - Math.sin(azimuth) * Math.cos(altitude) * distance;
    const y = Math.sin(altitude) * distance;
    const z = center.y + Math.cos(azimuth) * Math.cos(altitude) * distance;

    sunLightRef.current.position.set(x, y, z);
    sunLightRef.current.target.position.set(center.x, 0, center.y);
    sunLightRef.current.target.updateMatrixWorld();

    // Update sun ray visualization
    if (sunRayRef.current && showSunRay) {
      updateSunRay(
        sunRayRef.current,
        { x, y, z },
        center,
        sceneBounds.maxHeight
      );
    }

    // Notify parent of sun position change
    if (onSunPositionChange) {
      onSunPositionChange({
        altitude: (altitude * 180) / Math.PI,
        azimuth: (azimuth * 180) / Math.PI,
        isAboveHorizon: altitude > 0,
      });
    }

    // Shadow quality optimization: reduce quality during rapid changes (scrubbing)
    if (positionChanged && rendererRef.current) {
      // Detect if user is scrubbing (rapid changes)
      if (shadowUpdateTimeoutRef.current) {
        clearTimeout(shadowUpdateTimeoutRef.current);
        // During scrubbing, use lower shadow quality
        if (!isScrubbingRef.current) {
          isScrubbingRef.current = true;
          sunLightRef.current.shadow.mapSize.width = 1024;
          sunLightRef.current.shadow.mapSize.height = 1024;
          sunLightRef.current.shadow.map?.dispose();
          sunLightRef.current.shadow.map = null;
        }
      }

      // Schedule high-quality shadow restoration after scrubbing stops
      shadowUpdateTimeoutRef.current = setTimeout(() => {
        if (sunLightRef.current && isScrubbingRef.current) {
          isScrubbingRef.current = false;
          // Restore high-quality shadows
          sunLightRef.current.shadow.mapSize.width = 4096;
          sunLightRef.current.shadow.mapSize.height = 4096;
          sunLightRef.current.shadow.map?.dispose();
          sunLightRef.current.shadow.map = null;
        }
      }, 200);

      lastSunPositionRef.current = { altitude, azimuth };
    }
  }, [
    currentTime,
    site.location.latitude,
    site.location.longitude,
    sceneBounds,
    onSunPositionChange,
    showSunRay,
  ]);

  // Cleanup shadow update timeout on unmount
  useEffect(() => {
    return () => {
      if (shadowUpdateTimeoutRef.current) {
        clearTimeout(shadowUpdateTimeoutRef.current);
      }
    };
  }, []);

  // Update section cut (clipping plane)
  useEffect(() => {
    if (!sceneRef.current || !rendererRef.current) return;

    const scene = sceneRef.current;

    // Remove existing section helper
    if (sectionHelperRef.current) {
      scene.remove(sectionHelperRef.current);
      sectionHelperRef.current = null;
    }

    if (!sectionCut || !sectionCut.enabled) {
      // Remove clipping from all materials
      buildingMeshesRef.current.forEach((obj) => {
        obj.traverse((child) => {
          if (
            child instanceof THREE.Mesh &&
            child.material instanceof THREE.MeshStandardMaterial
          ) {
            child.material.clippingPlanes = [];
            child.material.clipShadows = false;
            child.material.needsUpdate = true;
          }
        });
      });
      return;
    }

    // Calculate clipping plane based on settings
    const { center, size, maxHeight } = sceneBounds;
    let normal: THREE.Vector3;
    let distance: number;

    // Determine plane normal and position based on axis
    switch (sectionCut.axis) {
      case "x":
        normal = new THREE.Vector3(sectionCut.flip ? 1 : -1, 0, 0);
        distance = center.x + (sectionCut.position - 0.5) * size;
        break;
      case "y":
        normal = new THREE.Vector3(0, sectionCut.flip ? 1 : -1, 0);
        distance = sectionCut.position * maxHeight;
        break;
      case "z":
        normal = new THREE.Vector3(0, 0, sectionCut.flip ? 1 : -1);
        distance = center.y + (sectionCut.position - 0.5) * size;
        break;
    }

    clippingPlaneRef.current.set(
      normal,
      sectionCut.flip ? distance : -distance
    );

    // Apply clipping plane to all building materials
    buildingMeshesRef.current.forEach((obj) => {
      obj.traverse((child) => {
        if (
          child instanceof THREE.Mesh &&
          child.material instanceof THREE.MeshStandardMaterial
        ) {
          child.material.clippingPlanes = [clippingPlaneRef.current];
          child.material.clipShadows = true;
          child.material.side = THREE.DoubleSide;
          child.material.needsUpdate = true;
        }
      });
    });

    // Add section plane helper (visual indicator)
    const helperSize = Math.max(size, maxHeight) * 1.2;
    const helper = new THREE.PlaneHelper(
      clippingPlaneRef.current,
      helperSize,
      0xff6600
    );
    helper.name = "SectionHelper";
    scene.add(helper);
    sectionHelperRef.current = helper;
  }, [sectionCut, sceneBounds]);

  // Handle measurement click events from the container
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const handleMeasurementClickEvent = (event: Event) => {
      if (!measurementMode || !onMeasurementClick) return;
      const customEvent = event as CustomEvent<Vector3>;
      onMeasurementClick(customEvent.detail);
    };

    container.addEventListener("measurementclick", handleMeasurementClickEvent);
    return () => {
      container.removeEventListener(
        "measurementclick",
        handleMeasurementClickEvent
      );
    };
  }, [measurementMode, onMeasurementClick]);

  // Render measurements
  useEffect(() => {
    if (!measurementGroupRef.current || !sceneRef.current) return;

    const group = measurementGroupRef.current;
    // Clear existing measurements
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    // Render each measurement
    measurements.forEach((measurement) => {
      const p1 = new THREE.Vector3(
        measurement.point1.x,
        measurement.point1.y,
        measurement.point1.z
      );
      const p2 = new THREE.Vector3(
        measurement.point2.x,
        measurement.point2.y,
        measurement.point2.z
      );

      // Measurement line (dashed)
      const lineGeo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
      const lineMat = new THREE.LineDashedMaterial({
        color: 0xff4444,
        dashSize: 3,
        gapSize: 2,
        linewidth: 2,
      });
      const line = new THREE.Line(lineGeo, lineMat);
      line.computeLineDistances();
      group.add(line);

      // Endpoint spheres
      const sphereGeo = new THREE.SphereGeometry(1.5);
      const sphereMat = new THREE.MeshBasicMaterial({ color: 0xff4444 });
      const s1 = new THREE.Mesh(sphereGeo, sphereMat);
      s1.position.copy(p1);
      s1.position.y += 0.5;
      const s2 = new THREE.Mesh(sphereGeo, sphereMat);
      s2.position.copy(p2);
      s2.position.y += 0.5;
      group.add(s1, s2);

      // Distance label at midpoint
      const midpoint = new THREE.Vector3(
        (p1.x + p2.x) / 2,
        Math.max(p1.y, p2.y) + 5,
        (p1.z + p2.z) / 2
      );

      const canvas = document.createElement("canvas");
      canvas.width = 128;
      canvas.height = 48;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ff4444";
      ctx.fillRect(0, 0, 128, 48);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 24px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${measurement.distance.toFixed(1)}m`, 64, 24);

      const texture = new THREE.CanvasTexture(canvas);
      const labelMat = new THREE.SpriteMaterial({ map: texture });
      const label = new THREE.Sprite(labelMat);
      label.position.copy(midpoint);
      label.scale.set(15, 6, 1);
      group.add(label);
    });
  }, [measurements]);

  // Render pending measurement point
  useEffect(() => {
    if (!sceneRef.current) return;

    // Remove existing pending marker
    if (pendingPointMarkerRef.current) {
      sceneRef.current.remove(pendingPointMarkerRef.current);
      pendingPointMarkerRef.current = null;
    }

    // Add new marker if we have a pending point
    if (pendingMeasurementPoint && measurementMode) {
      const geo = new THREE.SphereGeometry(2);
      const mat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
      const marker = new THREE.Mesh(geo, mat);
      marker.position.set(
        pendingMeasurementPoint.x,
        pendingMeasurementPoint.y + 1,
        pendingMeasurementPoint.z
      );
      sceneRef.current.add(marker);
      pendingPointMarkerRef.current = marker;
    }

    return () => {
      if (pendingPointMarkerRef.current && sceneRef.current) {
        sceneRef.current.remove(pendingPointMarkerRef.current);
        pendingPointMarkerRef.current = null;
      }
    };
  }, [pendingMeasurementPoint, measurementMode]);

  // Update cursor based on measurement mode
  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.style.cursor = measurementMode ? "crosshair" : "grab";
  }, [measurementMode]);

  // Shadow heatmap rendering
  useEffect(() => {
    if (!heatmapMeshRef.current || !sunLightRef.current || !sceneRef.current)
      return;

    const heatmap = heatmapMeshRef.current;
    const showHeatmap = displaySettings?.showShadowHeatmap ?? false;
    const opacity = displaySettings?.heatmapOpacity ?? 0.5;

    if (!showHeatmap) {
      heatmap.visible = false;
      return;
    }

    heatmap.visible = true;

    // Generate heatmap texture based on shadow coverage
    const { center, size } = sceneBounds;
    const gridSize = 32; // Resolution of heatmap
    const canvas = document.createElement("canvas");
    canvas.width = gridSize;
    canvas.height = gridSize;
    const ctx = canvas.getContext("2d")!;

    // Get sun direction
    const sunDir = sunLightRef.current.position.clone().normalize();

    // Get building objects for raycasting (exclude sprites)
    const buildingObjects = Array.from(buildingMeshesRef.current.values());

    // Set camera on raycaster (required for scenes with sprites)
    if (cameraRef.current) {
      raycasterRef.current.camera = cameraRef.current;
    }

    // Calculate shadow coverage for each grid cell
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        // Map grid to world coordinates
        const worldX = center.x + (i / gridSize - 0.5) * size;
        const worldZ = center.y + (j / gridSize - 0.5) * size;

        // Simple shadow test: check if point is behind any building from sun
        let inShadow = false;
        const testPoint = new THREE.Vector3(worldX, 0.5, worldZ);
        const rayToSun = sunDir.clone();

        raycasterRef.current.set(testPoint, rayToSun);
        const intersects = raycasterRef.current.intersectObjects(
          buildingObjects,
          false
        );
        inShadow = intersects.length > 0;

        // Color: blue for sun, red for shadow
        const hue = inShadow ? 0 : 220; // Red or Blue
        const sat = 80;
        const light = inShadow ? 50 : 60;
        ctx.fillStyle = `hsl(${hue}, ${sat}%, ${light}%)`;
        ctx.fillRect(i, j, 1, 1);
      }
    }

    // Apply texture to heatmap
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;

    (heatmap.material as THREE.MeshBasicMaterial).map = texture;
    (heatmap.material as THREE.MeshBasicMaterial).opacity = opacity;
    (heatmap.material as THREE.MeshBasicMaterial).needsUpdate = true;

    // Position and scale heatmap
    heatmap.position.set(center.x, 0.2, center.y);
    heatmap.scale.set(size / 500, size / 500, 1);
  }, [
    displaySettings?.showShadowHeatmap,
    displaySettings?.heatmapOpacity,
    sceneBounds,
    currentTime,
  ]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[400px] rounded-lg overflow-hidden"
      role="img"
      aria-label="3D sunlight visualization. Use mouse to rotate view, scroll to zoom."
    />
  );
}

/**
 * Create a north arrow indicator for the 3D scene
 * Points towards geographic north (negative Z in Three.js convention)
 */
function createNorthArrow(): THREE.Group {
  const group = new THREE.Group();
  group.name = "NorthArrow";

  // Arrow body (cylinder pointing up, then we'll rotate)
  const arrowLength = 15;
  const arrowRadius = 1;

  // North arrow shaft
  const shaftGeo = new THREE.CylinderGeometry(
    arrowRadius * 0.5,
    arrowRadius * 0.5,
    arrowLength,
    8
  );
  const northMaterial = new THREE.MeshStandardMaterial({
    color: 0xcc0000, // Red for north
    roughness: 0.5,
    metalness: 0.3,
  });
  const shaft = new THREE.Mesh(shaftGeo, northMaterial);
  shaft.position.y = arrowLength / 2;
  group.add(shaft);

  // Arrow head (cone)
  const coneGeo = new THREE.ConeGeometry(arrowRadius * 1.5, arrowRadius * 4, 8);
  const cone = new THREE.Mesh(coneGeo, northMaterial);
  cone.position.y = arrowLength + arrowRadius * 2;
  group.add(cone);

  // South indicator (shorter, different color)
  const southMaterial = new THREE.MeshStandardMaterial({
    color: 0x666666, // Gray for south
    roughness: 0.5,
    metalness: 0.3,
  });
  const southShaftGeo = new THREE.CylinderGeometry(
    arrowRadius * 0.3,
    arrowRadius * 0.3,
    arrowLength * 0.5,
    8
  );
  const southShaft = new THREE.Mesh(southShaftGeo, southMaterial);
  southShaft.position.y = arrowLength * 0.25;
  southShaft.position.z = arrowLength * 0.6;
  southShaft.rotation.x = Math.PI / 2;
  group.add(southShaft);

  // "N" label using a plane with text texture
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#cc0000";
  ctx.font = "bold 48px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("N", 32, 32);

  const texture = new THREE.CanvasTexture(canvas);
  const labelMaterial = new THREE.SpriteMaterial({ map: texture });
  const label = new THREE.Sprite(labelMaterial);
  label.position.y = arrowLength + arrowRadius * 6;
  label.scale.set(8, 8, 1);
  group.add(label);

  // Base circle
  const baseGeo = new THREE.RingGeometry(arrowRadius * 3, arrowRadius * 4, 32);
  const baseMaterial = new THREE.MeshStandardMaterial({
    color: 0x333333,
    roughness: 0.8,
    side: THREE.DoubleSide,
  });
  const base = new THREE.Mesh(baseGeo, baseMaterial);
  base.rotation.x = -Math.PI / 2;
  base.position.y = 0.1;
  group.add(base);

  return group;
}

/**
 * Update the sun ray visualization
 * Creates a dashed line from sun position to ground with an arrow
 */
function updateSunRay(
  group: THREE.Group,
  sunPos: { x: number; y: number; z: number },
  center: Point2D,
  maxHeight: number
): void {
  // Clear existing children
  while (group.children.length > 0) {
    const child = group.children[0];
    if (child instanceof THREE.Line || child instanceof THREE.Mesh) {
      child.geometry.dispose();
      if (child.material instanceof THREE.Material) {
        child.material.dispose();
      }
    }
    group.remove(child);
  }

  // Create ray from sun to ground center
  const groundPoint = new THREE.Vector3(center.x, maxHeight / 2, center.y);
  const sunPoint = new THREE.Vector3(sunPos.x, sunPos.y, sunPos.z);

  // Direction from sun to ground
  const direction = groundPoint.clone().sub(sunPoint).normalize();

  // Ray line (dashed)
  const rayLength = sunPoint.distanceTo(groundPoint) * 0.8; // Don't go all the way to sun
  const rayStart = sunPoint
    .clone()
    .add(
      direction.clone().multiplyScalar(sunPoint.distanceTo(groundPoint) * 0.1)
    );
  const rayEnd = groundPoint.clone();

  const rayGeo = new THREE.BufferGeometry().setFromPoints([rayStart, rayEnd]);
  const rayMaterial = new THREE.LineDashedMaterial({
    color: 0xffaa00,
    dashSize: 10,
    gapSize: 5,
    linewidth: 2,
  });
  const ray = new THREE.Line(rayGeo, rayMaterial);
  ray.computeLineDistances();
  group.add(ray);

  // Arrow head at ground level pointing down
  const arrowSize = Math.max(rayLength * 0.02, 5);
  const arrowGeo = new THREE.ConeGeometry(arrowSize, arrowSize * 2, 8);
  const arrowMaterial = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
  const arrow = new THREE.Mesh(arrowGeo, arrowMaterial);
  arrow.position.copy(rayEnd);

  // Point arrow in direction of sun ray
  arrow.lookAt(sunPoint);
  arrow.rotateX(Math.PI / 2);

  group.add(arrow);

  // Sun direction indicator on ground (shadow of arrow)
  const groundArrowGeo = new THREE.ConeGeometry(
    arrowSize * 1.5,
    arrowSize * 3,
    8
  );
  const groundArrowMaterial = new THREE.MeshBasicMaterial({
    color: 0x333333,
    transparent: true,
    opacity: 0.5,
  });
  const groundArrow = new THREE.Mesh(groundArrowGeo, groundArrowMaterial);
  groundArrow.position.set(center.x, 0.5, center.y);

  // Point towards where shadow will fall (opposite of sun)
  const shadowDir = new THREE.Vector3(
    -direction.x,
    0,
    -direction.z
  ).normalize();
  groundArrow.position.add(shadowDir.multiplyScalar(arrowSize * 4));
  groundArrow.rotation.x = -Math.PI / 2;
  groundArrow.rotation.z = Math.atan2(-direction.x, -direction.z);

  group.add(groundArrow);
}

/**
 * Update the scale bar visualization
 * Shows a reference bar with distance markings
 */
function updateScaleBar(
  group: THREE.Group,
  center: Point2D,
  sceneSize: number,
  _metersPerPixel: number
): void {
  // Clear existing children
  while (group.children.length > 0) {
    const child = group.children[0];
    if (
      child instanceof THREE.Line ||
      child instanceof THREE.Mesh ||
      child instanceof THREE.Sprite
    ) {
      if ("geometry" in child) child.geometry.dispose();
      if ("material" in child) {
        const mat = child.material;
        if (mat instanceof THREE.Material) mat.dispose();
      }
    }
    group.remove(child);
  }

  // Calculate a nice round scale bar length
  const targetLength = sceneSize * 0.25;
  const possibleLengths = [10, 20, 25, 50, 100, 200, 250, 500, 1000];
  let scaleLength = possibleLengths.find((l) => l >= targetLength * 0.5) || 100;
  if (scaleLength > targetLength * 2) scaleLength = targetLength;

  // Position at bottom-right corner of scene
  const startX = center.x + sceneSize * 0.2;
  const startZ = center.y + sceneSize * 0.45;

  // Main bar
  const barHeight = 2;
  const barGeo = new THREE.BoxGeometry(scaleLength, barHeight, 3);
  const barMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
  const bar = new THREE.Mesh(barGeo, barMaterial);
  bar.position.set(startX + scaleLength / 2, barHeight / 2, startZ);
  group.add(bar);

  // End caps
  const capGeo = new THREE.BoxGeometry(2, barHeight * 3, 3);
  const leftCap = new THREE.Mesh(capGeo, barMaterial);
  leftCap.position.set(startX, barHeight * 1.5, startZ);
  group.add(leftCap);

  const rightCap = new THREE.Mesh(capGeo, barMaterial);
  rightCap.position.set(startX + scaleLength, barHeight * 1.5, startZ);
  group.add(rightCap);

  // Label with distance
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#333333";
  ctx.font = "bold 32px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const labelText =
    scaleLength >= 1000 ? `${scaleLength / 1000}km` : `${scaleLength}m`;
  ctx.fillText(labelText, 64, 32);

  const texture = new THREE.CanvasTexture(canvas);
  const labelMaterial = new THREE.SpriteMaterial({ map: texture });
  const label = new THREE.Sprite(labelMaterial);
  label.position.set(startX + scaleLength / 2, barHeight * 4, startZ);
  label.scale.set(scaleLength * 0.3, scaleLength * 0.15, 1);
  group.add(label);

  // Zero label
  const zeroCanvas = document.createElement("canvas");
  zeroCanvas.width = 64;
  zeroCanvas.height = 64;
  const zeroCtx = zeroCanvas.getContext("2d")!;
  zeroCtx.fillStyle = "#666666";
  zeroCtx.font = "bold 24px Arial";
  zeroCtx.textAlign = "center";
  zeroCtx.textBaseline = "middle";
  zeroCtx.fillText("0", 32, 32);

  const zeroTexture = new THREE.CanvasTexture(zeroCanvas);
  const zeroMaterial = new THREE.SpriteMaterial({ map: zeroTexture });
  const zeroLabel = new THREE.Sprite(zeroMaterial);
  zeroLabel.position.set(startX, barHeight * 4, startZ);
  zeroLabel.scale.set(scaleLength * 0.1, scaleLength * 0.1, 1);
  group.add(zeroLabel);
}

/**
 * Update the sun path arc visualization
 * Shows seasonal sun paths like the reference image:
 * - Summer solstice (highest arc)
 * - Spring/Autumn equinox (middle arc)
 * - Winter solstice (lowest arc)
 * All arcs span from East to West with sun icons along them
 * The current sun position is shown as a glowing sphere on its orbit
 */
function updateSunPath(
  group: THREE.Group,
  center: Point2D,
  sceneSize: number,
  latitude: number,
  longitude: number,
  date: Date,
  currentTime: Date
): void {
  // Clear existing children
  while (group.children.length > 0) {
    const child = group.children[0];
    if (child instanceof THREE.Line || child instanceof THREE.Mesh) {
      child.geometry.dispose();
      if (child.material instanceof THREE.Material) {
        child.material.dispose();
      }
    } else if (child instanceof THREE.Sprite) {
      if (child.material.map) child.material.map.dispose();
      child.material.dispose();
    }
    group.remove(child);
  }

  // Arc radius - size of the dome
  // Increased arc radius to keep orbit paths further from buildings
  const arcRadius = Math.max(sceneSize * 1.2, 150);
  const currentYear = date.getFullYear();

  // Define seasonal dates with their characteristics
  const seasons = [
    {
      name: "Summer solstice",
      date: new Date(currentYear, 5, 21),
      color: 0xff6600,
      lineWidth: 2,
    },
    {
      name: "Spring and Autumn\nsolstice",
      date: new Date(currentYear, 2, 21),
      color: 0x66cc66,
      lineWidth: 2,
    },
    {
      name: "Winter solstice",
      date: new Date(currentYear, 11, 21),
      color: 0x3399ff,
      lineWidth: 2,
    },
  ];

  // Create horizon ellipse (ground plane)
  const horizonPoints: THREE.Vector3[] = [];
  for (let i = 0; i <= 64; i++) {
    const angle = (i / 64) * Math.PI * 2;
    horizonPoints.push(
      new THREE.Vector3(
        center.x + Math.cos(angle) * arcRadius,
        0.5,
        center.y + Math.sin(angle) * arcRadius * 0.5 // Elliptical, matching sun path bend
      )
    );
  }
  const horizonGeo = new THREE.BufferGeometry().setFromPoints(horizonPoints);
  const horizonMat = new THREE.LineBasicMaterial({
    color: 0x666666,
    transparent: true,
    opacity: 0.5,
  });
  const horizonLine = new THREE.Line(horizonGeo, horizonMat);
  group.add(horizonLine);

  // Add "Horizontal surface" label
  const surfaceLabel = createSeasonLabel("Horizontal surface", 0x888888);
  surfaceLabel.position.set(
    center.x + arcRadius * 0.5,
    2,
    center.y + arcRadius * 0.25
  );
  surfaceLabel.scale.set(20, 8, 1);
  group.add(surfaceLabel);

  // Add cardinal direction markers on horizon (matching reference: N=back, S=front, E=right, W=left)
  const directions = [
    { label: "N", x: center.x, z: center.y - arcRadius * 0.55, color: 0x888888 }, // Back (negative Z)
    { label: "S", x: center.x, z: center.y + arcRadius * 0.55, color: 0x888888 }, // Front (positive Z)
    { label: "E", x: center.x + arcRadius * 1.1, z: center.y, color: 0x888888 }, // Right (positive X)
    { label: "W", x: center.x - arcRadius * 1.1, z: center.y, color: 0x888888 }, // Left (negative X)
  ];

  directions.forEach(({ label, x, z, color }) => {
    const dirLabel = createDirectionLabel(label, color);
    dirLabel.position.set(x, 1, z);
    group.add(dirLabel);
  });

  // Create seasonal arcs (East to West) - only show paths, no sun icons
  seasons.forEach((season) => {
    const pathData = createSeasonalArc(
      center,
      arcRadius,
      latitude,
      longitude,
      season.date,
      season.color
    );
    if (pathData) {
      group.add(pathData.line);

      // Add season label (no sun icon - only current sun shown)
      const label = createSeasonLabel(season.name, season.color);
      if (pathData.labelPoint) {
        label.position.copy(pathData.labelPoint);
        group.add(label);
      }
    }
  });

  // Add current day path (dashed line)
  const currentPath = createSeasonalArc(
    center,
    arcRadius,
    latitude,
    longitude,
    date,
    0xffcc00
  );
  if (currentPath) {
    // Make current day path dashed to distinguish from seasonal paths
    const dashedMat = new THREE.LineDashedMaterial({
      color: 0xffcc00,
      dashSize: 3,
      gapSize: 2,
      transparent: true,
      opacity: 0.8,
    });
    currentPath.line.material = dashedMat;
    currentPath.line.computeLineDistances();
    group.add(currentPath.line);
  }

  // Add CURRENT SUN POSITION on the orbit (smaller glowing sphere)
  const currentSunPos = SunCalc.getPosition(currentTime, latitude, longitude);
  if (currentSunPos.altitude > 0) {
    // Calculate sun position on the orbit path (same formula as createSeasonalArc)
    // SunCalc azimuth: 0=South, π/2=West, π=North, -π/2=East
    const sunX =
      center.x -
      Math.sin(currentSunPos.azimuth) *
        Math.cos(currentSunPos.altitude) *
        arcRadius;
    const sunY = Math.sin(currentSunPos.altitude) * arcRadius;
    const sunZ =
      center.y +
      Math.cos(currentSunPos.azimuth) *
        Math.cos(currentSunPos.altitude) *
        arcRadius *
        0.5;

    // Create sun sphere (smaller size)
    const sunSize = arcRadius * 0.05;
    const sunGeo = new THREE.SphereGeometry(sunSize, 24, 24);
    const sunMat = new THREE.MeshBasicMaterial({
      color: 0xffdd00,
    });
    const sunSphere = new THREE.Mesh(sunGeo, sunMat);
    sunSphere.position.set(sunX, sunY, sunZ);
    group.add(sunSphere);

    // Add subtle glow effect
    const glowGeo = new THREE.SphereGeometry(sunSize * 1.4, 24, 24);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.25,
    });
    const glowSphere = new THREE.Mesh(glowGeo, glowMat);
    glowSphere.position.set(sunX, sunY, sunZ);
    group.add(glowSphere);

    // Add small rays emanating from sun
    const rayCount = 8;
    const rayLength = sunSize * 2;
    for (let i = 0; i < rayCount; i++) {
      const angle = (i / rayCount) * Math.PI * 2;
      const rayGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(
          Math.cos(angle) * rayLength,
          Math.sin(angle) * rayLength,
          0
        ),
      ]);
      const rayMat = new THREE.LineBasicMaterial({
        color: 0xffaa00,
        transparent: true,
        opacity: 0.5,
      });
      const ray = new THREE.Line(rayGeo, rayMat);
      ray.position.set(sunX, sunY, sunZ);
      ray.lookAt(center.x, 0, center.y);
      group.add(ray);
    }

    // Add time label next to sun
    const timeStr = currentTime.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    const timeLabel = createSeasonLabel(timeStr, 0xffcc00);
    timeLabel.position.set(sunX + 8, sunY + 5, sunZ);
    timeLabel.scale.set(10, 3, 1);
    group.add(timeLabel);
  } else {
    // Sun below horizon - show indicator
    const belowLabel = createSeasonLabel("Sun below horizon", 0x666666);
    belowLabel.position.set(center.x, 10, center.y);
    group.add(belowLabel);
  }
}

/**
 * Create a seasonal sun arc (East to West) for a specific date
 */
function createSeasonalArc(
  center: Point2D,
  arcRadius: number,
  latitude: number,
  longitude: number,
  date: Date,
  color: number
): {
  line: THREE.Line;
  peakPoint: THREE.Vector3 | null;
  labelPoint: THREE.Vector3 | null;
} | null {
  const sunTimes = SunCalc.getTimes(date, latitude, longitude);
  const sunrise = sunTimes.sunrise;
  const sunset = sunTimes.sunset;

  if (
    !sunrise ||
    !sunset ||
    isNaN(sunrise.getTime()) ||
    isNaN(sunset.getTime())
  ) {
    return null;
  }

  const pathPoints: THREE.Vector3[] = [];
  const numSamples = 48;
  let peakPoint: THREE.Vector3 | null = null;
  let labelPoint: THREE.Vector3 | null = null;
  let maxAltitude = 0;

  for (let i = 0; i <= numSamples; i++) {
    const t = i / numSamples;
    const sampleTime = new Date(
      sunrise.getTime() + t * (sunset.getTime() - sunrise.getTime())
    );
    const sunPos = SunCalc.getPosition(sampleTime, latitude, longitude);

    if (sunPos.altitude <= 0) continue;

    // Position arc around center - E to W trajectory, tilted towards South
    // SunCalc azimuth: 0=South, π/2=West, π=North, -π/2=East (measured from South, clockwise)
    // We want: East=+X, West=-X, South=+Z, North=-Z
    // At East (az=-π/2): -sin(-π/2)=1 → +X ✓
    // At South (az=0): cos(0)=1 → +Z ✓
    const x =
      center.x -
      Math.sin(sunPos.azimuth) * Math.cos(sunPos.altitude) * arcRadius;
    const y = Math.sin(sunPos.altitude) * arcRadius;
    const z =
      center.y +
      Math.cos(sunPos.azimuth) * Math.cos(sunPos.altitude) * arcRadius * 0.5;

    const point = new THREE.Vector3(x, y, z);
    pathPoints.push(point);

    if (sunPos.altitude > maxAltitude) {
      maxAltitude = sunPos.altitude;
      peakPoint = point.clone();
    }

    // Label point at ~25% along the arc
    if (i === Math.floor(numSamples * 0.25)) {
      labelPoint = new THREE.Vector3(x - 15, y + 5, z);
    }
  }

  if (pathPoints.length < 2) return null;

  // Create arc line
  const pathGeo = new THREE.BufferGeometry().setFromPoints(pathPoints);
  const pathMaterial = new THREE.LineBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.8,
    linewidth: 2,
  });
  const pathLine = new THREE.Line(pathGeo, pathMaterial);

  return { line: pathLine, peakPoint, labelPoint };
}

/**
 * Create a direction label (N, S, E, W)
 */
function createDirectionLabel(text: string, color: number): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
  ctx.font = "bold 24px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 16, 16);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(8, 8, 1);
  return sprite;
}

/**
 * Create a season label sprite
 */
function createSeasonLabel(text: string, color: number): THREE.Sprite {
  const canvas = document.createElement("canvas");
  const lines = text.split("\n");
  canvas.width = 120;
  canvas.height = lines.length > 1 ? 40 : 24;
  const ctx = canvas.getContext("2d")!;

  // Background
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Border
  ctx.strokeStyle = `#${color.toString(16).padStart(6, "0")}`;
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);

  // Text
  ctx.fillStyle = "#333333";
  ctx.font = "12px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (lines.length > 1) {
    ctx.fillText(lines[0], canvas.width / 2, 12);
    ctx.fillText(lines[1], canvas.width / 2, 28);
  } else {
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(lines.length > 1 ? 18 : 15, lines.length > 1 ? 6 : 4, 1);
  return sprite;
}

/**
 * Update the cardinal direction labels (N, S, E, W)
 * Creates 3D sprites positioned at the edges of the scene
 */
function updateCardinalDirections(
  group: THREE.Group,
  center: Point2D,
  sceneSize: number
): void {
  // Clear existing children
  while (group.children.length > 0) {
    const child = group.children[0];
    if (child instanceof THREE.Sprite) {
      if (child.material.map) child.material.map.dispose();
      child.material.dispose();
    }
    group.remove(child);
  }

  const directions = [
    {
      label: "N",
      x: center.x,
      z: center.y - sceneSize * 0.55,
      color: "#ef4444",
    }, // North (red) - negative Z
    {
      label: "S",
      x: center.x,
      z: center.y + sceneSize * 0.55,
      color: "#9ca3af",
    }, // South - positive Z
    {
      label: "E",
      x: center.x + sceneSize * 0.55,
      z: center.y,
      color: "#9ca3af",
    }, // East - positive X
    {
      label: "W",
      x: center.x - sceneSize * 0.55,
      z: center.y,
      color: "#9ca3af",
    }, // West - negative X
  ];

  const labelSize = Math.max(sceneSize * 0.08, 20);

  directions.forEach(({ label, x, z, color }) => {
    // Create canvas for the label
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d")!;

    // Draw background circle
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.beginPath();
    ctx.arc(32, 32, 28, 0, Math.PI * 2);
    ctx.fill();

    // Draw label
    ctx.fillStyle = color;
    ctx.font = "bold 36px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, 32, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
    });
    const sprite = new THREE.Sprite(material);
    sprite.position.set(x, 5, z); // Slightly above ground
    sprite.scale.set(labelSize, labelSize, 1);
    group.add(sprite);
  });
}
