'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import visualAssetsJson from '@/content/generated/tibia860-assets.json';
import type { HuntDefinition } from '@/packages/domain/src';
import type { MonsterDefinition } from '@/packages/content-schema/src';
import type { Tibia860AssetManifest } from '@/packages/tibia860-assets/src/types';
import { ItemSprite } from './ItemSprite';

const assets = visualAssetsJson as Tibia860AssetManifest;

interface Props {
  open: boolean;
  hunts: HuntDefinition[];
  monsters: MonsterDefinition[];
  level: number;
  currentHuntId?: string;
  isInCity?: boolean;
  isPartyLeader?: boolean;
  onClose(): void;
  onSelect(huntId: string): void;
  onSelectWithTeam?(huntId: string, huntName: string): void;
  onOpenPartyModal?: () => void;
  onStartTraining?: (skill: string) => void;
}

type ActiveTab = 'CAÇADAS' | 'TREINO' | 'QUESTS' | 'ARENA' | 'BOSSES';

interface ElementDef {
  key: string;
  label: string;
  icon: string;
}

const ELEMENTS: ElementDef[] = [
  { key: 'physical', label: 'Físico', icon: '🛡️' },
  { key: 'fire', label: 'Fogo', icon: '🔥' },
  { key: 'earth', label: 'Terra', icon: '🌿' },
  { key: 'energy', label: 'Energia', icon: '⚡' },
  { key: 'ice', label: 'Gelo', icon: '❄️' },
  { key: 'holy', label: 'Sagrado', icon: '✨' },
  { key: 'death', label: 'Morte', icon: '💀' },
  { key: 'lifeDrain', label: 'Life Drain', icon: '🩸' },
];

export function HuntSelector({
  open,
  hunts,
  monsters,
  level,
  currentHuntId,
  isInCity = false,
  isPartyLeader = false,
  onClose,
  onSelect,
  onSelectWithTeam,
  onOpenPartyModal,
  onStartTraining,
}: Props) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('CAÇADAS');
  const [query, setQuery] = useState('');
  const [selectedHuntId, setSelectedHuntId] = useState<string>(() => hunts[0]?.id ?? 'rat-cellars');
  const [selectedTrainingSkill, setSelectedTrainingSkill] = useState<string>('Sword Fighting');
  const [showBestiaryTooltip, setShowBestiaryTooltip] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const onSelectRef = useRef(onSelect);
  const onCloseRef = useRef(onClose);
  const selectedHuntIdRef = useRef(selectedHuntId);
  const prevOpenRef = useRef(open);

  useEffect(() => {
    onSelectRef.current = onSelect;
    onCloseRef.current = onClose;
    selectedHuntIdRef.current = selectedHuntId;
  });

  // Sync selected hunt with currentHuntId only when opened fresh
  useEffect(() => {
    if (open && !prevOpenRef.current && currentHuntId) {
      setSelectedHuntId(currentHuntId);
      setCountdown(null);
    }
    prevOpenRef.current = open;
  }, [open, currentHuntId]);

  // Handle 5-second countdown on hunt switch using interval resilient to parent re-renders
  const isCountingDown = countdown !== null;
  useEffect(() => {
    if (!isCountingDown) return;
    const interval = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          window.clearInterval(interval);
          onSelectRef.current(selectedHuntIdRef.current);
          onCloseRef.current();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isCountingDown]);

  const filteredHunts = useMemo(() => {
    return hunts.filter((hunt) => {
      const monsterNames = hunt.monsters
        .map((id) => monsters.find((monster) => monster.id === id)?.name ?? id)
        .join(' ');
      return `${hunt.name} ${monsterNames}`.toLowerCase().includes(query.trim().toLowerCase());
    });
  }, [hunts, monsters, query]);

  const selectedHunt = useMemo(() => {
    return hunts.find((h) => h.id === selectedHuntId) ?? hunts[0];
  }, [hunts, selectedHuntId]);

  const primaryMonster = useMemo(() => {
    if (!selectedHunt) return null;
    const monsterId = selectedHunt.monsters[0];
    return monsters.find((m) => m.id === monsterId) ?? null;
  }, [selectedHunt, monsters]);

  // Calculate monster damage resistances: damage = 100 - elementalPercent
  const elementDamages = useMemo(() => {
    if (!primaryMonster) return [];
    return ELEMENTS.map((elem) => {
      const rawRes = primaryMonster.elementalPercent?.[elem.key] ?? 0;
      const damagePercent = Math.max(0, 100 - rawRes);
      return {
        ...elem,
        percent: damagePercent,
      };
    });
  }, [primaryMonster]);

  // Bestiary progress calculation
  const bestiaryStats = useMemo(() => {
    if (!primaryMonster) return { current: 2500, target: 2500, completed: true };
    const exp = primaryMonster.experience ?? 50;
    const target = exp < 50 ? 50 : exp < 200 ? 250 : exp < 1500 ? 1000 : 2500;
    // Mock high completion for demonstrative fidelity
    const current = target;
    return {
      current,
      target,
      completed: current >= target,
    };
  }, [primaryMonster]);

  // Consolidated loot list for selected hunt
  const huntLootList = useMemo(() => {
    if (!selectedHunt) return [];
    const map = new Map<number, { itemId: number; name: string; chance: number }>();
    for (const monsterId of selectedHunt.monsters) {
      const m = monsters.find((cand) => cand.id === monsterId);
      if (!m || !m.loot) continue;
      for (const drop of m.loot) {
        if (drop.itemId !== undefined && drop.chance !== undefined) {
          if (!map.has(drop.itemId) || map.get(drop.itemId)!.chance < drop.chance) {
            map.set(drop.itemId, { itemId: drop.itemId, name: drop.name, chance: drop.chance });
          }
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => b.chance - a.chance);
  }, [selectedHunt, monsters]);

  const getRarityTag = (chance: number) => {
    if (chance >= 100000) return { label: 'always', className: 'rarity-always' };
    if (chance >= 20000) return { label: 'common', className: 'rarity-common' };
    if (chance >= 5000) return { label: 'semi-rare', className: 'rarity-semirare' };
    if (chance >= 1000) return { label: 'rare', className: 'rarity-rare' };
    return { label: 'very rare', className: 'rarity-veryrare' };
  };

  const handleSwitchClick = () => {
    if (isInCity) {
      onSelect(selectedHuntId);
      onClose();
      return;
    }
    if (countdown !== null) {
      setCountdown(null);
      return;
    }
    setCountdown(5);
  };

  if (!open) return null;

  return (
    <div
      className="modal-backdrop hunt-selector-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && countdown === null && onClose()}
    >
      <div className="hunt-window-container" role="dialog" aria-modal="true" aria-label="Escolha uma caçada">
        {/* Window Title Bar */}
        <div className="hunt-window-header">
          <span className="hunt-window-title">Escolha uma caçada</span>
          <button
            type="button"
            className="hunt-window-close-btn"
            onClick={onClose}
            disabled={countdown !== null}
            title="Fechar janela"
          >
            ✕
          </button>
        </div>

        {/* Top Tabs */}
        <div className="hunt-top-tabs">
          {(['CAÇADAS', 'TREINO', 'QUESTS', 'ARENA', 'BOSSES'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              className={`hunt-top-tab-btn ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
              disabled={tab !== 'CAÇADAS' && tab !== 'TREINO'}
              title={tab !== 'CAÇADAS' && tab !== 'TREINO' ? `${tab} (Em breve)` : undefined}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Main Content Body: CAÇADAS or TREINO */}
        {activeTab === 'CAÇADAS' ? (
          <div className="hunt-window-body">
            {/* Column 1: Search & Hunt List */}
            <div className="hunt-col-list">
              <div className="hunt-search-bar">
                <span className="hunt-search-icon">🔍</span>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar uma caçada ou criatura"
                  className="hunt-search-input"
                />
              </div>
              <div className="hunt-available-count">
                {filteredHunts.length} CAÇADAS DISPONÍVEIS
              </div>
              <div className="hunt-scroll-list">
                {filteredHunts.map((hunt) => {
                  const isSelected = hunt.id === selectedHuntId;
                  const monsterId = hunt.monsters[0];
                  const monster = monsters.find((m) => m.id === monsterId);
                  const frame =
                    assets.creatures[monsterId]?.frames.find((f) => f.direction === 'south') ??
                    assets.creatures[monsterId]?.frames[0];
                  const dropCount = hunt.monsters.reduce((acc, mId) => {
                    const mDef = monsters.find((m) => m.id === mId);
                    return acc + (mDef?.loot?.length ?? 0);
                  }, 0);

                  return (
                    <div
                      key={hunt.id}
                      className={`hunt-list-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => {
                        if (countdown === null) setSelectedHuntId(hunt.id);
                      }}
                    >
                      <div className="hunt-card-sprite-box">
                        {frame ? (
                          <img
                            src={frame.publicUrl}
                            alt={monster?.name ?? monsterId}
                            className="hunt-creature-sprite"
                          />
                        ) : (
                          <div className="hunt-placeholder-sprite">🐾</div>
                        )}
                      </div>
                      <div className="hunt-card-info">
                        <div className="hunt-card-name">{hunt.name}</div>
                        <div className="hunt-card-monster">{monster?.name ?? 'Criatura'}</div>
                        <div className="hunt-card-drops">{dropCount} drops de loot</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Column 2: Selected Hunt Details & Monster */}
            <div className="hunt-col-details">
              {selectedHunt ? (
                <>
                  <h3 className="hunt-selected-title">{selectedHunt.name}</h3>

                  {/* Record Card */}
                  <div className="hunt-record-card">
                    <div className="hunt-record-header">
                      <span>Seu recorde</span>
                      <button
                        type="button"
                        className="hunt-record-reset-btn"
                        title="Reiniciar métricas de caçada"
                      >
                        ⟳
                      </button>
                    </div>
                    <div className="hunt-record-metrics">
                      <span className="hunt-record-badge">Party</span>
                      <span className="hunt-record-xp">2.1M XP/h</span>
                      <span className="hunt-record-gp">-5.8K gp/h</span>
                    </div>
                  </div>

                  {/* Monster Details Section */}
                  <div className="hunt-monster-display">
                    <div
                      className="hunt-monster-preview-box"
                      onMouseEnter={() => setShowBestiaryTooltip(true)}
                      onMouseLeave={() => setShowBestiaryTooltip(false)}
                    >
                      {primaryMonster && assets.creatures[primaryMonster.id]?.frames[0] ? (
                        <img
                          src={
                            assets.creatures[primaryMonster.id]?.frames.find(
                              (f) => f.direction === 'south'
                            )?.publicUrl ?? assets.creatures[primaryMonster.id]?.frames[0].publicUrl
                          }
                          alt={primaryMonster.name}
                          className="hunt-large-creature-sprite"
                        />
                      ) : (
                        <div className="hunt-placeholder-large">👾</div>
                      )}
                      <button
                        type="button"
                        className="hunt-monster-details-btn"
                        onClick={() => setShowBestiaryTooltip((prev) => !prev)}
                      >
                        DETALHES
                      </button>
                      <div className="hunt-monster-label">{primaryMonster?.name ?? 'Monstro'}</div>

                      {/* Bestiary / Weaknesses Tooltip (Imagem 3) */}
                      {showBestiaryTooltip && primaryMonster && (
                        <div className="monster-bestiary-tooltip" role="tooltip">
                          <div className="bestiary-tooltip-header">
                            <h4>{primaryMonster.name}</h4>
                            <span className="bestiary-subtitle">DANO RECEBIDO</span>
                          </div>
                          <div className="bestiary-elements-list">
                            {elementDamages.map((elem) => {
                              const isVulnerable = elem.percent > 100;
                              return (
                                <div key={elem.key} className="bestiary-element-row">
                                  <span className="bestiary-elem-icon">{elem.icon}</span>
                                  <span className="bestiary-elem-label">{elem.label}</span>
                                  <div className="bestiary-bar-track">
                                    <div
                                      className={`bestiary-bar-fill ${
                                        elem.key === 'lifeDrain'
                                          ? 'fill-drain'
                                          : isVulnerable
                                          ? 'fill-vulnerable'
                                          : 'fill-resistant'
                                      }`}
                                      style={{
                                        width: `${Math.min(100, (elem.percent / 150) * 100)}%`,
                                      }}
                                    />
                                  </div>
                                  <span className="bestiary-elem-val">{elem.percent}%</span>
                                </div>
                              );
                            })}
                          </div>
                          <div className="bestiary-section-divider" />
                          <div className="bestiary-progress-section">
                            <div className="bestiary-progress-header">
                              <span>BESTIARY</span>
                              <b>
                                {bestiaryStats.current.toLocaleString('pt-BR')} /{' '}
                                {bestiaryStats.target.toLocaleString('pt-BR')}
                              </b>
                            </div>
                            <div className="bestiary-progress-track">
                              <div
                                className="bestiary-progress-fill"
                                style={{
                                  width: `${Math.min(
                                    100,
                                    (bestiaryStats.current / bestiaryStats.target) * 100
                                  )}%`,
                                }}
                              />
                            </div>
                            <div className="bestiary-completed-badge">
                              {bestiaryStats.completed ? '✓ Entrada concluída' : 'Em progresso'}
                            </div>
                            <div className="bestiary-click-caption">
                              Clique para ver a entrada completa no Bestiary
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <p className="hunt-monster-lore">
                      {selectedHunt.description ||
                        'Lightless halls patrolled by death itself. A creature of great renown with sharp instincts and rich rewards.'}
                    </p>
                  </div>
                </>
              ) : (
                <div className="hunt-empty-placeholder">Selecione uma caçada</div>
              )}
            </div>

            {/* Column 3: Possible Loot */}
            <div className="hunt-col-loot">
              <h4 className="hunt-loot-title">Loot possível</h4>
              <div className="hunt-loot-scroll">
                {huntLootList.length > 0 ? (
                  huntLootList.map((loot) => {
                    const tag = getRarityTag(loot.chance);
                    return (
                      <div key={loot.itemId} className="hunt-loot-row">
                        <div className="hunt-loot-icon-box">
                          <ItemSprite itemId={loot.itemId} label={loot.name} />
                        </div>
                        <span className="hunt-loot-name">{loot.name}</span>
                        <span className={`hunt-loot-rarity-tag ${tag.className}`}>{tag.label}</span>
                        <input
                          type="checkbox"
                          defaultChecked
                          className="hunt-loot-checkbox"
                          title="Ativar auto-loot deste item"
                        />
                      </div>
                    );
                  })
                ) : (
                  <div className="hunt-no-loot-msg">Nenhum loot catalogado para esta área.</div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Aba TREINO (Imagem 1) */
          <div className="training-window-body">
            <p className="training-window-subtitle">
              Escolha uma habilidade e como treiná-la no pátio de treino da cidade.
            </p>

            {/* 6 Skill Selection Cards */}
            <div className="training-skills-grid">
              {[
                { id: 'Club Fighting', label: 'Club Fighting', icon: '🔨' },
                { id: 'Sword Fighting', label: 'Sword Fighting', icon: '🗡️' },
                { id: 'Axe Fighting', label: 'Axe Fighting', icon: '🪓' },
                { id: 'Distance Fighting', label: 'Distance Fighting', icon: '🏹' },
                { id: 'Shielding', label: 'Shielding', icon: '🛡️' },
                { id: 'Magic Level', label: 'Magic Level', icon: '🔮' },
              ].map((sk) => (
                <div
                  key={sk.id}
                  className={`training-skill-card ${selectedTrainingSkill === sk.id ? 'selected' : ''}`}
                  onClick={() => setSelectedTrainingSkill(sk.id)}
                >
                  <span className="training-skill-icon">{sk.icon}</span>
                  <span className="training-skill-label">{sk.label}</span>
                </div>
              ))}
            </div>

            {/* 3 Training Method Cards */}
            <div className="training-methods-row">
              {/* Panel 1: Arma de Exercício */}
              <div className="training-method-card">
                <h4 className="training-method-title blue">ARMA DE EXERCÍCIO</h4>
                <p className="training-method-desc">
                  Você não tem nenhuma arma de exercício que treine {selectedTrainingSkill}. Compre uma com coins na store, ou com gold na loja da cidade.
                </p>
                <div className="training-method-actions">
                  <button type="button" className="training-btn-action">Comprar na store</button>
                  <button type="button" className="training-btn-action">Loja da cidade</button>
                </div>
              </div>

              {/* Panel 2: Treino Online */}
              <div className="training-method-card highlight">
                <h4 className="training-method-title blue">TREINO ONLINE</h4>
                <p className="training-method-desc">
                  Treine {selectedTrainingSkill} em um dummy básico enquanto estiver no jogo — o dobro do ritmo de acertar golpes numa caçada.
                </p>
                <div className="training-method-actions">
                  <button
                    type="button"
                    className="training-btn-primary"
                    disabled={!isInCity}
                    onClick={() => {
                      onStartTraining?.(selectedTrainingSkill);
                      onClose();
                    }}
                    title={!isInCity ? 'Disponível apenas na cidade de Thais' : 'Iniciar treino no dummy'}
                  >
                    Iniciar treino
                  </button>
                </div>
              </div>

              {/* Panel 3: Treino Offline */}
              <div className="training-method-card gold">
                <h4 className="training-method-title gold">TREINO OFFLINE</h4>
                <p className="training-method-desc">
                  Personagens premium continuam treinando depois de deslogar — na metade do ritmo online, por até 12 horas por sessão.
                </p>
                <div className="training-method-actions">
                  <button type="button" className="training-btn-gold">Assinar Premium</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Actions Bar */}
        <div className="hunt-window-footer">
          {activeTab === 'CAÇADAS' ? (
            <>
              <button
                type="button"
                className={`hunt-btn-switch ${countdown !== null ? 'counting' : ''}`}
                onClick={handleSwitchClick}
              >
                {countdown !== null
                  ? `Trocando em ${countdown}s (cancelar)`
                  : isInCity
                  ? 'Iniciar caçada'
                  : 'Trocar de caçada'}
              </button>

              {isPartyLeader && onSelectWithTeam && (
                <button
                  type="button"
                  className="hunt-btn-team"
                  style={{
                    backgroundColor: '#172033',
                    border: '1px solid #3b82f6',
                    boxShadow: '0 0 8px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
                    color: '#93c5fd',
                    fontWeight: 700,
                    padding: '6px 16px',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#1e2c47';
                    e.currentTarget.style.borderColor = '#60a5fa';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#172033';
                    e.currentTarget.style.borderColor = '#3b82f6';
                  }}
                  onClick={() => {
                    if (selectedHunt) {
                      onSelectWithTeam(selectedHunt.id, selectedHunt.name);
                      onClose();
                    }
                  }}
                >
                  Iniciar com o time
                </button>
              )}

              <button
                type="button"
                className="hunt-btn-party"
                onClick={() => {
                  if (onOpenPartyModal) onOpenPartyModal();
                  onClose();
                }}
              >
                Completar o time
              </button>
            </>
          ) : (
            <div className="training-footer-status">
              {!isInCity
                ? 'Você já está em uma aventura — saia dela antes de começar outra.'
                : 'Cidade de Thais: pronto para treinar no dummy em (32349, 32238, 7).'}
            </div>
          )}

          <button
            type="button"
            className="hunt-btn-close"
            onClick={onClose}
            disabled={countdown !== null}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
