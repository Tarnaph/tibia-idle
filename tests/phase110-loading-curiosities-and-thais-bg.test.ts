import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  ExuraLoadingScreen,
  THAIS_LORE_CURIOSITIES,
} from '../apps/web/components/ExuraLoadingScreen';

describe('Phase 110 - Thais Loading Screen Background & 3-Second Random Curiosities', () => {
  const exuraComponentPath = path.resolve(__dirname, '../apps/web/components/ExuraLoadingScreen.tsx');
  const thaisLoadingImagePath = path.resolve(__dirname, '../public/images/loading/thais-loading.jpg');
  const fallbackLoadingImagePath = path.resolve(__dirname, '../public/images/loading/loading-bg.jpg');

  it('verifies that thais-loading.jpg exists in public/images/loading with substantial size', () => {
    expect(fs.existsSync(thaisLoadingImagePath)).toBe(true);
    expect(fs.existsSync(fallbackLoadingImagePath)).toBe(true);

    const thaisStat = fs.statSync(thaisLoadingImagePath);
    expect(thaisStat.size).toBeGreaterThan(200_000); // 332KB
  });

  it('verifies THAIS_LORE_CURIOSITIES exports the exact 3 canonical lore facts', () => {
    expect(THAIS_LORE_CURIOSITIES).toHaveLength(3);
    expect(THAIS_LORE_CURIOSITIES[0]).toBe(
      'Você sabia? Thais é considerada a cidade mais antiga de Tibia e foi a primeira cidade do jogo.'
    );
    expect(THAIS_LORE_CURIOSITIES[1]).toBe(
      'Antes de se chamar Thais, o local era conhecido como Tradespot, um pequeno posto comercial que cresceu até se tornar a capital do reino.'
    );
    expect(THAIS_LORE_CURIOSITIES[2]).toBe(
      'O nome Thais vem de um guerreiro. Após sua morte defendendo Tradespot dos orcs, seu filho Tibianus I renomeou a cidade em homenagem ao pai.'
    );
  });

  it('verifies ExuraLoadingScreen component signature accepts bgImage and curiosities props', () => {
    const code = fs.readFileSync(exuraComponentPath, 'utf8');

    expect(code).toContain('bgImage?: string;');
    expect(code).toContain('curiosities?: string[];');
    expect(code).toContain("bgImage = '/images/loading/thais-loading.jpg'");
    expect(code).toContain('curiosities = THAIS_LORE_CURIOSITIES');
  });

  it('verifies ExuraLoadingScreen rotates curiosities with configurable timer (default 5000ms) and randomized non-repeating logic', () => {
    const code = fs.readFileSync(exuraComponentPath, 'utf8');

    expect(code).toContain('curiosityIntervalMs = 5000');
    expect(code).toContain('curiosityIntervalMs);');
    expect(code).toContain('Math.random() * curiosities.length');
    expect(code).toContain('while (next === prev && curiosities.length > 1)');
    expect(code).toContain("setCuriosityFade('out')");
    expect(code).toContain("setCuriosityFade('in')");
  });

  it('verifies ExuraLoadingScreen renders the curiosity card and header above the loading bar', () => {
    const code = fs.readFileSync(exuraComponentPath, 'utf8');

    expect(code).toContain('exura-loading-curiosity-box');
    expect(code).toContain('Você Sabia?');
    expect(code).toContain('exura-loading-curiosity-text');
    expect(code).toContain('opacity: curiosityFade === \'in\' ? 1 : 0');
  });
});
