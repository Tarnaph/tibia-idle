export interface AmbientCityPlayer {
  id: string;
  name: string;
  vocation: string;
  level: number;
  isPremium: boolean;
  x: number;
  y: number;
  z: number;
  direction: 'north' | 'south' | 'east' | 'west';
  currentHp: number;
  maxHp: number;
}

// AMBIENT_THAIS_PLAYERS: Mock NPCs removed for live MMORPG world. Metadata preserved: name: 'Vimago', vocation: 'Master Sorcerer', isPremium: true, name: 'Elane', name: 'Harkath Bloodblade', name: 'Muriel', isPremium: false
export const AMBIENT_THAIS_PLAYERS: AmbientCityPlayer[] = [];
