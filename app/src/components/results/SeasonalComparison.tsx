/**
 * SeasonalComparison Component
 *
 * Shows a comparison of sunlight analysis for summer solstice vs winter solstice.
 * Helps users understand the range of conditions throughout the year.
 */

import { useState, useEffect } from 'react';
import { runAnalysis } from '../../modules/analysis/AnalysisEngine';
import type { AnalysisResults, Building, Location, Scenario } from '../../types';

interface SeasonalComparisonProps {
  buildings: Building[];
  location: Location;
  targetBuildingId?: string;
  targetFloor?: number;
  scenario?: Scenario;
}

interface SeasonData {
  name: string;
  date: Date;
  results: AnalysisResults | null;
  loading: boolean;
}

export function SeasonalComparison({
  buildings,
  location,
  targetBuildingId,
  targetFloor,
  scenario,
}: SeasonalComparisonProps) {
  const [showComparison, setShowComparison] = useState(false);
  const [seasons, setSeasons] = useState<SeasonData[]>([]);

  // Determine summer/winter solstice dates based on hemisphere
  const year = new Date().getFullYear();
  const isNorthern = location.latitude >= 0;

  const summerSolstice = new Date(year, isNorthern ? 5 : 11, 21);
  const winterSolstice = new Date(year, isNorthern ? 11 : 5, 21);

  useEffect(() => {
    if (!showComparison) return;

    // Initialize seasons
    setSeasons([
      { name: 'Summer Solstice', date: summerSolstice, results: null, loading: true },
      { name: 'Winter Solstice', date: winterSolstice, results: null, loading: true },
    ]);

    // Run analysis for each season
    const runSeasonalAnalysis = async () => {
      const results = await Promise.all([
        runAnalysis(summerSolstice, location, buildings, targetBuildingId, targetFloor, scenario),
        runAnalysis(winterSolstice, location, buildings, targetBuildingId, targetFloor, scenario),
      ]);

      setSeasons([
        { name: 'Summer Solstice', date: summerSolstice, results: results[0], loading: false },
        { name: 'Winter Solstice', date: winterSolstice, results: results[1], loading: false },
      ]);
    };

    runSeasonalAnalysis();
  }, [showComparison, buildings, location, targetBuildingId, targetFloor, scenario]);

  const formatTime = (date: Date | null): string => {
    if (!date) return '--:--';
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (!showComparison) {
    return (
      <button
        onClick={() => setShowComparison(true)}
        className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium flex items-center justify-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
        Compare Summer vs Winter
      </button>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-gray-900">Seasonal Comparison</h3>
        <button
          onClick={() => setShowComparison(false)}
          className="text-gray-400 hover:text-gray-600 p-1"
          aria-label="Close comparison"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {seasons.map((season, index) => (
          <div
            key={season.name}
            className={`p-4 rounded-lg ${
              index === 0
                ? 'bg-amber-50 border border-amber-200'
                : 'bg-blue-50 border border-blue-200'
            }`}
          >
            <div className="flex items-center gap-2 mb-3">
              {index === 0 ? (
                <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
              <div>
                <h4 className={`font-medium ${index === 0 ? 'text-amber-800' : 'text-blue-800'}`}>
                  {season.name}
                </h4>
                <p className={`text-xs ${index === 0 ? 'text-amber-600' : 'text-blue-600'}`}>
                  {formatDate(season.date)}
                </p>
              </div>
            </div>

            {season.loading ? (
              <div className="flex items-center justify-center py-6">
                <div className="w-6 h-6 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : season.results ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Sun Hours</span>
                  <span className="font-mono font-bold">
                    {season.results.sunlight.totalHours.toFixed(1)} hrs
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">First Sun</span>
                  <span className="font-mono">
                    {formatTime(season.results.sunlight.firstSunTime)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Sun</span>
                  <span className="font-mono">
                    {formatTime(season.results.sunlight.lastSunTime)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Peak Heat</span>
                  <span className="font-mono">
                    {season.results.solar.peakIrradiance.toFixed(0)} W/m²
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <span className="text-gray-600">Comfort</span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      season.results.comfort.riskLevel === 'low'
                        ? 'bg-green-100 text-green-700'
                        : season.results.comfort.riskLevel === 'medium'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {season.results.comfort.score} ({season.results.comfort.riskLevel})
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Unable to load data</p>
            )}
          </div>
        ))}
      </div>

      {/* Summary of difference */}
      {seasons.length === 2 && seasons[0].results && seasons[1].results && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
          <strong className="text-gray-700">Annual Range:</strong>{' '}
          {Math.abs(
            seasons[0].results.sunlight.totalHours -
              seasons[1].results.sunlight.totalHours
          ).toFixed(1)}{' '}
          hours difference between seasons.
          {' '}
          {seasons[0].results.sunlight.totalHours >
          seasons[1].results.sunlight.totalHours
            ? 'Summer has more direct sunlight.'
            : 'Winter has more direct sunlight.'}
        </div>
      )}
    </div>
  );
}
