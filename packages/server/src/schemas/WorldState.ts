import { Schema, MapSchema, ArraySchema, type } from '@colyseus/schema';
import { PlayerState } from './PlayerState';
import { MonsterState } from './MonsterState';
import { CombatEventSchema } from './CombatEventSchema';
import { ChatMessageSchema } from './ChatMessageSchema';

export class WorldState extends Schema {
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type({ map: MonsterState }) monsters = new MapSchema<MonsterState>();
  @type([CombatEventSchema]) combatEvents = new ArraySchema<CombatEventSchema>();
  @type([ChatMessageSchema]) chatMessages = new ArraySchema<ChatMessageSchema>();
  @type('number') serverTick: number = 0;
  @type('string') regionName: string = 'thais-city';
}
