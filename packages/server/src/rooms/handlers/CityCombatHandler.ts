import { Client } from '@colyseus/core';
import { MonsterState } from '../../schemas/MonsterState';
import { CombatEventSchema } from '../../schemas/CombatEventSchema';
import { PlayerState } from '../../schemas/PlayerState';
import { getWave4Tiles, vocationFor } from '../../../../domain/src';
import type { VocationName } from '../../../../content-schema/src';
import { serverConfigManager } from '../../config/ServerConfigManager';
import { isInViewport } from '../../utils/spatialGrid';
import type { ThaisCityRoom } from '../ThaisCityRoom';

export class CityCombatHandler {
  constructor(private room: ThaisCityRoom) {}

  public register(): void {
    this.room.onMessage('attack', (client, data: { targetId: string }) => {
      const player = this.room.state.players.get(client.sessionId);
      if (player) {
        player.targetId = data?.targetId || '';
      }
    });

    this.room.onMessage('castSpell', (client, data: { spellId: string }) => {
      if (data?.spellId) {
        this.handleCastSpell(client, data.spellId);
      }
    });

    this.room.onMessage('party:targetSync', (client, data: { targetId: string | null }) => {
      const leaderId = this.room.playerPartyLeader.get(client.sessionId);
      if (!leaderId) return;
      const party = this.room.parties.get(leaderId);
      if (!party || party.leaderSessionId !== client.sessionId) return;

      for (const memberId of party.memberSessionIds) {
        if (memberId !== client.sessionId) {
          const memberClient = this.room.clients.find((c) => c.sessionId === memberId);
          if (memberClient) {
            memberClient.send('party:targetUpdated', {
              targetId: data.targetId,
            });
          }
        }
      }
    });

    this.room.onMessage('training:action', (client, data: { style?: string; effectId?: number; projectileId?: number | null; dummyPos?: { x: number; y: number; z: number } }) => {
      const player = this.room.state.players.get(client.sessionId);
      if (!player || player.inHunt) return;

      const targetPos = data?.dummyPos || { x: 32349, y: 32221, z: 7 };
      this.pushCombatEvent(
        'training',
        player.id,
        'dummy',
        0,
        targetPos.x,
        targetPos.y,
        '',
        '#ffffff',
        data.projectileId || null,
        data.effectId || 10,
        player.posX,
        player.posY
      );
    });
  }

  public pushCombatEvent(
    type: string,
    sourceId: string,
    targetId: string,
    value: number,
    posX: number,
    posY: number,
    text: string,
    color: string,
    projectileId?: number | null,
    effectId?: number | null,
    fromX?: number,
    fromY?: number
  ): void {
    const event = new CombatEventSchema();
    event.id = `evt-${Date.now()}-${Math.random()}`;
    event.type = type;
    event.sourceId = sourceId;
    event.targetId = targetId;
    event.value = value;
    event.posX = posX;
    event.posY = posY;
    event.text = text;
    event.color = color;
    if (typeof projectileId === 'number') event.projectileId = projectileId;
    if (typeof effectId === 'number') event.effectId = effectId;
    event.timestamp = Date.now();

    this.room.state.combatEvents.push(event);
    if (this.room.state.combatEvents.length > 30) {
      this.room.state.combatEvents.shift();
    }

    // Broadcast combat event only to players who see the event in their viewport
    this.room.clients.forEach((c) => {
      const recipient = this.room.state.players.get(c.sessionId);
      if (recipient && isInViewport(posX, posY, recipient.posX, recipient.posY) && typeof c.send === 'function') {
        c.send('combatEvent', {
          type,
          sourceId,
          targetId,
          value,
          posX,
          posY,
          fromX: typeof fromX === 'number' ? fromX : posX,
          fromY: typeof fromY === 'number' ? fromY : posY,
          projectileId: projectileId ?? null,
          effectId: effectId ?? null,
          text,
          color,
          timestamp: event.timestamp,
        });
      }
    });
  }

  public handleCastSpell(client: Client, spellId: string): void {
    const player = this.room.state.players.get(client.sessionId);
    if (!player) return;

    const lowerSpell = spellId.toLowerCase().trim();

    if (lowerSpell === 'exura' || lowerSpell === 'exura-ico' || lowerSpell === 'exura ico') {
      const manaCost = 20;
      if (player.mp >= manaCost) {
        player.mp -= manaCost;
        const heal = 30 + Math.floor(Math.random() * 20);
        player.hp = Math.min(player.maxHp, player.hp + heal);

        this.pushCombatEvent('heal', player.id, player.id, heal, player.posX, player.posY, 'Exura', '#33ff33', null, 13);
      }
    } else if (lowerSpell === 'exura gran' || lowerSpell === 'exura-gran') {
      const manaCost = 70;
      if (player.mp >= manaCost) {
        player.mp -= manaCost;
        const heal = 80 + Math.floor(Math.random() * 60);
        player.hp = Math.min(player.maxHp, player.hp + heal);

        this.pushCombatEvent('spell', player.id, player.id, heal, player.posX, player.posY, 'Exura Gran', '#55ff55', null, 13);
      }
    } else if (lowerSpell === 'exura vita' || lowerSpell === 'exura-vita') {
      const manaCost = 160;
      if (player.mp >= manaCost) {
        player.mp -= manaCost;
        const heal = player.maxHp;
        player.hp = Math.min(player.maxHp, player.hp + heal);

        this.pushCombatEvent('spell', player.id, player.id, heal, player.posX, player.posY, 'Exura Vita', '#55ff55', null, 13);
      }
    } else if (lowerSpell === 'utani hur' || lowerSpell === 'utani-hur' || lowerSpell === 'speed' || lowerSpell === 'haste') {
      const manaCost = 60;
      if (player.mp >= manaCost) {
        player.mp -= manaCost;
        player.hasteUntil = Date.now() + 33000;
        this.pushCombatEvent('spell', player.id, player.id, 0, player.posX, player.posY, 'Utani Hur', '#ffff00', null, 15);
      }
    } else if (lowerSpell === 'utani gran hur' || lowerSpell === 'utani-gran-hur' || lowerSpell === 'strong haste') {
      const manaCost = 100;
      if (player.mp >= manaCost) {
        player.mp -= manaCost;
        player.hasteUntil = Date.now() + 33000;
        this.pushCombatEvent('spell', player.id, player.id, 0, player.posX, player.posY, 'Utani Gran Hur', '#ffff00', null, 15);
      }
    } else if (lowerSpell === 'utamo vita' || lowerSpell === 'utamo-vita' || lowerSpell === 'magic shield' || lowerSpell === '44') {
      const manaCost = 50;
      if (player.mp >= manaCost) {
        player.mp -= manaCost;
        player.magicShieldUntil = Date.now() + 200000;
        this.pushCombatEvent('spell', player.id, player.id, 0, player.posX, player.posY, 'Utamo Vita', '#33ffff', null, 13);
      }
    } else if (lowerSpell === 'exevo-flam-hur' || lowerSpell === '19' || lowerSpell === 'exevo flam hur' || lowerSpell === 'fire-wave') {
      const manaCost = 25;
      if (player.mp >= manaCost) {
        player.mp -= manaCost;

        this.pushCombatEvent('spell', player.id, '', 0, player.posX, player.posY, 'Exevo flam hur!', '#ff6600', null, 16);

        const dir = (player.direction || 'south') as 'north' | 'south' | 'east' | 'west';
        const waveTiles = getWave4Tiles({ x: player.posX, y: player.posY, z: player.posZ }, dir);
        const waveTileSet = new Set(waveTiles.map((t) => `${t.x},${t.y}`));

        // Emit hit by fire (effectId: 16) on each of the 17 tiles in the wave
        for (const tile of waveTiles) {
          this.pushCombatEvent('spell_area', player.id, '', 0, tile.x, tile.y, '', '#ff6600', null, 16);
        }

        // Damage any monsters inside the wave cone
        this.room.state.monsters.forEach((monster: MonsterState) => {
          if (!monster.isDead && waveTileSet.has(`${monster.posX},${monster.posY}`)) {
            const rawDamage = 35 + Math.floor(Math.random() * 30) + Math.floor(player.level * 0.2);
            const damage = Math.max(1, rawDamage - monster.armorPower);
            monster.hp -= damage;
            this.pushCombatEvent('damage', player.id, monster.id, damage, monster.posX, monster.posY, `${damage}`, '#ff3333');

            if (monster.hp <= 0) {
              this.room.killMonster(monster, player);
            }
          }
        });

        // Skill advance magicLevel
        const vocName = (player.vocationName || 'Sorcerer') as VocationName;
        const vocDef = vocationFor(this.room.gameContent, vocName);
        const skillRate = serverConfigManager.getConfig().skillRate ?? 1.0;
        const magicTries = manaCost * this.room.gameContent.rateMagic * skillRate;
        let charSkills = (player as any).skills;
        if (Array.isArray(charSkills)) {
          let mlObj = charSkills.find((s: any) => s.skillId === 7);
          if (mlObj) {
            mlObj.tries = (mlObj.tries || 0) + magicTries;
          }
        }
      }
    } else if (lowerSpell === 'exeta res' || lowerSpell === 'exeta-res' || lowerSpell === 'challenge' || lowerSpell === '93') {
      const manaCost = 30;
      if (player.mp >= manaCost) {
        player.mp -= manaCost;

        this.pushCombatEvent('spell', player.id, player.id, 0, player.posX, player.posY, 'Exeta res', '#ffff00', null, 13);

        const SURROUNDING_OFFSETS = [
          { dx: -1, dy: -1 }, { dx:  0, dy: -1 }, { dx:  1, dy: -1 },
          { dx: -1, dy:  0 },                   { dx:  1, dy:  0 },
          { dx: -1, dy:  1 }, { dx:  0, dy:  1 }, { dx:  1, dy:  1 },
        ];

        for (const offset of SURROUNDING_OFFSETS) {
          const tileX = player.posX + offset.dx;
          const tileY = player.posY + offset.dy;
          this.pushCombatEvent('spell_area', player.id, '', 0, tileX, tileY, '', '#ffff00', null, 13);
        }

        // Taunt all active monsters in 8-SQM surrounding radius
        this.room.state.monsters.forEach((monster: MonsterState) => {
          if (!monster.isDead && monster.posZ === player.posZ) {
            const dist = Math.hypot(monster.posX - player.posX, monster.posY - player.posY);
            if (dist <= 3) {
              monster.targetId = player.id;
            }
          }
        });
      }
    } else if (
      lowerSpell === 'exori flam' ||
      lowerSpell === 'exori-flam' ||
      lowerSpell === 'flame strike' ||
      lowerSpell === '20' ||
      lowerSpell === '89'
    ) {
      const manaCost = 20;
      if (player.mp >= manaCost) {
        player.mp -= manaCost;

        let targetMonster: MonsterState | null = null;
        if (player.targetId) {
          const m = this.room.state.monsters.get(player.targetId);
          if (m && !m.isDead && Math.hypot(m.posX - player.posX, m.posY - player.posY) <= 4) {
            targetMonster = m;
          }
        }
        if (!targetMonster) {
          let minDist = 99;
          this.room.state.monsters.forEach((m) => {
            if (!m.isDead) {
              const d = Math.hypot(m.posX - player.posX, m.posY - player.posY);
              if (d <= 3 && d < minDist) {
                minDist = d;
                targetMonster = m;
              }
            }
          });
        }

        const targetX = targetMonster ? targetMonster.posX : player.posX;
        const targetY = targetMonster ? targetMonster.posY : player.posY;
        const targetId = targetMonster ? targetMonster.id : player.id;

        // Projectile 4 (CONST_ANI_FIRE), Effect 37 (CONST_ME_FIREATTACK)
        this.pushCombatEvent('spell', player.id, targetId, 0, targetX, targetY, 'Exori Flam', '#ff6600', 4, 37, player.posX, player.posY);

        if (targetMonster) {
          const rawDamage = 30 + Math.floor(Math.random() * 25) + Math.floor(player.level * 0.2);
          const damage = Math.max(1, rawDamage - (targetMonster as MonsterState).armorPower);
          (targetMonster as MonsterState).hp -= damage;

          this.pushCombatEvent('damage', player.id, (targetMonster as MonsterState).id, damage, targetX, targetY, `${damage}`, '#ff6600', 4, 37, player.posX, player.posY);

          if ((targetMonster as MonsterState).hp <= 0) {
            this.room.killMonster(targetMonster as MonsterState, player);
          }
        }

        const vocName = (player.vocationName || 'Sorcerer') as VocationName;
        const vocDef = vocationFor(this.room.gameContent, vocName);
        const skillRate = serverConfigManager.getConfig().skillRate ?? 1.0;
        const magicTries = manaCost * this.room.gameContent.rateMagic * skillRate;
        let charSkills = (player as any).skills;
        if (Array.isArray(charSkills)) {
          let mlObj = charSkills.find((s: any) => s.skillId === 7);
          if (mlObj) {
            mlObj.tries = (mlObj.tries || 0) + magicTries;
          }
        }
      }
    } else if (
      lowerSpell === 'exori vis' ||
      lowerSpell === 'exori-vis' ||
      lowerSpell === 'energy strike' ||
      lowerSpell === '25' ||
      lowerSpell === '88'
    ) {
      const manaCost = 20;
      if (player.mp >= manaCost) {
        player.mp -= manaCost;

        let targetMonster: MonsterState | null = null;
        if (player.targetId) {
          const m = this.room.state.monsters.get(player.targetId);
          if (m && !m.isDead && Math.hypot(m.posX - player.posX, m.posY - player.posY) <= 4) {
            targetMonster = m;
          }
        }
        if (!targetMonster) {
          let minDist = 99;
          this.room.state.monsters.forEach((m) => {
            if (!m.isDead) {
              const d = Math.hypot(m.posX - player.posX, m.posY - player.posY);
              if (d <= 3 && d < minDist) {
                minDist = d;
                targetMonster = m;
              }
            }
          });
        }

        const targetX = targetMonster ? targetMonster.posX : player.posX;
        const targetY = targetMonster ? targetMonster.posY : player.posY;
        const targetId = targetMonster ? targetMonster.id : player.id;

        // Projectile 5 (CONST_ANI_ENERGY), Effect 38 (CONST_ME_ENERGYAREA)
        this.pushCombatEvent('spell', player.id, targetId, 0, targetX, targetY, 'Exori Vis', '#33ffff', 5, 38, player.posX, player.posY);

        if (targetMonster) {
          const rawDamage = 30 + Math.floor(Math.random() * 25) + Math.floor(player.level * 0.2);
          const damage = Math.max(1, rawDamage - (targetMonster as MonsterState).armorPower);
          (targetMonster as MonsterState).hp -= damage;

          this.pushCombatEvent('damage', player.id, (targetMonster as MonsterState).id, damage, targetX, targetY, `${damage}`, '#33ffff', 5, 38, player.posX, player.posY);

          if ((targetMonster as MonsterState).hp <= 0) {
            this.room.killMonster(targetMonster as MonsterState, player);
          }
        }

        const vocName = (player.vocationName || 'Sorcerer') as VocationName;
        const vocDef = vocationFor(this.room.gameContent, vocName);
        const skillRate = serverConfigManager.getConfig().skillRate ?? 1.0;
        const magicTries = manaCost * this.room.gameContent.rateMagic * skillRate;
        let charSkills = (player as any).skills;
        if (Array.isArray(charSkills)) {
          let mlObj = charSkills.find((s: any) => s.skillId === 7);
          if (mlObj) {
            mlObj.tries = (mlObj.tries || 0) + magicTries;
          }
        }
      }
    } else if (
      lowerSpell === 'exori hur' ||
      lowerSpell === 'exori-hur' ||
      lowerSpell === 'whirlwind throw' ||
      lowerSpell === '107'
    ) {
      const manaCost = 40;
      if (player.mp >= manaCost) {
        player.mp -= manaCost;

        let targetMonster: MonsterState | null = null;
        if (player.targetId) {
          const m = this.room.state.monsters.get(player.targetId);
          if (m && !m.isDead && Math.hypot(m.posX - player.posX, m.posY - player.posY) <= 5) {
            targetMonster = m;
          }
        }
        if (!targetMonster) {
          let minDist = 99;
          this.room.state.monsters.forEach((m) => {
            if (!m.isDead) {
              const d = Math.hypot(m.posX - player.posX, m.posY - player.posY);
              if (d <= 5 && d < minDist) {
                minDist = d;
                targetMonster = m;
              }
            }
          });
        }

        const targetX = targetMonster ? targetMonster.posX : player.posX;
        const targetY = targetMonster ? targetMonster.posY : player.posY;
        const targetId = targetMonster ? targetMonster.id : player.id;

        // Projectile 24 (CONST_ANI_WHIRLWINDAXE), Effect 9 (CONST_ME_BLOCKHIT)
        this.pushCombatEvent('spell', player.id, targetId, 0, targetX, targetY, 'Exori Hur', '#ffff33', 24, 9, player.posX, player.posY);

        if (targetMonster) {
          const rawDamage = 35 + Math.floor(Math.random() * 30) + Math.floor(player.level * 0.25);
          const damage = Math.max(1, rawDamage - (targetMonster as MonsterState).armorPower);
          (targetMonster as MonsterState).hp -= damage;

          this.pushCombatEvent('damage', player.id, (targetMonster as MonsterState).id, damage, targetX, targetY, `${damage}`, '#ffff33', 24, 9, player.posX, player.posY);

          if ((targetMonster as MonsterState).hp <= 0) {
            this.room.killMonster(targetMonster as MonsterState, player);
          }
        }

        const vocName = (player.vocationName || 'Knight') as VocationName;
        const vocDef = vocationFor(this.room.gameContent, vocName);
        const skillRate = serverConfigManager.getConfig().skillRate ?? 1.0;
        const magicTries = manaCost * this.room.gameContent.rateMagic * skillRate;
        let charSkills = (player as any).skills;
        if (Array.isArray(charSkills)) {
          let mlObj = charSkills.find((s: any) => s.skillId === 7);
          if (mlObj) {
            mlObj.tries = (mlObj.tries || 0) + magicTries;
          }
        }
      }
    }
  }
}
