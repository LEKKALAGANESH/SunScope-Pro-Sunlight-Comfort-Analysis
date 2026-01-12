import { useState, useRef, useEffect, useCallback } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { useToast } from '../common/Toast';
import { FocusTrap } from '../common/FocusTrap';
import { validators, ErrorSeverity } from '../../utils/errors';
import {
  useEditorHistory,
  snapToGrid,
  constrainToOrthogonal,
  isNearPoint,
} from '../../hooks/useEditorHistory';
import type { Point2D, Building } from '../../types';

// Phase 3: Extended tool types
type Tool = 'select' | 'draw' | 'edit' | 'delete' | 'rectangle' | 'template';

// Phase 3: Shape template types
type ShapeTemplate = 'rectangle' | 'square' | 'l-shape' | 'tower' | 'u-shape';

// Phase 3: Building presets
interface BuildingPreset {
  name: string;
  floors: number;
  floorHeight: number;
  description: string;
  color: string;
}

const BUILDING_PRESETS: BuildingPreset[] = [
  { name: 'Residential Low-Rise', floors: 4, floorHeight: 3.0, description: 'Apartments, townhouses', color: '#10b981' },
  { name: 'Residential High-Rise', floors: 20, floorHeight: 2.8, description: 'Condo towers', color: '#3b82f6' },
  { name: 'Commercial Office', floors: 10, floorHeight: 4.0, description: 'Office buildings', color: '#8b5cf6' },
  { name: 'Industrial', floors: 2, floorHeight: 6.0, description: 'Warehouses, factories', color: '#f59e0b' },
  { name: 'Mixed-Use Podium', floors: 6, floorHeight: 3.5, description: 'Retail + residential', color: '#ec4899' },
];

// Editor settings
interface EditorSettings {
  snapToGrid: boolean;
  gridSize: number; // in pixels (will be converted to meters)
  showGrid: boolean;
  orthogonalConstraint: boolean; // Shift key held
}

const DEFAULT_SETTINGS: EditorSettings = {
  snapToGrid: true,
  gridSize: 20, // 20px grid
  showGrid: true,
  orthogonalConstraint: false,
};

// Close loop threshold in pixels
const CLOSE_LOOP_THRESHOLD = 15;

// Validation error state for building properties
interface BuildingValidationErrors {
  floors?: string;
  floorHeight?: string;
}

// Validation error state for bulk edit
interface BulkEditValidationErrors {
  floors?: string;
  floorHeight?: string;
}

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

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeTool, setActiveTool] = useState<Tool>('draw');
  const [currentPoints, setCurrentPoints] = useState<Point2D[]>([]);
  // Phase 2: Multi-select support
  const [selectedBuildingIds, setSelectedBuildingIds] = useState<Set<string>>(
    analysis.selectedBuildingId ? new Set([analysis.selectedBuildingId]) : new Set()
  );
  const [hoveredBuildingId, setHoveredBuildingId] = useState<string | null>(null);

  // Phase 2: Marquee selection state
  const [isMarqueeSelecting, setIsMarqueeSelecting] = useState(false);
  const [marqueeStart, setMarqueeStart] = useState<Point2D | null>(null);
  const [marqueeEnd, setMarqueeEnd] = useState<Point2D | null>(null);

  // Phase 2: Vertex editing state
  const [isEditingVertices, setIsEditingVertices] = useState(false);
  const [draggingVertexIndex, setDraggingVertexIndex] = useState<number | null>(null);
  const [editingBuildingId, setEditingBuildingId] = useState<string | null>(null);
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 });
  const [imageScale, setImageScale] = useState(1);
  const [showDetectionOverlay, setShowDetectionOverlay] = useState(false);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkFloors, setBulkFloors] = useState(4);
  const [bulkFloorHeight, setBulkFloorHeight] = useState(3);
  const [buildingErrors, setBuildingErrors] = useState<BuildingValidationErrors>({});
  const [bulkEditErrors, setBulkEditErrors] = useState<BulkEditValidationErrors>({});

  // Phase 1: New state for enhanced editor
  const [editorSettings, setEditorSettings] = useState<EditorSettings>(DEFAULT_SETTINGS);
  const [cursorPosition, setCursorPosition] = useState<Point2D | null>(null);
  const [isNearStartPoint, setIsNearStartPoint] = useState(false);
  const [shiftKeyHeld, setShiftKeyHeld] = useState(false);

  // Phase 3: Rectangle drawing state
  const [isDrawingRectangle, setIsDrawingRectangle] = useState(false);
  const [rectangleStart, setRectangleStart] = useState<Point2D | null>(null);
  const [rectangleEnd, setRectangleEnd] = useState<Point2D | null>(null);

  // Phase 3: Template and preset state
  const [selectedTemplate, setSelectedTemplate] = useState<ShapeTemplate>('rectangle');
  const [showPresetsDropdown, setShowPresetsDropdown] = useState(false);

  // Phase 4: Building Grouping state
  const [buildingGroups, setBuildingGroups] = useState<Map<string, Set<string>>>(new Map()); // groupId -> buildingIds
  const [buildingToGroup, setBuildingToGroup] = useState<Map<string, string>>(new Map()); // buildingId -> groupId

  // Phase 4: Array Tool state
  const [showArrayModal, setShowArrayModal] = useState(false);
  const [arrayConfig, setArrayConfig] = useState({ rows: 2, columns: 2, spacingX: 30, spacingY: 30 });

  // Phase 4: Import/Export state
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  // Phase 3: 3D Preview state - TODO: add back when Mini3DPreview component is created

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
      // Handle undo action
      switch (action.type) {
        case 'ADD_BUILDING':
          if (action.payload.building) {
            removeBuilding(action.payload.building.id);
          }
          break;
        case 'DELETE_BUILDING':
          if (action.payload.building) {
            // Re-add the building - need to use store directly
            const building = action.payload.building;
            addBuilding(building.footprint, building.name);
            // Update with original properties
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
        case 'UPDATE_BUILDING':
          if (action.payload.buildingId && action.payload.previousState) {
            updateBuilding(action.payload.buildingId, action.payload.previousState);
          }
          break;
        case 'BULK_UPDATE':
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
      // Handle redo action
      switch (action.type) {
        case 'ADD_BUILDING':
          if (action.payload.building) {
            const building = action.payload.building;
            addBuilding(building.footprint, building.name);
          }
          break;
        case 'DELETE_BUILDING':
          if (action.payload.building) {
            removeBuilding(action.payload.building.id);
          }
          break;
        case 'UPDATE_BUILDING':
          if (action.payload.buildingId && action.payload.newState) {
            updateBuilding(action.payload.buildingId, action.payload.newState);
          }
          break;
        case 'BULK_UPDATE':
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

  // Draw everything
  useEffect(() => {
    if (!canvasRef.current || !image) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const img = new Image();

    img.onload = () => {
      // Calculate image fit
      const containerWidth = canvas.parentElement?.clientWidth || 800;
      const containerHeight = 500;
      const ratio = Math.min(
        containerWidth / img.width,
        containerHeight / img.height
      );

      const scaledWidth = img.width * ratio;
      const scaledHeight = img.height * ratio;

      canvas.width = containerWidth;
      canvas.height = containerHeight;

      const offsetX = (containerWidth - scaledWidth) / 2;
      const offsetY = (containerHeight - scaledHeight) / 2;
      setImageOffset({ x: offsetX, y: offsetY });
      setImageScale(ratio);

      // Clear canvas
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw image with rotation
      ctx.save();
      ctx.translate(containerWidth / 2, containerHeight / 2);
      ctx.rotate((site.northAngle * Math.PI) / 180);
      ctx.translate(-containerWidth / 2, -containerHeight / 2);
      ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
      ctx.restore();

      // Draw grid overlay (Phase 1: Snap-to-Grid)
      if (editorSettings.showGrid && activeTool === 'draw') {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 0.5;

        const gridSize = editorSettings.gridSize;

        // Vertical lines
        for (let x = offsetX; x < offsetX + scaledWidth; x += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, offsetY);
          ctx.lineTo(x, offsetY + scaledHeight);
          ctx.stroke();
        }

        // Horizontal lines
        for (let y = offsetY; y < offsetY + scaledHeight; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(offsetX, y);
          ctx.lineTo(offsetX + scaledWidth, y);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Draw existing buildings
      buildings.forEach((building) => {
        const isSelected = selectedBuildingIds.has(building.id);
        const isHovered = building.id === hoveredBuildingId;
        const isBeingEdited = isEditingVertices && building.id === editingBuildingId;

        ctx.beginPath();
        building.footprint.forEach((point, index) => {
          const x = offsetX + point.x * ratio;
          const y = offsetY + point.y * ratio;
          if (index === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });
        ctx.closePath();

        // Fill with multi-select aware opacity
        ctx.fillStyle = isSelected
          ? `${building.color}99`
          : isHovered
          ? `${building.color}66`
          : `${building.color}44`;
        ctx.fill();

        // Stroke - use different color for multi-select
        if (isSelected && selectedBuildingIds.size > 1) {
          // Multi-select: cyan border
          ctx.strokeStyle = '#06b6d4';
          ctx.lineWidth = 3;
        } else if (isSelected) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3;
        } else {
          ctx.strokeStyle = building.color;
          ctx.lineWidth = 2;
        }
        ctx.stroke();

        // Draw vertex handles when editing vertices
        if (isBeingEdited) {
          building.footprint.forEach((point, index) => {
            const x = offsetX + point.x * ratio;
            const y = offsetY + point.y * ratio;

            // Vertex handle
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, Math.PI * 2);
            ctx.fillStyle = draggingVertexIndex === index ? '#f59e0b' : '#ffffff';
            ctx.fill();
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 2;
            ctx.stroke();
          });
        }

        // Label
        if (building.footprint.length > 0) {
          const centerX =
            offsetX +
            (building.footprint.reduce((sum, p) => sum + p.x, 0) /
              building.footprint.length) *
              ratio;
          const centerY =
            offsetY +
            (building.footprint.reduce((sum, p) => sum + p.y, 0) /
              building.footprint.length) *
              ratio;

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 12px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          // Background for text
          const text = `${building.name} (${building.floors}F)`;
          const textWidth = ctx.measureText(text).width;
          ctx.fillStyle = isSelected && selectedBuildingIds.size > 1 ? 'rgba(6, 182, 212, 0.9)' : 'rgba(0,0,0,0.7)';
          ctx.fillRect(centerX - textWidth / 2 - 4, centerY - 8, textWidth + 8, 16);

          ctx.fillStyle = '#ffffff';
          ctx.fillText(text, centerX, centerY);
        }
      });

      // Draw marquee selection rectangle
      if (isMarqueeSelecting && marqueeStart && marqueeEnd) {
        const startX = offsetX + marqueeStart.x * ratio;
        const startY = offsetY + marqueeStart.y * ratio;
        const endX = offsetX + marqueeEnd.x * ratio;
        const endY = offsetY + marqueeEnd.y * ratio;

        ctx.beginPath();
        ctx.rect(
          Math.min(startX, endX),
          Math.min(startY, endY),
          Math.abs(endX - startX),
          Math.abs(endY - startY)
        );
        ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
        ctx.fill();
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw multi-select badge
      if (selectedBuildingIds.size > 1) {
        const badgeX = canvas.width - 80;
        const badgeY = 20;

        ctx.fillStyle = 'rgba(6, 182, 212, 0.9)';
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, 70, 24, 12);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${selectedBuildingIds.size} selected`, badgeX + 35, badgeY + 12);
      }

      // Draw detection overlay (if enabled)
      if (showDetectionOverlay && detectionResult) {
        // Draw detected buildings that are not yet imported
        ctx.setLineDash([3, 3]);
        detectionResult.buildings.forEach((detected) => {
          ctx.beginPath();
          detected.footprint.forEach((point, index) => {
            const x = offsetX + point.x * ratio;
            const y = offsetY + point.y * ratio;
            if (index === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          });
          ctx.closePath();
          ctx.strokeStyle = '#9ca3af';
          ctx.lineWidth = 1;
          ctx.stroke();
        });
        ctx.setLineDash([]);

        // Draw detected amenities
        detectionResult.amenities.forEach((amenity) => {
          const x = offsetX + amenity.position.x * ratio;
          const y = offsetY + amenity.position.y * ratio;
          ctx.beginPath();
          ctx.arc(x, y, 8, 0, Math.PI * 2);
          ctx.fillStyle = amenity.type === 'swimming_pool' ? '#60a5fa' : '#34d399';
          ctx.fill();
        });

        // Draw vegetation areas
        ctx.fillStyle = 'rgba(34, 197, 94, 0.15)';
        detectionResult.vegetation.forEach((area) => {
          if (area.length < 3) return;
          ctx.beginPath();
          area.forEach((point, index) => {
            const x = offsetX + point.x * ratio;
            const y = offsetY + point.y * ratio;
            if (index === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.closePath();
          ctx.fill();
        });

        // Draw water bodies
        ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
        detectionResult.waterBodies.forEach((water) => {
          if (water.length < 3) return;
          ctx.beginPath();
          water.forEach((point, index) => {
            const x = offsetX + point.x * ratio;
            const y = offsetY + point.y * ratio;
            if (index === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.closePath();
          ctx.fill();
        });
      }

      // Draw current drawing points
      if (currentPoints.length > 0) {
        ctx.beginPath();
        currentPoints.forEach((point, index) => {
          const x = offsetX + point.x * ratio;
          const y = offsetY + point.y * ratio;
          if (index === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });

        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw points
        currentPoints.forEach((point, index) => {
          const x = offsetX + point.x * ratio;
          const y = offsetY + point.y * ratio;
          ctx.beginPath();
          ctx.arc(x, y, index === 0 && isNearStartPoint ? 10 : 5, 0, Math.PI * 2);
          ctx.fillStyle = index === 0 && isNearStartPoint ? '#22c55e' : '#f59e0b';
          ctx.fill();

          // Draw white ring on start point when close loop indicator is active
          if (index === 0 && isNearStartPoint) {
            ctx.beginPath();
            ctx.arc(x, y, 12, 0, Math.PI * 2);
            ctx.strokeStyle = '#22c55e';
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        });

        // Draw line from last point to cursor position (preview line)
        if (cursorPosition && currentPoints.length > 0) {
          const lastPoint = currentPoints[currentPoints.length - 1];
          const lastX = offsetX + lastPoint.x * ratio;
          const lastY = offsetY + lastPoint.y * ratio;
          const cursorX = offsetX + cursorPosition.x * ratio;
          const cursorY = offsetY + cursorPosition.y * ratio;

          ctx.beginPath();
          ctx.moveTo(lastX, lastY);
          ctx.lineTo(cursorX, cursorY);
          ctx.strokeStyle = isNearStartPoint ? '#22c55e' : 'rgba(245, 158, 11, 0.5)';
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 3]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Show close-loop tooltip indicator
        if (isNearStartPoint && currentPoints.length >= 3) {
          const startPoint = currentPoints[0];
          const x = offsetX + startPoint.x * ratio;
          const y = offsetY + startPoint.y * ratio - 25;

          ctx.fillStyle = 'rgba(34, 197, 94, 0.9)';
          ctx.roundRect(x - 40, y - 10, 80, 20, 4);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.font = '11px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('Click to close', x, y);
        }
      }

      // Phase 3: Draw rectangle preview while drawing
      if (isDrawingRectangle && rectangleStart && rectangleEnd) {
        const startX = offsetX + rectangleStart.x * ratio;
        const startY = offsetY + rectangleStart.y * ratio;
        const endX = offsetX + rectangleEnd.x * ratio;
        const endY = offsetY + rectangleEnd.y * ratio;

        const width = endX - startX;
        const height = endY - startY;

        // Draw rectangle preview
        ctx.beginPath();
        ctx.rect(startX, startY, width, height);
        ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
        ctx.fill();
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw corner handles
        [
          { x: startX, y: startY },
          { x: endX, y: startY },
          { x: endX, y: endY },
          { x: startX, y: endY }
        ].forEach(corner => {
          ctx.beginPath();
          ctx.arc(corner.x, corner.y, 5, 0, Math.PI * 2);
          ctx.fillStyle = '#3b82f6';
          ctx.fill();
        });

        // Phase 3: Draw dimension labels
        const dimWidth = Math.abs(rectangleEnd.x - rectangleStart.x);
        const dimHeight = Math.abs(rectangleEnd.y - rectangleStart.y);
        const dimArea = dimWidth * dimHeight;

        // Width label (top)
        const widthLabelX = (startX + endX) / 2;
        const widthLabelY = Math.min(startY, endY) - 15;
        ctx.fillStyle = 'rgba(59, 130, 246, 0.9)';
        ctx.roundRect(widthLabelX - 30, widthLabelY - 10, 60, 20, 4);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${dimWidth.toFixed(0)}px`, widthLabelX, widthLabelY);

        // Height label (right)
        const heightLabelX = Math.max(startX, endX) + 15;
        const heightLabelY = (startY + endY) / 2;
        ctx.save();
        ctx.translate(heightLabelX, heightLabelY);
        ctx.rotate(Math.PI / 2);
        ctx.fillStyle = 'rgba(59, 130, 246, 0.9)';
        ctx.roundRect(-30, -10, 60, 20, 4);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`${dimHeight.toFixed(0)}px`, 0, 0);
        ctx.restore();

        // Area label (center)
        const centerX = (startX + endX) / 2;
        const centerY = (startY + endY) / 2;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.roundRect(centerX - 45, centerY - 12, 90, 24, 4);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Arial';
        ctx.fillText(`${dimArea.toFixed(0)} px²`, centerX, centerY);
      }
    };

    img.src = image.dataUrl;
  }, [image, buildings, currentPoints, selectedBuildingIds, hoveredBuildingId, site.northAngle, showDetectionOverlay, detectionResult, editorSettings.showGrid, editorSettings.gridSize, activeTool, isNearStartPoint, cursorPosition, isMarqueeSelecting, marqueeStart, marqueeEnd, isEditingVertices, editingBuildingId, draggingVertexIndex, isDrawingRectangle, rectangleStart, rectangleEnd]);

  const screenToImage = useCallback(
    (screenX: number, screenY: number): Point2D => {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      const x = (screenX - rect.left - imageOffset.x) / imageScale;
      const y = (screenY - rect.top - imageOffset.y) / imageScale;
      return { x, y };
    },
    [imageOffset, imageScale]
  );

  const findBuildingAtPoint = useCallback(
    (point: Point2D): Building | null => {
      // Check buildings in reverse order (top-most first)
      for (let i = buildings.length - 1; i >= 0; i--) {
        const building = buildings[i];
        if (isPointInPolygon(point, building.footprint)) {
          return building;
        }
      }
      return null;
    },
    [buildings]
  );

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    let point = screenToImage(e.clientX, e.clientY);
    const isShiftClick = e.shiftKey;

    if (activeTool === 'draw') {
      // Check if clicking near start point to close the shape
      if (currentPoints.length >= 3 && isNearStartPoint) {
        // Complete the polygon
        addBuilding(currentPoints);
        // Record for undo/redo - get the newly added building
        const addedBuilding = project.buildings[project.buildings.length - 1];
        if (addedBuilding) {
          recordAddBuilding(addedBuilding);
        }
        setCurrentPoints([]);
        setIsNearStartPoint(false);
        showToast('Building created! Use the Properties panel to set floor count.', ErrorSeverity.INFO);
        return;
      }

      // Apply snap-to-grid if enabled
      if (editorSettings.snapToGrid) {
        // Convert grid size from screen pixels to image coordinates
        const gridSizeInImageCoords = editorSettings.gridSize / imageScale;
        point = snapToGrid(point, gridSizeInImageCoords, true);
      }

      // Apply orthogonal constraint if Shift is held (but not for multi-select)
      if (shiftKeyHeld && currentPoints.length > 0) {
        const lastPoint = currentPoints[currentPoints.length - 1];
        point = constrainToOrthogonal(point, lastPoint, true);
      }

      setCurrentPoints([...currentPoints, point]);
    } else if (activeTool === 'select') {
      const building = findBuildingAtPoint(point);

      if (building) {
        // Phase 2: Shift+Click for multi-select
        toggleBuildingSelection(building.id, isShiftClick);
        selectBuilding(building.id);
      } else if (!isShiftClick) {
        // Click on empty space clears selection (unless Shift is held)
        clearSelection();
      }

      // Exit vertex editing mode when clicking elsewhere
      if (isEditingVertices && !building) {
        setIsEditingVertices(false);
        setEditingBuildingId(null);
      }
    } else if (activeTool === 'edit') {
      // Vertex editing mode
      const building = findBuildingAtPoint(point);
      if (building) {
        setIsEditingVertices(true);
        setEditingBuildingId(building.id);
        setSelectedBuildingIds(new Set([building.id]));
      } else {
        setIsEditingVertices(false);
        setEditingBuildingId(null);
      }
    } else if (activeTool === 'delete') {
      const building = findBuildingAtPoint(point);
      if (building) {
        // Record for undo before deleting
        recordDeleteBuilding(building);
        removeBuilding(building.id);
        // Remove from selection
        setSelectedBuildingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(building.id);
          return newSet;
        });
        showToast(`Deleted ${building.name}. Press Ctrl+Z to undo.`, ErrorSeverity.INFO);
      }
    }
  };

  const handleCanvasDoubleClick = () => {
    if (activeTool === 'draw' && currentPoints.length >= 3) {
      // Complete the polygon
      addBuilding(currentPoints);
      // Record for undo/redo - get the newly added building
      const addedBuilding = project.buildings[project.buildings.length - 1];
      if (addedBuilding) {
        recordAddBuilding(addedBuilding);
      }
      setCurrentPoints([]);
      setIsNearStartPoint(false);
      showToast('Building created! Use the Properties panel to set floor count.', ErrorSeverity.INFO);
    }
  };

  // Phase 2: Handle mouse down for marquee selection and vertex dragging
  // Phase 3: Also handles rectangle drawing
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    let point = screenToImage(e.clientX, e.clientY);

    // Apply snap-to-grid if enabled
    if (editorSettings.snapToGrid) {
      const gridSizeInImageCoords = editorSettings.gridSize / imageScale;
      point = snapToGrid(point, gridSizeInImageCoords, true);
    }

    // Phase 3: Start rectangle drawing
    if (activeTool === 'rectangle') {
      setIsDrawingRectangle(true);
      setRectangleStart(point);
      setRectangleEnd(point);
      return;
    }

    // Phase 3: Template tool - place shape on click
    if (activeTool === 'template') {
      const footprint = createTemplateShape(point, selectedTemplate, 60 / imageScale);
      addBuilding(footprint, `${selectedTemplate.charAt(0).toUpperCase() + selectedTemplate.slice(1)} ${buildings.length + 1}`);
      const addedBuilding = project.buildings[project.buildings.length - 1];
      if (addedBuilding) {
        recordAddBuilding(addedBuilding);
      }
      showToast(`${selectedTemplate} building created!`, ErrorSeverity.INFO);
      return;
    }

    if (activeTool === 'select') {
      const building = findBuildingAtPoint(point);

      if (!building) {
        // Start marquee selection on empty space
        setIsMarqueeSelecting(true);
        setMarqueeStart(point);
        setMarqueeEnd(point);
      }
    }

    // Vertex editing: check if clicking on a vertex
    if (isEditingVertices && editingBuildingId) {
      const building = buildings.find(b => b.id === editingBuildingId);
      if (building) {
        const vertexThreshold = 10 / imageScale; // 10 pixels
        const vertexIndex = building.footprint.findIndex(v =>
          isNearPoint(point, v, vertexThreshold)
        );
        if (vertexIndex !== -1) {
          setDraggingVertexIndex(vertexIndex);
        }
      }
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    let point = screenToImage(e.clientX, e.clientY);

    // Apply snap-to-grid if enabled (for most tools)
    if (editorSettings.snapToGrid && (activeTool === 'rectangle' || activeTool === 'template')) {
      const gridSizeInImageCoords = editorSettings.gridSize / imageScale;
      point = snapToGrid(point, gridSizeInImageCoords, true);
    }

    // Phase 3: Update rectangle drawing
    if (isDrawingRectangle && rectangleStart) {
      // Apply snap-to-grid
      if (editorSettings.snapToGrid) {
        const gridSizeInImageCoords = editorSettings.gridSize / imageScale;
        point = snapToGrid(point, gridSizeInImageCoords, true);
      }

      // Apply square constraint if Shift is held
      if (shiftKeyHeld) {
        const width = point.x - rectangleStart.x;
        const height = point.y - rectangleStart.y;
        const size = Math.max(Math.abs(width), Math.abs(height));
        point = {
          x: rectangleStart.x + (width >= 0 ? size : -size),
          y: rectangleStart.y + (height >= 0 ? size : -size)
        };
      }

      setRectangleEnd(point);
      return;
    }

    // Phase 2: Update marquee selection
    if (isMarqueeSelecting) {
      setMarqueeEnd(point);
      return;
    }

    // Phase 2: Drag vertex
    if (draggingVertexIndex !== null && editingBuildingId) {
      // Apply snap-to-grid if enabled
      if (editorSettings.snapToGrid) {
        const gridSizeInImageCoords = editorSettings.gridSize / imageScale;
        point = snapToGrid(point, gridSizeInImageCoords, true);
      }

      const building = buildings.find(b => b.id === editingBuildingId);
      if (building) {
        const newFootprint = [...building.footprint];
        newFootprint[draggingVertexIndex] = point;
        updateBuilding(editingBuildingId, { footprint: newFootprint });
      }
      return;
    }

    if (activeTool === 'draw') {
      // Apply snap-to-grid for cursor preview
      if (editorSettings.snapToGrid) {
        const gridSizeInImageCoords = editorSettings.gridSize / imageScale;
        point = snapToGrid(point, gridSizeInImageCoords, true);
      }

      // Apply orthogonal constraint for cursor preview
      if (shiftKeyHeld && currentPoints.length > 0) {
        const lastPoint = currentPoints[currentPoints.length - 1];
        point = constrainToOrthogonal(point, lastPoint, true);
      }

      setCursorPosition(point);

      // Check if near start point for close-loop indicator
      if (currentPoints.length >= 3) {
        const startPoint = currentPoints[0];
        // Convert threshold from screen pixels to image coordinates
        const thresholdInImageCoords = CLOSE_LOOP_THRESHOLD / imageScale;
        const nearStart = isNearPoint(point, startPoint, thresholdInImageCoords);
        setIsNearStartPoint(nearStart);
      } else {
        setIsNearStartPoint(false);
      }
    } else {
      setCursorPosition(null);
      setIsNearStartPoint(false);
    }

    if (activeTool === 'select' || activeTool === 'delete' || activeTool === 'edit') {
      const building = findBuildingAtPoint(point);
      setHoveredBuildingId(building?.id || null);
    }
  };

  // Phase 2: Handle mouse up for marquee selection and vertex dragging
  const handleCanvasMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const isShiftHeld = e.shiftKey;

    // Phase 3: Complete rectangle drawing
    if (isDrawingRectangle && rectangleStart && rectangleEnd) {
      const footprint = createRectangleFootprint(rectangleStart, rectangleEnd, isShiftHeld);

      // Only create building if it has a reasonable size
      const width = Math.abs(rectangleEnd.x - rectangleStart.x);
      const height = Math.abs(rectangleEnd.y - rectangleStart.y);
      const minSize = 10 / imageScale; // 10 pixels minimum

      if (width >= minSize && height >= minSize) {
        addBuilding(footprint, `Rectangle ${buildings.length + 1}`);
        const addedBuilding = project.buildings[project.buildings.length - 1];
        if (addedBuilding) {
          recordAddBuilding(addedBuilding);
        }
        showToast('Rectangle building created!', ErrorSeverity.INFO);
      }

      setIsDrawingRectangle(false);
      setRectangleStart(null);
      setRectangleEnd(null);
      return;
    }

    // Complete marquee selection
    if (isMarqueeSelecting && marqueeStart && marqueeEnd) {
      const selectedByMarquee = buildings.filter(b =>
        buildingIntersectsMarquee(b, marqueeStart, marqueeEnd)
      );

      if (selectedByMarquee.length > 0) {
        if (isShiftHeld) {
          // Add to existing selection
          setSelectedBuildingIds(prev => {
            const newSet = new Set(prev);
            selectedByMarquee.forEach(b => newSet.add(b.id));
            return newSet;
          });
        } else {
          // Replace selection
          setSelectedBuildingIds(new Set(selectedByMarquee.map(b => b.id)));
        }
        showToast(`Selected ${selectedByMarquee.length} building(s)`, ErrorSeverity.INFO);
      }

      setIsMarqueeSelecting(false);
      setMarqueeStart(null);
      setMarqueeEnd(null);
    }

    // Complete vertex drag
    if (draggingVertexIndex !== null && editingBuildingId) {
      const building = buildings.find(b => b.id === editingBuildingId);
      if (building) {
        // Record the vertex move for undo
        recordUpdateBuilding(editingBuildingId, { footprint: building.footprint }, { footprint: building.footprint });
      }
      setDraggingVertexIndex(null);
    }
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Track shift key for orthogonal constraint
      if (e.key === 'Shift') {
        setShiftKeyHeld(true);
        setEditorSettings(prev => ({ ...prev, orthogonalConstraint: true }));
      }

      // Escape - cancel drawing or deselect
      if (e.key === 'Escape') {
        if (currentPoints.length > 0) {
          setCurrentPoints([]);
          setIsNearStartPoint(false);
        } else if (isEditingVertices) {
          setIsEditingVertices(false);
          setEditingBuildingId(null);
          setActiveTool('select');
        } else {
          setSelectedBuildingIds(new Set());
          selectBuilding(undefined);
        }
      }

      // Delete/Backspace - delete selected building(s)
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedBuildingIds.size > 0) {
          const buildingsToDelete = buildings.filter(b => selectedBuildingIds.has(b.id));
          buildingsToDelete.forEach(building => {
            recordDeleteBuilding(building);
            removeBuilding(building.id);
          });
          clearSelection();
          showToast(`Deleted ${buildingsToDelete.length} building(s). Press Ctrl+Z to undo.`, ErrorSeverity.INFO);
        }
      }

      // Ctrl+Z - Undo
      if (e.key === 'z' && e.ctrlKey && !e.shiftKey) {
        e.preventDefault();
        if (currentPoints.length > 0) {
          // If drawing, undo last point
          setCurrentPoints(currentPoints.slice(0, -1));
        } else if (canUndo) {
          // Otherwise, undo last action
          undo();
        }
      }

      // Ctrl+Y or Ctrl+Shift+Z - Redo
      if ((e.key === 'y' && e.ctrlKey) || (e.key === 'z' && e.ctrlKey && e.shiftKey)) {
        e.preventDefault();
        if (canRedo) {
          redo();
        }
      }

      // Enter - Complete building
      if (e.key === 'Enter' && activeTool === 'draw' && currentPoints.length >= 3) {
        addBuilding(currentPoints);
        const addedBuilding = project.buildings[project.buildings.length - 1];
        if (addedBuilding) {
          recordAddBuilding(addedBuilding);
        }
        setCurrentPoints([]);
        setIsNearStartPoint(false);
        showToast('Building created!', ErrorSeverity.INFO);
      }

      // D - Draw tool
      if (e.key === 'd' && !e.ctrlKey && !e.metaKey) {
        setActiveTool('draw');
      }

      // V - Select tool
      if (e.key === 'v' && !e.ctrlKey && !e.metaKey) {
        setActiveTool('select');
      }

      // X - Delete tool
      if (e.key === 'x' && !e.ctrlKey && !e.metaKey) {
        setActiveTool('delete');
      }

      // Ctrl+A - Select all buildings
      if (e.key === 'a' && e.ctrlKey) {
        e.preventDefault();
        if (buildings.length > 0) {
          setSelectedBuildingIds(new Set(buildings.map(b => b.id)));
          showToast(`Selected all ${buildings.length} building(s)`, ErrorSeverity.INFO);
        }
      }

      // Ctrl+D - Duplicate selected building(s) (handled inline to avoid dependency issues)
      if (e.key === 'd' && e.ctrlKey) {
        e.preventDefault();
        // Duplication is handled separately to avoid circular dependencies
      }

      // E - Enter vertex editing mode
      if (e.key === 'e' && !e.ctrlKey && !e.metaKey) {
        if (selectedBuildingIds.size === 1) {
          const buildingId = Array.from(selectedBuildingIds)[0];
          setIsEditingVertices(true);
          setEditingBuildingId(buildingId);
          setActiveTool('edit');
          showToast('Vertex editing mode. Drag vertices to reshape.', ErrorSeverity.INFO);
        }
      }

      // R - Rectangle tool
      if (e.key === 'r' && !e.ctrlKey && !e.metaKey) {
        setActiveTool('rectangle');
      }
    },
    [currentPoints, selectedBuildingIds, removeBuilding, buildings, canUndo, canRedo, undo, redo, activeTool, addBuilding, project.buildings, recordAddBuilding, recordDeleteBuilding, selectBuilding, showToast, isEditingVertices]
  );

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Shift') {
      setShiftKeyHeld(false);
      setEditorSettings(prev => ({ ...prev, orthogonalConstraint: false }));
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  // Helper: Get primary selected building (first in selection) for Properties panel
  const selectedBuildingId = selectedBuildingIds.size === 1 ? Array.from(selectedBuildingIds)[0] : null;
  const selectedBuilding = selectedBuildingId ? buildings.find((b) => b.id === selectedBuildingId) : null;
  const selectedBuildings = buildings.filter(b => selectedBuildingIds.has(b.id));

  // Helper: Toggle building in selection
  const toggleBuildingSelection = useCallback((buildingId: string, addToSelection: boolean) => {
    if (addToSelection) {
      // Shift+Click: toggle in selection
      setSelectedBuildingIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(buildingId)) {
          newSet.delete(buildingId);
        } else {
          newSet.add(buildingId);
        }
        return newSet;
      });
    } else {
      // Normal click: select only this building
      setSelectedBuildingIds(new Set([buildingId]));
    }
  }, []);

  // Helper: Clear selection
  const clearSelection = useCallback(() => {
    setSelectedBuildingIds(new Set());
    selectBuilding(undefined);
  }, [selectBuilding]);

  // Helper: Duplicate selected buildings
  const duplicateSelectedBuildings = useCallback(() => {
    if (selectedBuildingIds.size === 0) return;

    const buildingsToDuplicate = buildings.filter(b => selectedBuildingIds.has(b.id));
    const newBuildingIds: string[] = [];
    buildingsToDuplicate.forEach(building => {
      // Offset footprint by 20 pixels to the right
      const offsetFootprint = building.footprint.map(p => ({
        x: p.x + 20 / imageScale,
        y: p.y + 20 / imageScale,
      }));

      // Create new building with incremented name
      const baseName = building.name.replace(/\s*\(copy\s*\d*\)$/, '');
      const copyCount = buildings.filter(b => b.name.startsWith(baseName)).length;
      const newName = `${baseName} (copy${copyCount > 1 ? ` ${copyCount}` : ''})`;

      addBuilding(offsetFootprint, newName);

      // Get the newly added building and update its properties
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

    // Select the new buildings
    setSelectedBuildingIds(new Set(newBuildingIds));
    showToast(`Duplicated ${buildingsToDuplicate.length} building(s)`, ErrorSeverity.INFO);
  }, [selectedBuildingIds, imageScale, buildings, addBuilding, project.buildings, updateBuilding, recordAddBuilding, showToast]);

  // Separate effect for Ctrl+D
  useEffect(() => {
    const handleCtrlD = (e: KeyboardEvent) => {
      if (e.key === 'd' && e.ctrlKey && selectedBuildingIds.size > 0) {
        e.preventDefault();
        duplicateSelectedBuildings();
      }
    };
    window.addEventListener('keydown', handleCtrlD);
    return () => window.removeEventListener('keydown', handleCtrlD);
  }, [selectedBuildingIds, duplicateSelectedBuildings]);

  // Phase 3: Create rectangle footprint from two corners
  const createRectangleFootprint = useCallback((start: Point2D, end: Point2D, isSquare: boolean = false): Point2D[] => {
    let width = end.x - start.x;
    let height = end.y - start.y;

    // If square mode (Shift held), make width = height (use the larger dimension)
    if (isSquare) {
      const size = Math.max(Math.abs(width), Math.abs(height));
      width = width >= 0 ? size : -size;
      height = height >= 0 ? size : -size;
    }

    return [
      { x: start.x, y: start.y },
      { x: start.x + width, y: start.y },
      { x: start.x + width, y: start.y + height },
      { x: start.x, y: start.y + height },
    ];
  }, []);

  // Phase 3: Create template shape at position
  const createTemplateShape = useCallback((center: Point2D, template: ShapeTemplate, size: number = 50): Point2D[] => {
    const halfSize = size / 2;

    switch (template) {
      case 'rectangle':
        return [
          { x: center.x - halfSize, y: center.y - halfSize * 0.6 },
          { x: center.x + halfSize, y: center.y - halfSize * 0.6 },
          { x: center.x + halfSize, y: center.y + halfSize * 0.6 },
          { x: center.x - halfSize, y: center.y + halfSize * 0.6 },
        ];
      case 'square':
        return [
          { x: center.x - halfSize, y: center.y - halfSize },
          { x: center.x + halfSize, y: center.y - halfSize },
          { x: center.x + halfSize, y: center.y + halfSize },
          { x: center.x - halfSize, y: center.y + halfSize },
        ];
      case 'l-shape':
        return [
          { x: center.x - halfSize, y: center.y - halfSize },
          { x: center.x + halfSize * 0.3, y: center.y - halfSize },
          { x: center.x + halfSize * 0.3, y: center.y },
          { x: center.x + halfSize, y: center.y },
          { x: center.x + halfSize, y: center.y + halfSize },
          { x: center.x - halfSize, y: center.y + halfSize },
        ];
      case 'tower':
        return [
          { x: center.x - halfSize * 0.4, y: center.y - halfSize * 0.4 },
          { x: center.x + halfSize * 0.4, y: center.y - halfSize * 0.4 },
          { x: center.x + halfSize * 0.4, y: center.y + halfSize * 0.4 },
          { x: center.x - halfSize * 0.4, y: center.y + halfSize * 0.4 },
        ];
      case 'u-shape':
        return [
          { x: center.x - halfSize, y: center.y - halfSize },
          { x: center.x - halfSize * 0.3, y: center.y - halfSize },
          { x: center.x - halfSize * 0.3, y: center.y + halfSize * 0.3 },
          { x: center.x + halfSize * 0.3, y: center.y + halfSize * 0.3 },
          { x: center.x + halfSize * 0.3, y: center.y - halfSize },
          { x: center.x + halfSize, y: center.y - halfSize },
          { x: center.x + halfSize, y: center.y + halfSize },
          { x: center.x - halfSize, y: center.y + halfSize },
        ];
      default:
        return createTemplateShape(center, 'rectangle', size);
    }
  }, []);

  // Phase 3: Apply preset to selected buildings
  const applyPresetToSelection = useCallback((preset: BuildingPreset) => {
    if (selectedBuildingIds.size === 0) return;

    const previousStates = selectedBuildings.map(b => ({
      id: b.id,
      state: { floors: b.floors, floorHeight: b.floorHeight }
    }));

    selectedBuildings.forEach(building => {
      updateBuilding(building.id, {
        floors: preset.floors,
        floorHeight: preset.floorHeight,
      });
    });

    recordBulkUpdate(previousStates, selectedBuildings.map(b => ({
      ...b,
      floors: preset.floors,
      floorHeight: preset.floorHeight
    })));

    showToast(`Applied "${preset.name}" to ${selectedBuildings.length} building(s)`, ErrorSeverity.INFO);
    setShowPresetsDropdown(false);
  }, [selectedBuildingIds, selectedBuildings, updateBuilding, recordBulkUpdate, showToast]);

  // Phase 4: Group colors for visual identification
  const GROUP_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#8b5cf6', '#ec4899'];

  // Phase 4: Get group color by index
  const getGroupColor = useCallback((groupId: string): string => {
    const groupIds = Array.from(buildingGroups.keys());
    const index = groupIds.indexOf(groupId);
    return GROUP_COLORS[index % GROUP_COLORS.length];
  }, [buildingGroups]);

  // Phase 4: Create a group from selected buildings
  const createGroup = useCallback(() => {
    if (selectedBuildingIds.size < 2) {
      showToast('Select at least 2 buildings to create a group', ErrorSeverity.WARNING);
      return;
    }

    const groupId = `group-${Date.now()}`;
    const buildingIds = new Set(selectedBuildingIds);

    // Check if any selected buildings are already in a group
    const existingGroups = new Set<string>();
    selectedBuildingIds.forEach(id => {
      const existingGroup = buildingToGroup.get(id);
      if (existingGroup) {
        existingGroups.add(existingGroup);
      }
    });

    // Remove buildings from existing groups
    if (existingGroups.size > 0) {
      setBuildingGroups(prev => {
        const newGroups = new Map(prev);
        existingGroups.forEach(gId => {
          const group = newGroups.get(gId);
          if (group) {
            selectedBuildingIds.forEach(bId => group.delete(bId));
            if (group.size === 0) {
              newGroups.delete(gId);
            }
          }
        });
        newGroups.set(groupId, buildingIds);
        return newGroups;
      });
    } else {
      setBuildingGroups(prev => new Map(prev).set(groupId, buildingIds));
    }

    // Update building to group mapping
    setBuildingToGroup(prev => {
      const newMap = new Map(prev);
      selectedBuildingIds.forEach(id => newMap.set(id, groupId));
      return newMap;
    });

    showToast(`Created group with ${buildingIds.size} buildings`, ErrorSeverity.INFO);
  }, [selectedBuildingIds, buildingToGroup, showToast]);

  // Phase 4: Ungroup selected buildings
  const ungroupSelected = useCallback(() => {
    const groupsToCheck = new Set<string>();
    selectedBuildingIds.forEach(id => {
      const groupId = buildingToGroup.get(id);
      if (groupId) groupsToCheck.add(groupId);
    });

    if (groupsToCheck.size === 0) {
      showToast('Selected buildings are not in any group', ErrorSeverity.WARNING);
      return;
    }

    // Remove buildings from groups
    setBuildingGroups(prev => {
      const newGroups = new Map(prev);
      groupsToCheck.forEach(groupId => {
        const group = newGroups.get(groupId);
        if (group) {
          selectedBuildingIds.forEach(id => group.delete(id));
          if (group.size < 2) {
            // Remove group if less than 2 buildings remain
            if (group.size === 1) {
              const remainingId = Array.from(group)[0];
              setBuildingToGroup(p => {
                const m = new Map(p);
                m.delete(remainingId);
                return m;
              });
            }
            newGroups.delete(groupId);
          }
        }
      });
      return newGroups;
    });

    // Update building to group mapping
    setBuildingToGroup(prev => {
      const newMap = new Map(prev);
      selectedBuildingIds.forEach(id => newMap.delete(id));
      return newMap;
    });

    showToast('Buildings ungrouped', ErrorSeverity.INFO);
  }, [selectedBuildingIds, buildingToGroup, showToast]);

  // Phase 4: Select all buildings in a group
  const selectGroup = useCallback((groupId: string) => {
    const group = buildingGroups.get(groupId);
    if (group) {
      setSelectedBuildingIds(new Set(group));
      showToast(`Selected ${group.size} buildings in group`, ErrorSeverity.INFO);
    }
  }, [buildingGroups, showToast]);

  // Phase 4: Create array of buildings from selected building
  const createBuildingArray = useCallback(() => {
    if (selectedBuildingIds.size !== 1) {
      showToast('Select exactly one building to create an array', ErrorSeverity.WARNING);
      return;
    }

    const sourceBuilding = selectedBuildings[0];
    if (!sourceBuilding) return;

    const { rows, columns, spacingX, spacingY } = arrayConfig;
    const newBuildingIds: string[] = [];

    // Calculate footprint bounds
    const minX = Math.min(...sourceBuilding.footprint.map(p => p.x));
    const maxX = Math.max(...sourceBuilding.footprint.map(p => p.x));
    const minY = Math.min(...sourceBuilding.footprint.map(p => p.y));
    const maxY = Math.max(...sourceBuilding.footprint.map(p => p.y));
    const width = maxX - minX;
    const height = maxY - minY;

    // Convert spacing from pixels to image coordinates
    const spacingXCoord = spacingX / imageScale;
    const spacingYCoord = spacingY / imageScale;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        // Skip the original building position (0,0)
        if (row === 0 && col === 0) continue;

        const offsetX = col * (width + spacingXCoord);
        const offsetY = row * (height + spacingYCoord);

        const newFootprint = sourceBuilding.footprint.map(p => ({
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
          newBuildingIds.push(addedBuilding.id);
        }
      }
    }

    showToast(`Created ${rows * columns - 1} new buildings`, ErrorSeverity.INFO);
    setShowArrayModal(false);
  }, [selectedBuildingIds, selectedBuildings, arrayConfig, imageScale, addBuilding, project.buildings, updateBuilding, recordAddBuilding, showToast]);

  // Phase 4: Export buildings configuration as JSON
  const exportBuildingsConfig = useCallback(() => {
    const config = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      buildings: buildings.map(b => ({
        name: b.name,
        footprint: b.footprint,
        floors: b.floors,
        floorHeight: b.floorHeight,
        color: b.color,
      })),
      groups: Array.from(buildingGroups.entries()).map(([groupId, buildingIds]) => ({
        id: groupId,
        buildingNames: Array.from(buildingIds)
          .map(id => buildings.find(b => b.id === id)?.name)
          .filter(Boolean),
      })),
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `buildings-config-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Buildings configuration exported', ErrorSeverity.INFO);
    setShowExportModal(false);
  }, [buildings, buildingGroups, showToast]);

  // Phase 4: Import buildings configuration from JSON
  const importBuildingsConfig = useCallback((jsonString: string) => {
    try {
      const config = JSON.parse(jsonString);

      if (!config.buildings || !Array.isArray(config.buildings)) {
        throw new Error('Invalid configuration: missing buildings array');
      }

      // Clear existing buildings if requested
      const importedIds: string[] = [];

      config.buildings.forEach((b: { name: string; footprint: Point2D[]; floors: number; floorHeight: number; color?: string }) => {
        if (!b.footprint || !Array.isArray(b.footprint) || b.footprint.length < 3) {
          return; // Skip invalid buildings
        }

        addBuilding(b.footprint, b.name || 'Imported Building');
        const addedBuilding = project.buildings[project.buildings.length - 1];
        if (addedBuilding) {
          updateBuilding(addedBuilding.id, {
            floors: b.floors || 4,
            floorHeight: b.floorHeight || 3,
            color: b.color,
          });
          recordAddBuilding(addedBuilding);
          importedIds.push(addedBuilding.id);
        }
      });

      showToast(`Imported ${importedIds.length} buildings`, ErrorSeverity.INFO);
      setShowImportModal(false);
    } catch (error) {
      showToast(`Import failed: ${error instanceof Error ? error.message : 'Invalid JSON'}`, ErrorSeverity.ERROR);
    }
  }, [addBuilding, project.buildings, updateBuilding, recordAddBuilding, showToast]);

  // Helper: Check if building intersects with marquee rectangle
  const buildingIntersectsMarquee = useCallback((building: Building, start: Point2D, end: Point2D): boolean => {
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);

    // Check if any vertex is inside the marquee
    return building.footprint.some(p =>
      p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY
    );
  }, []);

  // Validation functions
  const validateFloorCount = (value: number): { valid: boolean; error?: string } => {
    if (!validators.floorCount(value)) {
      return { valid: false, error: 'Floor count must be between 1 and 100' };
    }
    return { valid: true };
  };

  const validateFloorHeight = (value: number): { valid: boolean; error?: string } => {
    if (!validators.floorHeight(value)) {
      return { valid: false, error: 'Floor height must be between 2m and 10m' };
    }
    return { valid: true };
  };

  // Handle floor count update with validation
  const handleFloorCountChange = (buildingId: string, value: number) => {
    const validation = validateFloorCount(value);
    if (validation.valid) {
      const building = buildings.find(b => b.id === buildingId);
      if (building) {
        recordUpdateBuilding(buildingId, { floors: building.floors }, { floors: value });
      }
      updateBuilding(buildingId, { floors: value });
      setBuildingErrors(prev => ({ ...prev, floors: undefined }));
    } else {
      setBuildingErrors(prev => ({ ...prev, floors: validation.error }));
    }
  };

  // Handle floor height update with validation
  const handleFloorHeightChange = (buildingId: string, value: number) => {
    const validation = validateFloorHeight(value);
    if (validation.valid) {
      const building = buildings.find(b => b.id === buildingId);
      if (building) {
        recordUpdateBuilding(buildingId, { floorHeight: building.floorHeight }, { floorHeight: value });
      }
      updateBuilding(buildingId, { floorHeight: value });
      setBuildingErrors(prev => ({ ...prev, floorHeight: undefined }));
    } else {
      setBuildingErrors(prev => ({ ...prev, floorHeight: validation.error }));
    }
  };

  // Handle continue to 3D View with validation
  const handleContinueToViewer = () => {
    if (buildings.length === 0) {
      showToast(
        'Please add at least one building before continuing.',
        ErrorSeverity.WARNING,
        { recoveryAction: 'Use the Draw tool to create building footprints.' }
      );
      return;
    }

    // Check for any buildings with invalid configurations
    const invalidBuildings = buildings.filter(b =>
      !validators.floorCount(b.floors) || !validators.floorHeight(b.floorHeight)
    );

    if (invalidBuildings.length > 0) {
      showToast(
        `${invalidBuildings.length} building(s) have invalid settings. Please fix before continuing.`,
        ErrorSeverity.WARNING,
        { recoveryAction: 'Check floor count (1-100) and floor height (2-10m) for each building.' }
      );
      return;
    }

    setCurrentStep('viewer');
  };

  // Apply bulk edit to all buildings with validation
  const applyBulkEdit = () => {
    // Validate bulk edit values
    const floorsValidation = validateFloorCount(bulkFloors);
    const heightValidation = validateFloorHeight(bulkFloorHeight);

    setBulkEditErrors({
      floors: floorsValidation.valid ? undefined : floorsValidation.error,
      floorHeight: heightValidation.valid ? undefined : heightValidation.error,
    });

    if (!floorsValidation.valid || !heightValidation.valid) {
      showToast(
        'Please fix the validation errors before applying.',
        ErrorSeverity.WARNING
      );
      return;
    }

    // Record previous states for undo
    const previousStates = buildings.map(b => ({
      id: b.id,
      state: { floors: b.floors, floorHeight: b.floorHeight }
    }));

    // Apply updates
    buildings.forEach((b) => {
      updateBuilding(b.id, { floors: bulkFloors, floorHeight: bulkFloorHeight });
    });

    // Record bulk update for undo/redo
    recordBulkUpdate(previousStates, buildings.map(b => ({
      ...b,
      floors: bulkFloors,
      floorHeight: bulkFloorHeight
    })));

    setShowBulkEditModal(false);
    showToast(
      `Updated ${buildings.length} building(s) to ${bulkFloors} floors at ${bulkFloorHeight}m each.`,
      ErrorSeverity.INFO
    );
  };

  // Delete all buildings
  const deleteAllBuildings = () => {
    if (window.confirm('Are you sure you want to delete all buildings?')) {
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
          <div className="card">
            <h4 className="font-medium text-gray-900 mb-3">Tools</h4>
            <div className="grid grid-cols-2 gap-2" role="toolbar" aria-label="Drawing tools">
              <button
                onClick={() => setActiveTool('draw')}
                aria-label="Draw building footprint"
                aria-pressed={activeTool === 'draw'}
                className={`p-3 rounded-lg border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 ${
                  activeTool === 'draw'
                    ? 'border-amber-500 bg-amber-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <svg className="w-6 h-6 mx-auto text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-xs text-gray-600 block mt-1">Draw</span>
              </button>
              <button
                onClick={() => setActiveTool('select')}
                aria-label="Select building"
                aria-pressed={activeTool === 'select'}
                className={`p-3 rounded-lg border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 ${
                  activeTool === 'select'
                    ? 'border-amber-500 bg-amber-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <svg className="w-6 h-6 mx-auto text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
                <span className="text-xs text-gray-600 block mt-1">Select</span>
              </button>
              <button
                onClick={() => setActiveTool('delete')}
                aria-label="Delete building"
                aria-pressed={activeTool === 'delete'}
                className={`p-3 rounded-lg border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 ${
                  activeTool === 'delete'
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <svg className="w-6 h-6 mx-auto text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span className="text-xs text-gray-600 block mt-1">Delete</span>
              </button>
              <button
                onClick={() => {
                  setActiveTool('edit');
                  if (selectedBuildingIds.size === 1) {
                    const buildingId = Array.from(selectedBuildingIds)[0];
                    setIsEditingVertices(true);
                    setEditingBuildingId(buildingId);
                  }
                }}
                aria-label="Edit vertices"
                aria-pressed={activeTool === 'edit'}
                className={`p-3 rounded-lg border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                  activeTool === 'edit'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <svg className="w-6 h-6 mx-auto text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span className="text-xs text-gray-600 block mt-1">Edit</span>
              </button>
              {/* Phase 3: Rectangle tool */}
              <button
                onClick={() => setActiveTool('rectangle')}
                aria-label="Draw rectangle"
                aria-pressed={activeTool === 'rectangle'}
                className={`p-3 rounded-lg border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                  activeTool === 'rectangle'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <svg className="w-6 h-6 mx-auto text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 18h16M4 6v12M20 6v12" />
                </svg>
                <span className="text-xs text-gray-600 block mt-1">Rect</span>
              </button>
            </div>

            {/* Phase 3: Shape Templates */}
            <div className="mt-3 pt-3 border-t border-gray-200">
              <h5 className="text-xs font-medium text-gray-700 mb-2">Quick Shapes</h5>
              <div className="grid grid-cols-4 gap-1">
                {(['rectangle', 'square', 'l-shape', 'tower'] as ShapeTemplate[]).map((template) => (
                  <button
                    key={template}
                    onClick={() => {
                      setSelectedTemplate(template);
                      setActiveTool('template');
                    }}
                    className={`p-2 rounded border text-[10px] transition-colors ${
                      activeTool === 'template' && selectedTemplate === template
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                    title={`Click on canvas to place ${template}`}
                  >
                    {template === 'rectangle' && '▬'}
                    {template === 'square' && '■'}
                    {template === 'l-shape' && '⌐'}
                    {template === 'tower' && '◼'}
                  </button>
                ))}
              </div>
            </div>

            {/* Undo/Redo section */}
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    if (currentPoints.length > 0) {
                      setCurrentPoints(currentPoints.slice(0, -1));
                    } else if (canUndo) {
                      undo();
                    }
                  }}
                  disabled={currentPoints.length === 0 && !canUndo}
                  title={`Undo${getUndoDescription() ? `: ${getUndoDescription()}` : ''} (Ctrl+Z)`}
                  className="flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  Undo
                </button>
                <button
                  onClick={() => canRedo && redo()}
                  disabled={!canRedo}
                  title={`Redo${getRedoDescription() ? `: ${getRedoDescription()}` : ''} (Ctrl+Y)`}
                  className="flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
                  </svg>
                  Redo
                </button>
              </div>
            </div>

            <div className="mt-4 text-xs text-gray-500">
              {activeTool === 'draw' && (
                <>
                  <p>Click to add points. Double-click or press Enter to complete.</p>
                  <p className="mt-1 text-gray-400">Hold Shift for 90° angles</p>
                </>
              )}
              {activeTool === 'select' && (
                <>
                  <p>Click to select. Shift+Click to multi-select.</p>
                  <p className="mt-1 text-gray-400">Drag on empty space to marquee select</p>
                </>
              )}
              {activeTool === 'edit' && (
                <>
                  <p>Drag vertices to reshape building.</p>
                  <p className="mt-1 text-gray-400">Press V or Esc to exit edit mode</p>
                </>
              )}
              {activeTool === 'delete' && <p>Click a building to delete it.</p>}
              {activeTool === 'rectangle' && (
                <>
                  <p>Click+drag to draw a rectangle.</p>
                  <p className="mt-1 text-gray-400">Hold Shift for square</p>
                </>
              )}
              {activeTool === 'template' && (
                <>
                  <p>Click to place a {selectedTemplate} shape.</p>
                  <p className="mt-1 text-gray-400">Select a template from Quick Shapes</p>
                </>
              )}
            </div>

            {/* Editor Settings */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h5 className="text-xs font-medium text-gray-700 mb-2">Drawing Aids</h5>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editorSettings.snapToGrid}
                    onChange={(e) => setEditorSettings(prev => ({ ...prev, snapToGrid: e.target.checked }))}
                    className="rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                  />
                  Snap to grid
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editorSettings.showGrid}
                    onChange={(e) => setEditorSettings(prev => ({ ...prev, showGrid: e.target.checked }))}
                    className="rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                  />
                  Show grid overlay
                </label>
              </div>
            </div>

            {/* Keyboard Shortcuts */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h5 className="text-xs font-medium text-gray-700 mb-2">Shortcuts</h5>
              <div className="grid grid-cols-2 gap-1 text-[10px] text-gray-500">
                <span><kbd className="px-1 bg-gray-100 rounded">D</kbd> Draw</span>
                <span><kbd className="px-1 bg-gray-100 rounded">V</kbd> Select</span>
                <span><kbd className="px-1 bg-gray-100 rounded">X</kbd> Delete</span>
                <span><kbd className="px-1 bg-gray-100 rounded">E</kbd> Edit</span>
                <span><kbd className="px-1 bg-gray-100 rounded">R</kbd> Rectangle</span>
                <span><kbd className="px-1 bg-gray-100 rounded">Enter</kbd> Complete</span>
                <span><kbd className="px-1 bg-gray-100 rounded">Esc</kbd> Cancel</span>
                <span><kbd className="px-1 bg-gray-100 rounded">Ctrl+Z</kbd> Undo</span>
                <span><kbd className="px-1 bg-gray-100 rounded">Ctrl+D</kbd> Duplicate</span>
                <span><kbd className="px-1 bg-gray-100 rounded">Ctrl+A</kbd> Select All</span>
                <span><kbd className="px-1 bg-gray-100 rounded">Shift</kbd> Multi-select</span>
              </div>
            </div>
          </div>

          {/* Building List */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">
                Buildings ({buildings.length})
              </h4>
              <div className="flex gap-1 flex-wrap justify-end">
                {/* Phase 4: Import/Export */}
                <button
                  onClick={() => setShowImportModal(true)}
                  className="text-xs text-green-600 hover:underline"
                  title="Import buildings from JSON"
                >
                  Import
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={() => setShowExportModal(true)}
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
                      onClick={() => setShowBulkEditModal(true)}
                      className="text-xs text-blue-600 hover:underline"
                      title="Edit all buildings"
                    >
                      Bulk Edit
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={deleteAllBuildings}
                      className="text-xs text-red-500 hover:underline"
                      title="Delete all buildings"
                    >
                      Clear All
                    </button>
                  </>
                )}
              </div>
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
                aria-activedescendant={selectedBuildingId ? `building-${selectedBuildingId}` : undefined}
                onKeyDown={(e) => {
                  const firstSelectedId = selectedBuildingIds.size > 0 ? Array.from(selectedBuildingIds)[0] : null;
                  const currentIndex = firstSelectedId ? buildings.findIndex(b => b.id === firstSelectedId) : -1;
                  let newIndex = currentIndex;

                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    newIndex = currentIndex < buildings.length - 1 ? currentIndex + 1 : 0;
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    newIndex = currentIndex > 0 ? currentIndex - 1 : buildings.length - 1;
                  } else if (e.key === 'Home') {
                    e.preventDefault();
                    newIndex = 0;
                  } else if (e.key === 'End') {
                    e.preventDefault();
                    newIndex = buildings.length - 1;
                  } else if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (selectedBuildingIds.size > 0) {
                      setActiveTool('select');
                    }
                    return;
                  }

                  if (newIndex !== currentIndex && buildings[newIndex]) {
                    if (e.shiftKey) {
                      // Shift+Arrow: add to selection
                      setSelectedBuildingIds(prev => new Set([...prev, buildings[newIndex].id]));
                    } else {
                      // Arrow: select only this one
                      setSelectedBuildingIds(new Set([buildings[newIndex].id]));
                    }
                    selectBuilding(buildings[newIndex].id);
                    // Focus the new item
                    const element = document.getElementById(`building-${buildings[newIndex].id}`);
                    element?.focus();
                  }
                }}
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
                        toggleBuildingSelection(building.id, e.shiftKey);
                        selectBuilding(building.id);
                        setActiveTool('select');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Delete' || e.key === 'Backspace') {
                          e.preventDefault();
                          recordDeleteBuilding(building);
                          removeBuilding(building.id);
                          // Remove from selection
                          setSelectedBuildingIds(prev => {
                            const newSet = new Set(prev);
                            newSet.delete(building.id);
                            return newSet;
                          });
                        }
                      }}
                      className={`p-2 rounded-lg cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 ${
                        isMultiSelected
                          ? 'bg-cyan-100 border border-cyan-300'
                          : isSelected
                          ? 'bg-amber-100 border border-amber-300'
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded"
                          style={{ backgroundColor: building.color }}
                          aria-hidden="true"
                        />
                        <span className="text-sm font-medium">{building.name}</span>
                        {/* Phase 4: Group indicator badge */}
                        {groupId && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              selectGroup(groupId);
                            }}
                            className="ml-auto px-1.5 py-0.5 rounded-full text-[9px] font-medium text-white"
                            style={{ backgroundColor: groupColor || '#6b7280' }}
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

          {/* Selected Building Properties */}
          {selectedBuildingIds.size > 0 && (
            <div className="card">
              <h4 className="font-medium text-gray-900 mb-3">
                {selectedBuildingIds.size === 1 ? 'Properties' : `${selectedBuildingIds.size} Buildings Selected`}
              </h4>

              {/* Multi-select actions */}
              {selectedBuildingIds.size > 1 && (
                <div className="mb-4 p-3 bg-cyan-50 rounded-lg border border-cyan-200">
                  <p className="text-xs text-cyan-800 mb-2">
                    Edit properties to apply to all {selectedBuildingIds.size} buildings
                  </p>
                  <div className="flex gap-2 mb-2">
                    <button
                      onClick={duplicateSelectedBuildings}
                      className="flex-1 text-xs px-2 py-1.5 bg-cyan-100 hover:bg-cyan-200 rounded text-cyan-800 transition-colors"
                    >
                      Duplicate All
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete ${selectedBuildingIds.size} buildings?`)) {
                          selectedBuildings.forEach(b => {
                            recordDeleteBuilding(b);
                            removeBuilding(b.id);
                          });
                          clearSelection();
                        }
                      }}
                      className="flex-1 text-xs px-2 py-1.5 bg-red-100 hover:bg-red-200 rounded text-red-700 transition-colors"
                    >
                      Delete All
                    </button>
                  </div>
                  {/* Phase 4: Group/Ungroup buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={createGroup}
                      className="flex-1 text-xs px-2 py-1.5 bg-purple-100 hover:bg-purple-200 rounded text-purple-800 transition-colors flex items-center justify-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      Group
                    </button>
                    <button
                      onClick={ungroupSelected}
                      className="flex-1 text-xs px-2 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 transition-colors"
                    >
                      Ungroup
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {/* Single building name (only for single selection) */}
                {selectedBuilding && selectedBuildingIds.size === 1 && (
                  <div>
                    <label className="label">Name</label>
                    <input
                      type="text"
                      value={selectedBuilding.name}
                      onChange={(e) =>
                        updateBuilding(selectedBuilding.id, { name: e.target.value })
                      }
                      className="input"
                    />
                  </div>
                )}

                {/* Floor count - works for single or multi-select */}
                <div>
                  <label className="label" id="floors-label">
                    Floors {selectedBuildingIds.size > 1 && '(apply to all)'}
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const newValue = Math.max(1, (selectedBuilding?.floors || bulkFloors) - 1);
                        if (selectedBuildingIds.size === 1 && selectedBuilding) {
                          handleFloorCountChange(selectedBuilding.id, newValue);
                        } else {
                          setBulkFloors(newValue);
                          selectedBuildings.forEach(b => {
                            updateBuilding(b.id, { floors: newValue });
                          });
                        }
                      }}
                      aria-label="Decrease floor count"
                      className="btn-secondary px-3 py-1 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={selectedBuildingIds.size === 1 ? selectedBuilding?.floors : bulkFloors}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 1;
                        if (selectedBuildingIds.size === 1 && selectedBuilding) {
                          handleFloorCountChange(selectedBuilding.id, value);
                        } else {
                          setBulkFloors(value);
                          selectedBuildings.forEach(b => {
                            updateBuilding(b.id, { floors: value });
                          });
                        }
                      }}
                      className={`input text-center w-20 ${buildingErrors.floors ? 'border-red-500' : ''}`}
                      min="1"
                      max="100"
                      aria-invalid={!!buildingErrors.floors}
                      aria-labelledby="floors-label"
                    />
                    <button
                      onClick={() => {
                        const newValue = Math.min(100, (selectedBuilding?.floors || bulkFloors) + 1);
                        if (selectedBuildingIds.size === 1 && selectedBuilding) {
                          handleFloorCountChange(selectedBuilding.id, newValue);
                        } else {
                          setBulkFloors(newValue);
                          selectedBuildings.forEach(b => {
                            updateBuilding(b.id, { floors: newValue });
                          });
                        }
                      }}
                      aria-label="Increase floor count"
                      className="btn-secondary px-3 py-1 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      +
                    </button>
                  </div>
                  {buildingErrors.floors && (
                    <p className="mt-1 text-xs text-red-600" role="alert">
                      {buildingErrors.floors}
                    </p>
                  )}
                </div>

                {/* Floor height */}
                <div>
                  <label className="label">
                    Floor Height (m) {selectedBuildingIds.size > 1 && '(apply to all)'}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={selectedBuildingIds.size === 1 ? selectedBuilding?.floorHeight : bulkFloorHeight}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 3;
                      if (selectedBuildingIds.size === 1 && selectedBuilding) {
                        handleFloorHeightChange(selectedBuilding.id, value);
                      } else {
                        setBulkFloorHeight(value);
                        selectedBuildings.forEach(b => {
                          updateBuilding(b.id, { floorHeight: value });
                        });
                      }
                    }}
                    className={`input ${buildingErrors.floorHeight ? 'border-red-500' : ''}`}
                    min="2"
                    max="10"
                    aria-invalid={!!buildingErrors.floorHeight}
                  />
                  {buildingErrors.floorHeight && (
                    <p className="mt-1 text-xs text-red-600" role="alert">
                      {buildingErrors.floorHeight}
                    </p>
                  )}
                </div>

                {/* Phase 3: Building Presets Dropdown */}
                <div className="relative">
                  <label className="label">Quick Presets</label>
                  <button
                    onClick={() => setShowPresetsDropdown(!showPresetsDropdown)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-700 transition-colors"
                  >
                    <span>Apply preset configuration...</span>
                    <svg
                      className={`w-4 h-4 transition-transform ${showPresetsDropdown ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showPresetsDropdown && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                      {BUILDING_PRESETS.map((preset) => (
                        <button
                          key={preset.name}
                          onClick={() => applyPresetToSelection(preset)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 text-left transition-colors border-b border-gray-100 last:border-b-0"
                        >
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: preset.color }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-800">{preset.name}</div>
                            <div className="text-xs text-gray-500">{preset.description}</div>
                          </div>
                          <div className="text-right text-xs text-gray-400 flex-shrink-0">
                            <div>{preset.floors}F</div>
                            <div>{preset.floorHeight}m</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="pt-2 border-t border-gray-200">
                  {selectedBuildingIds.size === 1 && selectedBuilding ? (
                    <>
                      <p className="text-sm text-gray-600">
                        Total height:{' '}
                        <span className="font-medium">
                          {selectedBuilding.totalHeight.toFixed(1)}m
                        </span>
                      </p>
                      <p className="text-sm text-gray-600">
                        Area: <span className="font-medium">{selectedBuilding.area.toFixed(0)} m²</span>
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-gray-600">
                        Total area:{' '}
                        <span className="font-medium">
                          {selectedBuildings.reduce((sum, b) => sum + b.area, 0).toFixed(0)} m²
                        </span>
                      </p>
                      <p className="text-sm text-gray-600">
                        Buildings: <span className="font-medium">{selectedBuildingIds.size}</span>
                      </p>
                    </>
                  )}
                </div>

                {/* Quick actions for single selection */}
                {selectedBuildingIds.size === 1 && selectedBuilding && (
                  <div className="pt-2 border-t border-gray-200 space-y-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setIsEditingVertices(true);
                          setEditingBuildingId(selectedBuilding.id);
                          setActiveTool('edit');
                        }}
                        className="flex-1 text-xs px-2 py-1.5 bg-blue-50 hover:bg-blue-100 rounded text-blue-700 transition-colors"
                      >
                        Edit Shape
                      </button>
                      <button
                        onClick={duplicateSelectedBuildings}
                        className="flex-1 text-xs px-2 py-1.5 bg-gray-50 hover:bg-gray-100 rounded text-gray-700 transition-colors"
                      >
                        Duplicate
                      </button>
                    </div>
                    {/* Phase 4: Array Tool */}
                    <button
                      onClick={() => setShowArrayModal(true)}
                      className="w-full text-xs px-2 py-1.5 bg-indigo-50 hover:bg-indigo-100 rounded text-indigo-700 transition-colors flex items-center justify-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                      Create Array (Grid)
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Canvas - First on mobile */}
        <div className="lg:col-span-3 card order-1 lg:order-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
            <h3 className="font-medium text-gray-900">Editor Canvas</h3>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm">
              {detectionResult && (
                <label className="flex items-center gap-2 text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showDetectionOverlay}
                    onChange={(e) => setShowDetectionOverlay(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  Show detection overlay
                </label>
              )}
              {currentPoints.length > 0 && (
                <span className="text-amber-600 font-medium">
                  Drawing: {currentPoints.length} points
                </span>
              )}
            </div>
          </div>
          <div className="relative bg-gray-900 rounded-lg overflow-hidden">
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              onDoubleClick={handleCanvasDoubleClick}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={() => {
                // Cancel marquee if mouse leaves canvas
                if (isMarqueeSelecting) {
                  setIsMarqueeSelecting(false);
                  setMarqueeStart(null);
                  setMarqueeEnd(null);
                }
                if (draggingVertexIndex !== null) {
                  setDraggingVertexIndex(null);
                }
              }}
              className={`w-full min-h-[300px] sm:min-h-[400px] lg:min-h-[500px] ${
                activeTool === 'draw' ? 'cursor-crosshair' :
                activeTool === 'select' ? 'cursor-pointer' :
                activeTool === 'edit' ? 'cursor-move' :
                activeTool === 'delete' ? 'cursor-pointer' :
                activeTool === 'rectangle' ? 'cursor-crosshair' :
                activeTool === 'template' ? 'cursor-copy' : 'cursor-default'
              }`}
              role="img"
              aria-label="Building massing editor canvas. Use drawing tools to create and edit building footprints on the site plan."
              tabIndex={0}
            />
          </div>
          <p className="mt-2 text-xs text-gray-600">
            <span className="hidden sm:inline">
              {activeTool === 'draw' && 'Press Escape to cancel. Double-click or Enter to complete.'}
              {activeTool === 'select' && 'Shift+Click to multi-select. Ctrl+A to select all. Ctrl+D to duplicate.'}
              {activeTool === 'edit' && 'Drag vertices to reshape. Press V or Escape to exit.'}
              {activeTool === 'delete' && 'Click buildings to delete. Ctrl+Z to undo.'}
            </span>
            <span className="sm:hidden">Double-tap to complete. Long-press to delete.</span>
          </p>
        </div>
      </div>

      {/* Actions - Responsive: full width on mobile */}
      <div className="mt-6 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        <button onClick={() => setCurrentStep('setup')} className="btn-outline order-2 sm:order-1">
          Back
        </button>
        <button
          onClick={handleContinueToViewer}
          disabled={buildings.length === 0}
          className="btn-primary order-1 sm:order-2"
        >
          Continue to 3D View
        </button>
      </div>

      {/* Bulk Edit Modal */}
      {showBulkEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <FocusTrap active={showBulkEditModal} onEscape={() => setShowBulkEditModal(false)}>
            <div
              className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="bulk-edit-title"
            >
              <h3 id="bulk-edit-title" className="text-lg font-semibold text-gray-900 mb-4">
                Bulk Edit All Buildings
              </h3>
            <p className="text-sm text-gray-500 mb-4">
              Apply these values to all {buildings.length} buildings:
            </p>

            <div className="space-y-4">
              <div>
                <label className="label">Number of Floors</label>
                <input
                  type="number"
                  value={bulkFloors}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 1;
                    setBulkFloors(value);
                    const validation = validateFloorCount(value);
                    setBulkEditErrors(prev => ({ ...prev, floors: validation.valid ? undefined : validation.error }));
                  }}
                  className={`input ${bulkEditErrors.floors ? 'border-red-500' : ''}`}
                  min="1"
                  max="100"
                  aria-invalid={!!bulkEditErrors.floors}
                />
                {bulkEditErrors.floors && (
                  <p className="mt-1 text-xs text-red-600" role="alert">
                    {bulkEditErrors.floors}
                  </p>
                )}
              </div>
              <div>
                <label className="label">Floor Height (meters)</label>
                <input
                  type="number"
                  step="0.1"
                  value={bulkFloorHeight}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 3;
                    setBulkFloorHeight(value);
                    const validation = validateFloorHeight(value);
                    setBulkEditErrors(prev => ({ ...prev, floorHeight: validation.valid ? undefined : validation.error }));
                  }}
                  className={`input ${bulkEditErrors.floorHeight ? 'border-red-500' : ''}`}
                  min="2"
                  max="10"
                  aria-invalid={!!bulkEditErrors.floorHeight}
                />
                {bulkEditErrors.floorHeight && (
                  <p className="mt-1 text-xs text-red-600" role="alert">
                    {bulkEditErrors.floorHeight}
                  </p>
                )}
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">
                  Total height per building: <span className="font-medium">{(bulkFloors * bulkFloorHeight).toFixed(1)}m</span>
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowBulkEditModal(false)}
                className="flex-1 btn-outline"
              >
                Cancel
              </button>
              <button
                onClick={applyBulkEdit}
                className="flex-1 btn-primary"
              >
                Apply to All
              </button>
            </div>
            </div>
          </FocusTrap>
        </div>
      )}

      {/* Phase 4: Array Tool Modal */}
      {showArrayModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <FocusTrap active={showArrayModal} onEscape={() => setShowArrayModal(false)}>
            <div
              className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="array-modal-title"
            >
              <h3 id="array-modal-title" className="text-lg font-semibold text-gray-900 mb-4">
                Create Building Array
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Create a grid of copies from the selected building.
              </p>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Rows</label>
                    <input
                      type="number"
                      value={arrayConfig.rows}
                      onChange={(e) => setArrayConfig(prev => ({ ...prev, rows: Math.max(1, parseInt(e.target.value) || 1) }))}
                      className="input"
                      min="1"
                      max="10"
                    />
                  </div>
                  <div>
                    <label className="label">Columns</label>
                    <input
                      type="number"
                      value={arrayConfig.columns}
                      onChange={(e) => setArrayConfig(prev => ({ ...prev, columns: Math.max(1, parseInt(e.target.value) || 1) }))}
                      className="input"
                      min="1"
                      max="10"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">X Spacing (px)</label>
                    <input
                      type="number"
                      value={arrayConfig.spacingX}
                      onChange={(e) => setArrayConfig(prev => ({ ...prev, spacingX: Math.max(0, parseInt(e.target.value) || 0) }))}
                      className="input"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="label">Y Spacing (px)</label>
                    <input
                      type="number"
                      value={arrayConfig.spacingY}
                      onChange={(e) => setArrayConfig(prev => ({ ...prev, spacingY: Math.max(0, parseInt(e.target.value) || 0) }))}
                      className="input"
                      min="0"
                    />
                  </div>
                </div>
                <div className="bg-indigo-50 p-3 rounded-lg">
                  <p className="text-sm text-indigo-700">
                    This will create <span className="font-medium">{arrayConfig.rows * arrayConfig.columns - 1}</span> new buildings
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowArrayModal(false)}
                  className="flex-1 btn-outline"
                >
                  Cancel
                </button>
                <button
                  onClick={createBuildingArray}
                  className="flex-1 btn-primary"
                >
                  Create Array
                </button>
              </div>
            </div>
          </FocusTrap>
        </div>
      )}

      {/* Phase 4: Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <FocusTrap active={showExportModal} onEscape={() => setShowExportModal(false)}>
            <div
              className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="export-modal-title"
            >
              <h3 id="export-modal-title" className="text-lg font-semibold text-gray-900 mb-4">
                Export Buildings
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Download your building configuration as a JSON file. This includes all building footprints, floors, heights, and groups.
              </p>

              <div className="bg-green-50 p-3 rounded-lg mb-4">
                <p className="text-sm text-green-700">
                  <span className="font-medium">{buildings.length}</span> building(s) will be exported
                  {buildingGroups.size > 0 && (
                    <> with <span className="font-medium">{buildingGroups.size}</span> group(s)</>
                  )}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="flex-1 btn-outline"
                >
                  Cancel
                </button>
                <button
                  onClick={exportBuildingsConfig}
                  className="flex-1 btn-primary"
                >
                  Download JSON
                </button>
              </div>
            </div>
          </FocusTrap>
        </div>
      )}

      {/* Phase 4: Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <FocusTrap active={showImportModal} onEscape={() => setShowImportModal(false)}>
            <div
              className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="import-modal-title"
            >
              <h3 id="import-modal-title" className="text-lg font-semibold text-gray-900 mb-4">
                Import Buildings
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Import building configuration from a JSON file. Buildings will be added to your current project.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="label">Select JSON File</label>
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const content = event.target?.result as string;
                          importBuildingsConfig(content);
                        };
                        reader.readAsText(file);
                      }
                    }}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                  />
                </div>
                <p className="text-xs text-gray-400">
                  Supported format: JSON files exported from this tool
                </p>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="flex-1 btn-outline"
                >
                  Cancel
                </button>
              </div>
            </div>
          </FocusTrap>
        </div>
      )}
    </div>
  );
}

// Helper: Check if point is inside polygon
function isPointInPolygon(point: Point2D, polygon: Point2D[]): boolean {
  let inside = false;
  const n = polygon.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x,
      yi = polygon[i].y;
    const xj = polygon[j].x,
      yj = polygon[j].y;

    if (
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }

  return inside;
}

