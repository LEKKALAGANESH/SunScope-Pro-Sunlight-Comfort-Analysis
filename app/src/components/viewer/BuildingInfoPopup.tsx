/**
 * Building Info Popup - Information panel for selected buildings
 *
 * Phase 3 Implementation:
 * - Shows detailed building information on selection
 * - Floor-specific data when hovering floors
 * - Sunlight analysis summary
 * - Quick actions (focus, hide, etc.)
 */

import { useEffect, useRef, useState } from 'react';
import type { Building } from '../../types';

export interface BuildingInfoPopupProps {
  /** The selected building to display info for */
  building: Building | null;
  /** Currently hovered floor number */
  hoveredFloor?: number | null;
  /** Sun position info */
  sunPosition?: {
    altitude: number;
    azimuth: number;
    isAboveHorizon: boolean;
  } | null;
  /** Screen position to anchor popup (from 3D projection) */
  position?: { x: number; y: number } | null;
  /** Callback when close button is clicked */
  onClose?: () => void;
  /** Callback when focus button is clicked */
  onFocus?: (building: Building) => void;
  /** Callback when a floor is selected */
  onSelectFloor?: (floor: number | undefined) => void;
  /** Whether the popup is docked (fixed position) vs floating */
  docked?: boolean;
}

export function BuildingInfoPopup({
  building,
  hoveredFloor,
  sunPosition,
  position,
  onClose,
  onFocus,
  onSelectFloor,
  docked = false,
}: BuildingInfoPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'floors' | 'analysis'>('info');

  // Reset tab when building changes
  useEffect(() => {
    setActiveTab('info');
  }, [building?.id]);

  if (!building) return null;

  // Calculate estimated sunlight for floors
  const getFloorSunlightEstimate = (floor: number): 'high' | 'medium' | 'low' => {
    const ratio = floor / building.floors;
    if (ratio > 0.7) return 'high';
    if (ratio > 0.4) return 'medium';
    return 'low';
  };

  const getSunlightColor = (level: 'high' | 'medium' | 'low'): string => {
    switch (level) {
      case 'high': return 'text-green-600 bg-green-50';
      case 'medium': return 'text-amber-600 bg-amber-50';
      case 'low': return 'text-orange-600 bg-orange-50';
    }
  };

  // Popup style based on docked vs floating
  const popupStyle = docked
    ? {}
    : position
      ? {
          left: `${Math.min(position.x + 15, window.innerWidth - 280)}px`,
          top: `${Math.min(position.y - 10, window.innerHeight - 400)}px`,
        }
      : { right: '1rem', top: '5rem' };

  return (
    <div
      ref={popupRef}
      className={`
        ${docked ? '' : 'absolute z-20'}
        bg-white rounded-xl shadow-xl border border-gray-200
        w-64 overflow-hidden
        animate-in fade-in slide-in-from-top-2 duration-200
      `}
      style={popupStyle}
    >
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded shadow-sm"
              style={{ backgroundColor: building.color }}
            />
            <h3 className="font-semibold text-gray-900 truncate max-w-[140px]">
              {building.name}
            </h3>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Close popup"
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-2">
          {(['info', 'floors', 'analysis'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                px-2 py-1 text-xs font-medium rounded transition-colors
                ${activeTab === tab
                  ? 'bg-amber-100 text-amber-800'
                  : 'text-gray-500 hover:bg-gray-100'}
              `}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Info Tab */}
        {activeTab === 'info' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-gray-500 text-xs">Height</div>
                <div className="font-semibold text-gray-900">{building.totalHeight}m</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-gray-500 text-xs">Floors</div>
                <div className="font-semibold text-gray-900">{building.floors}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-gray-500 text-xs">Floor Height</div>
                <div className="font-semibold text-gray-900">{building.floorHeight}m</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-gray-500 text-xs">Vertices</div>
                <div className="font-semibold text-gray-900">{building.footprint.length}</div>
              </div>
            </div>

            {/* Current Sun Status */}
            {sunPosition && (
              <div className={`
                rounded-lg p-2 text-sm
                ${sunPosition.isAboveHorizon ? 'bg-amber-50' : 'bg-gray-100'}
              `}>
                <div className="flex items-center gap-2">
                  {sunPosition.isAboveHorizon ? (
                    <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0z" />
                    </svg>
                  ) : (
                    <span className="text-gray-400">
                      ☾
                    </span>
                  )}
                  <span className={sunPosition.isAboveHorizon ? 'text-amber-700' : 'text-gray-500'}>
                    {sunPosition.isAboveHorizon
                      ? `Sun at ${sunPosition.altitude.toFixed(0)}° altitude`
                      : 'Sun below horizon'}
                  </span>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="flex gap-2 pt-2">
              {onFocus && (
                <button
                  onClick={() => onFocus(building)}
                  className="flex-1 px-3 py-1.5 text-xs font-medium bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 transition-colors flex items-center justify-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                  </svg>
                  Focus
                </button>
              )}
            </div>
          </div>
        )}

        {/* Floors Tab */}
        {activeTab === 'floors' && (
          <div className="space-y-2">
            <div className="text-xs text-gray-500 mb-2">
              Click a floor to analyze it specifically
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {/* All floors option */}
              <button
                onClick={() => onSelectFloor?.(undefined)}
                className="w-full text-left px-2 py-1.5 rounded-lg text-sm hover:bg-gray-100 transition-colors flex items-center justify-between"
              >
                <span className="text-gray-700">All Floors</span>
              </button>

              {/* Individual floors (top to bottom) */}
              {Array.from({ length: building.floors }, (_, i) => building.floors - i).map((floor) => {
                const sunlight = getFloorSunlightEstimate(floor);
                const isHovered = hoveredFloor === floor;

                return (
                  <button
                    key={floor}
                    onClick={() => onSelectFloor?.(floor)}
                    className={`
                      w-full text-left px-2 py-1.5 rounded-lg text-sm transition-colors
                      flex items-center justify-between
                      ${isHovered ? 'bg-amber-100 ring-1 ring-amber-300' : 'hover:bg-gray-100'}
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-6 text-gray-400 text-xs">F{floor}</span>
                      <span className="text-gray-700">
                        {((floor - 1) * building.floorHeight).toFixed(0)}-{(floor * building.floorHeight).toFixed(0)}m
                      </span>
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${getSunlightColor(sunlight)}`}>
                      {sunlight}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Analysis Tab */}
        {activeTab === 'analysis' && (
          <div className="space-y-3">
            <div className="text-xs text-gray-500">
              Estimated sunlight exposure based on building height and position.
            </div>

            {/* Sunlight Distribution Chart */}
            <div className="space-y-1">
              <div className="text-xs font-medium text-gray-700">Sunlight Distribution</div>
              <div className="h-20 bg-gray-50 rounded-lg overflow-hidden flex items-end p-2 gap-0.5">
                {Array.from({ length: building.floors }, (_, i) => {
                  const floor = i + 1;
                  const ratio = floor / building.floors;
                  const height = 30 + ratio * 70;  // Min 30%, max 100%
                  const sunlight = getFloorSunlightEstimate(floor);
                  const colors = {
                    high: 'bg-green-400',
                    medium: 'bg-amber-400',
                    low: 'bg-orange-400',
                  };

                  return (
                    <div
                      key={floor}
                      className={`flex-1 rounded-t transition-all ${colors[sunlight]}`}
                      style={{ height: `${height}%` }}
                      title={`Floor ${floor}: ${sunlight} sunlight`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>Floor 1</span>
                <span>Floor {building.floors}</span>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-1 text-center">
              <div className="bg-green-50 rounded p-1.5">
                <div className="text-green-600 font-semibold text-sm">
                  {Math.round(building.floors * 0.3)}
                </div>
                <div className="text-green-600 text-xs">High</div>
              </div>
              <div className="bg-amber-50 rounded p-1.5">
                <div className="text-amber-600 font-semibold text-sm">
                  {Math.round(building.floors * 0.3)}
                </div>
                <div className="text-amber-600 text-xs">Medium</div>
              </div>
              <div className="bg-orange-50 rounded p-1.5">
                <div className="text-orange-600 font-semibold text-sm">
                  {Math.round(building.floors * 0.4)}
                </div>
                <div className="text-orange-600 text-xs">Low</div>
              </div>
            </div>

            <p className="text-xs text-gray-400 italic">
              Run full analysis in Results for detailed metrics.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default BuildingInfoPopup;
