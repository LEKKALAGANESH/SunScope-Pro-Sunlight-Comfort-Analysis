import { useEffect, type RefObject } from "react";
import type {
  Building,
  Point2D,
  ImageAnalysisResult,
  DetectedBuilding,
  DetectedAmenity,
} from "../../../types";
import type { EditorSettings, Tool, Camera } from "../types";

interface CanvasRendererParams {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  imageDataUrl: string | undefined;
  buildings: Building[];
  currentPoints: Point2D[];
  selectedBuildingIds: Set<string>;
  hoveredBuildingId: string | null;
  northAngle: number;
  showDetectionOverlay: boolean;
  detectionResult: ImageAnalysisResult | null;
  editorSettings: EditorSettings;
  activeTool: Tool;
  isNearStartPoint: boolean;
  cursorPosition: Point2D | null;
  isMarqueeSelecting: boolean;
  marqueeStart: Point2D | null;
  marqueeEnd: Point2D | null;
  isEditingVertices: boolean;
  editingBuildingId: string | null;
  draggingVertexIndex: number | null;
  isDrawingRectangle: boolean;
  rectangleStart: Point2D | null;
  rectangleEnd: Point2D | null;
  camera?: Camera;
  onImageLoad: (offset: { x: number; y: number }, scale: number) => void;
}

export function useCanvasRenderer({
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
  camera = { x: 0, y: 0, zoom: 1 },
  onImageLoad,
}: CanvasRendererParams) {
  useEffect(() => {
    if (!canvasRef.current || !imageDataUrl) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
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
      onImageLoad({ x: offsetX, y: offsetY }, ratio);

      // Clear canvas
      ctx.fillStyle = "#1f2937";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Apply camera transform
      ctx.save();
      ctx.translate(camera.x, camera.y);
      ctx.scale(camera.zoom, camera.zoom);

      // Draw image without rotation (keep site plan as default orientation)
      // North angle is used only for sun calculations, not for rotating the view
      ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);

      // Draw grid overlay
      if (editorSettings.showGrid && activeTool === "draw") {
        drawGrid(ctx, offsetX, offsetY, scaledWidth, scaledHeight, editorSettings.gridSize);
      }

      // Draw existing buildings
      drawBuildings(
        ctx,
        buildings,
        selectedBuildingIds,
        hoveredBuildingId,
        isEditingVertices,
        editingBuildingId,
        draggingVertexIndex,
        offsetX,
        offsetY,
        ratio,
        camera.zoom
      );

      // Draw marquee selection rectangle
      if (isMarqueeSelecting && marqueeStart && marqueeEnd) {
        drawMarquee(ctx, marqueeStart, marqueeEnd, offsetX, offsetY, ratio);
      }

      // Draw multi-select badge
      if (selectedBuildingIds.size > 1) {
        drawMultiSelectBadge(ctx, canvas.width, selectedBuildingIds.size);
      }

      // Draw detection overlay
      if (showDetectionOverlay && detectionResult) {
        drawDetectionOverlay(ctx, detectionResult, offsetX, offsetY, ratio);
      }

      // Draw current drawing points
      if (currentPoints.length > 0) {
        drawCurrentPoints(
          ctx,
          currentPoints,
          cursorPosition,
          isNearStartPoint,
          offsetX,
          offsetY,
          ratio,
          camera.zoom
        );
      }

      // Draw rectangle preview
      if (isDrawingRectangle && rectangleStart && rectangleEnd) {
        drawRectanglePreview(ctx, rectangleStart, rectangleEnd, offsetX, offsetY, ratio);
      }

      // Restore camera transform
      ctx.restore();

      // Draw zoom indicator (outside camera transform for fixed size)
      if (camera.zoom !== 1) {
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(canvas.width - 60, 10, 50, 24);
        ctx.fillStyle = 'white';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(camera.zoom * 100)}%`, canvas.width - 35, 26);
        ctx.restore();
      }
    };

    img.src = imageDataUrl;
  }, [
    imageDataUrl,
    buildings,
    currentPoints,
    selectedBuildingIds,
    hoveredBuildingId,
    northAngle,
    showDetectionOverlay,
    detectionResult,
    editorSettings.showGrid,
    editorSettings.gridSize,
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
    canvasRef,
    onImageLoad,
  ]);
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  offsetX: number,
  offsetY: number,
  width: number,
  height: number,
  gridSize: number
) {
  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.lineWidth = 0.5;

  // Vertical lines
  for (let x = offsetX; x < offsetX + width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, offsetY);
    ctx.lineTo(x, offsetY + height);
    ctx.stroke();
  }

  // Horizontal lines
  for (let y = offsetY; y < offsetY + height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(offsetX, y);
    ctx.lineTo(offsetX + width, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBuildings(
  ctx: CanvasRenderingContext2D,
  buildings: Building[],
  selectedBuildingIds: Set<string>,
  hoveredBuildingId: string | null,
  isEditingVertices: boolean,
  editingBuildingId: string | null,
  draggingVertexIndex: number | null,
  offsetX: number,
  offsetY: number,
  ratio: number,
  zoom: number = 1
) {
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
      ctx.strokeStyle = "#06b6d4";
      ctx.lineWidth = 3;
    } else if (isSelected) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
    } else {
      ctx.strokeStyle = building.color;
      ctx.lineWidth = 2;
    }
    ctx.stroke();

    // Draw vertex handles when editing vertices (scale inversely with zoom)
    if (isBeingEdited) {
      const handleRadius = 6 / zoom; // Keep constant screen size
      const handleStroke = 2 / zoom;

      building.footprint.forEach((point, index) => {
        const x = offsetX + point.x * ratio;
        const y = offsetY + point.y * ratio;

        ctx.beginPath();
        ctx.arc(x, y, handleRadius, 0, Math.PI * 2);
        ctx.fillStyle = draggingVertexIndex === index ? "#f59e0b" : "#ffffff";
        ctx.fill();
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = handleStroke;
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

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 12px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const text = `${building.name} (${building.floors}F)`;
      const textWidth = ctx.measureText(text).width;
      ctx.fillStyle =
        isSelected && selectedBuildingIds.size > 1
          ? "rgba(6, 182, 212, 0.9)"
          : "rgba(0,0,0,0.7)";
      ctx.fillRect(centerX - textWidth / 2 - 4, centerY - 8, textWidth + 8, 16);

      ctx.fillStyle = "#ffffff";
      ctx.fillText(text, centerX, centerY);
    }
  });
}

function drawMarquee(
  ctx: CanvasRenderingContext2D,
  start: Point2D,
  end: Point2D,
  offsetX: number,
  offsetY: number,
  ratio: number
) {
  const startX = offsetX + start.x * ratio;
  const startY = offsetY + start.y * ratio;
  const endX = offsetX + end.x * ratio;
  const endY = offsetY + end.y * ratio;

  ctx.beginPath();
  ctx.rect(
    Math.min(startX, endX),
    Math.min(startY, endY),
    Math.abs(endX - startX),
    Math.abs(endY - startY)
  );
  ctx.fillStyle = "rgba(59, 130, 246, 0.1)";
  ctx.fill();
  ctx.strokeStyle = "#3b82f6";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawMultiSelectBadge(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  count: number
) {
  const badgeX = canvasWidth - 80;
  const badgeY = 20;

  ctx.fillStyle = "rgba(6, 182, 212, 0.9)";
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, 70, 24, 12);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 11px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${count} selected`, badgeX + 35, badgeY + 12);
}

function drawDetectionOverlay(
  ctx: CanvasRenderingContext2D,
  detectionResult: ImageAnalysisResult,
  offsetX: number,
  offsetY: number,
  ratio: number
) {
  // Draw detected buildings
  ctx.setLineDash([3, 3]);
  detectionResult.buildings.forEach((detected: DetectedBuilding) => {
    ctx.beginPath();
    detected.footprint.forEach((point: Point2D, index: number) => {
      const x = offsetX + point.x * ratio;
      const y = offsetY + point.y * ratio;
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.closePath();
    ctx.strokeStyle = "#9ca3af";
    ctx.lineWidth = 1;
    ctx.stroke();
  });
  ctx.setLineDash([]);

  // Draw detected amenities
  detectionResult.amenities.forEach((amenity: DetectedAmenity) => {
    const x = offsetX + amenity.position.x * ratio;
    const y = offsetY + amenity.position.y * ratio;
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fillStyle = amenity.type === "swimming_pool" ? "#60a5fa" : "#34d399";
    ctx.fill();
  });

  // Draw vegetation areas
  ctx.fillStyle = "rgba(34, 197, 94, 0.15)";
  detectionResult.vegetation.forEach((area: Point2D[]) => {
    if (area.length < 3) return;
    ctx.beginPath();
    area.forEach((point: Point2D, index: number) => {
      const x = offsetX + point.x * ratio;
      const y = offsetY + point.y * ratio;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();
  });

  // Draw water bodies
  ctx.fillStyle = "rgba(59, 130, 246, 0.2)";
  detectionResult.waterBodies.forEach((water: Point2D[]) => {
    if (water.length < 3) return;
    ctx.beginPath();
    water.forEach((point: Point2D, index: number) => {
      const x = offsetX + point.x * ratio;
      const y = offsetY + point.y * ratio;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();
  });
}

function drawCurrentPoints(
  ctx: CanvasRenderingContext2D,
  currentPoints: Point2D[],
  cursorPosition: Point2D | null,
  isNearStartPoint: boolean,
  offsetX: number,
  offsetY: number,
  ratio: number,
  zoom: number = 1
) {
  // Scale sizes inversely with zoom to maintain constant screen size
  const lineWidth = 2 / zoom;
  const pointRadius = 5 / zoom;
  const startPointRadius = 10 / zoom;
  const ringRadius = 12 / zoom;
  const dashSize = 5 / zoom;

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

  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = lineWidth;
  ctx.setLineDash([dashSize, dashSize]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Draw points
  currentPoints.forEach((point, index) => {
    const x = offsetX + point.x * ratio;
    const y = offsetY + point.y * ratio;
    ctx.beginPath();
    ctx.arc(x, y, index === 0 && isNearStartPoint ? startPointRadius : pointRadius, 0, Math.PI * 2);
    ctx.fillStyle = index === 0 && isNearStartPoint ? "#22c55e" : "#f59e0b";
    ctx.fill();

    // Draw white ring on start point when close loop indicator is active
    if (index === 0 && isNearStartPoint) {
      ctx.beginPath();
      ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
      ctx.strokeStyle = "#22c55e";
      ctx.lineWidth = lineWidth;
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
    ctx.strokeStyle = isNearStartPoint ? "#22c55e" : "rgba(245, 158, 11, 0.5)";
    ctx.lineWidth = 1 / zoom;
    ctx.setLineDash([3 / zoom, 3 / zoom]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Show close-loop tooltip indicator (scale with zoom)
  if (isNearStartPoint && currentPoints.length >= 3) {
    const startPoint = currentPoints[0];
    const x = offsetX + startPoint.x * ratio;
    const y = offsetY + startPoint.y * ratio - 25 / zoom;
    const tooltipWidth = 80 / zoom;
    const tooltipHeight = 20 / zoom;
    const fontSize = 11 / zoom;

    ctx.fillStyle = "rgba(34, 197, 94, 0.9)";
    ctx.roundRect(x - tooltipWidth / 2, y - tooltipHeight / 2, tooltipWidth, tooltipHeight, 4 / zoom);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = `${fontSize}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Click to close", x, y);
  }
}

function drawRectanglePreview(
  ctx: CanvasRenderingContext2D,
  rectangleStart: Point2D,
  rectangleEnd: Point2D,
  offsetX: number,
  offsetY: number,
  ratio: number
) {
  const startX = offsetX + rectangleStart.x * ratio;
  const startY = offsetY + rectangleStart.y * ratio;
  const endX = offsetX + rectangleEnd.x * ratio;
  const endY = offsetY + rectangleEnd.y * ratio;

  const width = endX - startX;
  const height = endY - startY;

  // Draw rectangle preview
  ctx.beginPath();
  ctx.rect(startX, startY, width, height);
  ctx.fillStyle = "rgba(59, 130, 246, 0.2)";
  ctx.fill();
  ctx.strokeStyle = "#3b82f6";
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Draw corner handles
  [
    { x: startX, y: startY },
    { x: endX, y: startY },
    { x: endX, y: endY },
    { x: startX, y: endY },
  ].forEach((corner) => {
    ctx.beginPath();
    ctx.arc(corner.x, corner.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#3b82f6";
    ctx.fill();
  });

  // Draw dimension labels
  const dimWidth = Math.abs(rectangleEnd.x - rectangleStart.x);
  const dimHeight = Math.abs(rectangleEnd.y - rectangleStart.y);
  const dimArea = dimWidth * dimHeight;

  // Width label (top)
  const widthLabelX = (startX + endX) / 2;
  const widthLabelY = Math.min(startY, endY) - 15;
  ctx.fillStyle = "rgba(59, 130, 246, 0.9)";
  ctx.roundRect(widthLabelX - 30, widthLabelY - 10, 60, 20, 4);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 11px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${dimWidth.toFixed(0)}px`, widthLabelX, widthLabelY);

  // Height label (right)
  const heightLabelX = Math.max(startX, endX) + 15;
  const heightLabelY = (startY + endY) / 2;
  ctx.save();
  ctx.translate(heightLabelX, heightLabelY);
  ctx.rotate(Math.PI / 2);
  ctx.fillStyle = "rgba(59, 130, 246, 0.9)";
  ctx.roundRect(-30, -10, 60, 20, 4);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.fillText(`${dimHeight.toFixed(0)}px`, 0, 0);
  ctx.restore();

  // Area label (center)
  const centerX = (startX + endX) / 2;
  const centerY = (startY + endY) / 2;
  ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
  ctx.roundRect(centerX - 45, centerY - 12, 90, 24, 4);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 12px Arial";
  ctx.fillText(`${dimArea.toFixed(0)} px²`, centerX, centerY);
}
