'use client';

import React, { useState } from 'react';
import type { CharacterState } from '@/packages/domain/src';

interface PartyWindowProps {
  squadMembers: CharacterState[];
  partyOnlineMembers?: Array<{
    id: string;
    name: string;
    vocation: string;
    level: number;
    hp: number;
    maxHp: number;
    isRealPlayer: boolean;
  }>;
  onAddSquadMember?: () => void;
  onInvitePlayer?: (name: string) => void;
  onLeaveParty?: () => void;
}

export function PartyWindow({
  squadMembers,
  partyOnlineMembers = [],
  onAddSquadMember,
  onInvitePlayer,
  onLeaveParty,
}: PartyWindowProps) {
  const [tab, setTab] = useState<'squad' | 'party'>('squad');
  const [inviteName, setInviteName] = useState('');

  // Total party count (max 4)
  const totalPartyCount = squadMembers.length + partyOnlineMembers.length;
  const realPlayersCount = partyOnlineMembers.filter((m) => m.isRealPlayer).length + 1; // including user
  const expBonusPercent = (realPlayersCount - 1) * 10;

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteName.trim() && onInvitePlayer) {
      onInvitePlayer(inviteName.trim());
      setInviteName('');
    }
  };

  return (
    <div className="party-window-container gothic-window-panel">
      {/* Sub tabs */}
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
        {tab === 'squad' && (
          <div className="squad-tab-panel">
            <div className="squad-header-info">
              <span className="info-title">Personagens no seu Squad Local</span>
              <small>Estes personagens caçam e treinam com você offline e online.</small>
            </div>

            <div className="squad-members-list">
              {squadMembers.map((member) => (
                <div key={member.id} className="squad-member-card">
                  <div className="member-avatar">
                    <span className="avatar-placeholder" />
                  </div>
                  <div className="member-details">
                    <strong className="member-name">{member.name}</strong>
                    <span className="member-vocation-level">
                      {member.vocation} · Lv {member.level}
                    </span>
                    <div className="member-hp-bar">
                      <div
                        className="hp-fill"
                        style={{ width: `${Math.round((100 * member.currentHp) / member.maxHp)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {onAddSquadMember && (
              <button
                type="button"
                className="gothic-action-btn add-squad-btn"
                onClick={onAddSquadMember}
              >
                + Adicionar Novo Personagem ao Squad
              </button>
            )}
          </div>
        )}

        {tab === 'party' && (
          <div className="party-tab-panel">
            <div className="party-bonus-banner">
              <div className="bonus-title">BÔNUS DE PARTY MMORPG</div>
              <div className="bonus-desc">
                {realPlayersCount > 1 ? (
                  <span className="text-green">
                    🔥 Bônus Ativo: +{expBonusPercent}% EXP extra por jogar com {realPlayersCount} jogadores reais!
                  </span>
                ) : (
                  <span>
                    Chame outros jogadores online para a Party! Cada jogador real extra garante <strong>+10% de EXP</strong> para o grupo (Máx 4 integrantes).
                  </span>
                )}
              </div>
            </div>

            <form onSubmit={handleInviteSubmit} className="party-invite-form">
              <input
                type="text"
                placeholder="Nome do jogador..."
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
              <div className="party-section-label">Integrantes da Party ({totalPartyCount}/4)</div>

              {squadMembers.map((m) => (
                <div key={m.id} className="party-member-row self">
                  <span className="role-tag">SQUAD</span>
                  <strong className="name">{m.name}</strong>
                  <span className="vocation-lv">{m.vocation} (Lv {m.level})</span>
                </div>
              ))}

              {partyOnlineMembers.map((pm) => (
                <div key={pm.id} className="party-member-row online-player">
                  <span className="role-tag real">PLAYER</span>
                  <strong className="name">{pm.name}</strong>
                  <span className="vocation-lv">{pm.vocation} (Lv {pm.level})</span>
                  <span className="hp-indicator">{pm.hp}/{pm.maxHp} HP</span>
                </div>
              ))}
            </div>

            {totalPartyCount > 1 && onLeaveParty && (
              <button type="button" className="gothic-action-btn danger-btn" onClick={onLeaveParty}>
                Sair da Party
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
