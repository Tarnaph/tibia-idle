import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  createIdleGame,
  sellAllLoot,
  executeQuickSell,
  updateItemLootPreference,
  type GameContent,
  type LootStack,
} from '../packages/domain/src';
import { parseInventoryData } from '../apps/web/lib/characterHydration';
import { content } from './fixture';

describe('Phase 257: Visual Fixes, 5x Loot Rate, Loot Bag Lock, Hunt Auto-Sell & Body Turn Sync', () => {
  const projectRoot = resolve(__dirname, '..');

  it('Onda 1 - Nameplate Centralization: PixiArena centers non-skull player labels and ThaisCityRoom removes rotworm-1 spawn', () => {
    const pixiArenaSrc = readFileSync(resolve(projectRoot, 'apps/web/components/PixiArena.tsx'), 'utf8');
    const thaisRoomSrc = readFileSync(resolve(projectRoot, 'packages/server/src/rooms/ThaisCityRoom.ts'), 'utf8');

    // Nameplate horizontal centering
    expect(pixiArenaSrc).toContain('view.label.anchor.set(0.5, 0.5)');
    expect(pixiArenaSrc).toContain('view.label.position.set(0, creatureVisualLayout.nameplateY)');

    // No rotworm-1 static test monster spawn in Thais City
    expect(thaisRoomSrc).not.toContain("'rotworm-1'");
  });

  it('Onda 2 - Economy & Drop Rate 5x: default server config and rollLoot multiplier', () => {
    const serverConfigJson = JSON.parse(readFileSync(resolve(projectRoot, 'content/server-config.json'), 'utf8'));
    const serverConfigMgrSrc = readFileSync(resolve(projectRoot, 'packages/server/src/config/ServerConfigManager.ts'), 'utf8');
    const combatSrc = readFileSync(resolve(projectRoot, 'packages/domain/src/combat.ts'), 'utf8');

    expect(serverConfigJson.lootRate).toBe(5);
    expect(serverConfigMgrSrc).toContain('lootRate: 5.0');
    expect(combatSrc).toContain('Math.round(loot.chance * Math.max(1, multiplier))');
  });

  it('Onda 3 - Loot Bag Lock / Unlock: domain immunity against quickSell and sellAllLoot', () => {
    const initialLoot: LootStack[] = [
      { itemId: 2463, name: 'Plate Armor', amount: 1, locked: true }, // PROTEGIDO
      { itemId: 2160, name: 'Crystal Coin', amount: 2, locked: false }, // DESPROTEGIDO
    ];

    let game = createIdleGame('test-lock', content);
    game.session.loot = [...initialLoot];

    // 1. sellAllLoot deve vender apenas o Crystal Coin e preservar o Plate Armor bloqueado
    const sellAllResult = sellAllLoot(game, content);
    expect(sellAllResult.soldStacks).toBe(1);
    expect(sellAllResult.goldEarned).toBeGreaterThan(0);
    expect(sellAllResult.state.session.loot).toHaveLength(1);
    expect(sellAllResult.state.session.loot[0].name).toBe('Plate Armor');
    expect(sellAllResult.state.session.loot[0].locked).toBe(true);

    // 2. executeQuickSell deve respeitar locked: true
    game.session.loot = [...initialLoot];
    const quickSellResult = executeQuickSell(game, content, [2463, 2160]);
    expect(quickSellResult.itemsSold).toBe(2); // 2 Crystal Coins vendidos
    expect(quickSellResult.goldEarned).toBeGreaterThan(0);
    expect(quickSellResult.state.session.loot).toHaveLength(1);
    expect(quickSellResult.state.session.loot[0].itemId).toBe(2463);
  });

  it('Onda 3 - UI & Hydration: Lock / Unlock context menu, padlock badge, and DB hydration', () => {
    const itemContextMenuSrc = readFileSync(resolve(projectRoot, 'apps/web/components/ItemContextMenu.tsx'), 'utf8');
    const inventoryWindowSrc = readFileSync(resolve(projectRoot, 'apps/web/components/InventoryWindow.tsx'), 'utf8');
    const globalsCssSrc = readFileSync(resolve(projectRoot, 'app/globals.css'), 'utf8');

    // Context menu tem opção de travar/destravar
    expect(itemContextMenuSrc).toContain('onToggleLockItem');
    expect(itemContextMenuSrc).toContain('Lock item');
    expect(itemContextMenuSrc).toContain('Unlock item');

    // Indicador visual de cadeado cinza
    expect(inventoryWindowSrc).toContain('item-lock-padlock-badge');
    expect(globalsCssSrc).toContain('.item-lock-padlock-badge');

    // Hydration lê locked: true de attributesJson
    const dbInventoryMock = [
      {
        slot: 'backpack_loot_0',
        serverId: 2463,
        name: 'Plate Armor',
        count: 1,
        attributesJson: JSON.stringify({ locked: true }),
      },
      {
        slot: 'bag_0',
        serverId: 2160,
        name: 'Crystal Coin',
        count: 5,
        attributesJson: JSON.stringify({ locked: false }),
      },
    ];

    const hydrated = parseInventoryData(dbInventoryMock as any, []);
    expect(hydrated.loot[0].locked).toBe(true);
    expect(hydrated.bag[0].locked).toBe(false);
  });

  it('Onda 4 - 10-Minute Hunt Auto-Sell & 2-Minute Quick Sell Cooldown', () => {
    const protoSrc = readFileSync(resolve(projectRoot, 'apps/web/components/GamePrototype.tsx'), 'utf8');
    const bottomDockSrc = readFileSync(resolve(projectRoot, 'apps/web/components/BottomDock.tsx'), 'utf8');
    const quickSellWinSrc = readFileSync(resolve(projectRoot, 'apps/web/components/QuickSellWindow.tsx'), 'utf8');

    // Auto-venda periódica a cada 10 minutos (600s) nas hunts
    expect(protoSrc).toContain('AUTO_SELL_INTERVAL_MS = 10 * 60 * 1000');
    expect(protoSrc).toContain('sellAllLoot(cur, content)');

    // Cooldown de 2 minutos (120s) na Venda Rápida em hunts
    expect(protoSrc).toContain('setQuickSellCooldownUntil(Date.now() + 120_000)');
    expect(protoSrc).toContain('quickSellCooldownRemaining');
    expect(bottomDockSrc).toContain('quickSellCooldownRemaining');
    expect(quickSellWinSrc).toContain('cooldownRemaining');
  });

  it('Onda 5 - Real-Time Player Body Turn Synchronization', () => {
    const movementHandlerSrc = readFileSync(resolve(projectRoot, 'packages/server/src/rooms/handlers/CityMovementHandler.ts'), 'utf8');
    const netManagerSrc = readFileSync(resolve(projectRoot, 'apps/web/lib/GameClientNetworkManager.ts'), 'utf8');
    const thaisArenaSrc = readFileSync(resolve(projectRoot, 'apps/web/components/ThaisCityArena.tsx'), 'utf8');
    const protoSrc = readFileSync(resolve(projectRoot, 'apps/web/components/GamePrototype.tsx'), 'utf8');

    // Servidor escuta mensagem 'turn'
    expect(movementHandlerSrc).toContain("this.room.onMessage('turn'");

    // Network manager envia turn
    expect(netManagerSrc).toContain('sendTurn(direction:');

    // Cliente renderiza direção em tempo real sem travar em lastDirection
    expect(thaisArenaSrc).toContain('p.direction || sample.direction');

    // Teclado envia turn em tempo real e suporta virar no mesmo quadrado com Ctrl
    expect(protoSrc).toContain('gameNetwork.sendTurn(turnDir)');
    expect(protoSrc).toContain('gameNetwork.sendTurn(stepDir)');
  });
});
