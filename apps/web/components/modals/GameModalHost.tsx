'use client';

import React from 'react';
import type { CharacterState, DerivedStats, GameContent } from '@/packages/domain/src';
import { useGameModal } from '../../contexts/GameModalContext';
import { OutfitModal } from '../OutfitModal';
import { CyclopediaModal } from '../CyclopediaModal';
import { CharacterProfileModal } from '../CharacterProfileModal';
import { GameErrorBoundary } from '../common/GameErrorBoundary';

export interface GameModalHostProps {
  characters: CharacterState[];
  activeCharacterId: string;
  inventory?: Array<{ id?: string; serverId?: number; itemId?: number; name: string; count?: number; amount?: number }>;
  onSelectCharacter: (characterId: string) => void;
  onSaveOutfit: (
    characterId: string,
    customization: {
      outfit: string;
      mount: string;
      mountActive: boolean;
      addons: number;
      outfitColors?: { head: number; primary: number; secondary: number; detail: number };
    }
  ) => void;
  content: GameContent;
  avatarId?: number;
  onSelectAvatar?: (avatarId: number) => void;
  gold: number;
  bestiaryKills: Record<string, number>;
  trackedMonsterId?: string | null;
  bossPoints?: number;
  onTrackMonster?: (monsterId: string) => void;
  characterName?: string;
  characterVocation?: string;
  character?: CharacterState;
  stats?: DerivedStats;
}

/**
 * Isolated Overlay Hub: hosts and coordinates full-screen modals
 * completely decoupled from the core GamePrototype game loop.
 */
export function GameModalHost({
  characters,
  activeCharacterId,
  inventory,
  onSelectCharacter,
  onSaveOutfit,
  content,
  avatarId = 1,
  onSelectAvatar,
  gold,
  bestiaryKills,
  trackedMonsterId,
  bossPoints,
  onTrackMonster,
  characterName = 'Hero',
  characterVocation = 'Knight',
  character,
  stats,
}: GameModalHostProps) {
  const {
    isModalOpen,
    closeModal,
    getPayload,
    openOutfit,
    openProfile,
    closeOutfit,
    closeCyclopedia,
    closeProfile,
  } = useGameModal();

  const isOutfitOpen = isModalOpen('outfit');
  const isCyclopediaOpen = isModalOpen('cyclopedia');
  const isProfileOpen = isModalOpen('profile');

  const outfitPayload = getPayload('outfit');
  const cyclopediaPayload = getPayload('cyclopedia');
  const profilePayload = getPayload('profile');

  const targetOutfitCharId = outfitPayload?.characterId || activeCharacterId;
  const targetProfileCharId = profilePayload?.characterId || activeCharacterId;
  const effectiveChar = character || characters.find((c) => c.id === activeCharacterId) || characters[0];

  return (
    <>
      {/* 1. Outfit & Mount Customization Modal */}
      {isOutfitOpen && (
        <GameErrorBoundary fallbackTitle="Erro ao abrir customização de visual" onReset={closeOutfit}>
          <OutfitModal
            open={isOutfitOpen}
            characters={characters}
            activeCharacterId={targetOutfitCharId}
            inventory={inventory || (effectiveChar as any)?.inventoryItems}
            onClose={closeOutfit}
            onOpenCharacterProfile={(charId) => {
              closeOutfit();
              if (charId && charId !== activeCharacterId) {
                onSelectCharacter(charId);
              }
              openProfile(charId);
            }}
            onSave={onSaveOutfit}
          />
        </GameErrorBoundary>
      )}

      {/* 2. Full Cyclopedia & Bestiary Modal */}
      {isCyclopediaOpen && (
        <CyclopediaModal
          open={isCyclopediaOpen}
          onClose={closeCyclopedia}
          gold={gold}
          bestiaryKills={bestiaryKills}
          trackedMonsterId={trackedMonsterId}
          bossPoints={bossPoints}
          onTrackMonster={onTrackMonster}
          initialTab={cyclopediaPayload?.initialTab || 'items'}
          characterName={characterName || effectiveChar?.name}
          characterVocation={characterVocation || effectiveChar?.vocation}
          character={effectiveChar}
          stats={stats}
        />
      )}

      {/* 3. Character Profile & Attributes Modal */}
      {isProfileOpen && (
        <CharacterProfileModal
          isOpen={isProfileOpen}
          onClose={closeProfile}
          characters={characters}
          selectedCharacterId={targetProfileCharId}
          onSelectCharacter={onSelectCharacter}
          onOpenOutfit={(charId) => {
            closeProfile();
            openOutfit(charId || targetProfileCharId);
          }}
          content={content}
          avatarId={avatarId}
          onSelectAvatar={onSelectAvatar}
        />
      )}
    </>
  );
}
