import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { content } from './fixture';
import {
  findHotbarAction,
  triggerManualHotbarAction,
  createIdleGame,
  reorderHotbar,
} from '../packages/domain/src';

describe('Phase 115 - Hotbar Right-Click Edit & Conditional Draggable Verification', () => {
  const bottomConsoleHudPath = resolve(__dirname, '../apps/web/components/BottomConsoleHUD.tsx');
  const hotbarConfigModalPath = resolve(__dirname, '../apps/web/components/HotbarConfigModal.tsx');

  it('verifies BottomConsoleHUD implements conditional draggable to prevent Chromium right-click suppression', () => {
    const fileContent = readFileSync(bottomConsoleHudPath, 'utf8');

    // Must have draggableSlot state
    expect(fileContent).toContain('const [draggableSlot, setDraggableSlot] = useState<number | null>(null);');

    // Must calculate isDraggable based on slotIndex
    expect(fileContent).toContain('const isDraggable = draggableSlot === slotIndex;');

    // Must bind draggable={isDraggable} rather than static draggable
    expect(fileContent).toContain('draggable={isDraggable}');

    // Must only activate draggable on left mouse button down (e.button === 0)
    expect(fileContent).toContain('if (e.button === 0) {');
    expect(fileContent).toContain('setDraggableSlot(slotIndex);');
  });

  it('verifies BottomConsoleHUD provides multi-layer right-click handling (onMouseDown button 2, onMouseUp button 2, onContextMenu)', () => {
    const fileContent = readFileSync(bottomConsoleHudPath, 'utf8');

    // Right-click detection in onMouseDown
    expect(fileContent).toContain('else if (e.button === 2) {');
    expect(fileContent).toContain('handleEditSlot(slotIndex, e);');

    // Right-click detection in onMouseUp
    expect(fileContent).toContain('if (e.button === 2) {');

    // Canonical onContextMenu
    expect(fileContent).toContain('onContextMenu={(e) => {');

    // handleEditSlot prevents default and stops propagation
    expect(fileContent).toContain('const handleEditSlot = (slotIndex: number, e: React.MouseEvent) => {');
    expect(fileContent).toContain('e.preventDefault();');
    expect(fileContent).toContain('e.stopPropagation();');
    expect(fileContent).toContain('onConfigureSlot?.(slotIndex);');
  });

  it('verifies slot children have pointerEvents: "none" to guarantee mouse events reach the slot handler', () => {
    const fileContent = readFileSync(bottomConsoleHudPath, 'utf8');

    // Hotkey label, icon container, cooldown overlay and mana cost must have pointerEvents: 'none'
    expect(fileContent).toContain("pointerEvents: 'none'");
  });

  it('verifies HotbarConfigModal backdrop safely handles contextmenu and modal dismissal', () => {
    const fileContent = readFileSync(hotbarConfigModalPath, 'utf8');

    expect(fileContent).toContain('onContextMenu={(e) => {');
    expect(fileContent).toContain('e.preventDefault();');
    expect(fileContent).toContain('e.stopPropagation();');
    expect(fileContent).toContain('if (e.target === e.currentTarget) {');
    expect(fileContent).toContain('onClose();');
  });

  it('verifies spells on hotbar can be looked up and manual execution works on left click', () => {
    const game = createIdleGame('seed-p115', content, 'rat-cellars');
    const char = structuredClone(game.session.characters[0]);
    char.spells = [6, 80]; // Exori, Lesser Front Sweep
    char.hotbar = [6, 80];

    const action = findHotbarAction(char.hotbar[0], content);
    expect(action).toBeDefined();
    expect(action?.kind).toBe('spell');
    if (action?.kind === 'spell') {
      expect(action.spell.spellId).toBe(6);
      expect(action.spell.name).toBe('Haste');
    }

    // Manual action execution in encounter mode
    const testChar = game.session.characters[0];
    testChar.vocation = 'Sorcerer';
    testChar.baseVocation = 'Sorcerer';
    testChar.level = 50;
    testChar.currentMana = 200;
    if (game.encounter.partyActors[0]) {
      game.encounter.partyActors[0].mana = 200;
    }
    testChar.hotbar = [6, 80];
    const triggered = triggerManualHotbarAction(game, testChar.id, 6, content);
    expect(triggered).toBe(true);
  });

  it('verifies dragging with left click reorders hotbar correctly', () => {
    const game = createIdleGame('seed-p115-drag', content, 'rat-cellars');
    const char = structuredClone(game.session.characters[0]);
    char.hotbar = [6, 80, 107];

    const swapped = reorderHotbar(char, 0, 1);
    expect(swapped.hotbar[0]).toBe(80);
    expect(swapped.hotbar[1]).toBe(6);
  });
});
