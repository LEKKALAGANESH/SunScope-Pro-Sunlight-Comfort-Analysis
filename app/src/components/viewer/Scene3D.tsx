import { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import SunCalc from 'suncalc';
import { useProjectStore } from '../../store/projectStore';
import type { Building, Point2D, Vector3, DisplaySettings, Measurement } from '../../types';

interface SunPositionInfo {
  altitude: number; // degrees
  azimuth: number; // degrees
  isAboveHorizon: boolean;
}

interface SectionCutConfig {
  enabled: boolean;
  axis: 'x' | 'y' | 'z';
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

// Calculate bounding box for all buildings
function calculateSceneBounds(buildings: Building[], scale: number): {
  center: Point2D;
  size: number;
  maxHeight: number;
} {
  if (buildings.length === 0) {
    return { center: { x: 0, y: 0 }, size: 200, maxHeight: 50 };
  }

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let maxHeight = 0;

  buildings.forEach(building => {
    building.footprint.forEach(p => {
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
  const size = Math.max(sizeX, sizeY, 100) * 1.5;

  return {
    center: { x: centerX, y: centerY },
    size,
    maxHeight: Math.max(maxHeight, 20),
  };
}

export function Scene3D({
  onSceneReady,
  onSunPositionChange,
  onBuildingHover,
  onMeasurementClick,
  showNorthArrow = true,
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
  const clippingPlaneRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, -1, 0), 0));
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
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const hoveredBuildingRef = useRef<string | null>(null);

  // Measurement and heatmap refs
  const measurementGroupRef = useRef<THREE.Group | null>(null);
  const heatmapMeshRef = useRef<THREE.Mesh | null>(null);
  const pendingPointMarkerRef = useRef<THREE.Mesh | null>(null);

  // Shadow caching: track last sun position to avoid unnecessary updates
  const lastSunPositionRef = useRef<{ altitude: number; azimuth: number } | null>(null);
  const shadowUpdateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isScrubbingRef = useRef<boolean>(false);

  const { project, currentTime } = useProjectStore();
  const { buildings, site, analysis } = project;

  // Calculate scene bounds
  const sceneBounds = useMemo(() =>
    calculateSceneBounds(buildings, site.scale),
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
      powerPreference: 'high-performance',
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
    controls.maxDistance = 5000;
    controlsRef.current = controls;

    // Ground plane - will be sized based on scene
    const groundGeo = new THREE.PlaneGeometry(2000, 2000);
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

    // Grid helper
    const gridHelper = new THREE.GridHelper(1000, 100, 0x888888, 0x666666);
    gridHelper.position.y = 0.1;
    scene.add(gridHelper);
    gridRef.current = gridHelper;

    // Measurement visualization group
    const measurementGroup = new THREE.Group();
    measurementGroup.name = 'Measurements';
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
    sunLight.shadow.camera.far = 2000;
    sunLight.shadow.bias = -0.0001;
    sunLight.shadow.normalBias = 0.02;
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    // Sun helper (visual indicator) - larger and brighter
    const sunSphere = new THREE.Mesh(
      new THREE.SphereGeometry(15),
      new THREE.MeshBasicMaterial({ color: 0xffdd00 })
    );
    sunLight.add(sunSphere);

    // North Arrow - always visible compass indicator
    if (showNorthArrow) {
      const northArrowGroup = createNorthArrow();
      scene.add(northArrowGroup);
      northArrowRef.current = northArrowGroup;
    }

    // Sun Ray - line from sun to ground showing light direction
    if (showSunRay) {
      const sunRayGroup = new THREE.Group();
      sunRayGroup.name = 'SunRay';
      scene.add(sunRayGroup);
      sunRayRef.current = sunRayGroup;
    }

    // Scale Bar - visual reference for distances
    if (showScaleBar) {
      const scaleBarGroup = new THREE.Group();
      scaleBarGroup.name = 'ScaleBar';
      scene.add(scaleBarGroup);
      scaleBarRef.current = scaleBarGroup;
    }

    // Sun Path Arc - shows daily sun trajectory
    if (showSunPath) {
      const sunPathGroup = new THREE.Group();
      sunPathGroup.name = 'SunPath';
      scene.add(sunPathGroup);
      sunPathRef.current = sunPathGroup;
    }

    // Mouse move handler for building hover detection
    const handleMouseMove = (event: MouseEvent) => {
      if (!containerRef.current || !cameraRef.current) return;

      const rect = container.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

      // Check intersections with buildings
      const buildingObjects = Array.from(buildingMeshesRef.current.values());
      const intersects = raycasterRef.current.intersectObjects(buildingObjects, true);

      if (intersects.length > 0) {
        // Find the building ID from the intersected object
        let obj = intersects[0].object;
        while (obj.parent && !obj.userData.buildingId) {
          obj = obj.parent as THREE.Object3D;
        }
        const buildingId = obj.userData.buildingId;

        if (buildingId && buildingId !== hoveredBuildingRef.current) {
          hoveredBuildingRef.current = buildingId;
          container.style.cursor = 'pointer';
          if (onBuildingHover) {
            const building = buildings.find(b => b.id === buildingId);
            onBuildingHover(building || null);
          }
        }
      } else {
        if (hoveredBuildingRef.current) {
          hoveredBuildingRef.current = null;
          container.style.cursor = 'grab';
          if (onBuildingHover) {
            onBuildingHover(null);
          }
        }
      }
    };

    container.addEventListener('mousemove', handleMouseMove);

    // Click handler for measurement mode
    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current || !cameraRef.current || !groundRef.current) return;

      const rect = container.getBoundingClientRect();
      const mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(new THREE.Vector2(mouseX, mouseY), cameraRef.current);

      // Raycast against ground plane
      const groundIntersects = raycasterRef.current.intersectObject(groundRef.current);
      if (groundIntersects.length > 0) {
        const point = groundIntersects[0].point;
        // Store the click point for external handling
        container.dispatchEvent(new CustomEvent('measurementclick', {
          detail: { x: point.x, y: point.y, z: point.z }
        }));
      }
    };

    container.addEventListener('click', handleClick);

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
    window.addEventListener('resize', handleResize);

    // Callback
    if (onSceneReady) {
      onSceneReady(scene, renderer, camera, sunLight);
    }

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('click', handleClick);
      cancelAnimationFrame(animationRef.current);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  // Update camera, ground, and shadow camera when scene bounds change
  useEffect(() => {
    if (!cameraRef.current || !controlsRef.current || !sunLightRef.current) return;

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

    // Update shadow camera frustum to cover all buildings
    const shadowSize = Math.max(size, 500);
    sunLightRef.current.shadow.camera.left = -shadowSize;
    sunLightRef.current.shadow.camera.right = shadowSize;
    sunLightRef.current.shadow.camera.top = shadowSize;
    sunLightRef.current.shadow.camera.bottom = -shadowSize;
    sunLightRef.current.shadow.camera.far = shadowSize * 4;
    sunLightRef.current.shadow.camera.updateProjectionMatrix();

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
  }, [sceneBounds, site.scale]);

  // Update sun path when date or location changes
  useEffect(() => {
    if (!sunPathRef.current || !showSunPath) return;

    updateSunPath(
      sunPathRef.current,
      sceneCenterRef.current,
      sceneBounds.size,
      site.location.latitude,
      site.location.longitude,
      project.analysis.date
    );
  }, [project.analysis.date, site.location, sceneBounds, showSunPath]);

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
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
            child.material.emissive = new THREE.Color(0x333333);
          }
        });
      }

      newGroups.set(building.id, buildingObj);
    });

    buildingMeshesRef.current = newGroups;
  }, [buildings, site.scale, analysis.selectedBuildingId, analysis.selectedFloor]);

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
    const positionChanged = !lastPos ||
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
    // Azimuth: 0 = south, positive = west (in SunCalc convention)
    // In Three.js: X = east-west, Z = north-south, Y = up
    const x = center.x - Math.sin(azimuth) * Math.cos(altitude) * distance;
    const y = Math.sin(altitude) * distance;
    const z = center.y - Math.cos(azimuth) * Math.cos(altitude) * distance;

    sunLightRef.current.position.set(x, y, z);
    sunLightRef.current.target.position.set(center.x, 0, center.y);
    sunLightRef.current.target.updateMatrixWorld();

    // Update sun ray visualization
    if (sunRayRef.current && showSunRay) {
      updateSunRay(sunRayRef.current, { x, y, z }, center, sceneBounds.maxHeight);
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
  }, [currentTime, site.location, sceneBounds, onSunPositionChange, showSunRay]);

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
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
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
      case 'x':
        normal = new THREE.Vector3(sectionCut.flip ? 1 : -1, 0, 0);
        distance = center.x + (sectionCut.position - 0.5) * size;
        break;
      case 'y':
        normal = new THREE.Vector3(0, sectionCut.flip ? 1 : -1, 0);
        distance = sectionCut.position * maxHeight;
        break;
      case 'z':
        normal = new THREE.Vector3(0, 0, sectionCut.flip ? 1 : -1);
        distance = center.y + (sectionCut.position - 0.5) * size;
        break;
    }

    clippingPlaneRef.current.set(normal, sectionCut.flip ? distance : -distance);

    // Apply clipping plane to all building materials
    buildingMeshesRef.current.forEach((obj) => {
      obj.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          child.material.clippingPlanes = [clippingPlaneRef.current];
          child.material.clipShadows = true;
          child.material.side = THREE.DoubleSide;
          child.material.needsUpdate = true;
        }
      });
    });

    // Add section plane helper (visual indicator)
    const helperSize = Math.max(size, maxHeight) * 1.2;
    const helper = new THREE.PlaneHelper(clippingPlaneRef.current, helperSize, 0xff6600);
    helper.name = 'SectionHelper';
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

    container.addEventListener('measurementclick', handleMeasurementClickEvent);
    return () => {
      container.removeEventListener('measurementclick', handleMeasurementClickEvent);
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
      const p1 = new THREE.Vector3(measurement.point1.x, measurement.point1.y, measurement.point1.z);
      const p2 = new THREE.Vector3(measurement.point2.x, measurement.point2.y, measurement.point2.z);

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

      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 48;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ff4444';
      ctx.fillRect(0, 0, 128, 48);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
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
    containerRef.current.style.cursor = measurementMode ? 'crosshair' : 'grab';
  }, [measurementMode]);

  // Shadow heatmap rendering
  useEffect(() => {
    if (!heatmapMeshRef.current || !sunLightRef.current || !sceneRef.current) return;

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
    const canvas = document.createElement('canvas');
    canvas.width = gridSize;
    canvas.height = gridSize;
    const ctx = canvas.getContext('2d')!;

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
        const intersects = raycasterRef.current.intersectObjects(buildingObjects, false);
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

  }, [displaySettings?.showShadowHeatmap, displaySettings?.heatmapOpacity, sceneBounds, currentTime]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[400px] rounded-lg overflow-hidden"
      role="img"
      aria-label="3D sunlight visualization. Use mouse to rotate view, scroll to zoom."
    />
  );
}

// Helper: Create building mesh with LOD (Level of Detail) for performance
function createBuildingMesh(
  building: Building,
  scale: number,
  selectedFloor?: number,
  isSelected?: boolean
): THREE.LOD {
  const lod = new THREE.LOD();

  // Scale footprint points
  const points = building.footprint.map((p) => ({
    x: p.x * scale,
    y: p.y * scale,
  }));

  // Calculate center and bounding box
  const centerX = points.length > 0
    ? points.reduce((sum, p) => sum + p.x, 0) / points.length
    : 0;
  const centerZ = points.length > 0
    ? points.reduce((sum, p) => sum + p.y, 0) / points.length
    : 0;

  // Calculate width and depth for LOD box
  const minX = Math.min(...points.map(p => p.x - centerX));
  const maxX = Math.max(...points.map(p => p.x - centerX));
  const minZ = Math.min(...points.map(p => p.y - centerZ));
  const maxZ = Math.max(...points.map(p => p.y - centerZ));
  const width = maxX - minX || 10;
  const depth = maxZ - minZ || 10;

  // Shared material for all LOD levels
  const buildingColor = new THREE.Color(building.color);
  const material = new THREE.MeshStandardMaterial({
    color: buildingColor,
    roughness: 0.6,
    metalness: 0.15,
    transparent: isSelected && selectedFloor !== undefined,
    opacity: isSelected && selectedFloor !== undefined ? 0.4 : 1.0,
  });

  // LOW LOD: Simple box (for far distances) - cheapest to render
  const lowGroup = new THREE.Group();
  const lowGeo = new THREE.BoxGeometry(width, building.totalHeight, depth);
  const lowMesh = new THREE.Mesh(lowGeo, material);
  lowMesh.position.y = building.totalHeight / 2;
  lowMesh.castShadow = true;
  lowMesh.receiveShadow = true;
  lowGroup.add(lowMesh);

  // MEDIUM LOD: Extruded shape without roof detail
  const medGroup = new THREE.Group();
  if (points.length >= 3) {
    const medShape = new THREE.Shape();
    points.forEach((point, index) => {
      const x = point.x - centerX;
      const z = point.y - centerZ;
      if (index === 0) medShape.moveTo(x, z);
      else medShape.lineTo(x, z);
    });
    medShape.closePath();

    const medGeo = new THREE.ExtrudeGeometry(medShape, {
      steps: 1,
      depth: building.totalHeight,
      bevelEnabled: false,
    });
    medGeo.rotateX(-Math.PI / 2);

    const medMesh = new THREE.Mesh(medGeo, material);
    medMesh.castShadow = true;
    medMesh.receiveShadow = true;
    medGroup.add(medMesh);
  } else {
    // Fallback to box for invalid footprints
    medGroup.add(lowMesh.clone());
  }

  // HIGH LOD: Full detail with roof (for close distances)
  const highGroup = new THREE.Group();
  if (points.length >= 3) {
    const highShape = new THREE.Shape();
    points.forEach((point, index) => {
      const x = point.x - centerX;
      const z = point.y - centerZ;
      if (index === 0) highShape.moveTo(x, z);
      else highShape.lineTo(x, z);
    });
    highShape.closePath();

    const highGeo = new THREE.ExtrudeGeometry(highShape, {
      steps: 1,
      depth: building.totalHeight,
      bevelEnabled: false,
    });
    highGeo.rotateX(-Math.PI / 2);

    const highMesh = new THREE.Mesh(highGeo, material);
    highMesh.castShadow = true;
    highMesh.receiveShadow = true;
    highGroup.add(highMesh);

    // Add roof detail
    const roofShape = new THREE.Shape();
    points.forEach((point, index) => {
      const x = point.x - centerX;
      const z = point.y - centerZ;
      if (index === 0) roofShape.moveTo(x, z);
      else roofShape.lineTo(x, z);
    });
    roofShape.closePath();

    const roofGeo = new THREE.ShapeGeometry(roofShape);
    roofGeo.rotateX(-Math.PI / 2);
    const roofMat = new THREE.MeshStandardMaterial({
      color: buildingColor.clone().multiplyScalar(0.8),
      roughness: 0.4,
      metalness: 0.1,
    });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = building.totalHeight + 0.1;
    roof.receiveShadow = true;
    highGroup.add(roof);

    // Add floor markers and highlight selected floor
    if (isSelected) {
      // Add floor level markers (horizontal lines)
      for (let floor = 1; floor <= building.floors; floor++) {
        const floorHeight = floor * building.floorHeight;

        // Floor marker outline
        const outlinePoints = points.map(p => new THREE.Vector3(p.x - centerX, floorHeight, p.y - centerZ));
        outlinePoints.push(outlinePoints[0]); // Close the loop
        const outlineGeo = new THREE.BufferGeometry().setFromPoints(outlinePoints);
        const outlineMat = new THREE.LineBasicMaterial({
          color: floor === selectedFloor ? 0xfbbf24 : 0x666666, // Amber for selected, gray for others
          linewidth: floor === selectedFloor ? 3 : 1,
        });
        const outline = new THREE.Line(outlineGeo, outlineMat);
        highGroup.add(outline);

        // Floor label
        if (floor === selectedFloor || building.floors <= 10) {
          const canvas = document.createElement('canvas');
          canvas.width = 64;
          canvas.height = 32;
          const ctx = canvas.getContext('2d')!;
          ctx.fillStyle = floor === selectedFloor ? '#fbbf24' : '#888888';
          ctx.font = 'bold 20px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`F${floor}`, 32, 16);

          const texture = new THREE.CanvasTexture(canvas);
          const labelMat = new THREE.SpriteMaterial({ map: texture });
          const label = new THREE.Sprite(labelMat);
          label.position.set(maxX + 5, floorHeight - building.floorHeight / 2, 0);
          label.scale.set(8, 4, 1);
          highGroup.add(label);
        }
      }

      // Highlight selected floor with a semi-transparent plane
      if (selectedFloor !== undefined && selectedFloor >= 1 && selectedFloor <= building.floors) {
        const floorBottom = (selectedFloor - 1) * building.floorHeight;
        const floorTop = selectedFloor * building.floorHeight;

        // Create highlighted floor section
        const highlightShape = new THREE.Shape();
        points.forEach((point, index) => {
          const x = point.x - centerX;
          const z = point.y - centerZ;
          if (index === 0) highlightShape.moveTo(x, z);
          else highlightShape.lineTo(x, z);
        });
        highlightShape.closePath();

        const highlightGeo = new THREE.ExtrudeGeometry(highlightShape, {
          steps: 1,
          depth: floorTop - floorBottom,
          bevelEnabled: false,
        });
        highlightGeo.rotateX(-Math.PI / 2);

        const highlightMat = new THREE.MeshStandardMaterial({
          color: 0xfbbf24, // Amber
          transparent: true,
          opacity: 0.6,
          roughness: 0.4,
          metalness: 0.1,
        });

        const highlight = new THREE.Mesh(highlightGeo, highlightMat);
        highlight.position.y = floorBottom;
        highlight.castShadow = true;
        highlight.receiveShadow = true;
        highGroup.add(highlight);
      }
    }
  } else {
    // Fallback to box
    highGroup.add(lowMesh.clone());
  }

  // Add LOD levels with distance thresholds
  // The distances are tuned based on typical building sizes
  lod.addLevel(highGroup, 0);     // High detail: 0-200 units
  lod.addLevel(medGroup, 200);    // Medium detail: 200-500 units
  lod.addLevel(lowGroup, 500);    // Low detail: 500+ units

  // Position the LOD at the building center
  lod.position.set(centerX, 0, centerZ);
  lod.userData = { buildingId: building.id };

  return lod;
}

/**
 * Create a north arrow indicator for the 3D scene
 * Points towards geographic north (negative Z in Three.js convention)
 */
function createNorthArrow(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'NorthArrow';

  // Arrow body (cylinder pointing up, then we'll rotate)
  const arrowLength = 15;
  const arrowRadius = 1;

  // North arrow shaft
  const shaftGeo = new THREE.CylinderGeometry(arrowRadius * 0.5, arrowRadius * 0.5, arrowLength, 8);
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
  const southShaftGeo = new THREE.CylinderGeometry(arrowRadius * 0.3, arrowRadius * 0.3, arrowLength * 0.5, 8);
  const southShaft = new THREE.Mesh(southShaftGeo, southMaterial);
  southShaft.position.y = arrowLength * 0.25;
  southShaft.position.z = arrowLength * 0.6;
  southShaft.rotation.x = Math.PI / 2;
  group.add(southShaft);

  // "N" label using a plane with text texture
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#cc0000';
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('N', 32, 32);

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
  const rayStart = sunPoint.clone().add(direction.clone().multiplyScalar(sunPoint.distanceTo(groundPoint) * 0.1));
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
  const groundArrowGeo = new THREE.ConeGeometry(arrowSize * 1.5, arrowSize * 3, 8);
  const groundArrowMaterial = new THREE.MeshBasicMaterial({
    color: 0x333333,
    transparent: true,
    opacity: 0.5,
  });
  const groundArrow = new THREE.Mesh(groundArrowGeo, groundArrowMaterial);
  groundArrow.position.set(center.x, 0.5, center.y);

  // Point towards where shadow will fall (opposite of sun)
  const shadowDir = new THREE.Vector3(-direction.x, 0, -direction.z).normalize();
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
    if (child instanceof THREE.Line || child instanceof THREE.Mesh || child instanceof THREE.Sprite) {
      if ('geometry' in child) child.geometry.dispose();
      if ('material' in child) {
        const mat = child.material;
        if (mat instanceof THREE.Material) mat.dispose();
      }
    }
    group.remove(child);
  }

  // Calculate a nice round scale bar length
  const targetLength = sceneSize * 0.25;
  const possibleLengths = [10, 20, 25, 50, 100, 200, 250, 500, 1000];
  let scaleLength = possibleLengths.find(l => l >= targetLength * 0.5) || 100;
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
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#333333';
  ctx.font = 'bold 32px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const labelText = scaleLength >= 1000 ? `${scaleLength / 1000}km` : `${scaleLength}m`;
  ctx.fillText(labelText, 64, 32);

  const texture = new THREE.CanvasTexture(canvas);
  const labelMaterial = new THREE.SpriteMaterial({ map: texture });
  const label = new THREE.Sprite(labelMaterial);
  label.position.set(startX + scaleLength / 2, barHeight * 4, startZ);
  label.scale.set(scaleLength * 0.3, scaleLength * 0.15, 1);
  group.add(label);

  // Zero label
  const zeroCanvas = document.createElement('canvas');
  zeroCanvas.width = 64;
  zeroCanvas.height = 64;
  const zeroCtx = zeroCanvas.getContext('2d')!;
  zeroCtx.fillStyle = '#666666';
  zeroCtx.font = 'bold 24px Arial';
  zeroCtx.textAlign = 'center';
  zeroCtx.textBaseline = 'middle';
  zeroCtx.fillText('0', 32, 32);

  const zeroTexture = new THREE.CanvasTexture(zeroCanvas);
  const zeroMaterial = new THREE.SpriteMaterial({ map: zeroTexture });
  const zeroLabel = new THREE.Sprite(zeroMaterial);
  zeroLabel.position.set(startX, barHeight * 4, startZ);
  zeroLabel.scale.set(scaleLength * 0.1, scaleLength * 0.1, 1);
  group.add(zeroLabel);
}

/**
 * Update the sun path arc visualization
 * Shows the arc of the sun's daily trajectory
 */
function updateSunPath(
  group: THREE.Group,
  center: Point2D,
  sceneSize: number,
  latitude: number,
  longitude: number,
  date: Date
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

  // Get sun times for the day
  const sunTimes = SunCalc.getTimes(date, latitude, longitude);
  const sunrise = sunTimes.sunrise;
  const sunset = sunTimes.sunset;

  if (!sunrise || !sunset || isNaN(sunrise.getTime()) || isNaN(sunset.getTime())) {
    return; // No valid sun path (polar day/night)
  }

  // Calculate arc radius
  const arcRadius = Math.max(sceneSize * 1.2, 300);

  // Sample points along the sun's path
  const pathPoints: THREE.Vector3[] = [];
  const numSamples = 48; // Every 30 minutes approximately

  for (let i = 0; i <= numSamples; i++) {
    const t = i / numSamples;
    const sampleTime = new Date(sunrise.getTime() + t * (sunset.getTime() - sunrise.getTime()));
    const sunPos = SunCalc.getPosition(sampleTime, latitude, longitude);

    // Skip if sun is below horizon
    if (sunPos.altitude <= 0) continue;

    // Convert to 3D coordinates
    const x = center.x - Math.sin(sunPos.azimuth) * Math.cos(sunPos.altitude) * arcRadius;
    const y = Math.sin(sunPos.altitude) * arcRadius;
    const z = center.y - Math.cos(sunPos.azimuth) * Math.cos(sunPos.altitude) * arcRadius;

    pathPoints.push(new THREE.Vector3(x, y, z));
  }

  if (pathPoints.length < 2) return;

  // Create the sun path arc
  const pathGeo = new THREE.BufferGeometry().setFromPoints(pathPoints);
  const pathMaterial = new THREE.LineBasicMaterial({
    color: 0xffcc00,
    transparent: true,
    opacity: 0.6,
    linewidth: 2,
  });
  const pathLine = new THREE.Line(pathGeo, pathMaterial);
  group.add(pathLine);

  // Add time markers along the path
  const markerTimes = [6, 9, 12, 15, 18]; // Hours to mark
  markerTimes.forEach(hour => {
    const markerDate = new Date(date);
    markerDate.setHours(hour, 0, 0, 0);

    // Check if this time is within sunrise-sunset
    if (markerDate < sunrise || markerDate > sunset) return;

    const sunPos = SunCalc.getPosition(markerDate, latitude, longitude);
    if (sunPos.altitude <= 0) return;

    const x = center.x - Math.sin(sunPos.azimuth) * Math.cos(sunPos.altitude) * arcRadius;
    const y = Math.sin(sunPos.altitude) * arcRadius;
    const z = center.y - Math.cos(sunPos.azimuth) * Math.cos(sunPos.altitude) * arcRadius;

    // Small sphere marker
    const markerGeo = new THREE.SphereGeometry(3);
    const markerMaterial = new THREE.MeshBasicMaterial({
      color: hour === 12 ? 0xff6600 : 0xffcc00,
    });
    const marker = new THREE.Mesh(markerGeo, markerMaterial);
    marker.position.set(x, y, z);
    group.add(marker);

    // Time label
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ff9900';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${hour}:00`, 32, 16);

    const texture = new THREE.CanvasTexture(canvas);
    const labelMaterial = new THREE.SpriteMaterial({ map: texture });
    const label = new THREE.Sprite(labelMaterial);
    label.position.set(x, y + 10, z);
    label.scale.set(20, 10, 1);
    group.add(label);
  });

  // Add sunrise/sunset markers
  [sunrise, sunset].forEach((time, index) => {
    const sunPos = SunCalc.getPosition(time, latitude, longitude);
    const x = center.x - Math.sin(sunPos.azimuth) * Math.cos(sunPos.altitude) * arcRadius;
    const y = Math.max(Math.sin(sunPos.altitude) * arcRadius, 5);
    const z = center.y - Math.cos(sunPos.azimuth) * Math.cos(sunPos.altitude) * arcRadius;

    // Sunrise/sunset marker
    const markerGeo = new THREE.SphereGeometry(5);
    const markerMaterial = new THREE.MeshBasicMaterial({
      color: index === 0 ? 0xff6600 : 0xff3300,
    });
    const marker = new THREE.Mesh(markerGeo, markerMaterial);
    marker.position.set(x, y, z);
    group.add(marker);

    // Label
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = index === 0 ? '#ff6600' : '#ff3300';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      index === 0
        ? `Sunrise ${time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
        : `Sunset ${time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
      64,
      16
    );

    const texture = new THREE.CanvasTexture(canvas);
    const labelMaterial = new THREE.SpriteMaterial({ map: texture });
    const label = new THREE.Sprite(labelMaterial);
    label.position.set(x, y + 15, z);
    label.scale.set(40, 10, 1);
    group.add(label);
  });
}
