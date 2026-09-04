import { Schema, type } from '@colyseus/schema';

export class CombatEventSchema extends Schema {
  @type('string') id: string = '';
  @type('string') type: string = 'damage'; // 'damage' | 'heal' | 'spell' | 'death'
  @type('string') sourceId: string = '';
  @type('string') targetId: string = '';
  @type('number') value: number = 0;
  @type('number') posX: number = 0;
  @type('number') posY: number = 0;
  @type('string') text: string = '';
  @type('string') color: string = '#ff3333';
  @type('number') timestamp: number = 0;
}
