'use client';

import React, { useMemo, useRef, useState } from 'react';
import type { HuntDefinition } from '@/packages/domain/src';
import type { MonsterDefinition } from '@/packages/content-schema/src';
import visualAssetsJson from '@/content/generated/tibia1098-assets.json';
import type { Tibia1098AssetManifest } from '@/packages/tibia1098-assets/src/types';
import { ItemSprite } from '../ItemSprite';
import type { LootItemEntry } from './HuntLootTooltip';

const assets = visualAssetsJson as Tibia1098AssetManifest;

interface Props {
  hunt: HuntDefinition;
  isSelected: boolean;
  position: 'prev' | 'center' | 'next';
  monsters: MonsterDefinition[];
  characterLevel?: number;
  onClick?(): void;
  onHoverLoot?(lootList: LootItemEntry[], rect: DOMRect | null, huntTitle: string): void;
}

export function getDifficultyColor(recLevel: number, charLevel?: number): { color: string; label: string } {
  if (typeof charLevel !== 'number' || charLevel <= 0) {
    return { color: '#facc15', label: 'Adequado' };
  }
  if (charLevel >= recLevel + 3) {
    return { color: '#4ade80', label: 'Fácil' };
  }
  if (charLevel >= recLevel - 2) {
    return { color: '#facc15', label: 'Adequado' };
  }
  return { color: '#f87171', label: 'Perigoso' };
}

export function HuntCard({
  hunt,
  isSelected,
  position,
  monsters,
  characterLevel,
  onClick,
  onHoverLoot,
}: Props) {
  const backpackBtnRef = useRef<HTMLButtonElement | null>(null);
  const [bgFailed, setBgFailed] = useState(false);

  // Monster resolution
  const primaryMonsterId = hunt.monsters[0];
  const primaryMonster = useMemo(() => {
    return monsters.find((m) => m.id === primaryMonsterId) ?? null;
  }, [monsters, primaryMonsterId]);

  // Monster sprite url
  const monsterSpriteUrl = useMemo(() => {
    if (!primaryMonsterId) return null;
    const asset = assets.creatures[primaryMonsterId];
    if (!asset) return null;
    if (asset.thumbUrl) return asset.thumbUrl;
    const southFrame = asset.frames?.find((f) => f.direction === 'south');
    return southFrame?.publicUrl ?? asset.frames?.[0]?.publicUrl ?? null;
  }, [primaryMonsterId]);

  // Consolidated loot list
  const lootList = useMemo<LootItemEntry[]>(() => {
    const map = new Map<number, LootItemEntry>();
    for (const monsterId of hunt.monsters) {
      const mDef = monsters.find((cand) => cand.id === monsterId);
      if (!mDef?.loot) continue;
      for (const drop of mDef.loot) {
        if (drop.itemId !== undefined && drop.chance !== undefined) {
          const existing = map.get(drop.itemId);
          if (!existing || existing.chance < drop.chance) {
            map.set(drop.itemId, { itemId: drop.itemId, name: drop.name, chance: drop.chance });
          }
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => b.chance - a.chance);
  }, [hunt.monsters, monsters]);

  // Preview drops (up to 3 distinct items for the mini row)
  const miniPreviewDrops = useMemo(() => {
    return lootList.slice(0, 3);
  }, [lootList]);

  // Thematic background image
  const backgroundImageUrl = useMemo(() => {
    if (bgFailed) return '/images/hunts/default.jpg';
    return `/images/hunts/${hunt.id}.jpg`;
  }, [hunt.id, bgFailed]);

  const huntTitle = hunt.displayName || hunt.name;
  const huntDescription = hunt.shortDescription || hunt.description;
  const recommendedLevel = hunt.recommendedLevel ?? hunt.minimumLevel ?? 1;
  const diff = getDifficultyColor(recommendedLevel, characterLevel);

  const handleBackpackEnter = () => {
    if (backpackBtnRef.current && onHoverLoot) {
      const rect = backpackBtnRef.current.getBoundingClientRect();
      onHoverLoot(lootList, rect, huntTitle);
    }
  };

  const handleBackpackLeave = () => {
    if (onHoverLoot) {
      onHoverLoot([], null, '');
    }
  };

  return (
    <div
      className={`hunt-card ${isSelected ? 'hunt-card-selected' : 'hunt-card-adjacent'} hunt-card-${position}`}
      onClick={!isSelected ? onClick : undefined}
      role="button"
      tabIndex={0}
      aria-label={`Caçada: ${huntTitle}`}
      aria-selected={isSelected}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !isSelected && onClick) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Ruby diamond jewel at top center of selected card */}
      {isSelected && <div className="hunt-card-gem hunt-card-gem-top" />}

      {/* Top illustration container with scenario backdrop & creature */}
      <div className="hunt-card-art-box">
        <img
          src={backgroundImageUrl}
          alt={huntTitle}
          className="hunt-card-art-bg"
          onError={() => setBgFailed(true)}
        />
        <div className="hunt-card-art-vignette" />

        {/* Circular recommended level medallion in top-left */}
        <div className="hunt-level-medallion" title={`Nível recomendado: ${recommendedLevel}`}>
          <span className="hunt-level-medallion-num">{recommendedLevel}</span>
        </div>

        {/* Crisp pixel-art monster sprite */}
        <div className="hunt-card-sprite-wrapper">
          {monsterSpriteUrl ? (
            <img
              src={monsterSpriteUrl}
              alt={primaryMonster?.name ?? huntTitle}
              className="hunt-card-creature-sprite"
            />
          ) : (
            <div className="hunt-card-sprite-placeholder">🐾</div>
          )}
        </div>
      </div>

      {/* Card Body: Title, Description, Suggested Level, Loot */}
      <div className="hunt-card-body">
        <h4 className="hunt-card-title" title={huntTitle}>
          {huntTitle}
        </h4>

        <p className="hunt-card-desc" title={huntDescription}>
          {huntDescription}
        </p>

        <div className="hunt-card-suggested-level">
          <span className="hunt-suggested-label">Nv. sugerido: </span>
          <span className="hunt-suggested-val" style={{ color: diff.color }}>
            {recommendedLevel}
          </span>
        </div>

        {/* Mini Loot & Backpack Row */}
        <div className="hunt-card-loot-row">
          <div className="hunt-card-loot-previews">
            <span className="hunt-card-loot-caption">Possíveis loots:</span>
            <div className="hunt-card-mini-icons">
              {miniPreviewDrops.map((drop) => (
                <div key={drop.itemId} className="hunt-mini-loot-slot" title={drop.name}>
                  <ItemSprite itemId={drop.itemId} label={drop.name} />
                </div>
              ))}
              {miniPreviewDrops.length === 0 && (
                <span className="hunt-mini-no-loot">—</span>
              )}
            </div>
          </div>

          {/* Backpack button on bottom right */}
          <button
            ref={backpackBtnRef}
            type="button"
            className="hunt-backpack-btn"
            title="Ver todos os loots possíveis desta caçada"
            onMouseEnter={handleBackpackEnter}
            onMouseLeave={handleBackpackLeave}
            onClick={(e) => {
              e.stopPropagation();
              handleBackpackEnter();
            }}
          >
            <img src="/backpack.png" alt="Mochila de loot" className="hunt-backpack-icon" />
          </button>
        </div>
      </div>

      {/* Ruby diamond jewel at bottom center of selected card */}
      {isSelected && <div className="hunt-card-gem hunt-card-gem-bottom" />}
    </div>
  );
}
