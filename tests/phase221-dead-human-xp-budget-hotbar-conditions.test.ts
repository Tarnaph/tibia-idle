import { describe, it, expect, beforeEach } from 'vitest';
import { content } from './fixture';
import {
  applyDamageToPartyActor,
  createIdleGame,
  isHotbarSlotConditionsMet,
  evaluateHotbarCondition,
  type PartyActorState,
  type CharacterState,
  type HotbarSlotConfig,
} from '../packages/domain/src';
import {
  XpRateLimiter,
  NON_HUNT_MAX_BURST_EXP,
} from '../packages/auth/src';

describe('Phase 221: Dead Human Corpse, XP Budget & Hotbar Conditions', () => {
  beforeEach(() => {
    XpRateLimiter.resetAll();
  });

  describe('1. Dead Human Corpse on Death', () => {
    it('spawns dead human corpse (item 3058) when male player receives lethal damage', () => {
      const state = createIdleGame('seed-male-death', content, 'rat-cellars');
      const character = state.session.characters[0];
      (character as any).gender = 'male';
      const partyActor = state.encounter.partyActors[0];
      partyActor.hp = 30;
      partyActor.position = { x: 10, y: 12, z: 7 };

      // Aplica dano letal de 50 (vida atual é 30)
      applyDamageToPartyActor(state, content, partyActor, character, 50, 'physical', 'Dragon', 'enemy-1');

      expect(partyActor.alive).toBe(false);
      expect(partyActor.hp).toBe(0);

      // Verifica que o corpse humano canônico foi gerado no grid
      expect(state.encounter.corpses.length).toBe(1);
      const corpse = state.encounter.corpses[0];
      expect(corpse.corpseId).toBe(3058);
      expect(corpse.monsterId).toBe('human');
      expect(corpse.id).toBe(`corpse-${character.id}`);
      expect(corpse.position).toEqual({ x: 10, y: 12, z: 7 });

      // Verifica que visualEvent foi emitido
      const deathVisual = state.encounter.visualEvents.find((v) => v.type === 'creature-died');
      expect(deathVisual).toBeDefined();
      expect(deathVisual?.corpseId).toBe(3058);
      expect(deathVisual?.creatureId).toBe(character.id);
    });

    it('spawns dead human female corpse (item 3065) when female player receives lethal damage', () => {
      const state = createIdleGame('seed-female-death', content, 'rat-cellars');
      const character = state.session.characters[0];
      (character as any).gender = 'female';
      const partyActor = state.encounter.partyActors[0];
      partyActor.hp = 20;
      partyActor.position = { x: 15, y: 20, z: 7 };

      applyDamageToPartyActor(state, content, partyActor, character, 40, 'fire', 'Dragon Lord', 'enemy-2');

      expect(partyActor.alive).toBe(false);
      const corpse = state.encounter.corpses[0];
      expect(corpse.corpseId).toBe(3065);
      expect(corpse.monsterId).toBe('human');
    });
  });

  describe('2. XP Rate Limiter Budget Post-Hunt', () => {
    it('accepts +27300 XP in hunting context without suspicious rejection', () => {
      const now = Date.now();
      const check = XpRateLimiter.consume('player-wolfy', 27300, now, { isHunting: true });
      expect(check.allowed).toBe(true);
      expect(check.maxAllowed).toBe(27300);
    });

    it('absorbs +27300 XP transition in non-hunting context due to 100k burst budget', () => {
      const now = Date.now();
      expect(NON_HUNT_MAX_BURST_EXP).toBeGreaterThanOrEqual(100000);
      const check = XpRateLimiter.consume('player-cerberus', 27300, now, { isHunting: false });
      expect(check.allowed).toBe(true);
      expect(check.maxAllowed).toBe(27300);
    });

    it('records and verifies authorized experience from real-time session', () => {
      XpRateLimiter.recordAuthorizedExp('char-lead-1', 50000);
      expect(XpRateLimiter.getAuthorizedExp('char-lead-1')).toBe(50000);

      // Subsequent check of experience already authorized by WebSocket is confirmed
      const authorized = XpRateLimiter.getAuthorizedExp('char-lead-1');
      expect(authorized).toBeGreaterThanOrEqual(45000);
    });
  });

  describe('3. Hotbar Conditions Evaluation (80% HP Threshold)', () => {
    const slotConfig: HotbarSlotConfig = {
      enabled: true,
      conditions: [
        {
          id: 'cond-hp-80',
          target: 'self',
          metric: 'hp',
          operator: 'lte',
          value: 80,
          isPercent: true,
        },
      ],
    };

    it('does NOT trigger healing when HP is above 80% (e.g. 85% = 1275/1500)', () => {
      const state = createIdleGame('seed-cond-1', content, 'rat-cellars');
      const character = state.session.characters[0];
      character.maxHp = 1500;
      const actor = state.encounter.partyActors[0];
      actor.hp = 1275;

      const met = isHotbarSlotConditionsMet(slotConfig, {
        actor,
        character,
        state,
      });

      expect(met).toBe(false);
    });

    it('triggers healing when HP is exactly or below 80% (e.g. 80% = 1200/1500)', () => {
      const state = createIdleGame('seed-cond-2', content, 'rat-cellars');
      const character = state.session.characters[0];
      character.maxHp = 1500;
      const actor = state.encounter.partyActors[0];
      actor.hp = 1200;

      const met = isHotbarSlotConditionsMet(slotConfig, {
        actor,
        character,
        state,
      });

      expect(met).toBe(true);
    });

    it('triggers healing when HP is 75% (1125/1500)', () => {
      const state = createIdleGame('seed-cond-3', content, 'rat-cellars');
      const character = state.session.characters[0];
      character.maxHp = 1500;
      const actor = state.encounter.partyActors[0];
      actor.hp = 1125;

      const met = isHotbarSlotConditionsMet(slotConfig, {
        actor,
        character,
        state,
      });

      expect(met).toBe(true);
    });
  });
});
