'use client';

import React from 'react';
import type { CharacterState } from '@/packages/domain/src/types';
import type { SpellDefinition } from '@/packages/content-schema/src';
import { findHotbarAction } from '@/packages/domain/src';
import { Tibia11ActionIcon } from '@/apps/web/components/Tibia11ActionIcon';

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
}: MobileHotkeyBarProps) {
  const hotbarList: any[] = Array.isArray(character.hotbar)
    ? character.hotbar
    : Array.isArray((character as any)?.hotbar?.hotbar)
    ? (character as any).hotbar.hotbar
    : [];

  // Show 8 hotkey slots
  const slotsCount = 8;
  const slots = Array.from({ length: slotsCount }, (_, i) => hotbarList[i] || null);

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
      {slots.map((rawSlot, idx) => {
        const slotNumber = idx + 1;
        const resolvedAction = rawSlot ? findHotbarAction(rawSlot, { spells } as any) : null;
        const isAssigned = Boolean(resolvedAction);

        let iconComponent: React.ReactNode = null;
        let actionTitle = `Slot ${slotNumber} (Vazio - Toque para configurar)`;
        let isPotionOrRune = false;

        if (resolvedAction) {
          if (resolvedAction.kind === 'spell') {
            actionTitle = `${resolvedAction.spell.name} (${resolvedAction.spell.words})`;
            iconComponent = (
              <Tibia11ActionIcon
                id={Number(resolvedAction.spell.spellId)}
                kind="spell"
                name={resolvedAction.spell.name}
                size={32}
              />
            );
          } else if (resolvedAction.kind === 'potion') {
            isPotionOrRune = true;
            actionTitle = resolvedAction.potion.name;
            iconComponent = (
              <Tibia11ActionIcon
                id={resolvedAction.potion.id}
                kind="potion"
                name={resolvedAction.potion.name}
                size={32}
              />
            );
          } else if (resolvedAction.kind === 'rune') {
            isPotionOrRune = true;
            actionTitle = resolvedAction.rune.name;
            iconComponent = (
              <Tibia11ActionIcon
                id={resolvedAction.rune.id}
                kind="rune"
                name={resolvedAction.rune.name}
                size={32}
              />
            );
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
              border: isAssigned ? '1.5px solid #d4a843' : '1px dashed #374151',
              borderRadius: '6px',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              overflow: 'hidden',
              boxShadow: isAssigned ? '0 0 6px rgba(212, 168, 67, 0.25), inset 0 0 6px rgba(0, 0, 0, 0.7)' : 'inset 0 0 6px rgba(0, 0, 0, 0.7)',
            }}
            title={actionTitle}
          >
            {isAssigned && iconComponent ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                  {iconComponent}
                </div>

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
                      pointerEvents: 'none',
                    }}
                  >
                    {slotNumber}
                  </span>
                )}
              </>
            ) : (
              <span style={{ fontSize: '18px', color: '#4b5563', fontWeight: 300, pointerEvents: 'none' }}>+</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
