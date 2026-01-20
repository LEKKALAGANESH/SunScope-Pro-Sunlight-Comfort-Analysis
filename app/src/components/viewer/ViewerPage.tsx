import { useRef, useState, useCallback, useEffect } from 'react';
import type * as THREE from 'three';
import { useProjectStore } from '../../store/projectStore';
import { Scene3D } from './Scene3D';
import type { Scene3DHandle } from './Scene3D';
import { DebugOverlay } from './DebugOverlay';
import { TimeControls } from './TimeControls';
import { AnimatedExportModal } from './AnimatedExportModal';
import { CollapsibleSection } from './CollapsibleSection';
import { NavigationControls } from './NavigationControls';
import type { ViewPreset } from './NavigationControls';
import { BuildingInfoPopup } from './BuildingInfoPopup';
// Phase 5: New components
import { CompassWidget } from './CompassWidget';
import { BuildingLabels } from './BuildingLabels';
import { exportToGLTF } from '../../modules/export/ExportService';
import { captureScreenshot, downloadDataUrl, createFilename } from './utils/screenshotUtils';
import type { Building, Vector3 } from '../../types';
import type { SiteConfig as GeometrySiteConfig } from '../../lib/geometry';

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
    setFloorTransparency,
    toggleShadowHeatmap,
    setHeatmapOpacity,
    measurements,
    measurementMode,
    setMeasurementMode,
    addMeasurement,
    removeMeasurement,
    clearMeasurements,
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
  const [buildingMeshes, setBuildingMeshes] = useState<Map<string, THREE.Object3D>>(new Map());
  const [showBuildingLabels, setShowBuildingLabels] = useState(true);
  const [cameraAzimuth, setCameraAzimuth] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [sunPosition, setSunPosition] = useState<SunPositionInfo | null>(null);
  const [hoveredBuilding, setHoveredBuilding] = useState<Building | null>(null);
  const [hoveredFloor, setHoveredFloor] = useState<number | null>(null);
  const [showAnimatedExport, setShowAnimatedExport] = useState(false);
  const [pendingMeasurementPoint, setPendingMeasurementPoint] = useState<Vector3 | null>(null);
  const [sectionCut, setSectionCut] = useState<{
    enabled: boolean;
    axis: 'x' | 'y' | 'z';
    position: number;
    flip: boolean;
  }>({
    enabled: false,
    axis: 'y',
    position: 0.5,
    flip: false,
  });
  const [immersiveMode, setImmersiveMode] = useState(false);
  const [debugMode, setDebugMode] = useState(false);

  // Handle Escape key to exit immersive mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && immersiveMode) {
        setImmersiveMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [immersiveMode]);

  const handleSunPositionChange = useCallback((info: SunPositionInfo) => {
    setSunPosition(info);
  }, []);

  const handleBuildingHover = useCallback((building: Building | null, floorInfo?: { floor: number | null } | null) => {
    setHoveredBuilding(building);
    setHoveredFloor(floorInfo?.floor ?? null);
  }, []);

  const handleMeasurementClick = useCallback((point: Vector3) => {
    if (!measurementMode) return;

    if (pendingMeasurementPoint) {
      // Complete the measurement
      addMeasurement(pendingMeasurementPoint, point);
      setPendingMeasurementPoint(null);
    } else {
      // Start a new measurement
      setPendingMeasurementPoint(point);
    }
  }, [measurementMode, pendingMeasurementPoint, addMeasurement]);

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
  const handleSelectFloorFromPopup = useCallback((floor: number | undefined) => {
    selectFloor(floor);
  }, [selectFloor]);

  const handleCancelMeasurement = useCallback(() => {
    setPendingMeasurementPoint(null);
    setMeasurementMode(false);
  }, [setMeasurementMode]);

  // Phase 5: Handle building label click
  const handleLabelClick = useCallback((buildingId: string) => {
    selectBuilding(buildingId);
    scene3DRef.current?.focusOnBuilding(buildingId);
  }, [selectBuilding]);

  // Phase 5: Enhanced screenshot capture
  const handleScreenshot = useCallback(() => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) {
      alert('Scene not ready. Please wait and try again.');
      return;
    }

    const dataUrl = captureScreenshot(
      rendererRef.current,
      sceneRef.current,
      cameraRef.current,
      {
        pixelRatio: 2,
        watermark: { text: 'SunScope Pro', position: 'bottom-right' },
        includeTimestamp: true,
        format: 'png',
      }
    );

    downloadDataUrl(dataUrl, createFilename('sunscope-3d', 'png'));
  }, []);

  // Phase 5: Handle building meshes update from Scene3D
  const handleBuildingMeshesUpdate = useCallback((meshes: Map<string, THREE.Object3D>) => {
    setBuildingMeshes(meshes);
  }, []);

  const selectedBuilding = buildings.find((b) => b.id === analysis.selectedBuildingId);

  // Site configuration for debug overlay
  const siteConfig: GeometrySiteConfig | null = project.image?.width && project.image?.height
    ? {
        imageWidth: project.image.width,
        imageHeight: project.image.height,
        scale: project.site.scale,
        northAngle: project.site.northAngle,
      }
    : null;

  const handleSceneReady = (
    scene: THREE.Scene,
    renderer: THREE.WebGLRenderer,
    camera: THREE.PerspectiveCamera,
    sunLight: THREE.DirectionalLight
  ) => {
    sceneRef.current = scene;
    rendererRef.current = renderer;
    cameraRef.current = camera;
    sunLightRef.current = sunLight;
  };

  const handleExportGLTF = async () => {
    if (!sceneRef.current) {
      alert('Scene not ready. Please wait and try again.');
      return;
    }

    setIsExporting(true);
    try {
      await exportToGLTF(sceneRef.current);
    } catch (error) {
      console.error('GLTF export failed:', error);
      alert('Failed to export 3D model. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Capture 3D view snapshot for export
  const captureSnapshot = (): string | null => {
    if (!rendererRef.current) return null;
    try {
      // The animation loop keeps the canvas updated, so we can capture directly
      return rendererRef.current.domElement.toDataURL('image/png');
    } catch (error) {
      console.error('Failed to capture snapshot:', error);
      return null;
    }
  };

  const handleViewResults = () => {
    // Capture snapshot before navigating
    const snapshot = captureSnapshot();
    if (snapshot) {
      setViewerSnapshot(snapshot);
    }
    setCurrentStep('results');
  };

  const floorOptions = selectedBuilding
    ? Array.from({ length: selectedBuilding.floors }, (_, i) => i + 1)
    : [];

  // Render immersive mode as a separate full-screen overlay
  if (immersiveMode) {
    return (
      <div className="fixed inset-0 z-[100] bg-gray-900" style={{ width: '100vw', height: '100vh' }}>
        <div className="w-full h-full relative">
          <Scene3D
            ref={scene3DRef}
            onSceneReady={handleSceneReady}
            onSunPositionChange={handleSunPositionChange}
            onBuildingHover={handleBuildingHover}
            onMeasurementClick={handleMeasurementClick}
            onCameraChange={handleCameraChange}
            showNorthArrow={false}
            showSunRay={false}
            showScaleBar={true}
            showSunPath={true}
            sectionCut={sectionCut}
            displaySettings={displaySettings}
            measurements={measurements}
            measurementMode={measurementMode}
            pendingMeasurementPoint={pendingMeasurementPoint}
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
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="text-sm font-medium">Exit (Esc)</span>
          </button>

          {/* Time Overlay */}
          <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm text-white px-4 py-2 rounded-lg text-sm font-mono shadow-lg">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0z" />
              </svg>
              <span className="font-semibold">
                {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
              </span>
            </div>
            <div className="text-xs text-gray-300 mt-1">
              {analysis.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
          </div>

          {/* Sun Position */}
          {sunPosition && (
            <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-xs font-mono shadow-lg">
              <div className="flex items-center gap-3">
                <div>
                  <span className="text-gray-400">Alt:</span>{' '}
                  <span className={sunPosition.isAboveHorizon ? 'text-amber-400' : 'text-gray-500'}>
                    {sunPosition.altitude.toFixed(1)}°
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Az:</span>{' '}
                  <span className="text-blue-400">{sunPosition.azimuth.toFixed(1)}°</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto bg-gradient-viewer rounded-2xl p-6">
      {/* Mobile: Stack vertically, Desktop: 4-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left Sidebar - Selection */}
        <div className="space-y-4 order-2 lg:order-1">
          {/* Building Selection */}
          <CollapsibleSection title="Buildings" badge={buildings.length} defaultCollapsed={true}>
            {buildings.length === 0 ? (
              <p className="text-sm text-gray-500">No buildings to select</p>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={() => selectBuilding(undefined)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200 ${
                    !analysis.selectedBuildingId
                      ? 'bg-gradient-to-r from-amber-100 to-amber-50 border border-amber-300 shadow-sm'
                      : 'bg-gradient-to-r from-gray-50 to-white hover:from-gray-100 hover:to-gray-50 border border-transparent hover:border-gray-200'
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
                        ? 'bg-gradient-to-r from-amber-100 to-amber-50 border border-amber-300 shadow-sm'
                        : 'bg-gradient-to-r from-gray-50 to-white hover:from-gray-100 hover:to-gray-50 border border-transparent hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: building.color }}
                      />
                      <span className="text-sm font-medium">{building.name}</span>
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
                value={analysis.selectedFloor || ''}
                onChange={(e) =>
                  selectFloor(e.target.value ? parseInt(e.target.value) : undefined)
                }
                className="input"
              >
                <option value="">All floors</option>
                {floorOptions.map((floor) => (
                  <option key={floor} value={floor}>
                    Floor {floor}{' '}
                    ({((floor - 1) * selectedBuilding.floorHeight).toFixed(1)}m -{' '}
                    {(floor * selectedBuilding.floorHeight).toFixed(1)}m)
                  </option>
                ))}
              </select>
            </CollapsibleSection>
          )}

          {/* Section Cut Controls */}
          <CollapsibleSection title="Section Cut" defaultCollapsed={true}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-600">Enable</span>
              <button
                onClick={() => setSectionCut(prev => ({ ...prev, enabled: !prev.enabled }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  sectionCut.enabled ? 'bg-amber-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    sectionCut.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {sectionCut.enabled && (
              <div className="space-y-3">
                {/* Axis Selection */}
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Cut Axis</label>
                  <div className="grid grid-cols-3 gap-1">
                    {(['x', 'y', 'z'] as const).map((axis) => (
                      <button
                        key={axis}
                        onClick={() => setSectionCut(prev => ({ ...prev, axis, position: 0.5 }))}
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          sectionCut.axis === axis
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {axis === 'x' ? 'East-West' : axis === 'y' ? 'Height' : 'North-South'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Position Slider */}
                <div>
                  <label className="text-xs text-gray-500 block mb-1">
                    Position: {Math.round(sectionCut.position * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sectionCut.position * 100}
                    onChange={(e) => setSectionCut(prev => ({
                      ...prev,
                      position: parseInt(e.target.value) / 100
                    }))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                </div>

                {/* Flip Direction */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Flip direction</span>
                  <button
                    onClick={() => setSectionCut(prev => ({ ...prev, flip: !prev.flip }))}
                    className={`px-2 py-1 rounded text-xs ${
                      sectionCut.flip
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {sectionCut.flip ? 'Flipped' : 'Normal'}
                  </button>
                </div>
              </div>
            )}

            <p className="text-xs text-gray-400 mt-2">
              Slice through buildings to see interior floors.
            </p>
          </CollapsibleSection>

          {/* Display Options */}
          <CollapsibleSection title="Display Options" defaultCollapsed={true}>
            {/* Building Labels Toggle */}
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
              <span className="text-xs text-gray-600">Building Labels</span>
              <button
                onClick={() => setShowBuildingLabels(!showBuildingLabels)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  showBuildingLabels ? 'bg-amber-500' : 'bg-gray-300'
                }`}
                aria-pressed={showBuildingLabels}
                aria-label="Toggle building labels"
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    showBuildingLabels ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Floor Transparency */}
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-gray-600">Floor Transparency</label>
                  <span className="text-xs text-gray-500 font-mono">
                    {Math.round(displaySettings.floorTransparency * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={displaySettings.floorTransparency * 100}
                  onChange={(e) => setFloorTransparency(parseInt(e.target.value) / 100)}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  aria-label="Floor transparency"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Adjust visibility of floor highlights
                </p>
              </div>

              {/* Shadow Heatmap */}
              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-600">Shadow Heatmap</span>
                  <button
                    onClick={() => toggleShadowHeatmap(!displaySettings.showShadowHeatmap)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      displaySettings.showShadowHeatmap ? 'bg-amber-500' : 'bg-gray-300'
                    }`}
                    aria-pressed={displaySettings.showShadowHeatmap}
                    aria-label="Toggle shadow heatmap"
                  >
                    <span
                      className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                        displaySettings.showShadowHeatmap ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {displaySettings.showShadowHeatmap && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs text-gray-500">Heatmap Opacity</label>
                      <span className="text-xs text-gray-500 font-mono">
                        {Math.round(displaySettings.heatmapOpacity * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="80"
                      value={displaySettings.heatmapOpacity * 100}
                      onChange={(e) => setHeatmapOpacity(parseInt(e.target.value) / 100)}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      aria-label="Heatmap opacity"
                    />
                    <div className="flex justify-between text-xs mt-1">
                      <span className="text-blue-500">Full Sun</span>
                      <span className="text-red-500">Full Shadow</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CollapsibleSection>

          {/* Measurement Tool */}
          <CollapsibleSection title="Measure Distance" badge={measurements.length > 0 ? measurements.length : undefined} defaultCollapsed={true}>
            <button
              onClick={() => {
                if (measurementMode) {
                  handleCancelMeasurement();
                } else {
                  setMeasurementMode(true);
                }
              }}
              className={`w-full text-sm flex items-center justify-center gap-2 py-2 rounded-lg transition-colors ${
                measurementMode
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'btn-outline'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              {measurementMode ? 'Cancel Measurement' : 'Start Measuring'}
            </button>

            {measurementMode && (
              <div className="mt-2 p-2 bg-amber-50 rounded-lg text-xs text-amber-700">
                {pendingMeasurementPoint
                  ? 'Click second point to complete measurement'
                  : 'Click on the ground to set first point'}
              </div>
            )}

            {measurements.length > 0 && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Measurements</span>
                  <button
                    onClick={clearMeasurements}
                    className="text-red-500 hover:text-red-600"
                  >
                    Clear All
                  </button>
                </div>
                {measurements.map((m, i) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between bg-gradient-to-r from-gray-50 to-white rounded-lg px-2 py-1 text-sm border border-gray-100"
                  >
                    <span className="font-mono text-gray-700">
                      #{i + 1}: {m.distance.toFixed(1)}m
                    </span>
                    <button
                      onClick={() => removeMeasurement(m.id)}
                      className="text-gray-400 hover:text-red-500 p-1"
                      aria-label={`Remove measurement ${i + 1}`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
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
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
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
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
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
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Animated GIF
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Create sun movement animation or download 3D model.
            </p>
          </CollapsibleSection>
        </div>

        {/* Main 3D View - First on mobile */}
        <div className="lg:col-span-2 order-1 lg:order-2">
          <div className="card p-0 overflow-hidden relative" ref={viewerContainerRef}>
            {/* Responsive height */}
            <div className="h-[300px] sm:h-[400px] lg:h-[500px] relative">
              <Scene3D
                ref={scene3DRef}
                onSceneReady={handleSceneReady}
                onSunPositionChange={handleSunPositionChange}
                onBuildingHover={handleBuildingHover}
                onMeasurementClick={handleMeasurementClick}
                onCameraChange={handleCameraChange}
                onBuildingMeshesUpdate={handleBuildingMeshesUpdate}
                showNorthArrow={false}
                showSunRay={false}
                showScaleBar={true}
                showSunPath={true}
                sectionCut={sectionCut}
                displaySettings={displaySettings}
                measurements={measurements}
                measurementMode={measurementMode}
                pendingMeasurementPoint={pendingMeasurementPoint}
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
              <div className="absolute top-12 sm:top-24 left-3 z-10">
                <CompassWidget
                  cameraAzimuth={cameraAzimuth * (Math.PI / 180)}
                  northOffset={project.site.northAngle}
                  sunAzimuth={sunPosition ? sunPosition.azimuth * (Math.PI / 180) : undefined}
                  sunAboveHorizon={sunPosition?.isAboveHorizon}
                  onRotateToNorth={handleAlignNorth}
                  size={56}
                  showSunIndicator={true}
                  compact={false}
                />
              </div>

              {/* Phase 5: Building Labels */}
              {showBuildingLabels && buildings.length > 0 && (
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
              {siteConfig && (
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
              )}
            </div>

            {/* Date/Time Overlay */}
            <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-mono shadow-lg">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <svg className="w-3 h-3 sm:w-4 sm:h-4 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0z" />
                </svg>
                <span className="font-semibold">
                  {currentTime.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </span>
              </div>
              <div className="text-[10px] sm:text-xs text-gray-300 mt-0.5 sm:mt-1">
                {analysis.date.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </div>
            </div>

            {/* Sun Position Overlay - Hidden on mobile to avoid overlap, shown on tablet+ */}
            {sunPosition && (
              <div className="hidden sm:block absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-mono shadow-lg">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div>
                    <span className="text-gray-400">Alt:</span>{' '}
                    <span className={sunPosition.isAboveHorizon ? 'text-amber-400' : 'text-gray-500'}>
                      {sunPosition.altitude.toFixed(1)}°
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Az:</span>{' '}
                    <span className="text-blue-400">{sunPosition.azimuth.toFixed(1)}°</span>
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
              {/* Immersive Mode Toggle */}
              <button
                onClick={() => setImmersiveMode(true)}
                className="bg-black/60 backdrop-blur-sm text-white p-1.5 sm:p-2 rounded hover:bg-black/80 transition-colors shadow-lg"
                aria-label="Enter immersive mode"
                title="Enter immersive mode (fullscreen)"
              >
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </button>

              {/* Debug Mode Toggle */}
              <button
                onClick={() => setDebugMode(!debugMode)}
                className={`backdrop-blur-sm text-white p-1.5 sm:p-2 rounded transition-colors shadow-lg ${
                  debugMode ? 'bg-amber-500/80 hover:bg-amber-600/80' : 'bg-black/60 hover:bg-black/80'
                }`}
                aria-label="Toggle debug mode"
                title="Toggle debug visualization (shows building positions and centroids)"
              >
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </button>
            </div>

            {/* Building Hover Tooltip with Floor Insights - hidden on small mobile to avoid overlap */}
            {hoveredBuilding && (
              <div className="hidden xs:block absolute bottom-3 left-3 bg-gradient-to-br from-white to-gray-50/95 backdrop-blur-sm border border-gray-200/60 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl shadow-lg max-w-[200px] sm:max-w-[240px] pointer-events-none">
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: hoveredBuilding.color }}
                  />
                  <span className="font-medium text-gray-900 text-sm">
                    {hoveredBuilding.name}
                  </span>
                </div>

                {/* Floor-specific info when hovering a floor */}
                {hoveredFloor && (
                  <div className="mb-2 p-2 bg-amber-50 rounded border border-amber-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-amber-800">
                        Floor {hoveredFloor}
                      </span>
                      <span className="text-xs text-amber-600">
                        {((hoveredFloor - 1) * hoveredBuilding.floorHeight).toFixed(1)}m - {(hoveredFloor * hoveredBuilding.floorHeight).toFixed(1)}m
                      </span>
                    </div>
                    <div className="space-y-1 text-xs text-gray-600">
                      <div className="flex justify-between gap-2">
                        <span>Est. sunlight:</span>
                        <span className={`font-medium ${
                          hoveredFloor > hoveredBuilding.floors * 0.7 ? 'text-green-600' :
                          hoveredFloor > hoveredBuilding.floors * 0.4 ? 'text-amber-600' :
                          'text-orange-600'
                        }`}>
                          {hoveredFloor > hoveredBuilding.floors * 0.7 ? 'High' :
                           hoveredFloor > hoveredBuilding.floors * 0.4 ? 'Medium' : 'Low'}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span>Position:</span>
                        <span className="font-mono">
                          {Math.round((hoveredFloor / hoveredBuilding.floors) * 100)}% height
                        </span>
                      </div>
                      {sunPosition && sunPosition.isAboveHorizon && (
                        <div className="flex justify-between gap-2">
                          <span>Shadow risk:</span>
                          <span className={`font-medium ${
                            hoveredFloor > hoveredBuilding.floors * 0.5 ? 'text-green-600' : 'text-orange-600'
                          }`}>
                            {hoveredFloor > hoveredBuilding.floors * 0.5 ? 'Low' : 'Higher'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-0.5 text-xs text-gray-600">
                  <div className="flex justify-between gap-4">
                    <span>Total height:</span>
                    <span className="font-mono">{hoveredBuilding.totalHeight}m</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Floors:</span>
                    <span className="font-mono">{hoveredBuilding.floors}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Floor height:</span>
                    <span className="font-mono">{hoveredBuilding.floorHeight}m</span>
                  </div>
                </div>
                <div className="mt-2 pt-1 border-t border-gray-200 text-xs text-amber-600 font-medium">
                  Click to select for analysis
                </div>
              </div>
            )}
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
            <span className="hidden sm:inline">Drag to rotate | Scroll to zoom | Right-drag to pan</span>
            <span className="sm:hidden text-center">Touch to rotate | Pinch to zoom</span>
          </div>
        </div>

        {/* Right Sidebar - Time Controls */}
        <div className="space-y-4 order-3 lg:order-3">
          <TimeControls />

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
                          : ''
                      }`
                    : 'Entire Site'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Location:</span>
                <span className="font-medium">
                  {project.site.location.city || 'Custom'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Buildings:</span>
                <span className="font-medium">{buildings.length}</span>
              </div>
            </div>
          </CollapsibleSection>
        </div>
      </div>

      {/* Actions - Responsive: full width on mobile */}
      <div className="mt-6 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        <button onClick={() => setCurrentStep('editor')} className="btn-viewer-secondary order-2 sm:order-1">
          Back to Editor
        </button>
        <button onClick={handleViewResults} className="btn-viewer-primary order-1 sm:order-2">
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
