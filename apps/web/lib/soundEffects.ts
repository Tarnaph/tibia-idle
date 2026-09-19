'use client';

import { isAudioMuted, getAudioVolume } from './audioManager';

export type SfxType =
  | 'knight_attack'
  | 'paladin_attack'
  | 'sorcerer_spell'
  | 'druid_spell'
  | 'player_death';

const SFX_URLS: Record<SfxType, string> = {
  knight_attack: '/assets/sfx/knight_attack.wav',
  paladin_attack: '/assets/sfx/paladin_attack.wav',
  sorcerer_spell: '/assets/sfx/sorcerer_spell.wav',
  druid_spell: '/assets/sfx/druid_spell.wav',
  player_death: '/assets/sfx/player_death.wav',
};

const THROTTLE_MS: Record<SfxType, number> = {
  knight_attack: 75,
  paladin_attack: 85,
  sorcerer_spell: 95,
  druid_spell: 95,
  player_death: 1000,
};

let audioCtx: AudioContext | null = null;
const audioBuffers = new Map<SfxType, AudioBuffer>();
const lastPlayedTimes = new Map<SfxType, number>();
let isPreloading = false;
let isPreloaded = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtxClass) {
      audioCtx = new AudioCtxClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Preload all SFX audio buffers into Web Audio memory.
 */
export async function preloadSfx(): Promise<void> {
  if (typeof window === 'undefined' || isPreloading || isPreloaded) return;
  isPreloading = true;

  const ctx = getAudioContext();
  if (!ctx) {
    isPreloading = false;
    return;
  }

  await Promise.all(
    (Object.entries(SFX_URLS) as [SfxType, string][]).map(async ([type, url]) => {
      try {
        const res = await fetch(url);
        if (!res.ok) return;
        const arrayBuf = await res.arrayBuffer();
        const decoded = await ctx.decodeAudioData(arrayBuf);
        audioBuffers.set(type, decoded);
      } catch {
        // Fallback to procedural synthesis if fetch fails
      }
    })
  );

  isPreloaded = true;
  isPreloading = false;
}

/**
 * Procedural fallback synthesis using native Web Audio oscillators & noise when buffer is absent.
 */
function playProceduralFallback(ctx: AudioContext, type: SfxType, volume: number) {
  const now = ctx.currentTime;
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(volume, now);
  masterGain.connect(ctx.destination);

  if (type === 'knight_attack') {
    // Punchy descending frequency sweep + metal clash
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.18);
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.18);
  } else if (type === 'paladin_attack') {
    // Bow twang + high-velocity snap
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(450, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.22);
    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.22);
  } else if (type === 'sorcerer_spell') {
    // Fiery crackle / burst
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(540, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.35);
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.35);
  } else if (type === 'druid_spell') {
    // Ethereal chord shimmer
    [523.25, 659.25, 783.99].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.4);
    });
  } else if (type === 'player_death') {
    // Dramatic descending minor gong
    [65.41, 77.78, 98.0].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.8, now + 1.2);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 1.2);
    });
  }
}

/**
 * Plays a specified sound effect with volume and throttle controls.
 */
export function playSfx(type: SfxType): void {
  if (isAudioMuted()) return;

  const volume = getAudioVolume();
  if (volume <= 0) return;

  if (typeof window === 'undefined') return;

  const nowMs = performance.now();
  const lastTime = lastPlayedTimes.get(type) || 0;
  const throttle = THROTTLE_MS[type] || 60;
  if (nowMs - lastTime < throttle) return;
  lastPlayedTimes.set(type, nowMs);

  const ctx = getAudioContext();
  if (!ctx) return;

  const buffer = audioBuffers.get(type);
  if (buffer) {
    try {
      const source = ctx.createBufferSource();
      source.buffer = buffer;

      // Slight natural pitch variation (+/- 4%)
      const pitchDetune = (Math.random() * 80 - 40);
      if (source.detune) {
        source.detune.setValueAtTime(pitchDetune, ctx.currentTime);
      }

      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(Math.min(1.0, volume * 1.1), ctx.currentTime);

      source.connect(gainNode);
      gainNode.connect(ctx.destination);

      source.start();
      return;
    } catch {
      // Fallback
    }
  }

  // If buffer is not loaded or failed, use procedural fallback
  playProceduralFallback(ctx, type, volume);
}

/**
 * Plays physical attack sound for Knight or Paladin.
 */
export function playPhysicalAttack(vocationIdOrName: number | string | undefined): void {
  if (!vocationIdOrName) {
    playSfx('knight_attack');
    return;
  }

  const str = String(vocationIdOrName).toLowerCase();
  if (str === '2' || str.includes('paladin')) {
    playSfx('paladin_attack');
  } else {
    // Knight or default melee
    playSfx('knight_attack');
  }
}

/**
 * Plays magic spell cast sound for Sorcerer or Druid.
 */
export function playMagicSpell(vocationIdOrName: number | string | undefined, element?: string): void {
  const str = vocationIdOrName ? String(vocationIdOrName).toLowerCase() : '';
  const elemStr = element ? element.toLowerCase() : '';

  if (str === '4' || str.includes('druid') || elemStr.includes('heal') || elemStr.includes('ice') || elemStr.includes('earth')) {
    playSfx('druid_spell');
  } else {
    // Sorcerer or offensive elemental magic (fire/energy/death)
    playSfx('sorcerer_spell');
  }
}

/**
 * Plays player death defeat sound.
 */
export function playPlayerDeath(): void {
  playSfx('player_death');
}
