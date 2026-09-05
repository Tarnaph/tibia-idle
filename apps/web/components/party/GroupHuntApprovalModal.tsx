'use client';

import React from 'react';
import type { PartySnapshot, PartyHuntProposal } from '@/apps/web/lib/GameClientNetworkManager';

interface GroupHuntApprovalModalProps {
  proposal: PartyHuntProposal;
  party: PartySnapshot | null;
  localSessionId: string | null;
  onAccept: () => void;
  onReject: () => void;
}

export function GroupHuntApprovalModal({
  proposal,
  party,
  localSessionId,
  onAccept,
  onReject,
}: GroupHuntApprovalModalProps) {
  const members = party?.members || [];
  const acceptedSet = new Set(proposal.acceptedSessionIds);
  const totalCount = members.length > 0 ? members.length : proposal.totalMembers || 1;
  const acceptedCount = acceptedSet.size;
  const hasLocalAccepted = localSessionId ? acceptedSet.has(localSessionId) : false;

  const getRole = (vocationId?: number, index?: number): { role: 'TANK' | 'HEALER' | 'DPS'; bg: string; color: string; border: string } => {
    if (vocationId === 4 || index === 0) {
      return { role: 'TANK', bg: '#1e293b', color: '#60a5fa', border: '#2563eb' };
    }
    if (vocationId === 2) {
      return { role: 'HEALER', bg: '#064e3b', color: '#34d399', border: '#059669' };
    }
    return { role: 'DPS', bg: '#451a03', color: '#fb923c', border: '#b45309' };
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '28px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 999999,
        animation: 'slideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div
        style={{
          width: '420px',
          maxWidth: '94vw',
          backgroundColor: '#131622',
          border: '1px solid #283044',
          borderRadius: '6px',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.85), 0 0 1px rgba(255, 255, 255, 0.1)',
          padding: '16px 18px',
          display: 'flex',
          gap: '14px',
          fontFamily: 'Verdana, Arial, sans-serif',
          color: '#e2e8f0',
        }}
      >
        {/* Crossed Swords Badge Icon (Images 4 & 5) */}
        <div
          style={{
            flexShrink: 0,
            width: '56px',
            height: '56px',
            borderRadius: '4px',
            backgroundColor: '#1b2234',
            border: '1px solid #33415e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.1)',
          }}
        >
          <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
            {/* Crossed Daggers / Swords Shield */}
            <rect width="48" height="48" rx="4" fill="#171c2a" />
            <path
              d="M10 10L24 24M38 10L24 24M10 38L24 24M38 38L24 24"
              stroke="#64748b"
              strokeWidth="2"
              strokeLinecap="round"
            />
            {/* Sword 1 */}
            <path d="M12 12L36 36M12 12L16 10L14 14L12 12Z" stroke="#e2e8f0" strokeWidth="2.5" />
            <path d="M32 34L36 36L34 32" stroke="#eab308" strokeWidth="2.5" />
            {/* Sword 2 */}
            <path d="M36 12L12 36M36 12L32 10L34 14L36 12Z" stroke="#e2e8f0" strokeWidth="2.5" />
            <path d="M16 34L12 36L14 32" stroke="#eab308" strokeWidth="2.5" />
          </svg>
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#f59e0b',
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
              marginBottom: '3px',
            }}
          >
            CONVITE DE CAÇADA EM GRUPO
          </div>

          <div style={{ fontSize: '12px', color: '#cbd5e1', marginBottom: '8px', lineHeight: '1.4' }}>
            Juntando o time na chama mística para{' '}
            <strong style={{ color: '#f8fafc' }}>{proposal.huntName}</strong>.
          </div>

          {/* Accept Counter */}
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#94a3b8',
              letterSpacing: '0.6px',
              textTransform: 'uppercase',
              marginBottom: '10px',
            }}
          >
            {acceptedCount} DE {totalCount} ACEITARAM
          </div>

          {/* Members Table */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              marginBottom: '14px',
            }}
          >
            {members.length > 0
              ? members.map((member, index) => {
                  const isAccepted = acceptedSet.has(member.sessionId);
                  const isLeader = member.sessionId === (party?.leaderSessionId || proposal.leaderSessionId);
                  const roleInfo = getRole(member.vocationId, index);

                  return (
                    <div
                      key={member.sessionId || index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '4px 8px',
                        backgroundColor: '#161c29',
                        borderRadius: '3px',
                        fontSize: '11.5px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {/* Role Badge */}
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '1px 6px',
                            fontSize: '9.5px',
                            fontWeight: 700,
                            borderRadius: '2px',
                            backgroundColor: roleInfo.bg,
                            color: roleInfo.color,
                            border: `1px solid ${roleInfo.border}`,
                            letterSpacing: '0.5px',
                            minWidth: '46px',
                            textAlign: 'center',
                          }}
                        >
                          {roleInfo.role}
                        </span>

                        {/* Name */}
                        <span style={{ color: '#f1f5f9', fontWeight: 600 }}>{member.name}</span>

                        {/* Leader Tag */}
                        {isLeader && (
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              color: '#fbbf24',
                              letterSpacing: '0.5px',
                            }}
                          >
                            LÍDER
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ color: '#94a3b8', fontSize: '11px' }}>
                          Lv. {member.level ?? 188}
                        </span>

                        {/* Accepted Check or Waiting Dots */}
                        {isAccepted ? (
                          <span style={{ color: '#4ade80', fontWeight: 700, fontSize: '13px' }}>✓</span>
                        ) : (
                          <span style={{ color: '#64748b', letterSpacing: '1px' }}>···</span>
                        )}
                      </div>
                    </div>
                  );
                })
              : (
                  /* Fallback when full party array is still loading */
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '4px 8px',
                      backgroundColor: '#161c29',
                      borderRadius: '3px',
                      fontSize: '11.5px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          padding: '1px 6px',
                          fontSize: '9.5px',
                          fontWeight: 700,
                          borderRadius: '2px',
                          backgroundColor: '#1e293b',
                          color: '#60a5fa',
                          border: '1px solid #2563eb',
                        }}
                      >
                        TANK
                      </span>
                      <span style={{ color: '#f1f5f9', fontWeight: 600 }}>{proposal.leaderName}</span>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#fbbf24' }}>LÍDER</span>
                    </div>
                    <span style={{ color: '#4ade80', fontWeight: 700, fontSize: '13px' }}>✓</span>
                  </div>
                )}
          </div>

          {/* Footer Status & Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>
              {acceptedCount >= totalCount
                ? 'Todos aceitaram! Iniciando a caçada...'
                : 'Esperando os outros...'}
            </span>

            {!hasLocalAccepted && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={onAccept}
                  style={{
                    padding: '5px 14px',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#e2e8f0',
                    backgroundColor: '#1b2230',
                    border: '1px solid #3b4861',
                    borderRadius: '3px',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#243048';
                    e.currentTarget.style.borderColor = '#60a5fa';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#1b2230';
                    e.currentTarget.style.borderColor = '#3b4861';
                  }}
                >
                  ENTRAR
                </button>
                <button
                  type="button"
                  onClick={onReject}
                  style={{
                    padding: '5px 14px',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#94a3b8',
                    backgroundColor: '#161a24',
                    border: '1px solid #2e3748',
                    borderRadius: '3px',
                    cursor: 'pointer',
                  }}
                >
                  RECUSAR
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
