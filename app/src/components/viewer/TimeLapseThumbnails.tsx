import { useMemo } from 'react';
import SunCalc from 'suncalc';

interface TimeLapseThumbnailsProps {
  date: Date;
  currentTime: Date;
  latitude: number;
  longitude: number;
  onTimeSelect: (time: Date) => void;
}

interface TimePoint {
  time: Date;
  label: string;
  shortLabel: string;
  sunAltitude: number;
  sunAzimuth: number;
  isActive: boolean;
  type: 'sunrise' | 'morning' | 'noon' | 'afternoon' | 'golden' | 'sunset';
}

/**
 * TimeLapseThumbnails - Visual strip showing key times of day
 * Allows quick navigation to sunrise, morning, noon, afternoon, golden hour, and sunset
 */
export function TimeLapseThumbnails({
  date,
  currentTime,
  latitude,
  longitude,
  onTimeSelect,
}: TimeLapseThumbnailsProps) {
  // Calculate key time points for the day
  const timePoints = useMemo((): TimePoint[] => {
    const sunTimes = SunCalc.getTimes(date, latitude, longitude);
    const points: TimePoint[] = [];

    const createTimePoint = (
      time: Date,
      label: string,
      shortLabel: string,
      type: TimePoint['type']
    ): TimePoint | null => {
      if (!time || isNaN(time.getTime())) return null;

      const sunPos = SunCalc.getPosition(time, latitude, longitude);
      const currentHour = currentTime.getHours() + currentTime.getMinutes() / 60;
      const pointHour = time.getHours() + time.getMinutes() / 60;

      return {
        time,
        label,
        shortLabel,
        sunAltitude: (sunPos.altitude * 180) / Math.PI,
        sunAzimuth: (sunPos.azimuth * 180) / Math.PI,
        isActive: Math.abs(currentHour - pointHour) < 0.5, // Within 30 min
        type,
      };
    };

    // Sunrise
    const sunrise = createTimePoint(
      sunTimes.sunrise,
      `Sunrise ${formatTime(sunTimes.sunrise)}`,
      formatTimeShort(sunTimes.sunrise),
      'sunrise'
    );
    if (sunrise) points.push(sunrise);

    // Morning (9 AM)
    const morning = new Date(date);
    morning.setHours(9, 0, 0, 0);
    if (morning > sunTimes.sunrise && morning < sunTimes.sunset) {
      const morningPoint = createTimePoint(morning, 'Morning 9:00 AM', '9AM', 'morning');
      if (morningPoint) points.push(morningPoint);
    }

    // Solar Noon
    const noon = createTimePoint(
      sunTimes.solarNoon,
      `Solar Noon ${formatTime(sunTimes.solarNoon)}`,
      'Noon',
      'noon'
    );
    if (noon) points.push(noon);

    // Afternoon (3 PM)
    const afternoon = new Date(date);
    afternoon.setHours(15, 0, 0, 0);
    if (afternoon > sunTimes.sunrise && afternoon < sunTimes.sunset) {
      const afternoonPoint = createTimePoint(afternoon, 'Afternoon 3:00 PM', '3PM', 'afternoon');
      if (afternoonPoint) points.push(afternoonPoint);
    }

    // Golden Hour
    if (sunTimes.goldenHour && !isNaN(sunTimes.goldenHour.getTime())) {
      const golden = createTimePoint(
        sunTimes.goldenHour,
        `Golden Hour ${formatTime(sunTimes.goldenHour)}`,
        'Golden',
        'golden'
      );
      if (golden) points.push(golden);
    }

    // Sunset
    const sunset = createTimePoint(
      sunTimes.sunset,
      `Sunset ${formatTime(sunTimes.sunset)}`,
      formatTimeShort(sunTimes.sunset),
      'sunset'
    );
    if (sunset) points.push(sunset);

    return points;
  }, [date, latitude, longitude, currentTime]);

  // Get color based on time type
  const getTypeColor = (type: TimePoint['type'], isActive: boolean) => {
    if (isActive) return 'ring-2 ring-amber-500 ring-offset-2';

    switch (type) {
      case 'sunrise':
        return 'bg-gradient-to-b from-orange-200 to-yellow-100';
      case 'morning':
        return 'bg-gradient-to-b from-yellow-100 to-amber-50';
      case 'noon':
        return 'bg-gradient-to-b from-yellow-300 to-yellow-100';
      case 'afternoon':
        return 'bg-gradient-to-b from-amber-200 to-orange-100';
      case 'golden':
        return 'bg-gradient-to-b from-orange-300 to-amber-200';
      case 'sunset':
        return 'bg-gradient-to-b from-orange-400 to-red-200';
      default:
        return 'bg-gray-100';
    }
  };

  // Get sun icon position based on altitude
  const getSunPosition = (altitude: number) => {
    // Map altitude (0-90) to position (bottom to top)
    const normalizedAlt = Math.max(0, Math.min(90, altitude)) / 90;
    return {
      bottom: `${10 + normalizedAlt * 60}%`,
    };
  };

  // Get shadow direction indicator rotation
  const getShadowRotation = (azimuth: number) => {
    // Azimuth is degrees from south, clockwise
    // We want to show shadow pointing away from sun
    return azimuth + 180;
  };

  if (timePoints.length === 0) {
    return (
      <div className="text-xs text-gray-500 text-center py-2">
        No sun data available for this date
      </div>
    );
  }

  return (
    <div className="mb-4">
      <label className="text-xs text-gray-500 mb-2 block">Daily Sun Timeline</label>

      {/* Thumbnail strip */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {timePoints.map((point, index) => (
          <button
            key={index}
            onClick={() => onTimeSelect(point.time)}
            className={`
              flex-shrink-0 w-14 h-16 rounded-lg overflow-hidden
              transition-all duration-200 hover:scale-105
              focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1
              ${getTypeColor(point.type, point.isActive)}
              ${point.isActive ? 'scale-105 shadow-lg' : 'shadow-sm hover:shadow-md'}
            `}
            title={point.label}
            aria-label={point.label}
            aria-pressed={point.isActive}
          >
            {/* Mini sun scene */}
            <div className="relative w-full h-10 overflow-hidden">
              {/* Horizon line */}
              <div className="absolute bottom-2 left-0 right-0 h-px bg-gray-400 opacity-50" />

              {/* Sun indicator */}
              <div
                className="absolute left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-yellow-400 shadow-sm"
                style={getSunPosition(point.sunAltitude)}
              >
                {/* Sun rays */}
                <div className="absolute inset-0 animate-pulse">
                  <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-0.5 h-1 bg-yellow-300 rounded-full" />
                  <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-0.5 h-1 bg-yellow-300 rounded-full" />
                  <div className="absolute top-1/2 -left-0.5 -translate-y-1/2 w-1 h-0.5 bg-yellow-300 rounded-full" />
                  <div className="absolute top-1/2 -right-0.5 -translate-y-1/2 w-1 h-0.5 bg-yellow-300 rounded-full" />
                </div>
              </div>

              {/* Shadow direction indicator */}
              <div
                className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-1 bg-gray-600 opacity-40 rounded-full origin-left"
                style={{
                  transform: `translateX(-50%) rotate(${getShadowRotation(point.sunAzimuth)}deg)`,
                }}
              />
            </div>

            {/* Time label */}
            <div className="h-6 flex items-center justify-center">
              <span className={`text-[10px] font-medium ${point.isActive ? 'text-amber-700' : 'text-gray-600'}`}>
                {point.shortLabel}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Current selection indicator */}
      <div className="mt-1.5 text-center">
        <p className="text-[10px] text-gray-400">
          Click to jump to time • Current: {formatTime(currentTime)}
        </p>
      </div>
    </div>
  );
}

// Helper functions
function formatTime(date: Date): string {
  if (!date || isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatTimeShort(date: Date): string {
  if (!date || isNaN(date.getTime())) return '--';
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'pm' : 'am';
  const hour12 = hours % 12 || 12;
  return minutes === 0 ? `${hour12}${ampm}` : `${hour12}:${minutes.toString().padStart(2, '0')}`;
}
