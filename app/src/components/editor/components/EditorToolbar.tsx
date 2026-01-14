import { useState } from "react";
import type { Tool, ShapeTemplate, EditorSettings } from "../types";

interface EditorToolbarProps {
  activeTool: Tool;
  setActiveTool: (tool: Tool) => void;
  selectedTemplate: ShapeTemplate;
  setSelectedTemplate: (template: ShapeTemplate) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  getUndoDescription: () => string;
  getRedoDescription: () => string;
  currentPointsLength: number;
  onRemoveLastPoint: () => void;
  editorSettings: EditorSettings;
  setEditorSettings: React.Dispatch<React.SetStateAction<EditorSettings>>;
  onEditModeEnter?: () => void;
  onPanelToggle?: (isCollapsed: boolean) => void;
}

export function EditorToolbar({
  activeTool,
  setActiveTool,
  selectedTemplate: _selectedTemplate,
  setSelectedTemplate: _setSelectedTemplate,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  getUndoDescription,
  getRedoDescription,
  currentPointsLength,
  onRemoveLastPoint,
  editorSettings,
  setEditorSettings,
  onEditModeEnter,
  onPanelToggle,
}: EditorToolbarProps) {
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
        <h4 className="font-medium text-gray-900">Tools</h4>
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
          isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[1000px] opacity-100'
        }`}
      >
        <div className="pt-3">
      <div
        className="grid grid-cols-2 gap-2"
        role="toolbar"
        aria-label="Drawing tools"
      >
        {/* Draw Tool */}
        <button
          onClick={() => setActiveTool("draw")}
          aria-label="Draw building footprint"
          aria-pressed={activeTool === "draw"}
          className={`p-3 rounded-lg border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 ${
            activeTool === "draw"
              ? "border-amber-500 bg-amber-50"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <svg
            className="w-6 h-6 mx-auto text-gray-700"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span className="text-xs text-gray-600 block mt-1">Draw</span>
        </button>

        {/* Select Tool */}
        <button
          onClick={() => setActiveTool("select")}
          aria-label="Select building"
          aria-pressed={activeTool === "select"}
          className={`p-3 rounded-lg border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 ${
            activeTool === "select"
              ? "border-amber-500 bg-amber-50"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <svg
            className="w-6 h-6 mx-auto text-gray-700"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
            />
          </svg>
          <span className="text-xs text-gray-600 block mt-1">Select</span>
        </button>

        {/* Delete Tool */}
        <button
          onClick={() => setActiveTool("delete")}
          aria-label="Delete building"
          aria-pressed={activeTool === "delete"}
          className={`p-3 rounded-lg border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 ${
            activeTool === "delete"
              ? "border-red-500 bg-red-50"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <svg
            className="w-6 h-6 mx-auto text-gray-700"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          <span className="text-xs text-gray-600 block mt-1">Delete</span>
        </button>

        {/* Edit Tool */}
        <button
          onClick={() => {
            setActiveTool("edit");
            onEditModeEnter?.();
          }}
          aria-label="Edit vertices"
          aria-pressed={activeTool === "edit"}
          className={`p-3 rounded-lg border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
            activeTool === "edit"
              ? "border-blue-500 bg-blue-50"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <svg
            className="w-6 h-6 mx-auto text-gray-700"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
          <span className="text-xs text-gray-600 block mt-1">Edit</span>
        </button>

        {/* Move Tool */}
        <button
          onClick={() => setActiveTool("move")}
          aria-label="Move building"
          aria-pressed={activeTool === "move"}
          className={`p-3 rounded-lg border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 ${
            activeTool === "move"
              ? "border-green-500 bg-green-50"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <svg
            className="w-6 h-6 mx-auto text-gray-700"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
            />
          </svg>
          <span className="text-xs text-gray-600 block mt-1">Move</span>
        </button>

        {/* Rectangle Tool */}
        <button
          onClick={() => setActiveTool("rectangle")}
          aria-label="Draw rectangle"
          aria-pressed={activeTool === "rectangle"}
          className={`p-3 rounded-lg border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
            activeTool === "rectangle"
              ? "border-blue-500 bg-blue-50"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <svg
            className="w-6 h-6 mx-auto text-gray-700"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 18h16M4 6v12M20 6v12"
            />
          </svg>
          <span className="text-xs text-gray-600 block mt-1">Rect</span>
        </button>

        {/* Pan Tool */}
        <button
          onClick={() => setActiveTool("pan")}
          aria-label="Pan view"
          aria-pressed={activeTool === "pan"}
          className={`p-3 rounded-lg border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1 ${
            activeTool === "pan"
              ? "border-gray-500 bg-gray-100"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <svg
            className="w-6 h-6 mx-auto text-gray-700"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11"
            />
          </svg>
          <span className="text-xs text-gray-600 block mt-1">Pan</span>
        </button>
      </div>

      {/* Undo/Redo */}
      <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              if (currentPointsLength > 0) {
                onRemoveLastPoint();
              } else if (canUndo) {
                onUndo();
              }
            }}
            disabled={currentPointsLength === 0 && !canUndo}
            title={`Undo${getUndoDescription() ? `: ${getUndoDescription()}` : ""} (Ctrl+Z)`}
            className="flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
              />
            </svg>
            Undo
          </button>
          <button
            onClick={() => canRedo && onRedo()}
            disabled={!canRedo}
            title={`Redo${getRedoDescription() ? `: ${getRedoDescription()}` : ""} (Ctrl+Y)`}
            className="flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6"
              />
            </svg>
            Redo
          </button>
        </div>
      </div>

      {/* Tool Tips */}
      <div className="mt-4 text-xs text-gray-500">
        {activeTool === "draw" && (
          <>
            <p>Click to add points. Double-click or press Enter to complete.</p>
            <p className="mt-1 text-gray-400">Hold Shift for 90° angles</p>
          </>
        )}
        {activeTool === "select" && (
          <>
            <p>Click to select. Shift+Click to multi-select.</p>
            <p className="mt-1 text-gray-400">Drag on empty space to marquee select</p>
          </>
        )}
        {activeTool === "edit" && (
          <>
            <p>Drag vertices to reshape building.</p>
            <p className="mt-1 text-gray-400">Press V or Esc to exit edit mode</p>
          </>
        )}
        {activeTool === "delete" && <p>Click a building to delete it.</p>}
        {activeTool === "rectangle" && (
          <>
            <p>Click+drag to draw a rectangle.</p>
            <p className="mt-1 text-gray-400">Hold Shift for square</p>
          </>
        )}
        {activeTool === "move" && (
          <>
            <p>Click+drag a building to move it.</p>
            <p className="mt-1 text-gray-400">Use Ctrl+D to duplicate selected</p>
          </>
        )}
        {activeTool === "pan" && (
          <>
            <p>Click+drag to pan the view.</p>
            <p className="mt-1 text-gray-400">Use scroll wheel to zoom</p>
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
              onChange={(e) =>
                setEditorSettings((prev) => ({
                  ...prev,
                  snapToGrid: e.target.checked,
                }))
              }
              className="rounded border-gray-300 text-amber-500 focus:ring-amber-500"
            />
            Snap to grid
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={editorSettings.showGrid}
              onChange={(e) =>
                setEditorSettings((prev) => ({
                  ...prev,
                  showGrid: e.target.checked,
                }))
              }
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
          <span><kbd className="px-1 bg-gray-100 rounded">M</kbd> Move</span>
          <span><kbd className="px-1 bg-gray-100 rounded">P</kbd> Pan</span>
          <span><kbd className="px-1 bg-gray-100 rounded">Space</kbd> Hold Pan</span>
          <span><kbd className="px-1 bg-gray-100 rounded">Enter</kbd> Complete</span>
          <span><kbd className="px-1 bg-gray-100 rounded">Esc</kbd> Cancel</span>
          <span><kbd className="px-1 bg-gray-100 rounded">Ctrl+Z</kbd> Undo</span>
          <span><kbd className="px-1 bg-gray-100 rounded">Ctrl+D</kbd> Duplicate</span>
          <span><kbd className="px-1 bg-gray-100 rounded">Ctrl+A</kbd> Select All</span>
          <span><kbd className="px-1 bg-gray-100 rounded">+</kbd> Zoom In</span>
          <span><kbd className="px-1 bg-gray-100 rounded">-</kbd> Zoom Out</span>
          <span><kbd className="px-1 bg-gray-100 rounded">0</kbd> Reset View</span>
          <span><kbd className="px-1 bg-gray-100 rounded">Scroll</kbd> Zoom</span>
        </div>
      </div>
        </div>
      </div>
    </div>
  );
}
