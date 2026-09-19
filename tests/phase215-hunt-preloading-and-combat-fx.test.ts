import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  createIdleGame,
  startGame,
  triggerManualHotbarAction,
  castAutomaticSpells,
  advanceCombat,
  synchronizeEncounterOccupancy,
  findMeleeApproachTiles,
} from '../packages/domain/src';
import { content } from './fixture';
import { huntAssetPreloader } from '../apps/web/lib/huntAssetPreloader';

describe('Phase 215 - Exori & Area Spell Ghost Cooldown Prevention', () => {
  it('castAutomaticSpells does NOT cast Exori in the air when enemies are outside 1 SQM range', () => {
    const game = startGame(createIdleGame('p215-exori-autocast', content, 'rat-cellars'), content);
    const char = game.session.characters[0];
    char.vocation = 'Elite Knight';
    char.baseVocation = 'Knight';
    char.level = 60;
    char.hotbar[0] = 80; // Berserk (exori)
    
    const actor = game.encounter.partyActors[0];
    actor.mana = 200;
    const initialMana = actor.mana;

    // Garante que nenhum inimigo está colado (1 SQM) no jogador
    for (const enemy of game.encounter.enemies) {
      if (Math.abs(enemy.position.x - actor.position.x) <= 1 && Math.abs(enemy.position.y - actor.position.y) <= 1) {
        enemy.alive = false; // Desativa inimigos adjacentes para garantir que só há inimigos distantes
      }
    }
    synchronizeEncounterOccupancy(game.encounter);

    // Executa cast automático
    castAutomaticSpells(game, content, true);

    // Não deve ter gastado mana nem aplicado cooldown no exori
    expect(actor.mana).toBe(initialMana);
    expect(actor.spellCooldowns['80']).toBeUndefined();
  });

  it('triggerManualHotbarAction for Exori hits adjacent enemies and produces 8 surrounding visual tiles', () => {
    const game = startGame(createIdleGame('p215-exori-manual-hit', content, 'rat-cellars'), content);
    const char = game.session.characters[0];
    char.vocation = 'Elite Knight';
    char.baseVocation = 'Knight';
    char.level = 80;
    char.hotbar[0] = 80; // Berserk (exori)

    const actor = game.encounter.partyActors[0];
    actor.mana = 300;

    const approaches = findMeleeApproachTiles(
      game.encounter.room.map,
      actor.position,
      new Set(game.encounter.room.occupancy.keys())
    );
    expect(approaches.length).toBeGreaterThan(0);

    // Posiciona um rato adjacente em tile válido
    const enemy = game.encounter.enemies[0];
    enemy.alive = true;
    enemy.hp = 300;
    enemy.maxHp = 300;
    enemy.position = { ...approaches[0] };
    enemy.previousPosition = { ...approaches[0] };
    synchronizeEncounterOccupancy(game.encounter);

    game.encounter.events = [];
    const castSuccess = triggerManualHotbarAction(game, actor.characterId, 80, content);
    expect(castSuccess).toBe(true);

    // Dano aplicado
    expect(enemy.hp).toBeLessThan(300);

    // Efeitos visuais nos 8 tiles
    const areaVisuals = game.encounter.events.filter(
      (e: any) => e.type === 'spell-visual' && e.spellId === 80 && e.effectId === 10 && e.targetPosition
    );
    expect(areaVisuals.length).toBe(8);
  });
});

describe('Phase 215 - Melee Physical Combat Visual Events (Blood & Block)', () => {
  it('advanceCombat generates melee-hit visual events with effectId 1 on damage or 4 on block', () => {
    let game = startGame(createIdleGame('p215-melee-fx', content, 'rat-cellars'), content);
    const actor = game.encounter.partyActors[0];
    const approaches = findMeleeApproachTiles(
      game.encounter.room.map,
      actor.position,
      new Set(game.encounter.room.occupancy.keys())
    );
    expect(approaches.length).toBeGreaterThan(0);

    const enemy = game.encounter.enemies[0];
    enemy.alive = true;
    enemy.position = { ...approaches[0] };
    enemy.previousPosition = { ...approaches[0] };
    synchronizeEncounterOccupancy(game.encounter);

    actor.targetId = enemy.id;
    actor.nextAttackAt = 0; // Pronto para atacar imediatamente

    game.encounter.visualEvents = [];
    // Primeiro tick agenda o ataque (pendingAttack com impactAt de 180ms)
    game = advanceCombat(game, content, 200);
    // Segundo tick atinge o tempo de impacto e emite o evento melee-hit
    game = advanceCombat(game, content, 200);

    const meleeHits = (game.encounter.visualEvents || []).filter((e: any) => e.type === 'melee-hit');
    expect(meleeHits.length).toBeGreaterThan(0);

    for (const hit of meleeHits) {
      if (hit.type === 'melee-hit') {
        if (hit.blocked) {
          expect(hit.effectId).toBe(4); // Faísca de escudo / puff
        } else {
          expect(hit.effectId).toBe(1); // Sangue espirrando
        }
      }
    }
  });
});

describe('Phase 215 - Hunt Asset Preloading & Cyclops Smith Sprite', () => {
  it('huntAssetPreloader includes monster IDs and essential atlas assets for cyclops-camp', () => {
    const monsterIds = huntAssetPreloader.getHuntMonsterIds('cyclops-camp');
    expect(monsterIds).toContain('cyclops');
    expect(monsterIds).toContain('cyclops-smith');

    const urls = huntAssetPreloader.getHuntEssentialAssetUrls('cyclops-camp');
    expect(urls.length).toBeGreaterThanOrEqual(3);
    expect(urls.some((u) => u.includes('cyclops-smith'))).toBe(true);
    expect(urls.some((u) => u.includes('hunt-cyclops-camp-atlas.png'))).toBe(true);
  });

  it('Cyclops Smith bestiary sprite is authentic 64x64 PNG and not empty', () => {
    const spritePath = path.resolve(process.cwd(), 'public/generated/bestiary/cyclops-smith.png');
    expect(fs.existsSync(spritePath)).toBe(true);
    
    const buffer = fs.readFileSync(spritePath);
    expect(buffer.length).toBeGreaterThan(1500);

    // PNG Header verification (Width at bytes 16-19, Height at bytes 20-23)
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    expect(width).toBe(64);
    expect(height).toBe(64);
  });

  it('Cyclops Smith thumbnail sprite exists and is 64x64', () => {
    const thumbPath = path.resolve(process.cwd(), 'public/generated/tibia1098/monster-cyclops-smith-thumb.png');
    expect(fs.existsSync(thumbPath)).toBe(true);

    const buffer = fs.readFileSync(thumbPath);
    expect(buffer.length).toBeGreaterThan(1500);

    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    expect(width).toBe(64);
    expect(height).toBe(64);
  });
});
