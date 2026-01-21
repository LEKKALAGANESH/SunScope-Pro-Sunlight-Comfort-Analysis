/**
 * Navigation Controls - Floating UI panel for 3D camera navigation
 *
 * Phase 1 Implementation:
 * - Zoom in/out buttons
 * - Home/reset view button
 * - Fit to view button
 * - North alignment button
 * - Compass indicator
 * - Keyboard shortcut hints
 *
 * Phase 3 Implementation:
 * - View presets (aerial, street, top)
 */

import { useCallback, useEffect, useState, type ReactElement } from "react";

/** View preset types */
export type ViewPreset = "aerial" | "street" | "top" | "oblique";

export interface NavigationControlsProps {
  /** Callback for zoom in action */
  onZoomIn: () => void;
  /** Callback for zoom out action */
  onZoomOut: () => void;
  /** Callback for reset to home view */
  onResetView: () => void;
  /** Callback for fit all buildings in view */
  onFitToView: () => void;
  /** Callback for align to north */
  onAlignNorth: () => void;
  /** Callback for view preset selection (Phase 3) */
  onViewPreset?: (preset: ViewPreset) => void;
  /** Current camera azimuth angle in degrees (for compass) */
  cameraAzimuth?: number;
  /** Whether controls should be compact (mobile) */
  compact?: boolean;
  /** Layout direction - vertical (default) or horizontal for mobile */
  layout?: "vertical" | "horizontal";
  /** Additional CSS class */
  className?: string;
}

export function NavigationControls({
  onZoomIn,
  onZoomOut,
  onResetView,
  onFitToView,
  onAlignNorth,
  onViewPreset,
  cameraAzimuth = 0,
  compact = false,
  layout = "vertical",
  className = "",
}: NavigationControlsProps) {
  const isHorizontal = layout === "horizontal";
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [hideTimeout, setHideTimeout] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);
  const [showViewMenu, setShowViewMenu] = useState(false);

  // Auto-hide after inactivity (optional - can be disabled)
  const resetHideTimer = useCallback(() => {
    setIsVisible(true);
    if (hideTimeout) {
      clearTimeout(hideTimeout);
    }
    // Don't auto-hide on desktop for better UX
    if (compact) {
      const timeout = setTimeout(() => {
        setIsVisible(false);
      }, 5000);
      setHideTimeout(timeout);
    }
  }, [compact, hideTimeout]);

  useEffect(() => {
    // Reset timer on any interaction
    const handleInteraction = () => resetHideTimer();

    window.addEventListener("mousemove", handleInteraction);
    window.addEventListener("touchstart", handleInteraction);

    return () => {
      window.removeEventListener("mousemove", handleInteraction);
      window.removeEventListener("touchstart", handleInteraction);
      if (hideTimeout) {
        clearTimeout(hideTimeout);
      }
    };
  }, [resetHideTimer, hideTimeout]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case "+":
        case "=":
          e.preventDefault();
          onZoomIn();
          break;
        case "-":
        case "_":
          e.preventDefault();
          onZoomOut();
          break;
        case "Home":
          e.preventDefault();
          onResetView();
          break;
        case "f":
        case "F":
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            onFitToView();
          }
          break;
        case "n":
        case "N":
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            onAlignNorth();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onZoomIn, onZoomOut, onResetView, onFitToView, onAlignNorth]);

  // Calculate compass rotation (pointing to north based on camera azimuth)
  const compassRotation = -cameraAzimuth;

  const buttonClass = `
    flex items-center justify-center
    ${compact ? "w-7 h-7" : "w-10 h-10"}
    bg-white/90 backdrop-blur-sm
    border border-gray-200
    ${compact ? "rounded-md" : "rounded-lg"}
    text-gray-700
    hover:bg-white hover:border-gray-300 hover:text-gray-900
    active:bg-gray-100
    transition-all duration-150
    shadow-sm hover:shadow
    focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-1
  `;

  const iconClass = compact ? "w-3.5 h-3.5" : "w-5 h-5";

  const dividerClass = isHorizontal
    ? "h-6 w-px bg-gray-200 mx-0.5"
    : compact
      ? "w-full h-px bg-gray-200 my-0.5"
      : "w-full h-px bg-gray-200 my-1";

  const tooltips: Record<string, string> = {
    zoomIn: "Zoom In (+)",
    zoomOut: "Zoom Out (-)",
    home: "Reset View (Home)",
    fit: "Fit All (F)",
    north: "Face North (N)",
    views: "View Presets (V)",
  };

  // View preset definitions
  const viewPresets: {
    id: ViewPreset;
    label: string;
    icon: ReactElement;
    description: string;
  }[] = [
    {
      id: "aerial",
      label: "Aerial",
      description: "Bird's eye view",
      icon: (
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064"
          />
        </svg>
      ),
    },
    {
      id: "street",
      label: "Street",
      description: "Ground level view",
      icon: (
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
      ),
    },
    {
      id: "top",
      label: "Top",
      description: "Plan view",
      icon: (
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
          />
        </svg>
      ),
    },
    {
      id: "oblique",
      label: "Oblique",
      description: "45° angle view",
      icon: (
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
          />
        </svg>
      ),
    },
  ];

  // Handle view preset keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if ((e.key === "v" || e.key === "V") && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setShowViewMenu((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div
      className={`
        flex ${isHorizontal ? "flex-row items-center" : "flex-col"} gap-0.5 ${compact ? "p-1" : "p-1.5"}
        bg-white/70 backdrop-blur-md
        ${compact ? "rounded-lg" : "rounded-xl"}
        border border-gray-200/50
        shadow-lg
        transition-opacity duration-300
        ${isVisible ? "opacity-100" : "opacity-30 hover:opacity-100"}
        ${className}
      `}
      onMouseEnter={() => setIsVisible(true)}
    >
      {/* Compass */}
      <button
        onClick={onAlignNorth}
        onMouseEnter={() => setShowTooltip("north")}
        onMouseLeave={() => setShowTooltip(null)}
        className={`${buttonClass} relative`}
        aria-label="Align to north"
        title={tooltips.north}
      >
        <svg
          className={iconClass}
          viewBox="0 0 24 24"
          fill="none"
          style={{
            transform: `rotate(${compassRotation + 180}deg)`,
            transition: "transform 0.3s ease",
          }}
        >
          {/* Compass ring */}
          <circle
            cx="12"
            cy="12"
            r="1"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
          />
          {/* South pointer (gray) */}
          <path
            d="M12 22 L14 14 L12 16 L 14 Z"
            fill="#9ca3af"
            stroke="#9ca3af"
            strokeWidth="0.5"
          />
          {/* North pointer (red) */}{" "}
          <path
            d="M12 2 L14 10 L12 8 L10 10 Z"
            fill="#ef4444"
            stroke="#ef4444"
            strokeWidth="0.5"
          />
          {/* N label */}
          <text
            x="12"
            y="6"
            textAnchor="middle"
            fontSize="4"
            fontWeight="bold"
            fill="#ef4444"
          >
            N
          </text>
        </svg>
        {showTooltip === "north" && <Tooltip text={tooltips.north} />}
      </button>

      <div className={dividerClass} />

      {/* Zoom In */}
      <button
        onClick={onZoomIn}
        onMouseEnter={() => setShowTooltip("zoomIn")}
        onMouseLeave={() => setShowTooltip(null)}
        className={buttonClass}
        aria-label="Zoom in"
        title={tooltips.zoomIn}
      >
        <svg
          className={iconClass}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v12m6-6H6"
          />
        </svg>
        {showTooltip === "zoomIn" && <Tooltip text={tooltips.zoomIn} />}
      </button>

      {/* Zoom Out */}
      <button
        onClick={onZoomOut}
        onMouseEnter={() => setShowTooltip("zoomOut")}
        onMouseLeave={() => setShowTooltip(null)}
        className={buttonClass}
        aria-label="Zoom out"
        title={tooltips.zoomOut}
      >
        <svg
          className={iconClass}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 12H6" />
        </svg>
        {showTooltip === "zoomOut" && <Tooltip text={tooltips.zoomOut} />}
      </button>

      <div className={dividerClass} />

      {/* Home/Reset */}
      <button
        onClick={onResetView}
        onMouseEnter={() => setShowTooltip("home")}
        onMouseLeave={() => setShowTooltip(null)}
        className={buttonClass}
        aria-label="Reset view"
        title={tooltips.home}
      >
        <svg
          className={iconClass}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
        {showTooltip === "home" && <Tooltip text={tooltips.home} />}
      </button>

      {/* Fit to View */}
      <button
        onClick={onFitToView}
        onMouseEnter={() => setShowTooltip("fit")}
        onMouseLeave={() => setShowTooltip(null)}
        className={buttonClass}
        aria-label="Fit all in view"
        title={tooltips.fit}
      >
        <svg
          className={iconClass}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
          />
        </svg>
        {showTooltip === "fit" && <Tooltip text={tooltips.fit} />}
      </button>

      {/* Phase 3: View Presets */}
      {onViewPreset && (
        <>
          <div className={dividerClass} />

          <div className="relative">
            <button
              onClick={() => setShowViewMenu(!showViewMenu)}
              onMouseEnter={() => setShowTooltip("views")}
              onMouseLeave={() => setShowTooltip(null)}
              className={`${buttonClass} ${showViewMenu ? "bg-amber-100 border-amber-300" : ""}`}
              aria-label="View presets"
              title={tooltips.views}
              aria-expanded={showViewMenu}
            >
              <svg
                className={iconClass}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                />
              </svg>
              {showTooltip === "views" && !showViewMenu && (
                <Tooltip text={tooltips.views} />
              )}
            </button>

            {/* View Presets Dropdown */}
            {showViewMenu && (
              <div
                className="absolute right-full mr-2 bottom-0 bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-xl border border-gray-200/60 py-1 w-36 z-20 backdrop-blur-sm"
                onMouseLeave={() => setShowViewMenu(false)}
              >
                <div className="px-2 py-1 text-xs text-gray-500 font-medium border-b border-gray-100 mb-1">
                  View Presets
                </div>
                {viewPresets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      onViewPreset(preset.id);
                      setShowViewMenu(false);
                    }}
                    className="w-full px-2 py-1.5 text-left hover:bg-amber-50 flex items-center gap-2 transition-colors"
                  >
                    <span className="text-gray-500">{preset.icon}</span>
                    <div>
                      <div className="text-sm font-medium text-gray-700">
                        {preset.label}
                      </div>
                      <div className="text-xs text-gray-400">
                        {preset.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Tooltip({
  text,
  position = "left",
}: {
  text: string;
  position?: "left" | "top";
}) {
  if (position === "top") {
    return (
      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap z-10">
        {text}
        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
      </div>
    );
  }
  return (
    <div className="absolute right-full mr-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap z-10">
      {text}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 w-0 h-0 border-t-4 border-b-4 border-l-4 border-transparent border-l-gray-900" />
    </div>
  );
}

export default NavigationControls;
