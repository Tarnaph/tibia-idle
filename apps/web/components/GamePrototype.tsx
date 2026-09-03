'use client';

import { useCallback, useEffect, useMemo, useState, type PointerEvent as ReactPointerEvent } from 'react';
import economyJson from '@/content/generated/item-economy.json';
import equipmentJson from '@/content/generated/equipment.json';
import monstersJson from '@/content/generated/monsters.json';
import startersJson from '@/content/generated/starter-loadouts.json';
import vocationsJson from '@/content/generated/vocations.json';
import spellsJson from '@/content/generated/spells.json';
import huntRegionsJson from '@/content/generated/hunt-regions.json';
import type { BaseVocationName, EquipmentCatalog, HuntRegionCatalog, ItemEconomyCatalog, MonsterCatalog, SpellCatalog, StarterLoadoutCatalog, VocationCatalog } from '@/packages/content-schema/src';
import {
  addPartyMember, advanceCombat, advanceTraining, availableOwnedEquipmentIds, createIdleGame,
  characterCapacity, deriveStats, experienceForLevel, experienceProgress, findEquipment, initialHunts, inventoryWeight, itemLootPreference, leaderOf, leaveHunt, restartHunt, sellAllLoot, sellLootStack, updateItemLootPreference,
  transferItemBetweenContainers, destroyContainerItem, executeQuickSell,
  setCharacterStance, setCharacterTargetDistance,
  unequipSlotToBag, equipItemFromContainer, setActorTarget, removePartyMember,
  PROMOTION_COST, PROMOTION_LEVEL, promoteCharacter, promotedVocationFor, reorderHotbar, selectCharacter,
  selectedCharacterOf, skillProgress, synchronizePartyWithEncounter, trainingSkillFor, transferOwnedEquipment, vocationFor, preferredSellPrice, roleForVocation,
  triggerManualHotbarAction,
  type CharacterEquipmentSlot, type EquipmentTransferSource, type EquipmentTransferTarget, type GameContent, type TrainableSkill, type LootStack,
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
import { PartyMemberModal } from './PartyMemberModal';
import { PixiArena } from './PixiArena';
import { TrainingArena } from './TrainingArena';
import { WorldNavigation } from './WorldNavigation';
import { WindowManagerProvider } from './window/WindowManagerContext';
import { DraggableWindow } from './window/DraggableWindow';
import { WindowDockBar } from './window/WindowDockBar';

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

  const leader = leaderOf(game);
  const activeCharacter = selectedCharacterOf(game);
  const encounter = game.encounter;
  const activeStats = deriveStats(activeCharacter, content.equipment, vocationFor(content, activeCharacter.vocation));
  const statsById = useMemo(() => new Map(game.session.characters.map((character) => [
    character.id, deriveStats(character, content.equipment, vocationFor(content, character.vocation)),
  ])), [game.session.characters]);

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
  }, [encounter.status, mode]);

  useEffect(() => {
    if (mode !== 'training') return;
    const timer = window.setInterval(() => setGame((current) => advanceTraining(current, content, 500)), 500);
    return () => window.clearInterval(timer);
  }, [mode]);

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
    if (mode === 'hunt' && encounter.status === 'running' && encounter.hunt.id !== huntId
      && !window.confirm(`Sair de ${encounter.hunt.name} e entrar em ${content.hunts.find((hunt) => hunt.id === huntId)?.name ?? 'outra hunt'}?`)) return;
    const nextSeed = seed.trim() || defaultSeed;
    setGame((current) => restartHunt(current, nextSeed, content, huntId));
    setMode('hunt'); setHuntSelectorOpen(false);
  };
  const exitHunt = () => { setGame((current) => leaveHunt(current)); setMode('training'); setHuntSelectorOpen(false); };
  const beginOrRestart = () => {
    if (mode === 'training') { setHuntSelectorOpen(true); return; }
    startSelectedHunt(encounter.hunt.id);
  };
  const resetPrototype = () => {
    const nextSeed = seed.trim() || defaultSeed;
    setGame(createIdleGame(nextSeed, content)); setMode('training'); setSaleMessage('Protótipo restaurado.'); setStatsDelta(null);
  };
  const createMember = (name: string, vocation: BaseVocationName): string | null => {
    try { setGame((current) => synchronizePartyWithEncounter(addPartyMember(current, name, vocation, content), content)); return null; } catch (error) { return error instanceof Error ? error.message : 'Não foi possível criar o membro.'; }
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

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
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleManualHotbarAction]);

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
          />
        ) : (
          <TrainingArena members={trainingMembers} visualEvents={encounter.visualEvents} debug={debugGrid} />
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
      />

      {/* Window 1: Character & Skills */}
      <DraggableWindow id="character" icon="👤" badge={<small className="window-badge">Lv {activeCharacter.level}</small>}>
        <div className="character-tabs" role="tablist" aria-label="Selecionar personagem para skills">
          {game.session.characters.map((candidate) => (
            <button
              type="button"
              role="tab"
              aria-selected={candidate.id === activeCharacter.id}
              className={candidate.id === activeCharacter.id ? 'selected' : ''}
              key={candidate.id}
              onClick={() => selectPartyCharacter(candidate.id)}
            >
              {candidate.name}
            </button>
          ))}
        </div>
        <div className="selected-character-summary">
          <span><strong>{activeCharacter.name}</strong><small>{activeCharacter.vocation} · Lv {activeCharacter.level} · {activeStats.weaponName}</small></span>
          <span className="selected-stats"><b>ATK {activeStats.attack}</b><b>DEF {activeStats.defense}</b><b>ARM {activeStats.armor}</b></span>
        </div>
        <div className="resource-line">
          <span>HP</span>
          <div className="compact-meter"><i className="hp-fill" style={{ width: `${100 * (currentActor?.hp ?? activeCharacter.currentHp) / activeCharacter.maxHp}%` }} /></div>
          <b>{currentActor?.hp ?? activeCharacter.currentHp}/{activeCharacter.maxHp}</b>
        </div>
        {activeCharacter.maxMana > 0 && (
          <div className="resource-line">
            <span>MP</span>
            <div className="compact-meter"><i className="mana-fill" style={{ width: `${100 * (currentActor?.mana ?? activeCharacter.currentMana) / activeCharacter.maxMana}%` }} /></div>
            <b>{currentActor?.mana ?? activeCharacter.currentMana}/{activeCharacter.maxMana}</b>
          </div>
        )}
        <div className="resource-line">
          <span>XP</span>
          <div className="compact-meter"><i className="xp-fill" style={{ width: `${xpProgressById.get(activeCharacter.id) ?? 0}%` }} /></div>
          <b>{Math.round(xpProgressById.get(activeCharacter.id) ?? 0)}%</b>
        </div>
        <div className="xp-caption">
          {activeCharacter.experience.toLocaleString('pt-BR')} / {experienceForLevel(activeCharacter.level + 1).toLocaleString('pt-BR')}
        </div>

        {statsDelta && (
          <div className="stat-change-summary" aria-live="polite">
            Loadout: ATK {statsDelta.attack.from}→{statsDelta.attack.to} · DEF {statsDelta.defense.from}→{statsDelta.defense.to} · ARM {statsDelta.armor.from}→{statsDelta.armor.to}
          </div>
        )}

        <div className="skill-list">
          {skillsList.map(([name, level, progress]) => (
            <div className="skill-item" key={name}>
              <div className="skill-meta"><span>{name}</span><b>{level}</b></div>
              <div className="skill-meter"><i className="skill-meter-fill" style={{ width: `${Math.round(progress * 100)}%` }} /></div>
            </div>
          ))}
        </div>

        {!activeCharacter.promotion && (
          <div className="promotion-action">
            <button
              type="button"
              disabled={activeCharacter.level < PROMOTION_LEVEL || game.session.gold < PROMOTION_COST}
              onClick={promoteSelectedCharacter}
              title={activeCharacter.level < PROMOTION_LEVEL ? `Requer nível ${PROMOTION_LEVEL}` : game.session.gold < PROMOTION_COST ? `Requer ${PROMOTION_COST} gold` : `Promover para ${promotedVocationFor(activeCharacter.baseVocation)}`}
            >
              Promover ({PROMOTION_COST} gold)
            </button>
            {promotionMessage && <small className="promotion-message">{promotionMessage}</small>}
          </div>
        )}
      </DraggableWindow>

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
              >
                <div className="party-card-header">
                  <div className="party-card-name-row">
                    <span className="party-card-name">{character.name}</span>
                    {isLeader && <span className="party-card-star" title="Líder da Party">★</span>}
                  </div>
                  <div className="party-card-level-row">
                    <span className="party-card-level">Lv. {character.level}</span>
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

      {/* Window 4: Hunt & Navigation */}
      <DraggableWindow id="hunt" icon="🗺️">
        <div className="window-hunt-nav">
          <WorldNavigation mode={mode} onTraining={() => setMode('training')} onHunts={() => setHuntSelectorOpen(true)} />
          {mode === 'hunt' ? (
            <HuntHeader
              encounter={encounter}
              elapsedMs={encounter.elapsedMs}
              aliveEnemies={encounter.enemies.filter((enemy) => enemy.alive).length}
              onExit={exitHunt}
            />
          ) : (
            <IdleHeader
              activeSkill={activeStats.activeSkill}
              activeSkillLevel={activeStats.activeSkillLevel}
              previousResult={encounter.status === 'running' ? 'ready' : encounter.status}
            />
          )}
          <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
            <button
              type="button"
              className="primary-button"
              style={{ flex: 1, padding: '6px', fontSize: '10px' }}
              onClick={beginOrRestart}
            >
              {mode === 'hunt' ? (encounter.status === 'running' ? 'Reiniciar Caçada' : 'Entrar na Caçada') : 'Selecionar Caçada'}
            </button>
            <button
              type="button"
              className="dock-action-btn"
              onClick={resetPrototype}
              title="Resetar estado do protótipo"
            >
              Resetar
            </button>
          </div>
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

      {/* Persistent Bottom Battle & Action Console HUD matching reference screenshot */}
      <BottomDock
        logs={encounter.log}
        seed={seed}
        status={encounter.status}
        character={activeCharacter}
        actor={currentActor}
        spells={content.spells}
        elapsedMs={encounter.elapsedMs}
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
        onClose={() => setHuntSelectorOpen(false)}
        onSelect={startSelectedHunt}
        onOpenPartyModal={() => setPartyModalOpen(true)}
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

      {pointerDrag && (
        <div className="pointer-drag-ghost" style={{ left: pointerDrag.x, top: pointerDrag.y }} aria-hidden="true">
          <ItemSprite itemId={pointerDrag.itemId} label={pointerDrag.label} />
          <span>{pointerDrag.label}</span>
        </div>
      )}
    </main>
  );
}
