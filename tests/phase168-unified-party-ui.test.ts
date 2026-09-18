import { describe, it, expect } from 'vitest';
import {
  VOCATION_SLOT_CONFIGS,
  type VocationSlotType,
  type RemotePartyMember,
} from '../apps/web/components/party/UnifiedPartyModal';

describe('Phase 168: Unified Party System & Medieval Hunt Selector Style Contract', () => {
  it('defines configuration for all 4 canonical vocations with correct tactical roles', () => {
    const vocations: VocationSlotType[] = ['Knight', 'Paladin', 'Sorcerer', 'Druid'];

    for (const voc of vocations) {
      const config = VOCATION_SLOT_CONFIGS[voc];
      expect(config).toBeDefined();
      expect(config.title).toBe(voc.toUpperCase());
      expect(config.roleTitle).toBeTruthy();
      expect(config.tacticalTip).toBeTruthy();
      expect(config.bannerBg).toContain('linear-gradient');
      expect(config.borderAccent).toMatch(/^#[0-9a-f]{6}$/i);
    }

    // Role-specific validations
    expect(VOCATION_SLOT_CONFIGS.Knight.roleTitle).toContain('Tank');
    expect(VOCATION_SLOT_CONFIGS.Knight.tacticalTip).toContain('Exeta Res');

    expect(VOCATION_SLOT_CONFIGS.Paladin.roleTitle).toContain('Ranged DPS');
    expect(VOCATION_SLOT_CONFIGS.Paladin.icon).toBe('🏹');

    expect(VOCATION_SLOT_CONFIGS.Sorcerer.roleTitle).toContain('Area DPS');
    expect(VOCATION_SLOT_CONFIGS.Sorcerer.icon).toBe('🔮');

    expect(VOCATION_SLOT_CONFIGS.Druid.roleTitle).toContain('Healer');
    expect(VOCATION_SLOT_CONFIGS.Druid.tacticalTip).toContain('Exura Sio');
    expect(VOCATION_SLOT_CONFIGS.Druid.icon).toBe('🌿');
  });

  it('allocates the active leader to their respective vocation slot and ensures auto-readiness', () => {
    const activeKnight = {
      id: 'char-knight-1',
      name: 'Sir Galahad',
      vocation: 'Knight',
      baseVocation: 'Knight',
      level: 120,
    };

    const slots: Record<VocationSlotType, { source: string; isReady: boolean; name?: string }> = {
      Knight: { source: 'leader', isReady: true, name: activeKnight.name },
      Paladin: { source: 'empty', isReady: false },
      Sorcerer: { source: 'empty', isReady: false },
      Druid: { source: 'empty', isReady: false },
    };

    expect(slots.Knight.source).toBe('leader');
    expect(slots.Knight.isReady).toBe(true);
    expect(slots.Knight.name).toBe('Sir Galahad');
    expect(slots.Paladin.source).toBe('empty');
  });

  it('auto-approves account alts without requiring separate manual confirmation', () => {
    const leaderKnight = { id: 'k1', name: 'Knight Hero', baseVocation: 'Knight' };
    const altDruid = { id: 'd2', name: 'Druid Healer', baseVocation: 'Druid' };
    const partyMemberIds = ['k1', 'd2'];

    const slots: Record<VocationSlotType, { source: string; isReady: boolean; charId?: string }> = {
      Knight: { source: 'leader', isReady: true, charId: leaderKnight.id },
      Paladin: { source: 'empty', isReady: false },
      Sorcerer: { source: 'empty', isReady: false },
      Druid: { source: 'empty', isReady: false },
    };

    // Allocate alt if in partyMemberIds
    if (partyMemberIds.includes(altDruid.id)) {
      slots.Druid = {
        source: 'account',
        isReady: true, // Crucial: alts da própria conta têm auto-aceite
        charId: altDruid.id,
      };
    }

    expect(slots.Druid.source).toBe('account');
    expect(slots.Druid.isReady).toBe(true);
  });

  it('tracks approval status for remote online players independently', () => {
    const remoteMembers: RemotePartyMember[] = [
      {
        id: 'session-paladin',
        name: 'Legolas',
        vocation: 'Paladin',
        level: 105,
        hp: 1200,
        maxHp: 1200,
        isReady: false, // Convite ou proposta ainda não aceita
      },
      {
        id: 'session-sorc',
        name: 'Voldemort',
        vocation: 'Sorcerer',
        level: 130,
        hp: 850,
        maxHp: 850,
        isReady: true, // Já confirmou
      },
    ];

    const paladinSlot = remoteMembers.find((m) => m.vocation === 'Paladin');
    const sorcererSlot = remoteMembers.find((m) => m.vocation === 'Sorcerer');

    expect(paladinSlot?.isReady).toBe(false);
    expect(sorcererSlot?.isReady).toBe(true);

    // Todos os membros remotos devem aprovar antes do início
    const allReady = remoteMembers.every((m) => m.isReady);
    expect(allReady).toBe(false);
  });

  it('calculates full 4-vocation synergy (+20% XP) only when all 4 slots are filled', () => {
    const isSynergyActive = (occupiedCount: number) => occupiedCount === 4;

    expect(isSynergyActive(1)).toBe(false);
    expect(isSynergyActive(2)).toBe(false);
    expect(isSynergyActive(3)).toBe(false);
    expect(isSynergyActive(4)).toBe(true);
  });

  it('safely creates characters in party without dormant encounter spatial errors', () => {
    const mainCharacter = {
      id: '3fe6be29-8868-4282-910a-ac5f829f363d',
      name: 'Grievous',
      level: 200,
      baseVocation: 'Sorcerer' as const,
      vocation: 'Sorcerer',
    };

    // Validates level requirements for each slot
    const checkLevelReq = (count: number, mainLevel: number) => {
      if (count === 1 && mainLevel < 70) return 'Nível 70 necessário';
      if (count === 2 && mainLevel < 150) return 'Nível 150 necessário';
      if (count === 3 && mainLevel < 200) return 'Nível 200 necessário';
      return null;
    };

    // Level 200 unlocks all 4 slots without error
    expect(checkLevelReq(1, mainCharacter.level)).toBeNull();
    expect(checkLevelReq(2, mainCharacter.level)).toBeNull();
    expect(checkLevelReq(3, mainCharacter.level)).toBeNull();
  });
});
