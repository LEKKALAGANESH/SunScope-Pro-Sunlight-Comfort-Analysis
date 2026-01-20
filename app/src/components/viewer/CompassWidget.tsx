/**
 * Compass Widget - Interactive 3D compass for orientation
 *
 * Phase 5 Implementation:
 * - 3D rotating compass that follows camera orientation
 * - Click to align to cardinal directions
 * - Sun position indicator
 * - North arrow always visible
 */

import { useEffect, useRef, useCallback } from 'react';

export interface CompassWidgetProps {
  /** Camera azimuth angle in radians */
  cameraAzimuth: number;
  /** North offset from true north in degrees */
  northOffset?: number;
  /** Sun azimuth in radians (optional) */
  sunAzimuth?: number;
  /** Whether sun is above horizon */
  sunAboveHorizon?: boolean;
  /** Callback when compass is clicked to rotate */
  onRotateToNorth?: () => void;
  /** Callback to rotate to specific direction */
  onRotateTo?: (direction: 'N' | 'S' | 'E' | 'W') => void;
  /** Size of the compass in pixels */
  size?: number;
  /** Show sun indicator */
  showSunIndicator?: boolean;
  /** Compact mode */
  compact?: boolean;
  /** Additional class names */
  className?: string;
}

export function CompassWidget({
  cameraAzimuth,
  northOffset = 0,
  sunAzimuth,
  sunAboveHorizon = true,
  onRotateToNorth,
  onRotateTo,
  size = 80,
  showSunIndicator = true,
  compact = false,
  className = '',
}: CompassWidgetProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Convert camera azimuth to compass rotation (opposite direction)
  const compassRotation = -cameraAzimuth * (180 / Math.PI) + northOffset;

  // Draw compass on canvas
  const drawCompass = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const canvasSize = size * dpr;
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    ctx.scale(dpr, dpr);

    const center = size / 2;
    const outerRadius = size / 2 - 4;
    const innerRadius = outerRadius - (compact ? 8 : 12);

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    // Save context for rotation
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate((compassRotation * Math.PI) / 180);

    // Draw outer ring
    ctx.beginPath();
    ctx.arc(0, 0, outerRadius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw tick marks
    for (let i = 0; i < 360; i += 15) {
      const angle = (i * Math.PI) / 180;
      const isCardinal = i % 90 === 0;
      const isOrdinal = i % 45 === 0 && !isCardinal;

      const tickLength = isCardinal ? 8 : isOrdinal ? 5 : 3;
      const startRadius = outerRadius - tickLength;

      ctx.beginPath();
      ctx.moveTo(
        Math.sin(angle) * startRadius,
        -Math.cos(angle) * startRadius
      );
      ctx.lineTo(
        Math.sin(angle) * outerRadius,
        -Math.cos(angle) * outerRadius
      );
      ctx.strokeStyle = isCardinal
        ? 'rgba(255, 255, 255, 0.9)'
        : 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = isCardinal ? 2 : 1;
      ctx.stroke();
    }

    // Draw cardinal direction labels
    const directions = [
      { label: 'N', angle: 0, color: '#ef4444' },
      { label: 'E', angle: 90, color: '#ffffff' },
      { label: 'S', angle: 180, color: '#ffffff' },
      { label: 'W', angle: 270, color: '#ffffff' },
    ];

    ctx.font = `bold ${compact ? 10 : 12}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    directions.forEach(({ label, angle, color }) => {
      const rad = (angle * Math.PI) / 180;
      const labelRadius = innerRadius - (compact ? 6 : 10);
      const x = Math.sin(rad) * labelRadius;
      const y = -Math.cos(rad) * labelRadius;

      ctx.fillStyle = color;
      ctx.fillText(label, x, y);
    });

    // Draw north arrow
    const arrowLength = compact ? 15 : 20;
    ctx.beginPath();
    ctx.moveTo(0, -innerRadius + arrowLength + 5);
    ctx.lineTo(-5, -innerRadius + arrowLength + 15);
    ctx.lineTo(0, -innerRadius + 5);
    ctx.lineTo(5, -innerRadius + arrowLength + 15);
    ctx.closePath();
    ctx.fillStyle = '#ef4444';
    ctx.fill();

    // Restore context
    ctx.restore();

    // Draw sun indicator (not rotated with compass)
    if (showSunIndicator && sunAzimuth !== undefined && sunAboveHorizon) {
      ctx.save();
      ctx.translate(center, center);

      // Sun azimuth relative to north
      const sunAngle = sunAzimuth + (northOffset * Math.PI) / 180;
      const sunRadius = outerRadius + 8;
      const sunX = Math.sin(sunAngle) * sunRadius;
      const sunY = -Math.cos(sunAngle) * sunRadius;

      // Draw sun icon
      ctx.beginPath();
      ctx.arc(sunX, sunY, 6, 0, Math.PI * 2);
      const gradient = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 6);
      gradient.addColorStop(0, '#fbbf24');
      gradient.addColorStop(1, '#f59e0b');
      ctx.fillStyle = gradient;
      ctx.fill();

      // Draw sun rays
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 8; i++) {
        const rayAngle = (i * Math.PI) / 4;
        ctx.beginPath();
        ctx.moveTo(
          sunX + Math.cos(rayAngle) * 8,
          sunY + Math.sin(rayAngle) * 8
        );
        ctx.lineTo(
          sunX + Math.cos(rayAngle) * 11,
          sunY + Math.sin(rayAngle) * 11
        );
        ctx.stroke();
      }

      ctx.restore();
    }

    // Draw center dot
    ctx.beginPath();
    ctx.arc(center, center, 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fill();
  }, [compassRotation, size, compact, showSunIndicator, sunAzimuth, sunAboveHorizon, northOffset]);

  // Redraw on changes
  useEffect(() => {
    drawCompass();
  }, [drawCompass]);

  // Handle click on compass
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    // Calculate angle from center
    const angle = Math.atan2(x, -y);
    const degrees = ((angle * 180) / Math.PI + 360) % 360;

    // Determine which direction was clicked
    if (degrees >= 315 || degrees < 45) {
      onRotateTo?.('N');
      onRotateToNorth?.();
    } else if (degrees >= 45 && degrees < 135) {
      onRotateTo?.('E');
    } else if (degrees >= 135 && degrees < 225) {
      onRotateTo?.('S');
    } else {
      onRotateTo?.('W');
    }
  };

  return (
    <div
      className={`
        relative rounded-full
        bg-gray-900/80 backdrop-blur-sm
        shadow-lg border border-white/20
        ${className}
      `}
      style={{ width: size + 20, height: size + 20 }}
    >
      <canvas
        ref={canvasRef}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer"
        style={{ width: size, height: size }}
        onClick={handleClick}
        title="Click to rotate to direction"
      />

      {/* Direction buttons (optional, for accessibility) */}
      {!compact && (
        <div className="absolute inset-0 pointer-events-none">
          <button
            className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2
                       w-5 h-5 rounded-full bg-red-500/80 text-white text-[10px] font-bold
                       pointer-events-auto opacity-0 hover:opacity-100 transition-opacity"
            onClick={() => { onRotateTo?.('N'); onRotateToNorth?.(); }}
            title="Rotate to North"
          >
            N
          </button>
          <button
            className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2
                       w-5 h-5 rounded-full bg-white/80 text-gray-800 text-[10px] font-bold
                       pointer-events-auto opacity-0 hover:opacity-100 transition-opacity"
            onClick={() => onRotateTo?.('E')}
            title="Rotate to East"
          >
            E
          </button>
          <button
            className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2
                       w-5 h-5 rounded-full bg-white/80 text-gray-800 text-[10px] font-bold
                       pointer-events-auto opacity-0 hover:opacity-100 transition-opacity"
            onClick={() => onRotateTo?.('S')}
            title="Rotate to South"
          >
            S
          </button>
          <button
            className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2
                       w-5 h-5 rounded-full bg-white/80 text-gray-800 text-[10px] font-bold
                       pointer-events-auto opacity-0 hover:opacity-100 transition-opacity"
            onClick={() => onRotateTo?.('W')}
            title="Rotate to West"
          >
            W
          </button>
        </div>
      )}
    </div>
  );
}

export default CompassWidget;
