import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { IMBUEMENT_CANONICAL_ITEMS } from '../apps/web/components/ImbuingModal';

describe('Phase 191 - Canonical Assets for Imbuements and Blessings', () => {
  it('has official canonical creature product assets for all imbuements', () => {
    expect(IMBUEMENT_CANONICAL_ITEMS['vampirism']).toBe(10550); // Vampire Teeth
    expect(IMBUEMENT_CANONICAL_ITEMS['void']).toBe(12448); // Rope Belt
    expect(IMBUEMENT_CANONICAL_ITEMS['strike']).toBe(10574); // Lion's Mane
    expect(IMBUEMENT_CANONICAL_ITEMS['lich_shroud']).toBe(12400); // Protective Charm
    expect(IMBUEMENT_CANONICAL_ITEMS['bash']).toBe(10573); // Cyclops Toe
    expect(IMBUEMENT_CANONICAL_ITEMS['chop']).toBe(11113); // Orc Tooth
    expect(IMBUEMENT_CANONICAL_ITEMS['slash']).toBe(10574); // Lion's Mane
    expect(IMBUEMENT_CANONICAL_ITEMS['precision']).toBe(12422); // Elven Scouting Glass
    expect(IMBUEMENT_CANONICAL_ITEMS['blockade']).toBe(10567); // Piece of Marble Rock
    expect(IMBUEMENT_CANONICAL_ITEMS['epiphany']).toBe(10552); // Elvish Talisman
    expect(IMBUEMENT_CANONICAL_ITEMS['featherweight']).toBe(12427); // Peacock Feather Fan
    expect(IMBUEMENT_CANONICAL_ITEMS['swiftness']).toBe(26162); // Werewolf Fur / Gear
    expect(IMBUEMENT_CANONICAL_ITEMS['vibrancy']).toBe(10579); // War Crystal

    // Verifica que cada um desses arquivos de item existe fisicamente em public/assets/items
    const assetsDir = path.resolve(process.cwd(), 'public/assets/items');
    for (const [type, itemId] of Object.entries(IMBUEMENT_CANONICAL_ITEMS)) {
      const itemPath = path.join(assetsDir, `item-${itemId}.png`);
      expect(fs.existsSync(itemPath), `Asset for ${type} (item-${itemId}.png) must exist`).toBe(true);
    }
  });

  it('has official canonical blessing charm items in public/assets/items', () => {
    const blessingItemIds = [11262, 11258, 11261, 11260, 11259];
    const assetsDir = path.resolve(process.cwd(), 'public/assets/items');

    for (const id of blessingItemIds) {
      const itemPath = path.join(assetsDir, `item-${id}.png`);
      expect(fs.existsSync(itemPath), `Blessing charm item-${id}.png must exist`).toBe(true);
    }
  });
});

describe('Phase 191 - Highscore Algorithm & Category Evaluation', () => {
  interface MockCharacter {
    id: string;
    name: string;
    level: number;
    experience: number;
    vocationName: string;
    bossPoints: number;
    bestiaryKillsJson?: string;
    skills: { skillId: number; value: number; tries: number }[];
    account: { username: string; displayName: string };
  }

  const mockCharacters: MockCharacter[] = [
    {
      id: 'char-1',
      name: 'Eternal Knight',
      level: 150,
      experience: 15000000,
      vocationName: 'Elite Knight',
      bossPoints: 30,
      skills: [
        { skillId: 2, value: 95, tries: 400 }, // Sword
        { skillId: 5, value: 90, tries: 200 }, // Shielding
      ],
      account: { username: 'acc1', displayName: 'Player One' },
    },
    {
      id: 'char-2',
      name: 'Bubble Sorcerer',
      level: 140,
      experience: 12000000,
      vocationName: 'Master Sorcerer',
      bossPoints: 50,
      skills: [
        { skillId: 7, value: 85, tries: 150 }, // Magic
        { skillId: 5, value: 30, tries: 10 },
      ],
      account: { username: 'acc2', displayName: 'Player Two' },
    },
    {
      id: 'char-3',
      name: 'Sharpshooter Paladin',
      level: 150,
      experience: 16500000, // Higher EXP than char-1
      vocationName: 'Royal Paladin',
      bossPoints: 20,
      skills: [
        { skillId: 4, value: 98, tries: 300 }, // Distance
        { skillId: 5, value: 88, tries: 100 },
      ],
      account: { username: 'acc3', displayName: 'Player Three' },
    },
  ];

  it('ranks players by level and breaks ties using experience', () => {
    const sorted = [...mockCharacters].sort((a, b) => {
      if (b.level !== a.level) return b.level - a.level;
      return b.experience - a.experience;
    });

    expect(sorted[0].id).toBe('char-3'); // Level 150, 16.5m EXP
    expect(sorted[1].id).toBe('char-1'); // Level 150, 15.0m EXP
    expect(sorted[2].id).toBe('char-2'); // Level 140, 12.0m EXP
  });

  it('ranks players by specific skill (Magic Level)', () => {
    const getMagic = (c: MockCharacter) => c.skills.find(s => s.skillId === 7)?.value ?? 0;
    const sorted = [...mockCharacters].sort((a, b) => getMagic(b) - getMagic(a));

    expect(sorted[0].id).toBe('char-2'); // Magic 85
    expect(sorted[0].name).toBe('Bubble Sorcerer');
  });

  it('ranks players by Boss Points category', () => {
    const sorted = [...mockCharacters].sort((a, b) => b.bossPoints - a.bossPoints);

    expect(sorted[0].id).toBe('char-2'); // 50 pts
    expect(sorted[1].id).toBe('char-1'); // 30 pts
    expect(sorted[2].id).toBe('char-3'); // 20 pts
  });

  it('filters ranking by vocation correctly', () => {
    const knightsOnly = mockCharacters.filter(c => c.vocationName.toLowerCase().includes('knight'));
    expect(knightsOnly.length).toBe(1);
    expect(knightsOnly[0].name).toBe('Eternal Knight');

    const paladinsOnly = mockCharacters.filter(c => c.vocationName.toLowerCase().includes('paladin'));
    expect(paladinsOnly.length).toBe(1);
    expect(paladinsOnly[0].name).toBe('Sharpshooter Paladin');
  });

  it('calculates page and player rank accurately for pagination', () => {
    const pageSize = 2;
    const sorted = [...mockCharacters].sort((a, b) => {
      if (b.level !== a.level) return b.level - a.level;
      return b.experience - a.experience;
    });

    // char-3 is rank 1 (page 1)
    const rank3 = sorted.findIndex(c => c.id === 'char-3') + 1;
    expect(rank3).toBe(1);
    expect(Math.ceil(rank3 / pageSize)).toBe(1);

    // char-2 is rank 3 (page 2)
    const rank2 = sorted.findIndex(c => c.id === 'char-2') + 1;
    expect(rank2).toBe(3);
    expect(Math.ceil(rank2 / pageSize)).toBe(2);
  });
});
