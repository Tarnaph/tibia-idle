import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  THAIS_THEME_TRACK,
  onTrackNotification,
  triggerTrackNotification,
} from '../apps/web/lib/audioManager';

describe('Phase 105 - Music Track Toast Deferred Strictly After Loading Finishes', () => {
  const toastComponentPath = path.resolve(__dirname, '../apps/web/components/audio/MusicTrackToast.tsx');
  const gamePrototypePath = path.resolve(__dirname, '../apps/web/components/GamePrototype.tsx');

  it('verifies MusicTrackToast defines MusicTrackToastProps with optional isLoading', () => {
    const content = fs.readFileSync(toastComponentPath, 'utf8');

    expect(content).toContain('export interface MusicTrackToastProps');
    expect(content).toContain('isLoading?: boolean');
    expect(content).toContain('export function MusicTrackToast({ isLoading = false }: MusicTrackToastProps)');
  });

  it('verifies MusicTrackToast suppresses rendering and queues track while isLoading is true', () => {
    const content = fs.readFileSync(toastComponentPath, 'utf8');

    // Suppresses and queues while loading
    expect(content).toContain('if (isLoading)');
    expect(content).toContain('queuedTrackRef.current = newTrack');

    // Strictly returns null when loading or idle
    expect(content).toContain('if (isLoading || animStage === \'idle\' || !track)');

    // Flushes queued track when loading transitions to false
    expect(content).toContain('prevLoadingRef.current && !isLoading');
    expect(content).toContain('if (queuedTrackRef.current)');
    expect(content).toContain('startToastAnimation(queued)');
  });

  it('verifies GamePrototype binds MusicTrackToast isLoading to initialLoadingActive and transitionLoading', () => {
    const content = fs.readFileSync(gamePrototypePath, 'utf8');

    expect(content).toContain('<MusicTrackToast isLoading={initialLoadingActive || Boolean(transitionLoading?.active)} />');
  });

  it('verifies GamePrototype onFinish triggers track notification for Thais Theme upon loading completion', () => {
    const content = fs.readFileSync(gamePrototypePath, 'utf8');

    expect(content).toContain("import { triggerTrackNotification, THAIS_THEME_TRACK } from '../lib/audioManager'");
    expect(content).toContain('triggerTrackNotification(THAIS_THEME_TRACK)');
  });

  it('verifies audioManager track notification bus works in sync with post-loading handlers', () => {
    let notifiedTrack: any = null;
    const unsub = onTrackNotification((t) => {
      notifiedTrack = t;
    });

    triggerTrackNotification(THAIS_THEME_TRACK);
    expect(notifiedTrack).not.toBeNull();
    expect(notifiedTrack?.id).toBe('thais-theme');
    expect(notifiedTrack?.title).toBe('Thais Theme');

    unsub();
  });
});
