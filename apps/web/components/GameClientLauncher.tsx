'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  TibiaAuthCharacterModal,
  type CharacterItem,
  type AuthAccount,
} from './auth/TibiaAuthCharacterModal';

// Phase 226: Unified single 0% -> 100% loading flow.
// Pre-warm the heavy game engine bundle while on character select and eliminate the redundant
// 2.5s loading bar in dynamic(), so GamePrototype's canonical ExuraLoadingScreen is the only one rendered.
const DynamicGamePrototype = dynamic(
  () => import('./GamePrototype').then((m) => m.GamePrototype),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: '#080403',
          backgroundImage: 'url(/images/loading/thais-loading.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          zIndex: 999999999,
        }}
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

  // Pre-fetch GamePrototype chunk while player is browsing/selecting character
  useEffect(() => {
    void import('./GamePrototype');
  }, []);

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
