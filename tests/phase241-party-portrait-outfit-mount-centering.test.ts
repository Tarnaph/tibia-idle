import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { getCharacterAppearance } from '../apps/web/components/party/UnifiedPartyModal';

describe('Phase 241 - Party Portrait Outfit, Mount & Auto-Centering', () => {
  const globalsCssPath = path.resolve(__dirname, '../app/globals.css');
  const partyModalTsxPath = path.resolve(__dirname, '../apps/web/components/party/UnifiedPartyModal.tsx');
  const gamePrototypeTsxPath = path.resolve(__dirname, '../apps/web/components/GamePrototype.tsx');

  it('getCharacterAppearance extracts exact outfit, mount, colors and addons for characters', () => {
    const mockChar: any = {
      id: 'char-wolfy',
      name: 'Wolfy',
      vocation: 'Knight',
      baseVocation: 'Knight',
      level: 82,
      outfit: 'Hunter',
      mount: 'flying-book',
      mountActive: true,
      addons: 2,
      gender: 'male',
      outfitColors: {
        head: 95,
        primary: 10,
        secondary: 20,
        detail: 30,
      },
    };

    const appearance = getCharacterAppearance(mockChar, null, 'Knight');

    expect(appearance.outfitId).toBe('Hunter');
    expect(appearance.mount).toBe('flying-book');
    expect(appearance.mountActive).toBe(true);
    expect(appearance.addons).toBe(2);
    expect(appearance.gender).toBe('male');
    expect(appearance.colors.head).toBe(95);
    expect(appearance.colors.primary).toBe(10);
    expect(appearance.colors.secondary).toBe(20);
    expect(appearance.colors.detail).toBe(30);
  });

  it('getCharacterAppearance handles unmounted character and legacy color formats', () => {
    const mockChar: any = {
      id: 'char-cerberus',
      name: 'Cerberus',
      vocation: 'Druid',
      outfit: 'Druid',
      mount: 'none',
      mountActive: false,
      outfitHead: 50,
      outfitBody: 60,
      outfitLegs: 70,
      outfitFeet: 80,
    };

    const appearance = getCharacterAppearance(mockChar, null, 'Druid');

    expect(appearance.outfitId).toBe('Druid');
    expect(appearance.mount).toBe('none');
    expect(appearance.mountActive).toBe(false);
    expect(appearance.colors.head).toBe(50);
    expect(appearance.colors.primary).toBe(60);
    expect(appearance.colors.secondary).toBe(70);
    expect(appearance.colors.detail).toBe(80);
  });

  it('UnifiedPartyModal.tsx contains bounding box calculation and drawCenteredAndScaled for portrait canvas', () => {
    const tsx = fs.readFileSync(partyModalTsxPath, 'utf-8');

    expect(tsx).toContain('drawCenteredAndScaled');
    expect(tsx).toContain('imgData.data');
    expect(tsx).toContain('availableDiameter');
    expect(tsx).toContain('ctx.imageSmoothingEnabled = false');
    expect(tsx).toContain('party-card-outfit-canvas');
  });

  it('GamePrototype.tsx maps mount, mountActive and appearance fields for remote party members', () => {
    const tsx = fs.readFileSync(gamePrototypeTsxPath, 'utf-8');

    expect(tsx).toContain('mount: (m as any).mount');
    expect(tsx).toContain('mountActive: (m as any).mountActive');
    expect(tsx).toContain('outfitColors: (m as any).outfitColors');
  });

  it('globals.css defines .party-card-outfit-canvas with pixelated rendering and circle bounds', () => {
    const css = fs.readFileSync(globalsCssPath, 'utf-8');

    expect(css).toContain('.party-card-outfit-canvas');
    expect(css).toContain('image-rendering: pixelated;');
  });
});
