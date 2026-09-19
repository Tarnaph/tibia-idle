import { describe, expect, it } from 'vitest';
import {
  createIdleGame,
  grantSharedExperience,
  transferActiveMemberOnDeath,
  selectedCharacterOf,
  addPartyMember,
  sharedExperiencePerCharacter,
} from '../packages/domain/src';
import { content } from './fixture';

describe('Phase 213: Party Death Handling, Camera Transfer and Zero XP on Death', () => {
  it('garante que personagem morto não ganhe experiência e que sobreviventes recebam a fatia correta', () => {
    let game = createIdleGame('p213-xp-test', content);
    // Adiciona mais membros na party para testar party mista
    game = addPartyMember(game, 'Druid Healer', 'Druid', content);
    game = addPartyMember(game, 'Sorcerer Nuker', 'Sorcerer', content);

    expect(game.session.characters.length).toBe(3);

    const knight = game.session.characters[0];
    const druid = game.session.characters[1];
    const sorcerer = game.session.characters[2];

    const initialKnightXp = knight.experience;
    const initialDruidXp = druid.experience;
    const initialSorcererXp = sorcerer.experience;

    // Simula a morte do Knight (vida zerada e ator morto)
    knight.currentHp = 0;
    const knightActor = game.encounter.partyActors.find((a) => a.characterId === knight.id);
    if (knightActor) {
      knightActor.alive = false;
      knightActor.hp = 0;
    }

    // Concede 1000 de XP compartilhada
    grantSharedExperience(game, 1000, content, 1.0);

    // 1. O Knight morto NÃO deve ter ganho NENHUMA experiência
    expect(knight.experience).toBe(initialKnightXp);

    // 2. Os sobreviventes vivos (Druid e Sorcerer) devem ter recebido XP dividida entre eles
    expect(druid.experience).toBeGreaterThan(initialDruidXp);
    expect(sorcerer.experience).toBeGreaterThan(initialSorcererXp);

    // 3. Nenhum evento 'experience-gained' deve ter sido gerado para o Knight
    const knightEvents = game.encounter.events.filter(
      (e: any) => e.type === 'experience-gained' && e.characterId === knight.id
    );
    expect(knightEvents.length).toBe(0);

    // 4. Eventos 'experience-gained' devem ter sido emitidos apenas para Druid e Sorcerer
    const survivorEvents = game.encounter.events.filter(
      (e: any) => e.type === 'experience-gained' && (e.characterId === druid.id || e.characterId === sorcerer.id)
    );
    expect(survivorEvents.length).toBe(2);
  });

  it('não concede experiência caso todos os membros da party estejam mortos', () => {
    const game = createIdleGame('p213-all-dead', content);
    for (const char of game.session.characters) {
      char.currentHp = 0;
    }
    for (const actor of game.encounter.partyActors) {
      actor.alive = false;
      actor.hp = 0;
    }

    expect(() => grantSharedExperience(game, 5000, content, 1.0)).not.toThrow();
    for (const char of game.session.characters) {
      expect(char.experience).toBe(0);
    }
  });

  it('sharedExperiencePerCharacter retorna 0 defensivamente se a lista de personagens estiver vazia', () => {
    expect(sharedExperiencePerCharacter(1000, [])).toBe(0);
  });

  it('transfere automaticamente o controle e foco da câmera para o membro vivo de maior nível ao morrer o personagem ativo', () => {
    let game = createIdleGame('p213-transfer-test', content);
    game = addPartyMember(game, 'Paladin Mid', 'Paladin', content);
    game = addPartyMember(game, 'Sorcerer High', 'Sorcerer', content);

    const [knight, paladin, sorcerer] = game.session.characters;

    // Configura níveis distintos
    knight.level = 50;
    paladin.level = 70;
    sorcerer.level = 95; // Maior nível

    // O jogador está controlando o Knight (líder e selecionado)
    game.session.selectedCharacterId = knight.id;
    game.session.cameraTargetCharacterId = knight.id;
    game.session.leaderId = knight.id;

    // Morte do Knight
    knight.currentHp = 0;
    const kActor = game.encounter.partyActors.find((a) => a.characterId === knight.id)!;
    kActor.alive = false;
    kActor.hp = 0;

    // Executa a transferência de controle na morte
    transferActiveMemberOnDeath(game, knight.id);

    // O novo personagem ativo, foco da câmera e líder DEVE ser o Sorcerer (Nível 95)
    expect(game.session.selectedCharacterId).toBe(sorcerer.id);
    expect(game.session.cameraTargetCharacterId).toBe(sorcerer.id);
    expect(game.session.leaderId).toBe(sorcerer.id);

    // selectedCharacterOf deve resolver para o Sorcerer
    expect(selectedCharacterOf(game).id).toBe(sorcerer.id);

    // Evento de líder transferido emitido
    const transferEvent = game.encounter.events.find(
      (e: any) => e.type === 'leader-transferred' && e.toId === sorcerer.id
    );
    expect(transferEvent).toBeDefined();
  });

  it('desempata por maior experiência quando membros vivos possuem o mesmo nível', () => {
    let game = createIdleGame('p213-tie-break', content);
    game = addPartyMember(game, 'Paladin EqualA', 'Paladin', content);
    game = addPartyMember(game, 'Druid EqualB', 'Druid', content);

    const [knight, paladin, druid] = game.session.characters;

    knight.level = 80;
    paladin.level = 60;
    paladin.experience = 150_000;
    druid.level = 60;
    druid.experience = 195_000; // Mesmo nível 60, mas mais experiência

    game.session.selectedCharacterId = knight.id;
    game.session.cameraTargetCharacterId = knight.id;
    game.session.leaderId = knight.id;

    knight.currentHp = 0;
    const kActor = game.encounter.partyActors.find((a) => a.characterId === knight.id)!;
    kActor.alive = false;
    kActor.hp = 0;

    transferActiveMemberOnDeath(game, knight.id);

    // Deve escolher Druid pelo desempate de maior XP (195.000 > 150.000)
    expect(game.session.selectedCharacterId).toBe(druid.id);
    expect(game.session.cameraTargetCharacterId).toBe(druid.id);
    expect(game.session.leaderId).toBe(druid.id);
  });

  it('se um membro ativo morre sem ser o líder, transfere foco e câmera para o maior nível mantendo o líder', () => {
    let game = createIdleGame('p213-non-leader-active', content);
    game = addPartyMember(game, 'Elder Druid Healer', 'Druid', content);
    game = addPartyMember(game, 'Master Sorcerer Burst', 'Sorcerer', content);

    const [knight, druid, sorcerer] = game.session.characters;
    knight.level = 100;
    druid.level = 80;
    sorcerer.level = 90;

    // Knight é o líder, mas o jogador estava temporariamente focando no Druid (nível 80)
    game.session.leaderId = knight.id;
    game.session.selectedCharacterId = druid.id;
    game.session.cameraTargetCharacterId = druid.id;

    // Druid morre
    druid.currentHp = 0;
    const dActor = game.encounter.partyActors.find((a) => a.characterId === druid.id);
    if (dActor) {
      dActor.alive = false;
      dActor.hp = 0;
    }

    transferActiveMemberOnDeath(game, druid.id);

    // O líder continua sendo o Knight (já que não morreu)
    expect(game.session.leaderId).toBe(knight.id);

    // O foco e a câmera voltam para o membro vivo de maior nível (Knight, nível 100)
    expect(game.session.selectedCharacterId).toBe(knight.id);
    expect(game.session.cameraTargetCharacterId).toBe(knight.id);
  });
});
