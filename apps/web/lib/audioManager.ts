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
  isPlayingHuntBgm?: boolean;
  currentTrack?: MusicTrackInfo | null;
}

export interface MusicTrackInfo {
  id: string;
  title: string;
  subtitle?: string;
  location?: string;
  url?: string;
}

export const THAIS_THEME_TRACK: MusicTrackInfo = {
  id: 'thais-theme',
  title: 'Thais Theme',
  subtitle: 'Sunset in the Village',
  location: 'Cidade de Thais',
  url: CITY_SONG_URL,
};

export const DRAGONS_PRIDE_TRACK: MusicTrackInfo = {
  id: 'dragons-pride',
  title: 'Dragons Pride',
  subtitle: "Dragon's Lair",
  location: 'Profundezas Chamuscadas',
  url: DRAGON_LAIR_SONG_URL,
};

export const RATS_THEME_TRACK: MusicTrackInfo & { url: string } = {
  id: 'rat-cellars',
  title: 'Beneath the Streets',
  subtitle: 'Rat Cellars',
  location: 'Porões Infestados',
  url: '/songs/beneath-the-streets-rats.mp3',
};

export const TROLLS_THEME_TRACK: MusicTrackInfo & { url: string } = {
  id: 'troll-camp',
  title: 'Drums Under Stone',
  subtitle: 'Troll Camp',
  location: 'Covil dos Trolls',
  url: '/songs/drums-under-stone-trolls.mp3',
};

export const ROTWORMS_THEME_TRACK: MusicTrackInfo & { url: string } = {
  id: 'rotworm-cave',
  title: 'Underfoot',
  subtitle: 'Rotworm Cave',
  location: 'Túneis Escavados',
  url: '/songs/underfoot-rotworms.mp3',
};

export const SKELETONS_THEME_TRACK: MusicTrackInfo & { url: string } = {
  id: 'old-crypt',
  title: 'The Dead Remember',
  subtitle: 'Old Crypt',
  location: 'Cripta Inquieta',
  url: '/songs/the-dead-remember-skeletons.mp3',
};

export const SPIDERS_THEME_TRACK: MusicTrackInfo & { url: string } = {
  id: 'spider-burrow',
  title: 'Threads in the Dark',
  subtitle: 'Spider Burrow',
  location: 'Toca Enredada',
  url: '/songs/threads-in-the-dark-spiders.mp3',
};

export const CYCLOPS_THEME_TRACK: MusicTrackInfo & { url: string } = {
  id: 'cyclops-camp',
  title: 'Giants of the Stone',
  subtitle: 'Cyclops Camp',
  location: 'Planalto dos Ciclopes',
  url: '/songs/drums-under-stone-trolls.mp3',
};

export const ELFS_THEME_TRACK: MusicTrackInfo & { url: string } = {
  id: 'elf-sanctuary',
  title: 'Whispering Leaves',
  subtitle: 'Elf Sanctuary',
  location: 'Santuário dos Elfos',
  url: '/songs/sunset-in-the-village.mp3',
};

export const HUNT_MUSIC_TRACKS: Record<string, MusicTrackInfo & { url: string }> = {
  // Rats
  'rat-cellars': RATS_THEME_TRACK,
  'rats': RATS_THEME_TRACK,
  'rat': RATS_THEME_TRACK,

  // Spiders
  'spider-burrow': SPIDERS_THEME_TRACK,
  'spider-lair': SPIDERS_THEME_TRACK,
  'spiders': SPIDERS_THEME_TRACK,
  'spider': SPIDERS_THEME_TRACK,

  // Trolls
  'troll-camp': TROLLS_THEME_TRACK,
  'troll-caves': TROLLS_THEME_TRACK,
  'trolls': TROLLS_THEME_TRACK,
  'troll': TROLLS_THEME_TRACK,

  // Skeletons
  'old-crypt': SKELETONS_THEME_TRACK,
  'skeleton-crypt': SKELETONS_THEME_TRACK,
  'skeletons': SKELETONS_THEME_TRACK,
  'skeleton': SKELETONS_THEME_TRACK,

  // Rotworms
  'rotworm-cave': ROTWORMS_THEME_TRACK,
  'rotworm-mines': ROTWORMS_THEME_TRACK,
  'rotworms': ROTWORMS_THEME_TRACK,
  'rotworm': ROTWORMS_THEME_TRACK,

  // Cyclops
  'cyclops-camp': CYCLOPS_THEME_TRACK,
  'cyclops': CYCLOPS_THEME_TRACK,

  // Elfs
  'elf-sanctuary': ELFS_THEME_TRACK,
  'elf': ELFS_THEME_TRACK,
  'elfs': ELFS_THEME_TRACK,
  'elves': ELFS_THEME_TRACK,

  // Dragons
  'dragon-lair': { ...DRAGONS_PRIDE_TRACK, url: DRAGON_LAIR_SONG_URL },
  'dragons-pride': { ...DRAGONS_PRIDE_TRACK, url: DRAGON_LAIR_SONG_URL },
  'dragons': { ...DRAGONS_PRIDE_TRACK, url: DRAGON_LAIR_SONG_URL },
  'dragon': { ...DRAGONS_PRIDE_TRACK, url: DRAGON_LAIR_SONG_URL },
};

export function getTrackForHunt(huntId: string): (MusicTrackInfo & { url: string }) | null {
  if (!huntId) return null;
  const normalized = huntId.toLowerCase().trim();
  if (HUNT_MUSIC_TRACKS[normalized]) return HUNT_MUSIC_TRACKS[normalized];
  for (const [key, track] of Object.entries(HUNT_MUSIC_TRACKS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return track;
    }
  }
  return null;
}

type AudioCallback = (state: AudioState) => void;
type TrackNotificationCallback = (track: MusicTrackInfo) => void;

const listeners = new Set<AudioCallback>();
const trackNotificationListeners = new Set<TrackNotificationCallback>();

let cachedVolume: number | null = null;
let cachedMuted: boolean | null = null;
let cityAudioElement: HTMLAudioElement | null = null;
let dragonAudioElement: HTMLAudioElement | null = null;
let currentHuntAudioElement: HTMLAudioElement | null = null;
let currentHuntTrack: (MusicTrackInfo & { url: string }) | null = null;

const audioPool = new Map<string, HTMLAudioElement>();

let isCityBgmActive = false;
let isDragonBgmActive = false;
let isHuntBgmActive = false;
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
    isPlayingDragonBgm: (isDragonBgmActive || (isHuntBgmActive && currentHuntTrack?.id === 'dragons-pride')) && Boolean((dragonAudioElement && !dragonAudioElement.paused) || (currentHuntAudioElement && !currentHuntAudioElement.paused && currentHuntTrack?.id === 'dragons-pride')),
    isPlayingHuntBgm: isHuntBgmActive && Boolean(currentHuntAudioElement && !currentHuntAudioElement.paused),
    currentTrack,
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
  if (currentHuntAudioElement) {
    currentHuntAudioElement.volume = effectiveVol;
  }
  audioPool.forEach((audio) => {
    audio.volume = effectiveVol;
  });
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
  if (currentHuntAudioElement) {
    currentHuntAudioElement.volume = effectiveVol;
  }
  audioPool.forEach((audio) => {
    audio.volume = effectiveVol;
  });
  notifyListeners();
  if (!cachedMuted) {
    if (isCityBgmActive) {
      triggerTrackNotification(THAIS_THEME_TRACK);
    } else if (isDragonBgmActive) {
      triggerTrackNotification(DRAGONS_PRIDE_TRACK);
    } else if (isHuntBgmActive && currentHuntTrack) {
      triggerTrackNotification(currentHuntTrack);
    }
  }
}

export function toggleAudioMuted(): boolean {
  const next = !isAudioMuted();
  setAudioMuted(next);
  return next;
}

function getOrCreateAudio(url: string): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  let audio = audioPool.get(url);
  if (!audio) {
    audio = new Audio(url);
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = isAudioMuted() ? 0 : getAudioVolume();
    audio.addEventListener('play', () => notifyListeners());
    audio.addEventListener('pause', () => notifyListeners());
    audio.addEventListener('ended', () => notifyListeners());
    audioPool.set(url, audio);
  }
  return audio;
}

function getOrCreateCityAudio(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  if (!cityAudioElement) {
    cityAudioElement = getOrCreateAudio(CITY_SONG_URL);
  }
  return cityAudioElement;
}

function getOrCreateDragonAudio(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  if (!dragonAudioElement) {
    dragonAudioElement = getOrCreateAudio(DRAGON_LAIR_SONG_URL);
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
  if (isHuntBgmActive && currentHuntAudioElement) {
    try {
      await currentHuntAudioElement.play();
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
  if (isHuntBgmActive && currentHuntAudioElement) {
    try {
      await currentHuntAudioElement.play();
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

  // Stop hunt / Dragon Lair BGM so songs don't collide
  isDragonBgmActive = false;
  isHuntBgmActive = false;
  if (dragonAudioElement && !dragonAudioElement.paused) {
    dragonAudioElement.pause();
    dragonAudioElement.currentTime = 0;
  }
  if (currentHuntAudioElement && !currentHuntAudioElement.paused) {
    currentHuntAudioElement.pause();
    currentHuntAudioElement.currentTime = 0;
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
      .catch(() => {
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

export function playHuntBgm(huntId: string): void {
  if (typeof window === 'undefined') return;

  // Pause city BGM so it doesn't overlap
  pauseCityBgm();

  const track = getTrackForHunt(huntId);
  if (!track) {
    console.warn(`[audioManager] No track found for hunt: ${huntId}`);
    return;
  }

  // If already playing this exact hunt track, do nothing
  if (isHuntBgmActive && currentHuntTrack?.id === track.id && currentHuntAudioElement && !currentHuntAudioElement.paused) {
    return;
  }

  // Stop previous hunt audio
  if (currentHuntAudioElement && (!currentHuntTrack || currentHuntTrack.id !== track.id)) {
    currentHuntAudioElement.pause();
    currentHuntAudioElement.currentTime = 0;
  }

  // If switching to dragon-lair, synchronize dragonAudioElement
  if (track.id === 'dragons-pride' || huntId === 'dragon-lair') {
    isDragonBgmActive = true;
  } else {
    isDragonBgmActive = false;
    if (dragonAudioElement && !dragonAudioElement.paused) {
      dragonAudioElement.pause();
      dragonAudioElement.currentTime = 0;
    }
  }

  isHuntBgmActive = true;
  currentHuntTrack = track;
  currentTrack = track;

  const audio = getOrCreateAudio(track.url);
  if (!audio) return;
  currentHuntAudioElement = audio;

  audio.volume = isAudioMuted() ? 0 : getAudioVolume();
  audio.loop = true;

  const playPromise = audio.play();
  if (playPromise !== undefined) {
    playPromise
      .then(() => {
        notifyAutoplayBlocked(false);
        detachUnlocker();
      })
      .catch(() => {
        setupAutoplayUnlocker();
      });
  }
  notifyListeners();
}

export function pauseHuntBgm(): void {
  isHuntBgmActive = false;
  if (currentHuntAudioElement && !currentHuntAudioElement.paused) {
    currentHuntAudioElement.pause();
  }
  notifyListeners();
}

export function stopHuntBgm(): void {
  isHuntBgmActive = false;
  if (currentHuntAudioElement) {
    currentHuntAudioElement.pause();
    currentHuntAudioElement.currentTime = 0;
  }
  currentHuntTrack = null;
  notifyListeners();
}

export function playDragonLairBgm(): void {
  if (typeof window === 'undefined') return;
  // Forward to playHuntBgm with 'dragon-lair'
  playHuntBgm('dragon-lair');
}

export function pauseDragonLairBgm(): void {
  isDragonBgmActive = false;
  if (dragonAudioElement && !dragonAudioElement.paused) {
    dragonAudioElement.pause();
  }
  if (currentHuntAudioElement && currentHuntTrack?.id === 'dragons-pride' && !currentHuntAudioElement.paused) {
    currentHuntAudioElement.pause();
  }
  notifyListeners();
}

export function stopDragonLairBgm(): void {
  isDragonBgmActive = false;
  if (dragonAudioElement) {
    dragonAudioElement.pause();
    dragonAudioElement.currentTime = 0;
  }
  if (currentHuntAudioElement && currentHuntTrack?.id === 'dragons-pride') {
    currentHuntAudioElement.pause();
    currentHuntAudioElement.currentTime = 0;
  }
  notifyListeners();
}

export function stopAllAudio(): void {
  stopCityBgm();
  stopDragonLairBgm();
  stopHuntBgm();
  audioPool.forEach((audio) => {
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch {}
  });
}

export function onAudioChange(cb: AudioCallback): () => void {
  listeners.add(cb);
  try {
    cb({
      volume: getAudioVolume(),
      isMuted: isAudioMuted(),
      isPlayingCityBgm: isCityBgmActive && Boolean(cityAudioElement && !cityAudioElement.paused),
      isPlayingDragonBgm: (isDragonBgmActive || (isHuntBgmActive && currentHuntTrack?.id === 'dragons-pride')) && Boolean((dragonAudioElement && !dragonAudioElement.paused) || (currentHuntAudioElement && !currentHuntAudioElement.paused && currentHuntTrack?.id === 'dragons-pride')),
      isPlayingHuntBgm: isHuntBgmActive && Boolean(currentHuntAudioElement && !currentHuntAudioElement.paused),
      currentTrack,
    });
  } catch {}
  return () => {
    listeners.delete(cb);
  };
}
