'use client';

import { useEffect, useRef } from 'react';
import thaisCityJson from '@/content/generated/thais-city.json';
import visualAssetsJson from '@/content/generated/tibia860-assets.json';
import type { CharacterState, CombatVisualEvent } from '@/packages/domain/src';
import { calculatePixelCamera } from '@/packages/presentation/src';
import type { Tibia860AssetManifest } from '@/packages/tibia860-assets/src/types';
import type { Application as PixiApplication, Texture as PixiTexture } from 'pixi.js';

interface Props {
  characters: CharacterState[];
  cityPos: { x: number; y: number; z: number };
  isWalking: boolean;
  isTraining: boolean;
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
  visualEvents = [],
  debug = false,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PixiApplication | null>(null);
  const latestRef = useRef({ characters, cityPos, isWalking, isTraining });

  useEffect(() => {
    latestRef.current = { characters, cityPos, isWalking, isTraining };
  }, [characters, cityPos, isWalking, isTraining]);

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
      const outfitUrls = characters.flatMap((c) =>
        visualAssets.outfits[c.vocation]?.frames.map((f) => f.publicUrl) ?? []
      );
      const mapItemUrls = thaisData.tiles.flatMap((t) =>
        t.serverItemIds.flatMap((id) => {
          const mapping = visualAssets.mapItems[String(id)];
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

      // Map tile fast lookup: key = `${x},${y}`
      const tileMap = new Map<string, typeof thaisData.tiles[0]>();
      for (const t of thaisData.tiles) {
        tileMap.set(`${t.x},${t.y}`, t);
      }

      // Training dummies placed in the training room
      const dummyPos = thaisData.trainingDummy;
      const dummySprite = new Sprite(loaded[dummyUrl]);
      dummySprite.anchor.set(0.5, 0.78);
      dummySprite.position.set(dummyPos.x * TILE_SIZE + 16, dummyPos.y * TILE_SIZE + 16);
      dummySprite.zIndex = dummyPos.y * TILE_SIZE + 16;
      objectsLayer.addChild(dummySprite);

      // Depot marker at depot pos
      const depotPos = thaisData.depot;
      const depotDecor = new Sprite(loaded[decorUrl]);
      depotDecor.anchor.set(0.5, 0.5);
      depotDecor.position.set(depotPos.x * TILE_SIZE + 16, depotPos.y * TILE_SIZE + 16);
      depotDecor.zIndex = depotPos.y * TILE_SIZE;
      objectsLayer.addChild(depotDecor);

      // Pre-render world tiles in the Thais bounding box
      const minX = thaisData.bounds.minX;
      const maxX = thaisData.bounds.maxX;
      const minY = thaisData.bounds.minY;
      const maxY = thaisData.bounds.maxY;

      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const tile = tileMap.get(`${x},${y}`);
          const px = x * TILE_SIZE;
          const py = y * TILE_SIZE;

          let hasCustomSprite = false;
          if (tile) {
            for (const sId of tile.serverItemIds) {
              const mapping = visualAssets.mapItems[String(sId)];
              if (mapping?.frame && loaded[mapping.frame.publicUrl]) {
                const sp = new Sprite(loaded[mapping.frame.publicUrl]);
                sp.position.set(px, py);
                sp.roundPixels = true;
                terrainLayer.addChild(sp);
                hasCustomSprite = true;
                break;
              }
            }
          }

          if (!hasCustomSprite) {
            const isWalkable = tile?.walkable ?? false;
            const floorSp = new Sprite(loaded[isWalkable ? floorUrl : wallUrl]);
            floorSp.position.set(px, py);
            floorSp.roundPixels = true;
            terrainLayer.addChild(floorSp);
          }
        }
      }

      // Character actor sprites
      const actorSprites = new Map<string, InstanceType<typeof Sprite>>();
      characters.forEach((char, idx) => {
        const outfit = visualAssets.outfits[char.vocation];
        const initialUrl = outfit?.frames.find((f) => f.direction === 'south')?.publicUrl ?? outfit?.frames[0]?.publicUrl;
        if (initialUrl && loaded[initialUrl]) {
          const sp = new Sprite(loaded[initialUrl]);
          sp.anchor.set(0.5, 0.78);
          sp.roundPixels = true;
          actorsLayer.addChild(sp);
          actorSprites.set(char.id, sp);
        }
      });

      // Ticker to follow player smoothly and animate characters
      let walkFrame = 0;
      let tickCount = 0;

      app.ticker.add(() => {
        const { characters: curChars, cityPos: curPos, isWalking: curWalk, isTraining: curTrain } = latestRef.current;
        tickCount++;

        if (curWalk && tickCount % 12 === 0) {
          walkFrame = (walkFrame + 1) % 4;
        }

        // Camera smoothly follows curPos
        const camera = calculatePixelCamera(app.screen.width, app.screen.height, TILE_SIZE);
        world.scale.set(camera.scale);

        // Center on cityPos
        const focusPixelX = curPos.x * TILE_SIZE + 16;
        const focusPixelY = curPos.y * TILE_SIZE + 16;
        world.position.set(
          app.screen.width / 2 - focusPixelX * camera.scale,
          app.screen.height / 2 - focusPixelY * camera.scale
        );

        // Update party character positions
        curChars.forEach((char, idx) => {
          const sp = actorSprites.get(char.id);
          if (!sp) return;

          // Offset party members slightly around the leader
          const offsetX = idx === 0 ? 0 : idx === 1 ? -24 : idx === 2 ? 24 : 0;
          const offsetY = idx === 0 ? 0 : idx === 3 ? 24 : 12;

          sp.position.set(focusPixelX + offsetX, focusPixelY + offsetY);
          sp.zIndex = focusPixelY + offsetY;

          // Animate attack if training
          if (curTrain && idx === 0 && tickCount % 30 < 10) {
            sp.x += 4;
          }
        });
      });

      cleanup = () => {
        app.destroy(true, { children: true });
      };
    })();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [characters]);

  return (
    <div
      ref={hostRef}
      className="thais-city-viewport"
      style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
    />
  );
}
