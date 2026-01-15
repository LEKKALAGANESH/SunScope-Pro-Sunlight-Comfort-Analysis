import { useRef, useCallback, useState, useEffect } from "react";
import type { Building, Point2D, ImageAnalysisResult } from "../../../types";
import type { Tool, ShapeTemplate, EditorSettings, Camera } from "../types";
import { DEFAULT_CAMERA, MIN_ZOOM, MAX_ZOOM } from "../types";
import { useCanvasRenderer } from "../hooks/useCanvasRenderer";
import {
  constrainToOrthogonal,
  isNearPoint,
  snapToGrid,
} from "../../../hooks/useEditorHistory";
import {
  createRectangleFootprint,
  createTemplateShape,
  isPointInPolygon,
} from "../utils/shapeUtils";
import { CLOSE_LOOP_THRESHOLD } from "../types";
import { ErrorSeverity } from "../../../utils/errors";

// Calculate bounding box of a building footprint
function getBuildingBounds(footprint: Point2D[]): { minX: number; minY: number; maxX: number; maxY: number; centerX: number; centerY: number } {
  const xs = footprint.map(p => p.x);
  const ys = footprint.map(p => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    minX, minY, maxX, maxY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2
  };
}

interface EditorCanvasProps {
  // Image data
  imageDataUrl: string;
  northAngle: number;

  // Buildings
  buildings: Building[];
  selectedBuildingIds: Set<string>;
  setSelectedBuildingIds: React.Dispatch<React.SetStateAction<Set<string>>>;

  // Drawing state
  currentPoints: Point2D[];
  setCurrentPoints: React.Dispatch<React.SetStateAction<Point2D[]>>;
  activeTool: Tool;
  setActiveTool: (tool: Tool) => void;
  selectedTemplate: ShapeTemplate;
  editorSettings: EditorSettings;
  shiftKeyHeld: boolean;

  // Editing state
  isEditingVertices: boolean;
  setIsEditingVertices: React.Dispatch<React.SetStateAction<boolean>>;
  editingBuildingId: string | null;
  setEditingBuildingId: React.Dispatch<React.SetStateAction<string | null>>;

  // Detection
  showDetectionOverlay: boolean;
  setShowDetectionOverlay: React.Dispatch<React.SetStateAction<boolean>>;
  detectionResult: ImageAnalysisResult | null;

  // Actions
  addBuilding: (footprint: Point2D[], name?: string) => void;
  updateBuilding: (id: string, updates: Partial<Building>) => void;
  removeBuilding: (id: string) => void;
  selectBuilding: (id: string | undefined) => void;
  recordAddBuilding: (building: Building) => void;
  recordDeleteBuilding: (building: Building) => void;
  recordUpdateBuilding: (
    id: string,
    prev: Partial<Building>,
    next: Partial<Building>
  ) => void;
  showToast: (message: string, severity: ErrorSeverity) => void;

  // Project
  projectBuildings: Building[];
}

export function EditorCanvas({
  imageDataUrl,
  northAngle,
  buildings,
  selectedBuildingIds,
  setSelectedBuildingIds,
  currentPoints,
  setCurrentPoints,
  activeTool,
  setActiveTool: _setActiveTool,
  selectedTemplate,
  editorSettings,
  shiftKeyHeld,
  isEditingVertices,
  setIsEditingVertices,
  editingBuildingId,
  setEditingBuildingId,
  showDetectionOverlay,
  setShowDetectionOverlay,
  detectionResult,
  addBuilding,
  updateBuilding,
  removeBuilding,
  selectBuilding,
  recordAddBuilding,
  recordDeleteBuilding,
  recordUpdateBuilding,
  showToast,
  projectBuildings,
}: EditorCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Canvas state
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 });
  const [imageScale, setImageScale] = useState(1);
  const [hoveredBuildingId, setHoveredBuildingId] = useState<string | null>(null);
  const [cursorPosition, setCursorPosition] = useState<Point2D | null>(null);
  const [isNearStartPoint, setIsNearStartPoint] = useState(false);

  // Camera state for zoom/pan
  const [camera, setCamera] = useState<Camera>(DEFAULT_CAMERA);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null);
  const [isSpaceHeld, setIsSpaceHeld] = useState(false);

  // Marquee selection state
  const [isMarqueeSelecting, setIsMarqueeSelecting] = useState(false);
  const [marqueeStart, setMarqueeStart] = useState<Point2D | null>(null);
  const [marqueeEnd, setMarqueeEnd] = useState<Point2D | null>(null);

  // Vertex editing state
  const [draggingVertexIndex, setDraggingVertexIndex] = useState<number | null>(null);

  // Rectangle drawing state
  const [isDrawingRectangle, setIsDrawingRectangle] = useState(false);
  const [rectangleStart, setRectangleStart] = useState<Point2D | null>(null);
  const [rectangleEnd, setRectangleEnd] = useState<Point2D | null>(null);

  // Building move/drag state
  const [isDraggingBuilding, setIsDraggingBuilding] = useState(false);
  const [draggingBuildingId, setDraggingBuildingId] = useState<string | null>(null);
  const [dragStartPoint, setDragStartPoint] = useState<Point2D | null>(null);
  const [originalFootprint, setOriginalFootprint] = useState<Point2D[] | null>(null);

  // Container ref for resize observer
  const containerRef = useRef<HTMLDivElement>(null);

  // Zoom at cursor position (cursor-centered zooming)
  const zoomAtPoint = useCallback((newZoom: number, screenX: number, screenY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const cursorX = screenX - rect.left;
    const cursorY = screenY - rect.top;

    // Calculate point in canvas space before zoom
    const pointBeforeX = (cursorX - camera.x) / camera.zoom;
    const pointBeforeY = (cursorY - camera.y) / camera.zoom;

    // Calculate point in canvas space after zoom
    const pointAfterX = (cursorX - camera.x) / newZoom;
    const pointAfterY = (cursorY - camera.y) / newZoom;

    // Adjust camera position to keep cursor point fixed
    setCamera({
      x: camera.x + (pointAfterX - pointBeforeX) * newZoom,
      y: camera.y + (pointAfterY - pointBeforeY) * newZoom,
      zoom: newZoom,
    });
  }, [camera]);

  // Keyboard shortcuts for pan mode and zoom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Spacebar for pan mode
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setIsSpaceHeld(true);
      }

      // Zoom shortcuts: + / = for zoom in, - for zoom out, 0 for reset
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        const canvas = canvasRef.current;
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const newZoom = Math.min(camera.zoom * 1.2, MAX_ZOOM);
          zoomAtPoint(newZoom, centerX, centerY);
        }
      }

      if (e.key === '-') {
        e.preventDefault();
        const canvas = canvasRef.current;
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const newZoom = Math.max(camera.zoom / 1.2, MIN_ZOOM);
          zoomAtPoint(newZoom, centerX, centerY);
        }
      }

      if (e.key === '0') {
        e.preventDefault();
        setCamera({ x: 0, y: 0, zoom: 1 });
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpaceHeld(false);
        setIsPanning(false);
        setPanStart(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [camera.zoom, zoomAtPoint]);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();

    // Zoom factor based on scroll direction
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, camera.zoom * zoomFactor));

    zoomAtPoint(newZoom, e.clientX, e.clientY);
  }, [camera.zoom, zoomAtPoint]);

  // Use canvas renderer hook
  useCanvasRenderer({
    canvasRef,
    imageDataUrl,
    buildings,
    currentPoints,
    selectedBuildingIds,
    hoveredBuildingId,
    northAngle,
    showDetectionOverlay,
    detectionResult,
    editorSettings,
    activeTool,
    isNearStartPoint,
    cursorPosition,
    isMarqueeSelecting,
    marqueeStart,
    marqueeEnd,
    isEditingVertices,
    editingBuildingId,
    draggingVertexIndex,
    isDrawingRectangle,
    rectangleStart,
    rectangleEnd,
    camera,
    onImageLoad: (offset, scale) => {
      setImageOffset(offset);
      setImageScale(scale);
    },
  });

  // Auto-scroll/pan to keep edited building visible when canvas resizes
  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const container = containerRef.current;

    // Create resize observer to detect when panels expand/collapse
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Get the selected or editing building
        const targetBuildingId = editingBuildingId ||
          (selectedBuildingIds.size === 1 ? Array.from(selectedBuildingIds)[0] : null);

        if (!targetBuildingId) return;

        const building = buildings.find(b => b.id === targetBuildingId);
        if (!building) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const canvasWidth = entry.contentRect.width;
        const canvasHeight = entry.contentRect.height;

        // Calculate building bounds in screen coordinates
        const bounds = getBuildingBounds(building.footprint);
        const buildingScreenX = bounds.centerX * imageScale + imageOffset.x;
        const buildingScreenY = bounds.centerY * imageScale + imageOffset.y;

        // Define visible area with padding
        const padding = 50;
        const visibleMinX = padding;
        const visibleMaxX = canvasWidth - padding;
        const visibleMinY = padding;
        const visibleMaxY = canvasHeight - padding;

        // Check if building center is outside visible area
        let needsPan = false;
        let newOffsetX = imageOffset.x;
        let newOffsetY = imageOffset.y;

        if (buildingScreenX < visibleMinX) {
          newOffsetX = imageOffset.x + (visibleMinX - buildingScreenX) + 100;
          needsPan = true;
        } else if (buildingScreenX > visibleMaxX) {
          newOffsetX = imageOffset.x - (buildingScreenX - visibleMaxX) - 100;
          needsPan = true;
        }

        if (buildingScreenY < visibleMinY) {
          newOffsetY = imageOffset.y + (visibleMinY - buildingScreenY) + 100;
          needsPan = true;
        } else if (buildingScreenY > visibleMaxY) {
          newOffsetY = imageOffset.y - (buildingScreenY - visibleMaxY) - 100;
          needsPan = true;
        }

        // Smoothly animate to new position
        if (needsPan) {
          // Use CSS transition for smooth pan
          const startX = imageOffset.x;
          const startY = imageOffset.y;
          const duration = 300; // ms
          const startTime = performance.now();

          const animatePan = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease-out curve for smooth deceleration
            const easeOut = 1 - Math.pow(1 - progress, 3);

            const currentX = startX + (newOffsetX - startX) * easeOut;
            const currentY = startY + (newOffsetY - startY) * easeOut;

            setImageOffset({ x: currentX, y: currentY });

            if (progress < 1) {
              requestAnimationFrame(animatePan);
            }
          };

          requestAnimationFrame(animatePan);
        }
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [buildings, editingBuildingId, selectedBuildingIds, imageOffset, imageScale]);

  const screenToImage = useCallback(
    (screenX: number, screenY: number): Point2D => {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      // Apply camera transform: first camera offset, then zoom, then image offset
      const canvasX = (screenX - rect.left - camera.x) / camera.zoom;
      const canvasY = (screenY - rect.top - camera.y) / camera.zoom;
      // Then apply image offset and scale
      const x = (canvasX - imageOffset.x) / imageScale;
      const y = (canvasY - imageOffset.y) / imageScale;
      return { x, y };
    },
    [imageOffset, imageScale, camera]
  );

  const findBuildingAtPoint = useCallback(
    (point: Point2D): Building | null => {
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
    [setSelectedBuildingIds]
  );

  const clearSelection = useCallback(() => {
    setSelectedBuildingIds(new Set());
    selectBuilding(undefined);
  }, [selectBuilding, setSelectedBuildingIds]);

  const buildingIntersectsMarquee = useCallback(
    (building: Building, start: Point2D, end: Point2D): boolean => {
      const minX = Math.min(start.x, end.x);
      const maxX = Math.max(start.x, end.x);
      const minY = Math.min(start.y, end.y);
      const maxY = Math.max(start.y, end.y);

      return building.footprint.some(
        (p) => p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY
      );
    },
    []
  );

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    let point = screenToImage(e.clientX, e.clientY);
    const isShiftClick = e.shiftKey;

    if (activeTool === "draw") {
      // Check if clicking near start point to close the shape
      if (currentPoints.length >= 3 && isNearStartPoint) {
        addBuilding(currentPoints);
        const addedBuilding = projectBuildings[projectBuildings.length - 1];
        if (addedBuilding) {
          recordAddBuilding(addedBuilding);
        }
        setCurrentPoints([]);
        setIsNearStartPoint(false);
        showToast(
          "Building created! Use the Properties panel to set floor count.",
          ErrorSeverity.INFO
        );
        return;
      }

      // Apply snap-to-grid if enabled
      if (editorSettings.snapToGrid) {
        const gridSizeInImageCoords = editorSettings.gridSize / imageScale;
        point = snapToGrid(point, gridSizeInImageCoords, true);
      }

      // Apply orthogonal constraint if Shift is held
      if (shiftKeyHeld && currentPoints.length > 0) {
        const lastPoint = currentPoints[currentPoints.length - 1];
        point = constrainToOrthogonal(point, lastPoint, true);
      }

      setCurrentPoints([...currentPoints, point]);
    } else if (activeTool === "select") {
      const building = findBuildingAtPoint(point);

      if (building) {
        toggleBuildingSelection(building.id, isShiftClick);
        selectBuilding(building.id);
      } else if (!isShiftClick) {
        clearSelection();
      }

      if (isEditingVertices && !building) {
        setIsEditingVertices(false);
        setEditingBuildingId(null);
      }
    } else if (activeTool === "edit") {
      const building = findBuildingAtPoint(point);
      if (building) {
        setIsEditingVertices(true);
        setEditingBuildingId(building.id);
        setSelectedBuildingIds(new Set([building.id]));
      } else {
        setIsEditingVertices(false);
        setEditingBuildingId(null);
      }
    } else if (activeTool === "delete") {
      const building = findBuildingAtPoint(point);
      if (building) {
        recordDeleteBuilding(building);
        removeBuilding(building.id);
        setSelectedBuildingIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(building.id);
          return newSet;
        });
        showToast(
          `Deleted ${building.name}. Press Ctrl+Z to undo.`,
          ErrorSeverity.INFO
        );
      }
    }
  };

  const handleCanvasDoubleClick = () => {
    if (activeTool === "draw" && currentPoints.length >= 3) {
      addBuilding(currentPoints);
      const addedBuilding = projectBuildings[projectBuildings.length - 1];
      if (addedBuilding) {
        recordAddBuilding(addedBuilding);
      }
      setCurrentPoints([]);
      setIsNearStartPoint(false);
      showToast(
        "Building created! Use the Properties panel to set floor count.",
        ErrorSeverity.INFO
      );
    }
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Middle mouse button, spacebar held, or pan tool = start panning
    if (e.button === 1 || isSpaceHeld || activeTool === "pan") {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    let point = screenToImage(e.clientX, e.clientY);

    // Apply snap-to-grid if enabled
    if (editorSettings.snapToGrid) {
      const gridSizeInImageCoords = editorSettings.gridSize / imageScale;
      point = snapToGrid(point, gridSizeInImageCoords, true);
    }

    // Rectangle drawing
    if (activeTool === "rectangle") {
      setIsDrawingRectangle(true);
      setRectangleStart(point);
      setRectangleEnd(point);
      return;
    }

    // Template tool - place shape on click
    if (activeTool === "template") {
      const footprint = createTemplateShape(
        point,
        selectedTemplate,
        60 / imageScale
      );
      addBuilding(
        footprint,
        `${selectedTemplate.charAt(0).toUpperCase() + selectedTemplate.slice(1)} ${
          buildings.length + 1
        }`
      );
      const addedBuilding = projectBuildings[projectBuildings.length - 1];
      if (addedBuilding) {
        recordAddBuilding(addedBuilding);
      }
      showToast(`${selectedTemplate} building created!`, ErrorSeverity.INFO);
      return;
    }

    // Move tool: start dragging a building
    if (activeTool === "move") {
      const building = findBuildingAtPoint(point);
      if (building) {
        setIsDraggingBuilding(true);
        setDraggingBuildingId(building.id);
        setDragStartPoint(point);
        setOriginalFootprint([...building.footprint]);
        setSelectedBuildingIds(new Set([building.id]));
        selectBuilding(building.id);
      }
      return;
    }

    if (activeTool === "select") {
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
      const building = buildings.find((b) => b.id === editingBuildingId);
      if (building) {
        // Scale threshold with zoom - larger threshold when zoomed out, smaller when zoomed in
        const vertexThreshold = 10 / (imageScale * camera.zoom);
        const vertexIndex = building.footprint.findIndex((v) =>
          isNearPoint(point, v, vertexThreshold)
        );
        if (vertexIndex !== -1) {
          setDraggingVertexIndex(vertexIndex);
        }
      }
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Handle panning
    if (isPanning && panStart) {
      const deltaX = e.clientX - panStart.x;
      const deltaY = e.clientY - panStart.y;
      setCamera(prev => ({
        ...prev,
        x: prev.x + deltaX,
        y: prev.y + deltaY,
      }));
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    let point = screenToImage(e.clientX, e.clientY);

    // Apply snap-to-grid if enabled (for most tools)
    if (
      editorSettings.snapToGrid &&
      (activeTool === "rectangle" || activeTool === "template")
    ) {
      const gridSizeInImageCoords = editorSettings.gridSize / imageScale;
      point = snapToGrid(point, gridSizeInImageCoords, true);
    }

    // Update rectangle drawing
    if (isDrawingRectangle && rectangleStart) {
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
          y: rectangleStart.y + (height >= 0 ? size : -size),
        };
      }

      setRectangleEnd(point);
      return;
    }

    // Update marquee selection
    if (isMarqueeSelecting) {
      setMarqueeEnd(point);
      return;
    }

    // Drag vertex
    if (draggingVertexIndex !== null && editingBuildingId) {
      if (editorSettings.snapToGrid) {
        const gridSizeInImageCoords = editorSettings.gridSize / imageScale;
        point = snapToGrid(point, gridSizeInImageCoords, true);
      }

      const building = buildings.find((b) => b.id === editingBuildingId);
      if (building) {
        const newFootprint = [...building.footprint];
        newFootprint[draggingVertexIndex] = point;
        updateBuilding(editingBuildingId, { footprint: newFootprint });
      }
      return;
    }

    // Drag building (Move tool)
    if (
      isDraggingBuilding &&
      draggingBuildingId &&
      dragStartPoint &&
      originalFootprint
    ) {
      if (editorSettings.snapToGrid) {
        const gridSizeInImageCoords = editorSettings.gridSize / imageScale;
        point = snapToGrid(point, gridSizeInImageCoords, true);
      }

      const offsetX = point.x - dragStartPoint.x;
      const offsetY = point.y - dragStartPoint.y;

      const newFootprint = originalFootprint.map((p) => ({
        x: p.x + offsetX,
        y: p.y + offsetY,
      }));

      updateBuilding(draggingBuildingId, { footprint: newFootprint });
      return;
    }

    if (activeTool === "draw") {
      if (editorSettings.snapToGrid) {
        const gridSizeInImageCoords = editorSettings.gridSize / imageScale;
        point = snapToGrid(point, gridSizeInImageCoords, true);
      }

      if (shiftKeyHeld && currentPoints.length > 0) {
        const lastPoint = currentPoints[currentPoints.length - 1];
        point = constrainToOrthogonal(point, lastPoint, true);
      }

      setCursorPosition(point);

      // Check if near start point for close-loop indicator (scale with zoom)
      if (currentPoints.length >= 3) {
        const startPoint = currentPoints[0];
        const thresholdInImageCoords = CLOSE_LOOP_THRESHOLD / (imageScale * camera.zoom);
        const nearStart = isNearPoint(point, startPoint, thresholdInImageCoords);
        setIsNearStartPoint(nearStart);
      } else {
        setIsNearStartPoint(false);
      }
    } else {
      setCursorPosition(null);
      setIsNearStartPoint(false);
    }

    if (
      activeTool === "select" ||
      activeTool === "delete" ||
      activeTool === "edit"
    ) {
      const building = findBuildingAtPoint(point);
      setHoveredBuildingId(building?.id || null);
    }
  };

  const handleCanvasMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Stop panning
    if (isPanning) {
      setIsPanning(false);
      setPanStart(null);
      return;
    }

    const isShiftHeld = e.shiftKey;

    // Complete rectangle drawing
    if (isDrawingRectangle && rectangleStart && rectangleEnd) {
      const footprint = createRectangleFootprint(rectangleStart, rectangleEnd, isShiftHeld);

      const width = Math.abs(rectangleEnd.x - rectangleStart.x);
      const height = Math.abs(rectangleEnd.y - rectangleStart.y);
      const minSize = 10 / imageScale;

      if (width >= minSize && height >= minSize) {
        addBuilding(footprint, `Rectangle ${buildings.length + 1}`);
        const addedBuilding = projectBuildings[projectBuildings.length - 1];
        if (addedBuilding) {
          recordAddBuilding(addedBuilding);
        }
        showToast("Rectangle building created!", ErrorSeverity.INFO);
      }

      setIsDrawingRectangle(false);
      setRectangleStart(null);
      setRectangleEnd(null);
      return;
    }

    // Complete marquee selection
    if (isMarqueeSelecting && marqueeStart && marqueeEnd) {
      const selectedByMarquee = buildings.filter((b) =>
        buildingIntersectsMarquee(b, marqueeStart, marqueeEnd)
      );

      if (selectedByMarquee.length > 0) {
        if (isShiftHeld) {
          setSelectedBuildingIds((prev) => {
            const newSet = new Set(prev);
            selectedByMarquee.forEach((b) => newSet.add(b.id));
            return newSet;
          });
        } else {
          setSelectedBuildingIds(new Set(selectedByMarquee.map((b) => b.id)));
        }
        showToast(
          `Selected ${selectedByMarquee.length} building(s)`,
          ErrorSeverity.INFO
        );
      }

      setIsMarqueeSelecting(false);
      setMarqueeStart(null);
      setMarqueeEnd(null);
    }

    // Complete vertex drag
    if (draggingVertexIndex !== null && editingBuildingId) {
      const building = buildings.find((b) => b.id === editingBuildingId);
      if (building) {
        recordUpdateBuilding(
          editingBuildingId,
          { footprint: building.footprint },
          { footprint: building.footprint }
        );
      }
      setDraggingVertexIndex(null);
    }

    // Complete building drag (Move tool)
    if (isDraggingBuilding && draggingBuildingId && originalFootprint) {
      const building = buildings.find((b) => b.id === draggingBuildingId);
      if (building) {
        recordUpdateBuilding(
          draggingBuildingId,
          { footprint: originalFootprint },
          { footprint: building.footprint }
        );
        showToast("Building moved", ErrorSeverity.INFO);
      }
      setIsDraggingBuilding(false);
      setDraggingBuildingId(null);
      setDragStartPoint(null);
      setOriginalFootprint(null);
    }
  };

  const handleCanvasMouseLeave = () => {
    if (isMarqueeSelecting) {
      setIsMarqueeSelecting(false);
      setMarqueeStart(null);
      setMarqueeEnd(null);
    }
    if (draggingVertexIndex !== null) {
      setDraggingVertexIndex(null);
    }
  };

  const getCursorClass = () => {
    // Pan cursor when panning or spacebar held
    if (isPanning) return "cursor-grabbing";
    if (isSpaceHeld) return "cursor-grab";

    switch (activeTool) {
      case "draw":
      case "rectangle":
        return "cursor-crosshair";
      case "select":
      case "delete":
        return "cursor-pointer";
      case "edit":
        return "cursor-move";
      case "template":
        return "cursor-copy";
      case "pan":
        return isPanning ? "cursor-grabbing" : "cursor-grab";
      case "move":
        return isDraggingBuilding ? "cursor-grabbing" : "cursor-move";
      default:
        return "cursor-default";
    }
  };

  return (
    <div className="lg:col-span-3 card order-1 lg:order-2">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
        <h3 className="font-medium text-gray-900">Editor Canvas</h3>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm">
          {/* Zoom controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                const canvas = canvasRef.current;
                if (canvas) {
                  const rect = canvas.getBoundingClientRect();
                  const centerX = rect.left + rect.width / 2;
                  const centerY = rect.top + rect.height / 2;
                  const newZoom = Math.max(camera.zoom / 1.2, MIN_ZOOM);
                  zoomAtPoint(newZoom, centerX, centerY);
                }
              }}
              className="w-7 h-7 flex items-center justify-center rounded border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 font-medium"
              title="Zoom out"
            >
              -
            </button>
            <button
              onClick={() => {
                const canvas = canvasRef.current;
                if (canvas) {
                  const rect = canvas.getBoundingClientRect();
                  const centerX = rect.left + rect.width / 2;
                  const centerY = rect.top + rect.height / 2;
                  const newZoom = Math.min(camera.zoom * 1.2, MAX_ZOOM);
                  zoomAtPoint(newZoom, centerX, centerY);
                }
              }}
              className="w-7 h-7 flex items-center justify-center rounded border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 font-medium"
              title="Zoom in"
            >
              +
            </button>
          </div>
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
      <div ref={containerRef} className="relative bg-gray-900 rounded-lg overflow-hidden">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          onDoubleClick={handleCanvasDoubleClick}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseLeave}
          onWheel={handleWheel}
          onContextMenu={(e) => e.preventDefault()}
          className={`w-full min-h-[300px] sm:min-h-[400px] lg:min-h-[500px] ${getCursorClass()}`}
          role="img"
          aria-label="Building massing editor canvas. Use drawing tools to create and edit building footprints on the site plan."
          tabIndex={0}
        />
      </div>
      <p className="mt-2 text-xs text-gray-600">
        <span className="hidden sm:inline">
          {activeTool === "draw" &&
            "Press Escape to cancel. Double-click or Enter to complete."}
          {activeTool === "select" &&
            "Shift+Click to multi-select. Ctrl+A to select all. Ctrl+D to duplicate."}
          {activeTool === "edit" &&
            "Drag vertices to reshape. Press V or Escape to exit."}
          {activeTool === "delete" &&
            "Click buildings to delete. Ctrl+Z to undo."}
        </span>
        <span className="sm:hidden">
          Double-tap to complete. Long-press to delete.
        </span>
      </p>
    </div>
  );
}
