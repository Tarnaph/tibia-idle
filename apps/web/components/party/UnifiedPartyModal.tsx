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
    title: 'KNIGHT',
    roleTitle: 'Vanguarda & Proteção (Tank)',
    tacticalTip: 'Atrai os monstros com Exeta Res, segura o dano físico e protege o grupo na linha de frente.',
    icon: '🛡️',
    themeColor: '#ef4444',
    bannerBg: 'linear-gradient(180deg, #7f1d1d 0%, #450a0a 100%)',
    borderAccent: '#dc2626',
    bgGlow: 'rgba(220, 38, 38, 0.25)',
  },
  Paladin: {
    vocation: 'Paladin',
    title: 'PALADIN',
    roleTitle: 'Dano Físico & Sagrado (Ranged DPS)',
    tacticalTip: 'Ataques à distância consistentes com lanças/bestas, apoiando com magias sagradas e cura secundária.',
    icon: '🏹',
    themeColor: '#f59e0b',
    bannerBg: 'linear-gradient(180deg, #78350f 0%, #451a03 100%)',
    borderAccent: '#f59e0b',
    bgGlow: 'rgba(245, 158, 11, 0.25)',
  },
  Sorcerer: {
    vocation: 'Sorcerer',
    title: 'SORCERER',
    roleTitle: 'Dano Mágico Ofensivo (Area DPS)',
    tacticalTip: 'Causa explosões de dano massivo em área com feitiços elementais (fogo/energia) e runas de ataque.',
    icon: '🔮',
    themeColor: '#a855f7',
    bannerBg: 'linear-gradient(180deg, #581c87 0%, #3b0764 100%)',
    borderAccent: '#9333ea',
    bgGlow: 'rgba(147, 51, 234, 0.25)',
  },
  Druid: {
    vocation: 'Druid',
    title: 'DRUID',
    roleTitle: 'Curador Primário & Suporte Vital (Healer)',
    tacticalTip: 'Foco contínuo em manter o Knight vivo (Exura Sio) e conjurar Mass Healing e magias de gelo/terra.',
    icon: '🌿',
    themeColor: '#10b981',
    bannerBg: 'linear-gradient(180deg, #064e3b 0%, #022c22 100%)',
    borderAccent: '#10b981',
    bgGlow: 'rgba(16, 185, 129, 0.25)',
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
          {vocation === 'Knight' ? '🛡️' : vocation === 'Paladin' ? '🏹' : vocation === 'Sorcerer' ? '🔮' : '🌿'}
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
  const [activeTab, setActiveTab] = useState<'FORMAÇÃO' | 'TÁTICAS'>('FORMAÇÃO');
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

  // Lista de alts da conta do jogador (excluindo o personagem principal ativo se já configurado)
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
    const vocations: VocationSlotType[] = ['Knight', 'Paladin', 'Sorcerer', 'Druid'];
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
          isReady: true, // Alts da conta do líder são confirmados automaticamente
        };
      }
    }

    return result;
  }, [activeCharacter, remoteMembers, allAccountChars, partyMemberIds]);

  // Contagem de membros ocupados
  const totalOccupied = useMemo(() => {
    return Object.values(slotOccupants).filter((s) => s.source !== 'empty').length;
  }, [slotOccupants]);

  // Todos prontos para caçada?
  const allMembersReady = useMemo(() => {
    const occupied = Object.values(slotOccupants).filter((s) => s.source !== 'empty');
    if (occupied.length === 0) return false;
    return occupied.every((s) => s.isReady);
  }, [slotOccupants]);

  // Bônus de 4 vocações
  const hasFullPartySynergy = totalOccupied === 4;

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
        {/* Top Header com Placa Octogonal, Brasões e Botão Fechar */}
        <div className="hunt-modal-top-bar">
          {/* Abas Medievais à Esquerda */}
          <div className="hunt-top-tabs-medieval">
            <button
              type="button"
              className={`hunt-tab-pill ${activeTab === 'FORMAÇÃO' ? 'active' : ''}`}
              onClick={() => setActiveTab('FORMAÇÃO')}
            >
              FORMAÇÃO DO TIME
            </button>
            <button
              type="button"
              className={`hunt-tab-pill ${activeTab === 'TÁTICAS' ? 'active' : ''}`}
              onClick={() => setActiveTab('TÁTICAS')}
            >
              TÁTICAS & SINERGIA
            </button>
          </div>

          {/* Placa Octogonal Central com Rubis */}
          <div className="hunt-header-plaque-wrapper">
            <div className="hunt-header-plaque-gem-top" />
            <div className="hunt-header-plaque">
              <span className="hunt-header-plaque-title">GERENCIADOR DE PARTY</span>
            </div>
            <div className="hunt-header-plaque-gem-bottom" />
          </div>

          {/* Cluster Direito: Bônus de Vocações e Fechar */}
          <div className="hunt-top-right-cluster">
            <div
              className="hunt-level-range-badge party-synergy-badge"
              title={
                hasFullPartySynergy
                  ? 'Bônus de 4 Vocações ativo: +20% de Experiência Compartilhada!'
                  : `Membros no grupo: ${totalOccupied}/4 vagas`
              }
            >
              <span className="hunt-level-range-icon">{hasFullPartySynergy ? '⭐' : '👥'}</span>
              <span className="hunt-level-range-text">
                {hasFullPartySynergy ? 'Bônus 4 Vocações (+20% XP)' : `${totalOccupied}/4 Vagas`}
              </span>
            </div>

            <button
              type="button"
              className="hunt-modal-close-btn"
              onClick={onClose}
              title="Fechar gerenciador de grupo (ESC)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Corpo do Modal: 4 Cards de Vocações ou Aba de Táticas */}
        {activeTab === 'FORMAÇÃO' ? (
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
                    className={`party-vocation-card ${isOccupied ? 'occupied' : 'empty'} ${slot.source === 'leader' ? 'leader-card' : ''}`}
                    style={{
                      borderColor: isOccupied ? config.borderAccent : '#3d4a5d',
                      boxShadow: isOccupied ? `0 8px 24px rgba(0,0,0,0.8), inset 0 0 16px ${config.bgGlow}` : 'none',
                    }}
                  >
                    {/* Top Diamond Ruby Jewel para o líder */}
                    {slot.source === 'leader' && <div className="hunt-card-gem hunt-card-gem-top" />}

                    {/* Vocation Header Ribbon */}
                    <div
                      className="party-card-vocation-banner"
                      style={{ background: config.bannerBg }}
                    >
                      <span className="party-vocation-banner-icon">{config.icon}</span>
                      <span className="party-vocation-banner-title">{config.title}</span>
                    </div>

                    {/* Art Box com Outfit / Silhueta */}
                    <div className="party-card-art-box">
                      <div className="party-card-art-vignette" />

                      {/* Medalhão de Nível no Canto Superior Esquerdo */}
                      <div
                        className="hunt-level-medallion party-card-medallion"
                        title={displayLevel ? `Nível ${displayLevel}` : 'Vaga Vazia'}
                      >
                        <span className="hunt-level-medallion-num">
                          {displayLevel ?? '+'}
                        </span>
                      </div>

                      {/* Badge de Origem no Canto Superior Direito */}
                      <div className="party-card-origin-pill">
                        {slot.source === 'leader' && (
                          <span className="party-badge leader" title="Você (Líder do Grupo)">
                            ⭐ Líder
                          </span>
                        )}
                        {slot.source === 'account' && (
                          <span className="party-badge account" title="Personagem Alt da sua conta">
                            👤 Sua Conta
                          </span>
                        )}
                        {slot.source === 'remote' && (
                          <span className="party-badge remote" title="Jogador Real Conectado">
                            🌐 Jogador
                          </span>
                        )}
                        {slot.source === 'empty' && (
                          <span className="party-badge empty">
                            ⚪ Disponível
                          </span>
                        )}
                      </div>

                      {/* Centro: Sprite do Personagem ou Silhueta Mística */}
                      <div className="party-card-portrait-stage">
                        {isOccupied ? (
                          <CharacterOutfitCanvas
                            outfit={char?.outfit || remote?.outfit}
                            gender={char?.gender as any}
                            vocation={voc}
                          />
                        ) : (
                          <div className="party-card-empty-silhouette">
                            <span className="party-empty-silhouette-icon">{config.icon}</span>
                            <span className="party-empty-silhouette-text">VAGA ABERTA</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Corpo do Card: Nome, Papel Tático, Barras de Status e Prontidão */}
                    <div className="party-card-body">
                      {isOccupied ? (
                        <>
                          <h4 className="party-card-char-name" title={displayName || ''}>
                            {displayName}
                          </h4>

                          <span className="party-card-role-title" style={{ color: config.themeColor }}>
                            {config.roleTitle}
                          </span>

                          {/* Mini Barra de HP */}
                          <div className="party-card-hp-wrapper">
                            <div className="party-card-hp-bar">
                              <div
                                className="party-card-hp-fill"
                                style={{ width: `${hpPercent}%` }}
                              />
                            </div>
                            <span className="party-card-hp-text">
                              {currentHp} / {maxHp} HP ({hpPercent}%)
                            </span>
                          </div>

                          {/* Status de Prontidão da Caçada */}
                          <div className="party-card-readiness-row">
                            {slot.isReady ? (
                              <div className="party-readiness-pill ready" title="Confirmado para caçadas em grupo">
                                <span className="readiness-dot green" />
                                <span className="readiness-text">PRONTO PARA CAÇAR</span>
                              </div>
                            ) : (
                              <div className="party-readiness-pill pending" title="Aguardando confirmação da proposta">
                                <span className="readiness-dot yellow" />
                                <span className="readiness-text">AGUARDANDO ACEITE...</span>
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="party-card-empty-desc">
                          <h4 className="party-card-empty-title">{config.title}</h4>
                          <span className="party-card-empty-role">{config.roleTitle}</span>
                          <p className="party-card-tactical-tip">{config.tacticalTip}</p>
                        </div>
                      )}
                    </div>

                    {/* Rodapé / Ações do Card */}
                    <div className="party-card-footer-actions">
                      {slot.source === 'leader' && (
                        <div className="party-action-note leader">
                          <span>Você está liderando</span>
                        </div>
                      )}

                      {slot.source === 'account' && (
                        <div className="party-card-action-group">
                          {onSelectActiveCharacter && (
                            <button
                              type="button"
                              className="party-btn-secondary"
                              onClick={() => onSelectActiveCharacter(char!.id)}
                              title="Jogar com este personagem diretamente"
                            >
                              Trocar Ativo
                            </button>
                          )}
                          {onRemoveAltFromParty && (
                            <button
                              type="button"
                              className="party-btn-danger"
                              onClick={() => onRemoveAltFromParty(char!.id)}
                              title="Desocupar esta vaga"
                            >
                              Remover
                            </button>
                          )}
                        </div>
                      )}

                      {slot.source === 'remote' && (
                        <div className="party-card-action-group">
                          {isPartyLeader && onKickRemotePlayer && (
                            <button
                              type="button"
                              className="party-btn-danger"
                              onClick={() => onKickRemotePlayer(remote!.id)}
                              title="Remover jogador do grupo"
                            >
                              Expulsar
                            </button>
                          )}
                        </div>
                      )}

                      {slot.source === 'empty' && (
                        <div className="party-card-empty-actions">
                          {availableAlts.length > 0 && onAddAltToParty && (
                            <div className="party-alt-selector-wrapper">
                              <button
                                type="button"
                                className="party-btn-alt-fill"
                                onClick={() =>
                                  setOpenDropdownVocation(openDropdownVocation === voc ? null : voc)
                                }
                              >
                                Preencher com Alt ({availableAlts.length}) ▾
                              </button>

                              {openDropdownVocation === voc && (
                                <div className="party-alt-dropdown-menu">
                                  {availableAlts.map((alt) => (
                                    <button
                                      key={alt.id}
                                      type="button"
                                      className="party-alt-dropdown-item"
                                      onClick={() => {
                                        onAddAltToParty(alt.id);
                                        setOpenDropdownVocation(null);
                                      }}
                                    >
                                      <span className="party-alt-item-name">{alt.name}</span>
                                      <span className="party-alt-item-level">Nv. {alt.level}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {onCreateCharacter && (
                            <button
                              type="button"
                              className="party-btn-create-char"
                              onClick={() => {
                                setCreateCharVocation(voc);
                                setCreateCharName('');
                                setCreateCharError(null);
                                setCreateCharModalOpen(true);
                              }}
                              title={`Criar novo herói ${config.title} na sua conta`}
                            >
                              + Criar {config.title}
                            </button>
                          )}

                          <button
                            type="button"
                            className="party-btn-invite-slot"
                            onClick={() => setInviteModalOpen(true)}
                          >
                            + Convidar Jogador
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Aba TÁTICAS & SINERGIA */
          <div className="party-tactics-body">
            <div className="party-tactics-header-card">
              <h3 className="party-tactics-title">SINERGIA DE 4 VOCAÇÕES DO TIBIA</h3>
              <p className="party-tactics-desc">
                Grupos completos com as 4 vocações canônicas recebem <strong>+20% de Experiência Bônus</strong> em todas as caçadas autoritativas, além de habilitar as táticas de combate cooperativas automatizadas.
              </p>
            </div>

            <div className="party-tactics-grid">
              {(['Knight', 'Paladin', 'Sorcerer', 'Druid'] as VocationSlotType[]).map((voc) => {
                const conf = VOCATION_SLOT_CONFIGS[voc];
                return (
                  <div key={voc} className="party-tactic-card">
                    <div className="party-tactic-card-header" style={{ color: conf.themeColor }}>
                      <span className="party-tactic-icon">{conf.icon}</span>
                      <h4 className="party-tactic-name">{conf.title} — {conf.roleTitle}</h4>
                    </div>
                    <p className="party-tactic-text">{conf.tacticalTip}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Barra de Ações Inferior (Modal Footer) */}
        <div className="hunt-modal-footer">
          <div className="hunt-footer-controls">
            {/* Ação Secundária: Criar Personagem */}
            {onCreateCharacter && (
              <button
                type="button"
                className="hunt-btn-medieval-team"
                onClick={() => {
                  const emptyVoc = (['Knight', 'Paladin', 'Sorcerer', 'Druid'] as VocationSlotType[]).find(
                    (v) => slotOccupants[v].source === 'empty'
                  ) || 'Druid';
                  setCreateCharVocation(emptyVoc);
                  setCreateCharName('');
                  setCreateCharError(null);
                  setCreateCharModalOpen(true);
                }}
                title="Criar novo herói na sua conta para o grupo"
              >
                + Criar Personagem
              </button>
            )}

            {/* Ação Secundária: Convidar Jogador */}
            <button
              type="button"
              className="hunt-btn-medieval-team"
              onClick={() => setInviteModalOpen(true)}
              title="Convidar jogador online para a party"
            >
              + Convidar Jogador
            </button>

            {/* Botão Primário Ruby Central: Propor ou Escolher Caçada */}
            <button
              type="button"
              className="hunt-btn-ruby-primary"
              onClick={() => {
                if (onOpenHuntSelector) {
                  onClose();
                  onOpenHuntSelector();
                } else if (onProposeHuntToTeam) {
                  onProposeHuntToTeam();
                }
              }}
              title="Abrir o Seletor de Caçadas para o grupo"
            >
              <span className="hunt-btn-ruby-gem left" />
              <span className="hunt-btn-ruby-text">
                {currentHuntName ? `CAÇADA ATIVA: ${currentHuntName.toUpperCase()}` : 'ESCOLHER CAÇADA EM GRUPO'}
              </span>
              <span className="hunt-btn-ruby-gem right" />
            </button>

            {/* Ação Secundária Direita: Sair da Party ou Desfazer */}
            {isPartyLeader ? (
              <button
                type="button"
                className="hunt-btn-medieval-party"
                onClick={() => {
                  if (onDisbandParty) onDisbandParty();
                  onClose();
                }}
                title="Desfazer o grupo atual"
              >
                Desfazer Grupo
              </button>
            ) : (
              <button
                type="button"
                className="hunt-btn-medieval-party"
                onClick={() => {
                  if (onLeaveParty) onLeaveParty();
                  onClose();
                }}
                title="Sair do grupo atual"
              >
                Sair da Party
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
              CRIAR NOVO PERSONAGEM: {createCharVocation.toUpperCase()}
            </h3>
            <p className="party-invite-desc">
              Crie um novo herói na sua conta para ocupar a vaga de {VOCATION_SLOT_CONFIGS[createCharVocation].roleTitle} na Party.
            </p>

            <form onSubmit={handleCreateCharSubmit} className="party-invite-form">
              {/* Seleção rápida de Vocação */}
              <div className="party-create-vocation-selector">
                <span className="party-create-label">Vocação do Herói:</span>
                <div className="party-create-vocation-pills">
                  {(['Knight', 'Paladin', 'Sorcerer', 'Druid'] as VocationSlotType[]).map((v) => {
                    const conf = VOCATION_SLOT_CONFIGS[v];
                    return (
                      <button
                        key={v}
                        type="button"
                        className={`party-vocation-pill-btn ${createCharVocation === v ? 'active' : ''}`}
                        onClick={() => {
                          setCreateCharVocation(v);
                          setCreateCharError(null);
                        }}
                        style={{
                          borderColor: createCharVocation === v ? conf.themeColor : '#3d4a5d',
                        }}
                      >
                        <span>{conf.icon}</span>
                        <span>{conf.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Nome do Personagem */}
              <div className="party-create-field">
                <span className="party-create-label">Nome do Personagem:</span>
                <input
                  type="text"
                  value={createCharName}
                  maxLength={18}
                  onChange={(e) => {
                    setCreateCharName(e.target.value);
                    if (createCharError) setCreateCharError(null);
                  }}
                  placeholder={`Ex: ${createCharVocation === 'Knight' ? 'Sir Lancelot' : createCharVocation === 'Paladin' ? 'Legolas' : createCharVocation === 'Sorcerer' ? 'Merlin' : 'Malfurion'}`}
                  className="party-invite-input"
                  autoFocus
                />
              </div>

              {/* Gênero */}
              <div className="party-create-field">
                <span className="party-create-label">Gênero:</span>
                <div className="party-create-gender-row">
                  <button
                    type="button"
                    className={`party-gender-btn ${createCharGender === 'Masculino' ? 'active' : ''}`}
                    onClick={() => setCreateCharGender('Masculino')}
                  >
                    Masculino
                  </button>
                  <button
                    type="button"
                    className={`party-gender-btn ${createCharGender === 'Feminino' ? 'active' : ''}`}
                    onClick={() => setCreateCharGender('Feminino')}
                  >
                    Feminino
                  </button>
                </div>
              </div>

              {/* Informativo sobre travas de nível */}
              <div className="party-create-req-hint">
                <span>⚠️ Requisitos de Nível (Seu Nv. {activeCharacter.level}): Slot 2 (Nv. 70+) · Slot 3 (Nv. 150+) · Slot 4 (Nv. 200+)</span>
              </div>

              {/* Banner de Erro caso a validação falhe */}
              {createCharError && (
                <div className="party-create-error-banner">
                  <span>{createCharError}</span>
                </div>
              )}

              <div className="party-invite-actions">
                <button
                  type="button"
                  className="party-btn-secondary"
                  onClick={() => setCreateCharModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="party-btn-primary">
                  Criar Personagem
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sub-modal rápido de convite de jogador */}
      {inviteModalOpen && (
        <div
          className="modal-backdrop party-invite-submodal-backdrop"
          onMouseDown={(e) => e.target === e.currentTarget && setInviteModalOpen(false)}
        >
          <div className="party-invite-submodal-card">
            <h3 className="party-invite-title">CONVIDAR JOGADOR</h3>
            <p className="party-invite-desc">
              Digite o nome do personagem do jogador online para convidá-lo para sua Party.
            </p>

            <form onSubmit={handleInviteSubmit} className="party-invite-form">
              <input
                type="text"
                value={inviteInputName}
                onChange={(e) => setInviteInputName(e.target.value)}
                placeholder="Nome do personagem..."
                className="party-invite-input"
                autoFocus
              />

              <div className="party-invite-actions">
                <button
                  type="button"
                  className="party-btn-secondary"
                  onClick={() => setInviteModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="party-btn-primary">
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
