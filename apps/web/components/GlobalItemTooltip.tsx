'use client';

import React, { useEffect, useState, useRef } from 'react';
import type { EquipmentDefinition } from '@/packages/content-schema/src';
import { ItemSprite } from './ItemSprite';
import economyJson from '@/content/generated/item-economy.json';
import equipmentJson from '@/content/generated/equipment.json';

const SLOT_LABELS: Record<string, string> = {
  head: 'Elmo / Cabeça',
  armor: 'Armadura / Tronco',
  legs: 'Calça / Pernas',
  boots: 'Botas / Pés',
  hand: 'Mão (Arma / Escudo)',
  ammo: 'Munição / Aljava',
  backpack: 'Mochila / Recipiente',
};

export interface GlobalTooltipItemData {
  item?: EquipmentDefinition | null;
  itemId?: number;
  name?: string;
  amount?: number;
  slot?: string;
  price?: number;
  lockSell?: boolean;
  quickSell?: boolean;
  twoHanded?: boolean;
}

export interface PlayerInspectData {
  name: string;
  level: number;
  vocation: string;
  isPremium: boolean;
  currentHp?: number;
  maxHp?: number;
}

interface ActiveTooltipState {
  type: 'item' | 'player';
  itemData?: GlobalTooltipItemData;
  playerData?: PlayerInspectData;
  x: number;
  y: number;
}

// Global Event Dispatchers
export function showGlobalItemTooltip(data: GlobalTooltipItemData, e: MouseEvent | React.MouseEvent | PointerEvent) {
  if (typeof window === 'undefined') return;
  const event = new CustomEvent('show-global-tooltip', {
    detail: {
      type: 'item',
      itemData: data,
      x: e.clientX,
      y: e.clientY,
    },
  });
  window.dispatchEvent(event);
}

export function hideGlobalItemTooltip() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('hide-global-tooltip', { detail: { type: 'item' } }));
}

export function showGlobalPlayerTooltip(data: PlayerInspectData, clientX: number, clientY: number) {
  if (typeof window === 'undefined') return;
  const event = new CustomEvent('show-global-tooltip', {
    detail: {
      type: 'player',
      playerData: data,
      x: clientX,
      y: clientY,
    },
  });
  window.dispatchEvent(event);
}

export function hideGlobalPlayerTooltip() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('hide-global-tooltip', { detail: { type: 'player' } }));
}

export function GlobalItemTooltip() {
  const [active, setActive] = useState<ActiveTooltipState | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleShow = (e: Event) => {
      const custom = e as CustomEvent<ActiveTooltipState>;
      setActive(custom.detail);
    };

    const handleHide = (e: Event) => {
      const custom = e as CustomEvent<{ type: 'item' | 'player' }>;
      setActive((current) => {
        if (!current) return null;
        if (custom.detail?.type && current.type !== custom.detail.type) return current;
        return null;
      });
    };

    window.addEventListener('show-global-tooltip', handleShow);
    window.addEventListener('hide-global-tooltip', handleHide);

    return () => {
      window.removeEventListener('show-global-tooltip', handleShow);
      window.removeEventListener('hide-global-tooltip', handleHide);
    };
  }, []);

  if (!active) return null;

  // Smart screen edge clamping so tooltip never overflows off-screen
  const tooltipWidth = 240;
  const tooltipHeight = active.type === 'player' ? 140 : 220;
  const padding = 12;

  let left = active.x + 16;
  let top = active.y + 16;

  if (typeof window !== 'undefined') {
    if (left + tooltipWidth > window.innerWidth - padding) {
      left = Math.max(padding, active.x - tooltipWidth - 14);
    }
    if (top + tooltipHeight > window.innerHeight - padding) {
      top = Math.max(padding, active.y - tooltipHeight - 14);
    }
  }

  if (active.type === 'player' && active.playerData) {
    const { name, level, vocation, isPremium, currentHp, maxHp } = active.playerData;
    return (
      <div
        id="global-player-inspect-layer"
        ref={tooltipRef}
        className="global-player-inspect-card"
        style={{
          position: 'fixed',
          left: `${left}px`,
          top: `${top}px`,
          zIndex: 99999999,
          pointerEvents: 'none',
        }}
        role="tooltip"
        aria-label={`Jogador: ${name}`}
      >
        <div className="player-inspect-header">
          <div className="player-inspect-avatar-box">
            <span className="player-inspect-icon">👤</span>
          </div>
          <div className="player-inspect-title">
            <strong className="player-inspect-name">{name}</strong>
            <span className="player-inspect-vocation">{vocation}</span>
          </div>
        </div>

        <div className="player-inspect-body">
          <div className="player-inspect-row">
            <span className="inspect-label">Nível:</span>
            <b className="inspect-val-lvl">{level}</b>
          </div>

          <div className="player-inspect-row">
            <span className="inspect-label">Conta:</span>
            {isPremium ? (
              <span className="inspect-badge-premium">
                <span className="premium-star">⭐</span> Premium Account
              </span>
            ) : (
              <span className="inspect-badge-free">Free Account</span>
            )}
          </div>

          {currentHp !== undefined && maxHp !== undefined && maxHp > 0 && (
            <div className="player-inspect-row">
              <span className="inspect-label">Vida:</span>
              <b className="inspect-val-hp">
                {currentHp}/{maxHp}
              </b>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Item Tooltip rendering
  const data = active.itemData;
  if (!data) return null;

  // Resolve item stats from EquipmentCatalog if itemId is provided
  let equip = data.item;
  if (!equip && data.itemId) {
    const catalogItems = (equipmentJson as unknown as { items: EquipmentDefinition[] }).items;
    equip = catalogItems.find((candidate) => candidate.id === data.itemId) ?? null;
  }

  const name = equip?.name ?? data.name ?? `Item #${data.itemId ?? '?'}`;
  const slotName = equip?.slot ? (SLOT_LABELS[equip.slot] ?? equip.slot) : data.slot ?? 'Item';
  const isWeapon = (equip?.attack ?? 0) > 0;
  const isShield = (equip?.defense ?? 0) > 0 && !isWeapon;
  const isArmor = (equip?.armor ?? 0) > 0;
  const weight = equip?.weight?.ounces ?? (equip as unknown as { weightOunces?: number })?.weightOunces;

  // Determine price from item-economy
  let price = data.price;
  if (price === undefined && data.itemId) {
    const ecoItem = (economyJson as unknown as { items: Array<{ itemId: number; canonicalSellPrice?: number }> }).items.find((i) => i.itemId === data.itemId);
    price = ecoItem?.canonicalSellPrice;
  }

  return (
    <div
      id="global-item-tooltip-layer"
      ref={tooltipRef}
      className="global-item-tooltip-card"
      style={{
        position: 'fixed',
        left: `${left}px`,
        top: `${top}px`,
        zIndex: 99999999,
        pointerEvents: 'none',
      }}
      role="tooltip"
      aria-label={`Item: ${name}`}
    >
      <div className="item-tooltip-header">
        <div className="item-tooltip-sprite-preview">
          <ItemSprite itemId={equip?.id ?? data.itemId} label={name} />
        </div>
        <div className="item-tooltip-title-block">
          <strong className="item-name">{name}</strong>
          <span className="item-slot-tag">{slotName}</span>
        </div>
      </div>

      <div className="item-tooltip-stats">
        {isWeapon && equip && (
          <div className="stat-row atk">
            <span>Ataque:</span>
            <b>{equip.attack}</b>
          </div>
        )}
        {equip && equip.defense > 0 && (
          <div className="stat-row def">
            <span>Defesa:</span>
            <b>
              {equip.defense}
              {equip.extraDefense > 0 && <small> (+{equip.extraDefense})</small>}
            </b>
          </div>
        )}
        {isArmor && equip && (
          <div className="stat-row arm">
            <span>Armadura:</span>
            <b>{equip.armor}</b>
          </div>
        )}
        {weight !== undefined && weight > 0 && (
          <div className="stat-row oz">
            <span>Peso:</span>
            <b>{weight.toFixed(2)} oz</b>
          </div>
        )}
        {data.amount !== undefined && data.amount > 1 && (
          <div className="stat-row amount">
            <span>Quantidade:</span>
            <b>{data.amount}x</b>
          </div>
        )}
        {price !== undefined && price > 0 && (
          <div className="stat-row gold">
            <span>Valor:</span>
            <b>
              🪙 {price} gp {data.amount && data.amount > 1 ? `(${price * data.amount} gp total)` : ''}
            </b>
          </div>
        )}
      </div>

      {equip?.requirements?.level && (
        <div className="item-tooltip-req">
          <span>Requer Nível {equip.requirements.level}</span>
        </div>
      )}

      {(equip?.twoHanded || data.twoHanded) && (
        <div className="item-tooltip-badge two-handed">⚔️ Arma de duas mãos</div>
      )}
      {data.quickSell && (
        <div className="item-tooltip-badge quicksell">⚡ Marcado para Venda Rápida</div>
      )}
      {data.lockSell && (
        <div className="item-tooltip-badge locked">🔒 Venda Bloqueada</div>
      )}
    </div>
  );
}
