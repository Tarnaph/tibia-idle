'use client';

import { useEffect, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { EquipmentDefinition } from '@/packages/content-schema/src';
import {
  findEquipment,
  type CharacterEquipmentSlot,
  type CharacterState,
  type DerivedStats,
  type EquipmentTransferSource,
  type EquipmentTransferTarget,
} from '@/packages/domain/src';
import { ItemSprite } from './ItemSprite';
import { showGlobalItemTooltip, hideGlobalItemTooltip } from './GlobalItemTooltip';

const slots: Array<{ slot: CharacterEquipmentSlot; label: string; area: string }> = [
  { slot: 'head', label: 'Head', area: 'head' },
  { slot: 'leftHand', label: 'Left hand', area: 'left' },
  { slot: 'armor', label: 'Armor', area: 'armor' },
  { slot: 'rightHand', label: 'Right hand', area: 'right' },
  { slot: 'legs', label: 'Legs', area: 'legs' },
  { slot: 'boots', label: 'Boots', area: 'boots' },
];

export interface StatsDelta {
  attack: { from: number; to: number };
  defense: { from: number; to: number };
  armor: { from: number; to: number };
}

interface EquipmentPanelProps {
  open: boolean;
  character: CharacterState;
  catalog: EquipmentDefinition[];
  stats: DerivedStats;
  statsDelta: StatsDelta | null;
  message: string;
  disabled: boolean;
  inventory: EquipmentDefinition[];
  currentWeight: number;
  capacity: number;
  gold: number;
  onClose(): void;
  onTransfer(source: EquipmentTransferSource, target: EquipmentTransferTarget): void;
  onPointerDragStart(source: EquipmentTransferSource, event: ReactPointerEvent<HTMLElement>): void;
}

function statDeltaLine(label: string, value: number, delta?: { from: number; to: number }) {
  return (
    <span className={delta && delta.from !== delta.to ? 'equipment-stat changed' : 'equipment-stat'}>
      <small>{label}</small>
      <strong>{delta && delta.from !== delta.to ? `${delta.from} → ${delta.to}` : value}</strong>
    </span>
  );
}

export function EquipmentPanel({
  open,
  character,
  catalog,
  stats,
  statsDelta,
  message,
  disabled,
  inventory,
  currentWeight,
  capacity,
  gold,
  onClose,
  onTransfer,
  onPointerDragStart,
}: EquipmentPanelProps) {
  const [menu, setMenu] = useState<{ x: number; y: number; item: EquipmentDefinition } | null>(null);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, open]);

  if (!open) return null;
  return (
    <div className="equipment-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="equipment-drawer inventory-window" role="dialog" aria-modal="true" aria-label={`Inventário de ${character.name}`}>
        <header>
          <div><p className="eyebrow">INVENTÁRIO · {character.vocation}</p><h2>{character.name}</h2></div>
          <button type="button" className="drawer-close" onClick={onClose} aria-label="Fechar equipamento">×</button>
        </header>

        <div className="inventory-summary"><span>Capacidade <b>{currentWeight.toFixed(2)} / {capacity.toFixed(0)} oz</b></span><span>Gold compartilhado <b>{gold}</b></span></div>
        <div className="equipment-stat-strip">
          {statDeltaLine('Ataque máximo', stats.attack, statsDelta?.attack)}
          {statDeltaLine('Defesa', stats.defense, statsDelta?.defense)}
          {statDeltaLine('Armadura', stats.armor, statsDelta?.armor)}
        </div>

        <div className="inventory-columns"><div className="inventory-loadout"><div className="equipment-loadout-caption">
          <strong>{character.name}</strong>
          <span>{stats.weaponName} · {stats.activeSkill} {stats.activeSkillLevel}</span>
        </div>
        <div className="equipment-slot-layout">
          {slots.map(({ slot, label, area }) => {
            const item = findEquipment(catalog, character.equipment[slot]);
            return (
              <button
                type="button"
                key={slot}
                className={`paperdoll-slot ${item ? 'filled' : ''}`}
                style={{ gridArea: area }}
                data-equipment-drop="slot"
                data-equipment-slot={slot}
                onPointerDown={(event) => item && !disabled && onPointerDragStart({ kind: 'equipped', slot }, event)}
                onClick={() => item && onTransfer({ kind: 'equipped', slot }, { kind: 'inventory' })}
                onMouseEnter={(e) => item && showGlobalItemTooltip({ item, itemId: item.id, name: item.name, slot: label }, e)}
                onMouseMove={(e) => item && showGlobalItemTooltip({ item, itemId: item.id, name: item.name, slot: label }, e)}
                onMouseLeave={() => hideGlobalItemTooltip()}
                disabled={disabled}
                title={item ? `Clique para desequipar ${item.name}` : `Solte um item compatível em ${label}`}
              >
                <small>{label}</small>
                {item ? <ItemSprite itemId={item.id} label={item.name} /> : <span className="empty-slot-mark">+</span>}
                <strong>{item?.name ?? 'vazio'}</strong>
              </button>
            );
          })}
        </div>

        <p className="equipment-feedback" aria-live="polite">{disabled ? 'O loadout fica bloqueado durante uma hunt ativa.' : message}</p>
        <div
          className="unequip-dropzone"
          data-equipment-drop="inventory"
        >
          Arraste um item equipado para cá para devolvê-lo ao inventário
        </div>
        </div><div className="inventory-backpack-pane"><h3>Backpack</h3><small>Arraste para equipar ou reorganizar.</small>
          <div className="inventory-grid inventory-window-grid" data-equipment-drop="inventory">
            {inventory.map((item, index) => (
              <button
                type="button"
                key={`${item.id}-${index}`}
                className="inventory-cell"
                data-equipment-drop="inventory-index"
                data-inventory-index={index}
                onContextMenu={(event) => {
                  event.preventDefault();
                  setMenu({ x: event.clientX, y: event.clientY, item });
                }}
                onPointerDown={(event) => onPointerDragStart({ kind: 'inventory', itemId: item.id }, event)}
                onDoubleClick={() => onTransfer({ kind: 'inventory', itemId: item.id }, { kind: 'auto-slot' })}
                onMouseEnter={(e) => showGlobalItemTooltip({ item, itemId: item.id, name: item.name }, e)}
                onMouseMove={(e) => showGlobalItemTooltip({ item, itemId: item.id, name: item.name }, e)}
                onMouseLeave={() => hideGlobalItemTooltip()}
              >
                <ItemSprite itemId={item.id} label={item.name} />
                <strong>{item.name}</strong>
              </button>
            ))}
          </div>
        </div></div>
        {menu && <div className="item-context-menu" style={{ left: menu.x, top: menu.y }} onPointerDown={(event) => event.stopPropagation()}><strong>{menu.item.name}</strong><button type="button" onClick={() => { onTransfer({ kind: 'inventory', itemId: menu.item.id }, { kind: 'auto-slot' }); setMenu(null); }}>Equipar</button><button type="button" onClick={() => setMenu(null)}>Fechar</button></div>}
      </section>
    </div>
  );
}
