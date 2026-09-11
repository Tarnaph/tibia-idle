'use client';

const STORAGE_KEY_VOLUME = 'tibia_audio_volume';
const STORAGE_KEY_MUTED = 'tibia_audio_muted';
const DEFAULT_VOLUME = 0.5; // 50%
const CITY_SONG_URL = '/songs/sunset-in-the-village.mp3';
const DRAGON_LAIR_SONG_URL = '/songs/dragons-pride.mp3';

export interface AudioState {
  volume: number; // 0.0 to 1.0
  isMuted: boolean;
  isPlayingCityBgm: boolean;
  isPlayingDragonBgm?: boolean;
}

export interface MusicTrackInfo {
  id: string;
  title: string;
  subtitle?: string;
  location?: string;
}

export const THAIS_THEME_TRACK: MusicTrackInfo = {
  id: 'thais-theme',
  title: 'Thais Theme',
  subtitle: 'Sunset in the Village',
  location: 'Cidade de Thais',
};

export const DRAGONS_PRIDE_TRACK: MusicTrackInfo = {
  id: 'dragons-pride',
  title: 'Dragons Pride',
  subtitle: "Dragon's Lair",
  location: 'Profundezas Chamuscadas',
};

type AudioCallback = (state: AudioState) => void;
type TrackNotificationCallback = (track: MusicTrackInfo) => void;

const listeners = new Set<AudioCallback>();
const trackNotificationListeners = new Set<TrackNotificationCallback>();

let cachedVolume: number | null = null;
let cachedMuted: boolean | null = null;
let cityAudioElement: HTMLAudioElement | null = null;
let dragonAudioElement: HTMLAudioElement | null = null;
let isCityBgmActive = false;
let isDragonBgmActive = false;
let unlockerAttached = false;
let currentTrack: MusicTrackInfo | null = null;

export function onTrackNotification(cb: TrackNotificationCallback): () => void {
  trackNotificationListeners.add(cb);
  return () => {
    trackNotificationListeners.delete(cb);
  };
}

export function triggerTrackNotification(track: MusicTrackInfo = THAIS_THEME_TRACK): void {
  currentTrack = track;
  trackNotificationListeners.forEach((cb) => {
    try {
      cb(track);
    } catch (e) {
      console.error('[audioManager] Track notification callback error:', e);
    }
  });
}

export function getCurrentTrack(): MusicTrackInfo | null {
  return currentTrack;
}

function notifyListeners(): void {
  const state: AudioState = {
    volume: getAudioVolume(),
    isMuted: isAudioMuted(),
    isPlayingCityBgm: isCityBgmActive && Boolean(cityAudioElement && !cityAudioElement.paused),
    isPlayingDragonBgm: isDragonBgmActive && Boolean(dragonAudioElement && !dragonAudioElement.paused),
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
  const effectiveVol = isAudioMuted() ? 0 : clamped;
  if (cityAudioElement) {
    cityAudioElement.volume = effectiveVol;
  }
  if (dragonAudioElement) {
    dragonAudioElement.volume = effectiveVol;
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
  const effectiveVol = cachedMuted ? 0 : getAudioVolume();
  if (cityAudioElement) {
    cityAudioElement.volume = effectiveVol;
  }
  if (dragonAudioElement) {
    dragonAudioElement.volume = effectiveVol;
  }
  notifyListeners();
  if (!cachedMuted) {
    if (isCityBgmActive) {
      triggerTrackNotification(THAIS_THEME_TRACK);
    } else if (isDragonBgmActive) {
      triggerTrackNotification(DRAGONS_PRIDE_TRACK);
    }
  }
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

function getOrCreateDragonAudio(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  if (!dragonAudioElement) {
    dragonAudioElement = new Audio(DRAGON_LAIR_SONG_URL);
    dragonAudioElement.loop = true;
    dragonAudioElement.preload = 'auto';
    dragonAudioElement.volume = isAudioMuted() ? 0 : getAudioVolume();
    dragonAudioElement.addEventListener('play', () => notifyListeners());
    dragonAudioElement.addEventListener('pause', () => notifyListeners());
    dragonAudioElement.addEventListener('ended', () => notifyListeners());
  }
  return dragonAudioElement;
}

let isAutoplayBlocked = false;
type AutoplayBlockedCallback = (blocked: boolean) => void;
const autoplayBlockedListeners = new Set<AutoplayBlockedCallback>();

export function isAudioAutoplayBlocked(): boolean {
  return isAutoplayBlocked;
}

export function onAutoplayBlockedChange(cb: AutoplayBlockedCallback): () => void {
  autoplayBlockedListeners.add(cb);
  cb(isAutoplayBlocked);
  return () => {
    autoplayBlockedListeners.delete(cb);
  };
}

function notifyAutoplayBlocked(blocked: boolean): void {
  isAutoplayBlocked = blocked;
  autoplayBlockedListeners.forEach((cb) => {
    try {
      cb(blocked);
    } catch (e) {
      console.error('[audioManager] AutoplayBlocked listener error:', e);
    }
  });
}

/**
 * Autoplay unlocker: If browser rejects play() due to lack of prior user gesture,
 * this sets interaction listeners across window & document to immediately resume playback upon click/key/touch.
 */
const INTERACTION_EVENTS = ['pointerdown', 'mousedown', 'click', 'keydown', 'touchstart'] as const;

function detachUnlocker(): void {
  if (typeof window === 'undefined') return;
  INTERACTION_EVENTS.forEach((evt) => {
    window.removeEventListener(evt, handleGlobalInteraction, true);
    document.removeEventListener(evt, handleGlobalInteraction, true);
  });
  unlockerAttached = false;
}

const handleGlobalInteraction = async () => {
  let playSuccess = false;
  if (isCityBgmActive && cityAudioElement) {
    try {
      await cityAudioElement.play();
      playSuccess = true;
    } catch {}
  }
  if (isDragonBgmActive && dragonAudioElement) {
    try {
      await dragonAudioElement.play();
      playSuccess = true;
    } catch {}
  }
  if (playSuccess) {
    notifyAutoplayBlocked(false);
    detachUnlocker();
  }
};

function setupAutoplayUnlocker(): void {
  if (typeof window === 'undefined' || unlockerAttached) return;
  unlockerAttached = true;
  notifyAutoplayBlocked(true);

  INTERACTION_EVENTS.forEach((evt) => {
    window.addEventListener(evt, handleGlobalInteraction, { capture: true, passive: true });
    document.addEventListener(evt, handleGlobalInteraction, { capture: true, passive: true });
  });
}

/**
 * Explicit audio unlock function that can be triggered by any user click in the UI.
 */
export async function unlockAudio(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  let success = false;
  if (isCityBgmActive && cityAudioElement) {
    try {
      await cityAudioElement.play();
      success = true;
    } catch {}
  }
  if (isDragonBgmActive && dragonAudioElement) {
    try {
      await dragonAudioElement.play();
      success = true;
    } catch {}
  }
  if (success) {
    notifyAutoplayBlocked(false);
    detachUnlocker();
  }
  return success;
}

export function playCityBgm(): void {
  if (typeof window === 'undefined') return;
  // Stop Dragon Lair BGM so songs don't collide
  isDragonBgmActive = false;
  if (dragonAudioElement && !dragonAudioElement.paused) {
    dragonAudioElement.pause();
    dragonAudioElement.currentTime = 0;
  }

  isCityBgmActive = true;
  triggerTrackNotification(THAIS_THEME_TRACK);

  const audio = getOrCreateCityAudio();
  if (!audio) return;

  audio.volume = isAudioMuted() ? 0 : getAudioVolume();
  audio.loop = true;

  const playPromise = audio.play();
  if (playPromise !== undefined) {
    playPromise
      .then(() => {
        notifyAutoplayBlocked(false);
        detachUnlocker();
      })
      .catch((err) => {
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

export function playDragonLairBgm(): void {
  if (typeof window === 'undefined') return;
  // Pause city BGM so it doesn't overlap
  isCityBgmActive = false;
  if (cityAudioElement && !cityAudioElement.paused) {
    cityAudioElement.pause();
  }

  isDragonBgmActive = true;
  currentTrack = DRAGONS_PRIDE_TRACK;

  const audio = getOrCreateDragonAudio();
  if (!audio) return;

  audio.volume = isAudioMuted() ? 0 : getAudioVolume();
  audio.loop = true;

  const playPromise = audio.play();
  if (playPromise !== undefined) {
    playPromise.catch(() => {
      // Browser autoplay policy prevented playback without gesture; arm unlocker
      setupAutoplayUnlocker();
    });
  }
  notifyListeners();
}

export function pauseDragonLairBgm(): void {
  isDragonBgmActive = false;
  if (dragonAudioElement && !dragonAudioElement.paused) {
    dragonAudioElement.pause();
  }
  notifyListeners();
}

export function stopDragonLairBgm(): void {
  isDragonBgmActive = false;
  if (dragonAudioElement) {
    dragonAudioElement.pause();
    dragonAudioElement.currentTime = 0;
  }
  notifyListeners();
}

export function stopAllAudio(): void {
  stopCityBgm();
  stopDragonLairBgm();
}

export function onAudioChange(cb: AudioCallback): () => void {
  listeners.add(cb);
  // Emit current state immediately
  try {
    cb({
      volume: getAudioVolume(),
      isMuted: isAudioMuted(),
      isPlayingCityBgm: isCityBgmActive && Boolean(cityAudioElement && !cityAudioElement.paused),
      isPlayingDragonBgm: isDragonBgmActive && Boolean(dragonAudioElement && !dragonAudioElement.paused),
    });
  } catch {}
  return () => {
    listeners.delete(cb);
  };
}
