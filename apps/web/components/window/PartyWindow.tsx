'use client';

import React, { useState } from 'react';
import type { CharacterState } from '@/packages/domain/src';

interface PartyWindowProps {
  squadMembers: CharacterState[];
  savedCharacters?: CharacterState[];
  activeCharacterId: string;
  userLevel?: number;
  userRole?: string;
  partyMemberIds: string[];
  isPartyCreated?: boolean;
  squadFollowCity?: boolean;
  onToggleSquadFollowCity?: () => void;
  onCreateParty?: (selectedIds: string[]) => void;
  onDisbandParty?: () => void;
  onSelectActiveCharacter: (id: string) => void;
  onAddToParty: (id: string) => void;
  onRemoveFromParty: (id: string) => void;
  onDeleteSquadMember?: (id: string) => void;
  onAddSquadMember?: () => void;
  onToggleSavedCharacter?: (id: string) => void;
  onInvitePlayer?: (name: string) => void;
  onLeaveParty?: () => void;
  onOpenUnifiedModal?: () => void;
  partyOnlineMembers?: Array<{
    id: string;
    name: string;
    vocation: string;
    level: number;
    hp: number;
    maxHp: number;
    isRealPlayer: boolean;
  }>;
}

const ALL_VOCATIONS = ['Knight', 'Paladin', 'Sorcerer', 'Druid', 'Monk'] as const;

export function PartyWindow({
  squadMembers,
  savedCharacters,
  activeCharacterId,
  userLevel = 1,
  userRole,
  partyMemberIds,
  isPartyCreated = false,
  squadFollowCity = true,
  onToggleSquadFollowCity,
  onCreateParty,
  onDisbandParty,
  onSelectActiveCharacter,
  onAddToParty,
  onRemoveFromParty,
  onDeleteSquadMember,
  onAddSquadMember,
  onToggleSavedCharacter,
  onInvitePlayer,
  onLeaveParty,
  onOpenUnifiedModal,
  partyOnlineMembers = [],
}: PartyWindowProps) {
  const [tab, setTab] = useState<'squad' | 'party'>('squad');
  const [inviteName, setInviteName] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showGearModal, setShowGearModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const isSlotUnlocked = (slotIndex: number): boolean => {
    const roleUpper = userRole?.toUpperCase() || '';
    if (roleUpper === 'ADMIN' || roleUpper === 'GM') return true;
    if (slotIndex === 0) return true; // Slot 1: Level 1+
    if (slotIndex === 1) return userLevel >= 70; // Slot 2: Level 70+
    if (slotIndex === 2) return userLevel >= 150; // Slot 3: Level 150+
    if (slotIndex === 3) return userLevel >= 200; // Slot 4: Level 200+
    return false;
  };

  const getSlotRequiredLevel = (slotIndex: number): number => {
    if (slotIndex === 1) return 70;
    if (slotIndex === 2) return 150;
    if (slotIndex === 3) return 200;
    return 1;
  };

  // Total members in active party
  const partySquadMembers = squadMembers.filter((m) => partyMemberIds.includes(m.id));
  const totalPartyCount = partySquadMembers.length + partyOnlineMembers.length;
  const realPlayersCount = partyOnlineMembers.filter((m) => m.isRealPlayer).length + 1;
  const expBonusPercent = Math.max(0, (realPlayersCount - 1) * 10);

  // All saved characters pool (fallback to squadMembers if savedCharacters not passed)
  const allSaved = savedCharacters && savedCharacters.length > 0 ? savedCharacters : squadMembers;

  const handleStartCreateParty = () => {
    if (squadMembers.length <= 1) {
      const singleId = squadMembers[0]?.id || activeCharacterId;
      if (onCreateParty) onCreateParty([singleId]);
      return;
    }

    const initialSelection = Array.from(new Set([activeCharacterId, ...squadMembers.map((m) => m.id)])).slice(0, 4);
    setSelectedIds(initialSelection);
    setShowModal(true);
  };

  const handleConfirmCreateModal = () => {
    if (onCreateParty) {
      onCreateParty(selectedIds);
    }
    setShowModal(false);
  };

  const toggleSelectMember = (id: string) => {
    if (id === activeCharacterId) return;
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteName.trim() && onInvitePlayer) {
      onInvitePlayer(inviteName.trim());
      setInviteName('');
    }
  };

  // Build fixed 4 squad slots
  const squadSlots: Array<CharacterState | null> = [
    squadMembers[0] ?? null,
    squadMembers[1] ?? null,
    squadMembers[2] ?? null,
    squadMembers[3] ?? null,
  ];

  return (
    <div className="party-window-container gothic-window-panel">
      {onOpenUnifiedModal && (
        <div style={{ padding: '6px 8px', background: 'linear-gradient(180deg, #1d212a 0%, #12141a 100%)', borderBottom: '1.5px solid #d4af37' }}>
          <button
            type="button"
            onClick={onOpenUnifiedModal}
            style={{
              width: '100%',
              background: 'linear-gradient(180deg, #b91c1c 0%, #7f1d1d 100%)',
              border: '1.5px solid #eab308',
              borderRadius: '4px',
              color: '#fef08a',
              fontFamily: 'Georgia, serif',
              fontSize: '11px',
              fontWeight: 'bold',
              padding: '6px 8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.6)',
            }}
          >
            <span>⚔️</span>
            <span>ABRIR GERENCIADOR DE PARTY COMPLETO</span>
          </button>
        </div>
      )}
      {/* Tab Navigation */}
      <div className="party-tab-bar">
        <button
          type="button"
          className={`party-tab-btn ${tab === 'squad' ? 'active' : ''}`}
          onClick={() => setTab('squad')}
        >
          SEU SQUAD ({squadMembers.length}/4)
        </button>
        <button
          type="button"
          className={`party-tab-btn ${tab === 'party' ? 'active' : ''}`}
          onClick={() => setTab('party')}
        >
          PARTY ONLINE ({isPartyCreated ? totalPartyCount : 0}/4)
        </button>
      </div>

      <div className="party-content-body">
        {/* TAB 1: SEU SQUAD */}
        {tab === 'squad' && (
          <div className="squad-tab-panel">
            <div className="squad-header-info">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="info-title">Personagens no seu Squad ({squadMembers.length}/4)</span>
                <button
                  type="button"
                  className="squad-gear-btn"
                  onClick={() => setShowGearModal(true)}
                  title="Abrir Banco de Personagens Salvos (Engrenagem ⚙️)"
                  style={{
                    backgroundColor: 'rgba(240, 208, 128, 0.15)',
                    border: '1px solid #f0d080',
                    color: '#f0d080',
                    borderRadius: '4px',
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  ⚙️ Salvos
                </button>
              </div>
              <small className="info-desc">
                Defina o personagem principal. Os outros integrantes seguirão seu personagem e atacarão o mesmo alvo.
              </small>

              {/* Toggle de Acompanhamento em Fila Indiana na Cidade */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '8px',
                  padding: '6px 10px',
                  backgroundColor: 'rgba(0, 0, 0, 0.35)',
                  borderRadius: '4px',
                  border: '1px solid rgba(240, 208, 128, 0.2)',
                }}
              >
                <span style={{ fontSize: '11px', color: '#e0e8e0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  🚶 <strong>Fila Indiana em Thais:</strong>
                </span>
                <button
                  type="button"
                  onClick={onToggleSquadFollowCity}
                  style={{
                    backgroundColor: squadFollowCity ? '#2e7d32' : '#424242',
                    border: '1px solid ' + (squadFollowCity ? '#4caf50' : '#616161'),
                    color: '#ffffff',
                    borderRadius: '4px',
                    padding: '3px 10px',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    boxShadow: squadFollowCity ? '0 0 6px rgba(76, 175, 80, 0.4)' : 'none',
                  }}
                  title={squadFollowCity ? 'Clique para desativar os heróis seguindo na cidade' : 'Clique para os heróis seguirem você em fila na cidade'}
                >
                  {squadFollowCity ? '✓ ATIVADO' : '✕ DESATIVADO'}
                </button>
              </div>
            </div>

            <div className="squad-members-list">
              {squadSlots.map((member, slotIndex) => {
                const unlocked = isSlotUnlocked(slotIndex);
                const reqLevel = getSlotRequiredLevel(slotIndex);

                if (!member) {
                  if (!unlocked) {
                    return (
                      <div
                        key={`locked-slot-${slotIndex}`}
                        className="squad-member-card empty-slot-card locked-slot-card"
                        style={{
                          opacity: 0.65,
                          borderStyle: 'solid',
                          borderColor: 'rgba(180, 40, 40, 0.4)',
                          backgroundColor: 'rgba(30, 10, 10, 0.4)',
                        }}
                      >
                        <div className="member-avatar-box">
                          <div
                            className="avatar-placeholder"
                            style={{
                              backgroundColor: 'transparent',
                              border: '1px solid rgba(180, 40, 40, 0.5)',
                              color: '#ff6666',
                              fontSize: '16px',
                            }}
                          >
                            🔒
                          </div>
                        </div>

                        <div className="member-info-col">
                          <strong className="member-name" style={{ color: '#ff9999' }}>
                            Slot {slotIndex + 1} Bloqueado
                          </strong>
                          <div className="member-vocation-sub" style={{ color: '#ff8888', fontSize: '10px' }}>
                            🔒 Requer Nível {reqLevel} para desbloquear
                          </div>
                        </div>

                        <div className="member-actions-col">
                          <button
                            type="button"
                            disabled
                            className="squad-btn delete-squad-btn"
                            style={{
                              opacity: 0.7,
                              cursor: 'not-allowed',
                              background: 'linear-gradient(180deg, #4a1e1e 0%, #2a0e0e 100%)',
                              borderColor: '#7a3535',
                              color: '#ffaaaa',
                              fontSize: '10px',
                              padding: '4px 8px',
                            }}
                            title={`Atinga o Nível ${reqLevel} para desbloquear o slot ${slotIndex + 1} do squad`}
                          >
                            🔒 Lv {reqLevel}
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={`empty-slot-${slotIndex}`}
                      className="squad-member-card empty-slot-card"
                      style={{
                        opacity: 0.75,
                        borderStyle: 'dashed',
                        borderColor: '#4a5042',
                      }}
                    >
                      <div className="member-avatar-box">
                        <div className="avatar-placeholder">+</div>
                      </div>
                      <div className="member-info-col">
                        <strong className="member-name">Vaga {slotIndex + 1} Livre</strong>
                        <div className="member-vocation-sub">Nenhum herói escalado</div>
                      </div>
                      <div className="member-actions-col">
                        <button
                          type="button"
                          className="squad-btn add-party-btn"
                          onClick={() => setShowGearModal(true)}
                          title="Abrir banco de personagens salvos para escalar herói neste slot"
                        >
                          + Escalar
                        </button>
                      </div>
                    </div>
                  );
                }

                const isActiveMain = member.id === activeCharacterId;
                const isInParty = partyMemberIds.includes(member.id);

                return (
                  <div key={member.id} className={`squad-member-card ${isActiveMain ? 'is-active-main' : ''}`}>
                    <div className="member-avatar-box">
                      <div className="avatar-preview">
                        <img
                          src={`/assets/avatars/avatar-${(member as any).avatarId || (member.vocation === 'Sorcerer' ? 1 : member.vocation === 'Druid' ? 2 : member.vocation === 'Paladin' ? 3 : 4)}.png`}
                          alt={member.name}
                          className="squad-avatar-img"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                    </div>

                    <div className="member-info-col">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <strong className="member-name">{member.name}</strong>
                        {isActiveMain && <span className="main-tag">LÍDER</span>}
                      </div>
                      <div className="member-vocation-sub">
                        Nível {member.level} · {member.vocation || member.baseVocation}
                      </div>
                    </div>

                    <div className="member-actions-col">
                      {!isActiveMain && (
                        <button
                          type="button"
                          className="squad-btn set-main-btn"
                          onClick={() => onSelectActiveCharacter(member.id)}
                          title="Tornar este personagem o líder controlado"
                        >
                          Líder
                        </button>
                      )}

                      {isInParty ? (
                        <button
                          type="button"
                          className="squad-btn remove-party-btn"
                          onClick={() => onRemoveFromParty(member.id)}
                          disabled={isActiveMain && partySquadMembers.length === 1}
                          title="Remover da Party (permanece no seu Squad)"
                        >
                          Party ✓
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="squad-btn add-party-btn"
                          onClick={() => onAddToParty(member.id)}
                          title="Adicionar este integrante à party ativa"
                        >
                          + Party
                        </button>
                      )}

                      {!isActiveMain && onDeleteSquadMember && (
                        <button
                          type="button"
                          className="squad-btn delete-squad-btn"
                          onClick={() => onDeleteSquadMember(member.id)}
                          title="Remover personagem do Squad (continua salvo na engrenagem)"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {onAddSquadMember && (
              <div style={{ padding: '8px 12px 12px' }}>
                <button
                  type="button"
                  className="gothic-action-btn add-squad-btn"
                  onClick={() => setShowGearModal(true)}
                  style={{ width: '100%', fontSize: '11px', padding: '8px' }}
                >
                  ⚙️ Gerenciar Banco de Personagens ({squadMembers.length}/4 no Squad)
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PARTY ONLINE */}
        {tab === 'party' && (
          <div className="party-tab-panel">
            <div className="party-status-banner">
              <div className="party-status-header">
                <span className="party-count-tag">
                  Integrantes na Party: <strong>{isPartyCreated ? totalPartyCount : 0}/4</strong>
                </span>
                {expBonusPercent > 0 && (
                  <span className="exp-bonus-badge">
                    +{expBonusPercent}% Bônus EXP
                  </span>
                )}
              </div>
              <p className="party-status-desc">
                {isPartyCreated
                  ? 'A experiência das caçadas é dividida igualmente com bônus adicional por jogador real conectado.'
                  : 'Nenhuma party ativa no momento. Crie uma party para caçar em grupo.'}
              </p>
            </div>

            {/* Invite Form */}
            <form onSubmit={handleInviteSubmit} className="party-invite-form">
              <input
                type="text"
                placeholder="Nome do jogador para convidar..."
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                className="gothic-input invite-input"
              />
              <button
                type="submit"
                disabled={!inviteName.trim()}
                className="gothic-action-btn invite-btn"
              >
                Convidar
              </button>
            </form>

            <div className="party-members-list">
              <h4 className="list-section-title">Integrantes Atuais da Party</h4>
              {partySquadMembers.length === 0 && partyOnlineMembers.length === 0 ? (
                <div className="empty-party-notice">
                  Nenhum integrante na party ativa.
                </div>
              ) : (
                <>
                  {partySquadMembers.map((m) => (
                    <div key={`party-squad-${m.id}`} className="party-member-row squad-row">
                      <div className="member-summary">
                        <span className="party-avatar-icon">🛡️</span>
                        <div>
                          <strong className="party-member-name">{m.name}</strong>
                          <span className="party-member-sub">
                            Lv {m.level} · {m.vocation || m.baseVocation} (Seu Squad)
                          </span>
                        </div>
                      </div>
                      <div className="member-badges">
                        {m.id === activeCharacterId && <span className="leader-star">⭐ Você</span>}
                        <button
                          type="button"
                          className="party-leave-mini-btn"
                          onClick={() => onRemoveFromParty(m.id)}
                          disabled={m.id === activeCharacterId && partySquadMembers.length === 1}
                          title="Remover da party"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  ))}

                  {partyOnlineMembers.map((p) => (
                    <div key={`party-online-${p.id}`} className="party-member-row online-row">
                      <div className="member-summary">
                        <span className="party-avatar-icon">⚔️</span>
                        <div>
                          <strong className="party-member-name">{p.name}</strong>
                          <span className="party-member-sub">
                            Lv {p.level} · {p.vocation} (Online)
                          </span>
                        </div>
                      </div>
                      <div className="member-badges">
                        <span className="online-tag">Online</span>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Party Actions Footer */}
            <div className="party-footer-actions">
              {!isPartyCreated ? (
                <button
                  type="button"
                  className="gothic-action-btn create-party-main-btn"
                  onClick={handleStartCreateParty}
                  style={{ width: '100%', padding: '8px' }}
                >
                  ⚡ Criar Nova Party
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                  <button
                    type="button"
                    className="gothic-action-btn leave-party-btn"
                    onClick={() => {
                      if (onLeaveParty) onLeaveParty();
                      else if (onDisbandParty) onDisbandParty();
                    }}
                    style={{ flex: 1, padding: '8px' }}
                  >
                    Sair / Desfazer Party
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal: Seleção de Integrantes ao Criar Party */}
      {showModal && (
        <div className="party-modal-backdrop">
          <div className="party-modal-card gothic-window-panel">
            <h3 style={{ margin: '0 0 8px 0', color: '#f0d080', fontSize: '13px' }}>
              Selecionar Integrantes da Party
            </h3>
            <p style={{ fontSize: '11px', color: '#a0a8a0', margin: '0 0 12px 0' }}>
              Escolha até 4 heróis do seu Squad para iniciar a caçada compartilhada:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
              {squadMembers.map((m) => {
                const isSelected = selectedIds.includes(m.id);
                const isLeader = m.id === activeCharacterId;

                return (
                  <div
                    key={`select-modal-${m.id}`}
                    onClick={() => toggleSelectMember(m.id)}
                    style={{
                      padding: '8px 10px',
                      backgroundColor: isSelected ? 'rgba(240, 208, 128, 0.15)' : 'rgba(0, 0, 0, 0.4)',
                      border: `1px solid ${isSelected ? '#f0d080' : '#4a5042'}`,
                      borderRadius: '4px',
                      cursor: isLeader ? 'default' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '12px', color: isSelected ? '#ffffff' : '#b0b8b0' }}>
                        {m.name} {isLeader && '(Líder)'}
                      </strong>
                      <div style={{ fontSize: '10px', color: '#888' }}>
                        Nível {m.level} · {m.vocation || m.baseVocation}
                      </div>
                    </div>
                    <span style={{ fontSize: '14px', color: isSelected ? '#70f060' : '#666' }}>
                      {isSelected ? '☑' : '☐'}
                    </span>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                className="gothic-action-btn"
                onClick={() => setShowModal(false)}
                style={{ fontSize: '10px', padding: '6px 12px', background: '#3a3a3a' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="gothic-action-btn"
                onClick={handleConfirmCreateModal}
                disabled={selectedIds.length === 0}
                style={{ fontSize: '10px', padding: '6px 12px' }}
              >
                Confirmar ({selectedIds.length}/4)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Engrenagem: Banco de Personagens Salvos com Regra de Vocação Única */}
      {showGearModal && (
        <div
          className="party-modal-backdrop"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
            padding: '16px',
          }}
        >
          <div
            className="party-modal-card gothic-window-panel"
            style={{
              width: '100%',
              maxWidth: '380px',
              backgroundColor: '#1b1d19',
              border: '2px solid #f0d080',
              borderRadius: '6px',
              padding: '16px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.9)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ margin: 0, color: '#f0d080', fontSize: '13px' }}>
                ⚙️ Banco de Personagens da Conta ({allSaved.length}/6)
              </h3>
              <button
                type="button"
                onClick={() => setShowGearModal(false)}
                style={{ background: 'none', border: 'none', color: '#a0a8a0', cursor: 'pointer', fontSize: '14px' }}
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: '11px', color: '#d0d8d0', margin: '0 0 12px 0' }}>
              Você pode ter até <strong>6 personagens salvos</strong> na sua conta. O Squad ativo permite até <strong>4 heróis com 1 vocação de cada</strong>.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
              {allSaved.map((savedChar) => {
                const isInSquad = squadMembers.some((s) => s.id === savedChar.id);
                const isMain = savedChar.id === activeCharacterId;
                const charVoc = savedChar.vocation || savedChar.baseVocation || 'Knight';
                const isVocAlreadyInSquad = !isInSquad && squadMembers.some((s) => (s.vocation || s.baseVocation) === charVoc);

                return (
                  <div
                    key={savedChar.id}
                    style={{
                      padding: '8px 10px',
                      backgroundColor: isInSquad ? 'rgba(80, 140, 60, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      border: `1px solid ${isInSquad ? '#60b040' : '#3a4035'}`,
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <strong style={{ fontSize: '12px', color: '#ffffff' }}>{savedChar.name}</strong>
                        <span
                          style={{
                            fontSize: '9px',
                            padding: '1px 5px',
                            borderRadius: '3px',
                            backgroundColor: isInSquad ? '#2d6020' : '#4a4830',
                            color: isInSquad ? '#70f060' : '#d0d090',
                            fontWeight: 'bold',
                          }}
                        >
                          {isMain ? '⭐ LÍDER' : isInSquad ? 'NO SQUAD' : 'NA RESERVA'}
                        </span>
                      </div>
                      <span style={{ fontSize: '10px', color: '#b0b8b0' }}>
                        Nível {savedChar.level} · {charVoc}
                      </span>
                    </div>

                    <div>
                      {isInSquad ? (
                        <button
                          type="button"
                          className="squad-btn delete-squad-btn"
                          disabled={isMain}
                          onClick={() => {
                            if (onDeleteSquadMember) onDeleteSquadMember(savedChar.id);
                          }}
                          title={isMain ? 'O líder não pode ser removido do squad' : 'Remover do squad ativo (vai para a reserva)'}
                          style={{ fontSize: '10px', padding: '4px 8px' }}
                        >
                          {isMain ? 'Líder' : 'Remover'}
                        </button>
                      ) : (() => {
                        if (isVocAlreadyInSquad) {
                          return (
                            <button
                              type="button"
                              disabled
                              className="squad-btn delete-squad-btn"
                              style={{ fontSize: '10px', padding: '4px 8px', opacity: 0.6, cursor: 'not-allowed', backgroundColor: '#3a2a1e', borderColor: '#7a5a2e', color: '#ffd5aa' }}
                              title={`O Squad já possui um integrante com a vocação ${charVoc}. O Squad só pode ter 1 integrante de cada vocação.`}
                            >
                              Vocação em Uso
                            </button>
                          );
                        }

                        const nextSlotIndex = squadMembers.length;
                        const nextSlotUnlocked = isSlotUnlocked(nextSlotIndex);
                        const nextReqLevel = getSlotRequiredLevel(nextSlotIndex);

                        if (!nextSlotUnlocked) {
                          return (
                            <button
                              type="button"
                              disabled
                              className="squad-btn delete-squad-btn"
                              style={{ fontSize: '10px', padding: '4px 8px', opacity: 0.6, cursor: 'not-allowed', backgroundColor: '#3a1e1e', borderColor: '#6a2e2e', color: '#ffaaaa' }}
                              title={`🔒 Atinga o Nível ${nextReqLevel} para desbloquear o slot ${nextSlotIndex + 1} do squad`}
                            >
                              🔒 Lv {nextReqLevel}
                            </button>
                          );
                        }

                        return (
                          <button
                            type="button"
                            className="squad-btn add-party-btn"
                            disabled={squadMembers.length >= 4}
                            onClick={() => {
                              if (onToggleSavedCharacter) onToggleSavedCharacter(savedChar.id);
                            }}
                            title={squadMembers.length >= 4 ? 'Squad cheio (máx 4)' : 'Colocar no squad ativo'}
                            style={{ fontSize: '10px', padding: '4px 8px' }}
                          >
                            + Entrar no Squad
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Botão de Criação de Novos Personagens In-Game (até 6 na conta) */}
            {allSaved.length < 6 && (
              <div style={{ marginBottom: '14px' }}>
                <button
                  type="button"
                  className="squad-btn set-main-btn"
                  onClick={() => {
                    setShowGearModal(false);
                    if (onAddSquadMember) onAddSquadMember();
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '11px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    background: 'linear-gradient(180deg, #2b4520 0%, #172a12 100%)',
                    border: '1px solid #4a8035',
                    color: '#c8f0b8',
                  }}
                >
                  ➕ Criar Novo Personagem ({allSaved.length}/6 na Conta)
                </button>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="gothic-action-btn"
                onClick={() => setShowGearModal(false)}
                style={{ fontSize: '11px', padding: '6px 14px' }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
