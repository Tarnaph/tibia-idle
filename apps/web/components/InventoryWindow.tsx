'use client';

import React, { useState } from 'react';
import type { EquipmentDefinition } from '@/packages/content-schema/src';
import {
  findEquipment,
  type CharacterEquipmentSlot,
  type CharacterState,
  type LootStack,
} from '@/packages/domain/src';
import { ItemSprite } from './ItemSprite';
import { SlotSilhouette } from './SlotSilhouette';
import { ItemContextMenu } from './ItemContextMenu';

export type InventoryPaperdollSlot = CharacterEquipmentSlot | 'neck' | 'backpack' | 'finger' | 'ammo';

interface InventoryWindowProps {
  open: boolean;
  character: CharacterState;
  equipmentCatalog: EquipmentDefinition[];
  backpackItems: LootStack[];
  bagItems: LootStack[];
  availableCapacityOz: number;
  totalGold: number;
  onClose: () => void;
  onEquipItem: (itemId: number) => void;
  onUnequipSlot: (slot: CharacterEquipmentSlot) => void;
  onTransferContainerItem: (from: 'backpack' | 'bag', to: 'backpack' | 'bag', index: number) => void;
  onDestroyItem: (container: 'backpack' | 'bag', index: number) => void;
  onToggleItemPreference: (itemId: number, key: 'autoLoot' | 'lockSell' | 'quickSell') => void;
  getItemPreference: (itemId: number) => { autoLoot: boolean; lockSell: boolean; quickSell: boolean };
}

export function InventoryWindow({
  open,
  character,
  equipmentCatalog,
  backpackItems,
  bagItems,
  availableCapacityOz,
  totalGold,
  onClose,
  onEquipItem,
  onUnequipSlot,
  onTransferContainerItem,
  onDestroyItem,
  onToggleItemPreference,
  getItemPreference,
}: InventoryWindowProps) {
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    item: LootStack | EquipmentDefinition;
    container?: 'backpack' | 'bag' | 'equipped';
    index?: number;
    slot?: CharacterEquipmentSlot;
  } | null>(null);

  const [draggedItem, setDraggedItem] = useState<{
    source: 'backpack' | 'bag' | 'equipped';
    index?: number;
    slot?: CharacterEquipmentSlot;
    itemId: number;
  } | null>(null);

  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    if (typeof window !== 'undefined') {
      return {
        x: Math.max(20, window.innerWidth - 560),
        y: 70,
      };
    }
    return { x: 400, y: 70 };
  });

  const dragRef = React.useRef<{
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    isDragging: boolean;
  }>({
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
    isDragging: false,
  });

  const handleHeaderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x,
      initialY: position.y,
      isDragging: true,
    };
  };

  const handleHeaderPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.isDragging) return;
    const deltaX = e.clientX - dragRef.current.startX;
    const deltaY = e.clientY - dragRef.current.startY;
    const newX = Math.max(10, Math.min(window.innerWidth - 200, dragRef.current.initialX + deltaX));
    const newY = Math.max(10, Math.min(window.innerHeight - 100, dragRef.current.initialY + deltaY));
    setPosition({ x: newX, y: newY });
  };

  const handleHeaderPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current.isDragging) {
      dragRef.current.isDragging = false;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  if (!open) return null;

  // Format gold coins with thousand separators
  const formattedGold = Math.floor(totalGold).toLocaleString('pt-BR');

  // Format capacity oz
  const formattedCapacity = availableCapacityOz.toFixed(2);

  // Equip slot definition aligned exactly to reference screenshot:
  // Row 1: Neck (left) - Head (center) - Backpack (right)
  // Row 2: LeftHand (left) - Armor (center) - RightHand (right)
  // Row 3: Legs (center)
  // Row 4: Finger (left) - Boots (center) - Ammo (right)
  const slotsConfig: Array<{ slot: InventoryPaperdollSlot; label: string; gridArea: string }> = [
    { slot: 'neck', label: 'Amuleto', gridArea: 'neck' },
    { slot: 'head', label: 'Capacete', gridArea: 'head' },
    { slot: 'backpack', label: 'Mochila', gridArea: 'backpack' },
    { slot: 'leftHand', label: 'Arma', gridArea: 'leftHand' },
    { slot: 'armor', label: 'Armadura', gridArea: 'armor' },
    { slot: 'rightHand', label: 'Escudo', gridArea: 'rightHand' },
    { slot: 'legs', label: 'Calça', gridArea: 'legs' },
    { slot: 'finger', label: 'Anel', gridArea: 'finger' },
    { slot: 'boots', label: 'Botas', gridArea: 'boots' },
    { slot: 'ammo', label: 'Munição', gridArea: 'ammo' },
  ];

  const handleDragStart = (
    e: React.DragEvent,
    source: 'backpack' | 'bag' | 'equipped',
    itemId: number,
    index?: number,
    slot?: CharacterEquipmentSlot
  ) => {
    setDraggedItem({ source, index, slot, itemId });
    e.dataTransfer.setData('text/plain', JSON.stringify({ source, index, slot, itemId }));
  };

  const handleDropOnSlot = (e: React.DragEvent, _targetSlot: CharacterEquipmentSlot) => {
    e.preventDefault();
    if (!draggedItem) return;
    if (draggedItem.source !== 'equipped') {
      onEquipItem(draggedItem.itemId);
    }
    setDraggedItem(null);
  };

  const handleDropOnContainer = (e: React.DragEvent, targetContainer: 'backpack' | 'bag') => {
    e.preventDefault();
    if (!draggedItem) return;
    if (draggedItem.source === 'equipped' && draggedItem.slot) {
      onUnequipSlot(draggedItem.slot);
    } else if (draggedItem.source !== targetContainer && typeof draggedItem.index === 'number') {
      onTransferContainerItem(draggedItem.source as 'backpack' | 'bag', targetContainer, draggedItem.index);
    }
    setDraggedItem(null);
  };

  return (
    <div
      className="inventory-window-container floating-window"
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 960,
      }}
      role="dialog"
      aria-label="Inventário"
    >
      {/* Draggable Header */}
      <div
        className="inventory-window-header draggable-header"
        onPointerDown={handleHeaderPointerDown}
        onPointerMove={handleHeaderPointerMove}
        onPointerUp={handleHeaderPointerUp}
        style={{ cursor: 'grab', userSelect: 'none' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src="/backpack.png" alt="" width={16} height={16} style={{ imageRendering: 'pixelated' }} />
          <span className="inventory-header-title">Inventário & Mochila</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="inventory-gold-badge">
            <span className="gold-coin-icon">🟡</span>
            <span className="gold-value">{formattedGold} gp</span>
          </span>
          <button type="button" className="inventory-close-btn" onClick={onClose} aria-label="Fechar" title="Fechar (I)">
            ×
          </button>
        </div>
      </div>

      {/* Content Body: 2 Columns */}
      <div className="inventory-window-body">
        {/* Left Column: Equipment Paperdoll & Capacity */}
        <div className="inventory-paperdoll-column">
          <div className="paperdoll-grid">
            {slotsConfig.map(({ slot, label, gridArea }) => {
              const itemId = (character.equipment as Record<string, number | null>)[slot] ?? null;
              const item = itemId ? findEquipment(equipmentCatalog, itemId) : null;
              const isSupportedEquipSlot = slot in character.equipment;

              return (
                <div
                  key={slot}
                  className={`paperdoll-slot-box ${item ? 'occupied' : 'empty'}`}
                  style={{ gridArea }}
                  title={item ? `${item.name} (${label})` : `Slot de ${label}`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => isSupportedEquipSlot && handleDropOnSlot(e, slot as CharacterEquipmentSlot)}
                  draggable={!!item}
                  onDragStart={(e) => item && isSupportedEquipSlot && handleDragStart(e, 'equipped', item.id, undefined, slot as CharacterEquipmentSlot)}
                  onDoubleClick={() => item && isSupportedEquipSlot && onUnequipSlot(slot as CharacterEquipmentSlot)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (item) {
                      setContextMenu({
                        x: e.clientX,
                        y: e.clientY,
                        item,
                        container: 'equipped',
                        slot: isSupportedEquipSlot ? (slot as CharacterEquipmentSlot) : undefined,
                      });
                    }
                  }}
                >
                  {item ? (
                    <ItemSprite itemId={item.id} label={item.name} />
                  ) : slot === 'backpack' ? (
                    <img src="/backpack.png" alt="Mochila" width={30} height={30} style={{ imageRendering: 'pixelated', opacity: 0.85 }} />
                  ) : (
                    <SlotSilhouette slot={slot} size={30} />
                  )}
                </div>
              );
            })}
          </div>

            {/* Capacity Inset */}
            <div className="capacity-inset-box">
              <span className="capacity-badge">Capacidade</span>
              <span className="capacity-value">{formattedCapacity} oz</span>
            </div>
          </div>

          {/* Right Column: Bolsa & Mochila */}
          <div className="inventory-items-column">
            {/* 1. Bolsa (12 slots: 2x6) */}
            <div className="container-section bolsa-section">
              <div className="container-section-header">
                <span className="container-title">Bolsa</span>
                <span className="container-help-icon" title="A Bolsa guarda itens protegidos que não são vendidos na Venda Rápida.">?</span>
              </div>
              <div
                className="container-grid bolsa-grid"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDropOnContainer(e, 'bag')}
              >
                {Array.from({ length: 12 }).map((_, index) => {
                  const stack = bagItems[index];
                  const pref = stack?.itemId ? getItemPreference(stack.itemId) : { autoLoot: true, lockSell: false, quickSell: false };

                  return (
                    <div
                      key={`bag-slot-${index}`}
                      className={`inventory-slot-cell ${stack ? 'occupied' : 'empty'}`}
                      draggable={!!stack}
                      onDragStart={(e) => stack?.itemId && handleDragStart(e, 'bag', stack.itemId, index)}
                      onDoubleClick={() => stack?.itemId && onEquipItem(stack.itemId)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        if (stack) {
                          setContextMenu({
                            x: e.clientX,
                            y: e.clientY,
                            item: stack,
                            container: 'bag',
                            index,
                          });
                        }
                      }}
                      title={stack ? `${stack.name} (${stack.amount}x)` : 'Slot de Bolsa vazio'}
                    >
                      {stack?.itemId && (
                        <>
                          <ItemSprite itemId={stack.itemId} label={stack.name} />
                          {stack.amount > 1 && <span className="item-amount-badge">{stack.amount}</span>}
                          {pref.quickSell && <span className="item-quicksell-ribbon" title="Marcado para venda rápida" />}
                          {pref.lockSell && <span className="item-locked-dot" title="Venda travada" />}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="container-section-divider" />

            {/* 2. Mochila (20 slots: 4x5) */}
            <div className="container-section mochila-section">
              <div className="container-section-header">
                <span className="container-title">Mochila</span>
              </div>
              <div
                className="container-grid mochila-grid"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDropOnContainer(e, 'backpack')}
              >
                {Array.from({ length: 20 }).map((_, index) => {
                  const stack = backpackItems[index];
                  const pref = stack?.itemId ? getItemPreference(stack.itemId) : { autoLoot: true, lockSell: false, quickSell: false };

                  return (
                    <div
                      key={`backpack-slot-${index}`}
                      className={`inventory-slot-cell ${stack ? 'occupied' : 'empty'}`}
                      draggable={!!stack}
                      onDragStart={(e) => stack?.itemId && handleDragStart(e, 'backpack', stack.itemId, index)}
                      onDoubleClick={() => stack?.itemId && onEquipItem(stack.itemId)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        if (stack) {
                          setContextMenu({
                            x: e.clientX,
                            y: e.clientY,
                            item: stack,
                            container: 'backpack',
                            index,
                          });
                        }
                      }}
                      title={stack ? `${stack.name} (${stack.amount}x) · Clique direito para menu` : 'Slot de Mochila vazio'}
                    >
                      {stack?.itemId && (
                        <>
                          <ItemSprite itemId={stack.itemId} label={stack.name} />
                          {stack.amount > 1 && <span className="item-amount-badge">{stack.amount}</span>}
                          {pref.quickSell && <span className="item-quicksell-ribbon" title="Marcado para venda rápida" />}
                          {pref.lockSell && <span className="item-locked-dot" title="Venda travada" />}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Gold Total Footer */}
            <div className="inventory-gold-footer">
              <span className="gold-text-value">{formattedGold}</span>
              {/* Gold coin stack icon */}
              <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
                <ellipse cx="14" cy="22" rx="10" ry="4" fill="#f5c242" stroke="#9e7211" strokeWidth="1" />
                <ellipse cx="18" cy="17" rx="9" ry="3.5" fill="#f5d061" stroke="#9e7211" strokeWidth="1" />
                <ellipse cx="16" cy="12" rx="8" ry="3" fill="#ffe082" stroke="#9e7211" strokeWidth="1" />
              </svg>
            </div>
          </div>
        </div>

      {/* Item Context Menu */}
      {contextMenu && (
        <ItemContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          itemName={contextMenu.item.name}
          itemId={'itemId' in contextMenu.item ? contextMenu.item.itemId : ('id' in contextMenu.item ? (contextMenu.item as EquipmentDefinition).id : undefined)}
          isEquipped={contextMenu.container === 'equipped'}
          isEquippable={true}
          autoLoot={'itemId' in contextMenu.item && contextMenu.item.itemId ? getItemPreference(contextMenu.item.itemId).autoLoot : true}
          lockSell={'itemId' in contextMenu.item && contextMenu.item.itemId ? getItemPreference(contextMenu.item.itemId).lockSell : false}
          quickSell={'itemId' in contextMenu.item && contextMenu.item.itemId ? getItemPreference(contextMenu.item.itemId).quickSell : false}
          onEquipToggle={() => {
            if (contextMenu.container === 'equipped' && contextMenu.slot) {
              onUnequipSlot(contextMenu.slot);
            } else if ('itemId' in contextMenu.item && contextMenu.item.itemId) {
              onEquipItem(contextMenu.item.itemId);
            } else if ('id' in contextMenu.item) {
              onEquipItem((contextMenu.item as EquipmentDefinition).id);
            }
          }}
          onMarketSell={() => {
            alert(`Item "${contextMenu.item.name}" configurado para venda no Market.`);
          }}
          onMarketView={() => {
            alert(`Visualizando ofertas de "${contextMenu.item.name}" no Market.`);
          }}
          onToggleAutoLoot={() => {
            const id = 'itemId' in contextMenu.item ? contextMenu.item.itemId : ('id' in contextMenu.item ? (contextMenu.item as EquipmentDefinition).id : undefined);
            if (id) onToggleItemPreference(id, 'autoLoot');
          }}
          onToggleLockSell={() => {
            const id = 'itemId' in contextMenu.item ? contextMenu.item.itemId : ('id' in contextMenu.item ? (contextMenu.item as EquipmentDefinition).id : undefined);
            if (id) onToggleItemPreference(id, 'lockSell');
          }}
          onToggleQuickSell={() => {
            const id = 'itemId' in contextMenu.item ? contextMenu.item.itemId : ('id' in contextMenu.item ? (contextMenu.item as EquipmentDefinition).id : undefined);
            if (id) onToggleItemPreference(id, 'quickSell');
          }}
          onDestroy={() => {
            if (contextMenu.container && typeof contextMenu.index === 'number') {
              onDestroyItem(contextMenu.container as 'backpack' | 'bag', contextMenu.index);
            } else if (contextMenu.container === 'equipped' && contextMenu.slot) {
              onUnequipSlot(contextMenu.slot);
            }
          }}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
