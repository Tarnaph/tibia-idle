'use client';

import React, { useMemo } from 'react';
import type { HuntDefinition } from '@/packages/domain/src';
import type { MonsterDefinition } from '@/packages/content-schema/src';
import { HuntCard } from './HuntCard';
import type { LootItemEntry } from './HuntLootTooltip';

interface Props {
  hunts: HuntDefinition[];
  selectedHuntId: string;
  onSelectHunt(huntId: string): void;
  monsters: MonsterDefinition[];
  characterLevel?: number;
  onHoverLoot(lootList: LootItemEntry[], rect: DOMRect | null, huntTitle: string): void;
}

export function HuntCarousel({
  hunts,
  selectedHuntId,
  onSelectHunt,
  monsters,
  characterLevel,
  onHoverLoot,
}: Props) {
  const currentIndex = useMemo(() => {
    const idx = hunts.findIndex((h) => h.id === selectedHuntId);
    return idx >= 0 ? idx : 0;
  }, [hunts, selectedHuntId]);

  const total = hunts.length;

  const handlePrev = () => {
    if (total <= 1) return;
    const nextIdx = (currentIndex - 1 + total) % total;
    onSelectHunt(hunts[nextIdx].id);
  };

  const handleNext = () => {
    if (total <= 1) return;
    const nextIdx = (currentIndex + 1) % total;
    onSelectHunt(hunts[nextIdx].id);
  };

  // Resolve the 3 cards to display: previous, current, next
  const { prevHunt, currentHunt, nextHunt } = useMemo(() => {
    if (total === 0) {
      return { prevHunt: null, currentHunt: null, nextHunt: null };
    }
    if (total === 1) {
      return { prevHunt: null, currentHunt: hunts[0], nextHunt: null };
    }
    const prevIdx = (currentIndex - 1 + total) % total;
    const nextIdx = (currentIndex + 1) % total;
    return {
      prevHunt: hunts[prevIdx],
      currentHunt: hunts[currentIndex],
      nextHunt: hunts[nextIdx],
    };
  }, [hunts, currentIndex, total]);

  if (!currentHunt) {
    return (
      <div className="hunt-carousel-empty">
        <span>Nenhuma caçada disponível no momento.</span>
      </div>
    );
  }

  return (
    <div className="hunt-carousel-container">
      {/* Left Navigation Chevron Button */}
      <button
        type="button"
        className="hunt-carousel-nav-btn hunt-nav-left"
        onClick={handlePrev}
        disabled={total <= 1}
        title="Caçada anterior (←)"
        aria-label="Caçada anterior"
      >
        <span className="hunt-nav-arrow">❮</span>
      </button>

      {/* 3-Card Carousel Stage */}
      <div className="hunt-carousel-stage">
        {/* Previous Card */}
        {prevHunt && (
          <div className="hunt-card-slot hunt-card-slot-prev">
            <HuntCard
              key={prevHunt.id}
              hunt={prevHunt}
              isSelected={false}
              position="prev"
              monsters={monsters}
              characterLevel={characterLevel}
              onClick={() => onSelectHunt(prevHunt.id)}
              onHoverLoot={onHoverLoot}
            />
          </div>
        )}

        {/* Selected / Center Card */}
        <div className="hunt-card-slot hunt-card-slot-center">
          <HuntCard
            key={currentHunt.id}
            hunt={currentHunt}
            isSelected={true}
            position="center"
            monsters={monsters}
            characterLevel={characterLevel}
            onHoverLoot={onHoverLoot}
          />
        </div>

        {/* Next Card */}
        {nextHunt && (
          <div className="hunt-card-slot hunt-card-slot-next">
            <HuntCard
              key={nextHunt.id}
              hunt={nextHunt}
              isSelected={false}
              position="next"
              monsters={monsters}
              characterLevel={characterLevel}
              onClick={() => onSelectHunt(nextHunt.id)}
              onHoverLoot={onHoverLoot}
            />
          </div>
        )}
      </div>

      {/* Right Navigation Chevron Button */}
      <button
        type="button"
        className="hunt-carousel-nav-btn hunt-nav-right"
        onClick={handleNext}
        disabled={total <= 1}
        title="Próxima caçada (→)"
        aria-label="Próxima caçada"
      >
        <span className="hunt-nav-arrow">❯</span>
      </button>
    </div>
  );
}
