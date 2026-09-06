'use client';

import React, { useState, useMemo } from 'react';
import type { EquipmentDefinition } from '@/packages/content-schema/src';
import type { CharacterState } from '@/packages/domain/src';
import { ItemSprite } from './ItemSprite';
import { showGlobalItemTooltip, hideGlobalItemTooltip } from './GlobalItemTooltip';

export type ShopCategory = 'all' | 'weapons' | 'shields' | 'armors' | 'consumables' | 'accessories' | 'testing';
export type VocationFilter = 'all' | 'Knight' | 'Paladin' | 'Sorcerer' | 'Druid';

interface ShopItemDisplay {
  id: number;
  name: string;
  category: ShopCategory;
  price: number;
  attack?: number;
  defense?: number;
  armor?: number;
  weightOz?: number;
  levelReq?: number;
  vocations?: string[];
  description?: string;
}

interface ShopWindowProps {
  open: boolean;
  character: CharacterState;
  equipmentCatalog: EquipmentDefinition[];
  totalGold: number;
  onClose: () => void;
  onBuyItem: (itemId: number, itemName: string, price: number, quantity: number) => { ok: boolean; error?: string };
}

// Supplemental shop catalog items (potions, runes, food) to supplement equipment catalog
const SHOP_CONSUMABLES: ShopItemDisplay[] = [
  { id: 2148, name: 'Gold Coin', category: 'consumables', price: 1, vocations: ['all'], description: 'Moeda de ouro oficial.' },
  { id: 2152, name: 'Platinum Coin', category: 'consumables', price: 100, vocations: ['all'], description: 'Equivale a 100 moedas de ouro.' },
  { id: 2671, name: 'Dragon Ham', category: 'consumables', price: 25, vocations: ['all'], description: 'Alimento nutritivo de dragão.' },
  { id: 7618, name: 'Health Potion', category: 'consumables', price: 50, levelReq: 1, vocations: ['all'], description: 'Restaura aproximadamente 150 HP.' },
  { id: 7588, name: 'Strong Health Potion', category: 'consumables', price: 100, levelReq: 50, vocations: ['Knight', 'Paladin'], description: 'Restaura aproximadamente 300 HP.' },
  { id: 7591, name: 'Great Health Potion', category: 'consumables', price: 190, levelReq: 80, vocations: ['Knight'], description: 'Restaura aproximadamente 500 HP.' },
  { id: 7620, name: 'Mana Potion', category: 'consumables', price: 50, levelReq: 1, vocations: ['all'], description: 'Restaura aproximadamente 100 MP.' },
  { id: 7589, name: 'Strong Mana Potion', category: 'consumables', price: 80, levelReq: 50, vocations: ['Sorcerer', 'Druid', 'Paladin'], description: 'Restaura aproximadamente 150 MP.' },
  { id: 7590, name: 'Great Mana Potion', category: 'consumables', price: 120, levelReq: 80, vocations: ['Sorcerer', 'Druid'], description: 'Restaura aproximadamente 200 MP.' },
  { id: 2268, name: 'Sudden Death Rune', category: 'consumables', price: 135, levelReq: 45, vocations: ['Sorcerer'], description: 'Runa de ataque de morte súbita.' },
  { id: 2273, name: 'Ultimate Healing Rune', category: 'consumables', price: 175, levelReq: 24, vocations: ['Druid', 'Sorcerer'], description: 'Runa de cura intensa para si e companheiros.' },
  { id: 9912, name: 'Pergaminho de Troca de Vocação', category: 'consumables', price: 5000, vocations: ['all'], description: 'Permite redefinir a vocação do seu personagem se ele já estiver no Nível 8+.' },
  // Phase 75 & 76: Debug & Testing items for 0 gold
  { id: 9900, name: 'Saco de Ouro (10.000 GP)', category: 'testing', price: 0, vocations: ['all'], description: '⭐ TESTE: Adiciona 10.000 moedas de ouro imediatamente.' },
  { id: 9901, name: 'Tomo do Conhecimento (+1 Nível)', category: 'testing', price: 0, vocations: ['all'], description: '⭐ TESTE: Avança seu personagem em 1 nível e ajusta HP/Mana da vocação.' },
  { id: 9910, name: 'Tomo do Conhecimento Supremo (+10 Níveis)', category: 'testing', price: 0, vocations: ['all'], description: '⭐ TESTE: Avança seu personagem em 10 níveis de uma vez.' },
  { id: 9911, name: 'Elixir Divino (+50 Níveis)', category: 'testing', price: 0, vocations: ['all'], description: '⭐ TESTE: Avança seu personagem em 50 níveis de uma vez.' },
  { id: 9912, name: 'Pergaminho de Troca de Vocação (Gratuito)', category: 'testing', price: 0, vocations: ['all'], description: '⭐ TESTE: Permite redefinir a vocação do seu personagem imediatamente.' },
  { id: 9902, name: 'Pergaminho de Espada (+1 Sword)', category: 'testing', price: 0, vocations: ['all'], description: '⭐ TESTE: Avança a habilidade de Espada (Sword) em +1.' },
  { id: 9903, name: 'Pergaminho de Machado (+1 Axe)', category: 'testing', price: 0, vocations: ['all'], description: '⭐ TESTE: Avança a habilidade de Machado (Axe) em +1.' },
  { id: 9904, name: 'Pergaminho de Clava (+1 Club)', category: 'testing', price: 0, vocations: ['all'], description: '⭐ TESTE: Avança a habilidade de Clava (Club) em +1.' },
  { id: 9905, name: 'Pergaminho de Distância (+1 Distance)', category: 'testing', price: 0, vocations: ['all'], description: '⭐ TESTE: Avança a habilidade de Distância (Distance) em +1.' },
  { id: 9906, name: 'Pergaminho de Escudo (+1 Shielding)', category: 'testing', price: 0, vocations: ['all'], description: '⭐ TESTE: Avança a habilidade de Defesa com Escudo (Shielding) em +1.' },
  { id: 9907, name: 'Tomo Arcano (+1 Magic Level)', category: 'testing', price: 0, vocations: ['all'], description: '⭐ TESTE: Avança o Nível Mágico (Magic Level) em +1.' },
  { id: 9908, name: 'Faixa de Luta (+1 Fist)', category: 'testing', price: 0, vocations: ['all'], description: '⭐ TESTE: Avança a habilidade de Luta Desarmada (Fist) em +1.' },
  { id: 9909, name: 'Isca Mágica (+1 Fishing)', category: 'testing', price: 0, vocations: ['all'], description: '⭐ TESTE: Avança a habilidade de Pesca (Fishing) em +1.' },
];

export function ShopWindow({
  open,
  character,
  equipmentCatalog,
  totalGold,
  onClose,
  onBuyItem,
}: ShopWindowProps) {
  const [activeCategory, setActiveCategory] = useState<ShopCategory>('all');
  const [vocationFilter, setVocationFilter] = useState<VocationFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [quantities, setQuantities] = useState<Record<number, number>>({});

  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    if (typeof window !== 'undefined') {
      return {
        x: Math.max(20, Math.floor((window.innerWidth - 680) / 2)),
        y: Math.max(40, Math.floor((window.innerHeight - 540) / 2)),
      };
    }
    return { x: 300, y: 80 };
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

  // Convert equipment catalog to ShopItemDisplay format
  const shopCatalog = useMemo(() => {
    const items: ShopItemDisplay[] = [];

    equipmentCatalog.forEach((eq) => {
      let cat: ShopCategory = 'accessories';
      if (eq.slot === 'hand') {
        if (eq.weaponType !== 'none' && eq.weaponType !== 'shield') {
          cat = 'weapons';
        } else if (eq.weaponType === 'shield' || (eq.defense > 0 && !eq.attack)) {
          cat = 'shields';
        }
      } else if (['head', 'armor', 'legs', 'boots'].includes(eq.slot)) {
        cat = 'armors';
      }

      // Calculate fair shop price based on stats if not defined
      let price = eq.attack ? eq.attack * 120 : eq.defense ? eq.defense * 90 : eq.armor ? eq.armor * 100 : 150;
      if (price < 50) price = 50;

      items.push({
        id: eq.id,
        name: eq.name,
        category: cat,
        price,
        attack: eq.attack,
        defense: eq.defense,
        armor: eq.armor,
        weightOz: eq.weight?.ounces,
        levelReq: eq.requirements?.level ?? 1,
        vocations: eq.requirements?.vocations ?? ['all'],
        description: `Equipamento de ${eq.slot} para uso em combate.`,
      });
    });

    // Append consumables
    SHOP_CONSUMABLES.forEach((con) => items.push(con));
    return items;
  }, [equipmentCatalog]);

  // Filtered items based on active tab, vocation dropdown, and search query
  const filteredItems = useMemo(() => {
    return shopCatalog.filter((item) => {
      // Category Filter
      if (activeCategory !== 'all' && item.category !== activeCategory) return false;

      // Vocation Filter
      if (vocationFilter !== 'all') {
        if (item.vocations && !item.vocations.includes('all') && !item.vocations.includes(vocationFilter)) {
          return false;
        }
      }

      // Search Query Filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        if (!item.name.toLowerCase().includes(query)) return false;
      }

      return true;
    });
  }, [shopCatalog, activeCategory, vocationFilter, searchQuery]);

  if (!open) return null;

  const handleBuy = (item: ShopItemDisplay) => {
    const qty = quantities[item.id] || 1;
    const totalPrice = item.price * qty;

    const res = onBuyItem(item.id, item.name, item.price, qty);
    if (res.ok) {
      setFeedbackMsg({ text: `✓ Comprou ${qty}x ${item.name} por ${totalPrice.toLocaleString('pt-BR')} gold!`, isError: false });
    } else {
      setFeedbackMsg({ text: `❌ ${res.error || 'Erro ao comprar item.'}`, isError: true });
    }
  };

  const handleQuantityChange = (itemId: number, val: number) => {
    const safeVal = Math.max(1, Math.min(100, val));
    setQuantities((prev) => ({ ...prev, [itemId]: safeVal }));
  };

  const playerVocation = character.vocation || 'Knight';

  return (
    <div
      className="inventory-window-container floating-window shop-window"
      style={{ left: `${position.x}px`, top: `${position.y}px`, width: '680px', zIndex: 1200 }}
    >
      <div
        className="inventory-window-header draggable-header"
        onPointerDown={handleHeaderPointerDown}
        onPointerMove={handleHeaderPointerMove}
        onPointerUp={handleHeaderPointerUp}
      >
        <div className="inventory-header-left">
          <span className="inventory-header-icon">🛍️</span>
          <span className="inventory-header-title">Loja da Cidade (NPC Store)</span>
        </div>
        <div className="inventory-header-right">
          <span className="inventory-gold-badge" title="Seu Ouro Disponível">
            💰 {totalGold.toLocaleString('pt-BR')} gold
          </span>
          <button type="button" className="inventory-close-btn" onClick={onClose} aria-label="Fechar" title="Fechar Loja">
            ✕
          </button>
        </div>
      </div>

      <div className="shop-window-body" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Controls & Search Filter Bar */}
        <div className="shop-controls-bar" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="shop-search-input"
            placeholder="🔍 Buscar item..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              minWidth: '160px',
              padding: '6px 10px',
              backgroundColor: '#111418',
              border: '1px solid #3a3f47',
              borderRadius: '4px',
              color: '#f0f4f8',
              fontSize: '13px',
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: '#9098a5' }}>Vocação:</span>
            <select
              value={vocationFilter}
              onChange={(e) => setVocationFilter(e.target.value as VocationFilter)}
              style={{
                padding: '6px 10px',
                backgroundColor: '#111418',
                border: '1px solid #3a3f47',
                borderRadius: '4px',
                color: '#ffd700',
                fontSize: '12px',
                fontWeight: 'bold',
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

        {/* Category Tabs */}
        <div className="shop-category-tabs" style={{ display: 'flex', gap: '4px', borderBottom: '1px solid #2a2e35', paddingBottom: '6px' }}>
          {[
            { id: 'all', label: 'Todas' },
            { id: 'weapons', label: '⚔️ Armas' },
            { id: 'shields', label: '🛡️ Escudos' },
            { id: 'armors', label: '🛡️ Armaduras' },
            { id: 'consumables', label: '🧪 Consumíveis' },
            { id: 'accessories', label: '💍 Acessórios' },
            { id: 'testing', label: '⭐ Testes (0 GP)' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`shop-tab-btn ${activeCategory === tab.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(tab.id as ShopCategory)}
              style={{
                padding: '6px 12px',
                borderRadius: '4px 4px 0 0',
                border: 'none',
                backgroundColor: activeCategory === tab.id ? '#2b3038' : '#16191d',
                color: activeCategory === tab.id ? '#ffd700' : '#a0a8b5',
                fontSize: '12px',
                fontWeight: activeCategory === tab.id ? 'bold' : 'normal',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Feedback Banner Message */}
        {feedbackMsg && (
          <div
            style={{
              padding: '6px 12px',
              borderRadius: '4px',
              fontSize: '12px',
              backgroundColor: feedbackMsg.isError ? 'rgba(220, 53, 69, 0.2)' : 'rgba(40, 167, 69, 0.2)',
              border: `1px solid ${feedbackMsg.isError ? '#dc3545' : '#28a745'}`,
              color: feedbackMsg.isError ? '#ff6b6b' : '#51cf66',
            }}
          >
            {feedbackMsg.text}
          </div>
        )}

        {/* Shop Items List Grid */}
        <div
          className="shop-items-grid"
          style={{
            maxHeight: '340px',
            overflowY: 'auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '8px',
            paddingRight: '4px',
          }}
        >
          {filteredItems.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: '30px', textAlign: 'center', color: '#808895' }}>
              Nenhum item encontrado nesta categoria ou filtro.
            </div>
          ) : (
            filteredItems.map((item) => {
              const qty = quantities[item.id] || 1;
              const totalPrice = item.price * qty;
              const canAfford = totalGold >= totalPrice;
              const isVocMatch = !item.vocations || item.vocations.includes('all') || item.vocations.includes(playerVocation);

              return (
                <div
                  key={item.id}
                  className="shop-item-card"
                  style={{
                    display: 'flex',
                    gap: '10px',
                    padding: '8px',
                    backgroundColor: '#171a1e',
                    borderRadius: '6px',
                    border: `1px solid ${isVocMatch ? '#2e343d' : '#252930'}`,
                    opacity: isVocMatch ? 1 : 0.8,
                  }}
                  onMouseEnter={(e) => showGlobalItemTooltip({ itemId: item.id, name: item.name }, e)}
                  onMouseMove={(e) => showGlobalItemTooltip({ itemId: item.id, name: item.name }, e)}
                  onMouseLeave={() => hideGlobalItemTooltip()}
                >
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      backgroundColor: '#0c0e10',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid #333842',
                      flexShrink: 0,
                    }}
                  >
                    <ItemSprite itemId={item.id} label={item.name} />
                  </div>

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ fontSize: '13px', color: '#f0f4f8' }}>{item.name}</strong>
                        {item.levelReq && item.levelReq > 1 && (
                          <span style={{ fontSize: '10px', color: '#ffb74d', backgroundColor: 'rgba(255,183,77,0.1)', padding: '1px 4px', borderRadius: '3px' }}>
                            Lv {item.levelReq}
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '11px', color: '#8a94a2', marginTop: '2px', display: 'flex', gap: '8px' }}>
                        {item.attack !== undefined && <span>⚔️ Atk {item.attack}</span>}
                        {item.defense !== undefined && <span>🛡️ Def {item.defense}</span>}
                        {item.armor !== undefined && <span>🛡️ Arm {item.armor}</span>}
                        {item.weightOz !== undefined && <span>⚖️ {item.weightOz} oz</span>}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                      {item.price === 0 ? (
                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#51cf66', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          🎁 GRÁTIS (0 GP)
                        </span>
                      ) : (
                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: canAfford ? '#ffd700' : '#ff6b6b' }}>
                          💰 {totalPrice.toLocaleString('pt-BR')} gold
                        </span>
                      )}

                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        {(item.category === 'consumables' || item.category === 'testing') && item.id !== 2148 && item.id !== 2152 && (
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={qty}
                            onChange={(e) => handleQuantityChange(item.id, Number(e.target.value))}
                            style={{
                              width: '44px',
                              padding: '2px 4px',
                              backgroundColor: '#0d0f12',
                              border: '1px solid #333842',
                              color: '#fff',
                              fontSize: '11px',
                              borderRadius: '3px',
                              textAlign: 'center',
                            }}
                          />
                        )}

                        <button
                          type="button"
                          disabled={!canAfford}
                          onClick={() => handleBuy(item)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '4px',
                            border: 'none',
                            backgroundColor: canAfford ? (item.price === 0 ? '#1971c2' : '#28a745') : '#495057',
                            color: canAfford ? '#ffffff' : '#868e96',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            cursor: canAfford ? 'pointer' : 'not-allowed',
                          }}
                        >
                          {item.price === 0 ? 'Obter (0 GP)' : 'Comprar'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
