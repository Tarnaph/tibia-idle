import { describe, it, expect } from 'vitest';
import { ThaisCityRoom } from '../packages/server/src/rooms/ThaisCityRoom';
import { PlayerState } from '../packages/server/src/schemas/PlayerState';
import { MonsterState } from '../packages/server/src/schemas/MonsterState';
import { experienceForLevel } from '../packages/domain/src';
import monstersJson from '../content/generated/monsters.json';

describe('Phase 66: Authentic Monster Experience and Level-Up Progression', () => {
  it('verifies authentic base XP for monsters in catalog (Rat: 5, Cave Rat: 10, Rotworm: 40, Minotaur: 50)', () => {
    const monstersMap = new Map<string, any>((monstersJson as any).monsters.map((m: any) => [m.id, m]));

    expect(monstersMap.get('rat')?.experience).toBe(5);
    expect(monstersMap.get('cave-rat')?.experience).toBe(10);
    expect(monstersMap.get('spider')?.experience).toBe(12);
    expect(monstersMap.get('rotworm')?.experience).toBe(40);
    expect(monstersMap.get('minotaur')?.experience).toBe(50);
    expect(monstersMap.get('carrion-worm')?.experience).toBe(70);
  });

  it('grants authentic XP and only levels up when threshold is reached in ThaisCityRoom', () => {
    const room = new ThaisCityRoom();
    room.onCreate({});

    const player = new PlayerState();
    player.id = 'p-tester';
    player.level = 8;
    player.experience = experienceForLevel(8); // 4200 XP
    room.state.players.set(player.id, player);

    const rat = new MonsterState();
    rat.id = 'm-rat-1';
    rat.monsterTypeId = 'rat';
    rat.hp = 20;

    // Killing 1 Rat grants 5 XP (4200 -> 4205), level remains 8 (level 9 requires 5400 XP)
    (room as any).killMonster(rat, player);
    expect(player.experience).toBe(4205);
    expect(player.level).toBe(8);

    // Killing Training Dummy grants 0 XP
    const dummy = new MonsterState();
    dummy.id = 'm-dummy-1';
    dummy.monsterTypeId = 'dummy';
    dummy.hp = 1000;
    (room as any).killMonster(dummy, player);
    expect(player.experience).toBe(4205);
    expect(player.level).toBe(8);
  });
});
