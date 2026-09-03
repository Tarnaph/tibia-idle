import type {
  BaseVocationName,
  EquipmentDefinition,
  ItemEconomyCatalog,
  MonsterDefinition,
  StarterLoadoutDefinition,
  SpellDefinition,
  HuntRegionDefinition,
  PromotedVocationName,
  VocationDefinition,
  VocationName,
} from '../../content-schema/src';
import type { CardinalDirection, GridPosition, RoomState } from './spatial/types';

export type CharacterEquipmentSlot = 'head' | 'armor' | 'legs' | 'boots' | 'leftHand' | 'rightHand';
export type CombatSkill = 'fist' | 'club' | 'sword' | 'axe' | 'distance' | 'shielding';
export type TrainableSkill = CombatSkill | 'magicLevel';

export interface CharacterSkills {
  fist: number;
  club: number;
  sword: number;
  axe: number;
  distance: number;
  shielding: number;
  magicLevel: number;
}

export type SkillTries = Record<TrainableSkill, number>;
export type EquipmentLoadout = Record<CharacterEquipmentSlot, number | null>;

export interface CharacterState {
  id: string;
  name: string;
  vocation: VocationName;
  baseVocation: BaseVocationName;
  promotion: PromotedVocationName | null;
  level: number;
  experience: number;
  currentHp: number;
  currentMana: number;
  maxHp: number;
  maxMana: number;
  skills: CharacterSkills;
  skillTries: SkillTries;
  equipment: EquipmentLoadout;
  inventory: { equipmentIds: number[] };
  spells: number[];
  hotbar: number[];
  combatState: {
    targetId: string | null;
    spellCooldowns: Record<string, number>;
    groupCooldowns: Record<string, number>;
  };
  trainingState: {
    skillRemainderMs: number;
    shieldingRemainderMs: number;
    manaSpent: number;
    manaSimulationRemainderMs: number;
  };
}

export interface PartyActorState {
  characterId: string;
  hp: number;
  mana: number;
  alive: boolean;
  position: GridPosition;
  previousPosition: GridPosition;
  direction: CardinalDirection;
  path: GridPosition[];
  targetId: string | null;
  nextAttackAt: number;
  attackIntervalMs: number;
  speed: number;
  nextMoveAt: number;
  nextSpellAt: number;
  spellCooldowns: Record<string, number>;
  groupCooldowns: Record<string, number>;
  hasteUntil: number;
  magicShieldUntil: number;
  bloodRageUntil: number;
  lastHitTakenAt: number;
  nextManaRegenAt: number;
  nextHealthRegenAt: number;
  pendingAttack: PendingBasicAttack | null;
}

export interface PendingBasicAttack {
  targetId: string;
  impactAt: number;
  attack: number;
  weaponName: string;
  activeSkill: TrainableSkill;
  activeSkillLevel: number;
  ranged: boolean;
}

export type EnemyBehavior = 'idle' | 'roam' | 'detect' | 'chase' | 'attack';

export interface EnemyState {
  id: string;
  monsterId: string;
  name: string;
  hp: number;
  maxHp: number;
  attackMax: number;
  defense: number;
  armor: number;
  alive: boolean;
  position: GridPosition;
  previousPosition: GridPosition;
  direction: CardinalDirection;
  path: GridPosition[];
  targetId: string | null;
  nextAttackAt: number;
  attackIntervalMs: number;
  speed: number;
  behavior: EnemyBehavior;
  nextRoamAt: number;
  nextMoveAt: number;
  detectionRange: number;
  variant: MonsterVariantDefinition | null;
  respawnZoneId?: string;
}

export interface CorpseState {
  id: string;
  monsterId: string;
  corpseId: number;
  position: GridPosition;
  createdAt: number;
}

export interface WaveDefinition {
  number: number;
  monsterId: string;
  count: number;
  boss?: MonsterVariantDefinition;
}

export interface MonsterVariantDefinition {
  baseMonsterId: string;
  name: string;
  hpMultiplier: number;
  damageMultiplier: number;
  defenseMultiplier: number;
  xpMultiplier: number;
  lootMultiplier: number;
  scale: number;
  visualModifier: 'boss-aura' | 'rare-aura';
}

export interface HuntDefinition {
  id: string;
  name: string;
  description: string;
  recommendedLevel: number;
  minimumLevel: number;
  monsters: string[];
  roomDefinitions: string[];
  environment: { regionId: string; label: string; source: 'styller-otbm' };
  rewardProfile: 'xp';
  status: 'available';
  waves: WaveDefinition[];
}

export interface LootStack { itemId?: number; name: string; amount: number }
export interface ItemLootPreference { itemId: number; autoLoot: boolean; lockSell: boolean; quickSell: boolean }

export type CombatEvent =
  | { type: 'player-attack'; sourceId: string; targetId: string; damage: number }
  | { type: 'enemy-attack'; sourceId: string; targetId: string; damage: number }
  | { type: 'enemy-death'; enemyId: string; corpseId: number }
  | { type: 'loot'; itemName: string; amount: number }
  | { type: 'level-up'; characterId: string; level: number }
  | { type: 'skill-up'; characterId: string; skill: TrainableSkill; level: number }
  | { type: 'wave-complete'; wave: number }
  | { type: 'movement'; actorId: string; from: GridPosition; to: GridPosition; durationMs: number }
  | { type: 'room-complete'; room: number }
  | { type: 'room-transition'; room: number }
  | { type: 'hunt-complete' }
  | { type: 'player-death'; characterId: string }
  | { type: 'spell-cast'; sourceId: string; targetId: string; spellId: number; amount: number; healing: boolean; speech?: string }
  | { type: 'spell-visual'; sourceId: string; targetId?: string; targetPosition?: GridPosition; spellId: number; effectId: number | null; projectileId: number | 'weapon-type' | null };

export type CombatVisualEvent =
  | { type: 'basic-attack-started'; sourceId: string; targetId: string; ranged: boolean }
  | { type: 'projectile-launched'; sourceId: string; targetId: string; projectileId: number }
  | { type: 'projectile-hit'; sourceId: string; targetId: string; effectId: number }
  | { type: 'melee-hit'; sourceId: string; targetId: string; effectId: number; blocked: boolean }
  | { type: 'heal-applied'; sourceId: string; targetId: string; effectId: number }
  | { type: 'spell-cast-visual'; sourceId: string; targetId: string; effectId: number | null; projectileId: number | null }
  | { type: 'creature-died'; creatureId: string; corpseId: number }
  | { type: 'training-action'; sourceId: string; style: 'melee' | 'distance' | 'magic'; effectId: number; projectileId: number | null };

export interface CombatLogEntry { id: number; round: number; message: string }

export interface SessionState {
  leaderId: string;
  selectedCharacterId: string;
  cameraTargetCharacterId: string;
  characters: CharacterState[];
  loot: LootStack[]; // Mochila (retrocompatibilidade)
  bag?: LootStack[];  // Bolsa (12 slots seguros)
  depot?: LootStack[]; // Armazém DP
  gold: number;
  trainingElapsedMs: number;
  itemLootPreferences: Record<string, ItemLootPreference>;
}

export interface ExpeditionEncounterDefinition {
  id: string;
  sourceWaveIndex: number;
  anchor: GridPosition;
  monsterId: string;
  count: number;
  boss?: MonsterVariantDefinition;
}

export interface HuntExpedition {
  huntId: string;
  mapRegion: string;
  entryPoint: GridPosition;
  encounters: ExpeditionEncounterDefinition[];
  roamingSpawns: GridPosition[];
  bossEncounter: ExpeditionEncounterDefinition | null;
  exitPoint: GridPosition;
  explorationPath: GridPosition[];
}

export interface ExpeditionProgress {
  activeEncounterIndex: number;
  activeEncounterSpawned: boolean;
  completedEncounterIds: string[];
  kills: number;
  totalEnemies: number;
  explorationPercent: number;
  bossState: 'ahead' | 'active' | 'defeated';
  reachedExit: boolean;
}

export interface RespawnZone {
  id: string;
  center: GridPosition;
  positions: GridPosition[];
  radius: number;
  monsterPool: string[];
  monsterComposition: Array<{ monsterId: string; count: number }>;
  minCount: number;
  maxCount: number;
  activationRadius: number;
  sourceRespawnSeconds: number | null;
  gameRespawnSeconds: number;
}

export interface RespawnZoneState {
  zoneId: string;
  activeEnemyIds: string[];
  lastActivatedAt: number | null;
  lastClearedAt: number | null;
  nextRespawnAt: number;
  activationCount: number;
}

export interface HuntRoute {
  huntId: string;
  mapRegion: string;
  entryPoint: GridPosition;
  path: GridPosition[];
  respawnZones: RespawnZone[];
  rareSpawnRules: { probability: number; variant: MonsterVariantDefinition };
  exitPoint: GridPosition | null;
  loopMode: boolean;
}

export interface ContinuousHuntProgress {
  currentZoneIndex: number;
  loopCount: number;
  kills: number;
  rareKills: number;
  zones: RespawnZoneState[];
  lastActivityAt: number;
  stalledSince: number | null;
}

export interface HuntEncounterState {
  status: 'ready' | 'running' | 'completed' | 'defeated';
  seed: string;
  rngState: number;
  round: number;
  elapsedMs: number;
  nextMovementAt: number;
  waveIndex: number;
  hunt: HuntDefinition;
  partyActors: PartyActorState[];
  enemies: EnemyState[];
  corpses: CorpseState[];
  events: CombatEvent[];
  visualEvents: CombatVisualEvent[];
  log: CombatLogEntry[];
  nextLogId: number;
  room: RoomState;
  mode: 'continuous' | 'expedition' | 'legacyWaveMode';
  expedition: HuntExpedition | null;
  expeditionProgress: ExpeditionProgress | null;
  huntRoute: HuntRoute | null;
  continuousProgress: ContinuousHuntProgress | null;
}

export interface GameState { session: SessionState; encounter: HuntEncounterState }

export interface GameContent {
  monsters: MonsterDefinition[];
  equipment: EquipmentDefinition[];
  vocations: VocationDefinition[];
  starterLoadouts: StarterLoadoutDefinition[];
  spells: SpellDefinition[];
  huntRegions: HuntRegionDefinition[];
  economy: ItemEconomyCatalog;
  hunts: HuntDefinition[];
  rateSkill: number;
  rateMagic: number;
}
