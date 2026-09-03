'use client';

import { useEffect, useRef } from 'react';
import visualAssetsJson from '@/content/generated/tibia860-assets.json';
import type { CharacterState, CombatVisualEvent, TrainableSkill } from '@/packages/domain/src';
import { calculatePixelCamera, creatureVisualLayout } from '@/packages/presentation/src';
import type { Tibia860AssetManifest } from '@/packages/tibia860-assets/src/types';
import type { Application as PixiApplication, Texture as PixiTexture } from 'pixi.js';

interface TrainingMember { character: CharacterState; skill: TrainableSkill; progress: number }
interface TrainingArenaProps { members: TrainingMember[]; visualEvents: CombatVisualEvent[]; debug: boolean }
const visualAssets = visualAssetsJson as Tibia860AssetManifest;
const TILE_SIZE = 32;

export function TrainingArena({ members, visualEvents, debug }: TrainingArenaProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PixiApplication | null>(null);
  const latestMembers = useRef(members);
  const visualSyncRef = useRef<((events: CombatVisualEvent[]) => void) | null>(null);
  const memberStructure = members.map(({ character }) => `${character.id}:${character.vocation}`).join('|');

  useEffect(() => { latestMembers.current = members; }, [members]);
  useEffect(() => { visualSyncRef.current?.(visualEvents); }, [visualEvents]);

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;
    void (async () => {
      const { Application, Assets, Container, Graphics, Sprite, Text } = await import('pixi.js');
      const app = new Application();
      await app.init({ resizeTo: hostRef.current ?? undefined, antialias: false, background: 0x090b0c, resolution: Math.min(2, window.devicePixelRatio), autoDensity: true, roundPixels: true });
      if (disposed || !hostRef.current) { app.destroy(true, { children: true }); return; }
      const floorUrl = visualAssets.assets.trainingFloor.frames[0].publicUrl;
      const wallUrl = visualAssets.assets.trainingWall.frames[0].publicUrl;
      const rugUrl = visualAssets.assets.trainingRug.frames[0].publicUrl;
      const dummyUrl = visualAssets.assets.trainingDummy.frames[0].publicUrl;
      const decorUrl = visualAssets.assets.trainingDecor.frames[0].publicUrl;
      const renderMembers = latestMembers.current;
      const outfitUrls = renderMembers.flatMap(({ character }) => visualAssets.outfits[character.vocation].frames.map((frame) => frame.publicUrl));
      const effectUrls = [10, 13].flatMap((id) => visualAssets.effects[String(id)]?.frames.map((frame) => frame.publicUrl) ?? []);
      const missileUrls = visualAssets.missiles['28']?.frames.map((frame) => frame.publicUrl) ?? [];
      const loaded = await Assets.load([...new Set([floorUrl, wallUrl, rugUrl, dummyUrl, decorUrl, ...outfitUrls, ...effectUrls, ...missileUrls])]) as Record<string, PixiTexture>;
      if (disposed) { app.destroy(true, { children: true }); return; }
      for (const texture of Object.values(loaded)) texture.source.style.scaleMode = 'nearest';
      const world = new Container(); const terrain = new Container(); const actors = new Container(); const effects = new Container(); const overlay = new Container();
      world.addChild(terrain, actors, effects); app.stage.addChild(world, overlay); appRef.current = app; hostRef.current.appendChild(app.canvas);
      const memberPoints = new Map<string, { x: number; y: number }>(); let dummyPoint = { x: 0, y: 0 };
      const timed: Array<{ sprite: InstanceType<typeof Sprite>; start: number; from: { x: number; y: number }; to: { x: number; y: number }; frames: string[]; projectile: boolean }> = [];

      const rebuild = () => {
        terrain.removeChildren().forEach((child) => child.destroy({ children: true }));
        actors.removeChildren().forEach((child) => child.destroy({ children: true }));
        overlay.removeChildren().forEach((child) => child.destroy({ children: true }));
        const camera = calculatePixelCamera(app.screen.width, app.screen.height, TILE_SIZE);
        world.scale.set(camera.scale); world.position.set(camera.originX * camera.scale, camera.originY * camera.scale);
        for (let y = 0; y < camera.visibleRows; y += 1) for (let x = 0; x < camera.visibleColumns; x += 1) {
          const floor = new Sprite(loaded[floorUrl]); floor.position.set(x * TILE_SIZE, y * TILE_SIZE); floor.roundPixels = true; terrain.addChild(floor);
        }
        const centerX = Math.floor(camera.visibleColumns / 2); const centerY = Math.floor(camera.visibleRows / 2);
        for (let x = 2; x < camera.visibleColumns - 2; x += 2) {
          const wall = new Sprite(loaded[wallUrl]); wall.position.set(x * TILE_SIZE, TILE_SIZE); wall.roundPixels = true; terrain.addChild(wall);
        }
        // One compact 5×3 training mat: the real seamless carpet tile is no longer repeated over most of the room.
        for (let y = centerY - 1; y <= centerY + 1; y += 1) for (let x = centerX - 2; x <= centerX + 2; x += 1) {
          const rug = new Sprite(loaded[rugUrl]); rug.position.set(x * TILE_SIZE, y * TILE_SIZE); rug.roundPixels = true; terrain.addChild(rug);
        }
        for (const [x, y] of [[2, 3], [camera.visibleColumns - 4, 3], [2, camera.visibleRows - 3], [camera.visibleColumns - 4, camera.visibleRows - 3]]) {
          const decor = new Sprite(loaded[decorUrl]); decor.position.set(x * TILE_SIZE, y * TILE_SIZE); decor.roundPixels = true; terrain.addChild(decor);
        }
        const dummy = new Sprite(loaded[dummyUrl]);
        dummy.anchor.set(creatureVisualLayout.spriteAnchorX, creatureVisualLayout.spriteAnchorY);
        dummy.position.set((centerX + 1) * TILE_SIZE + 16 + creatureVisualLayout.spriteOffsetX, centerY * TILE_SIZE + 16 + creatureVisualLayout.spriteOffsetY);
        actors.addChild(dummy); dummyPoint = { x: dummy.x, y: dummy.y };
        const positions = [[centerX - 1, centerY], [centerX - 1, centerY - 1], [centerX - 2, centerY + 1], [centerX - 2, centerY - 1]];
        renderMembers.forEach(({ character, skill, progress }, index) => {
          const appearance = visualAssets.outfits[character.vocation];
          const east = appearance.frames.filter((frame) => frame.direction === 'east');
          const sprite = new Sprite(loaded[(east[0] ?? appearance.frames[0]).publicUrl]);
          sprite.anchor.set(creatureVisualLayout.spriteAnchorX, creatureVisualLayout.spriteAnchorY);
          sprite.position.set(positions[index][0] * TILE_SIZE + 16 + creatureVisualLayout.spriteOffsetX, positions[index][1] * TILE_SIZE + 16 + creatureVisualLayout.spriteOffsetY);
          actors.addChild(sprite);
          memberPoints.set(character.id, { x: sprite.x, y: sprite.y });
          const label = new Text({ text: `${character.name} · ${skill} ${character.skills[skill]}`, style: { fill: 0x69df82, stroke: { color: 0x071108, width: 3 }, fontSize: 9, fontWeight: '700', fontFamily: 'Arial' } });
          label.anchor.set(0.5); label.position.set(sprite.x, sprite.y - 28); actors.addChild(label);
          const meter = new Graphics().rect(sprite.x - 16, sprite.y + 17, 32, 3).fill({ color: 0x171b18 }).rect(sprite.x - 16, sprite.y + 17, 32 * progress, 3).fill({ color: 0xd8b64f }); actors.addChild(meter);
        });
        const title = new Text({ text: `TREINO ATIVO · ${renderMembers.length} MEMBRO(S)${debug ? ` · ${camera.visibleColumns}×${camera.visibleRows} · ${camera.scale}x` : ''}`, style: { fill: 0xe1c568, fontSize: 10, fontWeight: '700', fontFamily: 'Arial', letterSpacing: 1 } });
        title.position.set(12, 10); overlay.addChild(title);
      };
      rebuild();
      visualSyncRef.current = (events) => {
        for (const event of events.filter((candidate): candidate is Extract<CombatVisualEvent, { type: 'training-action' }> => candidate.type === 'training-action')) {
          const from = memberPoints.get(event.sourceId); if (!from) continue;
          const mapping = event.projectileId ? visualAssets.missiles[String(event.projectileId)] : visualAssets.effects[String(event.effectId)];
          const frames = mapping?.frames.map((frame) => frame.publicUrl) ?? []; if (!frames.length) continue;
          const sprite = new Sprite(loaded[frames[0]]); sprite.anchor.set(0.5); sprite.position.set(event.projectileId ? from.x : dummyPoint.x, event.projectileId ? from.y : dummyPoint.y); effects.addChild(sprite);
          timed.push({ sprite, start: performance.now(), from: { ...from }, to: { ...dummyPoint }, frames, projectile: event.projectileId !== null });
        }
      };
      const animate = () => { const now = performance.now(); for (let index = timed.length - 1; index >= 0; index -= 1) { const visual = timed[index]; const progress = (now - visual.start) / 500; if (progress >= 1) { visual.sprite.destroy(); timed.splice(index, 1); continue; } if (visual.projectile) visual.sprite.position.set(visual.from.x + (visual.to.x - visual.from.x) * progress, visual.from.y + (visual.to.y - visual.from.y) * progress); else visual.sprite.texture = loaded[visual.frames[Math.min(visual.frames.length - 1, Math.floor(progress * visual.frames.length))]]; } };
      app.ticker.add(animate);
      const onResize = () => rebuild(); window.addEventListener('resize', onResize); cleanup = () => window.removeEventListener('resize', onResize);
    })();
    return () => { disposed = true; visualSyncRef.current = null; cleanup?.(); appRef.current?.destroy(true, { children: true }); appRef.current = null; };
  }, [debug, memberStructure]);
  return <div ref={hostRef} className="pixi-arena training-arena" aria-label="Training Room funcional com party e progresso de skills" />;
}
