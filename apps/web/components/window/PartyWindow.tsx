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
    if (slotIndex === 1) return userLevel >= 50; // Slot 2: Level 50+
    if (slotIndex === 2) return userLevel >= 90; // Slot 3: Level 90+
    if (slotIndex === 3) return userLevel >= 120; // Slot 4: Level 120+
    return false;
  };

  const getSlotRequiredLevel = (slotIndex: number): number => {
    if (slotIndex === 1) return 50;
    if (slotIndex === 2) return 90;
    if (slotIndex === 3) return 120;
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
                        backgroundColor: 'rgba(0,0,0,0.2)',
                      }}
                    >
                      <div className="member-avatar-box">
                        <div
                          className="avatar-placeholder"
                          style={{
                            backgroundColor: 'transparent',
                            border: '1px dashed #4a5042',
                            color: '#6a7062',
                            fontSize: '16px',
                          }}
                        >
                          👤
                        </div>
                      </div>

                      <div className="member-info-col">
                        <strong className="member-name" style={{ color: '#7a8276', fontStyle: 'italic' }}>
                          Slot Vazio
                        </strong>
                        <div className="member-vocation-sub" style={{ color: '#6a7266' }}>
                          Nenhum integrante no slot {slotIndex + 1}
                        </div>
                      </div>

                      <div className="member-actions-col">
                        <button
                          type="button"
                          className="squad-btn add-party-btn"
                          onClick={() => setShowGearModal(true)}
                          title="Adicionar personagem salvo da engrenagem para este slot"
                        >
                          + Adicionar
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
                      <div className="avatar-placeholder" />
                    </div>

                    <div className="member-info-col">
                      <div className="member-name-row">
                        <strong className="member-name">{member.name}</strong>
                        {isActiveMain && <span className="active-main-badge">⭐ PRINCIPAL</span>}
                      </div>

                      <div className="member-vocation-sub">
                        {member.vocation} · Nível {member.level}
                      </div>

                      <div className="member-hp-bar-wrap">
                        <div
                          className="hp-fill"
                          style={{ width: `${Math.round((100 * member.currentHp) / member.maxHp)}%` }}
                        />
                      </div>
                    </div>

                    <div className="member-actions-col">
                      {!isActiveMain && (
                        <button
                          type="button"
                          className="squad-btn set-main-btn"
                          onClick={() => onSelectActiveCharacter(member.id)}
                          title="Ativar este personagem como seu controlado no jogo"
                        >
                          Usar
                        </button>
                      )}

                      {isPartyCreated ? (
                        isInParty ? (
                          <button
                            type="button"
                            className="squad-btn remove-party-btn"
                            onClick={() => onRemoveFromParty(member.id)}
                            disabled={isActiveMain && partySquadMembers.length === 1}
                            title="Remover da Party (permanece no seu Squad)"
                          >
                            Sair da Party
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="squad-btn add-party-btn"
                            onClick={() => onAddToParty(member.id)}
                            disabled={totalPartyCount >= 4}
                            title="Adicionar à Party de Caça"
                          >
                            + Entrar na Party
                          </button>
                        )
                      ) : null}

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
              <button
                type="button"
                className="gothic-action-btn add-squad-btn"
                onClick={() => setShowGearModal(true)}
                style={{ marginTop: '10px' }}
              >
                ⚙️ Gerenciar Banco de Personagens Salvos ({squadMembers.length}/4 no Squad)
              </button>
            )}
          </div>
        )}

        {/* TAB 2: PARTY ONLINE */}
        {tab === 'party' && (
          <div className="party-tab-panel">
            {!isPartyCreated ? (
              <div className="party-uncreated-box" style={{ textAlign: 'center', padding: '24px 12px' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>👥</div>
                <h4 style={{ margin: '0 0 6px 0', color: '#f0d080', fontSize: '14px' }}>Nenhuma Party Criada</h4>
                <p style={{ fontSize: '11px', color: '#a0a8a0', margin: '0 0 16px 0' }}>
                  A party precisa ser criada para os integrantes realizarem caçadas em grupo e compartilharem XP.
                </p>
                <button
                  type="button"
                  className="gothic-action-btn"
                  onClick={handleStartCreateParty}
                  style={{ padding: '8px 20px', fontSize: '12px' }}
                >
                  ⚔️ Criar Party de Caça
                </button>
              </div>
            ) : (
              <>
                <div className="party-bonus-banner">
                  <div className="bonus-title">BÔNUS DE PARTY DE CAÇA</div>
                  <div className="bonus-desc">
                    {realPlayersCount > 1 ? (
                      <span className="text-green">
                        🔥 Bônus Ativo: +{expBonusPercent}% EXP extra por jogar com {realPlayersCount} jogadores reais!
                      </span>
                    ) : (
                      <span>
                        Somente os integrantes listados aqui entram com você nas caças. Chame outros jogadores reais para ganhar <strong>+10% de EXP</strong> por jogador!
                      </span>
                    )}
                  </div>
                </div>

                <form onSubmit={handleInviteSubmit} className="party-invite-form">
                  <input
                    type="text"
                    placeholder="Nome do jogador online..."
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    className="gothic-input"
                    disabled={totalPartyCount >= 4}
                  />
                  <button
                    type="submit"
                    className="gothic-action-btn"
                    disabled={totalPartyCount >= 4 || !inviteName.trim()}
                  >
                    Convidar
                  </button>
                </form>

                <div className="party-members-list">
                  <div className="party-section-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Integrantes da Party Ativa ({totalPartyCount}/4)</span>
                    <button
                      type="button"
                      className="party-leave-btn"
                      onClick={handleStartCreateParty}
                      style={{ fontSize: '10px', padding: '2px 6px' }}
                    >
                      Refazer Party
                    </button>
                  </div>

                  {partySquadMembers.map((m) => (
                    <div key={m.id} className="party-member-row self">
                      <span className="role-tag squad">SQUAD</span>
                      <div className="member-summary">
                        <strong className="name">{m.name}</strong>
                        <span className="vocation-lv">{m.vocation} · Lv {m.level}</span>
                      </div>
                      <button
                        type="button"
                        className="party-leave-btn"
                        onClick={() => onRemoveFromParty(m.id)}
                        title="Remover da Party"
                      >
                        Remover
                      </button>
                    </div>
                  ))}

                  {partyOnlineMembers.map((pm) => (
                    <div key={pm.id} className="party-member-row online-player">
                      <span className="role-tag real">PLAYER</span>
                      <div className="member-summary">
                        <strong className="name">{pm.name}</strong>
                        <span className="vocation-lv">{pm.vocation} · Lv {pm.level}</span>
                      </div>
                      <span className="hp-indicator">{pm.hp}/{pm.maxHp} HP</span>
                    </div>
                  ))}
                </div>

                {partyOnlineMembers.length > 0 && onLeaveParty && (
                  <button type="button" className="gothic-action-btn danger-btn" onClick={onLeaveParty} style={{ marginTop: '8px', width: '100%', backgroundColor: '#8b2626' }}>
                    🚪 Sair da Party Multiplayer
                  </button>
                )}

                {onDisbandParty && (
                  <button type="button" className="gothic-action-btn danger-btn" onClick={onDisbandParty} style={{ marginTop: '12px' }}>
                    Desfazer Party
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Modal de Pergunta: Quais personagens do Squad vão participar da Party? */}
      {showModal && (
        <div
          className="party-modal-backdrop"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99,
            padding: '16px',
          }}
        >
          <div
            className="party-modal-card gothic-window-panel"
            style={{
              width: '100%',
              maxWidth: '320px',
              backgroundColor: '#1b1d19',
              border: '2px solid #5a6052',
              borderRadius: '6px',
              padding: '16px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.9)',
            }}
          >
            <h3 style={{ margin: '0 0 8px 0', color: '#f0d080', fontSize: '13px', textAlign: 'center' }}>
              ⚔️ Criar Party de Caça
            </h3>
            <p style={{ fontSize: '11px', color: '#d0d8d0', margin: '0 0 12px 0', textAlign: 'center' }}>
              Quais personagens do seu Squad vão participar da Party?
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {squadMembers.map((m) => {
                const isSelected = selectedIds.includes(m.id);
                const isMain = m.id === activeCharacterId;

                return (
                  <label
                    key={m.id}
                    onClick={() => toggleSelectMember(m.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px',
                      backgroundColor: isSelected ? 'rgba(80, 140, 60, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                      border: `1px solid ${isSelected ? '#60b040' : '#3a4035'}`,
                      borderRadius: '4px',
                      cursor: isMain ? 'default' : 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={isMain}
                      onChange={() => toggleSelectMember(m.id)}
                      style={{ cursor: isMain ? 'default' : 'pointer' }}
                    />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '11px', color: '#ffffff', fontWeight: 'bold' }}>
                        {m.name} {isMain ? '(Líder ⭐)' : ''}
                      </span>
                      <span style={{ fontSize: '9px', color: '#909890' }}>
                        {m.vocation} · Lv {m.level}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="gothic-action-btn danger-btn"
                onClick={() => setShowModal(false)}
                style={{ fontSize: '10px', padding: '6px 10px' }}
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

      {/* Modal Engrenagem: Banco de Personagens Salvos por Vocação */}
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
              maxWidth: '360px',
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
                ⚙️ Banco de Personagens Salvos
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
              Você pode ter <strong>1 personagem de cada vocação</strong> salvo na conta e até <strong>4 integrantes ativos</strong> no seu squad simultaneamente.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {ALL_VOCATIONS.map((voc) => {
                const savedChar = allSaved.find((c) => c.vocation === voc || c.baseVocation === voc);
                const isInSquad = savedChar ? squadMembers.some((s) => s.id === savedChar.id) : false;
                const isMain = savedChar ? savedChar.id === activeCharacterId : false;

                return (
                  <div
                    key={voc}
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
                        <strong style={{ fontSize: '12px', color: '#ffffff' }}>{voc}</strong>
                        {savedChar && (
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
                            {isMain ? '⭐ PRINCIPAL' : isInSquad ? 'NO SQUAD' : 'NA RESERVA'}
                          </span>
                        )}
                      </div>
                      {savedChar ? (
                        <span style={{ fontSize: '10px', color: '#b0b8b0' }}>
                          {savedChar.name} · Nível {savedChar.level}
                        </span>
                      ) : (
                        <span style={{ fontSize: '10px', color: '#808880', fontStyle: 'italic' }}>
                          Nenhum personagem de {voc} salvo
                        </span>
                      )}
                    </div>

                    <div>
                      {savedChar ? (
                        isInSquad ? (
                          <button
                            type="button"
                            className="squad-btn delete-squad-btn"
                            disabled={isMain}
                            onClick={() => {
                              if (onDeleteSquadMember) onDeleteSquadMember(savedChar.id);
                            }}
                            title={isMain ? 'O personagem principal não pode ser removido' : 'Remover do squad para a reserva (efeito teleporte)'}
                            style={{ fontSize: '10px', padding: '4px 8px' }}
                          >
                            {isMain ? 'Líder' : 'Remover'}
                          </button>
                        ) : (() => {
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
                                title={`🔒 Atinga o Nível ${nextReqLevel} para adicionar este integrante ao squad`}
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
                        })()
                      ) : (
                        <button
                          type="button"
                          className="squad-btn set-main-btn"
                          onClick={() => {
                            setShowGearModal(false);
                            if (onAddSquadMember) onAddSquadMember();
                          }}
                          style={{ fontSize: '10px', padding: '4px 8px' }}
                        >
                          + Criar {voc}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

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
