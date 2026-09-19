'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import economyJson from '@/content/generated/item-economy.json';
import equipmentJson from '@/content/generated/equipment.json';
import monstersJson from '@/content/generated/monsters.json';
import startersJson from '@/content/generated/starter-loadouts.json';
import vocationsJson from '@/content/generated/vocations.json';
import spellsJson from '@/content/generated/spells.json';
import huntRegionsJson from '@/content/generated/hunt-regions.json';
import type { BaseVocationName, EquipmentCatalog, EquipmentDefinition, HuntRegionCatalog, ItemEconomyCatalog, MonsterCatalog, SpellCatalog, StarterLoadoutCatalog, VocationCatalog } from '@/packages/content-schema/src';
import {
  addPartyMember, advanceCombat, advanceCityAutoSpells, advanceTraining, availableOwnedEquipmentIds, createIdleGame, createCharacter, calculateStatsForLevel,
  characterCapacity, deriveStats, experienceForLevel, experienceProgress, levelForExperience, findEquipment, initialHunts, inventoryWeight, itemLootPreference, leaderOf, leaveHunt, restartHunt, sellAllLoot, sellLootStack, updateItemLootPreference,
  transferItemBetweenContainers, destroyContainerItem, executeQuickSell, buyShopItem, useTestConsumable,
  setCharacterStance, setCharacterTargetDistance, setCharacterTargetStrategy,
  unequipSlotToBag, equipItemFromContainer, setActorTarget, removePartyMember,
  PROMOTION_COST, PROMOTION_LEVEL, promoteCharacter, promotedVocationFor, reorderHotbar, selectCharacter,
  selectedCharacterOf, skillProgress, synchronizePartyWithEncounter, trainingSkillFor, transferOwnedEquipment, vocationFor, preferredSellPrice, roleForVocation,
  triggerManualHotbarAction, findHotbarAction, respawnInTemple, THAIS_TEMPLE_POSITION, chooseCharacterVocation, getTakenAccountVocations, getHuntWorldEntrance,
  calculateDeathPenaltyReport, type DeathPenaltyReport, buyBlessing, buyAllMissingBlessings,
  calculatePlayerSpeed, calculateStepDurationMs, findCityPath, findHuntTravelRoute, THAIS_DOCK_TRAVEL, resolveStairsTransition,
  THAIS_CITY_FIXED_SPEED, THAIS_TRAINING_DUMMIES, THAIS_TRAINING_APPROACH_POINT, findBestTrainingTile, calculateTrainingTimeEstimate, type TrainingTimeEstimate, type TrainingDummyInfo,
  type CharacterEquipmentSlot, type EquipmentTransferSource, type EquipmentTransferTarget, type GameContent, type TrainableSkill, type LootStack, type CharacterState, type EnemyState, type HuntPullSize,
} from '@/packages/domain/src';
import { serverConfigManager } from '@/packages/server/src/config/ServerConfigManager';
import { calculateSessionRates, formatSessionDuration } from '@/packages/presentation/src';
import { BottomDock } from './BottomDock';
import { EquipmentPanel, type StatsDelta } from './EquipmentPanel';
import { InventoryWindow } from './InventoryWindow';
import { DepotWindow } from './DepotWindow';
import { QuickSellWindow } from './QuickSellWindow';
import { ShopWindow } from './ShopWindow';
import { HotbarConfigModal } from './HotbarConfigModal';
import { HuntHeader } from './HuntHeader';
import { TrainingDummyContextMenu } from './TrainingDummyContextMenu';
import { HuntSelector, type ActiveTab } from './HuntSelector';
import { TrainingProgressHUD, type TrainingMemberEstimate } from './TrainingProgressHUD';
import { IdleHeader } from './IdleHeader';
import { ItemSprite } from './ItemSprite';
import { ItemTooltip } from './ItemTooltip';
import { GlobalItemTooltip } from './GlobalItemTooltip';
  import { PartyMemberModal } from './PartyMemberModal';
import { VocationChoiceModal } from './VocationChoiceModal';
import { OutfitModal } from './OutfitModal';
import { CyclopediaModal } from './CyclopediaModal';
import { BestiaryTrackerHUD } from './BestiaryTrackerHUD';
import { FloatingPartyHUD } from './party/FloatingPartyHUD';
import { CANONICAL_BESTIARY_MONSTERS, getCyclopediaItems, getBestiaryMonsters, type BestiaryMonster } from '../lib/cyclopediaData';
import { DeathModal } from './DeathModal';
import { BlessingsModal } from './BlessingsModal';
import { HighscoresModal } from './HighscoresModal';
import { ArenaPvPModal } from './ArenaPvPModal';
import { CharacterContextMenu } from './CharacterContextMenu';
import { preloadOutfitAllFrames } from '@/apps/web/lib/outfitRecolor';
import { GameModalProvider, useGameModal } from '@/apps/web/contexts/GameModalContext';
import { GameModalHost } from './modals/GameModalHost';
import { isCharacterMounted, canOutfitHaveMount } from '@/apps/web/lib/appearanceService';
import { outfitDiagnostics } from '@/apps/web/lib/outfitDiagnostics';
import { PixiArena } from './PixiArena';
import { assetPreloader } from '@/apps/web/lib/assetPreloader';
import { huntAssetPreloader } from '@/apps/web/lib/huntAssetPreloader';
import { ExuraLoadingScreen, getLoadingConfigForHunt } from './ExuraLoadingScreen';
import { TrainingArena } from './TrainingArena';
import dynamic from 'next/dynamic';
import type { CityOverheadMessage } from './ThaisCityArena';

const ThaisCityArena = dynamic(
  () => import('./ThaisCityArena').then((m) => m.ThaisCityArena),
  { ssr: false }
);
import { WorldNavigation } from './WorldNavigation';
import { WindowManagerProvider, useWindowManager } from './window/WindowManagerContext';
import { DraggableWindow } from './window/DraggableWindow';
import { WindowDockBar } from './window/WindowDockBar';
import { SkillsWindow } from './SkillsWindow';
import { AdvancedMetricsWindow } from './AdvancedMetricsWindow';
import { FriendsWindow, type FriendItem } from './window/FriendsWindow';
import { ChatWindow, type ChatMessageItem, type ChatWindowHandle } from './chat/ChatWindow';
import { PartyInvitationModal } from './party/PartyInvitationModal';
import { GroupHuntApprovalModal } from './party/GroupHuntApprovalModal';
import { UnifiedPartyModal } from './party/UnifiedPartyModal';
import { LogoutConfirmModal } from './character/LogoutConfirmModal';
import { PromotionModal } from './character/PromotionModal';
import { ImbuingModal } from './ImbuingModal';
import { PlayerInspectModal } from './PlayerInspectModal';
import { AdminDebugModal } from './admin/AdminDebugModal';
import { clientErrorLogger } from '../lib/errorLogger';
import {
  CANONICAL_IMBUEMENTS,
  IMBUEMENT_TIER_COSTS,
  IMBUEMENT_DURATION_SECONDS,
  type ActiveImbuementSlot,
  type ImbuementDefinition,
  type ImbuementTier,
} from '@/packages/domain/src/imbuements';
import { TibiaAuthCharacterModal, type CharacterItem, type AuthAccount } from './auth/TibiaAuthCharacterModal';
import { gameNetwork, type RemotePlayerSnapshot, type PartySnapshot, type PartyInvitation, type PartyHuntProposal, type PvPMatchFoundEvent } from '../lib/GameClientNetworkManager';
import { useAuth } from '../auth/AuthProvider';
import { resolveSkillKey, parseInventoryData } from '../lib/characterHydration';
import { progressionDiagnostics } from '../lib/progressionDiagnostics';
import { playCityBgm, pauseCityBgm, stopCityBgm } from '../lib/audioManager';
import { triggerTrackNotification, THAIS_THEME_TRACK } from '../lib/audioManager';
import { playDragonLairBgm, stopDragonLairBgm, stopAllAudio, DRAGONS_PRIDE_TRACK, playHuntBgm, stopHuntBgm, getTrackForHunt } from '../lib/audioManager';
import { playPlayerDeath, preloadSfx } from '../lib/soundEffects';
import { MusicTrackToast } from './audio/MusicTrackToast';
import thaisCollisionJson from '@/content/generated/thais-collision.json';

const thaisCollision = thaisCollisionJson as { z7: Record<string, number>; z6: Record<string, number> };
const thaisTileMapZ7 = new Map<string, { walkable: boolean }>(
  Object.keys(thaisCollision.z7).map((k) => [k, { walkable: true }])
);
const thaisTileMapZ6 = new Map<string, { walkable: boolean }>(
  Object.keys(thaisCollision.z6).map((k) => [k, { walkable: true }])
);
const VOCATION_MAP: Record<number, BaseVocationName> = {
  0: 'None',
  1: 'Sorcerer',
  2: 'Druid',
  3: 'Paladin',
  4: 'Knight',
};

const equipmentCatalog = equipmentJson as EquipmentCatalog;
const monsterCatalog = monstersJson as MonsterCatalog;
const vocationCatalog = vocationsJson as VocationCatalog;
const starterCatalog = startersJson as StarterLoadoutCatalog;
const content: GameContent = {
  monsters: monsterCatalog.monsters,
  equipment: equipmentCatalog.items,
  vocations: vocationCatalog.vocations,
  starterLoadouts: starterCatalog.loadouts,
  spells: (spellsJson as unknown as SpellCatalog).spells,
  huntRegions: (huntRegionsJson as HuntRegionCatalog).regions,
  economy: economyJson as ItemEconomyCatalog,
  hunts: initialHunts,
  rateSkill: vocationCatalog.rateSkill,
  rateMagic: vocationCatalog.rateMagic,
};
const defaultSeed = 'cavebound-party-alpha';

interface PointerDragVisual { itemId: number; label: string; x: number; y: number }

function ValueRow({ label, value, changed = false }: { label: string; value: string | number; changed?: boolean }) {
  return <div className={changed ? 'compact-value-row changed' : 'compact-value-row'}><span>{label}</span><strong>{value}</strong></div>;
}

export interface GamePrototypeProps {
  initialSelection?: {
    authToken: string;
    charItem: CharacterItem;
    acc: AuthAccount;
  } | null;
  onSwitchCharacter?: () => void;
}

export function GamePrototype({ initialSelection, onSwitchCharacter }: GamePrototypeProps = {}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className="mmorpg-client-root"
        style={{
          width: '100vw',
          height: '100vh',
          backgroundColor: '#0a0c10',
        }}
      />
    );
  }

  return (
    <GameModalProvider>
      <WindowManagerProvider>
        <GamePrototypeContent
          initialSelection={initialSelection}
          onSwitchCharacter={onSwitchCharacter}
        />
      </WindowManagerProvider>
    </GameModalProvider>
  );
}

const MINI_SLOTS: Array<{ slot: CharacterEquipmentSlot; label: string; icon: string; gridArea: string }> = [
  { slot: 'head', label: 'Elmo', icon: '🪖', gridArea: '1 / 2 / 2 / 3' },
  { slot: 'leftHand', label: 'Arma', icon: '⚔️', gridArea: '2 / 1 / 3 / 2' },
  { slot: 'armor', label: 'Armadura', icon: '🥋', gridArea: '2 / 2 / 3 / 3' },
  { slot: 'rightHand', label: 'Escudo', icon: '🛡️', gridArea: '2 / 3 / 3 / 4' },
  { slot: 'legs', label: 'Calça', icon: '👖', gridArea: '3 / 2 / 4 / 3' },
  { slot: 'boots', label: 'Botas', icon: '👢', gridArea: '4 / 2 / 5 / 3' },
];

/**
 * High-precision game ticker using an inline Web Worker.
 * Chrome throttles window.setInterval to 1000ms (1Hz) when tabs are backgrounded or minimized.
 * Web Workers run in an isolated thread and are NOT throttled to 1000ms by Chromium browsers.
 */
function useGameTicker(callback: () => void, intervalMs: number, active: boolean) {
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    if (!active || typeof window === 'undefined') return;

    let worker: Worker | null = null;
    let fallbackTimer: number | null = null;

    try {
      const blob = new Blob([
        `let id = null;
        self.onmessage = function(e) {
          if (e.data === 'start') {
            if (!id) id = setInterval(function() { self.postMessage('tick'); }, ${intervalMs});
          } else if (e.data === 'stop') {
            if (id) { clearInterval(id); id = null; }
          }
        };`
      ], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      worker = new Worker(url);
      worker.onmessage = () => {
        cbRef.current();
      };
      worker.postMessage('start');

      return () => {
        worker?.postMessage('stop');
        worker?.terminate();
        URL.revokeObjectURL(url);
      };
    } catch {
      fallbackTimer = window.setInterval(() => cbRef.current(), intervalMs);
      return () => {
        if (fallbackTimer) window.clearInterval(fallbackTimer);
      };
    }
  }, [active, intervalMs]);
}

function GamePrototypeContent({ initialSelection, onSwitchCharacter }: GamePrototypeProps) {
  const gameModal = useGameModal();
  const [seed, setSeed] = useState(defaultSeed);
  const [game, setGame] = useState(() => createIdleGame(defaultSeed, content));
  const [mode, setMode] = useState<'training' | 'hunt'>('training');
  const [huntSelectorOpen, setHuntSelectorOpen] = useState(false);
  const [huntSelectorTab, setHuntSelectorTab] = useState<ActiveTab>('CAÇADAS');
  const [partyModalOpen, setPartyModalOpen] = useState(false);
  const [createMemberModalOpen, setCreateMemberModalOpen] = useState(false);
  const [debugGrid, setDebugGrid] = useState(false);
  const [equipmentOpen, setEquipmentOpen] = useState(false);
  const [depotOpen, setDepotOpen] = useState(false);
  const [quickSellOpen, setQuickSellOpen] = useState(false);
  const [imbuingModalOpen, setImbuingModalOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [equipmentMessage, setEquipmentMessage] = useState('Arraste ou clique em um item para alterar o loadout.');
  const [saleMessage, setSaleMessage] = useState('Itens sem preço comprovado permanecem no pouch.');
  const [promotionMessage, setPromotionMessage] = useState('');
  const [statsDelta, setStatsDelta] = useState<StatsDelta | null>(null);
  const [pointerDrag, setPointerDrag] = useState<PointerDragVisual | null>(null);
  const [confirmSale, setConfirmSale] = useState(false);
  const [levelUpMessage, setLevelUpMessage] = useState<{ text: string; timestamp: number } | null>(null);
  const [skillsModalOpen, setSkillsModalOpen] = useState(false);
  const [inspectPlayerName, setInspectPlayerName] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  useEffect(() => {
    if (isProfileModalOpen) {
      gameModal.openProfile();
      setIsProfileModalOpen(false);
    }
  }, [isProfileModalOpen, gameModal]);
  const [hotbarConfigSlot, setHotbarConfigSlot] = useState<number | null>(null);
  const [cityPos, setCityPos] = useState<{ x: number; y: number; z: number }>(THAIS_TEMPLE_POSITION);
  const [cityDirection, setCityDirection] = useState<'north' | 'south' | 'east' | 'west'>('south');
  const [walkingPath, setWalkingPath] = useState<{
    waypoints: Array<{ x: number; y: number; z: number }>;
    destinationName: string;
    onArrive?: () => void;
    currentIndex?: number;
  } | null>(null);
  const [isTrainingAtDummy, setIsTrainingAtDummy] = useState(false);
  const [trainingDummyPos, setTrainingDummyPos] = useState<{ x: number; y: number; z: number } | null>(null);
  const [activeTrainingSkill, setActiveTrainingSkill] = useState<string>('Sword Fighting');
  const auth = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(() => {
    if (initialSelection) {
      return false;
    }
    if (typeof window !== 'undefined' && window.location.pathname === '/game-preview') {
      return false;
    }
    return true;
  });
  const [isCharacterReady, setIsCharacterReady] = useState(() => {
    if (initialSelection) {
      return true;
    }
    if (typeof window !== 'undefined' && window.location.pathname === '/game-preview') {
      return true;
    }
    return false;
  });
  const [isLoadingCharacter, setIsLoadingCharacter] = useState(false);
  const [initialLoadingActive, setInitialLoadingActive] = useState(() => {
    if (initialSelection) {
      return true;
    }
    if (typeof window !== 'undefined' && window.location.pathname === '/game-preview') {
      return true;
    }
    return false;
  });
  const [transitionLoading, setTransitionLoading] = useState<{
    active: boolean;
    message: string;
    durationMs?: number;
    huntId?: string;
  } | null>(null);
  const [isArenaReady, setIsArenaReady] = useState(false);
  const combatStartedRef = useRef(false);
  const saveProgressRef = useRef<(isDeathPenalty?: boolean, force?: boolean) => Promise<boolean>>(async () => false);
  const activeSessionIdRef = useRef<string>('sess-' + Math.random().toString(36).slice(2, 10));
  const isSavingRef = useRef<boolean>(false);
  const lastSaveTimeRef = useRef<number>(0);
  const currentSaveVersionRef = useRef<number>(1);
  const characterSaveVersionsRef = useRef<Map<string, number>>(new Map());
  const isSaveSuspendedRef = useRef<boolean>(false);
  const outfitSaveActiveRef = useRef<boolean>(false);
  const outfitSaveAttemptIdRef = useRef<string | null>(null);
  const [onlineAccount, setOnlineAccount] = useState<AuthAccount | null>(null);
  // Security (Phase 116): Derives admin privileges strictly from the validated in-game account.
  // Never let an outdated viewer or leftover session promote a PLAYER account to admin.
  const activeRole = onlineAccount ? onlineAccount.role : (auth.viewer?.role || 'PLAYER');
  const roleUpper = String(activeRole || '').toUpperCase();
  const isAdmin = roleUpper === 'ADMIN' || roleUpper === 'GM';
  const [onlineCharacter, setOnlineCharacter] = useState<CharacterItem | null>(null);
  const onlineCharacterRef = useRef(onlineCharacter);
  onlineCharacterRef.current = onlineCharacter;
  const showAuthModalRef = useRef(showAuthModal);
  showAuthModalRef.current = showAuthModal;
  const gameSessionChannelRef = useRef<BroadcastChannel | null>(null);
  const [isConnectedServer, setIsConnectedServer] = useState(false);
  const [remotePlayers, setRemotePlayers] = useState<Map<string, RemotePlayerSnapshot>>(new Map());
  const [serverOnlineCount, setServerOnlineCount] = useState<number>(1);
  const [outfitModalOpen, setOutfitModalOpen] = useState(false);
  const [outfitModalCharId, setOutfitModalCharId] = useState<string>('');
  const [isPromotionModalOpen, setIsPromotionModalOpen] = useState(false);
  const hasShownPromotionPopupRef = useRef<boolean>(false);
  const [cyclopediaModalOpen, setCyclopediaModalOpen] = useState(false);
  const [isAdminDebugModalOpen, setIsAdminDebugModalOpen] = useState(false);
  const [trackedBestiaryMonsterId, setTrackedBestiaryMonsterId] = useState<string>('');
  const [isBestiaryTrackerVisible, setIsBestiaryTrackerVisible] = useState<boolean>(true);
  const [bestiaryKills, setBestiaryKills] = useState<Record<string, number>>({});
  const [bossPoints, setBossPoints] = useState<number>(0);
  const [firstKillToast, setFirstKillToast] = useState<string | null>(null);
  const [charContextMenu, setCharContextMenu] = useState<{ x: number; y: number; characterId: string } | null>(null);
  const [dummyContextMenu, setDummyContextMenu] = useState<{ dummy: TrainingDummyInfo; x: number; y: number } | null>(null);
  const [receivedPartyInvitation, setReceivedPartyInvitation] = useState<PartyInvitation | null>(null);
  const [activeHuntProposal, setActiveHuntProposal] = useState<PartyHuntProposal | null>(null);
  const [multiplayerParty, setMultiplayerParty] = useState<PartySnapshot | null>(null);
  const multiplayerPartyRef = useRef(multiplayerParty);
  multiplayerPartyRef.current = multiplayerParty;
  const followSuppressedUntilRef = useRef<number>(0);
  const isFollowingLeader = Boolean(
    multiplayerParty &&
    gameNetwork.LocalPlayerId &&
    multiplayerParty.leaderSessionId !== gameNetwork.LocalPlayerId
  );
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const cityPosRef = useRef(cityPos);
  cityPosRef.current = cityPos;
  const startSelectedHuntRef = useRef<(huntId: string, pullSize?: HuntPullSize) => void>(() => {});
  const seedRef = useRef(seed);
  seedRef.current = seed;
  const prepareHuntCharactersRef = useRef<(cur: any) => any>((cur) => cur);
  const exitHuntRef = useRef<() => void>(() => {});
  const pendingHuntTransitionRef = useRef<{
    huntId: string;
    targetHunt: any;
    nextSeed: string;
    entrance: any;
    pvpMatch?: any;
    pullSize?: HuntPullSize;
  } | null>(null);
  const activePvPDuelRef = useRef<{
    duelId: string;
    opponent: any;
    playerHpPotions: number;
    playerMpPotions: number;
    oppHpPotions: number;
    oppMpPotions: number;
    finished: boolean;
  } | null>(null);
  const [pvpBannerResult, setPvPBannerResult] = useState<{
    type: 'win' | 'loss';
    pointsDelta: number;
    coinsDelta: number;
    opponentName: string;
    promotion?: any;
  } | null>(null);
  const isCharacterVisible = !initialLoadingActive && !transitionLoading?.active && Boolean(onlineCharacter);

  const { openWindow, closeWindow, bringToFront } = useWindowManager();
  const [chatMessages, setChatMessages] = useState<ChatMessageItem[]>([
    {
      id: 'welcome-local',
      senderName: 'Templo',
      channel: 'local',
      text: 'Bem-vindo a Thais. Pressione Enter para falar no chat local.',
      timestamp: Date.now() - 20000,
    },
    {
      id: 'welcome-world',
      senderName: 'Servidor',
      channel: 'world',
      text: 'Canal World Chat ativo. Mensagens visíveis globalmente para todos os jogadores.',
      timestamp: Date.now() - 20000,
    },
  ]);
  const [overheadMessages, setOverheadMessages] = useState<CityOverheadMessage[]>([]);
  const chatWindowRef = useRef<ChatWindowHandle>(null);
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  const [isDeathModalOpen, setIsDeathModalOpen] = useState(false);
  const [isBlessingsModalOpen, setIsBlessingsModalOpen] = useState(false);
  const [isHighscoresModalOpen, setIsHighscoresModalOpen] = useState(false);
  const [isPvPArenaModalOpen, setIsPvPArenaModalOpen] = useState(false);
  const [lastKillerName, setLastKillerName] = useState<string>('Criatura das Trevas');
  const [duplicateSessionError, setDuplicateSessionError] = useState<string | null>(null);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [saveErrorAlert, setSaveErrorAlert] = useState<string | null>(null);
  const [lastConfirmedSaveTime, setLastConfirmedSaveTime] = useState<number | null>(null);
  const lastConfirmedSaveTimeRef = useRef<number | null>(null);

  // Cross-tab BroadcastChannel session duplicate detector & responder
  useEffect(() => {
    if (typeof window === 'undefined' || !onlineAccount?.id) return;
    const channelName = `tibia_session_${onlineAccount.id}`;
    let channel: BroadcastChannel | null = null;
    const currentTabId = Math.random().toString(36).substring(2, 9);

    try {
      channel = new BroadcastChannel(channelName);
      gameSessionChannelRef.current = channel;

      channel.onmessage = (event) => {
        if (!event.data) return;

        // Active game tab responds to new tab's PING ONLY if ACTUALLY playing in the game
        // (i.e. character is loaded into the world AND auth modal is closed)
        if (
          event.data.type === 'SESSION_PING' &&
          event.data.tabId !== currentTabId &&
          Boolean(onlineCharacterRef.current && !showAuthModalRef.current)
        ) {
          channel?.postMessage({
            type: 'SESSION_PONG',
            targetTabId: event.data.tabId,
            inGame: true,
            characterName: onlineCharacterRef.current?.name,
          });
        }

        // Another tab or the user forced disconnect to take over
        if (
          event.data.type === 'FORCE_DISCONNECT_OTHER_SESSIONS' &&
          event.data.accountId === onlineAccount.id &&
          event.data.initiatorTabId !== currentTabId
        ) {
          if (onlineCharacterRef.current && !showAuthModalRef.current) {
            try {
              if (saveProgressRef.current) {
                void saveProgressRef.current(false, true);
              }
            } catch {}
            gameNetwork.disconnect();
            setOnlineCharacter(null);
            setShowAuthModal(true);
            setDuplicateSessionError(
              'Sua sessão foi encerrada porque você entrou em outra aba ou dispositivo.'
            );
            try {
              channel?.postMessage({ type: 'SESSION_CLOSED', tabId: currentTabId });
            } catch {}
          }
        }

        // Only trigger duplicate session error if another tab responded that it is ACTUALLY in-game
        if (
          event.data.type === 'SESSION_PONG' &&
          event.data.targetTabId === currentTabId &&
          event.data.inGame === true
        ) {
          setDuplicateSessionError(
            'Sua conta já possui uma sessão ativa em outra aba do navegador. Apenas uma conexão por conta é permitida.'
          );
        }

        // Active session closed in other tab
        if (event.data.type === 'SESSION_CLOSED') {
          setDuplicateSessionError((prev) => (prev?.includes('outra aba') ? null : prev));
        }
      };

      // Only announce to check other tabs if WE are entering the game
      if (onlineCharacterRef.current && !showAuthModalRef.current) {
        channel.postMessage({ type: 'SESSION_PING', tabId: currentTabId });
      }
    } catch (err) {
      // Ignore if BroadcastChannel not supported
    }

    const handleBeforeUnload = () => {
      try {
        channel?.postMessage({ type: 'SESSION_CLOSED', tabId: currentTabId });
      } catch {}
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (channel) {
        try {
          channel.postMessage({ type: 'SESSION_CLOSED', tabId: currentTabId });
        } catch {}
        channel.close();
        if (gameSessionChannelRef.current === channel) {
          gameSessionChannelRef.current = null;
        }
      }
    };
  }, [onlineAccount?.id]);

  // Colyseus network duplicate session listener
  useEffect(() => {
    const unsub = gameNetwork.onDuplicateSession((msg) => {
      isSaveSuspendedRef.current = true;
      setDuplicateSessionError(msg || 'Sua conta foi conectada em outra janela ou dispositivo. Conexão encerrada.');
    });
    return () => unsub();
  }, []);

  // Friends System State
  const [friendsList, setFriendsList] = useState<FriendItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem('cavebound_friends_v1');
      return saved ? JSON.parse(saved) : [
        { id: 'f-1', name: 'Laron', level: 15, vocation: 'Knight', isOnline: true },
        { id: 'f-2', name: 'Sirius', level: 22, vocation: 'Sorcerer', isOnline: true },
      ];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    preloadSfx().catch(() => {});
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('cavebound_friends_v1', JSON.stringify(friendsList));
    } catch {}
  }, [friendsList]);

  // Dynamically calculate real-time online status for friends list based on active remote players and session characters
  const effectiveFriendsList = useMemo(() => {
    const onlineNames = new Set<string>();
    if (remotePlayers) {
      for (const r of remotePlayers.values()) {
        if (r.name) onlineNames.add(r.name.trim().toLowerCase());
      }
    }
    for (const c of game.session.characters) {
      if (c.name) onlineNames.add(c.name.trim().toLowerCase());
    }

    return friendsList.map((f) => {
      const isOnlineNow = onlineNames.has(f.name.trim().toLowerCase()) || f.isOnline === true;
      return {
        ...f,
        isOnline: isOnlineNow,
      };
    });
  }, [friendsList, remotePlayers, game.session.characters]);

  // Phase 186 Bloco E: Unique online accounts count across city & hunts without monster or tab duplication
  const uniqueOnlineAccountsCount = useMemo(() => {
    if (serverOnlineCount && serverOnlineCount > 0) return serverOnlineCount;

    const unique = new Set<string>();
    if (onlineAccount?.id) unique.add(onlineAccount.id);
    if (remotePlayers) {
      for (const p of remotePlayers.values()) {
        if ((p as any).isMonster) continue;
        if (p.accountId) unique.add(p.accountId);
        else if (p.characterId) unique.add(`char:${p.characterId}`);
      }
    }
    return Math.max(1, unique.size);
  }, [serverOnlineCount, remotePlayers, onlineAccount?.id]);

  const handleAddFriend = useCallback(
    async (name: string): Promise<{ success: boolean; error?: string }> => {
      const trimmed = name.trim();
      if (!trimmed) {
        return { success: false, error: 'Por favor, informe o nome do personagem.' };
      }

      const activeChar = selectedCharacterOf(game);
      const isSelf =
        (activeChar?.name && activeChar.name.toLowerCase() === trimmed.toLowerCase()) ||
        game.session.characters.some((c) => c.name.toLowerCase() === trimmed.toLowerCase());

      if (isSelf) {
        return { success: false, error: 'Você não pode adicionar seu próprio personagem à lista de amigos.' };
      }

      if (friendsList.some((f) => f.name.toLowerCase() === trimmed.toLowerCase())) {
        return { success: false, error: `"${trimmed}" já está na sua lista de amigos.` };
      }

      // Check remote players in current session first
      const remoteMatch = remotePlayers
        ? Array.from(remotePlayers.values()).find(
            (r) => r.name.toLowerCase() === trimmed.toLowerCase()
          )
        : null;

      if (remoteMatch) {
        const newFriend: FriendItem = {
          id: `f-${remoteMatch.id || Date.now()}`,
          name: remoteMatch.name,
          level: remoteMatch.level || 1,
          vocation: VOCATION_MAP[remoteMatch.vocationId] || 'Knight',
          isOnline: true,
        };
        setFriendsList((prev) => [...prev, newFriend]);
        setSaleMessage(`Amigo ${remoteMatch.name} adicionado com sucesso!`);
        return { success: true };
      }

      // Query database API lookup endpoint to verify existence
      try {
        const res = await fetch(`/api/characters/lookup?name=${encodeURIComponent(trimmed)}`);
        const data = (await res.json()) as {
          success?: boolean;
          character?: {
            id?: string;
            name: string;
            level?: number;
            vocationId?: number;
            vocationName?: string;
            isOnline?: boolean;
          };
          error?: string;
        };

        if (res.ok && data.success && data.character) {
          const char = data.character;
          const newFriend: FriendItem = {
            id: `f-${char.id || Date.now()}`,
            name: char.name,
            level: char.level || 1,
            vocation:
              char.vocationName ||
              (char.vocationId ? VOCATION_MAP[char.vocationId] : undefined) ||
              'Player',
            isOnline: Boolean(char.isOnline),
          };
          setFriendsList((prev) => [...prev, newFriend]);
          setSaleMessage(`Amigo ${char.name} adicionado com sucesso!`);
          return { success: true };
        }

        return {
          success: false,
          error: data?.error || `Personagem "${trimmed}" não existe no servidor.`,
        };
      } catch {
        return {
          success: false,
          error: 'Erro de comunicação ao verificar personagem no servidor.',
        };
      }
    },
    [game, friendsList, remotePlayers]
  );

  const handleRemoveFriend = useCallback((name: string) => {
    setFriendsList((prev) => prev.filter((f) => f.name.toLowerCase() !== name.toLowerCase()));
  }, []);

  const handlePrivateMessage = useCallback((name: string) => {
    setIsChatMinimized(false);
    openWindow('chat');
    bringToFront('chat');
    chatWindowRef.current?.openPrivateTab(name);
    setSaleMessage(`Abrindo conversa privada com ${name}...`);
  }, [openWindow, bringToFront]);

  const handleInviteParty = useCallback((name: string) => {
    gameNetwork.sendPartyInvite(name);
    setSaleMessage(`Convite de party enviado para ${name}!`);
  }, []);

  // Active Party Member IDs (subset of squad characters that are in the active party)
  // Active Party Member IDs (subset of squad characters that are in the active party)
  const [isPartyCreated, setIsPartyCreated] = useState<boolean>(false);
  const [partyMemberIds, setPartyMemberIds] = useState<string[]>([]);
  const [savedPool, setSavedPool] = useState<CharacterState[]>([]);
  const savedPoolRef = useRef<CharacterState[]>([]);
  savedPoolRef.current = savedPool;
  const [squadFollowCity, setSquadFollowCity] = useState<boolean>(true);

  useEffect(() => {
    if (game.session.characters.length > 0) {
      setSavedPool((prev) => {
        const map = new Map<string, CharacterState>();
        prev.forEach((c) => map.set(c.id, c));
        game.session.characters.forEach((c) => map.set(c.id, c));
        return Array.from(map.values());
      });
    }
  }, [game.session.characters]);

  // Canonical hydration helper to restore full character data including skills and skillTries
  const hydrateDbCharacter = useCallback((c: any): CharacterState => {
    const vocName =
      (c.vocationName as BaseVocationName) ||
      (c.vocation as BaseVocationName) ||
      VOCATION_MAP[c.vocationId] ||
      'Knight';
    const ch = createCharacter(c.id, c.name, vocName, content, c.gender || 'male');
    const stats = calculateStatsForLevel(vocName, c.level || 1);
    ch.level = Math.max(c.level || 1, 1);
    ch.experience = Number(c.experience || 0);
    ch.maxHp = c.maxHealth || stats.maxHp;
    ch.currentHp = c.health ?? ch.maxHp;
    ch.maxMana = c.maxMana || stats.maxMana;
    ch.currentMana = c.mana ?? ch.maxMana;
    ch.outfit = c.outfit || vocName;
    ch.outfitColors = c.outfitColors || {
      head: c.outfitHead ?? 0,
      primary: c.outfitBody ?? 86,
      secondary: c.outfitLegs ?? 114,
      detail: c.outfitFeet ?? 76,
    };
    ch.addons = c.outfitAddons ?? c.addons ?? 0;
    ch.mount = c.mount ?? 'none';
    ch.mountActive = Boolean(c.mountActive);
    ch.promotion = c.promotion ?? '';
    ch.adminTitle = (c.adminTitle && c.adminTitle !== 'null' && c.adminTitle !== 'undefined') ? c.adminTitle : '';
    ch.gender = c.gender === 'female' ? 'female' : 'male';

    if (Array.isArray(c.skills)) {
      c.skills.forEach((sk: any) => {
        const key = resolveSkillKey(sk);
        if (key && ch.skills[key] !== undefined) {
          ch.skills[key] = sk.value;
          if (key !== 'fishing' && ch.skillTries && ch.skillTries[key] !== undefined) {
            ch.skillTries[key] = Number(sk.tries ?? sk.count ?? 0);
          }
        }
      });
    }

    if (Array.isArray(c.inventory)) {
      const inv = parseInventoryData(c.inventory, content.equipment);
      ch.equipment = { ...ch.equipment, ...inv.equipment };
      ch.equipmentAttributes = inv.equipmentAttributes;
    }
    return ch;
  }, [content]);

  // Hydrate all account characters on mount/auth so alts and account highest level are immediately known
  useEffect(() => {
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('colyseus_token') || localStorage.getItem('tibia_auth_token')
        : null;
    if (!token) return;

    fetch('/api/characters', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data: any) => {
        if (data && data.success && Array.isArray(data.data)) {
          data.data.forEach((c: any) => {
            if (typeof c.saveVersion === 'number') {
              characterSaveVersionsRef.current.set(c.id, c.saveVersion);
            }
          });
          const poolChars = data.data.map(hydrateDbCharacter);
          setSavedPool((prev) => {
            const map = new Map<string, CharacterState>();
            prev.forEach((ch) => map.set(ch.id, ch));
            poolChars.forEach((ch: CharacterState) => map.set(ch.id, ch));
            return Array.from(map.values());
          });
        }
      })
      .catch((err) => {
        console.warn('Erro ao carregar lista de personagens da conta:', err);
      });
  }, [content, hydrateDbCharacter]);

  // Maior nível entre todos os personagens da conta (para desbloqueio permanente de slots no squad/party)
  const accountMaxLevel = useMemo(() => {
    const pool = savedPool.length > 0 ? savedPool : game.session.characters;
    const levels = pool.map((c) => c.level || 1);
    const selectedChar = selectedCharacterOf(game);
    return Math.max(1, ...levels, selectedChar?.level || 1);
  }, [savedPool, game.session.characters, game.session.selectedCharacterId]);

  const handleToggleSavedCharacter = useCallback((id: string) => {
    const targetChar = savedPoolRef.current.find((c) => c.id === id) || savedPool.find((c) => c.id === id);
    if (!targetChar) return;

    const isInSquad = game.session.characters.some((c) => c.id === id);
    if (isInSquad) {
      setPartyMemberIds((prev) => prev.filter((itemId) => itemId !== id));
      setGame((cur) => removePartyMember(cur, id));
    } else if (game.session.characters.length < 4) {
      const currentCount = game.session.characters.length;
      const roleUpper = onlineAccount?.role?.toUpperCase() || '';
      const isAdminOrGm = roleUpper === 'ADMIN' || roleUpper === 'GM';

      // Regra estrita: 1 vocação de cada no Squad
      const targetVoc = targetChar.vocation || targetChar.baseVocation;
      const isVocTaken = game.session.characters.some(
        (c) => (c.vocation || c.baseVocation) === targetVoc
      );
      if (isVocTaken) {
        setSaleMessage(`O Squad já possui um integrante com a vocação ${targetVoc}! Cada membro deve ter uma vocação diferente.`);
        return;
      }

      if (!isAdminOrGm) {
        if (currentCount === 1 && accountMaxLevel < 70) {
          setSaleMessage('Nível 70 necessário na conta para desbloquear o 2º slot do squad.');
          return;
        }
        if (currentCount === 2 && accountMaxLevel < 150) {
          setSaleMessage('Nível 150 necessário na conta para desbloquear o 3º slot do squad.');
          return;
        }
        if (currentCount === 3 && accountMaxLevel < 200) {
          setSaleMessage('Nível 200 necessário na conta para desbloquear o 4º slot do squad.');
          return;
        }
      }

      const activeId = game.session.selectedCharacterId || game.session.characters[0]?.id;
      setPartyMemberIds((prev) => {
        const next = new Set(prev);
        if (activeId) next.add(activeId);
        next.add(id);
        return Array.from(next).slice(0, 4);
      });
      setIsPartyCreated(true);

      const stats = calculateStatsForLevel(targetChar.vocation || 'Knight', targetChar.level || 1);
      const readyChar: CharacterState = {
        ...targetChar,
        maxHp: targetChar.maxHp || stats.maxHp,
        currentHp: targetChar.currentHp || targetChar.maxHp || stats.maxHp,
        maxMana: targetChar.maxMana || stats.maxMana,
        currentMana: targetChar.currentMana || targetChar.maxMana || stats.maxMana,
        combatState: targetChar.combatState || { targetId: null, spellCooldowns: {}, groupCooldowns: {} },
      };

      setGame((cur) => {
        if (cur.session.characters.some((c) => c.id === id)) return cur;
        return {
          ...cur,
          session: {
            ...cur.session,
            characters: [...cur.session.characters, readyChar].slice(0, 4),
          },
        };
      });
    }
  }, [savedPool, game.session.characters, game.session.selectedCharacterId, onlineAccount, accountMaxLevel]);

  const handleCreateParty = useCallback((selectedIds: string[]) => {
    const activeId = game.session.selectedCharacterId || game.session.characters[0]?.id;
    const fullSelected = Array.from(new Set([activeId, ...selectedIds])).filter(Boolean).slice(0, 4) as string[];
    setPartyMemberIds(fullSelected);
    setIsPartyCreated(true);
    setGame((cur) => {
      const actId = cur.session.selectedCharacterId || cur.session.characters[0]?.id;
      const charMap = new Map<string, CharacterState>();
      cur.session.characters.forEach((c) => charMap.set(c.id, c));
      savedPoolRef.current.forEach((c) => {
        if (!charMap.has(c.id)) charMap.set(c.id, c);
      });
      savedPool.forEach((c) => {
        if (!charMap.has(c.id)) charMap.set(c.id, c);
      });

      const updatedSquad: CharacterState[] = [];
      if (actId && charMap.has(actId)) {
        updatedSquad.push(charMap.get(actId)!);
      }
      for (const sId of fullSelected) {
        if (sId !== actId && charMap.has(sId) && updatedSquad.length < 4) {
          updatedSquad.push(charMap.get(sId)!);
        }
      }
      return {
        ...cur,
        session: {
          ...cur.session,
          characters: updatedSquad.length > 0 ? updatedSquad : cur.session.characters,
        },
      };
    });
  }, [savedPool, game.session.selectedCharacterId, game.session.characters]);

  const handleDisbandParty = useCallback(() => {
    setPartyMemberIds([]);
    setIsPartyCreated(false);
    setGame((cur) => {
      const activeId = cur.session.selectedCharacterId || cur.session.characters[0]?.id;
      const solo = cur.session.characters.filter((c) => c.id === activeId);
      return {
        ...cur,
        session: {
          ...cur.session,
          characters: solo.length > 0 ? solo : [cur.session.characters[0]],
        },
      };
    });
  }, []);

  const handleAddToParty = useCallback((id: string) => {
    const activeId = game.session.selectedCharacterId || game.session.characters[0]?.id;
    setPartyMemberIds((prev) => {
      const next = new Set(prev);
      if (activeId) next.add(activeId);
      next.add(id);
      return Array.from(next).slice(0, 4);
    });
    setIsPartyCreated(true);
    setGame((cur) => {
      if (cur.session.characters.some((c) => c.id === id)) return cur;
      if (cur.session.characters.length >= 4) return cur;
      const targetChar = savedPoolRef.current.find((c) => c.id === id) || savedPool.find((c) => c.id === id);
      if (!targetChar) return cur;
      const stats = calculateStatsForLevel(targetChar.vocation || 'Knight', targetChar.level || 1);
      const readyChar: CharacterState = {
        ...targetChar,
        maxHp: targetChar.maxHp || stats.maxHp,
        currentHp: targetChar.currentHp || targetChar.maxHp || stats.maxHp,
        maxMana: targetChar.maxMana || stats.maxMana,
        currentMana: targetChar.currentMana || targetChar.maxMana || stats.maxMana,
        combatState: targetChar.combatState || { targetId: null, spellCooldowns: {}, groupCooldowns: {} },
      };
      return {
        ...cur,
        session: {
          ...cur.session,
          characters: [...cur.session.characters, readyChar].slice(0, 4),
        },
      };
    });
  }, [savedPool, game.session.selectedCharacterId, game.session.characters]);

  const handleRemoveFromParty = useCallback((id: string) => {
    const activeId = game.session.selectedCharacterId || game.session.characters[0]?.id;
    if (id === activeId) return;
    setPartyMemberIds((prev) => {
      const next = prev.filter((itemId) => itemId !== id);
      if (next.length <= 1) setIsPartyCreated(false);
      return next;
    });
    setGame((cur) => {
      return removePartyMember(cur, id);
    });
  }, [game.session.selectedCharacterId, game.session.characters]);

  // Trade removido

  const prepareHuntCharacters = useCallback((cur: any) => {
    if (multiplayerParty && multiplayerParty.members.length > 0) {
      const localSessionId = gameNetwork.LocalPlayerId;
      const leaderMember = multiplayerParty.members.find((m) => m.isLeader || m.sessionId === multiplayerParty.leaderSessionId) || multiplayerParty.members[0];
      const otherMembers = multiplayerParty.members.filter((m) => m.sessionId !== leaderMember.sessionId);
      const orderedPartyMembers = [leaderMember, ...otherMembers];

      const localChar = cur.session.characters.find((c: CharacterState) => c.id === cur.session.selectedCharacterId) || cur.session.characters[0] || selectedCharacterOf(cur);

      const updatedChars: CharacterState[] = [];
      const seenIds = new Set<string>();
      const seenNames = new Set<string>();

      for (const m of orderedPartyMembers) {
        const charId = m.characterId || m.sessionId;
        const nameKey = (m.name || '').trim().toLowerCase();
        if (seenIds.has(charId) || (nameKey && seenNames.has(nameKey))) continue;
        seenIds.add(charId);
        if (nameKey) seenNames.add(nameKey);

        if (m.sessionId === localSessionId) {
          // Local character instance
          const charObj: CharacterState = {
            ...localChar,
            id: charId,
            name: m.name || localChar.name,
            level: Math.max(m.level || localChar.level, 1),
            currentHp: m.hp ?? localChar.currentHp,
            maxHp: m.maxHp ?? localChar.maxHp,
            currentMana: m.mp ?? localChar.currentMana,
            maxMana: m.maxMp ?? localChar.maxMana,
            outfit: m.outfit || localChar.outfit,
            outfitColors: m.outfitColors || localChar.outfitColors,
            mount: m.mount || localChar.mount,
            mountActive: m.mountActive !== undefined ? Boolean(m.mountActive) : localChar.mountActive,
          };
          updatedChars.push(charObj);
        } else {
          // Remote party member
          const existingChar = cur.session.characters.find((c: CharacterState) => c.id === charId || c.name.toLowerCase() === nameKey);
          const vocName = ((m.vocationName as BaseVocationName) || VOCATION_MAP[m.vocationId] || 'Knight') as BaseVocationName;
          const newChar = createCharacter(charId, m.name, vocName, content);
          newChar.level = Math.max(m.level, 1);
          newChar.currentHp = m.hp || newChar.maxHp;
          newChar.maxHp = m.maxHp || newChar.maxHp;
          newChar.currentMana = m.mp || newChar.maxMana;
          newChar.maxMana = m.maxMp || newChar.maxMana;
          newChar.outfit = m.outfit || vocName;
          newChar.outfitColors = m.outfitColors || { head: 0, primary: 86, secondary: 114, detail: 76 };
          newChar.mount = m.mount || 'none';
          newChar.mountActive = Boolean(m.mountActive);

          // Scale skills according to level
          const mainSkill: TrainableSkill = vocName === 'Knight' ? 'sword' : vocName === 'Paladin' ? 'distance' : 'magicLevel';
          newChar.skills[mainSkill] = Math.max(newChar.skills[mainSkill], 10 + Math.floor(newChar.level * 1.2));
          newChar.skills.shielding = Math.max(newChar.skills.shielding, 10 + Math.floor(newChar.level * 0.8));

          // Characters only use spells configured in their hotbars; never force auto spells
          newChar.hotbar = existingChar ? [...existingChar.hotbar] : [];
          newChar.hotbarConfigs = existingChar?.hotbarConfigs ? { ...existingChar.hotbarConfigs } : {};
          newChar.targetDistance = vocName === 'Knight' ? 1 : 3;

          updatedChars.push(newChar);
        }
      }

      const leaderId = leaderMember.characterId || leaderMember.sessionId;
      const selectedCharId = localChar.id;

      return {
        ...cur,
        session: {
          ...cur.session,
          characters: updatedChars,
          leaderId,
          selectedCharacterId: selectedCharId,
          cameraTargetCharacterId: selectedCharId,
          isMultiplayerParty: true,
        },
      };
    }

    // Local party / squad synchronization for hunts:
    // Garante que todos os personagens da party (partyMemberIds e session.characters) estejam presentes
    const activeId = cur.session.selectedCharacterId || cur.session.characters[0]?.id;
    const charMap = new Map<string, CharacterState>();
    cur.session.characters.forEach((c: CharacterState) => charMap.set(c.id, c));
    savedPoolRef.current.forEach((c) => {
      if (!charMap.has(c.id)) charMap.set(c.id, c);
    });
    savedPool.forEach((c) => {
      if (!charMap.has(c.id)) charMap.set(c.id, c);
    });

    const desiredIds = new Set<string>();
    if (activeId) desiredIds.add(activeId);
    for (const id of partyMemberIds) desiredIds.add(id);
    for (const c of cur.session.characters) desiredIds.add(c.id);

    const huntSquad: CharacterState[] = [];
    if (activeId && charMap.has(activeId)) {
      huntSquad.push(charMap.get(activeId)!);
    }
    for (const id of desiredIds) {
      if (id !== activeId && charMap.has(id) && huntSquad.length < 4) {
        huntSquad.push(charMap.get(id)!);
      }
    }

    if (huntSquad.length > 0) {
      return {
        ...cur,
        session: {
          ...cur.session,
          characters: huntSquad,
        },
      };
    }

    return cur;
  }, [multiplayerParty, partyMemberIds, savedPool, content]);
  prepareHuntCharactersRef.current = prepareHuntCharacters;

  useEffect(() => {
    const syncServerRates = async () => {
      try {
        const res = await fetch('/api/config');
        const data = (await res.json()) as any;
        if (data.success && data.config) {
          serverConfigManager.updateConfig(data.config);
        }
      } catch {}
    };
    void syncServerRates();
    const timer = setInterval(syncServerRates, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const unsubState = gameNetwork.onStateChange((players) => {
      setRemotePlayers(players);
    });

    const unsubOnlineCount = gameNetwork.onOnlineCountChange((count) => {
      if (count > 0) setServerOnlineCount(count);
    });

    const unsubCombat = gameNetwork.onCombatEvent((evt) => {
      const activeId = onlineCharacterRef.current?.id;
      if ((evt.type === 'spell' || evt.type === 'spell-cast') && (evt.sourceId === gameNetwork.LocalPlayerId || (activeId && evt.sourceId === activeId))) {
        const txt = (evt.text || '').toLowerCase();
        setGame((cur) => {
          const actId = activeId || cur.session.selectedCharacterId || cur.session.characters[0]?.id;
          const char = cur.session.characters.find((c) => c.id === actId) || cur.session.characters[0];
          if (!char) return cur;
          if (!char.combatState) {
            char.combatState = { targetId: null, spellCooldowns: {}, groupCooldowns: {}, hasteUntil: 0, magicShieldUntil: 0, bloodRageUntil: 0 };
          }
          const nowMs = cur.encounter.elapsedMs;
          if (txt.includes('utani gran hur') || txt.includes('strong haste')) {
            char.combatState.hasteUntil = nowMs + 33_000;
            (char as any).lastHasteSpell = 'utani gran hur';
          } else if (txt.includes('utani hur') || txt.includes('haste')) {
            char.combatState.hasteUntil = nowMs + 33_000;
            (char as any).lastHasteSpell = 'utani hur';
          } else if (txt.includes('utamo vita') || txt.includes('magic shield')) {
            char.combatState.magicShieldUntil = nowMs + 200_000;
          } else if (txt.includes('utito tempo') || txt.includes('blood rage')) {
            char.combatState.bloodRageUntil = nowMs + 10_000;
          }
          return { ...cur };
        });
      }
    });

    const unsubChat = gameNetwork.onChatMessage((netMsg) => {
      const isWhisper = netMsg.channel === 'whisper';
      const ch: 'local' | 'world' | 'whisper' = isWhisper
        ? 'whisper'
        : netMsg.channel === 'world' || netMsg.channel === 'global'
        ? 'world'
        : 'local';

      setChatMessages((prev) => {
        if (prev.some((m) => m.id === netMsg.id)) return prev;
        return [
          ...prev.slice(-99),
          {
            id: netMsg.id || `net-${Date.now()}-${Math.random()}`,
            senderId: netMsg.senderId,
            senderName: netMsg.senderName,
            senderTitle: netMsg.senderTitle,
            recipientName: netMsg.recipientName,
            channel: ch,
            text: netMsg.text,
            timestamp: netMsg.timestamp || Date.now(),
          },
        ];
      });

      // If incoming whisper from another player, auto-open chat window so user never misses it
      const myName = onlineCharacterRef.current?.name;
      if (isWhisper && netMsg.senderName !== myName && netMsg.senderName !== 'Servidor') {
        setIsChatMinimized(false);
        openWindow('chat');
        bringToFront('chat');
        chatWindowRef.current?.openPrivateTab(netMsg.senderName);
        setSaleMessage(`Nova mensagem privada de ${netMsg.senderName}!`);
      }

      if (!isWhisper && mode !== 'hunt') {
        setOverheadMessages((prev) => [
          ...prev.slice(-20),
          {
            id: netMsg.id || `net-${Date.now()}-${Math.random()}`,
            senderId: netMsg.senderId,
            senderName: netMsg.senderName,
            text: netMsg.text,
            channel: ch === 'whisper' ? 'local' : ch,
            timestamp: netMsg.timestamp || Date.now(),
          },
        ]);
      }
    });

    const unsubInvitation = gameNetwork.onPartyInvitation((invitation) => {
      setReceivedPartyInvitation(invitation);
    });

    const unsubPartySync = gameNetwork.onPartySync((party) => {
      setMultiplayerParty(party);
      if (party) {
        setIsPartyCreated(true);
        setPartyMemberIds(party.members.map((m) => m.characterId));

        // When accepting / joining as a follower, ensure we are near the leader
        if (party.leaderSessionId !== gameNetwork.LocalPlayerId) {
          const leader = party.members.find((m) => m.sessionId === party.leaderSessionId);
          if (leader) {
            const dist = Math.hypot(cityPosRef.current.x - leader.x, cityPosRef.current.y - leader.y);
            if (dist > 8 || cityPosRef.current.z !== leader.z) {
              const targetPos = { x: leader.x, y: leader.y + 1, z: leader.z };
              setWalkingPath(null);
              setCityPos(targetPos);
              gameNetwork.sendMove('south', targetPos);
            }
          }
        }
      } else {
        setPartyMemberIds((prev) => (prev[0] ? [prev[0]] : []));
      }
    });

    const unsubPartyNotification = gameNetwork.onPartyNotification((notif) => {
      setSaleMessage(notif.message);
      if (notif.type === 'disbanded' && modeRef.current === 'hunt') {
        exitHuntRef.current();
      }
    });

    const unsubHuntStart = gameNetwork.onPartyHuntStart((data) => {
      setActiveHuntProposal(null);
      setSaleMessage(`⚔️ Entrando na caçada com a party em ${data.huntId}...`);
      setWalkingPath(null);
      setIsTrainingAtDummy(false);
      const huntSeed = data.seed || seedRef.current.trim() || defaultSeed;
      const targetHunt = content.hunts.find((h) => h.id === data.huntId) ?? encounter.hunt;
      const entrance = getHuntWorldEntrance(data.huntId, content);

      // Phase 109: Start Dragon Lair music immediately during loading screen for party follower
      if (data.huntId === 'dragon-lair') {
        pauseCityBgm();
        playDragonLairBgm();
      } else {
        stopDragonLairBgm();
        playHuntBgm(data.huntId);
      }

      // Phase 107: Save progress and trigger 10-second Exura loading screen for follower
      void saveProgressRef.current?.();
      setTransitionLoading({
        active: true,
        message: `Viajando para ${targetHunt.name} com a party...`,
        durationMs: 10000,
        huntId: data.huntId,
      });

      if (modeRef.current === 'hunt') {
        setGame((current) => leaveHunt(current));
        setMode('training');
      }

      pendingHuntTransitionRef.current = {
        huntId: data.huntId,
        targetHunt,
        nextSeed: huntSeed,
        entrance,
      };
    });

    const unsubHuntExit = gameNetwork.onPartyHuntExit((coords) => {
      setSaleMessage('O líder encerrou a caçada. Retornando ao Templo de Thais...');
      followSuppressedUntilRef.current = Date.now() + 2500;
      stopHuntBgm();
      stopDragonLairBgm();
      playCityBgm();
      const temple = coords?.x && coords?.y ? { x: coords.x, y: coords.y, z: coords.z ?? 7 } : THAIS_TEMPLE_POSITION;
      setCityPos(temple);
      gameNetwork.sendTeleport(temple.x, temple.y, temple.z);
      exitHuntRef.current();
    });

    const unsubProposal = gameNetwork.onPartyHuntProposal((proposal) => {
      setActiveHuntProposal(proposal);
    });

    const unsubProposalSync = gameNetwork.onPartyHuntProposalSync((syncData) => {
      setActiveHuntProposal((prev) => (prev ? { ...prev, ...syncData } : null));
    });

    const unsubProposalRejected = gameNetwork.onPartyHuntProposalRejected((data) => {
      setActiveHuntProposal(null);
      setSaleMessage(`${data.rejectedByName} recusou a caçada em grupo.`);
    });

    const unsubPvPDuelEnded = gameNetwork.onPvPDuelEnded((data) => {
      if (data.promotion?.promoted) {
        setPvPBannerResult((prev) => (prev ? { ...prev, promotion: data.promotion } : null));
      }
    });

    const unsubTargetSync = gameNetwork.onPartyTargetSync((targetId) => {
      setGame((cur) => {
        let next = cur;
        for (const c of cur.session.characters) {
          next = setActorTarget(next, c.id, targetId);
        }
        return next;
      });
    });

    const unsubLeaderMoved = gameNetwork.onPartyLeaderMoved((data) => {
      if (Date.now() < followSuppressedUntilRef.current) return;
      if (modeRef.current !== 'hunt' && data.leaderSessionId !== gameNetwork.LocalPlayerId) {
        const dist = Math.hypot(cityPosRef.current.x - data.x, cityPosRef.current.y - data.y);
        if (dist > 12 || cityPosRef.current.z !== data.z) {
          const targetPos = { x: data.x, y: data.y + 1, z: data.z };
          setWalkingPath(null);
          setCityPos(targetPos);
          gameNetwork.sendMove('south', targetPos);
          return;
        }
        if (dist > 1.2 && cityPosRef.current.z === data.z) {
          const activeTileMap = cityPosRef.current.z === 6 ? thaisTileMapZ6 : thaisTileMapZ7;
          const path = findCityPath(activeTileMap, cityPosRef.current, { x: data.x, y: data.y, z: data.z }, 400);
          if (path.length > 1) {
            const followPath = path.slice(0, Math.max(1, path.length - 1));
            setWalkingPath({
              waypoints: followPath,
              destinationName: `Seguindo líder`,
              currentIndex: 0,
            });
          }
        }
      }
    });

    return () => {
      unsubState();
      unsubCombat();
      unsubChat();
      unsubInvitation();
      unsubPartySync();
      unsubPartyNotification();
      unsubHuntStart();
      unsubHuntExit();
      unsubTargetSync();
      unsubLeaderMoved();
      unsubProposal();
      unsubProposalSync();
      unsubProposalRejected();
      unsubPvPDuelEnded();
    };
  }, [mode, content]);

  // Pressing Enter in city opens and focuses directly into Local Chat
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (mode === 'hunt') return;
      if (e.key === 'Enter') {
        const activeTag = (document.activeElement?.tagName || '').toLowerCase();
        if (activeTag === 'input' || activeTag === 'textarea') return;

        e.preventDefault();
        setIsChatMinimized(false);
        openWindow('chat');
        bringToFront('chat');
        chatWindowRef.current?.focusInput('local');
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [mode, openWindow, bringToFront]);

  // Phase 103/109/185: Loop 'Sunset in the Village' while player is in Thais; pause in hunt and play hunt bgm
  useEffect(() => {
    if (mode === 'training') {
      // Do not restart city BGM if transitioning to dragon-lair or any hunt
      if (pendingHuntTransitionRef.current?.huntId) {
        return;
      }
      const isPreview = typeof window !== 'undefined' && window.location.pathname === '/game-preview';
      if (isCharacterReady || initialLoadingActive || isPreview) {
        playCityBgm();
      }
    } else {
      pauseCityBgm();
      const currentHuntId = game.encounter?.hunt?.id;
      if (currentHuntId === 'dragon-lair') {
        playDragonLairBgm();
      } else if (currentHuntId) {
        playHuntBgm(currentHuntId);
      }
    }
  }, [mode, isCharacterReady, initialLoadingActive, game.encounter?.hunt?.id]);

  // Clean up all audio on unmount
  useEffect(() => {
    return () => {
      stopAllAudio();
    };
  }, []);

  // Phase 205: Initialize centralized client error handlers
  useEffect(() => {
    clientErrorLogger.initGlobalHandlers();
  }, []);

  // Phase 131: Preload loading screen artworks immediately on client boot
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const preloadImages = [
        '/images/loading/thais-loading.jpg',
        '/images/loading/dragon-lair-loading.jpg',
        '/images/loading/loading-bg.jpg',
      ];
      for (const src of preloadImages) {
        const img = new Image();
        img.src = src;
      }
    }
  }, []);

  const handleSelectCharacter = useCallback((authToken: string, charItem: CharacterItem, acc: AuthAccount) => {
    setIsLoadingCharacter(true);
    setInitialLoadingActive(true);
    setOnlineAccount(acc);
    setOnlineCharacter(charItem);
    setShowAuthModal(false);

    // Phase 150: O pré-carregamento Active Player First será iniciado logo abaixo com os dados completos do personagem
    // Phase 103: Start Thais BGM immediately during loading screen!
    playCityBgm();

    let targetX = (charItem as any).posX ?? charItem.positionX ?? 32369;
    let targetY = (charItem as any).posY ?? charItem.positionY ?? 32241;
    let targetZ = (charItem as any).posZ ?? charItem.positionZ ?? 7;

    // Safety Net: If character position is unwalkable or out of bounds (stuck), reset to Thais Temple (32369, 32241, 7)
    const activeTileMap = targetZ === 6 ? thaisTileMapZ6 : thaisTileMapZ7;
    const tile = activeTileMap.get(`${targetX},${targetY}`);
    if (!tile || !tile.walkable) {
      targetX = THAIS_TEMPLE_POSITION.x;
      targetY = THAIS_TEMPLE_POSITION.y;
      targetZ = THAIS_TEMPLE_POSITION.z;
    }
    setCityPos({ x: targetX, y: targetY, z: targetZ });

    // Update game state with the real user character created or selected in Auth Modal!
    const vocName =
      ((charItem as any).vocationName as BaseVocationName) ||
      ((charItem as any).vocation as BaseVocationName) ||
      VOCATION_MAP[charItem.vocationId] ||
      (charItem.vocationId === 0 ? 'None' : 'Knight');
    const charGender = ((charItem as any).gender as 'male' | 'female') || 'male';
    const userChar = createCharacter(charItem.id, charItem.name, vocName, content, charGender);

    // Admin title hydration: Derive authorized title ([GOD] or [GM])
    const rawDbTitle = (charItem as any).adminTitle;
    const cleanDbTitle = (rawDbTitle && rawDbTitle !== 'null' && rawDbTitle !== 'undefined')
      ? String(rawDbTitle).trim().toUpperCase()
      : null;
    const accRoleUpper = String((acc as any)?.role || '').trim().toUpperCase();
    const resolvedAdminTitle = (cleanDbTitle === 'GOD' || cleanDbTitle === 'GM')
      ? cleanDbTitle
      : (accRoleUpper === 'ADMIN' ? 'GOD' : accRoleUpper === 'GM' ? 'GM' : undefined);

    if (resolvedAdminTitle === 'GOD' || resolvedAdminTitle === 'GM') {
      (userChar as any).adminTitle = resolvedAdminTitle;
      (charItem as any).adminTitle = resolvedAdminTitle;
    }
    (userChar as any).accountRole = accRoleUpper;

    // Promotion hydration
    if ((charItem as any).promotion) {
      userChar.promotion = (charItem as any).promotion;
      userChar.vocation = (charItem as any).promotion;
    }

    // Hotbar hydration from DB hotbarJson or hotbar
    if ((charItem as any).hotbarJson) {
      try {
        const parsed = JSON.parse((charItem as any).hotbarJson);
        if (Array.isArray(parsed)) {
          userChar.hotbar = parsed;
        } else if (parsed && Array.isArray(parsed.hotbar)) {
          userChar.hotbar = parsed.hotbar;
          if (parsed.hotbarConfigs) {
            (userChar as any).hotbarConfigs = parsed.hotbarConfigs;
          }
        }
      } catch {}
    } else if (Array.isArray((charItem as any).hotbar)) {
      userChar.hotbar = (charItem as any).hotbar;
    }

    const rawExp = (charItem as any).experience;
    if (typeof rawExp === 'number' && rawExp >= 0) {
      userChar.experience = rawExp;
    } else if (typeof rawExp === 'string' && !isNaN(Number(rawExp))) {
      userChar.experience = Number(rawExp);
    } else if (charItem.level) {
      userChar.experience = experienceForLevel(charItem.level);
    }
    userChar.level = Math.max(charItem.level || 1, levelForExperience(userChar.experience));

    if (charItem.health) userChar.currentHp = charItem.health;
    if (charItem.maxHealth) userChar.maxHp = charItem.maxHealth;
    if (charItem.mana) userChar.currentMana = charItem.mana;
    if (charItem.maxMana) userChar.maxMana = charItem.maxMana;
    (userChar as any).avatarId = (charItem as any).avatarId ?? 1;
    let initialBestiaryKills: Record<string, number> = {};
    if ((charItem as any).bestiaryKills && typeof (charItem as any).bestiaryKills === 'object') {
      initialBestiaryKills = (charItem as any).bestiaryKills;
    } else if ((charItem as any).bestiaryKillsJson) {
      try {
        initialBestiaryKills = typeof (charItem as any).bestiaryKillsJson === 'string'
          ? JSON.parse((charItem as any).bestiaryKillsJson)
          : (charItem as any).bestiaryKillsJson;
      } catch {}
    }
    setBestiaryKills(initialBestiaryKills);
    (userChar as any).bestiaryKills = initialBestiaryKills;
    const initialTracked = (charItem as any).trackedBestiaryId || '';
    setTrackedBestiaryMonsterId(initialTracked);
    (userChar as any).trackedBestiaryId = initialTracked;
    const initialBossPoints = typeof (charItem as any).bossPoints === 'number' ? (charItem as any).bossPoints : 0;
    setBossPoints(initialBossPoints);
    (userChar as any).bossPoints = initialBossPoints;
    (userChar as any).displaySkull = typeof (charItem as any).displaySkull === 'boolean' ? (charItem as any).displaySkull : true;
    (userChar as any).pvpElo = typeof (charItem as any).pvpElo === 'number' ? (charItem as any).pvpElo : 0;
    (userChar as any).pvpTier = (charItem as any).pvpTier || 'Iniciante';

    // Hydrate skills, gold, loot, bag, and inventory items from DB if available
    let loadedGold = 0;
    const loadedLoot: Array<{ itemId?: number; name: string; amount: number }> = [];
    const loadedBag: Array<{ itemId?: number; name: string; amount: number }> = [];
    const dbInventory = (charItem as any).inventory;

    if (Array.isArray((charItem as any).skills)) {
      ((charItem as any).skills as Array<{ skillId: number; skillName: string; value: number; tries?: number }>).forEach((sk) => {
        const key = resolveSkillKey(sk);
        if (key && userChar.skills[key] !== undefined) {
          userChar.skills[key] = sk.value;
          if (key !== 'fishing' && sk.tries !== undefined && userChar.skillTries && userChar.skillTries[key] !== undefined) {
            userChar.skillTries[key] = Number(sk.tries);
          }
        }
      });
    }

    if (Array.isArray(dbInventory)) {
      const parsedInv = parseInventoryData(dbInventory, content.equipment);
      userChar.equipment = parsedInv.equipment;
      userChar.equipmentAttributes = parsedInv.equipmentAttributes;
      userChar.inventory.equipmentIds = parsedInv.equipmentIds;
      loadedGold = parsedInv.gold;
      loadedBag.push(...parsedInv.bag);
      loadedLoot.push(...parsedInv.loot);
    }

    const hasDbColors =
      typeof (charItem as any).outfitBody === 'number' &&
      ((charItem as any).outfitBody > 0 || (charItem as any).outfitLegs > 0 || (charItem as any).outfitFeet > 0);

    const defaultColors = { head: 0, primary: 86, secondary: 114, detail: 76 };
    userChar.outfitColors = (charItem as any).outfitColors || (hasDbColors ? {
      head: (charItem as any).outfitHead ?? 0,
      primary: (charItem as any).outfitBody ?? 86,
      secondary: (charItem as any).outfitLegs ?? 114,
      detail: (charItem as any).outfitFeet ?? 76,
    } : defaultColors);

    const charLookType = (charItem as any).outfitLookType;
    const LOOKTYPE_NAME_MAP: Record<number, string> = {
      128: 'Citizen',
      129: 'Paladin',
      130: 'Sorcerer',
      131: 'Knight',
      132: 'Noble',
      133: 'Summoner',
      134: 'Warrior',
      136: 'Citizen',
      137: 'Paladin',
      138: 'Sorcerer',
      139: 'Knight',
      143: 'Barbarian',
      144: 'Druid',
      999: 'Sire',
    };

    userChar.addons = (charItem as any).outfitAddons ?? (charItem as any).addons ?? 0;
    userChar.mount = (charItem as any).mount ?? 'none';
    userChar.mountActive = Boolean((charItem as any).mountActive);
    const charSaveVer = typeof (charItem as any).saveVersion === 'number' ? (charItem as any).saveVersion : 1;
    currentSaveVersionRef.current = charSaveVer;
    characterSaveVersionsRef.current.set(charItem.id, charSaveVer);
    isSaveSuspendedRef.current = false;

    userChar.outfit =
      (charItem as any).outfit ||
      (charLookType && LOOKTYPE_NAME_MAP[charLookType]) ||
      vocName;

    // Phase 150: Inicia o pré-carregamento prioritário enfocado estritamente no personagem ativo
    void assetPreloader.startPreload({
      outfit: userChar.outfit,
      gender: userChar.gender,
      outfitColors: userChar.outfitColors,
      addons: userChar.addons,
      mount: userChar.mount,
      isMounted: userChar.mountActive,
    });

    setGame((cur) => {
      // Newly created or selected character starts ALONE as sole main character in squad
      return {
        ...cur,
        session: {
          ...cur.session,
          leaderId: userChar.id,
          selectedCharacterId: userChar.id,
          cameraTargetCharacterId: userChar.id,
          characters: [userChar],
          gold: Array.isArray(dbInventory) ? loadedGold : cur.session.gold,
          loot: Array.isArray(dbInventory) ? loadedLoot : cur.session.loot,
          bag: Array.isArray(dbInventory) ? loadedBag : cur.session.bag,
        },
      };
    });

    // Hydrate all account characters into savedPool so alts and account highest level are immediately known
    fetch('/api/characters', {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then((res) => res.json())
      .then((data: any) => {
        if (data && data.success && Array.isArray(data.data)) {
          let totalAccountGold = 0;
          data.data.forEach((c: any) => {
            if (typeof c.saveVersion === 'number') {
              characterSaveVersionsRef.current.set(c.id, c.saveVersion);
            }
            if (Array.isArray(c.inventory)) {
              const inv = parseInventoryData(c.inventory, content.equipment);
              totalAccountGold += inv.gold;
            }
          });
          const poolChars = data.data.map(hydrateDbCharacter);
          setSavedPool((prev) => {
            const map = new Map<string, CharacterState>();
            prev.forEach((ch) => map.set(ch.id, ch));
            poolChars.forEach((ch: CharacterState) => map.set(ch.id, ch));
            return Array.from(map.values());
          });
        }
      })
      .catch((err) => {
        console.warn('Erro ao carregar lista de personagens da conta:', err);
      });

    // Connect to live Colyseus Server room with full outfit info and initial hunt context
    gameNetwork
      .connect(authToken, charItem.id, {
        outfit: userChar.outfit,
        outfitLookType: charLookType || 128,
        outfitColors: userChar.outfitColors,
        addons: userChar.addons,
        mount: userChar.mount,
        mountActive: userChar.mountActive,
        inHunt: Boolean((charItem as any).isHunting),
        huntId: (charItem as any).lastHuntId,
      })
      .then(() => {
        setIsConnectedServer(true);
      })
      .catch((err) => {
        console.error('Falha ao conectar ao servidor Colyseus:', err);
      });

    // Phase 139 & Phase 144: Preload both walk (on foot) and mount frames so transitions are instant
    preloadOutfitAllFrames(
      userChar.outfit || 'Knight',
      userChar.gender || 'male',
      userChar.outfitColors,
      userChar.addons,
      userChar.mount,
      false
    ).catch(() => {});

    if (userChar.mount && userChar.mount !== 'none') {
      preloadOutfitAllFrames(
        userChar.outfit || 'Knight',
        userChar.gender || 'male',
        userChar.outfitColors,
        userChar.addons,
        userChar.mount,
        true
      ).catch(() => {});
    }

    try {
      getCyclopediaItems();
      getBestiaryMonsters();
    } catch {}

    setIsCharacterReady(true);
    setIsLoadingCharacter(false);
  }, [content]);

  // Phase 189: Auto-apply initial selection from lightweight GameClientLauncher
  const initialSelectionAppliedRef = useRef(false);
  useEffect(() => {
    if (initialSelection && !initialSelectionAppliedRef.current) {
      initialSelectionAppliedRef.current = true;
      handleSelectCharacter(
        initialSelection.authToken,
        initialSelection.charItem,
        initialSelection.acc
      );
    }
  }, [initialSelection, handleSelectCharacter]);

  const leader = leaderOf(game);
  const activeCharacter = selectedCharacterOf(game);
  const encounter = game.encounter;
  const combinedCityVisualEvents = useMemo(() => {
    return [...(encounter.events || []), ...(encounter.visualEvents || [])] as any;
  }, [encounter.events, encounter.visualEvents]);
  const activeStats = deriveStats(activeCharacter, content.equipment, vocationFor(content, activeCharacter.vocation));
  const statsById = useMemo(() => new Map(game.session.characters.map((character) => [
    character.id, deriveStats(character, content.equipment, vocationFor(content, character.vocation)),
  ])), [game.session.characters]);

  // Track latest character, inventory, position, and economy snapshot for background & logout persistence
  const latestSaveStateRef = useRef<{
    activeCharacter: typeof activeCharacter;
    onlineCharacter: typeof onlineCharacter;
    characters: typeof game.session.characters;
    cityPos: typeof cityPos;
    gold: number;
    loot: typeof game.session.loot;
    bag: typeof game.session.bag;
    equipment: typeof content.equipment;
    bestiaryKills: Record<string, number>;
    trackedBestiaryId: string | null;
    bossPoints: number;
  }>({
    activeCharacter,
    onlineCharacter,
    characters: game.session.characters,
    cityPos,
    gold: game.session.gold,
    loot: game.session.loot,
    bag: game.session.bag,
    equipment: content.equipment,
    bestiaryKills: {},
    trackedBestiaryId: null,
    bossPoints: 0,
  });
  latestSaveStateRef.current = {
    activeCharacter,
    onlineCharacter,
    characters: game.session.characters,
    cityPos,
    gold: game.session.gold,
    loot: game.session.loot,
    bag: game.session.bag,
    equipment: content.equipment,
    bestiaryKills: {
      ...((game.session as any)?.bestiaryKills || {}),
      ...((activeCharacter as any)?.bestiaryKills || {}),
      ...bestiaryKills,
    },
    trackedBestiaryId: (activeCharacter as any)?.trackedBestiaryId || trackedBestiaryMonsterId || null,
    bossPoints: (activeCharacter as any)?.bossPoints ?? bossPoints ?? 0,
  };

  // Robust Auto-Save with Mutex Lock and Throttle
  const saveProgress = useCallback(async (isDeathPenalty = false, force = false): Promise<boolean> => {
    // Mutex lock: wait if a save is currently in flight (up to 6s)
    if (isSavingRef.current) {
      let waited = 0;
      while (isSavingRef.current && waited < 6000) {
        await new Promise((r) => setTimeout(r, 100));
        waited += 100;
      }
      if (isSavingRef.current) return false;
    }

    const token = typeof window !== 'undefined' ? (localStorage.getItem('colyseus_token') || localStorage.getItem('tibia_auth_token')) : null;
    const state = latestSaveStateRef.current;
    const {
      activeCharacter: curActive,
      onlineCharacter: curOnline,
      characters: curCharacters = [],
      cityPos: curPos,
      gold: curGold,
      loot: curLoot,
      bag: curBag,
      equipment: curEquipment,
      bestiaryKills: curBestiaryKills,
      trackedBestiaryId: curTrackedBestiaryId,
      bossPoints: curBossPoints,
    } = state;

    if (!token || !curOnline) return false;

    // The titular owner of the Caixa da Party in DB is always curOnline (the logged-in session leader)
    const primaryChar = curCharacters.find((c) => c.id === curOnline.id) || (curActive?.id === curOnline.id ? curActive : null);
    if (!primaryChar) return false;

    // Suspended saves guard: if autosave was suspended, allow forced saves (such as exiting hunt, logout, manual save)
    if (isSaveSuspendedRef.current && !force) return false;

    // Throttle: minimum 10 seconds between auto-saves unless forced (e.g. logout or character switch)
    const now = Date.now();
    if (!force && lastSaveTimeRef.current > 0 && now - lastSaveTimeRef.current < 10000) return false;

    isSavingRef.current = true;
    lastSaveTimeRef.current = now;

    try {
      const inventoryPayload: Array<{ slot: string; serverId: number; name: string; count: number }> = [];
      const savedServerIds = new Set<number>();

      // 1. Equipped Items of primaryChar (the Caixa da Party custodian)
      const slots: CharacterEquipmentSlot[] = ['head', 'armor', 'legs', 'boots', 'leftHand', 'rightHand'];
      slots.forEach((slot) => {
        const itemId = primaryChar.equipment[slot];
        if (itemId) {
          const eqDef = findEquipment(curEquipment, itemId);
          const attr = primaryChar.equipmentAttributes?.[slot];
          inventoryPayload.push({
            slot,
            serverId: itemId,
            name: eqDef?.name || 'Equipment',
            count: 1,
            ...(attr ? { attributesJson: JSON.stringify(attr) } : {}),
          } as any);
          savedServerIds.add(itemId);
        }
      });

      // 2. Gold Coins (Caixa da Party) - Exclusivo do titular curOnline, sem duplicar nos acompanhantes
      if (curGold > 0) {
        inventoryPayload.push({
          slot: 'gold',
          serverId: 2148,
          name: 'Gold Coin',
          count: curGold,
        });
      }

      // 3. Bag / Bolsa Items
      if (curBag && curBag.length > 0) {
        curBag.forEach((stack, idx) => {
          inventoryPayload.push({
            slot: `bag_${idx}`,
            serverId: stack.itemId || 2148,
            name: stack.name,
            count: stack.amount,
          });
          if (stack.itemId) savedServerIds.add(stack.itemId);
        });
      }

      // 4. Loot / Mochila Items
      if (curLoot && curLoot.length > 0) {
        curLoot.forEach((stack, idx) => {
          inventoryPayload.push({
            slot: `backpack_loot_${idx}`,
            serverId: stack.itemId || 2148,
            name: stack.name,
            count: stack.amount,
          });
          if (stack.itemId) savedServerIds.add(stack.itemId);
        });
      }

      // 5. Additional Owned Equipment for primaryChar
      const unequippedIds = (primaryChar.inventory?.equipmentIds || []).filter((id) => !savedServerIds.has(id));
      unequippedIds.forEach((itemId, idx) => {
        const eqDef = findEquipment(curEquipment, itemId);
        inventoryPayload.push({
          slot: `backpack_${idx}`,
          serverId: itemId,
          name: eqDef?.name || 'Item',
          count: 1,
        });
      });

      const primaryVersion = characterSaveVersionsRef.current.get(primaryChar.id) || currentSaveVersionRef.current;
      const isPrimaryActive = curActive?.id === primaryChar.id;
      const isCurrentlyHunting = mode === 'hunt' || Boolean(transitionLoading?.huntId) || gameNetwork.getHuntContext().inHunt;
      const activeHuntId = (mode === 'hunt' ? game.encounter.hunt?.id : undefined) || transitionLoading?.huntId || gameNetwork.getHuntContext().huntId || 'cyclops-camp';

      let primaryPosX: number;
      let primaryPosY: number;
      let primaryPosZ: number;

      if (isCurrentlyHunting && activeHuntId) {
        const entrance = getHuntWorldEntrance(activeHuntId, content);
        primaryPosX = entrance.worldPosition.x;
        primaryPosY = entrance.worldPosition.y;
        primaryPosZ = entrance.worldPosition.z;
      } else {
        primaryPosX = isPrimaryActive ? curPos.x : ((primaryChar as any).posX ?? 32369);
        primaryPosY = isPrimaryActive ? curPos.y : ((primaryChar as any).posY ?? 32241);
        primaryPosZ = isPrimaryActive ? curPos.z : ((primaryChar as any).posZ ?? 7);
      }

      const res = await fetch(`/api/characters/${primaryChar.id}/save`, {
        method: 'POST',
        keepalive: true,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          level: primaryChar.level,
          experience: Number(primaryChar.experience),
          health: primaryChar.currentHp,
          maxHealth: primaryChar.maxHp,
          mana: primaryChar.currentMana,
          maxMana: primaryChar.maxMana,
          posX: primaryPosX,
          posY: primaryPosY,
          posZ: primaryPosZ,
          skills: [
            { skillId: 0, skillName: 'Fist Fighting', value: primaryChar.skills.fist, tries: primaryChar.skillTries?.fist ? Math.floor(primaryChar.skillTries.fist) : 0 },
            { skillId: 1, skillName: 'Club Fighting', value: primaryChar.skills.club, tries: primaryChar.skillTries?.club ? Math.floor(primaryChar.skillTries.club) : 0 },
            { skillId: 2, skillName: 'Sword Fighting', value: primaryChar.skills.sword, tries: primaryChar.skillTries?.sword ? Math.floor(primaryChar.skillTries.sword) : 0 },
            { skillId: 3, skillName: 'Axe Fighting', value: primaryChar.skills.axe, tries: primaryChar.skillTries?.axe ? Math.floor(primaryChar.skillTries.axe) : 0 },
            { skillId: 4, skillName: 'Distance Fighting', value: primaryChar.skills.distance, tries: primaryChar.skillTries?.distance ? Math.floor(primaryChar.skillTries.distance) : 0 },
            { skillId: 5, skillName: 'Shielding', value: primaryChar.skills.shielding, tries: primaryChar.skillTries?.shielding ? Math.floor(primaryChar.skillTries.shielding) : 0 },
            { skillId: 7, skillName: 'Magic Level', value: primaryChar.skills.magicLevel, tries: primaryChar.skillTries?.magicLevel ? Math.floor(primaryChar.skillTries.magicLevel) : 0 },
          ],
          inventory: inventoryPayload,
          hotbar: primaryChar.hotbar,
          hotbarConfigs: primaryChar.hotbarConfigs,
          avatarId: (primaryChar as any).avatarId ?? 1,
          outfit: primaryChar.outfit,
          outfitHead: primaryChar.outfitColors?.head,
          outfitBody: primaryChar.outfitColors?.primary,
          outfitLegs: primaryChar.outfitColors?.secondary,
          outfitFeet: primaryChar.outfitColors?.detail,
          outfitAddons: (primaryChar as any).addons ?? (primaryChar as any).outfitAddons ?? 0,
          mount: primaryChar.mount,
          mountActive: primaryChar.mountActive,
          bestiaryKills: curBestiaryKills,
          trackedBestiaryId: curTrackedBestiaryId,
          bossPoints: curBossPoints,
          vocationName: primaryChar.vocation,
          promotion: primaryChar.promotion,
          isDeathPenalty,
          saveVersion: primaryVersion,
          replaceFullInventory: true,
          isHunting: isCurrentlyHunting || isTrainingAtDummy,
          lastHuntId: isCurrentlyHunting ? activeHuntId : undefined,
          sessionId: gameNetwork.LocalPlayerId || activeSessionIdRef.current,
        }),
      });

      const attemptId = `save-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      progressionDiagnostics.recordSaveAttempt(
        attemptId,
        primaryChar.id,
        primaryVersion,
        primaryChar.level,
        Number(primaryChar.experience),
        curGold,
        mode === 'hunt'
      );

      if (outfitSaveActiveRef.current) {
        outfitSaveActiveRef.current = false;
        const targetAttemptId = outfitSaveAttemptIdRef.current;
        outfitSaveAttemptIdRef.current = null;
        outfitDiagnostics.recordApiSave(
          res.status,
          res.ok,
          res.ok ? undefined : `HTTP ${res.status}`,
          targetAttemptId || undefined
        );
      }

      if (res.status === 409) {
        // Optimistic Concurrency Conflict: advance saveVersion to server version and retry saving authentic active state
        try {
          const conflictData = (await res.json()) as any;
          if (conflictData?.error === 'SESSION_SUPERSEDED') {
            console.warn('[GamePrototype] Sessão sobreposta por uma nova conexão ativa.');
            if (!force) {
              isSaveSuspendedRef.current = true;
              return false;
            }
          }

          const nextVersion = typeof conflictData?.currentVersion === 'number'
            ? conflictData.currentVersion
            : primaryVersion + 1;

          currentSaveVersionRef.current = nextVersion;
          characterSaveVersionsRef.current.set(primaryChar.id, nextVersion);

          progressionDiagnostics.recordSaveConflict(
            attemptId,
            primaryVersion,
            nextVersion,
            primaryChar.level,
            Number(primaryChar.experience)
          );

          // We do NOT perform naive Math.max on gold, inventory, experience, or skills.
          // The active session is authoritative: spent gold stays spent, consumed items stay consumed,
          // death penalties remain intact, and rat loot/gold remains in the active session.
          isSaveSuspendedRef.current = false;

          // Immediately schedule retry save with updated saveVersion to persist authentic active session state
          setTimeout(() => {
            void saveProgressRef.current?.(false, true);
          }, 100);
        } catch {
          isSaveSuspendedRef.current = true;
        }
        return false;
      }

      if (res.ok) {
        setSaveErrorAlert(null);
        const json = (await res.json()) as any;
        if (typeof json?.data?.saveVersion === 'number') {
          currentSaveVersionRef.current = json.data.saveVersion;
          characterSaveVersionsRef.current.set(primaryChar.id, json.data.saveVersion);
          const confirmedAt = Date.now();
          lastConfirmedSaveTimeRef.current = confirmedAt;
          setLastConfirmedSaveTime(confirmedAt);
          progressionDiagnostics.recordSaveSuccess(attemptId, primaryChar.id, json.data.saveVersion, res.status);
        }
      } else if (res.status === 503) {
        // Context is pending / server is recovering session
        console.warn('[GamePrototype] Contexto do personagem em sincronização no servidor (HTTP 503). Progresso mantido em memória para autosave subsequente.');
        setSaveErrorAlert('Sincronizando contexto com o servidor...');
        setTimeout(() => {
          setSaveErrorAlert(null);
          void saveProgressRef.current?.(false, true);
        }, 2000);
        return false;
      } else if (res.status !== 409) {
        let errorDetail = '';
        try {
          const errData = (await res.json()) as any;
          errorDetail = errData?.message || errData?.error || '';
        } catch {}
        console.error(`[GamePrototype] Falha ao salvar personagem (${res.status}):`, errorDetail);
        setSaveErrorAlert(errorDetail ? `Falha ao salvar: ${errorDetail}` : 'Falha ao salvar progresso no servidor.');
        progressionDiagnostics.recordSaveError(attemptId, res.status, errorDetail || `HTTP ${res.status}`);
        return false;
      }

      // Persist all owned party alts individually (level, exp, hp, mana, skills, equipment)
      // IMPORTANT: Alts NEVER receive slot: 'gold' (Caixa da Party is exclusively on primaryChar)
      const ownedAlts = curCharacters.filter(
        (char: CharacterState) => char.id !== primaryChar.id && savedPoolRef.current.some((p) => p.id === char.id)
      );

      for (const alt of ownedAlts) {
        try {
          const altVersion = characterSaveVersionsRef.current.get(alt.id) || 1;
          const isAltActive = curActive?.id === alt.id;
          const altPosX = isAltActive ? curPos.x : ((alt as any).posX ?? 32369);
          const altPosY = isAltActive ? curPos.y : ((alt as any).posY ?? 32241);
          const altPosZ = isAltActive ? curPos.z : ((alt as any).posZ ?? 7);

          // Alt personal inventory: equipment only, ZERO gold, ZERO shared bags
          const altInventoryPayload: Array<{ slot: string; serverId: number; name: string; count: number }> = [];
          const altSavedIds = new Set<number>();
          slots.forEach((slot) => {
            const itemId = alt.equipment[slot];
            if (itemId) {
              const eqDef = findEquipment(curEquipment, itemId);
              const attr = alt.equipmentAttributes?.[slot];
              altInventoryPayload.push({
                slot,
                serverId: itemId,
                name: eqDef?.name || 'Equipment',
                count: 1,
                ...(attr ? { attributesJson: JSON.stringify(attr) } : {}),
              } as any);
              altSavedIds.add(itemId);
            }
          });

          if (alt.inventory?.equipmentIds) {
            const altUnequipped = alt.inventory.equipmentIds.filter((id) => !altSavedIds.has(id));
            altUnequipped.forEach((itemId, idx) => {
              const eqDef = findEquipment(curEquipment, itemId);
              altInventoryPayload.push({
                slot: `backpack_${idx}`,
                serverId: itemId,
                name: eqDef?.name || 'Item',
                count: 1,
              });
            });
          }

          const altRes = await fetch(`/api/characters/${alt.id}/save`, {
            method: 'POST',
            keepalive: true,
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              level: alt.level,
              experience: Number(alt.experience),
              health: alt.currentHp,
              maxHealth: alt.maxHp,
              mana: alt.currentMana,
              maxMana: alt.maxMana,
              posX: altPosX,
              posY: altPosY,
              posZ: altPosZ,
              skills: [
                { skillId: 0, skillName: 'Fist Fighting', value: alt.skills.fist, tries: alt.skillTries?.fist ? Math.floor(alt.skillTries.fist) : 0 },
                { skillId: 1, skillName: 'Club Fighting', value: alt.skills.club, tries: alt.skillTries?.club ? Math.floor(alt.skillTries.club) : 0 },
                { skillId: 2, skillName: 'Sword Fighting', value: alt.skills.sword, tries: alt.skillTries?.sword ? Math.floor(alt.skillTries.sword) : 0 },
                { skillId: 3, skillName: 'Axe Fighting', value: alt.skills.axe, tries: alt.skillTries?.axe ? Math.floor(alt.skillTries.axe) : 0 },
                { skillId: 4, skillName: 'Distance Fighting', value: alt.skills.distance, tries: alt.skillTries?.distance ? Math.floor(alt.skillTries.distance) : 0 },
                { skillId: 5, skillName: 'Shielding', value: alt.skills.shielding, tries: alt.skillTries?.shielding ? Math.floor(alt.skillTries.shielding) : 0 },
                { skillId: 7, skillName: 'Magic Level', value: alt.skills.magicLevel, tries: alt.skillTries?.magicLevel ? Math.floor(alt.skillTries.magicLevel) : 0 },
              ],
              inventory: altInventoryPayload,
              replaceFullInventory: false,
              vocationName: alt.vocation,
              promotion: alt.promotion,
              outfit: alt.outfit,
              saveVersion: altVersion,
              isHunting: mode === 'hunt' || isTrainingAtDummy,
              lastHuntId: mode === 'hunt' ? (game.encounter.hunt?.id || 'cyclops-camp') : undefined,
            }),
          });

          if (altRes.status === 409) {
            const conflictJson = (await altRes.json()) as any;
            if (typeof conflictJson?.currentVersion === 'number') {
              characterSaveVersionsRef.current.set(alt.id, conflictJson.currentVersion);
            }
          } else if (altRes.ok) {
            const altJson = (await altRes.json()) as any;
            if (typeof altJson?.data?.saveVersion === 'number') {
              characterSaveVersionsRef.current.set(alt.id, altJson.data.saveVersion);
            }
          }
        } catch {
          // Alt save error handled
        }
      }
      return true;
    } catch (err: any) {
      clientErrorLogger.warn('SAVE_PROGRESS', `Falha no salvamento: ${err?.message || err}`);
      return false;
    } finally {
      isSavingRef.current = false;
    }
  }, []);

  saveProgressRef.current = saveProgress;

  // Periodic & On-Unload Auto-Save of active character progress, inventory, gold, and position to Database
  // Stabilized lifecycle: depends ONLY on onlineCharacter?.id, NEVER re-running on movement or volatile state updates
  useEffect(() => {
    if (!onlineCharacter) return;

    const timer = setInterval(() => {
      void saveProgress();
    }, 30000);

    const handleUnload = () => {
      // Tentativa adicional de salvamento no fechamento da aba.
      // Conforme documentação da MDN (sendBeacon / fetch keepalive), eventos beforeunload/pagehide
      // não garantem término da requisição e podem ser cancelados ou não disparados pelo navegador.
      // A garantia autoritativa de persistência é estritamente o último salvamento confirmado.
      void saveProgress(false, true);
    };
    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);

    return () => {
      clearInterval(timer);
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
      // NOTE: NEVER trigger saveProgress() on component re-render/cleanup!
    };
  }, [onlineCharacter?.id, saveProgress]);

  const activeActor = game.encounter.partyActors.find((a) => a.characterId === activeCharacter.id);
  const hasteBonus = (activeActor?.hasteUntil ?? 0) > game.encounter.elapsedMs ? 50 : 0;
  const mountBonus = activeCharacter.mountActive && activeCharacter.mount && activeCharacter.mount !== 'none' ? 20 : 0;
  const playerSpeed = calculatePlayerSpeed(activeCharacter.level) + mountBonus + hasteBonus;
  const baseStepDurationMs = calculateStepDurationMs(playerSpeed);
  // +100 points of speed for players when in the city
  const citySpeedBonus = 100;
  // Phase 164: Fixed city speed of 500 in Thais (formerly: const cityPlayerSpeed = playerSpeed + citySpeedBonus;)
  const cityPlayerSpeed = THAIS_CITY_FIXED_SPEED;
  const cityStepDurationMs = calculateStepDurationMs(cityPlayerSpeed);
  const heldDirectionRef = useRef<{ dx: number; dy: number } | null>(null);
  const lastStepTimeRef = useRef(0);

  const handleSendChatMessage = useCallback((text: string, channel: 'local' | 'world' | 'whisper', recipientName?: string) => {
    const rawTrimmed = text.trim();
    if (!rawTrimmed) return;

    if (channel === 'whisper' && recipientName) {
      const targetRecipient = recipientName.trim();
      if (!gameNetwork.IsConnected) {
        const msgId = `chat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const whisperMsg: ChatMessageItem = {
          id: msgId,
          senderName: activeCharacter.name,
          senderTitle: (activeCharacter as any).adminTitle,
          recipientName: targetRecipient,
          channel: 'whisper',
          text: rawTrimmed,
          timestamp: Date.now(),
        };
        setChatMessages((prev) => [...prev.slice(-99), whisperMsg]);
        setSaleMessage(`Mensagem privada enviada para ${targetRecipient}.`);
        return;
      } else {
        gameNetwork.sendChat(`*${targetRecipient}* ${rawTrimmed}`, 'local');
        return;
      }
    }

    if (!gameNetwork.IsConnected) {
      const msgId = `chat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const starMatch = rawTrimmed.match(/^\*([^*]+)\*\s*(.*)$/);
      const slashMatch = rawTrimmed.match(/^\/(?:w|whisper|tell|msg)\s+([^\s]+)\s*(.*)$/i);

      if (starMatch || slashMatch) {
        const targetRecipient = (starMatch ? starMatch[1] : slashMatch![1]).trim();
        const whisperContent = (starMatch ? starMatch[2] : slashMatch![2]).trim();

        if (!whisperContent) return;

        const whisperMsg: ChatMessageItem = {
          id: msgId,
          senderName: activeCharacter.name,
          senderTitle: (activeCharacter as any).adminTitle,
          recipientName: targetRecipient,
          channel: 'whisper',
          text: whisperContent,
          timestamp: Date.now(),
        };
        setChatMessages((prev) => [...prev.slice(-99), whisperMsg]);
        setSaleMessage(`Mensagem privada enviada para ${targetRecipient}.`);
        return;
      }

      const newMsg: ChatMessageItem = {
        id: msgId,
        senderName: activeCharacter.name,
        senderTitle: (activeCharacter as any).adminTitle,
        channel,
        text: rawTrimmed,
        timestamp: Date.now(),
      };

      setChatMessages((prev) => [...prev.slice(-99), newMsg]);
      if (mode !== 'hunt') {
        setOverheadMessages((prev) => [
          ...prev.slice(-20),
          {
            id: msgId,
            senderId: activeCharacter.id,
            senderName: activeCharacter.name,
            text: rawTrimmed,
            channel: channel === 'world' ? 'world' : 'local',
            timestamp: Date.now(),
          },
        ]);
      }
    } else {
      gameNetwork.sendChat(rawTrimmed, channel);
    }
  }, [activeCharacter.name, activeCharacter.id, mode]);

  const handleOpenOutfitModal = useCallback((characterId?: string) => {
    gameModal.openOutfit(characterId || activeCharacter.id);
    setCharContextMenu(null);
  }, [activeCharacter.id, gameModal]);

  const handleSaveOutfit = useCallback((characterId: string, customization: {
    outfit: string;
    mount: string;
    mountActive: boolean;
    addons: number;
    outfitColors?: { head: number; primary: number; secondary: number; detail: number };
  }) => {
    console.log('[GamePrototype handleSaveOutfit]', { characterId, customization });
    setGame((cur) => ({
      ...cur,
      session: {
        ...cur.session,
        characters: cur.session.characters.map((char) =>
          char.id === characterId
            ? {
                ...char,
                outfit: customization.outfit,
                mount: customization.mount,
                mountActive: customization.mountActive,
                addons: customization.addons,
                outfitColors: customization.outfitColors,
              }
            : char
        ),
      },
    }));

    setOnlineCharacter((prev) => {
      if (!prev || prev.id !== characterId) return prev;
      return {
        ...prev,
        outfit: customization.outfit,
        mount: customization.mount,
        mountActive: customization.mountActive,
        addons: customization.addons,
        outfitAddons: customization.addons,
        outfitColors: customization.outfitColors,
      } as any;
    });

    // Synchronously update latestSaveStateRef so background auto-save or immediate save never stomps with stale state
    if (latestSaveStateRef.current.characters) {
      latestSaveStateRef.current.characters = latestSaveStateRef.current.characters.map((char) =>
        char.id === characterId
          ? {
              ...char,
              outfit: customization.outfit,
              mount: customization.mount,
              mountActive: customization.mountActive,
              addons: customization.addons,
              outfitAddons: customization.addons,
              outfitColors: customization.outfitColors,
            }
          : char
      );
    }
    if (latestSaveStateRef.current.activeCharacter && latestSaveStateRef.current.activeCharacter.id === characterId) {
      latestSaveStateRef.current.activeCharacter = {
        ...latestSaveStateRef.current.activeCharacter,
        outfit: customization.outfit,
        mount: customization.mount,
        mountActive: customization.mountActive,
        addons: customization.addons,
        outfitAddons: customization.addons,
        outfitColors: customization.outfitColors,
      } as any;
    }
    if (latestSaveStateRef.current.onlineCharacter && latestSaveStateRef.current.onlineCharacter.id === characterId) {
      latestSaveStateRef.current.onlineCharacter = {
        ...latestSaveStateRef.current.onlineCharacter,
        outfit: customization.outfit,
        mount: customization.mount,
        mountActive: customization.mountActive,
        addons: customization.addons,
        outfitAddons: customization.addons,
        outfitColors: customization.outfitColors,
      } as any;
    }

    outfitSaveActiveRef.current = true;
    const saveAttempt = outfitDiagnostics.getLastSaveAttempt() || outfitDiagnostics.getCurrentAttempt();
    outfitSaveAttemptIdRef.current = saveAttempt?.attemptId || null;
    outfitDiagnostics.recordSaveCallback(customization, outfitSaveAttemptIdRef.current || undefined);
    outfitDiagnostics.recordNetworkDispatch(outfitSaveAttemptIdRef.current || undefined);

    // Broadcast outfit change to live Colyseus server so all remote players update instantly
    gameNetwork.sendChangeOutfit(customization);

    // Persist permanently to database with unified authoritative state
    if (saveProgressRef.current) {
      saveProgressRef.current(false, true).catch(() => {});
    }
  }, []);

  const handleToggleMount = useCallback((characterId: string) => {
    setGame((cur) => {
      const target = cur.session.characters.find((c) => c.id === characterId) || cur.session.characters[0];
      if (!target) return cur;

      if (!target.mount || target.mount === 'none') {
        target.mount = 'donkey';
      }

      const effectiveMount = target.mount || 'donkey';
      const nextMountActive = !target.mountActive;
      const targetOutfitKey = target.outfit || target.vocation || 'Knight';
      const targetGender = target.gender || 'male';
      const targetColors = target.outfitColors;
      const targetAddons = (target as any).addons || (target as any).outfitAddons || 0;

      // Synchronously update latestSaveStateRef
      if (latestSaveStateRef.current.characters) {
        latestSaveStateRef.current.characters = latestSaveStateRef.current.characters.map((char) =>
          char.id === target.id
            ? {
                ...char,
                mount: effectiveMount,
                mountActive: nextMountActive,
              }
            : char
        );
      }
      if (latestSaveStateRef.current.activeCharacter && latestSaveStateRef.current.activeCharacter.id === target.id) {
        latestSaveStateRef.current.activeCharacter = {
          ...latestSaveStateRef.current.activeCharacter,
          mount: effectiveMount,
          mountActive: nextMountActive,
        } as any;
      }
      if (latestSaveStateRef.current.onlineCharacter && latestSaveStateRef.current.onlineCharacter.id === target.id) {
        latestSaveStateRef.current.onlineCharacter = {
          ...latestSaveStateRef.current.onlineCharacter,
          mount: effectiveMount,
          mountActive: nextMountActive,
        } as any;
      }

      // Preload both states to guarantee instant visual transition
      const targetDir = ((target as any).direction as any) || 'south';
      preloadOutfitAllFrames(
        targetOutfitKey,
        targetGender,
        targetColors,
        targetAddons,
        effectiveMount,
        false,
        targetDir
      ).catch(() => {});
      preloadOutfitAllFrames(
        targetOutfitKey,
        targetGender,
        targetColors,
        targetAddons,
        effectiveMount,
        true,
        targetDir
      ).catch(() => {});

      gameNetwork.sendChangeOutfit({ mount: effectiveMount });
      gameNetwork.sendChangeOutfit({ mountActive: nextMountActive });

      outfitSaveActiveRef.current = true;
      if (saveProgressRef.current) {
        saveProgressRef.current(false, true).catch(() => {});
      }

      setSaleMessage(nextMountActive ? '🐎 Você montou na sua montaria!' : '🚶 Você desmontou da montaria.');

      return {
        ...cur,
        session: {
          ...cur.session,
          characters: cur.session.characters.map((char) =>
            char.id === target.id ? { ...char, mount: effectiveMount, mountActive: nextMountActive } : char
          ),
        },
      };
    });
  }, []);

  const handleTileClick = useCallback((target: { x: number; y: number; z: number }) => {
    if (mode === 'hunt') return;
    if (isFollowingLeader) {
      setSaleMessage('Você está seguindo o líder da party. Para andar manualmente, saia da party.');
      return;
    }
    setIsTrainingAtDummy(false);
    const activeTileMap = cityPos.z === 6 ? thaisTileMapZ6 : thaisTileMapZ7;
    const path = findCityPath(activeTileMap, cityPos, target);
    if (path.length > 0) {
      setWalkingPath({
        waypoints: path,
        destinationName: `Tile (${target.x}, ${target.y})`,
        currentIndex: 0,
      });
    }
  }, [cityPos, mode, isFollowingLeader, thaisTileMapZ6, thaisTileMapZ7]);

  useEffect(() => {
    const levelUpEvents = encounter.events.filter((e) => e.type === 'level-up');
    const latestLevelUp = levelUpEvents.at(-1);
    if (latestLevelUp && 'message' in latestLevelUp && latestLevelUp.message) {
      setLevelUpMessage({ text: latestLevelUp.message, timestamp: Date.now() });
      progressionDiagnostics.recordLevelUp(
        (latestLevelUp as any).previousLevel ?? 1,
        (latestLevelUp as any).level ?? 1,
        Number(activeCharacter?.experience || 0)
      );
    }
  }, [encounter.events]);

  // Continuously synchronize active character progress (experience & level) with Colyseus
  const lastSyncedExpRef = useRef<number>(-1);
  useEffect(() => {
    if (!activeCharacter?.id) return;
    const curExp = Number(activeCharacter.experience || 0);
    if (curExp !== lastSyncedExpRef.current && curExp > 0) {
      lastSyncedExpRef.current = curExp;
      gameNetwork.sendSyncProgress(curExp, activeCharacter.level || 1);
    }
  }, [activeCharacter?.id, activeCharacter?.experience, activeCharacter?.level]);

  // Listen to Colyseus server bestiary events
  useEffect(() => {
    const unsubSync = gameNetwork.onBestiarySync((data) => {
      if (data.kills) {
        setBestiaryKills((prev) => {
          const next = { ...prev, ...data.kills };
          if (activeCharacter) (activeCharacter as any).bestiaryKills = next;
          return next;
        });
      }
      if (data.trackedMonsterId) setTrackedBestiaryMonsterId(data.trackedMonsterId);
      if (typeof data.bossPoints === 'number') setBossPoints(data.bossPoints);
    });
    const unsubFirstKill = gameNetwork.onBestiaryFirstKill((data) => {
      setFirstKillToast(`Você começou o bestiário deste monstro: ${data.monsterName}!`);
      setTrackedBestiaryMonsterId(data.monsterId);
      setBestiaryKills((prev) => {
        const next = { ...prev, [data.monsterId]: data.kills };
        if (activeCharacter) (activeCharacter as any).bestiaryKills = next;
        return next;
      });
    });
    const unsubKillUpdate = gameNetwork.onBestiaryKillUpdate((data) => {
      setBestiaryKills((prev) => {
        const next = { ...prev, [data.monsterId]: data.kills };
        if (activeCharacter) (activeCharacter as any).bestiaryKills = next;
        return next;
      });
    });
    return () => {
      unsubSync();
      unsubFirstKill();
      unsubKillUpdate();
    };
  }, [activeCharacter?.id]);

  // Phase 143: Keep bestiary kills, tracked monster and boss points strictly synchronized with active character
  useEffect(() => {
    if (!activeCharacter) return;
    const charAny = activeCharacter as any;
    let kills: Record<string, number> = {};
    if (charAny.bestiaryKills && typeof charAny.bestiaryKills === 'object') {
      kills = charAny.bestiaryKills;
    } else if (charAny.bestiaryKillsJson) {
      try {
        kills = typeof charAny.bestiaryKillsJson === 'string'
          ? JSON.parse(charAny.bestiaryKillsJson)
          : charAny.bestiaryKillsJson;
      } catch {}
    }
    setBestiaryKills(kills);
    setTrackedBestiaryMonsterId(charAny.trackedBestiaryId || '');
    setBossPoints(typeof charAny.bossPoints === 'number' ? charAny.bossPoints : 0);
  }, [activeCharacter.id]);

  // Listen to Idle encounter events for bestiary progression
  useEffect(() => {
    const firstKillEvent = encounter.events.find((e: any) => e.type === 'bestiary-first-kill');
    if (firstKillEvent && 'monsterName' in firstKillEvent) {
      const mName = (firstKillEvent as any).monsterName;
      const mId = (firstKillEvent as any).monsterId;
      setFirstKillToast(`Você começou o bestiário deste monstro: ${mName}!`);
      if (!trackedBestiaryMonsterId) {
        setTrackedBestiaryMonsterId(mId);
      }
    }
    if (activeCharacter && (activeCharacter as any).bestiaryKills) {
      const charKills = (activeCharacter as any).bestiaryKills;
      setBestiaryKills((prev) => {
        let changed = false;
        const merged = { ...prev };
        for (const [k, v] of Object.entries(charKills)) {
          if (typeof v === 'number' && (!merged[k] || merged[k] < v)) {
            merged[k] = v;
            changed = true;
          }
        }
        if (changed) {
          gameNetwork.sendBestiarySetKills(merged);
        }
        return changed ? merged : prev;
      });
    }
  }, [encounter.events, trackedBestiaryMonsterId, activeCharacter]);

  // Phase 163: Proactively push bestiary kills to Colyseus server whenever bestiaryKills state advances
  const prevSyncedBestiaryKillsRef = useRef<string>('');
  useEffect(() => {
    if (!bestiaryKills || Object.keys(bestiaryKills).length === 0) return;
    const serialized = JSON.stringify(bestiaryKills);
    if (prevSyncedBestiaryKillsRef.current !== serialized) {
      prevSyncedBestiaryKillsRef.current = serialized;
      gameNetwork.sendBestiarySetKills(bestiaryKills);
    }
  }, [bestiaryKills]);

  const handleTrackMonster = useCallback((monsterId: string) => {
    const nextId = trackedBestiaryMonsterId === monsterId ? '' : monsterId;
    setTrackedBestiaryMonsterId(nextId);
    if (nextId) setIsBestiaryTrackerVisible(true);
    gameNetwork.sendBestiaryTrack(nextId);
  }, [trackedBestiaryMonsterId]);

  // Phase 160: Lista de monstros rastreados no Bestiário (inclui todos os bichos da hunt ativa + monstro fixado)
  const trackedMonstersList = useMemo(() => {
    const list: BestiaryMonster[] = [];
    const idsToInclude = new Set<string>();

    // 1. Se estiver caçando, inclui todas as espécies daquela hunt ativa
    if (mode === 'hunt' && encounter.hunt?.monsters && Array.isArray(encounter.hunt.monsters)) {
      for (const mId of encounter.hunt.monsters) {
        if (mId) idsToInclude.add(mId.toLowerCase());
      }
    }

    // 2. Inclui qualquer criatura fixada manualmente pelo jogador
    if (trackedBestiaryMonsterId) {
      idsToInclude.add(trackedBestiaryMonsterId.toLowerCase());
    }

    // 3. Resolve os monstros do catálogo canônico
    for (const mId of idsToInclude) {
      const found = CANONICAL_BESTIARY_MONSTERS.find(
        (m) => m.id.toLowerCase() === mId || m.name.toLowerCase() === mId
      );
      if (found) {
        list.push(found);
      }
    }

    return list;
  }, [mode, encounter.hunt, trackedBestiaryMonsterId]);

  useEffect(() => {
    if (mode === 'hunt') {
      setIsBestiaryTrackerVisible(true);
    }
  }, [mode]);

  useEffect(() => {
    if (!levelUpMessage) return;
    const timer = window.setTimeout(() => setLevelUpMessage(null), 4500);
    return () => window.clearTimeout(timer);
  }, [levelUpMessage]);

  const lastCombatTimeRef = useRef(performance.now());
  const tickCombat = useCallback(() => {
    // Phase 107 & 182: Prevent monsters from moving, attacking, or dealing damage during loading screen or before arena is visible
    if (initialLoadingActive || Boolean(transitionLoading?.active) || !isArenaReady) {
      lastCombatTimeRef.current = performance.now();
      return;
    }
    if (mode !== 'hunt' || encounter.status !== 'running') {
      lastCombatTimeRef.current = performance.now();
      return;
    }
    // Phase 182.2 Dual Gate: Combat only advances when connected AND authoritative hunt context is confirmed
    if (!gameNetwork.IsConnected || !gameNetwork.IsHuntContextConfirmed) {
      lastCombatTimeRef.current = performance.now(); // Reset timestamp during pauses to prevent any retrospective burst compensation
      return;
    }
    if (!combatStartedRef.current) {
      combatStartedRef.current = true;
      console.log('[COMBAT] Combate iniciado com cenário pronto e visível:', performance.now());
    }
    const now = performance.now();
    const delta = Math.min(now - lastCombatTimeRef.current, 500);
    lastCombatTimeRef.current = now;
    setGame((current) => {
      const next = advanceCombat(current, content, delta > 0 ? Math.round(delta) : 120);

      // ARENA PVP: CONSUMO AUTOMÁTICO DE POÇÕES E DETECÇÃO DE VITÓRIA / DERROTA
      if (next.encounter.hunt?.id === 'pvp-arena' && activePvPDuelRef.current) {
        const duel = activePvPDuelRef.current;
        const playerChar = next.session.characters.find((c) => c.id === next.session.selectedCharacterId);
        const oppEnemy = next.encounter.enemies.find((e) => e.id.startsWith('pvp_opp_'));

        if (playerChar && oppEnemy) {
          // Potion de Vida do Jogador (HP < 60%)
          if (playerChar.currentHp < playerChar.maxHp * 0.6 && duel.playerHpPotions > 0) {
            duel.playerHpPotions -= 1;
            playerChar.currentHp = Math.min(playerChar.maxHp, playerChar.currentHp + 200);
            next.encounter.events.push({
              type: 'spell-cast',
              sourceId: playerChar.id,
              targetId: playerChar.id,
              speech: 'Aaaah...',
              spellId: 'health-potion',
            } as any);
          }

          // Potion de Mana do Jogador (MP < 40%)
          if (playerChar.currentMana < playerChar.maxMana * 0.4 && duel.playerMpPotions > 0) {
            duel.playerMpPotions -= 1;
            playerChar.currentMana = Math.min(playerChar.maxMana, playerChar.currentMana + 150);
            next.encounter.events.push({
              type: 'spell-cast',
              sourceId: playerChar.id,
              targetId: playerChar.id,
              speech: 'Aaaah...',
              spellId: 'mana-potion',
            } as any);
          }

          // Potion de Vida do Oponente (HP < 60%)
          if (oppEnemy.hp < oppEnemy.maxHp * 0.6 && duel.oppHpPotions > 0) {
            duel.oppHpPotions -= 1;
            oppEnemy.hp = Math.min(oppEnemy.maxHp, oppEnemy.hp + 200);
            next.encounter.events.push({
              type: 'spell-cast',
              sourceId: oppEnemy.id,
              targetId: oppEnemy.id,
              speech: 'Aaaah...',
              spellId: 'health-potion',
            } as any);
          }

          // Verificação de Encerramento do Duelo
          if (!duel.finished) {
            if (!oppEnemy.alive || oppEnemy.hp <= 0) {
              duel.finished = true;
              gameNetwork.sendPvPDuelComplete(duel.duelId, playerChar.id, duel.opponent.characterId);
              setPvPBannerResult({
                type: 'win',
                pointsDelta: 20,
                coinsDelta: 15,
                opponentName: duel.opponent.name,
              });
              setTimeout(() => {
                activePvPDuelRef.current = null;
                void exitHuntRef.current?.();
              }, 3500);
            } else if (playerChar.currentHp <= 0) {
              duel.finished = true;
              gameNetwork.sendPvPDuelComplete(duel.duelId, duel.opponent.characterId, playerChar.id);
              setPvPBannerResult({
                type: 'loss',
                pointsDelta: 0,
                coinsDelta: 5,
                opponentName: duel.opponent.name,
              });
              setTimeout(() => {
                activePvPDuelRef.current = null;
                void exitHuntRef.current?.();
              }, 3500);
            }
          }
        }
      }

      return next;
    });
  }, [mode, encounter.status, content, initialLoadingActive, transitionLoading?.active, isArenaReady, gameNetwork.IsConnected, gameNetwork.IsHuntContextConfirmed]);

  useGameTicker(tickCombat, 120, mode === 'hunt' && encounter.status === 'running' && isArenaReady && !initialLoadingActive && !transitionLoading?.active && gameNetwork.IsConnected && gameNetwork.IsHuntContextConfirmed);

  const lastCityAutoSpellsTimeRef = useRef(performance.now());
  const tickCityAutoSpells = useCallback(() => {
    // Phase 107: Prevent city auto spells from firing during loading screen
    if (initialLoadingActive || Boolean(transitionLoading?.active)) return;
    if (mode === 'hunt') return;
    const now = performance.now();
    const delta = Math.min(now - lastCityAutoSpellsTimeRef.current, 500);
    lastCityAutoSpellsTimeRef.current = now;
    setGame((current) => advanceCityAutoSpells(current, content, delta > 0 ? Math.round(delta) : 150));
  }, [mode, content, initialLoadingActive, transitionLoading?.active]);

  useGameTicker(tickCityAutoSpells, 150, mode !== 'hunt');

  // When defeated in hunt or dead, open authentic "You are dead" modal
  useEffect(() => {
    if (mode === 'hunt' && encounter.status === 'defeated') {
      if (encounter.hunt?.id === 'pvp-arena') return; // Duelo esportivo na Arena não ativa tela de morte
      const deathEvt = encounter.events?.find((e: any) => e.type === 'player-death');
      const killer = (deathEvt as any)?.killerName || encounter.enemies?.find((e) => e.alive)?.name || encounter.enemies?.[0]?.name || encounter.hunt?.name || 'Monstro';
      setLastKillerName(killer);
      playPlayerDeath();
      setIsDeathModalOpen(true);
      setOverheadMessages((prev) => [
        ...prev,
        {
          id: `dead-${Date.now()}`,
          senderName: activeCharacter.name,
          text: 'You are dead.',
          channel: 'local',
          timestamp: Date.now(),
        },
      ]);
    }
  }, [mode, encounter.status, encounter.events, encounter.enemies, encounter.hunt, activeCharacter.name]);

  const deathPenaltyReport = useMemo(() => {
    if (!isDeathModalOpen || !activeCharacter) return undefined;
    const cfg = serverConfigManager.getConfig();
    return calculateDeathPenaltyReport(
      activeCharacter,
      game.session.loot || [],
      {
        expLossPercent: cfg.deathPenaltyExpPercent ?? 10,
        skillLossPercent: cfg.deathPenaltySkillPercent ?? 10,
        loseLoot: cfg.deathPenaltyLoseLoot ?? true,
        killerName: lastKillerName,
        content,
      }
    );
  }, [isDeathModalOpen, activeCharacter, game.session.loot, lastKillerName, content]);

  const handleConfirmDeath = useCallback(() => {
    setIsDeathModalOpen(false);
    const cfg = serverConfigManager.getConfig();
    setGame((current) => {
      const respawned = respawnInTemple(
        current,
        {
          expLossPercent: cfg.deathPenaltyExpPercent ?? 10,
          skillLossPercent: cfg.deathPenaltySkillPercent ?? 10,
          loseLoot: cfg.deathPenaltyLoseLoot ?? true,
        },
        content
      );
      const allRespawned = respawned.session.characters.map((c: CharacterState) => ({
        ...c,
        currentHp: c.maxHp,
        currentMana: c.maxMana,
        combatState: { targetId: null, spellCooldowns: {}, groupCooldowns: {} },
      }));
      return {
        ...respawned,
        session: {
          ...respawned.session,
          characters: allRespawned,
        },
      };
    });
    setMode('training');
    setIsTrainingAtDummy(false);
    setCityPos(THAIS_TEMPLE_POSITION);

    // Phase 103/109/113: Stop hunt BGM and start Thais BGM immediately during death loading screen!
    stopDragonLairBgm();
    playCityBgm();

    // Phase 113: Trigger 10-second Thais cinematic loading screen when character dies
    setTransitionLoading({
      active: true,
      message: 'Renasceu no Templo de Thais...',
      durationMs: 10000,
      huntId: undefined,
    });

    void (async () => {
      const saveOk = await saveProgressRef.current?.(true, true);
      if (saveOk) {
        gameNetwork.sendTeleport(THAIS_TEMPLE_POSITION.x, THAIS_TEMPLE_POSITION.y, THAIS_TEMPLE_POSITION.z);
        gameNetwork.sendReturnToCity();
      }
    })();
    setWalkingPath({
      waypoints: [
        { x: 32368, y: 32215, z: 7 },
        { x: 32345, y: 32215, z: 7 },
        { x: 32345, y: 32224, z: 7 },
      ],
      destinationName: 'Depot de Thais',
      currentIndex: 0,
      onArrive: () => {
        setSaleMessage('Chegou no Depot de Thais.');
      },
    });
    setSaleMessage('Você morreu e renasceu no Templo de Thais com as penalidades aplicadas.');
  }, [content]);

  // Advance training at dummy using selected skill with Web Worker ticker
  const tickTraining = useCallback(() => {
    if (mode !== 'training' || !isTrainingAtDummy) return;
    const skillKey: TrainableSkill =
      activeTrainingSkill === 'Club Fighting' ? 'club' :
      activeTrainingSkill === 'Axe Fighting' ? 'axe' :
      activeTrainingSkill === 'Distance Fighting' ? 'distance' :
      activeTrainingSkill === 'Shielding' ? 'shielding' :
      activeTrainingSkill === 'Magic Level' ? 'magicLevel' : 'sword';
    setGame((current) => {
      const nextGame = advanceTraining(current, content, 500, skillKey);

      // Keep savedPoolRef in sync with updated skills for all squad members
      if (savedPoolRef.current && savedPoolRef.current.length > 0) {
        for (const char of nextGame.session.characters) {
          const idx = savedPoolRef.current.findIndex((c) => c.id === char.id);
          if (idx >= 0) {
            savedPoolRef.current[idx] = {
              ...savedPoolRef.current[idx],
              skills: { ...char.skills },
              skillTries: { ...char.skillTries },
            };
          }
        }
      }

      const actionVisList = nextGame.encounter.visualEvents?.filter((v: any) => v.type === 'training-action') || [];
      for (const actionVis of actionVisList) {
        gameNetwork.sendTrainingAction({
          dummyPos: trainingDummyPos || undefined,
          style: (actionVis as any).style,
          effectId: (actionVis as any).effectId,
          projectileId: (actionVis as any).projectileId,
        });
      }
      return nextGame;
    });
  }, [mode, isTrainingAtDummy, activeTrainingSkill, content, trainingDummyPos]);

  useGameTicker(tickTraining, 500, mode === 'training' && isTrainingAtDummy);

  // Autonomous walking loop across coordinates in city with Web Worker ticker (runs at full speed even when minimized)
  const tickWalking = useCallback(() => {
    if (!walkingPath || walkingPath.waypoints.length === 0 || mode === 'hunt' || initialLoadingActive || Boolean(transitionLoading?.active)) return;
    const now = performance.now();
    if (now - lastStepTimeRef.current < cityStepDurationMs) return;

    const index = walkingPath.currentIndex ?? 0;
    const currentTarget = walkingPath.waypoints[index];
    if (!currentTarget) return;

    const current = cityPos;
    const dx = currentTarget.x - current.x;
    const dy = currentTarget.y - current.y;

    if (dx === 0 && dy === 0) {
      if (index < walkingPath.waypoints.length - 1) {
        setWalkingPath({
          ...walkingPath,
          currentIndex: index + 1,
        });
      } else {
        walkingPath.onArrive?.();
        setWalkingPath(null);
      }
      return;
    }

    const stepX = dx === 0 ? 0 : dx > 0 ? 1 : -1;
    const stepY = dy === 0 ? 0 : dy > 0 ? 1 : -1;
    const dir = stepY < 0 ? 'north' : stepY > 0 ? 'south' : stepX < 0 ? 'west' : 'east';

    lastStepTimeRef.current = now;

    setCityPos((pos) => {
      const stairTarget = resolveStairsTransition(pos, stepX, stepY);
      if (stairTarget) {
        gameNetwork.sendMove(dir, { x: stairTarget.x, y: stairTarget.y, z: stairTarget.z });
        return stairTarget;
      }

      const nextX = pos.x + stepX;
      const nextY = pos.y + stepY;
      const activeTileMap = pos.z === 6 ? thaisTileMapZ6 : thaisTileMapZ7;
      const tile = activeTileMap.get(`${nextX},${nextY}`);
      if (!tile || !tile.walkable) {
        setWalkingPath(null);
        return pos;
      }

      gameNetwork.sendMove(dir, { x: nextX, y: nextY, z: pos.z });

      const isAtTarget = nextX === currentTarget.x && nextY === currentTarget.y;
      if (isAtTarget) {
        if (index < walkingPath.waypoints.length - 1) {
          setWalkingPath({
            ...walkingPath,
            currentIndex: index + 1,
          });
        } else {
          walkingPath.onArrive?.();
          setWalkingPath(null);
        }
      }
      return { x: nextX, y: nextY, z: isAtTarget ? currentTarget.z : pos.z };
    });
  }, [walkingPath, mode, cityStepDurationMs, cityPos, thaisTileMapZ6, thaisTileMapZ7]);

  useGameTicker(tickWalking, 16, Boolean(walkingPath && walkingPath.waypoints.length > 0 && mode !== 'hunt'));

  useEffect(() => {
    if (!statsDelta) return;
    const timer = window.setTimeout(() => setStatsDelta(null), 1800);
    return () => window.clearTimeout(timer);
  }, [statsDelta]);

  const applyEquipmentTransfer = useCallback((source: EquipmentTransferSource, target: EquipmentTransferTarget) => {
    setGame((current) => {
      const beforeCharacter = selectedCharacterOf(current);
      const before = deriveStats(beforeCharacter, content.equipment, vocationFor(content, beforeCharacter.vocation));
      const itemId = source.kind === 'inventory' ? source.itemId : beforeCharacter.equipment[source.slot];
      const item = findEquipment(content.equipment, itemId);
      const result = transferOwnedEquipment(current, source, target, content);
      if (!result.ok) { setEquipmentMessage(`Ação recusada: ${result.error ?? 'slot incompatível.'}`); return current; }
      const afterCharacter = selectedCharacterOf(result.state);
      const after = deriveStats(afterCharacter, content.equipment, vocationFor(content, afterCharacter.vocation));
      setStatsDelta({ attack: { from: before.attack, to: after.attack }, defense: { from: before.defense, to: after.defense }, armor: { from: before.armor, to: after.armor } });
      setEquipmentMessage(`${item?.name ?? 'Item'}: loadout atualizado.`);
      return result.state;
    });
  }, []);

  const beginPointerEquipmentDrag = useCallback((source: EquipmentTransferSource, event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    const itemId = source.kind === 'inventory' ? source.itemId : activeCharacter.equipment[source.slot];
    const item = findEquipment(content.equipment, itemId); if (!item) return;
    const start = { x: event.clientX, y: event.clientY }; let moved = false;
    const cleanup = () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); setPointerDrag(null); };
    const onMove = (pointerEvent: PointerEvent) => { if (!moved && Math.hypot(pointerEvent.clientX - start.x, pointerEvent.clientY - start.y) < 6) return; moved = true; setPointerDrag({ itemId: item.id, label: item.name, x: pointerEvent.clientX, y: pointerEvent.clientY }); };
    const onUp = (pointerEvent: PointerEvent) => { const didMove = moved; cleanup(); if (!didMove) return; const drop = document.elementFromPoint(pointerEvent.clientX, pointerEvent.clientY)?.closest<HTMLElement>('[data-equipment-drop]'); if (drop?.dataset.equipmentDrop === 'inventory-index') applyEquipmentTransfer(source, { kind: 'inventory-index', index: Number(drop.dataset.inventoryIndex) }); else if (drop?.dataset.equipmentDrop === 'inventory') applyEquipmentTransfer(source, { kind: 'inventory' }); else if (drop?.dataset.equipmentDrop === 'slot' && drop.dataset.equipmentSlot) applyEquipmentTransfer(source, { kind: 'slot', slot: drop.dataset.equipmentSlot as CharacterEquipmentSlot }); };
    window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp);
  }, [activeCharacter.equipment, applyEquipmentTransfer]);

  const xpProgressById = useMemo(() => new Map(game.session.characters.map((character) => [character.id, experienceProgress(character.level, character.experience) * 100])), [game.session.characters]);
  const trainingMembers = game.session.characters.map((character) => {
    const skill = trainingSkillFor(character, content);
    return { character, skill, progress: skillProgress(character, skill, vocationFor(content, character.vocation)) };
  });
  const selectedSkillProgress = Object.fromEntries((['fist', 'club', 'sword', 'axe', 'distance', 'shielding', 'magicLevel'] as TrainableSkill[]).map((skill) => [skill, skillProgress(activeCharacter, skill, vocationFor(content, activeCharacter.vocation))])) as Record<TrainableSkill, number>;
  const inventoryEquipment = availableOwnedEquipmentIds(game).flatMap((itemId) => { const item = findEquipment(content.equipment, itemId); return item ? [item] : []; });
  const elapsedMs = mode === 'hunt' ? encounter.elapsedMs : game.session.trainingElapsedMs;
  const totalLoot = game.session.loot.reduce((total, stack) => total + stack.amount, 0);
  const metrics = calculateSessionRates({ kills: encounter.corpses.length, damageDealt: 0, damageTaken: 0 }, { elapsedMs, xpGained: leader.experience, lootGained: totalLoot, roomsReached: encounter.room.number });

  const startSelectedHunt = (huntId: string, pullSize?: HuntPullSize) => {
    const targetHunt = content.hunts.find((h) => h.id === huntId) ?? encounter.hunt;
    setHuntSelectorOpen(false);
    setIsTrainingAtDummy(false);
    setWalkingPath(null);

    // Phase 203: Notify server/Colyseus immediately that player has entered this hunt
    gameNetwork.sendSetInHunt(true, huntId);

    // Phase 109: Start Dragon Lair music immediately during loading screen if entering dragon-lair!
    if (huntId === 'dragon-lair') {
      pauseCityBgm();
      playDragonLairBgm();
    } else {
      stopDragonLairBgm();
      playHuntBgm(huntId);
    }

    // Phase 102: Save progress and trigger 10-second Exura loading screen
    void saveProgressRef.current?.();
    setTransitionLoading({
      active: true,
      message: `Viajando para ${targetHunt.name}...`,
      durationMs: 10000,
      huntId,
    });

    const beforePos = { ...cityPos };
    const entrance = getHuntWorldEntrance(huntId, content);
    const region = content.huntRegions.find((r) => r.huntId === targetHunt.id);

    console.log(`[HUNT] selectedHunt: ${huntId} (pullSize: ${pullSize ?? 'default'})`);
    console.log(`[HUNT] mapId: ${region?.huntId ?? huntId}`);
    console.log(`[HUNT] configured entrance: (${region?.sourceCenter.x ?? 32369}, ${region?.sourceCenter.y ?? 32241}, ${region?.sourceCenter.z ?? 7})`);
    console.log(`[HUNT] map bounds: x:${entrance.bounds.x} y:${entrance.bounds.y} w:${entrance.bounds.width} h:${entrance.bounds.height} z:${entrance.bounds.z}`);
    console.log(`[HUNT] converted/local entrance: (${entrance.localPosition.x}, ${entrance.localPosition.y}, ${entrance.localPosition.z})`);
    console.log(`[HUNT] isTileInsideMap: ${entrance.isInsideMap}`);
    console.log(`[HUNT] isWalkable: ${entrance.isWalkable}`);
    console.log(`[HUNT] finalSpawn: (${entrance.worldPosition.x}, ${entrance.worldPosition.y}, ${entrance.worldPosition.z})`);
    console.log(`[HUNT] player position before: (${beforePos.x}, ${beforePos.y}, ${beforePos.z})`);
    console.log(`[HUNT] player position after: (${entrance.worldPosition.x}, ${entrance.worldPosition.y}, ${entrance.worldPosition.z})`);

    const nextSeed = seed.trim() || defaultSeed;

    // Phase 215: Dispara pré-carregamento imediato dos dados da hunt (atlas, monstros, combate)
    void huntAssetPreloader.preloadHunt(huntId);

    // Instancia a hunt imediatamente no engine sob a proteção da tela de carregamento
    setGame((current) => {
      return restartHunt(prepareHuntCharacters(current), nextSeed, content, huntId, pullSize ?? 'cauteloso');
    });
    setMode('hunt');
    setIsArenaReady(false);
    combatStartedRef.current = false;
    setCityPos(entrance.worldPosition);

    // Salva metadados da transição para finalização autoritativa de rede após loading
    pendingHuntTransitionRef.current = {
      huntId,
      targetHunt,
      nextSeed,
      entrance,
      pullSize: pullSize ?? 'cauteloso',
    };
  };
  startSelectedHuntRef.current = startSelectedHunt;

  const handleStartPvPDuel = useCallback((matchEvent: PvPMatchFoundEvent) => {
    setIsPvPArenaModalOpen(false);
    setIsTrainingAtDummy(false);
    setWalkingPath(null);

    stopDragonLairBgm();
    playHuntBgm('pvp-arena');

    setTransitionLoading({
      active: true,
      message: `⚔️ Duelo encontrado! Teleportando para a Arena PvP contra ${matchEvent.opponent.name}...`,
      durationMs: 3000,
      huntId: 'pvp-arena',
    });

    const targetHunt = content.hunts.find((h) => h.id === 'pvp-arena') ?? initialHunts.find((h) => h.id === 'pvp-arena')!;
    const localSpawn = {
      x: matchEvent.spawn.x - 33116,
      y: matchEvent.spawn.y - 32949,
      z: matchEvent.spawn.z,
    };
    const localOpponentSpawn = {
      x: matchEvent.opponentSpawn.x - 33116,
      y: matchEvent.opponentSpawn.y - 32949,
      z: matchEvent.opponentSpawn.z,
    };

    if (mode === 'hunt') {
      setGame((current) => leaveHunt(current));
    }
    // Phase 215: Dispara pré-carregamento imediato dos dados da arena PvP
    void huntAssetPreloader.preloadHunt('pvp-arena');

    setIsArenaReady(false);
    combatStartedRef.current = false;

    activePvPDuelRef.current = {
      duelId: matchEvent.duelId,
      opponent: matchEvent.opponent,
      playerHpPotions: 100,
      playerMpPotions: 100,
      oppHpPotions: 100,
      oppMpPotions: 100,
      finished: false,
    };

    setGame((current) => {
      const restarted = restartHunt(prepareHuntCharacters(current), `pvp_${matchEvent.duelId}`, content, 'pvp-arena', 'cauteloso');
      const opp = matchEvent.opponent;
      const oppMaxHp = opp.maxHp || Math.max(250, opp.level * 25);
      const oppEnemy: EnemyState = {
        id: `pvp_opp_${opp.characterId}`,
        monsterId: opp.outfit || opp.vocation || 'Knight',
        name: opp.name,
        hp: oppMaxHp,
        maxHp: oppMaxHp,
        attackMax: opp.attackPower || Math.max(30, Math.floor(opp.level * 3)),
        defense: opp.defensePower || Math.max(15, Math.floor(opp.level * 1.5)),
        armor: opp.armorPower || Math.max(12, Math.floor(opp.level * 1.2)),
        alive: true,
        position: { ...localOpponentSpawn },
        previousPosition: { ...localOpponentSpawn },
        direction: localOpponentSpawn.y > localSpawn.y ? 'north' : 'south',
        path: [],
        targetId: current.session.selectedCharacterId || null,
        nextAttackAt: performance.now() + 1000,
        attackIntervalMs: 1800,
        speed: 120,
        behavior: 'chase',
        nextRoamAt: 0,
        nextMoveAt: 0,
        detectionRange: 25,
        variant: null,
      };

      if (restarted.encounter.partyActors[0]) {
        restarted.encounter.partyActors[0].position = { ...localSpawn };
        restarted.encounter.partyActors[0].previousPosition = { ...localSpawn };
        restarted.encounter.partyActors[0].targetId = oppEnemy.id;
      }
      restarted.encounter.enemies = [oppEnemy];
      return restarted;
    });
    setMode('hunt');

    pendingHuntTransitionRef.current = {
      huntId: 'pvp-arena',
      targetHunt,
      nextSeed: `pvp_${matchEvent.duelId}`,
      entrance: {
        worldPosition: matchEvent.spawn,
        localPosition: localSpawn,
        bounds: { x: 33116, y: 32949, z: 8, width: 41, height: 41 },
        isInsideMap: true,
        isWalkable: true,
      },
      pvpMatch: {
        ...matchEvent,
        localSpawn,
        localOpponentSpawn,
      },
    };
  }, [content, mode]);

  const exitHunt = async () => {
    pendingHuntTransitionRef.current = null;
    followSuppressedUntilRef.current = Date.now() + 10500;
    const party = multiplayerPartyRef.current;
    if (party && party.leaderSessionId === gameNetwork.LocalPlayerId) {
      gameNetwork.sendPartyHuntExit();
    }

    // Phase 182 & 199: Final hunt save must succeed before releasing urban autosave and returning to city
    isSaveSuspendedRef.current = false;
    let saveOk = await saveProgressRef.current?.(false, true);
    if (!saveOk) {
      // In case server context is resolving version conflict or adopting lease, wait 600ms and retry
      await new Promise((r) => setTimeout(r, 600));
      isSaveSuspendedRef.current = false;
      saveOk = await saveProgressRef.current?.(false, true);
    }
    if (!saveOk) {
      // Third attempt with 1.2s delay for full propagation
      await new Promise((r) => setTimeout(r, 1200));
      isSaveSuspendedRef.current = false;
      saveOk = await saveProgressRef.current?.(false, true);
    }
    if (!saveOk) {
      // Fourth attempt with 1.5s delay to absorb any transient database lock
      await new Promise((r) => setTimeout(r, 1500));
      isSaveSuspendedRef.current = false;
      saveOk = await saveProgressRef.current?.(false, true);
    }
    if (!saveOk) {
      console.warn('[GamePrototype] Salvamento final da caçada falhou. Retorno à cidade cancelado para proteger o progresso.');
      clientErrorLogger.error('HUNT_SAVE', 'Falha ao salvar progresso antes de sair da caçada.', { characterId: activeCharacter?.id });
      setSaveErrorAlert('Falha ao salvar progresso antes de sair da caçada. Tente novamente.');
      return;
    }

    gameNetwork.sendTeleport(THAIS_TEMPLE_POSITION.x, THAIS_TEMPLE_POSITION.y, THAIS_TEMPLE_POSITION.z);
    gameNetwork.sendReturnToCity();
    gameNetwork.sendSetInHunt(false);

    // Phase 103/109/185: Stop hunt BGM and start Thais BGM immediately during transition loading screen!
    stopHuntBgm();
    stopDragonLairBgm();
    playCityBgm();

    // Phase 102/204: Responsive 2-second Exura loading screen for safe saving and smooth return
    setTransitionLoading({
      active: true,
      message: 'Salvando progresso e retornando a Thais...',
      durationMs: 2000,
      huntId: undefined,
    });

    setGame((current) => {
      // Phase 99: Use leaveHunt instead of respawnInTemple to eliminate death penalty (0% XP loss, 0% skill loss)
      const left = leaveHunt(current);

      // Restore full health & mana and reset combat states for peaceful Thais city return
      for (const char of left.session.characters) {
        if (char) {
          char.currentHp = char.maxHp;
          char.currentMana = char.maxMana;
          char.combatState.targetId = null;
          char.combatState.spellCooldowns = {};
          char.combatState.groupCooldowns = {};
        }
      }

      return {
        ...left,
        session: {
          ...left.session,
          isMultiplayerParty: false,
        },
      };
    });
    setMode('training');
    setHuntSelectorOpen(false);
    setIsTrainingAtDummy(false);
    // Nasce no Templo de Thais (32369, 32241, 7)
    setCityPos(THAIS_TEMPLE_POSITION);
    // Rota solicitada pelo usuário:
    // Ponto 1: norte até x:32368 y:32215 z:7
    // Ponto 2: oeste até x:32345 y:32215 z:7
    // Ponto 3: sul até x:32345 y:32224 z:7 e ficar parado ali
    setWalkingPath({
      waypoints: [
        { x: 32368, y: 32215, z: 7 },
        { x: 32345, y: 32215, z: 7 },
        { x: 32345, y: 32224, z: 7 },
      ],
      destinationName: 'Frente do Depot de Thais',
      onArrive: () => {
        setSaleMessage('Chegou em Thais (32345, 32224, 7). Ande livremente com as setas do teclado!');
      },
    });
    setSaleMessage('Retornou a Thais. Progresso e experiência salvos com sucesso!');
  };
  exitHuntRef.current = exitHunt;

  const activeTrainingSkillKey: TrainableSkill = useMemo(() => {
    switch (activeTrainingSkill) {
      case 'Club Fighting': return 'club';
      case 'Axe Fighting': return 'axe';
      case 'Distance Fighting': return 'distance';
      case 'Shielding': return 'shielding';
      case 'Magic Level': return 'magicLevel';
      case 'Fist Fighting': return 'fist';
      default: return 'sword';
    }
  }, [activeTrainingSkill]);

  const trainingEstimate: TrainingTimeEstimate = useMemo(() => {
    return calculateTrainingTimeEstimate(
      activeCharacter,
      activeTrainingSkillKey,
      content,
      serverConfigManager.getConfig().skillRate
    );
  }, [activeCharacter, activeTrainingSkillKey, content, isTrainingAtDummy]);

  const partyTrainingEstimates = useMemo<TrainingMemberEstimate[]>(() => {
    if (!game.session.characters || game.session.characters.length === 0) return [];
    const skillRate = serverConfigManager.getConfig().skillRate;
    const activeId = activeCharacter?.id || game.session.characters[0]?.id;

    const skillLabelMap: Record<TrainableSkill, string> = {
      sword: 'Sword Fighting',
      axe: 'Axe Fighting',
      club: 'Club Fighting',
      distance: 'Distance Fighting',
      shielding: 'Shielding',
      magicLevel: 'Magic Level',
      fist: 'Fist Fighting',
    };

    return game.session.characters.map((char) => {
      const isLeader = char.id === activeId;
      const skill: TrainableSkill = isLeader ? activeTrainingSkillKey : trainingSkillFor(char, content);
      const skillLabel = isLeader ? activeTrainingSkill : (skillLabelMap[skill] || 'Combat Skill');
      const estimate = calculateTrainingTimeEstimate(char, skill, content, skillRate);
      return {
        characterId: char.id,
        characterName: char.name,
        vocation: char.vocation || char.baseVocation || 'Knight',
        isLeader,
        skill,
        skillLabel,
        estimate,
      };
    });
  }, [game.session.characters, activeCharacter?.id, activeTrainingSkillKey, activeTrainingSkill, content, isTrainingAtDummy]);

  const handleOpenTrainingMenu = useCallback(() => {
    if (mode === 'hunt') {
      setSaleMessage('O menu de treino só fica disponível em Thais.');
      return;
    }
    setHuntSelectorTab('TREINO');
    setHuntSelectorOpen(true);
  }, [mode]);

  const handleImbueItem = useCallback(
    async (
      characterId: string,
      target: { kind: 'equipment'; slot: CharacterEquipmentSlot } | { kind: 'backpack'; index: number; serverId: number },
      imbuementId: string,
      tier: ImbuementTier,
      autoRenew: boolean
    ): Promise<boolean> => {
      const imbDef = CANONICAL_IMBUEMENTS.find((i: ImbuementDefinition) => i.id === imbuementId);
      if (!imbDef) return false;
      const tierInfo = imbDef.tiers[tier];
      const cost = IMBUEMENT_TIER_COSTS[tier];

      if (game.session.gold < cost) {
        setSaleMessage(`Gold insuficiente na Caixa da Party (${cost.toLocaleString('pt-BR')} gp necessários)!`);
        return false;
      }

      setGame((cur) => {
        const nextChars = cur.session.characters.map((c) => {
          if (c.id !== characterId) return c;
          const char = { ...c };
          char.equipmentAttributes = { ...(char.equipmentAttributes || {}) };

          if (target.kind === 'equipment') {
            const slotAttr = { ...(char.equipmentAttributes[target.slot] || {}) };
            const existing = Array.isArray(slotAttr.imbuements) ? [...slotAttr.imbuements] : [];
            const nextSlotIdx = existing.length;
            existing.push({
              slotIndex: nextSlotIdx,
              imbuementId,
              name: imbDef.name,
              tier,
              stat: imbDef.stat,
              value: tierInfo.value,
              effectDescription: tierInfo.label,
              cost,
              remainingSeconds: IMBUEMENT_DURATION_SECONDS,
              autoRenew,
            });
            slotAttr.imbuements = existing;
            char.equipmentAttributes[target.slot] = slotAttr;
          }
          return char;
        });

        return {
          ...cur,
          session: {
            ...cur.session,
            gold: Math.max(0, cur.session.gold - cost),
            characters: nextChars,
          },
        };
      });

      setSaleMessage(`Item imbuído com sucesso com ${imbDef.name} ${tier} (-${cost.toLocaleString('pt-BR')} gp)!`);
      return true;
    },
    [game.session.gold]
  );

  const handleClearSlot = useCallback(
    async (
      characterId: string,
      target: { kind: 'equipment'; slot: CharacterEquipmentSlot } | { kind: 'backpack'; index: number; serverId: number },
      slotIndex: number
    ): Promise<boolean> => {
      setGame((cur) => {
        const nextChars = cur.session.characters.map((c) => {
          if (c.id !== characterId) return c;
          const char = { ...c };
          char.equipmentAttributes = { ...(char.equipmentAttributes || {}) };
          if (target.kind === 'equipment') {
            const slotAttr = { ...(char.equipmentAttributes[target.slot] || {}) };
            if (Array.isArray(slotAttr.imbuements)) {
              slotAttr.imbuements = slotAttr.imbuements
                .filter((s: ActiveImbuementSlot) => s.slotIndex !== slotIndex)
                .map((s: ActiveImbuementSlot, idx: number) => ({ ...s, slotIndex: idx }));
              char.equipmentAttributes[target.slot] = slotAttr;
            }
          }
          return char;
        });
        return {
          ...cur,
          session: {
            ...cur.session,
            characters: nextChars,
          },
        };
      });
      setSaleMessage('Slot de imbuement limpo com sucesso (grátis)!');
      return true;
    },
    []
  );

  const handleToggleAutoRenew = useCallback(
    async (
      characterId: string,
      target: { kind: 'equipment'; slot: CharacterEquipmentSlot } | { kind: 'backpack'; index: number; serverId: number },
      slotIndex: number,
      autoRenew: boolean
    ): Promise<boolean> => {
      setGame((cur) => {
        const nextChars = cur.session.characters.map((c) => {
          if (c.id !== characterId) return c;
          const char = { ...c };
          char.equipmentAttributes = { ...(char.equipmentAttributes || {}) };
          if (target.kind === 'equipment') {
            const slotAttr = { ...(char.equipmentAttributes[target.slot] || {}) };
            if (Array.isArray(slotAttr.imbuements)) {
              slotAttr.imbuements = slotAttr.imbuements.map((s: ActiveImbuementSlot) =>
                s.slotIndex === slotIndex ? { ...s, autoRenew } : s
              );
              char.equipmentAttributes[target.slot] = slotAttr;
            }
          }
          return char;
        });
        return {
          ...cur,
          session: {
            ...cur.session,
            characters: nextChars,
          },
        };
      });
      return true;
    },
    []
  );

  const handleStartTraining = (skillName?: string, targetDummy?: TrainingDummyInfo) => {
    if (mode === 'hunt') {
      setSaleMessage('O treino nos dummies só pode ser realizado em Thais.');
      return;
    }

    // 1. Usa o dummy clicado ou sorteia aleatoriamente
    const chosenDummy = targetDummy || THAIS_TRAINING_DUMMIES[Math.floor(Math.random() * THAIS_TRAINING_DUMMIES.length)];

    // Se já estiver treinando nesse exato dummy, evita reiniciar sessão ou duplicar timers
    if (isTrainingAtDummy && trainingDummyPos && chosenDummy.position.x === trainingDummyPos.x && chosenDummy.position.y === trainingDummyPos.y) {
      setSaleMessage(`Você já está treinando no Boneco de Treino #${chosenDummy.id}.`);
      return;
    }

    const effectiveSkillName = skillName || activeTrainingSkill || (() => {
      const v = (activeCharacter.vocation || activeCharacter.baseVocation || 'Knight').toLowerCase();
      if (v.includes('paladin')) return 'Distância';
      if (v.includes('sorcerer') || v.includes('druid')) return 'Magic Level';
      const sk = activeCharacter.skills;
      if (sk.axe > sk.sword && sk.axe > sk.club) return 'Machado';
      if (sk.club > sk.sword && sk.club > sk.axe) return 'Clube';
      return 'Espada';
    })();

    setActiveTrainingSkill(effectiveSkillName);
    setMode('training');
    setIsTrainingAtDummy(false);

    const activeTileMap = cityPos.z === 6 ? thaisTileMapZ6 : thaisTileMapZ7;

    // 2. Coleta posições ocupadas por outros jogadores
    const occupiedKeys = new Set<string>();
    for (const rp of remotePlayers.values()) {
      occupiedKeys.add(`${rp.x},${rp.y},${rp.z}`);
    }

    const isWalkableFn = (pos: { x: number; y: number; z: number }) => {
      const tMap = pos.z === 6 ? thaisTileMapZ6 : thaisTileMapZ7;
      const tile = tMap.get(`${pos.x},${pos.y}`);
      return Boolean(tile && tile.walkable);
    };

    const charVoc = activeCharacter.vocation || activeCharacter.baseVocation || 'Knight';
    const bestTile = findBestTrainingTile(chosenDummy.position, charVoc, occupiedKeys, isWalkableFn);
    if (!bestTile) {
      setSaleMessage(`Todas as vagas ao redor do Boneco de Treino #${chosenDummy.id} estão ocupadas ou inacessíveis no momento.`);
      return;
    }

    const startDirectTraining = () => {
      const dx = chosenDummy.position.x - bestTile.x;
      const dy = chosenDummy.position.y - bestTile.y;
      const dir = dy < 0 ? 'north' : dy > 0 ? 'south' : dx < 0 ? 'west' : 'east';
      gameNetwork.sendTurn(dir);
      setTrainingDummyPos(chosenDummy.position);
      setIsTrainingAtDummy(true);
      setSaleMessage(`Treinando ${effectiveSkillName} no Boneco de Treino #${chosenDummy.id}!`);
    };

    // Se já estiver no tile ideal
    if (cityPos.x === bestTile.x && cityPos.y === bestTile.y && cityPos.z === bestTile.z) {
      startDirectTraining();
      return;
    }

    // Calcula rota direta contínua até o tile do dummy
    let pathToDummy = findCityPath(activeTileMap, cityPos, bestTile);

    // Se a rota direta falhar por complexidade do mapa do DP, une via ponto de aproximação num único percurso
    if (pathToDummy.length === 0) {
      const pathToApproach = findCityPath(activeTileMap, cityPos, THAIS_TRAINING_APPROACH_POINT);
      const pathToDummyFromApproach = findCityPath(activeTileMap, THAIS_TRAINING_APPROACH_POINT, bestTile);
      if (pathToApproach.length > 0 && pathToDummyFromApproach.length > 0) {
        pathToDummy = [...pathToApproach, ...pathToDummyFromApproach];
      }
    }

    if (pathToDummy.length > 0) {
      setWalkingPath({
        waypoints: pathToDummy,
        destinationName: `Boneco de Treino #${chosenDummy.id}`,
        currentIndex: 0,
        onArrive: startDirectTraining,
      });
      setSaleMessage(`Indo até o Boneco de Treino #${chosenDummy.id} para treinar ${effectiveSkillName}...`);
    } else {
      const dist = Math.hypot(cityPos.x - chosenDummy.position.x, cityPos.y - chosenDummy.position.y);
      if (dist > 3) {
        setSaleMessage(`O Boneco de Treino #${chosenDummy.id} está inacessível a partir da sua posição atual.`);
        return;
      }
      startDirectTraining();
    }
  };
  const beginOrRestart = () => {
    if (mode === 'training') { setHuntSelectorOpen(true); return; }
    startSelectedHunt(encounter.hunt.id);
  };
  const resetPrototype = () => {
    const nextSeed = seed.trim() || defaultSeed;
    setGame(createIdleGame(nextSeed, content));
    setMode('training');
    setCityPos(THAIS_TEMPLE_POSITION);
    setWalkingPath(null);
    setSaleMessage('Protótipo restaurado no Templo de Thais (32369, 32241, 7).');
    setStatsDelta(null);
  };
  const createMember = (name: string, vocation: BaseVocationName, gender?: 'Masculino' | 'Feminino'): string | null => {
    const currentMemberCount = game.session.characters.length;
    const roleUpper = onlineAccount?.role?.toUpperCase() || '';
    const isAdminOrGm = roleUpper === 'ADMIN' || roleUpper === 'GM';
    const mainLevel = Math.max(activeCharacter?.level || 1, ...game.session.characters.map((c) => c.level || 1));

    // Regra estrita: 1 vocação de cada na Party
    const isVocTaken = game.session.characters.some(
      (c) => (c.vocation || c.baseVocation) === vocation
    );
    if (isVocTaken) {
      return `A Party já possui um integrante com a vocação ${vocation}. Cada integrante deve ter uma vocação diferente.`;
    }

    if (!isAdminOrGm) {
      if (currentMemberCount === 1 && accountMaxLevel < 70) {
        return 'Nível 70 necessário na conta para desbloquear o 2º slot da Party.';
      }
      if (currentMemberCount === 2 && accountMaxLevel < 150) {
        return 'Nível 150 necessário na conta para desbloquear o 3º slot da Party.';
      }
      if (currentMemberCount === 3 && accountMaxLevel < 200) {
        return 'Nível 200 necessário na conta para desbloquear o 4º slot da Party.';
      }
      if (currentMemberCount >= 4) {
        return 'A Party já atingiu o limite máximo de 4 membros.';
      }
    }

    const cleanName = name.trim();
    const isNameTaken =
      savedPool.some((c) => c.name.trim().toLowerCase() === cleanName.toLowerCase()) ||
      game.session.characters.some((c) => c.name.trim().toLowerCase() === cleanName.toLowerCase());
    if (isNameTaken) {
      return `Já existe um personagem com o nome "${cleanName}" na sua conta ou grupo.`;
    }

    const charGender = gender === 'Feminino' ? 'female' : 'male';
    try {
      let nextState = addPartyMember(game, cleanName, vocation, content, charGender);
      if (mode === 'hunt') {
        try {
          nextState = synchronizePartyWithEncounter(nextState, content);
        } catch (syncError) {
          console.warn('[createMember] Sincronização espacial de caçada adiada para o próximo teletransporte:', syncError);
        }
      }
      setGame(nextState);

      // Inclui o novo personagem automaticamente na Party e no pool de personagens salvos
      const createdChar = nextState.session.characters.find(
        (c: CharacterState) => c.name.toLowerCase() === cleanName.toLowerCase()
      );
      if (createdChar) {
        setSavedPool((prev) => {
          if (prev.some((c) => c.id === createdChar.id)) return prev;
          return [...prev, createdChar];
        });
        setPartyMemberIds((prev) => {
          if (prev.includes(createdChar.id) || prev.length >= 4) return prev;
          return [...prev, createdChar.id];
        });
        setIsPartyCreated(true);
      }

      // Persist newly created character to PostgreSQL/SQLite Database under account
      const token = typeof window !== 'undefined' ? (localStorage.getItem('colyseus_token') || localStorage.getItem('tibia_auth_token')) : null;
      if (token) {
        const vocIdMap: Record<string, number> = { Sorcerer: 1, Druid: 2, Paladin: 3, Knight: 4, Monk: 4 };
        fetch('/api/characters', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ name: name.trim(), vocationId: vocIdMap[vocation] || 4, gender: charGender }),
        }).catch((err) => {
          console.warn('Erro ao salvar personagem no banco:', err);
        });
      }

      return null;
    } catch (error) {
      return error instanceof Error ? error.message : 'Não foi possível criar o membro.';
    }
  };
  const sellLoot = () => setGame((current) => { const result = sellAllLoot(current, content); setSaleMessage(result.goldEarned > 0 ? `Venda concluída: +${result.goldEarned} gold.` : 'Nenhum item vendável.'); return result.state; });
  const sellOneLoot = (itemId: number) => setGame((current) => { const result = sellLootStack(current, content, itemId); setSaleMessage(result.goldEarned > 0 ? `Venda concluída: +${result.goldEarned} gold.` : 'Item protegido ou sem preço comprovado.'); return result.state; });
  const toggleLootPreference = (itemId: number, key: 'autoLoot' | 'lockSell' | 'quickSell') => setGame((current) => updateItemLootPreference(current, itemId, { [key]: !itemLootPreference(current, itemId)[key] }));
  const handleBuyShopItem = (itemId: number, itemName: string, price: number, quantity: number) => {
    const result = buyShopItem(game, itemId, itemName, price, quantity, content);
    if (result.ok) {
      setGame(result.state);
      if (result.message) {
        setSaleMessage(result.message);
      }
    }
    return { ok: result.ok, error: result.error };
  };
  const handleUseItem = (itemId: number) => {
    const result = useTestConsumable(game, itemId, content);
    if (result.ok) {
      setGame(result.state);
      if (result.message) {
        setSaleMessage(result.message);
      }
    }
  };
  const selectPartyCharacter = (characterId: string) => {
    setGame((current) => {
      let nextState = current;
      if (!current.session.characters.some((c) => c.id === characterId)) {
        const targetChar = savedPoolRef.current.find((c) => c.id === characterId) || savedPool.find((c) => c.id === characterId);
        if (targetChar) {
          const stats = calculateStatsForLevel(targetChar.vocation || 'Knight', targetChar.level || 1);
          const readyChar: CharacterState = {
            ...targetChar,
            maxHp: targetChar.maxHp || stats.maxHp,
            currentHp: targetChar.currentHp || targetChar.maxHp || stats.maxHp,
            maxMana: targetChar.maxMana || stats.maxMana,
            currentMana: targetChar.currentMana || targetChar.maxMana || stats.maxMana,
            combatState: targetChar.combatState || { targetId: null, spellCooldowns: {}, groupCooldowns: {} },
          };
          nextState = {
            ...current,
            session: {
              ...current.session,
              characters: [...current.session.characters, readyChar].slice(0, 4),
            },
          };
        }
      }
      return selectCharacter(nextState, characterId);
    });
    setPartyMemberIds((prev) => {
      const next = new Set(prev);
      next.add(characterId);
      return Array.from(next);
    });
    setStatsDelta(null);
    setPromotionMessage('');
  };

  const reorderSelectedHotbar = (fromIndex: number, toIndex: number) => setGame((current) => {
    const selected = selectedCharacterOf(current);
    let updatedChar: CharacterState | undefined;
    const nextCharacters = current.session.characters.map((character) => {
      if (character.id === selected.id) {
        updatedChar = reorderHotbar(character, fromIndex, toIndex);
        return updatedChar;
      }
      return character;
    });

    if (updatedChar) {
      const token = typeof window !== 'undefined' ? localStorage.getItem('tibia_auth_token') || localStorage.getItem('colyseus_token') : null;
      if (token && updatedChar.id && !updatedChar.id.startsWith('char-guest')) {
        fetch(`/api/characters/${updatedChar.id}/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            hotbar: updatedChar.hotbar,
            hotbarConfigs: updatedChar.hotbarConfigs,
          }),
        }).catch(() => {});
      }
    }

    return {
      ...current,
      session: {
        ...current.session,
        characters: nextCharacters,
      },
    };
  });

  const handlePromoteCharacter = (charId: string) => {
    setGame((current) => {
      const res = promoteCharacter(current, charId, content);
      if (res.ok) {
        setSaleMessage(`Personagem promovido com sucesso! -20.000 Gold`);
        const promotedChar = res.state.session.characters.find((c) => c.id === charId);
        if (promotedChar) {
          const token = typeof window !== 'undefined' ? localStorage.getItem('tibia_auth_token') || localStorage.getItem('colyseus_token') : null;
          if (token && promotedChar.id && !promotedChar.id.startsWith('char-guest')) {
            fetch(`/api/characters/${promotedChar.id}/save`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({
                level: promotedChar.level,
                experience: promotedChar.experience,
                vocationName: promotedChar.vocation,
                promotion: promotedChar.promotion,
              }),
            }).catch(() => {});
          }
        }
        return res.state;
      } else if (res.error) {
        setSaleMessage(res.error);
      }
      return current;
    });
  };

  const handleBuyBlessing = (blessingId: number) => {
    if (!activeCharacter) return;
    setGame((current) => {
      const res = buyBlessing(current, activeCharacter.id, blessingId);
      if (res.ok) {
        setSaleMessage(`Bênção adquirida com sucesso! -${(res.costPaid || 0).toLocaleString('pt-BR')} gp`);
        const updatedChar = res.state.session.characters.find((c) => c.id === activeCharacter.id);
        if (updatedChar) {
          const token = typeof window !== 'undefined' ? localStorage.getItem('tibia_auth_token') || localStorage.getItem('colyseus_token') : null;
          if (token && updatedChar.id && !updatedChar.id.startsWith('char-guest')) {
            fetch(`/api/characters/${updatedChar.id}/save`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({
                blessings: updatedChar.blessings,
              }),
            }).catch(() => {});
          }
        }
        return res.state;
      } else if (res.error) {
        setSaleMessage(res.error);
      }
      return current;
    });
  };

  const handleBlessAll = () => {
    if (!activeCharacter) return;
    setGame((current) => {
      const res = buyAllMissingBlessings(current, activeCharacter.id);
      if (res.ok) {
        setSaleMessage(`Todas as bênçãos adquiridas com sucesso! -${(res.costPaid || 0).toLocaleString('pt-BR')} gp`);
        const updatedChar = res.state.session.characters.find((c) => c.id === activeCharacter.id);
        if (updatedChar) {
          const token = typeof window !== 'undefined' ? localStorage.getItem('tibia_auth_token') || localStorage.getItem('colyseus_token') : null;
          if (token && updatedChar.id && !updatedChar.id.startsWith('char-guest')) {
            fetch(`/api/characters/${updatedChar.id}/save`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({
                blessings: updatedChar.blessings,
              }),
            }).catch(() => {});
          }
        }
        return res.state;
      } else if (res.error) {
        setSaleMessage(res.error);
      }
      return current;
    });
  };

  // Proactively display celebratory promotion modal once character reaches Level 20 in safe area
  useEffect(() => {
    if (
      activeCharacter.level >= 20 &&
      !activeCharacter.promotion &&
      mode !== 'hunt' &&
      !hasShownPromotionPopupRef.current
    ) {
      hasShownPromotionPopupRef.current = true;
      setIsPromotionModalOpen(true);
    }
  }, [activeCharacter.level, activeCharacter.promotion, mode]);

  const handleSaveHotbarSlot = (slotIndex: number, actionId: number | null, config?: any) => {
    setGame((current) => {
      const activeId = current.session.selectedCharacterId;
      let targetChar: CharacterState | undefined;

      const characters = current.session.characters.map((char) => {
        if (char.id !== activeId) return char;
        const hotbar = [...char.hotbar];
        while (hotbar.length <= slotIndex) hotbar.push(0);
        hotbar[slotIndex] = actionId === null ? 0 : actionId;

        const hotbarConfigs = { ...((char as any).hotbarConfigs || {}) };
        if (config) {
          hotbarConfigs[slotIndex] = config;
        } else if (actionId === null) {
          delete hotbarConfigs[slotIndex];
        }

        targetChar = { ...char, hotbar, hotbarConfigs };
        return targetChar;
      });

      if (targetChar) {
        const token = typeof window !== 'undefined' ? localStorage.getItem('tibia_auth_token') || localStorage.getItem('colyseus_token') : null;
        if (token && targetChar.id && !targetChar.id.startsWith('char-guest')) {
          fetch(`/api/characters/${targetChar.id}/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              hotbar: targetChar.hotbar,
              hotbarConfigs: targetChar.hotbarConfigs,
            }),
          }).catch(() => {});
        }
      }

      return {
        ...current,
        session: {
          ...current.session,
          characters,
        },
      };
    });
  };

  const handleManualHotbarAction = useCallback((slotIndex: number) => {
    const actionId = activeCharacter.hotbar[slotIndex];
    if (typeof actionId !== 'number' || actionId === 0) {
      return;
    }
    const action = findHotbarAction(actionId, content);
    const spellWords = action?.kind === 'spell' ? action.spell.words : action?.kind === 'potion' ? 'Aaaah...' : action?.kind === 'rune' ? action.rune.name : undefined;

    // Phase 164: Block haste spells in Thais city since 500 fixed speed is already active
    if (mode !== 'hunt' && spellWords && (spellWords.toLowerCase().includes('utani hur') || spellWords.toLowerCase().includes('utani gran hur'))) {
      setSaleMessage('Velocidade máxima da cidade (500) já está ativa. Haste desnecessário em Thais.');
      return;
    }

    setGame((current) => {
      const next = structuredClone(current);
      const triggered = triggerManualHotbarAction(next, activeCharacter.id, actionId, content);
      if (triggered) {
        if (spellWords) {
          setOverheadMessages((prev) => [
            ...prev,
            {
              id: `spell-${Date.now()}-${Math.random()}`,
              senderName: activeCharacter.name,
              text: spellWords,
              channel: 'local',
              timestamp: Date.now(),
            },
          ]);
        }
        return next;
      }
      return current;
    });
  }, [activeCharacter.hotbar, activeCharacter.id, activeCharacter.name, content, mode]);

  // Continuous follower leash: if leader is far away (>1.4 SQM), path automatically to follow the leader
  useEffect(() => {
    if (!isFollowingLeader || mode === 'hunt' || !multiplayerParty) return;

    const followInterval = window.setInterval(() => {
      const leader = remotePlayers.get(multiplayerParty.leaderSessionId);
      if (!leader) return;

      const dist = Math.hypot(cityPos.x - leader.x, cityPos.y - leader.y);
      if (dist > 12 || cityPos.z !== leader.z) {
        const targetPos = { x: leader.x, y: leader.y + 1, z: leader.z };
        setWalkingPath(null);
        setCityPos(targetPos);
        gameNetwork.sendMove('south', targetPos);
        return;
      }

      if (dist > 1.4 && cityPos.z === leader.z) {
        const activeTileMap = cityPos.z === 6 ? thaisTileMapZ6 : thaisTileMapZ7;
        const path = findCityPath(activeTileMap, cityPos, { x: leader.x, y: leader.y, z: leader.z }, 400);
        if (path.length > 1) {
          const followPath = path.slice(0, Math.max(1, path.length - 1));
          setWalkingPath({
            waypoints: followPath,
            destinationName: `Seguindo líder (${multiplayerParty.leaderName})`,
            currentIndex: 0,
          });
        }
      }
    }, 500);

    return () => window.clearInterval(followInterval);
  }, [isFollowingLeader, mode, multiplayerParty, remotePlayers, cityPos, thaisTileMapZ6, thaisTileMapZ7]);

  const takeCityStep = useCallback((deltaX: number, deltaY: number) => {
    if (isFollowingLeader) return;
    setWalkingPath(null);
    setIsTrainingAtDummy(false);

    const dir = deltaY < 0 ? 'north' : deltaY > 0 ? 'south' : deltaX < 0 ? 'west' : 'east';
    setCityDirection(dir);

    setCityPos((current) => {
      const stairTarget = resolveStairsTransition(current, deltaX, deltaY);
      if (stairTarget) {
        gameNetwork.sendMove(dir, { x: stairTarget.x, y: stairTarget.y, z: stairTarget.z });
        return stairTarget;
      }
      const nextX = current.x + deltaX;
      const nextY = current.y + deltaY;
      const activeTileMap = current.z === 6 ? thaisTileMapZ6 : thaisTileMapZ7;
      const tile = activeTileMap.get(`${nextX},${nextY}`);
      if (!tile || !tile.walkable) return current;

      gameNetwork.sendMove(dir, { x: nextX, y: nextY, z: current.z });
      return { x: nextX, y: nextY, z: current.z };
    });
  }, [thaisTileMapZ6, thaisTileMapZ7, isFollowingLeader]);

  // Continuous movement loop while arrow keys or WASD are held, strictly paced at normal speed with Web Worker ticker
  const tickHeldKeyboardMove = useCallback(() => {
    if (mode === 'hunt') return;
    if (isFollowingLeader) {
      heldDirectionRef.current = null;
      return;
    }
    if (heldDirectionRef.current) {
      const now = performance.now();
      if (now - lastStepTimeRef.current >= cityStepDurationMs) {
        lastStepTimeRef.current = now;
        takeCityStep(heldDirectionRef.current.dx, heldDirectionRef.current.dy);
      }
    }
  }, [mode, isFollowingLeader, cityStepDurationMs, takeCityStep]);

  useGameTicker(tickHeldKeyboardMove, 16, mode !== 'hunt' && !isFollowingLeader);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      // Phase 126: Esc key toggles the Logout & Switch Character dialog when playing
      if (e.key === 'Escape' && !showAuthModal) {
        if (isLogoutModalOpen) {
          setIsLogoutModalOpen(false);
          return;
        }
        if (!equipmentOpen && !depotOpen && !shopOpen && !skillsModalOpen && !isProfileModalOpen && !huntSelectorOpen && !outfitModalOpen) {
          setIsLogoutModalOpen(true);
          return;
        }
      }

      // FIX.md Item 8: Girar o corpo no próprio eixo (Ctrl + Direcionais / WASD) sem andar
      const isTurnArrow = e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight' ||
        e.key === 'w' || e.key === 'W' || e.key === 's' || e.key === 'S' || e.key === 'a' || e.key === 'A' || e.key === 'd' || e.key === 'D';

      if ((e.ctrlKey || e.metaKey) && isTurnArrow) {
        e.preventDefault();
        const turnDir: 'north' | 'south' | 'east' | 'west' =
          (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') ? 'north' :
          (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') ? 'south' :
          (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') ? 'west' : 'east';

        setCityDirection(turnDir);
        gameNetwork.sendTurn(turnDir);

        if (mode === 'hunt') {
          setGame((cur) => {
            const actor = cur.encounter.partyActors.find((a) => a.characterId === activeCharacter.id);
            if (actor) {
              actor.direction = turnDir;
            }
            return { ...cur };
          });
        }
        return;
      }

      // Manual movement via arrow keys (and WASD) in city mode
      if (mode !== 'hunt' && !e.ctrlKey && !e.metaKey) {
        let deltaX = 0;
        let deltaY = 0;
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') deltaY = -1;
        else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') deltaY = 1;
        else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') deltaX = -1;
        else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') deltaX = 1;

        if (deltaX !== 0 || deltaY !== 0) {
          e.preventDefault();
          if (isFollowingLeader) {
            setSaleMessage('Você está seguindo o líder da party. Para andar manualmente, saia da party.');
            return;
          }
          const now = performance.now();
          const isNewDir = !heldDirectionRef.current || heldDirectionRef.current.dx !== deltaX || heldDirectionRef.current.dy !== deltaY;
          heldDirectionRef.current = { dx: deltaX, dy: deltaY };
          if (isNewDir && now - lastStepTimeRef.current >= cityStepDurationMs) {
            lastStepTimeRef.current = now;
            takeCityStep(deltaX, deltaY); // Instant step on first key press
          }
          return;
        }
      }

      // Hotkey U: Abrir Customização de Outfit / Aparência
      if ((e.key === 'u' || e.key === 'U') && !e.ctrlKey && !e.altKey && !e.metaKey) {
        handleOpenOutfitModal(activeCharacter.id);
        return;
      }

      // Hotkey Ctrl+R: Montar / Desmontar
      if ((e.key === 'r' || e.key === 'R') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleToggleMount(activeCharacter.id);
        return;
      }

      if (e.key.startsWith('F') && e.key.length <= 3) {
        const fNum = parseInt(e.key.slice(1), 10);
        if (fNum >= 1 && fNum <= 12) {
          e.preventDefault();
          handleManualHotbarAction(fNum - 1);
        }
      } else if (e.key >= '0' && e.key <= '9' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        const keyNum = e.key === '0' ? 9 : parseInt(e.key, 10) - 1;
        handleManualHotbarAction(10 + keyNum);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      let deltaX = 0;
      let deltaY = 0;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') deltaY = -1;
      else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') deltaY = 1;
      else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') deltaX = -1;
      else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') deltaX = 1;

      if (deltaX !== 0 || deltaY !== 0) {
        if (heldDirectionRef.current && heldDirectionRef.current.dx === deltaX && heldDirectionRef.current.dy === deltaY) {
          heldDirectionRef.current = null;
        }
      }
    };

    const handleBlur = () => {
      heldDirectionRef.current = null;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [handleManualHotbarAction, mode, takeCityStep, isFollowingLeader]);

  const skillsList = [
    ['Fist', activeCharacter.skills.fist, selectedSkillProgress.fist],
    ['Club', activeCharacter.skills.club, selectedSkillProgress.club],
    ['Sword', activeCharacter.skills.sword, selectedSkillProgress.sword],
    ['Axe', activeCharacter.skills.axe, selectedSkillProgress.axe],
    ['Distance', activeCharacter.skills.distance, selectedSkillProgress.distance],
    ['Shielding', activeCharacter.skills.shielding, selectedSkillProgress.shielding],
    ['Magic level', activeCharacter.skills.magicLevel, selectedSkillProgress.magicLevel],
  ] as const;

  const currentActor = encounter.partyActors.find((actor) => actor.characterId === activeCharacter.id);
  const prices = new Map(content.economy.items.map((item) => [item.itemId, preferredSellPrice(item)?.price ?? null]));
  const sellableValue = game.session.loot.reduce((total, stack) => total + (stack.itemId === undefined ? 0 : (prices.get(stack.itemId) ?? 0) * stack.amount), 0);

  // Phase 126: Handlers for Character Switch and Full Logout with persistent progress saving
  const handleSwitchCharacter = useCallback(async () => {
    setIsLogoutModalOpen(false);
    stopAllAudio();
    try {
      if (saveProgressRef.current) {
        await saveProgressRef.current(false, true);
      }
    } catch {}
    if (gameSessionChannelRef.current) {
      try {
        gameSessionChannelRef.current.postMessage({ type: 'SESSION_CLOSED' });
      } catch {}
    }
    gameNetwork.disconnect();
    assetPreloader.reset();
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('cavebound_manual_logout', 'true');
    }
    setOnlineCharacter(null);
    setSaleMessage('Retornando à seleção de personagens...');
    setDuplicateSessionError(null);
    if (onSwitchCharacter) {
      onSwitchCharacter();
      return;
    }
    setShowAuthModal(true);
  }, [onSwitchCharacter]);

  const handleConfirmLogout = useCallback(async () => {
    setIsLogoutModalOpen(false);
    stopAllAudio();
    try {
      if (saveProgressRef.current) {
        await saveProgressRef.current(false, true);
      }
    } catch {}
    if (gameSessionChannelRef.current) {
      try {
        gameSessionChannelRef.current.postMessage({ type: 'SESSION_CLOSED' });
      } catch {}
    }
    gameNetwork.disconnect();
    assetPreloader.reset();
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('cavebound_manual_logout');
      localStorage.removeItem('colyseus_token');
      localStorage.removeItem('tibia_auth_token');
      localStorage.removeItem('cavebound_cached_characters');
      localStorage.removeItem('cavebound_cached_account');
      document.cookie = 'colyseus_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
    }
    setOnlineAccount(null);
    setOnlineCharacter(null);
    void auth.signOut();
    window.location.href = '/';
  }, [auth]);

  return (
    <main className="mmorpg-client fullscreen-mode">
      {/* Background 100% Fullscreen Viewport */}
      <div className="fullscreen-viewport">
        <div style={{ display: mode === 'hunt' ? 'block' : 'none', width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
          <PixiArena
            game={game}
            debug={debugGrid}
            active={mode === 'hunt'}
            isCharacterVisible={isCharacterVisible}
            adminTitle={(() => {
              const rawTitle = (onlineCharacter as any)?.adminTitle || (game.session.characters[0] as any)?.adminTitle;
              const clean = (rawTitle && rawTitle !== 'null' && rawTitle !== 'undefined') ? rawTitle : undefined;
              if (clean === 'GOD' || clean === 'GM') return clean;
              return roleUpper === 'ADMIN' ? 'GOD' : roleUpper === 'GM' ? 'GM' : undefined;
            })()}
            onSceneReady={() => setIsArenaReady(true)}
            onSelectTarget={(enemyId) => {
              setGame((cur) => setActorTarget(cur, activeCharacter.id, enemyId));
              if (multiplayerParty && multiplayerParty.leaderSessionId === gameNetwork.LocalPlayerId) {
                gameNetwork.sendPartyTargetSync(enemyId);
              }
            }}
            onCharacterContextMenu={(charId, x, y) => setCharContextMenu({ characterId: charId, x, y })}
          />
        </div>
        <div style={{ display: mode !== 'hunt' ? 'block' : 'none', width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
          <ThaisCityArena
            characters={game.session.characters}
            activeCharacterId={activeCharacter.id}
            adminTitle={(() => {
              const rawTitle = (onlineCharacter as any)?.adminTitle || (game.session.characters[0] as any)?.adminTitle;
              const clean = (rawTitle && rawTitle !== 'null' && rawTitle !== 'undefined') ? rawTitle : undefined;
              if (clean === 'GOD' || clean === 'GM') return clean;
              return roleUpper === 'ADMIN' ? 'GOD' : roleUpper === 'GM' ? 'GM' : undefined;
            })()}
            cityPos={cityPos}
            playerDirection={cityDirection}
            isWalking={walkingPath !== null || heldDirectionRef.current !== null}
            isTraining={isTrainingAtDummy}
            trainingDummyPos={trainingDummyPos}
            stepDurationMs={cityStepDurationMs}
            onTileClick={handleTileClick}
            onCharacterContextMenu={(charId, x, y) => {
              setDummyContextMenu(null);
              setCharContextMenu({ characterId: charId, x, y });
            }}
            onDummyContextMenu={(dummy, x, y) => {
              setCharContextMenu(null);
              setDummyContextMenu({ dummy, x, y });
            }}
            visualEvents={combinedCityVisualEvents}
            debug={debugGrid}
            remotePlayers={remotePlayers}
            localPlayerId={gameNetwork.LocalPlayerId}
            overheadMessages={overheadMessages}
            active={mode !== 'hunt' && !showAuthModal}
            isCharacterVisible={isCharacterVisible}
            squadFollowEnabled={squadFollowCity}
          />
        </div>
        {mode !== 'hunt' && !showAuthModal && (
          <div className="city-location-hud">
            <div className="city-hud-header">
              <span className="city-tag">CIDADE DE THAIS</span>
              <span className="city-coords">X: {cityPos.x} · Y: {cityPos.y} · Z: {cityPos.z}</span>
            </div>
            <div className="city-hud-status">
              {isFollowingLeader ? (
                <span className="city-walking-badge" style={{ borderColor: '#3b82f6', color: '#93c5fd' }}>
                  👥 Seguindo líder {multiplayerParty?.leaderName} · [Movimento manual bloqueado]
                </span>
              ) : walkingPath && walkingPath.waypoints[0] ? (
                <span className="city-walking-badge">
                  🚶 Andando sozinho até {walkingPath.destinationName} ({walkingPath.waypoints[0].x}, {walkingPath.waypoints[0].y}, {walkingPath.waypoints[0].z})...
                </span>
              ) : isTrainingAtDummy ? (
                <span className="city-training-badge">
                  ⚔️ Treinando {activeTrainingSkill} no boneco de treino ({cityPos.x}, {cityPos.y}, {cityPos.z})
                </span>
              ) : (
                <span className="city-idle-badge">
                  🏛️ Parado em Thais ({cityPos.x}, {cityPos.y}, {cityPos.z}) · [Setas do teclado para andar]
                </span>
              )}
            </div>
          </div>
        )}
        {isTrainingAtDummy && mode !== 'hunt' && !showAuthModal && (
          <TrainingProgressHUD
            members={partyTrainingEstimates}
            skill={activeTrainingSkillKey}
            skillLabel={activeTrainingSkill}
            estimate={trainingEstimate}
            onStopTraining={() => {
              setIsTrainingAtDummy(false);
              setSaleMessage('Treino no boneco finalizado. A party retornou à formação e você pode se movimentar livremente.');
            }}
          />
        )}
        {mode === 'hunt' && !showAuthModal && (
          <div className="city-location-hud hunt-location-hud">
            <div className="city-hud-header">
              <span className="city-tag" style={{ background: '#3b1c1c', borderColor: '#7f1d1d', color: '#fca5a5' }}>
                ⚔️ CAÇADA: {encounter.hunt?.name || 'Caçada Ativa'}
              </span>
              <span className="city-coords">
                {(() => {
                  const reg = (content.huntRegions as any[])?.find((r: any) => r.huntId === encounter.hunt?.id);
                  const originX = reg?.bounds?.x ?? 32077;
                  const originY = reg?.bounds?.y ?? 32180;
                  const originZ = reg?.bounds?.z ?? 8;
                  const curX = originX + (currentActor?.position.x ?? 25);
                  const curY = originY + (currentActor?.position.y ?? 25);
                  return `X: ${curX} · Y: ${curY} · Z: ${originZ}`;
                })()}
              </span>
            </div>
            <div className="city-hud-status">
              <span className="city-idle-badge" style={{ background: 'rgba(20, 25, 36, 0.85)', borderColor: '#374151' }}>
                🗺️ RealMap OTBM · Entrada: (32102, 32205, 8) · Sala: {encounter.room.definitionId}
              </span>
            </div>
          </div>
        )}
        {levelUpMessage && (
          <div className="tibia-advancement-banner" key={levelUpMessage.timestamp}>
            {levelUpMessage.text}
          </div>
        )}
      </div>

      {/* Top HUD Dock Bar */}
      {!showAuthModal && (
        <WindowDockBar
          gold={game.session.gold}
          coins={(onlineAccount as any)?.coins ?? (auth.viewer as any)?.coins ?? 0}
          accountUsername={auth.viewer?.displayName || onlineAccount?.displayName || 'CONTA'}
          characterName={activeCharacter.name}
          character={activeCharacter}
          stats={activeStats}
          onlinePlayersCount={uniqueOnlineAccountsCount}
          debug={debugGrid}
          isAdmin={isAdmin}
          isAutoIdle={(activeCharacter as any).isAutoIdle ?? false}
          inHunt={mode === 'hunt'}
          isTraining={false}
          staminaMinutes={activeCharacter.staminaMinutes ?? 15}
          maxStaminaMinutes={activeCharacter.maxStaminaMinutes ?? 15}
          avatarId={(activeCharacter as any).avatarId ?? 1}
          onOpenProfile={() => gameModal.openOutfit(activeCharacter.id)}
          onToggleAutoIdle={() => {
            const nextEnabled = !((activeCharacter as any).isAutoIdle ?? false);
            setGame((cur) => {
              const char = cur.session.characters.find((c) => c.id === activeCharacter.id);
              if (char) {
                (char as any).isAutoIdle = nextEnabled;
              }
              return { ...cur };
            });
            gameNetwork.sendAutoIdleToggle(nextEnabled, (activeCharacter as any).lastHuntId || 'rat-cellars');
          }}
          onToggleDebug={() => setDebugGrid((value) => !value)}
          onSelectHunt={() => setHuntSelectorOpen(true)}
          onOpenParty={() => setPartyModalOpen(true)}
          onOpenSkills={() => setSkillsModalOpen((prev) => !prev)}
          onOpenShop={() => setShopOpen((prev) => !prev)}
          onOpenRanking={() => setIsHighscoresModalOpen(true)}
          onOpenPvP={() => setIsPvPArenaModalOpen(true)}
          onOpenDebug={() => setIsAdminDebugModalOpen(true)}
          onOpenCyclopedia={() => gameModal.openCyclopedia()}
          isMounted={isCharacterMounted(activeCharacter)}
          onToggleMount={() => handleToggleMount(activeCharacter.id)}
          onExitGame={() => setIsLogoutModalOpen(true)}
          onOpenPromotion={() => setIsPromotionModalOpen(true)}
        />
      )}

      {/* Window 1: Classic Skills Window (acessada pelo nome do personagem) */}
      <SkillsWindow
        open={skillsModalOpen}
        character={activeCharacter}
        stats={activeStats}
        content={content}
        onClose={() => setSkillsModalOpen(false)}
        onPromote={(charId) => handlePromoteCharacter(charId)}
      />

      {/* Window 5: Advanced Metrics & Analyzers */}
      <DraggableWindow id="metrics" icon="📊">
        <AdvancedMetricsWindow metrics={metrics} gold={game.session.gold} />
      </DraggableWindow>

      {/* Window 6: Combat Log History */}
      <DraggableWindow id="logs" icon="📜">
        <div className="window-logs-content">
          <div style={{ fontSize: '9px', color: '#9ea49c', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
            <span>Histórico de Combate</span>
            <small>{encounter.log.length} registros</small>
          </div>
          <ol className="combat-log-list" style={{ maxHeight: '220px', overflowY: 'auto', padding: 0, margin: 0, listStyle: 'none' }}>
            {encounter.log.slice(-30).map((entry) => (
              <li key={entry.id} style={{ fontSize: '10px', padding: '2px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '6px' }}>
                <time suppressHydrationWarning style={{ color: '#889088' }}>#{entry.round.toString().padStart(2, '0')}</time>
                <span style={{ color: '#d5ded6' }}>{entry.message}</span>
              </li>
            ))}
          </ol>
        </div>
      </DraggableWindow>

      {/* Window 7: Fixed Bottom-Left Tibia 11 Chat Dock */}
      <div
        className={`fixed-chat-dock ${isChatMinimized ? 'is-minimized' : ''}`}
        data-testid="fixed-chat-dock"
      >
        <div
          className="window-header"
          onClick={() => setIsChatMinimized((prev) => !prev)}
        >
          <div className="window-title-group">
            <span className="window-icon">💬</span>
            <span className="window-title">Chat</span>
          </div>
          <div className="window-controls">
            <button
              type="button"
              className="window-btn minimize-btn"
              title={isChatMinimized ? 'Expandir Chat' : 'Minimizar Chat'}
              onClick={(e) => {
                e.stopPropagation();
                setIsChatMinimized((prev) => !prev);
              }}
            >
              {isChatMinimized ? '▲' : '▼'}
            </button>
          </div>
        </div>

        {!isChatMinimized && (
          <div className="window-body fixed-chat-body">
            <ChatWindow
              ref={chatWindowRef}
              messages={chatMessages}
              onSendMessage={handleSendChatMessage}
              characterName={activeCharacter.name}
            />
          </div>
        )}
      </div>

      {/* Persistent Bottom Battle & Action Console HUD matching reference screenshot */}
      <BottomDock
        logs={encounter.log}
        seed={seed}
        status={encounter.status}
        character={activeCharacter}
        actor={currentActor}
        spells={content.spells}
        elapsedMs={encounter.elapsedMs}
        isHunting={mode === 'hunt'}
        isAutoIdle={(activeCharacter as any).isAutoIdle ?? false}
        onToggleAutoIdle={() => {
          const nextEnabled = !((activeCharacter as any).isAutoIdle ?? false);
          setGame((cur) => {
            const char = cur.session.characters.find((c) => c.id === activeCharacter.id);
            if (char) {
              (char as any).isAutoIdle = nextEnabled;
            }
            return { ...cur };
          });
          gameNetwork.sendAutoIdleToggle(nextEnabled, (activeCharacter as any).lastHuntId || 'rat-cellars');
        }}
        onExitHunt={exitHunt}
        onSeed={setSeed}
        onBegin={beginOrRestart}
        onReset={resetPrototype}
        onReorderSpell={reorderSelectedHotbar}
        onConfigureSlot={setHotbarConfigSlot}
        onSlotClick={handleManualHotbarAction}
        onToggleBackpack={() => setEquipmentOpen((prev) => !prev)}
        onOpenDepot={() => setDepotOpen(true)}
        onOpenQuickSell={() => setQuickSellOpen(true)}
        onOpenTraining={handleOpenTrainingMenu}
        onOpenImbuements={() => setImbuingModalOpen(true)}
        onOpenBlessings={() => setIsBlessingsModalOpen(true)}
        onOpenRanking={() => setIsHighscoresModalOpen(true)}
        onOpenPvP={() => setIsPvPArenaModalOpen(true)}
        onSelectHunt={() => {
          setHuntSelectorTab('CAÇADAS');
          setHuntSelectorOpen(true);
        }}
        onChangeStance={(stance) => setGame((cur) => setCharacterStance(cur, activeCharacter.id, stance))}
        onChangeTargetDistance={(dist) => setGame((cur) => setCharacterTargetDistance(cur, activeCharacter.id, dist))}
        onChangeTargetStrategy={(strat) => setGame((cur) => setCharacterTargetStrategy(cur, activeCharacter.id, strat))}
      />

      {/* Modals & Drawers */}
      <InventoryWindow
        open={equipmentOpen}
        character={activeCharacter}
        equipmentCatalog={content.equipment}
        backpackItems={game.session.loot}
        bagItems={game.session.bag ?? []}
        availableCapacityOz={Math.max(0, characterCapacity(activeCharacter, content) - inventoryWeight(activeCharacter, content.equipment))}
        totalGold={game.session.gold}
        onClose={() => setEquipmentOpen(false)}
        onEquipItem={(itemId) => setGame((cur) => equipItemFromContainer(cur, activeCharacter.id, itemId, content))}
        onUnequipSlot={(slot) => setGame((cur) => unequipSlotToBag(cur, activeCharacter.id, slot, content))}
        onTransferContainerItem={(from, to, index) => setGame((cur) => transferItemBetweenContainers(cur, from, to, index))}
        onDestroyItem={(container, index) => setGame((cur) => destroyContainerItem(cur, container, index))}
        onUseItem={handleUseItem}
        onToggleItemPreference={(itemId, key) => setGame((cur) => updateItemLootPreference(cur, itemId, { [key]: !itemLootPreference(cur, itemId)[key] }))}
        getItemPreference={(itemId) => itemLootPreference(game, itemId)}
      />

      <DepotWindow
        open={depotOpen}
        depotItems={game.session.depot ?? []}
        bagItems={game.session.bag ?? []}
        backpackItems={game.session.loot}
        onClose={() => setDepotOpen(false)}
        onTransferToDepot={(from, index) => setGame((cur) => transferItemBetweenContainers(cur, from, 'depot', index))}
        onTransferFromDepot={(to, depotIndex) => setGame((cur) => transferItemBetweenContainers(cur, 'depot', to, depotIndex))}
      />

      <ShopWindow
        open={shopOpen}
        character={activeCharacter}
        equipmentCatalog={content.equipment}
        totalGold={game.session.gold}
        onClose={() => setShopOpen(false)}
        onBuyItem={handleBuyShopItem}
      />

      <VocationChoiceModal
        open={!activeCharacter.vocation || activeCharacter.vocation === 'None'}
        characterName={activeCharacter.name}
        characterGender={activeCharacter.gender || ((onlineCharacter as any)?.gender) || 'male'}
        takenVocations={getTakenAccountVocations(game.session.characters, activeCharacter.id)}
        onSelectVocation={(vocName) => {
          const res = chooseCharacterVocation(game, activeCharacter.id, vocName, content);
          if (res.ok) {
            const charGender = activeCharacter.gender || ((onlineCharacter as any)?.gender) || 'male';
            const defaultOutfit =
              vocName === 'Knight' ? 'Knight'
              : vocName === 'Paladin' ? 'Hunter'
              : vocName === 'Sorcerer' ? 'Mage'
              : 'Druid';

            const defaultLookType =
              vocName === 'Knight' ? (charGender === 'female' ? 139 : 131)
              : vocName === 'Paladin' ? (charGender === 'female' ? 137 : 129)
              : (charGender === 'female' ? 138 : 130);

            const updatedState = {
              ...res.state,
              session: {
                ...res.state.session,
                characters: res.state.session.characters.map((c) =>
                  c.id === activeCharacter.id ? { ...c, outfit: defaultOutfit, outfitLookType: defaultLookType } : c
                ),
              },
            };
            setGame(updatedState);
            setOnlineCharacter((prev) =>
              prev ? { ...prev, vocation: vocName, baseVocation: vocName, outfit: defaultOutfit, outfitLookType: defaultLookType } as any : prev
            );
            gameNetwork.sendChangeOutfit({ outfit: defaultOutfit, lookType: defaultLookType, mount: 'none', mountActive: false, addons: 0 });
            
            // Phase 158: Persistência permanente imediata da nova vocação e outfit no banco SQLite
            const token = typeof window !== 'undefined' ? localStorage.getItem('tibia_auth_token') || localStorage.getItem('colyseus_token') : null;
            if (token && activeCharacter.id && !activeCharacter.id.startsWith('char-guest')) {
              fetch(`/api/characters/${activeCharacter.id}/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                  vocationName: vocName,
                  outfit: defaultOutfit,
                  outfitLookType: defaultLookType,
                  health: updatedState.session.characters.find((c) => c.id === activeCharacter.id)?.maxHp,
                  maxHealth: updatedState.session.characters.find((c) => c.id === activeCharacter.id)?.maxHp,
                  mana: updatedState.session.characters.find((c) => c.id === activeCharacter.id)?.maxMana,
                  maxMana: updatedState.session.characters.find((c) => c.id === activeCharacter.id)?.maxMana,
                }),
              }).catch(() => {});
            }

            if (saveProgressRef.current) {
              saveProgressRef.current(false, true).catch(() => {});
            }
            setSaleMessage(`Parabéns! ${activeCharacter.name} agora é um ${vocName}!`);
          } else if (res.error) {
            setSaleMessage(res.error);
          }
        }}
      />

      <QuickSellWindow
        open={quickSellOpen}
        backpackItems={game.session.loot}
        economy={content.economy}
        state={game}
        onClose={() => setQuickSellOpen(false)}
        onExecuteSell={(selectedIds) => {
          setGame((cur) => {
            const result = executeQuickSell(cur, content, selectedIds);
            return result.state;
          });
        }}
        onToggleQuickSellPreference={(itemId) => {
          setGame((cur) => updateItemLootPreference(cur, itemId, { quickSell: !itemLootPreference(cur, itemId).quickSell }));
        }}
      />
      <ImbuingModal
        isOpen={imbuingModalOpen}
        onClose={() => setImbuingModalOpen(false)}
        characters={game.session.characters}
        selectedCharacterId={game.session.selectedCharacterId}
        equipmentCatalog={content.equipment}
        partyGold={game.session.gold}
        onImbueItem={handleImbueItem}
        onClearSlot={handleClearSlot}
        onToggleAutoRenew={handleToggleAutoRenew}
      />
      <HuntSelector
        open={huntSelectorOpen}
        initialTab={huntSelectorTab}
        hunts={content.hunts}
        monsters={content.monsters}
        level={leader.level}
        currentHuntId={game.encounter.hunt.id}
        isInCity={mode !== 'hunt'}
        onClose={() => setHuntSelectorOpen(false)}
        onSelect={startSelectedHunt}
        onOpenPartyModal={() => setPartyModalOpen(true)}
        onOpenArena={() => setIsPvPArenaModalOpen(true)}
        onStartTraining={handleStartTraining}
        isPartyLeader={Boolean(multiplayerParty && multiplayerParty.leaderSessionId === gameNetwork.LocalPlayerId && multiplayerParty.members.length > 1)}
        onSelectWithTeam={(huntId, huntName, pullSize) => {
          setHuntSelectorOpen(false);
          const nextSeed = seed.trim() || defaultSeed;
          gameNetwork.sendPartyHuntPropose(huntId, huntName, nextSeed);
          setSaleMessage(`Proposta de caçada em grupo enviada para o time: ${huntName}!`);
        }}
      />
      {hotbarConfigSlot !== null && (
        <HotbarConfigModal
          open={hotbarConfigSlot !== null}
          slotIndex={hotbarConfigSlot}
          character={activeCharacter}
          content={content}
          onClose={() => setHotbarConfigSlot(null)}
          onSave={handleSaveHotbarSlot}
        />
      )}
      <PartyMemberModal
        open={createMemberModalOpen}
        used={game.session.characters.map((character) => character.baseVocation)}
        onClose={() => setCreateMemberModalOpen(false)}
        onCreate={createMember}
      />
      <UnifiedPartyModal
        open={partyModalOpen}
        onClose={() => setPartyModalOpen(false)}
        activeCharacter={activeCharacter}
        accountCharacters={savedPool}
        partyMemberIds={partyMemberIds}
        remoteMembers={
          multiplayerParty
            ? multiplayerParty.members
                .filter((m) => m.sessionId !== gameNetwork.LocalPlayerId)
                .map((m) => ({
                  id: m.sessionId,
                  name: m.name + (m.isLeader ? ' ⭐' : ''),
                  vocation: VOCATION_MAP[m.vocationId] || 'Knight',
                  level: m.level,
                  hp: m.hp,
                  maxHp: m.maxHp,
                  isLeader: m.isLeader,
                  isReady: Boolean((m as any).huntProposalAccepted),
                  outfit: (m as any).outfit,
                }))
            : []
        }
        isPartyLeader={
          !multiplayerParty || multiplayerParty.leaderSessionId === gameNetwork.LocalPlayerId
        }
        currentHuntName={game.encounter?.hunt?.name}
        onSelectActiveCharacter={(id) => selectPartyCharacter(id)}
        onAddAltToParty={(charId) => handleAddToParty(charId)}
        onRemoveAltFromParty={(charId) => handleRemoveFromParty(charId)}
        onInviteRemotePlayer={(name) => handleInviteParty(name)}
        onOpenHuntSelector={() => {
          setHuntSelectorTab('CAÇADAS');
          setHuntSelectorOpen(true);
        }}
        onProposeHuntToTeam={() => {
          if (game.encounter?.hunt) {
            const nextSeed = seed.trim() || defaultSeed;
            gameNetwork.sendPartyHuntPropose(game.encounter.hunt.id, game.encounter.hunt.name, nextSeed);
            setSaleMessage(`Proposta de caçada em grupo enviada para o time: ${game.encounter.hunt.name}!`);
          }
        }}
        onDisbandParty={handleDisbandParty}
        onLeaveParty={() => {
          gameNetwork.sendPartyLeave();
          setMultiplayerParty(null);
          setPartyMemberIds([activeCharacter.id]);
          setSaleMessage('Você saiu da party multiplayer.');
        }}
        onCreateCharacter={createMember}
      />

      {trackedMonstersList.length > 0 && isBestiaryTrackerVisible && (
        <BestiaryTrackerHUD
          monsters={trackedMonstersList}
          killsById={bestiaryKills}
          firstKillAlert={firstKillToast}
          onClose={() => setIsBestiaryTrackerVisible(false)}
          onRemoveMonster={(mId) => {
            if (trackedBestiaryMonsterId && trackedBestiaryMonsterId.toLowerCase() === mId.toLowerCase()) {
              handleTrackMonster(mId);
            }
          }}
          onOpenCyclopedia={() => gameModal.openCyclopedia('bestiary')}
        />
      )}

      {/* Floating Party HUD showing all members when party > 1 */}
      {game.session.characters.length > 1 && (
        <FloatingPartyHUD
          characters={game.session.characters}
          activeCharacterId={activeCharacter.id}
          onSelectActiveCharacter={(id) => selectPartyCharacter(id)}
          onOpenPartyModal={() => setPartyModalOpen(true)}
        />
      )}

      {/* Decoupled Game Modal Host for Outfits, Cyclopedia, and Profile */}
      <GameModalHost
        characters={game.session.characters}
        activeCharacterId={activeCharacter.id}
        onSelectCharacter={(charId) => {
          setGame((cur) => selectCharacter(cur, charId));
        }}
        onSaveOutfit={handleSaveOutfit}
        content={content}
        avatarId={(activeCharacter as any).avatarId ?? 1}
        onSelectAvatar={(newAvatarId) => {
          setGame((cur) => {
            const char = cur.session.characters.find((c) => c.id === activeCharacter.id);
            if (char) {
              (char as any).avatarId = newAvatarId;
            }
            return { ...cur };
          });
          gameNetwork.sendSetAvatar(newAvatarId);
          if (saveProgressRef.current) {
            saveProgressRef.current();
          }
        }}
        gold={game.session.gold}
        bestiaryKills={bestiaryKills}
        trackedMonsterId={trackedBestiaryMonsterId}
        bossPoints={bossPoints}
        onTrackMonster={handleTrackMonster}
        characterName={activeCharacter.name}
        characterVocation={activeCharacter.vocation || 'Knight'}
        character={activeCharacter}
        stats={activeStats}
      />

      <PromotionModal
        open={isPromotionModalOpen}
        character={activeCharacter}
        gold={game.session.gold}
        onClose={() => setIsPromotionModalOpen(false)}
        onPromote={() => handlePromoteCharacter(activeCharacter.id)}
      />

      <DeathModal
        open={isDeathModalOpen}
        report={deathPenaltyReport}
        onConfirm={handleConfirmDeath}
        onCancel={handleConfirmDeath}
      />

      <BlessingsModal
        open={isBlessingsModalOpen}
        character={activeCharacter}
        gold={game.session.gold}
        onClose={() => setIsBlessingsModalOpen(false)}
        onBuyBlessing={handleBuyBlessing}
        onBlessAll={handleBlessAll}
      />

      <HighscoresModal
        open={isHighscoresModalOpen}
        currentCharacterId={activeCharacter?.id}
        onClose={() => setIsHighscoresModalOpen(false)}
      />

      <ArenaPvPModal
        open={isPvPArenaModalOpen}
        currentCharacterId={activeCharacter?.id}
        onClose={() => setIsPvPArenaModalOpen(false)}
        onOpenHighscores={() => setIsHighscoresModalOpen(true)}
        onStartPvPDuel={handleStartPvPDuel}
        onToggleSkull={(nextVal) => {
          setGame((cur) => {
            const updatedChars = cur.session.characters.map((c) =>
              c.id === activeCharacter?.id ? { ...c, displaySkull: nextVal } : c
            );
            return {
              ...cur,
              session: {
                ...cur.session,
                characters: updatedChars,
              },
            };
          });
        }}
      />

      {/* PAINEL CENTRALIZADO DE DEBUG PARA ADMINISTRADORES */}
      <AdminDebugModal
        open={isAdminDebugModalOpen}
        onClose={() => setIsAdminDebugModalOpen(false)}
        isAdmin={isAdmin}
        character={activeCharacter}
        gameNetwork={gameNetwork}
        onForceSave={() => saveProgressRef.current?.(false, true)}
        onReconnect={() => gameNetwork.reconnect()}
      />

      {/* OVERLAY DE RESULTADO DO DUELO PVP */}
      {pvpBannerResult && (
        <div
          style={{
            position: 'fixed',
            top: '75px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 999999,
            padding: '16px 28px',
            borderRadius: '8px',
            backgroundColor: pvpBannerResult.type === 'win' ? 'rgba(20, 83, 45, 0.95)' : 'rgba(127, 29, 29, 0.95)',
            border: `2px solid ${pvpBannerResult.type === 'win' ? '#22c55e' : '#ef4444'}`,
            boxShadow: '0 8px 32px rgba(0,0,0,0.85)',
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            fontFamily: 'Verdana, Arial, sans-serif',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div style={{ fontSize: '20px', fontWeight: 'bold', fontFamily: 'Georgia, serif' }}>
            {pvpBannerResult.type === 'win' ? '🏆 VITÓRIA NA ARENA PVP!' : '💀 DERROTA NA ARENA PVP'}
          </div>
          <div style={{ fontSize: '13px', color: '#fef08a' }}>
            {pvpBannerResult.type === 'win'
              ? `Você derrotou ${pvpBannerResult.opponentName}! +20 Pontos de Rank · +15 Arena Coins`
              : `Você foi derrotado por ${pvpBannerResult.opponentName}. +5 Arena Coins pelo combate.`}
          </div>
          {pvpBannerResult.promotion?.promoted && (
            <div style={{ fontSize: '12px', color: '#4ade80', fontWeight: 'bold', marginTop: '2px' }}>
              🎉 Você avançou para a patente {pvpBannerResult.promotion.newTier?.label}!
            </div>
          )}
          <div style={{ fontSize: '11px', color: '#cbd5e1' }}>
            Retornando ao Templo de Thais...
          </div>
        </div>
      )}

      <FriendsWindow
        friends={effectiveFriendsList}
        allKnownCharacters={[
          ...game.session.characters.map((c) => ({ name: c.name, level: c.level, vocation: c.vocation })),
          ...(remotePlayers
            ? Array.from(remotePlayers.values()).map((r) => ({
                name: r.name,
                level: r.level,
                vocation: VOCATION_MAP[r.vocationId] || 'Knight',
              }))
            : []),
        ]}
        onAddFriend={handleAddFriend}
        onRemoveFriend={handleRemoveFriend}
        onPrivateMessage={handlePrivateMessage}
        onInviteParty={handleInviteParty}
      />

      {receivedPartyInvitation && (
        <PartyInvitationModal
          invitation={receivedPartyInvitation}
          onAccept={() => {
            gameNetwork.sendPartyAccept(receivedPartyInvitation.inviterSessionId);
            setReceivedPartyInvitation(null);
            setSaleMessage(`Você aceitou o convite de party de ${receivedPartyInvitation.inviterName}!`);
          }}
          onReject={() => {
            gameNetwork.sendPartyReject(receivedPartyInvitation.inviterSessionId);
            setReceivedPartyInvitation(null);
            setSaleMessage(`Você recusou o convite de party de ${receivedPartyInvitation.inviterName}.`);
          }}
        />
      )}

      {activeHuntProposal && (
        <GroupHuntApprovalModal
          proposal={activeHuntProposal}
          party={multiplayerParty}
          localSessionId={gameNetwork.LocalPlayerId}
          onAccept={() => {
            gameNetwork.sendPartyAcceptHuntProposal();
          }}
          onReject={() => {
            gameNetwork.sendPartyRejectHuntProposal();
            setActiveHuntProposal(null);
          }}
        />
      )}

      {charContextMenu && (() => {
        const char = game.session.characters.find((c) => c.id === charContextMenu.characterId);
        const remote = !char && remotePlayers ? Array.from(remotePlayers.values()).find((r) => r.id === charContextMenu.characterId) : null;
        const targetName = char?.name || remote?.name || 'Jogador';
        const dummyChar: CharacterState = char || createCharacter(charContextMenu.characterId, targetName, 'Knight', content);
        const isSelf = char?.id === activeCharacter?.id || charContextMenu.characterId === activeCharacter?.id;

        return (
          <CharacterContextMenu
            x={charContextMenu.x}
            y={charContextMenu.y}
            character={dummyChar}
            onSetOutfit={isSelf ? () => gameModal.openOutfit(activeCharacter.id) : undefined}
            onInspect={!isSelf ? () => {
              setInspectPlayerName(dummyChar.name);
              setCharContextMenu(null);
            } : undefined}
            onPrivateMessage={!isSelf ? () => handlePrivateMessage(dummyChar.name) : undefined}
            onAddFriend={!isSelf ? () => handleAddFriend(dummyChar.name) : undefined}
            onClose={() => setCharContextMenu(null)}
          />
        );
      })()}

      <PlayerInspectModal
        isOpen={Boolean(inspectPlayerName)}
        characterName={inspectPlayerName || ''}
        isOnlineLocal={(() => {
          if (!inspectPlayerName) return undefined;
          const target = inspectPlayerName.trim().toLowerCase();
          if (activeCharacter?.name && activeCharacter.name.trim().toLowerCase() === target) return true;
          if (game?.session?.characters?.some((c: any) => c.name && c.name.trim().toLowerCase() === target)) return true;
          if (remotePlayers) {
            for (const r of remotePlayers.values()) {
              if (r.name && r.name.trim().toLowerCase() === target) return true;
            }
          }
          return undefined;
        })()}
        onClose={() => setInspectPlayerName(null)}
        onPrivateMessage={(name) => {
          setInspectPlayerName(null);
          handlePrivateMessage(name);
        }}
      />

      {dummyContextMenu && (
        <TrainingDummyContextMenu
          x={dummyContextMenu.x}
          y={dummyContextMenu.y}
          dummy={dummyContextMenu.dummy}
          onUse={() => {
            const d = dummyContextMenu.dummy;
            setDummyContextMenu(null);
            handleStartTraining(undefined, d);
          }}
          onClose={() => setDummyContextMenu(null)}
        />
      )}

      {pointerDrag && (
        <div className="pointer-drag-ghost" style={{ left: pointerDrag.x, top: pointerDrag.y }} aria-hidden="true">
          <ItemSprite itemId={pointerDrag.itemId} label={pointerDrag.label} />
          <span>{pointerDrag.label}</span>
        </div>
      )}

      {/* Global Item Tooltip & Player Inspection (Highest z-index, always on top) */}
      <GlobalItemTooltip />

      {saveErrorAlert && (
        <div
          role="alert"
          style={{
            position: 'fixed',
            top: '55px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 999999,
            backgroundColor: 'rgba(180, 40, 40, 0.95)',
            color: '#fff',
            padding: '8px 16px',
            borderRadius: '4px',
            border: '1px solid #ff6b6b',
            boxShadow: '0 4px 15px rgba(0,0,0,0.6)',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>⚠️ {saveErrorAlert}</span>
          <button
            type="button"
            onClick={() => setSaveErrorAlert(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '14px',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Phase 104/105: Now Playing Music Track Notification Toast (Slides in from right strictly after loading) */}
      <MusicTrackToast isLoading={initialLoadingActive || Boolean(transitionLoading?.active)} />

      {/* Phase 126: Canonical Tibia Logout & Character Switch Modal */}
      <LogoutConfirmModal
        open={isLogoutModalOpen}
        characterName={activeCharacter.name}
        onSwitchCharacter={handleSwitchCharacter}
        onLogoutGame={handleConfirmLogout}
        onCancel={() => setIsLogoutModalOpen(false)}
      />

      {/* Tibia Auth & Character Selection Modal */}
      {showAuthModal && (
        <TibiaAuthCharacterModal
          onSelectCharacter={handleSelectCharacter}
          onLogout={() => {
            setOnlineAccount(null);
            setOnlineCharacter(null);
            gameNetwork.disconnect();
            assetPreloader.reset();
            void auth.signOut();
          }}
          onGoHome={() => {
            window.location.href = '/';
          }}
        />
      )}

      {/* Phase 99/100/102/111: Authentic Exura 10s Cinematic Loading Screen for Login & Transitions */}
      {(() => {
        const activeHuntId = transitionLoading?.huntId || pendingHuntTransitionRef.current?.huntId;
        const loadingConfig = getLoadingConfigForHunt(activeHuntId);

        const isLoadingActive = initialLoadingActive || Boolean(transitionLoading?.active) || (mode === 'hunt' && !isArenaReady);

        return (
          <ExuraLoadingScreen
            active={isLoadingActive}
            durationMs={transitionLoading?.durationMs ?? 2000}
            message={
              transitionLoading?.message ||
              (mode === 'hunt' && !isArenaReady ? 'Renderizando cenário e monstros...' :
               onlineCharacter ? `Entrando com ${onlineCharacter.name}...` : 'Carregando o mundo de Thais...')
            }
            waitForAssets={initialLoadingActive || (mode === 'hunt' && !isArenaReady)}
            bgImage={loadingConfig.bgImage}
            curiosities={loadingConfig.curiosities}
            onFinish={() => {
              const pending = pendingHuntTransitionRef.current;
              if (pending) {
                pendingHuntTransitionRef.current = null;
                setIsArenaReady(true);
                combatStartedRef.current = false;
                pauseCityBgm();
                setCityPos(pending.entrance.worldPosition);
                gameNetwork.sendSetInHunt(true, pending.huntId);
                gameNetwork.sendTeleport(pending.entrance.worldPosition.x, pending.entrance.worldPosition.y, pending.entrance.worldPosition.z);
                if (multiplayerParty && multiplayerParty.leaderSessionId === gameNetwork.LocalPlayerId) {
                  gameNetwork.sendPartyHuntSync(pending.huntId, pending.nextSeed);
                }
                setSaleMessage(pending.pvpMatch ? `⚔️ Duelo de Arena contra ${pending.pvpMatch.opponent.name} iniciado!` : `Você viajou para ${pending.targetHunt.name}!`);
                lastCombatTimeRef.current = performance.now();

                // Phase 109: Dragon Lair music notification box appears strictly after loading finishes and character is visible!
                if (pending.huntId === 'dragon-lair') {
                  triggerTrackNotification(DRAGONS_PRIDE_TRACK);
                } else {
                  const huntTrack = getTrackForHunt(pending.huntId);
                  if (huntTrack) {
                    triggerTrackNotification(huntTrack);
                  }
                }
              }
              if (initialLoadingActive) {
                setInitialLoadingActive(false);
              }
              if (transitionLoading?.active) {
                setTransitionLoading(null);
              }
              // Phase 105: Music track notification box appears strictly after loading finishes in Thais
              if (!pending && mode === 'training') {
                triggerTrackNotification(THAIS_THEME_TRACK);
              }
            }}
          />
        );
      })()}

      {/* Duplicate Session Error Modal Overlay */}
      {duplicateSessionError && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-slate-900 border-2 border-amber-500/80 rounded-2xl p-6 max-w-md w-full text-center shadow-2xl space-y-4">
            <div className="w-14 h-14 rounded-full bg-amber-500/20 border border-amber-500/60 flex items-center justify-center mx-auto text-amber-400 text-3xl font-bold shadow-inner">
              ⚠️
            </div>
            <h3 className="text-xl font-bold text-amber-300">Conexão Duplicada Detectada</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              {duplicateSessionError}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition-all shadow-lg active:scale-95"
            >
              Recarregar e Entrar Aqui
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
