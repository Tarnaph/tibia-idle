'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import {
  TibiaAuthCharacterModal,
  type CharacterItem,
  type AuthAccount,
} from './auth/TibiaAuthCharacterModal';
import { ExuraLoadingScreen } from './ExuraLoadingScreen';

// Phase 189: Dynamic import of the heavy 35MB+ Game Engine only when character is selected!
const DynamicGamePrototype = dynamic(
  () => import('./GamePrototype').then((m) => m.GamePrototype),
  {
    ssr: false,
    loading: () => (
      <ExuraLoadingScreen
        active={true}
        durationMs={2500}
        message="Carregando motor do jogo e mapa de Thais..."
        bgImage="/images/loading/thais-loading.jpg"
      />
    ),
  }
);

export function GameClientLauncher() {
  const [selectedCharacterData, setSelectedCharacterData] = useState<{
    authToken: string;
    charItem: CharacterItem;
    acc: AuthAccount;
  } | null>(null);

  // If no character is selected, show the ultra-lightweight Auth & Character Selection Modal immediately (< 200ms)
  if (!selectedCharacterData) {
    return (
      <TibiaAuthCharacterModal
        onSelectCharacter={(authToken, charItem, acc) => {
          setSelectedCharacterData({ authToken, charItem, acc });
        }}
        onLogout={() => {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('colyseus_token');
            localStorage.removeItem('tibia_auth_token');
          }
        }}
        onGoHome={() => {
          window.location.href = '/';
        }}
      />
    );
  }

  // Once selected, launch GamePrototype with the selected hero and ExuraLoadingScreen security gate
  return (
    <DynamicGamePrototype
      initialSelection={selectedCharacterData}
      onSwitchCharacter={() => {
        setSelectedCharacterData(null);
      }}
    />
  );
}
