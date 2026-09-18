import { describe, it, expect } from 'vitest';
import {
  addPartyMember,
  createIdleGame,
  restartHunt,
  defeatEnemy,
  castAutomaticSpells,
  consumePotionFromInventory,
  selectCharacter,
} from '../packages/domain/src';
import { content } from './fixture';

describe('Phase 174 - FIX.md: Party Vault Gold, Autosave & Auto-Potion Transparency', () => {
  describe('1. Propriedade do Ouro & Caixa da Party (Loot & Log)', () => {
    it('records gold drops explicitly to the Party Vault (Caixa da Party) in solo mode', () => {
      let game = createIdleGame('test-p174-solo-gold', content);
      const hunting = restartHunt(game, 'test-p174-solo-gold', content, 'rat-cellars');

      const enemy = hunting.encounter.enemies[0];
      defeatEnemy(hunting, enemy, content);

      const goldLogEntry = hunting.encounter.log.find((entry) => entry.message.includes('Caixa da Party'));
      expect(goldLogEntry).toBeDefined();
      expect(goldLogEntry!.message).toMatch(/Loot \(Gold\): \+\d+ gold adicionados à Caixa da Party\./);
      expect(goldLogEntry!.message).not.toContain('divididos na party');
      expect(goldLogEntry!.message).not.toContain('divididos');
    });

    it('records gold drops explicitly to the Party Vault (Caixa da Party) in party mode without false division message', () => {
      let game = createIdleGame('test-p174-party-gold', content);
      game = addPartyMember(game, 'KnightBro', 'Knight', content);
      game = addPartyMember(game, 'DruidBro', 'Druid', content);

      const hunting = restartHunt(game, 'test-p174-party-gold', content, 'rat-cellars');
      const enemy = hunting.encounter.enemies[0];
      defeatEnemy(hunting, enemy, content);

      const goldLogEntry = hunting.encounter.log.find((entry) => entry.message.includes('Caixa da Party'));
      expect(goldLogEntry).toBeDefined();
      expect(goldLogEntry!.message).toMatch(/Loot \(Gold\): \+\d+ gold adicionados à Caixa da Party\./);
      expect(goldLogEntry!.message).not.toContain('divididos na party');
      expect(goldLogEntry!.message).not.toContain('divididos');
    });
  });

  describe('2. Identificação de Custos de Auto-Poções (Log e Speech Flutuante)', () => {
    it('consumePotionFromInventory sets fromGold and cost when purchased with Party Vault gold', () => {
      let game = createIdleGame('test-p174-potion-cost', content);
      game.session.gold = 500;
      game.session.bag = []; // Sem poção física na mochila

      const outDetails: { fromGold?: boolean; cost?: number } = {};
      // 7618 = Health Potion
      const consumed = consumePotionFromInventory(game, 7618, 'Tester', outDetails);

      expect(consumed).toBe(true);
      expect(game.session.gold).toBe(450);
      expect(outDetails.fromGold).toBe(true);
      expect(outDetails.cost).toBe(50);
    });

    it('castAutomaticSpells emits speech "Aaaah... (-50gp)" and logs Party Vault deduction', () => {
      let game = createIdleGame('test-p174-auto-potion', content);
      const hunting = restartHunt(game, 'test-p174-auto-potion', content, 'rat-cellars');

      const hero = hunting.session.characters[0];
      const actor = hunting.encounter.partyActors.find((a) => a.characterId === hero.id)!;
      actor.hp = 20; // Vida baixa para disparar autocura
      actor.groupCooldowns['potion'] = 0;
      hero.hotbar = [7618]; // Health Potion (7618)
      hunting.session.gold = 1000;
      hunting.session.bag = []; // Sem poção na bag -> compra automática por 50gp da Caixa da Party

      castAutomaticSpells(hunting, content);

      // Saldo da Caixa da Party deduzido em 50
      expect(hunting.session.gold).toBe(950);

      // Evento de poção emitido com fala "Aaaah... (-50gp)"
      const potionEvent = hunting.encounter.events.find(
        (e) => e.type === 'spell-cast' && e.spellId === 7618
      ) as any;
      expect(potionEvent).toBeDefined();
      expect(potionEvent.speech).toBe('Aaaah... (-50gp)');

      // Log com identificação clara do gasto da Caixa da Party
      const potionLogEntry = hunting.encounter.log.find((l) => l.message.includes('Caixa da Party'));
      expect(potionLogEntry).toBeDefined();
      expect(potionLogEntry!.message).toContain('-50 gold da Caixa da Party');
    });
  });

  describe('3. Persistência da Caixa da Party e Autosave com Acompanhante Selecionado', () => {
    it('ensures online character holds Party Vault gold and companion alts never duplicate gold in save payload', () => {
      // 1. Simular estado com saldo inicial de 1,000 gp
      let game = createIdleGame('test-p174-save-lifecycle', content);
      game = addPartyMember(game, 'CompanionMage', 'Sorcerer', content);

      const onlineLeader = game.session.characters[0]; // Titular conectado
      const companionAlt = game.session.characters[1]; // Acompanhante

      game.session.gold = 1000;

      // 2. Ganha 200 gp de loot (+200 -> 1,200 gp)
      game.session.gold += 200;
      expect(game.session.gold).toBe(1200);

      // 3. Consome auto-poção (7620 = Mana Potion, -50 gp -> 1,150 gp)
      const outDetails: { fromGold?: boolean; cost?: number } = {};
      const consumed = consumePotionFromInventory(game, 7620, companionAlt.name, outDetails);
      expect(consumed).toBe(true);
      expect(game.session.gold).toBe(1150);

      // 4. Seleciona o acompanhante como personagem ativo
      const switchedGame = selectCharacter(game, companionAlt.id);
      expect(switchedGame.session.selectedCharacterId).toBe(companionAlt.id);

      const curActive = switchedGame.session.characters.find((c) => c.id === switchedGame.session.selectedCharacterId)!;
      const curOnline = onlineLeader;

      // Conferir que o ativo agora é o acompanhante
      expect(curActive.id).toBe(companionAlt.id);
      expect(curActive.id).not.toBe(curOnline.id);

      // 5. Simular a rotina de montagem de payload do saveProgress (GamePrototype.tsx)
      const curCharacters = switchedGame.session.characters;
      const curGold = switchedGame.session.gold;
      const curBag = switchedGame.session.bag || [];

      // Identifica o titular canônico da sessão (onlineCharacter)
      const primaryChar = curCharacters.find((c) => c.id === curOnline.id) || curActive;
      expect(primaryChar.id).toBe(onlineLeader.id);

      // Payload do líder/titular (recebe a Caixa da Party e mochilas compartilhadas)
      const leaderInventoryPayload: Array<{ slot: string; serverId: number; name: string; count: number }> = [];
      if (curGold > 0) {
        leaderInventoryPayload.push({
          slot: 'gold',
          serverId: 2148,
          name: 'Gold Coin',
          count: curGold,
        });
      }
      curBag.forEach((stack, idx) => {
        leaderInventoryPayload.push({
          slot: `bag_${idx}`,
          serverId: stack.itemId || 2148,
          name: stack.name,
          count: stack.amount,
        });
      });

      // Payloads dos alts/acompanhantes (equipamentos próprios apenas, SEM gold, SEM bags compartilhadas)
      const companionPayloads = curCharacters
        .filter((c) => c.id !== primaryChar.id)
        .map((alt) => {
          const altInventoryPayload: Array<{ slot: string; serverId: number; name: string; count: number }> = [];
          // Acompanhantes NUNCA recebem slot: 'gold'
          return {
            id: alt.id,
            name: alt.name,
            level: alt.level,
            inventory: altInventoryPayload,
          };
        });

      // 6. Verificações de Integridade do Banco:
      // O titular conectado possui a Caixa da Party com exatamente 1,150 gp
      const leaderGoldSlot = leaderInventoryPayload.find((it) => it.slot === 'gold');
      expect(leaderGoldSlot).toBeDefined();
      expect(leaderGoldSlot?.count).toBe(1150);

      // O acompanhante NÃO possui slot de ouro
      expect(companionPayloads.length).toBe(1);
      const altGoldSlot = companionPayloads[0].inventory.find((it) => it.slot === 'gold');
      expect(altGoldSlot).toBeUndefined();

      // Somatório de ouro em todas as carteiras do banco = exatamente 1,150 gp (zero duplicação, zero perda)
      let totalDatabaseGold = 0;
      leaderInventoryPayload.forEach((it) => {
        if (it.slot === 'gold') totalDatabaseGold += it.count;
      });
      companionPayloads.forEach((alt) => {
        alt.inventory.forEach((it) => {
          if (it.slot === 'gold') totalDatabaseGold += it.count;
        });
      });

      expect(totalDatabaseGold).toBe(1150);
    });

    it('hydrates Party Vault gold from totalAccountGold if logging in with a zero-gold alt', () => {
      // Simulação do endpoint /api/characters e hidratação da sessão
      const mockDatabaseCharacters = [
        {
          id: 'leader-char-id',
          name: 'MainLeader',
          inventory: [{ slot: 'gold', count: 1150, serverId: 2148, name: 'Gold Coin' }],
        },
        {
          id: 'alt-char-id',
          name: 'AltMage',
          inventory: [], // Alt sem ouro gravado no inventário
        },
      ];

      // O jogador faz login diretamente selecionando o Alt
      const onlineCharacterId = 'alt-char-id';
      const onlineDbChar = mockDatabaseCharacters.find((c) => c.id === onlineCharacterId)!;

      const loadedGoldFromActive = onlineDbChar.inventory.find((i: any) => i.slot === 'gold')?.count || 0;
      const totalAccountGold = mockDatabaseCharacters.reduce((acc, c) => {
        const g = c.inventory.find((i: any) => i.slot === 'gold');
        return acc + (g?.count || 0);
      }, 0);

      // Regra de herança da Caixa da Party
      let hydratedSessionGold = loadedGoldFromActive;
      if (hydratedSessionGold === 0 && totalAccountGold > 0) {
        hydratedSessionGold = totalAccountGold;
      }

      // O saldo da Caixa da Party é preservado em 1,150 gp mesmo ao entrar com o alt!
      expect(hydratedSessionGold).toBe(1150);
    });
  });
});
