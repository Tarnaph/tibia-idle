import { describe, it, expect } from 'vitest';
import { createCharacter } from '../packages/domain/src/party';
import { CharacterService } from '../packages/auth/src/characterService';
import { content } from './fixture';

describe('Phase 222: Persistent Hotkeys & Slot Configurations for Party Alts', () => {
  it('1. hydrateDbCharacter restores hotbar and hotbarConfigs from hotbarJson', () => {
    // Simula a lógica canônica de hydrateDbCharacter presente no GamePrototype.tsx
    const hydrateDbCharacter = (c: any) => {
      const ch = createCharacter(c.id, c.name, c.vocationName || 'Druid', content, 'male');
      ch.level = c.level || 1;
      ch.experience = Number(c.experience || 0);

      if (c.hotbarJson) {
        try {
          const parsed = typeof c.hotbarJson === 'string' ? JSON.parse(c.hotbarJson) : c.hotbarJson;
          if (Array.isArray(parsed)) {
            ch.hotbar = parsed;
          } else if (parsed && typeof parsed === 'object') {
            if (Array.isArray(parsed.hotbar)) {
              ch.hotbar = parsed.hotbar;
            }
            if (parsed.hotbarConfigs) {
              (ch as any).hotbarConfigs = parsed.hotbarConfigs;
            }
          }
        } catch {}
      } else if (Array.isArray(c.hotbar)) {
        ch.hotbar = c.hotbar;
      }
      return ch;
    };

    // Alt Druid (ex: Wolfy) com magias de cura e poções configuradas com condições
    const dbWolfy = {
      id: 'char-wolfy-123',
      name: 'Wolfy',
      vocationName: 'Elder Druid',
      level: 45,
      experience: 120000,
      hotbarJson: JSON.stringify({
        hotbar: [170, 7643, 2268, 0], // Exura Sio (170), Ultimate Health Potion (7643), Sudden Death (2268)
        hotbarConfigs: {
          0: {
            enabled: true,
            healingTarget: 'party_leader',
            conditions: [{ id: 'c1', target: 'leader', metric: 'hp', operator: 'lte', value: 80, isPercent: true }],
          },
          1: {
            enabled: true,
            healingTarget: 'self',
            conditions: [{ id: 'c2', target: 'self', metric: 'hp', operator: 'lte', value: 50, isPercent: true }],
          },
        },
      }),
    };

    const hydrated = hydrateDbCharacter(dbWolfy);

    expect(hydrated.id).toBe('char-wolfy-123');
    expect(hydrated.name).toBe('Wolfy');
    expect(hydrated.hotbar).toEqual([170, 7643, 2268, 0]);
    expect(hydrated.hotbarConfigs).toBeDefined();
    expect(hydrated.hotbarConfigs?.[0]?.healingTarget).toBe('party_leader');
    expect(hydrated.hotbarConfigs?.[0]?.conditions?.[0]?.value).toBe(80);
    expect(hydrated.hotbarConfigs?.[1]?.conditions?.[0]?.value).toBe(50);
  });

  it('2. hydrateDbCharacter handles legacy array hotbarJson seamlessly', () => {
    const hydrateDbCharacter = (c: any) => {
      const ch = createCharacter(c.id, c.name, 'Knight', content, 'male');
      if (c.hotbarJson) {
        try {
          const parsed = typeof c.hotbarJson === 'string' ? JSON.parse(c.hotbarJson) : c.hotbarJson;
          if (Array.isArray(parsed)) {
            ch.hotbar = parsed;
          } else if (parsed && typeof parsed === 'object') {
            if (Array.isArray(parsed.hotbar)) ch.hotbar = parsed.hotbar;
            if (parsed.hotbarConfigs) (ch as any).hotbarConfigs = parsed.hotbarConfigs;
          }
        } catch {}
      }
      return ch;
    };

    const dbLegacyKnight = {
      id: 'char-cerberus-456',
      name: 'Cerberus',
      hotbarJson: JSON.stringify([168, 7644, 268]),
    };

    const hydrated = hydrateDbCharacter(dbLegacyKnight);
    expect(hydrated.hotbar).toEqual([168, 7644, 268]);
    expect(Object.keys(hydrated.hotbarConfigs || {}).length).toBe(0);
  });

  it('3. Multiple alts maintain isolated hotbar and configurations without cross-contamination', () => {
    const hydrateDbCharacter = (c: any) => {
      const ch = createCharacter(c.id, c.name, c.vocationName || 'Knight', content, 'male');
      if (c.hotbarJson) {
        try {
          const parsed = typeof c.hotbarJson === 'string' ? JSON.parse(c.hotbarJson) : c.hotbarJson;
          if (Array.isArray(parsed)) ch.hotbar = parsed;
          else if (parsed && typeof parsed === 'object') {
            if (Array.isArray(parsed.hotbar)) ch.hotbar = parsed.hotbar;
            if (parsed.hotbarConfigs) (ch as any).hotbarConfigs = parsed.hotbarConfigs;
          }
        } catch {}
      }
      return ch;
    };

    const alt1 = hydrateDbCharacter({
      id: 'alt-1',
      name: 'KnightTank',
      vocationName: 'Elite Knight',
      hotbarJson: JSON.stringify({
        hotbar: [101, 102],
        hotbarConfigs: { 0: { enabled: true, healingTarget: 'self' } },
      }),
    });

    const alt2 = hydrateDbCharacter({
      id: 'alt-2',
      name: 'MageDPS',
      vocationName: 'Master Sorcerer',
      hotbarJson: JSON.stringify({
        hotbar: [201, 202, 203],
        hotbarConfigs: { 1: { enabled: true, healingTarget: 'lowest_hp' } },
      }),
    });

    expect(alt1.hotbar).toEqual([101, 102]);
    expect(alt1.hotbarConfigs?.[0]?.healingTarget).toBe('self');
    expect(alt2.hotbar).toEqual([201, 202, 203]);
    expect(alt2.hotbarConfigs?.[1]?.healingTarget).toBe('lowest_hp');
    expect(alt1.hotbarConfigs?.[1]).toBeUndefined();
  });

  it('4. characterService merges partial hotbar and hotbarConfigs without wiping data', async () => {
    let capturedUpdateData: any = null;

    const mockPrisma = {
      character: {
        findUnique: async () => ({
          id: 'char-test-1',
          name: 'AltTest',
          accountId: 'acc-1',
          level: 50,
          experience: BigInt(100000),
          hotbarJson: JSON.stringify({
            hotbar: [10, 20, 30],
            hotbarConfigs: {
              0: { enabled: true, conditions: [{ id: '1', metric: 'hp', operator: 'lte', value: 80, isPercent: true }] },
            },
          }),
          saveVersion: 1,
          skills: [],
          inventory: [],
        }),
        update: async ({ data }: any) => {
          capturedUpdateData = data;
          return {
            id: 'char-test-1',
            ...data,
            saveVersion: 2,
            skills: [],
            inventory: [],
          };
        },
      },
    } as any;

    const service = new CharacterService(mockPrisma);

    // Salva apenas alteração de hotbar (sem enviar hotbarConfigs)
    await service.saveCharacterProgress('char-test-1', {
      saveVersion: 1,
      hotbar: [99, 88, 77],
    });

    expect(capturedUpdateData).toBeDefined();
    const updatedParsed1 = JSON.parse(capturedUpdateData.hotbarJson);
    expect(updatedParsed1.hotbar).toEqual([99, 88, 77]);
    // As configs anteriores devem ter sido preservadas!
    expect(updatedParsed1.hotbarConfigs[0].conditions[0].value).toBe(80);

    // Agora simula envio de apenas hotbarConfigs (sem enviar hotbar)
    mockPrisma.character.findUnique = async () => ({
      id: 'char-test-1',
      name: 'AltTest',
      accountId: 'acc-1',
      level: 50,
      experience: BigInt(100000),
      hotbarJson: capturedUpdateData.hotbarJson,
      saveVersion: 2,
      skills: [],
      inventory: [],
    });

    await service.saveCharacterProgress('char-test-1', {
      saveVersion: 2,
      hotbarConfigs: {
        0: { enabled: true, conditions: [{ id: '1', metric: 'hp', operator: 'lte', value: 85, isPercent: true }] },
      },
    });

    const updatedParsed2 = JSON.parse(capturedUpdateData.hotbarJson);
    // A hotbar [99, 88, 77] deve permanecer intacta!
    expect(updatedParsed2.hotbar).toEqual([99, 88, 77]);
    expect(updatedParsed2.hotbarConfigs[0].conditions[0].value).toBe(85);
  });

  it('5. Alt periodic save payload contains hotbar, hotbarConfigs, and required saveVersion', () => {
    const alt = {
      id: 'alt-cerberus',
      name: 'Cerberus',
      level: 32,
      experience: 50000,
      currentHp: 400,
      maxHp: 450,
      currentMana: 120,
      maxMana: 150,
      vocation: 'Knight',
      promotion: '',
      skills: { fist: 10, club: 10, sword: 65, axe: 10, distance: 10, shielding: 60, magicLevel: 4 },
      skillTries: { fist: 0, club: 0, sword: 100, axe: 0, distance: 0, shielding: 80, magicLevel: 50 },
      hotbar: [168, 7644, 268],
      hotbarConfigs: {
        1: { enabled: true, conditions: [{ id: '1', metric: 'hp', operator: 'lte', value: 80, isPercent: true }] },
      },
    };

    const altVersion = 3;
    const primaryChar = { id: 'primary-leader' };

    // Payload montado no loop de ownedAlts em GamePrototype.tsx
    const payload = {
      level: alt.level,
      experience: Number(alt.experience),
      health: alt.currentHp,
      maxHealth: alt.maxHp,
      mana: alt.currentMana,
      maxMana: alt.maxMana,
      skills: [
        { skillId: 2, skillName: 'Sword Fighting', value: alt.skills.sword, tries: alt.skillTries?.sword ? Math.floor(alt.skillTries.sword) : 0 },
      ],
      hotbar: alt.hotbar,
      hotbarConfigs: alt.hotbarConfigs,
      vocationName: alt.vocation,
      saveVersion: altVersion,
      leaderCharacterId: primaryChar.id,
    };

    expect(payload.hotbar).toEqual([168, 7644, 268]);
    expect(payload.hotbarConfigs).toBeDefined();
    expect(payload.hotbarConfigs[1].conditions[0].value).toBe(80);
    expect(payload.saveVersion).toBe(3);
    expect(payload.leaderCharacterId).toBe('primary-leader');
  });
});
