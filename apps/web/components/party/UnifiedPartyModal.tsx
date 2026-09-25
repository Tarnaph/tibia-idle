'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { CharacterState } from '@/packages/domain/src';
import {
  renderRecoloredOutfit,
  type OutfitColors,
} from '@/apps/web/lib/outfitRecolor';

export type VocationSlotType = 'Knight' | 'Paladin' | 'Sorcerer' | 'Druid';

export interface VocationSlotConfig {
  vocation: VocationSlotType;
  title: string;
  roleTitle: string;
  shortRole: string;
  tacticalTip: string;
  icon: string;
  themeColor: string;
  bannerBg: string;
  borderAccent: string;
  bgGlow: string;
}

export const VOCATION_SLOT_CONFIGS: Record<VocationSlotType, VocationSlotConfig> = {
  Knight: {
    vocation: 'Knight',
    title: 'Knight',
    roleTitle: 'Vanguarda & Proteção (Tank)',
    shortRole: 'Vanguarda e defesa (Tank)',
    tacticalTip: 'Atrai os monstros com Exeta Res, segura o dano físico e protege o grupo na linha de frente.',
    icon: '🛡️',
    themeColor: '#ef4444',
    bannerBg: 'linear-gradient(180deg, #7f1d1d 0%, #3b0a0a 100%)',
    borderAccent: '#dc2626',
    bgGlow: 'rgba(220, 38, 38, 0.2)',
  },
  Paladin: {
    vocation: 'Paladin',
    title: 'Paladin',
    roleTitle: 'Dano Físico & Sagrado (Ranged DPS)',
    shortRole: 'DPS híbrido à distância',
    tacticalTip: 'Ataques à distância consistentes com lanças/bestas, apoiando com magias sagradas e cura secundária.',
    icon: '🏹',
    themeColor: '#f59e0b',
    bannerBg: 'linear-gradient(180deg, #78350f 0%, #3b1704 100%)',
    borderAccent: '#f59e0b',
    bgGlow: 'rgba(245, 158, 11, 0.2)',
  },
  Sorcerer: {
    vocation: 'Sorcerer',
    title: 'Sorcerer',
    roleTitle: 'Dano Mágico Ofensivo (Area DPS)',
    shortRole: 'Dano mágico explosivo',
    tacticalTip: 'Causa explosões de dano massivo em área com feitiços elementais (fogo/energia) e runas de ataque.',
    icon: '🔥',
    themeColor: '#a855f7',
    bannerBg: 'linear-gradient(180deg, #581c87 0%, #2e0854 100%)',
    borderAccent: '#9333ea',
    bgGlow: 'rgba(147, 51, 234, 0.2)',
  },
  Druid: {
    vocation: 'Druid',
    title: 'Druid',
    roleTitle: 'Curador Primário & Suporte Vital (Healer)',
    shortRole: 'Cura e suporte',
    tacticalTip: 'Foco contínuo em manter o Knight vivo (Exura Sio) e conjurar Mass Healing e magias de gelo/terra.',
    icon: '🌿',
    themeColor: '#10b981',
    bannerBg: 'linear-gradient(180deg, #064e3b 0%, #022019 100%)',
    borderAccent: '#10b981',
    bgGlow: 'rgba(16, 185, 129, 0.2)',
  },
};

export interface RemotePartyMember {
  id: string;
  name: string;
  vocation: string;
  level: number;
  hp: number;
  maxHp: number;
  isLeader?: boolean;
  isReady?: boolean;
  outfit?: any;
}

export interface UnifiedPartyModalProps {
  open: boolean;
  onClose: () => void;
  activeCharacter: CharacterState;
  accountCharacters?: CharacterState[];
  partyMemberIds?: string[];
  remoteMembers?: RemotePartyMember[];
  isPartyLeader?: boolean;
  currentHuntName?: string;
  onSelectActiveCharacter?: (charId: string) => void;
  onAddAltToParty?: (charId: string) => void;
  onRemoveAltFromParty?: (charId: string) => void;
  onInviteRemotePlayer?: (playerName: string) => void;
  onKickRemotePlayer?: (sessionId: string) => void;
  onOpenHuntSelector?: () => void;
  onProposeHuntToTeam?: () => void;
  onDisbandParty?: () => void;
  onLeaveParty?: () => void;
  onCreateCharacter?: (
    name: string,
    vocation: 'Knight' | 'Paladin' | 'Sorcerer' | 'Druid',
    gender?: 'Masculino' | 'Feminino'
  ) => string | null;
}

/**
 * Componente auxiliar para renderizar a miniatura do outfit em canvas com recolor
 */
function CharacterOutfitCanvas({
  outfit,
  gender = 'male',
  vocation,
}: {
  outfit?: any;
  gender?: 'male' | 'female';
  vocation: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [renderFailed, setRenderFailed] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || !outfit) return;
    const outfitId = outfit.outfitId || outfit.id || vocation;
    const colors: OutfitColors = outfit.colors || { head: 0, body: 0, legs: 0, feet: 0 };
    const addons = outfit.addons || 0;
    const mount = outfit.mount || 'none';
    const isMounted = Boolean(outfit.mountActive && mount !== 'none');

    renderRecoloredOutfit(
      canvasRef.current,
      outfitId,
      gender,
      'south',
      0,
      colors,
      addons,
      mount,
      isMounted,
      () => true
    ).catch(() => {
      setRenderFailed(true);
    });
  }, [outfit, gender, vocation]);

  if (renderFailed || !outfit) {
    return (
      <div className="party-card-avatar-fallback">
        <span className="party-card-avatar-icon">
          {vocation === 'Knight' ? '🛡️' : vocation === 'Paladin' ? '🏹' : vocation === 'Sorcerer' ? '🔥' : '🌿'}
        </span>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={64}
      height={64}
      className="party-card-outfit-canvas"
    />
  );
}

export function UnifiedPartyModal({
  open,
  onClose,
  activeCharacter,
  accountCharacters = [],
  partyMemberIds = [],
  remoteMembers = [],
  isPartyLeader = true,
  currentHuntName,
  onSelectActiveCharacter,
  onAddAltToParty,
  onRemoveAltFromParty,
  onInviteRemotePlayer,
  onKickRemotePlayer,
  onOpenHuntSelector,
  onProposeHuntToTeam,
  onDisbandParty,
  onLeaveParty,
  onCreateCharacter,
}: UnifiedPartyModalProps) {
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteInputName, setInviteInputName] = useState('');
  const [openDropdownVocation, setOpenDropdownVocation] = useState<VocationSlotType | null>(null);

  // Estados de criação rápida de personagem na party
  const [createCharModalOpen, setCreateCharModalOpen] = useState(false);
  const [createCharVocation, setCreateCharVocation] = useState<VocationSlotType>('Druid');
  const [createCharName, setCreateCharName] = useState('');
  const [createCharGender, setCreateCharGender] = useState<'Masculino' | 'Feminino'>('Masculino');
  const [createCharError, setCreateCharError] = useState<string | null>(null);

  // Esc para fechar
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (createCharModalOpen) {
          setCreateCharModalOpen(false);
        } else if (inviteModalOpen) {
          setInviteModalOpen(false);
        } else if (openDropdownVocation) {
          setOpenDropdownVocation(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, createCharModalOpen, inviteModalOpen, openDropdownVocation, onClose]);

  // Lista de alts da conta do jogador
  const allAccountChars = useMemo(() => {
    if (accountCharacters.length > 0) return accountCharacters;
    return [activeCharacter];
  }, [accountCharacters, activeCharacter]);

  // Normalizador de vocação
  const normalizeVocation = (voc?: string): VocationSlotType => {
    if (!voc) return 'Knight';
    const lower = voc.toLowerCase();
    if (lower.includes('knight')) return 'Knight';
    if (lower.includes('paladin')) return 'Paladin';
    if (lower.includes('sorcerer')) return 'Sorcerer';
    if (lower.includes('druid')) return 'Druid';
    return 'Knight';
  };

  // Mapeamento dos 4 slots
  const slotOccupants = useMemo(() => {
    const result: Record<
      VocationSlotType,
      {
        character: CharacterState | null;
        remotePlayer: RemotePartyMember | null;
        source: 'leader' | 'account' | 'remote' | 'empty';
        isReady: boolean;
      }
    > = {
      Knight: { character: null, remotePlayer: null, source: 'empty', isReady: false },
      Paladin: { character: null, remotePlayer: null, source: 'empty', isReady: false },
      Sorcerer: { character: null, remotePlayer: null, source: 'empty', isReady: false },
      Druid: { character: null, remotePlayer: null, source: 'empty', isReady: false },
    };

    // 1. Aloca o líder / personagem ativo primeiro
    const activeVoc = normalizeVocation(activeCharacter.baseVocation || activeCharacter.vocation);
    result[activeVoc] = {
      character: activeCharacter,
      remotePlayer: null,
      source: 'leader',
      isReady: true,
    };

    // 2. Aloca membros remotos conectados
    for (const remote of remoteMembers) {
      const rVoc = normalizeVocation(remote.vocation);
      if (result[rVoc].source === 'empty') {
        result[rVoc] = {
          character: null,
          remotePlayer: remote,
          source: 'remote',
          isReady: Boolean(remote.isReady),
        };
      }
    }

    // 3. Aloca alts da conta que estão na party
    for (const char of allAccountChars) {
      if (char.id === activeCharacter.id) continue;
      if (!partyMemberIds.includes(char.id)) continue;
      const cVoc = normalizeVocation(char.baseVocation || char.vocation);
      if (result[cVoc].source === 'empty') {
        result[cVoc] = {
          character: char,
          remotePlayer: null,
          source: 'account',
          isReady: true,
        };
      }
    }

    return result;
  }, [activeCharacter, remoteMembers, allAccountChars, partyMemberIds]);

  // Contagem de membros ocupados
  const totalOccupied = useMemo(() => {
    return Object.values(slotOccupants).filter((s) => s.source !== 'empty').length;
  }, [slotOccupants]);

  // Verifica se há alts livres que possam autopreencher vagas vazias
  const canAutoFill = useMemo(() => {
    if (!onAddAltToParty) return false;
    const vocations: VocationSlotType[] = ['Knight', 'Paladin', 'Sorcerer', 'Druid'];
    return vocations.some((voc) => {
      if (slotOccupants[voc].source !== 'empty') return false;
      return allAccountChars.some((c) => {
        if (c.id === activeCharacter.id) return false;
        if (partyMemberIds.includes(c.id)) return false;
        return normalizeVocation(c.baseVocation || c.vocation) === voc;
      });
    });
  }, [allAccountChars, activeCharacter.id, partyMemberIds, slotOccupants, onAddAltToParty]);

  const handleAutoFill = () => {
    if (!onAddAltToParty) return;
    const vocations: VocationSlotType[] = ['Knight', 'Paladin', 'Sorcerer', 'Druid'];
    for (const voc of vocations) {
      if (slotOccupants[voc].source === 'empty') {
        const availableAlt = allAccountChars.find((c) => {
          if (c.id === activeCharacter.id) return false;
          if (partyMemberIds.includes(c.id)) return false;
          return normalizeVocation(c.baseVocation || c.vocation) === voc;
        });
        if (availableAlt) {
          onAddAltToParty(availableAlt.id);
        }
      }
    }
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteInputName.trim() && onInviteRemotePlayer) {
      onInviteRemotePlayer(inviteInputName.trim());
      setInviteInputName('');
      setInviteModalOpen(false);
    }
  };

  const handleCreateCharSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createCharName.trim()) {
      setCreateCharError('Por favor, informe o nome do personagem.');
      return;
    }
    if (!onCreateCharacter) return;
    const err = onCreateCharacter(createCharName.trim(), createCharVocation, createCharGender);
    if (err) {
      setCreateCharError(err);
    } else {
      setCreateCharName('');
      setCreateCharError(null);
      setCreateCharModalOpen(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="modal-backdrop party-selector-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="hunt-window-container hunt-exura-frame party-modal-container"
        role="dialog"
        aria-modal="true"
        aria-label="Gerenciador de Party"
      >
        {/* Header Minimalista (Reference Image) */}
        <div className="party-header-compact">
          <div className="party-header-left">
            <div className="party-header-crest">
              <span className="party-header-crest-icon">⚔️</span>
            </div>
            <div>
              <h2 className="party-header-title">Gerenciador de Party</h2>
              <p className="party-header-subtitle">Monte sua composição ideal para caçar.</p>
            </div>
          </div>

          <div className="party-header-right">
            <div className="party-recommended-formation">
              <span className="party-formation-label">Formação recomendada</span>
              <div className="party-formation-icons">
                <span className="formation-icon knight" title="Knight (Tank)">🛡️</span>
                <span className="formation-icon paladin" title="Paladin (Ranged DPS)">🏹</span>
                <span className="formation-icon sorcerer" title="Sorcerer (Area DPS)">🔥</span>
                <span className="formation-icon druid" title="Druid (Healer)">🌿</span>
              </div>
            </div>

            <div className="party-slots-counter-pill" title={`${totalOccupied} de 4 vagas ocupadas`}>
              <span className="party-slots-icon">👥</span>
              <span className="party-slots-text">{totalOccupied}/4 vagas</span>
            </div>

            <button
              type="button"
              className="party-close-btn"
              onClick={onClose}
              title="Fechar (ESC)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 4 Cards de Vocações Compactos */}
        <div className="party-stage-container">
          <div className="party-cards-grid">
            {(['Knight', 'Paladin', 'Sorcerer', 'Druid'] as VocationSlotType[]).map((voc) => {
              const config = VOCATION_SLOT_CONFIGS[voc];
              const slot = slotOccupants[voc];
              const isOccupied = slot.source !== 'empty';
              const char = slot.character;
              const remote = slot.remotePlayer;

              // Alts disponíveis desta vocação para preencher a vaga
              const availableAlts = allAccountChars.filter((c) => {
                if (c.id === activeCharacter.id) return false;
                if (partyMemberIds.includes(c.id)) return false;
                return normalizeVocation(c.baseVocation || c.vocation) === voc;
              });

              const displayName = char ? char.name : remote ? remote.name : null;
              const displayLevel = char ? char.level : remote ? remote.level : null;
              const currentHp = char ? (char.currentHp ?? (char as any).health) : remote ? remote.hp : null;
              const maxHp = char ? (char.maxHp ?? (char as any).maxHealth) : remote ? remote.maxHp : null;
              const hpPercent =
                currentHp && maxHp ? Math.max(0, Math.min(100, Math.round((currentHp / maxHp) * 100))) : 100;

              return (
                <div
                  key={voc}
                  className={`party-vocation-card ${isOccupied ? 'occupied' : 'empty'} ${slot.source === 'leader' ? 'leader-card' : ''} voc-${voc.toLowerCase()}`}
                  style={{
                    borderColor: isOccupied ? config.borderAccent : undefined,
                  }}
                >
                  {/* Card Header Banner */}
                  <div
                    className="party-card-vocation-banner"
                    style={{ background: config.bannerBg }}
                  >
                    <span className="party-vocation-banner-icon">{config.icon}</span>
                    <span className="party-vocation-banner-title">{config.title}</span>
                  </div>

                  {isOccupied ? (
                    <div className="party-card-occupied-body">
                      {/* Circular Portrait Frame */}
                      <div className="party-card-portrait-wrap">
                        <div
                          className="party-card-portrait-circle"
                          style={{ borderColor: config.themeColor }}
                        >
                          <CharacterOutfitCanvas
                            outfit={char?.outfit || remote?.outfit}
                            gender={char?.gender as any}
                            vocation={voc}
                          />
                        </div>

                        {/* Level Medallion on bottom-left */}
                        <div className="party-card-circle-lvl" title={`Nível ${displayLevel}`}>
                          {displayLevel ?? 1}
                        </div>

                        {/* Origin Tag on bottom-right */}
                        {slot.source === 'leader' && (
                          <div className="party-card-circle-tag leader" title="Líder do Grupo">
                            ★ Líder
                          </div>
                        )}
                        {slot.source === 'account' && (
                          <div className="party-card-circle-tag account" title="Personagem Alt">
                            👤 Sua Conta
                          </div>
                        )}
                        {slot.source === 'remote' && (
                          <div className="party-card-circle-tag remote" title="Jogador Conectado">
                            🌐 Jogador
                          </div>
                        )}
                      </div>

                      {/* Character Name */}
                      <div className="party-card-char-name" title={displayName || ''}>
                        {displayName}
                      </div>

                      {/* Slim HP Bar */}
                      <div className="party-card-hp-wrapper">
                        <div className="party-card-hp-bar">
                          <div className="party-card-hp-fill" style={{ width: `${hpPercent}%` }} />
                        </div>
                        <span className="party-card-hp-text">
                          {currentHp} / {maxHp} HP ({hpPercent}%)
                        </span>
                      </div>

                      {/* Subtle Diamond Divider */}
                      <div className="party-card-diamond-divider">◈</div>

                      {/* Status Button / Pill */}
                      <div className="party-card-readiness-row">
                        <div className="party-readiness-pill ready">
                          <span className="readiness-dot green" />
                          <span className="readiness-text">PRONTO PARA CAÇAR</span>
                        </div>
                      </div>

                      {/* Alt or Remote Actions */}
                      {slot.source === 'account' && (
                        <div className="party-card-mini-actions">
                          {onSelectActiveCharacter && (
                            <button
                              type="button"
                              className="party-btn-micro"
                              onClick={() => onSelectActiveCharacter(char!.id)}
                              title="Tornar este personagem ativo"
                            >
                              Trocar Ativo
                            </button>
                          )}
                          {onRemoveAltFromParty && (
                            <button
                              type="button"
                              className="party-btn-micro-danger"
                              onClick={() => onRemoveAltFromParty(char!.id)}
                              title="Remover da party"
                            >
                              Remover
                            </button>
                          )}
                        </div>
                      )}

                      {slot.source === 'remote' && isPartyLeader && onKickRemotePlayer && (
                        <div className="party-card-mini-actions">
                          <button
                            type="button"
                            className="party-btn-micro-danger"
                            onClick={() => onKickRemotePlayer(remote!.id)}
                            title="Remover jogador"
                          >
                            Expulsar
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="party-card-empty-body">
                      {/* Watermark background icon */}
                      <div className="party-card-watermark-icon">{config.icon}</div>

                      {/* Big circular (+) button */}
                      <button
                        type="button"
                        className="party-card-add-circle"
                        onClick={() => {
                          if (availableAlts.length > 0) {
                            setOpenDropdownVocation(openDropdownVocation === voc ? null : voc);
                          } else if (onCreateCharacter) {
                            setCreateCharVocation(voc);
                            setCreateCharName('');
                            setCreateCharError(null);
                            setCreateCharModalOpen(true);
                          } else {
                            setInviteModalOpen(true);
                          }
                        }}
                        title={`Adicionar ${config.title}`}
                      >
                        <span>+</span>
                      </button>

                      {/* 1-line concise description */}
                      <div className="party-card-short-role">{config.shortRole}</div>

                      {/* Diamond Divider */}
                      <div className="party-card-diamond-divider">◈</div>

                      {/* "+ Adicionar" button with dropdown */}
                      <div className="party-card-add-action-wrap">
                        <button
                          type="button"
                          className="party-btn-add-slot"
                          onClick={() => {
                            if (availableAlts.length > 0) {
                              setOpenDropdownVocation(openDropdownVocation === voc ? null : voc);
                            } else if (onCreateCharacter) {
                              setCreateCharVocation(voc);
                              setCreateCharName('');
                              setCreateCharError(null);
                              setCreateCharModalOpen(true);
                            } else {
                              setInviteModalOpen(true);
                            }
                          }}
                        >
                          + Adicionar
                        </button>

                        {openDropdownVocation === voc && (
                          <div className="party-alt-dropdown-menu">
                            <div className="party-dropdown-header">Escolha uma ação</div>
                            {availableAlts.map((alt) => (
                              <button
                                key={alt.id}
                                type="button"
                                className="party-alt-dropdown-item"
                                onClick={() => {
                                  onAddAltToParty?.(alt.id);
                                  setOpenDropdownVocation(null);
                                }}
                              >
                                <span className="party-alt-item-name">👤 {alt.name}</span>
                                <span className="party-alt-item-level">Nv. {alt.level}</span>
                              </button>
                            ))}
                            {onCreateCharacter && (
                              <button
                                type="button"
                                className="party-alt-dropdown-item create"
                                onClick={() => {
                                  setCreateCharVocation(voc);
                                  setCreateCharName('');
                                  setCreateCharError(null);
                                  setCreateCharModalOpen(true);
                                  setOpenDropdownVocation(null);
                                }}
                              >
                                <span>✨ Criar Novo {config.title}</span>
                              </button>
                            )}
                            <button
                              type="button"
                              className="party-alt-dropdown-item invite"
                              onClick={() => {
                                setInviteModalOpen(true);
                                setOpenDropdownVocation(null);
                              }}
                            >
                              <span>🌐 Convidar Jogador</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Minimalista (Reference Image) */}
        <div className="party-footer-compact">
          <div className="party-footer-left">
            <button
              type="button"
              className="party-footer-btn-secondary"
              onClick={() => setInviteModalOpen(true)}
              title="Convidar jogador online"
            >
              <span>👤+</span>
              <span>Convidar Jogador</span>
            </button>

            <button
              type="button"
              className={`party-footer-btn-secondary ${canAutoFill ? 'highlight' : ''}`}
              onClick={handleAutoFill}
              disabled={!canAutoFill}
              title={canAutoFill ? 'Preencher vagas livres com alts disponíveis da conta' : 'Nenhum alt disponível para preencher'}
            >
              <span>👥</span>
              <span>Autopreencher</span>
            </button>
          </div>

          <div className="party-footer-center">
            <button
              type="button"
              className="party-start-hunt-gold-btn"
              onClick={() => {
                if (onOpenHuntSelector) {
                  onClose();
                  onOpenHuntSelector();
                } else if (onProposeHuntToTeam) {
                  onProposeHuntToTeam();
                }
              }}
              title="Iniciar ou escolher caçada para a party"
            >
              <span className="sword-icon">⚔️</span>
              <span>{currentHuntName ? `Iniciar Caçada (${currentHuntName})` : 'Iniciar Caçada'}</span>
            </button>
          </div>

          <div className="party-footer-right">
            {isPartyLeader ? (
              <button
                type="button"
                className="party-footer-btn-disband"
                onClick={() => {
                  if (onDisbandParty) onDisbandParty();
                  onClose();
                }}
                title="Desfazer o grupo atual"
              >
                <span>↺</span>
                <span>Desfazer Grupo</span>
              </button>
            ) : (
              <button
                type="button"
                className="party-footer-btn-disband"
                onClick={() => {
                  if (onLeaveParty) onLeaveParty();
                  onClose();
                }}
                title="Sair do grupo atual"
              >
                <span>🚪</span>
                <span>Sair da Party</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sub-modal rápido de criação de personagem */}
      {createCharModalOpen && (
        <div
          className="modal-backdrop party-invite-submodal-backdrop"
          onMouseDown={(e) => e.target === e.currentTarget && setCreateCharModalOpen(false)}
        >
          <div className="party-invite-submodal-card party-create-submodal-card">
            <h3 className="party-invite-title">
              CRIAR NOVO HERÓI: {createCharVocation.toUpperCase()}
            </h3>
            <p className="party-invite-desc">
              Crie um novo herói na sua conta para ocupar a vaga de {VOCATION_SLOT_CONFIGS[createCharVocation].shortRole} no grupo.
            </p>

            <form onSubmit={handleCreateCharSubmit} className="party-invite-form">
              <div className="party-create-gender-row" style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                <button
                  type="button"
                  className={`party-gender-toggle ${createCharGender === 'Masculino' ? 'active' : ''}`}
                  onClick={() => setCreateCharGender('Masculino')}
                >
                  ♂ Masculino
                </button>
                <button
                  type="button"
                  className={`party-gender-toggle ${createCharGender === 'Feminino' ? 'active' : ''}`}
                  onClick={() => setCreateCharGender('Feminino')}
                >
                  ♀ Feminino
                </button>
              </div>

              <input
                type="text"
                placeholder="Nome do personagem..."
                value={createCharName}
                onChange={(e) => setCreateCharName(e.target.value)}
                maxLength={20}
                className="party-invite-input"
                autoFocus
              />

              {createCharError && (
                <div style={{ color: '#ef4444', fontSize: '11px', textAlign: 'center' }}>
                  {createCharError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button
                  type="button"
                  className="party-btn-secondary"
                  onClick={() => setCreateCharModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="party-start-hunt-gold-btn"
                  style={{ padding: '6px 16px', fontSize: '12px' }}
                >
                  Criar e Equipar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sub-modal de convite de jogador */}
      {inviteModalOpen && (
        <div
          className="modal-backdrop party-invite-submodal-backdrop"
          onMouseDown={(e) => e.target === e.currentTarget && setInviteModalOpen(false)}
        >
          <div className="party-invite-submodal-card">
            <h3 className="party-invite-title">CONVIDAR JOGADOR</h3>
            <p className="party-invite-desc">
              Digite o nome do personagem online no mundo para enviar um convite de grupo.
            </p>

            <form onSubmit={handleInviteSubmit} className="party-invite-form">
              <input
                type="text"
                placeholder="Nome do personagem..."
                value={inviteInputName}
                onChange={(e) => setInviteInputName(e.target.value)}
                maxLength={25}
                className="party-invite-input"
                autoFocus
              />

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button
                  type="button"
                  className="party-btn-secondary"
                  onClick={() => setInviteModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="party-start-hunt-gold-btn"
                  style={{ padding: '6px 16px', fontSize: '12px' }}
                >
                  Enviar Convite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
