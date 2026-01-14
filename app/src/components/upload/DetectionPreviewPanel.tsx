import { useState, useEffect, useRef } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { useImageAnalysisWorker } from '../../hooks/useImageAnalysisWorker';
import { ImportConfirmationModal, ImportSuccessToast } from './ImportConfirmationModal';
import type { DetectedBuilding, DetectedAmenity, AmenityType, ImportSummary } from '../../types';

const AMENITY_LABELS: Record<AmenityType, string> = {
  swimming_pool: 'Swimming Pool',
  tennis_court: 'Tennis Court',
  basketball_court: 'Basketball Court',
  playground: 'Playground',
  clubhouse: 'Clubhouse',
  parking: 'Parking',
  garden: 'Garden',
  water_body: 'Water Body',
  jogging_track: 'Jogging Track',
  unknown: 'Unknown',
};

const AMENITY_ICONS: Record<AmenityType, string> = {
  swimming_pool: '🏊',
  tennis_court: '🎾',
  basketball_court: '🏀',
  playground: '🎪',
  clubhouse: '🏛️',
  parking: '🅿️',
  garden: '🌳',
  water_body: '💧',
  jogging_track: '🏃',
  unknown: '❓',
};

export function DetectionPreviewPanel() {
  const {
    project,
    detectionResult,
    setDetectionResult,
    toggleDetectedBuilding,
    selectAllDetectedBuildings,
    toggleDetectedAmenity,
    selectAllDetectedAmenities,
    importSelectedElements,
    setCurrentStep,
  } = useProjectStore();

  // Use worker-based analysis with progressive updates
  const {
    isAnalyzing,
    progress,
    partialResults,
    analyze,
    cancel,
  } = useImageAnalysisWorker();

  const image = project.image;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [activeTab, setActiveTab] = useState<'buildings' | 'amenities' | 'other'>('buildings');
  const analysisStartedRef = useRef(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);

  // Run analysis when image is available
  useEffect(() => {
    if (image && !detectionResult && !isAnalyzing && !analysisStartedRef.current) {
      analysisStartedRef.current = true;
      runAnalysis();
    }
  }, [image, detectionResult, isAnalyzing]);

  const runAnalysis = async () => {
    if (!image) return;

    try {
      const result = await analyze(image.dataUrl);
      setDetectionResult(result);
    } catch (error) {
      console.error('Image analysis failed:', error);
    }
  };

  // Reset the started ref when image changes
  useEffect(() => {
    analysisStartedRef.current = false;
  }, [image?.dataUrl]);

  // Draw detection overlay on canvas
  useEffect(() => {
    if (!canvasRef.current || !image || !detectionResult || !showOverlay) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw building outlines
    detectionResult.buildings.forEach((building) => {
      ctx.beginPath();
      ctx.strokeStyle = building.selected ? building.color : '#666666';
      ctx.lineWidth = building.selected ? 3 : 1;
      ctx.fillStyle = building.selected
        ? `${building.color}30`
        : 'rgba(100, 100, 100, 0.1)';

      const { footprint } = building;
      if (footprint.length > 0) {
        ctx.moveTo(footprint[0].x, footprint[0].y);
        footprint.forEach((point) => ctx.lineTo(point.x, point.y));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      // Draw label
      ctx.fillStyle = building.selected ? building.color : '#666666';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        building.suggestedName,
        building.centroid.x,
        building.centroid.y
      );
    });

    // Draw amenities
    detectionResult.amenities.forEach((amenity) => {
      const icon = AMENITY_ICONS[amenity.type];
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(icon, amenity.position.x, amenity.position.y);
    });

    // Draw roads
    ctx.strokeStyle = '#888888';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    detectionResult.roads.forEach((road) => {
      if (road.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(road[0].x, road[0].y);
      road.forEach((point) => ctx.lineTo(point.x, point.y));
      ctx.stroke();
    });
    ctx.setLineDash([]);

    // Draw vegetation areas
    ctx.fillStyle = 'rgba(34, 197, 94, 0.2)';
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 1;
    detectionResult.vegetation.forEach((area) => {
      if (area.length < 3) return;
      ctx.beginPath();
      ctx.moveTo(area[0].x, area[0].y);
      area.forEach((point) => ctx.lineTo(point.x, point.y));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });

    // Draw water bodies
    ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1;
    detectionResult.waterBodies.forEach((water) => {
      if (water.length < 3) return;
      ctx.beginPath();
      ctx.moveTo(water[0].x, water[0].y);
      water.forEach((point) => ctx.lineTo(point.x, point.y));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });

    // Draw compass indicator
    if (detectionResult.compass) {
      const { position, northAngle } = detectionResult.compass;
      ctx.save();
      ctx.translate(position.x, position.y);
      ctx.rotate((northAngle * Math.PI) / 180);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(0, -15);
      ctx.lineTo(5, 5);
      ctx.lineTo(-5, 5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#333';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('N', 0, -20);
      ctx.restore();
    }
  }, [image, detectionResult, showOverlay]);

  const selectedBuildingCount = detectionResult?.buildings.filter((b) => b.selected).length || 0;
  const totalBuildingCount = detectionResult?.buildings.length || 0;
  const selectedAmenityCount = detectionResult?.amenities.filter((a) => a.selected).length || 0;
  const totalAmenityCount = detectionResult?.amenities.length || 0;
  const totalSelectedCount = selectedBuildingCount + selectedAmenityCount;

  // Handle import confirmation
  const handleImportAndContinue = () => {
    setShowImportModal(true);
  };

  const handleConfirmImport = () => {
    const summary = importSelectedElements();
    setImportSummary(summary);
    setShowImportModal(false);
    setCurrentStep('setup');
  };

  if (!image) return null;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Image with Detection Overlay */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900">Detected Elements</h3>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showOverlay}
                onChange={(e) => setShowOverlay(e.target.checked)}
                className="rounded border-gray-300"
              />
              Show overlay
            </label>
          </div>

          <div className="relative bg-gray-100 rounded-lg overflow-hidden">
            <img
              src={image.dataUrl}
              alt="Site plan"
              className="w-full h-auto"
            />
            {showOverlay && (
              <canvas
                ref={canvasRef}
                width={image.width}
                height={image.height}
                className="absolute inset-0 w-full h-full pointer-events-none"
              />
            )}

            {isAnalyzing && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <div className="bg-white rounded-xl p-6 text-center max-w-sm w-full mx-4 shadow-2xl">
                  {/* Progress Circle */}
                  <div className="relative w-16 h-16 mx-auto mb-4">
                    <svg className="w-16 h-16 transform -rotate-90">
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        fill="none"
                        stroke="#E5E7EB"
                        strokeWidth="4"
                      />
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        fill="none"
                        stroke="#3B82F6"
                        strokeWidth="4"
                        strokeDasharray={`${progress.percent * 1.76} 176`}
                        strokeLinecap="round"
                        className="transition-all duration-300"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-gray-700">
                      {progress.percent}%
                    </span>
                  </div>

                  {/* Progress Message */}
                  <p className="text-gray-900 font-medium mb-1">{progress.message}</p>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mb-3 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>

                  {/* Stage Indicators */}
                  <div className="flex justify-center gap-1.5 mb-4">
                    {['buildings', 'amenities', 'roads', 'vegetation', 'complete'].map((stage, i) => (
                      <div
                        key={stage}
                        className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                          progress.percent >= (i + 1) * 20
                            ? 'bg-blue-500'
                            : 'bg-gray-300'
                        }`}
                        title={stage.charAt(0).toUpperCase() + stage.slice(1)}
                      />
                    ))}
                  </div>

                  {/* Partial Results Preview */}
                  {(partialResults.buildings as DetectedBuilding[] | undefined)?.length ? (
                    <p className="text-xs text-green-600 mb-3">
                      Found {(partialResults.buildings as DetectedBuilding[]).length} building(s) so far...
                    </p>
                  ) : null}

                  {/* Cancel Button */}
                  <button
                    onClick={cancel}
                    className="text-sm text-gray-500 hover:text-gray-700 underline"
                  >
                    Cancel and skip detection
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-4 text-xs">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-blue-500/30 border border-blue-500 rounded" />
              Buildings
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-green-500/20 border border-green-500 rounded" />
              Vegetation
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-blue-400/30 border border-blue-400 rounded" />
              Water
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 border-2 border-dashed border-gray-500 rounded" />
              Roads
            </span>
          </div>
        </div>

        {/* Detection Results Panel */}
        <div className="card">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 mb-4">
            <button
              className={`flex-1 py-2 text-sm font-medium border-b-2 ${
                activeTab === 'buildings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('buildings')}
            >
              Buildings ({totalBuildingCount})
              {selectedBuildingCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-600 rounded-full">
                  {selectedBuildingCount}
                </span>
              )}
            </button>
            <button
              className={`flex-1 py-2 text-sm font-medium border-b-2 ${
                activeTab === 'amenities'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('amenities')}
            >
              Amenities ({totalAmenityCount})
              {selectedAmenityCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-green-100 text-green-600 rounded-full">
                  {selectedAmenityCount}
                </span>
              )}
            </button>
            <button
              className={`flex-1 py-2 text-sm font-medium border-b-2 ${
                activeTab === 'other'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('other')}
            >
              Other
            </button>
          </div>

          {/* Buildings Tab */}
          {activeTab === 'buildings' && (
            <div>
              {totalBuildingCount > 0 && (
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-500">
                    {selectedBuildingCount} of {totalBuildingCount} selected
                  </span>
                  <div className="flex gap-2">
                    <button
                      className="text-xs text-blue-600 hover:underline"
                      onClick={() => selectAllDetectedBuildings(true)}
                    >
                      Select all
                    </button>
                    <button
                      className="text-xs text-gray-500 hover:underline"
                      onClick={() => selectAllDetectedBuildings(false)}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {/* Show skeleton loading during analysis */}
                {isAnalyzing && !detectionResult && (
                  <>
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3 p-2 bg-gray-50 rounded animate-pulse">
                        <div className="w-4 h-4 bg-gray-200 rounded" />
                        <div className="w-4 h-4 bg-gray-200 rounded" />
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded w-24 mb-1" />
                          <div className="h-3 bg-gray-200 rounded w-32" />
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {/* Show partial results during analysis */}
                {isAnalyzing && (partialResults.buildings as DetectedBuilding[] | undefined)?.map((building) => (
                  <div
                    key={building.id}
                    className="flex items-center gap-3 p-2 bg-blue-50 border border-blue-200 rounded opacity-75"
                  >
                    <span className="w-4 h-4 border-2 border-blue-300 rounded animate-pulse" />
                    <span
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: building.color }}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-700">{building.suggestedName}</p>
                      <p className="text-xs text-gray-500">Detecting...</p>
                    </div>
                  </div>
                ))}

                {/* Show final results */}
                {detectionResult?.buildings.map((building) => (
                  <BuildingItem
                    key={building.id}
                    building={building}
                    onToggle={() => toggleDetectedBuilding(building.id)}
                  />
                ))}

                {!isAnalyzing && totalBuildingCount === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No buildings detected. You can manually trace them in the editor.
                  </p>
                )}
              </div>

              {/* Info about selection */}
              {totalBuildingCount > 0 && selectedBuildingCount === 0 && (
                <p className="mt-3 text-xs text-gray-400 text-center">
                  Select buildings above to import them to your project
                </p>
              )}
            </div>
          )}

          {/* Amenities Tab */}
          {activeTab === 'amenities' && (
            <div>
              {totalAmenityCount > 0 && (
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-500">
                    {selectedAmenityCount} of {totalAmenityCount} selected
                  </span>
                  <div className="flex gap-2">
                    <button
                      className="text-xs text-green-600 hover:underline"
                      onClick={() => selectAllDetectedAmenities(true)}
                    >
                      Select all
                    </button>
                    <button
                      className="text-xs text-gray-500 hover:underline"
                      onClick={() => selectAllDetectedAmenities(false)}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {detectionResult?.amenities.map((amenity) => (
                  <AmenityItem
                    key={amenity.id}
                    amenity={amenity}
                    onToggle={() => toggleDetectedAmenity(amenity.id)}
                  />
                ))}

                {!isAnalyzing && totalAmenityCount === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No amenities detected in this image.
                  </p>
                )}
              </div>

              {/* Info about selection */}
              {totalAmenityCount > 0 && selectedAmenityCount === 0 && (
                <p className="mt-3 text-xs text-gray-400 text-center">
                  Select amenities above to include them in your project
                </p>
              )}
            </div>
          )}

          {/* Other Tab */}
          {activeTab === 'other' && (
            <div className="space-y-4">
              {/* Compass */}
              <div className="p-3 bg-gray-50 rounded">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Compass / North Direction
                </h4>
                {detectionResult?.compass ? (
                  <div className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span className="text-sm">
                      Detected (confidence: {Math.round(detectionResult.compass.confidence * 100)}%)
                    </span>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    Not detected - set manually in setup
                  </p>
                )}
              </div>

              {/* Roads */}
              <div className="p-3 bg-gray-50 rounded">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Roads</h4>
                <p className="text-sm text-gray-600">
                  {detectionResult?.roads.length || 0} road segment(s) detected
                </p>
              </div>

              {/* Vegetation */}
              <div className="p-3 bg-gray-50 rounded">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Vegetation Areas
                </h4>
                <p className="text-sm text-gray-600">
                  {detectionResult?.vegetation.length || 0} area(s) detected
                </p>
              </div>

              {/* Water Bodies */}
              <div className="p-3 bg-gray-50 rounded">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Water Bodies
                </h4>
                <p className="text-sm text-gray-600">
                  {detectionResult?.waterBodies.length || 0} body(ies) detected
                </p>
              </div>

              {/* Image Stats */}
              {detectionResult?.imageStats && (
                <div className="p-3 bg-gray-50 rounded">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Image Analysis
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Brightness:</span>
                      <span className="ml-1">
                        {Math.round(detectionResult.imageStats.brightness * 100)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Contrast:</span>
                      <span className="ml-1">
                        {Math.round(detectionResult.imageStats.contrast * 100)}%
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {detectionResult.imageStats.dominantColors.slice(0, 5).map((color, i) => (
                      <span
                        key={i}
                        className="w-6 h-6 rounded border border-gray-300"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Selection Summary */}
      {totalSelectedCount > 0 && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-blue-900">
                Selected for import:
              </span>
              {selectedBuildingCount > 0 && (
                <span className="text-sm text-blue-700">
                  {selectedBuildingCount} building{selectedBuildingCount !== 1 ? 's' : ''}
                </span>
              )}
              {selectedAmenityCount > 0 && (
                <span className="text-sm text-blue-700">
                  {selectedAmenityCount} amenit{selectedAmenityCount !== 1 ? 'ies' : 'y'}
                </span>
              )}
            </div>
            <button
              className="text-xs text-blue-600 hover:underline"
              onClick={() => {
                selectAllDetectedBuildings(false);
                selectAllDetectedAmenities(false);
              }}
            >
              Clear all
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 flex justify-between items-center">
        <button
          className="btn-outline"
          onClick={() => {
            analysisStartedRef.current = false;
            runAnalysis();
          }}
          disabled={isAnalyzing}
        >
          {isAnalyzing ? 'Analyzing...' : 'Re-analyze Image'}
        </button>
        <div className="flex gap-3">
          <button
            className="btn-outline"
            onClick={() => setCurrentStep('setup')}
          >
            Skip to Setup
          </button>
          <button
            className="btn-primary flex items-center gap-2"
            onClick={handleImportAndContinue}
          >
            {totalSelectedCount > 0 ? (
              <>
                Import & Continue
                <span className="px-1.5 py-0.5 text-xs bg-white/20 rounded">
                  {totalSelectedCount}
                </span>
              </>
            ) : (
              'Continue to Setup'
            )}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Import Confirmation Modal */}
      <ImportConfirmationModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onConfirm={handleConfirmImport}
      />

      {/* Import Success Toast */}
      {importSummary && (
        <ImportSuccessToast
          summary={importSummary}
          onClose={() => setImportSummary(null)}
        />
      )}
    </div>
  );
}

// Building item component
function BuildingItem({
  building,
  onToggle,
}: {
  building: DetectedBuilding;
  onToggle: () => void;
}) {
  return (
    <label
      className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
        building.selected ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 hover:bg-gray-100'
      }`}
    >
      <input
        type="checkbox"
        checked={building.selected}
        onChange={onToggle}
        className="rounded border-gray-300 text-blue-500"
      />
      <span
        className="w-4 h-4 rounded"
        style={{ backgroundColor: building.color }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">
          {building.suggestedName}
        </p>
        <p className="text-xs text-gray-500">
          {Math.round(building.area)} px² • {Math.round(building.confidence * 100)}% confidence
        </p>
      </div>
    </label>
  );
}

// Amenity item component
function AmenityItem({
  amenity,
  onToggle,
}: {
  amenity: DetectedAmenity;
  onToggle: () => void;
}) {
  return (
    <label
      className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
        amenity.selected ? 'bg-green-50 border border-green-200' : 'bg-gray-50 hover:bg-gray-100'
      }`}
    >
      <input
        type="checkbox"
        checked={amenity.selected}
        onChange={onToggle}
        className="rounded border-gray-300 text-green-500"
      />
      <span className="text-xl">{AMENITY_ICONS[amenity.type]}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">
          {amenity.label || AMENITY_LABELS[amenity.type]}
        </p>
        <p className="text-xs text-gray-500">
          {Math.round(amenity.confidence * 100)}% confidence
        </p>
      </div>
    </label>
  );
}
