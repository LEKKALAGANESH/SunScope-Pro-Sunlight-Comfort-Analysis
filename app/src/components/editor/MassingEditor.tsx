import { useCallback, useEffect, useState } from "react";
import { useEditorHistory } from "../../hooks/useEditorHistory";
import { useProjectStore } from "../../store/projectStore";
import type { Point2D } from "../../types";
import { ErrorSeverity, validators } from "../../utils/errors";
import { useToast } from "../common/Toast";

// Import types and constants
import type {
  BulkEditValidationErrors,
  EditorSettings,
  ShapeTemplate,
  Tool,
} from "./types";
import { DEFAULT_SETTINGS } from "./types";

// Import hooks
import { useBuildingGroups } from "./hooks/useBuildingGroups";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";

// Import modal components
import { ArrayToolModal } from "./components/ArrayToolModal";
import { BulkEditModal } from "./components/BulkEditModal";
import { ExportModal, ImportModal } from "./components/ImportExportModals";

// Import UI components
import { EditorToolbar } from "./components/EditorToolbar";
import { BuildingList } from "./components/BuildingList";
import { BuildingProperties } from "./components/BuildingProperties";
import { EditorCanvas } from "./components/EditorCanvas";
import { EditorActions } from "./components/EditorActions";

export function MassingEditor() {
  const {
    project,
    addBuilding,
    updateBuilding,
    removeBuilding,
    selectBuilding,
    setCurrentStep,
    detectionResult,
  } = useProjectStore();
  const { image, buildings, site, analysis } = project;
  const { showToast } = useToast();

  // Tool and drawing state
  const [activeTool, setActiveTool] = useState<Tool>("draw");
  const [currentPoints, setCurrentPoints] = useState<Point2D[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ShapeTemplate>("rectangle");
  const [editorSettings, setEditorSettings] = useState<EditorSettings>(DEFAULT_SETTINGS);
  const [shiftKeyHeld, setShiftKeyHeld] = useState(false);

  // Selection state
  const [selectedBuildingIds, setSelectedBuildingIds] = useState<Set<string>>(
    analysis.selectedBuildingId ? new Set([analysis.selectedBuildingId]) : new Set()
  );

  // Vertex editing state
  const [isEditingVertices, setIsEditingVertices] = useState(false);
  const [editingBuildingId, setEditingBuildingId] = useState<string | null>(null);

  // Detection overlay state
  const [showDetectionOverlay, setShowDetectionOverlay] = useState(false);

  // Modal state
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [showArrayModal, setShowArrayModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Bulk edit state
  const [bulkFloors, setBulkFloors] = useState(4);
  const [bulkFloorHeight, setBulkFloorHeight] = useState(3);
  const [bulkEditErrors, setBulkEditErrors] = useState<BulkEditValidationErrors>({});

  // Array config state
  const [arrayConfig, setArrayConfig] = useState({
    rows: 2,
    columns: 2,
    spacingX: 30,
    spacingY: 30,
  });

  // Image scale for duplication offset
  const [imageScale] = useState(1);

  // Use building groups hook
  const {
    buildingGroups,
    buildingToGroup,
    getGroupColor,
    createGroup,
    ungroupSelected,
    selectGroup,
  } = useBuildingGroups({
    selectedBuildingIds,
    setSelectedBuildingIds,
    showToast,
  });

  // Undo/Redo history
  const {
    recordAddBuilding,
    recordDeleteBuilding,
    recordUpdateBuilding,
    recordBulkUpdate,
    undo,
    redo,
    canUndo,
    canRedo,
    getUndoDescription,
    getRedoDescription,
  } = useEditorHistory({
    onUndo: (action) => {
      switch (action.type) {
        case "ADD_BUILDING":
          if (action.payload.building) {
            removeBuilding(action.payload.building.id);
          }
          break;
        case "DELETE_BUILDING":
          if (action.payload.building) {
            const building = action.payload.building;
            addBuilding(building.footprint, building.name);
            const addedBuilding = project.buildings[project.buildings.length - 1];
            if (addedBuilding) {
              updateBuilding(addedBuilding.id, {
                floors: building.floors,
                floorHeight: building.floorHeight,
                color: building.color,
              });
            }
          }
          break;
        case "UPDATE_BUILDING":
          if (action.payload.buildingId && action.payload.previousState) {
            updateBuilding(action.payload.buildingId, action.payload.previousState);
          }
          break;
        case "BULK_UPDATE":
          if (action.payload.previousStates) {
            action.payload.previousStates.forEach(({ id, state }) => {
              updateBuilding(id, state);
            });
          }
          break;
      }
      showToast(`Undo: ${getUndoDescription()}`, ErrorSeverity.INFO);
    },
    onRedo: (action) => {
      switch (action.type) {
        case "ADD_BUILDING":
          if (action.payload.building) {
            const building = action.payload.building;
            addBuilding(building.footprint, building.name);
          }
          break;
        case "DELETE_BUILDING":
          if (action.payload.building) {
            removeBuilding(action.payload.building.id);
          }
          break;
        case "UPDATE_BUILDING":
          if (action.payload.buildingId && action.payload.newState) {
            updateBuilding(action.payload.buildingId, action.payload.newState);
          }
          break;
        case "BULK_UPDATE":
          if (action.payload.buildings) {
            action.payload.buildings.forEach((building) => {
              updateBuilding(building.id, {
                floors: building.floors,
                floorHeight: building.floorHeight,
              });
            });
          }
          break;
      }
      showToast(`Redo: ${getRedoDescription()}`, ErrorSeverity.INFO);
    },
  });

  // Use keyboard shortcuts hook
  useKeyboardShortcuts({
    currentPoints,
    selectedBuildingIds,
    buildings,
    activeTool,
    isEditingVertices,
    canUndo,
    canRedo,
    setCurrentPoints,
    setSelectedBuildingIds,
    setActiveTool,
    setIsEditingVertices,
    setEditingBuildingId,
    setShiftKeyHeld,
    setEditorSettings,
    setIsNearStartPoint: () => {}, // No-op - state is managed in EditorCanvas
    addBuilding,
    removeBuilding,
    selectBuilding,
    undo,
    redo,
    recordAddBuilding,
    recordDeleteBuilding,
    showToast,
    projectBuildings: project.buildings,
  });

  // Helper: Get primary selected building
  const selectedBuildingId =
    selectedBuildingIds.size === 1 ? Array.from(selectedBuildingIds)[0] : null;
  const selectedBuilding = selectedBuildingId
    ? buildings.find((b) => b.id === selectedBuildingId)
    : null;
  const selectedBuildings = buildings.filter((b) => selectedBuildingIds.has(b.id));

  // Helper: Clear selection
  const clearSelection = useCallback(() => {
    setSelectedBuildingIds(new Set());
    selectBuilding(undefined);
  }, [selectBuilding]);

  // Helper: Toggle building in selection
  const toggleBuildingSelection = useCallback(
    (buildingId: string, addToSelection: boolean) => {
      if (addToSelection) {
        setSelectedBuildingIds((prev) => {
          const newSet = new Set(prev);
          if (newSet.has(buildingId)) {
            newSet.delete(buildingId);
          } else {
            newSet.add(buildingId);
          }
          return newSet;
        });
      } else {
        setSelectedBuildingIds(new Set([buildingId]));
      }
    },
    []
  );

  // Duplicate selected buildings
  const duplicateSelectedBuildings = useCallback(() => {
    if (selectedBuildingIds.size === 0) return;

    const buildingsToDuplicate = buildings.filter((b) =>
      selectedBuildingIds.has(b.id)
    );
    const newBuildingIds: string[] = [];

    buildingsToDuplicate.forEach((building) => {
      const offsetFootprint = building.footprint.map((p) => ({
        x: p.x + 20 / imageScale,
        y: p.y + 20 / imageScale,
      }));

      const baseName = building.name.replace(/\s*\(copy\s*\d*\)$/, "");
      const copyCount = buildings.filter((b) => b.name.startsWith(baseName)).length;
      const newName = `${baseName} (copy${copyCount > 1 ? ` ${copyCount}` : ""})`;

      addBuilding(offsetFootprint, newName);

      const newBuilding = project.buildings[project.buildings.length - 1];
      if (newBuilding) {
        updateBuilding(newBuilding.id, {
          floors: building.floors,
          floorHeight: building.floorHeight,
        });
        newBuildingIds.push(newBuilding.id);
        recordAddBuilding(newBuilding);
      }
    });

    setSelectedBuildingIds(new Set(newBuildingIds));
    showToast(`Duplicated ${buildingsToDuplicate.length} building(s)`, ErrorSeverity.INFO);
  }, [
    selectedBuildingIds,
    imageScale,
    buildings,
    addBuilding,
    project.buildings,
    updateBuilding,
    recordAddBuilding,
    showToast,
  ]);

  // Separate effect for Ctrl+D
  useEffect(() => {
    const handleCtrlD = (e: KeyboardEvent) => {
      if (e.key === "d" && e.ctrlKey && selectedBuildingIds.size > 0) {
        e.preventDefault();
        duplicateSelectedBuildings();
      }
    };
    window.addEventListener("keydown", handleCtrlD);
    return () => window.removeEventListener("keydown", handleCtrlD);
  }, [selectedBuildingIds, duplicateSelectedBuildings]);

  // Create array of buildings
  const createBuildingArray = useCallback(() => {
    if (selectedBuildingIds.size !== 1) {
      showToast("Select exactly one building to create an array", ErrorSeverity.WARNING);
      return;
    }

    const sourceBuilding = selectedBuildings[0];
    if (!sourceBuilding) return;

    const { rows, columns, spacingX, spacingY } = arrayConfig;

    const minX = Math.min(...sourceBuilding.footprint.map((p) => p.x));
    const maxX = Math.max(...sourceBuilding.footprint.map((p) => p.x));
    const minY = Math.min(...sourceBuilding.footprint.map((p) => p.y));
    const maxY = Math.max(...sourceBuilding.footprint.map((p) => p.y));
    const width = maxX - minX;
    const height = maxY - minY;

    const spacingXCoord = spacingX / imageScale;
    const spacingYCoord = spacingY / imageScale;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        if (row === 0 && col === 0) continue;

        const offsetX = col * (width + spacingXCoord);
        const offsetY = row * (height + spacingYCoord);

        const newFootprint = sourceBuilding.footprint.map((p) => ({
          x: p.x + offsetX,
          y: p.y + offsetY,
        }));

        const newName = `${sourceBuilding.name} [${row + 1},${col + 1}]`;
        addBuilding(newFootprint, newName);

        const addedBuilding = project.buildings[project.buildings.length - 1];
        if (addedBuilding) {
          updateBuilding(addedBuilding.id, {
            floors: sourceBuilding.floors,
            floorHeight: sourceBuilding.floorHeight,
          });
          recordAddBuilding(addedBuilding);
        }
      }
    }

    showToast(`Created ${rows * columns - 1} new buildings`, ErrorSeverity.INFO);
    setShowArrayModal(false);
  }, [
    selectedBuildingIds,
    selectedBuildings,
    arrayConfig,
    imageScale,
    addBuilding,
    project.buildings,
    updateBuilding,
    recordAddBuilding,
    showToast,
  ]);

  // Export buildings configuration
  const exportBuildingsConfig = useCallback(() => {
    const config = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      buildings: buildings.map((b) => ({
        name: b.name,
        footprint: b.footprint,
        floors: b.floors,
        floorHeight: b.floorHeight,
        color: b.color,
      })),
      groups: Array.from(buildingGroups.entries()).map(([groupId, buildingIds]) => ({
        id: groupId,
        buildingNames: Array.from(buildingIds)
          .map((id) => buildings.find((b) => b.id === id)?.name)
          .filter(Boolean),
      })),
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `buildings-config-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast("Buildings configuration exported", ErrorSeverity.INFO);
    setShowExportModal(false);
  }, [buildings, buildingGroups, showToast]);

  // Import buildings configuration
  const importBuildingsConfig = useCallback(
    (jsonString: string) => {
      try {
        const config = JSON.parse(jsonString);

        if (!config.buildings || !Array.isArray(config.buildings)) {
          throw new Error("Invalid configuration: missing buildings array");
        }

        config.buildings.forEach(
          (b: {
            name: string;
            footprint: Point2D[];
            floors: number;
            floorHeight: number;
            color?: string;
          }) => {
            if (!b.footprint || !Array.isArray(b.footprint) || b.footprint.length < 3) {
              return;
            }

            addBuilding(b.footprint, b.name || "Imported Building");
            const addedBuilding = project.buildings[project.buildings.length - 1];
            if (addedBuilding) {
              updateBuilding(addedBuilding.id, {
                floors: b.floors || 4,
                floorHeight: b.floorHeight || 3,
                color: b.color,
              });
              recordAddBuilding(addedBuilding);
            }
          }
        );

        showToast(`Imported buildings successfully`, ErrorSeverity.INFO);
        setShowImportModal(false);
      } catch (error) {
        showToast(
          `Import failed: ${error instanceof Error ? error.message : "Invalid JSON"}`,
          ErrorSeverity.ERROR
        );
      }
    },
    [addBuilding, project.buildings, updateBuilding, recordAddBuilding, showToast]
  );

  // Validation functions
  const validateFloorCount = (value: number): { valid: boolean; error?: string } => {
    if (!validators.floorCount(value)) {
      return { valid: false, error: "Floor count must be between 1 and 100" };
    }
    return { valid: true };
  };

  const validateFloorHeight = (value: number): { valid: boolean; error?: string } => {
    if (!validators.floorHeight(value)) {
      return { valid: false, error: "Floor height must be between 2m and 10m" };
    }
    return { valid: true };
  };

  // Handle continue to 3D View
  const handleContinueToViewer = () => {
    if (buildings.length === 0) {
      showToast("Please add at least one building before continuing.", ErrorSeverity.WARNING, {
        recoveryAction: "Use the Draw tool to create building footprints.",
      });
      return;
    }

    const invalidBuildings = buildings.filter(
      (b) => !validators.floorCount(b.floors) || !validators.floorHeight(b.floorHeight)
    );

    if (invalidBuildings.length > 0) {
      showToast(
        `${invalidBuildings.length} building(s) have invalid settings. Please fix before continuing.`,
        ErrorSeverity.WARNING,
        {
          recoveryAction: "Check floor count (1-100) and floor height (2-10m) for each building.",
        }
      );
      return;
    }

    setCurrentStep("viewer");
  };

  // Apply bulk edit
  const applyBulkEdit = () => {
    const floorsValidation = validateFloorCount(bulkFloors);
    const heightValidation = validateFloorHeight(bulkFloorHeight);

    setBulkEditErrors({
      floors: floorsValidation.valid ? undefined : floorsValidation.error,
      floorHeight: heightValidation.valid ? undefined : heightValidation.error,
    });

    if (!floorsValidation.valid || !heightValidation.valid) {
      showToast("Please fix the validation errors before applying.", ErrorSeverity.WARNING);
      return;
    }

    const previousStates = buildings.map((b) => ({
      id: b.id,
      state: { floors: b.floors, floorHeight: b.floorHeight },
    }));

    buildings.forEach((b) => {
      updateBuilding(b.id, {
        floors: bulkFloors,
        floorHeight: bulkFloorHeight,
      });
    });

    recordBulkUpdate(
      previousStates,
      buildings.map((b) => ({
        ...b,
        floors: bulkFloors,
        floorHeight: bulkFloorHeight,
      }))
    );

    setShowBulkEditModal(false);
    showToast(
      `Updated ${buildings.length} building(s) to ${bulkFloors} floors at ${bulkFloorHeight}m each.`,
      ErrorSeverity.INFO
    );
  };

  // Delete all buildings
  const deleteAllBuildings = () => {
    if (window.confirm("Are you sure you want to delete all buildings?")) {
      buildings.forEach((b) => removeBuilding(b.id));
      setSelectedBuildingIds(new Set());
    }
  };

  if (!image) return null;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Toolbar - Second on mobile, first on desktop */}
        <div className="lg:col-span-1 space-y-4 order-2 lg:order-1">
          <EditorToolbar
            activeTool={activeTool}
            setActiveTool={setActiveTool}
            selectedTemplate={selectedTemplate}
            setSelectedTemplate={setSelectedTemplate}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={undo}
            onRedo={redo}
            getUndoDescription={getUndoDescription}
            getRedoDescription={getRedoDescription}
            currentPointsLength={currentPoints.length}
            onRemoveLastPoint={() => setCurrentPoints(currentPoints.slice(0, -1))}
            editorSettings={editorSettings}
            setEditorSettings={setEditorSettings}
            onEditModeEnter={() => {
              if (selectedBuildingIds.size === 1) {
                const buildingId = Array.from(selectedBuildingIds)[0];
                setIsEditingVertices(true);
                setEditingBuildingId(buildingId);
              }
            }}
          />

          <BuildingList
            buildings={buildings}
            selectedBuildingIds={selectedBuildingIds}
            selectedBuildingId={selectedBuildingId ?? undefined}
            buildingToGroup={buildingToGroup}
            onSelectBuilding={(id, isShiftHeld) => {
              toggleBuildingSelection(id, isShiftHeld);
              selectBuilding(id);
            }}
            onDeleteBuilding={(building) => {
              recordDeleteBuilding(building);
              removeBuilding(building.id);
              setSelectedBuildingIds((prev) => {
                const newSet = new Set(prev);
                newSet.delete(building.id);
                return newSet;
              });
            }}
            onSelectGroup={selectGroup}
            setActiveTool={setActiveTool}
            getGroupColor={getGroupColor}
            onShowImportModal={() => setShowImportModal(true)}
            onShowExportModal={() => setShowExportModal(true)}
            onShowBulkEditModal={() => setShowBulkEditModal(true)}
            onDeleteAllBuildings={deleteAllBuildings}
          />

          <BuildingProperties
            selectedBuildingIds={selectedBuildingIds}
            selectedBuilding={selectedBuilding ?? undefined}
            onUpdateBuilding={updateBuilding}
            onDuplicate={duplicateSelectedBuildings}
            onDelete={() => {
              if (window.confirm(`Delete ${selectedBuildingIds.size} buildings?`)) {
                selectedBuildings.forEach((b) => {
                  recordDeleteBuilding(b);
                  removeBuilding(b.id);
                });
                clearSelection();
              }
            }}
            onCreateGroup={createGroup}
            onUngroupSelected={ungroupSelected}
            onShowArrayModal={() => setShowArrayModal(true)}
            buildingToGroup={buildingToGroup}
          />
        </div>

        {/* Canvas */}
        <EditorCanvas
          imageDataUrl={image.dataUrl}
          northAngle={site.northAngle}
          buildings={buildings}
          selectedBuildingIds={selectedBuildingIds}
          setSelectedBuildingIds={setSelectedBuildingIds}
          currentPoints={currentPoints}
          setCurrentPoints={setCurrentPoints}
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          selectedTemplate={selectedTemplate}
          editorSettings={editorSettings}
          shiftKeyHeld={shiftKeyHeld}
          isEditingVertices={isEditingVertices}
          setIsEditingVertices={setIsEditingVertices}
          editingBuildingId={editingBuildingId}
          setEditingBuildingId={setEditingBuildingId}
          showDetectionOverlay={showDetectionOverlay}
          setShowDetectionOverlay={setShowDetectionOverlay}
          detectionResult={detectionResult}
          addBuilding={addBuilding}
          updateBuilding={updateBuilding}
          removeBuilding={removeBuilding}
          selectBuilding={selectBuilding}
          recordAddBuilding={recordAddBuilding}
          recordDeleteBuilding={recordDeleteBuilding}
          recordUpdateBuilding={recordUpdateBuilding}
          showToast={showToast}
          projectBuildings={project.buildings}
        />
      </div>

      {/* Actions */}
      <EditorActions
        buildingsCount={buildings.length}
        onBack={() => setCurrentStep("validate")}
        onContinue={handleContinueToViewer}
      />

      {/* Modals */}
      <BulkEditModal
        isOpen={showBulkEditModal}
        onClose={() => setShowBulkEditModal(false)}
        buildingsCount={buildings.length}
        bulkFloors={bulkFloors}
        setBulkFloors={setBulkFloors}
        bulkFloorHeight={bulkFloorHeight}
        setBulkFloorHeight={setBulkFloorHeight}
        bulkEditErrors={bulkEditErrors}
        setBulkEditErrors={setBulkEditErrors}
        validateFloorCount={validateFloorCount}
        validateFloorHeight={validateFloorHeight}
        onApply={applyBulkEdit}
      />

      <ArrayToolModal
        isOpen={showArrayModal}
        onClose={() => setShowArrayModal(false)}
        arrayConfig={arrayConfig}
        setArrayConfig={setArrayConfig}
        onApply={createBuildingArray}
      />

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        buildingsCount={buildings.length}
        groupsCount={buildingGroups.size}
        onExport={exportBuildingsConfig}
      />

      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={importBuildingsConfig}
      />
    </div>
  );
}
