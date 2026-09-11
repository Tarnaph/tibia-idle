import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  THAIS_LORE_CURIOSITIES,
  DRAGON_LAIR_LORE_CURIOSITIES,
  DEFAULT_HUNT_LOADING_CONFIG,
  HUNT_LOADING_CONFIGS,
  getLoadingConfigForHunt,
} from '../apps/web/lib/loadingConfig';
import { AMBIENT_THAIS_PLAYERS } from '../apps/web/lib/cityAmbientData';
import {
  isAudioAutoplayBlocked,
  unlockAudio,
  getAudioVolume,
  isAudioMuted,
} from '../apps/web/lib/audioManager';

describe('Phase 132: Resolução Definitiva de Background de Loading, BGM e Renderização de Thais', () => {
  const exuraComponentPath = path.resolve(__dirname, '../apps/web/components/ExuraLoadingScreen.tsx');
  const thaisCityArenaPath = path.resolve(__dirname, '../apps/web/components/ThaisCityArena.tsx');
  const audioManagerPath = path.resolve(__dirname, '../apps/web/lib/audioManager.ts');
  const layoutPath = path.resolve(__dirname, '../app/layout.tsx');

  describe('1. Desacoplamento de Configurações e Estabilidade do Fast Refresh', () => {
    it('isoles loading configuration and lore curiosities into loadingConfig.ts', () => {
      expect(Array.isArray(THAIS_LORE_CURIOSITIES)).toBe(true);
      expect(THAIS_LORE_CURIOSITIES.length).toBeGreaterThan(0);

      expect(Array.isArray(DRAGON_LAIR_LORE_CURIOSITIES)).toBe(true);
      expect(DRAGON_LAIR_LORE_CURIOSITIES.length).toBeGreaterThan(0);

      expect(DEFAULT_HUNT_LOADING_CONFIG.bgImage).toBe('/images/loading/thais-loading.jpg');
      expect(HUNT_LOADING_CONFIGS['dragon-lair'].bgImage).toBe('/images/loading/dragon-lair-loading.jpg');

      expect(getLoadingConfigForHunt()).toEqual(DEFAULT_HUNT_LOADING_CONFIG);
      expect(getLoadingConfigForHunt('unknown-hunt')).toEqual(DEFAULT_HUNT_LOADING_CONFIG);
      expect(getLoadingConfigForHunt('dragon-lair')).toEqual(HUNT_LOADING_CONFIGS['dragon-lair']);
    });

    it('isoles ambient city players data into cityAmbientData.ts', () => {
      expect(Array.isArray(AMBIENT_THAIS_PLAYERS)).toBe(true);
    });
  });

  describe('2. Garantia de Renderização e Preload da Tela de Loading', () => {
    it('includes preload link in app/layout.tsx for immediate browser cache priming', () => {
      const layoutCode = fs.readFileSync(layoutPath, 'utf8');
      expect(layoutCode).toContain('rel="preload"');
      expect(layoutCode).toContain('/images/loading/thais-loading.jpg');
      expect(layoutCode).toContain('as="image"');
    });

    it('implements double background guarantee in ExuraLoadingScreen (CSS background + eager <img>)', () => {
      const code = fs.readFileSync(exuraComponentPath, 'utf8');

      expect(code).toContain('backgroundImage: `url(${bgImage || \'/images/loading/thais-loading.jpg\'})`');
      expect(code).toContain('backgroundSize: \'cover\'');
      expect(code).toContain('loading="eager"');
      expect(code).toContain('decoding="sync"');
      expect(code).toContain('/images/loading/loading-bg.jpg');
    });

    it('provides user interaction unlock prompt and click listener in ExuraLoadingScreen', () => {
      const code = fs.readFileSync(exuraComponentPath, 'utf8');

      expect(code).toContain('unlockAudio()');
      expect(code).toContain('onAutoplayBlockedChange');
      expect(code).toContain('autoplayBlocked');
      expect(code).toContain('Clique em qualquer lugar para ativar a música de Thais');
    });
  });

  describe('3. Robustez de Áudio e Desbloqueio Intuitivo de Autoplay', () => {
    it('implements multi-event global interaction unlocker in audioManager', () => {
      const code = fs.readFileSync(audioManagerPath, 'utf8');

      expect(code).toContain("'pointerdown', 'mousedown', 'click', 'keydown', 'touchstart'");
      expect(code).toContain('isAudioAutoplayBlocked');
      expect(code).toContain('onAutoplayBlockedChange');
      expect(code).toContain('unlockAudio');
    });

    it('verifies audio state helpers respond correctly in node environment', async () => {
      expect(typeof getAudioVolume()).toBe('number');
      expect(typeof isAudioMuted()).toBe('boolean');
      expect(isAudioAutoplayBlocked()).toBe(false);

      const unlocked = await unlockAudio();
      expect(typeof unlocked).toBe('boolean');
    });
  });

  describe('4. Renderização 100% Garantida dos Tiles de Thais sem Bloqueio de Rede', () => {
    it('preloads immediate spawn viewport textures (distance <= 16 tiles) as priority assets', () => {
      const code = fs.readFileSync(thaisCityArenaPath, 'utf8');

      expect(code).toContain('spawnViewportUrls');
      expect(code).toContain('(urlDistances.get(u) ?? 9999) <= 16');
      expect(code).toContain('...spawnViewportUrls');
    });

    it('paces background loading into nearby streets, background assets, and distant outskirts', () => {
      const code = fs.readFileSync(thaisCityArenaPath, 'utf8');

      expect(code).toContain('nearbyStreetsUrls');
      expect(code).toContain('distantThaisMapUrls');
      expect(code).toContain('delayBetweenChunksMs');
    });

    it('applies defaultFloorTexture fallback for ground tiles to prevent black void', () => {
      const code = fs.readFileSync(thaisCityArenaPath, 'utf8');

      expect(code).toContain('const defaultFloorTexture = loaded[floorUrl] || Texture.EMPTY;');
      expect(code).toContain('new Sprite(loaded[frameToUse.publicUrl] || defaultFloorTexture);');
      expect(code).toContain('new Sprite(loaded[isWalkable ? floorUrl : wallUrl] || defaultFloorTexture);');
    });
  });
});
