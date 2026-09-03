'use client';

import React, { useState } from 'react';
import type { LootStack } from '@/packages/domain/src';
import { ItemSprite } from './ItemSprite';
import { showGlobalItemTooltip, hideGlobalItemTooltip } from './GlobalItemTooltip';

interface DepotWindowProps {
  open: boolean;
  depotItems: LootStack[];
  bagItems: LootStack[];
  backpackItems: LootStack[];
  onClose: () => void;
  onTransferToDepot: (from: 'backpack' | 'bag', index: number) => void;
  onTransferFromDepot: (to: 'backpack' | 'bag', depotIndex: number) => void;
}

export function DepotWindow({
  open,
  depotItems,
  bagItems,
  backpackItems,
  onClose,
  onTransferToDepot,
  onTransferFromDepot,
}: DepotWindowProps) {
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  if (!open) return null;

  // Filter depot items by query
  const filteredDepot = depotItems.filter((item) => {
    if (searchQuery.trim() && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const filterButtons = [
    { id: 'all', label: 'Todos' },
    { id: 'neck', label: '📿' },
    { id: 'weapon', label: '⚔️' },
    { id: 'shield', label: '🛡️' },
    { id: 'helmet', label: '🪖' },
    { id: 'armor', label: '🥋' },
    { id: 'legs', label: '👖' },
    { id: 'boots', label: '🥾' },
    { id: 'ring', label: '💍' },
    { id: 'ammo', label: '🏹' },
  ];

  return (
    <div className="inventory-window-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="depot-window-container" role="dialog" aria-modal="true" aria-label="Depot">
        {/* Header */}
        <div className="depot-window-header">
          <span className="depot-header-title">Depot</span>
          <button type="button" className="inventory-close-btn" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>

        {/* Content Body: Left Armazém + Right Bolsa/Mochila */}
        <div className="depot-window-body">
          {/* Left Pane: Armazém */}
          <div className="depot-storage-pane">
            <div className="depot-pane-title">Armazém</div>

            {/* Filter Bar */}
            <div className="depot-filter-bar">
              {filterButtons.map((btn) => (
                <button
                  key={btn.id}
                  type="button"
                  className={`depot-filter-btn ${activeFilter === btn.id ? 'active' : ''}`}
                  onClick={() => setActiveFilter(btn.id)}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="depot-search-box">
              <input
                type="text"
                placeholder="Buscar itens..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="depot-search-input"
              />
            </div>

            {/* Large Storage Grid (7 rows x 9 columns = 63 slots) */}
            <div className="depot-grid-container">
              {Array.from({ length: 63 }).map((_, index) => {
                const item = filteredDepot[index];
                return (
                  <div
                    key={`depot-slot-${index}`}
                    className={`inventory-slot-cell ${item ? 'occupied' : 'empty'}`}
                    onClick={() => item && onTransferFromDepot('backpack', index)}
                    onMouseEnter={(e) => item?.itemId && showGlobalItemTooltip({ itemId: item.itemId, name: item.name, amount: item.amount }, e)}
                    onMouseMove={(e) => item?.itemId && showGlobalItemTooltip({ itemId: item.itemId, name: item.name, amount: item.amount }, e)}
                    onMouseLeave={() => hideGlobalItemTooltip()}
                  >
                    {item?.itemId && (
                      <>
                        <ItemSprite itemId={item.itemId} label={item.name} />
                        {item.amount > 1 && <span className="item-amount-badge">{item.amount}</span>}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Pane: Bolsa & Mochila */}
          <div className="depot-character-pane">
            {/* Bolsa */}
            <div className="depot-side-section">
              <div className="container-section-header">
                <span className="container-title">Bolsa</span>
              </div>
              <div className="container-grid bolsa-grid">
                {Array.from({ length: 12 }).map((_, index) => {
                  const stack = bagItems[index];
                  return (
                    <div
                      key={`depot-bag-slot-${index}`}
                      className={`inventory-slot-cell ${stack ? 'occupied' : 'empty'}`}
                      onClick={() => stack && onTransferToDepot('bag', index)}
                      onMouseEnter={(e) => stack?.itemId && showGlobalItemTooltip({ itemId: stack.itemId, name: stack.name, amount: stack.amount }, e)}
                      onMouseMove={(e) => stack?.itemId && showGlobalItemTooltip({ itemId: stack.itemId, name: stack.name, amount: stack.amount }, e)}
                      onMouseLeave={() => hideGlobalItemTooltip()}
                    >
                      {stack?.itemId && (
                        <>
                          <ItemSprite itemId={stack.itemId} label={stack.name} />
                          {stack.amount > 1 && <span className="item-amount-badge">{stack.amount}</span>}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="container-section-divider" />

            {/* Mochila */}
            <div className="depot-side-section">
              <div className="container-section-header">
                <span className="container-title">Mochila</span>
              </div>
              <div className="container-grid mochila-grid">
                {Array.from({ length: 20 }).map((_, index) => {
                  const stack = backpackItems[index];
                  return (
                    <div
                      key={`depot-backpack-slot-${index}`}
                      className={`inventory-slot-cell ${stack ? 'occupied' : 'empty'}`}
                      onClick={() => stack && onTransferToDepot('backpack', index)}
                      onMouseEnter={(e) => stack?.itemId && showGlobalItemTooltip({ itemId: stack.itemId, name: stack.name, amount: stack.amount }, e)}
                      onMouseMove={(e) => stack?.itemId && showGlobalItemTooltip({ itemId: stack.itemId, name: stack.name, amount: stack.amount }, e)}
                      onMouseLeave={() => hideGlobalItemTooltip()}
                    >
                      {stack?.itemId && (
                        <>
                          <ItemSprite itemId={stack.itemId} label={stack.name} />
                          {stack.amount > 1 && <span className="item-amount-badge">{stack.amount}</span>}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
