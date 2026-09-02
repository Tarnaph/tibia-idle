'use client';

import { useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { EquipmentDefinition, ItemEconomyCatalog } from '@/packages/content-schema/src';
import type {
  CharacterState, DerivedStats, EquipmentTransferSource, EquipmentTransferTarget,
  ItemLootPreference, LootStack, PartyActorState,
} from '@/packages/domain/src';
import { preferredSellPrice, roleForVocation } from '@/packages/domain/src';
import { ClientPanel } from './ClientPanel';
import { ItemSprite } from './ItemSprite';

interface RightSidebarProps {
  characters: CharacterState[]; actors: PartyActorState[]; statsById: Map<string, DerivedStats>; xpProgressById: Map<string, number>;
  inventoryEquipment: EquipmentDefinition[]; loot: LootStack[]; economy: ItemEconomyCatalog;
  equipmentMessage: string; saleMessage: string; onEquipment(): void; onAddMember(): void; onSellAll(): void;
  selectedCharacterId: string; onSelectCharacter(characterId: string): void;
  preferences: Record<string, ItemLootPreference>; onSellOne(itemId: number): void; onTogglePreference(itemId: number, key: 'autoLoot' | 'lockSell' | 'quickSell'): void;
  onTransfer(source: EquipmentTransferSource, target: EquipmentTransferTarget): void;
  onPointerDragStart(source: EquipmentTransferSource, event: ReactPointerEvent<HTMLElement>): void;
  mobileOpen: boolean; onMobileClose(): void;
}

function equipmentTooltip(item: EquipmentDefinition): string[] {
  return [item.attack > 0 ? `Attack: ${item.attack}` : '', item.defense > 0 ? `Defense: ${item.defense}${item.extraDefense ? ` +${item.extraDefense}` : ''}` : '', item.armor > 0 ? `Armor: ${item.armor}` : '', item.weight ? `Weight: ${item.weight.ounces.toFixed(2)} oz` : 'Weight: unavailable'].filter(Boolean);
}

export function RightSidebar(props: RightSidebarProps) {
  const { characters, actors, statsById, xpProgressById, inventoryEquipment, loot, economy, preferences, equipmentMessage, saleMessage, onEquipment, onAddMember, onSellAll, onSellOne, onTogglePreference, selectedCharacterId, onSelectCharacter, onTransfer, onPointerDragStart, mobileOpen, onMobileClose } = props;
  const [confirmSale, setConfirmSale] = useState(false);
  const [menu, setMenu] = useState<{ x: number; y: number; stack: LootStack } | null>(null);
  const lootTotal = loot.reduce((total, stack) => total + stack.amount, 0);
  const prices = new Map(economy.items.map((item) => [item.itemId, preferredSellPrice(item)?.price ?? null]));
  const sellableValue = loot.reduce((total, stack) => total + (stack.itemId === undefined ? 0 : (prices.get(stack.itemId) ?? 0) * stack.amount), 0);
  return (
    <aside className={`client-sidebar right-sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      <button type="button" className="sidebar-mobile-close" onClick={onMobileClose}>Fechar backpack ×</button>
      <ClientPanel title="Party" meta={`${characters.length}/4`} className="party-module">
        <div className="party-list">
          {characters.map((character) => {
            const actor = actors.find((candidate) => candidate.characterId === character.id);
            const stats = statsById.get(character.id);
            const hp = actor?.hp ?? character.currentHp;
            const mana = actor?.mana ?? character.currentMana;
            return (
              <button type="button" className={`party-member ${selectedCharacterId === character.id ? 'selected' : ''}`} aria-pressed={selectedCharacterId === character.id} key={character.id} onClick={() => onSelectCharacter(character.id)}>
                <span className={`role-badge role-${roleForVocation(character.vocation).toLowerCase()}`}>{roleForVocation(character.vocation)}</span>
                <span className="party-member-name"><strong>{character.name}</strong><small>{character.vocation} · Lv {character.level}</small></span>
                <div className="party-resource"><span>HP</span><div className="compact-meter"><i className="hp-fill" style={{ width: `${100 * hp / character.maxHp}%` }} /></div><b>{Math.round(100 * hp / character.maxHp)}%</b></div>
                {character.maxMana > 0 && <div className="party-resource"><span>MP</span><div className="compact-meter"><i className="mana-fill" style={{ width: `${100 * mana / character.maxMana}%` }} /></div><b>{mana}</b></div>}
                <div className="party-resource"><span>XP</span><div className="compact-meter"><i className="xp-fill" style={{ width: `${xpProgressById.get(character.id) ?? 0}%` }} /></div><b>{Math.round(xpProgressById.get(character.id) ?? 0)}%</b></div>
                {stats && <div className="party-combat-stats"><span>ATK <b>{stats.attack}</b></span><span>DEF <b>{stats.defense}</b></span><span>ARM <b>{stats.armor}</b></span></div>}
              </button>
            );
          })}
        </div>
        <button type="button" className="add-party-member" onClick={onAddMember} disabled={characters.length >= 4}>+ Adicionar membro</button>
      </ClientPanel>

      <ClientPanel title="Backpack" meta={`${inventoryEquipment.length} slots`} className="backpack-module">
        <div className="backpack-toolbar"><small>Equipamentos de desenvolvimento</small><button type="button" onClick={onEquipment}>Equipamento</button></div>
        <div className="inventory-grid equipment-inventory-grid" data-equipment-drop="inventory">
          {inventoryEquipment.map((item) => <button type="button" key={item.id} className="inventory-cell" onPointerDown={(event) => onPointerDragStart({ kind: 'inventory', itemId: item.id }, event)} onClick={() => onTransfer({ kind: 'inventory', itemId: item.id }, { kind: 'auto-slot' })} aria-label={`Equipar ${item.name}`}><ItemSprite itemId={item.id} label={item.name} /><span className="item-tooltip" role="tooltip"><strong>{item.name}</strong>{equipmentTooltip(item).map((line) => <small key={line}>{line}</small>)}</span></button>)}
          {Array.from({ length: Math.max(0, 15 - inventoryEquipment.length) }, (_, index) => <span className="inventory-cell empty" key={`empty-${index}`} />)}
        </div>
        <p className="equipment-message">{equipmentMessage}</p>
      </ClientPanel>

      <ClientPanel title="Loot Pouch" meta={`${lootTotal} un.`} className="loot-module">
        <div className="loot-toolbar"><span>Valor vendável <b>{sellableValue} gold</b></span>{loot.length > 0 && <button type="button" className={confirmSale ? 'confirming' : ''} disabled={sellableValue <= 0} onClick={() => { if (!confirmSale) setConfirmSale(true); else { onSellAll(); setConfirmSale(false); } }}>{confirmSale ? `Confirmar +${sellableValue}` : 'Vender tudo'}</button>}</div>
        {loot.length === 0 ? <div className="module-empty"><span>◇</span><small>Nenhum drop acumulado.</small></div> : <div className="inventory-grid loot-grid">{loot.map((stack) => {
          const price = stack.itemId === undefined ? null : prices.get(stack.itemId) ?? null;
          const preference = stack.itemId === undefined ? null : preferences[String(stack.itemId)] ?? { itemId: stack.itemId, autoLoot: true, lockSell: false, quickSell: false };
          return <div onContextMenu={(event) => { event.preventDefault(); setMenu({ x: event.clientX, y: event.clientY, stack }); }} className={`inventory-cell loot-cell ${price === null ? 'unsellable' : ''} ${preference?.lockSell ? 'locked' : ''} ${preference?.quickSell ? 'quick-sell' : ''}`} key={`${stack.itemId ?? 'name'}-${stack.name}`}><ItemSprite itemId={stack.itemId} label={stack.name} /><b>{stack.amount}</b><span className="item-tooltip" role="tooltip"><strong>{stack.name}</strong><small>{price === null ? 'Sem preço comprovado' : `${price} gold/un. · ${price * stack.amount} total`}</small>{preference?.lockSell && <small>Venda bloqueada</small>}{preference && !preference.autoLoot && <small>Auto Loot desligado</small>}</span></div>;
        })}</div>}
        <p className="sale-message" aria-live="polite">{confirmSale ? 'Clique novamente para confirmar a venda.' : saleMessage}</p>
        {menu && menu.stack.itemId !== undefined && (() => { const itemId = menu.stack.itemId!; const preference = preferences[String(itemId)] ?? { itemId, autoLoot: true, lockSell: false, quickSell: false }; const price = prices.get(itemId) ?? null; return <div className="item-context-menu" style={{ left: menu.x, top: menu.y }} onPointerDown={(event) => event.stopPropagation()}><strong>{menu.stack.name}</strong><button type="button" className={preference.autoLoot ? 'active' : ''} onClick={() => { onTogglePreference(itemId, 'autoLoot'); setMenu(null); }}>✓ Auto Loot</button><button type="button" className={preference.quickSell ? 'active' : ''} onClick={() => { onTogglePreference(itemId, 'quickSell'); setMenu(null); }}>{preference.quickSell ? '✓ ' : ''}Quick Sell</button><button type="button" className={preference.lockSell ? 'active' : ''} onClick={() => { onTogglePreference(itemId, 'lockSell'); setMenu(null); }}>{preference.lockSell ? '✓ ' : ''}Bloquear venda</button><button type="button" disabled={price === null || preference.lockSell} onClick={() => { if (window.confirm(`Vender toda a pilha de ${menu.stack.name}?`)) onSellOne(itemId); setMenu(null); }}>Vender agora</button><button type="button" onClick={() => setMenu(null)}>Fechar</button></div>; })()}
      </ClientPanel>
    </aside>
  );
}
