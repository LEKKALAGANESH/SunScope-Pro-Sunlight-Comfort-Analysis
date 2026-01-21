import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import SunCalc from "suncalc";
import { runAnalysis } from "../../modules/analysis/AnalysisEngine";
import {
  exportToCSV,
  exportToJSON,
  exportToPDF,
  exportToPNG,
} from "../../modules/export/ExportService";
import { useProjectStore } from "../../store/projectStore";
import type {
  AnalysisResults,
  Building,
  Scenario,
  SiteConfig,
} from "../../types";
import { FocusTrap } from "../common/FocusTrap";
import { ScenarioComparison } from "./ScenarioComparison";
import { SeasonalComparison } from "./SeasonalComparison";

export function ResultsPage() {
  const {
    project,
    currentTime,
    setCurrentStep,
    scenarios,
    updateScenario,
    viewerSnapshot,
  } = useProjectStore();
  const { buildings, site, analysis } = project;

  // Calculate sun position for export annotations
  const sunPosition = useMemo(() => {
    const pos = SunCalc.getPosition(
      currentTime,
      site.location.latitude,
      site.location.longitude,
    );
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

  const selectedBuilding = buildings.find(
    (b) => b.id === analysis.selectedBuildingId,
  );
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
        activeScenario,
      );
      setResults(analysisResults);
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [
    analysis.date,
    analysis.selectedBuildingId,
    analysis.selectedFloor,
    site.location,
    buildings,
    activeScenario,
  ]);

  const formatTime = (date: Date | null): string => {
    if (!date) return "--:--";
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Format duration in hours and minutes (e.g., "10h 45m")
  const formatDuration = (hours: number): string => {
    if (hours <= 0) return "0h 0m";
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    if (minutes === 60) {
      return `${wholeHours + 1}h 0m`;
    }
    return `${wholeHours}h ${minutes}m`;
  };

  // Helper to get solar transmittance based on glazing type
  const getSolarTransmittance = (type: string): number => {
    switch (type) {
      case "single":
        return 0.87; // Single pane - high transmittance
      case "double":
        return 0.76; // Standard double
      case "triple":
        return 0.68; // Triple pane
      case "low-e":
        return 0.42; // Low-E coating significantly reduces solar gain
      default:
        return 0.76;
    }
  };

  // Helper to get shading reduction factor based on interior shading
  const getShadingReductionFactor = (interior: string): number => {
    switch (interior) {
      case "none":
        return 1.0; // No reduction
      case "blinds":
        return 0.75; // 25% reduction
      case "curtains":
        return 0.6; // 40% reduction
      case "heavy-curtains":
        return 0.35; // 65% reduction
      default:
        return 1.0;
    }
  };

  const handleScenarioChange = (
    field:
      | keyof Scenario["window"]
      | keyof Scenario["glazing"]
      | keyof Scenario["shading"],
    value: string,
  ) => {
    if (!activeScenario) return;

    if (field === "state") {
      updateScenario(activeScenario.id, {
        window: {
          ...activeScenario.window,
          state: value as "open" | "closed",
          ventilationFactor: value === "open" ? 0.8 : 0,
        },
      });
    } else if (field === "type") {
      const glazingType = value as "single" | "double" | "triple" | "low-e";
      updateScenario(activeScenario.id, {
        glazing: {
          ...activeScenario.glazing,
          type: glazingType,
          solarTransmittance: getSolarTransmittance(glazingType),
        },
      });
    } else if (field === "interior") {
      const interiorType = value as
        | "none"
        | "blinds"
        | "curtains"
        | "heavy-curtains";
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
      <div
        className="flex items-center justify-center h-64"
        role="status"
        aria-live="polite"
      >
        <div className="text-center">
          <div
            className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"
            aria-hidden="true"
          />
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
        <button
          onClick={() => setCurrentStep("viewer")}
          className="btn-primary mt-4"
        >
          Go to Viewer
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto bg-gradient-results rounded-2xl p-6 animate-fade-in">
      {/* Header with gradient accent */}
      <div className="mb-6 pb-4 border-b border-rose-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center shadow-sm">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Analysis Results
            </h2>
            <p className="text-gray-600">
              {selectedBuilding
                ? `${selectedBuilding.name}${
                    analysis.selectedFloor
                      ? `, Floor ${analysis.selectedFloor}`
                      : ""
                  }`
                : "Entire Site"}{" "}
              | {analysis.date.toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Key Insights Summary */}
      <div
        className={`mb-6 p-4 rounded-lg border-l-4 ${
          results.comfort.riskLevel === "high"
            ? "bg-red-50 border-red-500"
            : results.comfort.riskLevel === "medium"
              ? "bg-amber-50 border-amber-500"
              : "bg-green-50 border-green-500"
        }`}
      >
        <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
          Key Insights
        </h3>
        <ul className="space-y-1 text-sm text-gray-700">
          <li>
            <span className="font-medium">Sunlight Duration:</span> This
            location receives {results.sunlight.totalHours.toFixed(1)} hours of
            sunlight,
            {results.sunlight.totalHours >= 6
              ? " which exceeds the 6-hour minimum for healthy living spaces."
              : results.sunlight.totalHours >= 4
                ? " which meets basic daylight requirements but could benefit from improvements."
                : " which is below recommended levels. Consider design modifications."}
          </li>
          <li>
            <span className="font-medium">Heat Exposure:</span> Peak solar
            radiation of {results.solar.peakIrradiance.toFixed(0)} W/m²
            {results.solar.peakIrradiance >= 800
              ? " indicates strong sun exposure. Shading or heat-reflective glazing is recommended."
              : results.solar.peakIrradiance >= 500
                ? " is moderate. Standard double glazing should be adequate."
                : " is relatively low. Minimal heat mitigation measures needed."}
          </li>
          <li>
            <span className="font-medium">Comfort Assessment:</span>{" "}
            {results.comfort.riskLevel === "high"
              ? "High heat risk detected. Active cooling or significant shading interventions recommended."
              : results.comfort.riskLevel === "medium"
                ? "Moderate conditions. Adjustable shading will help maintain comfort throughout the day."
                : "Good thermal comfort expected. Natural ventilation should be sufficient."}
          </li>
        </ul>
      </div>

      {/* Key Metrics */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {/* Sunlight Timing */}
        <div className="card-results-hover">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
            <svg
              className="w-4 h-4 text-amber-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
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
                {formatDuration(results.sunlight.totalHours)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Direct Sun</span>
              <span className="font-mono">
                {formatDuration(results.sunlight.directHours)}
              </span>
            </div>
          </div>
        </div>

        {/* Heat Impact */}
        <div className="card-results-hover">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
            <svg
              className="w-4 h-4 text-orange-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
              />
            </svg>
            Heat Impact
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Solar Exposure</span>
              <div className="flex items-center gap-2">
                <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      results.comfort.riskLevel === "high"
                        ? "bg-red-500"
                        : results.comfort.riskLevel === "medium"
                          ? "bg-amber-500"
                          : "bg-green-500"
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
              <span className="font-mono">
                {formatTime(results.solar.peakTime)}
              </span>
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
        <div className="card-results-hover">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
            <svg
              className="w-4 h-4 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Comfort Level
          </h3>
          <div className="text-center py-4">
            <div
              className={`inline-flex items-center justify-center w-20 h-20 rounded-full text-white text-2xl font-bold ${
                results.comfort.riskLevel === "low"
                  ? "bg-green-500"
                  : results.comfort.riskLevel === "medium"
                    ? "bg-amber-500"
                    : "bg-red-500"
              }`}
            >
              {results.comfort.score}
            </div>
            <p className="mt-2 text-sm text-gray-600">
              {results.comfort.riskLevel === "low"
                ? "Good comfort"
                : results.comfort.riskLevel === "medium"
                  ? "Moderate heat risk"
                  : "High heat risk"}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              {results.comfort.score >= 80
                ? "Score 80-100: Excellent conditions"
                : results.comfort.score >= 60
                  ? "Score 60-79: Acceptable with minor adjustments"
                  : results.comfort.score >= 40
                    ? "Score 40-59: Shading recommended"
                    : "Score below 40: Significant intervention needed"}
            </p>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="card-results-hover mb-6">
        <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
          <svg
            className="w-5 h-5 text-amber-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
            />
          </svg>
          Daily Recommendations
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Based on the sun patterns for {analysis.date.toLocaleDateString()},
          here's what we suggest:
        </p>
        <ul className="space-y-3">
          {results.comfort.recommendations.map((rec, index) => (
            <li key={index} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-sm font-medium">
                {index + 1}
              </span>
              <span className="text-gray-700">{rec}</span>
            </li>
          ))}
        </ul>
        {results.comfort.peakHeatPeriod && (
          <div className="mt-4 p-3 bg-amber-50 rounded-lg text-sm">
            <span className="font-medium text-amber-800">
              Peak heat period:{" "}
            </span>
            <span className="text-amber-700">
              {formatTime(results.comfort.peakHeatPeriod.start)} -{" "}
              {formatTime(results.comfort.peakHeatPeriod.end)}
            </span>
            <span className="text-amber-600 ml-1">
              (consider extra shading during this time)
            </span>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Scenario Toggles */}
        <div className="card-results-hover">
          <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
            <svg
              className="w-5 h-5 text-blue-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Scenario Settings
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Adjust settings to see how changes affect comfort. Results update
            instantly.
          </p>

          <div className="space-y-4">
            {/* Window State */}
            <div>
              <label className="label">Windows</label>
              <div className="flex gap-2">
                <button
                  onClick={() => handleScenarioChange("state", "open")}
                  className={`flex-1 py-2 px-3 rounded-lg border-2 transition-colors ${
                    activeScenario?.window.state === "open"
                      ? "border-amber-500 bg-amber-50"
                      : "border-gray-200"
                  }`}
                >
                  Open
                </button>
                <button
                  onClick={() => handleScenarioChange("state", "closed")}
                  className={`flex-1 py-2 px-3 rounded-lg border-2 transition-colors ${
                    activeScenario?.window.state === "closed"
                      ? "border-amber-500 bg-amber-50"
                      : "border-gray-200"
                  }`}
                >
                  Closed
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {activeScenario?.window.state === "open"
                  ? "Open windows allow natural ventilation (20% heat reduction)"
                  : "Closed windows rely on glass and shading for heat control"}
              </p>
            </div>

            {/* Glazing Type */}
            <div>
              <label className="label">Glass Type</label>
              <select
                value={activeScenario?.glazing.type || "double"}
                onChange={(e) => handleScenarioChange("type", e.target.value)}
                className="input"
              >
                <option value="single">
                  Single Glazing (87% solar transmission)
                </option>
                <option value="double">
                  Double Glazing (76% solar transmission)
                </option>
                <option value="triple">
                  Triple Glazing (68% solar transmission)
                </option>
                <option value="low-e">
                  Low-E Glass (42% solar transmission)
                </option>
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Lower transmission means less heat enters the space
              </p>
            </div>

            {/* Interior Shading */}
            <div>
              <label className="label">Interior Shading</label>
              <select
                value={activeScenario?.shading.interior || "none"}
                onChange={(e) =>
                  handleScenarioChange("interior", e.target.value)
                }
                className="input"
              >
                <option value="none">None (0% reduction)</option>
                <option value="blinds">Blinds (25% heat reduction)</option>
                <option value="curtains">
                  Light Curtains (40% heat reduction)
                </option>
                <option value="heavy-curtains">
                  Heavy Curtains (65% heat reduction)
                </option>
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Interior shading blocks heat after it enters through the glass
              </p>
            </div>
          </div>

          {/* Current scenario impact summary */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm">
            <span className="font-medium text-blue-800">Current setup: </span>
            <span className="text-blue-700">
              {Math.round(
                (1 -
                  (activeScenario?.glazing.solarTransmittance || 0.76) *
                    (activeScenario?.shading.reductionFactor || 1)) *
                  100,
              )}
              % total solar heat reduction
            </span>
          </div>
        </div>

        {/* Hourly Chart Placeholder */}
        <div className="card-results-hover">
          <h3 className="font-medium text-gray-900 mb-4">
            Hourly Sun Exposure
          </h3>
          <div className="h-48 bg-gray-50 rounded-lg flex items-end justify-between gap-1 p-4">
            {results.hourlyData.slice(0, 16).map((data, index) => (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div
                  className={`w-full rounded-t transition-all ${
                    data.inShadow ? "bg-gray-300" : "bg-amber-400"
                  }`}
                  style={{
                    height: `${Math.max(4, (data.irradiance / 1000) * 150)}px`,
                  }}
                />
                <span className="text-xs text-gray-500 mt-1">{data.hour}</span>
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
      <div className="card-results-hover mb-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-medium text-gray-900 flex items-center gap-2">
              <svg
                className="w-5 h-5 text-blue-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Analysis Accuracy & Assumptions
            </h3>
            <div className="mt-3 grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Sun Hours:</span>{" "}
                <span className="font-medium">
                  {formatDuration(results.sunlight.totalHours)}
                </span>
                <span className="text-gray-400 ml-1">(exact)</span>
              </div>
              <div>
                <span className="text-gray-500">Peak Irradiance:</span>{" "}
                <span className="font-medium">
                  {results.solar.peakIrradiance.toFixed(0)} W/m²
                </span>
                <span className="text-gray-400 ml-1">(±15%)</span>
              </div>
              <div>
                <span className="text-gray-500">Confidence:</span>{" "}
                <span
                  className={`font-medium ${buildings.length > 1 ? "text-green-600" : "text-amber-600"}`}
                >
                  {buildings.length > 1 ? "Good" : "Limited"}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowMethodology(!showMethodology)}
            className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1 ml-4"
          >
            {showMethodology ? "Hide" : "Show"} methodology
            <svg
              className={`w-4 h-4 transform transition-transform ${showMethodology ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>

        {/* Expandable Methodology Section */}
        {showMethodology && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="font-medium text-gray-800 mb-3">
              How This Analysis Works
            </h4>

            <div className="space-y-3 text-sm text-gray-600">
              <div>
                <strong className="text-gray-700">Sun Position:</strong>{" "}
                Calculated using astronomical algorithms (SunCalc) based on your
                location (
                {site.location.city ||
                  `${site.location.latitude.toFixed(2)}°, ${site.location.longitude.toFixed(2)}°`}
                ) and date.
              </div>

              <div>
                <strong className="text-gray-700">Shadow Calculation:</strong>{" "}
                Uses geometric projection to calculate shadow polygons from
                building footprints and heights. Accuracy improves with more
                buildings defined.
              </div>

              <div>
                <strong className="text-gray-700">Irradiance Model:</strong>{" "}
                Clear-sky model with atmospheric extinction. Includes ~15%
                diffuse radiation component even in shadow.
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
                <strong className="text-blue-800">Scenario Impact:</strong>{" "}
                <span className="text-blue-700">
                  Current settings: {activeScenario?.glazing.type || "double"}{" "}
                  glazing (
                  {Math.round(
                    (1 - (activeScenario?.glazing.solarTransmittance || 0.76)) *
                      100,
                  )}
                  % solar reduction),
                  {activeScenario?.shading.interior === "none"
                    ? " no interior shading"
                    : ` ${activeScenario?.shading.interior} (${Math.round((1 - (activeScenario?.shading.reductionFactor || 1)) * 100)}% heat reduction)`}
                  .
                </span>
              </div>
            </div>

            <p className="mt-4 text-xs text-gray-500">
              For detailed engineering analysis or regulatory compliance,
              consult a qualified building performance professional.
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3">
        <button
          onClick={() => setCurrentStep("viewer")}
          className="btn-results-secondary w-full sm:w-auto"
        >
          Back to 3D View
        </button>
        <button
          onClick={() => setShowExport(true)}
          className="btn-results-primary w-full sm:w-auto"
        >
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
  sunPosition?: {
    altitude: number;
    azimuth: number;
    isAboveHorizon: boolean;
  } | null;
  currentTime?: Date | null;
  onClose: () => void;
}) {
  const [selectedFormats, setSelectedFormats] = useState<string[]>(["pdf"]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string>("");

  const toggleFormat = (format: string) => {
    setSelectedFormats((prev) =>
      prev.includes(format)
        ? prev.filter((f) => f !== format)
        : [...prev, format],
    );
  };

  const handleExport = async () => {
    setIsExporting(true);
    const exportOptions = {
      results,
      building,
      site,
      scenario,
      viewerSnapshot,
      sunPosition,
      currentTime,
    };

    try {
      // PDF Export (includes 3D snapshot if available)
      if (selectedFormats.includes("pdf")) {
        setExportStatus("Generating PDF report...");
        await exportToPDF(exportOptions);
      }

      // CSV Export
      if (selectedFormats.includes("csv")) {
        setExportStatus("Generating CSV data...");
        exportToCSV(exportOptions);
      }

      // JSON Export
      if (selectedFormats.includes("json")) {
        setExportStatus("Generating JSON data...");
        exportToJSON(exportOptions);
      }

      // PNG Export (3D view snapshot)
      if (selectedFormats.includes("png")) {
        setExportStatus("Exporting 3D view snapshot...");
        if (viewerSnapshot) {
          await exportToPNG(viewerSnapshot);
        } else {
          throw new Error(
            "No 3D view snapshot available. Please go back to 3D view first.",
          );
        }
      }

      setExportStatus("Export complete!");
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      setExportStatus(
        error instanceof Error
          ? error.message
          : "Export failed. Please try again.",
      );
      setIsExporting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto animate-fade-in" style={{ isolation: 'isolate' }}>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={isExporting ? undefined : onClose}
      />

      <FocusTrap active={true} onEscape={isExporting ? undefined : onClose}>
        <div
          className="relative bg-white/95 backdrop-blur-xl rounded-2xl max-w-md w-full my-auto max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden border border-rose-200/60 shadow-2xl animate-scale-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="export-modal-title"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-rose-500 to-rose-600 px-6 py-5 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <div>
                  <h2
                    id="export-modal-title"
                    className="text-xl font-semibold text-white"
                  >
                    Export Results
                  </h2>
                  <p className="text-rose-100 text-sm mt-0.5">
                    Download your analysis
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                disabled={isExporting}
                aria-label="Close export dialog"
                className="text-white/80 hover:text-white hover:bg-white/20 disabled:opacity-50 rounded-lg p-2 transition-colors"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <p className="text-sm text-gray-600 mb-4">Select export formats:</p>

            <div className="space-y-2 mb-6">
              {[
                {
                  id: "pdf",
                  label: "PDF Report",
                  desc: "Full analysis report with 3D view, charts and metrics",
                  icon: "📄",
                  requiresSnapshot: false,
                },
                {
                  id: "csv",
                  label: "CSV Data",
                  desc: "Hourly data for spreadsheet analysis",
                  icon: "📊",
                  requiresSnapshot: false,
                },
                {
                  id: "json",
                  label: "JSON Data",
                  desc: "Structured data for developers",
                  icon: "{ }",
                  requiresSnapshot: false,
                },
                {
                  id: "png",
                  label: "PNG Image",
                  desc: "3D view snapshot with shadows",
                  icon: "🖼️",
                  requiresSnapshot: true,
                },
              ].map((format) => {
                const isDisabled = format.requiresSnapshot && !viewerSnapshot;
                return (
                  <label
                    key={format.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedFormats.includes(format.id)
                        ? "border-rose-400 bg-rose-50 shadow-sm"
                        : "border-gray-200 hover:border-rose-200 hover:bg-rose-50/30"
                    } ${isExporting || isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedFormats.includes(format.id)}
                      onChange={() => !isDisabled && toggleFormat(format.id)}
                      disabled={isExporting || isDisabled}
                      className="mt-1 accent-rose-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{format.icon}</span>
                        <span className="font-medium text-gray-900">
                          {format.label}
                        </span>
                        {isDisabled && (
                          <span className="text-xs text-red-500">
                            (Go to 3D View first)
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 ml-7">
                        {format.desc}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>

            {exportStatus && (
              <div
                role="status"
                aria-live="polite"
                className={`text-sm p-3 rounded-xl ${
                  exportStatus.includes("failed")
                    ? "bg-red-50 text-red-700 border border-red-200"
                    : exportStatus.includes("complete")
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-rose-50 text-rose-700 border border-rose-200"
                }`}
              >
                {isExporting && !exportStatus.includes("complete") && (
                  <span
                    className="inline-block w-4 h-4 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mr-2 align-middle"
                    aria-hidden="true"
                  />
                )}
                {exportStatus}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 flex-shrink-0 p-4 bg-rose-50/50 border-t border-rose-100">
            <button
              onClick={onClose}
              disabled={isExporting}
              className="flex-1 btn-results-secondary disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={selectedFormats.length === 0 || isExporting}
              className="flex-1 btn-results-primary disabled:opacity-50"
            >
              {isExporting ? "Exporting..." : "Download"}
            </button>
          </div>
        </div>
      </FocusTrap>
    </div>,
    document.body
  );
}
