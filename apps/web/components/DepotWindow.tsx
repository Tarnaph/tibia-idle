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

  const filterButtons: Array<{ id: string; label: string; icon?: React.ReactNode }> = [
    { id: 'all', label: 'Todos' },
    {
      id: 'neck',
      label: 'Colar',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="7" r="4" />
          <path d="M12 11v4" />
          <circle cx="12" cy="17" r="2" />
        </svg>
      ),
    },
    {
      id: 'weapon',
      label: 'Arma',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <line x1="14.5" y1="17.5" x2="3" y2="6" />
          <line x1="14.5" y1="6.5" x2="3" y2="18" />
          <line x1="21" y1="3" x2="18" y2="3" />
          <line x1="21" y1="3" x2="21" y2="6" />
        </svg>
      ),
    },
    {
      id: 'shield',
      label: 'Escudo',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
    },
    {
      id: 'helmet',
      label: 'Elmo',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a8 8 0 0 0-8 8v6h16v-6a8 8 0 0 0-8-8z" />
          <line x1="12" y1="16" x2="12" y2="22" />
        </svg>
      ),
    },
    {
      id: 'armor',
      label: 'Armadura',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />
        </svg>
      ),
    },
    {
      id: 'legs',
      label: 'Calça',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 3h12v4l-2 14h-3l-1-10-1 10H8L6 7V3z" />
        </svg>
      ),
    },
    {
      id: 'boots',
      label: 'Botas',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 17l4 4 12-12-4-4L4 17z" />
        </svg>
      ),
    },
    {
      id: 'ring',
      label: 'Anel',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="7" />
          <path d="M12 5l2-3h-4l2 3" />
        </svg>
      ),
    },
    {
      id: 'ammo',
      label: 'Munição',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      ),
    },
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
                  title={btn.label}
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '28px' }}
                >
                  {btn.icon || btn.label}
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
