import { useState, useRef, useEffect } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { useToast } from '../common/Toast';
import { validators, ErrorSeverity } from '../../utils/errors';

// Validation error state interface
interface ValidationErrors {
  latitude?: string;
  longitude?: string;
  scale?: string;
  northAngle?: string;
}

export function SiteSetup() {
  const { project, setSiteConfig, setLocation, setCurrentStep } = useProjectStore();
  const { image, site } = project;
  const { showToast } = useToast();

  const [northAngle, setNorthAngle] = useState(site.northAngle);
  const [scale, setScale] = useState(site.scale);
  const [scaleInput, setScaleInput] = useState('50');
  const [locationSearch, setLocationSearch] = useState(site.location.city || '');
  const [lat, setLat] = useState(site.location.latitude.toString());
  const [lon, setLon] = useState(site.location.longitude.toString());
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawingScale, setIsDrawingScale] = useState(false);
  const [scalePoints, setScalePoints] = useState<{ x: number; y: number }[]>([]);

  // Draw image with north indicator
  useEffect(() => {
    if (!canvasRef.current || !image) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
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

      // Rotate around center
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((northAngle * Math.PI) / 180);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      ctx.restore();

      // Draw scale line if points exist
      if (scalePoints.length === 2) {
        ctx.beginPath();
        ctx.moveTo(scalePoints[0].x, scalePoints[0].y);
        ctx.lineTo(scalePoints[1].x, scalePoints[1].y);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Draw endpoints
        scalePoints.forEach((p) => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
          ctx.fillStyle = '#f59e0b';
          ctx.fill();
        });
      }

      // Draw north indicator
      const compassX = canvas.width - 50;
      const compassY = 50;
      const compassSize = 30;

      ctx.save();
      ctx.translate(compassX, compassY);

      // Compass circle
      ctx.beginPath();
      ctx.arc(0, 0, compassSize, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fill();
      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 2;
      ctx.stroke();

      // North arrow
      ctx.beginPath();
      ctx.moveTo(0, -compassSize + 8);
      ctx.lineTo(-8, 5);
      ctx.lineTo(0, 0);
      ctx.lineTo(8, 5);
      ctx.closePath();
      ctx.fillStyle = '#ef4444';
      ctx.fill();

      // N label
      ctx.fillStyle = '#1f2937';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('N', 0, -compassSize - 5);

      ctx.restore();
    };

    img.src = image.dataUrl;
  }, [image, northAngle, scalePoints]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingScale) return;

    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (scalePoints.length < 2) {
      setScalePoints([...scalePoints, { x, y }]);
    }

    if (scalePoints.length === 1) {
      // Second point - calculate scale
      const dx = x - scalePoints[0].x;
      const dy = y - scalePoints[0].y;
      const pixelDistance = Math.sqrt(dx * dx + dy * dy);

      if (pixelDistance > 0) {
        const realDistance = parseFloat(scaleInput) || 50;
        const newScale = realDistance / pixelDistance;

        // Validate the calculated scale
        if (validateScale(newScale)) {
          setScale(newScale);
          setSiteConfig({ scale: newScale });
        } else {
          showToast(
            'The calculated scale is outside valid range (0.01-100 m/px). Try a different reference distance.',
            ErrorSeverity.WARNING
          );
        }
      }

      setIsDrawingScale(false);
    }
  };

  const handleNorthChange = (value: number) => {
    setNorthAngle(value);
    setSiteConfig({ northAngle: value });
  };

  const handleLocationSearch = () => {
    // Simple location presets (in production, use a geocoding API)
    const locations: Record<string, { lat: number; lon: number; tz: string }> = {
      'new york': { lat: 40.7128, lon: -74.006, tz: 'America/New_York' },
      'london': { lat: 51.5074, lon: -0.1278, tz: 'Europe/London' },
      'tokyo': { lat: 35.6762, lon: 139.6503, tz: 'Asia/Tokyo' },
      'sydney': { lat: -33.8688, lon: 151.2093, tz: 'Australia/Sydney' },
      'paris': { lat: 48.8566, lon: 2.3522, tz: 'Europe/Paris' },
      'singapore': { lat: 1.3521, lon: 103.8198, tz: 'Asia/Singapore' },
      'dubai': { lat: 25.2048, lon: 55.2708, tz: 'Asia/Dubai' },
      'los angeles': { lat: 34.0522, lon: -118.2437, tz: 'America/Los_Angeles' },
      'mumbai': { lat: 19.076, lon: 72.8777, tz: 'Asia/Kolkata' },
      'berlin': { lat: 52.52, lon: 13.405, tz: 'Europe/Berlin' },
      // Indian cities
      'hyderabad': { lat: 17.385, lon: 78.4867, tz: 'Asia/Kolkata' },
      'kokapet': { lat: 17.4156, lon: 78.3558, tz: 'Asia/Kolkata' },
      'bangalore': { lat: 12.9716, lon: 77.5946, tz: 'Asia/Kolkata' },
      'bengaluru': { lat: 12.9716, lon: 77.5946, tz: 'Asia/Kolkata' },
      'chennai': { lat: 13.0827, lon: 80.2707, tz: 'Asia/Kolkata' },
      'delhi': { lat: 28.6139, lon: 77.209, tz: 'Asia/Kolkata' },
      'new delhi': { lat: 28.6139, lon: 77.209, tz: 'Asia/Kolkata' },
      'pune': { lat: 18.5204, lon: 73.8567, tz: 'Asia/Kolkata' },
      'kolkata': { lat: 22.5726, lon: 88.3639, tz: 'Asia/Kolkata' },
      'gurgaon': { lat: 28.4595, lon: 77.0266, tz: 'Asia/Kolkata' },
      'noida': { lat: 28.5355, lon: 77.391, tz: 'Asia/Kolkata' },
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
      setValidationErrors(prev => ({ ...prev, latitude: 'Please enter a valid number' }));
      return false;
    }
    if (!validators.latitude(latitude)) {
      setValidationErrors(prev => ({ ...prev, latitude: 'Must be between -90 and 90' }));
      return false;
    }
    setValidationErrors(prev => ({ ...prev, latitude: undefined }));
    return true;
  };

  // Validate longitude and update error state
  const validateLongitude = (value: string): boolean => {
    const longitude = parseFloat(value);
    if (isNaN(longitude)) {
      setValidationErrors(prev => ({ ...prev, longitude: 'Please enter a valid number' }));
      return false;
    }
    if (!validators.longitude(longitude)) {
      setValidationErrors(prev => ({ ...prev, longitude: 'Must be between -180 and 180' }));
      return false;
    }
    setValidationErrors(prev => ({ ...prev, longitude: undefined }));
    return true;
  };

  // Validate scale and update error state
  const validateScale = (value: number): boolean => {
    if (!validators.scale(value)) {
      setValidationErrors(prev => ({ ...prev, scale: 'Scale must be between 0.01 and 100 m/px' }));
      return false;
    }
    setValidationErrors(prev => ({ ...prev, scale: undefined }));
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
        'Please fix the validation errors before continuing.',
        ErrorSeverity.WARNING,
        { recoveryAction: 'Check the highlighted fields for errors.' }
      );
      return;
    }

    // Validate north angle is within range
    if (!validators.northAngle(northAngle)) {
      showToast(
        'North angle must be between 0 and 360 degrees.',
        ErrorSeverity.WARNING
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
    setCurrentStep('editor');
  };

  if (!image) return null;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Image Canvas */}
        <div className="lg:col-span-2 card">
          <h3 className="font-medium text-gray-900 mb-3">Site Plan</h3>
          <div className="relative bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              className={`max-w-full ${isDrawingScale ? 'cursor-crosshair' : ''}`}
              role="img"
              aria-label="Site plan canvas. When scale mode is active, click to define measurement points."
              tabIndex={0}
            />
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {isDrawingScale
              ? `Click two points to define scale (${scalePoints.length}/2)`
              : 'Adjust settings in the panels to the right'}
          </p>
        </div>

        {/* Controls */}
        <div className="space-y-4">
          {/* North Orientation */}
          <div className="card">
            <h4 className="font-medium text-gray-900 mb-3">North Orientation</h4>
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
                }}
                className={`w-full ${isDrawingScale ? 'btn-primary' : 'btn-outline'}`}
              >
                {isDrawingScale ? 'Drawing...' : 'Draw Scale Line'}
              </button>
              {scale !== 1 && (
                <p className={`text-xs ${validationErrors.scale ? 'text-red-600' : 'text-green-600'}`}>
                  {validationErrors.scale || `Scale set: ${scale.toFixed(4)} m/px`}
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
                    onKeyDown={(e) => e.key === 'Enter' && handleLocationSearch()}
                    className="input flex-1"
                    placeholder="e.g., New York"
                  />
                  <button onClick={handleLocationSearch} className="btn-secondary">
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
                    className={`input ${validationErrors.latitude ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                    aria-invalid={!!validationErrors.latitude}
                    aria-describedby={validationErrors.latitude ? 'lat-error' : undefined}
                  />
                  {validationErrors.latitude && (
                    <p id="lat-error" className="mt-1 text-xs text-red-600" role="alert">
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
                    className={`input ${validationErrors.longitude ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                    aria-invalid={!!validationErrors.longitude}
                    aria-describedby={validationErrors.longitude ? 'lon-error' : undefined}
                  />
                  {validationErrors.longitude && (
                    <p id="lon-error" className="mt-1 text-xs text-red-600" role="alert">
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
        <button onClick={() => setCurrentStep('validate')} className="btn-outline">
          Back
        </button>
        <button onClick={handleContinue} className="btn-primary">
          Continue to Editor
        </button>
      </div>
    </div>
  );
}
