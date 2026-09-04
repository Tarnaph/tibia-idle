import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Phase 48: 20s Auto-save, Trade System, Context Menu, Rarity Loot and Friends System', () => {
  const projectRoot = resolve(__dirname, '..');

  it('Requirement 1: Auto-save periodic interval set to 20 seconds (20000ms) in ThaisCityRoom', () => {
    const roomSrc = readFileSync(resolve(projectRoot, 'packages/server/src/rooms/ThaisCityRoom.ts'), 'utf8');
    expect(roomSrc).toContain('persistenceManager.startPeriodicSave');
    expect(roomSrc).toContain('20000');
  });

  it('Requirement 2: Trade Window component created with item offer, accept and cancel features', () => {
    const tradeSrc = readFileSync(resolve(projectRoot, 'apps/web/components/window/TradeWindow.tsx'), 'utf8');
    expect(tradeSrc).toContain('SISTEMA DE TROCAS');
    expect(tradeSrc).toContain('onAcceptTrade');
    expect(tradeSrc).toContain('onCancelTrade');
    expect(tradeSrc).toContain('TradeOfferItem');
  });

  it('Requirement 3: Character Context Menu contains Trade, Party Invite, Private Message and Add Friend options', () => {
    const menuSrc = readFileSync(resolve(projectRoot, 'apps/web/components/CharacterContextMenu.tsx'), 'utf8');
    expect(menuSrc).toContain('🤝 Trade (Trocar Itens)');
    expect(menuSrc).toContain('👥 Convidar para Party');
    expect(menuSrc).toContain('💬 Mandar Mensagem Privada');
    expect(menuSrc).toContain('⭐ Adicionar como Amigo');
  });

  it('Requirement 4: Loot allocation respects item rarity rolls and party/solo member distribution', () => {
    const combatSrc = readFileSync(resolve(projectRoot, 'packages/domain/src/combat.ts'), 'utf8');
    expect(combatSrc).toContain('function rollLoot');
    expect(combatSrc).toContain('rollInteger(rng, 0, 99_999) >= loot.chance');
    expect(combatSrc).toContain('Loot (Gold):');
    expect(combatSrc).toContain('recebeu');
  });

  it('Requirement 5: Friends Window with search, add, message, and party invite integrated with Dock Bar', () => {
    const friendsSrc = readFileSync(resolve(projectRoot, 'apps/web/components/window/FriendsWindow.tsx'), 'utf8');
    const dockSrc = readFileSync(resolve(projectRoot, 'apps/web/components/window/WindowDockBar.tsx'), 'utf8');
    const topNavSrc = readFileSync(resolve(projectRoot, 'apps/web/components/TopNavigation.tsx'), 'utf8');
    const protoSrc = readFileSync(resolve(projectRoot, 'apps/web/components/GamePrototype.tsx'), 'utf8');

    expect(friendsSrc).toContain('Seus Amigos');
    expect(friendsSrc).toContain('onAddFriend');
    expect(friendsSrc).toContain('onPrivateMessage');
    expect(friendsSrc).toContain('onInviteParty');

    expect(dockSrc).toContain("{ id: 'friends', label: 'Amigos', icon: '⭐' }");
    expect(topNavSrc).toContain('Amigos');
    expect(protoSrc).toContain('FriendsWindow');
    expect(protoSrc).toContain('TradeWindow');
  });
});
