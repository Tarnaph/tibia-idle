'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { EquipmentDefinition } from '@/packages/content-schema/src';
import type { CharacterState } from '@/packages/domain/src';
import { ItemSprite } from './ItemSprite';
import { showGlobalItemTooltip, hideGlobalItemTooltip } from './GlobalItemTooltip';
import {
  SHOP_CATEGORIES,
  SHOP_ITEMS_CATALOG,
  type ShopCategoryId,
  type ShopItemEntry,
} from '@/apps/web/lib/shopCatalog';

interface ShopWindowProps {
  open: boolean;
  character: CharacterState;
  equipmentCatalog?: EquipmentDefinition[];
  totalGold: number;
  onClose: () => void;
  onBuyItem: (itemId: number, itemName: string, price: number, quantity: number) => { ok: boolean; error?: string };
}

export function ShopWindow({
  open,
  character,
  equipmentCatalog = [],
  totalGold,
  onClose,
  onBuyItem,
}: ShopWindowProps) {
  const [activeCategory, setActiveCategory] = useState<ShopCategoryId>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [vocationFilter, setVocationFilter] = useState<'all' | 'Knight' | 'Paladin' | 'Sorcerer' | 'Druid'>('all');
  const [selectedItem, setSelectedItem] = useState<ShopItemEntry | null>(SHOP_ITEMS_CATALOG[0] || null);
  const [quantity, setQuantity] = useState<number>(1);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; isError: boolean } | null>(null);

  // Position and draggable window handling
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    if (typeof window !== 'undefined') {
      return {
        x: Math.max(20, Math.floor((window.innerWidth - 740) / 2)),
        y: Math.max(30, Math.floor((window.innerHeight - 660) / 2)),
      };
    }
    return { x: 260, y: 50 };
  });

  const dragRef = useRef<{
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
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) return;
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
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPosition({
      x: Math.max(0, dragRef.current.initialX + dx),
      y: Math.max(0, dragRef.current.initialY + dy),
    });
  };

  const handleHeaderPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current.isDragging) {
      dragRef.current.isDragging = false;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  // Filtered items based on active category, vocation and search
  const filteredItems = useMemo(() => {
    return SHOP_ITEMS_CATALOG.filter((item) => {
      // Category filter
      if (activeCategory !== 'all' && item.category !== activeCategory) {
        return false;
      }

      // Vocation filter
      if (vocationFilter !== 'all') {
        if (item.vocations && !item.vocations.includes('all') && !item.vocations.includes(vocationFilter)) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        if (!item.name.toLowerCase().includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [activeCategory, vocationFilter, searchQuery]);

  // Reset selected item if not in filtered list
  useEffect(() => {
    if (filteredItems.length > 0) {
      if (!selectedItem || !filteredItems.some((it) => it.id === selectedItem.id)) {
        setSelectedItem(filteredItems[0]);
        setQuantity(1);
      }
    } else {
      setSelectedItem(null);
    }
  }, [filteredItems, selectedItem]);

  if (!open) return null;

  const handleBuy = () => {
    if (!selectedItem) return;
    const totalPrice = selectedItem.price * quantity;
    if (totalGold < totalPrice) {
      setFeedbackMsg({
        text: `❌ Gold insuficiente! Você precisa de ${totalPrice.toLocaleString('pt-BR')} gold.`,
        isError: true,
      });
      return;
    }

    const res = onBuyItem(selectedItem.id, selectedItem.name, selectedItem.price, quantity);
    if (res.ok) {
      setFeedbackMsg({
        text: `✓ Comprou ${quantity}x ${selectedItem.name} por ${totalPrice.toLocaleString('pt-BR')} gold!`,
        isError: false,
      });
      setTimeout(() => setFeedbackMsg(null), 4500);
    } else {
      setFeedbackMsg({ text: `❌ ${res.error || 'Erro ao efetuar compra.'}`, isError: true });
    }
  };

  const totalPrice = selectedItem ? selectedItem.price * quantity : 0;
  const canAfford = totalGold >= totalPrice && totalPrice > 0;

  return (
    <div
      className="inventory-window-container floating-window shop-window"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '740px',
        zIndex: 1250,
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.75)',
        borderRadius: '8px',
        border: '1px solid #2a3447',
        backgroundColor: '#0d111a',
      }}
    >
      {/* Draggable Header */}
      <div
        className="inventory-window-header draggable-header"
        onPointerDown={handleHeaderPointerDown}
        onPointerMove={handleHeaderPointerMove}
        onPointerUp={handleHeaderPointerUp}
        style={{
          background: 'linear-gradient(180deg, #1f2738 0%, #151b27 100%)',
          borderBottom: '1px solid #2b364a',
          padding: '8px 14px',
          borderTopLeftRadius: '7px',
          borderTopRightRadius: '7px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'grab',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>🏪</span>
          <span style={{ fontWeight: 700, fontSize: '13px', color: '#ffd700', letterSpacing: '0.5px' }}>
            LOJA DA CIDADE · EQUIPAMENTOS & TREINO
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#10141e',
              padding: '4px 10px',
              borderRadius: '16px',
              border: '1px solid #2e3a52',
            }}
          >
            <span style={{ fontSize: '13px' }}>💰</span>
            <span style={{ fontWeight: 700, fontSize: '12.5px', color: '#f5c518' }}>
              {totalGold.toLocaleString('pt-BR')} gold
            </span>
          </div>
          <button
            type="button"
            className="inventory-close-btn"
            onClick={onClose}
            aria-label="Fechar"
            title="Fechar Loja"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#8b9bb4',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: 'bold',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Top Controls: Search Bar & Vocation Filter */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <span style={{ position: 'absolute', left: '10px', top: '7px', color: '#6b7d99', fontSize: '12px' }}>
              🔍
            </span>
            <input
              type="text"
              className="shop-search-input"
              placeholder="Buscar itens na loja..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px 6px 30px',
                backgroundColor: '#121622',
                border: '1px solid #283347',
                borderRadius: '5px',
                color: '#e2e8f0',
                fontSize: '12px',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: '#8291a8', fontWeight: 600 }}>Vocação:</span>
            <select
              value={vocationFilter}
              onChange={(e) => setVocationFilter(e.target.value as any)}
              style={{
                padding: '5px 10px',
                backgroundColor: '#121622',
                border: '1px solid #283347',
                borderRadius: '5px',
                color: '#ffd700',
                fontSize: '11.5px',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">Todas as Vocações</option>
              <option value="Knight">Knight</option>
              <option value="Paladin">Paladin</option>
              <option value="Sorcerer">Sorcerer</option>
              <option value="Druid">Druid</option>
            </select>
          </div>
        </div>

        {/* 1. SELETOR DE CATEGORIAS (ESTILO TREINO - PRINT 1) */}
        <div className="shop-categories-grid">
          {SHOP_CATEGORIES.map((cat) => {
            const isSelected = activeCategory === cat.id;
            return (
              <div
                key={cat.id}
                className={`shop-category-card ${isSelected ? 'selected' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
                title={cat.description}
              >
                <div className="shop-category-icon">
                  <ItemSprite itemId={cat.iconItemId} size={32} />
                </div>
                <span className="shop-category-label">{cat.label}</span>
              </div>
            );
          })}
        </div>

        {/* Feedback Message Banner */}
        {feedbackMsg && (
          <div
            style={{
              padding: '6px 12px',
              borderRadius: '5px',
              fontSize: '11.5px',
              fontWeight: 600,
              backgroundColor: feedbackMsg.isError ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
              border: `1px solid ${feedbackMsg.isError ? '#ef4444' : '#22c55e'}`,
              color: feedbackMsg.isError ? '#fca5a5' : '#86efac',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>{feedbackMsg.text}</span>
            <button
              type="button"
              onClick={() => setFeedbackMsg(null)}
              style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* 2. GRADE DE SLOTS DE ITENS (ESTILO PRINT 2) */}
        <div className="shop-items-matrix">
          {filteredItems.length === 0 ? (
            <div
              style={{
                gridColumn: '1 / -1',
                padding: '36px 12px',
                textAlign: 'center',
                color: '#64748b',
                fontSize: '12px',
              }}
            >
              Nenhum item encontrado nesta categoria ou filtro de busca.
            </div>
          ) : (
            filteredItems.map((item) => {
              const isSelected = selectedItem?.id === item.id;
              return (
                <div
                  key={item.id}
                  className={`shop-slot-item ${isSelected ? 'selected' : ''} ${
                    item.tier ? `tier-${item.tier}` : ''
                  }`}
                  onClick={() => {
                    setSelectedItem(item);
                    setQuantity(1);
                  }}
                  onMouseEnter={(e) => {
                    showGlobalItemTooltip(
                      {
                        itemId: item.id,
                        name: item.name,
                        price: item.price,
                      },
                      e
                    );
                  }}
                  onMouseLeave={() => hideGlobalItemTooltip()}
                  title={item.name}
                >
                  <ItemSprite itemId={item.id} size={32} />
                  <div className="slot-corner-accent" />
                </div>
              );
            })
          )}
        </div>

        {/* 3. PAINEL DE DETALHES E COMPRA DO ITEM SELECIONADO */}
        {selectedItem ? (
          <div
            className="shop-purchase-panel"
            style={{
              background: '#131824',
              border: '1px solid #232c3d',
              borderRadius: '6px',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '14px',
              flexWrap: 'wrap',
            }}
          >
            {/* Left: Item Preview & Stats */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 320px' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  background: '#192030',
                  border: '1px solid #2d384e',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <ItemSprite itemId={selectedItem.id} size={36} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 700, fontSize: '13px', color: '#f1f5f9' }}>
                    {selectedItem.name}
                  </span>
                  {selectedItem.charges && (
                    <span
                      style={{
                        fontSize: '9.5px',
                        padding: '1px 5px',
                        borderRadius: '3px',
                        background:
                          selectedItem.tier === 'lasting'
                            ? '#064e3b'
                            : selectedItem.tier === 'durable'
                            ? '#0369a1'
                            : '#831843',
                        color: '#f8fafc',
                        fontWeight: 700,
                      }}
                    >
                      {selectedItem.charges.toLocaleString('pt-BR')} cargas
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '10px', fontSize: '11px', color: '#94a3b8' }}>
                  {selectedItem.attack !== undefined && (
                    <span>
                      Atk: <strong style={{ color: '#ef4444' }}>{selectedItem.attack}</strong>
                    </span>
                  )}
                  {selectedItem.defense !== undefined && (
                    <span>
                      Def: <strong style={{ color: '#38bdf8' }}>{selectedItem.defense}</strong>
                    </span>
                  )}
                  {selectedItem.armor !== undefined && (
                    <span>
                      Arm: <strong style={{ color: '#eab308' }}>{selectedItem.armor}</strong>
                    </span>
                  )}
                  {selectedItem.range !== undefined && (
                    <span>
                      Alcance: <strong style={{ color: '#a855f7' }}>{selectedItem.range}</strong>
                    </span>
                  )}
                  {selectedItem.weightOz !== undefined && (
                    <span>
                      Peso: <strong>{selectedItem.weightOz} oz</strong>
                    </span>
                  )}
                  {selectedItem.levelReq && selectedItem.levelReq > 1 && (
                    <span>
                      Nível: <strong style={{ color: '#f59e0b' }}>{selectedItem.levelReq}+</strong>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Quantity Stepper & Buy Action */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
              {/* Stepper */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  style={{
                    width: '26px',
                    height: '26px',
                    background: '#1e2638',
                    border: '1px solid #334155',
                    borderRadius: '4px',
                    color: '#e2e8f0',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '13px',
                  }}
                >
                  -
                </button>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                  style={{
                    width: '42px',
                    height: '26px',
                    textAlign: 'center',
                    background: '#0f131c',
                    border: '1px solid #283347',
                    borderRadius: '4px',
                    color: '#f8fafc',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}
                />
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(100, q + 1))}
                  style={{
                    width: '26px',
                    height: '26px',
                    background: '#1e2638',
                    border: '1px solid #334155',
                    borderRadius: '4px',
                    color: '#e2e8f0',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '13px',
                  }}
                >
                  +
                </button>
              </div>

              {/* Price & Buy Button */}
              <button
                type="button"
                onClick={handleBuy}
                disabled={!canAfford}
                style={{
                  padding: '7px 16px',
                  borderRadius: '5px',
                  border: canAfford ? '1px solid #f59e0b' : '1px solid #475569',
                  background: canAfford
                    ? 'linear-gradient(180deg, #d97706 0%, #b45309 100%)'
                    : '#1e293b',
                  color: canAfford ? '#ffffff' : '#64748b',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: canAfford ? 'pointer' : 'not-allowed',
                  boxShadow: canAfford ? '0 2px 8px rgba(217, 119, 6, 0.4)' : 'none',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>Comprar por</span>
                <span style={{ color: canAfford ? '#fef08a' : 'inherit' }}>
                  {totalPrice.toLocaleString('pt-BR')} gp
                </span>
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{
              padding: '12px',
              textAlign: 'center',
              color: '#64748b',
              fontSize: '11.5px',
              background: '#131824',
              borderRadius: '6px',
            }}
          >
            Selecione um item da grade acima para visualizar os atributos e efetuar a compra.
          </div>
        )}
      </div>
    </div>
  );
}
