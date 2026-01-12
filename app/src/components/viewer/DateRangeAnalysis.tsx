import { useState, useMemo } from 'react';
import SunCalc from 'suncalc';

interface DateRangeAnalysisProps {
  currentDate: Date;
  latitude: number;
  longitude: number;
  onDateSelect: (date: Date) => void;
}

type RangeMode = 'single' | 'week' | 'month' | 'season' | 'year';

interface DaySummary {
  date: Date;
  dayLength: number; // hours
  sunrise: Date;
  sunset: Date;
  solarNoon: Date;
  maxAltitude: number;
  isSelected: boolean;
}

/**
 * DateRangeAnalysis - Allows analysis across date ranges
 * Shows sun hours patterns for week, month, season, or year
 */
export function DateRangeAnalysis({
  currentDate,
  latitude,
  longitude,
  onDateSelect,
}: DateRangeAnalysisProps) {
  const [mode, setMode] = useState<RangeMode>('single');

  // Calculate date range based on mode
  const dateRange = useMemo(() => {
    const dates: Date[] = [];
    const today = new Date(currentDate);
    today.setHours(12, 0, 0, 0);

    switch (mode) {
      case 'week': {
        // Current week (Sun-Sat)
        const dayOfWeek = today.getDay();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - dayOfWeek);
        for (let i = 0; i < 7; i++) {
          const date = new Date(startOfWeek);
          date.setDate(startOfWeek.getDate() + i);
          dates.push(date);
        }
        break;
      }
      case 'month': {
        // Current month (sample every 3 days)
        const year = today.getFullYear();
        const month = today.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let day = 1; day <= daysInMonth; day += 3) {
          dates.push(new Date(year, month, day, 12, 0, 0));
        }
        break;
      }
      case 'season': {
        // Current season (sample every week)
        const seasonStart = getSeasonStart(today);
        for (let i = 0; i < 13; i++) {
          const date = new Date(seasonStart);
          date.setDate(seasonStart.getDate() + i * 7);
          dates.push(date);
        }
        break;
      }
      case 'year': {
        // Full year (21st of each month - solstices/equinoxes)
        const year = today.getFullYear();
        for (let month = 0; month < 12; month++) {
          dates.push(new Date(year, month, 21, 12, 0, 0));
        }
        break;
      }
      default:
        dates.push(today);
    }

    return dates;
  }, [mode, currentDate]);

  // Calculate sun data for each date in range
  const daySummaries = useMemo((): DaySummary[] => {
    return dateRange.map((date) => {
      const times = SunCalc.getTimes(date, latitude, longitude);
      const noonPos = SunCalc.getPosition(times.solarNoon, latitude, longitude);

      const sunrise = times.sunrise;
      const sunset = times.sunset;
      const dayLength =
        sunrise && sunset && !isNaN(sunrise.getTime()) && !isNaN(sunset.getTime())
          ? (sunset.getTime() - sunrise.getTime()) / (1000 * 60 * 60)
          : 0;

      return {
        date,
        dayLength,
        sunrise,
        sunset,
        solarNoon: times.solarNoon,
        maxAltitude: (noonPos.altitude * 180) / Math.PI,
        isSelected: isSameDay(date, currentDate),
      };
    });
  }, [dateRange, latitude, longitude, currentDate]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (daySummaries.length === 0) return null;

    const dayLengths = daySummaries.map((d) => d.dayLength).filter((l) => l > 0);
    const altitudes = daySummaries.map((d) => d.maxAltitude).filter((a) => a > 0);

    return {
      avgDayLength: dayLengths.reduce((a, b) => a + b, 0) / dayLengths.length,
      minDayLength: Math.min(...dayLengths),
      maxDayLength: Math.max(...dayLengths),
      avgAltitude: altitudes.reduce((a, b) => a + b, 0) / altitudes.length,
      minAltitude: Math.min(...altitudes),
      maxAltitude: Math.max(...altitudes),
    };
  }, [daySummaries]);

  // Get the max day length for scaling the bar chart
  const maxBarValue = Math.max(...daySummaries.map((d) => d.dayLength), 1);

  if (mode === 'single') {
    return (
      <div className="mb-4">
        <button
          onClick={() => setMode('week')}
          className="w-full text-left px-3 py-2 text-xs bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-between group"
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400 group-hover:text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            View date range analysis
          </span>
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="mb-4 bg-gray-50 rounded-lg p-3">
      {/* Header with mode selector */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-medium text-gray-700">Date Range Analysis</h4>
        <button
          onClick={() => setMode('single')}
          className="text-gray-400 hover:text-gray-600 p-1"
          aria-label="Close date range analysis"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1 mb-3">
        {(['week', 'month', 'season', 'year'] as RangeMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 px-2 py-1.5 text-[10px] font-medium rounded transition-colors ${
              mode === m
                ? 'bg-amber-100 text-amber-800'
                : 'bg-white text-gray-500 hover:bg-gray-100'
            }`}
          >
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>

      {/* Mini bar chart showing day lengths */}
      <div className="mb-3">
        <div className="flex items-end gap-0.5 h-16 bg-white rounded p-1.5">
          {daySummaries.map((day, index) => (
            <button
              key={index}
              onClick={() => onDateSelect(day.date)}
              className={`flex-1 rounded-t transition-all hover:opacity-80 ${
                day.isSelected ? 'bg-amber-500' : 'bg-amber-200'
              }`}
              style={{
                height: `${(day.dayLength / maxBarValue) * 100}%`,
                minHeight: '4px',
              }}
              title={`${formatDateShort(day.date)}: ${day.dayLength.toFixed(1)}h of daylight`}
              aria-label={`${formatDateShort(day.date)}: ${day.dayLength.toFixed(1)} hours of daylight`}
            />
          ))}
        </div>

        {/* X-axis labels */}
        <div className="flex justify-between mt-1 text-[9px] text-gray-400">
          <span>{formatDateShort(daySummaries[0]?.date)}</span>
          {mode === 'year' && <span>Mid-year</span>}
          <span>{formatDateShort(daySummaries[daySummaries.length - 1]?.date)}</span>
        </div>
      </div>

      {/* Statistics summary */}
      {stats && (
        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <div className="bg-white rounded p-2">
            <div className="text-gray-400 mb-0.5">Day Length</div>
            <div className="font-medium text-gray-700">
              {stats.minDayLength.toFixed(1)}h - {stats.maxDayLength.toFixed(1)}h
            </div>
            <div className="text-gray-500">avg: {stats.avgDayLength.toFixed(1)}h</div>
          </div>
          <div className="bg-white rounded p-2">
            <div className="text-gray-400 mb-0.5">Sun Altitude</div>
            <div className="font-medium text-gray-700">
              {stats.minAltitude.toFixed(0)}° - {stats.maxAltitude.toFixed(0)}°
            </div>
            <div className="text-gray-500">avg: {stats.avgAltitude.toFixed(0)}°</div>
          </div>
        </div>
      )}

      {/* Currently selected date info */}
      <div className="mt-2 pt-2 border-t border-gray-200 text-[10px] text-gray-500 text-center">
        Selected: {formatDateFull(currentDate)} • Click bars to change date
      </div>
    </div>
  );
}

// Helper functions
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function getSeasonStart(date: Date): Date {
  const year = date.getFullYear();
  const month = date.getMonth();

  // Approximate season starts (Northern Hemisphere)
  if (month >= 2 && month < 5) return new Date(year, 2, 20); // Spring
  if (month >= 5 && month < 8) return new Date(year, 5, 21); // Summer
  if (month >= 8 && month < 11) return new Date(year, 8, 22); // Fall
  return new Date(month === 11 ? year : year - 1, 11, 21); // Winter
}

function formatDateShort(date: Date | undefined): string {
  if (!date) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDateFull(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
