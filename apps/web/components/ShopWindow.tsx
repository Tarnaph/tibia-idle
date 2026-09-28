'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { EquipmentDefinition, ItemEconomyCatalog } from '@/packages/content-schema/src';
import {
  preferredSellPrice,
  type CharacterState,
  type LootStack,
} from '@/packages/domain/src';
import { ItemSprite } from './ItemSprite';
import { showGlobalItemTooltip, hideGlobalItemTooltip } from './GlobalItemTooltip';
import {
  SHOP_CATEGORIES,
  SHOP_ITEMS_CATALOG,
  type ShopCategoryId,
  type ShopItemEntry,
} from '@/apps/web/lib/shopCatalog';

interface SellEntry {
  container: 'backpack' | 'bag';
  containerLabel: 'Mochila' | 'Bolsa';
  itemId: number;
  name: string;
  amount: number;
  unitPrice: number;
}

interface ShopWindowProps {
  open: boolean;
  character: CharacterState;
  equipmentCatalog?: EquipmentDefinition[];
  backpackItems?: LootStack[];
  bagItems?: LootStack[];
  economyCatalog?: ItemEconomyCatalog;
  totalGold: number;
  onClose: () => void;
  onBuyItem: (itemId: number, itemName: string, price: number, quantity: number) => { ok: boolean; error?: string };
  onSellItem?: (container: 'backpack' | 'bag', itemId: number, quantity: number, unitPrice: number) => { ok: boolean; error?: string };
}

export function ShopWindow({
  open,
  character,
  equipmentCatalog = [],
  backpackItems = [],
  bagItems = [],
  economyCatalog,
  totalGold,
  onClose,
  onBuyItem,
  onSellItem,
}: ShopWindowProps) {
  const [activeTab, setActiveTab] = useState<'comprar' | 'vender'>('comprar');
  const [activeCategory, setActiveCategory] = useState<ShopCategoryId>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [vocationFilter, setVocationFilter] = useState<'all' | 'Knight' | 'Paladin' | 'Sorcerer' | 'Druid'>('all');
  const [selectedItem, setSelectedItem] = useState<ShopItemEntry | null>(SHOP_ITEMS_CATALOG[0] || null);
  const [quantity, setQuantity] = useState<number>(1);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; isError: boolean } | null>(null);

  // Vender tab state
  const [selectedSellEntry, setSelectedSellEntry] = useState<SellEntry | null>(null);
  const [sellQuantity, setSellQuantity] = useState<number>(1);

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

  // Filtered items based on active category, vocation and search (Comprar)
  const filteredItems = useMemo(() => {
    return SHOP_ITEMS_CATALOG.filter((item) => {
      if (activeCategory !== 'all' && item.category !== activeCategory) {
        return false;
      }
      if (vocationFilter !== 'all') {
        if (item.vocations && !item.vocations.includes('all') && !item.vocations.includes(vocationFilter)) {
          return false;
        }
      }
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

  // Resolve sell price
  const getItemUnitPrice = (itemId: number): number => {
    if (economyCatalog) {
      const itemEcon = (economyCatalog.items as any[]).find((it: any) => it.itemId === itemId);
      if (itemEcon) {
        const p = preferredSellPrice(itemEcon)?.price;
        if (p !== undefined && p !== null && p > 0) return p;
      }
    }
    const shopItem = SHOP_ITEMS_CATALOG.find((it) => it.id === itemId);
    if (shopItem) {
      return Math.max(1, Math.floor(shopItem.price * 0.5));
    }
    const equip = equipmentCatalog?.find((it) => it.id === itemId);
    if (equip) {
      return Math.max(10, (equip.requirements?.level ?? 1) * 15);
    }
    return 5;
  };

  // Build sell list from Mochila and Bolsa
  const sellEntries = useMemo(() => {
    const list: SellEntry[] = [];
    backpackItems.forEach((stack) => {
      if (stack && stack.itemId !== undefined && stack.amount > 0) {
        list.push({
          container: 'backpack',
          containerLabel: 'Mochila',
          itemId: stack.itemId,
          name: stack.name,
          amount: stack.amount,
          unitPrice: getItemUnitPrice(stack.itemId),
        });
      }
    });
    bagItems.forEach((stack) => {
      if (stack && stack.itemId !== undefined && stack.amount > 0) {
        list.push({
          container: 'bag',
          containerLabel: 'Bolsa',
          itemId: stack.itemId,
          name: stack.name,
          amount: stack.amount,
          unitPrice: getItemUnitPrice(stack.itemId),
        });
      }
    });
    return list;
  }, [backpackItems, bagItems, economyCatalog, equipmentCatalog]);

  // Keep selected sell entry synced
  useEffect(() => {
    if (sellEntries.length > 0) {
      if (!selectedSellEntry || !sellEntries.some((e) => e.itemId === selectedSellEntry.itemId && e.container === selectedSellEntry.container)) {
        setSelectedSellEntry(sellEntries[0]);
        setSellQuantity(1);
      }
    } else {
      setSelectedSellEntry(null);
    }
  }, [sellEntries, selectedSellEntry]);

  if (!open) return null;

  const handleBuy = () => {
    if (!selectedItem) return;
    const totalPrice = selectedItem.price * quantity;
    if (totalGold < totalPrice) {
      setFeedbackMsg({
        text: `Gold insuficiente! Você precisa de ${totalPrice.toLocaleString('pt-BR')} gold.`,
        isError: true,
      });
      return;
    }

    const res = onBuyItem(selectedItem.id, selectedItem.name, selectedItem.price, quantity);
    if (res.ok) {
      setFeedbackMsg({
        text: `Comprou ${quantity}x ${selectedItem.name} por ${totalPrice.toLocaleString('pt-BR')} gold!`,
        isError: false,
      });
      setTimeout(() => setFeedbackMsg(null), 4000);
    } else {
      setFeedbackMsg({ text: res.error || 'Erro ao efetuar compra.', isError: true });
    }
  };

  const handleSell = () => {
    if (!selectedSellEntry || !onSellItem) return;
    const res = onSellItem(
      selectedSellEntry.container,
      selectedSellEntry.itemId,
      sellQuantity,
      selectedSellEntry.unitPrice
    );
    if (res.ok) {
      const totalEarned = selectedSellEntry.unitPrice * sellQuantity;
      setFeedbackMsg({
        text: `Vendeu ${sellQuantity}x ${selectedSellEntry.name} por ${totalEarned.toLocaleString('pt-BR')} gold!`,
        isError: false,
      });
      setTimeout(() => setFeedbackMsg(null), 4000);
      setSellQuantity(1);
    } else {
      setFeedbackMsg({ text: res.error || 'Erro ao vender item.', isError: true });
    }
  };

  const totalPrice = selectedItem ? selectedItem.price * quantity : 0;
  const canAfford = totalGold >= totalPrice && totalPrice > 0;

  return (
    <div
      className="inventory-window-container floating-window shop-window"
      style={{
        position: 'fixed',
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
      <style>{`
        .shop-categories-grid {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          padding: 4px 2px;
          scrollbar-width: thin;
          scrollbar-color: #2b364a #0d111a;
        }
        .shop-categories-grid::-webkit-scrollbar {
          height: 5px;
        }
        .shop-categories-grid::-webkit-scrollbar-thumb {
          background: #2b364a;
          border-radius: 3px;
        }
        .shop-category-card {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: #131822;
          border: 1px solid #232d3f;
          border-radius: 4px;
          cursor: pointer;
          white-space: nowrap;
          transition: all 120ms ease;
          user-select: none;
          flex-shrink: 0;
        }
        .shop-category-card:hover {
          background: #1c2434;
          border-color: #3b4d6b;
        }
        .shop-category-card.selected {
          background: #1f293d;
          border-color: #eab308;
          box-shadow: 0 0 8px rgba(234, 179, 8, 0.25);
        }
        .shop-category-icon {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .shop-category-name {
          font-size: 11px;
          font-weight: 700;
          color: #cbd5e1;
        }
        .shop-category-card.selected .shop-category-name {
          color: #facc15;
        }
        .shop-items-panel {
          max-height: 340px;
          min-height: 280px;
          overflow-y: auto;
          background: #0b0e14;
          border: 1px solid #1c2433;
          border-radius: 6px;
          padding: 8px;
          scrollbar-width: thin;
          scrollbar-color: #2b364a #0d111a;
        }
        .shop-items-panel::-webkit-scrollbar {
          width: 6px;
        }
        .shop-items-panel::-webkit-scrollbar-thumb {
          background: #2b364a;
          border-radius: 3px;
        }
        .shop-items-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
          gap: 8px;
        }
        .shop-item-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          background: #131822;
          border: 1px solid #232d3f;
          border-radius: 6px;
          padding: 8px 6px;
          cursor: pointer;
          transition: all 120ms ease;
          position: relative;
          user-select: none;
        }
        .shop-item-card:hover {
          background: #1a2230;
          border-color: #3b4d6b;
          transform: translateY(-1px);
        }
        .shop-item-card.selected {
          background: #1b2438;
          border-color: #eab308;
          box-shadow: 0 0 10px rgba(234, 179, 8, 0.35);
        }
        .shop-item-card.unaffordable {
          opacity: 0.6;
        }
        .shop-item-sprite-box {
          width: 44px;
          height: 44px;
          background: #0a0d13;
          border: 1px solid #1c2433;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 6px;
          position: relative;
        }
        .shop-item-info {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          gap: 3px;
        }
        .shop-item-title {
          font-size: 11px;
          font-weight: 700;
          color: #f1f5f9;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 115px;
          line-height: 1.2;
        }
        .shop-item-cost {
          font-size: 10.5px;
          font-weight: 800;
          color: #facc15;
          background: rgba(234, 179, 8, 0.12);
          border: 1px solid rgba(234, 179, 8, 0.25);
          border-radius: 10px;
          padding: 1px 7px;
          margin-top: 2px;
          line-height: 1.2;
        }
        .shop-preview-panel {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: #111622;
          border: 1px solid #232d3f;
          border-radius: 6px;
          margin-top: 4px;
        }
        .shop-empty-state {
          grid-column: 1 / -1;
          padding: 32px 16px;
          text-align: center;
          color: #64748b;
          font-size: 12px;
          font-style: italic;
        }
        .item-amount-badge {
          position: absolute;
          bottom: 2px;
          right: 2px;
          font-size: 9px;
          font-weight: 800;
          color: #ffffff;
          background: rgba(0, 0, 0, 0.8);
          border-radius: 3px;
          padding: 0 4px;
          line-height: 1.2;
        }
      `}</style>
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
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffd700" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span style={{ fontWeight: 700, fontSize: '13px', color: '#ffd700', letterSpacing: '0.5px' }}>
            LOJA DA CIDADE · EQUIPAMENTOS & ITENS
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
            <svg width="13" height="13" viewBox="0 0 24 24" fill="#f5c518">
              <circle cx="12" cy="12" r="10" stroke="#b45309" strokeWidth="2" />
            </svg>
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

      {/* Mode Tabs: COMPRAR vs VENDER */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid #242d3d',
          padding: '0 14px',
          background: '#0e121a',
        }}
      >
        <button
          type="button"
          onClick={() => {
            setActiveTab('comprar');
            setFeedbackMsg(null);
          }}
          style={{
            padding: '8px 20px',
            background: activeTab === 'comprar' ? '#171e2c' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'comprar' ? '2px solid #eab308' : '2px solid transparent',
            color: activeTab === 'comprar' ? '#f8fafc' : '#7d8da6',
            fontWeight: 700,
            fontSize: '12px',
            letterSpacing: '0.6px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          COMPRAR
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('vender');
            setFeedbackMsg(null);
          }}
          style={{
            padding: '8px 20px',
            background: activeTab === 'vender' ? '#171e2c' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'vender' ? '2px solid #eab308' : '2px solid transparent',
            color: activeTab === 'vender' ? '#f8fafc' : '#7d8da6',
            fontWeight: 700,
            fontSize: '12px',
            letterSpacing: '0.6px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          VENDER
        </button>
      </div>

      {/* Main Body */}
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {activeTab === 'comprar' ? (
          <>
            {/* Top Controls: Search Bar & Vocation Filter */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <span style={{ position: 'absolute', left: '10px', top: '7px', color: '#6b7d99', fontSize: '12px' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
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

            {/* Category Selector Grid */}
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
                      <ItemSprite itemId={cat.iconItemId} label={cat.label} size={28} />
                    </div>
                    <span className="shop-category-name">{cat.label}</span>
                  </div>
                );
              })}
            </div>

            {/* Catalog Grid */}
            <div className="shop-items-panel">
              <div className="shop-items-grid">
                {filteredItems.map((item) => {
                  const isSelected = selectedItem?.id === item.id;
                  const itemAffordable = totalGold >= item.price;
                  return (
                    <div
                      key={item.id}
                      className={`shop-item-card ${isSelected ? 'selected' : ''} ${!itemAffordable ? 'unaffordable' : ''}`}
                      onClick={() => {
                        setSelectedItem(item);
                        setQuantity(1);
                      }}
                      onMouseEnter={(e) =>
                        showGlobalItemTooltip(
                          {
                            itemId: item.id,
                            name: item.name,
                            price: item.price,
                          },
                          e
                        )
                      }
                      onMouseMove={(e) =>
                        showGlobalItemTooltip(
                          {
                            itemId: item.id,
                            name: item.name,
                            price: item.price,
                          },
                          e
                        )
                      }
                      onMouseLeave={hideGlobalItemTooltip}
                    >
                      <div className="shop-item-sprite-box">
                        <ItemSprite itemId={item.id} label={item.name} size={32} />
                      </div>
                      <div className="shop-item-info">
                        <span className="shop-item-title">{item.name}</span>
                        <span className="shop-item-cost">{item.price.toLocaleString('pt-BR')} gp</span>
                      </div>
                    </div>
                  );
                })}
                {filteredItems.length === 0 && (
                  <div className="shop-empty-state">
                    Nenhum item encontrado nesta categoria ou pesquisa.
                  </div>
                )}
              </div>
            </div>

            {/* Feedback Message */}
            {feedbackMsg && (
              <div
                style={{
                  padding: '7px 12px',
                  borderRadius: '5px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  backgroundColor: feedbackMsg.isError ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                  color: feedbackMsg.isError ? '#fca5a5' : '#86efac',
                  border: feedbackMsg.isError ? '1px solid #ef4444' : '1px solid #22c55e',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>{feedbackMsg.isError ? '[Aviso]' : '[OK]'}</span>
                <span>{feedbackMsg.text}</span>
              </div>
            )}

            {/* Bottom Preview & Buy Panel */}
            {selectedItem ? (
              <div className="shop-preview-panel">
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      background: '#121724',
                      border: '1px solid #283347',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ItemSprite itemId={selectedItem.id} label={selectedItem.name} size={38} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#f8fafc' }}>
                      {selectedItem.name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                      {selectedItem.description}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  {/* Quantity Stepper */}
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

                  {/* Buy Button */}
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
          </>
        ) : (
          /* ========================================================= */
          /* ABA VENDER (ITENS DA MOCHILA E DA BOLSA)                  */
          /* ========================================================= */
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                Selecione um item da sua mochila ou bolsa para vender diretamente:
              </span>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                {sellEntries.length} itens disponíveis
              </span>
            </div>

            {/* List of Sellable Items */}
            <div className="shop-items-panel" style={{ maxHeight: '330px', minHeight: '260px' }}>
              <div className="shop-items-grid">
                {sellEntries.map((entry, idx) => {
                  const isSelected =
                    selectedSellEntry?.itemId === entry.itemId &&
                    selectedSellEntry?.container === entry.container;
                  return (
                    <div
                      key={`${entry.container}-${entry.itemId}-${idx}`}
                      className={`shop-item-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedSellEntry(entry);
                        setSellQuantity(1);
                      }}
                      onMouseEnter={(e) =>
                        showGlobalItemTooltip(
                          {
                            itemId: entry.itemId,
                            name: entry.name,
                            amount: entry.amount,
                            price: entry.unitPrice,
                          },
                          e
                        )
                      }
                      onMouseMove={(e) =>
                        showGlobalItemTooltip(
                          {
                            itemId: entry.itemId,
                            name: entry.name,
                            amount: entry.amount,
                            price: entry.unitPrice,
                          },
                          e
                        )
                      }
                      onMouseLeave={hideGlobalItemTooltip}
                    >
                      <div className="shop-item-sprite-box">
                        <ItemSprite itemId={entry.itemId} label={entry.name} size={32} />
                        {entry.amount > 1 && (
                          <span className="item-amount-badge">{entry.amount}</span>
                        )}
                      </div>
                      <div className="shop-item-info">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span
                            style={{
                              fontSize: '9px',
                              padding: '1px 4px',
                              borderRadius: '3px',
                              background: entry.container === 'backpack' ? '#1e293b' : '#334155',
                              color: '#94a3b8',
                              fontWeight: 600,
                            }}
                          >
                            {entry.containerLabel}
                          </span>
                          <span className="shop-item-title">{entry.name}</span>
                        </div>
                        <span className="shop-item-cost" style={{ color: '#4ade80' }}>
                          +{entry.unitPrice.toLocaleString('pt-BR')} gp
                        </span>
                      </div>
                    </div>
                  );
                })}
                {sellEntries.length === 0 && (
                  <div className="shop-empty-state">
                    Sua mochila e bolsa estão vazias no momento.
                  </div>
                )}
              </div>
            </div>

            {/* Feedback Message */}
            {feedbackMsg && (
              <div
                style={{
                  padding: '7px 12px',
                  borderRadius: '5px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  backgroundColor: feedbackMsg.isError ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                  color: feedbackMsg.isError ? '#fca5a5' : '#86efac',
                  border: feedbackMsg.isError ? '1px solid #ef4444' : '1px solid #22c55e',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>{feedbackMsg.isError ? '[Aviso]' : '[OK]'}</span>
                <span>{feedbackMsg.text}</span>
              </div>
            )}

            {/* Bottom Sell Action Panel */}
            {selectedSellEntry ? (
              <div className="shop-preview-panel">
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      background: '#121724',
                      border: '1px solid #283347',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ItemSprite itemId={selectedSellEntry.itemId} label={selectedSellEntry.name} size={38} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#f8fafc' }}>
                      {selectedSellEntry.name}{' '}
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                        ({selectedSellEntry.containerLabel} · {selectedSellEntry.amount} no inventário)
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#4ade80', marginTop: '2px' }}>
                      Valor unitário: {selectedSellEntry.unitPrice.toLocaleString('pt-BR')} gp
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* Quantity Stepper */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => setSellQuantity((q) => Math.max(1, q - 1))}
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
                      max={selectedSellEntry.amount}
                      value={sellQuantity}
                      onChange={(e) =>
                        setSellQuantity(
                          Math.max(1, Math.min(selectedSellEntry.amount, Number(e.target.value) || 1))
                        )
                      }
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
                      onClick={() =>
                        setSellQuantity((q) => Math.min(selectedSellEntry.amount, q + 1))
                      }
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
                    <button
                      type="button"
                      onClick={() => setSellQuantity(selectedSellEntry.amount)}
                      style={{
                        padding: '4px 8px',
                        height: '26px',
                        background: '#1e2638',
                        border: '1px solid #334155',
                        borderRadius: '4px',
                        color: '#ffd700',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: '10.5px',
                      }}
                    >
                      TUDO
                    </button>
                  </div>

                  {/* Sell Button */}
                  <button
                    type="button"
                    onClick={handleSell}
                    style={{
                      padding: '7px 18px',
                      borderRadius: '5px',
                      border: '1px solid #16a34a',
                      background: 'linear-gradient(180deg, #16a34a 0%, #15803d 100%)',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '12px',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(22, 163, 74, 0.4)',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>Vender por</span>
                    <span style={{ color: '#fef08a' }}>
                      {(selectedSellEntry.unitPrice * sellQuantity).toLocaleString('pt-BR')} gp
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
                Selecione um item da lista acima para vendê-lo.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
