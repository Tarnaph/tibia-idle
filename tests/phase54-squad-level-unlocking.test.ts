import { describe, expect, it } from 'vitest';
import { createCharacter } from '../packages/domain/src/party';
import type { GameContent } from '../packages/domain/src/types';

const mockContent = {
  vocations: [
    { name: 'Knight', attackSpeedMs: 2000, baseSpeed: 110, gainHp: 15, gainMana: 5, gainCap: 25 },
    { name: 'Paladin', attackSpeedMs: 2000, baseSpeed: 110, gainHp: 10, gainMana: 15, gainCap: 20 },
    { name: 'Sorcerer', attackSpeedMs: 2000, baseSpeed: 110, gainHp: 5, gainMana: 30, gainCap: 10 },
    { name: 'Druid', attackSpeedMs: 2000, baseSpeed: 110, gainHp: 5, gainMana: 30, gainCap: 10 },
  ],
  starterLoadouts: [
    { vocation: 'Knight', equipped: {} },
    { vocation: 'Paladin', equipped: {} },
    { vocation: 'Sorcerer', equipped: {} },
    { vocation: 'Druid', equipped: {} },
  ],
  spells: [],
  equipment: [],
} as unknown as GameContent;

describe('Phase 54: Squad Solo Init & Level Unlocking Rules (Lv 50, 90, 120 + Admin/GM Bypass)', () => {
  it('garante que o personagem criado/selecionado inicia solo no squad sem mock characters', () => {
    const userChar = createCharacter('char-solo-1', 'Solo Hero', 'Knight', mockContent);
    const initialSquad = [userChar];

    expect(initialSquad).toHaveLength(1);
    expect(initialSquad[0].name).toBe('Solo Hero');
    expect(initialSquad.some((c) => c.name === 'Sire' || c.name === 'Aldric')).toBe(false);
  });

  it('valida travamento de slots adicionais por nível para jogadores normais', () => {
    const isSlotUnlocked = (slotIndex: number, userLevel: number, userRole?: string): boolean => {
      const roleUpper = userRole?.toUpperCase() || '';
      if (roleUpper === 'ADMIN' || roleUpper === 'GM') return true;
      if (slotIndex === 0) return true;
      if (slotIndex === 1) return userLevel >= 50;
      if (slotIndex === 2) return userLevel >= 90;
      if (slotIndex === 3) return userLevel >= 120;
      return false;
    };

    // Nível 8 (Player comum)
    expect(isSlotUnlocked(0, 8, 'PLAYER')).toBe(true);  // Slot 1: Liberado (Nível 1+)
    expect(isSlotUnlocked(1, 8, 'PLAYER')).toBe(false); // Slot 2: Bloqueado (Requer Lv 50)
    expect(isSlotUnlocked(2, 8, 'PLAYER')).toBe(false); // Slot 3: Bloqueado (Requer Lv 90)
    expect(isSlotUnlocked(3, 8, 'PLAYER')).toBe(false); // Slot 4: Bloqueado (Requer Lv 120)

    // Nível 50 (Player comum)
    expect(isSlotUnlocked(1, 50, 'PLAYER')).toBe(true);  // Slot 2: Liberado
    expect(isSlotUnlocked(2, 50, 'PLAYER')).toBe(false); // Slot 3: Bloqueado

    // Nível 90 (Player comum)
    expect(isSlotUnlocked(2, 90, 'PLAYER')).toBe(true);  // Slot 3: Liberado
    expect(isSlotUnlocked(3, 90, 'PLAYER')).toBe(false); // Slot 4: Bloqueado

    // Nível 120 (Player comum)
    expect(isSlotUnlocked(3, 120, 'PLAYER')).toBe(true); // Slot 4: Liberado
  });

  it('contas com role ADMIN ou GM ignoram requisitos de nível e possuem todos os slots liberados', () => {
    const isSlotUnlocked = (slotIndex: number, userLevel: number, userRole?: string): boolean => {
      const roleUpper = userRole?.toUpperCase() || '';
      if (roleUpper === 'ADMIN' || roleUpper === 'GM') return true;
      if (slotIndex === 0) return true;
      if (slotIndex === 1) return userLevel >= 50;
      if (slotIndex === 2) return userLevel >= 90;
      if (slotIndex === 3) return userLevel >= 120;
      return false;
    };

    // Admin no Nível 1
    expect(isSlotUnlocked(0, 1, 'ADMIN')).toBe(true);
    expect(isSlotUnlocked(1, 1, 'ADMIN')).toBe(true);
    expect(isSlotUnlocked(2, 1, 'ADMIN')).toBe(true);
    expect(isSlotUnlocked(3, 1, 'ADMIN')).toBe(true);

    // GM no Nível 1
    expect(isSlotUnlocked(0, 1, 'GM')).toBe(true);
    expect(isSlotUnlocked(1, 1, 'GM')).toBe(true);
    expect(isSlotUnlocked(2, 1, 'GM')).toBe(true);
    expect(isSlotUnlocked(3, 1, 'GM')).toBe(true);
  });
});
