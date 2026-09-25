'use client';

import React from 'react';
import type { CharacterState } from '@/packages/domain/src/types';
import type { SpellDefinition } from '@/packages/content-schema/src';
import { getCanonicalItemUrl, getCanonicalSpellUrl } from '@/apps/web/lib/assetPaths';

interface MobileHotkeyBarProps {
  character: CharacterState;
  spells: SpellDefinition[];
  onSlotClick?: (slotIndex: number) => void;
  onConfigureSlot?: (slotIndex: number) => void;
  onToggleChat?: () => void;
  unreadChatCount?: number;
}

export function MobileHotkeyBar({
  character,
  spells,
  onSlotClick,
  onConfigureSlot,
  onToggleChat,
  unreadChatCount = 0,
}: MobileHotkeyBarProps) {
  const hotbarList: any[] = Array.isArray(character.hotbar)
    ? character.hotbar
    : Array.isArray((character as any)?.hotbar?.hotbar)
    ? (character as any).hotbar.hotbar
    : [];

  // Show 8 hotkey slots + 1 chat toggle slot
  const slotsCount = 8;
  const slots = Array.from({ length: slotsCount }, (_, i) => hotbarList[i] || null);

  const getSpellIcon = (spellId: string) => {
    return getCanonicalSpellUrl(spellId);
  };

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '62px',
        left: '8px',
        right: '8px',
        zIndex: 45,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '5px',
        backgroundColor: '#090d16',
        border: '1.5px solid #ca8a04',
        borderRadius: '8px',
        padding: '6px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.8), 0 0 10px rgba(202, 138, 4, 0.2)',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {slots.map((action, idx) => {
        const slotNumber = idx + 1;
        const isAssigned = Boolean(action);

        let iconUrl = '';
        let badgeCount: number | null = null;
        let isPotionOrRune = false;

        if (action) {
          if (action.type === 'spell') {
            iconUrl = getSpellIcon(action.spellId);
          } else if (action.type === 'item') {
            iconUrl = getCanonicalItemUrl(action.itemId);
            isPotionOrRune = true;
            badgeCount = action.count ?? action.amount ?? 10;
          }
        }

        return (
          <button
            key={idx}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (isAssigned) {
                onSlotClick?.(idx);
              } else {
                onConfigureSlot?.(idx);
              }
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onConfigureSlot?.(idx);
            }}
            style={{
              position: 'relative',
              width: '44px',
              height: '44px',
              minWidth: '44px',
              backgroundColor: '#111827',
              border: isAssigned ? '1.5px solid #4b5563' : '1px dashed #374151',
              borderRadius: '6px',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              overflow: 'hidden',
              boxShadow: 'inset 0 0 6px rgba(0, 0, 0, 0.7)',
            }}
            title={isAssigned ? `Atalho ${slotNumber}: ${action.name || action.spellId || 'Item'}` : `Slot ${slotNumber} (Vazio - Toque para configurar)`}
          >
            {isAssigned ? (
              <>
                <img
                  src={iconUrl}
                  alt={action.name || 'Action'}
                  style={{
                    width: '32px',
                    height: '32px',
                    objectFit: 'contain',
                    imageRendering: 'pixelated',
                  }}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/spells/exura.png';
                  }}
                />

                {/* Slot index badge bottom right */}
                {!isPotionOrRune && (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '1px',
                      right: '2px',
                      fontSize: '9px',
                      fontWeight: 800,
                      color: '#cbd5e1',
                      textShadow: '0 1px 2px #000',
                    }}
                  >
                    {slotNumber}
                  </span>
                )}

                {/* Stack count for potions/runes */}
                {isPotionOrRune && (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '1px',
                      right: '2px',
                      fontSize: '9.5px',
                      fontWeight: 800,
                      color: '#fef08a',
                      textShadow: '0 1px 2px #000',
                    }}
                  >
                    {badgeCount}
                  </span>
                )}
              </>
            ) : (
              <span style={{ fontSize: '18px', color: '#4b5563', fontWeight: 300 }}>+</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
