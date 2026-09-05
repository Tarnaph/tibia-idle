'use client';

import { useEffect, useRef } from 'react';
import visualAssetsJson from '@/content/generated/tibia860-assets.json';
import type { CardinalDirection, GameState, GridPosition } from '@/packages/domain/src';
import { creatureVisualLayout, desiredWorldCamera, smoothWorldCamera, snapWorldCoordinate, VisualMotionTrack, visualMovementConfig, type WorldCameraState } from '@/packages/presentation/src';
import type { Tibia860AssetManifest, VisualAssetMapping } from '@/packages/tibia860-assets/src/types';
import type { Application, Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import { resolveActionImagePath } from './Tibia11ActionIcon';
import { getRecoloredCanvasSync, normalizeOutfitId } from '@/apps/web/lib/outfitRecolor';

interface PixiArenaProps {
  game: GameState;
  debug: boolean;
  active?: boolean;
  onSelectTarget?: (enemyId: string) => void;
  onCharacterContextMenu?: (characterId: string, x: number, y: number) => void;
}

const ALL_SPELL_ICON_URLS = [
  '/spells/exura.png',
  '/spells/exura-gran.png',
  '/spells/exura-vita.png',
  '/spells/exura-sio.png',
  '/spells/exura-san.png',
  '/spells/exura-ico.png',
  '/spells/exana-mort.png',
  '/spells/exori.png',
  '/spells/exori-ico.png',
  '/spells/exori-gran.png',
  '/spells/exori-mas.png',
  '/spells/exori-hur.png',
  '/spells/exori-min.png',
  '/spells/exori-vis.png',
  '/spells/exori-flam.png',
  '/spells/exori-frigo.png',
  '/spells/exori-tera.png',
  '/spells/exori-san.png',
  '/spells/utamo-vita.png',
  '/spells/utani-hur.png',
  '/spells/utani-gran-hur.png',
  '/spells/utito-tempo.png',
  '/spells/exeta-res.png',
  '/spells/exevo-vis-hur.png',
  '/spells/exevo-flam-hur.png',
  '/spells/exevo-frigo-hur.png',
  '/spells/exevo-tera-hur.png',
  '/spells/exevo-gran-mas-flam.png',
  '/spells/exevo-gran-mas-frigo.png',
  '/spells/exevo-gran-mas-vis.png',
  '/spells/exevo-gran-mas-tera.png',
  '/spells/exevo-mas-san.png',
  '/spells/sd-rune.png',
  '/spells/gfb-rune.png',
  '/spells/explosion-rune.png',
  '/spells/hmm-rune.png',
  '/spells/ice-storm.png',
];
interface ActorView {
  root: Container;
  sprite: Sprite;
  label: Text;
  debugLabel: Text;
  bar: Graphics;
  aura: Graphics;
  track: VisualMotionTrack;
  mapping: VisualAssetMapping;
  lastFrameUrl: string;
  attackUntil: number;
}
interface TimedVisual { root: Container | Sprite | Text; startedAt: number; durationMs: number; kind: 'float' | 'effect' | 'missile'; from?: GridPosition; to?: GridPosition; frames?: string[] }

const visualAssets = visualAssetsJson as unknown as Tibia860AssetManifest;
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

export function PixiArena({ game, debug, active = true, onSelectTarget, onCharacterContextMenu }: PixiArenaProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const syncRef = useRef<((state: GameState, showDebug: boolean) => void) | null>(null);
  const latestRef = useRef({ game, debug, onSelectTarget, onCharacterContextMenu });

  useEffect(() => {
    if (!appRef.current) return;
    if (active) {
      if (!appRef.current.ticker.started) appRef.current.ticker.start();
    } else {
      if (appRef.current.ticker.started) appRef.current.ticker.stop();
    }
  }, [active]);

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;
    void (async () => {
      const pixi = await import('pixi.js');
      const { Application, Assets, Container, Graphics, Sprite, Text, Texture } = pixi;
      const app = new Application();
      await app.init({ resizeTo: hostRef.current ?? undefined, antialias: false, background: 0x080a0b, resolution: Math.min(2, window.devicePixelRatio), autoDensity: true, roundPixels: true });
      if (disposed || !hostRef.current) { app.destroy(true, { children: true }); return; }
      
      appRef.current = app;
      hostRef.current.appendChild(app.canvas);
      app.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
      app.canvas.addEventListener('webglcontextlost', (e) => {
        e.preventDefault();
      });
      if (!active) {
        app.ticker.stop();
      }

      const urls = new Set<string>();
      for (const asset of [...Object.values(visualAssets.creatures), ...Object.values(visualAssets.outfits), ...Object.values(visualAssets.effects), ...Object.values(visualAssets.missiles)]) {
        for (const frame of asset.frames) urls.add(frame.publicUrl);
      }
      for (const item of [...Object.values(visualAssets.corpses), ...Object.values(visualAssets.mapItems)]) if (item.frame) urls.add(item.frame.publicUrl);
      for (const url of ALL_SPELL_ICON_URLS) urls.add(url);
      urls.add('/generated/mounts/donkey_rider_south.png');
      for (const o of ['citizen', 'hunter', 'mage', 'knight', 'noble', 'summoner', 'warrior', 'barbarian', 'druid', 'sorcerer', 'paladin', 'sire', 'assassin', 'pirate', 'oriental', 'beggar']) {
        urls.add(`/generated/outfit-thumbs/${o}.png`);
      }
      const loaded = await Assets.load([...urls]) as Record<string, Texture>;
      if (disposed) { app.destroy(true, { children: true }); return; }
      for (const texture of Object.values(loaded)) texture.source.style.scaleMode = 'nearest';

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
      actors.sortableChildren = true; effects.sortableChildren = true;
      world.addChild(backing, terrain, corpses, actors, targetReticle, darkSprite, effects, spatialDebug);
      app.stage.addChild(world, overlay);
      const views = new Map<string, ActorView>();
      const timed: TimedVisual[] = [];
      let terrainKey = '';
      let activeRoom = '';
      let mapOffsetX = 0;
      let mapOffsetY = 0;
      let camera: WorldCameraState = { x: 0, y: 0, zoom: 2 };
      let cameraInitialized = false;

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
        for (const tile of state.encounter.room.map.tiles) {
          const point = worldPoint(tile.position);
          let rendered = false;
          for (const serverId of tile.serverItemIds ?? []) {
            const mapping = visualAssets.mapItems[String(serverId)];
            if (!mapping?.frame || !loaded[mapping.frame.publicUrl]) continue;
            const sprite = new Sprite(loaded[mapping.frame.publicUrl]);
            sprite.anchor.set(0.5, 0.5); sprite.position.set(point.x, point.y); sprite.roundPixels = true;
            terrain.addChild(sprite); rendered = true;
          }
          if (!rendered) terrain.addChild(new Graphics().rect(point.x - 16, point.y - 16, 32, 32).fill({ color: tile.walkable ? 0x3a3527 : 0x211d18 }));
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
        const sprite = new Sprite(loaded[initialUrl]); sprite.anchor.set(creatureVisualLayout.spriteAnchorX, creatureVisualLayout.spriteAnchorY); sprite.position.set(creatureVisualLayout.spriteOffsetX, creatureVisualLayout.spriteOffsetY); sprite.roundPixels = true;
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
            const sprite = new Sprite(loaded[frame.publicUrl]); sprite.anchor.set(0.5); effects.addChild(sprite);
            timed.push({ root: sprite, startedAt: now, durationMs: 320, kind: 'missile', from: { ...from }, to: { ...to } });
          }
        }
        if (event.effectId !== null) {
          const mapping = visualAssets.effects[String(event.effectId)];
          if (mapping) {
            const root = new Container(); const point = worldPoint(to); root.position.set(point.x, point.y);
            const sprite = new Sprite(loaded[mapping.frames[0].publicUrl]); sprite.anchor.set(0.5); root.addChild(sprite); effects.addChild(root);
            timed.push({ root, startedAt: now + (projectileId === null ? 0 : 240), durationMs: Math.max(300, mapping.frames.length * 70), kind: 'effect', frames: mapping.frames.map((frame) => frame.publicUrl) });
          }
        }
      };

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
        if (activeRoom !== state.encounter.room.definitionId) {
          activeRoom = state.encounter.room.definitionId;
          cameraInitialized = false;
          for (const view of views.values()) view.root.destroy({ children: true });
          views.clear(); effects.removeChildren().forEach((child) => child.destroy({ children: true })); timed.length = 0;
        }
        const committedMovements = state.encounter.events.filter((event) => event.type === 'movement');
        const liveIds = new Set<string>();
        for (const actor of state.encounter.partyActors) {
          const character = state.session.characters.find((candidate) => candidate.id === actor.characterId); if (!character) continue;
          liveIds.add(actor.characterId);
          const outfitKey = character.outfit || character.vocation;
          const mapping = visualAssets.outfits[outfitKey] || visualAssets.outfits[baseVocation(outfitKey)] || visualAssets.outfits['Knight'];
          const view = views.get(actor.characterId) ?? createView(actor.characterId, mapping, actor.previousPosition, actor.direction, character.name);
          if (view.mapping !== mapping) {
            view.mapping = mapping;
          }
          view.label.text = character.name; view.sprite.alpha = actor.alive ? 1 : 0.45;
        }
        for (const enemy of state.encounter.enemies.filter((candidate) => candidate.alive)) {
          liveIds.add(enemy.id); const mapping = visualAssets.creatures[enemy.monsterId]; if (!mapping) continue;
          const view = views.get(enemy.id) ?? createView(enemy.id, mapping, enemy.previousPosition, enemy.direction, enemy.name, true);
          view.label.text = enemy.name; view.label.style.fill = enemy.variant?.visualModifier === 'rare-aura' ? 0xd694ff : enemy.variant ? 0xffc857 : 0xe6ded0;
          view.sprite.scale.set(enemy.variant?.scale ?? 1);
        }
        for (const movement of committedMovements) views.get(movement.actorId)?.track.commit(movement.from, movement.to, now, movement.durationMs);
        for (const actor of state.encounter.partyActors) views.get(actor.characterId)?.track.reconcileCommitted(actor.position, actor.direction);
        for (const enemy of state.encounter.enemies.filter((candidate) => candidate.alive)) views.get(enemy.id)?.track.reconcileCommitted(enemy.position, enemy.direction);
        for (const [id, view] of views) if (!liveIds.has(id)) { view.root.destroy({ children: true }); views.delete(id); }
        for (const layer of [corpses]) layer.removeChildren().forEach((child) => child.destroy({ children: true }));
        for (const corpse of state.encounter.corpses) {
          const mapping = visualAssets.corpses[corpse.monsterId]; if (!mapping?.frame) continue;
          const sprite = new Sprite(loaded[mapping.frame.publicUrl]); const point = worldPoint(corpse.position);
          sprite.anchor.set(0.5, 1); sprite.position.set(point.x, point.y); sprite.zIndex = corpse.position.y * 10; corpses.addChild(sprite);
        }
        for (const event of state.encounter.events) {
          if (event.type === 'spell-visual') addSpellVisual(state, event, now);
          if (event.type === 'spell-cast' && event.speech) {
            const sourcePos = actorPosition(state, event.sourceId);
            if (sourcePos) {
              const point = worldPoint(sourcePos);
              const isPotion = event.speech === 'Aaaah...';

              // Speech container holding spell icon + speech text side-by-side
              const speechContainer = new Container();
              let iconWidth = 0;

              const iconPath = !isPotion
                ? resolveActionImagePath(event.spellId, 'spell', event.speech)
                : null;

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
          if (event.type !== 'player-attack' && event.type !== 'enemy-attack' && event.type !== 'spell-cast') continue;
          const targetId = event.targetId; const targetPosition = actorPosition(state, targetId); if (!targetPosition) continue;
          const amount = event.type === 'spell-cast' ? event.amount : event.damage;
          if (amount > 0) {
            const isHealing = event.type === 'spell-cast' && event.healing;
            const prefix = isHealing ? '+' : '';
            const text = new Text({
              text: `${prefix}${amount}`,
              resolution: 2,
              style: {
                fill: isHealing ? 0x62e58a : 0xff766b,
                stroke: { color: 0x1a0504, width: 2 },
                fontSize: 7,
                fontFamily: 'Verdana, Arial, sans-serif',
                fontWeight: '700',
              },
            });
            text.anchor.set(0.5); const point = worldPoint(targetPosition); text.position.set(point.x, point.y - 18); effects.addChild(text);
            timed.push({ root: text, startedAt: now, durationMs: 700, kind: 'float' });
          }
          const sourceView = views.get(event.sourceId);
          if (sourceView) sourceView.attackUntil = now + 160;
        }
        for (const event of state.encounter.visualEvents) {
          if (event.type === 'projectile-launched') {
            const from = actorPosition(state, event.sourceId); const to = actorPosition(state, event.targetId); const mapping = visualAssets.missiles[String(event.projectileId)];
            if (from && to && mapping) { const frame = mapping.frames.find((candidate) => candidate.direction === projectileDirection(from, to)) ?? mapping.frames[0]; const sprite = new Sprite(loaded[frame.publicUrl]); sprite.anchor.set(0.5); effects.addChild(sprite); timed.push({ root: sprite, startedAt: now, durationMs: Math.max(220, Math.min(700, 90 * (Math.abs(to.x - from.x) + Math.abs(to.y - from.y)))), kind: 'missile', from: { ...from }, to: { ...to } }); }
          }
          if (event.type === 'melee-hit' || event.type === 'projectile-hit') {
            const target = actorPosition(state, event.targetId); const mapping = visualAssets.effects[String(event.effectId)];
            if (target && mapping) { const root = new Container(); const point = worldPoint(target); root.position.set(point.x, point.y); const sprite = new Sprite(loaded[mapping.frames[0].publicUrl]); sprite.anchor.set(0.5); root.addChild(sprite); effects.addChild(root); timed.push({ root, startedAt: now, durationMs: Math.max(300, mapping.frames.length * 70), kind: 'effect', frames: mapping.frames.map((frame) => frame.publicUrl) }); }
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
            const isMounted = Boolean(character.mountActive && character.mount && character.mount !== 'none');
            const mountUrl = (character.mount === 'donkey' || character.mount === 'Donkey')
              ? '/generated/mounts/donkey_rider_south.png'
              : `/generated/mounts/${character.mount}.png`;
            if (isMounted && loaded[mountUrl]) {
              view.sprite.texture = loaded[mountUrl];
              view.sprite.scale.x = (sample.direction === 'west' || sample.direction === 'north') ? -1 : 1;
              view.lastFrameUrl = mountUrl;
            } else {
              view.sprite.scale.x = 1;
              const outfitKey = character.outfit || character.vocation || 'Knight';
              const charGender = character.gender === 'female' ? 'female' : 'male';
              const colors = character.outfitColors || { head: 0, primary: 86, secondary: 114, detail: 76 };
              const walkFrame = sample.moving ? Math.floor(framePhase * 3) : 0;
              const textureKey = `${outfitKey}_${charGender}_${sample.direction}_${walkFrame}_${colors.head}_${colors.primary}_${colors.secondary}_${colors.detail}`;
              if (view.lastFrameUrl !== textureKey) {
                const canvas = getRecoloredCanvasSync(outfitKey, charGender, sample.direction, walkFrame, colors);
                if (canvas) {
                  const tex = Texture.from(canvas);
                  tex.source.style.scaleMode = 'nearest';
                  view.sprite.texture = tex;
                  view.lastFrameUrl = textureKey;
                } else if (!character.outfitColors) {
                  const nextUrl = frameUrl(view.mapping, sample.direction, framePhase);
                  if (nextUrl !== view.lastFrameUrl) { view.sprite.texture = loaded[nextUrl]; view.lastFrameUrl = nextUrl; }
                }
              }
            }
          } else {
            const nextUrl = frameUrl(view.mapping, sample.direction, framePhase);
            if (nextUrl !== view.lastFrameUrl) { view.sprite.texture = loaded[nextUrl]; view.lastFrameUrl = nextUrl; }
          }
          view.sprite.tint = view.attackUntil > now ? 0xffd0a0 : 0xffffff;
          const hpRatio = enemy ? enemy.hp / enemy.maxHp : actor && character ? actor.hp / character.maxHp : 0;
          const variantColor = enemy?.variant?.visualModifier === 'rare-aura' ? 0xb66cff : 0xffb52e;
          view.label.position.set(0, creatureVisualLayout.nameplateY); view.bar.clear().rect(-creatureVisualLayout.hpBarWidth / 2, creatureVisualLayout.hpBarY, creatureVisualLayout.hpBarWidth, 3).fill({ color: 0x251010 }).rect(-creatureVisualLayout.hpBarWidth / 2, creatureVisualLayout.hpBarY, creatureVisualLayout.hpBarWidth * hpRatio, 3).fill({ color: enemy?.variant ? variantColor : enemy ? 0xd3564d : 0x4fc977 });
          const logical = actor?.position ?? enemy?.position;
          view.debugLabel.visible = latestRef.current.debug;
          view.debugLabel.position.set(0, 18);
          view.debugLabel.text = logical ? `${id}\ntile ${logical.x},${logical.y}\nrender ${sample.renderPosition.x.toFixed(2)},${sample.renderPosition.y.toFixed(2)}` : '';
          view.aura.clear(); if (enemy?.variant) view.aura.circle(0, 4, 17 + Math.sin(now / 180) * 2).stroke({ color: variantColor, width: 1, alpha: 0.7 });
        }

        // Classic Tibia Solid Red Target Rectangle around focused target matching reference
        targetReticle.clear();
        const activeActor = state.encounter.partyActors.find((a) => a.alive);
        const targetId = activeActor?.targetId ?? state.session.characters.find((c) => c.id === activeActor?.characterId)?.combatState.targetId;
        if (targetId) {
          const targetView = views.get(targetId);
          const targetEnemy = state.encounter.enemies.find((e) => e.id === targetId && e.alive);
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
        for (let index = timed.length - 1; index >= 0; index -= 1) {
          const visual = timed[index]; const progress = (now - visual.startedAt) / visual.durationMs;
          visual.root.visible = progress >= 0;
          if (progress < 0) continue;
          if (progress >= 1) { visual.root.destroy({ children: true }); timed.splice(index, 1); continue; }
          if (visual.kind === 'float') { visual.root.y -= app.ticker.deltaMS * 0.025; visual.root.alpha = 1 - progress; }
          if (visual.kind === 'missile' && visual.from && visual.to) {
            const from = worldPoint(visual.from); const to = worldPoint(visual.to);
            visual.root.position.set(from.x + (to.x - from.x) * progress, from.y + (to.y - from.y) * progress);
          }
          if (visual.kind === 'effect' && visual.frames && visual.root.children[0] instanceof Sprite) {
            const frame = visual.frames[Math.min(visual.frames.length - 1, Math.floor(progress * visual.frames.length))];
            (visual.root.children[0] as Sprite).texture = loaded[frame];
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
          const desired = desiredWorldCamera({ viewportWidth: app.screen.width, viewportHeight: app.screen.height, worldWidth: state.encounter.room.map.width * TILE_SIZE, worldHeight: state.encounter.room.map.height * TILE_SIZE, targetX: point.x, targetY: point.y, fixedZoom: 2 });
          camera = cameraInitialized ? smoothWorldCamera(camera, desired, app.ticker.deltaMS) : desired; cameraInitialized = true;
          world.scale.set(camera.zoom); world.position.set(Math.round(app.screen.width / 2 - camera.x * camera.zoom), Math.round(app.screen.height / 2 - camera.y * camera.zoom));
          const debugText = overlay.getChildByLabel('camera-debug') as Text | null;
          if (debugText) {
            debugText.visible = latestRef.current.debug;
            const respawns = state.encounter.continuousProgress?.zones.map((zone) => `${zone.zoneId}: ${zone.activeEnemyIds.length ? `alive [${zone.activeEnemyIds.join(',')}]` : state.encounter.elapsedMs >= zone.nextRespawnAt ? 'ready/safe-wait' : `cooldown ${Math.ceil((zone.nextRespawnAt - state.encounter.elapsedMs) / 1000)}s`}`).join('\n') ?? '';
            debugText.text = `CAM ${state.session.cameraTargetCharacterId} · world ${camera.x.toFixed(1)},${camera.y.toFixed(1)} · viewport ${app.screen.width}×${app.screen.height} · fixed ${camera.zoom.toFixed(0)}x\nGRID red=blocked · blue=occupied · yellow=reserved · cyan=path\nSAFE RESPAWN 7 tiles\n${respawns}`;
          }
        }
      };
      app.ticker.add(render);
      syncRef.current = sync; sync(latestRef.current.game, latestRef.current.debug);
      const onResize = () => { cameraInitialized = false; sync(latestRef.current.game, latestRef.current.debug); };
      window.addEventListener('resize', onResize);
      cleanup = () => { window.removeEventListener('resize', onResize); app.ticker.remove(render); app.destroy(true, { children: true }); };
    })();
    return () => { disposed = true; syncRef.current = null; cleanup?.(); };
  }, []);

  useEffect(() => { latestRef.current = { game, debug, onSelectTarget, onCharacterContextMenu }; syncRef.current?.(game, debug); }, [game, debug, onSelectTarget, onCharacterContextMenu]);
  return <div ref={hostRef} className="pixi-arena" aria-label="Arena OTBM 2D com movimento interpolado, spells, party, monstros e corpses reais" />;
}
