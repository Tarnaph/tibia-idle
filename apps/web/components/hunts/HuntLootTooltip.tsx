'use client';

import { useMemo } from 'react';
import { ItemSprite } from '../ItemSprite';

export interface LootItemEntry {
  itemId: number;
  name: string;
  chance: number;
}

interface Props {
  open: boolean;
  lootList: LootItemEntry[];
  anchorRect: DOMRect | null;
  huntName?: string;
}

export function getRarityInfo(chance: number): { label: string; color: string; bg: string } {
  if (chance >= 20000) {
    return { label: 'Comum', color: '#4ade80', bg: 'rgba(74, 222, 128, 0.12)' };
  }
  if (chance >= 5000) {
    return { label: 'Incomum', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.12)' };
  }
  if (chance >= 1000) {
    return { label: 'Raro', color: '#c084fc', bg: 'rgba(192, 132, 252, 0.15)' };
  }
  return { label: 'Muito raro', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.18)' };
}

export function HuntLootTooltip({ open, lootList, anchorRect, huntName }: Props) {
  const position = useMemo(() => {
    if (!anchorRect) return null;

    // Calculate position relative to viewport (fixed positioning)
    const tooltipWidth = 240;
    const estimatedHeight = Math.min(320, 50 + lootList.length * 36);

    let left = anchorRect.left + anchorRect.width / 2 - tooltipWidth / 2;
    let top = anchorRect.top - estimatedHeight - 10;

    // Prevent spilling over left/right edges
    if (left + tooltipWidth > window.innerWidth - 12) {
      left = window.innerWidth - tooltipWidth - 12;
    }
    if (left < 12) {
      left = 12;
    }

    // If it overflows top, flip below the anchor
    if (top < 12) {
      top = anchorRect.bottom + 10;
    }

    return { top, left };
  }, [anchorRect, lootList.length]);

  if (!open || !position || lootList.length === 0) return null;

  return (
    <div
      className="hunt-loot-floating-popover"
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        width: 240,
        maxHeight: 320,
        zIndex: 9999999,
        pointerEvents: 'none',
      }}
    >
      <div className="hunt-loot-popover-header">
        <span className="hunt-loot-popover-title">Loot possível</span>
        {huntName && <span className="hunt-loot-popover-hunt">{huntName}</span>}
      </div>

      <div className="hunt-loot-popover-list">
        {lootList.map((loot) => {
          const rarity = getRarityInfo(loot.chance);
          return (
            <div key={loot.itemId} className="hunt-loot-popover-row">
              <div className="hunt-loot-popover-icon">
                <ItemSprite itemId={loot.itemId} label={loot.name} />
              </div>
              <div className="hunt-loot-popover-name" title={loot.name}>
                {loot.name}
              </div>
              <span
                className="hunt-loot-popover-rarity"
                style={{
                  color: rarity.color,
                  backgroundColor: rarity.bg,
                  border: `1px solid ${rarity.color}40`,
                }}
              >
                {rarity.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
