'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import type { HuntDefinition, HuntPullSize } from '@/packages/domain/src';
import { getPullSizeMonsterPool } from '@/packages/domain/src/huntRoute';
import type { MonsterDefinition } from '@/packages/content-schema/src';
import { useGameModal } from '@/apps/web/contexts/GameModalContext';

interface Props {
  open: boolean;
  hunts: HuntDefinition[];
  monsters: MonsterDefinition[];
  level: number;
  currentHuntId?: string;
  isInCity?: boolean;
  isPartyLeader?: boolean;
  initialTab?: ActiveTab;
  onClose(): void;
  onSelect(huntId: string, pullSize?: HuntPullSize): void;
  onSelectWithTeam?(huntId: string, huntName: string, pullSize?: HuntPullSize): void;
  onOpenPartyModal?: () => void;
  onStartTraining?: (skill: string) => void;
  onOpenArena?: () => void;
  onOpenQuests?: () => void;
  onOpenBosses?: () => void;
}

export type { ActiveTab };
type ActiveTab = 'CAÇADAS' | 'TREINO' | 'QUESTS' | 'ARENA' | 'BOSSES';
type ViewMode = 'catalog' | 'setup';

interface StatRecord {
  soloXp: string;
  soloGp: string;
  partyXp?: string;
  partyGp?: string;
}

const HUNT_STATS_MAP: Record<string, StatRecord> = {
  'rat-cellars': { soloXp: '4.8K XP/h', soloGp: '3.2K gp/h', partyXp: '9.2K XP/h', partyGp: '-2.2K gp/h' },
  'troll-camp': { soloXp: '9.7K XP/h', soloGp: '5.1K gp/h' },
  'cyclops-camp': { soloXp: '18.5K XP/h', soloGp: '7.8K gp/h' },
  'elf-sanctuary': { soloXp: '24.0K XP/h', soloGp: '11.2K gp/h' },
  'dragon-lair': { soloXp: '65.0K XP/h', soloGp: '18.0K gp/h' },
};

export function HuntSelector({
  open,
  hunts,
  monsters,
  level,
  currentHuntId,
  isInCity = false,
  isPartyLeader = false,
  initialTab,
  onClose,
  onSelect,
  onSelectWithTeam,
  onOpenPartyModal,
  onStartTraining,
  onOpenArena,
  onOpenQuests,
  onOpenBosses,
}: Props) {
  const gameModal = useGameModal();
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => initialTab ?? 'CAÇADAS');
  const [view, setView] = useState<ViewMode>('catalog');
  const [selectedHuntId, setSelectedHuntId] = useState<string>(() => hunts[0]?.id ?? 'rat-cellars');
  const [pullSize, setPullSize] = useState<HuntPullSize>('cauteloso');
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);

  // Training state
  const [selectedTrainingSkill, setSelectedTrainingSkill] = useState<string>('Sword Fighting');

  // Favorites in localStorage
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const saved = localStorage.getItem('tibiaweb_favorite_hunts');
      return saved ? new Set(JSON.parse(saved)) : new Set(['troll-camp']);
    } catch {
      return new Set(['troll-camp']);
    }
  });

  // Auto-loot preferences (itemId -> boolean)
  const [autoLootPrefs, setAutoLootPrefs] = useState<Record<number, boolean>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = localStorage.getItem('tibiaweb_autoloot_preferences');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Auto-sell preferences (itemId -> boolean)
  const [autoSellPrefs, setAutoSellPrefs] = useState<Record<number, boolean>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = localStorage.getItem('tibiaweb_autosell_preferences');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Sync with currentHuntId when opened
  useEffect(() => {
    if (open && currentHuntId) {
      setSelectedHuntId(currentHuntId);
    }
  }, [open, currentHuntId]);

  // Sync activeTab with initialTab whenever modal opens or tab changes
  useEffect(() => {
    if (open && initialTab) {
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);

  // Save favorites to localStorage
  const toggleFavorite = (e: React.MouseEvent, huntId: string) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(huntId)) next.delete(huntId);
      else next.add(huntId);
      try {
        localStorage.setItem('tibiaweb_favorite_hunts', JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  const toggleAutoLoot = (itemId: number) => {
    setAutoLootPrefs((prev) => {
      const next = { ...prev, [itemId]: prev[itemId] === false ? true : false };
      try {
        localStorage.setItem('tibiaweb_autoloot_preferences', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const toggleAutoSell = (itemId: number) => {
    setAutoSellPrefs((prev) => {
      const next = { ...prev, [itemId]: !prev[itemId] };
      try {
        localStorage.setItem('tibiaweb_autosell_preferences', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const selectedHunt = useMemo(() => {
    return hunts.find((h) => h.id === selectedHuntId) ?? hunts[0];
  }, [hunts, selectedHuntId]);

  // Filtered hunts for catalog
  const filteredHunts = useMemo(() => {
    return hunts.filter((hunt) => {
      if (hunt.id === 'pvp-arena') return false; // Handled separately in Arena modal
      if (showOnlyFavorites && !favorites.has(hunt.id)) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const matchName = hunt.name.toLowerCase().includes(q) || (hunt.displayName && hunt.displayName.toLowerCase().includes(q));
      const matchDesc = hunt.description && hunt.description.toLowerCase().includes(q);
      const matchMonsters = hunt.monsters.some((m) => m.toLowerCase().includes(q));
      return matchName || matchDesc || matchMonsters;
    });
  }, [hunts, showOnlyFavorites, favorites, searchQuery]);

  // Pull monsters for selected hunt in Screen 2
  const pullMonsters = useMemo(() => {
    if (!selectedHunt) return [];
    return getPullSizeMonsterPool(selectedHunt.id, pullSize, selectedHunt.monsters);
  }, [selectedHunt, pullSize]);

  // Aggregated loot for current pull
  const aggregatedLoot = useMemo(() => {
    const map = new Map<number, { itemId: number; name: string; chance: number }>();
    for (const mId of pullMonsters) {
      const mon = monsters.find((m) => m.id === mId);
      if (mon && Array.isArray(mon.loot)) {
        for (const item of mon.loot) {
          if (item.itemId != null && !map.has(item.itemId)) {
            map.set(item.itemId, {
              itemId: item.itemId,
              name: item.name,
              chance: item.chance ?? 1000,
            });
          }
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => {
      // Keep gold coin first
      if (a.itemId === 2148) return -1;
      if (b.itemId === 2148) return 1;
      return b.chance - a.chance;
    });
  }, [pullMonsters, monsters]);

  const handleStartHunt = () => {
    if (isPartyLeader && onSelectWithTeam) {
      onSelectWithTeam(selectedHunt.id, selectedHunt.name, pullSize);
    } else {
      onSelect(selectedHunt.id, pullSize);
    }
    onClose();
  };

  const handleTabClick = (tab: ActiveTab) => {
    if (tab === 'ARENA') {
      onClose();
      onOpenArena?.();
      return;
    }
    if (tab === 'QUESTS') {
      if (onOpenQuests) onOpenQuests();
      else gameModal.openCyclopedia('bestiary');
      return;
    }
    if (tab === 'BOSSES') {
      if (onOpenBosses) onOpenBosses();
      else gameModal.openCyclopedia('bosstiary');
      return;
    }
    setActiveTab(tab);
  };

  if (!open) return null;

  return (
    <div
      className="hunt-modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="hunt-frame-container"
        role="dialog"
        aria-modal="true"
        aria-label={view === 'catalog' ? 'Organizar caçada' : selectedHunt?.name ?? 'Caçada'}
      >
        {/* Window Title Bar */}
        <div className="hunt-window-titlebar">
          <span className="hunt-window-title">
            {activeTab === 'TREINO' ? 'Pátio de Treinamento' : view === 'catalog' ? 'Organizar caçada' : selectedHunt?.name}
          </span>
          <button
            type="button"
            className="hunt-window-close-btn"
            onClick={onClose}
            title="Fechar (ESC)"
          >
            ✕
          </button>
        </div>

        {/* 5 Top Activity Tabs */}
        <div className="hunt-top-nav-tabs">
          {(['CAÇADAS', 'TREINO', 'QUESTS', 'ARENA', 'BOSSES'] as ActiveTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              className={`hunt-top-nav-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => handleTabClick(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content Body: Training or Hunts (Catalog / Setup) */}
        {activeTab === 'TREINO' ? (
          <div className="training-window-body" style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
            <p className="training-window-subtitle" style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '14px' }}>
              Escolha uma habilidade e como treiná-la no pátio de treino da cidade.
            </p>
            <div className="training-skills-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {[
                { name: 'Sword Fighting', skill: 'sword', icon: '⚔️', desc: 'Espadas e lâminas corpo a corpo' },
                { name: 'Axe Fighting', skill: 'axe', icon: '🪓', desc: 'Machados de corte pesado' },
                { name: 'Club Fighting', skill: 'club', icon: '🔨', desc: 'Clavas e martelos esmagadores' },
                { name: 'Distance Fighting', skill: 'distance', icon: '🏹', desc: 'Arcos, bestas e lanças' },
                { name: 'Shielding', skill: 'shielding', icon: '🛡️', desc: 'Defesa e bloqueio com escudos' },
                { name: 'Magic Level', skill: 'magicLevel', icon: '✨', desc: 'Poder e capacidade mágica' },
              ].map((item) => (
                <div
                  key={item.skill}
                  className={`training-skill-card ${selectedTrainingSkill === item.name ? 'selected' : ''}`}
                  onClick={() => setSelectedTrainingSkill(item.name)}
                  style={{
                    background: selectedTrainingSkill === item.name ? '#1a243a' : '#141824',
                    border: `1.5px solid ${selectedTrainingSkill === item.name ? '#3b82f6' : '#242e42'}`,
                    borderRadius: '6px',
                    padding: '12px',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: '24px', marginBottom: '6px' }}>{item.icon}</div>
                  <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '14px' }}>{item.name}</div>
                  <div style={{ fontSize: '11px', color: '#7b8da6', marginTop: '3px' }}>{item.desc}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="hunt-setup-footer-btn"
                onClick={() => setActiveTab('CAÇADAS')}
              >
                Voltar para Caçadas
              </button>
              <button
                type="button"
                className="hunt-start-hunt-btn"
                onClick={() => {
                  onStartTraining?.(selectedTrainingSkill);
                  onClose();
                }}
              >
                Iniciar Treino ({selectedTrainingSkill})
              </button>
            </div>
          </div>
        ) : view === 'catalog' ? (
          /* SCREEN 1: CATALOG VIEW */
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            {/* Subheader bar */}
            <div className="hunt-subheader-bar">
              <span className="hunt-sub-btn" style={{ cursor: 'default' }}>
                ‹ Caçadas
              </span>
              <button
                type="button"
                className={`hunt-sub-btn ${showOnlyFavorites ? 'active-favorite' : ''}`}
                onClick={() => setShowOnlyFavorites((prev) => !prev)}
                title="Filtrar caçadas favoritas"
              >
                ★ Favoritos
              </button>
              <div className="hunt-pill-btn">
                Organizar caçada
              </div>
              <button
                type="button"
                className="hunt-sub-btn"
                onClick={onOpenPartyModal}
                title="Procurar ou formar grupo de caçada"
              >
                Encontrar time
              </button>
            </div>

            {/* Search Bar */}
            <div className="hunt-search-bar-row">
              <div className="hunt-search-input-box">
                <span style={{ color: '#64748b', fontSize: '13px' }}>🔍</span>
                <input
                  type="text"
                  placeholder="Buscar uma caçada ou criatura"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="hunt-search-counter">
                {filteredHunts.length} caçadas disponíveis
              </div>
            </div>

            {/* 4-Column Grid */}
            <div className="hunt-catalog-grid">
              {filteredHunts.map((hunt) => {
                const primaryMonster = hunt.monsters[0] ?? 'rat';
                const isFav = favorites.has(hunt.id);
                const stats = HUNT_STATS_MAP[hunt.id];
                const monsterNames = hunt.monsters
                  .map((id) => id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()))
                  .join(', ');

                return (
                  <div
                    key={hunt.id}
                    className="hunt-catalog-card"
                    onClick={() => {
                      setSelectedHuntId(hunt.id);
                      setView('setup');
                    }}
                  >
                    <div className="hunt-card-top">
                      <div className="hunt-card-sprite-box">
                        <img
                          src={`/generated/bestiary/${primaryMonster}.png`}
                          alt={hunt.name}
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (!target.dataset.triedFallback) {
                              target.dataset.triedFallback = '1';
                              target.src = `/generated/tibia1098/monster-${primaryMonster}-thumb.png`;
                            } else if (target.dataset.triedFallback === '1') {
                              target.dataset.triedFallback = '2';
                              target.src = `/assets/monsters/${primaryMonster}.png`;
                            }
                          }}
                        />
                      </div>
                      <div className="hunt-card-info">
                        <div className="hunt-card-title">{hunt.name}</div>
                        <div className="hunt-card-creatures" title={monsterNames}>{monsterNames}</div>
                      </div>
                      <button
                        type="button"
                        className={`hunt-star-btn ${isFav ? 'is-fav' : ''}`}
                        onClick={(e) => toggleFavorite(e, hunt.id)}
                        title={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                      >
                        {isFav ? '★' : '☆'}
                      </button>
                    </div>

                    <div className="hunt-card-bottom">
                      {stats ? (
                        <>
                          <div className="hunt-card-stat-row">
                            <span className="hunt-card-stat-label">Solo</span>
                            <span className="hunt-card-stat-val">{stats.soloXp}</span>
                            <span className="hunt-card-stat-val">{stats.soloGp}</span>
                          </div>
                          {stats.partyXp && (
                            <div className="hunt-card-stat-row">
                              <span className="hunt-card-stat-label">Party</span>
                              <span className="hunt-card-stat-val">{stats.partyXp}</span>
                              <span className={`hunt-card-stat-val ${stats.partyGp?.startsWith('-') ? 'negative' : ''}`}>
                                {stats.partyGp}
                              </span>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="hunt-card-no-record">Sem recorde ainda</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* SCREEN 2: HUNT SETUP & PULL SIZE */
          <div className="hunt-setup-container">
            {/* Header Banner */}
            <div className="hunt-setup-banner">
              <div>
                <div className="hunt-setup-banner-title">
                  <span>{selectedHunt.name}</span>
                  <button
                    type="button"
                    className={`hunt-star-btn ${favorites.has(selectedHunt.id) ? 'is-fav' : ''}`}
                    onClick={(e) => toggleFavorite(e, selectedHunt.id)}
                  >
                    {favorites.has(selectedHunt.id) ? '★' : '☆'}
                  </button>
                </div>
                <div className="hunt-setup-banner-desc">
                  {selectedHunt.description || selectedHunt.shortDescription}
                </div>
              </div>

              <div className="hunt-setup-record-box">
                <div className="hunt-setup-record-header">
                  <span>Seu recorde</span>
                  <span style={{ cursor: 'pointer' }} title="Atualizar histórico">🔄</span>
                </div>
                <div className="hunt-setup-record-body">
                  <span>Solo</span>
                  <span>{HUNT_STATS_MAP[selectedHunt.id]?.soloXp ?? '10.5K XP/h'}</span>
                  <span>{HUNT_STATS_MAP[selectedHunt.id]?.soloGp ?? '4.8K gp/h'}</span>
                </div>
              </div>
            </div>

            {/* 2-Column Grid */}
            <div className="hunt-setup-grid-body">
              {/* Left Column: Pull Size & Monsters */}
              <div className="hunt-setup-col">
                <div className="hunt-setup-section-title">Tamanho do pull</div>
                <div className="hunt-pull-size-tabs">
                  <button
                    type="button"
                    className={`hunt-pull-size-tab ${pullSize === 'cauteloso' ? 'active' : ''}`}
                    onClick={() => setPullSize('cauteloso')}
                  >
                    Cauteloso
                  </button>
                  <button
                    type="button"
                    className={`hunt-pull-size-tab ${pullSize === 'ousado' ? 'active' : ''}`}
                    onClick={() => setPullSize('ousado')}
                  >
                    Ousado
                  </button>
                  <button
                    type="button"
                    className={`hunt-pull-size-tab ${pullSize === 'agressivo' ? 'active' : ''}`}
                    onClick={() => setPullSize('agressivo')}
                  >
                    Agressivo
                  </button>
                </div>

                <div className="hunt-setup-section-title" style={{ marginTop: '4px' }}>
                  Monstros deste pull ({pullSize === 'cauteloso' ? '2-3 criaturas' : pullSize === 'ousado' ? '4 criaturas' : '5-6 criaturas'})
                </div>

                <div className="hunt-pull-creatures-list">
                  {pullMonsters.map((monsterId) => {
                    const mon = monsters.find((m) => m.id === monsterId);
                    const displayName = mon?.name ?? monsterId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

                    return (
                      <div key={monsterId} className="hunt-pull-creature-card">
                        <div className="hunt-pull-creature-sprite-box">
                          <img
                            src={`/generated/bestiary/${monsterId}.png`}
                            alt={displayName}
                            onError={(e) => {
                              const target = e.currentTarget;
                              if (!target.dataset.triedFallback) {
                                target.dataset.triedFallback = '1';
                                target.src = `/generated/tibia1098/monster-${monsterId}-thumb.png`;
                              } else if (target.dataset.triedFallback === '1') {
                                target.dataset.triedFallback = '2';
                                target.src = `/assets/monsters/${monsterId}.png`;
                              }
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          className="hunt-details-btn"
                          onClick={() => gameModal.openCyclopedia('bestiary')}
                          title="Ver detalhes no Bestiário da Cyclopedia"
                        >
                          Detalhes
                        </button>
                        <span className="hunt-pull-creature-name" title={displayName}>
                          {displayName}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Loot Possível */}
              <div className="hunt-setup-col">
                <div className="hunt-loot-header-row">
                  <span className="hunt-setup-section-title" style={{ margin: 0 }}>Loot possível</span>
                  <div className="hunt-loot-header-actions">
                    <span>PEGAR</span>
                    <span>VENDER</span>
                  </div>
                </div>

                <div className="hunt-loot-scroll-list">
                  {aggregatedLoot.length === 0 ? (
                    <div style={{ color: '#64748b', fontSize: '11px', textAlign: 'center', padding: '20px 0' }}>
                      Nenhum loot catalogado para este pull.
                    </div>
                  ) : (
                    aggregatedLoot.map((item) => {
                      const isGold = item.itemId === 2148 || item.name.toLowerCase().includes('gold coin');
                      const rarityClass =
                        item.chance >= 50000
                          ? 'comum'
                          : item.chance >= 10000
                          ? 'incomum'
                          : item.chance >= 1000
                          ? 'raro'
                          : 'muito-raro';
                      const rarityLabel =
                        item.chance >= 50000
                          ? 'Comum'
                          : item.chance >= 10000
                          ? 'Incomum'
                          : item.chance >= 1000
                          ? 'Raro'
                          : 'Muito raro';

                      return (
                        <div key={item.itemId} className="hunt-loot-item-row">
                          <div className="hunt-loot-item-left">
                            <div className="hunt-loot-item-sprite-box">
                              <img
                                src={`/generated/cyclopedia/items/item-${item.itemId}.png`}
                                alt={item.name}
                                onError={(e) => {
                                  const target = e.currentTarget;
                                  if (!target.dataset.triedFallback) {
                                    target.dataset.triedFallback = '1';
                                    target.src = `/assets/items/item-${item.itemId}.png`;
                                  }
                                }}
                              />
                            </div>
                            <span className="hunt-loot-item-name" title={item.name}>
                              {item.name}
                            </span>
                          </div>

                          <div className="hunt-loot-item-actions">
                            <span className={`hunt-loot-rarity ${rarityClass}`}>
                              {rarityLabel}
                            </span>
                            {isGold ? (
                              <>
                                <span style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '13px' }}>✓</span>
                                <span style={{ color: '#64748b', fontSize: '13px' }}>—</span>
                              </>
                            ) : (
                              <>
                                <input
                                  type="checkbox"
                                  className="hunt-loot-checkbox"
                                  checked={autoLootPrefs[item.itemId] !== false}
                                  onChange={() => toggleAutoLoot(item.itemId)}
                                  title="Pegar item automaticamente"
                                />
                                <input
                                  type="checkbox"
                                  className="hunt-loot-checkbox"
                                  checked={Boolean(autoSellPrefs[item.itemId])}
                                  onChange={() => toggleAutoSell(item.itemId)}
                                  title="Vender item automaticamente na volta à cidade"
                                />
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Setup Footer */}
            <div className="hunt-setup-footer">
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="hunt-setup-footer-btn"
                  onClick={() => setView('catalog')}
                >
                  ‹ Voltar ao catálogo
                </button>
                <button
                  type="button"
                  className="hunt-setup-footer-btn"
                  onClick={onClose}
                >
                  Fechar
                </button>
              </div>

              <button
                type="button"
                className="hunt-start-hunt-btn"
                onClick={handleStartHunt}
              >
                {isPartyLeader ? 'Iniciar com time' : 'Iniciar caçada'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
