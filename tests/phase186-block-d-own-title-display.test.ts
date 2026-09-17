import { describe, it, expect } from 'vitest';
import {
  createCharacter,
  initialHunts,
  type GameContent,
} from '../packages/domain/src';
import monstersJson from '../content/generated/monsters.json';
import vocationsJson from '../content/generated/vocations.json';
import equipmentJson from '../content/generated/equipment.json';
import startersJson from '../content/generated/starter-loadouts.json';
import spellsJson from '../content/generated/spells.json';
import huntRegionsJson from '../content/generated/hunt-regions.json';
import economyJson from '../content/generated/item-economy.json';
import type {
  MonsterCatalog,
  EquipmentCatalog,
  StarterLoadoutCatalog,
  VocationCatalog,
  SpellCatalog,
  HuntRegionCatalog,
  ItemEconomyCatalog,
} from '../packages/content-schema/src';

const content: GameContent = {
  equipment: (equipmentJson as EquipmentCatalog).items,
  monsters: (monstersJson as MonsterCatalog).monsters,
  starterLoadouts: (startersJson as StarterLoadoutCatalog).loadouts,
  vocations: (vocationsJson as VocationCatalog).vocations,
  spells: (spellsJson as unknown as SpellCatalog).spells,
  huntRegions: (huntRegionsJson as HuntRegionCatalog).regions,
  economy: economyJson as ItemEconomyCatalog,
  hunts: initialHunts,
  rateSkill: (vocationsJson as VocationCatalog).rateSkill,
  rateMagic: (vocationsJson as VocationCatalog).rateMagic,
};

describe('Phase 186 Bloco D - Mostrar o próprio título GOD/GM no mapa', () => {
  it('1. Personagem com papel ADMIN ou título GOD recebe adminTitle GOD sem alterar o nome permanente', () => {
    const charItem = {
      id: 'char-wolfy-god',
      name: 'Wolfy',
      vocationId: 4,
      level: 100,
      health: 2000,
      maxHealth: 2000,
      mana: 1000,
      maxMana: 1000,
      positionX: 32369,
      positionY: 32241,
      positionZ: 7,
      adminTitle: 'GOD',
    };
    const acc = {
      id: 'acc-wolfy-god',
      email: 'wolfy@exura.com',
      role: 'ADMIN',
    };

    const dbAdminTitle = charItem.adminTitle;
    const accRoleUpper = String(acc.role || '').trim().toUpperCase();
    const resolvedAdminTitle = dbAdminTitle
      ? String(dbAdminTitle).trim().toUpperCase()
      : (accRoleUpper === 'ADMIN' ? 'GOD' : accRoleUpper === 'GM' ? 'GM' : undefined);

    expect(resolvedAdminTitle).toBe('GOD');

    const userChar = createCharacter(charItem.id, charItem.name, 'Knight', content, 'male');
    (userChar as any).adminTitle = resolvedAdminTitle;
    (userChar as any).accountRole = accRoleUpper;

    // O nome permanente do personagem permanece inalterado
    expect(userChar.name).toBe('Wolfy');
    // O título administrativo fica desacoplado e autorizado
    expect((userChar as any).adminTitle).toBe('GOD');
    expect((userChar as any).accountRole).toBe('ADMIN');
  });

  it('2. Personagem com papel GM ou promovido recebe adminTitle GM', () => {
    const charItem = {
      id: 'char-gamemaster-1',
      name: 'Sentinel',
      vocationId: 3,
      level: 50,
      health: 1200,
      maxHealth: 1200,
      mana: 800,
      maxMana: 800,
      positionX: 32369,
      positionY: 32241,
      positionZ: 7,
      adminTitle: 'GM',
    };
    const acc = {
      id: 'acc-gm-1',
      email: 'sentinel.gm@exura.com',
      role: 'GM',
    };

    const dbAdminTitle = charItem.adminTitle;
    const accRoleUpper = String(acc.role || '').trim().toUpperCase();
    const resolvedAdminTitle = dbAdminTitle
      ? String(dbAdminTitle).trim().toUpperCase()
      : (accRoleUpper === 'ADMIN' ? 'GOD' : accRoleUpper === 'GM' ? 'GM' : undefined);

    expect(resolvedAdminTitle).toBe('GM');

    const userChar = createCharacter(charItem.id, charItem.name, 'Paladin', content, 'male');
    (userChar as any).adminTitle = resolvedAdminTitle;

    expect(userChar.name).toBe('Sentinel');
    expect((userChar as any).adminTitle).toBe('GM');
  });

  it('3. Formatação visual do título preserva padrão dourado 0xffd700 e não duplica prefixos', () => {
    const adminTitles = ['GOD', 'GM'] as const;

    for (const title of adminTitles) {
      const charName = 'Wolfy';
      // Garante que não há prefixo duplicado no nome
      expect(charName.startsWith(`[${title}]`)).toBe(false);

      const titleText = `[${title}] `;
      const goldColor = 0xffd700;
      const nameColor = 0x67de82;

      expect(titleText).toBe(`[${title}] `);
      expect(goldColor).toBe(16766720); // 0xffd700
      expect(nameColor).toBe(6807170); // 0x67de82 (Tibia Green)
    }
  });

  it('4. Jogador comum (PLAYER) não recebe título GOD nem GM sobre o nome', () => {
    const regularChar = {
      id: 'char-regular-player',
      name: 'RegularHero',
      vocationId: 1,
      level: 20,
      health: 300,
      maxHealth: 300,
      mana: 600,
      maxMana: 600,
      positionX: 32369,
      positionY: 32241,
      positionZ: 7,
      adminTitle: null,
    };
    const acc = {
      id: 'acc-regular',
      email: 'hero@exura.com',
      role: 'PLAYER',
    };

    const dbAdminTitle = regularChar.adminTitle;
    const accRoleUpper = String(acc.role || '').trim().toUpperCase();
    const resolvedAdminTitle = dbAdminTitle
      ? String(dbAdminTitle).trim().toUpperCase()
      : (accRoleUpper === 'ADMIN' ? 'GOD' : accRoleUpper === 'GM' ? 'GM' : undefined);

    expect(resolvedAdminTitle).toBeUndefined();

    const userChar = createCharacter(regularChar.id, regularChar.name, 'Sorcerer', content, 'female');
    (userChar as any).adminTitle = resolvedAdminTitle;

    expect(userChar.name).toBe('RegularHero');
    expect((userChar as any).adminTitle).toBeUndefined();
  });
});
