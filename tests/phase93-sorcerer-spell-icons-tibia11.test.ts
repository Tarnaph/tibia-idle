import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { resolveActionImagePath } from '../apps/web/components/Tibia11ActionIcon.tsx';

function readPngDimensions(buffer: Buffer): { width: number; height: number } {
  // Check PNG signature
  expect(buffer[0]).toBe(0x89);
  expect(buffer[1]).toBe(0x50);
  expect(buffer[2]).toBe(0x4e);
  expect(buffer[3]).toBe(0x47);
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { width, height };
}

describe('Phase 93: Official CipSoft Sorcerer Spell Icons from Tibia 11 (graphics_resources.rcc)', () => {
  const REFERENCE_SCREENSHOT_SPELLS = [
    { id: 169, words: 'exori min flam', name: "Apprentice's Strike", expectedFile: '/spells/exori-min-flam.png', iconIndex: 126 },
    { id: 1, words: 'exura', name: 'Light Healing', expectedFile: '/spells/exura.png', iconIndex: 5 },
    { id: 88, words: 'exori vis', name: 'Energy Strike', expectedFile: '/spells/exori-vis.png', iconIndex: 28 },
    { id: 113, words: 'exori tera', name: 'Terra Strike', expectedFile: '/spells/exori-tera.png', iconIndex: 34 },
    { id: 89, words: 'exori flam', name: 'Flame Strike', expectedFile: '/spells/exori-flam.png', iconIndex: 25 },
    { id: 6, words: 'utani hur', name: 'Haste', expectedFile: '/spells/utani-hur.png', iconIndex: 100 },
  ];

  const ALL_SORCERER_SPELLS = [
    ...REFERENCE_SCREENSHOT_SPELLS,
    { id: 44, words: 'utamo vita', name: 'Magic Shield', expectedFile: '/spells/utamo-vita.png', iconIndex: 123 },
    { id: 112, words: 'exori frigo', name: 'Ice Strike', expectedFile: '/spells/exori-frigo.png', iconIndex: 31 },
    { id: 87, words: 'exori mort', name: 'Death Strike', expectedFile: '/spells/exori-mort.png', iconIndex: 37 },
    { id: 19, words: 'exevo flam hur', name: 'Fire Wave', expectedFile: '/spells/exevo-flam-hur.png', iconIndex: 43 },
    { id: 2, words: 'exura gran', name: 'Intense Healing', expectedFile: '/spells/exura-gran.png', iconIndex: 6 },
    { id: 39, words: 'utani gran hur', name: 'Strong Haste', expectedFile: '/spells/utani-gran-hur.png', iconIndex: 101 },
    { id: 22, words: 'exevo vis lux', name: 'Energy Beam', expectedFile: '/spells/exevo-vis-lux.png', iconIndex: 40 },
    { id: 23, words: 'exevo gran vis lux', name: 'Great Energy Beam', expectedFile: '/spells/exevo-gran-vis-lux.png', iconIndex: 41 },
    { id: 3, words: 'exura vita', name: 'Ultimate Healing', expectedFile: '/spells/exura-vita.png', iconIndex: 0 },
    { id: 13, words: 'exevo vis hur', name: 'Energy Wave', expectedFile: '/spells/exevo-vis-hur.png', iconIndex: 42 },
    { id: 201, words: 'exevo gran flam hur', name: 'Great Fire Wave', expectedFile: '/spells/exevo-gran-flam-hur.png', iconIndex: 43 },
    { id: 119, words: 'exevo gran mas vis', name: 'Rage of the Skies', expectedFile: '/spells/exevo-gran-mas-vis.png', iconIndex: 51 },
    { id: 24, words: 'exevo gran mas flam', name: "Hell's Core", expectedFile: '/spells/exevo-gran-mas-flam.png', iconIndex: 48 },
    { id: 150, words: 'exori gran flam', name: 'Strong Flame Strike', expectedFile: '/spells/exori-gran-flam.png', iconIndex: 26 },
    { id: 151, words: 'exori gran vis', name: 'Strong Energy Strike', expectedFile: '/spells/exori-gran-vis.png', iconIndex: 29 },
    { id: 154, words: 'exori max flam', name: 'Ultimate Flame Strike', expectedFile: '/spells/exori-max-flam.png', iconIndex: 27 },
    { id: 155, words: 'exori max vis', name: 'Ultimate Energy Strike', expectedFile: '/spells/exori-max-vis.png', iconIndex: 30 },
  ];

  it('verifies that all 6 reference screenshot spells resolve to authentic Tibia 11 icons', () => {
    for (const spell of REFERENCE_SCREENSHOT_SPELLS) {
      const resolved = resolveActionImagePath(spell.id, 'spell', spell.name);
      expect(resolved, `Spell ${spell.name} (id: ${spell.id}) resolution mismatch`).toBe(spell.expectedFile);

      // Verify file exists on disk and is 32x32
      const filePath = path.resolve('public', spell.expectedFile.slice(1));
      expect(fs.existsSync(filePath), `Icon file missing: ${filePath}`).toBe(true);

      const buf = fs.readFileSync(filePath);
      const { width, height } = readPngDimensions(buf);
      expect(width, `${spell.name} width should be 32`).toBe(32);
      expect(height, `${spell.name} height should be 32`).toBe(32);
    }
  });

  it('verifies that all 23 Sorcerer spells resolve correctly with canonical 32x32 dimensions', () => {
    for (const spell of ALL_SORCERER_SPELLS) {
      const resolved = resolveActionImagePath(spell.id, 'spell', spell.name);
      expect(resolved, `Spell ${spell.name} (id: ${spell.id}) failed resolution`).toBe(spell.expectedFile);

      const filePath = path.resolve('public', spell.expectedFile.slice(1));
      expect(fs.existsSync(filePath), `Missing icon: ${filePath}`).toBe(true);

      const buf = fs.readFileSync(filePath);
      const { width, height } = readPngDimensions(buf);
      expect(width).toBe(32);
      expect(height).toBe(32);
    }
  });

  it('ensures each spell icon in public/spells matches the canonical icon extracted from graphics_resources.rcc', () => {
    for (const spell of ALL_SORCERER_SPELLS) {
      const publicPath = path.resolve('public', spell.expectedFile.slice(1));
      const canonicalPath = path.resolve('public', 'spells', 'canonical', `spell-${spell.iconIndex}.png`);

      expect(fs.existsSync(publicPath), `Public file ${publicPath} missing`).toBe(true);
      expect(fs.existsSync(canonicalPath), `Canonical file ${canonicalPath} missing`).toBe(true);

      const publicBuf = fs.readFileSync(publicPath);
      const canonicalBuf = fs.readFileSync(canonicalPath);

      expect(publicBuf.equals(canonicalBuf), `Icon for ${spell.name} differs from canonical RCC icon #${spell.iconIndex}`).toBe(true);
    }
  });

  it('confirms the 146 canonical spell icons are extracted from graphics_resources.rcc', () => {
    const canonicalDir = path.resolve('public', 'spells', 'canonical');
    expect(fs.existsSync(canonicalDir)).toBe(true);

    const files = fs.readdirSync(canonicalDir).filter((f) => f.endsWith('.png'));
    expect(files.length).toBe(146);
  });
});
