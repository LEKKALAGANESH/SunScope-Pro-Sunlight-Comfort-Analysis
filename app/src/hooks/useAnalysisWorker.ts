/**
 * useAnalysisWorker Hook
 *
 * Provides a way to run analysis in a Web Worker
 * to keep the UI responsive during heavy calculations.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { AnalysisResults, Building, Location, Scenario } from '../types';

interface AnalysisWorkerState {
  isAnalyzing: boolean;
  progress: number;
  results: AnalysisResults | null;
  error: string | null;
}

interface UseAnalysisWorkerReturn extends AnalysisWorkerState {
  runAnalysis: (
    date: Date,
    location: Location,
    buildings: Building[],
    targetBuildingId?: string,
    targetFloor?: number,
    scenario?: Scenario
  ) => Promise<AnalysisResults>;
  cancelAnalysis: () => void;
}

export function useAnalysisWorker(): UseAnalysisWorkerReturn {
  const [state, setState] = useState<AnalysisWorkerState>({
    isAnalyzing: false,
    progress: 0,
    results: null,
    error: null,
  });

  const workerRef = useRef<Worker | null>(null);
  const resolveRef = useRef<((results: AnalysisResults) => void) | null>(null);
  const rejectRef = useRef<((error: Error) => void) | null>(null);

  // Initialize worker
  useEffect(() => {
    // Create worker using Vite's worker import syntax
    workerRef.current = new Worker(
      new URL('../workers/analysis.worker.ts', import.meta.url),
      { type: 'module' }
    );

    workerRef.current.onmessage = (event) => {
      const { type, payload } = event.data;

      switch (type) {
        case 'progress':
          setState((prev) => ({ ...prev, progress: payload as number }));
          break;

        case 'result':
          setState({
            isAnalyzing: false,
            progress: 100,
            results: payload as AnalysisResults,
            error: null,
          });
          if (resolveRef.current) {
            resolveRef.current(payload as AnalysisResults);
            resolveRef.current = null;
            rejectRef.current = null;
          }
          break;

        case 'error':
          setState({
            isAnalyzing: false,
            progress: 0,
            results: null,
            error: payload as string,
          });
          if (rejectRef.current) {
            rejectRef.current(new Error(payload as string));
            resolveRef.current = null;
            rejectRef.current = null;
          }
          break;
      }
    };

    workerRef.current.onerror = (error) => {
      setState({
        isAnalyzing: false,
        progress: 0,
        results: null,
        error: error.message || 'Worker error',
      });
      if (rejectRef.current) {
        rejectRef.current(new Error(error.message || 'Worker error'));
        resolveRef.current = null;
        rejectRef.current = null;
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const runAnalysis = useCallback(
    (
      date: Date,
      location: Location,
      buildings: Building[],
      targetBuildingId?: string,
      targetFloor?: number,
      scenario?: Scenario
    ): Promise<AnalysisResults> => {
      return new Promise((resolve, reject) => {
        if (!workerRef.current) {
          reject(new Error('Worker not initialized'));
          return;
        }

        // Store promise handlers
        resolveRef.current = resolve;
        rejectRef.current = reject;

        setState({
          isAnalyzing: true,
          progress: 0,
          results: null,
          error: null,
        });

        // Send message to worker
        workerRef.current.postMessage({
          type: 'analyze',
          payload: {
            date: date.toISOString(),
            location,
            buildings,
            targetBuildingId,
            targetFloor,
            scenario,
          },
        });
      });
    },
    []
  );

  const cancelAnalysis = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      // Re-create worker
      workerRef.current = new Worker(
        new URL('../workers/analysis.worker.ts', import.meta.url),
        { type: 'module' }
      );
    }

    setState({
      isAnalyzing: false,
      progress: 0,
      results: null,
      error: 'Analysis cancelled',
    });

    if (rejectRef.current) {
      rejectRef.current(new Error('Analysis cancelled'));
      resolveRef.current = null;
      rejectRef.current = null;
    }
  }, []);

  return {
    ...state,
    runAnalysis,
    cancelAnalysis,
  };
}

/**
 * Fallback function that runs analysis on the main thread
 * Used when Web Workers are not available
 */
export async function runAnalysisFallback(
  date: Date,
  location: Location,
  buildings: Building[],
  targetBuildingId?: string,
  targetFloor?: number,
  scenario?: Scenario
): Promise<AnalysisResults> {
  // Dynamically import the main thread analysis engine
  const { runAnalysis } = await import('../modules/analysis/AnalysisEngine');
  return runAnalysis(date, location, buildings, targetBuildingId, targetFloor, scenario);
}
