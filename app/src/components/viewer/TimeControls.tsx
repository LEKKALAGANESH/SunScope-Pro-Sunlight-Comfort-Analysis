import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import SunCalc from 'suncalc';
import { useProjectStore } from '../../store/projectStore';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { TimeLapseThumbnails } from './TimeLapseThumbnails';
import { DateRangeAnalysis } from './DateRangeAnalysis';
import { CollapsibleSection } from './CollapsibleSection';

// Enhanced Timeline Slider with visual phase zones
interface EnhancedTimelineProps {
  value: Date;
  minTime: Date;
  maxTime: Date;
  solarNoon: Date;
  goldenHourStart: Date;
  stepMinutes?: number;
  onChange: (time: Date) => void;
  label?: string;
}

function EnhancedTimeline({
  value,
  minTime,
  maxTime,
  solarNoon,
  goldenHourStart,
  stepMinutes = 15,
  onChange,
  label = 'Time of Day',
}: EnhancedTimelineProps) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const minMinutes = minTime.getHours() * 60 + minTime.getMinutes();
  const maxMinutes = maxTime.getHours() * 60 + maxTime.getMinutes();
  const currentMinutes = value.getHours() * 60 + value.getMinutes();
  const noonMinutes = solarNoon.getHours() * 60 + solarNoon.getMinutes();
  const goldenMinutes = goldenHourStart.getHours() * 60 + goldenHourStart.getMinutes();

  // Calculate percentages for markers
  const range = maxMinutes - minMinutes;
  const currentPercent = ((currentMinutes - minMinutes) / range) * 100;
  const noonPercent = ((noonMinutes - minMinutes) / range) * 100;
  const goldenPercent = ((goldenMinutes - minMinutes) / range) * 100;

  const formatTimeFromMinutes = (minutes: number): string => {
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

  const clampMinutes = useCallback(
    (val: number) => Math.min(maxMinutes, Math.max(minMinutes, val)),
    [minMinutes, maxMinutes]
  );

  const handleChange = useCallback(
    (minutes: number) => {
      const newTime = new Date(value);
      const snapped = Math.round(minutes / stepMinutes) * stepMinutes;
      const clamped = clampMinutes(snapped);
      newTime.setHours(Math.floor(clamped / 60), clamped % 60, 0, 0);
      onChange(newTime);
    },
    [value, stepMinutes, clampMinutes, onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      let newMinutes = currentMinutes;
      let handled = true;

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowUp':
          newMinutes = clampMinutes(currentMinutes + stepMinutes);
          break;
        case 'ArrowLeft':
        case 'ArrowDown':
          newMinutes = clampMinutes(currentMinutes - stepMinutes);
          break;
        case 'PageUp':
          newMinutes = clampMinutes(currentMinutes + 60);
          break;
        case 'PageDown':
          newMinutes = clampMinutes(currentMinutes - 60);
          break;
        case 'Home':
          newMinutes = minMinutes;
          break;
        case 'End':
          newMinutes = maxMinutes;
          break;
        default:
          handled = false;
      }

      if (handled) {
        e.preventDefault();
        handleChange(newMinutes);
      }
    },
    [currentMinutes, stepMinutes, minMinutes, maxMinutes, clampMinutes, handleChange]
  );

  const updateValueFromEvent = useCallback(
    (clientX: number) => {
      const slider = sliderRef.current;
      if (!slider) return;

      const rect = slider.getBoundingClientRect();
      const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const minutes = minMinutes + percentage * range;
      handleChange(minutes);
    },
    [minMinutes, range, handleChange]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      isDragging.current = true;
      updateValueFromEvent(e.clientX);
    },
    [updateValueFromEvent]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      updateValueFromEvent(e.clientX);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [updateValueFromEvent]);

  // Clamp thumb position so it stays within the track bounds
  // thumbWidth = 20px (w-5), so we interpolate from 0 to (100% - 20px)
  const thumbPosition = `calc(${currentPercent}% - ${currentPercent * 0.2}px)`;

  return (
    <div>
      {/* Header with label and current time */}
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-mono text-amber-600 font-semibold" aria-live="polite">
          {formatTimeFromMinutes(currentMinutes)}
        </span>
      </div>

      {/* Enhanced slider with gradient background */}
      <div
        ref={sliderRef}
        role="slider"
        tabIndex={0}
        aria-valuemin={minMinutes}
        aria-valuemax={maxMinutes}
        aria-valuenow={currentMinutes}
        aria-valuetext={formatTimeFromMinutes(currentMinutes)}
        aria-label={label}
        className="relative h-3 rounded-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
        style={{
          background: `linear-gradient(to right,
            #FCD34D 0%,
            #FBBF24 ${noonPercent / 2}%,
            #F59E0B ${noonPercent}%,
            #FBBF24 ${(noonPercent + goldenPercent) / 2}%,
            #FB923C ${goldenPercent}%,
            #F97316 100%
          )`,
        }}
        onKeyDown={handleKeyDown}
        onMouseDown={handleMouseDown}
      >
        {/* Solar noon marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-yellow-600 opacity-60"
          style={{ left: `${noonPercent}%` }}
          title="Solar Noon"
        />

        {/* Golden hour start marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-orange-600 opacity-60"
          style={{ left: `${goldenPercent}%` }}
          title="Golden Hour"
        />

        {/* Thumb - position clamped to stay within track bounds */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white border-2 border-amber-500 rounded-full shadow-lg transition-transform hover:scale-110"
          style={{ left: thumbPosition }}
        >
          {/* Sun icon inside thumb */}
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-2.5 h-2.5 bg-amber-400 rounded-full" />
          </div>
        </div>
      </div>

      {/* Timeline labels */}
      <div className="flex justify-between mt-1.5 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="text-amber-500">☀</span>
          {formatTimeFromMinutes(minMinutes)}
        </span>
        <span className="text-gray-400 text-[10px]">
          Noon: {formatTimeFromMinutes(noonMinutes)}
        </span>
        <span className="flex items-center gap-1">
          {formatTimeFromMinutes(maxMinutes)}
          <span className="text-orange-500">☀</span>
        </span>
      </div>

      {/* Keyboard hint */}
      <div className="sr-only">
        Use arrow keys for 15-minute adjustments, Page Up/Down for 1 hour, Home/End for sunrise/sunset.
      </div>
    </div>
  );
}

export function TimeControls() {
  const {
    project,
    currentTime,
    setCurrentTime,
    setAnalysisDate,
    isAnimating,
    setIsAnimating,
    animationSpeed,
    setAnimationSpeed,
  } = useProjectStore();

  const { site, analysis } = project;
  const animationRef = useRef<number>(0);
  const prefersReducedMotion = useReducedMotion();
  const [isLooping, setIsLooping] = useState(true);

  const [dateStr, setDateStr] = useState(
    analysis.date.toISOString().split('T')[0]
  );

  // Get sun times for current date
  const sunTimes = SunCalc.getTimes(
    analysis.date,
    site.location.latitude,
    site.location.longitude
  );

  const sunriseHour = sunTimes.sunrise.getHours() + sunTimes.sunrise.getMinutes() / 60;
  const sunsetHour = sunTimes.sunset.getHours() + sunTimes.sunset.getMinutes() / 60;

  // Calculate golden hour times
  const goldenHourTimes = useMemo(() => {
    const goldenHourEnd = sunTimes.goldenHourEnd; // Morning golden hour ends
    const goldenHour = sunTimes.goldenHour; // Evening golden hour starts
    return { morning: goldenHourEnd, evening: goldenHour };
  }, [sunTimes]);

  // Calculate solar noon (highest point)
  const solarNoon = useMemo(() => {
    return sunTimes.solarNoon;
  }, [sunTimes]);

  // Handle date change
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value);
    if (!isNaN(newDate.getTime())) {
      setDateStr(e.target.value);
      setAnalysisDate(newDate);

      // Update current time to same hour on new date
      const newTime = new Date(newDate);
      newTime.setHours(currentTime.getHours(), currentTime.getMinutes());
      setCurrentTime(newTime);
    }
  };

  // Animation loop - respects reduced motion preference
  useEffect(() => {
    // Don't run animation if reduced motion is preferred or not animating
    if (!isAnimating || prefersReducedMotion) {
      if (isAnimating && prefersReducedMotion) {
        // Auto-stop animation if reduced motion is enabled while animating
        setIsAnimating(false);
      }
      return;
    }

    const animate = () => {
      const newTime = new Date(currentTime.getTime() + animationSpeed * 60000); // Add minutes

      // Check if past sunset
      if (newTime.getHours() >= sunsetHour + 1) {
        if (isLooping) {
          // Loop back to sunrise
          newTime.setHours(Math.floor(sunriseHour), 0, 0, 0);
        } else {
          // Stop at sunset
          setIsAnimating(false);
          return;
        }
      }

      setCurrentTime(newTime);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationRef.current);
  }, [isAnimating, currentTime, animationSpeed, sunriseHour, sunsetHour, prefersReducedMotion, setIsAnimating, isLooping]);

  // Step time forward or backward
  const stepTime = (minutes: number) => {
    const newTime = new Date(currentTime.getTime() + minutes * 60000);
    const newHour = newTime.getHours() + newTime.getMinutes() / 60;

    // Clamp to daylight hours
    if (newHour < sunriseHour) {
      newTime.setHours(Math.floor(sunriseHour), Math.round((sunriseHour % 1) * 60), 0, 0);
    } else if (newHour > sunsetHour) {
      newTime.setHours(Math.floor(sunsetHour), Math.round((sunsetHour % 1) * 60), 0, 0);
    }

    setCurrentTime(newTime);
  };

  // Set time to a preset
  const setTimePreset = (preset: 'morning' | 'noon' | 'afternoon' | 'goldenMorning' | 'goldenEvening') => {
    const newTime = new Date(analysis.date);

    switch (preset) {
      case 'morning':
        newTime.setHours(9, 0, 0, 0);
        break;
      case 'noon':
        newTime.setHours(solarNoon.getHours(), solarNoon.getMinutes(), 0, 0);
        break;
      case 'afternoon':
        newTime.setHours(15, 0, 0, 0);
        break;
      case 'goldenMorning':
        newTime.setHours(goldenHourTimes.morning.getHours(), goldenHourTimes.morning.getMinutes(), 0, 0);
        break;
      case 'goldenEvening':
        newTime.setHours(goldenHourTimes.evening.getHours(), goldenHourTimes.evening.getMinutes(), 0, 0);
        break;
    }

    setCurrentTime(newTime);
  };

  // Quick date presets
  const setPresetDate = (preset: 'summer' | 'winter' | 'equinox' | 'today') => {
    const year = new Date().getFullYear();
    let newDate: Date;

    // Adjust for hemisphere
    const isNorthern = site.location.latitude >= 0;

    switch (preset) {
      case 'summer':
        newDate = new Date(year, isNorthern ? 5 : 11, 21);
        break;
      case 'winter':
        newDate = new Date(year, isNorthern ? 11 : 5, 21);
        break;
      case 'equinox':
        newDate = new Date(year, 2, 20);
        break;
      case 'today':
      default:
        newDate = new Date();
        break;
    }

    setDateStr(newDate.toISOString().split('T')[0]);
    setAnalysisDate(newDate);

    const newTime = new Date(newDate);
    newTime.setHours(12, 0, 0, 0);
    setCurrentTime(newTime);
  };

  // Format time display
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Get sun position info
  const sunPosition = SunCalc.getPosition(
    currentTime,
    site.location.latitude,
    site.location.longitude
  );
  const sunAltitude = (sunPosition.altitude * 180) / Math.PI;
  const sunAzimuth = (sunPosition.azimuth * 180) / Math.PI;

  return (
    <CollapsibleSection title="Time & Date" defaultCollapsed={true}>
      {/* Date Picker */}
      <div className="mb-4">
        <label className="label">Date</label>
        <input
          type="date"
          value={dateStr}
          onChange={handleDateChange}
          className="input"
        />
      </div>

      {/* Date Presets */}
      <div className="mb-4">
        <label className="text-xs text-gray-500 mb-1 block">Quick Dates</label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setPresetDate('summer')}
            className="px-3 py-1 text-xs bg-amber-100 text-amber-700 rounded-full hover:bg-amber-200 transition-colors"
            title="Longest day, highest sun angle"
          >
            Summer Solstice
          </button>
          <button
            onClick={() => setPresetDate('winter')}
            className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
            title="Shortest day, longest shadows"
          >
            Winter Solstice
          </button>
          <button
            onClick={() => setPresetDate('equinox')}
            className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors"
            title="Equal day and night"
          >
            Equinox
          </button>
          <button
            onClick={() => setPresetDate('today')}
            className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
          >
            Today
          </button>
        </div>
      </div>

      {/* Time Presets */}
      <div className="mb-4">
        <label className="text-xs text-gray-500 mb-1 block">Quick Times</label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setTimePreset('morning')}
            className="px-3 py-1 text-xs bg-orange-50 text-orange-700 rounded-full hover:bg-orange-100 transition-colors"
            title="9:00 AM - Morning sun check"
          >
            9 AM
          </button>
          <button
            onClick={() => setTimePreset('noon')}
            className="px-3 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full hover:bg-yellow-200 transition-colors"
            title={`Solar noon at ${formatTime(solarNoon)}`}
          >
            Solar Noon
          </button>
          <button
            onClick={() => setTimePreset('afternoon')}
            className="px-3 py-1 text-xs bg-orange-100 text-orange-700 rounded-full hover:bg-orange-200 transition-colors"
            title="3:00 PM - Peak afternoon heat"
          >
            3 PM
          </button>
          <button
            onClick={() => setTimePreset('goldenEvening')}
            className="px-3 py-1 text-xs bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 rounded-full hover:from-amber-200 hover:to-orange-200 transition-colors"
            title={`Golden hour starts at ${formatTime(goldenHourTimes.evening)}`}
          >
            Golden Hour
          </button>
        </div>
      </div>

      {/* Enhanced Time Slider with visual phase zones */}
      <div className="mb-4">
        <EnhancedTimeline
          value={currentTime}
          minTime={sunTimes.sunrise}
          maxTime={sunTimes.sunset}
          solarNoon={solarNoon}
          goldenHourStart={goldenHourTimes.evening}
          stepMinutes={15}
          onChange={setCurrentTime}
          label="Time of Day"
        />
        {/* Screen reader announcement for time changes */}
        <div
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          Current time: {formatTime(currentTime)}
        </div>
      </div>

      {/* Time-lapse Thumbnail Strip */}
      <TimeLapseThumbnails
        date={analysis.date}
        currentTime={currentTime}
        latitude={site.location.latitude}
        longitude={site.location.longitude}
        onTimeSelect={setCurrentTime}
      />

      {/* Step Controls */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => stepTime(-30)}
          aria-label="Step backward 30 minutes"
          className="flex-1 flex items-center justify-center gap-1 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z" />
          </svg>
          <span className="text-xs">-30m</span>
        </button>
        <button
          onClick={() => stepTime(-15)}
          aria-label="Step backward 15 minutes"
          className="flex-1 flex items-center justify-center gap-1 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z" />
          </svg>
          <span className="text-xs">-15m</span>
        </button>
        <button
          onClick={() => stepTime(15)}
          aria-label="Step forward 15 minutes"
          className="flex-1 flex items-center justify-center gap-1 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
        >
          <span className="text-xs">+15m</span>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
          </svg>
        </button>
        <button
          onClick={() => stepTime(30)}
          aria-label="Step forward 30 minutes"
          className="flex-1 flex items-center justify-center gap-1 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
        >
          <span className="text-xs">+30m</span>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z" />
          </svg>
        </button>
      </div>

      {/* Animation Controls */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => {
            if (prefersReducedMotion && !isAnimating) {
              // For reduced motion, just step forward instead of continuous animation
              stepTime(30);
            } else {
              setIsAnimating(!isAnimating);
            }
          }}
          aria-label={
            prefersReducedMotion
              ? 'Step forward 30 minutes'
              : isAnimating
              ? 'Pause sun animation'
              : 'Play sun animation'
          }
          aria-pressed={!prefersReducedMotion && isAnimating}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            isAnimating && !prefersReducedMotion
              ? 'bg-red-100 text-red-700 hover:bg-red-200 focus:ring-red-500'
              : 'bg-amber-100 text-amber-700 hover:bg-amber-200 focus:ring-amber-500'
          }`}
        >
          {prefersReducedMotion ? (
            <>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z" />
              </svg>
              Step +30m
            </>
          ) : isAnimating ? (
            <>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
              Pause
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
              Play
            </>
          )}
        </button>

        {!prefersReducedMotion && (
          <>
            <label htmlFor="animation-speed" className="sr-only">
              Animation speed
            </label>
            <select
              id="animation-speed"
              value={animationSpeed}
              onChange={(e) => setAnimationSpeed(parseFloat(e.target.value))}
              aria-label="Animation speed multiplier"
              className="input w-20 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
            >
              <option value="0.5">0.5x</option>
              <option value="1">1x</option>
              <option value="2">2x</option>
              <option value="5">5x</option>
              <option value="15">15x</option>
            </select>

            {/* Loop Toggle */}
            <button
              onClick={() => setIsLooping(!isLooping)}
              aria-label={isLooping ? 'Disable loop' : 'Enable loop'}
              aria-pressed={isLooping}
              title={isLooping ? 'Loop enabled: animation restarts at sunrise' : 'Loop disabled: animation stops at sunset'}
              className={`p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 ${
                isLooping
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Guidance microcopy */}
      {prefersReducedMotion ? (
        <p className="text-xs text-gray-500 mb-4">
          Animation disabled (reduced motion preference). Use step buttons or slider.
        </p>
      ) : (
        <p className="text-xs text-gray-400 mb-4">
          {isLooping ? 'Animation loops sunrise to sunset' : 'Animation stops at sunset'}
        </p>
      )}

      {/* Quick Comparisons */}
      <div className="mb-4">
        <label className="text-xs text-gray-500 mb-2 block">Quick Comparisons</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              // Toggle to morning (9 AM)
              const newTime = new Date(analysis.date);
              newTime.setHours(9, 0, 0, 0);
              setCurrentTime(newTime);
            }}
            className={`px-3 py-2 text-xs rounded-lg transition-colors flex items-center justify-center gap-1 ${
              currentTime.getHours() < 12
                ? 'bg-orange-100 text-orange-800 border border-orange-300'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 7a5 5 0 100 10 5 5 0 000-10z" />
              <path d="M12 1v2m0 18v2m11-11h-2M3 12H1m18.07-7.07l-1.41 1.41M6.34 17.66l-1.41 1.41m0-14.14l1.41 1.41m11.32 11.32l1.41 1.41" />
            </svg>
            Morning (9 AM)
          </button>
          <button
            onClick={() => {
              // Toggle to afternoon (3 PM)
              const newTime = new Date(analysis.date);
              newTime.setHours(15, 0, 0, 0);
              setCurrentTime(newTime);
            }}
            className={`px-3 py-2 text-xs rounded-lg transition-colors flex items-center justify-center gap-1 ${
              currentTime.getHours() >= 12
                ? 'bg-orange-100 text-orange-800 border border-orange-300'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 7a5 5 0 100 10 5 5 0 000-10z" />
              <path d="M12 1v2m0 18v2m11-11h-2M3 12H1m18.07-7.07l-1.41 1.41M6.34 17.66l-1.41 1.41m0-14.14l1.41 1.41m11.32 11.32l1.41 1.41" />
            </svg>
            Afternoon (3 PM)
          </button>
          <button
            onClick={() => {
              // Switch to summer solstice
              const isNorthern = site.location.latitude >= 0;
              const year = new Date().getFullYear();
              const summerDate = new Date(year, isNorthern ? 5 : 11, 21);
              setDateStr(summerDate.toISOString().split('T')[0]);
              setAnalysisDate(summerDate);
              const newTime = new Date(summerDate);
              newTime.setHours(currentTime.getHours(), currentTime.getMinutes(), 0, 0);
              setCurrentTime(newTime);
            }}
            className={`px-3 py-2 text-xs rounded-lg transition-colors flex items-center justify-center gap-1 ${
              analysis.date.getMonth() === (site.location.latitude >= 0 ? 5 : 11)
                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <span className="text-amber-500">☀</span>
            Summer
          </button>
          <button
            onClick={() => {
              // Switch to winter solstice
              const isNorthern = site.location.latitude >= 0;
              const year = new Date().getFullYear();
              const winterDate = new Date(year, isNorthern ? 11 : 5, 21);
              setDateStr(winterDate.toISOString().split('T')[0]);
              setAnalysisDate(winterDate);
              const newTime = new Date(winterDate);
              newTime.setHours(currentTime.getHours(), currentTime.getMinutes(), 0, 0);
              setCurrentTime(newTime);
            }}
            className={`px-3 py-2 text-xs rounded-lg transition-colors flex items-center justify-center gap-1 ${
              analysis.date.getMonth() === (site.location.latitude >= 0 ? 11 : 5)
                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <span className="text-blue-400">❄</span>
            Winter
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-1.5 text-center">
          Compare shadows at different times of day or seasons
        </p>
      </div>

      {/* Date Range Analysis */}
      <DateRangeAnalysis
        currentDate={analysis.date}
        latitude={site.location.latitude}
        longitude={site.location.longitude}
        onDateSelect={(date) => {
          setDateStr(date.toISOString().split('T')[0]);
          setAnalysisDate(date);
          const newTime = new Date(date);
          newTime.setHours(currentTime.getHours(), currentTime.getMinutes(), 0, 0);
          setCurrentTime(newTime);
        }}
      />

      {/* Sun Info */}
      <div className="bg-gray-50 rounded-lg p-3 text-sm">
        <h4 className="font-medium text-gray-700 mb-2">Sun Position</h4>
        <div className="grid grid-cols-2 gap-2 text-gray-600">
          <div>
            <span className="text-gray-500">Altitude:</span>{' '}
            <span className="font-mono">{sunAltitude.toFixed(1)}°</span>
          </div>
          <div>
            <span className="text-gray-500">Azimuth:</span>{' '}
            <span className="font-mono">{sunAzimuth.toFixed(1)}°</span>
          </div>
          <div>
            <span className="text-gray-500">Sunrise:</span>{' '}
            <span className="font-mono">{formatTime(sunTimes.sunrise)}</span>
          </div>
          <div>
            <span className="text-gray-500">Sunset:</span>{' '}
            <span className="font-mono">{formatTime(sunTimes.sunset)}</span>
          </div>
        </div>
        {sunAltitude <= 0 && (
          <p className="text-amber-600 mt-2 text-xs">
            Sun is below the horizon
          </p>
        )}
      </div>
    </CollapsibleSection>
  );
}
