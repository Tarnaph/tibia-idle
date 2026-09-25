import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Phase 236: Mobile Windows & Menus Complete Redesign', () => {
  const rootDir = path.resolve(__dirname, '..');

  it('verifies coordinate HUD overlay is completely removed from GamePrototype.tsx', () => {
    const gameProtoPath = path.join(rootDir, 'apps/web/components/GamePrototype.tsx');
    const content = fs.readFileSync(gameProtoPath, 'utf8');

    expect(content).not.toContain('city-location-hud');
    expect(content).not.toContain('hunt-location-hud');
    expect(content).not.toContain('Parado em Thais');
    expect(content).not.toContain('Andando sozinho até');
  });

  it('verifies MobileVirtualDPad has authentic step cadence (240ms) and pointer capture', () => {
    const dpadPath = path.join(rootDir, 'apps/web/components/mobile/MobileVirtualDPad.tsx');
    const content = fs.readFileSync(dpadPath, 'utf8');

    expect(content).toContain('STEP_CADENCE_MS = 240');
    expect(content).toContain('setPointerCapture');
    expect(content).toContain('activeDirRef');
  });

  it('verifies CharacterProfileModal has fluid grid and enlarged mobile close button', () => {
    const profilePath = path.join(rootDir, 'apps/web/components/CharacterProfileModal.tsx');
    const content = fs.readFileSync(profilePath, 'utf8');

    expect(content).toContain('gridTemplateColumns: \'repeat(auto-fit, minmax(min(100%, 280px), 1fr))\'');
    expect(content).toContain('minWidth: \'38px\'');
    expect(content).toContain('minHeight: \'38px\'');
    expect(content).toContain('Fechar Ficha');
  });

  it('verifies InventoryWindow has mobile backdrop and disables touch drag', () => {
    const invPath = path.join(rootDir, 'apps/web/components/InventoryWindow.tsx');
    const content = fs.readFileSync(invPath, 'utf8');

    expect(content).toContain('inventory-window-backdrop');
    expect(content).toContain('window.innerWidth <= 768');
    expect(content).toContain('inventory-mobile-close-btn');
  });

  it('verifies MobileBottomNav includes safe-area-inset-bottom and truncated single-line tabs', () => {
    const navPath = path.join(rootDir, 'apps/web/components/mobile/MobileBottomNav.tsx');
    const content = fs.readFileSync(navPath, 'utf8');

    expect(content).toContain('safe-area-inset-bottom');
    expect(content).toContain('whiteSpace: \'nowrap\'');
    expect(content).toContain('textOverflow: \'ellipsis\'');
  });

  it('verifies app/globals.css contains Phase 236 mobile window rules and close button styling', () => {
    const cssPath = path.join(rootDir, 'app/globals.css');
    const content = fs.readFileSync(cssPath, 'utf8');

    expect(content).toContain('PHASE 236: MOBILE WINDOWS & MENUS COMPREHENSIVE OVERHAUL');
    expect(content).toContain('.inventory-window-container.floating-window');
    expect(content).toContain('.tibia-outfit-window');
    expect(content).toContain('.tibia-outfit-content');
    expect(content).toContain('.inventory-close-btn');
    expect(content).toContain('.tibia-window-close-btn');
    expect(content).toContain('.tibia-skills-btn-ctrl');
    expect(content).toContain('min-width: 38px !important');
  });
});
