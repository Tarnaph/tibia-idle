import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  getAudioVolume,
  setAudioVolume,
  isAudioMuted,
  setAudioMuted,
  toggleAudioMuted,
  onAudioChange,
  playCityBgm,
  pauseCityBgm,
  stopCityBgm,
} from '../apps/web/lib/audioManager';

describe('Phase 103 - Thais City Music Loop, Volume Controls & Quick Mute Button', () => {
  const songPath = path.resolve(__dirname, '../public/songs/sunset-in-the-village.mp3');
  const dockBarPath = path.resolve(__dirname, '../apps/web/components/window/WindowDockBar.tsx');
  const gamePrototypePath = path.resolve(__dirname, '../apps/web/components/GamePrototype.tsx');
  const globalsCssPath = path.resolve(__dirname, '../app/globals.css');

  beforeEach(() => {
    // Reset audio state before tests
    setAudioVolume(0.5);
    setAudioMuted(false);
  });

  it('verifies that the Sunset in the Village MP3 file is present in public/songs with valid size', () => {
    expect(fs.existsSync(songPath)).toBe(true);
    const stat = fs.statSync(songPath);
    expect(stat.size).toBeGreaterThan(1_000_000); // 3.9MB file
  });

  it('verifies audioManager volume clamping and mute state manipulation', () => {
    setAudioVolume(0.75);
    expect(getAudioVolume()).toBe(0.75);

    // Clamping test
    setAudioVolume(1.5);
    expect(getAudioVolume()).toBe(1);

    setAudioVolume(-0.2);
    expect(getAudioVolume()).toBe(0);

    // Mute test
    expect(isAudioMuted()).toBe(false);
    toggleAudioMuted();
    expect(isAudioMuted()).toBe(true);
    toggleAudioMuted();
    expect(isAudioMuted()).toBe(false);
  });

  it('verifies audioManager notifies subscribers on state changes', () => {
    let capturedState: any = null;
    const unsub = onAudioChange((state) => {
      capturedState = state;
    });

    setAudioVolume(0.65);
    expect(capturedState).not.toBeNull();
    expect(capturedState?.volume).toBe(0.65);

    setAudioMuted(true);
    expect(capturedState?.isMuted).toBe(true);

    unsub();
  });

  it('verifies audioManager playback functions (playCityBgm, pauseCityBgm, stopCityBgm) exist and execute safely', () => {
    expect(typeof playCityBgm).toBe('function');
    expect(typeof pauseCityBgm).toBe('function');
    expect(typeof stopCityBgm).toBe('function');

    // Safe execution in test/SSR environment
    expect(() => playCityBgm()).not.toThrow();
    expect(() => pauseCityBgm()).not.toThrow();
    expect(() => stopCityBgm()).not.toThrow();
  });

  it('verifies WindowDockBar integrates volume options inside hamburger dropdown and mute button beside exit', () => {
    const content = fs.readFileSync(dockBarPath, 'utf8');

    // Check volume & audio in dropdown
    expect(content).toContain('Volume & Áudio');
    expect(content).toContain('audio-volume-slider');
    expect(content).toContain('audio-percentage-badge');
    expect(content).toContain('toggleAudioMuted');

    // Check quick mute button beside exit button
    expect(content).toContain('huntera-square-btn mute-btn');
    expect(content).toContain('Desmutar Áudio');
    expect(content).toContain('huntera-square-btn exit-btn');
  });

  it('verifies GamePrototype starts city BGM during loading and loops in Thais, pausing in hunt', () => {
    const content = fs.readFileSync(gamePrototypePath, 'utf8');

    expect(content).toContain("import { playCityBgm, pauseCityBgm, stopCityBgm } from '../lib/audioManager'");
    expect(content).toContain('playCityBgm()');
    expect(content).toContain('pauseCityBgm()');
    expect(content).toContain("mode === 'training'");
  });

  it('verifies app/globals.css includes styling for audio controls and mute button', () => {
    const content = fs.readFileSync(globalsCssPath, 'utf8');

    expect(content).toContain('.audio-controls-row');
    expect(content).toContain('.audio-volume-slider');
    expect(content).toContain('.audio-percentage-badge');
    expect(content).toContain('.huntera-square-btn.mute-btn');
  });
});
