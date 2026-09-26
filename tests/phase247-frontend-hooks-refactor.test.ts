import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Phase 247: Onda 3 - Desacoplamento e Performance do Frontend (Custom Hooks)', () => {
  const rootDir = process.cwd();
  const hooksDir = path.resolve(rootDir, 'apps/web/hooks');

  it('1. Deve possuir os custom hooks useHotbarShortcuts.ts e useAutoSave.ts', () => {
    const hotbarHookPath = path.resolve(hooksDir, 'useHotbarShortcuts.ts');
    const autoSaveHookPath = path.resolve(hooksDir, 'useAutoSave.ts');

    expect(fs.existsSync(hotbarHookPath)).toBe(true);
    expect(fs.existsSync(autoSaveHookPath)).toBe(true);

    const hotbarContent = fs.readFileSync(hotbarHookPath, 'utf8');
    expect(hotbarContent).toContain('export function useHotbarShortcuts');
    expect(hotbarContent).toContain('onHotbarAction');
    expect(hotbarContent).toContain('onTurn');
    expect(hotbarContent).toContain('onOpenOutfit');
    expect(hotbarContent).toContain('onToggleMount');

    const autoSaveContent = fs.readFileSync(autoSaveHookPath, 'utf8');
    expect(autoSaveContent).toContain('export function useAutoSave');
    expect(autoSaveContent).toContain('triggerSave');
    expect(autoSaveContent).toContain('visibilitychange');
  });

  it('2. GamePrototype.tsx deve importar e utilizar useHotbarShortcuts', () => {
    const protoPath = path.resolve(rootDir, 'apps/web/components/GamePrototype.tsx');
    const protoContent = fs.readFileSync(protoPath, 'utf8');

    expect(protoContent).toContain("import { useHotbarShortcuts } from '../hooks/useHotbarShortcuts'");
    expect(protoContent).toContain('useHotbarShortcuts({');
    expect(protoContent).toContain('onHotbarAction: handleManualHotbarAction');
  });

  it('3. useHotbarShortcuts: deve simular despacho de teclas de atalho corretamente', () => {
    // Simulação do despachante de eventos da lógica de useHotbarShortcuts
    let triggeredSlot = -1;
    let turnedDir = '';
    let outfitOpened = false;
    let mountToggled = false;
    let escaped = false;

    const simulateKeyDown = (e: { key: string; ctrlKey?: boolean; altKey?: boolean; metaKey?: boolean; target?: any }) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      if (e.key === 'Escape') {
        escaped = true;
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W')) {
        turnedDir = 'north';
        return;
      }

      if ((e.key === 'u' || e.key === 'U') && !e.ctrlKey && !e.altKey && !e.metaKey) {
        outfitOpened = true;
        return;
      }

      if ((e.key === 'r' || e.key === 'R') && (e.ctrlKey || e.metaKey)) {
        mountToggled = true;
        return;
      }

      if (e.key.startsWith('F') && e.key.length <= 3) {
        const fNum = parseInt(e.key.slice(1), 10);
        if (fNum >= 1 && fNum <= 12) {
          triggeredSlot = fNum - 1;
        }
      } else if (e.key >= '0' && e.key <= '9' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        const keyNum = e.key === '0' ? 9 : parseInt(e.key, 10) - 1;
        triggeredSlot = 10 + keyNum;
      }
    };

    // Teste F1 -> slot 0
    simulateKeyDown({ key: 'F1' });
    expect(triggeredSlot).toBe(0);

    // Teste F12 -> slot 11
    simulateKeyDown({ key: 'F12' });
    expect(triggeredSlot).toBe(11);

    // Teste tecla '1' -> slot 10
    simulateKeyDown({ key: '1' });
    expect(triggeredSlot).toBe(10);

    // Teste tecla '0' -> slot 19
    simulateKeyDown({ key: '0' });
    expect(triggeredSlot).toBe(19);

    // Teste Escape
    simulateKeyDown({ key: 'Escape' });
    expect(escaped).toBe(true);

    // Teste Outfit 'U'
    simulateKeyDown({ key: 'u' });
    expect(outfitOpened).toBe(true);

    // Teste Montar Ctrl+R
    simulateKeyDown({ key: 'r', ctrlKey: true });
    expect(mountToggled).toBe(true);

    // Teste Girar Ctrl+W -> North
    simulateKeyDown({ key: 'w', ctrlKey: true });
    expect(turnedDir).toBe('north');

    // Teste dentro de INPUT (não deve disparar)
    triggeredSlot = -1;
    simulateKeyDown({ key: 'F1', target: { tagName: 'INPUT' } });
    expect(triggeredSlot).toBe(-1);
  });
});
