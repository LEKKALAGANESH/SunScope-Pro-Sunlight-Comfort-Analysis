import { useState } from "react";
import type { Building } from "../../../types";
import type { Tool } from "../types";

interface BuildingListProps {
  buildings: Building[];
  selectedBuildingIds: Set<string>;
  selectedBuildingId: string | undefined;
  buildingToGroup: Map<string, string>;
  onSelectBuilding: (id: string, isShiftHeld: boolean) => void;
  onDeleteBuilding: (building: Building) => void;
  onSelectGroup: (groupId: string) => void;
  setActiveTool: (tool: Tool) => void;
  getGroupColor: (groupId: string) => string | null;
  onShowImportModal: () => void;
  onShowExportModal: () => void;
  onShowBulkEditModal: () => void;
  onDeleteAllBuildings: () => void;
  onPanelToggle?: (isCollapsed: boolean) => void;
}

export function BuildingList({
  buildings,
  selectedBuildingIds,
  selectedBuildingId,
  buildingToGroup,
  onSelectBuilding,
  onDeleteBuilding,
  onSelectGroup,
  setActiveTool,
  getGroupColor,
  onShowImportModal,
  onShowExportModal,
  onShowBulkEditModal,
  onDeleteAllBuildings,
  onPanelToggle,
}: BuildingListProps) {
  const [isCollapsed, setIsCollapsed] = useState(true); // Collapsed by default

  const handleToggle = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    onPanelToggle?.(newState);
  };

  return (
    <div className="card overflow-hidden">
      {/* Collapsible Header */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between py-1 -my-1 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 rounded"
        aria-expanded={!isCollapsed}
      >
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-gray-900">Buildings</h4>
          {buildings.length > 0 && (
            <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
              {buildings.length}
            </span>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
            isCollapsed ? '' : 'rotate-180'
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Collapsible Content */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[500px] opacity-100'
        }`}
      >
        <div className="pt-3">
          {/* Action Buttons */}
          <div className="flex gap-1 flex-wrap justify-end mb-3">
            <button
              onClick={onShowImportModal}
              className="text-xs text-green-600 hover:underline"
              title="Import buildings from JSON"
            >
              Import
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={onShowExportModal}
              disabled={buildings.length === 0}
              className="text-xs text-green-600 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
              title="Export buildings to JSON"
            >
              Export
            </button>
            {buildings.length > 0 && (
              <>
                <span className="text-gray-300">|</span>
                <button
                  onClick={onShowBulkEditModal}
                  className="text-xs text-blue-600 hover:underline"
                  title="Edit all buildings"
                >
                  Bulk Edit
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={onDeleteAllBuildings}
                  className="text-xs text-red-500 hover:underline"
                  title="Delete all buildings"
                >
                  Clear All
                </button>
              </>
            )}
          </div>

      {buildings.length === 0 ? (
        <p className="text-sm text-gray-500">
          No buildings yet. Use the Draw tool to create one.
        </p>
      ) : (
        <ul
          className="space-y-2 max-h-48 overflow-y-auto"
          role="listbox"
          aria-label="Buildings list"
          aria-multiselectable="true"
          aria-activedescendant={
            selectedBuildingId ? `building-${selectedBuildingId}` : undefined
          }
        >
          {buildings.map((building) => {
            const isSelected = selectedBuildingIds.has(building.id);
            const isMultiSelected = isSelected && selectedBuildingIds.size > 1;
            const groupId = buildingToGroup.get(building.id);
            const groupColor = groupId ? getGroupColor(groupId) : null;

            return (
              <li
                key={building.id}
                id={`building-${building.id}`}
                role="option"
                aria-selected={isSelected}
                tabIndex={isSelected ? 0 : -1}
                onClick={(e) => {
                  onSelectBuilding(building.id, e.shiftKey);
                  setActiveTool("select");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Delete") {
                    e.preventDefault();
                    onDeleteBuilding(building);
                  }
                }}
                className={`p-2 rounded-lg cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 ${
                  isMultiSelected
                    ? "bg-cyan-100 border border-cyan-300"
                    : isSelected
                    ? "bg-amber-100 border border-amber-300"
                    : "bg-gray-50 hover:bg-gray-100"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: building.color }}
                    aria-hidden="true"
                  />
                  <span className="text-sm font-medium">{building.name}</span>
                  {groupId && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectGroup(groupId);
                      }}
                      className="ml-auto px-1.5 py-0.5 rounded-full text-[9px] font-medium text-white"
                      style={{ backgroundColor: groupColor || "#6b7280" }}
                      title="Click to select group"
                    >
                      G
                    </button>
                  )}
                  {isMultiSelected && !groupId && (
                    <span className="ml-auto text-[10px] text-cyan-600 bg-cyan-200 px-1.5 py-0.5 rounded-full">
                      ✓
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {building.floors} floors, {building.floorHeight}m each
                </p>
              </li>
            );
          })}
        </ul>
      )}
        </div>
      </div>
    </div>
  );
}
