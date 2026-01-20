/**
 * useScrollDirection Hook
 *
 * Detects scroll direction and provides scroll state for implementing
 * auto-hiding headers. Based on industry best practices:
 * - 10px threshold to prevent jitter
 * - Debounced updates for performance
 * - Returns both direction and visibility state
 */

import { useState, useEffect, useCallback, useRef } from 'react';

type ScrollDirection = 'up' | 'down' | null;

interface ScrollState {
  direction: ScrollDirection;
  isVisible: boolean;
  scrollY: number;
  isAtTop: boolean;
}

interface UseScrollDirectionOptions {
  threshold?: number;      // Minimum scroll before triggering (prevents jitter)
  topOffset?: number;      // Always show header when within this distance from top
  disabled?: boolean;      // Disable scroll tracking
}

export function useScrollDirection(options: UseScrollDirectionOptions = {}): ScrollState {
  const {
    threshold = 10,
    topOffset = 100,
    disabled = false
  } = options;

  const [scrollState, setScrollState] = useState<ScrollState>({
    direction: null,
    isVisible: true,
    scrollY: 0,
    isAtTop: true,
  });

  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  const updateScrollState = useCallback(() => {
    const currentScrollY = window.scrollY;
    const isAtTop = currentScrollY <= topOffset;

    // Always show at top of page
    if (isAtTop) {
      setScrollState({
        direction: null,
        isVisible: true,
        scrollY: currentScrollY,
        isAtTop: true,
      });
      lastScrollY.current = currentScrollY;
      ticking.current = false;
      return;
    }

    const diff = currentScrollY - lastScrollY.current;

    // Only update if scroll exceeds threshold (prevents jitter)
    if (Math.abs(diff) < threshold) {
      ticking.current = false;
      return;
    }

    const direction: ScrollDirection = diff > 0 ? 'down' : 'up';
    const isVisible = direction === 'up';

    setScrollState({
      direction,
      isVisible,
      scrollY: currentScrollY,
      isAtTop: false,
    });

    lastScrollY.current = currentScrollY;
    ticking.current = false;
  }, [threshold, topOffset]);

  const handleScroll = useCallback(() => {
    if (disabled || ticking.current) return;

    ticking.current = true;
    requestAnimationFrame(updateScrollState);
  }, [disabled, updateScrollState]);

  useEffect(() => {
    if (disabled) return;

    // Initialize with current scroll position
    lastScrollY.current = window.scrollY;
    setScrollState(prev => ({
      ...prev,
      scrollY: window.scrollY,
      isAtTop: window.scrollY <= topOffset,
    }));

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [disabled, handleScroll, topOffset]);

  return scrollState;
}
