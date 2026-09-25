import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  HUNT_MUSIC_TRACKS,
  getTrackForHunt,
  playHuntBgm,
  pauseHuntBgm,
  stopHuntBgm,
  playCityBgm,
  playDragonLairBgm,
  onTrackNotification,
  triggerTrackNotification,
  THAIS_THEME_TRACK,
  DRAGONS_PRIDE_TRACK,
  RATS_THEME_TRACK,
  TROLLS_THEME_TRACK,
  ROTWORMS_THEME_TRACK,
  SKELETONS_THEME_TRACK,
  SPIDERS_THEME_TRACK,
} from '../apps/web/lib/audioManager';

describe('Phase 185 - Hunt Music by Suffix, Character Selection Video & Dynamic BGM', () => {
  const songsDir = path.resolve(__dirname, '../songs');
  const publicSongsDir = path.resolve(__dirname, '../public/songs');
  const publicVideoPath = path.resolve(__dirname, '../public/songtibia.webm');
  const gamePrototypePath = path.resolve(__dirname, '../apps/web/components/GamePrototype.tsx');
  const authModalPath = path.resolve(__dirname, '../apps/web/components/auth/TibiaAuthCharacterModal.tsx');

  const expectedTracks = [
    {
      file: 'Beneath the Streets - Rats.mp3',
      kebab: 'beneath-the-streets-rats.mp3',
      huntId: 'rat-cellars',
      title: 'Beneath the Streets',
    },
    {
      file: 'Drums Under Stone - Trolls.mp3',
      kebab: 'drums-under-stone-trolls.mp3',
      huntId: 'troll-camp',
      title: 'Drums Under Stone',
    },
    {
      file: 'Underfoot - Rotworms.mp3',
      kebab: 'underfoot-rotworms.mp3',
      huntId: 'rotworm-cave',
      title: 'Underfoot',
    },
    {
      file: 'The Dead Remember - Skeletons.mp3',
      kebab: 'the-dead-remember-skeletons.mp3',
      huntId: 'old-crypt',
      title: 'The Dead Remember',
    },
    {
      file: 'Threads in the Dark - Spiders.mp3',
      kebab: 'threads-in-the-dark-spiders.mp3',
      huntId: 'spider-burrow',
      title: 'Threads in the Dark',
    },
    {
      file: 'Dragons pride.mp3',
      kebab: 'dragons-pride.mp3',
      huntId: 'dragon-lair',
      title: 'Dragons Pride',
    },
    {
      file: 'Sunset in the Village.mp3',
      kebab: 'sunset-in-the-village.mp3',
      huntId: 'city',
      title: 'Thais Theme',
    },
    {
      file: 'Hammer Below - Cyclops.mp3',
      kebab: 'hammer-below-cyclops.mp3',
      huntId: 'cyclops-camp',
      title: 'Hammer Below',
    },
    {
      file: 'Whispers Among the Leaves - Elfs.mp3',
      kebab: 'whispers-among-the-leaves-elfs.mp3',
      huntId: 'elf-sanctuary',
      title: 'Whispers Among the Leaves',
    },
  ];

  it('verifies all 7 audio files and video exist in songs/ and public/', () => {
    expect(fs.existsSync(publicVideoPath), 'public/songtibia.webm exists').toBe(true);
    const videoStat = fs.statSync(publicVideoPath);
    expect(videoStat.size).toBeGreaterThan(100_000_000); // ~140.5MB

    for (const track of expectedTracks) {
      const sourcePath = path.join(songsDir, track.file);
      expect(fs.existsSync(sourcePath), `Source exists: ${track.file}`).toBe(true);

      const publicKebabPath = path.join(publicSongsDir, track.kebab);
      expect(fs.existsSync(publicKebabPath), `Public kebab exists: ${track.kebab}`).toBe(true);

      const publicExactPath = path.join(publicSongsDir, track.file);
      expect(fs.existsSync(publicExactPath), `Public exact exists: ${track.file}`).toBe(true);
    }
  });

  it('verifies HUNT_MUSIC_TRACKS maps each hunt to its respective song track', () => {
    expect(HUNT_MUSIC_TRACKS['rat-cellars'].title).toBe('Beneath the Streets');
    expect(HUNT_MUSIC_TRACKS['rat-cellars'].url).toBe('/songs/beneath-the-streets-rats.mp3');

    expect(HUNT_MUSIC_TRACKS['troll-camp'].title).toBe('Drums Under Stone');
    expect(HUNT_MUSIC_TRACKS['troll-camp'].url).toBe('/songs/drums-under-stone-trolls.mp3');

    expect(HUNT_MUSIC_TRACKS['rotworm-cave'].title).toBe('Underfoot');
    expect(HUNT_MUSIC_TRACKS['rotworm-cave'].url).toBe('/songs/underfoot-rotworms.mp3');

    expect(HUNT_MUSIC_TRACKS['old-crypt'].title).toBe('The Dead Remember');
    expect(HUNT_MUSIC_TRACKS['old-crypt'].url).toBe('/songs/the-dead-remember-skeletons.mp3');

    expect(HUNT_MUSIC_TRACKS['spider-burrow'].title).toBe('Threads in the Dark');
    expect(HUNT_MUSIC_TRACKS['spider-burrow'].url).toBe('/songs/threads-in-the-dark-spiders.mp3');

    expect(HUNT_MUSIC_TRACKS['dragon-lair'].title).toBe('Dragons Pride');
    expect(HUNT_MUSIC_TRACKS['dragon-lair'].url).toBe('/songs/dragons-pride.mp3');
  });

  it('verifies getTrackForHunt resolves canonical IDs and aliases safely', () => {
    // Canonical IDs
    expect(getTrackForHunt('rat-cellars')?.id).toBe('rat-cellars');
    expect(getTrackForHunt('troll-camp')?.id).toBe('troll-camp');
    expect(getTrackForHunt('rotworm-cave')?.id).toBe('rotworm-cave');
    expect(getTrackForHunt('old-crypt')?.id).toBe('old-crypt');
    expect(getTrackForHunt('spider-burrow')?.id).toBe('spider-burrow');
    expect(getTrackForHunt('dragon-lair')?.id).toBe('dragons-pride');

    // Aliases
    expect(getTrackForHunt('rats')?.title).toBe('Beneath the Streets');
    expect(getTrackForHunt('trolls')?.title).toBe('Drums Under Stone');
    expect(getTrackForHunt('rotworms')?.title).toBe('Underfoot');
    expect(getTrackForHunt('skeletons')?.title).toBe('The Dead Remember');
    expect(getTrackForHunt('spiders')?.title).toBe('Threads in the Dark');
    expect(getTrackForHunt('dragons')?.title).toBe('Dragons Pride');

    // Unknown returns null
    expect(getTrackForHunt('non-existent-hunt')).toBeNull();
  });

  it('verifies audioManager methods execute without error in test environment', () => {
    expect(() => playHuntBgm('rat-cellars')).not.toThrow();
    expect(() => playHuntBgm('troll-camp')).not.toThrow();
    expect(() => playHuntBgm('rotworm-cave')).not.toThrow();
    expect(() => playHuntBgm('old-crypt')).not.toThrow();
    expect(() => playHuntBgm('spider-burrow')).not.toThrow();
    expect(() => playHuntBgm('dragon-lair')).not.toThrow();
    expect(() => pauseHuntBgm()).not.toThrow();
    expect(() => stopHuntBgm()).not.toThrow();
    expect(() => playDragonLairBgm()).not.toThrow();
    expect(() => playCityBgm()).not.toThrow();
  });

  it('verifies onTrackNotification receives correct track notifications', () => {
    const received: string[] = [];
    const unsub = onTrackNotification((t) => {
      received.push(t.title);
    });

    triggerTrackNotification(RATS_THEME_TRACK);
    triggerTrackNotification(TROLLS_THEME_TRACK);
    triggerTrackNotification(ROTWORMS_THEME_TRACK);
    triggerTrackNotification(SKELETONS_THEME_TRACK);
    triggerTrackNotification(SPIDERS_THEME_TRACK);
    triggerTrackNotification(DRAGONS_PRIDE_TRACK);
    triggerTrackNotification(THAIS_THEME_TRACK);

    expect(received).toEqual([
      'Beneath the Streets',
      'Drums Under Stone',
      'Underfoot',
      'The Dead Remember',
      'Threads in the Dark',
      'Dragons Pride',
      'Thais Theme',
    ]);

    unsub();
  });

  it('verifies GamePrototype.tsx integrates playHuntBgm and stopHuntBgm', () => {
    const code = fs.readFileSync(gamePrototypePath, 'utf8');

    expect(code).toContain('playHuntBgm');
    expect(code).toContain('stopHuntBgm');
    expect(code).toContain('getTrackForHunt');
    expect(code).toContain('playHuntBgm(data.huntId)');
    expect(code).toContain('playHuntBgm(huntId)');
    expect(code).toContain('playHuntBgm(currentHuntId)');
  });

  it('verifies TibiaAuthCharacterModal.tsx renders BardChromaVideo with /songtibia.webm', () => {
    const code = fs.readFileSync(authModalPath, 'utf8');

    expect(code).toContain('src="/songtibia.webm"');
    expect(code).toContain('BardChromaVideo');
    expect(code).toContain('preload="auto"');
  });
});
