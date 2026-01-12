/**
 * useEditorHistory - Undo/Redo system for the building editor
 *
 * Provides multi-level undo/redo functionality for building operations.
 * Tracks: add building, delete building, update building properties
 */

import { useState, useCallback, useRef } from 'react';
import type { Building, Point2D } from '../types';

// Action types for the history
type ActionType =
  | 'ADD_BUILDING'
  | 'DELETE_BUILDING'
  | 'UPDATE_BUILDING'
  | 'BULK_UPDATE';

interface HistoryAction {
  type: ActionType;
  timestamp: number;
  // For ADD_BUILDING: the building that was added
  // For DELETE_BUILDING: the building that was deleted (for restore)
  // For UPDATE_BUILDING: the building ID and previous state
  payload: {
    building?: Building;
    buildingId?: string;
    previousState?: Partial<Building>;
    newState?: Partial<Building>;
    // For bulk updates
    buildings?: Building[];
    previousStates?: { id: string; state: Partial<Building> }[];
  };
}

interface UseEditorHistoryOptions {
  maxHistorySize?: number;
  onUndo?: (action: HistoryAction) => void;
  onRedo?: (action: HistoryAction) => void;
}

interface UseEditorHistoryReturn {
  // Record actions
  recordAddBuilding: (building: Building) => void;
  recordDeleteBuilding: (building: Building) => void;
  recordUpdateBuilding: (
    buildingId: string,
    previousState: Partial<Building>,
    newState: Partial<Building>
  ) => void;
  recordBulkUpdate: (
    previousStates: { id: string; state: Partial<Building> }[],
    buildings: Building[]
  ) => void;

  // Undo/redo actions
  undo: () => HistoryAction | null;
  redo: () => HistoryAction | null;

  // State
  canUndo: boolean;
  canRedo: boolean;
  undoStack: HistoryAction[];
  redoStack: HistoryAction[];

  // Get description of next undo/redo action
  getUndoDescription: () => string;
  getRedoDescription: () => string;

  // Clear history
  clearHistory: () => void;
}

export function useEditorHistory(
  options: UseEditorHistoryOptions = {}
): UseEditorHistoryReturn {
  const { maxHistorySize = 50, onUndo, onRedo } = options;

  const [undoStack, setUndoStack] = useState<HistoryAction[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryAction[]>([]);

  // Use ref to avoid stale closures in callbacks
  const undoStackRef = useRef(undoStack);
  const redoStackRef = useRef(redoStack);
  undoStackRef.current = undoStack;
  redoStackRef.current = redoStack;

  const pushAction = useCallback(
    (action: HistoryAction) => {
      setUndoStack((prev) => {
        const newStack = [...prev, action];
        // Limit stack size
        if (newStack.length > maxHistorySize) {
          return newStack.slice(-maxHistorySize);
        }
        return newStack;
      });
      // Clear redo stack when new action is performed
      setRedoStack([]);
    },
    [maxHistorySize]
  );

  const recordAddBuilding = useCallback(
    (building: Building) => {
      pushAction({
        type: 'ADD_BUILDING',
        timestamp: Date.now(),
        payload: { building },
      });
    },
    [pushAction]
  );

  const recordDeleteBuilding = useCallback(
    (building: Building) => {
      pushAction({
        type: 'DELETE_BUILDING',
        timestamp: Date.now(),
        payload: { building },
      });
    },
    [pushAction]
  );

  const recordUpdateBuilding = useCallback(
    (
      buildingId: string,
      previousState: Partial<Building>,
      newState: Partial<Building>
    ) => {
      pushAction({
        type: 'UPDATE_BUILDING',
        timestamp: Date.now(),
        payload: { buildingId, previousState, newState },
      });
    },
    [pushAction]
  );

  const recordBulkUpdate = useCallback(
    (
      previousStates: { id: string; state: Partial<Building> }[],
      buildings: Building[]
    ) => {
      pushAction({
        type: 'BULK_UPDATE',
        timestamp: Date.now(),
        payload: { previousStates, buildings },
      });
    },
    [pushAction]
  );

  const undo = useCallback((): HistoryAction | null => {
    if (undoStackRef.current.length === 0) return null;

    const action = undoStackRef.current[undoStackRef.current.length - 1];

    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, action]);

    if (onUndo) {
      onUndo(action);
    }

    return action;
  }, [onUndo]);

  const redo = useCallback((): HistoryAction | null => {
    if (redoStackRef.current.length === 0) return null;

    const action = redoStackRef.current[redoStackRef.current.length - 1];

    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, action]);

    if (onRedo) {
      onRedo(action);
    }

    return action;
  }, [onRedo]);

  const getActionDescription = (action: HistoryAction | undefined): string => {
    if (!action) return '';

    switch (action.type) {
      case 'ADD_BUILDING':
        return `Add ${action.payload.building?.name || 'building'}`;
      case 'DELETE_BUILDING':
        return `Delete ${action.payload.building?.name || 'building'}`;
      case 'UPDATE_BUILDING':
        return 'Edit building';
      case 'BULK_UPDATE':
        return `Edit ${action.payload.previousStates?.length || 0} buildings`;
      default:
        return 'Action';
    }
  };

  const getUndoDescription = useCallback((): string => {
    return getActionDescription(undoStack[undoStack.length - 1]);
  }, [undoStack]);

  const getRedoDescription = useCallback((): string => {
    return getActionDescription(redoStack[redoStack.length - 1]);
  }, [redoStack]);

  const clearHistory = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  return {
    recordAddBuilding,
    recordDeleteBuilding,
    recordUpdateBuilding,
    recordBulkUpdate,
    undo,
    redo,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    undoStack,
    redoStack,
    getUndoDescription,
    getRedoDescription,
    clearHistory,
  };
}

/**
 * Utility: Snap a point to a grid
 */
export function snapToGrid(
  point: Point2D,
  gridSize: number,
  enabled: boolean = true
): Point2D {
  if (!enabled) return point;

  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
  };
}

/**
 * Utility: Constrain to orthogonal angles (0, 90, 180, 270 degrees)
 */
export function constrainToOrthogonal(
  currentPoint: Point2D,
  previousPoint: Point2D | null,
  enabled: boolean = true
): Point2D {
  if (!enabled || !previousPoint) return currentPoint;

  const dx = currentPoint.x - previousPoint.x;
  const dy = currentPoint.y - previousPoint.y;

  // Determine if horizontal or vertical movement is dominant
  if (Math.abs(dx) > Math.abs(dy)) {
    // Horizontal movement
    return { x: currentPoint.x, y: previousPoint.y };
  } else {
    // Vertical movement
    return { x: previousPoint.x, y: currentPoint.y };
  }
}

/**
 * Utility: Check if point is close to target (for close-loop detection)
 */
export function isNearPoint(
  point: Point2D,
  target: Point2D,
  threshold: number
): boolean {
  const dx = point.x - target.x;
  const dy = point.y - target.y;
  return Math.sqrt(dx * dx + dy * dy) <= threshold;
}

/**
 * Utility: Calculate distance between two points
 */
export function distanceBetweenPoints(p1: Point2D, p2: Point2D): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Utility: Find alignment guides for a point relative to existing buildings
 */
export interface AlignmentGuide {
  type: 'vertical' | 'horizontal';
  position: number;
  source: 'building' | 'grid';
  buildingId?: string;
}

export function findAlignmentGuides(
  point: Point2D,
  buildings: Building[],
  threshold: number = 10
): AlignmentGuide[] {
  const guides: AlignmentGuide[] = [];

  buildings.forEach((building) => {
    building.footprint.forEach((vertex) => {
      // Check vertical alignment (same X)
      if (Math.abs(point.x - vertex.x) < threshold) {
        guides.push({
          type: 'vertical',
          position: vertex.x,
          source: 'building',
          buildingId: building.id,
        });
      }
      // Check horizontal alignment (same Y)
      if (Math.abs(point.y - vertex.y) < threshold) {
        guides.push({
          type: 'horizontal',
          position: vertex.y,
          source: 'building',
          buildingId: building.id,
        });
      }
    });
  });

  return guides;
}
