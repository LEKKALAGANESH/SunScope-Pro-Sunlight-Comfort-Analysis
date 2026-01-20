/**
 * useScrollPreservation - Prevents unwanted scroll-to-top behavior
 *
 * This hook preserves scroll position when switching between sections/steps
 * in the application, preventing the disruptive auto-scroll-to-top behavior.
 *
 * Features:
 * - Stores scroll position per section for restoration when returning
 * - Prevents browser's default scroll reset on content change
 * - Allows intentional scrolls (e.g., first-time entry to a section)
 */

import { useEffect, useRef, useCallback } from 'react';

interface ScrollPositions {
  [key: string]: number;
}

interface UseScrollPreservationOptions {
  /** Current section/step identifier */
  currentStep: string;
  /** Whether to restore position when returning to a previously visited section */
  restoreOnReturn?: boolean;
  /** Sections that should always scroll to top on entry */
  alwaysScrollTopSections?: string[];
}

export function useScrollPreservation({
  currentStep,
  restoreOnReturn = true,
  alwaysScrollTopSections = [],
}: UseScrollPreservationOptions) {
  const scrollPositions = useRef<ScrollPositions>({});
  const previousStep = useRef<string | null>(null);
  const isInitialMount = useRef(true);
  const visitedSections = useRef<Set<string>>(new Set());

  // Store current scroll position before leaving a section
  const storeScrollPosition = useCallback(() => {
    if (previousStep.current) {
      scrollPositions.current[previousStep.current] = window.scrollY;
    }
  }, []);

  // Restore scroll position for a section (or scroll to top if appropriate)
  const restoreScrollPosition = useCallback((step: string) => {
    // Check if this section should always scroll to top
    if (alwaysScrollTopSections.includes(step)) {
      window.scrollTo(0, 0);
      return;
    }

    // First time visiting this section - scroll to top
    if (!visitedSections.current.has(step)) {
      visitedSections.current.add(step);
      window.scrollTo(0, 0);
      return;
    }

    // Returning to a previously visited section
    if (restoreOnReturn && scrollPositions.current[step] !== undefined) {
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollPositions.current[step]);
      });
    }
    // Otherwise, preserve current scroll position (don't scroll at all)
  }, [alwaysScrollTopSections, restoreOnReturn]);

  useEffect(() => {
    // Skip on initial mount - let the page load naturally
    if (isInitialMount.current) {
      isInitialMount.current = false;
      visitedSections.current.add(currentStep);
      previousStep.current = currentStep;
      return;
    }

    // Step is changing
    if (previousStep.current !== currentStep) {
      // Store position of section we're leaving
      storeScrollPosition();

      // Handle scroll for section we're entering
      restoreScrollPosition(currentStep);

      // Update previous step reference
      previousStep.current = currentStep;
    }
  }, [currentStep, storeScrollPosition, restoreScrollPosition]);

  // Cleanup - store final scroll position on unmount
  useEffect(() => {
    return () => {
      storeScrollPosition();
    };
  }, [storeScrollPosition]);

  return {
    /** Manually scroll to top (for explicit user actions) */
    scrollToTop: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
    /** Get stored scroll position for a section */
    getScrollPosition: (step: string) => scrollPositions.current[step] ?? 0,
    /** Check if a section has been visited */
    hasVisited: (step: string) => visitedSections.current.has(step),
  };
}

/**
 * CSS helper for preventing scroll anchoring issues
 * Add this to the main content container
 */
export const scrollPreservationStyles = {
  // Prevent browser's automatic scroll anchoring from interfering
  overflowAnchor: 'none' as const,
};
