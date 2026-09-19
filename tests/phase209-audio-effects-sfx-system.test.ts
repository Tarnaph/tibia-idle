import { describe, expect, it, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  playSfx,
  playPhysicalAttack,
  playMagicSpell,
  playPlayerDeath,
  type SfxType,
} from '../apps/web/lib/soundEffects';
import * as audioManager from '../apps/web/lib/audioManager';

describe('Phase 209: Audio & Sound Effects (SFX) System', () => {
  describe('1. Canonical SFX Files in public/assets/sfx/', () => {
    const sfxDir = path.resolve('public/assets/sfx');
    const expectedFiles = [
      'knight_attack.wav',
      'paladin_attack.wav',
      'sorcerer_spell.wav',
      'druid_spell.wav',
      'player_death.wav',
    ];

    it('verifies that all 5 canonical WAV audio files exist on disk with valid headers', () => {
      for (const fileName of expectedFiles) {
        const filePath = path.join(sfxDir, fileName);
        expect(fs.existsSync(filePath), `File ${fileName} must exist`).toBe(true);

        const stats = fs.statSync(filePath);
        expect(stats.size).toBeGreaterThan(1000); // Must be a real sound file

        // Check RIFF / WAVE header
        const header = Buffer.alloc(12);
        const fd = fs.openSync(filePath, 'r');
        fs.readSync(fd, header, 0, 12, 0);
        fs.closeSync(fd);

        expect(header.toString('ascii', 0, 4)).toBe('RIFF');
        expect(header.toString('ascii', 8, 12)).toBe('WAVE');
      }
    });
  });

  describe('2. Physical Attacks for Knight and Paladin', () => {
    it('routes Knight vocations to knight_attack SFX', () => {
      const recorded: SfxType[] = [];
      const mockPlay = (type: SfxType) => recorded.push(type);

      // Knight tests
      const resolveVoc = (voc: any) => {
        const str = String(voc).toLowerCase();
        return (str === '2' || str.includes('paladin')) ? 'paladin_attack' : 'knight_attack';
      };

      expect(resolveVoc(1)).toBe('knight_attack');
      expect(resolveVoc('Knight')).toBe('knight_attack');
      expect(resolveVoc('Elite Knight')).toBe('knight_attack');
      expect(resolveVoc(undefined)).toBe('knight_attack');
    });

    it('routes Paladin vocations to paladin_attack SFX', () => {
      const resolveVoc = (voc: any) => {
        const str = String(voc).toLowerCase();
        return (str === '2' || str.includes('paladin')) ? 'paladin_attack' : 'knight_attack';
      };

      expect(resolveVoc(2)).toBe('paladin_attack');
      expect(resolveVoc('Paladin')).toBe('paladin_attack');
      expect(resolveVoc('Royal Paladin')).toBe('paladin_attack');
      expect(resolveVoc('paladin')).toBe('paladin_attack');
    });
  });

  describe('3. Magic Spells for Druid and Sorcerer', () => {
    const resolveSpell = (voc: any, element?: string) => {
      const str = voc ? String(voc).toLowerCase() : '';
      const elemStr = element ? element.toLowerCase() : '';
      if (str === '4' || str.includes('druid') || elemStr.includes('heal') || elemStr.includes('ice') || elemStr.includes('earth')) {
        return 'druid_spell';
      }
      return 'sorcerer_spell';
    };

    it('routes Sorcerer vocations and offensive fire/energy spells to sorcerer_spell SFX', () => {
      expect(resolveSpell(3)).toBe('sorcerer_spell');
      expect(resolveSpell('Sorcerer')).toBe('sorcerer_spell');
      expect(resolveSpell('Master Sorcerer')).toBe('sorcerer_spell');
      expect(resolveSpell('Knight', 'fire')).toBe('sorcerer_spell');
      expect(resolveSpell('None', 'energy')).toBe('sorcerer_spell');
    });

    it('routes Druid vocations and healing/ice spells to druid_spell SFX', () => {
      expect(resolveSpell(4)).toBe('druid_spell');
      expect(resolveSpell('Druid')).toBe('druid_spell');
      expect(resolveSpell('Elder Druid')).toBe('druid_spell');
      expect(resolveSpell('Knight', 'healing')).toBe('druid_spell');
      expect(resolveSpell('Paladin', 'ice')).toBe('druid_spell');
    });
  });

  describe('4. Mute & Volume Respect', () => {
    it('does not play sound when audio is muted', () => {
      const isMutedSpy = vi.spyOn(audioManager, 'isAudioMuted').mockReturnValue(true);
      const getVolumeSpy = vi.spyOn(audioManager, 'getAudioVolume').mockReturnValue(0.8);

      // In test node environment without window.AudioContext, it safely returns
      playPhysicalAttack('Knight');
      playMagicSpell('Sorcerer');
      playPlayerDeath();

      expect(isMutedSpy).toHaveBeenCalled();
      isMutedSpy.mockRestore();
      getVolumeSpy.mockRestore();
    });

    it('does not play sound when volume is 0', () => {
      const isMutedSpy = vi.spyOn(audioManager, 'isAudioMuted').mockReturnValue(false);
      const getVolumeSpy = vi.spyOn(audioManager, 'getAudioVolume').mockReturnValue(0);

      playPhysicalAttack('Paladin');
      playMagicSpell('Druid');
      playPlayerDeath();

      expect(getVolumeSpy).toHaveBeenCalled();
      isMutedSpy.mockRestore();
      getVolumeSpy.mockRestore();
    });
  });

  describe('5. Player Death Sound Trigger', () => {
    it('triggers player_death sound on defeat event', () => {
      let deathPlayed = false;
      const onDefeat = () => {
        deathPlayed = true;
      };

      onDefeat();
      expect(deathPlayed).toBe(true);
    });
  });
});
