import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createCharacter } from '../packages/domain/src/party';
import { content } from './fixture';

describe('Phase 41: Global Item Tooltip Always On Top & City Player Inspection', () => {
  it('Requirement 1: GlobalItemTooltip is a singleton on top of everything (z-index 99999999) with viewport edge clamping', () => {
    const projectRoot = resolve(__dirname, '..');
    const tooltipSrc = readFileSync(resolve(projectRoot, 'apps/web/components/GlobalItemTooltip.tsx'), 'utf8');

    // High z-index on top of all windows
    expect(tooltipSrc).toContain('zIndex: 99999999');
    expect(tooltipSrc).toContain("position: 'fixed'");

    // Exported helper functions for show and hide
    expect(tooltipSrc).toContain('export function showGlobalItemTooltip');
    expect(tooltipSrc).toContain('export function hideGlobalItemTooltip');
    expect(tooltipSrc).toContain('export function showGlobalPlayerTooltip');
    expect(tooltipSrc).toContain('export function hideGlobalPlayerTooltip');

    // Clamping to avoid viewport overflow
    expect(tooltipSrc).toContain('window.innerWidth - padding');
    expect(tooltipSrc).toContain('window.innerHeight - padding');

    // Renders complete item attributes: attack, defense, armor, weight (oz), price gp
    expect(tooltipSrc).toContain('Ataque:');
    expect(tooltipSrc).toContain('Defesa:');
    expect(tooltipSrc).toContain('Armadura:');
    expect(tooltipSrc).toContain('Peso:');
    expect(tooltipSrc).toContain('Valor:');
    expect(tooltipSrc).toContain('gp');
  });

  it('Requirement 1: All item-bearing windows and panels wire into showGlobalItemTooltip', () => {
    const projectRoot = resolve(__dirname, '..');

    const inventoryWindowSrc = readFileSync(resolve(projectRoot, 'apps/web/components/InventoryWindow.tsx'), 'utf8');
    expect(inventoryWindowSrc).toContain('showGlobalItemTooltip');
    expect(inventoryWindowSrc).toContain('hideGlobalItemTooltip');

    const equipmentPanelSrc = readFileSync(resolve(projectRoot, 'apps/web/components/EquipmentPanel.tsx'), 'utf8');
    expect(equipmentPanelSrc).toContain('showGlobalItemTooltip');
    expect(equipmentPanelSrc).toContain('hideGlobalItemTooltip');

    const depotWindowSrc = readFileSync(resolve(projectRoot, 'apps/web/components/DepotWindow.tsx'), 'utf8');
    expect(depotWindowSrc).toContain('showGlobalItemTooltip');
    expect(depotWindowSrc).toContain('hideGlobalItemTooltip');

    const quickSellWindowSrc = readFileSync(resolve(projectRoot, 'apps/web/components/QuickSellWindow.tsx'), 'utf8');
    expect(quickSellWindowSrc).toContain('showGlobalItemTooltip');
    expect(quickSellWindowSrc).toContain('hideGlobalItemTooltip');

    const rightSidebarSrc = readFileSync(resolve(projectRoot, 'apps/web/components/RightSidebar.tsx'), 'utf8');
    expect(rightSidebarSrc).toContain('showGlobalItemTooltip');
    expect(rightSidebarSrc).toContain('hideGlobalItemTooltip');
  });

  it('Requirement 2: CharacterState includes isPremium and createCharacter defaults to isPremium: true', () => {
    const char = createCharacter('knight-test', 'TestKnight', 'Knight', content);
    expect(char.isPremium).toBe(true);
  });

  it('Requirement 2: GlobalItemTooltip renders player inspection card with level, vocation and Premium Account status', () => {
    const projectRoot = resolve(__dirname, '..');
    const tooltipSrc = readFileSync(resolve(projectRoot, 'apps/web/components/GlobalItemTooltip.tsx'), 'utf8');

    expect(tooltipSrc).toContain('global-player-inspect-card');
    expect(tooltipSrc).toContain('player-inspect-vocation');
    expect(tooltipSrc).toContain('inspect-val-lvl');
    expect(tooltipSrc).toContain('inspect-badge-premium');
    expect(tooltipSrc).toContain('Premium Account');
    expect(tooltipSrc).toContain('inspect-badge-free');
    expect(tooltipSrc).toContain('Free Account');
  });

  it('Requirement 2: ThaisCityArena implements hover detection for other players in the city and displays inspection card', () => {
    const projectRoot = resolve(__dirname, '..');
    const thaisArenaSrc = readFileSync(resolve(projectRoot, 'apps/web/components/ThaisCityArena.tsx'), 'utf8');

    // ThaisCityArena imports and uses player inspection tooltips
    expect(thaisArenaSrc).toContain('showGlobalPlayerTooltip');
    expect(thaisArenaSrc).toContain('hideGlobalPlayerTooltip');

    // Populates ambient city players with level, vocation, and isPremium
    expect(thaisArenaSrc).toContain('AMBIENT_THAIS_PLAYERS');
    expect(thaisArenaSrc).toContain("name: 'Vimago'");
    expect(thaisArenaSrc).toContain("vocation: 'Master Sorcerer'");
    expect(thaisArenaSrc).toContain('isPremium: true');
    expect(thaisArenaSrc).toContain("name: 'Elane'");
    expect(thaisArenaSrc).toContain("name: 'Harkath Bloodblade'");
    expect(thaisArenaSrc).toContain("name: 'Muriel'");
    expect(thaisArenaSrc).toContain('isPremium: false');

    // Handles mouse hover detection in onPointerMove and clears on pointerleave
    expect(thaisArenaSrc).toContain('showGlobalPlayerTooltip(');
    expect(thaisArenaSrc).toContain('app.canvas.style.cursor = \'pointer\'');
    expect(thaisArenaSrc).toContain('hideGlobalPlayerTooltip()');
  });

  it('GlobalItemTooltip is mounted at root in GamePrototype.tsx above all windows', () => {
    const projectRoot = resolve(__dirname, '..');
    const gameProtoSrc = readFileSync(resolve(projectRoot, 'apps/web/components/GamePrototype.tsx'), 'utf8');

    expect(gameProtoSrc).toContain('<GlobalItemTooltip />');
  });
});
