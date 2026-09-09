import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  THAIS_THEME_TRACK,
  onTrackNotification,
  triggerTrackNotification,
  type MusicTrackInfo,
} from '../apps/web/lib/audioManager';

describe('Phase 104 - Now Playing Music Track Toast Banner (Slide In/Out from Right)', () => {
  const toastComponentPath = path.resolve(__dirname, '../apps/web/components/audio/MusicTrackToast.tsx');
  const gamePrototypePath = path.resolve(__dirname, '../apps/web/components/GamePrototype.tsx');
  const dockBarPath = path.resolve(__dirname, '../apps/web/components/window/WindowDockBar.tsx');
  const globalsCssPath = path.resolve(__dirname, '../app/globals.css');

  it('verifies audioManager defines THAIS_THEME_TRACK with title "Thais Theme"', () => {
    expect(THAIS_THEME_TRACK).toBeDefined();
    expect(THAIS_THEME_TRACK.title).toBe('Thais Theme');
    expect(THAIS_THEME_TRACK.subtitle).toBe('Sunset in the Village');
    expect(THAIS_THEME_TRACK.location).toBe('Cidade de Thais');
  });

  it('verifies onTrackNotification listener subscription and notification dispatch', () => {
    let capturedTrack: any = null;
    const unsub = onTrackNotification((track) => {
      capturedTrack = track;
    });

    triggerTrackNotification(THAIS_THEME_TRACK);
    expect(capturedTrack).not.toBeNull();
    expect(capturedTrack?.title).toBe('Thais Theme');
    expect(capturedTrack?.subtitle).toBe('Sunset in the Village');

    // Test custom track dispatch
    triggerTrackNotification({
      id: 'custom-bgm',
      title: 'Venore Marshlands',
      subtitle: 'Swamp Echoes',
    });
    expect(capturedTrack?.title).toBe('Venore Marshlands');

    // Unsubscribe verification
    unsub();
    triggerTrackNotification({
      id: 'kazordoon',
      title: 'Kazordoon Deep Halls',
    });
    // Should still hold the previous track since listener was unsubscribed
    expect(capturedTrack?.title).toBe('Venore Marshlands');
  });

  it('verifies MusicTrackToast component file exists and contains sliding animation & timer logic', () => {
    expect(fs.existsSync(toastComponentPath)).toBe(true);
    const content = fs.readFileSync(toastComponentPath, 'utf8');

    expect(content).toContain('export function MusicTrackToast');
    expect(content).toContain('onTrackNotification');
    expect(content).toContain('music-toast-slide-in');
    expect(content).toContain('music-toast-slide-out');
    expect(content).toContain('music-toast-container');
    expect(content).toContain('music-toast-timer-line');
    // Verifies 4500ms display timer
    expect(content).toContain('4500');
  });

  it('verifies GamePrototype imports and renders MusicTrackToast', () => {
    const content = fs.readFileSync(gamePrototypePath, 'utf8');

    expect(content).toContain("import { MusicTrackToast } from './audio/MusicTrackToast'");
    expect(content).toContain('<MusicTrackToast />');
  });

  it('verifies WindowDockBar wires triggerTrackNotification with THAIS_THEME_TRACK', () => {
    const content = fs.readFileSync(dockBarPath, 'utf8');

    expect(content).toContain('triggerTrackNotification');
    expect(content).toContain('THAIS_THEME_TRACK');
    expect(content).toContain('triggerTrackNotification(THAIS_THEME_TRACK)');
  });

  it('verifies app/globals.css implements keyframes and classes for right-sliding box', () => {
    const content = fs.readFileSync(globalsCssPath, 'utf8');

    // Slide in from right (125% -> 0%)
    expect(content).toContain('@keyframes music-toast-slide-in');
    expect(content).toContain('translateX(125%)');

    // Slide out to right (0% -> 130%)
    expect(content).toContain('@keyframes music-toast-slide-out');
    expect(content).toContain('translateX(130%)');

    // Timer line countdown drain animation
    expect(content).toContain('@keyframes music-timer-drain');
    expect(content).toContain('.music-toast-timer-line');

    // Equalizer animations
    expect(content).toContain('@keyframes music-eq-bounce-1');
    expect(content).toContain('@keyframes music-eq-bounce-2');
    expect(content).toContain('@keyframes music-eq-bounce-3');

    // Container style
    expect(content).toContain('.music-toast-container');
    expect(content).toContain('.music-toast-slide-in');
    expect(content).toContain('.music-toast-slide-out');
  });
});
