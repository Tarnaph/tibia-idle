'use client';

import { useEffect, useRef } from 'react';
import '@/apps/web/lib/pixiPolyfill';
import thaisCityJson from '@/content/generated/thais-city.json';
import huntRegionsJson from '@/content/generated/hunt-regions.json';
import thaisItemMetaJson from '@/content/generated/thais-item-metadata.json';
import fxAssetsJson from '@/content/generated/tibia1098-fx.json';
import { THAIS_TRAINING_DUMMIES, EXERCISE_DUMMY_ITEM_IDS, calculatePartyTrainingPositions, type CharacterState, type CombatVisualEvent, type TrainingDummyInfo } from '@/packages/domain/src';
import type { HuntRegionCatalog } from '@/packages/content-schema/src';
import { calculatePixelCamera, creatureVisualLayout, VisualMotionTrack } from '@/packages/presentation/src';
import type { ExtractedFrame, ItemVisualAssetMapping, VisualAssetMapping } from '@/packages/tibia1098-assets/src/types';
import type { Application as PixiApplication, Texture as PixiTexture } from 'pixi.js';
import { showGlobalPlayerTooltip, hideGlobalPlayerTooltip } from './GlobalItemTooltip';
import { getCanvasCacheKey, getRecoloredCanvasSync, isOutfitCanvasCached, isAppearanceFullyReady, normalizeOutfitId, preloadOutfitAllFrames, prepareAppearanceCanvas, getOutfitCapabilities, type OutfitColors } from '@/apps/web/lib/outfitRecolor';
import { outfitDiagnostics } from '@/apps/web/lib/outfitDiagnostics';
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

// AMBIENT_THAIS_PLAYERS: Mock NPCs removed for live MMORPG world. Metadata preserved: name: 'Vimago', vocation: 'Master Sorcerer', isPremium: true, name: 'Elane', name: 'Harkath Bloodblade', name: 'Muriel', isPremium: false
import { AMBIENT_THAIS_PLAYERS, type AmbientCityPlayer } from '@/apps/web/lib/cityAmbientData';
export type { AmbientCityPlayer };
export { AMBIENT_THAIS_PLAYERS };

interface Props {
  characters: CharacterState[];
  activeCharacterId?: string | null;
  cityPos: { x: number; y: number; z: number };
  isWalking: boolean;
  isTraining: boolean;
  trainingDummyPos?: { x: number; y: number; z: number } | null;
  stepDurationMs?: number;
  onTileClick?: (tile: { x: number; y: number; z: number }) => void;
  onCharacterContextMenu?: (characterId: string, x: number, y: number) => void;
  onDummyContextMenu?: (dummy: TrainingDummyInfo, x: number, y: number) => void;
  visualEvents?: CombatVisualEvent[];
  debug?: boolean;
  remotePlayers?: Map<string, any>;
  localPlayerId?: string | null;
  overheadMessages?: CityOverheadMessage[];
  active?: boolean;
  isCharacterVisible?: boolean;
  squadFollowEnabled?: boolean;
  adminTitle?: string | null;
}

interface ThaisItemFrame {
  key: string;
  px: number;
  py: number;
  animFrame: number;
}

interface ThaisItemMetadata {
  isGround: boolean;
  width: number;
  height: number;
  patternX: number;
  patternY: number;
  animFrames?: number;
  animDurationMs?: number;
  frames?: ThaisItemFrame[] | string[];
}

const thaisItemMeta = thaisItemMetaJson as unknown as Record<string, ThaisItemMetadata>;
const fxAssets = fxAssetsJson as {
  effects: Record<string, { frames: Array<{ publicUrl: string }> }>;
  missiles: Record<string, { frames: Array<{ publicUrl: string }> }>;
  assets: Record<string, { frames: Array<{ publicUrl: string }> }>;
};

function resolveTileFrameKey(meta: ThaisItemMetadata | undefined, tileX: number, tileY: number): string | null {
  if (!meta || !meta.frames || meta.frames.length === 0) return null;
  const fList = meta.frames;
  if (typeof fList[0] === 'string') return fList[0] as string;
  const typedFrames = fList as ThaisItemFrame[];
  if (typedFrames.length === 1) return typedFrames[0].key;
  const px = (meta.patternX ?? 1) > 1 ? Math.abs(tileX) % meta.patternX! : 0;
  const py = (meta.patternY ?? 1) > 1 ? Math.abs(tileY) % meta.patternY! : 0;
  const matched = typedFrames.find((f) => f.px === px && f.py === py && f.animFrame === 0) ?? typedFrames[0];
  return matched.key;
}

function getMissileDirection(dx: number, dy: number): string {
  const angle = Math.atan2(dy, dx);
  const deg = (angle * (180 / Math.PI) + 360) % 360;
  if (deg >= 337.5 || deg < 22.5) return 'east';
  if (deg >= 22.5 && deg < 67.5) return 'south-east';
  if (deg >= 67.5 && deg < 112.5) return 'south';
  if (deg >= 112.5 && deg < 157.5) return 'south-west';
  if (deg >= 157.5 && deg < 202.5) return 'west';
  if (deg >= 202.5 && deg < 247.5) return 'north-west';
  if (deg >= 247.5 && deg < 292.5) return 'north';
  return 'north-east';
}

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
  activeCharacterId,
  cityPos,
  isWalking,
  isTraining,
  trainingDummyPos,
  stepDurationMs = 500,
  onTileClick,
  onCharacterContextMenu,
  onDummyContextMenu,
  visualEvents = [],
  debug = false,
  remotePlayers,
  localPlayerId,
  overheadMessages,
  active = true,
  isCharacterVisible = true,
  squadFollowEnabled = false,
  adminTitle,
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
    activeCharacterId,
    cityPos,
    isWalking,
    isTraining,
    trainingDummyPos,
    stepDurationMs,
    onTileClick,
    onCharacterContextMenu,
    onDummyContextMenu,
    debug,
    remotePlayers,
    localPlayerId,
    overheadMessages,
    visualEvents,
    active,
    isCharacterVisible,
    squadFollowEnabled,
    adminTitle,
  });
  latestRef.current = {
    characters,
    activeCharacterId,
    cityPos,
    isWalking,
    isTraining,
    trainingDummyPos,
    stepDurationMs,
    onTileClick,
    onCharacterContextMenu,
    onDummyContextMenu,
    debug,
    remotePlayers,
    localPlayerId,
    overheadMessages,
    visualEvents,
    active,
    isCharacterVisible,
    squadFollowEnabled,
    adminTitle,
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

      // Texture Atlases: All 1,082 Thais items + creatures & UI icons packed in 2 texture atlases
      const atlasTextures: Record<string, PixiTexture> = {};
      const loaded: Record<string, PixiTexture> = {};

      try {
        const [thaisAtlasSheet, creaturesAtlasSheet, spellsAtlasSheet, directDummyTex] = await Promise.all([
          Assets.load<any>('/generated/atlases/thais-atlas.json?v=164_dummies').catch(() => Assets.load<any>('/generated/atlases/thais-atlas.json')),
          Assets.load<any>('/generated/atlases/creatures-atlas.json'),
          Assets.load<any>('/generated/atlases/spells-atlas.json'),
          Assets.load<any>('/assets/items/item-5787.png')
            .catch(() => Assets.load<any>('/generated/tibia1098/items/item-5787.png'))
            .catch(() => null),
        ]);
        if (thaisAtlasSheet?.textures) {
          if (thaisAtlasSheet.texture?.source?.style) {
            thaisAtlasSheet.texture.source.style.scaleMode = 'nearest';
          }
          Object.assign(atlasTextures, thaisAtlasSheet.textures);
        }
        if (directDummyTex) {
          if (directDummyTex.source?.style) {
            directDummyTex.source.style.scaleMode = 'nearest';
          }
          atlasTextures['item-5787-direct'] = directDummyTex;
          atlasTextures['item-5787-f0'] = directDummyTex;
        }
        if (creaturesAtlasSheet?.textures) {
          if (creaturesAtlasSheet.texture?.source?.style) {
            creaturesAtlasSheet.texture.source.style.scaleMode = 'nearest';
          }
          Object.assign(atlasTextures, creaturesAtlasSheet.textures);
        }
        if (spellsAtlasSheet?.textures) {
          if (spellsAtlasSheet.texture?.source?.style) {
            spellsAtlasSheet.texture.source.style.scaleMode = 'nearest';
          }
          Object.assign(atlasTextures, spellsAtlasSheet.textures);
          Object.assign(loaded, spellsAtlasSheet.textures);
        }
      } catch (err) {
        console.warn('Texture Atlas loading failed, falling back:', err);
      }

      if (disposed) {
        app.destroy(true, { children: true });
        return;
      }

      // Preload donkey rider mount, all house training dummies, and combat effects/missiles in idle time
      setTimeout(async () => {
        if (disposed) return;
        const donkeyUrl = '/generated/mounts/donkey_rider_south.png';
        if (!loaded[donkeyUrl]) {
          try {
            const tex = await Assets.load<PixiTexture>(donkeyUrl);
            if (tex) {
              tex.source.style.scaleMode = 'nearest';
              loaded[donkeyUrl] = tex;
            }
          } catch {}
        }

        // Preload canonical and house training dummies (5787, 31827-31833)
        for (const dummyId of EXERCISE_DUMMY_ITEM_IDS) {
          if (!atlasTextures[`item-${dummyId}-direct`]) {
            try {
              const tex = await Assets.load<PixiTexture>(`/assets/items/item-${dummyId}.png`);
              if (tex) {
                if (tex.source?.style) tex.source.style.scaleMode = 'nearest';
                atlasTextures[`item-${dummyId}-direct`] = tex;
                atlasTextures[`item-${dummyId}-f0`] = tex;
              }
            } catch {}
          }
        }

        // Preload essential training missiles and effects
        const PRELOAD_EFFECT_IDS = ['10', '12', '16', '17', '18', '37', '38', '44'];
        const PRELOAD_MISSILE_IDS = ['3', '4', '5', '11', '15', '28', '29', '54'];
        for (const effId of PRELOAD_EFFECT_IDS) {
          const mapping = fxAssets.effects[effId];
          if (mapping?.frames) {
            for (const f of mapping.frames) {
              if (!loaded[f.publicUrl]) {
                try {
                  const tex = await Assets.load<PixiTexture>(f.publicUrl);
                  if (tex) {
                    if (tex.source?.style) tex.source.style.scaleMode = 'nearest';
                    loaded[f.publicUrl] = tex;
                  }
                } catch {}
              }
            }
          }
        }
        for (const mId of PRELOAD_MISSILE_IDS) {
          const mapping = fxAssets.missiles[mId];
          if (mapping?.frames) {
            for (const f of mapping.frames) {
              if (!loaded[f.publicUrl]) {
                try {
                  const tex = await Assets.load<PixiTexture>(f.publicUrl);
                  if (tex) {
                    if (tex.source?.style) tex.source.style.scaleMode = 'nearest';
                    loaded[f.publicUrl] = tex;
                  }
                } catch {}
              }
            }
          }
        }
      }, 100);

      const teleportMeta = thaisItemMeta['effect-11'];
      const teleportFrames = (teleportMeta?.frames as string[]) || [];
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
      const processedCityEventIds = new Set<string>();
      let globalCityEventSeq = 0;
      function getStableEventId(ev: any): string {
        if (ev.id && typeof ev.id === 'string') return ev.id;
        if (!ev._stableId) {
          globalCityEventSeq++;
          ev._stableId = `city_ev_${Date.now()}_${globalCityEventSeq}_${ev.type || 'vis'}_${ev.sourceId || ''}_${ev.spellId || ''}`;
        }
        return ev._stableId;
      }
      let lastAttackPoseUntil = 0;
      const remoteAttackPoseUntilMap = new Map<string, number>();

      function triggerTrainingVisual(
        fromX: number,
        fromY: number,
        toX: number,
        toY: number,
        projectileId: number | null | undefined,
        effectId: number | null | undefined,
        now: number
      ) {
        const fromPx = { x: fromX * TILE_SIZE + 16, y: fromY * TILE_SIZE + 16 };
        const toPx = { x: toX * TILE_SIZE + 16, y: toY * TILE_SIZE + 16 };
        const dx = toX - fromX;
        const dy = toY - fromY;
        const dir = getMissileDirection(dx, dy);

        let flightDurationMs = 0;
        if (projectileId && projectileId > 0) {
          flightDurationMs = 280;
          const mMapping = fxAssets.missiles[String(projectileId)];
          if (mMapping && mMapping.frames && mMapping.frames.length > 0) {
            const dirFrames = mMapping.frames.filter((f: any) => f.direction === dir);
            const framesToUse = dirFrames.length > 0 ? dirFrames : mMapping.frames;
            const firstUrl = framesToUse[0].publicUrl;
            const initialTex = atlasTextures[firstUrl] || loaded[firstUrl] || Texture.EMPTY;
            const sp = new Sprite(initialTex);
            sp.anchor.set(0.5);
            sp.position.set(fromPx.x, fromPx.y);
            sp.roundPixels = true;
            effectsLayer.addChild(sp);

            if (!loaded[firstUrl]) {
              void Assets.load<PixiTexture>(firstUrl).then((tex) => {
                if (tex) {
                  tex.source.style.scaleMode = 'nearest';
                  loaded[firstUrl] = tex;
                  if ('texture' in sp) (sp as any).texture = tex;
                }
              });
            }

            timedCityVisuals.push({
              root: sp,
              startedAt: now,
              durationMs: flightDurationMs,
              kind: 'missile',
              from: fromPx,
              to: toPx,
              frames: framesToUse.map((f: { publicUrl: string }) => f.publicUrl),
            });
          }
        }

        if (effectId && effectId > 0) {
          const fxMapping = fxAssets.effects[String(effectId)];
          if (fxMapping && fxMapping.frames && fxMapping.frames.length > 0) {
            const firstUrl = fxMapping.frames[0].publicUrl;
            const initialTex = atlasTextures[firstUrl] || loaded[firstUrl] || Texture.EMPTY;
            const sp = new Sprite(initialTex);
            sp.anchor.set(0.5);
            sp.position.set(toPx.x, toPx.y);
            sp.roundPixels = true;
            sp.visible = flightDurationMs <= 0;
            effectsLayer.addChild(sp);

            if (!loaded[firstUrl]) {
              void Assets.load<PixiTexture>(firstUrl).then((tex) => {
                if (tex) {
                  tex.source.style.scaleMode = 'nearest';
                  loaded[firstUrl] = tex;
                  if ('texture' in sp) (sp as any).texture = tex;
                }
              });
            }

            timedCityVisuals.push({
              root: sp,
              startedAt: now + flightDurationMs,
              durationMs: Math.max(300, fxMapping.frames.length * 70),
              kind: 'effect',
              frames: fxMapping.frames.map((f: { publicUrl: string }) => f.publicUrl),
            });
          }
        }
      }

      const unsubNetworkCombat = gameNetwork.onCombatEvent((ev) => {
        const now = performance.now();
        const targetX = ev.posX ?? ev.x ?? 0;
        const targetY = ev.posY ?? ev.y ?? 0;
        const fromX = ev.fromX ?? targetX;
        const fromY = ev.fromY ?? targetY;

        const myId = latestRef.current.localPlayerId;
        const activeChar = latestRef.current.characters.find((c) => c.id === latestRef.current.activeCharacterId);
        if (ev.sourceId && (ev.sourceId === myId || (activeChar && ev.sourceId === activeChar.id))) {
          lastAttackPoseUntil = now + 250;
        } else if (ev.sourceId) {
          remoteAttackPoseUntilMap.set(ev.sourceId, now + 250);
        }

        if (ev.projectileId || ev.effectId) {
          triggerTrainingVisual(fromX, fromY, targetX, targetY, ev.projectileId, ev.effectId, now);
        }
      });

      const triggerTeleportEffect = (px: number, py: number) => {
        if (teleportFrames.length === 0) return;
        const firstFrame = teleportFrames[0];
        const tex = atlasTextures[firstFrame] || loaded[firstFrame];
        if (!tex) return;
        const sp = new Sprite(tex);
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

      // Training dummies placed in the Thais Depot on Z:7
      for (const dummy of THAIS_TRAINING_DUMMIES) {
        const dummyTex =
          atlasTextures['item-5787-f0'] ||
          atlasTextures['item-5787-direct'] ||
          atlasTextures['asset-trainingDummy'] ||
          Texture.EMPTY;
        const dummySprite = new Sprite(dummyTex);
        dummySprite.position.set(dummy.position.x * TILE_SIZE, dummy.position.y * TILE_SIZE);
        dummySprite.roundPixels = true;
        dummySprite.zIndex = dummy.position.y * TILE_SIZE + 32;
        objectsLayerZ7.addChild(dummySprite);
      }

      const animatedMapSprites: Array<{
        sprite: InstanceType<typeof Sprite>;
        frames: string[];
        frameDurationMs: number;
      }> = [];

      // Pre-render tiles for Thais Z:7 (ground/streets) and Z:6 (roofs/piers)
      tileMapByZ.forEach((zMap, zLevel) => {
        const targetTerrain = zLevel === 6 ? terrainLayerZ6 : terrainLayerZ7;
        const targetObjects = zLevel === 6 ? objectsLayerZ6 : objectsLayerZ7;

        zMap.forEach((tile) => {
          const px = tile.x * TILE_SIZE;
          const py = tile.y * TILE_SIZE;

          let hasGroundSprite = false;
          const defaultFloorTexture = atlasTextures['asset-trainingFloor'] || Texture.EMPTY;

          for (const sId of tile.serverItemIds) {
            const meta = thaisItemMeta[String(sId)];
            if (meta?.isGround) {
              const frameKey = resolveTileFrameKey(meta, tile.x, tile.y);
              if (frameKey) {
                const tex = atlasTextures[frameKey] || defaultFloorTexture;
                const sp = new Sprite(tex);
                sp.position.set(px, py);
                sp.roundPixels = true;
                targetTerrain.addChild(sp);
                hasGroundSprite = true;
                if (meta.frames && meta.frames.length > 1 && (meta.animFrames ?? 1) > 1) {
                  animatedMapSprites.push({
                    sprite: sp,
                    frames: (meta.frames as ThaisItemFrame[]).map((f) => f.key),
                    frameDurationMs: meta.animDurationMs || 180,
                  });
                }
                break;
              }
            }
          }

          for (const sId of tile.serverItemIds) {
            if (sId === 5787) continue;
            const meta = thaisItemMeta[String(sId)];
            if (meta && !meta.isGround) {
              const frameKey = resolveTileFrameKey(meta, tile.x, tile.y);
              if (frameKey) {
                const tex = atlasTextures[frameKey] || Texture.EMPTY;
                const sp = new Sprite(tex);
                const frameToUse = { width: meta.width || 32, height: meta.height || 32 };
                const offsetY = frameToUse.height > 32 ? -(frameToUse.height - 32) : 0;
                const offsetX = frameToUse.width > 32 ? -(frameToUse.width - 32) : 0;
                sp.position.set(px + offsetX, py + offsetY);
                sp.roundPixels = true;
                sp.zIndex = py + 32;
                targetObjects.addChild(sp);
                if (meta.frames && meta.frames.length > 1 && (meta.animFrames ?? 1) > 1) {
                  animatedMapSprites.push({
                    sprite: sp,
                    frames: (meta.frames as ThaisItemFrame[]).map((f) => f.key),
                    frameDurationMs: meta.animDurationMs || 180,
                  });
                }
              }
            }
          }

          if (!hasGroundSprite) {
            const isWalkable = tile.walkable;
            const fallbackKey = isWalkable ? 'asset-trainingFloor' : 'asset-trainingWall';
            const floorSp = new Sprite(atlasTextures[fallbackKey] || defaultFloorTexture);
            floorSp.position.set(px, py);
            floorSp.roundPixels = true;
            targetTerrain.addChild(floorSp);
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
        currentPixelX?: number;
        currentPixelY?: number;
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
      let wasTrainingAtDummy = false;

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

        const activeZ = (latestRef.current.cityPos?.z === 6 || latestRef.current.cityPos?.z === 7) ? latestRef.current.cityPos.z : 7;
        const activeTileMap = tileMapByZ.get(activeZ) || tileMapByZ.get(7);
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

        // 2. Check party characters (including squad members following in city)
        if (!matchedPlayer) {
          curChars.forEach((char, idx) => {
            let px = currentPixelX;
            let py = currentPixelY;
            const fState = followerVisualStates.get(char.id);
            if (fState && typeof fState.currentPixelX === 'number' && typeof fState.currentPixelY === 'number') {
              px = fState.currentPixelX;
              py = fState.currentPixelY;
            } else {
              const offsetX = idx === 0 ? 0 : idx === 1 ? -24 : idx === 2 ? 24 : 0;
              const offsetY = idx === 0 ? 0 : idx === 3 ? 24 : 12;
              px = currentPixelX + offsetX;
              py = currentPixelY + offsetY;
            }
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

        const activeZ = (latestRef.current.cityPos?.z === 6 || latestRef.current.cityPos?.z === 7) ? latestRef.current.cityPos.z : 7;
        const activeTileMap = tileMapByZ.get(activeZ) || tileMapByZ.get(7);
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

        // Check if a training dummy was clicked
        if (latestRef.current.cityPos?.z === 7) {
          const clickedDummy = THAIS_TRAINING_DUMMIES.find((d) => {
            const dx = worldX - (d.position.x * TILE_SIZE + 16);
            const dy = worldY - (d.position.y * TILE_SIZE + 16);
            return Math.abs(dx) <= 16 && Math.abs(dy) <= 16;
          });
          if (clickedDummy) {
            latestRef.current.onDummyContextMenu?.(clickedDummy, e.clientX, e.clientY);
            return;
          }
        }

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
          const activeId = latestRef.current.activeCharacterId;
          const localChar = (activeId ? curChars.find((c) => c.id === activeId) : null) || curChars[0];
          matchedCharId = localChar?.id;
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
      interface CityActorAppearance {
        outfitKey: string;
        charGender: 'male' | 'female';
        colors: OutfitColors;
        addons: number;
        mount?: string;
        isMounted: boolean;
        outfitSig: string;
      }

      type AppearancePreparationStatus = 'idle' | 'preparing' | 'ready' | 'failed';

      interface AppearancePreparationState {
        status: AppearancePreparationStatus;
        outfitSig: string;
        target: CityActorAppearance;
        attempts: number;
        lastAttemptTime: number;
        missingAssets: string[];
        attemptId?: string;
      }

      interface CityActorView {
        root: InstanceType<typeof Container>;
        sprite: InstanceType<typeof Sprite>;
        label: InstanceType<typeof Text>;
        titleLabel?: InstanceType<typeof Text>;
        bar: InstanceType<typeof Graphics>;
        lastUrl: string;
        lastTextureKey?: string;
        lastOutfitKey?: string;
        lastColorsKey?: string;
        lastOutfitSignature?: string;
        lastCanvas?: HTMLCanvasElement;
        activeAppearance?: CityActorAppearance;
        pendingAppearance?: CityActorAppearance | null;
        appearanceState?: AppearancePreparationState;
        overheadSpeech?: InstanceType<typeof Container>;
        overheadSpeechText?: InstanceType<typeof Text>;
        speechExpiresAt?: number;
      }
      const actorViews = new Map<string, CityActorView>();
      const processedSpeechIds = new Set<string>();

      function updateNameplate(view: CityActorView, name: string, adminTitle?: string) {
        view.label.text = name;
        if (adminTitle && (adminTitle === 'GOD' || adminTitle === 'GM')) {
          if (!view.titleLabel) {
            view.titleLabel = new Text({
              text: `[${adminTitle}] `,
              resolution: 2,
              style: {
                fill: 0xffd700,
                stroke: { color: 0x08120a, width: 2 },
                fontSize: 8,
                fontFamily: 'Arial',
                fontWeight: '700',
              },
            });
            view.titleLabel.roundPixels = true;
            view.root.addChild(view.titleLabel);
          } else {
            view.titleLabel.text = `[${adminTitle}] `;
            view.titleLabel.visible = true;
          }
          const titleW = view.titleLabel.width;
          const nameW = view.label.width;
          const totalW = titleW + nameW;
          const startX = -totalW / 2;
          view.titleLabel.anchor.set(0, 0.5);
          view.titleLabel.position.set(startX, creatureVisualLayout.nameplateY);
          view.label.anchor.set(0, 0.5);
          view.label.position.set(startX + titleW, creatureVisualLayout.nameplateY);
        } else {
          if (view.titleLabel) {
            view.titleLabel.visible = false;
          }
          view.label.anchor.set(0.5, 0.5);
          view.label.position.set(0, creatureVisualLayout.nameplateY);
        }
      }

      function getOutfitFrameUrl(vocationOrOutfit: string, direction: string, frame: number): string {
        const lower = (vocationOrOutfit || '').toLowerCase();
        if (lower === 'dragon' || lower === '34') {
          return `/generated/tibia1098/monster-dragon-${direction}-frame-${frame % 3}.png`;
        }
        const idLower = normalizeOutfitId(vocationOrOutfit);
        return `/generated/outfit-thumbs/${idLower}.png`;
      }

      function ensureActorView(char: { id: string; name: string; vocation: string; gender?: 'male' | 'female'; outfit?: string; mount?: string; mountActive?: boolean; outfitColors?: { head: number; primary: number; secondary: number; detail: number }; addons?: number; outfitAddons?: number; adminTitle?: string; x?: number; y?: number }): CityActorView | null {
        let view = actorViews.get(char.id);
        if (view) {
          updateNameplate(view, char.name, char.adminTitle || (char as any).adminTitle);
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

        const isMounted = Boolean(char.mountActive && char.mount && char.mount !== 'none');
        const addons = (char as any).addons || (char as any).outfitAddons || 0;

        if (char.outfitColors) {
          preloadOutfitAllFrames(
            char.outfit || char.vocation || 'Knight',
            char.gender || 'male',
            char.outfitColors,
            addons,
            char.mount,
            isMounted
          ).catch(() => {});
        }
        const mountUrl = (char.mount === 'donkey' || char.mount === 'Donkey')
          ? '/generated/mounts/donkey_rider_south.png'
          : `/generated/mounts/${char.mount}.png`;
        const initialUrl = isMounted ? mountUrl : getOutfitFrameUrl(char.outfit || char.vocation, 'south', 0);
        let tex = loaded[initialUrl];

        if (!tex) {
          const colors = char.outfitColors || { head: 0, primary: 86, secondary: 114, detail: 76 };
          const charGender = char.gender === 'female' ? 'female' : 'male';
          const canvas = getRecoloredCanvasSync(char.outfit || char.vocation, charGender, 'south', 0, colors, addons, char.mount, isMounted);
          if (canvas) {
            tex = Texture.from(canvas);
            tex.source.style.scaleMode = 'nearest';
          }
        }

        if (!tex) {
          tex = Texture.EMPTY;
        }

        const root = new Container();
        root.visible = false;
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
        updateNameplate(view, char.name, char.adminTitle || (char as any).adminTitle);
        actorViews.set(char.id, view);
        return view;
      }

      const initialLocalChar = (activeCharacterId ? characters.find((c) => c.id === activeCharacterId) : null) || characters[0];
      if (initialLocalChar) ensureActorView(initialLocalChar);
      AMBIENT_THAIS_PLAYERS.forEach(ensureActorView);

      // Ticker to smoothly follow player with VisualMotionTrack (matching hunt fluidity), animate characters & animate map elements
      app.ticker.add(() => {
        const { characters: curChars, isWalking: curWalk, isTraining: curTrain, stepDurationMs: curStepDuration } = latestRef.current;
        const rawPos = latestRef.current.cityPos;
        const curPos = {
          x: typeof rawPos?.x === 'number' && !isNaN(rawPos.x) ? rawPos.x : 32369,
          y: typeof rawPos?.y === 'number' && !isNaN(rawPos.y) ? rawPos.y : 32241,
          z: (rawPos?.z === 6 || rawPos?.z === 7) ? rawPos.z : 7,
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
            const key = fx.frames[Math.min(frameIdx, fx.frames.length - 1)];
            const tex = atlasTextures[key] || loaded[key];
            if (tex) fx.sprite.texture = tex;
          }
        }

        // Floor rendering: Floor 7 is the base terrain (streets, water, nature),
        // Floor 6 (roofs, upper pier, boat, walkways) is drawn on top when curPos.z === 6.
        floor7Container.visible = true;
        floor6Container.visible = curPos.z === 6;

        // 1. Animate all animated map elements (mystic blue fire, teleports, torches, lamps, fountains, water)
        for (const anim of animatedMapSprites) {
          const frameIdx = Math.floor(now / anim.frameDurationMs) % anim.frames.length;
          const key = anim.frames[frameIdx];
          const tex = atlasTextures[key] || loaded[key];
          if (tex && anim.sprite.texture !== tex) {
            anim.sprite.texture = tex;
          }
        }

        const activeCharId = latestRef.current.activeCharacterId;
        const localChar = (activeCharId ? curChars.find((c) => c.id === activeCharId) : null) || curChars[0];
        const squadFollowEnabled = Boolean(latestRef.current.squadFollowEnabled);
        const followers = (squadFollowEnabled && localChar)
          ? curChars.filter((c) => c.id !== localChar.id)
          : [];

        // 2. High-fluidity linear movement interpolation via VisualMotionTrack (identical to hunt mode)
        const leaderPosChanged = (curPos.x !== lastCommittedPos.x || curPos.y !== lastCommittedPos.y || curPos.z !== lastCommittedPos.z);
        const prevLeaderTile = { ...lastCommittedPos };

        if (leaderPosChanged) {
          const distJump = Math.hypot(curPos.x - lastCommittedPos.x, curPos.y - lastCommittedPos.y);
          const isTeleportOrFloorChange = distJump > 2.5 || curPos.z !== lastCommittedPos.z;

          if (isTeleportOrFloorChange) {
            motionTrack.reset({ x: curPos.x, y: curPos.y, z: curPos.z });
            for (const f of followers) {
              const fState = followerVisualStates.get(f.id);
              if (fState) {
                fState.motionTrack.reset(curPos);
                fState.currentTile = { ...curPos };
                fState.lastCommittedTile = { ...curPos };
                fState.direction = playerDirection;
              }
            }
          } else {
            motionTrack.commit(lastCommittedPos, curPos, now, curStepDuration);
            if (squadFollowEnabled && followers.length > 0) {
              // Fila Indiana (Snake follow): Each follower i steps into tile of member (i - 1)
              let nextTarget = { ...prevLeaderTile };
              for (let i = 0; i < followers.length; i++) {
                const fChar = followers[i];
                let fState = followerVisualStates.get(fChar.id);
                if (!fState) {
                  fState = {
                    currentTile: { ...nextTarget },
                    lastCommittedTile: { ...nextTarget },
                    motionTrack: new VisualMotionTrack(nextTarget, playerDirection),
                    direction: playerDirection,
                  };
                  followerVisualStates.set(fChar.id, fState);
                }
                const prevFollowerTile = { ...fState.currentTile };
                if (nextTarget.x !== prevFollowerTile.x || nextTarget.y !== prevFollowerTile.y || nextTarget.z !== prevFollowerTile.z) {
                  fState.motionTrack.commit(prevFollowerTile, nextTarget, now, curStepDuration);
                  fState.lastCommittedTile = prevFollowerTile;
                  fState.currentTile = { ...nextTarget };
                }
                nextTarget = prevFollowerTile;
              }
            }
          }

          lastCommittedPos = { ...curPos };
        }

        // Initialize follower visual state if not yet created
        if (squadFollowEnabled && followers.length > 0) {
          for (let i = 0; i < followers.length; i++) {
            const fChar = followers[i];
            if (!followerVisualStates.has(fChar.id)) {
              const offset = i + 1;
              const backX = playerDirection === 'east' ? -offset : playerDirection === 'west' ? offset : 0;
              const backY = playerDirection === 'south' ? -offset : playerDirection === 'north' ? offset : 0;
              const initTile = { x: curPos.x + backX, y: curPos.y + backY, z: curPos.z };
              followerVisualStates.set(fChar.id, {
                currentTile: initTile,
                lastCommittedTile: initTile,
                motionTrack: new VisualMotionTrack(initTile, playerDirection),
                direction: playerDirection,
              });
            }
          }
        }

        const sample = motionTrack.sample(now);
        currentPixelX = sample.renderPosition.x * TILE_SIZE + 16;
        currentPixelY = sample.renderPosition.y * TILE_SIZE + 16;
        if (sample.direction) {
          playerDirection = sample.direction;
        }
        const isMoving = sample.moving;

        // Orient player towards training dummy if training and not actively walking
        const activeDummyPos = latestRef.current.trainingDummyPos ||
          ((localChar as any)?.training?.dummyId
            ? THAIS_TRAINING_DUMMIES.find((d) => d.id === (localChar as any)?.training?.dummyId)?.position
            : null) ||
          thaisData.trainingDummy ||
          THAIS_TRAINING_DUMMIES[0].position;

        if (curTrain && activeDummyPos && !isMoving && !curWalk) {
          const dX = activeDummyPos.x - curPos.x;
          const dY = activeDummyPos.y - curPos.y;
          if (Math.abs(dX) >= Math.abs(dY)) {
            playerDirection = dX >= 0 ? 'east' : 'west';
          } else {
            playerDirection = dY >= 0 ? 'south' : 'north';
          }

          // Posiciona todos os membros da party ao redor do training dummy virados para o boneco
          if (squadFollowEnabled && followers.length > 0) {
            const followerIds = followers.map((f) => f.id);
            const activeTileMap = getTileMapForZ(activeDummyPos.z ?? 7);
            const isWalkableTile = (pos: { x: number; y: number; z: number }) => {
              const tile = activeTileMap.get(`${pos.x},${pos.y}`);
              return Boolean(tile && tile.walkable);
            };
            const trainingSlots = calculatePartyTrainingPositions(
              activeDummyPos,
              curPos,
              followerIds,
              isWalkableTile
            );
            for (const fChar of followers) {
              const slot = trainingSlots.get(fChar.id);
              if (!slot) continue;
              let fState = followerVisualStates.get(fChar.id);
              if (!fState) {
                fState = {
                  currentTile: { ...slot.position },
                  lastCommittedTile: { ...slot.position },
                  motionTrack: new VisualMotionTrack(slot.position, slot.facingDirection),
                  direction: slot.facingDirection,
                };
                followerVisualStates.set(fChar.id, fState);
              } else {
                if (fState.currentTile.x !== slot.position.x || fState.currentTile.y !== slot.position.y || fState.currentTile.z !== slot.position.z) {
                  fState.motionTrack.commit(fState.currentTile, slot.position, now, Math.max(160, curStepDuration));
                  fState.lastCommittedTile = { ...fState.currentTile };
                  fState.currentTile = { ...slot.position };
                }
                fState.direction = slot.facingDirection;
              }
            }
          }
          wasTrainingAtDummy = true;
        } else if (!curTrain && wasTrainingAtDummy) {
          // Ao cancelar o treino, os seguidores retornam para a formação em fila indiana atrás do líder
          if (squadFollowEnabled && followers.length > 0) {
            for (let i = 0; i < followers.length; i++) {
              const fChar = followers[i];
              const fState = followerVisualStates.get(fChar.id);
              if (!fState) continue;
              const offset = i + 1;
              const backX = playerDirection === 'east' ? -offset : playerDirection === 'west' ? offset : 0;
              const backY = playerDirection === 'south' ? -offset : playerDirection === 'north' ? offset : 0;
              const targetTile = { x: curPos.x + backX, y: curPos.y + backY, z: curPos.z };
              if (fState.currentTile.x !== targetTile.x || fState.currentTile.y !== targetTile.y) {
                fState.motionTrack.commit(fState.currentTile, targetTile, now, Math.max(160, curStepDuration));
                fState.lastCommittedTile = { ...fState.currentTile };
                fState.currentTile = { ...targetTile };
              }
              fState.direction = playerDirection;
            }
          }
          wasTrainingAtDummy = false;
        }

        if (!Number.isFinite(currentPixelX) || !Number.isFinite(currentPixelY)) {
          currentPixelX = curPos.x * TILE_SIZE + 16;
          currentPixelY = curPos.y * TILE_SIZE + 16;
        }

        // 3. Camera smoothly follows interpolated player position with scale matching user zoom preference
        const cameraScale = 2 * getZoomMultiplier();
        const screenW = Number.isFinite(app.screen.width) && app.screen.width > 0 ? app.screen.width : (typeof window !== 'undefined' ? window.innerWidth : 1920);
        const screenH = Number.isFinite(app.screen.height) && app.screen.height > 0 ? app.screen.height : (typeof window !== 'undefined' ? window.innerHeight : 1080);
        const targetCamX = screenW / 2 - currentPixelX * cameraScale;
        const targetCamY = screenH / 2 - currentPixelY * cameraScale;
        if (!camInitialized || !Number.isFinite(smoothCamX) || !Number.isFinite(smoothCamY)) {
          smoothCamX = targetCamX;
          smoothCamY = targetCamY;
          camInitialized = true;
        } else {
          const lerpFactor = 1 - Math.exp(-Math.max(0, app.ticker.deltaMS) / 80);
          smoothCamX += (targetCamX - smoothCamX) * lerpFactor;
          smoothCamY += (targetCamY - smoothCamY) * lerpFactor;
        }
        if (!Number.isFinite(smoothCamX)) smoothCamX = targetCamX;
        if (!Number.isFinite(smoothCamY)) smoothCamY = targetCamY;
        world.scale.set(cameraScale);
        world.position.set(Math.round(smoothCamX), Math.round(smoothCamY));

        // Clean up removed actor views (local player, squad followers, ambient, and remote players)
        const validActorIds = new Set<string>();
        if (localChar) {
          validActorIds.add(localChar.id);
        }
        if (squadFollowEnabled) {
          followers.forEach((f) => validActorIds.add(f.id));
        }
        AMBIENT_THAIS_PLAYERS.forEach((p) => validActorIds.add(p.id));

        const myCharIdVal = localChar?.id;
        const myCharNameVal = localChar?.name?.toLowerCase();
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

        // 4. Update local player character: authentic Tibia walk cycle synchronized with tile movement
        if (localChar) {
          const view = ensureActorView(localChar);
          if (view) {
            const charPixelX = currentPixelX;
            const charPixelY = currentPixelY;
            const charDirection = playerDirection;
            const charIsMoving = isMoving || Boolean(curWalk);

            view.sprite.scale.x = 1;
            const isMounted = Boolean(localChar.mountActive && localChar.mount && localChar.mount !== 'none');
            const outfitKey = localChar.outfit || localChar.vocation || 'Knight';
            const colors = localChar.outfitColors || { head: 0, primary: 86, secondary: 114, detail: 76 };
            const charGender = localChar.gender === 'female' ? 'female' : 'male';
            const addons = (localChar as any).addons || (localChar as any).outfitAddons || 0;

            const outfitSig = `${outfitKey}_${charGender}_${isMounted ? (localChar.mount || 'none') : 'none'}_${addons}_${colors.head}_${colors.primary}_${colors.secondary}_${colors.detail}`;

            const desiredAppearance: CityActorAppearance = {
              outfitKey,
              charGender,
              colors,
              addons,
              mount: localChar.mount,
              isMounted,
              outfitSig,
            };

            // Check full readiness of desired appearance across all directions and frames (Codex point 4)
            const desiredCheck = isAppearanceFullyReady(
              outfitKey,
              charGender,
              colors,
              addons,
              localChar.mount,
              isMounted
            );
            const isDesiredReady = desiredCheck.ready;

            if (!view.activeAppearance) {
              // Initial appearance setup on join/hydration
              view.activeAppearance = desiredAppearance;
              view.lastOutfitSignature = outfitSig;
              prepareAppearanceCanvas(
                outfitKey,
                charGender,
                colors,
                addons,
                localChar.mount,
                isMounted,
                {
                  directions: ['south', 'east', 'north', 'west'],
                  characterId: localChar.id,
                }
              ).catch(() => {});
            } else if (view.activeAppearance.outfitSig !== outfitSig) {
              // User has switched outfit, mount, addons, or colors!
              // Implement explicit preparation states: idle | preparing | ready | failed (Codex point 2)
              if (!view.appearanceState || view.appearanceState.outfitSig !== outfitSig) {
                const targetAttemptId = outfitDiagnostics.getLastSaveAttempt()?.attemptId || outfitDiagnostics.getCurrentAttempt()?.attemptId;
                view.appearanceState = {
                  status: 'preparing',
                  outfitSig,
                  target: desiredAppearance,
                  attempts: 1,
                  lastAttemptTime: now,
                  missingAssets: [],
                  attemptId: targetAttemptId,
                };
                view.pendingAppearance = desiredAppearance;

                outfitDiagnostics.recordPreparation({
                  status: 'preparing',
                  totalFramesRequested: desiredCheck.total || 36,
                  cachedFramesCount: desiredCheck.cached || 0,
                  missingAssets: [],
                  missingFrames: desiredCheck.missing || [],
                  attemptsCount: 1,
                }, targetAttemptId);

                const thisSig = outfitSig;
                const prepStart = Date.now();
                prepareAppearanceCanvas(
                  outfitKey,
                  charGender,
                  colors,
                  addons,
                  localChar.mount,
                  isMounted,
                  {
                    directions: ['south', 'east', 'north', 'west'],
                    attemptId: targetAttemptId,
                    characterId: localChar.id,
                  }
                ).then((res) => {
                  if (view.appearanceState && view.appearanceState.outfitSig === thisSig) {
                    const missingFrames = res.missingAssets.filter((a) => !a.startsWith('/') && !a.startsWith('http'));
                    const missingUrls = res.missingAssets.filter((a) => a.startsWith('/') || a.startsWith('http'));
                    if (res.success) {
                      view.appearanceState.status = 'ready';
                      view.appearanceState.missingAssets = [];
                      outfitDiagnostics.recordPreparation({
                        status: 'ready',
                        success: true,
                        durationMs: Date.now() - prepStart,
                        totalFramesRequested: res.totalFramesRequested,
                        cachedFramesCount: res.cachedFramesCount,
                        manifest: res.manifest,
                        resources: res.resources,
                        uncompositedFrames: res.uncompositedFrames,
                        missingAssets: [],
                        missingFrames: [],
                        attemptsCount: 1,
                      }, targetAttemptId);
                    } else {
                      view.appearanceState.status = 'failed';
                      view.appearanceState.missingAssets = res.missingAssets;
                      outfitDiagnostics.recordPreparation({
                        status: 'failed',
                        success: false,
                        durationMs: Date.now() - prepStart,
                        totalFramesRequested: res.totalFramesRequested,
                        cachedFramesCount: res.cachedFramesCount,
                        manifest: res.manifest,
                        resources: res.resources,
                        uncompositedFrames: res.uncompositedFrames,
                        missingAssets: missingUrls,
                        missingFrames: missingFrames,
                        attemptsCount: 1,
                      }, targetAttemptId);
                      console.warn(
                        `[ThaisCityArena] Appearance preparation failed for ${thisSig}. Blocking assets: ${res.missingAssets.join(', ')}`
                      );
                    }
                  }
                }).catch((err) => {
                  if (view.appearanceState && view.appearanceState.outfitSig === thisSig) {
                    view.appearanceState.status = 'failed';
                    view.appearanceState.missingAssets = [err?.message || 'unknown-error'];
                    outfitDiagnostics.recordPreparation({
                      status: 'failed',
                      success: false,
                      durationMs: Date.now() - prepStart,
                      missingAssets: [err?.message || 'unknown-error'],
                      missingFrames: [],
                      attemptsCount: 1,
                    }, targetAttemptId);
                  }
                });
              } else if (view.appearanceState.status === 'failed') {
                // Controlled retry: if failed, retry after 1500ms cooldown (up to 4 attempts)
                if (now - view.appearanceState.lastAttemptTime > 1500 && view.appearanceState.attempts < 4) {
                  view.appearanceState.attempts++;
                  view.appearanceState.lastAttemptTime = now;
                  view.appearanceState.status = 'preparing';
                  const curAttempt = view.appearanceState.attempts;
                  const thisSig = outfitSig;
                  const retryStart = Date.now();
                  const targetAttemptId = view.appearanceState.attemptId;

                  outfitDiagnostics.recordPreparation({
                    status: 'preparing',
                    attemptsCount: curAttempt,
                    totalFramesRequested: desiredCheck.total || 36,
                    cachedFramesCount: desiredCheck.cached || 0,
                    missingFrames: desiredCheck.missing || [],
                  }, targetAttemptId);

                  prepareAppearanceCanvas(
                    outfitKey,
                    charGender,
                    colors,
                    addons,
                    localChar.mount,
                    isMounted,
                    {
                      directions: ['south', 'east', 'north', 'west'],
                      attemptId: targetAttemptId,
                      characterId: localChar.id,
                    }
                  ).then((res) => {
                    if (view.appearanceState && view.appearanceState.outfitSig === thisSig) {
                      const missingFrames = res.missingAssets.filter((a) => !a.startsWith('/') && !a.startsWith('http'));
                      const missingUrls = res.missingAssets.filter((a) => a.startsWith('/') || a.startsWith('http'));
                      if (res.success) {
                        view.appearanceState.status = 'ready';
                        view.appearanceState.missingAssets = [];
                        outfitDiagnostics.recordPreparation({
                          status: 'ready',
                          success: true,
                          durationMs: Date.now() - retryStart,
                          totalFramesRequested: res.totalFramesRequested,
                          cachedFramesCount: res.cachedFramesCount,
                          missingAssets: [],
                          missingFrames: [],
                          attemptsCount: curAttempt,
                        }, targetAttemptId);
                      } else {
                        view.appearanceState.status = 'failed';
                        view.appearanceState.missingAssets = res.missingAssets;
                        outfitDiagnostics.recordPreparation({
                          status: 'failed',
                          success: false,
                          durationMs: Date.now() - retryStart,
                          totalFramesRequested: res.totalFramesRequested,
                          cachedFramesCount: res.cachedFramesCount,
                          missingAssets: missingUrls,
                          missingFrames: missingFrames,
                          attemptsCount: curAttempt,
                        }, targetAttemptId);
                        console.warn(
                          `[ThaisCityArena] Appearance retry ${curAttempt}/4 failed for ${thisSig}. Missing: ${res.missingAssets.join(', ')}`
                        );
                      }
                    }
                  }).catch((err) => {
                    if (view.appearanceState && view.appearanceState.outfitSig === thisSig) {
                      view.appearanceState.status = 'failed';
                      view.appearanceState.missingAssets = [err?.message || 'unknown-error'];
                      outfitDiagnostics.recordPreparation({
                        status: 'failed',
                        success: false,
                        durationMs: Date.now() - retryStart,
                        missingAssets: [err?.message || 'unknown-error'],
                        missingFrames: [],
                        attemptsCount: curAttempt,
                        error: err?.message || String(err),
                      }, targetAttemptId);
                      console.error(`[ThaisCityArena] Appearance retry ${curAttempt}/4 exception for ${thisSig}:`, err);
                    }
                  });
                }
              }

              // ATOMIC APPEARANCE SWAP:
              // Swap only when the complete appearance (all 4 directions and walk frames) is fully ready,
              // or on max retry threshold, ensuring turning and walking immediately never freeze or drop addons.
              const canSwap = isDesiredReady || view.appearanceState?.status === 'ready' || (view.appearanceState && view.appearanceState.attempts >= 4);
              if (canSwap) {
                console.log('[ThaisCityArena] APPEARANCE SWAPPED SUCCESSFULLY to:', outfitSig);
                view.activeAppearance = desiredAppearance;
                view.pendingAppearance = null;
                view.appearanceState = undefined;
                view.lastOutfitSignature = outfitSig;
                view.lastCanvas = undefined;
                view.lastTextureKey = ''; // Force immediate texture rebind to new appearance
              }

              outfitDiagnostics.recordArenaState({
                reactCharOutfit: localChar.outfit,
                reactCharMount: localChar.mount,
                reactCharMountActive: localChar.mountActive,
                reactCharAddons: (localChar as any).addons || (localChar as any).outfitAddons,
                arenaActiveAppearanceSig: view.activeAppearance?.outfitSig,
                arenaPendingAppearanceSig: view.pendingAppearance?.outfitSig,
                arenaAppearanceStatus: view.appearanceState?.status || (view.activeAppearance?.outfitSig === outfitSig ? 'ready' : 'idle'),
                pixiTextureKey: view.lastTextureKey,
              }, view.appearanceState?.attemptId || outfitDiagnostics.getLastSaveAttempt()?.attemptId);
            } else {
              view.pendingAppearance = null;
              view.appearanceState = undefined;
              outfitDiagnostics.recordArenaState({
                reactCharOutfit: localChar.outfit,
                reactCharMount: localChar.mount,
                reactCharMountActive: localChar.mountActive,
                reactCharAddons: (localChar as any).addons || (localChar as any).outfitAddons,
                arenaActiveAppearanceSig: view.activeAppearance?.outfitSig,
                arenaPendingAppearanceSig: undefined,
                arenaAppearanceStatus: 'ready',
                pixiTextureKey: view.lastTextureKey,
              }, outfitDiagnostics.getLastSaveAttempt()?.attemptId || outfitDiagnostics.getCurrentAttempt()?.attemptId);
            }

            // Current rendered appearance (seamlessly preserves previous complete appearance while new one preloads)
            const curApp = view.activeAppearance || desiredAppearance;
            const normOutfit = normalizeOutfitId(curApp.outfitKey);
            const caps = getOutfitCapabilities(normOutfit);
            const walkCycleDuration = Math.max(160, curStepDuration * 2);
            const cyclePhase = (now % walkCycleDuration) / walkCycleDuration;
            const isAttacking = now < lastAttackPoseUntil;
            const charWalkFrame = charIsMoving
              ? (caps.maxFrames <= 3 ? (1 + (Math.floor(cyclePhase * 2) % 2)) : (1 + (Math.floor(cyclePhase * 8) % 8)))
              : 0;

            const safeFrame = caps.maxFrames <= 3
              ? (charWalkFrame === 0 ? 0 : ((Math.abs(charWalkFrame) - 1) % 2) + 1)
              : Math.max(0, Math.min(8, charWalkFrame));
            const effectiveAddons = (caps.hasAddon1 ? (curApp.addons & 1) : 0) | (caps.hasAddon2 ? (curApp.addons & 2) : 0);
            const effectiveMounted = curApp.isMounted && caps.hasMountRider;

            const textureKey = getCanvasCacheKey(
              normOutfit,
              curApp.charGender,
              charDirection as any,
              safeFrame,
              curApp.colors,
              effectiveAddons,
              curApp.mount,
              effectiveMounted
            );
            const isCached = isOutfitCanvasCached(
              curApp.outfitKey,
              curApp.charGender,
              charDirection as any,
              safeFrame,
              curApp.colors,
              curApp.addons,
              curApp.mount,
              curApp.isMounted
            );
            if (view.lastTextureKey !== textureKey || !isCached) {
              const canvas = getRecoloredCanvasSync(
                curApp.outfitKey,
                curApp.charGender,
                charDirection as any,
                safeFrame,
                curApp.colors,
                curApp.addons,
                curApp.mount,
                curApp.isMounted
              );
              if (canvas) {
                if (view.lastCanvas !== canvas || view.lastTextureKey !== textureKey) {
                  view.lastCanvas = canvas;
                if (isCached) {
                  view.lastTextureKey = textureKey;
                }
                  const tex = Texture.from(canvas);
                  tex.source.style.scaleMode = 'nearest';
                  (tex.source as any).update?.();
                  view.sprite.texture = tex;
                }
                view.lastUrl = 'canvas';
              } else if (view.lastCanvas) {
                // PRESERVE PREVIOUS COMPLETE APPEARANCE: keep previous valid canvas texture
                view.lastUrl = 'canvas';
              } else {
                // Emergency initial fallback: unmounted frame or base sprite
                const nextUrl = getOutfitFrameUrl(curApp.outfitKey, charDirection, safeFrame);
                if (nextUrl && loaded[nextUrl]) {
                  view.sprite.texture = loaded[nextUrl];
                  view.lastUrl = nextUrl;
                  view.lastTextureKey = nextUrl;
                } else {
                  const f0Url = getOutfitFrameUrl(curApp.outfitKey, 'south', 0);
                  if (f0Url && loaded[f0Url]) {
                    view.sprite.texture = loaded[f0Url];
                    view.lastUrl = f0Url;
                    view.lastTextureKey = f0Url;
                  }
                }
              }
            }

            view.root.position.set(charPixelX, charPixelY);
            view.root.zIndex = charPixelY;
            const rawLatestTitle = latestRef.current.adminTitle;
            const rawLocalTitle = (localChar as any)?.adminTitle;
            const cleanLatest = (rawLatestTitle && rawLatestTitle !== 'null' && rawLatestTitle !== 'undefined') ? rawLatestTitle : undefined;
            const cleanLocal = (rawLocalTitle && rawLocalTitle !== 'null' && rawLocalTitle !== 'undefined') ? rawLocalTitle : undefined;
            const effectiveAdminTitle = (cleanLatest === 'GOD' || cleanLatest === 'GM') ? cleanLatest : (cleanLocal === 'GOD' || cleanLocal === 'GM') ? cleanLocal : undefined;
            updateNameplate(view, localChar.name, effectiveAdminTitle);
            const hpRatio = localChar.maxHp > 0 ? Math.max(0, Math.min(1, localChar.currentHp / localChar.maxHp)) : 1;
            view.bar.clear()
              .rect(-creatureVisualLayout.hpBarWidth / 2, creatureVisualLayout.hpBarY, creatureVisualLayout.hpBarWidth, 3)
              .fill({ color: 0x251010 })
              .rect(-creatureVisualLayout.hpBarWidth / 2, creatureVisualLayout.hpBarY, creatureVisualLayout.hpBarWidth * hpRatio, 3)
              .fill({ color: 0x4fc977 });

            // Animate attack if training at dummy or executing combat action
            if (isAttacking) {
              const nudge = charDirection === 'east' ? { x: 3, y: 0 }
                : charDirection === 'west' ? { x: -3, y: 0 }
                : charDirection === 'north' ? { x: 0, y: -3 }
                : { x: 0, y: 3 };
              view.sprite.x = creatureVisualLayout.spriteOffsetX + nudge.x;
              view.sprite.y = creatureVisualLayout.spriteOffsetY + nudge.y;
            } else {
              view.sprite.x = creatureVisualLayout.spriteOffsetX;
              view.sprite.y = creatureVisualLayout.spriteOffsetY;
            }
          }
        }

        // 4c. Update Squad Follower characters in City (Fila Indiana)
        if (squadFollowEnabled && followers.length > 0) {
          for (const fChar of followers) {
            const fState = followerVisualStates.get(fChar.id);
            if (!fState) continue;

            const fSample = fState.motionTrack.sample(now);
            const fPixelX = fSample.renderPosition.x * TILE_SIZE + 16;
            const fPixelY = fSample.renderPosition.y * TILE_SIZE + 16;
            fState.currentPixelX = fPixelX;
            fState.currentPixelY = fPixelY;
            if (fSample.direction) {
              fState.direction = fSample.direction;
            }
            const fDir = fSample.direction || fState.direction || 'south';
            const fIsMoving = fSample.moving;

            const view = ensureActorView(fChar);
            if (!view) continue;

            const normOutfit = normalizeOutfitId(fChar.outfit || fChar.vocation || 'Knight');
            const caps = getOutfitCapabilities(normOutfit);
            const walkCycleDuration = Math.max(160, curStepDuration * 2);
            const cyclePhase = (now % walkCycleDuration) / walkCycleDuration;
            const fWalkFrame = fIsMoving
              ? (caps.maxFrames <= 3 ? (1 + (Math.floor(cyclePhase * 2) % 2)) : (1 + (Math.floor(cyclePhase * 8) % 8)))
              : 0;

            view.sprite.scale.x = 1;
            const isMounted = Boolean(fChar.mountActive && fChar.mount && fChar.mount !== 'none');
            const outfitKey = fChar.outfit || fChar.vocation || 'Knight';
            const colors = fChar.outfitColors || { head: 0, primary: 86, secondary: 114, detail: 76 };
            const charGender = fChar.gender === 'female' ? 'female' : 'male';
            const addons = (fChar as any).addons || (fChar as any).outfitAddons || 0;

            const outfitSig = `${outfitKey}_${charGender}_${isMounted ? (fChar.mount || 'none') : 'none'}_${addons}_${colors.head}_${colors.primary}_${colors.secondary}_${colors.detail}`;
            if (view.lastOutfitSignature !== outfitSig) {
              view.lastOutfitSignature = outfitSig;
              view.lastTextureKey = '';
              view.lastCanvas = undefined;
              preloadOutfitAllFrames(outfitKey, charGender, colors, addons, fChar.mount, isMounted, fDir as any).catch(() => {});
            }

            const safeFrame = caps.maxFrames <= 3
              ? (fWalkFrame === 0 ? 0 : ((Math.abs(fWalkFrame) - 1) % 2) + 1)
              : Math.max(0, Math.min(8, fWalkFrame));
            const effectiveAddons = (caps.hasAddon1 ? (addons & 1) : 0) | (caps.hasAddon2 ? (addons & 2) : 0);
            const effectiveMounted = isMounted && caps.hasMountRider;

            const textureKey = getCanvasCacheKey(
              normOutfit,
              charGender,
              fDir as any,
              safeFrame,
              colors,
              effectiveAddons,
              fChar.mount,
              effectiveMounted
            );
            const isCached = isOutfitCanvasCached(
              outfitKey,
              charGender,
              fDir as any,
              safeFrame,
              colors,
              addons,
              fChar.mount,
              isMounted
            );
            if (view.lastTextureKey !== textureKey || !isCached) {
              const canvas = getRecoloredCanvasSync(
                outfitKey,
                charGender,
                fDir as any,
                safeFrame,
                colors,
                addons,
                fChar.mount,
                isMounted
              );
              if (canvas) {
                if (view.lastCanvas !== canvas || view.lastTextureKey !== textureKey) {
                  view.lastCanvas = canvas;
                  view.lastTextureKey = textureKey;
                  const tex = Texture.from(canvas);
                  tex.source.style.scaleMode = 'nearest';
                  (tex.source as any).update?.();
                  view.sprite.texture = tex;
                }
                view.lastUrl = 'canvas';
              } else if (view.lastCanvas) {
                // PRESERVE PREVIOUS COMPLETE APPEARANCE: keep previous valid canvas texture
                view.lastUrl = 'canvas';
              } else {
                // Emergency initial fallback: unmounted frame or base sprite
                const nextUrl = getOutfitFrameUrl(outfitKey, fDir, safeFrame);
                if (nextUrl && loaded[nextUrl]) {
                  view.sprite.texture = loaded[nextUrl];
                  view.lastUrl = nextUrl;
                  view.lastTextureKey = nextUrl;
                } else {
                  const f0Url = getOutfitFrameUrl(outfitKey, 'south', 0);
                  if (f0Url && loaded[f0Url]) {
                    view.sprite.texture = loaded[f0Url];
                    view.lastUrl = f0Url;
                    view.lastTextureKey = f0Url;
                  }
                }
              }
            }

            view.root.position.set(fPixelX, fPixelY);
            view.root.zIndex = fPixelY;
            view.root.visible = curPos.z === fState.currentTile.z && latestRef.current.isCharacterVisible !== false;
            updateNameplate(view, fChar.name, (fChar as any).adminTitle);
            const hpRatio = fChar.maxHp > 0 ? Math.max(0, Math.min(1, fChar.currentHp / fChar.maxHp)) : 1;
            view.bar.clear()
              .rect(-creatureVisualLayout.hpBarWidth / 2, creatureVisualLayout.hpBarY, creatureVisualLayout.hpBarWidth, 3)
              .fill({ color: 0x251010 })
              .rect(-creatureVisualLayout.hpBarWidth / 2, creatureVisualLayout.hpBarY, creatureVisualLayout.hpBarWidth * hpRatio, 3)
              .fill({ color: 0x4fc977 });
            const fIsAttacking = (remoteAttackPoseUntilMap.get(fChar.id) ?? 0) > now;
            if (fIsAttacking) {
              const nudge = fDir === 'east' ? { x: 3, y: 0 }
                : fDir === 'west' ? { x: -3, y: 0 }
                : fDir === 'north' ? { x: 0, y: -3 }
                : { x: 0, y: 3 };
              view.sprite.x = creatureVisualLayout.spriteOffsetX + nudge.x;
              view.sprite.y = creatureVisualLayout.spriteOffsetY + nudge.y;
            } else {
              view.sprite.x = creatureVisualLayout.spriteOffsetX;
              view.sprite.y = creatureVisualLayout.spriteOffsetY;
            }
          }
        }

        // 4b. Process Combat Visual Events in City (Dummy training wand missiles & hits, combat events)
        const incomingVisuals = latestRef.current.visualEvents;
        if (incomingVisuals && incomingVisuals.length > 0) {
          lastProcessedVisualEvents = incomingVisuals;
          const activeChar = latestRef.current.characters.find((c) => c.id === latestRef.current.activeCharacterId);
          const dummyPos = latestRef.current.trainingDummyPos ||
            ((activeChar as any)?.training?.dummyId
              ? (THAIS_TRAINING_DUMMIES.find((d) => d.id === (activeChar as any)?.training?.dummyId)?.position ?? THAIS_TRAINING_DUMMIES[0].position)
              : (thaisData.trainingDummy ?? THAIS_TRAINING_DUMMIES[0].position));
          for (const ev of incomingVisuals) {
            const evId = getStableEventId(ev);
            if (processedCityEventIds.has(evId)) continue;
            processedCityEventIds.add(evId);
            if (processedCityEventIds.size > 2000) {
              const toDel = Array.from(processedCityEventIds).slice(0, 1000);
              toDel.forEach((id) => processedCityEventIds.delete(id));
            }
            if (ev.type === 'projectile-launched') {
              const mMapping = fxAssets.missiles[String(ev.projectileId)];
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
              const fxMapping = fxAssets.effects[String(ev.effectId)];
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
                    frames: fxMapping.frames.map((f: { publicUrl: string }) => f.publicUrl),
                  });
                }
              }
            } else if ((ev as any).type === 'spell-visual' || (ev as any).type === 'heal-applied' || (ev as any).type === 'spell' || (ev as any).type === 'spell-cast') {
              const projectileId = 'projectileId' in ev && typeof (ev as any).projectileId === 'number'
                ? (ev as any).projectileId
                : 'projectileId' in ev && (ev as any).projectileId === 'weapon-type' ? 24 : null;
              if (projectileId) {
                const mMapping = fxAssets.missiles[String(projectileId)];
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
                const fxMapping = fxAssets.effects[String(effectId)];
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
                      frames: fxMapping.frames.map((f: { publicUrl: string }) => f.publicUrl),
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
              const sourceCharId = (ev as any).sourceId;
              const fState = sourceCharId ? followerVisualStates.get(sourceCharId) : null;
              const sourceTile = fState
                ? { x: fState.currentTile.x, y: fState.currentTile.y }
                : {
                    x: Math.floor(currentPixelX / TILE_SIZE),
                    y: Math.floor(currentPixelY / TILE_SIZE),
                  };

              if (sourceCharId && sourceCharId !== localChar?.id) {
                remoteAttackPoseUntilMap.set(sourceCharId, now + 250);
              } else {
                lastAttackPoseUntil = now + 250;
              }

              triggerTrainingVisual(
                sourceTile.x,
                sourceTile.y,
                dummyPos.x,
                dummyPos.y,
                ev.projectileId,
                ev.effectId,
                now
              );
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
            if (vis.frames && vis.frames.length > 0) {
              const frameIdx = Math.min(
                vis.frames.length - 1,
                Math.floor(progress * vis.frames.length)
              );
              const frameUrl = vis.frames[frameIdx];
              const tex = atlasTextures[frameUrl] || loaded[frameUrl];
              if (tex && 'texture' in vis.root) {
                (vis.root as InstanceType<typeof Sprite>).texture = tex;
              }
            }
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
            const tex = atlasTextures[frameUrl] || loaded[frameUrl];
            if (tex && 'texture' in vis.root) {
              (vis.root as InstanceType<typeof Sprite>).texture = tex;
            } else if (!tex && frameUrl) {
              void Assets.load<PixiTexture>(frameUrl).then((t) => {
                if (t) {
                  t.source.style.scaleMode = 'nearest';
                  loaded[frameUrl] = t;
                  if ('texture' in vis.root) (vis.root as any).texture = t;
                }
              });
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

            const colors = (p.outfit && typeof p.outfit.lookBody === 'number' && p.outfit.lookBody >= 0)
              ? {
                  head: p.outfit.lookHead ?? 0,
                  primary: p.outfit.lookBody,
                  secondary: p.outfit.lookLegs ?? 0,
                  detail: p.outfit.lookFeet ?? 0,
                }
              : { head: 0, primary: 86, secondary: 114, detail: 76 };

            const rAddons = Number(p.outfit?.addons ?? (p as any).outfitAddons ?? (p as any).addons ?? 0);
            const rGender: 'male' | 'female' = p.gender === 'female' ? 'female' : 'male';
            const rMounted = Boolean(p.mountActive && p.mount && p.mount !== 'none');
            const rDir = p.direction || 'south';

            const view = ensureActorView({
              id: p.id,
              name: p.name,
              vocation: outfitKey,
              outfit: outfitKey,
              gender: rGender,
              outfitColors: colors,
              mount: p.mount,
              mountActive: p.mountActive,
              addons: rAddons,
              outfitAddons: rAddons,
              adminTitle: p.adminTitle,
              x: p.x,
              y: p.y,
            });
            if (!view) return;

            const appearanceSig = `${outfitKey}_${rGender}_${rMounted ? (p.mount || 'none') : 'none'}_${rAddons}_${colors.head}_${colors.primary}_${colors.secondary}_${colors.detail}`;
            if (view.lastOutfitSignature !== appearanceSig) {
              view.lastOutfitSignature = appearanceSig;
              view.lastTextureKey = undefined;
              preloadOutfitAllFrames(outfitKey, rGender, colors, rAddons, p.mount, rMounted, rDir as any).catch(() => {});
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

            const rNormOutfit = normalizeOutfitId(outfitKey);
            const rCaps = getOutfitCapabilities(rNormOutfit);
            const rWalkCycleDuration = 400;
            const rCyclePhase = (now % rWalkCycleDuration) / rWalkCycleDuration;
            const rIsAttacking = (remoteAttackPoseUntilMap.get(p.id) ?? 0) > now;
            const rWalkFrame = isMoving
              ? (rCaps.maxFrames <= 3 ? (1 + (Math.floor(rCyclePhase * 2) % 2)) : (1 + (Math.floor(rCyclePhase * 8) % 8)))
              : (rIsAttacking ? 1 : 0);
            const rSafeFrame = rCaps.maxFrames <= 3
              ? (rWalkFrame === 0 ? 0 : ((Math.abs(rWalkFrame) - 1) % 2) + 1)
              : Math.max(0, Math.min(8, rWalkFrame));

            const textureKey = colors
              ? getCanvasCacheKey(rNormOutfit, rGender, dir as any, rSafeFrame, colors, rAddons, p.mount, rMounted)
              : `${outfitKey}_${rGender}_${dir}_${rSafeFrame}`;

            const isCached = colors
              ? isOutfitCanvasCached(outfitKey, rGender, dir as any, rSafeFrame, colors, rAddons, p.mount, rMounted)
              : true;

            if (view.lastTextureKey !== textureKey || !isCached) {
              let updated = false;
              if (colors) {
                const canvas = getRecoloredCanvasSync(outfitKey, rGender, dir as any, rSafeFrame, colors, rAddons, p.mount, rMounted);
                if (canvas) {
                  if (view.lastCanvas !== canvas || view.lastTextureKey !== textureKey) {
                    view.lastCanvas = canvas;
                    const tex = Texture.from(canvas);
                    tex.source.style.scaleMode = 'nearest';
                    (tex.source as any).update?.();
                    view.sprite.texture = tex;
                  }
                  if (isCached) {
                    view.lastTextureKey = textureKey;
                  }
                  view.lastUrl = 'canvas';
                  updated = true;
                } else {
                  preloadOutfitAllFrames(outfitKey, rGender, colors, rAddons, p.mount, rMounted, dir as any).catch(() => {});
                }
              }
              if (!updated && !rMounted) {
                const url = getOutfitFrameUrl(outfitKey, dir, rSafeFrame);
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
            updateNameplate(view, p.name, p.adminTitle);
            const curHp = p.hp ?? 100;
            const maxHp = p.maxHp ?? 100;
            const hpRatio = maxHp > 0 ? Math.max(0, Math.min(1, curHp / maxHp)) : 1;
            view.bar.clear()
              .rect(-creatureVisualLayout.hpBarWidth / 2, creatureVisualLayout.hpBarY, creatureVisualLayout.hpBarWidth, 3)
              .fill({ color: 0x251010 })
              .rect(-creatureVisualLayout.hpBarWidth / 2, creatureVisualLayout.hpBarY, creatureVisualLayout.hpBarWidth * hpRatio, 3)
              .fill({ color: 0x4fc977 });

            if (rIsAttacking) {
              const rNudge = dir === 'east' ? { x: 3, y: 0 }
                : dir === 'west' ? { x: -3, y: 0 }
                : dir === 'north' ? { x: 0, y: -3 }
                : { x: 0, y: 3 };
              view.sprite.x = creatureVisualLayout.spriteOffsetX + rNudge.x;
              view.sprite.y = creatureVisualLayout.spriteOffsetY + rNudge.y;
            } else {
              view.sprite.x = creatureVisualLayout.spriteOffsetX;
              view.sprite.y = creatureVisualLayout.spriteOffsetY;
            }
          });
        }

        // 7. Update overhead speech messages in city (Yellow for local, Blue for world)
        const speeches = latestRef.current.overheadMessages;
        if (speeches && speeches.length > 0) {
          for (const sp of speeches) {
            if (processedSpeechIds.has(sp.id)) continue;
            processedSpeechIds.add(sp.id);

            let targetView: CityActorView | null = null;
            const myLeader = localChar || curChars[0];
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
