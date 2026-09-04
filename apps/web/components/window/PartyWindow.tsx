'use client';

import React, { useState } from 'react';
import type { CharacterState } from '@/packages/domain/src';

interface PartyWindowProps {
  squadMembers: CharacterState[];
  activeCharacterId: string;
  partyMemberIds: string[];
  isPartyCreated?: boolean;
  onCreateParty?: (selectedIds: string[]) => void;
  onDisbandParty?: () => void;
  onSelectActiveCharacter: (id: string) => void;
  onAddToParty: (id: string) => void;
  onRemoveFromParty: (id: string) => void;
  onDeleteSquadMember?: (id: string) => void;
  onAddSquadMember?: () => void;
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

export function PartyWindow({
  squadMembers,
  activeCharacterId,
  partyMemberIds,
  isPartyCreated = false,
  onCreateParty,
  onDisbandParty,
  onSelectActiveCharacter,
  onAddToParty,
  onRemoveFromParty,
  onDeleteSquadMember,
  onAddSquadMember,
  onInvitePlayer,
  onLeaveParty,
  partyOnlineMembers = [],
}: PartyWindowProps) {
  const [tab, setTab] = useState<'squad' | 'party'>('squad');
  const [inviteName, setInviteName] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Total members in active party
  const partySquadMembers = squadMembers.filter((m) => partyMemberIds.includes(m.id));
  const totalPartyCount = partySquadMembers.length + partyOnlineMembers.length;
  const realPlayersCount = partyOnlineMembers.filter((m) => m.isRealPlayer).length + 1;
  const expBonusPercent = Math.max(0, (realPlayersCount - 1) * 10);

  const handleStartCreateParty = () => {
    if (squadMembers.length <= 1) {
      // Se só tiver 1 personagem no squad, não tem pergunta e vai só ele
      const singleId = squadMembers[0]?.id || activeCharacterId;
      if (onCreateParty) onCreateParty([singleId]);
      return;
    }

    // Se tiver mais de 1 personagem, abre o modal de seleção
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
    if (id === activeCharacterId) return; // O líder principal sempre participa
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

  return (
    <div className="party-window-container gothic-window-panel">
      {/* Tab Navigation */}
      <div className="party-tab-bar">
        <button
          type="button"
          className={`party-tab-btn ${tab === 'squad' ? 'active' : ''}`}
          onClick={() => setTab('squad')}
        >
          SEU SQUAD ({squadMembers.length})
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
            <div className="squad-header-info" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="info-title">Personagens no seu Squad</span>
                <small className="info-desc">
                  Defina o personagem principal. Os outros integrantes seguirão seu personagem e atacarão o mesmo alvo.
                </small>
              </div>

              {!isPartyCreated && (
                <button
                  type="button"
                  className="gothic-action-btn"
                  onClick={handleStartCreateParty}
                  style={{ whiteSpace: 'nowrap', padding: '6px 12px', fontSize: '11px' }}
                >
                  ⚔️ Criar Party
                </button>
              )}
            </div>

            <div className="squad-members-list">
              {squadMembers.map((member) => {
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
                          title="Excluir personagem do Squad"
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
                onClick={onAddSquadMember}
                disabled={squadMembers.length >= 4}
              >
                + Criar Novo Personagem no Squad ({squadMembers.length}/4)
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
    </div>
  );
}
