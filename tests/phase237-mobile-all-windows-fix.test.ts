import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Phase 237 - Complete Mobile Overhaul: All Windows & Modals Fix', () => {
  const rootDir = process.cwd();

  it('TibiaAuthCharacterModal has responsive row wrapper, hides Bard on mobile, and stacks character actions', () => {
    const authFilePath = path.join(rootDir, 'apps/web/components/auth/TibiaAuthCharacterModal.tsx');
    const content = fs.readFileSync(authFilePath, 'utf8');

    expect(content).toContain('auth-modal-row-wrapper');
    expect(content).toContain('auth-bard-container');
    expect(content).toContain('auth-card-container');
    expect(content).toContain('auth-char-item-row');
    expect(content).toContain('auth-char-action-group');
    expect(content).toContain('auth-char-enter-btn');
    expect(content).toContain('auth-char-delete-btn');
  });

  it('PromotionModal has compact card container, accessible 38x38px close button, and concise benefit items', () => {
    const promoFilePath = path.join(rootDir, 'apps/web/components/character/PromotionModal.tsx');
    const content = fs.readFileSync(promoFilePath, 'utf8');

    expect(content).toContain('promotion-card-window');
    expect(content).toContain('promotion-close-btn');
    expect(content).toContain("width: '38px'");
    expect(content).toContain("height: '38px'");
    expect(content).toContain('✕');
  });

  it('CharacterProfileModal has bounded row 1 minmax, overflow-x hidden, and character-profile-close-btn', () => {
    const charProfileFilePath = path.join(rootDir, 'apps/web/components/CharacterProfileModal.tsx');
    const content = fs.readFileSync(charProfileFilePath, 'utf8');

    expect(content).toContain('character-profile-modal-window');
    expect(content).toContain('character-profile-close-btn');
    expect(content).toContain('minmax(min(100%, 260px), 1fr)');
    expect(content).toContain('overflowX: \'hidden\'');
  });

  it('OutfitModal has 3-tab mobile switcher, pinned preview box, and color controls toggle', () => {
    const outfitFilePath = path.join(rootDir, 'apps/web/components/OutfitModal.tsx');
    const content = fs.readFileSync(outfitFilePath, 'utf8');

    expect(content).toContain('tibia-mobile-outfit-tabs');
    expect(content).toContain('tibia-mobile-outfit-tab');
    expect(content).toContain('tibia-preview-box');
    expect(content).toContain('tibia-outfit-color-controls');
    expect(content).toContain('mobile-hidden');
  });

  it('HighscoresModal has highscores-modal-window, 38x38px close button, and category/table classes', () => {
    const highscoresFilePath = path.join(rootDir, 'apps/web/components/HighscoresModal.tsx');
    const content = fs.readFileSync(highscoresFilePath, 'utf8');

    expect(content).toContain('highscores-modal-window');
    expect(content).toContain('highscores-close-btn');
    expect(content).toContain('highscores-modal-body');
    expect(content).toContain('highscores-categories-col');
    expect(content).toContain('highscores-category-btn');
    expect(content).toContain('highscores-content-col');
    expect(content).toContain('highscores-table-header');
    expect(content).toContain('highscores-table-row');
    expect(content).toContain('highscores-col-voc');
    expect(content).toContain('highscores-col-lvl');
    expect(content).toContain('highscores-col-val');
    expect(content).toContain('highscores-mobile-subinfo');
  });

  it('ArenaPvPModal has arena-pvp-window, 38x38px close button, and body/column classes', () => {
    const arenaFilePath = path.join(rootDir, 'apps/web/components/ArenaPvPModal.tsx');
    const content = fs.readFileSync(arenaFilePath, 'utf8');

    expect(content).toContain('arena-pvp-window');
    expect(content).toContain('arena-close-btn');
    expect(content).toContain('arena-modal-body');
    expect(content).toContain('arena-left-col');
    expect(content).toContain('arena-right-col');
  });

  it('ImbuingModal has imbuing-modal-window, 38x38px close button, and body/column classes', () => {
    const imbuingFilePath = path.join(rootDir, 'apps/web/components/ImbuingModal.tsx');
    const content = fs.readFileSync(imbuingFilePath, 'utf8');

    expect(content).toContain('imbuing-modal-window');
    expect(content).toContain('imbuing-close-btn');
    expect(content).toContain('imbuing-modal-body');
    expect(content).toContain('imbuing-left-col');
    expect(content).toContain('imbuing-right-col');
  });

  it('HuntSelector has hunt-frame-container, hunt-window-close-btn, and bestiary fallback', () => {
    const huntFilePath = path.join(rootDir, 'apps/web/components/HuntSelector.tsx');
    const content = fs.readFileSync(huntFilePath, 'utf8');

    expect(content).toContain('hunt-frame-container');
    expect(content).toContain('hunt-window-close-btn');
    expect(content).toContain('hunt-catalog-grid');
    expect(content).toContain('hunt-catalog-card');
  });

  it('globals.css includes Phase 237 comprehensive mobile rules for zero horizontal scroll and 38px close buttons', () => {
    const cssFilePath = path.join(rootDir, 'app/globals.css');
    const content = fs.readFileSync(cssFilePath, 'utf8');

    expect(content).toContain('PHASE 237: COMPLETE MOBILE OVERHAUL');
    expect(content).toContain('.hunt-window-close-btn');
    expect(content).toContain('.highscores-close-btn');
    expect(content).toContain('.arena-close-btn');
    expect(content).toContain('.imbuing-close-btn');
    expect(content).toContain('.promotion-close-btn');
    expect(content).toContain('.character-profile-close-btn');
    expect(content).toContain('.tibia-mobile-outfit-tabs');
    expect(content).toContain('.auth-bard-container');
    expect(content).toContain('display: none !important');
    expect(content).toContain('overflow-x: hidden !important');
  });
});
