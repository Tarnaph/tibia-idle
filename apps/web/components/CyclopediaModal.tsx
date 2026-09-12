'use client';

import React, { useState, useMemo } from 'react';
import {
  ITEM_CATEGORIES,
  CANONICAL_CYCLOPEDIA_ITEMS,
  CANONICAL_BESTIARY_MONSTERS,
  CANONICAL_BOSSTIARY_BOSSES,
  BOSS_POINT_PERKS,
  formatNumberWithDots,
  type ItemEntry,
  type ItemCategory,
  type BestiaryMonster,
  type BosstiaryBoss,
} from '../lib/cyclopediaData';

export type CyclopediaTab = 'items' | 'bestiary' | 'bosstiary' | 'boss-points' | 'character';

interface CyclopediaModalProps {
  open: boolean;
  onClose: () => void;
  gold?: number;
  bestiaryKills?: Record<string, number>;
  trackedMonsterId?: string | null;
  bossPoints?: number;
  onTrackMonster?: (monsterId: string) => void;
  initialTab?: CyclopediaTab;
  characterName?: string;
  characterVocation?: string;
}

const ELEMENT_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  physical: { label: 'Físico', icon: '✊', color: '#ffffff' },
  energy: { label: 'Energia', icon: '⚡', color: '#b366ff' },
  earth: { label: 'Terra', icon: '🍃', color: '#2ecc71' },
  fire: { label: 'Fogo', icon: '🔥', color: '#e67e22' },
  ice: { label: 'Gelo', icon: '❄️', color: '#3498db' },
  holy: { label: 'Sagrado', icon: '✨', color: '#f1c40f' },
  death: { label: 'Morte', icon: '💀', color: '#95a5a6' },
};

export function CyclopediaModal({
  open,
  onClose,
  gold = 1171740017,
  bestiaryKills = {},
  trackedMonsterId = null,
  bossPoints = 45,
  onTrackMonster,
  initialTab = 'items',
  characterName = 'Hero',
  characterVocation = 'Knight',
}: CyclopediaModalProps) {
  const [activeTab, setActiveTab] = useState<CyclopediaTab>(initialTab);

  // Items tab state
  const [itemSearch, setItemSearch] = useState('');
  const [itemSort, setItemSort] = useState<'name-asc' | 'name-desc' | 'attack-desc' | 'defense-desc' | 'level-asc' | 'price-desc'>('name-asc');
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory>('Armas (corpo a corpo)');
  const [itemPage, setItemPage] = useState(1);
  const [selectedItemId, setSelectedItemId] = useState<number>(7414);

  // Bestiary tab state
  const [bestiarySearch, setBestiarySearch] = useState('');
  const [bestiaryPage, setBestiaryPage] = useState(1);
  const [selectedMonster, setSelectedMonster] = useState<BestiaryMonster | null>(null);

  // Bosstiary tab state
  const [bossSearch, setBossSearch] = useState('');
  const [selectedBoss, setSelectedBoss] = useState<BosstiaryBoss | null>(null);

  // --- Category Counts ---
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of ITEM_CATEGORIES) {
      counts[cat] = CANONICAL_CYCLOPEDIA_ITEMS.filter((it) => it.category === cat).length;
    }
    return counts;
  }, []);

  // --- Filtered and Sorted Items ---
  const filteredItems = useMemo(() => {
    return CANONICAL_CYCLOPEDIA_ITEMS.filter((it) => {
      if (it.category !== selectedCategory) return false;
      if (itemSearch.trim()) {
        const query = itemSearch.toLowerCase();
        return (
          it.name.toLowerCase().includes(query) ||
          it.droppedBy.some((d) => d.toLowerCase().includes(query)) ||
          it.categoriesText.toLowerCase().includes(query)
        );
      }
      return true;
    }).sort((a, b) => {
      switch (itemSort) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'attack-desc':
          return b.attack - a.attack;
        case 'defense-desc':
          return b.defense - a.defense;
        case 'level-asc':
          return a.level - b.level;
        case 'price-desc':
          return b.price - a.price;
        default:
          return 0;
      }
    });
  }, [selectedCategory, itemSearch, itemSort]);

  const itemsPerPage = 10;
  const totalItemPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));
  const currentPageItems = filteredItems.slice((itemPage - 1) * itemsPerPage, itemPage * itemsPerPage);

  const currentSelectedItem = useMemo(() => {
    return (
      CANONICAL_CYCLOPEDIA_ITEMS.find((it) => it.id === selectedItemId) ||
      currentPageItems[0] ||
      CANONICAL_CYCLOPEDIA_ITEMS[0]
    );
  }, [selectedItemId, currentPageItems]);

  // --- Filtered Bestiary Creatures ---
  const filteredMonsters = useMemo(() => {
    if (!bestiarySearch.trim()) return CANONICAL_BESTIARY_MONSTERS;
    const q = bestiarySearch.toLowerCase();
    return CANONICAL_BESTIARY_MONSTERS.filter(
      (m) => m.name.toLowerCase().includes(q) || m.locations.some((loc) => loc.toLowerCase().includes(q))
    );
  }, [bestiarySearch]);

  const bestiaryPerPage = 25;
  const totalBestiaryPages = Math.max(1, Math.ceil(filteredMonsters.length / bestiaryPerPage));
  const currentPageMonsters = filteredMonsters.slice((bestiaryPage - 1) * bestiaryPerPage, bestiaryPage * bestiaryPerPage);

  // --- Filtered Bosstiary Bosses ---
  const filteredBosses = useMemo(() => {
    if (!bossSearch.trim()) return CANONICAL_BOSSTIARY_BOSSES;
    const q = bossSearch.toLowerCase();
    return CANONICAL_BOSSTIARY_BOSSES.filter(
      (b) => b.name.toLowerCase().includes(q) || b.tier.toLowerCase().includes(q)
    );
  }, [bossSearch]);

  if (!open) return null;

  // Handle Return button logic
  const handleReturn = () => {
    if (activeTab === 'bestiary' && selectedMonster) {
      setSelectedMonster(null);
    } else if (activeTab === 'bosstiary' && selectedBoss) {
      setSelectedBoss(null);
    } else {
      onClose();
    }
  };

  const isDetailView = (activeTab === 'bestiary' && !!selectedMonster) || (activeTab === 'bosstiary' && !!selectedBoss);

  return (
    <div
      id="cyclopedia-modal-overlay"
      className="cyclopedia-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(2px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="cyclopedia-modal-window"
        className="cyclopedia-window"
        style={{
          width: '920px',
          height: '620px',
          backgroundColor: '#26292e',
          backgroundImage: 'linear-gradient(180deg, #30353c 0%, #22252a 100%)',
          border: '2px solid #474f5c',
          boxShadow: '0 16px 48px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
          borderRadius: '4px',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'Verdana, sans-serif',
          color: '#d4d8df',
          userSelect: 'none',
          overflow: 'hidden',
        }}
      >
        {/* ===================== TOP TAB HEADER ===================== */}
        <div
          style={{
            padding: '8px 12px',
            backgroundColor: '#1b1e22',
            borderBottom: '1px solid #141618',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {/* Items Tab */}
          <button
            type="button"
            className={`cyclopedia-tab-btn ${activeTab === 'items' ? 'active' : ''}`}
            onClick={() => setActiveTab('items')}
            style={{
              height: '32px',
              padding: '0 12px',
              backgroundColor: activeTab === 'items' ? '#2c313a' : '#1e2126',
              border: activeTab === 'items' ? '1px solid #6b778c' : '1px solid #363b45',
              borderRadius: '3px',
              color: activeTab === 'items' ? '#ffffff' : '#9ea7b4',
              fontWeight: 'bold',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: activeTab === 'items' ? 'inset 0 1px 0 rgba(255,255,255,0.1)' : 'none',
            }}
          >
            <span>⚔️</span>
            <span>Items</span>
          </button>

          {/* Bestiary Tab */}
          <button
            type="button"
            className={`cyclopedia-tab-btn ${activeTab === 'bestiary' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('bestiary');
              setSelectedMonster(null);
            }}
            style={{
              height: '32px',
              padding: activeTab === 'bestiary' ? '0 12px' : '0 8px',
              backgroundColor: activeTab === 'bestiary' ? '#2c313a' : '#1e2126',
              border: activeTab === 'bestiary' ? '1px solid #6b778c' : '1px solid #363b45',
              borderRadius: '3px',
              color: activeTab === 'bestiary' ? '#ffffff' : '#9ea7b4',
              fontWeight: 'bold',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
            }}
            title="Bestiary"
          >
            <span>💀</span>
            {activeTab === 'bestiary' && <span>Bestiary</span>}
          </button>

          {/* Bosstiary Tab */}
          <button
            type="button"
            className={`cyclopedia-tab-btn ${activeTab === 'bosstiary' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('bosstiary');
              setSelectedBoss(null);
            }}
            style={{
              height: '32px',
              padding: activeTab === 'bosstiary' ? '0 12px' : '0 8px',
              backgroundColor: activeTab === 'bosstiary' ? '#2c313a' : '#1e2126',
              border: activeTab === 'bosstiary' ? '1px solid #6b778c' : '1px solid #363b45',
              borderRadius: '3px',
              color: activeTab === 'bosstiary' ? '#ffffff' : '#9ea7b4',
              fontWeight: 'bold',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
            }}
            title="Bosstiary"
          >
            <span>📖</span>
            {activeTab === 'bosstiary' && <span>Bosstiary</span>}
          </button>

          {/* Boss Points Tab */}
          <button
            type="button"
            className={`cyclopedia-tab-btn ${activeTab === 'boss-points' ? 'active' : ''}`}
            onClick={() => setActiveTab('boss-points')}
            style={{
              height: '32px',
              padding: activeTab === 'boss-points' ? '0 12px' : '0 8px',
              backgroundColor: activeTab === 'boss-points' ? '#2c313a' : '#1e2126',
              border: activeTab === 'boss-points' ? '1px solid #6b778c' : '1px solid #363b45',
              borderRadius: '3px',
              color: activeTab === 'boss-points' ? '#ffffff' : '#9ea7b4',
              fontWeight: 'bold',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
            }}
            title="Boss Points"
          >
            <span>🛡️</span>
            {activeTab === 'boss-points' && <span>Boss Points</span>}
          </button>

          {/* Character Tab */}
          <button
            type="button"
            className={`cyclopedia-tab-btn ${activeTab === 'character' ? 'active' : ''}`}
            onClick={() => setActiveTab('character')}
            style={{
              height: '32px',
              padding: activeTab === 'character' ? '0 12px' : '0 8px',
              backgroundColor: activeTab === 'character' ? '#2c313a' : '#1e2126',
              border: activeTab === 'character' ? '1px solid #6b778c' : '1px solid #363b45',
              borderRadius: '3px',
              color: activeTab === 'character' ? '#ffffff' : '#9ea7b4',
              fontWeight: 'bold',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
            }}
            title="Character"
          >
            <span>🔍</span>
            {activeTab === 'character' && <span>Character</span>}
          </button>
        </div>

        {/* ===================== TAB CONTENT AREA ===================== */}
        <div style={{ flex: 1, overflow: 'hidden', padding: '12px 14px' }}>
          {/* ========================================================= */}
          {/* TAB 1: ITEMS                                              */}
          {/* ========================================================= */}
          {activeTab === 'items' && (
            <div style={{ display: 'flex', height: '100%', gap: '12px' }}>
              {/* Left Column: Search, Sort & Category List */}
              <div style={{ width: '220px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Buscar item..."
                  value={itemSearch}
                  onChange={(e) => {
                    setItemSearch(e.target.value);
                    setItemPage(1);
                  }}
                  style={{
                    height: '28px',
                    padding: '0 8px',
                    backgroundColor: '#181a1d',
                    border: '1px solid #3c434f',
                    borderRadius: '2px',
                    color: '#ffffff',
                    fontSize: '11px',
                    outline: 'none',
                  }}
                />

                <select
                  value={itemSort}
                  onChange={(e) => setItemSort(e.target.value as any)}
                  style={{
                    height: '28px',
                    padding: '0 6px',
                    backgroundColor: '#181a1d',
                    border: '1px solid #3c434f',
                    borderRadius: '2px',
                    color: '#d4d8df',
                    fontSize: '11px',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="name-asc">Nome (A-Z)</option>
                  <option value="name-desc">Nome (Z-A)</option>
                  <option value="attack-desc">Ataque (Maior)</option>
                  <option value="defense-desc">Defesa (Maior)</option>
                  <option value="level-asc">Nível (Menor)</option>
                  <option value="price-desc">Valor (Maior)</option>
                </select>

                {/* Category List */}
                <div
                  style={{
                    flex: 1,
                    backgroundColor: '#181b1f',
                    border: '1px solid #363d47',
                    borderRadius: '2px',
                    overflowY: 'auto',
                  }}
                >
                  {ITEM_CATEGORIES.map((cat) => {
                    const count = categoryCounts[cat] || 0;
                    const isCatSelected = selectedCategory === cat;
                    return (
                      <div
                        key={cat}
                        onClick={() => {
                          setSelectedCategory(cat);
                          setItemPage(1);
                        }}
                        style={{
                          padding: '7px 10px',
                          fontSize: '11px',
                          fontWeight: isCatSelected ? 'bold' : 'normal',
                          color: isCatSelected ? '#f3d067' : '#9ca3af',
                          backgroundColor: isCatSelected ? '#2b3038' : 'transparent',
                          borderBottom: '1px solid #20242a',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span>{cat}</span>
                        <span style={{ fontSize: '10px', opacity: 0.8 }}>({count})</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Middle Column: Items List & Pagination */}
              <div
                style={{
                  width: '260px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                {/* Pagination header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    height: '28px',
                    backgroundColor: '#1c1f24',
                    border: '1px solid #333a45',
                    borderRadius: '2px',
                    fontSize: '11px',
                    color: '#c4c8cf',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setItemPage((p) => Math.max(1, p - 1))}
                    disabled={itemPage <= 1}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: itemPage <= 1 ? '#555' : '#ccc',
                      cursor: itemPage <= 1 ? 'default' : 'pointer',
                      fontSize: '12px',
                      padding: '2px 8px',
                    }}
                  >
                    ‹
                  </button>
                  <span>
                    {itemPage} / {totalItemPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setItemPage((p) => Math.min(totalItemPages, p + 1))}
                    disabled={itemPage >= totalItemPages}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: itemPage >= totalItemPages ? '#555' : '#ccc',
                      cursor: itemPage >= totalItemPages ? 'default' : 'pointer',
                      fontSize: '12px',
                      padding: '2px 8px',
                    }}
                  >
                    ›
                  </button>
                </div>

                {/* Items List Rows */}
                <div
                  style={{
                    flex: 1,
                    backgroundColor: '#181b1f',
                    border: '1px solid #363d47',
                    borderRadius: '2px',
                    overflowY: 'auto',
                  }}
                >
                  {currentPageItems.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#777', fontSize: '11px' }}>
                      Nenhum item encontrado.
                    </div>
                  ) : (
                    currentPageItems.map((item) => {
                      const isItemSelected = currentSelectedItem.id === item.id;
                      return (
                        <div
                          key={item.id}
                          onClick={() => setSelectedItemId(item.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '6px 8px',
                            backgroundColor: isItemSelected ? '#2a3038' : 'transparent',
                            border: isItemSelected ? '1px solid #8e9bb0' : '1px solid transparent',
                            borderBottom: isItemSelected ? '1px solid #8e9bb0' : '1px solid #20242a',
                            borderRadius: '2px',
                            cursor: 'pointer',
                          }}
                        >
                          <img
                            src={item.spriteUrl}
                            alt=""
                            style={{ width: '28px', height: '28px', imageRendering: 'pixelated', flexShrink: 0 }}
                          />
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: isItemSelected ? 'bold' : 'normal',
                              color: isItemSelected ? '#ffffff' : '#d1d5db',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {item.name}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column: Item Details Panel */}
              <div
                style={{
                  flex: 1,
                  backgroundColor: '#1c1f24',
                  border: '1px solid #363d47',
                  borderRadius: '2px',
                  padding: '16px 20px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                {/* Header with Sprite + Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      backgroundColor: '#121417',
                      border: '1px solid #2c323c',
                      borderRadius: '3px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src={currentSelectedItem.spriteUrl}
                      alt=""
                      style={{ width: '36px', height: '36px', imageRendering: 'pixelated' }}
                    />
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#ffffff' }}>
                    {currentSelectedItem.name}
                  </div>
                </div>

                {/* Attributes Grid */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px' }}>
                  {currentSelectedItem.attack > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #282c34', paddingBottom: '4px' }}>
                      <span style={{ color: '#8c95a0' }}>Ataque</span>
                      <span style={{ color: '#ffffff', fontWeight: 'bold' }}>{currentSelectedItem.attack}</span>
                    </div>
                  )}

                  {currentSelectedItem.defense > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #282c34', paddingBottom: '4px' }}>
                      <span style={{ color: '#8c95a0' }}>Defesa</span>
                      <span style={{ color: '#ffffff', fontWeight: 'bold' }}>{currentSelectedItem.defense}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #282c34', paddingBottom: '4px' }}>
                    <span style={{ color: '#8c95a0' }}>Mãos</span>
                    <span style={{ color: '#ffffff' }}>{currentSelectedItem.twoHanded ? 'duas mãos' : 'uma mão'}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #282c34', paddingBottom: '4px' }}>
                    <span style={{ color: '#8c95a0' }}>Nível</span>
                    <span style={{ color: '#ffffff' }}>{currentSelectedItem.level || 'Sem restrição'}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #282c34', paddingBottom: '4px' }}>
                    <span style={{ color: '#8c95a0' }}>Vocações</span>
                    <span style={{ color: '#ffffff' }}>{currentSelectedItem.vocations.join(', ')}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #282c34', paddingBottom: '4px' }}>
                    <span style={{ color: '#8c95a0' }}>Imbuement</span>
                    <span style={{ color: '#ffffff' }}>{currentSelectedItem.imbuements}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #282c34', paddingBottom: '4px' }}>
                    <span style={{ color: '#8c95a0', flexShrink: 0 }}>Categorias</span>
                    <span style={{ color: '#d1d5db', textAlign: 'right', maxWidth: '240px' }}>{currentSelectedItem.categoriesText}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #282c34', paddingBottom: '4px' }}>
                    <span style={{ color: '#8c95a0' }}>Valor de venda</span>
                    <span style={{ color: '#f1c40f', fontWeight: 'bold' }}>{formatNumberWithDots(currentSelectedItem.price)} gold</span>
                  </div>
                </div>

                {/* DROPADO POR Section */}
                <div style={{ marginTop: '8px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#f3d067', marginBottom: '6px' }}>
                    DROPADO POR
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {currentSelectedItem.droppedBy.map((dropper) => (
                      <div
                        key={dropper}
                        style={{
                          fontSize: '11px',
                          color: '#d4d8df',
                          padding: '3px 0',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span style={{ color: '#6b778c' }}>•</span>
                        <span>{dropper}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: BESTIARY                                           */}
          {/* ========================================================= */}
          {activeTab === 'bestiary' && (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              {!selectedMonster ? (
                /* Subview 1: Bestiary Creatures Grid (Screenshot 2) */
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '10px' }}>
                  <input
                    type="text"
                    placeholder="Buscar criatura..."
                    value={bestiarySearch}
                    onChange={(e) => {
                      setBestiarySearch(e.target.value);
                      setBestiaryPage(1);
                    }}
                    style={{
                      height: '28px',
                      padding: '0 10px',
                      backgroundColor: '#181a1d',
                      border: '1px solid #3c434f',
                      borderRadius: '2px',
                      color: '#ffffff',
                      fontSize: '11px',
                      outline: 'none',
                    }}
                  />

                  {/* 5x5 Creatures Grid */}
                  <div
                    style={{
                      flex: 1,
                      display: 'grid',
                      gridTemplateColumns: 'repeat(5, 1fr)',
                      gridAutoRows: '130px',
                      gap: '10px',
                      overflowY: 'auto',
                      paddingRight: '4px',
                    }}
                  >
                    {currentPageMonsters.map((monster) => {
                      const monsterKey = monster.id.toLowerCase();
                      const currentKills = bestiaryKills[monsterKey] || 0;
                      const isComplete = currentKills >= monster.killsNeeded;

                      return (
                        <div
                          key={monster.id}
                          onClick={() => setSelectedMonster(monster)}
                          style={{
                            backgroundColor: '#20242a',
                            border: '1px solid #363d47',
                            borderRadius: '3px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            padding: '8px',
                            transition: 'background-color 0.15s',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2c323b')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#20242a')}
                        >
                          <img
                            src={monster.spriteUrl}
                            alt=""
                            style={{
                              maxWidth: '44px',
                              maxHeight: '44px',
                              imageRendering: 'pixelated',
                              marginBottom: '6px',
                            }}
                          />
                          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#ffffff', marginBottom: '2px' }}>
                            {monster.name}
                          </div>
                          <div style={{ fontSize: '9px', color: isComplete ? '#f1c40f' : '#9ca3af', marginBottom: '3px' }}>
                            {isComplete ? 'Completo' : `${formatNumberWithDots(currentKills)} / ${formatNumberWithDots(monster.killsNeeded)}`}
                          </div>
                          {/* Stars */}
                          <div style={{ fontSize: '10px', color: '#f1c40f', letterSpacing: '1px' }}>
                            {'★'.repeat(monster.stars)}
                            <span style={{ color: '#444c56' }}>{'☆'.repeat(4 - monster.stars)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Bestiary Pagination Controls */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      backgroundColor: '#171a20',
                      border: '1px solid #2d3440',
                      borderRadius: '2px',
                      fontSize: '11px',
                      color: '#9ca3af',
                    }}
                  >
                    <span>
                      Página <strong style={{ color: '#ffffff' }}>{bestiaryPage}</strong> de{' '}
                      <strong style={{ color: '#ffffff' }}>{totalBestiaryPages}</strong> ({filteredMonsters.length} criaturas)
                    </span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => setBestiaryPage((p) => Math.max(1, p - 1))}
                        disabled={bestiaryPage <= 1}
                        style={{
                          backgroundColor: bestiaryPage <= 1 ? '#1f242d' : '#2b323e',
                          color: bestiaryPage <= 1 ? '#4b5563' : '#ffffff',
                          border: '1px solid #3d4654',
                          borderRadius: '2px',
                          padding: '3px 10px',
                          cursor: bestiaryPage <= 1 ? 'not-allowed' : 'pointer',
                          fontSize: '11px',
                          fontWeight: 600,
                        }}
                      >
                        ◀ Anterior
                      </button>
                      <button
                        type="button"
                        onClick={() => setBestiaryPage((p) => Math.min(totalBestiaryPages, p + 1))}
                        disabled={bestiaryPage >= totalBestiaryPages}
                        style={{
                          backgroundColor: bestiaryPage >= totalBestiaryPages ? '#1f242d' : '#2b323e',
                          color: bestiaryPage >= totalBestiaryPages ? '#4b5563' : '#ffffff',
                          border: '1px solid #3d4654',
                          borderRadius: '2px',
                          padding: '3px 10px',
                          cursor: bestiaryPage >= totalBestiaryPages ? 'not-allowed' : 'pointer',
                          fontSize: '11px',
                          fontWeight: 600,
                        }}
                      >
                        Próxima ▶
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Subview 2: Monster Details View (Screenshot 3) */
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Top Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#ffffff' }}>
                        {selectedMonster.name}
                      </span>
                      <div style={{ fontSize: '12px', color: '#f1c40f', letterSpacing: '2px' }}>
                        {'★'.repeat(selectedMonster.stars)}
                        <span style={{ color: '#555' }}>{'☆'.repeat(4 - selectedMonster.stars)}</span>
                      </div>
                    </div>

                    {/* Track Button */}
                    <button
                      type="button"
                      onClick={() => {
                        onTrackMonster?.(selectedMonster.id);
                      }}
                      style={{
                        padding: '6px 14px',
                        backgroundColor: trackedMonsterId === selectedMonster.id ? '#1e4028' : '#2d333b',
                        border: trackedMonsterId === selectedMonster.id ? '1px solid #2ecc71' : '1px solid #485261',
                        borderRadius: '3px',
                        color: trackedMonsterId === selectedMonster.id ? '#2ecc71' : '#f0ad4e',
                        fontWeight: 'bold',
                        fontSize: '11px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>•</span>
                      <span>{trackedMonsterId === selectedMonster.id ? 'Rastreando na tela' : 'Rastrear na tela'}</span>
                    </button>
                  </div>

                  {/* Body layout: Left stats + Right resistances & drops */}
                  <div style={{ flex: 1, display: 'flex', gap: '24px' }}>
                    {/* Left Column: Sprite, Kills, Stats */}
                    <div style={{ width: '260px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div
                        style={{
                          height: '110px',
                          backgroundColor: '#181b1f',
                          border: '1px solid #313742',
                          borderRadius: '3px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <img
                          src={selectedMonster.spriteUrl}
                          alt=""
                          style={{
                            maxWidth: '72px',
                            maxHeight: '72px',
                            imageRendering: 'pixelated',
                          }}
                        />
                      </div>

                      {/* Kills progress */}
                      {(() => {
                        const kills = bestiaryKills[selectedMonster.id.toLowerCase()] || 0;
                        const pct = Math.min(100, Math.round((kills / selectedMonster.killsNeeded) * 100));
                        return (
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                              <span style={{ color: '#c4c8cf' }}>
                                {kills >= selectedMonster.killsNeeded ? 'Completo' : `${formatNumberWithDots(kills)} / ${formatNumberWithDots(selectedMonster.killsNeeded)} kills`}
                              </span>
                              <span style={{ color: '#88929b' }}>{pct}%</span>
                            </div>
                            <div style={{ height: '6px', backgroundColor: '#141619', borderRadius: '2px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pct}%`, backgroundColor: '#e2e8f0' }} />
                            </div>
                          </div>
                        );
                      })()}

                      {/* Attributes */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', marginTop: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #282c34', paddingBottom: '4px' }}>
                          <span style={{ color: '#8c95a0' }}>HP</span>
                          <span style={{ color: '#ffffff', fontWeight: 'bold' }}>{selectedMonster.hp}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #282c34', paddingBottom: '4px' }}>
                          <span style={{ color: '#8c95a0' }}>Exp</span>
                          <span style={{ color: '#ffffff', fontWeight: 'bold' }}>{selectedMonster.exp}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #282c34', paddingBottom: '4px' }}>
                          <span style={{ color: '#8c95a0' }}>Velocidade</span>
                          <span style={{ color: '#ffffff', fontWeight: 'bold' }}>{selectedMonster.speed}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #282c34', paddingBottom: '4px' }}>
                          <span style={{ color: '#8c95a0' }}>Armadura</span>
                          <span style={{ color: '#ffffff', fontWeight: 'bold' }}>{selectedMonster.armor}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Section: Resistências, Drops, Locais */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {/* RESISTÊNCIAS */}
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#f3d067', marginBottom: '8px' }}>
                          RESISTÊNCIAS
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
                          {Object.entries(selectedMonster.resistances).map(([key, val]) => {
                            const meta = ELEMENT_LABELS[key] || { label: key, icon: '•', color: '#fff' };
                            const barFill = val > 0 ? '#2ecc71' : val < 0 ? '#e74c3c' : '#ffffff';
                            return (
                              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: '18px', textAlign: 'center' }}>{meta.icon}</span>
                                <div style={{ flex: 1, height: '6px', backgroundColor: '#141619', borderRadius: '2px', overflow: 'hidden' }}>
                                  <div
                                    style={{
                                      height: '100%',
                                      width: `${Math.min(100, Math.max(15, Math.abs(val) + 20))}%`,
                                      backgroundColor: barFill,
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* DROP RARE / COMMON */}
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#f3d067', marginBottom: '8px' }}>
                          DROP RARE
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {selectedMonster.drops.map((drop) => (
                            <div
                              key={drop.id}
                              style={{
                                width: '40px',
                                height: '40px',
                                backgroundColor: '#141619',
                                border: '1px solid #303742',
                                borderRadius: '2px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              title={drop.name}
                            >
                              <img
                                src={`/generated/cyclopedia/items/item-${drop.id}.png`}
                                alt={drop.name}
                                style={{ width: '28px', height: '28px', imageRendering: 'pixelated' }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* LOCAIS */}
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#f3d067', marginBottom: '6px' }}>
                          LOCAIS
                        </div>
                        <div style={{ fontSize: '11px', color: '#c4c8cf' }}>
                          {selectedMonster.locations.join(', ')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: BOSSTIARY                                          */}
          {/* ========================================================= */}
          {activeTab === 'bosstiary' && (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              {!selectedBoss ? (
                /* Subview 1: Boss Grid (Screenshot 4) */
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '10px' }}>
                  <input
                    type="text"
                    placeholder="Buscar boss..."
                    value={bossSearch}
                    onChange={(e) => setBossSearch(e.target.value)}
                    style={{
                      height: '28px',
                      padding: '0 10px',
                      backgroundColor: '#181a1d',
                      border: '1px solid #3c434f',
                      borderRadius: '2px',
                      color: '#ffffff',
                      fontSize: '11px',
                      outline: 'none',
                    }}
                  />

                  {/* 5x3 Boss Grid */}
                  <div
                    style={{
                      flex: 1,
                      display: 'grid',
                      gridTemplateColumns: 'repeat(5, 1fr)',
                      gridAutoRows: '130px',
                      gap: '10px',
                      overflowY: 'auto',
                      paddingRight: '4px',
                    }}
                  >
                    {filteredBosses.map((boss) => {
                      const bossKey = boss.id.toLowerCase();
                      const kills = bestiaryKills[bossKey] || boss.prowess;
                      const tierColor =
                        boss.tier === 'Archfoe' ? '#f1c40f' : boss.tier === 'Bane' ? '#48bb78' : '#fc8181';

                      return (
                        <div
                          key={boss.id}
                          onClick={() => setSelectedBoss(boss)}
                          style={{
                            backgroundColor: '#20242a',
                            border: '1px solid #363d47',
                            borderRadius: '3px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            padding: '8px',
                            transition: 'background-color 0.15s',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2c323b')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#20242a')}
                        >
                          <img
                            src={boss.spriteUrl}
                            alt=""
                            style={{
                              maxWidth: '44px',
                              maxHeight: '44px',
                              imageRendering: 'pixelated',
                              marginBottom: '6px',
                            }}
                          />
                          <div style={{ fontSize: '11px', fontWeight: 'bold', color: tierColor, marginBottom: '2px', textAlign: 'center' }}>
                            {boss.name}
                          </div>
                          <div style={{ fontSize: '9px', color: '#9ca3af', marginBottom: '3px' }}>
                            {kills} kills
                          </div>
                          {/* 3 Stars */}
                          <div style={{ fontSize: '10px', color: '#f1c40f', letterSpacing: '1px' }}>
                            {'★'.repeat(boss.stars)}
                            <span style={{ color: '#444c56' }}>{'☆'.repeat(3 - boss.stars)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Subview 2: Boss Details View (Screenshot 5) */
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#ffffff' }}>
                        {selectedBoss.name}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 'bold',
                          color: selectedBoss.tier === 'Archfoe' ? '#f1c40f' : selectedBoss.tier === 'Bane' ? '#48bb78' : '#fc8181',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        👑 {selectedBoss.tier}
                      </span>
                      <div style={{ fontSize: '12px', color: '#f1c40f', letterSpacing: '2px' }}>
                        {'★'.repeat(selectedBoss.stars)}
                        <span style={{ color: '#555' }}>{'☆'.repeat(3 - selectedBoss.stars)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Body layout */}
                  <div style={{ flex: 1, display: 'flex', gap: '24px' }}>
                    {/* Left Column: Sprite, Kills, Milestones, Stats */}
                    <div style={{ width: '260px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div
                        style={{
                          height: '90px',
                          backgroundColor: '#181b1f',
                          border: '1px solid #313742',
                          borderRadius: '3px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <img
                          src={selectedBoss.spriteUrl}
                          alt=""
                          style={{ maxWidth: '64px', maxHeight: '64px', imageRendering: 'pixelated' }}
                        />
                        <span style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>
                          {selectedBoss.prowess} kills
                        </span>
                      </div>

                      {/* Milestones */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #282c34', paddingBottom: '3px' }}>
                          <span style={{ color: '#c4c8cf' }}>Prowess</span>
                          <span style={{ color: '#ffffff', fontWeight: 'bold' }}>{selectedBoss.prowess} / {selectedBoss.prowess}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #282c34', paddingBottom: '3px' }}>
                          <span style={{ color: '#c4c8cf' }}>Expertise</span>
                          <span style={{ color: '#ffffff', fontWeight: 'bold' }}>{selectedBoss.prowess} / {selectedBoss.expertise}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #282c34', paddingBottom: '3px' }}>
                          <span style={{ color: '#c4c8cf' }}>Mastery</span>
                          <span style={{ color: '#ffffff', fontWeight: 'bold' }}>{selectedBoss.prowess} / {selectedBoss.mastery}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #282c34', paddingBottom: '3px' }}>
                          <span style={{ color: '#8c95a0' }}>HP</span>
                          <span style={{ color: '#ffffff', fontWeight: 'bold' }}>{formatNumberWithDots(selectedBoss.hp)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #282c34', paddingBottom: '3px' }}>
                          <span style={{ color: '#8c95a0' }}>Exp</span>
                          <span style={{ color: '#ffffff', fontWeight: 'bold' }}>{formatNumberWithDots(selectedBoss.exp)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #282c34', paddingBottom: '3px' }}>
                          <span style={{ color: '#8c95a0' }}>Summons</span>
                          <span style={{ color: '#ffffff', fontSize: '10px' }}>{selectedBoss.summons.join(', ')}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #282c34', paddingBottom: '3px' }}>
                          <span style={{ color: '#8c95a0' }}>Recarga</span>
                          <span style={{ color: '#ffffff' }}>{selectedBoss.cooldown}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Section: Resistências & Drops */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {/* Resistências */}
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#f3d067', marginBottom: '8px' }}>
                          RESISTÊNCIAS
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
                          {Object.entries(selectedBoss.resistances).map(([key, val]) => {
                            const meta = ELEMENT_LABELS[key] || { label: key, icon: '•', color: '#fff' };
                            const barFill = val > 20 ? '#2ecc71' : val < 0 ? '#e74c3c' : '#ffffff';
                            return (
                              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: '18px', textAlign: 'center' }}>{meta.icon}</span>
                                <div style={{ flex: 1, height: '6px', backgroundColor: '#141619', borderRadius: '2px', overflow: 'hidden' }}>
                                  <div
                                    style={{
                                      height: '100%',
                                      width: `${Math.min(100, Math.max(20, Math.abs(val) + 30))}%`,
                                      backgroundColor: barFill,
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* DROP COMMON */}
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#f3d067', marginBottom: '6px' }}>
                          DROP COMMON
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {selectedBoss.dropsCommon.map((drop) => (
                            <div
                              key={drop.id}
                              style={{
                                width: '38px',
                                height: '38px',
                                backgroundColor: '#141619',
                                border: '1px solid #303742',
                                borderRadius: '2px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              title={drop.name}
                            >
                              <img
                                src={`/generated/cyclopedia/items/item-${drop.id}.png`}
                                alt={drop.name}
                                style={{ width: '28px', height: '28px', imageRendering: 'pixelated' }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* DROP RARE */}
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#f3d067', marginBottom: '6px' }}>
                          DROP RARE
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {selectedBoss.dropsRare.map((drop) => (
                            <div
                              key={drop.id}
                              style={{
                                width: '38px',
                                height: '38px',
                                backgroundColor: '#141619',
                                border: '1px solid #303742',
                                borderRadius: '2px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              title={drop.name}
                            >
                              <img
                                src={`/generated/cyclopedia/items/item-${drop.id}.png`}
                                alt={drop.name}
                                style={{ width: '28px', height: '28px', imageRendering: 'pixelated' }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 4: BOSS POINTS                                        */}
          {/* ========================================================= */}
          {activeTab === 'boss-points' && (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Header card with points */}
              <div
                style={{
                  padding: '16px 20px',
                  backgroundColor: '#1b1e23',
                  border: '1px solid #363d47',
                  borderRadius: '3px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '12px', color: '#8c95a0', marginBottom: '4px' }}>
                    Pontos de Bosstiary Disponíveis
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f1c40f', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🏆</span>
                    <span>{formatNumberWithDots(bossPoints)} Pontos</span>
                  </div>
                </div>

                <div style={{ fontSize: '11px', color: '#a0aec0', maxWidth: '380px', lineHeight: 1.5 }}>
                  Derrote Bosses das categorias Archfoe, Bane e Nemesis para acumular Pontos de Bosstiary permanentes e desbloquear bônus passivos de caçadas.
                </div>
              </div>

              {/* Perk Unlock Tree */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#f3d067' }}>
                  BÔNUS E TALENTOS DE BOSSTIARY
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {BOSS_POINT_PERKS.map((perk) => (
                    <div
                      key={perk.id}
                      style={{
                        padding: '14px',
                        backgroundColor: '#1f2329',
                        border: '1px solid #333945',
                        borderRadius: '3px',
                        display: 'flex',
                        gap: '12px',
                      }}
                    >
                      <span style={{ fontSize: '24px' }}>{perk.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#ffffff', marginBottom: '4px' }}>
                          {perk.name}
                        </div>
                        <div style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '8px', lineHeight: 1.4 }}>
                          {perk.description}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#f1c40f' }}>
                            {perk.cost} Pontos
                          </span>
                          <span
                            style={{
                              fontSize: '10px',
                              padding: '2px 8px',
                              backgroundColor: bossPoints >= perk.cost ? '#1e3828' : '#2b2f38',
                              color: bossPoints >= perk.cost ? '#2ecc71' : '#6b7280',
                              borderRadius: '2px',
                              fontWeight: 'bold',
                            }}
                          >
                            {bossPoints >= perk.cost ? 'Desbloqueado' : 'Bloqueado'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 5: CHARACTER                                          */}
          {/* ========================================================= */}
          {activeTab === 'character' && (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Profile Overview */}
              <div
                style={{
                  padding: '16px 20px',
                  backgroundColor: '#1b1e23',
                  border: '1px solid #363d47',
                  borderRadius: '3px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                }}
              >
                <div style={{ fontSize: '32px' }}>👤</div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#ffffff' }}>
                    {characterName}
                  </div>
                  <div style={{ fontSize: '11px', color: '#f3d067' }}>
                    Vocação: {characterVocation} · Registro Oficial de Exploração
                  </div>
                </div>
              </div>

              {/* Statistics Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div style={{ padding: '14px', backgroundColor: '#1e2228', border: '1px solid #313742', borderRadius: '3px' }}>
                  <div style={{ fontSize: '10px', color: '#8c95a0', marginBottom: '4px' }}>CRIATURAS DESCOBERTAS</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#ffffff' }}>
                    {Object.keys(bestiaryKills).length} / {CANONICAL_BESTIARY_MONSTERS.length}
                  </div>
                </div>

                <div style={{ padding: '14px', backgroundColor: '#1e2228', border: '1px solid #313742', borderRadius: '3px' }}>
                  <div style={{ fontSize: '10px', color: '#8c95a0', marginBottom: '4px' }}>BESTIÁRIOS COMPLETOS</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#2ecc71' }}>
                    {
                      CANONICAL_BESTIARY_MONSTERS.filter((m) => (bestiaryKills[m.id.toLowerCase()] || 0) >= m.killsNeeded)
                        .length
                    }
                  </div>
                </div>

                <div style={{ padding: '14px', backgroundColor: '#1e2228', border: '1px solid #313742', borderRadius: '3px' }}>
                  <div style={{ fontSize: '10px', color: '#8c95a0', marginBottom: '4px' }}>PONTOS DE BOSSTIARY</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#f1c40f' }}>
                    {formatNumberWithDots(bossPoints)} pts
                  </div>
                </div>
              </div>

              {/* Currently Tracked Monster Info */}
              <div
                style={{
                  flex: 1,
                  padding: '16px',
                  backgroundColor: '#1b1e23',
                  border: '1px solid #363d47',
                  borderRadius: '3px',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#f3d067', marginBottom: '10px' }}>
                  RASTREAMENTO ATIVO NA TELA
                </div>

                {trackedMonsterId ? (
                  (() => {
                    const tracked = CANONICAL_BESTIARY_MONSTERS.find(
                      (m) => m.id.toLowerCase() === trackedMonsterId.toLowerCase()
                    );
                    if (!tracked) {
                      return <div style={{ fontSize: '11px', color: '#8c95a0' }}>Nenhuma criatura selecionada.</div>;
                    }
                    const kills = bestiaryKills[tracked.id.toLowerCase()] || 0;
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <img
                          src={tracked.spriteUrl}
                          alt=""
                          style={{ width: '40px', height: '40px', imageRendering: 'pixelated' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#ffffff' }}>
                            {tracked.name}
                          </div>
                          <div style={{ fontSize: '11px', color: '#a0aec0' }}>
                            Progresso: {formatNumberWithDots(kills)} / {formatNumberWithDots(tracked.killsNeeded)} mortes
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onTrackMonster?.('')}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#3b2525',
                            border: '1px solid #753838',
                            color: '#fc8181',
                            borderRadius: '2px',
                            cursor: 'pointer',
                            fontSize: '10px',
                            fontWeight: 'bold',
                          }}
                        >
                          Parar de Rastrear
                        </button>
                      </div>
                    );
                  })()
                ) : (
                  <div style={{ fontSize: '11px', color: '#8c95a0' }}>
                    Nenhuma criatura fixada no momento. Abra a aba Bestiary e clique em "• Rastrear na tela" para fixar uma criatura no HUD.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ===================== BOTTOM FOOTER BAR ===================== */}
        <div
          style={{
            height: '48px',
            backgroundColor: '#1b1e22',
            borderTop: '1px solid #141618',
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Gold Coin Balance (Screenshot 1-5 bottom-left) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#0f1114',
              border: '1px solid #282e37',
              borderRadius: '2px',
              padding: '4px 10px',
              fontSize: '12px',
              fontWeight: 'bold',
              color: '#ffffff',
            }}
          >
            <span>{formatNumberWithDots(gold)}</span>
            <img
              src="/generated/cyclopedia/items/item-2148.png"
              alt="gold"
              style={{ width: '16px', height: '16px', imageRendering: 'pixelated' }}
            />
          </div>

          {/* Right Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleReturn}
              style={{
                height: '28px',
                padding: '0 16px',
                backgroundColor: '#2d333c',
                border: '1px solid #4a5463',
                borderRadius: '2px',
                color: isDetailView ? '#ffffff' : '#88929b',
                fontSize: '11px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              Voltar
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                height: '28px',
                padding: '0 18px',
                backgroundColor: '#353c47',
                border: '1px solid #5a6677',
                borderRadius: '2px',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
