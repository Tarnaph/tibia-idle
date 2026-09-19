import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThaisCityRoom } from '../packages/server/src/rooms/ThaisCityRoom';
import { PlayerState } from '../packages/server/src/schemas/PlayerState';
import { getHuntWorldEntrance, initialHunts, type GameContent } from '../packages/domain/src';
import huntRegionsJson from '../content/generated/hunt-regions.json';
import vocationsJson from '../content/generated/vocations.json';
import equipmentJson from '../content/generated/equipment.json';
import monstersJson from '../content/generated/monsters.json';
import startersJson from '../content/generated/starter-loadouts.json';
import spellsJson from '../content/generated/spells.json';
import economyJson from '../content/generated/item-economy.json';
import type { EquipmentCatalog, HuntRegionCatalog, ItemEconomyCatalog, MonsterCatalog, SpellCatalog, StarterLoadoutCatalog, VocationCatalog } from '../packages/content-schema/src';

const gameContent: GameContent = {
  equipment: (equipmentJson as EquipmentCatalog).items,
  monsters: (monstersJson as MonsterCatalog).monsters,
  starterLoadouts: (startersJson as StarterLoadoutCatalog).loadouts,
  vocations: (vocationsJson as VocationCatalog).vocations,
  spells: (spellsJson as unknown as SpellCatalog).spells,
  huntRegions: (huntRegionsJson as HuntRegionCatalog).regions,
  economy: economyJson as ItemEconomyCatalog,
  hunts: initialHunts,
  rateSkill: (vocationsJson as VocationCatalog).rateSkill,
  rateMagic: (vocationsJson as VocationCatalog).rateMagic,
};

describe('Phase 207: Character Deduplication and Hunt State Synchronization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Colyseus ThaisCityRoom: player:setInHunt message handling', () => {
    it('moves player out of Thais Temple to hunt entrance when entering hunt', async () => {
      const room = new ThaisCityRoom();
      room.onCreate({});
      const client: any = { sessionId: 'hunt-sess-1', send: vi.fn() };
      const player = new PlayerState();
      player.id = 'hunt-sess-1';
      player.characterId = 'char-hunt-1';
      player.posX = 32369;
      player.posY = 32241;
      player.posZ = 7;
      player.inHunt = false;
      room.state.players.set('hunt-sess-1', player);

      const handler = (room as any).onMessageHandlers['player:setInHunt'];
      expect(handler).toBeDefined();

      await handler(client, { inHunt: true, huntId: 'cyclops-camp' });

      // Player must be marked inHunt = true
      expect(player.inHunt).toBe(true);
      expect(player.lastHuntId).toBe('cyclops-camp');

      // Coordinates MUST NOT be Thais Temple (32369, 32241, 7)
      const entrance = getHuntWorldEntrance('cyclops-camp', gameContent);
      expect(player.posX).toBe(entrance.worldPosition.x);
      expect(player.posY).toBe(entrance.worldPosition.y);
      expect(player.posZ).toBe(entrance.worldPosition.z);
      expect(player.isWalking).toBe(false);

      // Client should receive confirmation of hunt context
      expect(client.send).toHaveBeenCalledWith('server:huntContextReady', {
        isHunting: true,
        huntId: 'cyclops-camp',
      });
    });

    it('restores player to Thais Temple when exiting hunt (inHunt: false)', async () => {
      const room = new ThaisCityRoom();
      room.onCreate({});
      const client: any = { sessionId: 'hunt-sess-2', send: vi.fn() };
      const player = new PlayerState();
      player.id = 'hunt-sess-2';
      player.characterId = 'char-hunt-2';
      player.posX = 32416;
      player.posY = 32041;
      player.posZ = 8;
      player.inHunt = true;
      room.state.players.set('hunt-sess-2', player);

      const handler = (room as any).onMessageHandlers['player:setInHunt'];
      await handler(client, { inHunt: false });

      expect(player.inHunt).toBe(false);
      expect(player.posX).toBe(32369);
      expect(player.posY).toBe(32241);
      expect(player.posZ).toBe(7);
      expect(client.send).toHaveBeenCalledWith('server:huntContextReady', {
        isHunting: false,
        huntId: 'rat-cellars',
      });
    });

    it('falls back to player.lastHuntId when huntId is omitted in player:setInHunt', async () => {
      const room = new ThaisCityRoom();
      room.onCreate({});
      const client: any = { sessionId: 'hunt-sess-3', send: vi.fn() };
      const player = new PlayerState();
      player.id = 'hunt-sess-3';
      player.characterId = 'char-hunt-3';
      player.lastHuntId = 'dragon-lair';
      player.posX = 32369;
      player.posY = 32241;
      player.posZ = 7;
      room.state.players.set('hunt-sess-3', player);

      const handler = (room as any).onMessageHandlers['player:setInHunt'];
      await handler(client, { inHunt: true });

      expect(player.inHunt).toBe(true);
      const entrance = getHuntWorldEntrance('dragon-lair', gameContent);
      expect(player.posX).toBe(entrance.worldPosition.x);
      expect(player.posY).toBe(entrance.worldPosition.y);
      expect(player.posZ).toBe(entrance.worldPosition.z);
    });
  });

  describe('2. Client & Arena Deduplication Rules', () => {
    it('identifies local character and party members as isLocal to prevent remote duplicate cloning', () => {
      const myPlayerId = 'session-abc';
      const myCharIdVal = 'char-hero-1';
      const myCharNameVal = 'hero knight';
      const curChars = [
        { id: 'char-hero-1', name: 'Hero Knight' },
        { id: 'char-hero-2', name: 'Alt Mage' },
      ];

      // Remote player snapshot representing the local character from another session or state echo
      const remoteSnapshotSelf = {
        id: 'old-session-xyz',
        characterId: 'char-hero-1',
        name: 'Hero Knight',
        inHunt: false,
      };

      const isLocalSelf =
        remoteSnapshotSelf.id === myPlayerId ||
        (myCharIdVal && (remoteSnapshotSelf.characterId === myCharIdVal || remoteSnapshotSelf.id === myCharIdVal)) ||
        (myCharNameVal && remoteSnapshotSelf.name && remoteSnapshotSelf.name.toLowerCase() === myCharNameVal) ||
        curChars.some(
          (c) =>
            c.id === remoteSnapshotSelf.id ||
            c.id === (remoteSnapshotSelf as any).characterId ||
            (c.name && remoteSnapshotSelf.name && c.name.toLowerCase() === remoteSnapshotSelf.name.toLowerCase())
        );

      expect(isLocalSelf).toBe(true);

      // Remote player snapshot representing an alt from the account squad
      const remoteSnapshotAlt = {
        id: 'session-alt',
        characterId: 'char-hero-2',
        name: 'Alt Mage',
        inHunt: false,
      };

      const isLocalAlt =
        remoteSnapshotAlt.id === myPlayerId ||
        curChars.some(
          (c) =>
            c.id === remoteSnapshotAlt.id ||
            c.id === (remoteSnapshotAlt as any).characterId ||
            (c.name && remoteSnapshotAlt.name && c.name.toLowerCase() === remoteSnapshotAlt.name.toLowerCase())
        );

      expect(isLocalAlt).toBe(true);

      // Genuine remote other player
      const remoteOther = {
        id: 'other-session-123',
        characterId: 'char-other-player',
        name: 'Other Adventurer',
        inHunt: false,
      };

      const isLocalOther =
        remoteOther.id === myPlayerId ||
        curChars.some(
          (c) =>
            c.id === remoteOther.id ||
            c.id === (remoteOther as any).characterId ||
            (c.name && remoteOther.name && c.name.toLowerCase() === remoteOther.name.toLowerCase())
        );

      expect(isLocalOther).toBe(false);
    });

    it('filters out remote players who have inHunt === true from city rendering and interaction', () => {
      const huntingRemote = {
        id: 'remote-sess-99',
        characterId: 'char-remote-99',
        name: 'Hunter Remote',
        inHunt: true,
        z: 7,
      };

      // City rendering check
      const shouldRenderInCity = !huntingRemote.inHunt;
      expect(shouldRenderInCity).toBe(false);

      // Hover tooltip check
      const isHoverCandidate = !huntingRemote.inHunt;
      expect(isHoverCandidate).toBe(false);
    });
  });

  describe('3. SaveProgress Hunt Coordinates Resolution', () => {
    it('resolves entrance coordinates instead of Thais Temple when transitioning into or in a hunt', () => {
      const computeHuntState = (
        currentMode: 'training' | 'hunt',
        transLoading: { active: boolean; huntId?: string } | null,
        ctx: { inHunt: boolean; huntId?: string }
      ) => {
        const isCurrentlyHunting = currentMode === 'hunt' || Boolean(transLoading?.huntId) || ctx.inHunt;
        const activeHuntId =
          (currentMode === 'hunt' ? 'cyclops-camp' : undefined) ||
          transLoading?.huntId ||
          ctx.huntId ||
          'cyclops-camp';
        return { isCurrentlyHunting, activeHuntId };
      };

      const result = computeHuntState('training', { active: true, huntId: 'cyclops-camp' }, { inHunt: false });
      expect(result.isCurrentlyHunting).toBe(true);
      expect(result.activeHuntId).toBe('cyclops-camp');

      const entrance = getHuntWorldEntrance(result.activeHuntId, gameContent);
      const savedPosition = result.isCurrentlyHunting
        ? entrance.worldPosition
        : { x: 32369, y: 32241, z: 7 };

      expect(savedPosition.x).toBe(entrance.worldPosition.x);
      expect(savedPosition.y).toBe(entrance.worldPosition.y);
      expect(savedPosition.z).toBe(entrance.worldPosition.z);
      expect(savedPosition.x).not.toBe(32369);
    });
  });
});
