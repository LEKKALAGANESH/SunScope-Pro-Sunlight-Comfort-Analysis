import { useRef, useState, useCallback } from 'react';
import type * as THREE from 'three';
import { useProjectStore } from '../../store/projectStore';
import { Scene3D } from './Scene3D';
import { TimeControls } from './TimeControls';
import { AnimatedExportModal } from './AnimatedExportModal';
import { exportToGLTF } from '../../modules/export/ExportService';
import type { Building, Vector3 } from '../../types';

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
  const [isExporting, setIsExporting] = useState(false);
  const [sunPosition, setSunPosition] = useState<SunPositionInfo | null>(null);
  const [hoveredBuilding, setHoveredBuilding] = useState<Building | null>(null);
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

  const handleSunPositionChange = useCallback((info: SunPositionInfo) => {
    setSunPosition(info);
  }, []);

  const handleBuildingHover = useCallback((building: Building | null) => {
    setHoveredBuilding(building);
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

  const handleCancelMeasurement = useCallback(() => {
    setPendingMeasurementPoint(null);
    setMeasurementMode(false);
  }, [setMeasurementMode]);

  const selectedBuilding = buildings.find((b) => b.id === analysis.selectedBuildingId);

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

  const handleResetView = () => {
    // Reset camera position - would need camera ref
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

  return (
    <div className="max-w-7xl mx-auto">
      {/* Mobile: Stack vertically, Desktop: 4-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left Sidebar - Selection (Mobile: collapsible on smaller screens) */}
        <div className="space-y-4 order-2 lg:order-1">
          {/* Building Selection */}
          <div className="card">
            <h3 className="font-medium text-gray-900 mb-3">Select Building</h3>
            {buildings.length === 0 ? (
              <p className="text-sm text-gray-500">No buildings to select</p>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={() => selectBuilding(undefined)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    !analysis.selectedBuildingId
                      ? 'bg-amber-100 border border-amber-300'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-sm font-medium">Entire Site</span>
                </button>
                {buildings.map((building) => (
                  <button
                    key={building.id}
                    onClick={() => selectBuilding(building.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      analysis.selectedBuildingId === building.id
                        ? 'bg-amber-100 border border-amber-300'
                        : 'bg-gray-50 hover:bg-gray-100'
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
          </div>

          {/* Floor Selection */}
          {selectedBuilding && (
            <div className="card">
              <h3 className="font-medium text-gray-900 mb-3">Select Floor</h3>
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
            </div>
          )}

          {/* View Controls */}
          <div className="card">
            <h3 className="font-medium text-gray-900 mb-3">View</h3>
            <div className="grid grid-cols-2 gap-2">
              <button className="btn-outline text-sm">Top</button>
              <button className="btn-outline text-sm">Front</button>
              <button className="btn-outline text-sm">Side</button>
              <button className="btn-outline text-sm">Iso</button>
            </div>
            <button
              onClick={handleResetView}
              className="w-full mt-2 btn-secondary text-sm"
            >
              Reset View
            </button>
          </div>

          {/* Section Cut Controls */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900">Section Cut</h3>
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
          </div>

          {/* Display Options */}
          <div className="card">
            <h3 className="font-medium text-gray-900 mb-3">Display Options</h3>

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
          </div>

          {/* Measurement Tool */}
          <div className="card">
            <h3 className="font-medium text-gray-900 mb-3">Measure Distance</h3>
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
                    className="flex items-center justify-between bg-gray-50 rounded px-2 py-1 text-sm"
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
          </div>

          {/* Export Options */}
          <div className="card">
            <h3 className="font-medium text-gray-900 mb-3">Export</h3>
            <div className="space-y-2">
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
          </div>
        </div>

        {/* Main 3D View - First on mobile */}
        <div className="lg:col-span-2 order-1 lg:order-2">
          <div className="card p-0 overflow-hidden relative">
            {/* Responsive height: smaller on mobile */}
            <div className="h-[300px] sm:h-[400px] lg:h-[500px]">
              <Scene3D
                onSceneReady={handleSceneReady}
                onSunPositionChange={handleSunPositionChange}
                onBuildingHover={handleBuildingHover}
                onMeasurementClick={handleMeasurementClick}
                showNorthArrow={true}
                showSunRay={true}
                showScaleBar={true}
                showSunPath={true}
                sectionCut={sectionCut}
                displaySettings={displaySettings}
                measurements={measurements}
                measurementMode={measurementMode}
                pendingMeasurementPoint={pendingMeasurementPoint}
              />
            </div>

            {/* Date/Time Overlay */}
            <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-sm font-mono shadow-lg">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
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
              <div className="text-xs text-gray-300 mt-1">
                {analysis.date.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>
            </div>

            {/* Sun Position Overlay */}
            {sunPosition && (
              <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-xs font-mono shadow-lg">
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
                {!sunPosition.isAboveHorizon && (
                  <div className="text-amber-500 mt-1 text-center">
                    ☾ Sun below horizon
                  </div>
                )}
              </div>
            )}

            {/* North Indicator Badge */}
            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded text-xs font-bold shadow-lg flex items-center gap-1">
              <span className="text-red-500">▲</span>
              <span>N</span>
            </div>

            {/* Building Hover Tooltip */}
            {hoveredBuilding && (
              <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm border border-gray-200 px-3 py-2 rounded-lg shadow-lg max-w-[200px] pointer-events-none">
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: hoveredBuilding.color }}
                  />
                  <span className="font-medium text-gray-900 text-sm">
                    {hoveredBuilding.name}
                  </span>
                </div>
                <div className="space-y-0.5 text-xs text-gray-600">
                  <div className="flex justify-between gap-4">
                    <span>Height:</span>
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

        {/* Right Sidebar - Time Controls - Second on mobile */}
        <div className="order-3 lg:order-3">
          <TimeControls />

          {/* Quick Stats */}
          <div className="card mt-4">
            <h3 className="font-medium text-gray-900 mb-3">Current Analysis</h3>
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
          </div>
        </div>
      </div>

      {/* Actions - Responsive: full width on mobile */}
      <div className="mt-6 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        <button onClick={() => setCurrentStep('editor')} className="btn-outline order-2 sm:order-1">
          Back to Editor
        </button>
        <button onClick={handleViewResults} className="btn-primary order-1 sm:order-2">
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
