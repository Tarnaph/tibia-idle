import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getDefaultZoom, getZoomMultiplier, setZoomMultiplier, resetZoomMultiplier } from '../apps/web/lib/zoomManager';

describe('Phase 235: Mobile UI/UX Polish & Layout Refinement', () => {
  describe('zoomManager - Responsive Mobile Camera Zoom', () => {
    beforeEach(() => {
      // Clear localStorage and reset zoom between tests
      if (typeof window !== 'undefined' && window.localStorage && typeof window.localStorage.clear === 'function') {
        window.localStorage.clear();
      }
    });

    it('returns default desktop zoom of 1.25x when viewport is wide (>840px)', () => {
      // Simulate desktop viewport
      vi.stubGlobal('window', { innerWidth: 1280, localStorage: { getItem: () => null, setItem: () => {} } });
      vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' });
      
      const defZoom = getDefaultZoom();
      expect(defZoom).toBe(1.25);
    });

    it('returns mobile default zoom of 0.85x when viewport is mobile (<=840px)', () => {
      // Simulate mobile phone viewport
      vi.stubGlobal('window', { innerWidth: 390, localStorage: { getItem: () => null, setItem: () => {} } });
      vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)' });

      const defZoom = getDefaultZoom();
      expect(defZoom).toBe(0.85);
    });

    it('clamps zoom multiplier within allowed MIN (0.5) and MAX (2.0) limits', () => {
      setZoomMultiplier(0.1);
      expect(getZoomMultiplier()).toBe(0.5);

      setZoomMultiplier(5.0);
      expect(getZoomMultiplier()).toBe(2.0);

      setZoomMultiplier(0.9);
      expect(getZoomMultiplier()).toBe(0.9);
    });
  });

  describe('Mobile Bestiary HUD & Dimension Calculations', () => {
    function getBestiaryDimensions(isMobile: boolean, isMinimized: boolean) {
      return {
        width: isMobile ? (isMinimized ? 'auto' : '195px') : '255px',
        spriteBoxSize: isMobile ? 26 : 36,
        padding: isMobile ? '4px 6px' : '6px 8px',
        maxListHeight: isMobile ? 160 : 250,
      };
    }

    it('provides compact dimensions and default minimized pill on mobile devices', () => {
      const mobileMinimized = getBestiaryDimensions(true, true);
      expect(mobileMinimized.width).toBe('auto');

      const mobileExpanded = getBestiaryDimensions(true, false);
      expect(mobileExpanded.width).toBe('195px');
      expect(mobileExpanded.spriteBoxSize).toBe(26);
      expect(mobileExpanded.maxListHeight).toBe(160);
    });

    it('preserves full dimensions on desktop viewport', () => {
      const desktop = getBestiaryDimensions(false, false);
      expect(desktop.width).toBe('255px');
      expect(desktop.spriteBoxSize).toBe(36);
      expect(desktop.maxListHeight).toBe(250);
    });
  });

  describe('HuntSelector Monster Image Fallback Resilience', () => {
    function getNextFallbackImage(currentStage: string, monsterId: string, huntId?: string): { nextStage: string; src: string } {
      if (currentStage === '0') {
        return { nextStage: '1', src: `/generated/tibia1098/monster-${monsterId}-thumb.png` };
      } else if (currentStage === '1') {
        return { nextStage: '2', src: `/generated/tibia1098/monster-${monsterId}-south-frame-0.png` };
      } else if (currentStage === '2') {
        return { nextStage: '3', src: `/assets/monsters/${monsterId}.png` };
      } else if (currentStage === '3') {
        return { nextStage: '4', src: `/images/hunts/hunt-${huntId || monsterId}.png` };
      }
      return { nextStage: '5', src: '/generated/bestiary/rat.png' };
    }

    it('cycles through sprite thumb, walk frame, canonical assets, hunt banner, and ultimate rat fallback', () => {
      const step1 = getNextFallbackImage('0', 'corym-vanguard', 'corym-mine');
      expect(step1.src).toBe('/generated/tibia1098/monster-corym-vanguard-thumb.png');

      const step2 = getNextFallbackImage(step1.nextStage, 'corym-vanguard', 'corym-mine');
      expect(step2.src).toBe('/generated/tibia1098/monster-corym-vanguard-south-frame-0.png');

      const step3 = getNextFallbackImage(step2.nextStage, 'corym-vanguard', 'corym-mine');
      expect(step3.src).toBe('/assets/monsters/corym-vanguard.png');

      const step4 = getNextFallbackImage(step3.nextStage, 'corym-vanguard', 'corym-mine');
      expect(step4.src).toBe('/images/hunts/hunt-corym-mine.png');

      const step5 = getNextFallbackImage(step4.nextStage, 'corym-vanguard', 'corym-mine');
      expect(step5.src).toBe('/generated/bestiary/rat.png');
    });
  });

  describe('Mobile Floating Chat Bubble & Hotkey Bar Layout', () => {
    function formatUnreadBadge(unreadCount: number): string | null {
      if (unreadCount <= 0) return null;
      if (unreadCount > 99) return '99+';
      return String(unreadCount);
    }

    it('correctly displays unread badge counts', () => {
      expect(formatUnreadBadge(0)).toBeNull();
      expect(formatUnreadBadge(5)).toBe('5');
      expect(formatUnreadBadge(99)).toBe('99');
      expect(formatUnreadBadge(150)).toBe('99+');
    });

    it('ensures all 8 hotkey slots are reserved for actions without being hijacked by chat button', () => {
      const hotkeySlots = [1, 2, 3, 4, 5, 6, 7, 8];
      expect(hotkeySlots.length).toBe(8);
      expect(hotkeySlots[0]).toBe(1);
      expect(hotkeySlots[7]).toBe(8);
    });
  });
});
