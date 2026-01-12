/**
 * AnimatedExportModal
 *
 * Modal dialog for configuring and generating animated GIF exports
 * of sun movement throughout the day.
 */

import { useState, useCallback } from 'react';
import type * as THREE from 'three';
import {
  generateAnimatedExport,
  downloadAnimatedExport,
  type AnimatedExportResult,
} from '../../modules/export/AnimatedExportService';

interface AnimatedExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  renderer: THREE.WebGLRenderer | null;
  scene: THREE.Scene | null;
  camera: THREE.PerspectiveCamera | null;
  sunLight: THREE.DirectionalLight | null;
  location: {
    latitude: number;
    longitude: number;
  };
  date: Date;
}

type ExportState = 'idle' | 'generating' | 'complete' | 'error';

export function AnimatedExportModal({
  isOpen,
  onClose,
  renderer,
  scene,
  camera,
  sunLight,
  location,
  date,
}: AnimatedExportModalProps) {
  const [exportState, setExportState] = useState<ExportState>('idle');
  const [progress, setProgress] = useState(0);
  const [progressStage, setProgressStage] = useState('');
  const [result, setResult] = useState<AnimatedExportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Export settings
  const [startHour, setStartHour] = useState(6);
  const [endHour, setEndHour] = useState(18);
  const [frameInterval, setFrameInterval] = useState(30);
  const [quality, setQuality] = useState<'high' | 'medium' | 'low'>('medium');
  const [resolution, setResolution] = useState<'720p' | '480p' | '360p'>('480p');

  const getQualityValue = (q: typeof quality): number => {
    switch (q) {
      case 'high':
        return 5;
      case 'medium':
        return 10;
      case 'low':
        return 20;
    }
  };

  const getResolution = (r: typeof resolution): { width: number; height: number } => {
    switch (r) {
      case '720p':
        return { width: 1280, height: 720 };
      case '480p':
        return { width: 854, height: 480 };
      case '360p':
        return { width: 640, height: 360 };
    }
  };

  const handleGenerate = useCallback(async () => {
    if (!renderer || !scene || !camera || !sunLight) {
      setError('3D scene not ready. Please try again.');
      return;
    }

    setExportState('generating');
    setProgress(0);
    setError(null);

    try {
      const { width, height } = getResolution(resolution);
      const exportResult = await generateAnimatedExport({
        renderer,
        scene,
        camera,
        sunLight,
        location,
        date,
        startHour,
        endHour,
        frameInterval,
        quality: getQualityValue(quality),
        width,
        height,
        onProgress: (p, stage) => {
          setProgress(p);
          setProgressStage(stage);
        },
      });

      setResult(exportResult);
      setExportState('complete');
    } catch (err) {
      console.error('Animated export failed:', err);
      setError(err instanceof Error ? err.message : 'Export failed');
      setExportState('error');
    }
  }, [
    renderer,
    scene,
    camera,
    sunLight,
    location,
    date,
    startHour,
    endHour,
    frameInterval,
    quality,
    resolution,
  ]);

  const handleDownload = useCallback(async () => {
    if (result) {
      await downloadAnimatedExport(result);
    }
  }, [result]);

  const handleClose = useCallback(() => {
    if (exportState !== 'generating') {
      setExportState('idle');
      setProgress(0);
      setResult(null);
      setError(null);
      onClose();
    }
  }, [exportState, onClose]);

  if (!isOpen) return null;

  const estimatedFrames = Math.ceil(((endHour - startHour) * 60) / frameInterval) + 1;
  const estimatedDuration = (estimatedFrames * 200) / 1000; // seconds

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Animated Export
            </h2>
            <button
              onClick={handleClose}
              disabled={exportState === 'generating'}
              className="text-white/80 hover:text-white disabled:opacity-50"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-white/80 text-sm mt-1">
            Create a GIF animation of sun movement throughout the day
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {exportState === 'idle' && (
            <div className="space-y-4">
              {/* Time Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time Range
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500">Start</label>
                    <select
                      value={startHour}
                      onChange={(e) => setStartHour(parseInt(e.target.value))}
                      className="input mt-1"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>
                          {i.toString().padStart(2, '0')}:00
                        </option>
                      ))}
                    </select>
                  </div>
                  <span className="text-gray-400 mt-4">to</span>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500">End</label>
                    <select
                      value={endHour}
                      onChange={(e) => setEndHour(parseInt(e.target.value))}
                      className="input mt-1"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>
                          {i.toString().padStart(2, '0')}:00
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Frame Interval */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Frame Interval
                </label>
                <select
                  value={frameInterval}
                  onChange={(e) => setFrameInterval(parseInt(e.target.value))}
                  className="input"
                >
                  <option value={15}>Every 15 minutes (more frames)</option>
                  <option value={30}>Every 30 minutes (recommended)</option>
                  <option value={60}>Every hour (fewer frames)</option>
                </select>
              </div>

              {/* Quality */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quality
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['high', 'medium', 'low'] as const).map((q) => (
                    <button
                      key={q}
                      onClick={() => setQuality(q)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        quality === q
                          ? 'bg-amber-100 text-amber-800 border-2 border-amber-400'
                          : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                      }`}
                    >
                      {q.charAt(0).toUpperCase() + q.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Resolution */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Resolution
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['720p', '480p', '360p'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setResolution(r)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        resolution === r
                          ? 'bg-amber-100 text-amber-800 border-2 border-amber-400'
                          : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Estimate */}
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Estimated frames:</span>
                  <span className="font-medium">{estimatedFrames}</span>
                </div>
                <div className="flex justify-between text-gray-600 mt-1">
                  <span>Animation duration:</span>
                  <span className="font-medium">~{estimatedDuration.toFixed(1)}s</span>
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                className="w-full btn-primary py-3 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Generate Animation
              </button>
            </div>
          )}

          {exportState === 'generating' && (
            <div className="py-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 relative">
                <svg className="animate-spin w-full h-full text-amber-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Generating Animation
              </h3>
              <p className="text-sm text-gray-500 mb-4">{progressStage}</p>

              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div
                  className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <p className="text-sm text-gray-500">{Math.round(progress * 100)}%</p>
            </div>
          )}

          {exportState === 'complete' && result && (
            <div className="py-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Animation Ready!
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {result.frameCount} frames, {(result.duration / 1000).toFixed(1)}s duration
              </p>

              <div className="space-y-3">
                <button
                  onClick={handleDownload}
                  className="w-full btn-primary py-3 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download GIF
                </button>
                <button
                  onClick={() => {
                    setExportState('idle');
                    setResult(null);
                  }}
                  className="w-full btn-secondary py-2"
                >
                  Create Another
                </button>
              </div>
            </div>
          )}

          {exportState === 'error' && (
            <div className="py-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Export Failed
              </h3>
              <p className="text-sm text-red-600 mb-4">{error}</p>
              <button
                onClick={() => setExportState('idle')}
                className="btn-secondary py-2 px-6"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
