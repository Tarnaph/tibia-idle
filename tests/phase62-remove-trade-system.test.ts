import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Phase 62: Removal of Player-to-Player Trade System', () => {
  const projectRoot = resolve(__dirname, '..');

  it('verifies that Trade is removed from CharacterContextMenu', () => {
    const menuSrc = readFileSync(resolve(projectRoot, 'apps/web/components/CharacterContextMenu.tsx'), 'utf8');
    expect(menuSrc).not.toContain('🤝 Trade (Trocar Itens)');
    expect(menuSrc).not.toContain('onTrade?: () => void;');
  });

  it('verifies that WindowId trade is removed from WindowManagerContext', () => {
    const wmSrc = readFileSync(resolve(projectRoot, 'apps/web/components/window/WindowManagerContext.tsx'), 'utf8');
    expect(wmSrc).not.toContain("'trade'");
  });

  it('verifies that TradeWindow and tradeSession are removed from GamePrototype', () => {
    const protoSrc = readFileSync(resolve(projectRoot, 'apps/web/components/GamePrototype.tsx'), 'utf8');
    expect(protoSrc).not.toContain("import { TradeWindow");
    expect(protoSrc).not.toContain("tradeSession");
    expect(protoSrc).not.toContain("handleStartTrade");
  });
});
