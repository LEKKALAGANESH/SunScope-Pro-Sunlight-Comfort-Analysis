/**
 * AccessibleSlider Component
 *
 * A fully accessible slider with keyboard controls:
 * - Arrow Left/Right or Down/Up: ±1 step
 * - Page Up/Down: ±10 steps (or custom large step)
 * - Home/End: Jump to min/max
 *
 * WCAG 2.2 AA compliant with proper ARIA attributes.
 */

import { useCallback, useRef, useEffect } from 'react';

interface AccessibleSliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  largeStep?: number; // For Page Up/Down
  onChange: (value: number) => void;
  onChangeEnd?: (value: number) => void;
  label: string;
  valueLabel?: string; // Human-readable value (e.g., "10:30 AM")
  className?: string;
  disabled?: boolean;
  ariaDescribedBy?: string;
}

export function AccessibleSlider({
  value,
  min,
  max,
  step = 1,
  largeStep,
  onChange,
  onChangeEnd,
  label,
  valueLabel,
  className = '',
  disabled = false,
  ariaDescribedBy,
}: AccessibleSliderProps) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // Calculate percentage for visual display
  const percentage = ((value - min) / (max - min)) * 100;

  // Calculate effective large step (default to 10% of range)
  const effectiveLargeStep = largeStep ?? Math.max(step, Math.round((max - min) / 10));

  const clampValue = useCallback(
    (val: number) => Math.min(max, Math.max(min, val)),
    [min, max]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;

      let newValue = value;
      let handled = true;

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowUp':
          newValue = clampValue(value + step);
          break;
        case 'ArrowLeft':
        case 'ArrowDown':
          newValue = clampValue(value - step);
          break;
        case 'PageUp':
          newValue = clampValue(value + effectiveLargeStep);
          break;
        case 'PageDown':
          newValue = clampValue(value - effectiveLargeStep);
          break;
        case 'Home':
          newValue = min;
          break;
        case 'End':
          newValue = max;
          break;
        default:
          handled = false;
      }

      if (handled) {
        e.preventDefault();
        onChange(newValue);
        onChangeEnd?.(newValue);
      }
    },
    [value, min, max, step, effectiveLargeStep, disabled, onChange, onChangeEnd, clampValue]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;
      isDragging.current = true;
      updateValueFromEvent(e.clientX);
    },
    [disabled]
  );

  const updateValueFromEvent = useCallback(
    (clientX: number) => {
      const slider = sliderRef.current;
      if (!slider) return;

      const rect = slider.getBoundingClientRect();
      const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const newValue = clampValue(min + percentage * (max - min));

      // Snap to step
      const snappedValue = Math.round(newValue / step) * step;
      onChange(clampValue(snappedValue));
    },
    [min, max, step, onChange, clampValue]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      updateValueFromEvent(e.clientX);
    };

    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        onChangeEnd?.(value);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [value, updateValueFromEvent, onChangeEnd]);

  return (
    <div className={`accessible-slider ${className}`}>
      {/* Hidden label for screen readers */}
      <label id={`${label}-label`} className="sr-only">
        {label}
      </label>

      {/* Slider track and thumb */}
      <div
        ref={sliderRef}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={valueLabel || String(value)}
        aria-labelledby={`${label}-label`}
        aria-describedby={ariaDescribedBy}
        aria-disabled={disabled}
        className={`
          relative h-2 bg-gray-200 rounded-full cursor-pointer
          focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        onKeyDown={handleKeyDown}
        onMouseDown={handleMouseDown}
      >
        {/* Filled track */}
        <div
          className="absolute h-full bg-amber-500 rounded-full"
          style={{ width: `${percentage}%` }}
        />

        {/* Thumb */}
        <div
          className={`
            absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-amber-500 rounded-full
            shadow-md transition-transform
            ${!disabled && 'hover:scale-110'}
          `}
          style={{ left: `calc(${percentage}% - 8px)` }}
        />
      </div>

      {/* Keyboard instructions for screen readers */}
      <div id={`${label}-instructions`} className="sr-only">
        Use arrow keys for small adjustments, Page Up/Down for larger jumps, Home/End to go to minimum/maximum.
      </div>
    </div>
  );
}

/**
 * Time-specific slider with formatted time display
 */
interface TimeSliderProps {
  value: Date;
  minTime: Date;
  maxTime: Date;
  stepMinutes?: number;
  onChange: (time: Date) => void;
  label?: string;
  className?: string;
}

export function TimeSlider({
  value,
  minTime,
  maxTime,
  stepMinutes = 15,
  onChange,
  label = 'Time',
  className = '',
}: TimeSliderProps) {
  const minMinutes = minTime.getHours() * 60 + minTime.getMinutes();
  const maxMinutes = maxTime.getHours() * 60 + maxTime.getMinutes();
  const currentMinutes = value.getHours() * 60 + value.getMinutes();

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const date = new Date();
    date.setHours(hours, mins, 0, 0);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleChange = (minutes: number) => {
    const newTime = new Date(value);
    newTime.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    onChange(newTime);
  };

  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-mono text-amber-600" aria-live="polite">
          {formatTime(currentMinutes)}
        </span>
      </div>
      <AccessibleSlider
        value={currentMinutes}
        min={minMinutes}
        max={maxMinutes}
        step={stepMinutes}
        largeStep={60} // 1 hour for Page Up/Down
        onChange={handleChange}
        label={label}
        valueLabel={formatTime(currentMinutes)}
        ariaDescribedBy={`${label}-instructions`}
      />
      <div className="flex justify-between mt-1 text-xs text-gray-500">
        <span>{formatTime(minMinutes)}</span>
        <span>{formatTime(maxMinutes)}</span>
      </div>
    </div>
  );
}
