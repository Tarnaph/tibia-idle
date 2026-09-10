'use client';

import React from 'react';
import type { EquipmentDefinition } from '@/packages/content-schema/src';
import { formatTibiaLookText } from '@/packages/domain/src/itemLook';

interface ItemTooltipProps {
  item: EquipmentDefinition;
  children: React.ReactNode;
  className?: string;
}

const SLOT_LABELS: Record<string, string> = {
  head: 'Elmo / Cabeça',
  armor: 'Armadura / Tronco',
  legs: 'Calça / Pernas',
  boots: 'Botas / Pés',
  hand: 'Mão (Arma / Escudo)',
  ammo: 'Munição / Aljava',
  ring: 'Anel',
  necklace: 'Amuleto / Colar',
  backpack: 'Mochila / Recipiente',
  other: 'Item / Utilidade',
};

export function ItemTooltip({ item, children, className = '' }: ItemTooltipProps) {
  const isWeapon = item.attack > 0;
  const isShield = item.defense > 0 && !isWeapon;
  const isArmor = item.armor > 0;
  const look = formatTibiaLookText(item);

  return (
    <div className={`item-tooltip-wrapper ${className}`}>
      {children}
      <div className="item-tooltip-content" role="tooltip">
        <div className="item-tooltip-header">
          <strong className="item-name">{item.name}</strong>
          <span className="item-slot-tag">{SLOT_LABELS[item.slot] ?? item.slot}</span>
        </div>

        {/* Canonical Look Box */}
        <div className="item-tooltip-look-box">
          <div className="look-title">{look.title}</div>
          {look.lines.map((line, idx) => (
            <div key={idx} className="look-line">{line}</div>
          ))}
        </div>

        {/* Allowed Vocations */}
        {look.vocationNames && look.vocationNames.length > 0 && (
          <div className="item-tooltip-vocations-block">
            <span className="item-tooltip-vocations-label">Vocações:</span>
            <div className="item-tooltip-voc-badges">
              {look.vocationNames.map((voc) => {
                const vLower = voc.toLowerCase();
                const icon = vLower.includes('knight') ? '⚔️'
                  : vLower.includes('paladin') ? '🏹'
                  : vLower.includes('sorcerer') ? '⚡'
                  : vLower.includes('druid') ? '🌿' : '✨';
                const cName = vLower.includes('knight') ? 'voc-knight'
                  : vLower.includes('paladin') ? 'voc-paladin'
                  : vLower.includes('sorcerer') ? 'voc-sorcerer'
                  : vLower.includes('druid') ? 'voc-druid' : 'voc-all';
                return (
                  <span key={voc} className={`voc-badge ${cName}`}>
                    {icon} {voc}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        <div className="item-tooltip-stats">
          {isWeapon && (
            <div className="stat-row atk">
              <span>Ataque:</span>
              <b>{item.attack}</b>
            </div>
          )}
          {item.defense > 0 && (
            <div className="stat-row def">
              <span>Defesa:</span>
              <b>
                {item.defense}
                {item.extraDefense > 0 && <small> (+{item.extraDefense})</small>}
              </b>
            </div>
          )}
          {isArmor && (
            <div className="stat-row arm">
              <span>Armadura:</span>
              <b>{item.armor}</b>
            </div>
          )}
          {item.weight && (
            <div className="stat-row oz">
              <span>Peso:</span>
              <b>{item.weight.ounces.toFixed(2)} oz</b>
            </div>
          )}
        </div>

        {look.minLevel !== undefined && look.minLevel > 0 && (
          <div className="item-tooltip-req">
            <span>⭐ Requer Nível {look.minLevel}</span>
          </div>
        )}

        {(item.twoHanded || look.twoHanded) && (
          <div className="item-tooltip-badge">⚔️ Arma de duas mãos</div>
        )}
      </div>
    </div>
  );
}
