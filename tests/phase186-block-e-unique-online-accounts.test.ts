import { describe, it, expect } from 'vitest';
import { ThaisCityRoom } from '../packages/server/src/rooms/ThaisCityRoom';
import { PlayerState } from '../packages/server/src/schemas/PlayerState';
import { MonsterState } from '../packages/server/src/schemas/MonsterState';
import { WorldState } from '../packages/server/src/schemas/WorldState';

describe('Phase 186 Bloco E - Contador Real de Contas Únicas Online', () => {
  it('1. deduplica múltiplas abas da mesma conta sem inflar o contador', () => {
    const room = new ThaisCityRoom();
    room.state = new WorldState();

    const p1 = new PlayerState();
    p1.id = 'session-tab-1';
    p1.characterId = 'char-wolfy';
    p1.accountId = 'acc-wolfy-uuid';
    p1.name = 'Wolfy';
    p1.inHunt = false;
    room.state.players.set('session-tab-1', p1);

    // Mesma conta abrindo segunda aba (ex: antes do kick ou em aba duplicada)
    const p2 = new PlayerState();
    p2.id = 'session-tab-2';
    p2.characterId = 'char-wolfy';
    p2.accountId = 'acc-wolfy-uuid';
    p2.name = 'Wolfy';
    p2.inHunt = false;
    room.state.players.set('session-tab-2', p2);

    expect(room.state.players.size).toBe(2);
    // Mas contas únicas DEVE ser 1!
    const count = room.getUniqueOnlineAccountsCount();
    expect(count).toBe(1);
  });

  it('2. inclui jogadores na cidade e em caçadas de forma precisa', () => {
    const room = new ThaisCityRoom();
    room.state = new WorldState();

    // Jogador 1 na cidade
    const p1 = new PlayerState();
    p1.id = 'session-1';
    p1.characterId = 'char-1';
    p1.accountId = 'acc-alpha';
    p1.name = 'Alpha';
    p1.inHunt = false;
    room.state.players.set('session-1', p1);

    // Jogador 2 em caçada (inHunt = true)
    const p2 = new PlayerState();
    p2.id = 'session-2';
    p2.characterId = 'char-2';
    p2.accountId = 'acc-beta';
    p2.name = 'Beta';
    p2.inHunt = true;
    p2.lastHuntId = 'rotworm-cave';
    room.state.players.set('session-2', p2);

    // Jogador 3 em caçada de dragão
    const p3 = new PlayerState();
    p3.id = 'session-3';
    p3.characterId = 'char-3';
    p3.accountId = 'acc-gamma';
    p3.name = 'Gamma';
    p3.inHunt = true;
    p3.lastHuntId = 'dragon-lair';
    room.state.players.set('session-3', p3);

    const count = room.getUniqueOnlineAccountsCount();
    expect(count).toBe(3);
  });

  it('3. monstros não inflam o contador de jogadores online', () => {
    const room = new ThaisCityRoom();
    room.state = new WorldState();

    const p1 = new PlayerState();
    p1.id = 'session-1';
    p1.characterId = 'char-1';
    p1.accountId = 'acc-alpha';
    p1.name = 'Alpha';
    room.state.players.set('session-1', p1);

    // Adiciona 5 monstros ao mapa da cidade
    for (let i = 0; i < 5; i++) {
      const monster = new MonsterState();
      monster.id = `monster-${i}`;
      monster.name = 'Training Dummy';
      monster.hp = 1000;
      monster.isDead = false;
      room.state.monsters.set(`monster-${i}`, monster);
    }

    expect(room.state.monsters.size).toBe(5);
    // Contador único continua sendo estritamente 1 jogador humano
    const count = room.getUniqueOnlineAccountsCount();
    expect(count).toBe(1);
  });

  it('4. desconexão de conta decrementa o contador e atualiza estado do Colyseus', () => {
    const room = new ThaisCityRoom();
    room.state = new WorldState();

    const p1 = new PlayerState();
    p1.id = 'session-1';
    p1.accountId = 'acc-1';
    room.state.players.set('session-1', p1);

    const p2 = new PlayerState();
    p2.id = 'session-2';
    p2.accountId = 'acc-2';
    room.state.players.set('session-2', p2);

    room.updateOnlineAccountsCount();
    expect(room.state.uniqueAccountsOnline).toBe(2);

    // p2 sai
    room.state.players.delete('session-2');
    room.updateOnlineAccountsCount();
    expect(room.state.uniqueAccountsOnline).toBe(1);
  });
});
