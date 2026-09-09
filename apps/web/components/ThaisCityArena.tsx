'use client';

import { useEffect, useRef } from 'react';
import '@/apps/web/lib/pixiPolyfill';
import thaisCityJson from '@/content/generated/thais-city.json';
import huntRegionsJson from '@/content/generated/hunt-regions.json';
import visualAssetsJson from '@/content/generated/tibia1098-assets.json';
import type { CharacterState, CombatVisualEvent } from '@/packages/domain/src';
import type { HuntRegionCatalog } from '@/packages/content-schema/src';
import { calculatePixelCamera, creatureVisualLayout, VisualMotionTrack } from '@/packages/presentation/src';
import type { ExtractedFrame, ItemVisualAssetMapping, Tibia1098AssetManifest, VisualAssetMapping } from '@/packages/tibia1098-assets/src/types';
import type { Application as PixiApplication, Texture as PixiTexture } from 'pixi.js';
import { showGlobalPlayerTooltip, hideGlobalPlayerTooltip } from './GlobalItemTooltip';
import { getRecoloredCanvasSync, normalizeOutfitId, preloadOutfitAllFrames } from '@/apps/web/lib/outfitRecolor';
import { gameNetwork } from '@/apps/web/lib/GameClientNetworkManager';
import { ALL_SPELL_ICON_URLS, resolveActionImagePath } from './Tibia11ActionIcon';
import { getZoomMultiplier, onZoomChange } from '@/apps/web/lib/zoomManager';

export interface CityOverheadMessage {
  id: string;
  senderId?: string;
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

// AMBIENT_THAIS_PLAYERS: Mock NPCs removed for live MMORPG world. Metadata preserved: name: 'Vimago', vocation: 'Master Sorcerer', isPremium: true, name: 'Elane', name: 'Harkath Bloodblade', name: 'Muriel', isPremium: false
export const AMBIENT_THAIS_PLAYERS: AmbientCityPlayer[] = [];

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
  active?: boolean;
  isCharacterVisible?: boolean;
}

const visualAssets = visualAssetsJson as Tibia1098AssetManifest;
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
  1: 'Sorcerer',
  2: 'Druid',
  3: 'Paladin',
  4: 'Knight',
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
  active = true,
  isCharacterVisible = true,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PixiApplication | null>(null);

  useEffect(() => {
    const app = appRef.current;
    if (!app || !app.ticker) return;
    if (active) {
      if (!app.ticker.started) app.ticker.start();
      try {
        app.resize();
      } catch {}
    } else {
      if (app.ticker.started) app.ticker.stop();
    }
  }, [active]);

  const latestRef = useRef({
    characters,
    cityPos,
    isWalking,
    isTraining,
    stepDurationMs,
    onTileClick,
    onCharacterContextMenu,
    debug,
    remotePlayers,
    localPlayerId,
    overheadMessages,
    visualEvents,
    active,
    isCharacterVisible,
  });
  latestRef.current = {
    characters,
    cityPos,
    isWalking,
    isTraining,
    stepDurationMs,
    onTileClick,
    onCharacterContextMenu,
    debug,
    remotePlayers,
    localPlayerId,
    overheadMessages,
    visualEvents,
    active,
    isCharacterVisible,
  };

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;

    void (async () => {
      const { Application, Assets, Container, Graphics, Sprite, Text, Texture } = await import('pixi.js');
      const app = new Application();
      await app.init({
        resizeTo: hostRef.current ?? window,
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
      app.canvas.style.width = '100%';
      app.canvas.style.height = '100%';
      app.canvas.style.display = 'block';
      app.canvas.style.position = 'absolute';
      app.canvas.style.inset = '0';
      app.canvas.style.imageRendering = 'pixelated';
      (app.canvas.style as any).imageRendering = 'crisp-edges';
      hostRef.current.appendChild(app.canvas);
      app.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
      app.canvas.addEventListener('webglcontextlost', (e) => {
        e.preventDefault();
      });

      let resizeObserver: ResizeObserver | null = null;
      if (typeof ResizeObserver !== 'undefined' && hostRef.current) {
        resizeObserver = new ResizeObserver(() => {
          if (!disposed && app.renderer) {
            try {
              app.resize();
            } catch {}
          }
        });
        resizeObserver.observe(hostRef.current);
      }

      if (!latestRef.current.active) {
        app.ticker.stop();
      } else {
        if (!app.ticker.started) app.ticker.start();
        try {
          app.resize();
        } catch {}
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
      const effectsLayer = new Container();
      effectsLayer.sortableChildren = true;
      const overlayLayer = new Container();

      world.addChild(floor7Container, floor6Container, actorsLayer, effectsLayer);
      app.stage.addChild(world, overlayLayer);

      // Collect essential assets
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
      const teleportEffectUrls = visualAssets.effects['11']?.frames.map((f) => f.publicUrl) ?? [];
      const fireEffectUrls = visualAssets.effects['16']?.frames.map((f) => f.publicUrl) ?? [];
      const coreMissileUrls = Object.values(visualAssets.missiles).flatMap((m) =>
        m.frames.map((f) => f.publicUrl)
      );
      const coreEffectUrls = Object.values(visualAssets.effects).flatMap((e) =>
        e.frames.map((f) => f.publicUrl)
      );
      const upperTilesList = (thaisData as { upperTiles?: typeof thaisData.tiles }).upperTiles ?? [];
      const thaisAllTiles = [...thaisData.tiles, ...upperTilesList];
      const playerSpawnX = 32369;
      const playerSpawnY = 32241;

      // Calculate minimal distance from temple spawn to each texture URL in Thais
      const urlDistances = new Map<string, number>();
      for (const t of thaisAllTiles) {
        const dist = Math.hypot(t.x - playerSpawnX, t.y - playerSpawnY);
        for (const id of t.serverItemIds) {
          const mapping = visualAssets.mapItems[String(id)];
          if (mapping?.frames && mapping.frames.length > 0) {
            for (const f of mapping.frames) {
              const prev = urlDistances.get(f.publicUrl) ?? Infinity;
              if (dist < prev) urlDistances.set(f.publicUrl, dist);
            }
          } else if (mapping?.frame) {
            const prev = urlDistances.get(mapping.frame.publicUrl) ?? Infinity;
            if (dist < prev) urlDistances.set(mapping.frame.publicUrl, dist);
          }
        }
      }

      const allThaisMapUrls = Array.from(urlDistances.keys()).sort(
        (a, b) => (urlDistances.get(a) ?? 9999) - (urlDistances.get(b) ?? 9999)
      );

      // Closest ~450 textures (distance <= 22 tiles, covers the entire temple and immediate city streets)
      const immediateThaisMapUrls = allThaisMapUrls.filter(
        (u) => (urlDistances.get(u) ?? 9999) <= 22
      );
      const distantThaisMapUrls = allThaisMapUrls.filter(
        (u) => (urlDistances.get(u) ?? 9999) > 22
      );

      const loaded: Record<string, PixiTexture> = {};

      interface PendingSpriteTarget {
        sprite: InstanceType<typeof Sprite>;
        offsetX?: number;
        offsetY?: number;
      }
      const pendingTileSprites = new Map<string, PendingSpriteTarget[]>();

      const registerPendingSprite = (url: string, target: PendingSpriteTarget) => {
        let list = pendingTileSprites.get(url);
        if (!list) {
          list = [];
          pendingTileSprites.set(url, list);
        }
        list.push(target);
      };

      const resolvePendingSprites = (url: string, texture: PixiTexture) => {
        const list = pendingTileSprites.get(url);
        if (!list || list.length === 0) return;
        for (const item of list) {
          try {
            if (!item.sprite.destroyed) {
              item.sprite.texture = texture;
            }
          } catch {}
        }
        pendingTileSprites.delete(url);
      };

      const loadBatch = async (urls: string[], chunkSize = 35) => {
        for (let i = 0; i < urls.length; i += chunkSize) {
          if (disposed) break;
          const chunk = urls.slice(i, i + chunkSize);
          await Promise.allSettled(
            chunk.map(async (url) => {
              if (loaded[url]) return;
              try {
                const texture = await Assets.load<PixiTexture>(url);
                if (texture) {
                  texture.source.style.scaleMode = 'nearest';
                  loaded[url] = texture;
                  resolvePendingSprites(url, texture);
                }
              } catch {}
            })
          );
        }
      };

      // 1. Preload highest priority assets immediately during the 5s loading screen
      const priorityUrls = [
        floorUrl, wallUrl, rugUrl, dummyUrl, decorUrl, mountUrl,
        ...ALL_SPELL_ICON_URLS,
        ...outfitUrls.slice(0, 32),
        ...teleportEffectUrls,
        ...fireEffectUrls,
        ...coreMissileUrls,
        ...coreEffectUrls,
        ...immediateThaisMapUrls,
      ];
      try {
        await loadBatch(priorityUrls, 40);
      } catch (err) {
        console.warn('Priority asset loading error:', err);
      }

      if (disposed) {
        app.destroy(true, { children: true });
        return;
      }

      // 2. Stream distant Thais map textures in background
      void loadBatch(distantThaisMapUrls, 40);

      // 3. Stream remaining outfit frames progressively in the background
      const remainingUrls = [...new Set([...thumbUrls, ...outfitUrls])].filter((u) => !loaded[u]);
      void loadBatch(remainingUrls, 30);


      const teleportFrames = visualAssets.effects['11']?.frames.map((f) => f.publicUrl) ?? [];
      const teleportEffects: Array<{
        sprite: InstanceType<typeof Sprite>;
        frames: string[];
        startedAt: number;
        durationMs: number;
      }> = [];

      interface TimedCityVisual {
        root: InstanceType<typeof Container> | InstanceType<typeof Sprite> | InstanceType<typeof Text>;
        startedAt: number;
        durationMs: number;
        kind: 'missile' | 'effect' | 'float';
        from?: { x: number; y: number };
        to?: { x: number; y: number };
        frames?: string[];
        startY?: number;
      }
      const timedCityVisuals: TimedCityVisual[] = [];
      let lastProcessedVisualEvents: CombatVisualEvent[] | undefined;

      const unsubNetworkCombat = gameNetwork.onCombatEvent((ev) => {
        if (ev.effectId) {
          const fxMapping = visualAssets.effects[String(ev.effectId)];
          if (fxMapping && fxMapping.frames.length > 0) {
            const firstFrameUrl = fxMapping.frames[0].publicUrl;
            const targetX = ev.posX ?? ev.x ?? 0;
            const targetY = ev.posY ?? ev.y ?? 0;
            const targetPx = { x: targetX * TILE_SIZE + 16, y: targetY * TILE_SIZE + 16 };
            const sp = new Sprite(loaded[firstFrameUrl] || Texture.EMPTY);
            sp.anchor.set(0.5);
            sp.position.set(targetPx.x, targetPx.y);
            effectsLayer.addChild(sp);
            timedCityVisuals.push({
              root: sp,
              startedAt: performance.now(),
              durationMs: Math.max(300, fxMapping.frames.length * 70),
              kind: 'effect',
              frames: fxMapping.frames.map((f) => f.publicUrl),
            });
            if (!loaded[firstFrameUrl]) {
              void Assets.load<PixiTexture>(firstFrameUrl).then((tex) => {
                if (tex) {
                  tex.source.style.scaleMode = 'nearest';
                  loaded[firstFrameUrl] = tex;
                  if ('texture' in sp) (sp as any).texture = tex;
                }
              });
            }
          }
        }
      });

      const triggerTeleportEffect = (px: number, py: number) => {
        if (teleportFrames.length === 0) return;
        const firstFrame = teleportFrames[0];
        if (!firstFrame || !loaded[firstFrame]) return;
        const sp = new Sprite(loaded[firstFrame]);
        sp.anchor.set(0.5, 0.5);
        sp.position.set(px, py - 6);
        sp.zIndex = py + 999;
        effectsLayer.addChild(sp);
        teleportEffects.push({
          sprite: sp,
          frames: teleportFrames,
          startedAt: performance.now(),
          durationMs: 500,
        });
      };

      // Multi-floor spatial tile map lookup (Z=6, Z=7, Z=8..Z=11 for Dragon Lair)
      interface SpatialTileInfo {
        x: number;
        y: number;
        z?: number;
        walkable: boolean;
        serverItemIds: number[];
      }
      const tileMapByZ = new Map<number, Map<string, SpatialTileInfo>>();
      const getTileMapForZ = (z: number) => {
        let map = tileMapByZ.get(z);
        if (!map) {
          map = new Map<string, SpatialTileInfo>();
          tileMapByZ.set(z, map);
        }
        return map;
      };

      for (const t of thaisData.tiles) {
        getTileMapForZ(t.z ?? 7).set(`${t.x},${t.y}`, t);
      }
      const upperTiles = (thaisData as { upperTiles?: typeof thaisData.tiles }).upperTiles ?? [];
      for (const t of upperTiles) {
        getTileMapForZ(t.z ?? 6).set(`${t.x},${t.y}`, t);
      }

      // Training dummies placed in the training room on Z:7
      const dummyPos = thaisData.trainingDummy;
      const dummySprite = new Sprite(loaded[dummyUrl] || Texture.EMPTY);
      dummySprite.anchor.set(creatureVisualLayout.spriteAnchorX, creatureVisualLayout.spriteAnchorY);
      dummySprite.position.set(dummyPos.x * TILE_SIZE + 16 + creatureVisualLayout.spriteOffsetX, dummyPos.y * TILE_SIZE + 16 + creatureVisualLayout.spriteOffsetY);
      dummySprite.roundPixels = true;
      dummySprite.zIndex = dummyPos.y * TILE_SIZE + 16;
      objectsLayerZ7.addChild(dummySprite);
      if (!loaded[dummyUrl]) {
        registerPendingSprite(dummyUrl, { sprite: dummySprite });
      }

      const animatedMapSprites: Array<{
        sprite: InstanceType<typeof Sprite>;
        frames: string[];
        frameDurationMs: number;
      }> = [];

      function resolveTileFrame(mapping: ItemVisualAssetMapping, tileX: number, tileY: number) {
        if (!mapping) return null;
        let frameToUse = mapping.frame;
        if (mapping.frames && mapping.frames.length > 1 && mapping.appearance) {
          const px = mapping.appearance.patternX > 1 ? Math.abs(tileX) % mapping.appearance.patternX : 0;
          const py = mapping.appearance.patternY > 1 ? Math.abs(tileY) % mapping.appearance.patternY : 0;
          const matchedFrame = mapping.frames.find((f: any) => f.pattern?.x === px && f.pattern?.y === py) ?? mapping.frames[0];
          if (matchedFrame) {
            frameToUse = matchedFrame;
          }
        }
        return frameToUse;
      }

      // Pre-render tiles for Thais Z:7 (ground/streets) and Z:6 (roofs/piers)
      tileMapByZ.forEach((zMap, zLevel) => {
        const targetTerrain = zLevel === 6 ? terrainLayerZ6 : terrainLayerZ7;
        const targetObjects = zLevel === 6 ? objectsLayerZ6 : objectsLayerZ7;

        zMap.forEach((tile) => {
          const px = tile.x * TILE_SIZE;
          const py = tile.y * TILE_SIZE;

          let hasGroundSprite = false;
          for (const sId of tile.serverItemIds) {
            const mapping = visualAssets.mapItems[String(sId)];
            if (mapping?.isGround) {
              const frameToUse = resolveTileFrame(mapping, tile.x, tile.y);
              if (frameToUse) {
                const sp = new Sprite(loaded[frameToUse.publicUrl] || Texture.EMPTY);
                sp.position.set(px, py);
                sp.roundPixels = true;
                targetTerrain.addChild(sp);
                hasGroundSprite = true;
                if (!loaded[frameToUse.publicUrl]) {
                  registerPendingSprite(frameToUse.publicUrl, { sprite: sp });
                }
                if (mapping.frames && mapping.frames.length > 1 && mapping.appearance?.frames && mapping.appearance.frames > 1) {
                  animatedMapSprites.push({
                    sprite: sp,
                    frames: mapping.frames.map((f) => f.publicUrl),
                    frameDurationMs: mapping.animDurationMs || 180,
                  });
                }
                break;
              }
            }
          }

          for (const sId of tile.serverItemIds) {
            const mapping = visualAssets.mapItems[String(sId)];
            if (mapping && !mapping.isGround) {
              const frameToUse = resolveTileFrame(mapping, tile.x, tile.y);
              if (frameToUse) {
                const sp = new Sprite(loaded[frameToUse.publicUrl] || Texture.EMPTY);
                const offsetY = frameToUse.height > 32 ? -(frameToUse.height - 32) : 0;
                const offsetX = frameToUse.width > 32 ? -(frameToUse.width - 32) : 0;
                sp.position.set(px + offsetX, py + offsetY);
                sp.roundPixels = true;
                sp.zIndex = py + 32;
                targetObjects.addChild(sp);
                if (!loaded[frameToUse.publicUrl]) {
                  registerPendingSprite(frameToUse.publicUrl, { sprite: sp, offsetX, offsetY });
                }
                if (mapping.frames && mapping.frames.length > 1 && mapping.appearance?.frames && mapping.appearance.frames > 1) {
                  animatedMapSprites.push({
                    sprite: sp,
                    frames: mapping.frames.map((f) => f.publicUrl),
                    frameDurationMs: mapping.animDurationMs || 180,
                  });
                }
              }
            }
          }

          if (!hasGroundSprite) {
            const isWalkable = tile.walkable;
            const floorSp = new Sprite(loaded[isWalkable ? floorUrl : wallUrl] || Texture.EMPTY);
            floorSp.position.set(px, py);
            floorSp.roundPixels = true;
            targetTerrain.addChild(floorSp);
            if (!loaded[isWalkable ? floorUrl : wallUrl]) {
              registerPendingSprite(isWalkable ? floorUrl : wallUrl, { sprite: floorSp });
            }
          }
        });
      });

      // Tile Hover Indicator Graphic
      const hoverCursor = new Graphics();
      hoverCursor.rect(0, 0, 32, 32).fill({ color: 0x3da5ff, alpha: 0.08 });
      hoverCursor.moveTo(0, 0).lineTo(32, 0).stroke({ color: 0x3da5ff, width: 1.5 });
      hoverCursor.moveTo(0, 0).lineTo(0, 32).stroke({ color: 0x3da5ff, width: 1.5 });
      hoverCursor.moveTo(32, 0).lineTo(32, 32).stroke({ color: 0x3da5ff, width: 1.5 });
      hoverCursor.moveTo(0, 32).lineTo(32, 32).stroke({ color: 0xf5d547, width: 1.5 });
      hoverCursor.zIndex = 999999;
      world.addChild(hoverCursor);
      interface FollowerVisualState {
        currentTile: { x: number; y: number; z: number };
        lastCommittedTile: { x: number; y: number; z: number };
        motionTrack: VisualMotionTrack;
        direction: 'north' | 'south' | 'east' | 'west';
      }


      const followerVisualStates = new Map<string, FollowerVisualState>();
      const remoteMotionTracks = new Map<string, { track: VisualMotionTrack; lastTile: { x: number; y: number; z: number } }>();

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
      let smoothCamX = 0;
      let smoothCamY = 0;
      let camInitialized = false;
      let hoveredPlayerId: string | null = null;

      let zoomMult = getZoomMultiplier();
      const unsubZoom = onZoomChange((val) => {
        zoomMult = val;
        camInitialized = false;
      });

      const onPointerMove = (e: PointerEvent) => {
        const rect = app.canvas.getBoundingClientRect();
        const scaleX = app.screen.width / (rect.width || 1);
        const scaleY = app.screen.height / (rect.height || 1);
        const clientX = (e.clientX - rect.left) * scaleX;
        const clientY = (e.clientY - rect.top) * scaleY;

        const worldX = (clientX - world.position.x) / world.scale.x;
        const worldY = (clientY - world.position.y) / world.scale.y;

        const tileX = Math.floor(worldX / TILE_SIZE);
        const tileY = Math.floor(worldY / TILE_SIZE);

        const activeZ = latestRef.current.cityPos.z;
        const activeTileMap = tileMapByZ.get(activeZ);
        const hoverTile = activeTileMap?.get(`${tileX},${tileY}`);
        if (hoverTile ? hoverTile.walkable : true) {
          hoverCursor.position.set(tileX * TILE_SIZE, tileY * TILE_SIZE);
          hoverCursor.visible = true;
        } else {
          hoverCursor.visible = false;
        }

        // Hover detection over other players / characters in Thais
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

        // 3. Check online remote players on active Z floor
        if (!matchedPlayer && latestRef.current.remotePlayers) {
          const myId = latestRef.current.localPlayerId;
          latestRef.current.remotePlayers.forEach((p, key) => {
            if (matchedPlayer) return;
            if (key === myId || curChars.some((c) => c.id === p.id || c.id === (p as any).characterId)) return;
            if ((p.z ?? 7) !== activeZ) return;
            const px = (p.x ?? 32369) * TILE_SIZE + 16;
            const py = (p.y ?? 32241) * TILE_SIZE + 16;
            const dx = worldX - px;
            const dy = worldY - py;
            if (dx >= -18 && dx <= 18 && dy >= -38 && dy <= 16) {
              const vocName = VOCATION_NAMES[p.vocationId] || 'Knight';
              matchedPlayer = {
                id: p.id,
                name: p.name,
                level: p.level,
                vocation: vocName,
                isPremium: true,
                currentHp: p.hp,
                maxHp: p.maxHp,
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
        const scaleX = app.screen.width / (rect.width || 1);
        const scaleY = app.screen.height / (rect.height || 1);
        const clientX = (e.clientX - rect.left) * scaleX;
        const clientY = (e.clientY - rect.top) * scaleY;

        const worldX = (clientX - world.position.x) / world.scale.x;
        const worldY = (clientY - world.position.y) / world.scale.y;

        const tileX = Math.floor(worldX / TILE_SIZE);
        const tileY = Math.floor(worldY / TILE_SIZE);

        const activeZ = latestRef.current.cityPos.z;
        const activeTileMap = tileMapByZ.get(activeZ);
        const tile = activeTileMap?.get(`${tileX},${tileY}`);
        if (tile ? tile.walkable : true) {
          latestRef.current.onTileClick?.({ x: tileX, y: tileY, z: activeZ });
        }
      };

      const onContextMenu = (e: MouseEvent) => {
        e.preventDefault();
        const rect = app.canvas.getBoundingClientRect();
        const scaleX = app.screen.width / (rect.width || 1);
        const scaleY = app.screen.height / (rect.height || 1);
        const clientX = (e.clientX - rect.left) * scaleX;
        const clientY = (e.clientY - rect.top) * scaleY;

        const worldX = (clientX - world.position.x) / world.scale.x;
        const worldY = (clientY - world.position.y) / world.scale.y;

        const curChars = latestRef.current.characters;
        let matchedCharId: string | undefined;
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
        if (!matchedCharId && latestRef.current.remotePlayers) {
          const myId = latestRef.current.localPlayerId;
          latestRef.current.remotePlayers.forEach((p, key) => {
            if (matchedCharId) return;
            if (key === myId || curChars.some((c) => c.id === p.id || c.id === (p as any).characterId)) return;
            const px = (p.x ?? 32369) * TILE_SIZE + 16;
            const py = (p.y ?? 32241) * TILE_SIZE + 16;
            const dx = worldX - px;
            const dy = worldY - py;
            if (dx >= -24 && dx <= 24 && dy >= -44 && dy <= 20) {
              matchedCharId = p.id;
            }
          });
        }
        if (!matchedCharId) {
          matchedCharId = curChars[0]?.id;
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
        lastOutfitKey?: string;
        lastColorsKey?: string;
        overheadSpeech?: InstanceType<typeof Container>;
        overheadSpeechText?: InstanceType<typeof Text>;
        speechExpiresAt?: number;
      }
      const actorViews = new Map<string, CityActorView>();
      const processedSpeechIds = new Set<string>();

      function getOutfitFrameUrl(vocationOrOutfit: string, direction: string, frame: number): string {
        const lower = (vocationOrOutfit || '').toLowerCase();
        if (lower === 'dragon' || lower === '34') {
          return `/generated/tibia1098/monster-dragon-${direction}-frame-${frame % 3}.png`;
        }
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

      function ensureActorView(char: { id: string; name: string; vocation: string; gender?: 'male' | 'female'; outfit?: string; mount?: string; mountActive?: boolean; outfitColors?: { head: number; primary: number; secondary: number; detail: number }; x?: number; y?: number }): CityActorView | null {
        let view = actorViews.get(char.id);
        if (view) {
          view.label.text = char.name;
          return view;
        }

        const idx = characters.findIndex((c) => c.id === char.id);
        if (idx >= 0) {
          const offsetX = idx === 0 ? 0 : idx === 1 ? -32 : idx === 2 ? 32 : 0;
          const offsetY = idx === 0 ? 0 : idx === 3 ? 32 : 0;
          triggerTeleportEffect(currentPixelX + offsetX, currentPixelY + offsetY);
        } else if (char.x !== undefined && char.y !== undefined) {
          triggerTeleportEffect(char.x * TILE_SIZE + 16, char.y * TILE_SIZE + 16);
        }

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
        if (!tex) {
          tex = Texture.WHITE;
        }

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

      if (characters[0]) ensureActorView(characters[0]);
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

        // 0. Update teleport blue particle effects
        for (let i = teleportEffects.length - 1; i >= 0; i--) {
          const fx = teleportEffects[i];
          const elapsed = now - fx.startedAt;
          if (elapsed >= fx.durationMs) {
            fx.sprite.destroy();
            teleportEffects.splice(i, 1);
          } else {
            const frameIdx = Math.floor((elapsed / fx.durationMs) * fx.frames.length);
            const url = fx.frames[Math.min(frameIdx, fx.frames.length - 1)];
            if (url && loaded[url]) fx.sprite.texture = loaded[url];
          }
        }

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
        const leaderPosChanged = (curPos.x !== lastCommittedPos.x || curPos.y !== lastCommittedPos.y || curPos.z !== lastCommittedPos.z);
        const prevLeaderTile = { ...lastCommittedPos };

        if (leaderPosChanged) {
          const distJump = Math.hypot(curPos.x - lastCommittedPos.x, curPos.y - lastCommittedPos.y);
          const isTeleportOrFloorChange = distJump > 2.5 || curPos.z !== lastCommittedPos.z;

          if (isTeleportOrFloorChange) {
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

        if (!Number.isFinite(currentPixelX) || !Number.isFinite(currentPixelY)) {
          currentPixelX = curPos.x * TILE_SIZE + 16;
          currentPixelY = curPos.y * TILE_SIZE + 16;
        }

        // 3. Camera smoothly follows interpolated player position with scale matching user zoom preference
        const cameraScale = 2 * getZoomMultiplier();
        const targetCamX = app.screen.width / 2 - currentPixelX * cameraScale;
        const targetCamY = app.screen.height / 2 - currentPixelY * cameraScale;
        if (!camInitialized) {
          smoothCamX = targetCamX;
          smoothCamY = targetCamY;
          camInitialized = true;
        } else {
          const lerpFactor = 1 - Math.exp(-Math.max(0, app.ticker.deltaMS) / 80);
          smoothCamX += (targetCamX - smoothCamX) * lerpFactor;
          smoothCamY += (targetCamY - smoothCamY) * lerpFactor;
        }
        world.scale.set(cameraScale);
        world.position.set(smoothCamX, smoothCamY);

        // Clean up removed actor views (local player, ambient, and remote players)
        const validActorIds = new Set<string>();
        if (curChars[0]) {
          validActorIds.add(curChars[0].id);
        }
        AMBIENT_THAIS_PLAYERS.forEach((p) => validActorIds.add(p.id));

        const myCharIdVal = curChars[0]?.id;
        const myCharNameVal = curChars[0]?.name?.toLowerCase();
        const remotes = latestRef.current.remotePlayers;
        const myPlayerId = latestRef.current.localPlayerId;
        const seenRemoteKeys = new Set<string>();

        if (remotes) {
          remotes.forEach((p, key) => {
            const isLocal = key === myPlayerId || p.id === myPlayerId || (gameNetwork.LocalPlayerId && p.id === gameNetwork.LocalPlayerId);
            if (isLocal || p.inHunt) return;
            const pCharId = p.characterId || p.id;
            if (seenRemoteKeys.has(pCharId)) return;
            seenRemoteKeys.add(pCharId);
            validActorIds.add(p.id);
          });
        }

        actorViews.forEach((view, id) => {
          if (!validActorIds.has(id)) {
            if (followerVisualStates.has(id)) {
              const fState = followerVisualStates.get(id);
              if (fState) {
                const px = fState.currentTile.x * TILE_SIZE + 16;
                const py = fState.currentTile.y * TILE_SIZE + 16;
                triggerTeleportEffect(px, py);
              }
              followerVisualStates.delete(id);
            }
            if (remoteMotionTracks.has(id)) {
              remoteMotionTracks.delete(id);
            }
            view.root.destroy({ children: true });
            actorViews.delete(id);
          }
        });

        // 4. Update local player character: fluid walk frame sequence (0 -> 1 -> 0 -> 2)
        const walkCycle = [0, 1, 0, 2];
        const stepRateMs = Math.max(60, Math.min(130, Math.floor(curStepDuration / 3.5)));
        const localChar = curChars[0];

        if (localChar) {
          const view = ensureActorView(localChar);
          if (view) {
            const charPixelX = currentPixelX;
            const charPixelY = currentPixelY;
            const charDirection = playerDirection;
            const charIsMoving = isMoving;
            const charWalkFrame = charIsMoving || curWalk ? walkCycle[Math.floor(now / stepRateMs) % 4] : 0;

            const isMounted = Boolean(localChar.mountActive && localChar.mount && localChar.mount !== 'none');
            const mountUrl = (localChar.mount === 'donkey' || localChar.mount === 'Donkey')
              ? '/generated/mounts/donkey_rider_south.png'
              : `/generated/mounts/${localChar.mount}.png`;
            if (isMounted && loaded[mountUrl]) {
              view.sprite.texture = loaded[mountUrl];
              view.sprite.scale.x = (charDirection === 'west' || charDirection === 'north') ? -1 : 1;
              view.lastUrl = mountUrl;
            } else {
              view.sprite.scale.x = 1;
              const outfitKey = localChar.outfit || localChar.vocation || 'Knight';
              const colors = localChar.outfitColors || { head: 0, primary: 86, secondary: 114, detail: 76 };
              const charGender = localChar.gender === 'female' ? 'female' : 'male';
              const textureKey = `${outfitKey}_${charGender}_${charDirection}_${charWalkFrame}_${colors.head}_${colors.primary}_${colors.secondary}_${colors.detail}`;
              if (view.lastTextureKey !== textureKey) {
                const canvas = getRecoloredCanvasSync(outfitKey, charGender, charDirection as any, charWalkFrame, colors);
                if (canvas) {
                  const tex = Texture.from(canvas);
                  tex.source.style.scaleMode = 'nearest';
                  view.sprite.texture = tex;
                  view.lastTextureKey = textureKey;
                  view.lastUrl = 'canvas';
                } else if (!localChar.outfitColors) {
                  const nextUrl = getOutfitFrameUrl(outfitKey, charDirection, charWalkFrame);
                  if (nextUrl && nextUrl !== view.lastUrl && loaded[nextUrl]) {
                    view.sprite.texture = loaded[nextUrl];
                    view.lastUrl = nextUrl;
                    view.lastTextureKey = nextUrl;
                  }
                }
              }
            }

            view.root.position.set(charPixelX, charPixelY);
            view.root.zIndex = charPixelY;
            view.root.visible = latestRef.current.isCharacterVisible !== false;
            view.label.position.set(0, creatureVisualLayout.nameplateY);
            const hpRatio = localChar.maxHp > 0 ? Math.max(0, Math.min(1, localChar.currentHp / localChar.maxHp)) : 1;
            view.bar.clear()
              .rect(-creatureVisualLayout.hpBarWidth / 2, creatureVisualLayout.hpBarY, creatureVisualLayout.hpBarWidth, 3)
              .fill({ color: 0x251010 })
              .rect(-creatureVisualLayout.hpBarWidth / 2, creatureVisualLayout.hpBarY, creatureVisualLayout.hpBarWidth * hpRatio, 3)
              .fill({ color: 0x4fc977 });

            // Animate attack if training at dummy
            if (curTrain && tickCount % 30 < 10) {
              view.sprite.x = creatureVisualLayout.spriteOffsetX + 4;
            } else {
              view.sprite.x = creatureVisualLayout.spriteOffsetX;
            }
            view.sprite.y = creatureVisualLayout.spriteOffsetY;
          }
        }

        // 4b. Process Combat Visual Events in City (Dummy training wand missiles & hits, combat events)
        const incomingVisuals = latestRef.current.visualEvents;
        if (incomingVisuals && incomingVisuals !== lastProcessedVisualEvents) {
          lastProcessedVisualEvents = incomingVisuals;
          for (const ev of incomingVisuals) {
            if (ev.type === 'projectile-launched') {
              const mMapping = visualAssets.missiles[String(ev.projectileId)];
              if (mMapping && mMapping.frames.length > 0) {
                const fUrl = mMapping.frames[0].publicUrl;
                if (loaded[fUrl]) {
                  const sp = new Sprite(loaded[fUrl]);
                  sp.anchor.set(0.5);
                  effectsLayer.addChild(sp);
                  const fromPx = { x: currentPixelX, y: currentPixelY };
                  const toPx = { x: dummyPos.x * TILE_SIZE + 16, y: dummyPos.y * TILE_SIZE + 16 };
                  timedCityVisuals.push({
                    root: sp,
                    startedAt: now,
                    durationMs: 350,
                    kind: 'missile',
                    from: fromPx,
                    to: toPx,
                  });
                }
              }
            } else if (ev.type === 'projectile-hit' || ev.type === 'melee-hit') {
              const fxMapping = visualAssets.effects[String(ev.effectId)];
              if (fxMapping && fxMapping.frames.length > 0) {
                const fUrl = fxMapping.frames[0].publicUrl;
                if (loaded[fUrl]) {
                  const sp = new Sprite(loaded[fUrl]);
                  sp.anchor.set(0.5);
                  const targetPx = { x: dummyPos.x * TILE_SIZE + 16, y: dummyPos.y * TILE_SIZE + 16 };
                  sp.position.set(targetPx.x, targetPx.y);
                  effectsLayer.addChild(sp);
                  timedCityVisuals.push({
                    root: sp,
                    startedAt: now,
                    durationMs: Math.max(300, fxMapping.frames.length * 70),
                    kind: 'effect',
                    frames: fxMapping.frames.map((f) => f.publicUrl),
                  });
                }
              }
            } else if ((ev as any).type === 'spell-visual' || (ev as any).type === 'heal-applied' || (ev as any).type === 'spell' || (ev as any).type === 'spell-cast') {
              const projectileId = 'projectileId' in ev && typeof (ev as any).projectileId === 'number'
                ? (ev as any).projectileId
                : 'projectileId' in ev && (ev as any).projectileId === 'weapon-type' ? 24 : null;
              if (projectileId) {
                const mMapping = visualAssets.missiles[String(projectileId)];
                if (mMapping && mMapping.frames.length > 0) {
                  const fUrl = mMapping.frames[0].publicUrl;
                  if (loaded[fUrl]) {
                    const sp = new Sprite(loaded[fUrl]);
                    sp.anchor.set(0.5);
                    effectsLayer.addChild(sp);
                    let toPx = { x: dummyPos.x * TILE_SIZE + 16, y: dummyPos.y * TILE_SIZE + 16 };
                    if ('targetPosition' in ev && (ev as any).targetPosition) {
                      const tp = (ev as any).targetPosition;
                      toPx = { x: tp.x * TILE_SIZE + 16, y: tp.y * TILE_SIZE + 16 };
                    }
                    timedCityVisuals.push({
                      root: sp,
                      startedAt: now,
                      durationMs: 320,
                      kind: 'missile',
                      from: { x: currentPixelX, y: currentPixelY },
                      to: toPx,
                    });
                  }
                }
              }
              const effectId = 'effectId' in ev ? (ev as any).effectId : null;
              if (effectId && effectId > 0) {
                const fxMapping = visualAssets.effects[String(effectId)];
                if (fxMapping && fxMapping.frames.length > 0) {
                  const fUrl = fxMapping.frames[0].publicUrl;
                  if (loaded[fUrl]) {
                    const sp = new Sprite(loaded[fUrl]);
                    sp.anchor.set(0.5);
                    let targetPx = { x: currentPixelX, y: currentPixelY };
                    if ('targetPosition' in ev && (ev as any).targetPosition) {
                      const tp = (ev as any).targetPosition;
                      targetPx = { x: tp.x * TILE_SIZE + 16, y: tp.y * TILE_SIZE + 16 };
                    } else if (projectileId) {
                      targetPx = { x: dummyPos.x * TILE_SIZE + 16, y: dummyPos.y * TILE_SIZE + 16 };
                    }
                    sp.position.set(targetPx.x, targetPx.y);
                    effectsLayer.addChild(sp);
                    const effectDelay = typeof (ev as any).delayMs === 'number'
                      ? (ev as any).delayMs
                      : (projectileId === null ? 0 : 240);
                    sp.visible = effectDelay <= 0;
                    timedCityVisuals.push({
                      root: sp,
                      startedAt: now + effectDelay,
                      durationMs: Math.max(300, fxMapping.frames.length * 70),
                      kind: 'effect',
                      frames: fxMapping.frames.map((f) => f.publicUrl),
                    });
                  }
                }
              }
              const speech = 'speech' in ev ? (ev as any).speech : 'text' in ev ? (ev as any).text : '';
              const spellId = 'spellId' in ev ? (ev as any).spellId : undefined;
              if (speech) {
                const speechContainer = new Container();
                let iconWidth = 0;

                const iconPath = resolveActionImagePath(spellId, 'spell', speech);
                if (iconPath && loaded[iconPath]) {
                  const iconSize = 14;
                  const iconSprite = new Sprite(loaded[iconPath]);
                  iconSprite.width = iconSize;
                  iconSprite.height = iconSize;
                  iconSprite.position.set(0, 0);

                  const iconBorder = new Graphics()
                    .rect(-0.5, -0.5, iconSize + 1, iconSize + 1)
                    .stroke({ color: 0x111315, width: 1 });

                  speechContainer.addChild(iconBorder, iconSprite);
                  iconWidth = iconSize + 3;
                }

                const speechText = new Text({
                  text: speech,
                  resolution: 2,
                  style: {
                    fill: 0xf2a33c, // Authentic warm Tibia spell orange
                    stroke: { color: 0x000000, width: 2 },
                    fontSize: 7.5,
                    fontFamily: 'Verdana, Arial, sans-serif',
                    fontWeight: '700',
                  },
                });
                speechText.position.set(iconWidth, 0);
                speechContainer.addChild(speechText);

                let targetPx = { x: currentPixelX, y: currentPixelY };
                if ('targetPosition' in ev && (ev as any).targetPosition) {
                  const tp = (ev as any).targetPosition;
                  targetPx = { x: tp.x * TILE_SIZE + 16, y: tp.y * TILE_SIZE + 16 };
                }
                const totalWidth = iconWidth + speechText.width;
                const startY = targetPx.y - 24;
                speechContainer.position.set(targetPx.x - totalWidth / 2, startY);
                effectsLayer.addChild(speechContainer);
                timedCityVisuals.push({
                  root: speechContainer,
                  startedAt: now,
                  durationMs: 1200,
                  kind: 'float',
                  startY,
                });
              }
            } else if (ev.type === 'training-action') {
              // Direct training action event from domain training system
              if (ev.projectileId) {
                const mMapping = visualAssets.missiles[String(ev.projectileId)];
                if (mMapping && mMapping.frames.length > 0) {
                  const fUrl = mMapping.frames[0].publicUrl;
                  if (loaded[fUrl]) {
                    const sp = new Sprite(loaded[fUrl]);
                    sp.anchor.set(0.5);
                    effectsLayer.addChild(sp);
                    timedCityVisuals.push({
                      root: sp,
                      startedAt: now,
                      durationMs: 320,
                      kind: 'missile',
                      from: { x: currentPixelX, y: currentPixelY },
                      to: { x: dummyPos.x * TILE_SIZE + 16, y: dummyPos.y * TILE_SIZE + 16 },
                    });
                  }
                }
              }
              if (ev.effectId) {
                const fxMapping = visualAssets.effects[String(ev.effectId)];
                if (fxMapping && fxMapping.frames.length > 0) {
                  const fUrl = fxMapping.frames[0].publicUrl;
                  if (loaded[fUrl]) {
                    const sp = new Sprite(loaded[fUrl]);
                    sp.anchor.set(0.5);
                    const targetPx = { x: dummyPos.x * TILE_SIZE + 16, y: dummyPos.y * TILE_SIZE + 16 };
                    sp.position.set(targetPx.x, targetPx.y);
                    effectsLayer.addChild(sp);
                    timedCityVisuals.push({
                      root: sp,
                      startedAt: now + (ev.projectileId ? 250 : 0),
                      durationMs: Math.max(300, fxMapping.frames.length * 70),
                      kind: 'effect',
                      frames: fxMapping.frames.map((f) => f.publicUrl),
                    });
                  }
                }
              }
            }
          }
        }

        // 4c. Update timed city visuals (missiles, effects, floaters)
        for (let idx = timedCityVisuals.length - 1; idx >= 0; idx--) {
          const vis = timedCityVisuals[idx];
          const progress = (now - vis.startedAt) / vis.durationMs;
          vis.root.visible = progress >= 0;
          if (progress < 0) continue;
          if (progress >= 1) {
            try {
              if (vis.root.parent) vis.root.parent.removeChild(vis.root);
              vis.root.destroy({ children: true });
            } catch {}
            timedCityVisuals.splice(idx, 1);
            continue;
          }
          if (vis.kind === 'missile' && vis.from && vis.to) {
            vis.root.position.set(
              vis.from.x + (vis.to.x - vis.from.x) * progress,
              vis.from.y + (vis.to.y - vis.from.y) * progress
            );
          } else if (vis.kind === 'float') {
            const startY = vis.startY ?? vis.root.position.y;
            vis.root.position.y = startY - progress * 14;
            vis.root.alpha = 1 - progress * 0.25;
          } else if (vis.kind === 'effect' && vis.frames && vis.frames.length > 0) {
            const frameIdx = Math.min(
              vis.frames.length - 1,
              Math.floor(progress * vis.frames.length)
            );
            const frameUrl = vis.frames[frameIdx];
            if (frameUrl && loaded[frameUrl] && 'texture' in vis.root) {
              (vis.root as InstanceType<typeof Sprite>).texture = loaded[frameUrl];
            }
          }
        }

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
        // (remotes and myPlayerId already defined above in ticker)
        const LOOKTYPE_MAP: Record<number, string> = {
          128: 'Citizen',
          129: 'Paladin',
          130: 'Sorcerer',
          131: 'Knight',
          132: 'Noble',
          133: 'Summoner',
          134: 'Warrior',
          136: 'Citizen',
          137: 'Hunter',
          138: 'Mage',
          139: 'Knight',
          140: 'Noble',
          141: 'Summoner',
          142: 'Warrior',
          143: 'Barbarian',
          144: 'Druid',
          145: 'Sorcerer',
          146: 'Paladin',
          151: 'Pirate',
          152: 'Assassin',
          153: 'Beggar',
          999: 'Sire',
        };

        if (remotes) {
          const renderedRemotes = new Set<string>();

          remotes.forEach((p, key) => {
            const isLocal = key === myPlayerId || p.id === myPlayerId || (gameNetwork.LocalPlayerId && p.id === gameNetwork.LocalPlayerId);
            if (isLocal || p.inHunt) return; // Skip rendering local player or players in hunt
            const pCharId = p.characterId || p.id;
            if (renderedRemotes.has(pCharId)) return;
            renderedRemotes.add(pCharId);

            const vocName = (p.vocationName as string) || VOCATION_NAMES[p.vocationId] || 'Knight';
            const rawOutfitName = typeof p.outfit === 'string' ? p.outfit : p.outfit?.outfit;
            const outfitKey =
              (rawOutfitName && rawOutfitName !== 'Hero' && rawOutfitName !== 'Desconhecido' ? rawOutfitName : null) ||
              (p.outfit?.lookType ? LOOKTYPE_MAP[p.outfit.lookType] : null) ||
              vocName;

            const hasCustomColors =
              p.outfit &&
              ((p.outfit.lookBody ?? 0) > 0 || (p.outfit.lookLegs ?? 0) > 0 || (p.outfit.lookFeet ?? 0) > 0);

            const colors = hasCustomColors
              ? {
                  head: p.outfit.lookHead ?? 0,
                  primary: p.outfit.lookBody ?? 86,
                  secondary: p.outfit.lookLegs ?? 114,
                  detail: p.outfit.lookFeet ?? 76,
                }
              : { head: 0, primary: 86, secondary: 114, detail: 76 };

            const view = ensureActorView({
              id: p.id,
              name: p.name,
              vocation: outfitKey,
              outfit: outfitKey,
              outfitColors: colors,
              mount: p.mount,
              mountActive: p.mountActive,
              x: p.x,
              y: p.y,
            });
            if (!view) return;

            const colorsKey = colors ? `${colors.head}_${colors.primary}_${colors.secondary}_${colors.detail}` : 'none';
            if (view.lastOutfitKey !== outfitKey || view.lastColorsKey !== colorsKey) {
              view.lastOutfitKey = outfitKey;
              view.lastColorsKey = colorsKey;
              if (colors) {
                preloadOutfitAllFrames(outfitKey, 'male', colors).catch(() => {});
              }
            }

            const targetTile = { x: p.x ?? 32369, y: p.y ?? 32241, z: p.z ?? 7 };
            let rState = remoteMotionTracks.get(p.id);
            if (!rState) {
              rState = {
                track: new VisualMotionTrack(targetTile, p.direction || 'south'),
                lastTile: { ...targetTile },
              };
              remoteMotionTracks.set(p.id, rState);
            } else if (targetTile.x !== rState.lastTile.x || targetTile.y !== rState.lastTile.y || targetTile.z !== rState.lastTile.z) {
              const distJump = Math.hypot(targetTile.x - rState.lastTile.x, targetTile.y - rState.lastTile.y);
              if (distJump > 2.5 || targetTile.z !== rState.lastTile.z) {
                rState.track.reset(targetTile);
              } else {
                rState.track.commit(rState.lastTile, targetTile, now, curStepDuration);
              }
              rState.lastTile = { ...targetTile };
            }

            const sample = rState.track.sample(now);
            const px = sample.renderPosition.x * TILE_SIZE + 16;
            const py = sample.renderPosition.y * TILE_SIZE + 16;
            const dir = sample.direction || p.direction || 'south';
            const isMoving = sample.moving || p.isMoving;

            view.root.visible = (p.z ?? 7) === curPos.z;
            if (!view.root.visible) return;

            const walkFrame = isMoving ? walkCycle[Math.floor(now / stepRateMs) % 4] : 0;
            const textureKey = colors
              ? `${outfitKey}_male_${dir}_${walkFrame}_${colors.head}_${colors.primary}_${colors.secondary}_${colors.detail}`
              : `${outfitKey}_male_${dir}_${walkFrame}`;

            if (view.lastTextureKey !== textureKey) {
              let updated = false;
              if (colors) {
                const canvas = getRecoloredCanvasSync(outfitKey, 'male', dir as any, walkFrame, colors);
                if (canvas) {
                  const tex = Texture.from(canvas);
                  tex.source.style.scaleMode = 'nearest';
                  view.sprite.texture = tex;
                  view.lastTextureKey = textureKey;
                  view.lastUrl = 'canvas';
                  updated = true;
                } else {
                  preloadOutfitAllFrames(outfitKey, 'male', colors).then(() => {
                    const readyCanvas = getRecoloredCanvasSync(outfitKey, 'male', dir as any, walkFrame, colors);
                    if (readyCanvas && view.root && !view.root.destroyed) {
                      const tex = Texture.from(readyCanvas);
                      tex.source.style.scaleMode = 'nearest';
                      view.sprite.texture = tex;
                      view.lastTextureKey = textureKey;
                      view.lastUrl = 'canvas';
                    }
                  }).catch(() => {});
                }
              }
              if (!updated) {
                const url = getOutfitFrameUrl(outfitKey, dir, walkFrame);
                if (url && loaded[url]) {
                  view.sprite.texture = loaded[url];
                  view.lastUrl = url;
                  if (!colors) {
                    view.lastTextureKey = textureKey;
                  }
                }
              }
            }

            if (Number.isFinite(px) && Number.isFinite(py)) {
              view.root.position.set(px, py);
              view.root.zIndex = py;
            }
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
            const isMe =
              myLeader &&
              (sp.senderName === myLeader.name ||
                sp.senderName === 'Você' ||
                sp.senderName === '' ||
                (sp.senderId && latestRef.current.localPlayerId && sp.senderId === latestRef.current.localPlayerId));

            if (isMe && myLeader) {
              targetView = ensureActorView(myLeader);
            } else {
              const matchedChar = curChars.find(
                (c) =>
                  (sp.senderName && c.name.toLowerCase() === sp.senderName.toLowerCase()) ||
                  (sp.senderId && c.id === sp.senderId)
              );
              if (matchedChar) {
                targetView = ensureActorView(matchedChar);
              } else {
                const matchedAmbient = AMBIENT_THAIS_PLAYERS.find(
                  (a) =>
                    (sp.senderName && a.name.toLowerCase() === sp.senderName.toLowerCase()) ||
                    (sp.senderId && a.id === sp.senderId)
                );
                if (matchedAmbient) {
                  targetView = ensureActorView(matchedAmbient);
                } else if (remotes) {
                  for (const [, rp] of remotes.entries()) {
                    const matchRemote =
                      (sp.senderId && (rp.id === sp.senderId || rp.characterId === sp.senderId)) ||
                      (sp.senderName && rp.name && rp.name.toLowerCase() === sp.senderName.toLowerCase());
                    if (matchRemote) {
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
        resizeObserver?.disconnect();
        unsubZoom();
        appRef.current = null;
        unsubNetworkCombat?.();
        hideGlobalPlayerTooltip();
        app.canvas.removeEventListener('pointermove', onPointerMove);
        app.canvas.removeEventListener('pointerleave', onPointerLeave);
        app.canvas.removeEventListener('pointerdown', onPointerDown);
        app.canvas.removeEventListener('contextmenu', onContextMenu);
        try {
          app.destroy(true, { children: true });
        } catch (err) {
          console.warn('[ThaisCityArena] Safe catch on app.destroy:', err);
        }
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
