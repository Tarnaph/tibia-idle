'use client';

import React from 'react';
import type { EquipmentDefinition } from '@/packages/content-schema/src';

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
};

export function ItemTooltip({ item, children, className = '' }: ItemTooltipProps) {
  const isWeapon = item.attack > 0;
  const isShield = item.defense > 0 && !isWeapon;
  const isArmor = item.armor > 0;

  return (
    <div className={`item-tooltip-wrapper ${className}`}>
      {children}
      <div className="item-tooltip-content" role="tooltip">
        <div className="item-tooltip-header">
          <strong className="item-name">{item.name}</strong>
          <span className="item-slot-tag">{SLOT_LABELS[item.slot] ?? item.slot}</span>
        </div>

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

        {item.requirements?.level && (
          <div className="item-tooltip-req">
            <span>Requer Nível {item.requirements.level}</span>
          </div>
        )}

        {item.twoHanded && (
          <div className="item-tooltip-badge">Arma de duas mãos</div>
        )}
      </div>
    </div>
  );
}
