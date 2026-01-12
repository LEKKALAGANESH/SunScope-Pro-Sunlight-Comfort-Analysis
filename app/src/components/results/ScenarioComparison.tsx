/**
 * ScenarioComparison Component
 *
 * Side-by-side comparison of analysis results for different scenarios.
 * Helps users understand how different window/glazing/shading configurations
 * affect comfort and heat.
 */

import { useState, useEffect, useMemo } from 'react';
import { runAnalysis } from '../../modules/analysis/AnalysisEngine';
import type { AnalysisResults, Building, Location, Scenario } from '../../types';

interface ScenarioComparisonProps {
  buildings: Building[];
  location: Location;
  date: Date;
  targetBuildingId?: string;
  targetFloor?: number;
  scenarios: Scenario[];
}

interface ComparisonData {
  scenario: Scenario;
  results: AnalysisResults | null;
  loading: boolean;
  error?: string;
}

// Predefined comparison scenarios for quick selection
const COMPARISON_PRESETS: Partial<Scenario>[] = [
  {
    name: 'No Protection',
    window: { state: 'closed', ventilationFactor: 0 },
    glazing: { type: 'single', solarTransmittance: 0.85 },
    shading: { interior: 'none', exterior: 'none', reductionFactor: 1.0 },
  },
  {
    name: 'With Blinds',
    window: { state: 'closed', ventilationFactor: 0 },
    glazing: { type: 'double', solarTransmittance: 0.65 },
    shading: { interior: 'blinds', exterior: 'none', reductionFactor: 0.6 },
  },
  {
    name: 'Low-E Glass + Awning',
    window: { state: 'closed', ventilationFactor: 0 },
    glazing: { type: 'low-e', solarTransmittance: 0.35 },
    shading: { interior: 'none', exterior: 'awning', reductionFactor: 0.4 },
  },
  {
    name: 'Maximum Protection',
    window: { state: 'closed', ventilationFactor: 0 },
    glazing: { type: 'low-e', solarTransmittance: 0.35 },
    shading: { interior: 'heavy-curtains', exterior: 'louvers', reductionFactor: 0.2 },
  },
];

export function ScenarioComparison({
  buildings,
  location,
  date,
  targetBuildingId,
  targetFloor,
  scenarios,
}: ScenarioComparisonProps) {
  const [showComparison, setShowComparison] = useState(false);
  const [selectedScenarioIds, setSelectedScenarioIds] = useState<[string, string]>(['', '']);
  const [comparisonData, setComparisonData] = useState<[ComparisonData | null, ComparisonData | null]>([null, null]);

  // Get all available scenarios including presets
  const allScenarios = useMemo(() => {
    const presets = COMPARISON_PRESETS.map((preset, index) => ({
      ...preset,
      id: `preset-${index}`,
      isActive: false,
    } as Scenario));
    return [...scenarios, ...presets];
  }, [scenarios]);

  // Run analysis when scenarios are selected
  useEffect(() => {
    const runComparisons = async () => {
      const newData: [ComparisonData | null, ComparisonData | null] = [null, null];

      for (let i = 0; i < 2; i++) {
        const scenarioId = selectedScenarioIds[i];
        if (!scenarioId) continue;

        const scenario = allScenarios.find(s => s.id === scenarioId);
        if (!scenario) continue;

        newData[i] = {
          scenario,
          results: null,
          loading: true,
        };
      }

      setComparisonData([...newData] as [ComparisonData | null, ComparisonData | null]);

      // Run analyses in parallel
      const promises = selectedScenarioIds.map(async (scenarioId, index) => {
        if (!scenarioId) return null;

        const scenario = allScenarios.find(s => s.id === scenarioId);
        if (!scenario) return null;

        try {
          const results = await runAnalysis(
            date,
            location,
            buildings,
            targetBuildingId,
            targetFloor,
            scenario
          );
          return { index, scenario, results, error: undefined };
        } catch (error) {
          return { index, scenario, results: null, error: String(error) };
        }
      });

      const results = await Promise.all(promises);

      setComparisonData(prev => {
        const updated: [ComparisonData | null, ComparisonData | null] = [...prev];
        results.forEach(result => {
          if (result) {
            updated[result.index] = {
              scenario: result.scenario,
              results: result.results,
              loading: false,
              error: result.error,
            };
          }
        });
        return updated;
      });
    };

    if (showComparison && (selectedScenarioIds[0] || selectedScenarioIds[1])) {
      runComparisons();
    }
  }, [showComparison, selectedScenarioIds, allScenarios, buildings, location, date, targetBuildingId, targetFloor]);

  const formatTime = (d: Date | null): string => {
    if (!d) return '--:--';
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const getScoreColor = (score: number): string => {
    if (score >= 70) return 'text-green-600 bg-green-100';
    if (score >= 40) return 'text-amber-600 bg-amber-100';
    return 'text-red-600 bg-red-100';
  };

  const getDiffClass = (a: number, b: number): string => {
    if (a > b) return 'text-red-600';
    if (a < b) return 'text-green-600';
    return 'text-gray-600';
  };

  if (!showComparison) {
    return (
      <button
        onClick={() => setShowComparison(true)}
        className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 rounded-lg text-white font-medium flex items-center justify-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
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
        Compare Scenarios
      </button>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-gray-900 flex items-center gap-2">
          <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Scenario Comparison
        </h3>
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

      {/* Scenario Selectors */}
      <div className="grid md:grid-cols-2 gap-4 mb-4">
        {[0, 1].map((index) => (
          <div key={index}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Scenario {index === 0 ? 'A' : 'B'}
            </label>
            <select
              value={selectedScenarioIds[index]}
              onChange={(e) => {
                const newIds = [...selectedScenarioIds] as [string, string];
                newIds[index] = e.target.value;
                setSelectedScenarioIds(newIds);
              }}
              className="input"
            >
              <option value="">Select a scenario...</option>
              <optgroup label="Custom Scenarios">
                {scenarios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Presets">
                {COMPARISON_PRESETS.map((preset, i) => (
                  <option key={`preset-${i}`} value={`preset-${i}`}>
                    {preset.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        ))}
      </div>

      {/* Comparison Results */}
      {(comparisonData[0] || comparisonData[1]) && (
        <div className="grid md:grid-cols-2 gap-4">
          {comparisonData.map((data, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border-2 ${
                index === 0 ? 'border-purple-200 bg-purple-50' : 'border-indigo-200 bg-indigo-50'
              }`}
            >
              {!data ? (
                <div className="text-center text-gray-500 py-4">
                  Select a scenario to compare
                </div>
              ) : data.loading ? (
                <div className="flex items-center justify-center py-6">
                  <div className="w-6 h-6 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : data.error ? (
                <div className="text-center text-red-500 py-4">
                  {data.error}
                </div>
              ) : data.results ? (
                <div className="space-y-3">
                  {/* Scenario Name */}
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      index === 0 ? 'bg-purple-200 text-purple-700' : 'bg-indigo-200 text-indigo-700'
                    }`}>
                      {index === 0 ? 'A' : 'B'}
                    </span>
                    <span className="font-medium text-gray-900">{data.scenario.name}</span>
                  </div>

                  {/* Settings Summary */}
                  <div className="text-xs text-gray-500 space-y-0.5">
                    <div>Glazing: {data.scenario.glazing.type}</div>
                    <div>Shading: {data.scenario.shading.interior || 'none'} / {data.scenario.shading.exterior || 'none'}</div>
                  </div>

                  {/* Results */}
                  <div className="border-t border-gray-200 pt-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Sun Hours</span>
                      <span className="font-mono font-bold">
                        {data.results.sunlight.totalHours.toFixed(1)} hrs
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Peak Heat</span>
                      <span className="font-mono">
                        {data.results.solar.peakIrradiance.toFixed(0)} W/m²
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">First Sun</span>
                      <span className="font-mono">
                        {formatTime(data.results.sunlight.firstSunTime)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Comfort</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${getScoreColor(data.results.comfort.score)}`}>
                        {data.results.comfort.score}
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {/* Difference Summary */}
      {comparisonData[0]?.results && comparisonData[1]?.results && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-3">Difference Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-gray-500 text-xs mb-1">Sun Hours</div>
              <div className={`font-bold ${getDiffClass(
                comparisonData[0].results.sunlight.totalHours,
                comparisonData[1].results.sunlight.totalHours
              )}`}>
                {(comparisonData[0].results.sunlight.totalHours - comparisonData[1].results.sunlight.totalHours).toFixed(1)} hrs
              </div>
            </div>
            <div className="text-center">
              <div className="text-gray-500 text-xs mb-1">Peak Heat</div>
              <div className={`font-bold ${getDiffClass(
                comparisonData[0].results.solar.peakIrradiance,
                comparisonData[1].results.solar.peakIrradiance
              )}`}>
                {(comparisonData[0].results.solar.peakIrradiance - comparisonData[1].results.solar.peakIrradiance).toFixed(0)} W/m²
              </div>
            </div>
            <div className="text-center">
              <div className="text-gray-500 text-xs mb-1">Daily Energy</div>
              <div className={`font-bold ${getDiffClass(
                comparisonData[0].results.solar.dailyIrradiation,
                comparisonData[1].results.solar.dailyIrradiation
              )}`}>
                {(comparisonData[0].results.solar.dailyIrradiation - comparisonData[1].results.solar.dailyIrradiation).toFixed(0)} Wh/m²
              </div>
            </div>
            <div className="text-center">
              <div className="text-gray-500 text-xs mb-1">Comfort</div>
              <div className={`font-bold ${getDiffClass(
                comparisonData[1].results.comfort.score,
                comparisonData[0].results.comfort.score
              )}`}>
                {comparisonData[0].results.comfort.score > comparisonData[1].results.comfort.score ? '+' : ''}
                {comparisonData[0].results.comfort.score - comparisonData[1].results.comfort.score} pts
              </div>
            </div>
          </div>

          {/* Winner announcement */}
          <div className="mt-4 text-center text-sm">
            {comparisonData[0].results.comfort.score > comparisonData[1].results.comfort.score ? (
              <p className="text-purple-600">
                <strong>{comparisonData[0].scenario.name}</strong> provides better comfort with{' '}
                {comparisonData[0].results.comfort.score - comparisonData[1].results.comfort.score} points advantage.
              </p>
            ) : comparisonData[0].results.comfort.score < comparisonData[1].results.comfort.score ? (
              <p className="text-indigo-600">
                <strong>{comparisonData[1].scenario.name}</strong> provides better comfort with{' '}
                {comparisonData[1].results.comfort.score - comparisonData[0].results.comfort.score} points advantage.
              </p>
            ) : (
              <p className="text-gray-600">
                Both scenarios have equal comfort scores.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
