'use client';

import React from 'react';
import type { PartyInvitation } from '@/apps/web/lib/GameClientNetworkManager';

interface PartyInvitationModalProps {
  invitation: PartyInvitation;
  onAccept: () => void;
  onReject: () => void;
}

export function PartyInvitationModal({ invitation, onAccept, onReject }: PartyInvitationModalProps) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(3px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <div
        style={{
          width: '380px',
          maxWidth: '92vw',
          backgroundColor: '#16191f',
          backgroundImage: 'linear-gradient(180deg, rgba(35, 42, 54, 0.95) 0%, rgba(18, 22, 28, 0.98) 100%)',
          border: '2px solid #b38842',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.8), 0 0 20px rgba(179, 136, 66, 0.3)',
          borderRadius: '6px',
          overflow: 'hidden',
          color: '#e2e8f0',
          fontFamily: 'Verdana, Arial, sans-serif',
        }}
      >
        {/* Header */}
        <div
          style={{
            backgroundColor: 'rgba(10, 14, 20, 0.9)',
            borderBottom: '1px solid #b38842',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>👥</span>
            <span style={{ fontWeight: 700, fontSize: '13px', color: '#ffd700', letterSpacing: '0.5px' }}>
              CONVITE DE PARTY
            </span>
          </div>
          <button
            type="button"
            onClick={onReject}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#a0aec0',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 700,
              padding: '2px 6px',
            }}
            title="Fechar / Recusar"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '16px 18px', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>🛡️</div>

          <div style={{ fontSize: '14px', marginBottom: '10px', lineHeight: '1.4' }}>
            <strong style={{ color: '#68d391', fontSize: '15px' }}>{invitation.inviterName}</strong>
            {invitation.inviterLevel ? (
              <span style={{ fontSize: '12px', color: '#a0aec0' }}> (Lv. {invitation.inviterLevel})</span>
            ) : null}
            <div style={{ marginTop: '4px' }}>convidou você para se juntar à Party!</div>
          </div>

          <div
            style={{
              fontSize: '11px',
              color: '#94a3b8',
              backgroundColor: 'rgba(0, 0, 0, 0.35)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '4px',
              padding: '10px',
              marginBottom: '18px',
              lineHeight: '1.5',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '4px' }}>
              <span style={{ color: '#68d391' }}>✔</span>
              <span>Você começará a <strong>seguir o líder</strong> na cidade.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '4px' }}>
              <span style={{ color: '#68d391' }}>✔</span>
              <span>Se o líder puxar uma caçada, você <strong>viajará e caçará junto</strong>.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
              <span style={{ color: '#68d391' }}>✔</span>
              <span>Em combate, todos atacam coordenadamente o mesmo monstro.</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={onAccept}
              style={{
                flex: 1,
                padding: '9px 16px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#fff',
                backgroundColor: '#2e7d32',
                border: '1px solid #4caf50',
                borderRadius: '4px',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                transition: 'background-color 0.15s',
              }}
            >
              ✔ Aceitar Convite
            </button>
            <button
              type="button"
              onClick={onReject}
              style={{
                flex: 1,
                padding: '9px 16px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#e2e8f0',
                backgroundColor: '#334155',
                border: '1px solid #475569',
                borderRadius: '4px',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                transition: 'background-color 0.15s',
              }}
            >
              ✕ Recusar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
