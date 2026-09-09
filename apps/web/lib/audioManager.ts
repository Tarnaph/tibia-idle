'use client';

const STORAGE_KEY_VOLUME = 'tibia_audio_volume';
const STORAGE_KEY_MUTED = 'tibia_audio_muted';
const DEFAULT_VOLUME = 0.5; // 50%
const CITY_SONG_URL = '/songs/sunset-in-the-village.mp3';

export interface AudioState {
  volume: number; // 0.0 to 1.0
  isMuted: boolean;
  isPlayingCityBgm: boolean;
}

type AudioCallback = (state: AudioState) => void;
const listeners = new Set<AudioCallback>();

let cachedVolume: number | null = null;
let cachedMuted: boolean | null = null;
let cityAudioElement: HTMLAudioElement | null = null;
let isCityBgmActive = false;
let unlockerAttached = false;

function notifyListeners(): void {
  const state: AudioState = {
    volume: getAudioVolume(),
    isMuted: isAudioMuted(),
    isPlayingCityBgm: isCityBgmActive && Boolean(cityAudioElement && !cityAudioElement.paused),
  };
  listeners.forEach((cb) => {
    try {
      cb(state);
    } catch (e) {
      console.error('[audioManager] Listener callback error:', e);
    }
  });
}

export function getAudioVolume(): number {
  if (cachedVolume !== null) return cachedVolume;
  if (typeof window === 'undefined') return DEFAULT_VOLUME;
  try {
    const stored = localStorage.getItem(STORAGE_KEY_VOLUME);
    if (stored !== null) {
      const parsed = parseFloat(stored);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
        cachedVolume = Math.round(parsed * 100) / 100;
        return cachedVolume;
      }
    }
  } catch {}
  cachedVolume = DEFAULT_VOLUME;
  return DEFAULT_VOLUME;
}

export function setAudioVolume(value: number): void {
  const clamped = Math.round(Math.max(0, Math.min(1, value)) * 100) / 100;
  cachedVolume = clamped;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_VOLUME, clamped.toString());
    } catch {}
  }
  if (cityAudioElement) {
    cityAudioElement.volume = isAudioMuted() ? 0 : clamped;
  }
  notifyListeners();
}

export function isAudioMuted(): boolean {
  if (cachedMuted !== null) return cachedMuted;
  if (typeof window === 'undefined') return false;
  try {
    const stored = localStorage.getItem(STORAGE_KEY_MUTED);
    if (stored !== null) {
      cachedMuted = stored === 'true';
      return cachedMuted;
    }
  } catch {}
  cachedMuted = false;
  return false;
}

export function setAudioMuted(muted: boolean): void {
  cachedMuted = Boolean(muted);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_MUTED, cachedMuted ? 'true' : 'false');
    } catch {}
  }
  if (cityAudioElement) {
    cityAudioElement.volume = cachedMuted ? 0 : getAudioVolume();
  }
  notifyListeners();
}

export function toggleAudioMuted(): boolean {
  const next = !isAudioMuted();
  setAudioMuted(next);
  return next;
}

function getOrCreateCityAudio(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  if (!cityAudioElement) {
    cityAudioElement = new Audio(CITY_SONG_URL);
    cityAudioElement.loop = true;
    cityAudioElement.preload = 'auto';
    cityAudioElement.volume = isAudioMuted() ? 0 : getAudioVolume();
    cityAudioElement.addEventListener('play', () => notifyListeners());
    cityAudioElement.addEventListener('pause', () => notifyListeners());
    cityAudioElement.addEventListener('ended', () => notifyListeners());
  }
  return cityAudioElement;
}

/**
 * Autoplay unlocker: If browser rejects play() due to lack of prior user gesture,
 * this sets a one-time window interaction listener to immediately resume playback upon click/key.
 */
function setupAutoplayUnlocker(): void {
  if (typeof window === 'undefined' || unlockerAttached) return;
  unlockerAttached = true;

  const handleInteraction = () => {
    if (isCityBgmActive && cityAudioElement && cityAudioElement.paused) {
      cityAudioElement.play().catch(() => {});
    }
    window.removeEventListener('pointerdown', handleInteraction);
    window.removeEventListener('keydown', handleInteraction);
    unlockerAttached = false;
  };

  window.addEventListener('pointerdown', handleInteraction, { once: true });
  window.addEventListener('keydown', handleInteraction, { once: true });
}

export function playCityBgm(): void {
  if (typeof window === 'undefined') return;
  isCityBgmActive = true;
  const audio = getOrCreateCityAudio();
  if (!audio) return;

  audio.volume = isAudioMuted() ? 0 : getAudioVolume();
  audio.loop = true;

  const playPromise = audio.play();
  if (playPromise !== undefined) {
    playPromise.catch((err) => {
      // Browser autoplay policy prevented playback without gesture; arm unlocker
      setupAutoplayUnlocker();
    });
  }
  notifyListeners();
}

export function pauseCityBgm(): void {
  isCityBgmActive = false;
  if (cityAudioElement && !cityAudioElement.paused) {
    cityAudioElement.pause();
  }
  notifyListeners();
}

export function stopCityBgm(): void {
  isCityBgmActive = false;
  if (cityAudioElement) {
    cityAudioElement.pause();
    cityAudioElement.currentTime = 0;
  }
  notifyListeners();
}

export function resumeCityBgm(): void {
  if (isCityBgmActive) {
    playCityBgm();
  }
}

export function onAudioChange(cb: AudioCallback): () => void {
  listeners.add(cb);
  // Emit current state immediately
  try {
    cb({
      volume: getAudioVolume(),
      isMuted: isAudioMuted(),
      isPlayingCityBgm: isCityBgmActive && Boolean(cityAudioElement && !cityAudioElement.paused),
    });
  } catch {}
  return () => {
    listeners.delete(cb);
  };
}
