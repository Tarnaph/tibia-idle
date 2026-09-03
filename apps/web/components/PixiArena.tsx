'use client';

import { useEffect, useRef } from 'react';
import visualAssetsJson from '@/content/generated/tibia860-assets.json';
import type { CardinalDirection, GameState, GridPosition } from '@/packages/domain/src';
import { creatureVisualLayout, desiredWorldCamera, smoothWorldCamera, snapWorldCoordinate, VisualMotionTrack, visualMovementConfig, type WorldCameraState } from '@/packages/presentation/src';
import type { Tibia860AssetManifest, VisualAssetMapping } from '@/packages/tibia860-assets/src/types';
import type { Container, Graphics, Sprite, Text, Texture } from 'pixi.js';

interface PixiArenaProps { game: GameState; debug: boolean }
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

function baseVocation(vocation: string): 'Knight' | 'Paladin' | 'Sorcerer' | 'Druid' {
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

export function PixiArena({ game, debug }: PixiArenaProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const syncRef = useRef<((state: GameState, showDebug: boolean) => void) | null>(null);
  const latestRef = useRef({ game, debug });

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;
    void (async () => {
      const pixi = await import('pixi.js');
      const { Application, Assets, Container, Graphics, Sprite, Text, Texture } = pixi;
      const app = new Application();
      await app.init({ resizeTo: hostRef.current ?? undefined, antialias: false, background: 0x080a0b, resolution: Math.min(2, window.devicePixelRatio), autoDensity: true, roundPixels: true });
      if (disposed || !hostRef.current) { app.destroy(true, { children: true }); return; }
      const urls = new Set<string>();
      for (const asset of [...Object.values(visualAssets.creatures), ...Object.values(visualAssets.outfits), ...Object.values(visualAssets.effects), ...Object.values(visualAssets.missiles)]) {
        for (const frame of asset.frames) urls.add(frame.publicUrl);
      }
      for (const item of [...Object.values(visualAssets.corpses), ...Object.values(visualAssets.mapItems)]) if (item.frame) urls.add(item.frame.publicUrl);
      const loaded = await Assets.load([...urls]) as Record<string, Texture>;
      if (disposed) { app.destroy(true, { children: true }); return; }
      for (const texture of Object.values(loaded)) texture.source.style.scaleMode = 'nearest';

      // Pre-render authentic Tibia torch textures
      const torchSize = 512;
      const alphaCanvas = document.createElement('canvas');
      alphaCanvas.width = torchSize;
      alphaCanvas.height = torchSize;
      const alphaCtx = alphaCanvas.getContext('2d')!;
      const alphaCenter = torchSize / 2;
      const alphaGrad = alphaCtx.createRadialGradient(alphaCenter, alphaCenter, 24, alphaCenter, alphaCenter, alphaCenter);
      alphaGrad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
      alphaGrad.addColorStop(0.35, 'rgba(255, 255, 255, 0.95)');
      alphaGrad.addColorStop(0.65, 'rgba(255, 255, 255, 0.60)');
      alphaGrad.addColorStop(0.85, 'rgba(255, 255, 255, 0.20)');
      alphaGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
      alphaCtx.fillStyle = alphaGrad;
      alphaCtx.beginPath();
      alphaCtx.arc(alphaCenter, alphaCenter, alphaCenter, 0, Math.PI * 2);
      alphaCtx.fill();
      const torchAlphaTexture = Texture.from(alphaCanvas);

      const warmCanvas = document.createElement('canvas');
      warmCanvas.width = torchSize;
      warmCanvas.height = torchSize;
      const warmCtx = warmCanvas.getContext('2d')!;
      const warmGrad = warmCtx.createRadialGradient(alphaCenter, alphaCenter, 16, alphaCenter, alphaCenter, alphaCenter);
      warmGrad.addColorStop(0, 'rgba(255, 205, 110, 0.32)');
      warmGrad.addColorStop(0.40, 'rgba(255, 150, 50, 0.16)');
      warmGrad.addColorStop(0.75, 'rgba(200, 90, 20, 0.05)');
      warmGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
      warmCtx.fillStyle = warmGrad;
      warmCtx.beginPath();
      warmCtx.arc(alphaCenter, alphaCenter, alphaCenter, 0, Math.PI * 2);
      warmCtx.fill();
      const torchWarmTexture = Texture.from(warmCanvas);

      const world = new Container();
      const backing = new Container();
      const terrain = new Container();
      const corpses = new Container();
      const actors = new Container();
      const darkness = new Container();
      const ambientFill = new Graphics();
      const torchCutouts = new Container();
      darkness.addChild(ambientFill, torchCutouts);
      const warmGlow = new Container();
      warmGlow.blendMode = 'add';
      const effects = new Container();
      const spatialDebug = new Container();
      const overlay = new Container();
      actors.sortableChildren = true; effects.sortableChildren = true;
      world.addChild(backing, terrain, corpses, actors, darkness, warmGlow, effects, spatialDebug);
      app.stage.addChild(world, overlay);
      hostRef.current.appendChild(app.canvas);
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
        backing.addChild(new Graphics().rect(0, 0, state.encounter.room.map.width * TILE_SIZE, state.encounter.room.map.height * TILE_SIZE).fill({ color: 0x11120f }));
        ambientFill.clear().rect(0, 0, state.encounter.room.map.width * TILE_SIZE, state.encounter.room.map.height * TILE_SIZE).fill({ color: 0x040608, alpha: 0.76 });
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

      const createView = (id: string, mapping: VisualAssetMapping, position: GridPosition, direction: CardinalDirection, labelText: string): ActorView => {
        const root = new Container();
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
        const from = actorPosition(state, event.sourceId); const to = actorPosition(state, event.targetId);
        if (!from || !to) return;
        if (typeof event.projectileId === 'number') {
          const mapping = visualAssets.missiles[String(event.projectileId)];
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
            timed.push({ root, startedAt: now + (event.projectileId === null ? 0 : 240), durationMs: Math.max(300, mapping.frames.length * 70), kind: 'effect', frames: mapping.frames.map((frame) => frame.publicUrl) });
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
          const mapping = visualAssets.outfits[baseVocation(character.vocation)];
          const view = views.get(actor.characterId) ?? createView(actor.characterId, mapping, actor.previousPosition, actor.direction, character.name);
          view.label.text = character.name; view.sprite.alpha = actor.alive ? 1 : 0.45;
        }
        for (const enemy of state.encounter.enemies.filter((candidate) => candidate.alive)) {
          liveIds.add(enemy.id); const mapping = visualAssets.creatures[enemy.monsterId]; if (!mapping) continue;
          const view = views.get(enemy.id) ?? createView(enemy.id, mapping, enemy.previousPosition, enemy.direction, enemy.name);
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
          if (event.type !== 'player-attack' && event.type !== 'enemy-attack' && event.type !== 'spell-cast') continue;
          const targetId = event.targetId; const targetPosition = actorPosition(state, targetId); if (!targetPosition) continue;
          const amount = event.type === 'spell-cast' ? event.amount : event.damage;
          if (amount > 0) {
            const isHealing = event.type === 'spell-cast' && event.healing;
            const prefix = isHealing ? '+' : '';
            const text = new Text({ text: `${prefix}${amount}`, style: { fill: isHealing ? 0x62e58a : 0xff766b, stroke: { color: 0x1a0504, width: 3 }, fontSize: 12, fontFamily: 'Arial', fontWeight: '800' } });
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
          const nextUrl = frameUrl(view.mapping, sample.direction, framePhase);
          if (nextUrl !== view.lastFrameUrl) { view.sprite.texture = loaded[nextUrl]; view.lastFrameUrl = nextUrl; }
          view.sprite.tint = view.attackUntil > now ? 0xffd0a0 : 0xffffff;
          const enemy = state.encounter.enemies.find((candidate) => candidate.id === id);
          const actor = state.encounter.partyActors.find((candidate) => candidate.characterId === id);
          const character = actor ? state.session.characters.find((candidate) => candidate.id === id) : undefined;
          const hpRatio = enemy ? enemy.hp / enemy.maxHp : actor && character ? actor.hp / character.maxHp : 0;
          const variantColor = enemy?.variant?.visualModifier === 'rare-aura' ? 0xb66cff : 0xffb52e;
          view.label.position.set(0, creatureVisualLayout.nameplateY); view.bar.clear().rect(-creatureVisualLayout.hpBarWidth / 2, creatureVisualLayout.hpBarY, creatureVisualLayout.hpBarWidth, 3).fill({ color: 0x251010 }).rect(-creatureVisualLayout.hpBarWidth / 2, creatureVisualLayout.hpBarY, creatureVisualLayout.hpBarWidth * hpRatio, 3).fill({ color: enemy?.variant ? variantColor : enemy ? 0xd3564d : 0x4fc977 });
          const logical = actor?.position ?? enemy?.position;
          view.debugLabel.visible = latestRef.current.debug;
          view.debugLabel.position.set(0, 18);
          view.debugLabel.text = logical ? `${id}\ntile ${logical.x},${logical.y}\nrender ${sample.renderPosition.x.toFixed(2)},${sample.renderPosition.y.toFixed(2)}` : '';
          view.aura.clear(); if (enemy?.variant) view.aura.circle(0, 4, 17 + Math.sin(now / 180) * 2).stroke({ color: variantColor, width: 1, alpha: 0.7 });
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
        darkness.visible = !showDebug;
        warmGlow.visible = !showDebug;

        if (!showDebug) {
          torchCutouts.removeChildren();
          warmGlow.removeChildren();
          const flicker = Math.sin(now * 0.006) * 2 + Math.cos(now * 0.011) * 1.5;
          for (const actor of state.encounter.partyActors) {
            const visualPos = views.get(actor.characterId)?.track.sample(now).renderPosition ?? actor.position;
            const p = worldPoint(visualPos);

            const cutout = new Sprite(torchAlphaTexture);
            cutout.anchor.set(0.5);
            cutout.position.set(p.x, p.y);
            cutout.blendMode = 'erase';
            cutout.scale.set(1 + flicker * 0.008);
            torchCutouts.addChild(cutout);

            const glow = new Sprite(torchWarmTexture);
            glow.anchor.set(0.5);
            glow.position.set(p.x, p.y);
            glow.alpha = 0.40;
            glow.scale.set(1 + flicker * 0.012);
            warmGlow.addChild(glow);
          }
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

  useEffect(() => { latestRef.current = { game, debug }; syncRef.current?.(game, debug); }, [game, debug]);
  return <div ref={hostRef} className="pixi-arena" aria-label="Arena OTBM 2D com movimento interpolado, spells, party, monstros e corpses reais" />;
}
