import { useState } from "react";
import type { Building } from "../../../types";
import { validators } from "../../../utils/errors";
import type {
  BuildingPreset,
  BuildingValidationErrors,
  BulkEditValidationErrors,
} from "../types";
import { BUILDING_PRESETS } from "../types";

interface BuildingPropertiesProps {
  selectedBuildingIds: Set<string>;
  selectedBuilding: Building | undefined;
  onUpdateBuilding: (id: string, updates: Partial<Building>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onCreateGroup: () => void;
  onUngroupSelected: () => void;
  onShowArrayModal: () => void;
  buildingToGroup: Map<string, string>;
}

export function BuildingProperties({
  selectedBuildingIds,
  selectedBuilding,
  onUpdateBuilding,
  onDuplicate,
  onDelete,
  onCreateGroup,
  onUngroupSelected,
  onShowArrayModal,
  buildingToGroup,
}: BuildingPropertiesProps) {
  const [validationErrors, setValidationErrors] =
    useState<BuildingValidationErrors>({});
  const [bulkEditValues, setBulkEditValues] = useState({
    floors: "",
    floorHeight: "",
  });
  const [bulkValidationErrors, setBulkValidationErrors] =
    useState<BulkEditValidationErrors>({});
  const [showPresetsDropdown, setShowPresetsDropdown] = useState(false);

  // Check if any selected buildings are in a group
  const hasGroupedBuildings = Array.from(selectedBuildingIds).some((id) =>
    buildingToGroup.has(id)
  );

  // Validate floor count
  const validateFloors = (value: number): boolean => {
    if (!validators.floorCount(value)) {
      setValidationErrors((prev) => ({
        ...prev,
        floors: "Must be between 1 and 100",
      }));
      return false;
    }
    setValidationErrors((prev) => ({ ...prev, floors: undefined }));
    return true;
  };

  // Validate floor height
  const validateFloorHeight = (value: number): boolean => {
    if (!validators.floorHeight(value)) {
      setValidationErrors((prev) => ({
        ...prev,
        floorHeight: "Must be between 2 and 10 meters",
      }));
      return false;
    }
    setValidationErrors((prev) => ({ ...prev, floorHeight: undefined }));
    return true;
  };

  // Apply a building preset
  const applyPreset = (preset: BuildingPreset) => {
    if (!selectedBuilding) return;
    onUpdateBuilding(selectedBuilding.id, {
      floors: preset.floors,
      floorHeight: preset.floorHeight,
      color: preset.color,
    });
    setShowPresetsDropdown(false);
  };

  // Apply bulk edit to all selected buildings
  const applyBulkEdit = () => {
    const updates: Partial<Building> = {};

    if (bulkEditValues.floors) {
      const floors = parseInt(bulkEditValues.floors);
      if (!isNaN(floors) && validators.floorCount(floors)) {
        updates.floors = floors;
      } else {
        setBulkValidationErrors((prev) => ({
          ...prev,
          floors: "Invalid floor count",
        }));
        return;
      }
    }

    if (bulkEditValues.floorHeight) {
      const height = parseFloat(bulkEditValues.floorHeight);
      if (!isNaN(height) && validators.floorHeight(height)) {
        updates.floorHeight = height;
      } else {
        setBulkValidationErrors((prev) => ({
          ...prev,
          floorHeight: "Invalid floor height",
        }));
        return;
      }
    }

    if (Object.keys(updates).length > 0) {
      selectedBuildingIds.forEach((id) => {
        onUpdateBuilding(id, updates);
      });
      setBulkEditValues({ floors: "", floorHeight: "" });
      setBulkValidationErrors({});
    }
  };

  if (selectedBuildingIds.size === 0) {
    return null;
  }

  return (
    <div className="card">
      <h4 className="font-medium text-gray-900 mb-3">
        {selectedBuildingIds.size === 1
          ? "Properties"
          : `${selectedBuildingIds.size} Buildings Selected`}
      </h4>

      {/* Multi-select actions */}
      {selectedBuildingIds.size > 1 && (
        <div className="mb-4 p-3 bg-cyan-50 rounded-lg border border-cyan-200">
          <p className="text-xs text-cyan-800 mb-2">
            Edit properties to apply to all {selectedBuildingIds.size} buildings
          </p>
          <div className="flex gap-2 mb-2">
            <button
              onClick={onDuplicate}
              className="flex-1 text-xs px-2 py-1.5 bg-cyan-100 hover:bg-cyan-200 rounded text-cyan-800 transition-colors"
            >
              Duplicate All
            </button>
            <button
              onClick={onDelete}
              className="flex-1 text-xs px-2 py-1.5 bg-red-100 hover:bg-red-200 rounded text-red-800 transition-colors"
            >
              Delete All
            </button>
          </div>
          {/* Grouping actions */}
          <div className="flex gap-2 mb-2">
            <button
              onClick={onCreateGroup}
              className="flex-1 text-xs px-2 py-1.5 bg-purple-100 hover:bg-purple-200 rounded text-purple-800 transition-colors"
            >
              Create Group
            </button>
            {hasGroupedBuildings && (
              <button
                onClick={onUngroupSelected}
                className="flex-1 text-xs px-2 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-gray-800 transition-colors"
              >
                Ungroup
              </button>
            )}
          </div>
          {/* Array tool */}
          <button
            onClick={onShowArrayModal}
            className="w-full text-xs px-2 py-1.5 bg-indigo-100 hover:bg-indigo-200 rounded text-indigo-800 transition-colors"
          >
            Array Duplicate...
          </button>
          {/* Bulk edit fields */}
          <div className="mt-3 pt-3 border-t border-cyan-200 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label text-[10px]">Set All Floors</label>
                <input
                  type="number"
                  value={bulkEditValues.floors}
                  onChange={(e) =>
                    setBulkEditValues((prev) => ({
                      ...prev,
                      floors: e.target.value,
                    }))
                  }
                  placeholder="e.g., 10"
                  className={`input text-xs ${
                    bulkValidationErrors.floors ? "border-red-500" : ""
                  }`}
                />
              </div>
              <div>
                <label className="label text-[10px]">Set All Heights</label>
                <input
                  type="number"
                  step="0.1"
                  value={bulkEditValues.floorHeight}
                  onChange={(e) =>
                    setBulkEditValues((prev) => ({
                      ...prev,
                      floorHeight: e.target.value,
                    }))
                  }
                  placeholder="e.g., 3.5"
                  className={`input text-xs ${
                    bulkValidationErrors.floorHeight ? "border-red-500" : ""
                  }`}
                />
              </div>
            </div>
            <button
              onClick={applyBulkEdit}
              disabled={!bulkEditValues.floors && !bulkEditValues.floorHeight}
              className="w-full text-xs px-2 py-1.5 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-300 rounded text-white transition-colors"
            >
              Apply to All
            </button>
          </div>
        </div>
      )}

      {/* Single building properties */}
      {selectedBuilding && selectedBuildingIds.size === 1 && (
        <>
          {/* Building preset selector */}
          <div className="mb-4 relative">
            <button
              onClick={() => setShowPresetsDropdown(!showPresetsDropdown)}
              className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <span className="text-sm text-gray-700">Apply Preset</span>
              <svg
                className={`w-4 h-4 text-gray-500 transition-transform ${
                  showPresetsDropdown ? "rotate-180" : ""
                }`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {showPresetsDropdown && (
              <div className="absolute z-10 mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                {BUILDING_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => applyPreset(preset)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                  >
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: preset.color }}
                    />
                    <div>
                      <div className="text-sm font-medium">{preset.name}</div>
                      <div className="text-xs text-gray-500">
                        {preset.floors} floors × {preset.floorHeight}m ={" "}
                        {preset.floors * preset.floorHeight}m
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Building name */}
          <div className="mb-4">
            <label htmlFor="building-name" className="label">
              Name
            </label>
            <input
              id="building-name"
              type="text"
              value={selectedBuilding.name}
              onChange={(e) =>
                onUpdateBuilding(selectedBuilding.id, {
                  name: e.target.value,
                })
              }
              className="input"
            />
          </div>

          {/* Floors */}
          <div className="mb-4">
            <label htmlFor="building-floors" className="label">
              Number of Floors
            </label>
            <input
              id="building-floors"
              type="number"
              min="1"
              max="200"
              value={selectedBuilding.floors}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (validateFloors(value)) {
                  onUpdateBuilding(selectedBuilding.id, {
                    floors: value,
                  });
                }
              }}
              className={`input ${
                validationErrors.floors
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                  : ""
              }`}
              aria-invalid={!!validationErrors.floors}
              aria-describedby={
                validationErrors.floors ? "floors-error" : undefined
              }
            />
            {validationErrors.floors && (
              <p
                id="floors-error"
                className="mt-1 text-xs text-red-600"
                role="alert"
              >
                {validationErrors.floors}
              </p>
            )}
          </div>

          {/* Floor Height */}
          <div className="mb-4">
            <label htmlFor="building-floor-height" className="label">
              Floor Height (m)
            </label>
            <input
              id="building-floor-height"
              type="number"
              min="2"
              max="10"
              step="0.1"
              value={selectedBuilding.floorHeight}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                if (validateFloorHeight(value)) {
                  onUpdateBuilding(selectedBuilding.id, {
                    floorHeight: value,
                  });
                }
              }}
              className={`input ${
                validationErrors.floorHeight
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                  : ""
              }`}
              aria-invalid={!!validationErrors.floorHeight}
              aria-describedby={
                validationErrors.floorHeight ? "floor-height-error" : undefined
              }
            />
            {validationErrors.floorHeight && (
              <p
                id="floor-height-error"
                className="mt-1 text-xs text-red-600"
                role="alert"
              >
                {validationErrors.floorHeight}
              </p>
            )}
          </div>

          {/* Color picker */}
          <div className="mb-4">
            <label htmlFor="building-color" className="label">
              Color
            </label>
            <div className="flex items-center gap-2">
              <input
                id="building-color"
                type="color"
                value={selectedBuilding.color}
                onChange={(e) =>
                  onUpdateBuilding(selectedBuilding.id, {
                    color: e.target.value,
                  })
                }
                className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
              />
              <span className="text-sm text-gray-600">
                {selectedBuilding.color}
              </span>
            </div>
          </div>

          {/* Calculated values */}
          <div className="bg-gray-50 rounded-lg p-3">
            <h5 className="text-xs font-medium text-gray-700 mb-2">
              Calculated Values
            </h5>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">Total Height:</span>
                <span className="ml-1 font-medium">
                  {selectedBuilding.totalHeight.toFixed(1)}m
                </span>
              </div>
              <div>
                <span className="text-gray-500">Floor Area:</span>
                <span className="ml-1 font-medium">
                  {selectedBuilding.area.toFixed(0)} m²
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
