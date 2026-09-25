'use client';

import { useEffect, useRef } from 'react';
import '@/apps/web/lib/pixiPolyfill';
import visualAssetsJson from '@/content/generated/tibia1098-combat-assets.json';
import { RUNE_PROJECTILE_FLIGHT_MS, getPvPTierInfo, type CardinalDirection, type GameState, type GridPosition } from '@/packages/domain/src';
import { creatureVisualLayout, desiredWorldCamera, smoothWorldCamera, snapWorldCoordinate, VisualMotionTrack, visualMovementConfig, type WorldCameraState } from '@/packages/presentation/src';
import type { Tibia1098AssetManifest, VisualAssetMapping } from '@/packages/tibia1098-assets/src/types';
import type { Application, Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import { ALL_SPELL_ICON_URLS, resolveActionImagePath } from './Tibia11ActionIcon';
import { getCanvasCacheKey, getRecoloredCanvasSync, isOutfitCanvasCached, normalizeOutfitId, preloadOutfitAllFrames } from '@/apps/web/lib/outfitRecolor';
import { getZoomMultiplier, onZoomChange } from '@/apps/web/lib/zoomManager';
import { playPhysicalAttack, playMagicSpell, playPlayerDeath } from '@/apps/web/lib/soundEffects';
import { destroyVisualNode, safelyDestroyPixiApp } from '@/apps/web/lib/pixiMemorySafety';
import { ESSENTIAL_COMBAT_EFFECT_IDS, ESSENTIAL_COMBAT_MISSILE_IDS } from '@/apps/web/lib/huntAssetPreloader';

interface PixiArenaProps {
  game: GameState;
  debug: boolean;
  active?: boolean;
  isCharacterVisible?: boolean;
  adminTitle?: string | null;
  onSelectTarget?: (enemyId: string) => void;
  onCharacterContextMenu?: (characterId: string, x: number, y: number) => void;
  onSceneReady?: () => void;
}
interface ActorView {
  root: Container;
  sprite: Sprite;
  label: Text;
  titleLabel?: Text;
  skullSprite?: Sprite;
  debugLabel: Text;
  bar: Graphics;
  aura: Graphics;
  track: VisualMotionTrack;
  mapping: VisualAssetMapping;
  lastFrameUrl: string;
  lastCanvas?: HTMLCanvasElement;
  lastOutfitSig?: string;
  attackUntil: number;
}
interface TimedVisual { root: Container | Sprite | Text; sprite?: Sprite; startedAt: number; durationMs: number; kind: 'float' | 'effect' | 'missile'; from?: GridPosition; to?: GridPosition; frames?: string[]; }
interface PendingImpact { targetId: string; amount: number; impactAt: number; element?: string }

export interface CombatTextColor {
  fill: number;
  stroke: number;
}

export function getCombatTextColor(element?: string, isHealing?: boolean): CombatTextColor {
  if (isHealing || element === 'healing') {
    return { fill: 0x62e58a, stroke: 0x072611 }; // Cura: Verde claro com borda escura
  }
  if (element === 'mana') {
    return { fill: 0x3399ff, stroke: 0x051a33 }; // Mana: Azul cobalto
  }
  switch (element?.toLowerCase()) {
    case 'fire':
      return { fill: 0xff8800, stroke: 0x331100 }; // Fogo: Laranja incandescente
    case 'energy':
      return { fill: 0x00e6e6, stroke: 0x002b2b }; // Energia: Ciano elétrico
    case 'earth':
    case 'poison':
      return { fill: 0x2cd92c, stroke: 0x062b06 }; // Terra / Veneno: Verde vibrante
    case 'ice':
      return { fill: 0x66ccff, stroke: 0x0a2638 }; // Gelo: Azul celeste gélido
    case 'holy':
      return { fill: 0xffea33, stroke: 0x383300 }; // Sagrado: Amarelo solar dourado
    case 'death':
      return { fill: 0xb84dff, stroke: 0x240638 }; // Morte: Roxo / Violeta profundo
    case 'physical':
    default:
      return { fill: 0xff4444, stroke: 0x1a0504 }; // Físico: Vermelho clássico
  }
}

const visualAssets = visualAssetsJson as unknown as Tibia1098AssetManifest;
const TILE_SIZE = 32;

function baseVocation(vocation: string): 'Knight' | 'Paladin' | 'Sorcerer' | 'Druid' | 'Sire' {
  if (vocation.includes('Sire')) return 'Sire';
  if (vocation.includes('Knight')) return 'Knight';
  if (vocation.includes('Paladin')) return 'Paladin';
  if (vocation.includes('Sorcerer')) return 'Sorcerer';
  return 'Druid';
}

function frameUrl(asset: VisualAssetMapping, direction: CardinalDirection, phase: number): string {
  const directional = asset.frames.filter((frame) => frame.direction === direction);
  const frames = directional.length ? directional : asset.frames.filter((frame) => frame.direction === 'south');
  return frames[Math.floor(phase * Math.max(1, frames.length)) % Math.max(1, frames.length)]?.publicUrl ?? asset.frames[0].publicUrl;
}

function projectileDirection(from: GridPosition, to: GridPosition): string {
  const horizontal = to.x === from.x ? '' : to.x > from.x ? 'east' : 'west';
  const vertical = to.y === from.y ? '' : to.y > from.y ? 'south' : 'north';
  return vertical && horizontal ? `${vertical}-${horizontal}` : vertical || horizontal || 'south';
}

export function PixiArena({ game, debug, active = true, isCharacterVisible = true, adminTitle, onSelectTarget, onCharacterContextMenu, onSceneReady }: PixiArenaProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const syncRef = useRef<((state: GameState, showDebug: boolean) => void) | null>(null);
  const resetSceneReadyRef = useRef<(() => void) | null>(null);
  const latestRef = useRef({ game, debug, onSelectTarget, onCharacterContextMenu, active, isCharacterVisible, adminTitle, onSceneReady });
  latestRef.current = { game, debug, onSelectTarget, onCharacterContextMenu, active, isCharacterVisible, adminTitle, onSceneReady };

  useEffect(() => {
    const app = appRef.current;
    if (!app || !app.ticker) return;
    if (active) {
      resetSceneReadyRef.current?.();
      if (!app.ticker.started) app.ticker.start();
      try {
        app.resize();
      } catch {}
      requestAnimationFrame(() => {
        try {
          app.resize();
        } catch {}
      });
    } else {
      if (app.ticker.started) app.ticker.stop();
    }
  }, [active]);

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;
    void (async () => {
      const pixi = await import('pixi.js');
      const { Application, Assets, Container, Graphics, Sprite, Text, Texture } = pixi;
      const app = new Application();
      await app.init({ resizeTo: hostRef.current ?? window, antialias: false, background: 0x080a0b, resolution: Math.min(2, window.devicePixelRatio), autoDensity: true, roundPixels: true });
      if (disposed || !hostRef.current) { app.destroy(true, { children: true }); return; }
      
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
      if (!latestRef.current.active) {
        app.ticker.stop();
      } else {
        if (!app.ticker.started) app.ticker.start();
        try {
          app.resize();
        } catch {}
      }

      const loaded: Record<string, Texture> = {};

      const loadBatch = async (urlList: string[], chunkSize = 35) => {
        for (let i = 0; i < urlList.length; i += chunkSize) {
          if (disposed) break;
          const chunk = urlList.slice(i, i + chunkSize);
          await Promise.allSettled(
            chunk.map(async (url) => {
              if (!url || loaded[url]) return;
              try {
                const texture = await Assets.load<Texture>(url);
                if (texture) {
                  texture.source.style.scaleMode = 'nearest';
                  loaded[url] = texture;
                }
              } catch {}
            })
          );
        }
      };

      const ensureTexture = async (url: string): Promise<Texture | undefined> => {
        if (loaded[url]) return loaded[url];
        try {
          const texture = await Assets.load<Texture>(url);
          if (texture) {
            texture.source.style.scaleMode = 'nearest';
            loaded[url] = texture;
            return texture;
          }
        } catch {}
        return undefined;
      };

      // 1. Load global atlases first (spells, equipment, creatures, combat effects & missiles)
      try {
        const [spellsSheet, equipSheet, creaturesSheet, combatSheet] = await Promise.all([
          Assets.load<any>('/generated/atlases/spells-atlas.json').catch(() => null),
          Assets.load<any>('/generated/atlases/equipment-atlas.json').catch(() => null),
          Assets.load<any>('/generated/atlases/creatures-atlas.json').catch(() => null),
          Assets.load<any>('/generated/atlases/combat-fx-atlas.json').catch(() => null),
        ]);
        if (spellsSheet?.textures) {
          if (spellsSheet.texture?.source?.style) spellsSheet.texture.source.style.scaleMode = 'nearest';
          Object.assign(loaded, spellsSheet.textures);
        }
        if (equipSheet?.textures) {
          if (equipSheet.texture?.source?.style) equipSheet.texture.source.style.scaleMode = 'nearest';
          Object.assign(loaded, equipSheet.textures);
        }
        if (creaturesSheet?.textures) {
          if (creaturesSheet.texture?.source?.style) creaturesSheet.texture.source.style.scaleMode = 'nearest';
          Object.assign(loaded, creaturesSheet.textures);
        }
        if (combatSheet?.textures) {
          if (combatSheet.texture?.source?.style) combatSheet.texture.source.style.scaleMode = 'nearest';
          Object.assign(loaded, combatSheet.textures);
        }
      } catch (err) {
        console.warn('[PixiArena] Global atlas loading caught:', err);
      }

      const getCombatTexture = (url: string, onLoaded?: (tex: Texture) => void): Texture | undefined => {
        if (!url) return undefined;
        if (loaded[url]) return loaded[url];
        const cleanUrl = url.startsWith('/') ? url.slice(1) : url;
        if (loaded[cleanUrl]) return loaded[cleanUrl];
        const leadingSlashUrl = url.startsWith('/') ? url : `/${url}`;
        if (loaded[leadingSlashUrl]) return loaded[leadingSlashUrl];
        const fileName = url.split('/').pop();
        if (fileName && loaded[fileName]) return loaded[fileName];

        try {
          const fromCache = Texture.from(url);
          if (fromCache && fromCache !== Texture.EMPTY) {
            loaded[url] = fromCache;
            return fromCache;
          }
        } catch {}

        void Assets.load<Texture>(url).then((t) => {
          if (t) {
            try {
              if (t.source?.style) t.source.style.scaleMode = 'nearest';
            } catch {}
            loaded[url] = t;
            onLoaded?.(t);
          }
        }).catch(() => {});
        return undefined;
      };

      const loadedHuntAtlases = new Set<string>();
      const loadHuntAtlas = async (huntId?: string) => {
        if (!huntId || loadedHuntAtlases.has(huntId)) return;
        loadedHuntAtlases.add(huntId);
        try {
          const sheet = await Assets.load<any>(`/generated/atlases/hunt-${huntId}-atlas.json`).catch(() => null);
          if (sheet?.textures) {
            if (sheet.texture?.source?.style) sheet.texture.source.style.scaleMode = 'nearest';
            Object.assign(loaded, sheet.textures);
          }
        } catch {}
      };

      if (game.encounter.hunt?.id) {
        await loadHuntAtlas(game.encounter.hunt.id);
      }

      // 2. Gather remaining high-priority immediate assets for current encounter
      const priorityUrls = new Set<string>();

      // Base terrain assets
      for (const assetKey of ['floor', 'caveGround', 'caveWall', 'obstacle', 'entrance', 'exit'] as const) {
        const a = visualAssets.assets[assetKey];
        if (a?.frames) {
          for (const f of a.frames) priorityUrls.add(f.publicUrl);
        }
      }

      // Current room map items: preload missing items not already loaded from atlas
      for (const tile of game.encounter.room.map.tiles) {
        for (const sId of tile.serverItemIds ?? []) {
          const m = visualAssets.mapItems?.[String(sId)];
          if (m?.frame && !loaded[m.frame.publicUrl]) {
            priorityUrls.add(m.frame.publicUrl);
          }
        }
      }

      // Encounter monsters & all hunt species
      for (const enemy of game.encounter.enemies) {
        const mapping = visualAssets.creatures[enemy.monsterId] || ((enemy as any).lookType ? visualAssets.creatures[String((enemy as any).lookType)] : null);
        if (mapping) {
          for (const f of mapping.frames) priorityUrls.add(f.publicUrl);
        }
      }
      if (game.encounter.hunt?.monsters && Array.isArray(game.encounter.hunt.monsters)) {
        for (const mId of game.encounter.hunt.monsters) {
          const clean = mId.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          const mMapping = visualAssets.creatures[mId] || visualAssets.creatures[clean];
          if (mMapping?.frames) {
            for (const f of mMapping.frames) priorityUrls.add(f.publicUrl);
          }
        }
      }

      // Outfits & Vocations
      for (const voc of ['Knight', 'Paladin', 'Sorcerer', 'Druid', 'Sire']) {
        const out = visualAssets.outfits[voc];
        if (out) {
          for (const f of out.frames) priorityUrls.add(f.publicUrl);
        }
      }

      // Spell action icons & mounts
      for (const url of ALL_SPELL_ICON_URLS) priorityUrls.add(url);
      priorityUrls.add('/generated/mounts/donkey_rider_south.png');
      priorityUrls.add('/generated/tibia1098/items/item-5972.png');
      priorityUrls.add('/assets/items/item-3058.png');
      priorityUrls.add('/assets/items/item-3065.png');

      // Core effects & missiles - All essential combat & spell effects loaded in priority
      for (const effId of ESSENTIAL_COMBAT_EFFECT_IDS) {
        const eff = visualAssets.effects[effId];
        if (eff) for (const f of eff.frames) priorityUrls.add(f.publicUrl);
      }
      for (const misId of ESSENTIAL_COMBAT_MISSILE_IDS) {
        const mis = visualAssets.missiles[misId];
        if (mis) for (const f of mis.frames) priorityUrls.add(f.publicUrl);
      }

      await loadBatch(Array.from(priorityUrls), 35);
      if (disposed) { app.destroy(true, { children: true }); return; }

      // Stream remaining map items and creature frames in background without blocking
      void (async () => {
        const backgroundUrls = new Set<string>();
        for (const asset of [
          ...Object.values(visualAssets.creatures || {}),
          ...Object.values(visualAssets.outfits || {}),
          ...Object.values(visualAssets.effects || {}),
          ...Object.values(visualAssets.missiles || {}),
        ]) {
          for (const frame of asset?.frames || []) {
            if (!loaded[frame.publicUrl]) backgroundUrls.add(frame.publicUrl);
          }
        }
        for (const item of [
          ...Object.values(visualAssets.corpses || {}),
          ...Object.values(visualAssets.mapItems || {}),
        ]) {
          if (item?.frame && !loaded[item.frame.publicUrl]) backgroundUrls.add(item.frame.publicUrl);
          if (item?.frames) {
            for (const frame of item.frames) {
              if (!loaded[frame.publicUrl]) backgroundUrls.add(frame.publicUrl);
            }
          }
        }
        await loadBatch(Array.from(backgroundUrls), 40);
      })();

      // Pre-render the 4-tile torch hole stamp
      // Up to 4 tiles (4 * 32px = 128px): 100% transparent (clear vision, zero darkness)
      // 4 to 8 tiles: smooth gradual penumbra falloff
      const holeSize = 560;
      const holeCenter = holeSize / 2;
      const holeRadius = 260;
      const clearRadius = 4 * TILE_SIZE; // exactly 4 tiles = 128px
      const holeCanvas = document.createElement('canvas');
      holeCanvas.width = holeSize;
      holeCanvas.height = holeSize;
      const holeCtx = holeCanvas.getContext('2d')!;
      const holeGrad = holeCtx.createRadialGradient(holeCenter, holeCenter, clearRadius, holeCenter, holeCenter, holeRadius);
      holeGrad.addColorStop(0, 'rgba(0, 0, 0, 1.0)'); // destination-out leaves 0 darkness inside 4 tiles!
      holeGrad.addColorStop(0.45, 'rgba(0, 0, 0, 0.75)');
      holeGrad.addColorStop(0.75, 'rgba(0, 0, 0, 0.35)');
      holeGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
      holeCtx.fillStyle = holeGrad;
      holeCtx.beginPath();
      holeCtx.arc(holeCenter, holeCenter, holeRadius, 0, Math.PI * 2);
      holeCtx.fill();

      // Dynamic darkness canvas for the room
      const darkCanvas = document.createElement('canvas');
      darkCanvas.width = 32;
      darkCanvas.height = 32;
      const darkCtx = darkCanvas.getContext('2d')!;
      const darkTexture = Texture.from(darkCanvas);
      darkTexture.source.style.scaleMode = 'nearest';
      const darkSprite = new Sprite(darkTexture);
      darkSprite.position.set(0, 0);

      const world = new Container();
      const backing = new Container();
      const terrain = new Container();
      const corpses = new Container();
      const actors = new Container();
      const effects = new Container();
      const spatialDebug = new Container();
      const overlay = new Container();
      const targetReticle = new Graphics();
      terrain.sortableChildren = true; corpses.sortableChildren = true; actors.sortableChildren = true; effects.sortableChildren = true;
      world.addChild(backing, terrain, corpses, actors, targetReticle, darkSprite, effects, spatialDebug);
      app.stage.addChild(world, overlay);
      const views = new Map<string, ActorView>();
      const SKULL_PRELOAD_URLS = [
        '/assets/skulls/skull-green.png',
        '/assets/skulls/skull-yellow.png',
        '/assets/skulls/skull-white.png',
        '/assets/skulls/skull-red.png',
        '/assets/skulls/skull-black.png',
        '/assets/skulls/skull-orange.png',
      ];
      const skullTextures: Record<string, Texture> = {};
      for (const url of SKULL_PRELOAD_URLS) {
        const skullKey = url.split('skull-')[1].replace('.png', '');
        const tex = loaded[url];
        if (tex) {
          try {
            if (tex.source?.style) tex.source.style.scaleMode = 'nearest';
          } catch {}
          skullTextures[skullKey] = tex;
        } else {
          void ensureTexture(url).then((loadedTex) => {
            if (loadedTex) {
              try {
                if (loadedTex.source?.style) loadedTex.source.style.scaleMode = 'nearest';
              } catch {}
              skullTextures[skullKey] = loadedTex;
            }
          }).catch(() => {});
        }
      }

      const getCharacterSkull = (char: any): string => {
        if (!char || char.displaySkull === false) return 'none';
        if (char.pvpSkull) return char.pvpSkull;
        const elo = typeof char.pvpElo === 'number' ? char.pvpElo : 0;
        return getPvPTierInfo(elo).skull;
      };

      const updateActorSkull = (view: ActorView, skull?: string, startX?: number, nameW?: number) => {
        if (skull && skull !== 'none') {
          const skullUrl = `/assets/skulls/skull-${skull}.png`;
          const skullTex = skullTextures[skull] || loaded[skullUrl];
          if (skullTex) {
            try {
              if (skullTex.source?.style) skullTex.source.style.scaleMode = 'nearest';
            } catch {}
            if (!view.skullSprite) {
              try {
                view.skullSprite = new Sprite(skullTex);
                view.skullSprite.anchor.set(0, 0.5);
                view.skullSprite.scale.set(1, 1);
                view.skullSprite.roundPixels = true;
                view.root.addChild(view.skullSprite);
              } catch {}
            } else {
              try {
                view.skullSprite.texture = skullTex;
                view.skullSprite.scale.set(1, 1);
                view.skullSprite.visible = true;
              } catch {}
            }
            const sx = (startX !== undefined && nameW !== undefined) ? (startX + nameW + 2) : (view.label.width / 2 + 2);
            if (view.skullSprite) {
              view.skullSprite.position.set(sx, creatureVisualLayout.nameplateY);
            }
          } else {
            void ensureTexture(skullUrl).then((t) => {
              if (t) {
                try {
                  if (t.source?.style) t.source.style.scaleMode = 'nearest';
                } catch {}
                skullTextures[skull] = t;
              }
            }).catch(() => {});
            if (view.skullSprite) view.skullSprite.visible = false;
          }
        } else if (view.skullSprite) {
          view.skullSprite.visible = false;
        }
      };
      const timed: TimedVisual[] = [];
      const pendingImpacts: PendingImpact[] = [];
      let terrainKey = '';
      let activeRoom = '';
      let lastElapsedMs = 0;
      let mapOffsetX = 0;
      let mapOffsetY = 0;
      let camera: WorldCameraState = { x: 0, y: 0, zoom: 1 };
      let cameraInitialized = false;
      let sceneReadyNotified = false;

      resetSceneReadyRef.current = () => {
        sceneReadyNotified = false;
        cameraInitialized = false;
      };

      const worldPoint = (position: { x: number; y: number }) => ({
        x: mapOffsetX + position.x * TILE_SIZE + TILE_SIZE / 2,
        y: mapOffsetY + position.y * TILE_SIZE + TILE_SIZE / 2,
      });

      const rebuildTerrain = (state: GameState, showDebug: boolean) => {
        const key = `${state.encounter.room.definitionId}:${showDebug}`;
        if (key === terrainKey) return;
        terrainKey = key;
        for (const layer of [backing, terrain, corpses, overlay]) layer.removeChildren().forEach((child) => child.destroy({ children: true }));
        mapOffsetX = 0; mapOffsetY = 0;
        const roomW = Math.max(32, state.encounter.room.map.width * TILE_SIZE);
        const roomH = Math.max(32, state.encounter.room.map.height * TILE_SIZE);
        if (darkCanvas.width !== roomW || darkCanvas.height !== roomH) {
          darkCanvas.width = roomW;
          darkCanvas.height = roomH;
          darkTexture.source.resize(roomW, roomH);
        }
        const isRoofItem = (id: number): boolean => {
          return (
            (id >= 6476 && id <= 6488) || // Wooden / thatched roofs
            (id >= 9370 && id <= 9410) || // Yalahar roofs
            (id >= 1098 && id <= 1140)    // Classic clay tile roofs
          );
        };

        const isBorderItem = (id: number): boolean => {
          return (
            (id >= 4542 && id <= 4553) || // Grass-dirt borders
            (id >= 4609 && id <= 4625) || // Water borders
            (id >= 4664 && id <= 4678) || // Sand/gravel/paved borders
            (id >= 8432 && id <= 8445) || // Gravel borders
            (id >= 8345 && id <= 8360) || // Grass edge transitions
            (id >= 8140 && id <= 8160) || // Marble/stone borders
            (id >= 6217 && id <= 6226) || // Walkway borders
            (id >= 6271 && id <= 6274) || // Stone borders
            (id >= 5485 && id <= 5495) || // Foliage borders
            (id >= 3610 && id <= 3623) || // Wood/pavement transitions
            (id >= 7592 && id <= 7602)    // Town transitions
          );
        };

        for (const tile of state.encounter.room.map.tiles) {
          const point = worldPoint(tile.position);
          let groundRendered = false;

          for (const serverId of tile.serverItemIds ?? []) {
            if (isRoofItem(serverId)) {
              continue; // Never render roofs on ground floor Z:7 to reveal house interiors
            }

            const mapping = visualAssets.mapItems?.[String(serverId)];
            if (!mapping) {
              if (debug) console.warn(`Unresolved map item ID ${serverId} on tile (${tile.position.x}, ${tile.position.y})`);
              continue;
            }
            let frameToUse = mapping.frame;
            if (mapping.frames && mapping.frames.length > 1 && mapping.appearance) {
              const px = mapping.appearance.patternX > 1 ? Math.abs(tile.position.x) % mapping.appearance.patternX : 0;
              const py = mapping.appearance.patternY > 1 ? Math.abs(tile.position.y) % mapping.appearance.patternY : 0;
              const matchedFrame = mapping.frames.find((f: any) => f.pattern?.x === px && f.pattern?.y === py) ?? mapping.frames[0];
              if (matchedFrame && loaded[matchedFrame.publicUrl]) frameToUse = matchedFrame;
            }
            if (!frameToUse) continue;
            const tex = loaded[frameToUse.publicUrl];
            const isGround = Boolean(
              serverId === (tile as any).groundServerId ||
              (mapping.appearance as any)?.isGround ||
              (mapping as any).isGround ||
              (serverId >= 100 && serverId <= 450) ||
              (serverId >= 4400 && serverId <= 4550)
            );
            const isBorder = !isGround && isBorderItem(serverId);
            if (isGround) groundRendered = true;

            const wTiles = mapping.appearance?.width ?? Math.max(1, Math.round((tex?.width || frameToUse.width || 32) / 32));
            const hTiles = mapping.appearance?.height ?? Math.max(1, Math.round((tex?.height || frameToUse.height || 32) / 32));
            const tileZIndex = isGround ? 0 : (isBorder ? 1 : (point.y + 16 + (hTiles > 1 ? 16 : 0)));

            if (!tex) {
              const reqUrl = frameToUse.publicUrl;
              void ensureTexture(reqUrl).then((loadedTex) => {
                if (!loadedTex || disposed) return;
                const sprite = new Sprite(loadedTex);
                const texW = loadedTex.width || frameToUse.width || 32;
                const texH = loadedTex.height || frameToUse.height || 32;
                const curWTiles = mapping.appearance?.width ?? Math.max(1, Math.round(texW / 32));
                const curHTiles = mapping.appearance?.height ?? Math.max(1, Math.round(texH / 32));
                sprite.anchor.set(0, 0);
                sprite.position.set(
                  point.x - 16 - (curWTiles - 1) * 32,
                  point.y - 16 - (curHTiles - 1) * 32
                );
                sprite.roundPixels = true;
                sprite.zIndex = tileZIndex;
                terrain.addChild(sprite);
              });
              continue;
            }
            const sprite = new Sprite(tex);
            sprite.anchor.set(0, 0);
            sprite.position.set(
              point.x - 16 - (wTiles - 1) * 32,
              point.y - 16 - (hTiles - 1) * 32
            );
            sprite.roundPixels = true;
            sprite.zIndex = tileZIndex;
            terrain.addChild(sprite);
          }

          // Safety net: ensure base ground is ALWAYS rendered at zIndex 0 so there are never transparent holes
          if (!groundRendered) {
            const gId = (tile as any).groundServerId || 103;
            const gMapping = visualAssets.mapItems?.[String(gId)];
            const gUrl = gMapping?.frame?.publicUrl || '/generated/tibia1098/items/item-103.png';
            const gTex = loaded[gUrl] || loaded['/generated/tibia1098/items/item-103.png'];
            if (gTex) {
              const groundSprite = new Sprite(gTex);
              groundSprite.anchor.set(0, 0);
              groundSprite.position.set(point.x - 16, point.y - 16);
              groundSprite.roundPixels = true;
              groundSprite.zIndex = 0;
              terrain.addChild(groundSprite);
            }
          }
          if (showDebug) terrain.addChild(new Graphics().rect(point.x - 16, point.y - 16, 32, 32).stroke({ color: tile.walkable ? 0x7cb487 : 0xcf6d65, width: 0.5, alpha: 0.45 }));
        }
        if (showDebug && state.encounter.expedition) {
          const line = new Graphics();
          state.encounter.expedition.explorationPath.forEach((position, index) => { const point = worldPoint(position); if (index === 0) line.moveTo(point.x, point.y); else line.lineTo(point.x, point.y); });
          line.stroke({ color: 0x54b8ff, width: 1, alpha: 0.35 }); terrain.addChild(line);
          for (const entry of state.encounter.expedition.encounters) { const point = worldPoint(entry.anchor); terrain.addChild(new Graphics().circle(point.x, point.y, 5).stroke({ color: entry.boss ? 0xff5b4d : 0xffd45b, width: 1 })); }
        }
        if (showDebug && state.encounter.huntRoute) {
          const line = new Graphics();
          state.encounter.huntRoute.path.forEach((position, index) => { const point = worldPoint(position); if (index === 0) line.moveTo(point.x, point.y); else line.lineTo(point.x, point.y); });
          line.stroke({ color: 0x54b8ff, width: 1, alpha: 0.35 }); terrain.addChild(line);
          for (const zone of state.encounter.huntRoute.respawnZones) { const point = worldPoint(zone.center); terrain.addChild(new Graphics().circle(point.x, point.y, zone.activationRadius * TILE_SIZE).stroke({ color: 0xb66cff, width: 1, alpha: 0.35 })); }
        }
        const cameraText = new Text({ text: '', style: { fill: 0xe0c77b, fontSize: 10, fontFamily: 'monospace' } });
        cameraText.label = 'camera-debug';
        cameraText.position.set(12, 10); overlay.addChild(cameraText);
        const tileText = new Text({ text: '', resolution: 2, style: { fill: 0xffffff, stroke: { color: 0x000000, width: 3 }, fontSize: 10, fontFamily: 'monospace' } });
        tileText.label = 'tile-debug'; tileText.position.set(12, 78); overlay.addChild(tileText);
      };

      const createView = (id: string, mapping: VisualAssetMapping, position: GridPosition, direction: CardinalDirection, labelText: string, isEnemy = false): ActorView => {
        const root = new Container();
        if (isEnemy) {
          root.eventMode = 'static';
          root.cursor = 'pointer';
          root.on('pointerdown', (e) => {
            e.stopPropagation();
            latestRef.current.onSelectTarget?.(id);
          });
        } else {
          root.eventMode = 'static';
          root.cursor = 'pointer';
          root.on('pointerdown', (e) => {
            if (e.button === 2) {
              e.stopPropagation();
              latestRef.current.onCharacterContextMenu?.(id, e.clientX, e.clientY);
            }
          });
        }
        const initialUrl = frameUrl(mapping, direction, 0);
        const aura = new Graphics();
        const initialTex = loaded[initialUrl] || Texture.WHITE;
        const sprite = new Sprite(initialTex); sprite.anchor.set(creatureVisualLayout.spriteAnchorX, creatureVisualLayout.spriteAnchorY); sprite.position.set(creatureVisualLayout.spriteOffsetX, creatureVisualLayout.spriteOffsetY); sprite.roundPixels = true;
        if (!loaded[initialUrl]) {
          void ensureTexture(initialUrl).then((tex) => {
            if (tex && !sprite.destroyed) sprite.texture = tex;
          });
        }
        const label = new Text({ text: labelText, resolution: 2, style: { fill: 0x67de82, stroke: { color: 0x08120a, width: 2 }, fontSize: 8, fontFamily: 'Arial', fontWeight: '700' } }); label.anchor.set(0.5); label.roundPixels = true;
        const debugLabel = new Text({ text: '', style: { fill: 0xffffff, stroke: { color: 0x000000, width: 2 }, fontSize: 5, fontFamily: 'monospace' } }); debugLabel.anchor.set(0.5, 0);
        const bar = new Graphics(); root.addChild(aura, sprite, label, bar, debugLabel); actors.addChild(root);
        const view = { root, sprite, label, debugLabel, bar, aura, track: new VisualMotionTrack(position, direction), mapping, lastFrameUrl: initialUrl, attackUntil: 0 };
        views.set(id, view); return view;
      };

      const actorPosition = (state: GameState, id: string): GridPosition | undefined => state.encounter.partyActors.find((actor) => actor.characterId === id)?.position
        ?? state.encounter.enemies.find((enemy) => enemy.id === id)?.position;

      const addSpellVisual = (state: GameState, event: Extract<GameState['encounter']['events'][number], { type: 'spell-visual' }>, now: number) => {
        const from = actorPosition(state, event.sourceId);
        const to = event.targetPosition ?? (event.targetId ? actorPosition(state, event.targetId) : null);
        if (!from || !to) return;
        const projectileId = typeof event.projectileId === 'number'
          ? event.projectileId
          : event.projectileId === 'weapon-type' ? 24 : null;
        if (projectileId !== null) {
          const mapping = visualAssets.missiles[String(projectileId)];
          const direction = projectileDirection(from, to);
          const frame = mapping?.frames.find((candidate) => candidate.direction === direction) ?? mapping?.frames[0];
          if (frame) {
            const initialTex = getCombatTexture(frame.publicUrl) || Texture.EMPTY;
            const sprite = new Sprite(initialTex);
            sprite.anchor.set(0.5);
            const pFrom = worldPoint(from);
            sprite.position.set(pFrom.x, pFrom.y);
            sprite.roundPixels = true;
            if (sprite.texture === Texture.EMPTY) {
              getCombatTexture(frame.publicUrl, (loadedTex) => {
                if (!sprite.destroyed) sprite.texture = loadedTex;
              });
            }
            effects.addChild(sprite);
            timed.push({
              root: sprite,
              sprite,
              startedAt: now,
              durationMs: RUNE_PROJECTILE_FLIGHT_MS,
              kind: 'missile',
              from: { ...from },
              to: { ...to },
              frames: [frame.publicUrl],
            });
          }
        }
        if (event.effectId !== null && event.effectId > 0) {
          const mapping = visualAssets.effects[String(event.effectId)];
          if (mapping && mapping.frames && mapping.frames.length > 0) {
            const root = new Container();
            const point = worldPoint(to);
            root.position.set(point.x, point.y);
            root.zIndex = point.y * 10 + 50;
            const firstFrameUrl = mapping.frames[0].publicUrl;
            const effTex = getCombatTexture(firstFrameUrl) || Texture.EMPTY;
            const sprite = new Sprite(effTex);
            sprite.anchor.set(0.5);
            sprite.roundPixels = true;
            if (sprite.texture === Texture.EMPTY) {
              getCombatTexture(firstFrameUrl, (loadedTex) => {
                if (!sprite.destroyed) sprite.texture = loadedTex;
              });
            }
            root.addChild(sprite);
            effects.addChild(root);
            const effectDelay = typeof event.delayMs === 'number' ? event.delayMs : (projectileId === null ? 0 : RUNE_PROJECTILE_FLIGHT_MS);
            root.visible = effectDelay <= 0;
            timed.push({
              root,
              sprite,
              startedAt: now + effectDelay,
              durationMs: Math.max(320, mapping.frames.length * 80),
              kind: 'effect',
              frames: mapping.frames.map((frame) => frame.publicUrl),
            });
          }
        }
      };

      let lastProcessedEvents: unknown = null;
      let lastProcessedVisualEvents: unknown = null;

      const sync = (state: GameState, showDebug: boolean) => {
        const now = performance.now(); rebuildTerrain(state, showDebug);
        spatialDebug.removeChildren().forEach((child) => child.destroy({ children: true }));
        if (showDebug) {
          const occupied = new Set(state.encounter.room.occupancy.keys());
          const reserved = new Set(state.encounter.room.reservations.keys());
          const tileText = overlay.getChildByLabel('tile-debug') as Text | null;
          for (const tile of state.encounter.room.map.tiles) {
            const key = `${tile.position.x},${tile.position.y},${tile.position.z}`; const point = worldPoint(tile.position);
            const color = !tile.walkable ? 0xff4d4d : reserved.has(key) ? 0xffd84d : occupied.has(key) ? 0x4d9dff : null;
            const marker = new Graphics().rect(point.x - 15, point.y - 15, 30, 30).fill({ color: color ?? 0x48c774, alpha: 0.12 }).stroke({ color: color ?? 0x48c774, width: 1, alpha: 0.7 });
            marker.eventMode = 'static'; marker.cursor = 'crosshair'; marker.on('pointerover', () => {
              if (!tileText) return;
              const world = tile.worldPosition ?? tile.position;
              const stack = (tile.itemProperties ?? []).map((item) => `${item.serverId}/${item.clientId ?? '?'} flags=0x${item.flags.toString(16)} solid=${item.blockSolid} path=${item.blockPathFind}`).join('\n');
              tileText.text = `TILE ${world.x}/${world.y}/${world.z} · local ${tile.position.x}/${tile.position.y}\nwalkable=${tile.walkable} occupiedBy=${state.encounter.room.occupancy.get(key) ?? '-'} reservedBy=${state.encounter.room.reservations.get(key) ?? '-'}\nGround: ${tile.groundServerId ?? '-'}\nStack:\n${stack || '(void)'}`;
            });
            spatialDebug.addChild(marker);
          }
          for (const entity of [...state.encounter.partyActors.filter((actor) => actor.alive), ...state.encounter.enemies.filter((enemy) => enemy.alive)]) {
            const tileCenter = worldPoint(entity.position);
            const anchorX = tileCenter.x + creatureVisualLayout.spriteOffsetX; const anchorY = tileCenter.y + creatureVisualLayout.spriteOffsetY;
            spatialDebug.addChild(new Graphics()
              .rect(tileCenter.x - 16, tileCenter.y - 16, creatureVisualLayout.footprintSize, creatureVisualLayout.footprintSize).stroke({ color: 0xffffff, width: 1, alpha: 0.9 })
              .rect(anchorX - creatureVisualLayout.footprintSize, anchorY - creatureVisualLayout.footprintSize, creatureVisualLayout.footprintSize, creatureVisualLayout.footprintSize).stroke({ color: 0xff78d1, width: 1, alpha: 0.9 })
              .circle(anchorX, anchorY, 2).fill({ color: 0xff78d1 })
              .moveTo(tileCenter.x - 5, tileCenter.y + creatureVisualLayout.nameplateY).lineTo(tileCenter.x + 5, tileCenter.y + creatureVisualLayout.nameplateY).stroke({ color: 0xffd45b, width: 1 }));
            if (entity.path.length === 0) continue;
            const line = new Graphics(); const start = worldPoint(entity.position); line.moveTo(start.x, start.y);
            for (const step of entity.path) { const point = worldPoint(step); line.lineTo(point.x, point.y); }
            line.stroke({ color: 0x55e6ff, width: 1, alpha: 0.8 }); spatialDebug.addChild(line);
          }
        }
        const currentEncounterKey = `${state.encounter.room.definitionId}:${state.encounter.hunt?.id ?? ''}`;
        const isReset = state.encounter.elapsedMs < lastElapsedMs;
        lastElapsedMs = state.encounter.elapsedMs;

        if (activeRoom !== currentEncounterKey || isReset) {
          activeRoom = currentEncounterKey;
          if (state.encounter.hunt?.id) {
            void loadHuntAtlas(state.encounter.hunt.id);
          }
          const tileUrls = new Set<string>();
          for (const tile of state.encounter.room.map.tiles) {
            for (const serverId of tile.serverItemIds ?? []) {
              const mapping = visualAssets.mapItems?.[String(serverId)];
              if (!mapping) continue;
              if (mapping.frame?.publicUrl) tileUrls.add(mapping.frame.publicUrl);
              if (mapping.frames) {
                for (const f of mapping.frames) if (f.publicUrl) tileUrls.add(f.publicUrl);
              }
            }
          }
          if (tileUrls.size > 0) {
            void loadBatch(Array.from(tileUrls), 40).then(() => {
              if (!disposed && appRef.current) {
                terrainKey = '';
                rebuildTerrain(state, latestRef.current.debug);
              }
            });
          }
          cameraInitialized = false;
          sceneReadyNotified = false;
          for (const view of views.values()) view.root.destroy({ children: true });
          views.clear(); effects.removeChildren().forEach((child) => child.destroy({ children: true })); timed.length = 0; pendingImpacts.length = 0;
          lastProcessedEvents = null;
          lastProcessedVisualEvents = null;
        }
        const committedMovements = state.encounter.events.filter((event) => event.type === 'movement');
        const liveIds = new Set<string>();
        for (const actor of state.encounter.partyActors) {
          const character = state.session.characters.find((candidate) => candidate.id === actor.characterId); if (!character) continue;
          liveIds.add(actor.characterId);
          const outfitKey = character.outfit || character.vocation;
          const mapping = visualAssets.outfits[outfitKey] || visualAssets.outfits[baseVocation(outfitKey)] || visualAssets.outfits['Knight'];
          const rawRole = String((character as any).accountRole || '').trim().toUpperCase();
          const rawCharTitle = (character as any).adminTitle;
          const rawLatestTitle = latestRef.current.adminTitle;
          const cleanCharTitle = (rawCharTitle && rawCharTitle !== 'null' && rawCharTitle !== 'undefined') ? rawCharTitle : undefined;
          const cleanLatestTitle = (rawLatestTitle && rawLatestTitle !== 'null' && rawLatestTitle !== 'undefined') ? rawLatestTitle : undefined;
          const effectiveAdminTitle = (cleanCharTitle === 'GOD' || cleanCharTitle === 'GM') ? cleanCharTitle
            : (cleanLatestTitle === 'GOD' || cleanLatestTitle === 'GM') ? cleanLatestTitle
            : (rawRole === 'ADMIN' ? 'GOD' : rawRole === 'GM' ? 'GM' : undefined);
          const displayName = character.name;
          const view = views.get(actor.characterId) ?? createView(actor.characterId, mapping, actor.previousPosition, actor.direction, displayName);
          if (view.mapping !== mapping) {
            view.mapping = mapping;
          }
          const charSkull = getCharacterSkull(character);
          const hasSkull = charSkull !== 'none';
          const skullW = hasSkull ? 13 : 0;
          if (effectiveAdminTitle && (effectiveAdminTitle === 'GOD' || effectiveAdminTitle === 'GM')) {
            if (!view.titleLabel) {
              view.titleLabel = new Text({
                text: `[${effectiveAdminTitle}] `,
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
              view.titleLabel.text = `[${effectiveAdminTitle}] `;
              view.titleLabel.visible = true;
            }
            const titleW = view.titleLabel.width;
            const nameW = view.label.width;
            const totalW = titleW + nameW + skullW;
            const startX = Math.round(-totalW / 2);
            view.titleLabel.anchor.set(0, 0.5);
            view.titleLabel.position.set(startX, creatureVisualLayout.nameplateY);
            view.label.anchor.set(0, 0.5);
            view.label.position.set(startX + titleW, creatureVisualLayout.nameplateY);
            view.label.style.fill = 0x67de82;
            updateActorSkull(view, charSkull, startX + titleW, nameW);
          } else {
            if (view.titleLabel) {
              view.titleLabel.visible = false;
            }
            const nameW = view.label.width;
            const totalW = nameW + skullW;
            const startX = Math.round(-totalW / 2);
            view.label.anchor.set(0, 0.5);
            view.label.position.set(startX, creatureVisualLayout.nameplateY);
            view.label.style.fill = 0x67de82;
            updateActorSkull(view, charSkull, startX, nameW);
          }
          view.sprite.alpha = actor.alive ? 1 : 0.45;
          view.root.visible = latestRef.current.isCharacterVisible !== false && actor.alive;
        }
        for (const enemy of state.encounter.enemies) {
          const hasPending = pendingImpacts.some((p) => p.targetId === enemy.id && now < p.impactAt);
          if (!enemy.alive && !hasPending) continue;
          liveIds.add(enemy.id);
          const isPvPOpponent = enemy.id.startsWith('pvp_');
          const mapping = (isPvPOpponent ? (visualAssets.outfits[enemy.monsterId] || visualAssets.outfits[baseVocation(enemy.monsterId)]) : null)
            || visualAssets.creatures[enemy.monsterId]
            || visualAssets.outfits[enemy.monsterId]
            || ((enemy as any).lookType ? visualAssets.creatures[String((enemy as any).lookType)] : null)
            || visualAssets.creatures['rotworm']
            || Object.values(visualAssets.creatures)[0];
          if (!mapping) continue;
          const view = views.get(enemy.id) ?? createView(enemy.id, mapping, enemy.previousPosition, enemy.direction, enemy.name, true);
          view.label.text = enemy.name;
          view.label.style.fill = isPvPOpponent ? 0xff6666 : enemy.variant?.visualModifier === 'rare-aura' ? 0xd694ff : enemy.variant ? 0xffc857 : 0xe6ded0;
          view.sprite.scale.set(enemy.variant?.scale ?? 1);
          const isPendingDeath = !enemy.alive && pendingImpacts.some((p) => p.targetId === enemy.id && now < p.impactAt);
          view.root.visible = enemy.alive || isPendingDeath;
          view.sprite.alpha = (enemy.alive || isPendingDeath) ? 1 : 0;
          view.sprite.visible = enemy.alive || isPendingDeath;
          if (isPvPOpponent) {
            const oppSkull = (enemy as any).pvpSkull || (enemy as any).skull || (typeof (enemy as any).pvpElo === 'number' ? getPvPTierInfo((enemy as any).pvpElo).skull : 'red');
            const hasOppSkull = oppSkull && oppSkull !== 'none';
            const oppSkullW = hasOppSkull ? 13 : 0;
            const nameW = view.label.width;
            const totalW = nameW + oppSkullW;
            const startX = Math.round(-totalW / 2);
            view.label.anchor.set(0, 0.5);
            view.label.position.set(startX, creatureVisualLayout.nameplateY);
            updateActorSkull(view, oppSkull, startX, nameW);
          } else if (view.skullSprite) {
            view.skullSprite.visible = false;
          }
        }
        for (const movement of committedMovements) views.get(movement.actorId)?.track.commit(movement.from, movement.to, now, movement.durationMs);
        for (const actor of state.encounter.partyActors) views.get(actor.characterId)?.track.reconcileCommitted(actor.position, actor.direction);
        for (const enemy of state.encounter.enemies.filter((candidate) => candidate.alive || pendingImpacts.some((p) => p.targetId === candidate.id && now < p.impactAt))) views.get(enemy.id)?.track.reconcileCommitted(enemy.position, enemy.direction);
        for (const [id, view] of views) if (!liveIds.has(id)) { destroyVisualNode(view.root); views.delete(id); }
        for (const layer of [corpses]) layer.removeChildren().forEach((child) => destroyVisualNode(child));
        for (const corpse of state.encounter.corpses) {
          const isHumanCorpse = corpse.corpseId === 3058 || corpse.corpseId === 3065 || corpse.monsterId === 'human';
          let tex: any = null;
          let widthTiles = 1;
          let heightTiles = 1;

          if (isHumanCorpse) {
            const humanUrl = `/assets/items/item-${corpse.corpseId || 3058}.png`;
            tex = loaded[humanUrl];
            if (!tex) {
              void ensureTexture(humanUrl);
              continue;
            }
          } else {
            // Canonical Tibia Skeleton Corpse (item 5972 / remains of a skeleton) replaces monster corpses in hunts
            const specificMapping = (corpse.corpseId ? visualAssets.corpses?.[String(corpse.corpseId)] : null)
              || visualAssets.corpses?.[corpse.monsterId];
            const skeletonMapping = visualAssets.corpses?.['5972']
              || visualAssets.corpses?.['skeleton']
              || (visualAssets as any).items?.['4246'];
            const mapping = skeletonMapping || specificMapping;
            if (!mapping?.frame) continue;
            tex = loaded[mapping.frame.publicUrl];
            if (!tex) {
              void ensureTexture(mapping.frame.publicUrl);
              continue;
            }
            const texW = tex?.width || mapping.frame.width || 32;
            const texH = tex?.height || mapping.frame.height || 32;
            widthTiles = mapping.appearance?.width ?? Math.max(1, Math.round(texW / 32));
            heightTiles = mapping.appearance?.height ?? Math.max(1, Math.round(texH / 32));
          }
          const sprite = new Sprite(tex);
          const point = worldPoint(corpse.position);
          const wOffset = (widthTiles - 1) * 32;
          const hOffset = (heightTiles - 1) * 32;
          sprite.anchor.set(0, 0);
          sprite.position.set(
            point.x - 16 - wOffset,
            point.y - 16 - hOffset
          );
          sprite.roundPixels = true;
          sprite.zIndex = corpse.position.y * 32 + 16;
          const targetEnemyId = corpse.id.startsWith('corpse-') ? corpse.id.slice(7) : null;
          const pending = (targetEnemyId ? pendingImpacts.find((p) => p.targetId === targetEnemyId && now < p.impactAt) : null)
            ?? pendingImpacts.find((p) => {
              const dying = state.encounter.enemies.find((candidate) => candidate.id === p.targetId);
              return dying && !dying.alive && dying.position.x === corpse.position.x && dying.position.y === corpse.position.y && now < p.impactAt;
            });
          if (pending) {
            (sprite as any).visibleAfter = pending.impactAt;
            sprite.visible = false;
          }
          corpses.addChild(sprite);
        }
        if (lastProcessedEvents !== state.encounter.events) {
          lastProcessedEvents = state.encounter.events;
          for (const event of state.encounter.events) {
            if (event.type === 'spell-visual') {
              addSpellVisual(state, event, now);
              continue;
            }
            if (event.type === 'spell-cast' && event.speech) {
              const sourcePos = actorPosition(state, event.sourceId);
              if (sourcePos) {
                const point = worldPoint(sourcePos);
                const isPotion = event.speech === 'Aaaah...';

                // Speech container holding spell icon + speech text side-by-side
                const speechContainer = new Container();
                let iconWidth = 0;

                const iconPath = resolveActionImagePath(event.spellId, isPotion ? 'potion' : 'spell', event.speech);

                if (iconPath && loaded[iconPath]) {
                  const iconSize = 14;
                  const iconSprite = new Sprite(loaded[iconPath]);
                  iconSprite.width = iconSize;
                  iconSprite.height = iconSize;
                  iconSprite.position.set(0, 0);

                  // Small 1px dark border around the icon matching official Tibia UI
                  const iconBorder = new Graphics()
                    .rect(-0.5, -0.5, iconSize + 1, iconSize + 1)
                    .stroke({ color: 0x111315, width: 1 });

                  speechContainer.addChild(iconBorder, iconSprite);
                  iconWidth = iconSize + 3;
                } else if (iconPath) {
                  void ensureTexture(iconPath);
                }

                const speechText = new Text({
                  text: event.speech,
                  resolution: 2,
                  style: {
                    fill: isPotion ? 0xffaa00 : 0xf2a33c, // Authentic warm Tibia spell orange
                    stroke: { color: 0x000000, width: 2 },
                    fontSize: 7,
                    fontFamily: 'Verdana, Arial, sans-serif',
                    fontWeight: '700',
                  },
                });
                speechText.position.set(iconWidth, 0);
                speechContainer.addChild(speechText);

                const totalWidth = iconWidth + speechText.width;
                speechContainer.position.set(point.x - totalWidth / 2, point.y - 24);
                effects.addChild(speechContainer);
                timed.push({ root: speechContainer, startedAt: now, durationMs: 1200, kind: 'float' });
              }
            }
            if (event.type === 'experience-gained') {
              const charPos = actorPosition(state, event.characterId);
              if (charPos && event.amount > 0) {
                const point = worldPoint(charPos);
                const xpText = new Text({
                  text: `+${event.amount} XP`,
                  resolution: 2,
                  style: {
                    fill: 0xffffff,
                    stroke: { color: 0x000000, width: 2 },
                    fontSize: 7,
                    fontFamily: 'Verdana, Arial, sans-serif',
                    fontWeight: '700',
                  },
                });
                xpText.anchor.set(0.5, 1);
                xpText.position.set(point.x, point.y - 26);
                effects.addChild(xpText);
                timed.push({ root: xpText, startedAt: now, durationMs: 1100, kind: 'float' });
              }
            }
            if ((event as any).type === 'player-death') {
              playPlayerDeath();
            }
            if (event.type !== 'player-attack' && event.type !== 'enemy-attack' && event.type !== 'spell-cast') continue;

            if (event.type === 'player-attack') {
              const char = state.session.characters.find((c) => c.id === event.sourceId);
              const actor = state.encounter.partyActors.find((a) => a.characterId === event.sourceId);
              const vocation = char?.vocation || (char as any)?.vocationName || (actor as any)?.vocation;
              playPhysicalAttack(vocation);
            } else if (event.type === 'spell-cast') {
              const char = state.session.characters.find((c) => c.id === event.sourceId);
              const vocation = char?.vocation || (char as any)?.vocationName;
              playMagicSpell(vocation, (event as any).element);
            }

            const targetId = event.targetId; const targetPosition = actorPosition(state, targetId); if (!targetPosition) continue;
            const amount = event.type === 'spell-cast' ? event.amount : event.damage;
            if (amount > 0) {
              const isHealing = event.type === 'spell-cast' && event.healing;
              const prefix = isHealing ? '+' : '';
              const delay = (event.type === 'spell-cast' && typeof event.delayMs === 'number') ? event.delayMs : 0;
              const element = (event as any).element;
              if (delay > 0 && !isHealing) {
                pendingImpacts.push({ targetId, amount, impactAt: now + delay, element });
              }
              const colorConfig = getCombatTextColor(element, isHealing);
              const text = new Text({
                text: `${prefix}${amount}`,
                resolution: 2,
                style: {
                  fill: colorConfig.fill,
                  stroke: { color: colorConfig.stroke, width: 2 },
                  fontSize: 7,
                  fontFamily: 'Verdana, Arial, sans-serif',
                  fontWeight: '700',
                },
              });
              text.anchor.set(0.5); const point = worldPoint(targetPosition); text.position.set(point.x, point.y - 18);
              text.visible = delay <= 0;
              effects.addChild(text);
              timed.push({ root: text, startedAt: now + delay, durationMs: 700, kind: 'float' });
            }
            const sourceView = views.get(event.sourceId);
            if (sourceView) sourceView.attackUntil = now + 160;
          }
        }

        if (lastProcessedVisualEvents !== state.encounter.visualEvents) {
          lastProcessedVisualEvents = state.encounter.visualEvents;
          for (const event of state.encounter.visualEvents) {
            if (event.type === 'projectile-launched') {
              const from = actorPosition(state, event.sourceId);
              const to = actorPosition(state, event.targetId);
              const mapping = visualAssets.missiles[String(event.projectileId)];
              if (from && to && mapping && mapping.frames && mapping.frames.length > 0) {
                const direction = projectileDirection(from, to);
                const frame = mapping.frames.find((candidate) => candidate.direction === direction) ?? mapping.frames[0];
                const tex = getCombatTexture(frame.publicUrl) || Texture.EMPTY;
                const sprite = new Sprite(tex);
                sprite.anchor.set(0.5);
                const pFrom = worldPoint(from);
                sprite.position.set(pFrom.x, pFrom.y);
                sprite.roundPixels = true;
                if (sprite.texture === Texture.EMPTY) {
                  getCombatTexture(frame.publicUrl, (loadedTex) => {
                    if (!sprite.destroyed) sprite.texture = loadedTex;
                  });
                }
                effects.addChild(sprite);
                timed.push({
                  root: sprite,
                  sprite,
                  startedAt: now,
                  durationMs: Math.max(180, Math.min(500, 75 * (Math.abs(to.x - from.x) + Math.abs(to.y - from.y)))),
                  kind: 'missile',
                  from: { ...from },
                  to: { ...to },
                  frames: [frame.publicUrl],
                });
              }
            }
            if (event.type === 'spawn-visual') {
              const targetPos = event.position
                ? worldPoint(event.position)
                : (event.targetId && views.get(event.targetId)
                  ? views.get(event.targetId)!.root.position
                  : (event.targetId && actorPosition(state, event.targetId)
                    ? worldPoint(actorPosition(state, event.targetId)!)
                    : null));
              const effId = event.effectId || 11;
              const mapping = visualAssets.effects[String(effId)];
              if (targetPos && mapping && mapping.frames && mapping.frames.length > 0) {
                const root = new Container();
                root.position.set(targetPos.x, targetPos.y);
                root.zIndex = targetPos.y * 10 + 60;
                const firstUrl = mapping.frames[0].publicUrl;
                const effTex = getCombatTexture(firstUrl) || Texture.EMPTY;
                const sprite = new Sprite(effTex);
                sprite.anchor.set(0.5);
                sprite.roundPixels = true;
                if (sprite.texture === Texture.EMPTY) {
                  getCombatTexture(firstUrl, (loadedTex) => {
                    if (!sprite.destroyed) sprite.texture = loadedTex;
                  });
                }
                root.addChild(sprite);
                effects.addChild(root);
                timed.push({
                  root,
                  sprite,
                  startedAt: now,
                  durationMs: Math.max(350, mapping.frames.length * 65),
                  kind: 'effect',
                  frames: mapping.frames.map((frame) => frame.publicUrl),
                });
              }
            }
            if (
              event.type === 'melee-hit' ||
              event.type === 'projectile-hit' ||
              event.type === 'heal-applied' ||
              (event.type === 'spell-cast-visual' && Boolean(event.effectId))
            ) {
              const effId = (event as any).effectId;
              const targetId = (event as any).targetId;
              const targetView = targetId ? views.get(targetId) : undefined;
              const targetPos = targetView ? targetView.root.position : (targetId && actorPosition(state, targetId) ? worldPoint(actorPosition(state, targetId)!) : null);
              const mapping = effId ? visualAssets.effects[String(effId)] : undefined;
              if (targetPos && mapping && mapping.frames && mapping.frames.length > 0) {
                const root = new Container();
                root.position.set(targetPos.x, targetPos.y);
                root.zIndex = targetPos.y * 10 + 50;
                const firstUrl = mapping.frames[0].publicUrl;
                const effTex = getCombatTexture(firstUrl) || Texture.EMPTY;
                const sprite = new Sprite(effTex);
                sprite.anchor.set(0.5);
                sprite.roundPixels = true;
                if (sprite.texture === Texture.EMPTY) {
                  getCombatTexture(firstUrl, (loadedTex) => {
                    if (!sprite.destroyed) sprite.texture = loadedTex;
                  });
                }
                root.addChild(sprite);
                effects.addChild(root);
                timed.push({
                  root,
                  sprite,
                  startedAt: now,
                  durationMs: Math.max(300, mapping.frames.length * 75),
                  kind: 'effect',
                  frames: mapping.frames.map((frame) => frame.publicUrl),
                });
              }
            }
          }
        }
        if (!cameraInitialized) {
          const actor = state.encounter.partyActors.find((candidate) => candidate.characterId === state.session.cameraTargetCharacterId)
            ?? state.encounter.partyActors[0];
          if (actor) { const point = worldPoint(actor.position); camera = desiredWorldCamera({ viewportWidth: app.screen.width, viewportHeight: app.screen.height, worldWidth: state.encounter.room.map.width * TILE_SIZE, worldHeight: state.encounter.room.map.height * TILE_SIZE, targetX: point.x, targetY: point.y }); cameraInitialized = true; }
        }
      };

      const render = () => {
        const now = performance.now(); const state = latestRef.current.game;
        for (const [id, view] of views) {
          const sample = view.track.sample(now); const point = worldPoint(sample.renderPosition);
          view.root.position.set(snapWorldCoordinate(point.x), snapWorldCoordinate(point.y)); view.root.zIndex = sample.renderPosition.y * 100 + (state.encounter.enemies.some((enemy) => enemy.id === id) ? 10 : 20);
          const framePhase = sample.moving ? (now % (visualMovementConfig.walkingFrameMs * 2)) / (visualMovementConfig.walkingFrameMs * 2) : 0;
          const enemy = state.encounter.enemies.find((candidate) => candidate.id === id);
          const actor = state.encounter.partyActors.find((candidate) => candidate.characterId === id);
          const character = actor ? state.session.characters.find((candidate) => candidate.id === id) : undefined;

          if (character) {
            view.sprite.scale.x = 1;
            const isMounted = Boolean(character.mountActive && character.mount && character.mount !== 'none');
            const outfitKey = character.outfit || character.vocation || 'Knight';
            const charGender = character.gender === 'female' ? 'female' : 'male';
            const colors = character.outfitColors || { head: 0, primary: 86, secondary: 114, detail: 76 };
            const addons = (character as any).addons ?? (character as any).outfitAddons ?? 0;

            const outfitSig = `${outfitKey}_${charGender}_${isMounted ? (character.mount || 'none') : 'none'}_${addons}_${colors.head}_${colors.primary}_${colors.secondary}_${colors.detail}`;
            if (view.lastOutfitSig !== outfitSig) {
              view.lastOutfitSig = outfitSig;
              preloadOutfitAllFrames(
                outfitKey,
                charGender,
                colors,
                addons,
                character.mount,
                isMounted
              ).catch(() => {});
            }

            const walkFrame = sample.moving ? (1 + (Math.floor(framePhase * 8) % 8)) : 0;
            const textureKey = getCanvasCacheKey(
              normalizeOutfitId(outfitKey),
              charGender,
              sample.direction,
              walkFrame,
              colors,
              addons,
              character.mount,
              isMounted
            );
            const isCached = isOutfitCanvasCached(
              outfitKey,
              charGender,
              sample.direction,
              walkFrame,
              colors,
              addons,
              character.mount,
              isMounted
            );
            if (view.lastFrameUrl !== textureKey || !isCached) {
              const canvas = getRecoloredCanvasSync(
                outfitKey,
                charGender,
                sample.direction,
                walkFrame,
                colors,
                addons,
                character.mount,
                isMounted
              );
              if (canvas) {
                if (view.lastCanvas !== canvas) {
                  view.lastCanvas = canvas;
                  const tex = Texture.from(canvas);
                  tex.source.style.scaleMode = 'nearest';
                  view.sprite.texture = tex;
                }
                if (isCached) {
                  view.lastFrameUrl = textureKey;
                }
              } else if (!character.outfitColors && !isMounted) {
                const nextUrl = frameUrl(view.mapping, sample.direction, framePhase);
                if (nextUrl !== view.lastFrameUrl) { view.sprite.texture = loaded[nextUrl]; view.lastFrameUrl = nextUrl; }
              }
            }
          } else {
            const nextUrl = frameUrl(view.mapping, sample.direction, framePhase);
            if (nextUrl !== view.lastFrameUrl) {
              if (loaded[nextUrl]) {
                view.sprite.texture = loaded[nextUrl];
              } else {
                void ensureTexture(nextUrl).then((tex) => {
                  if (tex && !view.sprite.destroyed) view.sprite.texture = tex;
                });
              }
              view.lastFrameUrl = nextUrl;
            }
          }
          view.sprite.tint = view.attackUntil > now ? 0xffd0a0 : 0xffffff;
          const pendingDamage = enemy ? pendingImpacts.filter((p) => p.targetId === enemy.id && now < p.impactAt).reduce((sum, p) => sum + p.amount, 0) : 0;
          const visualHp = enemy ? Math.min(enemy.maxHp, Math.max(0, enemy.hp + pendingDamage)) : actor && character ? actor.hp : 0;
          const visualMaxHp = enemy ? enemy.maxHp : actor && character ? character.maxHp : 1;
          const hpRatio = Math.max(0, Math.min(1, visualHp / visualMaxHp));
          const variantColor = enemy?.variant?.visualModifier === 'rare-aura' ? 0xb66cff : 0xffb52e;
          if (!view.titleLabel || !view.titleLabel.visible) {
            view.label.position.set(0, creatureVisualLayout.nameplateY);
          }
          view.bar.clear().rect(-creatureVisualLayout.hpBarWidth / 2, creatureVisualLayout.hpBarY, creatureVisualLayout.hpBarWidth, 3).fill({ color: 0x251010 }).rect(-creatureVisualLayout.hpBarWidth / 2, creatureVisualLayout.hpBarY, creatureVisualLayout.hpBarWidth * hpRatio, 3).fill({ color: enemy?.variant ? variantColor : enemy ? 0xd3564d : 0x4fc977 });
          const logical = actor?.position ?? enemy?.position;
          view.debugLabel.visible = latestRef.current.debug;
          view.debugLabel.position.set(0, 18);
          view.debugLabel.text = logical ? `${id}\ntile ${logical.x},${logical.y}\nrender ${sample.renderPosition.x.toFixed(2)},${sample.renderPosition.y.toFixed(2)}` : '';
          view.aura.clear(); if (enemy?.variant) view.aura.circle(0, 4, 17 + Math.sin(now / 180) * 2).stroke({ color: variantColor, width: 1, alpha: 0.7 });
          if (enemy && !enemy.alive) {
            const stillFlying = pendingImpacts.some((p) => p.targetId === enemy.id && now < p.impactAt);
            view.root.visible = stillFlying;
            view.sprite.visible = stillFlying;
            view.sprite.alpha = stillFlying ? 1 : 0;
          }
        }

        // Classic Tibia Solid Red Target Rectangle around focused target matching reference
        targetReticle.clear();
        if (latestRef.current.isCharacterVisible !== false) {
          const activeActor = (state.session.cameraTargetCharacterId ? state.encounter.partyActors.find((a) => a.alive && a.characterId === state.session.cameraTargetCharacterId) : undefined)
            ?? (state.session.selectedCharacterId ? state.encounter.partyActors.find((a) => a.alive && a.characterId === state.session.selectedCharacterId) : undefined)
            ?? state.encounter.partyActors.find((a) => a.alive);
          const targetId = activeActor?.targetId ?? state.session.characters.find((c) => c.id === activeActor?.characterId)?.combatState.targetId;
          if (targetId) {
            const targetView = views.get(targetId);
            const targetEnemy = state.encounter.enemies.find((e) => e.id === targetId && (e.alive || pendingImpacts.some((p) => p.targetId === e.id && now < p.impactAt)));
            if (targetView && targetEnemy) {
              const p = targetView.root.position;
              const half = 16;
              const red = 0xff0000;
              const left = p.x - half;
              const top = p.y - half;

              targetReticle
                .rect(left, top, 32, 32)
                .stroke({ color: red, width: 2, alpha: 1.0 });
            }
          }
        }
        for (const child of corpses.children) {
          if (typeof (child as any).visibleAfter === 'number') {
            child.visible = now >= (child as any).visibleAfter;
          }
        }
        for (let i = pendingImpacts.length - 1; i >= 0; i--) {
          if (now >= pendingImpacts[i].impactAt + 1200) {
            pendingImpacts.splice(i, 1);
          }
        }
        for (let index = timed.length - 1; index >= 0; index -= 1) {
          const visual = timed[index];
          const progress = (now - visual.startedAt) / visual.durationMs;
          visual.root.visible = progress >= 0;
          if (progress < 0) continue;
          if (progress >= 1) {
            if (visual.root.parent) visual.root.parent.removeChild(visual.root);
            destroyVisualNode(visual.root);
            timed.splice(index, 1);
            continue;
          }
          if (visual.kind === 'float') {
            visual.root.y -= app.ticker.deltaMS * 0.025;
            visual.root.alpha = 1 - progress;
          }
          if (visual.kind === 'missile' && visual.from && visual.to) {
            const from = worldPoint(visual.from);
            const to = worldPoint(visual.to);
            visual.root.position.set(from.x + (to.x - from.x) * progress, from.y + (to.y - from.y) * progress);
          }
          if (visual.kind === 'effect' && visual.frames && visual.frames.length > 0) {
            const frameIdx = Math.min(visual.frames.length - 1, Math.floor(progress * visual.frames.length));
            const frameUrl = visual.frames[frameIdx];
            const sprite = visual.sprite ?? (visual.root.children?.[0] as Sprite | undefined);
            if (sprite && frameUrl) {
              const tex = getCombatTexture(frameUrl, (loadedTex) => {
                if (!sprite.destroyed) sprite.texture = loadedTex;
              });
              if (tex && sprite.texture !== tex) {
                sprite.texture = tex;
              }
            }
          }
        }

        const showDebug = latestRef.current.debug;
        darkSprite.visible = !showDebug;

        if (!showDebug && darkCanvas.width > 0 && darkCanvas.height > 0) {
          // 1. Reset canvas cleanly every frame to prevent alpha accumulation
          darkCtx.clearRect(0, 0, darkCanvas.width, darkCanvas.height);

          // 2. Fill entire room with transparent shade (transparent, clearly visible)
          darkCtx.globalCompositeOperation = 'source-over';
          darkCtx.fillStyle = 'rgba(5, 8, 12, 0.35)';
          darkCtx.fillRect(0, 0, darkCanvas.width, darkCanvas.height);

          // 3. Erase darkness where the characters are (100% clear up to 4 tiles)
          darkCtx.globalCompositeOperation = 'destination-out';
          for (const actor of state.encounter.partyActors) {
            const visualPos = views.get(actor.characterId)?.track.sample(now).renderPosition ?? actor.position;
            const p = worldPoint(visualPos);
            darkCtx.drawImage(holeCanvas, p.x - holeCenter, p.y - holeCenter);
          }

          darkTexture.source.update();
        }

        const target = state.encounter.partyActors.find((actor) => actor.characterId === state.session.cameraTargetCharacterId)
          ?? state.encounter.partyActors[0];
        if (target) {
          const visualPosition = views.get(target.characterId)?.track.sample(now).renderPosition ?? target.position;
          const point = worldPoint(visualPosition);
          const currentZoomMult = getZoomMultiplier();
          const desired = desiredWorldCamera({ viewportWidth: app.screen.width, viewportHeight: app.screen.height, worldWidth: state.encounter.room.map.width * TILE_SIZE, worldHeight: state.encounter.room.map.height * TILE_SIZE, targetX: point.x, targetY: point.y, fixedZoom: 2 * currentZoomMult });
          camera = cameraInitialized ? smoothWorldCamera(camera, desired, app.ticker.deltaMS) : desired; cameraInitialized = true;
          world.scale.set(camera.zoom); world.position.set(Math.round(app.screen.width / 2 - camera.x * camera.zoom), Math.round(app.screen.height / 2 - camera.y * camera.zoom));
          const debugText = overlay.getChildByLabel('camera-debug') as Text | null;
          if (debugText) {
            debugText.visible = latestRef.current.debug;
            const respawns = state.encounter.continuousProgress?.zones.map((zone) => `${zone.zoneId}: ${zone.activeEnemyIds.length ? `alive [${zone.activeEnemyIds.join(',')}]` : state.encounter.elapsedMs >= zone.nextRespawnAt ? 'ready/safe-wait' : `cooldown ${Math.ceil((zone.nextRespawnAt - state.encounter.elapsedMs) / 1000)}s`}`).join('\n') ?? '';
            debugText.text = `CAM ${state.session.cameraTargetCharacterId} · world ${camera.x.toFixed(1)},${camera.y.toFixed(1)} · viewport ${app.screen.width}×${app.screen.height} · fixed ${camera.zoom.toFixed(2)}x\nGRID red=blocked · blue=occupied · yellow=reserved · cyan=path\nSAFE RESPAWN 7 tiles\n${respawns}`;
          }
        }

        if (latestRef.current.active && (cameraInitialized || state.encounter.partyActors.length > 0) && !sceneReadyNotified) {
          sceneReadyNotified = true;
          console.log('[SCENE] PixiArena cenário pronto e primeiro frame renderizado:', performance.now());
          latestRef.current.onSceneReady?.();
        }
      };

      const unsubZoom = onZoomChange(() => {
        cameraInitialized = false;
      });

      app.ticker.add(render);
      syncRef.current = sync; sync(latestRef.current.game, latestRef.current.debug);
      if (latestRef.current.active && (cameraInitialized || latestRef.current.game.encounter.partyActors.length > 0) && !sceneReadyNotified) {
        sceneReadyNotified = true;
        console.log('[SCENE] PixiArena cenário pronto após sync inicial:', performance.now());
        latestRef.current.onSceneReady?.();
      }
      const onResize = () => {
        try {
          app.resize();
        } catch {}
        cameraInitialized = false;
        sync(latestRef.current.game, latestRef.current.debug);
      };
      window.addEventListener('resize', onResize);

      let resizeObserver: ResizeObserver | null = null;
      if (typeof ResizeObserver !== 'undefined' && hostRef.current) {
        resizeObserver = new ResizeObserver(() => {
          onResize();
        });
        resizeObserver.observe(hostRef.current);
      }

      cleanup = () => {
        unsubZoom();
        if (resizeObserver) resizeObserver.disconnect();
        window.removeEventListener('resize', onResize);
        app.ticker.remove(render);
        try {
          for (const [, view] of views) destroyVisualNode(view.root);
          views.clear();
          for (const v of timed) destroyVisualNode(v.root);
          timed.length = 0;
          safelyDestroyPixiApp(app);
        } catch (err) {
          console.warn('[PixiArena] Safe catch on app.destroy:', err);
        }
      };
    })();
    return () => { disposed = true; syncRef.current = null; cleanup?.(); };
  }, []);

  useEffect(() => {
    latestRef.current = { game, debug, onSelectTarget, onCharacterContextMenu, active, isCharacterVisible, adminTitle, onSceneReady };
    const app = appRef.current;
    if (app && active) {
      if (!app.ticker.started) app.ticker.start();
      try {
        app.resize();
      } catch {}
    }
    syncRef.current?.(game, debug);
  }, [game, debug, onSelectTarget, onCharacterContextMenu, active, isCharacterVisible, adminTitle, onSceneReady]);
  return (
    <div
      ref={hostRef}
      className="pixi-arena"
      style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, overflow: 'hidden' }}
      aria-label="Arena OTBM 2D com movimento interpolado, spells, party, monstros e corpses reais"
    />
  );
}
