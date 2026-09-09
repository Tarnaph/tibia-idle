'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import type { HuntDefinition } from '@/packages/domain/src';
import type { MonsterDefinition } from '@/packages/content-schema/src';
import { HuntCarousel } from './hunts/HuntCarousel';
import { HuntLootTooltip, type LootItemEntry } from './hunts/HuntLootTooltip';

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
  const [selectedHuntId, setSelectedHuntId] = useState<string>(() => hunts[0]?.id ?? 'rat-cellars');
  const [selectedTrainingSkill, setSelectedTrainingSkill] = useState<string>('Sword Fighting');
  const [countdown, setCountdown] = useState<number | null>(null);

  // Floating loot tooltip state
  const [lootTooltipState, setLootTooltipState] = useState<{
    lootList: LootItemEntry[];
    anchorRect: DOMRect | null;
    huntTitle: string;
  }>({
    lootList: [],
    anchorRect: null,
    huntTitle: '',
  });

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

  // Keyboard navigation (Escape to close, Left/Right arrows to rotate carousel)
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (countdown === null) onClose();
      } else if (e.key === 'ArrowLeft' && activeTab === 'CAÇADAS') {
        const idx = hunts.findIndex((h) => h.id === selectedHuntId);
        if (idx >= 0 && hunts.length > 1) {
          const prevIdx = (idx - 1 + hunts.length) % hunts.length;
          setSelectedHuntId(hunts[prevIdx].id);
        }
      } else if (e.key === 'ArrowRight' && activeTab === 'CAÇADAS') {
        const idx = hunts.findIndex((h) => h.id === selectedHuntId);
        if (idx >= 0 && hunts.length > 1) {
          const nextIdx = (idx + 1) % hunts.length;
          setSelectedHuntId(hunts[nextIdx].id);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, activeTab, hunts, selectedHuntId, countdown, onClose]);

  // Derived level range from available hunts
  const levelRange = useMemo(() => {
    if (hunts.length === 0) return 'Nível 1';
    const levels = hunts.map((h) => h.recommendedLevel ?? h.minimumLevel ?? 1);
    const min = Math.min(...levels);
    const max = Math.max(...levels);
    return min === max ? `Nível ${min}` : `Nível ${min} – ${max}`;
  }, [hunts]);

  const selectedHunt = useMemo(() => {
    return hunts.find((h) => h.id === selectedHuntId) ?? hunts[0];
  }, [hunts, selectedHuntId]);

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

  const handleHoverLoot = (
    lootList: LootItemEntry[],
    rect: DOMRect | null,
    huntTitle: string
  ) => {
    setLootTooltipState({
      lootList,
      anchorRect: rect,
      huntTitle,
    });
  };

  if (!open) return null;

  return (
    <div
      className="modal-backdrop hunt-selector-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && countdown === null && onClose()}
    >
      <div
        className="hunt-window-container hunt-exura-frame"
        role="dialog"
        aria-modal="true"
        aria-label="Escolha sua caçada"
      >
        {/* Top Header with Plaque, Level Badge & Close Button */}
        <div className="hunt-modal-top-bar">
          {/* Left Decorative Wing / Tab Indicator */}
          <div className="hunt-top-tabs-medieval">
            <button
              type="button"
              className={`hunt-tab-pill ${activeTab === 'CAÇADAS' ? 'active' : ''}`}
              onClick={() => setActiveTab('CAÇADAS')}
            >
              CAÇADAS
            </button>
            <button
              type="button"
              className={`hunt-tab-pill ${activeTab === 'TREINO' ? 'active' : ''}`}
              onClick={() => setActiveTab('TREINO')}
            >
              TREINO
            </button>
          </div>

          {/* Center Octagonal Plaque */}
          <div className="hunt-header-plaque-wrapper">
            <div className="hunt-header-plaque-gem-top" />
            <div className="hunt-header-plaque">
              <span className="hunt-header-plaque-title">ESCOLHA SUA CAÇADA</span>
            </div>
            <div className="hunt-header-plaque-gem-bottom" />
          </div>

          {/* Right Level Range Badge & Close Button */}
          <div className="hunt-top-right-cluster">
            {activeTab === 'CAÇADAS' && (
              <div className="hunt-level-range-badge" title="Faixa de níveis das caçadas disponíveis">
                <span className="hunt-level-range-icon">📶</span>
                <span className="hunt-level-range-text">{levelRange}</span>
              </div>
            )}

            <button
              type="button"
              className="hunt-modal-close-btn"
              onClick={onClose}
              disabled={countdown !== null}
              title="Fechar janela (ESC)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content Body: Carousel (CAÇADAS) or Training (TREINO) */}
        {activeTab === 'CAÇADAS' ? (
          <div className="hunt-carousel-body">
            <HuntCarousel
              hunts={hunts}
              selectedHuntId={selectedHuntId}
              onSelectHunt={(id) => {
                if (countdown === null) setSelectedHuntId(id);
              }}
              monsters={monsters}
              characterLevel={level}
              onHoverLoot={handleHoverLoot}
            />
          </div>
        ) : (
          /* Aba TREINO */
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
        <div className="hunt-modal-footer">
          {activeTab === 'CAÇADAS' ? (
            <div className="hunt-footer-controls">
              {/* Secondary Party Action */}
              {isPartyLeader && onSelectWithTeam && (
                <button
                  type="button"
                  className="hunt-btn-medieval-team"
                  onClick={() => {
                    if (selectedHunt) {
                      onSelectWithTeam(selectedHunt.id, selectedHunt.name);
                      onClose();
                    }
                  }}
                  title="Propor caçada ao grupo"
                >
                  Iniciar com o time
                </button>
              )}

              {/* Central Ruby & Gold Action Button */}
              <button
                type="button"
                className={`hunt-btn-ruby-primary ${countdown !== null ? 'counting' : ''}`}
                onClick={handleSwitchClick}
              >
                <span className="hunt-btn-ruby-gem left" />
                <span className="hunt-btn-ruby-text">
                  {countdown !== null
                    ? `Trocando em ${countdown}s (cancelar)`
                    : 'INICIAR CAÇADA'}
                </span>
                <span className="hunt-btn-ruby-gem right" />
              </button>

              {/* Party Member Completion */}
              <button
                type="button"
                className="hunt-btn-medieval-party"
                onClick={() => {
                  if (onOpenPartyModal) onOpenPartyModal();
                  onClose();
                }}
                title="Abrir gerenciador de grupo"
              >
                Completar o time
              </button>
            </div>
          ) : (
            <div className="training-footer-status">
              {!isInCity
                ? 'Você já está em uma aventura — saia dela antes de começar outra.'
                : 'Cidade de Thais: pronto para treinar no dummy em (32349, 32238, 7).'}
            </div>
          )}
        </div>
      </div>

      {/* Floating Loot Tooltip Rendered at Root to Prevent Any Overflow Clipping */}
      <HuntLootTooltip
        open={Boolean(lootTooltipState.anchorRect && lootTooltipState.lootList.length > 0)}
        lootList={lootTooltipState.lootList}
        anchorRect={lootTooltipState.anchorRect}
        huntName={lootTooltipState.huntTitle}
      />
    </div>
  );
}
