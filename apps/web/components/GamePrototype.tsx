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
  addPartyMember, advanceCombat, advanceTraining, availableOwnedEquipmentIds, createIdleGame, createCharacter,
  characterCapacity, deriveStats, experienceForLevel, experienceProgress, findEquipment, initialHunts, inventoryWeight, itemLootPreference, leaderOf, leaveHunt, restartHunt, sellAllLoot, sellLootStack, updateItemLootPreference,
  transferItemBetweenContainers, destroyContainerItem, executeQuickSell,
  setCharacterStance, setCharacterTargetDistance,
  unequipSlotToBag, equipItemFromContainer, setActorTarget, removePartyMember,
  PROMOTION_COST, PROMOTION_LEVEL, promoteCharacter, promotedVocationFor, reorderHotbar, selectCharacter,
  selectedCharacterOf, skillProgress, synchronizePartyWithEncounter, trainingSkillFor, transferOwnedEquipment, vocationFor, preferredSellPrice, roleForVocation,
  triggerManualHotbarAction, respawnInTemple, THAIS_TEMPLE_POSITION,
  calculatePlayerSpeed, calculateStepDurationMs, findCityPath, findHuntTravelRoute, THAIS_DOCK_TRAVEL, resolveStairsTransition,
  type CharacterEquipmentSlot, type EquipmentTransferSource, type EquipmentTransferTarget, type GameContent, type TrainableSkill, type LootStack, type CharacterState,
} from '@/packages/domain/src';
import { calculateSessionRates, formatSessionDuration } from '@/packages/presentation/src';
import { BottomDock } from './BottomDock';
import { EquipmentPanel, type StatsDelta } from './EquipmentPanel';
import { InventoryWindow } from './InventoryWindow';
import { DepotWindow } from './DepotWindow';
import { QuickSellWindow } from './QuickSellWindow';
import { HotbarConfigModal } from './HotbarConfigModal';
import { HuntHeader } from './HuntHeader';
import { HuntSelector } from './HuntSelector';
import { IdleHeader } from './IdleHeader';
import { ItemSprite } from './ItemSprite';
import { ItemTooltip } from './ItemTooltip';
import { GlobalItemTooltip } from './GlobalItemTooltip';
import { PartyMemberModal } from './PartyMemberModal';
import { OutfitModal } from './OutfitModal';
import { CharacterContextMenu } from './CharacterContextMenu';
import { PixiArena } from './PixiArena';
import { TrainingArena } from './TrainingArena';
import { ThaisCityArena, type CityOverheadMessage } from './ThaisCityArena';
import { WorldNavigation } from './WorldNavigation';
import { WindowManagerProvider, useWindowManager } from './window/WindowManagerContext';
import { DraggableWindow } from './window/DraggableWindow';
import { WindowDockBar } from './window/WindowDockBar';
import { SkillsWindow } from './SkillsWindow';
import { FriendsWindow, type FriendItem } from './window/FriendsWindow';
import { TradeWindow, type TradeOfferItem } from './window/TradeWindow';
import { ChatWindow, type ChatMessageItem, type ChatWindowHandle } from './chat/ChatWindow';
import { TibiaAuthCharacterModal, type CharacterItem, type AuthAccount } from './auth/TibiaAuthCharacterModal';
import { gameNetwork, type RemotePlayerSnapshot } from '../lib/GameClientNetworkManager';
import thaisCityJson from '@/content/generated/thais-city.json';

const thaisTilesZ7 = thaisCityJson.tiles;
const thaisTilesZ6 = (thaisCityJson as { upperTiles?: typeof thaisCityJson.tiles }).upperTiles ?? [];
const thaisTileMapZ7 = new Map(thaisTilesZ7.map((t) => [`${t.x},${t.y}`, t]));
const thaisTileMapZ6 = new Map(thaisTilesZ6.map((t) => [`${t.x},${t.y}`, t]));
const thaisTileMap = new Map([...thaisTilesZ7, ...thaisTilesZ6].map((t) => [`${t.x},${t.y},${t.z}`, t]));

const equipmentCatalog = equipmentJson as EquipmentCatalog;
const monsterCatalog = monstersJson as MonsterCatalog;
const vocationCatalog = vocationsJson as VocationCatalog;
const starterCatalog = startersJson as StarterLoadoutCatalog;
const content: GameContent = {
  monsters: monsterCatalog.monsters,
  equipment: equipmentCatalog.items,
  vocations: vocationCatalog.vocations,
  starterLoadouts: starterCatalog.loadouts,
  spells: (spellsJson as SpellCatalog).spells,
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

export function GamePrototype() {
  return (
    <WindowManagerProvider>
      <GamePrototypeContent />
    </WindowManagerProvider>
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

function GamePrototypeContent() {
  const [seed, setSeed] = useState(defaultSeed);
  const [game, setGame] = useState(() => createIdleGame(defaultSeed, content));
  const [mode, setMode] = useState<'training' | 'hunt'>('training');
  const [huntSelectorOpen, setHuntSelectorOpen] = useState(false);
  const [partyModalOpen, setPartyModalOpen] = useState(false);
  const [debugGrid, setDebugGrid] = useState(false);
  const [equipmentOpen, setEquipmentOpen] = useState(false);
  const [depotOpen, setDepotOpen] = useState(false);
  const [quickSellOpen, setQuickSellOpen] = useState(false);
  const [equipmentMessage, setEquipmentMessage] = useState('Arraste ou clique em um item para alterar o loadout.');
  const [saleMessage, setSaleMessage] = useState('Itens sem preço comprovado permanecem no pouch.');
  const [promotionMessage, setPromotionMessage] = useState('');
  const [statsDelta, setStatsDelta] = useState<StatsDelta | null>(null);
  const [pointerDrag, setPointerDrag] = useState<PointerDragVisual | null>(null);
  const [confirmSale, setConfirmSale] = useState(false);
  const [levelUpMessage, setLevelUpMessage] = useState<{ text: string; timestamp: number } | null>(null);
  const [skillsModalOpen, setSkillsModalOpen] = useState(false);
  const [cityPos, setCityPos] = useState<{ x: number; y: number; z: number }>(THAIS_TEMPLE_POSITION);
  const [walkingPath, setWalkingPath] = useState<{
    waypoints: Array<{ x: number; y: number; z: number }>;
    destinationName: string;
    onArrive?: () => void;
    currentIndex?: number;
  } | null>(null);
  const [isTrainingAtDummy, setIsTrainingAtDummy] = useState(false);
  const [activeTrainingSkill, setActiveTrainingSkill] = useState<string>('Sword Fighting');
  const [showAuthModal, setShowAuthModal] = useState(true);
  const [onlineAccount, setOnlineAccount] = useState<AuthAccount | null>(null);
  const [onlineCharacter, setOnlineCharacter] = useState<CharacterItem | null>(null);
  const [isConnectedServer, setIsConnectedServer] = useState(false);
  const [remotePlayers, setRemotePlayers] = useState<Map<string, RemotePlayerSnapshot>>(new Map());
  const [outfitModalOpen, setOutfitModalOpen] = useState(false);
  const [outfitModalCharId, setOutfitModalCharId] = useState<string>('');
  const [charContextMenu, setCharContextMenu] = useState<{ x: number; y: number; characterId: string } | null>(null);

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
    try {
      localStorage.setItem('cavebound_friends_v1', JSON.stringify(friendsList));
    } catch {}
  }, [friendsList]);

  const handleAddFriend = useCallback((name: string) => {
    setFriendsList((prev) => {
      if (prev.some((f) => f.name.toLowerCase() === name.toLowerCase())) return prev;
      return [...prev, { id: `friend-${Date.now()}`, name, level: 1, vocation: 'Player', isOnline: true }];
    });
  }, []);

  const handleRemoveFriend = useCallback((name: string) => {
    setFriendsList((prev) => prev.filter((f) => f.name.toLowerCase() !== name.toLowerCase()));
  }, []);

  const handlePrivateMessage = useCallback((name: string) => {
    openWindow('chat');
    bringToFront('chat');
    chatWindowRef.current?.focusInput('local');
  }, [openWindow, bringToFront]);

  const handleInviteParty = useCallback((name: string) => {
    setPartyModalOpen(true);
  }, []);

  // Item Trade System State
  const [tradeSession, setTradeSession] = useState<{
    partnerName: string;
    myOffers: TradeOfferItem[];
    partnerOffers: TradeOfferItem[];
    myAccepted: boolean;
    partnerAccepted: boolean;
  } | null>(null);

  const handleStartTrade = useCallback((partnerName: string) => {
    openWindow('trade');
    bringToFront('trade');
    setTradeSession({
      partnerName,
      myOffers: [],
      partnerOffers: [],
      myAccepted: false,
      partnerAccepted: false,
    });
  }, [openWindow, bringToFront]);

  const handleOfferItem = useCallback((item: EquipmentDefinition) => {
    setTradeSession((prev) => {
      if (!prev) return null;
      const offerId = `offer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      return {
        ...prev,
        myOffers: [...prev.myOffers, { id: offerId, item, amount: 1 }],
        myAccepted: false,
      };
    });
  }, []);

  const handleRemoveOffer = useCallback((offerId: string) => {
    setTradeSession((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        myOffers: prev.myOffers.filter((o) => o.id !== offerId),
        myAccepted: false,
      };
    });
  }, []);

  const handleAcceptTrade = useCallback(() => {
    setTradeSession((prev) => {
      if (!prev) return null;
      const nextMyAccepted = !prev.myAccepted;
      if (nextMyAccepted) {
        setGame((cur) => {
          let updatedLoot = [...cur.session.loot];
          for (const offer of prev.myOffers) {
            const idx = updatedLoot.findIndex((s) => s.itemId === offer.item.id);
            if (idx !== -1) {
              if (updatedLoot[idx].amount > 1) {
                updatedLoot[idx] = { ...updatedLoot[idx], amount: updatedLoot[idx].amount - 1 };
              } else {
                updatedLoot.splice(idx, 1);
              }
            }
          }
          for (const offer of prev.partnerOffers) {
            const existing = updatedLoot.find((s) => s.itemId === offer.item.id);
            if (existing) existing.amount += 1;
            else updatedLoot.push({ itemId: offer.item.id, name: offer.item.name, amount: 1 });
          }
          return { ...cur, session: { ...cur.session, loot: updatedLoot } };
        });
        closeWindow('trade');
        return null;
      }
      return { ...prev, myAccepted: nextMyAccepted };
    });
  }, [closeWindow]);

  const handleCancelTrade = useCallback(() => {
    closeWindow('trade');
    setTradeSession(null);
  }, [closeWindow]);

  useEffect(() => {
    const unsub = gameNetwork.onStateChange((players) => {
      setRemotePlayers(players);
    });

    const unsubChat = gameNetwork.onChatMessage((netMsg) => {
      const ch: 'local' | 'world' = netMsg.channel === 'world' || netMsg.channel === 'global' ? 'world' : 'local';
      setChatMessages((prev) => {
        if (prev.some((m) => m.id === netMsg.id)) return prev;
        return [
          ...prev.slice(-99),
          {
            id: netMsg.id || `net-${Date.now()}-${Math.random()}`,
            senderId: netMsg.senderId,
            senderName: netMsg.senderName,
            channel: ch,
            text: netMsg.text,
            timestamp: netMsg.timestamp || Date.now(),
          },
        ];
      });

      if (mode !== 'hunt') {
        setOverheadMessages((prev) => [
          ...prev.slice(-20),
          {
            id: netMsg.id || `net-${Date.now()}-${Math.random()}`,
            senderName: netMsg.senderName,
            text: netMsg.text,
            channel: ch,
            timestamp: netMsg.timestamp || Date.now(),
          },
        ]);
      }
    });

    return () => {
      unsub();
      unsubChat();
    };
  }, [mode]);

  // Pressing Enter in city opens and focuses directly into Local Chat
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (mode === 'hunt') return;
      if (e.key === 'Enter') {
        const activeTag = (document.activeElement?.tagName || '').toLowerCase();
        if (activeTag === 'input' || activeTag === 'textarea') return;

        e.preventDefault();
        openWindow('chat');
        bringToFront('chat');
        chatWindowRef.current?.focusInput('local');
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [mode, openWindow, bringToFront]);

  const handleSelectCharacter = useCallback((authToken: string, charItem: CharacterItem, acc: AuthAccount) => {
    setOnlineAccount(acc);
    setOnlineCharacter(charItem);
    setShowAuthModal(false);
    const targetX = (charItem as any).posX ?? charItem.positionX ?? 32369;
    const targetY = (charItem as any).posY ?? charItem.positionY ?? 32241;
    const targetZ = (charItem as any).posZ ?? charItem.positionZ ?? 7;
    setCityPos({ x: targetX, y: targetY, z: targetZ });

    // Connect to live Colyseus Server room
    gameNetwork
      .connect(authToken, charItem.id)
      .then(() => {
        setIsConnectedServer(true);
      })
      .catch((err) => {
        console.error('Falha ao conectar ao servidor Colyseus:', err);
      });
  }, []);

  const leader = leaderOf(game);
  const activeCharacter = selectedCharacterOf(game);
  const encounter = game.encounter;
  const activeStats = deriveStats(activeCharacter, content.equipment, vocationFor(content, activeCharacter.vocation));
  const statsById = useMemo(() => new Map(game.session.characters.map((character) => [
    character.id, deriveStats(character, content.equipment, vocationFor(content, character.vocation)),
  ])), [game.session.characters]);

  const mountBonus = activeCharacter.mountActive && activeCharacter.mount && activeCharacter.mount !== 'none' ? 20 : 0;
  const playerSpeed = calculatePlayerSpeed(activeCharacter.level) + mountBonus;
  const baseStepDurationMs = calculateStepDurationMs(playerSpeed);
  // +100 points of speed for players when in the city
  const citySpeedBonus = 100;
  const cityPlayerSpeed = playerSpeed + citySpeedBonus;
  const cityStepDurationMs = calculateStepDurationMs(cityPlayerSpeed);
  const heldDirectionRef = useRef<{ dx: number; dy: number } | null>(null);
  const lastStepTimeRef = useRef(0);

  const handleSendChatMessage = useCallback((text: string, channel: 'local' | 'world') => {
    const msgId = `chat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newMsg: ChatMessageItem = {
      id: msgId,
      senderName: activeCharacter.name,
      channel,
      text,
      timestamp: Date.now(),
    };

    setChatMessages((prev) => [...prev.slice(-99), newMsg]);
    gameNetwork.sendChat(text, channel);

    if (mode !== 'hunt') {
      setOverheadMessages((prev) => [
        ...prev.slice(-20),
        {
          id: msgId,
          senderName: activeCharacter.name,
          text,
          channel,
          timestamp: Date.now(),
        },
      ]);
    }
  }, [activeCharacter.name, mode]);

  const handleOpenOutfitModal = useCallback((characterId?: string) => {
    setOutfitModalCharId(characterId || activeCharacter.id);
    setOutfitModalOpen(true);
    setCharContextMenu(null);
  }, [activeCharacter.id]);

  const handleSaveOutfit = useCallback((characterId: string, customization: {
    outfit: string;
    mount: string;
    mountActive: boolean;
    addons: number;
    outfitColors?: { head: number; primary: number; secondary: number; detail: number };
  }) => {
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
  }, []);

  const handleToggleMount = useCallback((characterId: string) => {
    setGame((cur) => ({
      ...cur,
      session: {
        ...cur.session,
        characters: cur.session.characters.map((char) =>
          char.id === characterId
            ? { ...char, mountActive: !char.mountActive }
            : char
        ),
      },
    }));
  }, []);

  const handleTileClick = useCallback((target: { x: number; y: number; z: number }) => {
    if (mode === 'hunt') return;
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
  }, [cityPos, mode]);

  useEffect(() => {
    const levelUpEvent = encounter.events.find((e) => e.type === 'level-up');
    if (levelUpEvent && 'message' in levelUpEvent && levelUpEvent.message) {
      setLevelUpMessage({ text: levelUpEvent.message, timestamp: Date.now() });
    }
  }, [encounter.events]);

  useEffect(() => {
    if (!levelUpMessage) return;
    const timer = window.setTimeout(() => setLevelUpMessage(null), 4500);
    return () => window.clearTimeout(timer);
  }, [levelUpMessage]);

  useEffect(() => {
    if (mode !== 'hunt' || encounter.status !== 'running') return;
    const timer = window.setInterval(() => setGame((current) => advanceCombat(current, content, 120)), 120);
    return () => window.clearInterval(timer);
  }, [encounter.status, mode, content]);

  useEffect(() => {
    if (mode === 'hunt' && encounter.status === 'running') {
      const timer = window.setTimeout(() => {
        setGame((current) => advanceCombat(current, content, 100));
      }, 50);
      return () => window.clearTimeout(timer);
    }
  }, [mode, encounter.status, content]);

  // When defeated in hunt, resurrect and respawn in Thais Temple (32369, 32241, 7) and walk to plaza
  useEffect(() => {
    if (mode === 'hunt' && encounter.status === 'defeated') {
      const timer = window.setTimeout(() => {
        setGame((current) => respawnInTemple(current));
        setMode('training');
        setIsTrainingAtDummy(false);
        setCityPos(THAIS_TEMPLE_POSITION);
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
        setSaleMessage('Alas! Você morreu, renasceu no Templo de Thais e está caminhando para a praça...');
      }, 1000);
      return () => window.clearTimeout(timer);
    }
  }, [mode, encounter.status]);

  // Advance training at dummy using selected skill
  useEffect(() => {
    if (mode !== 'training') return;
    const skillKey: TrainableSkill =
      activeTrainingSkill === 'Club Fighting' ? 'club' :
      activeTrainingSkill === 'Axe Fighting' ? 'axe' :
      activeTrainingSkill === 'Distance Fighting' ? 'distance' :
      activeTrainingSkill === 'Shielding' ? 'shielding' :
      activeTrainingSkill === 'Magic Level' ? 'magicLevel' : 'sword';
    const timer = window.setInterval(() => setGame((current) => advanceTraining(current, content, 500, skillKey)), 500);
    return () => window.clearInterval(timer);
  }, [mode, activeTrainingSkill]);

  // Autonomous walking loop across coordinates in city with instant start cadence & network sync
  useEffect(() => {
    if (!walkingPath || walkingPath.waypoints.length === 0 || mode === 'hunt') return;
    const timer = window.setInterval(() => {
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
      gameNetwork.sendMove(dir);

      setCityPos((pos) => {
        const stairTarget = resolveStairsTransition(pos, stepX, stepY);
        if (stairTarget) return stairTarget;

        const nextX = pos.x + stepX;
        const nextY = pos.y + stepY;
        const activeTileMap = pos.z === 6 ? thaisTileMapZ6 : thaisTileMapZ7;
        const tile = activeTileMap.get(`${nextX},${nextY}`);
        if (!tile || !tile.walkable) {
          setWalkingPath(null);
          return pos;
        }

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
    }, 16);
    return () => window.clearInterval(timer);
  }, [walkingPath, mode, cityStepDurationMs, cityPos, thaisTileMapZ6, thaisTileMapZ7]);

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

  const startSelectedHunt = (huntId: string) => {
    const targetHunt = content.hunts.find((h) => h.id === huntId) ?? encounter.hunt;
    setHuntSelectorOpen(false);

    // If already in hunt mode, switch directly
    if (mode === 'hunt') {
      const nextSeed = seed.trim() || defaultSeed;
      setGame((current) => restartHunt(current, nextSeed, content, huntId));
      return;
    }

    // In city mode: walk to stairs (z:7 -> z:6) and along the dock to the boat teleporter
    setIsTrainingAtDummy(false);
    const waypoints = findHuntTravelRoute(thaisTileMapZ7, thaisTileMapZ6, cityPos);

    if (waypoints.length === 0) {
      const nextSeed = seed.trim() || defaultSeed;
      setGame((current) => restartHunt(current, nextSeed, content, huntId));
      setMode('hunt');
      return;
    }

    setWalkingPath({
      waypoints,
      destinationName: `Cais do Navio (${targetHunt.name})`,
      currentIndex: 0,
      onArrive: () => {
        const nextSeed = seed.trim() || defaultSeed;
        setGame((current) => restartHunt(current, nextSeed, content, huntId));
        setMode('hunt');
        setSaleMessage(`Você embarcou no navio em Thais e chegou em ${targetHunt.name}!`);
      },
    });

    setSaleMessage(`Caminhando até as escadas do cais para viajar para ${targetHunt.name}...`);
  };
  const exitHunt = () => {
    setGame((current) => respawnInTemple(current));
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
    setSaleMessage('Renasceu no Templo de Thais e caminhando pela cidade...');
  };

  const handleStartTraining = (skillName: string) => {
    setActiveTrainingSkill(skillName);
    setMode('training');
    const dummyPos = { x: 32349, y: 32238, z: 7 };
    setWalkingPath({
      waypoints: [dummyPos],
      destinationName: 'Bonecos de Treino',
      onArrive: () => {
        setIsTrainingAtDummy(true);
        setSaleMessage(`Treinando ${skillName} no dummy (32349, 32238, 7).`);
      },
    });
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
    const charGender = gender === 'Feminino' ? 'female' : 'male';
    try { setGame((current) => synchronizePartyWithEncounter(addPartyMember(current, name, vocation, content, charGender), content)); return null; } catch (error) { return error instanceof Error ? error.message : 'Não foi possível criar o membro.'; }
  };
  const sellLoot = () => setGame((current) => { const result = sellAllLoot(current, content); setSaleMessage(result.goldEarned > 0 ? `Venda concluída: +${result.goldEarned} gold.` : 'Nenhum item vendável.'); return result.state; });
  const sellOneLoot = (itemId: number) => setGame((current) => { const result = sellLootStack(current, content, itemId); setSaleMessage(result.goldEarned > 0 ? `Venda concluída: +${result.goldEarned} gold.` : 'Item protegido ou sem preço comprovado.'); return result.state; });
  const toggleLootPreference = (itemId: number, key: 'autoLoot' | 'lockSell' | 'quickSell') => setGame((current) => updateItemLootPreference(current, itemId, { [key]: !itemLootPreference(current, itemId)[key] }));
  const selectPartyCharacter = (characterId: string) => {
    setGame((current) => selectCharacter(current, characterId));
    setStatsDelta(null); setPromotionMessage('');
  };
  const promoteSelectedCharacter = () => setGame((current) => {
    const selected = selectedCharacterOf(current);
    const result = promoteCharacter(current, selected.id, content);
    setPromotionMessage(result.ok ? `${selected.name} agora é ${promotedVocationFor(selected.baseVocation)}.` : (result.error ?? 'Promoção indisponível.'));
    return result.state;
  });
  const reorderSelectedHotbar = (fromIndex: number, toIndex: number) => setGame((current) => {
    const selected = selectedCharacterOf(current);
    return {
      ...current,
      session: {
        ...current.session,
        characters: current.session.characters.map((character) => character.id === selected.id ? reorderHotbar(character, fromIndex, toIndex) : character),
      },
    };
  });

  const [hotbarConfigSlot, setHotbarConfigSlot] = useState<number | null>(null);

  const handleSaveHotbarSlot = (slotIndex: number, actionId: number | null) => {
    setGame((current) => {
      const activeId = current.session.selectedCharacterId;
      const characters = current.session.characters.map((char) => {
        if (char.id !== activeId) return char;
        const hotbar = [...char.hotbar];
        while (hotbar.length <= slotIndex) hotbar.push(0);
        hotbar[slotIndex] = actionId === null ? 0 : actionId;
        return { ...char, hotbar };
      });
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
      setHotbarConfigSlot(slotIndex);
      return;
    }
    setGame((current) => {
      const next = structuredClone(current);
      const triggered = triggerManualHotbarAction(next, activeCharacter.id, actionId, content);
      return triggered ? next : current;
    });
  }, [activeCharacter.hotbar, activeCharacter.id]);

  const takeCityStep = useCallback((deltaX: number, deltaY: number) => {
    setWalkingPath(null);
    setIsTrainingAtDummy(false);

    const dir = deltaY < 0 ? 'north' : deltaY > 0 ? 'south' : deltaX < 0 ? 'west' : 'east';
    gameNetwork.sendMove(dir);

    setCityPos((current) => {
      const stairTarget = resolveStairsTransition(current, deltaX, deltaY);
      if (stairTarget) return stairTarget;
      const nextX = current.x + deltaX;
      const nextY = current.y + deltaY;
      const activeTileMap = current.z === 6 ? thaisTileMapZ6 : thaisTileMapZ7;
      const tile = activeTileMap.get(`${nextX},${nextY}`);
      if (!tile || !tile.walkable) return current;
      return { x: nextX, y: nextY, z: current.z };
    });
  }, [thaisTileMapZ6, thaisTileMapZ7]);

  // Continuous movement loop while arrow keys or WASD are held, strictly paced at normal speed
  useEffect(() => {
    if (mode === 'hunt') return;
    const interval = window.setInterval(() => {
      if (heldDirectionRef.current) {
        const now = performance.now();
        if (now - lastStepTimeRef.current >= cityStepDurationMs) {
          lastStepTimeRef.current = now;
          takeCityStep(heldDirectionRef.current.dx, heldDirectionRef.current.dy);
        }
      }
    }, 16);
    return () => window.clearInterval(interval);
  }, [mode, cityStepDurationMs, takeCityStep]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      // Manual movement via arrow keys (and WASD) in city mode
      if (mode !== 'hunt') {
        let deltaX = 0;
        let deltaY = 0;
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') deltaY = -1;
        else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') deltaY = 1;
        else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') deltaX = -1;
        else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') deltaX = 1;

        if (deltaX !== 0 || deltaY !== 0) {
          e.preventDefault();
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
  }, [handleManualHotbarAction, mode, takeCityStep]);

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

  return (
    <main className="mmorpg-client fullscreen-mode">
      {/* Background 100% Fullscreen Viewport */}
      <div className="fullscreen-viewport">
        {mode === 'hunt' ? (
          <PixiArena
            game={game}
            debug={debugGrid}
            onSelectTarget={(enemyId) => setGame((cur) => setActorTarget(cur, activeCharacter.id, enemyId))}
            onCharacterContextMenu={(charId, x, y) => setCharContextMenu({ characterId: charId, x, y })}
          />
        ) : (
          <ThaisCityArena
            characters={game.session.characters}
            cityPos={cityPos}
            isWalking={walkingPath !== null}
            isTraining={isTrainingAtDummy}
            stepDurationMs={cityStepDurationMs}
            onTileClick={handleTileClick}
            onCharacterContextMenu={(charId, x, y) => setCharContextMenu({ characterId: charId, x, y })}
            visualEvents={encounter.visualEvents}
            debug={debugGrid}
            remotePlayers={remotePlayers}
            localPlayerId={gameNetwork.LocalPlayerId}
            overheadMessages={overheadMessages}
          />
        )}
        {mode !== 'hunt' && (
          <div className="city-location-hud">
            <div className="city-hud-header">
              <span className="city-tag">CIDADE DE THAIS</span>
              <span className="city-coords">X: {cityPos.x} · Y: {cityPos.y} · Z: {cityPos.z}</span>
            </div>
            <div className="city-hud-status">
              {walkingPath && walkingPath.waypoints[0] ? (
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
        {levelUpMessage && (
          <div className="tibia-advancement-banner" key={levelUpMessage.timestamp}>
            {levelUpMessage.text}
          </div>
        )}
      </div>

      {/* Top HUD Dock Bar */}
      <WindowDockBar
        gold={game.session.gold}
        characterName={activeCharacter.name}
        debug={debugGrid}
        onToggleDebug={() => setDebugGrid((value) => !value)}
        onSelectHunt={() => setHuntSelectorOpen(true)}
        onOpenSkills={() => setSkillsModalOpen((prev) => !prev)}
        onOpenOutfit={() => handleOpenOutfitModal(activeCharacter.id)}
      />

      {/* Window 1: Classic Skills Window (acessada pelo nome do personagem) */}
      <SkillsWindow
        open={skillsModalOpen}
        character={activeCharacter}
        stats={activeStats}
        content={content}
        onClose={() => setSkillsModalOpen(false)}
      />

      {/* Window 3: Party */}
      <DraggableWindow id="party" icon="👥" badge={<small className="window-badge">{game.session.characters.length}/4</small>}>
        <div className="party-cards-list">
          {game.session.characters.map((character) => {
            const actor = encounter.partyActors.find((candidate) => candidate.characterId === character.id);
            const isLeader = character.id === game.session.leaderId;
            const isSelected = character.id === activeCharacter.id;
            const hp = actor?.hp ?? character.currentHp;
            const mana = actor?.mana ?? character.currentMana;
            const hpPct = Math.max(0, Math.min(100, (100 * hp) / character.maxHp));
            const manaPct = character.maxMana > 0 ? Math.max(0, Math.min(100, (100 * mana) / character.maxMana)) : 0;

            return (
              <div
                className={`party-card-item ${isSelected ? 'selected' : ''}`}
                key={character.id}
                onClick={() => selectPartyCharacter(character.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCharContextMenu({ x: e.clientX, y: e.clientY, characterId: character.id });
                }}
                title="Clique esquerdo para focar · Clique direito para Opções / Outfit"
              >
                <div className="party-card-header">
                  <div className="party-card-name-row">
                    <span className="party-card-name">{character.name}</span>
                    {isLeader && <span className="party-card-star" title="Líder da Party">★</span>}
                  </div>
                  <div className="party-card-level-row">
                    <span className="party-card-level">Lv. {character.level}</span>
                    <button
                      type="button"
                      className="party-card-outfit-btn"
                      title="Mudar Outfit / Montaria (Set Outfit)"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenOutfitModal(character.id);
                      }}
                    >
                      🥋
                    </button>
                    {!isLeader && (
                      <button
                        type="button"
                        className="party-card-remove-btn"
                        title="Remover da party"
                        onClick={(e) => {
                          e.stopPropagation();
                          setGame((cur) => removePartyMember(cur, character.id));
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* HP Bar */}
                <div className="party-bar-container hp-bar-bg" title={`HP: ${hp}/${character.maxHp}`}>
                  <div className="party-bar-fill hp-fill" style={{ width: `${hpPct}%` }} />
                </div>

                {/* MP Bar */}
                <div className="party-bar-container mana-bar-bg" title={`MP: ${mana}/${character.maxMana}`}>
                  <div className="party-bar-fill mana-fill" style={{ width: `${manaPct}%` }} />
                </div>

                {/* Stamina Bar */}
                <div className="party-bar-container stamina-bar-bg" title="Stamina: 42:00h">
                  <div className="party-bar-fill stamina-fill" style={{ width: '100%' }} />
                  <span className="party-stamina-caption">42:00h</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="party-window-footer-actions">
          <button
            type="button"
            className="party-add-member-btn"
            onClick={() => setPartyModalOpen(true)}
            disabled={game.session.characters.length >= 4}
          >
            Adicionar membro ({game.session.characters.length}/4)
          </button>
        </div>
      </DraggableWindow>

      {/* Window 5: Metrics & Battle Stats */}
      <DraggableWindow id="metrics" icon="📊">
        <div className="metrics-window-content">
          <div style={{ marginBottom: '8px' }}>
            <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#c5a046', marginBottom: '4px' }}>DANO DE COMBATE</div>
            <ValueRow label="DPS Médio" value={`${metrics.approximateDps.toFixed(1)}`} />
            <ValueRow label="Dano Causado" value={metrics.damageDealt.toLocaleString('pt-BR')} />
            <ValueRow label="Dano Recebido" value={metrics.damageTaken.toLocaleString('pt-BR')} />
          </div>
          <div style={{ paddingTop: '6px', borderTop: '1px solid #333a34' }}>
            <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#c5a046', marginBottom: '4px' }}>PROGRESSÃO DA SESSÃO</div>
            <ValueRow label="Tempo" value={formatSessionDuration(metrics.elapsedMs)} />
            <ValueRow label="XP Ganho" value={metrics.xpGained.toLocaleString('pt-BR')} />
            <ValueRow label="Taxa de XP" value={`${metrics.xpPerHour.toLocaleString('pt-BR')}/h`} />
            <ValueRow label="Abates" value={metrics.kills} />
            <ValueRow label="Loot Coletado" value={metrics.lootGained} />
            <ValueRow label="Salas Alcançadas" value={encounter.room.number} />
          </div>
        </div>
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
                <time style={{ color: '#889088' }}>#{entry.round.toString().padStart(2, '0')}</time>
                <span style={{ color: '#d5ded6' }}>{entry.message}</span>
              </li>
            ))}
          </ol>
        </div>
      </DraggableWindow>

      {/* Window 7: Tibia 11 Chat Window */}
      <DraggableWindow id="chat" icon="💬">
        <ChatWindow
          ref={chatWindowRef}
          messages={chatMessages}
          onSendMessage={handleSendChatMessage}
          characterName={activeCharacter.name}
        />
      </DraggableWindow>

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
        onChangeStance={(stance) => setGame((cur) => setCharacterStance(cur, activeCharacter.id, stance))}
        onChangeTargetDistance={(dist) => setGame((cur) => setCharacterTargetDistance(cur, activeCharacter.id, dist))}
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
      <HuntSelector
        open={huntSelectorOpen}
        hunts={content.hunts}
        monsters={content.monsters}
        level={leader.level}
        currentHuntId={game.encounter.hunt.id}
        isInCity={mode !== 'hunt'}
        onClose={() => setHuntSelectorOpen(false)}
        onSelect={startSelectedHunt}
        onOpenPartyModal={() => setPartyModalOpen(true)}
        onStartTraining={handleStartTraining}
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
        open={partyModalOpen}
        used={game.session.characters.map((character) => character.baseVocation)}
        onClose={() => setPartyModalOpen(false)}
        onCreate={createMember}
      />

      {outfitModalOpen && (
        <OutfitModal
          open={outfitModalOpen}
          characters={game.session.characters}
          activeCharacterId={outfitModalCharId || activeCharacter.id}
          onClose={() => setOutfitModalOpen(false)}
          onSave={handleSaveOutfit}
        />
      )}

      <FriendsWindow
        friends={friendsList}
        allKnownCharacters={game.session.characters.map((c) => ({ name: c.name, level: c.level, vocation: c.vocation }))}
        onAddFriend={handleAddFriend}
        onRemoveFriend={handleRemoveFriend}
        onPrivateMessage={handlePrivateMessage}
        onInviteParty={handleInviteParty}
      />

      {tradeSession && (
        <TradeWindow
          partnerName={tradeSession.partnerName}
          myOffers={tradeSession.myOffers}
          partnerOffers={tradeSession.partnerOffers}
          availableInventoryItems={availableOwnedEquipmentIds(game).flatMap((id) => { const item = findEquipment(content.equipment, id); return item ? [item] : []; })}
          myAccepted={tradeSession.myAccepted}
          partnerAccepted={tradeSession.partnerAccepted}
          onOfferItem={handleOfferItem}
          onRemoveOffer={handleRemoveOffer}
          onAcceptTrade={handleAcceptTrade}
          onCancelTrade={handleCancelTrade}
        />
      )}

      {charContextMenu && (() => {
        const char = game.session.characters.find((c) => c.id === charContextMenu.characterId);
        const remote = !char && remotePlayers ? Array.from(remotePlayers.values()).find((r) => r.id === charContextMenu.characterId) : null;
        const targetName = char?.name || remote?.name || 'Jogador';
        const dummyChar: CharacterState = char || createCharacter(charContextMenu.characterId, targetName, 'Knight', content);

        return (
          <CharacterContextMenu
            x={charContextMenu.x}
            y={charContextMenu.y}
            character={dummyChar}
            onSetOutfit={() => {
              setOutfitModalCharId(dummyChar.id);
              setOutfitModalOpen(true);
            }}
            onToggleMount={() => handleToggleMount(dummyChar.id)}
            onTrade={() => handleStartTrade(dummyChar.name)}
            onInviteParty={() => handleInviteParty(dummyChar.name)}
            onPrivateMessage={() => handlePrivateMessage(dummyChar.name)}
            onAddFriend={() => handleAddFriend(dummyChar.name)}
            onClose={() => setCharContextMenu(null)}
          />
        );
      })()}

      {pointerDrag && (
        <div className="pointer-drag-ghost" style={{ left: pointerDrag.x, top: pointerDrag.y }} aria-hidden="true">
          <ItemSprite itemId={pointerDrag.itemId} label={pointerDrag.label} />
          <span>{pointerDrag.label}</span>
        </div>
      )}

      {/* Global Item Tooltip & Player Inspection (Highest z-index, always on top) */}
      <GlobalItemTooltip />

      {/* Tibia Auth & Character Selection Modal */}
      {showAuthModal && (
        <TibiaAuthCharacterModal onSelectCharacter={handleSelectCharacter} />
      )}
    </main>
  );
}
