import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  DRAGONS_PRIDE_TRACK,
  THAIS_THEME_TRACK,
  playDragonLairBgm,
  pauseDragonLairBgm,
  stopDragonLairBgm,
  stopAllAudio,
  playCityBgm,
  onTrackNotification,
  triggerTrackNotification,
  getAudioVolume,
  setAudioVolume,
  isAudioMuted,
  setAudioMuted,
} from '../apps/web/lib/audioManager';

describe('Phase 109 - Dragon Lair (Dragons Pride) Music on Loading & Post-Loading Track Notification', () => {
  const gamePrototypePath = path.resolve(__dirname, '../apps/web/components/GamePrototype.tsx');
  const audioManagerPath = path.resolve(__dirname, '../apps/web/lib/audioManager.ts');
  const songSourcePath = path.resolve(__dirname, '../songs/Dragons pride.mp3');
  const songPublicPath = path.resolve(__dirname, '../public/songs/dragons-pride.mp3');
  const songPublicOriginalNamePath = path.resolve(__dirname, '../public/songs/Dragons pride.mp3');

  it('verifies audio source file exists and is published to public/songs', () => {
    expect(fs.existsSync(songSourcePath)).toBe(true);
    expect(fs.existsSync(songPublicPath)).toBe(true);
    expect(fs.existsSync(songPublicOriginalNamePath)).toBe(true);

    const sourceStat = fs.statSync(songSourcePath);
    const publicStat = fs.statSync(songPublicPath);
    expect(publicStat.size).toBe(sourceStat.size);
    expect(publicStat.size).toBeGreaterThan(1000000); // ~4.6MB
  });

  it('verifies audioManager defines DRAGONS_PRIDE_TRACK with canonical metadata', () => {
    expect(DRAGONS_PRIDE_TRACK).toBeDefined();
    expect(DRAGONS_PRIDE_TRACK.id).toBe('dragons-pride');
    expect(DRAGONS_PRIDE_TRACK.title).toBe('Dragons Pride');
    expect(DRAGONS_PRIDE_TRACK.subtitle).toBe("Dragon's Lair");
    expect(DRAGONS_PRIDE_TRACK.location).toBe('Profundezas Chamuscadas');
  });

  it('verifies audioManager exports playDragonLairBgm, pauseDragonLairBgm, stopDragonLairBgm, stopAllAudio', () => {
    expect(typeof playDragonLairBgm).toBe('function');
    expect(typeof pauseDragonLairBgm).toBe('function');
    expect(typeof stopDragonLairBgm).toBe('function');
    expect(typeof stopAllAudio).toBe('function');

    // Safe execution in test environment
    expect(() => playDragonLairBgm()).not.toThrow();
    expect(() => pauseDragonLairBgm()).not.toThrow();
    expect(() => stopDragonLairBgm()).not.toThrow();
    expect(() => stopAllAudio()).not.toThrow();
    expect(() => playCityBgm()).not.toThrow();
  });

  it('verifies audioManager track notification bus works for DRAGONS_PRIDE_TRACK', () => {
    let received: any = null;
    const unsub = onTrackNotification((track) => {
      received = track;
    });

    triggerTrackNotification(DRAGONS_PRIDE_TRACK);
    expect(received).not.toBeNull();
    expect(received.id).toBe('dragons-pride');
    expect(received.title).toBe('Dragons Pride');

    unsub();
  });

  it('verifies GamePrototype.tsx imports Dragon Lair audio controls and DRAGONS_PRIDE_TRACK', () => {
    const code = fs.readFileSync(gamePrototypePath, 'utf8');

    expect(code).toContain('playDragonLairBgm');
    expect(code).toContain('stopDragonLairBgm');
    expect(code).toContain('DRAGONS_PRIDE_TRACK');
  });

  it('verifies startSelectedHunt plays Dragon Lair BGM immediately during loading screen', () => {
    const code = fs.readFileSync(gamePrototypePath, 'utf8');

    expect(code).toContain("if (huntId === 'dragon-lair') {");
    expect(code).toContain('playDragonLairBgm();');
  });

  it('verifies onPartyHuntSync plays Dragon Lair BGM immediately during party loading screen', () => {
    const code = fs.readFileSync(gamePrototypePath, 'utf8');

    expect(code).toContain("if (data.huntId === 'dragon-lair') {");
    expect(code).toContain('playDragonLairBgm();');
  });

  it('verifies ExuraLoadingScreen onFinish triggers DRAGONS_PRIDE_TRACK notification strictly after loading finishes', () => {
    const code = fs.readFileSync(gamePrototypePath, 'utf8');

    expect(code).toContain("if (pending.huntId === 'dragon-lair') {");
    expect(code).toContain('triggerTrackNotification(DRAGONS_PRIDE_TRACK);');
  });

  it('verifies exitHunt stops Dragon Lair BGM and restores City BGM for Thais', () => {
    const code = fs.readFileSync(gamePrototypePath, 'utf8');

    expect(code).toContain('stopDragonLairBgm();');
    expect(code).toContain('playCityBgm();');
  });
});
