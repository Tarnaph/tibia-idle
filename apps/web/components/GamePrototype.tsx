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
  PROMOTION_COST, PROMOTION_LEVEL, promoteCharacter, promotedVocationFor, reorderHotbar, selectCharacter,
  selectedCharacterOf, skillProgress, synchronizePartyWithEncounter, trainingSkillFor, transferOwnedEquipment, vocationFor,
  type CharacterEquipmentSlot, type EquipmentTransferSource, type EquipmentTransferTarget, type GameContent, type TrainableSkill,
} from '@/packages/domain/src';
import { calculateSessionRates } from '@/packages/presentation/src';
import { BottomDock } from './BottomDock';
import { EquipmentPanel, type StatsDelta } from './EquipmentPanel';
import { HuntHeader } from './HuntHeader';
import { HuntSelector } from './HuntSelector';
import { IdleHeader } from './IdleHeader';
import { ItemSprite } from './ItemSprite';
import { LeftSidebar } from './LeftSidebar';
import { PartyMemberModal } from './PartyMemberModal';
import { PixiArena } from './PixiArena';
import { RightSidebar } from './RightSidebar';
import { TopNavigation } from './TopNavigation';
import { TrainingArena } from './TrainingArena';
import { WorldNavigation } from './WorldNavigation';

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

export function GamePrototype() {
  const [seed, setSeed] = useState(defaultSeed);
  const [game, setGame] = useState(() => createIdleGame(defaultSeed, content));
  const [mode, setMode] = useState<'training' | 'hunt'>('training');
  const [huntSelectorOpen, setHuntSelectorOpen] = useState(false);
  const [partyModalOpen, setPartyModalOpen] = useState(false);
  const [debugGrid, setDebugGrid] = useState(false);
  const [equipmentOpen, setEquipmentOpen] = useState(false);
  const [leftMobileOpen, setLeftMobileOpen] = useState(false);
  const [rightMobileOpen, setRightMobileOpen] = useState(false);
  const [equipmentMessage, setEquipmentMessage] = useState('Arraste ou clique em um item para alterar o loadout.');
  const [saleMessage, setSaleMessage] = useState('Itens sem preço comprovado permanecem no pouch.');
  const [promotionMessage, setPromotionMessage] = useState('');
  const [statsDelta, setStatsDelta] = useState<StatsDelta | null>(null);
  const [pointerDrag, setPointerDrag] = useState<PointerDragVisual | null>(null);
  const [clockNow, setClockNow] = useState(0);

  const leader = leaderOf(game);
  const activeCharacter = selectedCharacterOf(game);
  const encounter = game.encounter;
  const activeStats = deriveStats(activeCharacter, content.equipment, vocationFor(content, activeCharacter.vocation));
  const statsById = useMemo(() => new Map(game.session.characters.map((character) => [
    character.id, deriveStats(character, content.equipment, vocationFor(content, character.vocation)),
  ])), [game.session.characters]);

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
    const firstFrame = window.requestAnimationFrame(() => setClockNow(Date.now()));
    const timer = window.setInterval(() => setClockNow(Date.now()), 1000);
    return () => { window.cancelAnimationFrame(firstFrame); window.clearInterval(timer); };
  }, []);
  useEffect(() => { if (!statsDelta) return; const timer = window.setTimeout(() => setStatsDelta(null), 1800); return () => window.clearTimeout(timer); }, [statsDelta]);

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

  return (
    <main className="mmorpg-client">
      <TopNavigation characterName={activeCharacter.name} gold={game.session.gold} debug={debugGrid} onEquipment={() => setEquipmentOpen(true)} onToggleDebug={() => setDebugGrid((value) => !value)} onToggleLeftSidebar={() => setLeftMobileOpen((value) => !value)} onToggleRightSidebar={() => setRightMobileOpen((value) => !value)} />
      <div className="client-workspace">
        <LeftSidebar character={activeCharacter} characters={game.session.characters} actor={encounter.partyActors.find((actor) => actor.characterId === activeCharacter.id)} skillProgress={selectedSkillProgress} stats={activeStats} statsDelta={statsDelta} xpToNext={experienceForLevel(activeCharacter.level + 1)} xpProgress={xpProgressById.get(activeCharacter.id) ?? 0} metrics={metrics} mobileOpen={leftMobileOpen} gold={game.session.gold} promotionName={promotedVocationFor(activeCharacter.baseVocation)} canPromote={!activeCharacter.promotion && activeCharacter.level >= PROMOTION_LEVEL && game.session.gold >= PROMOTION_COST} promotionMessage={promotionMessage} onSelectCharacter={selectPartyCharacter} onPromote={promoteSelectedCharacter} onMobileClose={() => setLeftMobileOpen(false)} />
        <section className="client-center">
          {mode === 'hunt' ? <HuntHeader encounter={encounter} elapsedMs={encounter.elapsedMs} aliveEnemies={encounter.enemies.filter((enemy) => enemy.alive).length} onExit={exitHunt} /> : <IdleHeader activeSkill={activeStats.activeSkill} activeSkillLevel={activeStats.activeSkillLevel} previousResult={encounter.status === 'running' ? 'ready' : encounter.status} />}
          <div className="game-viewport">
            <WorldNavigation mode={mode} onTraining={() => setMode('training')} onHunts={() => setHuntSelectorOpen(true)} />
            {mode === 'hunt' ? <PixiArena game={game} debug={debugGrid} /> : <TrainingArena members={trainingMembers} visualEvents={encounter.visualEvents} debug={debugGrid} />}
          </div>
          <BottomDock logs={encounter.log} seed={seed} status={encounter.status} character={activeCharacter} actor={encounter.partyActors.find((actor) => actor.characterId === activeCharacter.id)} spells={content.spells} elapsedMs={encounter.elapsedMs} onSeed={setSeed} onBegin={beginOrRestart} onReset={resetPrototype} onReorderSpell={reorderSelectedHotbar} />
        </section>
        <RightSidebar characters={game.session.characters} actors={encounter.partyActors} statsById={statsById} xpProgressById={xpProgressById} selectedCharacterId={activeCharacter.id} onSelectCharacter={selectPartyCharacter} inventoryEquipment={inventoryEquipment} loot={game.session.loot} economy={content.economy} preferences={game.session.itemLootPreferences} equipmentMessage={equipmentMessage} saleMessage={saleMessage} onEquipment={() => setEquipmentOpen(true)} onAddMember={() => setPartyModalOpen(true)} onSellAll={sellLoot} onSellOne={sellOneLoot} onTogglePreference={toggleLootPreference} onTransfer={applyEquipmentTransfer} onPointerDragStart={beginPointerEquipmentDrag} mobileOpen={rightMobileOpen} onMobileClose={() => setRightMobileOpen(false)} />
      </div>
      <EquipmentPanel open={equipmentOpen} character={activeCharacter} catalog={content.equipment} inventory={inventoryEquipment} currentWeight={inventoryWeight(activeCharacter, content.equipment)} capacity={characterCapacity(activeCharacter, content)} gold={game.session.gold} stats={activeStats} statsDelta={statsDelta} message={equipmentMessage} disabled={false} onClose={() => setEquipmentOpen(false)} onTransfer={applyEquipmentTransfer} onPointerDragStart={beginPointerEquipmentDrag} />
      <HuntSelector open={huntSelectorOpen} hunts={content.hunts} monsters={content.monsters} level={leader.level} onClose={() => setHuntSelectorOpen(false)} onSelect={startSelectedHunt} />
      <PartyMemberModal open={partyModalOpen} used={game.session.characters.map((character) => character.baseVocation)} onClose={() => setPartyModalOpen(false)} onCreate={createMember} />
      {pointerDrag && <div className="pointer-drag-ghost" style={{ left: pointerDrag.x, top: pointerDrag.y }} aria-hidden="true"><ItemSprite itemId={pointerDrag.itemId} label={pointerDrag.label} /><span>{pointerDrag.label}</span></div>}
      <span className="prototype-clock" aria-hidden="true">{new Date(clockNow).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
    </main>
  );
}
