'use client';

import React, { useState } from 'react';
import type { CharacterState } from '@/packages/domain/src';

interface PartyWindowProps {
  squadMembers: CharacterState[];
  activeCharacterId: string;
  partyMemberIds: string[];
  partyOnlineMembers?: Array<{
    id: string;
    name: string;
    vocation: string;
    level: number;
    hp: number;
    maxHp: number;
    isRealPlayer: boolean;
  }>;
  onSelectActiveCharacter: (id: string) => void;
  onAddToParty: (id: string) => void;
  onRemoveFromParty: (id: string) => void;
  onDeleteSquadMember?: (id: string) => void;
  onAddSquadMember?: () => void;
  onInvitePlayer?: (name: string) => void;
  onLeaveParty?: () => void;
}

export function PartyWindow({
  squadMembers,
  activeCharacterId,
  partyMemberIds,
  partyOnlineMembers = [],
  onSelectActiveCharacter,
  onAddToParty,
  onRemoveFromParty,
  onDeleteSquadMember,
  onAddSquadMember,
  onInvitePlayer,
  onLeaveParty,
}: PartyWindowProps) {
  const [tab, setTab] = useState<'squad' | 'party'>('squad');
  const [inviteName, setInviteName] = useState('');

  // Total members in active party
  const partySquadMembers = squadMembers.filter((m) => partyMemberIds.includes(m.id));
  const totalPartyCount = partySquadMembers.length + partyOnlineMembers.length;
  const realPlayersCount = partyOnlineMembers.filter((m) => m.isRealPlayer).length + 1;
  const expBonusPercent = Math.max(0, (realPlayersCount - 1) * 10);

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
          PARTY ONLINE ({totalPartyCount}/4)
        </button>
      </div>

      <div className="party-content-body">
        {/* TAB 1: SEU SQUAD */}
        {tab === 'squad' && (
          <div className="squad-tab-panel">
            <div className="squad-header-info">
              <span className="info-title">Personagens no seu Squad</span>
              <small className="info-desc">
                Defina qual personagem você está controlando e quais integrantes entram na sua Party de caça.
              </small>
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

                      {isInParty ? (
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
                      )}

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
              <div className="party-section-label">Integrantes da Party Ativa ({totalPartyCount}/4)</div>

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

            {totalPartyCount > 1 && onLeaveParty && (
              <button type="button" className="gothic-action-btn danger-btn" onClick={onLeaveParty}>
                Sair de Toda a Party
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
