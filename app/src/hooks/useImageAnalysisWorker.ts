/**
 * useImageAnalysisWorker Hook
 *
 * Provides a way to run image analysis in a Web Worker
 * with progressive updates for each detection stage.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { ImageAnalysisResult, DetectedBuilding, DetectedAmenity, Point2D } from '../types';

interface AnalysisStage {
  stage: string;
  percent: number;
  message: string;
}

interface UseImageAnalysisWorkerState {
  isAnalyzing: boolean;
  progress: AnalysisStage;
  partialResults: Partial<ImageAnalysisResult>;
  result: ImageAnalysisResult | null;
  error: string | null;
}

interface UseImageAnalysisWorkerReturn extends UseImageAnalysisWorkerState {
  analyze: (imageDataUrl: string) => Promise<ImageAnalysisResult>;
  cancel: () => void;
}

const INITIAL_PROGRESS: AnalysisStage = {
  stage: 'idle',
  percent: 0,
  message: '',
};

export function useImageAnalysisWorker(): UseImageAnalysisWorkerReturn {
  const [state, setState] = useState<UseImageAnalysisWorkerState>({
    isAnalyzing: false,
    progress: INITIAL_PROGRESS,
    partialResults: {},
    result: null,
    error: null,
  });

  const workerRef = useRef<Worker | null>(null);
  const resolveRef = useRef<((result: ImageAnalysisResult) => void) | null>(null);
  const rejectRef = useRef<((error: Error) => void) | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize worker
  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../workers/imageAnalysis.worker.ts', import.meta.url),
      { type: 'module' }
    );

    workerRef.current.onmessage = (event) => {
      const { type, payload } = event.data;

      switch (type) {
        case 'progress':
          setState((prev) => ({
            ...prev,
            progress: payload as AnalysisStage,
          }));
          break;

        case 'partial':
          setState((prev) => ({
            ...prev,
            partialResults: {
              ...prev.partialResults,
              [payload.resultType]: payload.data,
            },
          }));
          break;

        case 'complete': {
          const result = convertWorkerResult(payload);
          setState({
            isAnalyzing: false,
            progress: { stage: 'complete', percent: 100, message: 'Analysis complete!' },
            partialResults: {},
            result,
            error: null,
          });
          if (resolveRef.current) {
            resolveRef.current(result);
            resolveRef.current = null;
            rejectRef.current = null;
          }
          break;
        }

        case 'error':
          setState({
            isAnalyzing: false,
            progress: INITIAL_PROGRESS,
            partialResults: {},
            result: null,
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
        progress: INITIAL_PROGRESS,
        partialResults: {},
        result: null,
        error: error.message || 'Worker error',
      });
      if (rejectRef.current) {
        rejectRef.current(new Error(error.message || 'Worker error'));
        resolveRef.current = null;
        rejectRef.current = null;
      }
    };

    // Create canvas for image processing
    canvasRef.current = document.createElement('canvas');

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const analyze = useCallback((imageDataUrl: string): Promise<ImageAnalysisResult> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current || !canvasRef.current) {
        reject(new Error('Worker not initialized'));
        return;
      }

      // Store promise handlers
      resolveRef.current = resolve;
      rejectRef.current = reject;

      setState({
        isAnalyzing: true,
        progress: { stage: 'loading', percent: 0, message: 'Loading image...' },
        partialResults: {},
        result: null,
        error: null,
      });

      // Load image and extract pixel data
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current!;

        // Downsample large images for faster analysis
        // Target max dimension of 1200px for detection (can be refined later)
        const MAX_DIMENSION = 1200;
        let targetWidth = img.width;
        let targetHeight = img.height;
        let scale = 1;

        if (img.width > MAX_DIMENSION || img.height > MAX_DIMENSION) {
          scale = MAX_DIMENSION / Math.max(img.width, img.height);
          targetWidth = Math.round(img.width * scale);
          targetHeight = Math.round(img.height * scale);
        }

        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

        // Use high-quality downsampling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);

        // Send to worker with scale factor for coordinate adjustment
        workerRef.current!.postMessage({
          type: 'analyze',
          payload: {
            imageData,
            width: targetWidth,
            height: targetHeight,
            originalWidth: img.width,
            originalHeight: img.height,
            scale: 1 / scale, // Inverse scale to multiply results back
          },
        });
      };
      img.onerror = () => {
        reject(new Error('Failed to load image'));
        setState((prev) => ({
          ...prev,
          isAnalyzing: false,
          error: 'Failed to load image',
        }));
      };
      img.src = imageDataUrl;
    });
  }, []);

  const cancel = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      // Re-create worker
      workerRef.current = new Worker(
        new URL('../workers/imageAnalysis.worker.ts', import.meta.url),
        { type: 'module' }
      );
    }

    setState({
      isAnalyzing: false,
      progress: INITIAL_PROGRESS,
      partialResults: {},
      result: null,
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
    analyze,
    cancel,
  };
}

// Helper: Convert worker result to proper types with dates
function convertWorkerResult(payload: {
  buildings: Array<{
    id: string;
    footprint: Point2D[];
    boundingBox: { x: number; y: number; width: number; height: number };
    area: number;
    confidence: number;
    suggestedName: string;
    color: string;
    centroid: Point2D;
  }>;
  amenities: Array<{
    id: string;
    type: string;
    position: Point2D;
    boundingBox: { x: number; y: number; width: number; height: number };
    confidence: number;
  }>;
  compass: { position: Point2D; northAngle: number; confidence: number } | null;
  scale: { position: Point2D; pixelLength: number; suggestedMeters?: number; confidence: number } | null;
  roads: Point2D[][];
  vegetation: Point2D[][];
  waterBodies: Point2D[][];
  siteOutline: Point2D[] | null;
  imageStats: { dominantColors: string[]; brightness: number; contrast: number };
}): ImageAnalysisResult {
  return {
    buildings: payload.buildings.map((b) => ({
      ...b,
      selected: true,
    })) as DetectedBuilding[],
    amenities: payload.amenities.map((a) => ({
      ...a,
      selected: true,
    })) as DetectedAmenity[],
    compass: payload.compass,
    scale: payload.scale,
    roads: payload.roads,
    vegetation: payload.vegetation,
    waterBodies: payload.waterBodies,
    siteOutline: payload.siteOutline,
    imageStats: payload.imageStats,
    analyzedAt: new Date(),
  };
}
