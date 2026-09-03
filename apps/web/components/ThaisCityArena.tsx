'use client';

import { useEffect, useRef } from 'react';
import thaisCityJson from '@/content/generated/thais-city.json';
import visualAssetsJson from '@/content/generated/tibia860-assets.json';
import type { CharacterState, CombatVisualEvent } from '@/packages/domain/src';
import { calculatePixelCamera, creatureVisualLayout } from '@/packages/presentation/src';
import type { Tibia860AssetManifest } from '@/packages/tibia860-assets/src/types';
import type { Application as PixiApplication, Texture as PixiTexture } from 'pixi.js';

interface Props {
  characters: CharacterState[];
  cityPos: { x: number; y: number; z: number };
  isWalking: boolean;
  isTraining: boolean;
  stepDurationMs?: number;
  onTileClick?: (tile: { x: number; y: number; z: number }) => void;
  visualEvents?: CombatVisualEvent[];
  debug?: boolean;
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

export function ThaisCityArena({
  characters,
  cityPos,
  isWalking,
  isTraining,
  stepDurationMs = 500,
  onTileClick,
  visualEvents = [],
  debug = false,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PixiApplication | null>(null);
  const latestRef = useRef({ characters, cityPos, isWalking, isTraining, stepDurationMs, onTileClick });

  useEffect(() => {
    latestRef.current = { characters, cityPos, isWalking, isTraining, stepDurationMs, onTileClick };
  }, [characters, cityPos, isWalking, isTraining, stepDurationMs, onTileClick]);


  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;

    void (async () => {
      const { Application, Assets, Container, Graphics, Sprite, Text } = await import('pixi.js');
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

      // Collect assets to load
      const floorUrl = visualAssets.assets.trainingFloor.frames[0].publicUrl;
      const wallUrl = visualAssets.assets.trainingWall.frames[0].publicUrl;
      const rugUrl = visualAssets.assets.trainingRug.frames[0].publicUrl;
      const dummyUrl = visualAssets.assets.trainingDummy.frames[0].publicUrl;
      const decorUrl = visualAssets.assets.trainingDecor.frames[0].publicUrl;
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
        ...new Set([floorUrl, wallUrl, rugUrl, dummyUrl, decorUrl, ...outfitUrls, ...mapItemUrls]),
      ];
      const loaded = (await Assets.load(allUrls)) as Record<string, PixiTexture>;

      if (disposed) {
        app.destroy(true, { children: true });
        return;
      }

      for (const texture of Object.values(loaded)) {
        texture.source.style.scaleMode = 'nearest';
      }

      const world = new Container();
      const terrainLayer = new Container();
      const objectsLayer = new Container();
      const actorsLayer = new Container();
      const overlayLayer = new Container();

      actorsLayer.sortableChildren = true;
      objectsLayer.sortableChildren = true;

      world.addChild(terrainLayer, objectsLayer, actorsLayer);
      app.stage.addChild(world, overlayLayer);
      appRef.current = app;
      hostRef.current.appendChild(app.canvas);

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

      // Training dummies placed in the training room
      const dummyPos = thaisData.trainingDummy;
      const dummySprite = new Sprite(loaded[dummyUrl]);
      dummySprite.anchor.set(0.5, 0.78);
      dummySprite.position.set(dummyPos.x * TILE_SIZE + 16, dummyPos.y * TILE_SIZE + 16);
      dummySprite.zIndex = dummyPos.y * TILE_SIZE + 16;
      objectsLayer.addChild(dummySprite);

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

          // Render Z: 7 (ground floor)
          let hasGroundSprite = false;
          if (tile7) {
            // First pass: render ground in terrainLayer
            for (const sId of tile7.serverItemIds) {
              const mapping = visualAssets.mapItems[String(sId)];
              if (mapping?.isGround && mapping.frame && loaded[mapping.frame.publicUrl]) {
                const sp = new Sprite(loaded[mapping.frame.publicUrl]);
                sp.position.set(px, py);
                sp.roundPixels = true;
                terrainLayer.addChild(sp);
                hasGroundSprite = true;
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

            // Second pass: render all non-ground objects
            for (const sId of tile7.serverItemIds) {
              const mapping = visualAssets.mapItems[String(sId)];
              if (!mapping?.isGround && mapping?.frame && loaded[mapping.frame.publicUrl]) {
                const sp = new Sprite(loaded[mapping.frame.publicUrl]);
                const offsetY = mapping.frame.height > 32 ? -(mapping.frame.height - 32) : 0;
                const offsetX = mapping.frame.width > 32 ? -(mapping.frame.width - 32) : 0;
                sp.position.set(px + offsetX, py + offsetY);
                sp.roundPixels = true;
                sp.zIndex = py + 32;
                objectsLayer.addChild(sp);
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

          if (!hasGroundSprite) {
            const isWalkable = tile7?.walkable ?? false;
            const floorSp = new Sprite(loaded[isWalkable ? floorUrl : wallUrl]);
            floorSp.position.set(px, py);
            floorSp.roundPixels = true;
            terrainLayer.addChild(floorSp);
          }

          // Render Z: 6 (upper walkways, stairs top, dock pier)
          if (tile6) {
            for (const sId of tile6.serverItemIds) {
              const mapping = visualAssets.mapItems[String(sId)];
              if (mapping?.isGround && mapping.frame && loaded[mapping.frame.publicUrl]) {
                const sp = new Sprite(loaded[mapping.frame.publicUrl]);
                sp.position.set(px, py);
                sp.roundPixels = true;
                sp.zIndex = py;
                objectsLayer.addChild(sp);
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
                sp.zIndex = py + 36;
                objectsLayer.addChild(sp);
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
      };

      const onPointerLeave = () => {
        hoverCursor.visible = false;
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
        const tile = activeTileMap.get(`${tileX},${tileY}`) || tileMapZ7.get(`${tileX},${tileY}`);
        if (tile && tile.walkable) {
          latestRef.current.onTileClick?.({ x: tileX, y: tileY, z: tile.z });
        }
      };

      app.canvas.addEventListener('pointermove', onPointerMove);
      app.canvas.addEventListener('pointerleave', onPointerLeave);
      app.canvas.addEventListener('pointerdown', onPointerDown);

      // Character actor containers with crisp nameplate and health bar
      interface CityActorView {
        root: InstanceType<typeof Container>;
        sprite: InstanceType<typeof Sprite>;
        label: InstanceType<typeof Text>;
        bar: InstanceType<typeof Graphics>;
        lastUrl: string;
      }
      const actorViews = new Map<string, CityActorView>();

      function getOutfitFrameUrl(vocation: string, direction: string, frame: number): string {
        const outfit = visualAssets.outfits[vocation] || Object.values(visualAssets.outfits)[0];
        if (!outfit) return '';
        const dirFrames = outfit.frames.filter((f) => f.direction === direction);
        const candidates = dirFrames.length > 0 ? dirFrames : outfit.frames.filter((f) => f.direction === 'south');
        const match = candidates.find((f) => f.frame === frame) ?? candidates[0];
        return match?.publicUrl ?? outfit.frames[0]?.publicUrl ?? '';
      }

      function ensureActorView(char: CharacterState): CityActorView | null {
        let view = actorViews.get(char.id);
        if (view) return view;

        const initialUrl = getOutfitFrameUrl(char.vocation, 'south', 0);
        if (!initialUrl || !loaded[initialUrl]) return null;

        const root = new Container();
        const sprite = new Sprite(loaded[initialUrl]);
        sprite.anchor.set(0.5, 0.78);
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

        view = { root, sprite, label, bar, lastUrl: initialUrl };
        actorViews.set(char.id, view);
        return view;
      }

      characters.forEach(ensureActorView);

      // Ticker to smoothly follow player, animate characters & animate map elements
      let playerDirection: 'north' | 'south' | 'east' | 'west' = 'south';
      let currentPixelX = latestRef.current.cityPos.x * TILE_SIZE + 16;
      let currentPixelY = latestRef.current.cityPos.y * TILE_SIZE + 16;
      let tickCount = 0;

      app.ticker.add(() => {
        const { characters: curChars, cityPos: curPos, isWalking: curWalk, isTraining: curTrain, stepDurationMs: curStepDuration } = latestRef.current;
        tickCount++;
        const now = performance.now();

        // 1. Animate all animated map elements (mystic blue fire, teleports, torches, lamps, fountains, water)
        for (const anim of animatedMapSprites) {
          const frameIdx = Math.floor(now / anim.frameDurationMs) % anim.frames.length;
          const url = anim.frames[frameIdx];
          if (url && loaded[url] && anim.sprite.texture !== loaded[url]) {
            anim.sprite.texture = loaded[url];
          }
        }

        // 2. Movement speed calibrated to official TFS level-based speed
        const targetPixelX = curPos.x * TILE_SIZE + 16;
        const targetPixelY = curPos.y * TILE_SIZE + 16;
        const deltaX = targetPixelX - currentPixelX;
        const deltaY = targetPixelY - currentPixelY;
        const dist = Math.hypot(deltaX, deltaY);

        let isMoving = false;
        if (dist > 0.5) {
          isMoving = true;
          const deltaMs = app.ticker.deltaMS || 16.66;
          // Step duration in ms determines pixels per ms
          const targetPixelsPerFrame = (32 / Math.max(80, curStepDuration)) * deltaMs;
          const stepSpeed = Math.max(targetPixelsPerFrame, dist * 0.24);

          if (dist <= stepSpeed) {
            currentPixelX = targetPixelX;
            currentPixelY = targetPixelY;
          } else {
            currentPixelX += (deltaX / dist) * stepSpeed;
            currentPixelY += (deltaY / dist) * stepSpeed;
          }

          if (Math.abs(deltaX) > Math.abs(deltaY)) {
            playerDirection = deltaX > 0 ? 'east' : 'west';
          } else if (Math.abs(deltaY) > 0) {
            playerDirection = deltaY > 0 ? 'south' : 'north';
          }
        } else {
          currentPixelX = targetPixelX;
          currentPixelY = targetPixelY;
        }

        // 3. Camera smoothly follows interpolated player position
        const camera = calculatePixelCamera(app.screen.width, app.screen.height, TILE_SIZE);
        world.scale.set(camera.scale);
        world.position.set(
          app.screen.width / 2 - currentPixelX * camera.scale,
          app.screen.height / 2 - currentPixelY * camera.scale
        );

        // 4. Update party characters: walking animation frames, names, and authentic health bars
        // Walk frame sequence: 0 -> 1 -> 0 -> 2
        const walkCycle = [0, 1, 0, 2];
        const stepRateMs = Math.max(100, Math.min(200, Math.floor(curStepDuration / 3)));
        const walkFrame = isMoving || curWalk ? walkCycle[Math.floor(now / stepRateMs) % 4] : 0;

        curChars.forEach((char, idx) => {
          const view = ensureActorView(char);
          if (!view) return;

          // Texture based on direction and walking animation
          const nextUrl = getOutfitFrameUrl(char.vocation, playerDirection, walkFrame);
          if (nextUrl && nextUrl !== view.lastUrl && loaded[nextUrl]) {
            view.sprite.texture = loaded[nextUrl];
            view.lastUrl = nextUrl;
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
            view.sprite.x = 4;
          } else {
            view.sprite.x = 0;
          }
        });
      });

      cleanup = () => {
        app.canvas.removeEventListener('pointermove', onPointerMove);
        app.canvas.removeEventListener('pointerleave', onPointerLeave);
        app.canvas.removeEventListener('pointerdown', onPointerDown);
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
