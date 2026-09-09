import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  ExuraLoadingScreen,
  DRAGON_LAIR_LORE_CURIOSITIES,
  THAIS_LORE_CURIOSITIES,
  HUNT_LOADING_CONFIGS,
  DEFAULT_HUNT_LOADING_CONFIG,
  getLoadingConfigForHunt,
} from '../apps/web/components/ExuraLoadingScreen';

describe('Phase 111: Dragon Lair Loading Screen & Modular Hunt Curiosities', () => {
  const loadingDir = path.resolve(__dirname, '../public/images/loading');
  const dragonBgPath = path.join(loadingDir, 'dragon-lair-loading.jpg');
  const thaisBgPath = path.join(loadingDir, 'thais-loading.jpg');
  const gamePrototypePath = path.resolve(__dirname, '../apps/web/components/GamePrototype.tsx');
  const exuraComponentPath = path.resolve(__dirname, '../apps/web/components/ExuraLoadingScreen.tsx');

  describe('Pillar 1: Loading Asset Verification', () => {
    it('verifies dragon-lair-loading.jpg exists and has substantial image size (>50KB)', () => {
      expect(fs.existsSync(dragonBgPath)).toBe(true);
      const stats = fs.statSync(dragonBgPath);
      expect(stats.size).toBeGreaterThan(50 * 1024);
    });

    it('verifies thais-loading.jpg exists as default fallback asset (>50KB)', () => {
      expect(fs.existsSync(thaisBgPath)).toBe(true);
      const stats = fs.statSync(thaisBgPath);
      expect(stats.size).toBeGreaterThan(50 * 1024);
    });
  });

  describe('Pillar 2: Dragon Lair Lore Curiosities', () => {
    it('contains exactly the 3 canonical dragon lore curiosities requested by user', () => {
      expect(DRAGON_LAIR_LORE_CURIOSITIES).toHaveLength(3);

      expect(DRAGON_LAIR_LORE_CURIOSITIES[0]).toBe(
        'Todos os dragões descendem de Garsharak, o Primeiro Dragão, uma criatura nascida da dor de Brog e transformada em uma chama viva.'
      );

      expect(DRAGON_LAIR_LORE_CURIOSITIES[1]).toBe(
        'Segundo antigos registros, os dragões estão entre as primeiras criaturas de Tibia e, em tempos remotos, chegaram a dominar grande parte do continente. Hoje, seus descendentes vivem principalmente escondidos em cavernas.'
      );

      expect(DRAGON_LAIR_LORE_CURIOSITIES[2]).toBe(
        'Um antigo livro afirma que os poderosos Dragon Lords possuem uma inesperada paixão por cogumelos e muitos deles carregavam misteriosos livros marcados com uma grande letra “T”'
      );
    });
  });

  describe('Pillar 3: Modular Hunt Loading Registry & Fallback Architecture', () => {
    it('registers dragon-lair in HUNT_LOADING_CONFIGS with custom art and curiosities', () => {
      expect(HUNT_LOADING_CONFIGS['dragon-lair']).toBeDefined();
      expect(HUNT_LOADING_CONFIGS['dragon-lair'].bgImage).toBe('/images/loading/dragon-lair-loading.jpg');
      expect(HUNT_LOADING_CONFIGS['dragon-lair'].curiosities).toEqual(DRAGON_LAIR_LORE_CURIOSITIES);
    });

    it('returns Dragon Lair config when huntId is dragon-lair', () => {
      const config = getLoadingConfigForHunt('dragon-lair');
      expect(config.bgImage).toBe('/images/loading/dragon-lair-loading.jpg');
      expect(config.curiosities).toEqual(DRAGON_LAIR_LORE_CURIOSITIES);
    });

    it('falls back to Thais art and lore for all other hunts until custom art is provided', () => {
      const ratConfig = getLoadingConfigForHunt('rat-cellar');
      expect(ratConfig.bgImage).toBe('/images/loading/thais-loading.jpg');
      expect(ratConfig.curiosities).toEqual(THAIS_LORE_CURIOSITIES);

      const rotConfig = getLoadingConfigForHunt('rotworm-burrow');
      expect(rotConfig.bgImage).toBe('/images/loading/thais-loading.jpg');
      expect(rotConfig.curiosities).toEqual(THAIS_LORE_CURIOSITIES);

      const cycConfig = getLoadingConfigForHunt('cyclops-camp');
      expect(cycConfig.bgImage).toBe('/images/loading/thais-loading.jpg');
      expect(cycConfig.curiosities).toEqual(THAIS_LORE_CURIOSITIES);

      const nullConfig = getLoadingConfigForHunt(null);
      expect(nullConfig.bgImage).toBe('/images/loading/thais-loading.jpg');
      expect(nullConfig.curiosities).toEqual(THAIS_LORE_CURIOSITIES);

      const undefinedConfig = getLoadingConfigForHunt(undefined);
      expect(undefinedConfig.bgImage).toBe('/images/loading/thais-loading.jpg');
      expect(undefinedConfig.curiosities).toEqual(THAIS_LORE_CURIOSITIES);
    });
  });

  describe('Pillar 4: GamePrototype Integration', () => {
    it('verifies GamePrototype imports getLoadingConfigForHunt and tracks huntId during loading', () => {
      const code = fs.readFileSync(gamePrototypePath, 'utf8');

      expect(code).toContain('getLoadingConfigForHunt');
      expect(code).toMatch(/transitionLoading[\s\S]*?huntId\?: string/);
      expect(code).toContain('activeHuntId = transitionLoading?.huntId || pendingHuntTransitionRef.current?.huntId');
      expect(code).toContain('loadingConfig = getLoadingConfigForHunt(activeHuntId)');
      expect(code).toContain('bgImage={loadingConfig.bgImage}');
      expect(code).toContain('curiosities={loadingConfig.curiosities}');
    });
  });
});
