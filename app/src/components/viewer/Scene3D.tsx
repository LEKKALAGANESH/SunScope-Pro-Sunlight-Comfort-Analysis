import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import SunCalc from "suncalc";
import * as THREE from "three";
import { useProjectStore } from "../../store/projectStore";
import type {
  Building,
  DisplaySettings,
  Measurement,
  Point2D,
  Vector3,
} from "../../types";
// NEW: Clean geometry library (REPLACES old buildingMesh.ts)
import {
  createRobustBuildingMesh,
  transformFootprint,
  validateFootprint,
  type SiteConfig as GeometrySiteConfig,
} from "../../lib/geometry";
// Phase 1: Enhanced camera controls
import { CameraController, type SceneBounds } from "./utils/cameraController";
// V2: Dynamic environment lighting based on time of day
import {
  applyEnvironmentLighting,
  calculateEnvironmentLighting,
} from "./utils/environmentLighting";
// Scene configuration constants and auto-scaling helpers
import {
  CAMERA_CONFIG,
  GRID_CONFIG,
  GROUND_CONFIG,
  HEATMAP_CONFIG,
  LIGHTING_CONFIG,
  NORTH_ARROW_CONFIG,
  SHADOW_CONFIG,
  calculateGridDimensions,
} from "../../store/sceneConfig";
// Sun path visualization utilities (extracted to reduce file size)
import { updateSunPath } from "./utils/sunPathUtils";
// Scene helper utilities (extracted to reduce file size)
import {
  createBuildingLabel,
  createNorthArrow,
  updateCardinalDirections,
  updateScaleBar,
  updateSunRay,
} from "./utils/sceneHelpersUtils";

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
    sunLight: THREE.DirectionalLight,
  ) => void;
  onSunPositionChange?: (info: SunPositionInfo) => void;
  onBuildingHover?: (
    building: Building | null,
    floorInfo?: FloorHoverInfo | null,
  ) => void;
  onMeasurementClick?: (point: Vector3) => void;
  /** Callback when camera azimuth changes (for compass) */
  onCameraChange?: (azimuth: number) => void;
  /** Phase 5: Callback when building meshes are updated */
  onBuildingMeshesUpdate?: (meshes: Map<string, THREE.Object3D>) => void;
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

/**
 * Exposed methods for external camera control (Phase 1 & 3)
 */
export interface Scene3DHandle {
  /** Zoom in by one step */
  zoomIn: () => void;
  /** Zoom out by one step */
  zoomOut: () => void;
  /** Reset camera to home/initial view */
  resetView: () => void;
  /** Fit all buildings in view */
  fitToView: () => void;
  /** Align camera to face north */
  alignToNorth: () => void;
  /** Get current camera azimuth angle in degrees */
  getCameraAzimuth: () => number;
  /** Get scene bounds */
  getSceneBounds: () => SceneBounds;
  /** Phase 3: Set camera to a view preset */
  setViewPreset: (preset: "aerial" | "street" | "top" | "oblique") => void;
  /** Phase 3: Focus on a specific building */
  focusOnBuilding: (buildingId: string) => void;
  /** Phase 3: Set hovered building for outline effect */
  setHoveredBuilding: (buildingId: string | null) => void;
  /** Phase 3: Set selected building for outline effect */
  setSelectedBuilding: (buildingId: string | null) => void;
}

// Calculate bounding box for all buildings
/**
 * Calculate scene bounds based on TRANSFORMED building positions
 *
 * IMPORTANT: This must use the same transformation as building positioning
 * to ensure camera centers on actual building locations
 */
function calculateSceneBounds(
  buildings: Building[],
  scale: number,
  northAngle: number,
  imageWidth: number,
  imageHeight: number,
): {
  center: Point2D;
  size: number;
  maxHeight: number;
} {
  if (buildings.length === 0) {
    return { center: { x: 0, y: 0 }, size: 200, maxHeight: 50 };
  }

  // Site config for transformation
  const siteConfig: GeometrySiteConfig = {
    imageWidth,
    imageHeight,
    scale,
    northAngle,
  };

  let minX = Infinity,
    maxX = -Infinity;
  let minZ = Infinity,
    maxZ = -Infinity;
  let maxHeight = 0;

  // Transform each building and calculate bounds from world coordinates
  buildings.forEach((building) => {
    try {
      // Transform footprint using same pipeline as mesh creation
      const result = transformFootprint(building.footprint, siteConfig);
      const { centroid } = result.data;

      // Update bounds based on centroid position
      minX = Math.min(minX, centroid.x);
      maxX = Math.max(maxX, centroid.x);
      minZ = Math.min(minZ, centroid.y); // centroid.y is Z-coordinate
      maxZ = Math.max(maxZ, centroid.y);

      maxHeight = Math.max(maxHeight, building.totalHeight);
    } catch {
      // Skip invalid building for bounds calculation
    }
  });

  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const sizeX = maxX - minX;
  const sizeZ = maxZ - minZ;
  const size = Math.max(sizeX, sizeZ, 100) * 1.5; // Margin for camera

  return {
    center: { x: centerX, y: centerZ }, // .y represents Z-coordinate
    size,
    maxHeight: Math.max(maxHeight, 20),
  };
}

export const Scene3D = forwardRef<Scene3DHandle, Scene3DProps>(function Scene3D(
  {
    onSceneReady,
    onSunPositionChange,
    onBuildingHover,
    onMeasurementClick,
    onCameraChange,
    onBuildingMeshesUpdate,
    showNorthArrow = false,
    showSunRay = true,
    showScaleBar = true,
    showSunPath = true,
    sectionCut,
    displaySettings,
    measurements = [],
    measurementMode = false,
    pendingMeasurementPoint,
  }: Scene3DProps,
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const clippingPlaneRef = useRef<THREE.Plane>(
    new THREE.Plane(new THREE.Vector3(0, -1, 0), 0),
  );
  const sectionHelperRef = useRef<THREE.PlaneHelper | null>(null);
  // Phase 1: Enhanced camera controller
  const cameraControllerRef = useRef<CameraController | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  // V2: Refs for dynamic environment lighting
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight | null>(null);
  // Store scene bounds for external access
  const sceneBoundsRef = useRef<SceneBounds>({
    center: { x: 0, y: 0 },
    size: 200,
    maxHeight: 50,
  });
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
    null,
  );
  const isScrubbingRef = useRef<boolean>(false);

  const { project, currentTime } = useProjectStore();
  const { buildings, site, analysis } = project;


  // Calculate scene bounds based on transformed building positions
  // IMPORTANT: Apply buildingHeightScale to maxHeight so sun orbit scales with visual building height
  const sceneBounds = useMemo(() => {
    if (!project.image?.width || !project.image?.height) {
      // Fallback if image not loaded yet
      return { center: { x: 0, y: 0 }, size: 200, maxHeight: 50 };
    }

    const baseBounds = calculateSceneBounds(
      buildings,
      site.scale,
      site.northAngle,
      project.image.width,
      project.image.height,
    );

    // Apply building height scale to maxHeight
    // This ensures sun orbit matches the VISUAL building heights
    // MUST use same default as building mesh creation
    const heightScale = displaySettings?.buildingHeightScale ?? 1.5;
    const scaledMaxHeight = baseBounds.maxHeight * heightScale;

    // Debug: Log to verify bounds update when buildings change
    // console.log(
    //   `[SceneBounds] buildings=${buildings.length}, baseMaxHeight=${baseBounds.maxHeight.toFixed(1)}m, ` +
    //     `heightScale=${heightScale}, scaledMaxHeight=${scaledMaxHeight.toFixed(1)}m`,
    // );

    return {
      ...baseBounds,
      maxHeight: scaledMaxHeight,
    };
  }, [
    buildings,
    site.scale,
    site.northAngle,
    project.image,
    displaySettings?.buildingHeightScale,
  ]);

  // Update bounds ref when sceneBounds changes
  useEffect(() => {
    sceneBoundsRef.current = sceneBounds;
  }, [sceneBounds]);

  // Phase 1 & 3: Expose camera control methods via ref
  useImperativeHandle(
    ref,
    () => ({
      zoomIn: () => {
        cameraControllerRef.current?.zoomIn();
      },
      zoomOut: () => {
        cameraControllerRef.current?.zoomOut();
      },
      resetView: () => {
        cameraControllerRef.current?.resetToHome(true);
      },
      fitToView: () => {
        cameraControllerRef.current?.fitToView(
          sceneBoundsRef.current,
          1.5,
          true,
        );
      },
      alignToNorth: () => {
        cameraControllerRef.current?.alignToNorth(true);
      },
      getCameraAzimuth: () => {
        if (!cameraRef.current || !cameraControllerRef.current) return 0;
        const controls = cameraControllerRef.current.getControls();
        const camera = cameraRef.current;
        // Calculate azimuth from camera position relative to target
        const dx = camera.position.x - controls.target.x;
        const dz = camera.position.z - controls.target.z;
        // Convert to degrees, with 0 = North (negative Z)
        const azimuth = Math.atan2(dx, -dz) * (180 / Math.PI);
        return azimuth;
      },
      getSceneBounds: () => sceneBoundsRef.current,
      // Phase 3: View presets
      setViewPreset: (preset: "aerial" | "street" | "top" | "oblique") => {
        cameraControllerRef.current?.setViewPreset(
          preset,
          sceneBoundsRef.current,
          true,
        );
      },
      // Phase 3: Focus on building
      focusOnBuilding: (buildingId: string) => {
        const mesh = buildingMeshesRef.current.get(buildingId);
        if (mesh && cameraControllerRef.current) {
          const box = new THREE.Box3().setFromObject(mesh);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          const distance = Math.max(size.x, size.y, size.z) * 2;
          cameraControllerRef.current.focusOn(center, distance, true);
        }
      },
      // Phase 3: Set hovered building (for outline effect)
      setHoveredBuilding: (buildingId: string | null) => {
        buildingMeshesRef.current.forEach((mesh, id) => {
          mesh.traverse((child) => {
            if (
              child instanceof THREE.Mesh &&
              child.material instanceof THREE.MeshStandardMaterial
            ) {
              if (id === buildingId) {
                child.material.emissive.setHex(0x4fc3f7);
                child.material.emissiveIntensity = 0.15;
              } else if (id !== analysis.selectedBuildingId) {
                child.material.emissive.setHex(0x000000);
                child.material.emissiveIntensity = 0;
              }
            }
          });
        });
      },
      // Phase 3: Set selected building (for outline effect)
      setSelectedBuilding: (buildingId: string | null) => {
        buildingMeshesRef.current.forEach((mesh, id) => {
          mesh.traverse((child) => {
            if (
              child instanceof THREE.Mesh &&
              child.material instanceof THREE.MeshStandardMaterial
            ) {
              if (id === buildingId) {
                child.material.emissive.setHex(0xffc107);
                child.material.emissiveIntensity = 0.2;
              } else {
                child.material.emissive.setHex(0x000000);
                child.material.emissiveIntensity = 0;
              }
            }
          });
        });
      },
    }),
    [analysis.selectedBuildingId],
  );

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene with soft sky gradient background
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe8f4fc); // Soft pale blue - professional sky
    sceneRef.current = scene;

    // Camera - position will be adjusted based on scene bounds
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 50000);
    cameraRef.current = camera;

    // Renderer with enhanced shadow settings
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      preserveDrawingBuffer: true, // Required for screenshot/export functionality
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

    // Phase 1: Enhanced Camera Controller (replaces basic OrbitControls)
    const cameraController = new CameraController(camera, renderer.domElement, {
      enableDamping: true,
      dampingFactor: CAMERA_CONFIG.dampingFactor,
      minDistance: 10,
      maxDistance: CAMERA_CONFIG.maxCameraDistance, // Use config value for large scale support
      maxPolarAngle: CAMERA_CONFIG.maxPolarAngle,
      minPolarAngle: 0.1, // Prevent pure top-down view
      zoomToCursor: true, // New: Zoom toward cursor position
      zoomSpeed: 0.1, // Reduced for smoother mouse wheel zoom
      rotateSpeed: 0.8,
      panSpeed: 1.0,
      enableKeyboard: true, // New: Keyboard navigation
    });
    cameraControllerRef.current = cameraController;
    const controls = cameraController.getControls();

    // Ground plane - neutral light gray that shows shadows clearly
    // Light enough to contrast with pastel buildings, but not white
    const groundGeo = new THREE.PlaneGeometry(
      GROUND_CONFIG.basePlaneSize,
      GROUND_CONFIG.basePlaneSize,
    );
    const groundMat = new THREE.MeshStandardMaterial({
      color: GROUND_CONFIG.groundColor,
      roughness: 0.85,
      metalness: 0,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    groundRef.current = ground;

    // Grid helper - subtle lines for spatial reference
    const gridHelper = new THREE.GridHelper(
      GRID_CONFIG.baseGridSize,
      GRID_CONFIG.baseGridDivisions,
      GRID_CONFIG.gridColor,
      GRID_CONFIG.subGridColor,
    );
    gridHelper.position.y = GRID_CONFIG.gridY;
    scene.add(gridHelper);
    gridRef.current = gridHelper;

    // DEBUG: Add origin marker (red sphere at world origin) to verify coordinate system
    const originMarkerGeo = new THREE.SphereGeometry(3, 16, 16);
    const originMarkerMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const originMarker = new THREE.Mesh(originMarkerGeo, originMarkerMat);
    originMarker.position.set(0, 3, 0); // Slightly above ground
    originMarker.name = "OriginMarker";
    scene.add(originMarker);

    // Measurement visualization group
    const measurementGroup = new THREE.Group();
    measurementGroup.name = "Measurements";
    scene.add(measurementGroup);
    measurementGroupRef.current = measurementGroup;

    // Shadow heatmap plane (initially hidden)
    const heatmapSize = HEATMAP_CONFIG.baseSize;
    const heatmapGeo = new THREE.PlaneGeometry(heatmapSize, heatmapSize);
    const heatmapMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      visible: false,
    });
    const heatmapMesh = new THREE.Mesh(heatmapGeo, heatmapMat);
    heatmapMesh.rotation.x = -Math.PI / 2;
    heatmapMesh.position.y = HEATMAP_CONFIG.yPosition;
    scene.add(heatmapMesh);
    heatmapMeshRef.current = heatmapMesh;

    // Ambient light - low intensity preserves shadow contrast on pastel colors
    // V2: Store ref for dynamic environment lighting updates
    const ambientLight = new THREE.AmbientLight(
      0xffffff,
      LIGHTING_CONFIG.ambientIntensity,
    );
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    // Hemisphere light - subtle sky/ground gradient for natural fill
    // Cool sky color and warm ground color enhance building depth
    // V2: Store ref for dynamic environment lighting updates
    const hemiLight = new THREE.HemisphereLight(
      LIGHTING_CONFIG.hemisphereSkyColor,
      LIGHTING_CONFIG.hemisphereGroundColor,
      LIGHTING_CONFIG.hemisphereIntensity,
    );
    scene.add(hemiLight);
    hemiLightRef.current = hemiLight;

    // Directional light (sun) - strong for clear shadow definition
    // V2: Enhanced shadow settings for building-to-building shadows
    // Higher intensity ensures shadows are clearly visible on light pastel colors
    const sunLight = new THREE.DirectionalLight(0xfffaf0, 1.4); // Warm white
    sunLight.position.set(100, 200, 100);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = SHADOW_CONFIG.mapSize;
    sunLight.shadow.mapSize.height = SHADOW_CONFIG.mapSize;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 5000;
    sunLight.shadow.bias = -0.001; // Prevents shadow acne
    sunLight.shadow.normalBias = 0; // MUST be 0 for shadows on vertical walls
    sunLight.shadow.radius = SHADOW_CONFIG.shadowRadius;
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
        true,
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
                Math.max(1, Math.ceil(intersectionY / building.floorHeight)),
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
        cameraRef.current,
      );

      // Raycast against ground plane
      const groundIntersects = raycasterRef.current.intersectObject(
        groundRef.current,
      );
      if (groundIntersects.length > 0) {
        const point = groundIntersects[0].point;
        // Store the click point for external handling
        container.dispatchEvent(
          new CustomEvent("measurementclick", {
            detail: { x: point.x, y: point.y, z: point.z },
          }),
        );
      }
    };

    container.addEventListener("click", handleClick);

    // Animation loop with camera change tracking
    let lastAzimuth = 0;
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      cameraController.update();
      renderer.render(scene, camera);

      // Track camera azimuth changes for compass (Phase 1)
      if (onCameraChange) {
        const dx = camera.position.x - controls.target.x;
        const dz = camera.position.z - controls.target.z;
        const azimuth = Math.atan2(dx, -dz) * (180 / Math.PI);
        if (Math.abs(azimuth - lastAzimuth) > 0.5) {
          lastAzimuth = azimuth;
          onCameraChange(azimuth);
        }
      }
    };
    animate();

    // Handle resize
    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w > 0 && h > 0) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    };
    window.addEventListener("resize", handleResize);

    // Use ResizeObserver to detect container size changes (e.g., sidebar toggle)
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(container);

    // Callback
    if (onSceneReady) {
      onSceneReady(scene, renderer, camera, sunLight);
    }

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      resizeObserver.disconnect();
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("click", handleClick);
      cancelAnimationFrame(animationRef.current);
      cameraController.dispose(); // Phase 1: Dispose camera controller
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [onCameraChange]);

  // Update camera, ground, and shadow camera when scene bounds change
  useEffect(() => {
    if (
      !cameraRef.current ||
      !cameraControllerRef.current ||
      !sunLightRef.current
    )
      return;

    const { center, size, maxHeight } = sceneBounds;
    sceneCenterRef.current = center;

    // Get controls from camera controller
    const controls = cameraControllerRef.current.getControls();

    // Dynamically update maxDistance based on scene size
    // Ensures user can zoom out far enough to see entire scaled scene
    const dynamicMaxDistance = Math.max(
      size * 5, // 5× scene size
      maxHeight * 10, // 10× building height
      CAMERA_CONFIG.minCameraDistance,
    );
    controls.maxDistance = Math.min(
      dynamicMaxDistance,
      CAMERA_CONFIG.maxCameraDistance,
    );

    // Position camera to see all buildings
    const cameraDistance = size * CAMERA_CONFIG.cameraDistanceMultiplier;
    const cameraHeight = Math.max(
      size * CAMERA_CONFIG.cameraHeightMultiplier,
      maxHeight * CAMERA_CONFIG.cameraHeightFromBuildingMultiplier,
    );
    cameraRef.current.position.set(
      center.x + cameraDistance,
      cameraHeight,
      center.y + cameraDistance,
    );

    // Look at the center of the scene
    controls.target.set(center.x, maxHeight / 2, center.y);
    controls.update();

    // Phase 1: Set this as the home view for reset functionality
    cameraControllerRef.current.setHomeView({
      position: new THREE.Vector3(
        center.x + cameraDistance,
        cameraHeight,
        center.y + cameraDistance,
      ),
      target: new THREE.Vector3(center.x, maxHeight / 2, center.y),
    });

    // Update shadow camera frustum to cover all buildings with generous margin
    // Must account for tall buildings (15+ floors = ~50m height)
    const shadowSize = Math.max(
      size * SHADOW_CONFIG.shadowSizeMultiplier,
      SHADOW_CONFIG.minShadowSize,
    );
    const heightMargin = Math.max(
      maxHeight * SHADOW_CONFIG.heightMarginMultiplier,
      SHADOW_CONFIG.minHeightMargin,
    );
    sunLightRef.current.shadow.camera.left = -shadowSize;
    sunLightRef.current.shadow.camera.right = shadowSize;
    sunLightRef.current.shadow.camera.top = shadowSize;
    sunLightRef.current.shadow.camera.bottom = -shadowSize;
    sunLightRef.current.shadow.camera.near = 0.5;
    sunLightRef.current.shadow.camera.far = Math.max(
      shadowSize * SHADOW_CONFIG.shadowFarMultiplier,
      heightMargin * SHADOW_CONFIG.heightFarMultiplier,
    );
    sunLightRef.current.shadow.camera.updateProjectionMatrix();

    // Update sun light target position - target mid-height for better shadow coverage on buildings
    sunLightRef.current.target.position.set(center.x, maxHeight / 3, center.y);
    sunLightRef.current.target.updateMatrixWorld();

    // Calculate site plan size in meters (based on image dimensions)
    // This ensures grid matches the site plan layout
    const siteWidth = project.image?.width
      ? project.image.width * site.scale
      : size * 2;
    const siteHeight = project.image?.height
      ? project.image.height * site.scale
      : size * 2;
    const siteSize = Math.max(siteWidth, siteHeight);

    // Update ground plane - centered at WORLD ORIGIN (image center)
    if (groundRef.current) {
      // Ground stays at origin (0, 0) to match site plan center
      groundRef.current.position.set(0, GROUND_CONFIG.groundY, 0);

      // Resize ground to cover site plan area
      const groundSize = Math.max(
        siteSize * GROUND_CONFIG.groundSizeMultiplier,
        GROUND_CONFIG.minGroundSize,
      );
      groundRef.current.scale.set(
        groundSize / GROUND_CONFIG.basePlaneSize,
        groundSize / GROUND_CONFIG.basePlaneSize,
        1,
      );
    }

    // Update grid helper - centered at WORLD ORIGIN to match site plan
    if (gridRef.current && sceneRef.current) {
      // Remove old grid
      sceneRef.current.remove(gridRef.current);
      gridRef.current.geometry.dispose();
      if (Array.isArray(gridRef.current.material)) {
        gridRef.current.material.forEach((m) => m.dispose());
      } else {
        gridRef.current.material.dispose();
      }

      // Grid size based on site plan dimensions AND building heights
      // Uses auto-scaling formula for realistic proportions
      const { size: gridSize, divisions } = calculateGridDimensions(
        siteSize,
        sceneBounds.maxHeight,
      );

      // Create new grid centered at ORIGIN (matches site plan center)
      const newGrid = new THREE.GridHelper(
        gridSize,
        divisions,
        GRID_CONFIG.gridColor,
        GRID_CONFIG.subGridColor,
      );
      newGrid.position.set(0, GRID_CONFIG.gridY, 0);
      sceneRef.current.add(newGrid);
      gridRef.current = newGrid;
    }

    // Update north arrow position - place at corner of scene (relative to ORIGIN)
    if (northArrowRef.current) {
      const arrowSize = Math.max(
        size * NORTH_ARROW_CONFIG.arrowSizeMultiplier,
        NORTH_ARROW_CONFIG.minArrowSize,
      );
      // Position relative to origin (0, 0) to match grid
      northArrowRef.current.position.set(
        size * NORTH_ARROW_CONFIG.positionOffsetMultiplier, // West side
        0.5,
        size * NORTH_ARROW_CONFIG.positionOffsetMultiplier, // North side
      );
      northArrowRef.current.scale.setScalar(
        arrowSize / NORTH_ARROW_CONFIG.baseScaleNormalization,
      );
    }

    // Update scale bar - place at opposite corner from north arrow (relative to ORIGIN)
    if (scaleBarRef.current) {
      // Use origin (0, 0) not building center, so scale bar aligns with grid
      updateScaleBar(scaleBarRef.current, { x: 0, y: 0 }, size, site.scale);
    }

    // Update cardinal directions - CENTER AT ORIGIN to match grid
    if (cardinalDirectionsRef.current) {
      // Use origin (0, 0) not building center, so directions align with grid
      updateCardinalDirections(
        cardinalDirectionsRef.current,
        { x: 0, y: 0 },
        size,
      );
    }
  }, [sceneBounds, site.scale, project.image]);

  // Update sun path when date, time, or location changes
  useEffect(() => {
    if (!sunPathRef.current || !showSunPath) return;

    // Debug: Log when this effect runs to verify it's being triggered
    // console.log(
    //   `[SunPath Effect] TRIGGERED - sceneBounds.maxHeight=${sceneBounds.maxHeight.toFixed(1)}m, ` +
    //     `sceneBounds.size=${sceneBounds.size.toFixed(1)}`,
    // );

    // Center sun path at ORIGIN (0, 0) to align with grid
    // Pass both size and maxHeight for proper auto-scaling
    // Formula: Sun height = Building height + 10 floors clearance
    // Example: 15-floor building × heightScale → sun at 25 floors height visually
    // The orbit automatically adjusts when building heights or heightScale change

    // Calculate scaled floor height for proper 10-floor clearance
    // Use same heightScale as building mesh creation
    const heightScale = displaySettings?.buildingHeightScale ?? 1.5;
    // Get typical floor height from buildings (default 3m if no buildings)
    const typicalFloorHeight =
      buildings.length > 0
        ? buildings.reduce((sum, b) => sum + b.floorHeight, 0) /
          buildings.length
        : 10.0;
    const scaledFloorHeight = typicalFloorHeight * heightScale;

    updateSunPath(
      sunPathRef.current,
      { x: 0, y: 0 }, // Use origin instead of sceneCenterRef.current
      sceneBounds.size,
      sceneBounds.maxHeight, // Used for height-based orbit scaling
      site.location.latitude,
      site.location.longitude,
      project.analysis.date,
      currentTime, // Pass current time to show sun position on orbit
      scaledFloorHeight, // For proper 10-floor clearance calculation
    );
  }, [
    project.analysis.date,
    currentTime,
    site.location.latitude,
    site.location.longitude,
    sceneBounds,
    showSunPath,
    buildings,
    displaySettings?.buildingHeightScale,
  ]);

  // Update buildings - NEW CLEAN PROJECTION PIPELINE
  useEffect(() => {
    if (!sceneRef.current) return;

    const scene = sceneRef.current;
    const existingGroups = buildingMeshesRef.current;
    const newGroups = new Map<string, THREE.Object3D>();

    // Validate image dimensions are available
    if (!project.image || !project.image.width || !project.image.height) {
      return;
    }

    if (buildings.length === 0) {
      return;
    }

    // Construct site configuration for geometry library
    const siteConfig: GeometrySiteConfig = {
      imageWidth: project.image.width,
      imageHeight: project.image.height,
      scale: site.scale,
      northAngle: site.northAngle,
    };

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

    // Process each building through NEW projection pipeline
    buildings.forEach((building) => {
      // Remove existing mesh if present
      const existingMesh = existingGroups.get(building.id);
      if (existingMesh) {
        scene.remove(existingMesh);
        existingMesh.traverse((child) => {
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

      // Validate footprint before transformation
      const validation = validateFootprint(building.footprint, "image");
      if (!validation.valid) {
        return; // Skip this building
      }

      try {
        // STAGE 1 & 2: Transform footprint from Image Space → World Space → Local Space
        const transformResult = transformFootprint(
          building.footprint,
          siteConfig,
        );
        const { localFootprint, centroid } = transformResult.data;

        // STAGE 3: Create mesh using ROBUST builder
        const isSelected = building.id === analysis.selectedBuildingId;

        // V2: Apply building height scale for visual impact (height only, not footprint)
        const heightScale = displaySettings?.buildingHeightScale ?? 0.5;
        const scaledFloorHeight = building.floorHeight * heightScale;

        const meshResult = createRobustBuildingMesh(localFootprint, {
          color: building.color,
          floors: building.floors,
          floorHeight: scaledFloorHeight,
          showFloorDivisions: true,
          isSelected,
          selectedFloor: isSelected ? analysis.selectedFloor : undefined,
          floorOpacity: displaySettings?.floorTransparency ?? 1,
          castShadow: true,
          receiveShadow: true,
          validateInput: true,
          logValidation: true,
          generateDebugWireframe: false, // Set to true to enable debug wireframe
        });

        const mesh = meshResult.mesh;

        // STAGE 4: Position mesh in world space
        mesh.position.set(
          centroid.x, // World X
          0, // Ground level (Y=0)
          centroid.y, // World Z (centroid.y is Z in XZ plane)
        );

        // Highlight selected building
        if (isSelected && !analysis.selectedFloor) {
          mesh.traverse((child) => {
            if (
              child instanceof THREE.Mesh &&
              child.material instanceof THREE.MeshStandardMaterial
            ) {
              child.material.emissive = new THREE.Color(0x333333);
            }
          });
        }

        // V2: Create billboard building name label (using scaled height)
        const scaledTotalHeight = building.totalHeight * heightScale;
        const buildingLabel = createBuildingLabel(
          building.name,
          new THREE.Vector3(centroid.x, 0, centroid.y),
          scaledTotalHeight,
          isSelected,
        );

        // Create a group to hold both mesh and label for proper organization and cleanup
        const buildingGroup = new THREE.Group();
        buildingGroup.name = `BuildingGroup_${building.id}`;
        buildingGroup.userData.buildingId = building.id;
        buildingGroup.add(mesh);
        buildingGroup.add(buildingLabel);

        // Add group to scene
        scene.add(buildingGroup);

        newGroups.set(building.id, buildingGroup);
      } catch {
        // Skip failed building
      }
    });

    buildingMeshesRef.current = newGroups;

    // Phase 5: Notify parent of updated building meshes
    if (onBuildingMeshesUpdate) {
      onBuildingMeshesUpdate(new Map(newGroups));
    }
  }, [
    buildings,
    site.scale,
    site.northAngle,
    analysis.selectedBuildingId,
    analysis.selectedFloor,
    project.image,
    displaySettings?.floorTransparency,
    displaySettings?.buildingHeightScale,
    onBuildingMeshesUpdate,
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
        sceneBounds.maxHeight,
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

  // V2: Dynamic environment lighting based on sun altitude
  // Updates sky color, ambient light, hemisphere light, and sun color based on time of day
  useEffect(() => {
    if (
      !sceneRef.current ||
      !sunLightRef.current ||
      !ambientLightRef.current ||
      !hemiLightRef.current
    ) {
      return;
    }

    const { latitude, longitude } = site.location;
    const sunPosition = SunCalc.getPosition(currentTime, latitude, longitude);
    const sunAltitudeDegrees = (sunPosition.altitude * 180) / Math.PI;

    // Calculate environment lighting based on sun altitude
    const lighting = calculateEnvironmentLighting(sunAltitudeDegrees);

    // Apply lighting to scene
    applyEnvironmentLighting(
      sceneRef.current,
      lighting,
      ambientLightRef.current,
      hemiLightRef.current,
      sunLightRef.current,
    );

    // Update ground plane color to match environment
    if (
      groundRef.current &&
      groundRef.current.material instanceof THREE.MeshStandardMaterial
    ) {
      groundRef.current.material.color.copy(lighting.groundColor);
    }
  }, [currentTime, site.location.latitude, site.location.longitude]);

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
      sectionCut.flip ? distance : -distance,
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
      0xff6600,
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
        handleMeasurementClickEvent,
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
        measurement.point1.z,
      );
      const p2 = new THREE.Vector3(
        measurement.point2.x,
        measurement.point2.y,
        measurement.point2.z,
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
        (p1.z + p2.z) / 2,
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
        pendingMeasurementPoint.z,
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
    const gridSize = HEATMAP_CONFIG.gridResolution;
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
          false,
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
    heatmap.position.set(center.x, HEATMAP_CONFIG.yPosition, center.y);
    heatmap.scale.set(
      size / HEATMAP_CONFIG.baseSize,
      size / HEATMAP_CONFIG.baseSize,
      1,
    );
  }, [
    displaySettings?.showShadowHeatmap,
    displaySettings?.heatmapOpacity,
    sceneBounds,
    currentTime,
  ]);

  // Update shadow intensity and visualization mode
  // Controls shadow darkness, softness, and overall visual appearance
  useEffect(() => {
    if (!sceneRef.current || !sunLightRef.current) return;

    const shadowIntensity = displaySettings?.shadowIntensity ?? 0.7;
    const visualizationMode =
      displaySettings?.shadowVisualizationMode ?? "natural";

    // Apply mode-specific shadow settings
    // CRITICAL: normalBias MUST be 0 for shadows to appear on vertical walls
    switch (visualizationMode) {
      case "enhanced":
        // Higher contrast shadows - sharper edges, darker appearance
        sunLightRef.current.shadow.radius = 0.5; // Sharp shadows
        sunLightRef.current.shadow.bias = -0.001;
        sunLightRef.current.shadow.normalBias = 0; // MUST be 0 for wall shadows
        // Increase sun intensity for better contrast
        if (sunLightRef.current.intensity > 0.2) {
          sunLightRef.current.intensity = Math.min(
            sunLightRef.current.intensity * 1.2,
            2.0,
          );
        }
        break;

      case "analysis":
        // Analysis mode - shadows handled by heatmap overlay
        sunLightRef.current.shadow.radius = 1.0;
        sunLightRef.current.shadow.bias = -0.001;
        sunLightRef.current.shadow.normalBias = 0; // MUST be 0 for wall shadows
        break;

      case "natural":
      default:
        // Natural mode - dynamic softness handled by environmentLighting
        sunLightRef.current.shadow.bias = -0.001;
        sunLightRef.current.shadow.normalBias = 0; // MUST be 0 for wall shadows
        break;
    }

    // Find and update ambient light in scene
    // Higher shadow intensity = lower ambient light = darker shadows
    // Enhanced mode gets even darker shadows for maximum contrast
    const modeMultiplier = visualizationMode === "enhanced" ? 0.4 : 0.3;
    const ambientIntensity = 0.5 - shadowIntensity * modeMultiplier;

    sceneRef.current.traverse((child) => {
      if (child instanceof THREE.AmbientLight) {
        child.intensity = Math.max(0.1, ambientIntensity);
      }
    });

    // Update building materials for enhanced shadow reception
    if (visualizationMode === "enhanced") {
      buildingMeshesRef.current.forEach((obj) => {
        obj.traverse((child) => {
          if (
            child instanceof THREE.Mesh &&
            child.material instanceof THREE.MeshStandardMaterial
          ) {
            // Increase roughness slightly for better shadow definition
            child.material.roughness = Math.min(
              0.6,
              child.material.roughness + 0.1,
            );
            child.material.needsUpdate = true;
          }
        });
      });
    }
  }, [
    displaySettings?.shadowIntensity,
    displaySettings?.shadowVisualizationMode,
  ]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[400px] rounded-lg overflow-hidden"
      role="img"
      aria-label="3D sunlight visualization. Use mouse to rotate view, scroll to zoom. Keyboard: Arrow keys to pan, +/- to zoom, Home to reset, F to fit, N for north."
      tabIndex={0}
    />
  );
});
