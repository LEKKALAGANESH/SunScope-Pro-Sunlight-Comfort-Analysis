import { useProjectStore } from '../../store/projectStore';
import type { ImportSummary, AmenityType } from '../../types';

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

interface ImportConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ImportConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
}: ImportConfirmationModalProps) {
  const { detectionResult } = useProjectStore();

  if (!isOpen) return null;

  const selectedBuildings = detectionResult?.buildings.filter((b) => b.selected) || [];
  const selectedAmenities = detectionResult?.amenities.filter((a) => a.selected) || [];
  const hasCompass = detectionResult?.compass && detectionResult.compass.confidence > 0.5;
  const hasScale = detectionResult?.scale && detectionResult.scale.suggestedMeters && detectionResult.scale.confidence > 0.5;

  const totalItems = selectedBuildings.length + selectedAmenities.length + (hasCompass ? 1 : 0) + (hasScale ? 1 : 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <h2 className="text-xl font-semibold text-white">
            Confirm Import
          </h2>
          <p className="text-blue-100 text-sm mt-1">
            Review what will be imported to your project
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-4 max-h-96 overflow-y-auto">
          {totalItems === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <p className="text-gray-500">No items selected for import.</p>
              <p className="text-gray-400 text-sm mt-1">
                Select buildings or amenities to import them to your project.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Buildings Section */}
              {selectedBuildings.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <span className="w-5 h-5 bg-blue-100 rounded flex items-center justify-center">
                      <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm0 2h12v8H4V6z" />
                      </svg>
                    </span>
                    Buildings ({selectedBuildings.length})
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    {selectedBuildings.map((building) => (
                      <div key={building.id} className="flex items-center gap-3">
                        <span
                          className="w-3 h-3 rounded"
                          style={{ backgroundColor: building.color }}
                        />
                        <span className="text-sm text-gray-700 flex-1">
                          {building.suggestedName}
                        </span>
                        <span className="text-xs text-gray-400">
                          {Math.round(building.confidence * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Amenities Section */}
              {selectedAmenities.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <span className="w-5 h-5 bg-green-100 rounded flex items-center justify-center text-xs">
                      🏊
                    </span>
                    Amenities ({selectedAmenities.length})
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    {selectedAmenities.map((amenity) => (
                      <div key={amenity.id} className="flex items-center gap-3">
                        <span className="text-base">{AMENITY_ICONS[amenity.type]}</span>
                        <span className="text-sm text-gray-700 flex-1">
                          {amenity.label || AMENITY_LABELS[amenity.type]}
                        </span>
                        <span className="text-xs text-gray-400">
                          {Math.round(amenity.confidence * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Auto-Applied Settings */}
              {(hasCompass || hasScale) && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <span className="w-5 h-5 bg-amber-100 rounded flex items-center justify-center">
                      <svg className="w-3 h-3 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                      </svg>
                    </span>
                    Auto-Applied Settings
                  </h3>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                    {hasCompass && (
                      <div className="flex items-center gap-3">
                        <span className="text-base">🧭</span>
                        <span className="text-sm text-gray-700 flex-1">
                          North Direction
                        </span>
                        <span className="text-xs text-amber-600 font-medium">
                          {Math.round(detectionResult!.compass!.northAngle)}°
                        </span>
                      </div>
                    )}
                    {hasScale && (
                      <div className="flex items-center gap-3">
                        <span className="text-base">📏</span>
                        <span className="text-sm text-gray-700 flex-1">
                          Scale Reference
                        </span>
                        <span className="text-xs text-amber-600 font-medium">
                          {detectionResult!.scale!.suggestedMeters}m
                        </span>
                      </div>
                    )}
                    <p className="text-xs text-amber-700 mt-2">
                      These settings will be pre-filled. You can adjust them in the Setup step.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Summary Bar */}
        {totalItems > 0 && (
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Total items to import:</span>
              <span className="font-medium text-gray-900">{totalItems}</span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 bg-white border-t border-gray-200 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            {totalItems > 0 ? (
              <>
                Import & Continue
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            ) : (
              <>
                Continue to Setup
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Success toast component for showing import results
interface ImportSuccessToastProps {
  summary: ImportSummary;
  onClose: () => void;
}

export function ImportSuccessToast({ summary, onClose }: ImportSuccessToastProps) {
  const hasContent = summary.buildingsImported > 0 || summary.amenitiesImported > 0 || summary.compassApplied || summary.scaleApplied;

  if (!hasContent) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-sm">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-gray-900">Import Complete</h4>
            <div className="text-sm text-gray-600 mt-1 space-y-0.5">
              {summary.buildingsImported > 0 && (
                <p>{summary.buildingsImported} building{summary.buildingsImported !== 1 ? 's' : ''} imported</p>
              )}
              {summary.amenitiesImported > 0 && (
                <p>{summary.amenitiesImported} amenit{summary.amenitiesImported !== 1 ? 'ies' : 'y'} imported</p>
              )}
              {summary.compassApplied && <p>North direction applied</p>}
              {summary.scaleApplied && <p>Scale reference applied</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
