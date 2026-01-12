/**
 * FirstTimeHints Component
 *
 * Shows helpful tooltips and hints for first-time users.
 * Appears only once and can be dismissed.
 */

import { useState, useEffect } from 'react';
import { useProjectStore } from '../../store/projectStore';

interface Hint {
  id: string;
  title: string;
  description: string;
  step: string; // Which step this hint appears on
}

const hints: Hint[] = [
  {
    id: 'upload-hint',
    title: 'Getting Started',
    description: 'Upload a site plan image (JPG, PNG, or PDF). You can drag and drop or click to browse.',
    step: 'upload',
  },
  {
    id: 'setup-hint',
    title: 'Configure Your Site',
    description: 'Set the north orientation, scale (meters per pixel), and location for accurate sun calculations.',
    step: 'setup',
  },
  {
    id: 'editor-hint',
    title: 'Draw Buildings',
    description: 'Click to add points and double-click to complete a building footprint. Set floor counts in the sidebar.',
    step: 'editor',
  },
  {
    id: 'viewer-hint',
    title: 'Explore Sunlight',
    description: 'Select a building and floor, then use the time slider to see shadows throughout the day.',
    step: 'viewer',
  },
];

export function FirstTimeHints() {
  const { currentStep, hasSeenWelcome, setHasSeenWelcome } = useProjectStore();
  const [showHint, setShowHint] = useState(false);
  const [dismissedHints, setDismissedHints] = useState<Set<string>>(new Set());

  // Find the hint for the current step
  const currentStepHint = hints.find(
    (h) => h.step === currentStep && !dismissedHints.has(h.id)
  );

  useEffect(() => {
    // Don't show hints if user has already seen welcome
    if (hasSeenWelcome) return;

    // Show hint with a small delay for better UX
    if (currentStepHint) {
      const timer = setTimeout(() => setShowHint(true), 500);
      return () => clearTimeout(timer);
    } else {
      setShowHint(false);
    }
  }, [currentStep, hasSeenWelcome, currentStepHint]);

  const handleDismiss = () => {
    if (currentStepHint) {
      setDismissedHints((prev) => new Set([...prev, currentStepHint.id]));
    }
    setShowHint(false);
  };

  const handleDismissAll = () => {
    setHasSeenWelcome(true);
    setShowHint(false);
  };

  if (!showHint || !currentStepHint) return null;

  return (
    <div
      className="fixed bottom-4 right-4 max-w-sm bg-white rounded-xl shadow-lg border border-amber-200 p-4 z-40 animate-slide-up"
      role="complementary"
      aria-label="First-time user hint"
    >
      {/* Hint icon */}
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
          <svg
            className="w-4 h-4 text-amber-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 mb-1">
            {currentStepHint.title}
          </h4>
          <p className="text-sm text-gray-600">{currentStepHint.description}</p>
        </div>

        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500 rounded-lg p-1"
          aria-label="Dismiss hint"
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

      {/* Actions */}
      <div className="mt-3 flex items-center justify-between">
        <button
          onClick={handleDismissAll}
          className="text-xs text-gray-500 hover:text-gray-700 underline"
        >
          Don't show hints
        </button>
        <button
          onClick={handleDismiss}
          className="text-xs bg-amber-500 text-white px-3 py-1.5 rounded-lg hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

/**
 * Inline tooltip component for specific elements
 */
interface TooltipProps {
  children: React.ReactNode;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function Tooltip({ children, content, position = 'top' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          className={`absolute ${positionClasses[position]} px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap z-50`}
          role="tooltip"
        >
          {content}
        </div>
      )}
    </div>
  );
}
