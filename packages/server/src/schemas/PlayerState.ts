import { Schema, type } from '@colyseus/schema';

export class PlayerState extends Schema {
  @type('string') id: string = '';
  @type('string') characterId: string = '';
  @type('string') accountId: string = '';
  @type('string') role: string = 'PLAYER';
  @type('string') name: string = '';
  @type('number') vocationId: number = 4;
  @type('string') vocationName: string = 'Knight';
  @type('number') level: number = 8;
  @type('number') experience: number = 4200;

  @type('number') hp: number = 185;
  @type('number') maxHp: number = 185;
  @type('number') mp: number = 35;
  @type('number') maxMp: number = 35;
  @type('number') capacity: number = 470;

  @type('number') posX: number = 32369;
  @type('number') posY: number = 32241;
  @type('number') posZ: number = 7;
  @type('string') direction: string = 'south';

  @type('boolean') isWalking: boolean = false;
  @type('number') lastStepTime: number = 0;
  @type('string') targetId: string = '';

  @type('number') attackPower: number = 25;
  @type('number') defensePower: number = 15;
  @type('number') armorPower: number = 10;
  @type('number') attackCooldownMs: number = 2000;
  @type('number') lastAttackTime: number = 0;

  // Real-time Outfit and Mount synchronization
  @type('string') outfit: string = 'Knight';
  @type('number') outfitLookType: number = 128;
  @type('number') outfitHead: number = 0;
  @type('number') outfitBody: number = 0;
  @type('number') outfitLegs: number = 0;
  @type('number') outfitFeet: number = 0;
  @type('number') outfitAddons: number = 0;
  @type('string') mount: string = 'none';
  @type('boolean') mountActive: boolean = false;
  @type('boolean') inHunt: boolean = false;
}
