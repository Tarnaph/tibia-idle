'use client';

import { useState, useEffect } from 'react';

export interface ResponsiveLayoutState {
  isMobile: boolean;
  isSmallScreen: boolean;
  isPortrait: boolean;
  isLandscape: boolean;
  orientation: 'portrait' | 'landscape';
  width: number;
  height: number;
  safeAreaBottom: number;
}

export function useResponsiveLayout(): ResponsiveLayoutState {
  const [layout, setLayout] = useState<ResponsiveLayoutState>(() => {
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isSmallScreen: false,
        isPortrait: false,
        isLandscape: true,
        orientation: 'landscape',
        width: 1280,
        height: 720,
        safeAreaBottom: 0,
      };
    }

    const w = window.innerWidth;
    const h = window.innerHeight;
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isPortrait = h > w;
    const isSmall = w <= 768;
    const isMobileDevice = isSmall || (isTouch && w <= 1024);

    return {
      isMobile: isMobileDevice,
      isSmallScreen: isSmall,
      isPortrait,
      isLandscape: !isPortrait,
      orientation: isPortrait ? 'portrait' : 'landscape',
      width: w,
      height: h,
      safeAreaBottom: 0,
    };
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let timeoutId: any = null;

    const updateLayout = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isPortrait = h > w;
      const isSmall = w <= 768;
      const isMobileDevice = isSmall || (isTouch && w <= 1024);

      setLayout({
        isMobile: isMobileDevice,
        isSmallScreen: isSmall,
        isPortrait,
        isLandscape: !isPortrait,
        orientation: isPortrait ? 'portrait' : 'landscape',
        width: w,
        height: h,
        safeAreaBottom: 0,
      });
    };

    const handleResize = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(updateLayout, 100);
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleResize, { passive: true });

    // Initial check
    updateLayout();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return layout;
}
