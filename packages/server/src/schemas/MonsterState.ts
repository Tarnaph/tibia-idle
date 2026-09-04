import { Schema, type } from '@colyseus/schema';

export class MonsterState extends Schema {
  @type('string') id: string = '';
  @type('string') monsterTypeId: string = 'rotworm';
  @type('string') name: string = 'Rotworm';
  @type('number') lookType: number = 26;

  @type('number') hp: number = 65;
  @type('number') maxHp: number = 65;

  @type('number') posX: number = 32349;
  @type('number') posY: number = 32238;
  @type('number') posZ: number = 7;
  @type('string') direction: string = 'south';

  @type('string') targetId: string = '';
  @type('boolean') isDead: boolean = false;
  @type('number') respawnTimerMs: number = 0;
  @type('number') lastAttackTime: number = 0;
  @type('number') attackPower: number = 18;
  @type('number') defensePower: number = 8;
  @type('number') armorPower: number = 4;
}
