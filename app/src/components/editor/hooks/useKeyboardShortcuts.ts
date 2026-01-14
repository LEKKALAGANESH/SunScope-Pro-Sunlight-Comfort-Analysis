import { useCallback, useEffect } from "react";
import type { Building, Point2D } from "../../../types";
import type { Tool, EditorSettings } from "../types";
import { ErrorSeverity } from "../../../utils/errors";

interface KeyboardShortcutsParams {
  // State
  currentPoints: Point2D[];
  selectedBuildingIds: Set<string>;
  buildings: Building[];
  activeTool: Tool;
  isEditingVertices: boolean;
  canUndo: boolean;
  canRedo: boolean;

  // State setters
  setCurrentPoints: React.Dispatch<React.SetStateAction<Point2D[]>>;
  setSelectedBuildingIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setActiveTool: (tool: Tool) => void;
  setIsEditingVertices: React.Dispatch<React.SetStateAction<boolean>>;
  setEditingBuildingId: React.Dispatch<React.SetStateAction<string | null>>;
  setShiftKeyHeld: React.Dispatch<React.SetStateAction<boolean>>;
  setEditorSettings: React.Dispatch<React.SetStateAction<EditorSettings>>;
  setIsNearStartPoint: React.Dispatch<React.SetStateAction<boolean>>;

  // Actions
  addBuilding: (footprint: Point2D[], name?: string) => void;
  removeBuilding: (id: string) => void;
  selectBuilding: (id: string | undefined) => void;
  undo: () => void;
  redo: () => void;
  recordAddBuilding: (building: Building) => void;
  recordDeleteBuilding: (building: Building) => void;
  showToast: (message: string, severity: ErrorSeverity) => void;

  // Project data
  projectBuildings: Building[];
}

export function useKeyboardShortcuts({
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
  setIsNearStartPoint,
  addBuilding,
  removeBuilding,
  selectBuilding,
  undo,
  redo,
  recordAddBuilding,
  recordDeleteBuilding,
  showToast,
  projectBuildings,
}: KeyboardShortcutsParams) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Track shift key for orthogonal constraint
      if (e.key === "Shift") {
        setShiftKeyHeld(true);
        setEditorSettings((prev) => ({ ...prev, orthogonalConstraint: true }));
      }

      // Escape - cancel drawing or deselect
      if (e.key === "Escape") {
        if (currentPoints.length > 0) {
          setCurrentPoints([]);
          setIsNearStartPoint(false);
        } else if (isEditingVertices) {
          setIsEditingVertices(false);
          setEditingBuildingId(null);
          setActiveTool("select");
        } else {
          setSelectedBuildingIds(new Set());
          selectBuilding(undefined);
        }
      }

      // Delete - delete selected building(s)
      if (e.key === "Delete") {
        if (selectedBuildingIds.size > 0) {
          const buildingsToDelete = buildings.filter((b) =>
            selectedBuildingIds.has(b.id)
          );
          buildingsToDelete.forEach((building) => {
            recordDeleteBuilding(building);
            removeBuilding(building.id);
          });
          setSelectedBuildingIds(new Set());
          selectBuilding(undefined);
          showToast(
            `Deleted ${buildingsToDelete.length} building(s). Press Ctrl+Z to undo.`,
            ErrorSeverity.INFO
          );
        }
      }

      // Backspace - remove last point when drawing
      if (
        e.key === "Backspace" &&
        activeTool === "draw" &&
        currentPoints.length > 0
      ) {
        e.preventDefault();
        setCurrentPoints(currentPoints.slice(0, -1));
      }

      // Ctrl+Z - Undo
      if (e.key === "z" && e.ctrlKey && !e.shiftKey) {
        e.preventDefault();
        if (currentPoints.length > 0) {
          setCurrentPoints(currentPoints.slice(0, -1));
        } else if (canUndo) {
          undo();
        }
      }

      // Ctrl+Y or Ctrl+Shift+Z - Redo
      if (
        (e.key === "y" && e.ctrlKey) ||
        (e.key === "z" && e.ctrlKey && e.shiftKey)
      ) {
        e.preventDefault();
        if (canRedo) {
          redo();
        }
      }

      // Enter - Complete building
      if (
        e.key === "Enter" &&
        activeTool === "draw" &&
        currentPoints.length >= 3
      ) {
        addBuilding(currentPoints);
        const addedBuilding = projectBuildings[projectBuildings.length - 1];
        if (addedBuilding) {
          recordAddBuilding(addedBuilding);
        }
        setCurrentPoints([]);
        setIsNearStartPoint(false);
        showToast("Building created!", ErrorSeverity.INFO);
      }

      // D - Draw tool
      if (e.key === "d" && !e.ctrlKey && !e.metaKey) {
        setActiveTool("draw");
      }

      // V - Select tool
      if (e.key === "v" && !e.ctrlKey && !e.metaKey) {
        setActiveTool("select");
      }

      // X - Delete tool
      if (e.key === "x" && !e.ctrlKey && !e.metaKey) {
        setActiveTool("delete");
      }

      // Ctrl+A - Select all buildings
      if (e.key === "a" && e.ctrlKey) {
        e.preventDefault();
        if (buildings.length > 0) {
          setSelectedBuildingIds(new Set(buildings.map((b) => b.id)));
          showToast(
            `Selected all ${buildings.length} building(s)`,
            ErrorSeverity.INFO
          );
        }
      }

      // E - Enter vertex editing mode
      if (e.key === "e" && !e.ctrlKey && !e.metaKey) {
        if (selectedBuildingIds.size === 1) {
          const buildingId = Array.from(selectedBuildingIds)[0];
          setIsEditingVertices(true);
          setEditingBuildingId(buildingId);
          setActiveTool("edit");
          showToast(
            "Vertex editing mode. Drag vertices to reshape.",
            ErrorSeverity.INFO
          );
        }
      }

      // R - Rectangle tool
      if (e.key === "r" && !e.ctrlKey && !e.metaKey) {
        setActiveTool("rectangle");
      }

      // M - Move tool
      if (e.key === "m" && !e.ctrlKey && !e.metaKey) {
        setActiveTool("move");
      }

      // P - Pan tool
      if (e.key === "p" && !e.ctrlKey && !e.metaKey) {
        setActiveTool("pan");
      }
    },
    [
      currentPoints,
      selectedBuildingIds,
      removeBuilding,
      buildings,
      canUndo,
      canRedo,
      undo,
      redo,
      activeTool,
      addBuilding,
      projectBuildings,
      recordAddBuilding,
      recordDeleteBuilding,
      selectBuilding,
      showToast,
      isEditingVertices,
      setCurrentPoints,
      setSelectedBuildingIds,
      setActiveTool,
      setIsEditingVertices,
      setEditingBuildingId,
      setShiftKeyHeld,
      setEditorSettings,
      setIsNearStartPoint,
    ]
  );

  const handleKeyUp = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Shift") {
        setShiftKeyHeld(false);
        setEditorSettings((prev) => ({ ...prev, orthogonalConstraint: false }));
      }
    },
    [setShiftKeyHeld, setEditorSettings]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);
}
