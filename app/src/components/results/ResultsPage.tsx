import { useEffect, useState, useMemo } from 'react';
import SunCalc from 'suncalc';
import { useProjectStore } from '../../store/projectStore';
import { runAnalysis } from '../../modules/analysis/AnalysisEngine';
import {
  exportToPDF,
  exportToCSV,
  exportToJSON,
  exportToPNG,
} from '../../modules/export/ExportService';
import { FocusTrap } from '../common/FocusTrap';
import { SeasonalComparison } from './SeasonalComparison';
import { ScenarioComparison } from './ScenarioComparison';
import type { AnalysisResults, Scenario, Building, SiteConfig } from '../../types';

export function ResultsPage() {
  const { project, currentTime, setCurrentStep, scenarios, updateScenario, viewerSnapshot } = useProjectStore();
  const { buildings, site, analysis } = project;

  // Calculate sun position for export annotations
  const sunPosition = useMemo(() => {
    const pos = SunCalc.getPosition(currentTime, site.location.latitude, site.location.longitude);
    return {
      altitude: (pos.altitude * 180) / Math.PI,
      azimuth: (pos.azimuth * 180) / Math.PI,
      isAboveHorizon: pos.altitude > 0,
    };
  }, [currentTime, site.location.latitude, site.location.longitude]);

  const [results, setResults] = useState<AnalysisResults | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showExport, setShowExport] = useState(false);
  const [showMethodology, setShowMethodology] = useState(false);

  const selectedBuilding = buildings.find((b) => b.id === analysis.selectedBuildingId);
  const activeScenario = scenarios[0]; // Use first scenario as active

  // Run analysis on mount and when dependencies change (including scenario)
  useEffect(() => {
    setIsLoading(true);

    // Small delay to show loading state
    const timer = setTimeout(() => {
      const analysisResults = runAnalysis(
        analysis.date,
        site.location,
        buildings,
        analysis.selectedBuildingId,
        analysis.selectedFloor,
        activeScenario
      );
      setResults(analysisResults);
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [analysis.date, analysis.selectedBuildingId, analysis.selectedFloor, site.location, buildings, activeScenario]);

  const formatTime = (date: Date | null): string => {
    if (!date) return '--:--';
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Helper to get solar transmittance based on glazing type
  const getSolarTransmittance = (type: string): number => {
    switch (type) {
      case 'single': return 0.87; // Single pane - high transmittance
      case 'double': return 0.76; // Standard double
      case 'triple': return 0.68; // Triple pane
      case 'low-e': return 0.42;  // Low-E coating significantly reduces solar gain
      default: return 0.76;
    }
  };

  // Helper to get shading reduction factor based on interior shading
  const getShadingReductionFactor = (interior: string): number => {
    switch (interior) {
      case 'none': return 1.0;           // No reduction
      case 'blinds': return 0.75;        // 25% reduction
      case 'curtains': return 0.60;      // 40% reduction
      case 'heavy-curtains': return 0.35; // 65% reduction
      default: return 1.0;
    }
  };

  const handleScenarioChange = (
    field: keyof Scenario['window'] | keyof Scenario['glazing'] | keyof Scenario['shading'],
    value: string
  ) => {
    if (!activeScenario) return;

    if (field === 'state') {
      updateScenario(activeScenario.id, {
        window: {
          ...activeScenario.window,
          state: value as 'open' | 'closed',
          ventilationFactor: value === 'open' ? 0.8 : 0,
        },
      });
    } else if (field === 'type') {
      const glazingType = value as 'single' | 'double' | 'triple' | 'low-e';
      updateScenario(activeScenario.id, {
        glazing: {
          ...activeScenario.glazing,
          type: glazingType,
          solarTransmittance: getSolarTransmittance(glazingType),
        },
      });
    } else if (field === 'interior') {
      const interiorType = value as 'none' | 'blinds' | 'curtains' | 'heavy-curtains';
      updateScenario(activeScenario.id, {
        shading: {
          ...activeScenario.shading,
          interior: interiorType,
          reductionFactor: getShadingReductionFactor(interiorType),
        },
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" role="status" aria-live="polite">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" aria-hidden="true" />
          <p className="text-gray-600">Analyzing sunlight patterns...</p>
          <span className="sr-only">Please wait while analysis is running</span>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No analysis results available.</p>
        <button onClick={() => setCurrentStep('viewer')} className="btn-primary mt-4">
          Go to Viewer
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Analysis Results</h2>
        <p className="text-gray-600">
          {selectedBuilding
            ? `${selectedBuilding.name}${
                analysis.selectedFloor ? `, Floor ${analysis.selectedFloor}` : ''
              }`
            : 'Entire Site'}{' '}
          | {analysis.date.toLocaleDateString()}
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {/* Sunlight Timing */}
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
            Sunlight Timing
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">First Sun</span>
              <span className="font-mono font-bold">
                {formatTime(results.sunlight.firstSunTime)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Last Sun</span>
              <span className="font-mono font-bold">
                {formatTime(results.sunlight.lastSunTime)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Hours</span>
              <span className="font-mono font-bold text-amber-600">
                {results.sunlight.totalHours.toFixed(1)} hrs
                <span className="text-xs text-gray-400 font-normal ml-1">±30m</span>
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Direct Sun</span>
              <span className="font-mono">
                {results.sunlight.directHours.toFixed(1)} hrs
                <span className="text-xs text-gray-400 ml-1">±30m</span>
              </span>
            </div>
          </div>
        </div>

        {/* Heat Impact */}
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
            Heat Impact
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Solar Exposure</span>
              <div className="flex items-center gap-2">
                <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      results.comfort.riskLevel === 'high'
                        ? 'bg-red-500'
                        : results.comfort.riskLevel === 'medium'
                        ? 'bg-amber-500'
                        : 'bg-green-500'
                    }`}
                    style={{
                      width: `${Math.min(100, (results.solar.peakIrradiance / 1000) * 100)}%`,
                    }}
                  />
                </div>
                <span className="text-xs uppercase font-medium">
                  {results.comfort.riskLevel}
                </span>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Peak Irradiance</span>
              <span className="font-mono">
                {results.solar.peakIrradiance.toFixed(0)} W/m²
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Peak Time</span>
              <span className="font-mono">{formatTime(results.solar.peakTime)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Daily Total</span>
              <span className="font-mono">
                {results.solar.dailyIrradiation.toFixed(0)} Wh/m²
              </span>
            </div>
          </div>
        </div>

        {/* Comfort Level */}
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
            Comfort Level
          </h3>
          <div className="text-center py-4">
            <div
              className={`inline-flex items-center justify-center w-20 h-20 rounded-full text-white text-2xl font-bold ${
                results.comfort.riskLevel === 'low'
                  ? 'bg-green-500'
                  : results.comfort.riskLevel === 'medium'
                  ? 'bg-amber-500'
                  : 'bg-red-500'
              }`}
            >
              {results.comfort.score}
            </div>
            <p className="mt-2 text-sm text-gray-600">
              {results.comfort.riskLevel === 'low'
                ? 'Good comfort'
                : results.comfort.riskLevel === 'medium'
                ? 'Moderate heat risk'
                : 'High heat risk'}
            </p>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="card mb-6">
        <h3 className="font-medium text-gray-900 mb-4">Daily Recommendations</h3>
        <ul className="space-y-3">
          {results.comfort.recommendations.map((rec, index) => (
            <li key={index} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-sm">
                {index + 1}
              </span>
              <span className="text-gray-700">{rec}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Scenario Toggles */}
        <div className="card">
          <h3 className="font-medium text-gray-900 mb-4">Scenario Settings</h3>
          <p className="text-sm text-gray-500 mb-4">
            Adjust settings to see how changes affect comfort.
          </p>

          <div className="space-y-4">
            {/* Window State */}
            <div>
              <label className="label">Windows</label>
              <div className="flex gap-2">
                <button
                  onClick={() => handleScenarioChange('state', 'open')}
                  className={`flex-1 py-2 px-3 rounded-lg border-2 transition-colors ${
                    activeScenario?.window.state === 'open'
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-gray-200'
                  }`}
                >
                  Open
                </button>
                <button
                  onClick={() => handleScenarioChange('state', 'closed')}
                  className={`flex-1 py-2 px-3 rounded-lg border-2 transition-colors ${
                    activeScenario?.window.state === 'closed'
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-gray-200'
                  }`}
                >
                  Closed
                </button>
              </div>
            </div>

            {/* Glazing Type */}
            <div>
              <label className="label">Glass Type</label>
              <select
                value={activeScenario?.glazing.type || 'double'}
                onChange={(e) => handleScenarioChange('type', e.target.value)}
                className="input"
              >
                <option value="single">Single Glazing</option>
                <option value="double">Double Glazing</option>
                <option value="triple">Triple Glazing</option>
                <option value="low-e">Low-E Glass</option>
              </select>
            </div>

            {/* Interior Shading */}
            <div>
              <label className="label">Interior Shading</label>
              <select
                value={activeScenario?.shading.interior || 'none'}
                onChange={(e) => handleScenarioChange('interior', e.target.value)}
                className="input"
              >
                <option value="none">None</option>
                <option value="blinds">Blinds</option>
                <option value="curtains">Light Curtains</option>
                <option value="heavy-curtains">Heavy Curtains</option>
              </select>
            </div>
          </div>
        </div>

        {/* Hourly Chart Placeholder */}
        <div className="card">
          <h3 className="font-medium text-gray-900 mb-4">Hourly Sun Exposure</h3>
          <div className="h-48 bg-gray-50 rounded-lg flex items-end justify-between gap-1 p-4">
            {results.hourlyData.slice(0, 16).map((data, index) => (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div
                  className={`w-full rounded-t transition-all ${
                    data.inShadow ? 'bg-gray-300' : 'bg-amber-400'
                  }`}
                  style={{
                    height: `${Math.max(4, (data.irradiance / 1000) * 150)}px`,
                  }}
                />
                <span className="text-xs text-gray-500 mt-1">
                  {data.hour}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Yellow = Direct sun | Gray = Shadow
          </p>
        </div>
      </div>

      {/* Seasonal Comparison */}
      <div className="mb-6">
        <SeasonalComparison
          buildings={buildings}
          location={site.location}
          targetBuildingId={analysis.selectedBuildingId}
          targetFloor={analysis.selectedFloor}
          scenario={activeScenario}
        />
      </div>

      {/* Scenario Comparison */}
      <div className="mb-6">
        <ScenarioComparison
          buildings={buildings}
          location={site.location}
          date={analysis.date}
          targetBuildingId={analysis.selectedBuildingId}
          targetFloor={analysis.selectedFloor}
          scenarios={scenarios}
        />
      </div>

      {/* Accuracy Disclosure */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-medium text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Analysis Accuracy & Assumptions
            </h3>
            <div className="mt-3 grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Sun Hours:</span>{' '}
                <span className="font-medium">{results.sunlight.totalHours.toFixed(1)} hrs</span>
                <span className="text-gray-400 ml-1">(±30 min)</span>
              </div>
              <div>
                <span className="text-gray-500">Peak Irradiance:</span>{' '}
                <span className="font-medium">{results.solar.peakIrradiance.toFixed(0)} W/m²</span>
                <span className="text-gray-400 ml-1">(±15%)</span>
              </div>
              <div>
                <span className="text-gray-500">Confidence:</span>{' '}
                <span className={`font-medium ${buildings.length > 1 ? 'text-green-600' : 'text-amber-600'}`}>
                  {buildings.length > 1 ? 'Good' : 'Limited'}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowMethodology(!showMethodology)}
            className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1 ml-4"
          >
            {showMethodology ? 'Hide' : 'Show'} methodology
            <svg
              className={`w-4 h-4 transform transition-transform ${showMethodology ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Expandable Methodology Section */}
        {showMethodology && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="font-medium text-gray-800 mb-3">How This Analysis Works</h4>

            <div className="space-y-3 text-sm text-gray-600">
              <div>
                <strong className="text-gray-700">Sun Position:</strong>{' '}
                Calculated using astronomical algorithms (SunCalc) based on your location ({site.location.city || `${site.location.latitude.toFixed(2)}°, ${site.location.longitude.toFixed(2)}°`}) and date.
              </div>

              <div>
                <strong className="text-gray-700">Shadow Calculation:</strong>{' '}
                Uses geometric projection to calculate shadow polygons from building footprints and heights. Accuracy improves with more buildings defined.
              </div>

              <div>
                <strong className="text-gray-700">Irradiance Model:</strong>{' '}
                Clear-sky model with atmospheric extinction. Includes ~15% diffuse radiation component even in shadow.
              </div>

              <div>
                <strong className="text-gray-700">Key Assumptions:</strong>
                <ul className="list-disc list-inside mt-1 ml-4 text-gray-500">
                  <li>Clear sky conditions (no clouds or weather)</li>
                  <li>Flat terrain (no hills or slopes)</li>
                  <li>Buildings modeled as flat-roofed boxes</li>
                  <li>No reflections from surrounding surfaces</li>
                  <li>No vegetation or temporary obstructions</li>
                </ul>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <strong className="text-blue-800">Scenario Impact:</strong>{' '}
                <span className="text-blue-700">
                  Current settings: {activeScenario?.glazing.type || 'double'} glazing
                  ({Math.round((1 - (activeScenario?.glazing.solarTransmittance || 0.76)) * 100)}% solar reduction),
                  {activeScenario?.shading.interior === 'none'
                    ? ' no interior shading'
                    : ` ${activeScenario?.shading.interior} (${Math.round((1 - (activeScenario?.shading.reductionFactor || 1)) * 100)}% heat reduction)`}.
                </span>
              </div>
            </div>

            <p className="mt-4 text-xs text-gray-500">
              For detailed engineering analysis or regulatory compliance, consult a qualified building performance professional.
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <button onClick={() => setCurrentStep('viewer')} className="btn-outline">
          Back to 3D View
        </button>
        <button onClick={() => setShowExport(true)} className="btn-primary">
          Export Results
        </button>
      </div>

      {/* Export Modal */}
      {showExport && (
        <ExportModal
          results={results}
          building={selectedBuilding}
          site={site}
          scenario={activeScenario}
          viewerSnapshot={viewerSnapshot}
          sunPosition={sunPosition}
          currentTime={currentTime}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
}

// Export Modal Component
function ExportModal({
  results,
  building,
  site,
  scenario,
  viewerSnapshot,
  sunPosition,
  currentTime,
  onClose,
}: {
  results: AnalysisResults;
  building?: Building;
  site: SiteConfig;
  scenario?: Scenario;
  viewerSnapshot?: string | null;
  sunPosition?: { altitude: number; azimuth: number; isAboveHorizon: boolean } | null;
  currentTime?: Date | null;
  onClose: () => void;
}) {
  const [selectedFormats, setSelectedFormats] = useState<string[]>(['pdf']);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string>('');

  const toggleFormat = (format: string) => {
    setSelectedFormats((prev) =>
      prev.includes(format)
        ? prev.filter((f) => f !== format)
        : [...prev, format]
    );
  };

  const handleExport = async () => {
    setIsExporting(true);
    const exportOptions = { results, building, site, scenario, viewerSnapshot, sunPosition, currentTime };

    try {
      // PDF Export (includes 3D snapshot if available)
      if (selectedFormats.includes('pdf')) {
        setExportStatus('Generating PDF report...');
        await exportToPDF(exportOptions);
      }

      // CSV Export
      if (selectedFormats.includes('csv')) {
        setExportStatus('Generating CSV data...');
        exportToCSV(exportOptions);
      }

      // JSON Export
      if (selectedFormats.includes('json')) {
        setExportStatus('Generating JSON data...');
        exportToJSON(exportOptions);
      }

      // PNG Export (3D view snapshot)
      if (selectedFormats.includes('png')) {
        setExportStatus('Exporting 3D view snapshot...');
        if (viewerSnapshot) {
          await exportToPNG(viewerSnapshot);
        } else {
          throw new Error('No 3D view snapshot available. Please go back to 3D view first.');
        }
      }

      setExportStatus('Export complete!');
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      console.error('Export error:', error);
      setExportStatus(error instanceof Error ? error.message : 'Export failed. Please try again.');
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <FocusTrap active={true} onEscape={isExporting ? undefined : onClose}>
        <div
          className="bg-white rounded-xl max-w-md w-full p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="export-modal-title"
        >
          <div className="flex justify-between items-start mb-4">
            <h2 id="export-modal-title" className="text-xl font-bold">Export Results</h2>
            <button
              onClick={onClose}
              disabled={isExporting}
              aria-label="Close export dialog"
              className="text-gray-400 hover:text-gray-600 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-amber-500 rounded-lg p-1"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

        <p className="text-sm text-gray-600 mb-4">Select export formats:</p>

        <div className="space-y-2 mb-6">
          {[
            { id: 'pdf', label: 'PDF Report', desc: 'Full analysis report with 3D view, charts and metrics', icon: '📄', requiresSnapshot: false },
            { id: 'csv', label: 'CSV Data', desc: 'Hourly data for spreadsheet analysis', icon: '📊', requiresSnapshot: false },
            { id: 'json', label: 'JSON Data', desc: 'Structured data for developers', icon: '{ }', requiresSnapshot: false },
            { id: 'png', label: 'PNG Image', desc: '3D view snapshot with shadows', icon: '🖼️', requiresSnapshot: true },
          ].map((format) => {
            const isDisabled = format.requiresSnapshot && !viewerSnapshot;
            return (
              <label
                key={format.id}
                className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                  selectedFormats.includes(format.id)
                    ? 'border-amber-500 bg-amber-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${isExporting || isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={selectedFormats.includes(format.id)}
                  onChange={() => !isDisabled && toggleFormat(format.id)}
                  disabled={isExporting || isDisabled}
                  className="mt-1 accent-amber-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{format.icon}</span>
                    <span className="font-medium">{format.label}</span>
                    {isDisabled && (
                      <span className="text-xs text-red-500">(Go to 3D View first)</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 ml-7">{format.desc}</p>
                </div>
              </label>
            );
          })}
        </div>

        {exportStatus && (
          <div
            role="status"
            aria-live="polite"
            className={`text-sm mb-4 p-3 rounded-lg ${
              exportStatus.includes('failed')
                ? 'bg-red-50 text-red-700'
                : exportStatus.includes('complete')
                ? 'bg-green-50 text-green-700'
                : 'bg-amber-50 text-amber-700'
            }`}
          >
            {isExporting && !exportStatus.includes('complete') && (
              <span className="inline-block w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mr-2 align-middle" aria-hidden="true" />
            )}
            {exportStatus}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="flex-1 btn-outline disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={selectedFormats.length === 0 || isExporting}
            className="flex-1 btn-primary disabled:opacity-50"
          >
            {isExporting ? 'Exporting...' : 'Download'}
          </button>
        </div>
        </div>
      </FocusTrap>
    </div>
  );
}
