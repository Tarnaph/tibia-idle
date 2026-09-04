'use client';

import { useEffect, useRef } from 'react';
import thaisCityJson from '@/content/generated/thais-city.json';
import visualAssetsJson from '@/content/generated/tibia860-assets.json';
import type { CharacterState, CombatVisualEvent } from '@/packages/domain/src';
import { calculatePixelCamera, creatureVisualLayout, VisualMotionTrack } from '@/packages/presentation/src';
import type { Tibia860AssetManifest } from '@/packages/tibia860-assets/src/types';
import type { Application as PixiApplication, Texture as PixiTexture } from 'pixi.js';
import { showGlobalPlayerTooltip, hideGlobalPlayerTooltip } from './GlobalItemTooltip';
import { getRecoloredCanvasSync, normalizeOutfitId, preloadOutfitAllFrames } from '@/apps/web/lib/outfitRecolor';

export interface CityOverheadMessage {
  id: string;
  senderName: string;
  text: string;
  channel: 'local' | 'world';
  timestamp: number;
}

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

export const AMBIENT_THAIS_PLAYERS: AmbientCityPlayer[] = [
  {
    id: 'player-vimago',
    name: 'Vimago',
    vocation: 'Master Sorcerer',
    level: 45,
    isPremium: true,
    x: 32344,
    y: 32230,
    z: 7,
    direction: 'south',
    currentHp: 380,
    maxHp: 380,
  },
  {
    id: 'player-elane',
    name: 'Elane',
    vocation: 'Royal Paladin',
    level: 32,
    isPremium: true,
    x: 32358,
    y: 32225,
    z: 7,
    direction: 'east',
    currentHp: 520,
    maxHp: 520,
  },
  {
    id: 'player-harkath',
    name: 'Harkath Bloodblade',
    vocation: 'Elite Knight',
    level: 68,
    isPremium: true,
    x: 32348,
    y: 32222,
    z: 7,
    direction: 'south',
    currentHp: 1150,
    maxHp: 1150,
  },
  {
    id: 'player-sire',
    name: 'Sire',
    vocation: 'Sire',
    level: 120,
    isPremium: true,
    x: 32350,
    y: 32226,
    z: 7,
    direction: 'south',
    currentHp: 2400,
    maxHp: 2400,
  },
  {
    id: 'player-muriel',
    name: 'Muriel',
    vocation: 'Sorcerer',
    level: 54,
    isPremium: false,
    x: 32367,
    y: 32240,
    z: 7,
    direction: 'south',
    currentHp: 440,
    maxHp: 440,
  },
  {
    id: 'player-gorn',
    name: 'Gorn',
    vocation: 'Knight',
    level: 28,
    isPremium: false,
    x: 32350,
    y: 32236,
    z: 7,
    direction: 'north',
    currentHp: 580,
    maxHp: 580,
  },
  {
    id: 'player-quentin',
    name: 'Quentin',
    vocation: 'Elder Druid',
    level: 80,
    isPremium: true,
    x: 32369,
    y: 32243,
    z: 7,
    direction: 'south',
    currentHp: 650,
    maxHp: 650,
  },
];

interface Props {
  characters: CharacterState[];
  cityPos: { x: number; y: number; z: number };
  isWalking: boolean;
  isTraining: boolean;
  stepDurationMs?: number;
  onTileClick?: (tile: { x: number; y: number; z: number }) => void;
  onCharacterContextMenu?: (characterId: string, x: number, y: number) => void;
  visualEvents?: CombatVisualEvent[];
  debug?: boolean;
  remotePlayers?: Map<string, any>;
  localPlayerId?: string | null;
  overheadMessages?: CityOverheadMessage[];
}

const visualAssets = visualAssetsJson as Tibia860AssetManifest;
const thaisData = thaisCityJson as {
  bounds: { minX: number; maxX: number; minY: number; maxY: number; z: number };
  temple: { x: number; y: number; z: number };
  depot: { x: number; y: number; z: number };
  trainingDummy: { x: number; y: number; z: number };
  tiles: Array<{
    x: number;
    y: number;
    z: number;
    walkable: boolean;
    groundClientId: number | null;
    serverItemIds: number[];
    clientItemIds: number[];
  }>;
};

const TILE_SIZE = 32;

const VOCATION_NAMES: Record<number, string> = {
  1: 'Knight',
  2: 'Paladin',
  3: 'Sorcerer',
  4: 'Druid',
};

export function ThaisCityArena({
  characters,
  cityPos,
  isWalking,
  isTraining,
  stepDurationMs = 500,
  onTileClick,
  onCharacterContextMenu,
  visualEvents = [],
  debug = false,
  remotePlayers,
  localPlayerId,
  overheadMessages,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PixiApplication | null>(null);
  const latestRef = useRef({ characters, cityPos, isWalking, isTraining, stepDurationMs, onTileClick, onCharacterContextMenu, remotePlayers, localPlayerId, overheadMessages });

  useEffect(() => {
    latestRef.current = { characters, cityPos, isWalking, isTraining, stepDurationMs, onTileClick, onCharacterContextMenu, remotePlayers, localPlayerId, overheadMessages };
  }, [characters, cityPos, isWalking, isTraining, stepDurationMs, onTileClick, onCharacterContextMenu, remotePlayers, localPlayerId, overheadMessages]);


  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;

    void (async () => {
      const { Application, Assets, Container, Graphics, Sprite, Text, Texture } = await import('pixi.js');
      const app = new Application();
      await app.init({
        resizeTo: hostRef.current ?? undefined,
        antialias: false,
        background: 0x07090b,
        resolution: Math.min(2, window.devicePixelRatio),
        autoDensity: true,
        roundPixels: true,
      });

      if (disposed || !hostRef.current) {
        app.destroy(true, { children: true });
        return;
      }

      appRef.current = app;
      hostRef.current.appendChild(app.canvas);

      // Collect assets to load
      const floorUrl = visualAssets.assets.trainingFloor.frames[0].publicUrl;
      const wallUrl = visualAssets.assets.trainingWall.frames[0].publicUrl;
      const rugUrl = visualAssets.assets.trainingRug.frames[0].publicUrl;
      const dummyUrl = visualAssets.assets.trainingDummy.frames[0].publicUrl;
      const decorUrl = visualAssets.assets.trainingDecor.frames[0].publicUrl;
      const mountUrl = '/generated/mounts/donkey_rider_south.png';
      const thumbUrls = [
        'citizen', 'hunter', 'mage', 'knight', 'noble', 'summoner', 'warrior', 'barbarian', 'druid', 'sorcerer', 'paladin', 'sire', 'assassin', 'pirate', 'oriental', 'beggar'
      ].map((id) => `/generated/outfit-thumbs/${id}.png`);
      const outfitUrls = Object.values(visualAssets.outfits).flatMap((outfit) =>
        outfit.frames.map((f) => f.publicUrl)
      );
      const mapItemUrls = thaisData.tiles.flatMap((t) =>
        t.serverItemIds.flatMap((id) => {
          const mapping = visualAssets.mapItems[String(id)];
          if (mapping?.frames && mapping.frames.length > 0) {
            return mapping.frames.map((f) => f.publicUrl);
          }
          return mapping?.frame ? [mapping.frame.publicUrl] : [];
        })
      );

      const allUrls = [
        ...new Set([floorUrl, wallUrl, rugUrl, dummyUrl, decorUrl, mountUrl, ...thumbUrls, ...outfitUrls, ...mapItemUrls]),
      ];
      
      const loaded: Record<string, PixiTexture> = {};
      try {
        await Promise.allSettled(
          allUrls.map(async (url) => {
            try {
              const texture = await Assets.load<PixiTexture>(url);
              if (texture) {
                texture.source.style.scaleMode = 'nearest';
                loaded[url] = texture;
              }
            } catch {
              // Ignore single asset load failure
            }
          })
        );
      } catch (err) {
        console.warn('Map asset loading error:', err);
      }

      if (disposed) {
        app.destroy(true, { children: true });
        return;
      }

      const world = new Container();
      const floor7Container = new Container();
      const terrainLayerZ7 = new Container();
      const objectsLayerZ7 = new Container();
      objectsLayerZ7.sortableChildren = true;
      floor7Container.addChild(terrainLayerZ7, objectsLayerZ7);

      const floor6Container = new Container();
      const terrainLayerZ6 = new Container();
      const objectsLayerZ6 = new Container();
      objectsLayerZ6.sortableChildren = true;
      floor6Container.addChild(terrainLayerZ6, objectsLayerZ6);

      const actorsLayer = new Container();
      actorsLayer.sortableChildren = true;
      const overlayLayer = new Container();

      world.addChild(floor7Container, floor6Container, actorsLayer);
      app.stage.addChild(world, overlayLayer);

      // Fast tile lookups for ground (z:7) and upper floor / dock (z:6)
      const tileMapZ7 = new Map<string, typeof thaisData.tiles[0]>();
      const tileMapZ6 = new Map<string, typeof thaisData.tiles[0]>();
      for (const t of thaisData.tiles) {
        tileMapZ7.set(`${t.x},${t.y}`, t);
      }
      const upperTiles = (thaisData as { upperTiles?: typeof thaisData.tiles }).upperTiles ?? [];
      for (const t of upperTiles) {
        tileMapZ6.set(`${t.x},${t.y}`, t);
      }

      // Training dummies placed in the training room on Z:7
      const dummyPos = thaisData.trainingDummy;
      if (loaded[dummyUrl]) {
        const dummySprite = new Sprite(loaded[dummyUrl]);
        dummySprite.anchor.set(creatureVisualLayout.spriteAnchorX, creatureVisualLayout.spriteAnchorY);
        dummySprite.position.set(dummyPos.x * TILE_SIZE + 16 + creatureVisualLayout.spriteOffsetX, dummyPos.y * TILE_SIZE + 16 + creatureVisualLayout.spriteOffsetY);
        dummySprite.roundPixels = true;
        dummySprite.zIndex = dummyPos.y * TILE_SIZE + 16;
        objectsLayerZ7.addChild(dummySprite);
      }

      // Pre-render world tiles in the Thais bounding box and collect animated items
      const minX = thaisData.bounds.minX;
      const maxX = thaisData.bounds.maxX;
      const minY = thaisData.bounds.minY;
      const maxY = thaisData.bounds.maxY;

      const animatedMapSprites: Array<{
        sprite: InstanceType<typeof Sprite>;
        frames: string[];
        frameDurationMs: number;
      }> = [];

      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const tile7 = tileMapZ7.get(`${x},${y}`);
          const tile6 = tileMapZ6.get(`${x},${y}`);
          const px = x * TILE_SIZE;
          const py = y * TILE_SIZE;

          // Render Z: 7 (ground floor) in floor7Container
          let hasGroundSprite7 = false;
          if (tile7) {
            for (const sId of tile7.serverItemIds) {
              const mapping = visualAssets.mapItems[String(sId)];
              if (mapping?.isGround && mapping.frame && loaded[mapping.frame.publicUrl]) {
                const sp = new Sprite(loaded[mapping.frame.publicUrl]);
                sp.position.set(px, py);
                sp.roundPixels = true;
                terrainLayerZ7.addChild(sp);
                hasGroundSprite7 = true;
                if (mapping.frames && mapping.frames.length > 1) {
                  animatedMapSprites.push({
                    sprite: sp,
                    frames: mapping.frames.map((f) => f.publicUrl),
                    frameDurationMs: mapping.animDurationMs || 180,
                  });
                }
                break;
              }
            }

            for (const sId of tile7.serverItemIds) {
              const mapping = visualAssets.mapItems[String(sId)];
              if (!mapping?.isGround && mapping?.frame && loaded[mapping.frame.publicUrl]) {
                const sp = new Sprite(loaded[mapping.frame.publicUrl]);
                const offsetY = mapping.frame.height > 32 ? -(mapping.frame.height - 32) : 0;
                const offsetX = mapping.frame.width > 32 ? -(mapping.frame.width - 32) : 0;
                sp.position.set(px + offsetX, py + offsetY);
                sp.roundPixels = true;
                sp.zIndex = py + 32;
                objectsLayerZ7.addChild(sp);
                if (mapping.frames && mapping.frames.length > 1) {
                  animatedMapSprites.push({
                    sprite: sp,
                    frames: mapping.frames.map((f) => f.publicUrl),
                    frameDurationMs: mapping.animDurationMs || 180,
                  });
                }
              }
            }
          }

          if (!hasGroundSprite7) {
            const isWalkable = tile7?.walkable ?? false;
            const floorSp = new Sprite(loaded[isWalkable ? floorUrl : wallUrl]);
            floorSp.position.set(px, py);
            floorSp.roundPixels = true;
            terrainLayerZ7.addChild(floorSp);
          }

          // Render Z: 6 (upper floor / dock pier) in floor6Container
          if (tile6) {
            let hasGroundSprite6 = false;
            for (const sId of tile6.serverItemIds) {
              const mapping = visualAssets.mapItems[String(sId)];
              if (mapping?.isGround && mapping.frame && loaded[mapping.frame.publicUrl]) {
                const sp = new Sprite(loaded[mapping.frame.publicUrl]);
                sp.position.set(px, py);
                sp.roundPixels = true;
                terrainLayerZ6.addChild(sp);
                hasGroundSprite6 = true;
                if (mapping.frames && mapping.frames.length > 1) {
                  animatedMapSprites.push({
                    sprite: sp,
                    frames: mapping.frames.map((f) => f.publicUrl),
                    frameDurationMs: mapping.animDurationMs || 180,
                  });
                }
                break;
              }
            }

            for (const sId of tile6.serverItemIds) {
              const mapping = visualAssets.mapItems[String(sId)];
              if (!mapping?.isGround && mapping?.frame && loaded[mapping.frame.publicUrl]) {
                const sp = new Sprite(loaded[mapping.frame.publicUrl]);
                const offsetY = mapping.frame.height > 32 ? -(mapping.frame.height - 32) : 0;
                const offsetX = mapping.frame.width > 32 ? -(mapping.frame.width - 32) : 0;
                sp.position.set(px + offsetX, py + offsetY);
                sp.roundPixels = true;
                sp.zIndex = py + 32;
                objectsLayerZ6.addChild(sp);
                if (mapping.frames && mapping.frames.length > 1) {
                  animatedMapSprites.push({
                    sprite: sp,
                    frames: mapping.frames.map((f) => f.publicUrl),
                    frameDurationMs: mapping.animDurationMs || 180,
                  });
                }
              }
            }

            if (!hasGroundSprite6 && tile6.walkable) {
              const floorSp = new Sprite(loaded[floorUrl]);
              floorSp.position.set(px, py);
              floorSp.roundPixels = true;
              terrainLayerZ6.addChild(floorSp);
            }
          }
        }
      }

      // Tile Hover Indicator Graphic
      const hoverCursor = new Graphics();
      hoverCursor.rect(0, 0, 32, 32).fill({ color: 0x3da5ff, alpha: 0.08 });
      hoverCursor.moveTo(0, 0).lineTo(32, 0).stroke({ color: 0x3da5ff, width: 1.5 });
      hoverCursor.moveTo(0, 0).lineTo(0, 32).stroke({ color: 0x3da5ff, width: 1.5 });
      hoverCursor.moveTo(32, 0).lineTo(32, 32).stroke({ color: 0x3da5ff, width: 1.5 });
      hoverCursor.moveTo(0, 32).lineTo(32, 32).stroke({ color: 0xf5d547, width: 1.5 });
      hoverCursor.zIndex = 999999;
      world.addChild(hoverCursor);
      hoverCursor.visible = false;

      let playerDirection: 'north' | 'south' | 'east' | 'west' = 'south';
      const initialPos = latestRef.current.cityPos;
      const motionTrack = new VisualMotionTrack(
        { x: initialPos.x, y: initialPos.y, z: initialPos.z },
        'south'
      );
      let lastCommittedPos = { ...initialPos };
      let tickCount = 0;
      let currentPixelX = initialPos.x * TILE_SIZE + 16;
      let currentPixelY = initialPos.y * TILE_SIZE + 16;
      let hoveredPlayerId: string | null = null;

      const onPointerMove = (e: PointerEvent) => {
        const rect = app.canvas.getBoundingClientRect();
        const clientX = e.clientX - rect.left;
        const clientY = e.clientY - rect.top;

        const worldX = (clientX - world.position.x) / world.scale.x;
        const worldY = (clientY - world.position.y) / world.scale.y;

        const tileX = Math.floor(worldX / TILE_SIZE);
        const tileY = Math.floor(worldY / TILE_SIZE);

        if (tileX >= minX && tileX <= maxX && tileY >= minY && tileY <= maxY) {
          hoverCursor.position.set(tileX * TILE_SIZE, tileY * TILE_SIZE);
          hoverCursor.visible = true;
        } else {
          hoverCursor.visible = false;
        }

        // Hover detection over other players / characters in Thais
        const activeZ = latestRef.current.cityPos.z;
        const curChars = latestRef.current.characters;
        let matchedPlayer: {
          id: string;
          name: string;
          level: number;
          vocation: string;
          isPremium: boolean;
          currentHp?: number;
          maxHp?: number;
        } | null = null;

        // 1. Check ambient city players on the active Z floor
        for (const p of AMBIENT_THAIS_PLAYERS) {
          if (p.z !== activeZ) continue;
          const px = p.x * TILE_SIZE + 16;
          const py = p.y * TILE_SIZE + 16;
          const dx = worldX - px;
          const dy = worldY - py;
          if (dx >= -18 && dx <= 18 && dy >= -38 && dy <= 16) {
            matchedPlayer = p;
            break;
          }
        }

        // 2. Check party characters (including other players in party)
        if (!matchedPlayer) {
          curChars.forEach((char, idx) => {
            const offsetX = idx === 0 ? 0 : idx === 1 ? -24 : idx === 2 ? 24 : 0;
            const offsetY = idx === 0 ? 0 : idx === 3 ? 24 : 12;
            const px = currentPixelX + offsetX;
            const py = currentPixelY + offsetY;
            const dx = worldX - px;
            const dy = worldY - py;
            if (dx >= -18 && dx <= 18 && dy >= -38 && dy <= 16) {
              matchedPlayer = {
                id: char.id,
                name: char.name,
                level: char.level,
                vocation: char.vocation,
                isPremium: char.isPremium ?? true,
                currentHp: char.currentHp,
                maxHp: char.maxHp,
              };
            }
          });
        }

        if (matchedPlayer) {
          hoveredPlayerId = matchedPlayer.id;
          app.canvas.style.cursor = 'pointer';
          showGlobalPlayerTooltip(
            {
              name: matchedPlayer.name,
              level: matchedPlayer.level,
              vocation: matchedPlayer.vocation,
              isPremium: matchedPlayer.isPremium,
              currentHp: matchedPlayer.currentHp,
              maxHp: matchedPlayer.maxHp,
            },
            e.clientX,
            e.clientY
          );
        } else if (hoveredPlayerId) {
          hoveredPlayerId = null;
          app.canvas.style.cursor = 'default';
          hideGlobalPlayerTooltip();
        }
      };

      const onPointerLeave = () => {
        hoverCursor.visible = false;
        if (hoveredPlayerId) {
          hoveredPlayerId = null;
          app.canvas.style.cursor = 'default';
          hideGlobalPlayerTooltip();
        }
      };

      const onPointerDown = (e: PointerEvent) => {
        if (e.button !== 0) return; // Only left click
        const rect = app.canvas.getBoundingClientRect();
        const clientX = e.clientX - rect.left;
        const clientY = e.clientY - rect.top;

        const worldX = (clientX - world.position.x) / world.scale.x;
        const worldY = (clientY - world.position.y) / world.scale.y;

        const tileX = Math.floor(worldX / TILE_SIZE);
        const tileY = Math.floor(worldY / TILE_SIZE);

        const activeZ = latestRef.current.cityPos.z;
        const activeTileMap = activeZ === 6 ? tileMapZ6 : tileMapZ7;
        const tile = activeTileMap.get(`${tileX},${tileY}`);
        if (tile && tile.walkable) {
          latestRef.current.onTileClick?.({ x: tileX, y: tileY, z: activeZ });
        }
      };

      const onContextMenu = (e: MouseEvent) => {
        e.preventDefault();
        const rect = app.canvas.getBoundingClientRect();
        const clientX = e.clientX - rect.left;
        const clientY = e.clientY - rect.top;

        const worldX = (clientX - world.position.x) / world.scale.x;
        const worldY = (clientY - world.position.y) / world.scale.y;

        const curChars = latestRef.current.characters;
        let matchedCharId = curChars[0]?.id;
        for (let idx = 0; idx < curChars.length; idx++) {
          const char = curChars[idx];
          const offsetX = idx === 0 ? 0 : idx === 1 ? -24 : idx === 2 ? 24 : 0;
          const offsetY = idx === 0 ? 0 : idx === 3 ? 24 : 12;
          const px = currentPixelX + offsetX;
          const py = currentPixelY + offsetY;
          const dx = worldX - px;
          const dy = worldY - py;
          if (dx >= -24 && dx <= 24 && dy >= -44 && dy <= 20) {
            matchedCharId = char.id;
            break;
          }
        }
        if (matchedCharId) {
          latestRef.current.onCharacterContextMenu?.(matchedCharId, e.clientX, e.clientY);
        }
      };

      app.canvas.addEventListener('pointermove', onPointerMove);
      app.canvas.addEventListener('pointerleave', onPointerLeave);
      app.canvas.addEventListener('pointerdown', onPointerDown);
      app.canvas.addEventListener('contextmenu', onContextMenu);

      // Character actor containers with crisp nameplate and health bar
      interface CityActorView {
        root: InstanceType<typeof Container>;
        sprite: InstanceType<typeof Sprite>;
        label: InstanceType<typeof Text>;
        bar: InstanceType<typeof Graphics>;
        lastUrl: string;
        lastTextureKey?: string;
        overheadSpeech?: InstanceType<typeof Container>;
        overheadSpeechText?: InstanceType<typeof Text>;
        speechExpiresAt?: number;
      }
      const actorViews = new Map<string, CityActorView>();
      const processedSpeechIds = new Set<string>();

      function getOutfitFrameUrl(vocationOrOutfit: string, direction: string, frame: number): string {
        const normKey = vocationOrOutfit.includes('Sire')
          ? 'Sire'
          : vocationOrOutfit.includes('Sorcerer') || vocationOrOutfit.includes('Mage')
          ? 'Sorcerer'
          : vocationOrOutfit.includes('Druid')
          ? 'Druid'
          : vocationOrOutfit.includes('Paladin') || vocationOrOutfit.includes('Hunter')
          ? 'Paladin'
          : vocationOrOutfit.includes('Knight')
          ? 'Knight'
          : vocationOrOutfit;
        const outfit = visualAssets.outfits[normKey];
        if (outfit) {
          const dirFrames = outfit.frames.filter((f) => f.direction === direction);
          const candidates = dirFrames.length > 0 ? dirFrames : outfit.frames.filter((f) => f.direction === 'south');
          const match = candidates.find((f) => f.frame === frame) ?? candidates[0];
          return match?.publicUrl ?? outfit.frames[0]?.publicUrl ?? '';
        }
        const idLower = normalizeOutfitId(vocationOrOutfit);
        return `/generated/outfit-thumbs/${idLower}.png`;
      }

      function ensureActorView(char: { id: string; name: string; vocation: string; gender?: 'male' | 'female'; outfit?: string; mount?: string; mountActive?: boolean; outfitColors?: { head: number; primary: number; secondary: number; detail: number } }): CityActorView | null {
        let view = actorViews.get(char.id);
        if (view) return view;

        if (char.outfitColors) {
          preloadOutfitAllFrames(char.outfit || char.vocation, char.gender || 'male', char.outfitColors).catch(() => {});
        }

        const isMounted = Boolean(char.mountActive && char.mount && char.mount !== 'none');
        const mountUrl = (char.mount === 'donkey' || char.mount === 'Donkey')
          ? '/generated/mounts/donkey_rider_south.png'
          : `/generated/mounts/${char.mount}.png`;
        const initialUrl = isMounted ? mountUrl : getOutfitFrameUrl(char.outfit || char.vocation, 'south', 0);
        let tex = loaded[initialUrl];

        if (!tex) {
          const colors = char.outfitColors || { head: 0, primary: 86, secondary: 114, detail: 76 };
          const charGender = char.gender === 'female' ? 'female' : 'male';
          const canvas = getRecoloredCanvasSync(char.outfit || char.vocation, charGender, 'south', 0, colors);
          if (canvas) {
            tex = Texture.from(canvas);
            tex.source.style.scaleMode = 'nearest';
          }
        }

        if (!tex) {
          const fallback = visualAssets.outfits['Knight']?.frames[0]?.publicUrl;
          if (fallback) tex = loaded[fallback];
        }
        if (!tex) return null;

        const root = new Container();
        const sprite = new Sprite(tex);
        sprite.anchor.set(creatureVisualLayout.spriteAnchorX, creatureVisualLayout.spriteAnchorY);
        sprite.position.set(creatureVisualLayout.spriteOffsetX, creatureVisualLayout.spriteOffsetY);
        sprite.roundPixels = true;
        // Identical to hunt arena (PixiArena): 0x67de82, Arial 8px 700, stroke 0x08120a width 2, resolution 2
        const label = new Text({
          text: char.name,
          resolution: 2,
          style: {
            fill: 0x67de82,
            stroke: { color: 0x08120a, width: 2 },
            fontSize: 8,
            fontFamily: 'Arial',
            fontWeight: '700',
          },
        });
        label.anchor.set(0.5);
        label.roundPixels = true;
        label.position.set(0, creatureVisualLayout.nameplateY);

        const bar = new Graphics();
        root.addChild(sprite, label, bar);
        actorsLayer.addChild(root);

        view = { root, sprite, label, bar, lastUrl: initialUrl || 'canvas' };
        actorViews.set(char.id, view);
        return view;
      }

      characters.forEach(ensureActorView);
      AMBIENT_THAIS_PLAYERS.forEach(ensureActorView);

      // Ticker to smoothly follow player with VisualMotionTrack (matching hunt fluidity), animate characters & animate map elements
      app.ticker.add(() => {
        const { characters: curChars, isWalking: curWalk, isTraining: curTrain, stepDurationMs: curStepDuration } = latestRef.current;
        const rawPos = latestRef.current.cityPos;
        const curPos = {
          x: typeof rawPos?.x === 'number' && !isNaN(rawPos.x) ? rawPos.x : 32369,
          y: typeof rawPos?.y === 'number' && !isNaN(rawPos.y) ? rawPos.y : 32241,
          z: typeof rawPos?.z === 'number' && !isNaN(rawPos.z) ? rawPos.z : 7,
        };
        tickCount++;
        const now = performance.now();

        // Floor rendering: Floor 7 is the base terrain (streets, water, nature),
        // Floor 6 (roofs, upper pier, boat, walkways) is drawn on top when curPos.z === 6.
        floor7Container.visible = true;
        floor6Container.visible = curPos.z === 6;

        // 1. Animate all animated map elements (mystic blue fire, teleports, torches, lamps, fountains, water)
        for (const anim of animatedMapSprites) {
          const frameIdx = Math.floor(now / anim.frameDurationMs) % anim.frames.length;
          const url = anim.frames[frameIdx];
          if (url && loaded[url] && anim.sprite.texture !== loaded[url]) {
            anim.sprite.texture = loaded[url];
          }
        }

        // 2. High-fluidity linear movement interpolation via VisualMotionTrack (identical to hunt mode)
        if (curPos.x !== lastCommittedPos.x || curPos.y !== lastCommittedPos.y || curPos.z !== lastCommittedPos.z) {
          const distJump = Math.hypot(curPos.x - lastCommittedPos.x, curPos.y - lastCommittedPos.y);
          if (distJump > 2.5 || curPos.z !== lastCommittedPos.z) {
            motionTrack.reset({ x: curPos.x, y: curPos.y, z: curPos.z });
          } else {
            motionTrack.commit(lastCommittedPos, curPos, now, curStepDuration);
          }
          lastCommittedPos = { ...curPos };
        }

        const sample = motionTrack.sample(now);
        currentPixelX = sample.renderPosition.x * TILE_SIZE + 16;
        currentPixelY = sample.renderPosition.y * TILE_SIZE + 16;
        if (sample.direction) {
          playerDirection = sample.direction;
        }
        const isMoving = sample.moving;

        // 3. Camera smoothly follows interpolated player position
        const camera = calculatePixelCamera(app.screen.width, app.screen.height, TILE_SIZE);
        world.scale.set(camera.scale);
        world.position.set(
          app.screen.width / 2 - currentPixelX * camera.scale,
          app.screen.height / 2 - currentPixelY * camera.scale
        );

        // 4. Update party characters: fluid walk frame sequence (0 -> 1 -> 0 -> 2)
        const walkCycle = [0, 1, 0, 2];
        const stepRateMs = Math.max(60, Math.min(130, Math.floor(curStepDuration / 3.5)));
        const walkFrame = isMoving || curWalk ? walkCycle[Math.floor(now / stepRateMs) % 4] : 0;

        curChars.forEach((char, idx) => {
          const view = ensureActorView(char);
          if (!view) return;

          const isMounted = Boolean(char.mountActive && char.mount && char.mount !== 'none');
          const mountUrl = (char.mount === 'donkey' || char.mount === 'Donkey')
            ? '/generated/mounts/donkey_rider_south.png'
            : `/generated/mounts/${char.mount}.png`;
          if (isMounted && loaded[mountUrl]) {
            view.sprite.texture = loaded[mountUrl];
            view.sprite.scale.x = (playerDirection === 'west' || playerDirection === 'north') ? -1 : 1;
            view.lastUrl = mountUrl;
          } else {
            view.sprite.scale.x = 1;
            const outfitKey = char.outfit || char.vocation || 'Knight';
            const colors = char.outfitColors || { head: 0, primary: 86, secondary: 114, detail: 76 };
            const charGender = char.gender === 'female' ? 'female' : 'male';
            const textureKey = `${outfitKey}_${charGender}_${playerDirection}_${walkFrame}_${colors.head}_${colors.primary}_${colors.secondary}_${colors.detail}`;
            if (view.lastTextureKey !== textureKey) {
              const canvas = getRecoloredCanvasSync(outfitKey, charGender, playerDirection as any, walkFrame, colors);
              if (canvas) {
                const tex = Texture.from(canvas);
                tex.source.style.scaleMode = 'nearest';
                view.sprite.texture = tex;
                view.lastTextureKey = textureKey;
                view.lastUrl = 'canvas';
              } else if (!char.outfitColors) {
                const nextUrl = getOutfitFrameUrl(outfitKey, playerDirection, walkFrame);
                if (nextUrl && nextUrl !== view.lastUrl && loaded[nextUrl]) {
                  view.sprite.texture = loaded[nextUrl];
                  view.lastUrl = nextUrl;
                  view.lastTextureKey = nextUrl;
                }
              }
            }
          }

          // Offset party members slightly around the leader
          const offsetX = idx === 0 ? 0 : idx === 1 ? -24 : idx === 2 ? 24 : 0;
          const offsetY = idx === 0 ? 0 : idx === 3 ? 24 : 12;

          view.root.position.set(currentPixelX + offsetX, currentPixelY + offsetY);
          view.root.zIndex = currentPixelY + offsetY;
          view.label.position.set(0, creatureVisualLayout.nameplateY);
          const hpRatio = char.maxHp > 0 ? Math.max(0, Math.min(1, char.currentHp / char.maxHp)) : 1;
          view.bar.clear()
            .rect(-creatureVisualLayout.hpBarWidth / 2, creatureVisualLayout.hpBarY, creatureVisualLayout.hpBarWidth, 3)
            .fill({ color: 0x251010 })
            .rect(-creatureVisualLayout.hpBarWidth / 2, creatureVisualLayout.hpBarY, creatureVisualLayout.hpBarWidth * hpRatio, 3)
            .fill({ color: 0x4fc977 });

          // Animate attack if training at dummy
          if (curTrain && idx === 0 && tickCount % 30 < 10) {
            view.sprite.x = creatureVisualLayout.spriteOffsetX + 4;
          } else {
            view.sprite.x = creatureVisualLayout.spriteOffsetX;
          }
          view.sprite.y = creatureVisualLayout.spriteOffsetY;
        });

        // 5. Update ambient city players stationed across Thais
        for (const p of AMBIENT_THAIS_PLAYERS) {
          const view = ensureActorView(p);
          if (!view) continue;
          view.root.visible = curPos.z === p.z;
          if (!view.root.visible) continue;

          const url = getOutfitFrameUrl(p.vocation, p.direction, 0);
          if (url && url !== view.lastUrl && loaded[url]) {
            view.sprite.texture = loaded[url];
            view.lastUrl = url;
          }

          const px = p.x * TILE_SIZE + 16;
          const py = p.y * TILE_SIZE + 16;
          view.root.position.set(px, py);
          view.root.zIndex = py;
          view.label.position.set(0, creatureVisualLayout.nameplateY);
          const hpRatio = p.maxHp > 0 ? Math.max(0, Math.min(1, p.currentHp / p.maxHp)) : 1;
          view.bar.clear()
            .rect(-creatureVisualLayout.hpBarWidth / 2, creatureVisualLayout.hpBarY, creatureVisualLayout.hpBarWidth, 3)
            .fill({ color: 0x251010 })
            .rect(-creatureVisualLayout.hpBarWidth / 2, creatureVisualLayout.hpBarY, creatureVisualLayout.hpBarWidth * hpRatio, 3)
            .fill({ color: 0x4fc977 });
        }

        // 6. Update online players connected via Colyseus WebSocket
        const remotes = latestRef.current.remotePlayers;
        const myPlayerId = latestRef.current.localPlayerId;
        if (remotes) {
          remotes.forEach((p, key) => {
            if (key === myPlayerId) return; // Skip rendering local player as remote

            const vocName = VOCATION_NAMES[p.vocationId] || 'Knight';
            const view = ensureActorView({ id: p.id, name: p.name, vocation: vocName });
            if (!view) return;

            view.root.visible = (p.z ?? 7) === curPos.z;
            if (!view.root.visible) return;

            const walkFrame = p.isMoving ? walkCycle[Math.floor(now / stepRateMs) % 4] : 0;
            const url = getOutfitFrameUrl(vocName, p.direction || 'south', walkFrame);
            if (url && url !== view.lastUrl && loaded[url]) {
              view.sprite.texture = loaded[url];
              view.lastUrl = url;
            }

            const px = (p.x ?? 32369) * TILE_SIZE + 16;
            const py = (p.y ?? 32241) * TILE_SIZE + 16;
            view.root.position.set(px, py);
            view.root.zIndex = py;
            view.label.position.set(0, creatureVisualLayout.nameplateY);
            const curHp = p.hp ?? 100;
            const maxHp = p.maxHp ?? 100;
            const hpRatio = maxHp > 0 ? Math.max(0, Math.min(1, curHp / maxHp)) : 1;
            view.bar.clear()
              .rect(-creatureVisualLayout.hpBarWidth / 2, creatureVisualLayout.hpBarY, creatureVisualLayout.hpBarWidth, 3)
              .fill({ color: 0x251010 })
              .rect(-creatureVisualLayout.hpBarWidth / 2, creatureVisualLayout.hpBarY, creatureVisualLayout.hpBarWidth * hpRatio, 3)
              .fill({ color: 0x4fc977 });
          });
        }

        // 7. Update overhead speech messages in city (Yellow for local, Blue for world)
        const speeches = latestRef.current.overheadMessages;
        if (speeches && speeches.length > 0) {
          for (const sp of speeches) {
            if (processedSpeechIds.has(sp.id)) continue;
            processedSpeechIds.add(sp.id);

            let targetView: CityActorView | null = null;
            const myLeader = curChars[0];
            if (myLeader && (sp.senderName === myLeader.name || sp.senderName === 'Você' || sp.senderName === '')) {
              targetView = ensureActorView(myLeader);
            } else {
              const matchedChar = curChars.find((c) => c.name.toLowerCase() === sp.senderName.toLowerCase());
              if (matchedChar) {
                targetView = ensureActorView(matchedChar);
              } else {
                const matchedAmbient = AMBIENT_THAIS_PLAYERS.find((a) => a.name.toLowerCase() === sp.senderName.toLowerCase());
                if (matchedAmbient) {
                  targetView = ensureActorView(matchedAmbient);
                } else if (remotes) {
                  for (const [, rp] of remotes.entries()) {
                    if (rp.name?.toLowerCase() === sp.senderName.toLowerCase()) {
                      const vocName = VOCATION_NAMES[rp.vocationId] || 'Knight';
                      targetView = ensureActorView({ id: rp.id, name: rp.name, vocation: vocName });
                      break;
                    }
                  }
                }
              }
            }

            if (targetView) {
              if (!targetView.overheadSpeech) {
                const speechContainer = new Container();
                const speechText = new Text({
                  text: '',
                  resolution: 2,
                  style: {
                    fill: 0xffff00,
                    stroke: { color: 0x000000, width: 2 },
                    fontSize: 7.5,
                    fontFamily: 'Verdana, Tahoma, Arial, sans-serif',
                    fontWeight: '700',
                    align: 'center',
                    lineHeight: 10,
                    wordWrap: true,
                    wordWrapWidth: 160,
                  },
                });
                speechText.anchor.set(0.5, 1);
                speechText.roundPixels = true;
                speechText.position.set(0, creatureVisualLayout.nameplateY - 6);
                speechContainer.addChild(speechText);
                targetView.root.addChild(speechContainer);
                targetView.overheadSpeech = speechContainer;
                targetView.overheadSpeechText = speechText;
              }

              const isLocal = sp.channel === 'local';
              if (targetView.overheadSpeechText && targetView.overheadSpeech) {
                const speakerLabel = sp.senderName && sp.senderName !== 'Você' ? sp.senderName : (myLeader?.name || 'Player');
                targetView.overheadSpeechText.text = `${speakerLabel} says:\n${sp.text}`;
                // Yellow for local, Blue for world
                targetView.overheadSpeechText.style.fill = isLocal ? 0xffff00 : 0x55ffff;
                targetView.overheadSpeech.visible = true;
                targetView.overheadSpeech.alpha = 1;
                targetView.speechExpiresAt = now + 4800;
              }
            }
          }
        }

        // Manage speech fadeout & expiration
        actorViews.forEach((v) => {
          if (v.overheadSpeech && v.speechExpiresAt) {
            const remaining = v.speechExpiresAt - now;
            if (remaining <= 0) {
              v.overheadSpeech.visible = false;
              v.speechExpiresAt = undefined;
            } else if (remaining < 600) {
              v.overheadSpeech.alpha = remaining / 600;
            } else {
              v.overheadSpeech.alpha = 1;
            }
          }
        });
      });

      cleanup = () => {
        hideGlobalPlayerTooltip();
        app.canvas.removeEventListener('pointermove', onPointerMove);
        app.canvas.removeEventListener('pointerleave', onPointerLeave);
        app.canvas.removeEventListener('pointerdown', onPointerDown);
        app.canvas.removeEventListener('contextmenu', onContextMenu);
        app.destroy(true, { children: true });
      };
    })();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className="thais-city-viewport"
      style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
    />
  );
}
