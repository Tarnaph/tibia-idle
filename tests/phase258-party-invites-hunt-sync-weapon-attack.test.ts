import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  createIdleGame,
  startGame,
  advanceCombat,
  sharedExperiencePerCharacter,
  type GameContent,
  type CharacterState,
  type PartyActorState,
} from '../packages/domain/src';
import { content } from './fixture';

describe('Phase 258: Multiplayer Party Invites, Seamless Hunt Transitions & Weapon/Spell Concurrent Attack Cycle', () => {
  const projectRoot = resolve(__dirname, '..');

  it('Onda 1 - Party Invites: CityPartyHandler has authoritative target lookup, self-invite protection, max 4 members and invitation dispatch', () => {
    const handlerSrc = readFileSync(
      resolve(projectRoot, 'packages/server/src/rooms/handlers/CityPartyHandler.ts'),
      'utf8'
    );

    // Reativação do party:invite com busca do alvo e validações
    expect(handlerSrc).toContain("this.room.onMessage('party:invite'");
    expect(handlerSrc).toContain('targetClient.send(\'party:invitationReceived\'');
    expect(handlerSrc).toContain('client.send(\'party:inviteSent\'');
    expect(handlerSrc).toContain('Você não pode convidar a si mesmo para a party');
    expect(handlerSrc).toContain('A party já está cheia (máximo de 4 integrantes)');
    expect(handlerSrc).toContain('Apenas o líder da party pode convidar novos membros');

    // Validação de capacidade no party:acceptInvite
    expect(handlerSrc).toContain("this.room.onMessage('party:acceptInvite'");
    expect(handlerSrc).toContain('A party atingiu a capacidade máxima de 4 membros');
  });

  it('Onda 2 - Desacoplamento do Auto-Ataque com Armas e Magias: combate permite disparo de armas sem bloqueio por magias ofensivas', () => {
    const combatSrc = readFileSync(
      resolve(projectRoot, 'packages/domain/src/combat.ts'),
      'utf8'
    );

    // 1. Spells ofensivas e runas não adiam mais o nextAttackAt da arma
    expect(combatSrc).not.toMatch(/actor\.nextAttackAt\s*=\s*encounter\.elapsedMs\s*\+\s*spell\.groupCooldownMs/);
    expect(combatSrc).not.toMatch(/actor\.nextAttackAt\s*=\s*encounter\.elapsedMs\s*\+\s*rune\.cooldownMs/);

    // 2. playerAttacks não cancela ataque básico se groupCooldowns['attack'] estiver em cooldown
    expect(combatSrc).not.toContain("actor.nextAttackAt || (actor.groupCooldowns['attack'] ?? 0) > encounter.elapsedMs");
    expect(combatSrc).toContain('if (encounter.elapsedMs < actor.nextAttackAt) continue;');

    // 3. Auto-ataque básico não bloqueia runas nem magias
    expect(combatSrc).not.toContain("actor.groupCooldowns['rune'] = encounter.elapsedMs + stats.attackIntervalMs");
  });

  it('Onda 2 (Runtime) - Auto-ataque e Magias: nextAttackAt não é cancelado quando groupCooldowns["attack"] está ativo', () => {
    let game = createIdleGame('test-arrow-magic', content, 'rat-cellars');
    game = startGame(game, content);
    const actor = game.encounter.partyActors[0];
    expect(actor).toBeDefined();

    // Posiciona um inimigo vivo a 1 sqm para garantir alcance de ataque
    if (game.encounter.enemies.length > 0) {
      game.encounter.enemies[0].alive = true;
      game.encounter.enemies[0].hp = 50;
      game.encounter.enemies[0].position = { x: actor.position.x + 1, y: actor.position.y, z: actor.position.z };
      actor.targetId = game.encounter.enemies[0].id;
    }

    // Simula que o personagem acabou de disparar uma magia ofensiva (cooldown de grupo ativo até 2000ms)
    actor.groupCooldowns['attack'] = 2000;
    // O relógio do ataque básico da arma venceu (está pronto para atacar)
    actor.nextAttackAt = 0;

    // Executa avanço de combate
    const nextGame = advanceCombat(game, content, 120);
    const updatedActor = nextGame.encounter.partyActors[0];

    // O ataque da arma deve ter conseguido disparar e avançado seu nextAttackAt para frente (próximo intervalo)
    expect(updatedActor.nextAttackAt).toBeGreaterThan(0);
  });

  it('Onda 3 - Full Team Shared Experience: fórmula canônica de XP concede 100% de bônus para 4 vocações distintas', () => {
    const chars: CharacterState[] = [
      { id: '1', name: 'Knight', baseVocation: 'Knight' } as any,
      { id: '2', name: 'Paladin', baseVocation: 'Paladin' } as any,
      { id: '3', name: 'Sorcerer', baseVocation: 'Sorcerer' } as any,
      { id: '4', name: 'Druid', baseVocation: 'Druid' } as any,
    ];

    const rawXp = 1000;
    const sharedXp = sharedExperiencePerCharacter(rawXp, chars);

    // Com 4 vocações diferentes: multiplicador = 2.0 (100% bônus).
    // (1000 * 2.0) / 4 = 500 XP por membro (em vez de 250 se fosse divisão pura sem bônus)
    expect(sharedXp).toBe(500);
  });

  it('Onda 3 - Transição Fluida para Caçada em Grupo: GamePrototype inicializa caçada para seguidores no onFinish do ExuraLoadingScreen', () => {
    const protoSrc = readFileSync(
      resolve(projectRoot, 'apps/web/components/GamePrototype.tsx'),
      'utf8'
    );

    // Garante que o seguidor aciona restartHunt e setMode('hunt') ao concluir o loading
    expect(protoSrc).toContain("if (modeRef.current !== 'hunt')");
    expect(protoSrc).toContain('setGame((current) => restartHunt(prepareHuntCharactersRef.current(current), pending.nextSeed, content, pending.huntId, pending.pullSize ?? \'cauteloso\'));');
    expect(protoSrc).toContain("setMode('hunt');");
  });
});
