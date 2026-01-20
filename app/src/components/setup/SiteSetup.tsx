import { useEffect, useRef, useState } from "react";
import { useProjectStore } from "../../store/projectStore";
import { ErrorSeverity, validators } from "../../utils/errors";
import { useToast } from "../common/Toast";

// Validation error state interface
interface ValidationErrors {
  latitude?: string;
  longitude?: string;
  scale?: string;
  northAngle?: string;
}

export function SiteSetup() {
  const { project, setSiteConfig, setLocation, setCurrentStep } =
    useProjectStore();
  const { image, site } = project;
  const { showToast } = useToast();

  const [northAngle, setNorthAngle] = useState(site.northAngle);
  const [scale, setScale] = useState(site.scale);
  const [scaleInput, setScaleInput] = useState("50");
  const [locationSearch, setLocationSearch] = useState(
    site.location.city || "",
  );
  const [lat, setLat] = useState(site.location.latitude.toString());
  const [lon, setLon] = useState(site.location.longitude.toString());
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {},
  );

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawingScale, setIsDrawingScale] = useState(false);
  const [scalePoints, setScalePoints] = useState<{ x: number; y: number }[]>(
    [],
  );
  const [zoom, setZoom] = useState(1.0);
  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [history, setHistory] = useState<
    Array<{ scalePoints: { x: number; y: number }[]; scale: number }>
  >([]);
  const [isMouseDown, setIsMouseDown] = useState(false);

  // Keyboard shortcuts for zoom and pan
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if typing in an input field
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Ctrl+Z / Cmd+Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (history.length > 0) {
          const lastState = history[history.length - 1];
          setScalePoints(lastState.scalePoints);
          setScale(lastState.scale);
          setSiteConfig({ scale: lastState.scale });
          setHistory(history.slice(0, -1));

          // If restoring to a state with points, re-enable drawing mode
          // If restoring to empty state, disable drawing mode
          if (lastState.scalePoints.length > 0) {
            setIsDrawingScale(true);
          } else {
            setIsDrawingScale(false);
          }

          showToast("Undone last scale operation", ErrorSeverity.INFO);
        }
      }

      // P key for pan mode toggle
      if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        setIsPanning((prev) => !prev);
      }

      // Zoom in: + or =
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        setZoom((prev) => Math.min(prev + 0.25, 3.0));
      }

      // Zoom out: -
      if (e.key === "-") {
        e.preventDefault();
        setZoom((prev) => Math.max(prev - 0.25, 0.5));
      }

      // Reset: 0
      if (e.key === "0") {
        e.preventDefault();
        setZoom(1.0);
        setPanOffset({ x: 0, y: 0 });
        setIsPanning(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [history, scale, setSiteConfig, showToast]);

  // Draw image with north indicator
  useEffect(() => {
    if (!canvasRef.current || !image) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    const img = new Image();

    img.onload = () => {
      // Scale canvas to fit while maintaining aspect ratio
      const maxWidth = 600;
      const maxHeight = 400;
      const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;

      // Clear and draw image
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();

      // Apply pan offset
      ctx.translate(panOffset.x, panOffset.y);

      // Apply zoom transformation from center
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.scale(zoom, zoom);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);

      // Rotate around center
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((northAngle * Math.PI) / 180);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      ctx.restore();

      // Draw scale line if points exist (after restoring transformations, so it's drawn in screen space)
      if (scalePoints.length > 0) {
        ctx.save();
        // Apply the same transformations for consistent positioning
        ctx.translate(panOffset.x, panOffset.y);
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(zoom, zoom);
        ctx.translate(-canvas.width / 2, -canvas.height / 2);

        // Draw line if we have 2 points
        if (scalePoints.length === 2) {
          ctx.beginPath();
          ctx.moveTo(scalePoints[0].x, scalePoints[0].y);
          ctx.lineTo(scalePoints[1].x, scalePoints[1].y);
          ctx.strokeStyle = "#f59e0b";
          ctx.lineWidth = 3 / zoom; // Scale line width inversely with zoom
          ctx.stroke();
        }

        // Draw all points
        scalePoints.forEach((p) => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 6 / zoom, 0, Math.PI * 2); // Scale point size inversely with zoom
          ctx.fillStyle = "#f59e0b";
          ctx.fill();
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 2 / zoom;
          ctx.stroke();
        });

        ctx.restore();
      }

      // Draw north indicator (in screen space, not affected by zoom/pan)
      const compassX = canvas.width - 50;
      const compassY = 50;
      const compassSize = 30;

      ctx.save();
      ctx.translate(compassX, compassY);

      // Compass circle
      ctx.beginPath();
      ctx.arc(0, 0, compassSize, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.fill();
      ctx.strokeStyle = "#374151";
      ctx.lineWidth = 2;
      ctx.stroke();

      // North arrow (always pointing upward - fixed reference)
      ctx.beginPath();
      ctx.moveTo(0, -compassSize + 8);
      ctx.lineTo(-8, 5);
      ctx.lineTo(0, 0);
      ctx.lineTo(8, 5);
      ctx.closePath();
      ctx.fillStyle = "#ef4444";
      ctx.fill();

      // N label
      ctx.fillStyle = "#1f2937";
      ctx.font = "bold 12px Arial";
      ctx.textAlign = "center";
      ctx.fillText("N", 0, -compassSize - 5);

      ctx.restore();
    };

    img.src = image.dataUrl;
  }, [image, northAngle, scalePoints, zoom, panOffset]);

  // Convert screen coordinates to canvas coordinates (accounting for zoom and pan)
  const screenToCanvas = (
    screenX: number,
    screenY: number,
  ): { x: number; y: number } => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const canvasX = screenX - rect.left;
    const canvasY = screenY - rect.top;

    // Reverse the transformations: pan then zoom
    const x =
      (canvasX - panOffset.x - canvas.width / 2) / zoom + canvas.width / 2;
    const y =
      (canvasY - panOffset.y - canvas.height / 2) / zoom + canvas.height / 2;

    return { x, y };
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) return;
    if (!isDrawingScale) return;

    const point = screenToCanvas(e.clientX, e.clientY);
    const x = point.x;
    const y = point.y;

    if (scalePoints.length === 0) {
      // First point - save current state to history
      setHistory([...history, { scalePoints: [], scale }]);
      setScalePoints([{ x, y }]);
    } else if (scalePoints.length === 1) {
      // Second point - calculate scale
      const dx = x - scalePoints[0].x;
      const dy = y - scalePoints[0].y;
      const pixelDistance = Math.sqrt(dx * dx + dy * dy);

      if (pixelDistance > 0) {
        const realDistance = parseFloat(scaleInput) || 50;
        const newScale = realDistance / pixelDistance;

        // Validate the calculated scale
        if (validateScale(newScale)) {
          // Save to history before changing (save the state to restore to when undoing)
          setHistory([
            ...history,
            { scalePoints: scalePoints, scale }, // Save first point and old scale
          ]);
          setScalePoints([...scalePoints, { x, y }]); // Add second point
          setScale(newScale);
          setSiteConfig({ scale: newScale });
        } else {
          showToast(
            "The calculated scale is outside valid range (0.01-100 m/px). Try a different reference distance.",
            ErrorSeverity.WARNING,
          );
        }
      }

      setIsDrawingScale(false);
    }
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsMouseDown(true);

    // Don't start panning if in scale drawing mode
    if (isDrawingScale) {
      return;
    }

    // Start panning if pan button is active
    if (isPanning) {
      e.preventDefault();
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Don't pan if in scale drawing mode
    if (isDrawingScale) {
      return;
    }

    // Handle panning
    if (isPanning && isMouseDown) {
      const deltaX = e.clientX - panStart.x;
      const deltaY = e.clientY - panStart.y;
      setPanOffset((prev) => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY,
      }));
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }
  };

  const handleCanvasMouseUp = () => {
    setIsMouseDown(false);
  };

  const handleCanvasMouseLeave = () => {
    setIsMouseDown(false);
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 3.0));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handlePanToggle = () => {
    const newIsPanning = !isPanning;
    setIsPanning(newIsPanning);
    // Don't reset pan offset when toggling off
  };

  const handleUndo = () => {
    if (history.length === 0) return;

    const lastState = history[history.length - 1];
    setScalePoints(lastState.scalePoints);
    setScale(lastState.scale);
    setSiteConfig({ scale: lastState.scale });
    setHistory(history.slice(0, -1));

    // If restoring to a state with points, re-enable drawing mode
    // If restoring to empty state, disable drawing mode
    if (lastState.scalePoints.length > 0) {
      setIsDrawingScale(true);
    } else {
      setIsDrawingScale(false);
    }

    showToast("Undone last scale operation", ErrorSeverity.INFO);
  };

  const handleResetView = () => {
    setZoom(1.0);
    setPanOffset({ x: 0, y: 0 });
    setIsPanning(false);
  };

  const handleNorthChange = (value: number) => {
    setNorthAngle(value);
    setSiteConfig({ northAngle: value });
  };

  const handleLocationSearch = () => {
    // Simple location presets (in production, use a geocoding API)
    const locations: Record<string, { lat: number; lon: number; tz: string }> =
      {
        "new york": { lat: 40.7128, lon: -74.006, tz: "America/New_York" },
        london: { lat: 51.5074, lon: -0.1278, tz: "Europe/London" },
        tokyo: { lat: 35.6762, lon: 139.6503, tz: "Asia/Tokyo" },
        sydney: { lat: -33.8688, lon: 151.2093, tz: "Australia/Sydney" },
        paris: { lat: 48.8566, lon: 2.3522, tz: "Europe/Paris" },
        singapore: { lat: 1.3521, lon: 103.8198, tz: "Asia/Singapore" },
        dubai: { lat: 25.2048, lon: 55.2708, tz: "Asia/Dubai" },
        "los angeles": {
          lat: 34.0522,
          lon: -118.2437,
          tz: "America/Los_Angeles",
        },
        mumbai: { lat: 19.076, lon: 72.8777, tz: "Asia/Kolkata" },
        berlin: { lat: 52.52, lon: 13.405, tz: "Europe/Berlin" },
        // Indian cities
        hyderabad: { lat: 17.385, lon: 78.4867, tz: "Asia/Kolkata" },
        kokapet: { lat: 17.4156, lon: 78.3558, tz: "Asia/Kolkata" },
        bangalore: { lat: 12.9716, lon: 77.5946, tz: "Asia/Kolkata" },
        bengaluru: { lat: 12.9716, lon: 77.5946, tz: "Asia/Kolkata" },
        chennai: { lat: 13.0827, lon: 80.2707, tz: "Asia/Kolkata" },
        delhi: { lat: 28.6139, lon: 77.209, tz: "Asia/Kolkata" },
        "new delhi": { lat: 28.6139, lon: 77.209, tz: "Asia/Kolkata" },
        pune: { lat: 18.5204, lon: 73.8567, tz: "Asia/Kolkata" },
        kolkata: { lat: 22.5726, lon: 88.3639, tz: "Asia/Kolkata" },
        gurgaon: { lat: 28.4595, lon: 77.0266, tz: "Asia/Kolkata" },
        noida: { lat: 28.5355, lon: 77.391, tz: "Asia/Kolkata" },
      };

    const search = locationSearch.toLowerCase();
    const found = locations[search];

    if (found) {
      setLat(found.lat.toString());
      setLon(found.lon.toString());
      setLocation(found.lat, found.lon, locationSearch);
      setSiteConfig({
        location: {
          latitude: found.lat,
          longitude: found.lon,
          timezone: found.tz,
          city: locationSearch,
        },
      });
    }
  };

  // Validate latitude and update error state
  const validateLatitude = (value: string): boolean => {
    const latitude = parseFloat(value);
    if (isNaN(latitude)) {
      setValidationErrors((prev) => ({
        ...prev,
        latitude: "Please enter a valid number",
      }));
      return false;
    }
    if (!validators.latitude(latitude)) {
      setValidationErrors((prev) => ({
        ...prev,
        latitude: "Must be between -90 and 90",
      }));
      return false;
    }
    setValidationErrors((prev) => ({ ...prev, latitude: undefined }));
    return true;
  };

  // Validate longitude and update error state
  const validateLongitude = (value: string): boolean => {
    const longitude = parseFloat(value);
    if (isNaN(longitude)) {
      setValidationErrors((prev) => ({
        ...prev,
        longitude: "Please enter a valid number",
      }));
      return false;
    }
    if (!validators.longitude(longitude)) {
      setValidationErrors((prev) => ({
        ...prev,
        longitude: "Must be between -180 and 180",
      }));
      return false;
    }
    setValidationErrors((prev) => ({ ...prev, longitude: undefined }));
    return true;
  };

  // Validate scale and update error state
  const validateScale = (value: number): boolean => {
    if (!validators.scale(value)) {
      setValidationErrors((prev) => ({
        ...prev,
        scale: "Scale must be between 0.01 and 100 m/px",
      }));
      return false;
    }
    setValidationErrors((prev) => ({ ...prev, scale: undefined }));
    return true;
  };

  const handleCoordsChange = () => {
    const latValid = validateLatitude(lat);
    const lonValid = validateLongitude(lon);

    if (latValid && lonValid) {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lon);
      setLocation(latitude, longitude);
    }
  };

  const handleContinue = () => {
    // Validate all inputs before continuing
    const latValid = validateLatitude(lat);
    const lonValid = validateLongitude(lon);
    const scaleValid = validateScale(scale);

    // Check for any validation errors
    if (!latValid || !lonValid || !scaleValid) {
      showToast(
        "Please fix the validation errors before continuing.",
        ErrorSeverity.WARNING,
        { recoveryAction: "Check the highlighted fields for errors." },
      );
      return;
    }

    // Validate north angle is within range
    if (!validators.northAngle(northAngle)) {
      showToast(
        "North angle must be between 0 and 360 degrees.",
        ErrorSeverity.WARNING,
      );
      return;
    }

    // Save final values
    setSiteConfig({
      northAngle,
      scale,
      location: {
        latitude: parseFloat(lat),
        longitude: parseFloat(lon),
        timezone: site.location.timezone,
        city: locationSearch || site.location.city,
      },
    });
    setCurrentStep("validate");
  };

  if (!image) return null;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Image Canvas */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900">Site Plan</h3>
            <div className="flex gap-1">
              <button
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
                className="w-8 h-8 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-bold text-gray-700 text-lg"
                title="Zoom Out (- key)"
              >
                −
              </button>
              <button
                onClick={handleZoomIn}
                disabled={zoom >= 3.0}
                className="w-8 h-8 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-bold text-gray-700 text-lg"
                title="Zoom In (+ key)"
              >
                +
              </button>
              <button
                onClick={handlePanToggle}
                className={`w-8 h-8 border rounded hover:bg-gray-50 flex items-center justify-center text-lg ${
                  isPanning
                    ? "bg-blue-100 border-blue-500 text-blue-700"
                    : "bg-white border-gray-300 text-gray-700"
                }`}
                title="Toggle Pan Mode (P key)"
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
              </button>
              <button
                onClick={handleResetView}
                disabled={
                  zoom === 1.0 && panOffset.x === 0 && panOffset.y === 0
                }
                className="w-8 h-8 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-gray-700 text-lg"
                title="Reset View (0 key)"
              >
                ⌂
              </button>
              <button
                onClick={handleUndo}
                disabled={history.length === 0}
                className="w-8 h-8 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-gray-700 text-lg"
                title="Undo (Ctrl+Z)"
              >
                ↶
              </button>
            </div>
          </div>
          <div className="relative bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseLeave}
              className={`max-w-full ${
                isDrawingScale
                  ? "cursor-crosshair"
                  : isPanning && isMouseDown
                    ? "cursor-grabbing"
                    : isPanning
                      ? "cursor-grab"
                      : ""
              }`}
              role="img"
              aria-label="Site plan canvas. When scale mode is active, click to define measurement points. Press P to toggle pan mode, Ctrl+Z to undo."
              tabIndex={0}
            />
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {isDrawingScale
              ? `Click two points to define scale (${scalePoints.length}/2) - Use +/- to zoom, Ctrl+Z to undo`
              : isPanning
                ? "Drag to pan the image - Use +/- to zoom"
                : "Use +/- to zoom, P to pan, 0 to reset, Ctrl+Z to undo"}
          </p>
        </div>

        {/* Controls */}
        <div className="space-y-4">
          {/* North Orientation */}
          <div className="card">
            <h4 className="font-medium text-gray-900 mb-3">
              North Orientation
            </h4>
            <div className="space-y-3">
              <div>
                <label className="label">Rotation (degrees)</label>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={northAngle}
                  onChange={(e) => handleNorthChange(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0°</span>
                  <span className="font-medium">{northAngle}°</span>
                  <span>360°</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleNorthChange((northAngle + 90) % 360)}
                  className="btn-outline text-sm flex-1"
                >
                  +90°
                </button>
                <button
                  onClick={() => handleNorthChange(0)}
                  className="btn-outline text-sm flex-1"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* Scale Definition */}
          <div className="card">
            <h4 className="font-medium text-gray-900 mb-3">Scale Definition</h4>
            <div className="space-y-3">
              <div>
                <label className="label">Reference distance (meters)</label>
                <input
                  type="number"
                  value={scaleInput}
                  onChange={(e) => setScaleInput(e.target.value)}
                  className="input"
                  placeholder="e.g., 50"
                />
              </div>
              <button
                onClick={() => {
                  setIsDrawingScale(true);
                  setScalePoints([]);
                  setIsPanning(false); // Disable pan mode when starting to draw scale
                }}
                className={`w-full ${isDrawingScale ? "btn-primary" : "btn-outline"}`}
              >
                {isDrawingScale
                  ? "Drawing... (click 2 points)"
                  : "Draw Scale Line"}
              </button>
              {scale !== 1 && (
                <p
                  className={`text-xs ${validationErrors.scale ? "text-red-600" : "text-green-600"}`}
                >
                  {validationErrors.scale ||
                    `Scale set: ${scale.toFixed(4)} m/px`}
                </p>
              )}
            </div>
          </div>

          {/* Location */}
          <div className="card">
            <h4 className="font-medium text-gray-900 mb-3">Location</h4>
            <div className="space-y-3">
              <div>
                <label className="label">Search city</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={locationSearch}
                    onChange={(e) => setLocationSearch(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleLocationSearch()
                    }
                    className="input flex-1"
                    placeholder="e.g., New York"
                  />
                  <button
                    onClick={handleLocationSearch}
                    className="btn-secondary"
                  >
                    Go
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={lat}
                    onChange={(e) => {
                      setLat(e.target.value);
                      validateLatitude(e.target.value);
                    }}
                    onBlur={handleCoordsChange}
                    className={`input ${validationErrors.latitude ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}`}
                    aria-invalid={!!validationErrors.latitude}
                    aria-describedby={
                      validationErrors.latitude ? "lat-error" : undefined
                    }
                  />
                  {validationErrors.latitude && (
                    <p
                      id="lat-error"
                      className="mt-1 text-xs text-red-600"
                      role="alert"
                    >
                      {validationErrors.latitude}
                    </p>
                  )}
                </div>
                <div>
                  <label className="label">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={lon}
                    onChange={(e) => {
                      setLon(e.target.value);
                      validateLongitude(e.target.value);
                    }}
                    onBlur={handleCoordsChange}
                    className={`input ${validationErrors.longitude ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}`}
                    aria-invalid={!!validationErrors.longitude}
                    aria-describedby={
                      validationErrors.longitude ? "lon-error" : undefined
                    }
                  />
                  {validationErrors.longitude && (
                    <p
                      id="lon-error"
                      className="mt-1 text-xs text-red-600"
                      role="alert"
                    >
                      {validationErrors.longitude}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex justify-between items-center">
        <button
          onClick={() => setCurrentStep("upload")}
          className="btn-outline"
        >
          Back
        </button>
        <button onClick={handleContinue} className="btn-primary">
          Continue to Validate
        </button>
      </div>
    </div>
  );
}
