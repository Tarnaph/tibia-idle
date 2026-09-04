import { Schema, MapSchema, type } from '@colyseus/schema';
import { PlayerState } from './PlayerState';
import { MonsterState } from './MonsterState';

export class WorldState extends Schema {
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type({ map: MonsterState }) monsters = new MapSchema<MonsterState>();
  @type('number') serverTick: number = 0;
  @type('string') regionName: string = 'thais-city';
}
