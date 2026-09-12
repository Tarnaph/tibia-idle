'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { CyclopediaTab } from '../components/CyclopediaModal';

export type GameModalId =
  | 'outfit'
  | 'cyclopedia'
  | 'profile'
  | 'skills'
  | 'shop'
  | 'huntSelector'
  | 'party'
  | 'death'
  | 'logout';

export interface GameModalPayloads {
  outfit?: { characterId?: string };
  cyclopedia?: { initialTab?: CyclopediaTab };
  profile?: { characterId?: string };
  skills?: { characterId?: string };
  shop?: Record<string, unknown>;
  huntSelector?: Record<string, unknown>;
  party?: Record<string, unknown>;
  death?: Record<string, unknown>;
  logout?: Record<string, unknown>;
}

interface GameModalContextValue {
  openModal: <K extends GameModalId>(id: K, payload?: GameModalPayloads[K]) => void;
  closeModal: (id: GameModalId) => void;
  toggleModal: <K extends GameModalId>(id: K, payload?: GameModalPayloads[K]) => void;
  isModalOpen: (id: GameModalId) => boolean;
  getPayload: <K extends GameModalId>(id: K) => GameModalPayloads[K] | undefined;

  // Ergonomic Direct Helpers (No prop drilling!)
  openOutfit: (characterId?: string) => void;
  closeOutfit: () => void;
  openCyclopedia: (initialTab?: CyclopediaTab) => void;
  closeCyclopedia: () => void;
  openProfile: (characterId?: string) => void;
  closeProfile: () => void;
  openSkills: (characterId?: string) => void;
  closeSkills: () => void;
  openShop: () => void;
  closeShop: () => void;
  openHuntSelector: () => void;
  closeHuntSelector: () => void;
  openLogout: () => void;
  closeLogout: () => void;
}

const GameModalContext = createContext<GameModalContextValue | null>(null);

export function GameModalProvider({ children }: { children: React.ReactNode }) {
  const [modalStates, setModalStates] = useState<Partial<Record<GameModalId, boolean>>>({});
  const [payloads, setPayloads] = useState<Partial<Record<GameModalId, any>>>({});

  const openModal = useCallback(<K extends GameModalId>(id: K, payload?: GameModalPayloads[K]) => {
    setModalStates((prev) => ({ ...prev, [id]: true }));
    if (payload !== undefined) {
      setPayloads((prev) => ({ ...prev, [id]: payload }));
    }
  }, []);

  const closeModal = useCallback((id: GameModalId) => {
    setModalStates((prev) => ({ ...prev, [id]: false }));
  }, []);

  const toggleModal = useCallback(<K extends GameModalId>(id: K, payload?: GameModalPayloads[K]) => {
    setModalStates((prev) => {
      const willOpen = !prev[id];
      if (willOpen && payload !== undefined) {
        setPayloads((p) => ({ ...p, [id]: payload }));
      }
      return { ...prev, [id]: willOpen };
    });
  }, []);

  const isModalOpen = useCallback(
    (id: GameModalId) => Boolean(modalStates[id]),
    [modalStates]
  );

  const getPayload = useCallback(
    <K extends GameModalId>(id: K): GameModalPayloads[K] | undefined => {
      return payloads[id] as GameModalPayloads[K] | undefined;
    },
    [payloads]
  );

  // Direct helpers
  const openOutfit = useCallback((characterId?: string) => openModal('outfit', { characterId }), [openModal]);
  const closeOutfit = useCallback(() => closeModal('outfit'), [closeModal]);

  const openCyclopedia = useCallback((initialTab?: CyclopediaTab) => openModal('cyclopedia', { initialTab }), [openModal]);
  const closeCyclopedia = useCallback(() => closeModal('cyclopedia'), [closeModal]);

  const openProfile = useCallback((characterId?: string) => openModal('profile', { characterId }), [openModal]);
  const closeProfile = useCallback(() => closeModal('profile'), [closeModal]);

  const openSkills = useCallback((characterId?: string) => openModal('skills', { characterId }), [openModal]);
  const closeSkills = useCallback(() => closeModal('skills'), [closeModal]);

  const openShop = useCallback(() => openModal('shop'), [openModal]);
  const closeShop = useCallback(() => closeModal('shop'), [closeModal]);

  const openHuntSelector = useCallback(() => openModal('huntSelector'), [openModal]);
  const closeHuntSelector = useCallback(() => closeModal('huntSelector'), [closeModal]);

  const openLogout = useCallback(() => openModal('logout'), [openModal]);
  const closeLogout = useCallback(() => closeModal('logout'), [closeModal]);

  const value = useMemo(
    () => ({
      openModal,
      closeModal,
      toggleModal,
      isModalOpen,
      getPayload,
      openOutfit,
      closeOutfit,
      openCyclopedia,
      closeCyclopedia,
      openProfile,
      closeProfile,
      openSkills,
      closeSkills,
      openShop,
      closeShop,
      openHuntSelector,
      closeHuntSelector,
      openLogout,
      closeLogout,
    }),
    [
      openModal,
      closeModal,
      toggleModal,
      isModalOpen,
      getPayload,
      openOutfit,
      closeOutfit,
      openCyclopedia,
      closeCyclopedia,
      openProfile,
      closeProfile,
      openSkills,
      closeSkills,
      openShop,
      closeShop,
      openHuntSelector,
      closeHuntSelector,
      openLogout,
      closeLogout,
    ]
  );

  return <GameModalContext.Provider value={value}>{children}</GameModalContext.Provider>;
}

export function useGameModal(): GameModalContextValue {
  const context = useContext(GameModalContext);
  if (!context) {
    // Graceful fallback dummy implementation so components tested in isolation never crash
    return {
      openModal: () => {},
      closeModal: () => {},
      toggleModal: () => {},
      isModalOpen: () => false,
      getPayload: () => undefined,
      openOutfit: () => {},
      closeOutfit: () => {},
      openCyclopedia: () => {},
      closeCyclopedia: () => {},
      openProfile: () => {},
      closeProfile: () => {},
      openSkills: () => {},
      closeSkills: () => {},
      openShop: () => {},
      closeShop: () => {},
      openHuntSelector: () => {},
      closeHuntSelector: () => {},
      openLogout: () => {},
      closeLogout: () => {},
    };
  }
  return context;
}
