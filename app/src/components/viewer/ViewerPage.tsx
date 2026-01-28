import { useCallback, useEffect, useRef, useState } from "react";
import type * as THREE from "three";
import { useProjectStore } from "../../store/projectStore";
import { AnimatedExportModal } from "./AnimatedExportModal";
import { BuildingInfoPopup } from "./BuildingInfoPopup";
import { CollapsibleSection } from "./CollapsibleSection";
// import { DebugOverlay } from "./DebugOverlay";
import type { ViewPreset } from "./NavigationControls";
import { NavigationControls } from "./NavigationControls";
import type { Scene3DHandle } from "./Scene3D";
import { Scene3D } from "./Scene3D";
import { TimeControls } from "./TimeControls";
// Phase 5: New components
// import type { SiteConfig as GeometrySiteConfig } from "../../lib/geometry";
import { exportToGLTF } from "../../modules/export/ExportService";
import type { Building } from "../../types";
import { BuildingLabels } from "./BuildingLabels";
// import { CompassWidget } from "./CompassWidget";
import {
  captureScreenshot,
  createFilename,
  downloadDataUrl,
} from "./utils/screenshotUtils";

interface SunPositionInfo {
  altitude: number;
  azimuth: number;
  isAboveHorizon: boolean;
}

export function ViewerPage() {
  const {
    project,
    currentTime,
    selectBuilding,
    selectFloor,
    setCurrentStep,
    setViewerSnapshot,
    displaySettings,
    isAnimating,
    setIsAnimating,
  } = useProjectStore();
  const { buildings, analysis } = project;

  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  // Phase 1: Scene3D ref for camera control methods
  const scene3DRef = useRef<Scene3DHandle>(null);
  // Phase 5: Container ref for building labels
  const viewerContainerRef = useRef<HTMLDivElement | null>(null);
  const [buildingMeshes, setBuildingMeshes] = useState<
    Map<string, THREE.Object3D>
  >(new Map());
  const [cameraAzimuth, setCameraAzimuth] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [sunPosition, setSunPosition] = useState<SunPositionInfo | null>(null);
  // @ts-expect-error - hoveredBuilding used in commented-out hover info panel
  const [hoveredBuilding, setHoveredBuilding] = useState<Building | null>(null);
  const [hoveredFloor, setHoveredFloor] = useState<number | null>(null);
  const [showAnimatedExport, setShowAnimatedExport] = useState(false);
  const [immersiveMode, setImmersiveMode] = useState(false);
  // const [debugMode, setDebugMode] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Handle Escape key to exit immersive mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && immersiveMode) {
        setImmersiveMode(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [immersiveMode]);

  const handleSunPositionChange = useCallback((info: SunPositionInfo) => {
    setSunPosition(info);
  }, []);

  const handleBuildingHover = useCallback(
    (
      building: Building | null,
      floorInfo?: { floor: number | null } | null,
    ) => {
      setHoveredBuilding(building);
      setHoveredFloor(floorInfo?.floor ?? null);
    },
    [],
  );

  // Phase 1: Camera azimuth change handler for compass
  const handleCameraChange = useCallback((azimuth: number) => {
    setCameraAzimuth(azimuth);
  }, []);

  // Phase 1: Navigation control handlers
  const handleZoomIn = useCallback(() => {
    scene3DRef.current?.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    scene3DRef.current?.zoomOut();
  }, []);

  const handleResetView = useCallback(() => {
    scene3DRef.current?.resetView();
  }, []);

  const handleFitToView = useCallback(() => {
    scene3DRef.current?.fitToView();
  }, []);

  const handleAlignNorth = useCallback(() => {
    scene3DRef.current?.alignToNorth();
  }, []);

  // Phase 3: View preset handler
  const handleViewPreset = useCallback((preset: ViewPreset) => {
    scene3DRef.current?.setViewPreset(preset);
  }, []);

  // Phase 3: Focus on building handler
  const handleFocusBuilding = useCallback((building: Building) => {
    scene3DRef.current?.focusOnBuilding(building.id);
  }, []);

  // Phase 3: Floor selection from popup
  const handleSelectFloorFromPopup = useCallback(
    (floor: number | undefined) => {
      selectFloor(floor);
    },
    [selectFloor],
  );

  // Phase 5: Handle building label click
  const handleLabelClick = useCallback(
    (buildingId: string) => {
      selectBuilding(buildingId);
      scene3DRef.current?.focusOnBuilding(buildingId);
    },
    [selectBuilding],
  );

  // Phase 5: Enhanced screenshot capture
  const handleScreenshot = useCallback(() => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) {
      alert("Scene not ready. Please wait and try again.");
      return;
    }

    const dataUrl = captureScreenshot(
      rendererRef.current,
      sceneRef.current,
      cameraRef.current,
      {
        pixelRatio: 2,
        watermark: { text: "SunScope Pro", position: "bottom-right" },
        includeTimestamp: true,
        format: "png",
      },
    );

    downloadDataUrl(dataUrl, createFilename("sunscope-3d", "png"));
  }, []);

  // Phase 5: Handle building meshes update from Scene3D
  const handleBuildingMeshesUpdate = useCallback(
    (meshes: Map<string, THREE.Object3D>) => {
      setBuildingMeshes(meshes);
    },
    [],
  );

  const selectedBuilding = buildings.find(
    (b) => b.id === analysis.selectedBuildingId,
  );

  // Site configuration for debug overlay (commented out - uncomment when needed)
  // const siteConfig: GeometrySiteConfig | null =
  //   project.image?.width && project.image?.height
  //     ? {
  //         imageWidth: project.image.width,
  //         imageHeight: project.image.height,
  //         scale: project.site.scale,
  //         northAngle: project.site.northAngle,
  //       }
  //     : null;

  const handleSceneReady = (
    scene: THREE.Scene,
    renderer: THREE.WebGLRenderer,
    camera: THREE.PerspectiveCamera,
    sunLight: THREE.DirectionalLight,
  ) => {
    sceneRef.current = scene;
    rendererRef.current = renderer;
    cameraRef.current = camera;
    sunLightRef.current = sunLight;
  };

  const handleExportGLTF = async () => {
    if (!sceneRef.current) {
      alert("Scene not ready. Please wait and try again.");
      return;
    }

    setIsExporting(true);
    try {
      await exportToGLTF(sceneRef.current);
    } catch {
      alert("Failed to export 3D model. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  // Capture 3D view snapshot for export
  const captureSnapshot = (): string | null => {
    if (!rendererRef.current) return null;
    try {
      // The animation loop keeps the canvas updated, so we can capture directly
      return rendererRef.current.domElement.toDataURL("image/png");
    } catch {
      return null;
    }
  };

  const handleViewResults = () => {
    // Capture snapshot before navigating
    const snapshot = captureSnapshot();
    if (snapshot) {
      setViewerSnapshot(snapshot);
    }
    setCurrentStep("results");
  };

  const floorOptions = selectedBuilding
    ? Array.from({ length: selectedBuilding.floors }, (_, i) => i + 1)
    : [];

  // Render immersive mode as a separate full-screen overlay
  if (immersiveMode) {
    return (
      <div
        className="fixed inset-0 z-[100] bg-gray-900"
        style={{ width: "100vw", height: "100vh" }}
      >
        <div className="w-full h-full relative">
          <Scene3D
            ref={scene3DRef}
            onSceneReady={handleSceneReady}
            onSunPositionChange={handleSunPositionChange}
            onBuildingHover={handleBuildingHover}
            onCameraChange={handleCameraChange}
            showNorthArrow={false}
            showSunRay={false}
            showScaleBar={true}
            showSunPath={true}
            displaySettings={displaySettings}
          />

          {/* Phase 1 & 3: Navigation Controls (Immersive Mode) */}
          {/* Desktop: Vertical layout on right side */}
          <div className="hidden sm:block">
            <NavigationControls
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onResetView={handleResetView}
              onFitToView={handleFitToView}
              onAlignNorth={handleAlignNorth}
              onViewPreset={handleViewPreset}
              cameraAzimuth={cameraAzimuth}
              layout="vertical"
              className="absolute bottom-20 right-4 z-10"
            />
          </div>
          {/* Mobile: Compact vertical layout at bottom-right */}
          <div className="sm:hidden">
            <NavigationControls
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onResetView={handleResetView}
              onFitToView={handleFitToView}
              onAlignNorth={handleAlignNorth}
              onViewPreset={handleViewPreset}
              cameraAzimuth={cameraAzimuth}
              layout="vertical"
              compact={true}
              className="absolute bottom-4 right-4 z-10"
            />
          </div>

          {/* Exit Immersive Mode Button */}
          <button
            onClick={() => setImmersiveMode(false)}
            className="absolute top-4 left-4 bg-black/70 backdrop-blur-sm text-white px-4 py-2 rounded-lg hover:bg-black/90 transition-colors shadow-lg flex items-center gap-2"
            aria-label="Exit immersive mode"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            <span className="text-sm font-medium">Exit (Esc)</span>
          </button>

          {/* Play/Pause + Time Overlay - Immersive Mode */}
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
            {/* Play/Pause Button */}
            <button
              onClick={() => setIsAnimating(!isAnimating)}
              className={`flex items-center justify-center w-11 h-11 rounded-lg shadow-lg backdrop-blur-sm transition-all duration-200 ${
                isAnimating
                  ? "bg-red-500/90 hover:bg-red-600/90 text-white"
                  : "bg-amber-500/90 hover:bg-amber-600/90 text-white"
              }`}
              aria-label={isAnimating ? "Pause sun animation" : "Play sun animation"}
              title={isAnimating ? "Pause" : "Play sun animation"}
            >
              {isAnimating ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Time Display */}
            <div className="bg-black/70 backdrop-blur-sm text-white px-4 py-2 rounded-lg text-sm font-mono shadow-lg">
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-amber-400"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0z" />
                </svg>
                <span className="font-semibold">
                  {currentTime.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </span>
              </div>
              <div className="text-xs text-gray-300 mt-1">
                {analysis.date.toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </div>
            </div>
          </div>

          {/* Sun Position */}
          {sunPosition && (
            <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-xs font-mono shadow-lg">
              <div className="flex items-center gap-3">
                <div>
                  <span className="text-gray-400">Alt:</span>{" "}
                  <span
                    className={
                      sunPosition.isAboveHorizon
                        ? "text-amber-400"
                        : "text-gray-500"
                    }
                  >
                    {sunPosition.altitude.toFixed(1)}°
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Az:</span>{" "}
                  <span className="text-blue-400">
                    {sunPosition.azimuth.toFixed(1)}°
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto bg-gradient-viewer rounded-2xl p-4 lg:p-6">
      {/* Mobile: Stack vertically, Desktop: Dynamic grid based on sidebar state */}
      <div
        className={`grid grid-cols-1 gap-4 ${
          sidebarCollapsed ? "lg:grid-cols-1" : "lg:grid-cols-4"
        }`}
      >
        {/* Left Sidebar - Selection (collapsible) */}
        <div
          className={`space-y-4 order-2 lg:order-1 transition-all duration-300 ${
            sidebarCollapsed ? "lg:hidden" : ""
          }`}
        >
          {/* Building Selection */}
          <CollapsibleSection
            title="Buildings"
            badge={buildings.length}
            defaultCollapsed={true}
          >
            {buildings.length === 0 ? (
              <p className="text-sm text-gray-500">No buildings to select</p>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={() => selectBuilding(undefined)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200 ${
                    !analysis.selectedBuildingId
                      ? "bg-gradient-to-r from-amber-100 to-amber-50 border border-amber-300 shadow-sm"
                      : "bg-gradient-to-r from-gray-50 to-white hover:from-gray-100 hover:to-gray-50 border border-transparent hover:border-gray-200"
                  }`}
                >
                  <span className="text-sm font-medium">Entire Site</span>
                </button>
                {buildings.map((building) => (
                  <button
                    key={building.id}
                    onClick={() => selectBuilding(building.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200 ${
                      analysis.selectedBuildingId === building.id
                        ? "bg-gradient-to-r from-amber-100 to-amber-50 border border-amber-300 shadow-sm"
                        : "bg-gradient-to-r from-gray-50 to-white hover:from-gray-100 hover:to-gray-50 border border-transparent hover:border-gray-200"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: building.color }}
                      />
                      <span className="text-sm font-medium">
                        {building.name}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {building.floors} floors, {building.totalHeight}m tall
                    </p>
                  </button>
                ))}
              </div>
            )}
          </CollapsibleSection>

          {/* Floor Selection */}
          {selectedBuilding && (
            <CollapsibleSection title="Floor Selection" defaultCollapsed={true}>
              <select
                value={analysis.selectedFloor || ""}
                onChange={(e) =>
                  selectFloor(
                    e.target.value ? parseInt(e.target.value) : undefined,
                  )
                }
                className="input"
              >
                <option value="">All floors</option>
                {floorOptions.map((floor) => (
                  <option key={floor} value={floor}>
                    Floor {floor} (
                    {((floor - 1) * selectedBuilding.floorHeight).toFixed(1)}m -{" "}
                    {(floor * selectedBuilding.floorHeight).toFixed(1)}m)
                  </option>
                ))}
              </select>
            </CollapsibleSection>
          )}

          <TimeControls />

          {/* Display Settings */}
          <CollapsibleSection title="Display Settings" defaultCollapsed={true}>
            <div className="space-y-4">
              {/* Shadow Intensity */}
              <div>
                <label className="text-xs text-gray-600 mb-1 block">
                  Shadow Intensity:{" "}
                  {Math.round((displaySettings.shadowIntensity ?? 0.7) * 100)}%
                </label>
                <input
                  type="range"
                  min="30"
                  max="100"
                  value={(displaySettings.shadowIntensity ?? 0.7) * 100}
                  onChange={(e) => {
                    const intensity = parseInt(e.target.value) / 100;
                    useProjectStore.getState().setShadowIntensity(intensity);
                  }}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                  <span>Light</span>
                  <span>Dark</span>
                </div>
              </div>

              {/* Floor Transparency */}
              <div>
                <label className="text-xs text-gray-600 mb-1 block">
                  Floor Transparency:{" "}
                  {Math.round((displaySettings.floorTransparency ?? 1) * 100)}%
                </label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={(displaySettings.floorTransparency ?? 1) * 100}
                  onChange={(e) => {
                    const opacity = parseInt(e.target.value) / 100;
                    useProjectStore.getState().setFloorTransparency(opacity);
                  }}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>
            </div>
          </CollapsibleSection>

          {/* Quick Stats */}
          <CollapsibleSection title="Current Analysis" defaultCollapsed={true}>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Target:</span>
                <span className="font-medium">
                  {selectedBuilding
                    ? `${selectedBuilding.name}${
                        analysis.selectedFloor
                          ? `, Floor ${analysis.selectedFloor}`
                          : ""
                      }`
                    : "Entire Site"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Location:</span>
                <span className="font-medium">
                  {project.site.location.city || "Custom"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Buildings:</span>
                <span className="font-medium">{buildings.length}</span>
              </div>
            </div>
          </CollapsibleSection>

          {/* Export Options */}
          <CollapsibleSection title="Export" defaultCollapsed={true}>
            <div className="space-y-2">
              {/* Phase 5: Screenshot Export */}
              <button
                onClick={handleScreenshot}
                disabled={buildings.length === 0}
                className="w-full btn-outline text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Screenshot (PNG)
              </button>

              {/* GLTF Export */}
              <button
                onClick={handleExportGLTF}
                disabled={isExporting || buildings.length === 0}
                className="w-full btn-outline text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isExporting ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                      />
                    </svg>
                    Export GLTF
                  </>
                )}
              </button>

              {/* Animated Export */}
              <button
                onClick={() => setShowAnimatedExport(true)}
                disabled={buildings.length === 0}
                className="w-full btn-primary text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                Animated GIF
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Create sun movement animation or download 3D model.
            </p>
          </CollapsibleSection>
        </div>

        {/* Main 3D View - Takes full width when sidebar collapsed */}
        <div
          className={`order-1 lg:order-2 ${
            sidebarCollapsed ? "lg:col-span-1" : "lg:col-span-3"
          }`}
        >
          <div
            className="card p-0 overflow-hidden relative"
            ref={viewerContainerRef}
          >
            {/* Responsive height - maximized for 3D view prominence */}
            <div className="h-[350px] sm:h-[500px] lg:h-[600px] xl:h-[700px] relative">
              <Scene3D
                ref={scene3DRef}
                onSceneReady={handleSceneReady}
                onSunPositionChange={handleSunPositionChange}
                onBuildingHover={handleBuildingHover}
                onCameraChange={handleCameraChange}
                onBuildingMeshesUpdate={handleBuildingMeshesUpdate}
                showNorthArrow={false}
                showSunRay={false}
                showScaleBar={true}
                showSunPath={true}
                displaySettings={displaySettings}
              />

              {/* Phase 1 & 3: Navigation Controls with View Presets */}
              {/* Desktop: Vertical layout on right side */}
              <div className="hidden sm:block">
                <NavigationControls
                  onZoomIn={handleZoomIn}
                  onZoomOut={handleZoomOut}
                  onResetView={handleResetView}
                  onFitToView={handleFitToView}
                  onAlignNorth={handleAlignNorth}
                  onViewPreset={handleViewPreset}
                  cameraAzimuth={cameraAzimuth}
                  layout="vertical"
                  className="absolute top-20 right-3 z-10"
                />
              </div>
              {/* Mobile: Compact vertical layout at bottom-right */}
              <div className="sm:hidden">
                <NavigationControls
                  onZoomIn={handleZoomIn}
                  onZoomOut={handleZoomOut}
                  onResetView={handleResetView}
                  onFitToView={handleFitToView}
                  onAlignNorth={handleAlignNorth}
                  onViewPreset={handleViewPreset}
                  cameraAzimuth={cameraAzimuth}
                  layout="vertical"
                  compact={true}
                  className="absolute bottom-3 right-3 z-10"
                />
              </div>

              {/* Phase 5: Enhanced Compass Widget - below top-left buttons */}
              {/* <div className="absolute top-12 sm:top-24 left-3 z-10">
                <CompassWidget
                  cameraAzimuth={cameraAzimuth * (Math.PI / 180)}
                  northOffset={project.site.northAngle}
                  sunAzimuth={
                    sunPosition
                      ? sunPosition.azimuth * (Math.PI / 180)
                      : undefined
                  }
                  sunAboveHorizon={sunPosition?.isAboveHorizon}
                  onRotateToNorth={handleAlignNorth}
                  size={56}
                  showSunIndicator={true}
                  compact={false}
                />
              </div> */}

              {/* Phase 5: Building Labels */}
              {buildings.length > 0 && (
                <BuildingLabels
                  buildings={buildings}
                  camera={cameraRef.current}
                  container={viewerContainerRef.current}
                  buildingMeshes={buildingMeshes}
                  selectedBuildingId={analysis.selectedBuildingId}
                  onLabelClick={handleLabelClick}
                  enableDeclutter={true}
                  minZoomDistance={30}
                  maxZoomDistance={800}
                />
              )}

              {/* Phase 3: Building Info Popup (when building is selected) */}
              {selectedBuilding && (
                <BuildingInfoPopup
                  building={selectedBuilding}
                  hoveredFloor={hoveredFloor}
                  sunPosition={sunPosition}
                  onClose={() => selectBuilding(undefined)}
                  onFocus={handleFocusBuilding}
                  onSelectFloor={handleSelectFloorFromPopup}
                  docked={false}
                />
              )}

              {/* Debug Overlay for visualizing building positions */}
              {/* {siteConfig && (
                <DebugOverlay
                  scene={sceneRef.current}
                  buildings={buildings}
                  siteConfig={siteConfig}
                  enabled={debugMode}
                  settings={{
                    showCoordinateAxes: true,
                    showCentroids: true,
                    showFootprintPoints: true,
                    showBoundingBoxes: false,
                  }}
                />
              )} */}
            </div>

            {/* Play/Pause + Date/Time Overlay */}
            <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
              {/* Play/Pause Button */}
              <button
                onClick={() => setIsAnimating(!isAnimating)}
                className={`flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg shadow-lg backdrop-blur-sm transition-all duration-200 ${
                  isAnimating
                    ? "bg-red-500/90 hover:bg-red-600/90 text-white"
                    : "bg-amber-500/90 hover:bg-amber-600/90 text-white"
                }`}
                aria-label={isAnimating ? "Pause sun animation" : "Play sun animation"}
                title={isAnimating ? "Pause" : "Play sun animation"}
              >
                {isAnimating ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              {/* Time Display */}
              <div className="bg-black/60 backdrop-blur-sm text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-mono shadow-lg">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <svg
                    className="w-3 h-3 sm:w-4 sm:h-4 text-amber-400"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0z" />
                  </svg>
                  <span className="font-semibold">
                    {currentTime.toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </span>
                </div>
                <div className="text-[10px] sm:text-xs text-gray-300 mt-0.5 sm:mt-1">
                  {analysis.date.toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              </div>
            </div>

            {/* Sun Position Overlay - Hidden on mobile to avoid overlap, shown on tablet+ */}
            {sunPosition && (
              <div className="hidden sm:block absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-mono shadow-lg">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div>
                    <span className="text-gray-400">Alt:</span>{" "}
                    <span
                      className={
                        sunPosition.isAboveHorizon
                          ? "text-amber-400"
                          : "text-gray-500"
                      }
                    >
                      {sunPosition.altitude.toFixed(1)}°
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Az:</span>{" "}
                    <span className="text-blue-400">
                      {sunPosition.azimuth.toFixed(1)}°
                    </span>
                  </div>
                </div>
                {!sunPosition.isAboveHorizon && (
                  <div className="text-amber-500 mt-1 text-center text-[10px] sm:text-xs">
                    Sun below horizon
                  </div>
                )}
              </div>
            )}

            {/* Top-left controls - stacked horizontally on mobile, vertically on desktop */}
            <div className="absolute top-3 left-3 flex sm:flex-col gap-1.5 z-10">
              {/* Sidebar Collapse Toggle - Desktop only */}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className={`hidden lg:block backdrop-blur-sm text-white p-1.5 sm:p-2 rounded transition-colors shadow-lg ${
                  sidebarCollapsed
                    ? "bg-amber-500/80 hover:bg-amber-600/80"
                    : "bg-black/60 hover:bg-black/80"
                }`}
                aria-label={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
                title={
                  sidebarCollapsed
                    ? "Show controls panel"
                    : "Hide controls for larger view"
                }
              >
                <svg
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  {sidebarCollapsed ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 5l7 7-7 7M5 5l7 7-7 7"
                    />
                  )}
                </svg>
              </button>
            </div>

            {/* Building Hover Tooltip with Floor Insights - hidden on small mobile to avoid overlap */}
            {/* {hoveredBuilding && ( */}
              {/* // <div className="hidden xs:block absolute bottom-3 left-3 bg-gradient-to-br from-white to-gray-50/95 backdrop-blur-sm border border-gray-200/60 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl shadow-lg max-w-[200px] sm:max-w-[240px] pointer-events-none"> */}
                {/* <div className="flex items-center gap-2 mb-1">
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: hoveredBuilding.color }}
                  />
                  <span className="font-medium text-gray-900 text-sm">
                    {hoveredBuilding.name}
                  </span>
                </div> */}

                {/* Floor-specific info when hovering a floor */}
                {/* {hoveredFloor && (
                  <div className="mb-2 p-2 bg-amber-50 rounded border border-amber-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-amber-800">
                        Floor {hoveredFloor}
                      </span>
                      <span className="text-xs text-amber-600">
                        {(
                          (hoveredFloor - 1) *
                          hoveredBuilding.floorHeight
                        ).toFixed(1)}
                        m -{" "}
                        {(hoveredFloor * hoveredBuilding.floorHeight).toFixed(
                          1,
                        )}
                        m
                      </span>
                    </div>
                    <div className="space-y-1 text-xs text-gray-600">
                      <div className="flex justify-between gap-2">
                        <span>Est. sunlight:</span>
                        <span
                          className={`font-medium ${
                            hoveredFloor > hoveredBuilding.floors * 0.7
                              ? "text-green-600"
                              : hoveredFloor > hoveredBuilding.floors * 0.4
                                ? "text-amber-600"
                                : "text-orange-600"
                          }`}
                        >
                          {hoveredFloor > hoveredBuilding.floors * 0.7
                            ? "High"
                            : hoveredFloor > hoveredBuilding.floors * 0.4
                              ? "Medium"
                              : "Low"}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span>Position:</span>
                        <span className="font-mono">
                          {Math.round(
                            (hoveredFloor / hoveredBuilding.floors) * 100,
                          )}
                          % height
                        </span>
                      </div>
                      {sunPosition && sunPosition.isAboveHorizon && (
                        <div className="flex justify-between gap-2">
                          <span>Shadow risk:</span>
                          <span
                            className={`font-medium ${
                              hoveredFloor > hoveredBuilding.floors * 0.5
                                ? "text-green-600"
                                : "text-orange-600"
                            }`}
                          >
                            {hoveredFloor > hoveredBuilding.floors * 0.5
                              ? "Low"
                              : "Higher"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )} */}

                {/* <div className="space-y-0.5 text-xs text-gray-600">
                  <div className="flex justify-between gap-4">
                    <span>Total height:</span>
                    <span className="font-mono">
                      {hoveredBuilding.totalHeight}m
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Floors:</span>
                    <span className="font-mono">{hoveredBuilding.floors}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Floor height:</span>
                    <span className="font-mono">
                      {hoveredBuilding.floorHeight}m
                    </span>
                  </div>
                </div> */}

                {/* <div className="mt-2 pt-1 border-t border-gray-200 text-xs text-amber-600 font-medium">
                  Click to select for analysis
                </div> */}
              {/* // </div> */}
            {/* )} */}
          </div>

          {/* Legend - Responsive: wrap on mobile */}
          <div className="mt-2 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs text-gray-500 px-2">
            <span className="flex items-center">
              <span className="inline-block w-3 h-3 bg-yellow-400 rounded-full mr-1" />
              Sun
            </span>
            <span className="flex items-center">
              <span className="inline-block w-3 h-3 bg-gray-400 rounded-full mr-1" />
              Shadow
            </span>
            <span className="hidden sm:inline">
              Drag to rotate | Scroll to zoom | Right-drag to pan
            </span>
            <span className="sm:hidden text-center">
              Touch to rotate | Pinch to zoom
            </span>
          </div>
        </div>
      </div>

      {/* Actions - Responsive: full width on mobile */}
      <div className="mt-6 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        <button
          onClick={() => setCurrentStep("editor")}
          className="btn-viewer-secondary order-2 sm:order-1"
        >
          Back to Editor
        </button>
        <button
          onClick={handleViewResults}
          className="btn-viewer-primary order-1 sm:order-2"
        >
          View Results
        </button>
      </div>

      {/* Animated Export Modal */}
      <AnimatedExportModal
        isOpen={showAnimatedExport}
        onClose={() => setShowAnimatedExport(false)}
        renderer={rendererRef.current}
        scene={sceneRef.current}
        camera={cameraRef.current}
        sunLight={sunLightRef.current}
        location={project.site.location}
        date={analysis.date}
      />
    </div>
  );
}
