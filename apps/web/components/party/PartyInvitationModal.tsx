'use client';

import React from 'react';
import type { PartyInvitation } from '@/apps/web/lib/GameClientNetworkManager';

interface PartyInvitationModalProps {
  invitation: PartyInvitation;
  onAccept: () => void;
  onReject: () => void;
}

export function PartyInvitationModal({ invitation, onAccept, onReject }: PartyInvitationModalProps) {
  const vocName =
    invitation.inviterVocationId === 1
      ? 'Sorcerer'
      : invitation.inviterVocationId === 2
      ? 'Druid'
      : invitation.inviterVocationId === 3
      ? 'Paladin'
      : 'Knight';

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
          width: '380px',
          maxWidth: '92vw',
          backgroundColor: '#131622',
          border: '1px solid #283044',
          borderRadius: '6px',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.8), 0 0 1px rgba(255, 255, 255, 0.1)',
          padding: '14px 16px',
          display: 'flex',
          gap: '14px',
          fontFamily: 'Verdana, Arial, sans-serif',
          color: '#e2e8f0',
        }}
      >
        {/* Blue Crest Shield Icon (Image 2) */}
        <div
          style={{
            flexShrink: 0,
            width: '54px',
            height: '54px',
            borderRadius: '4px',
            backgroundColor: '#1b2234',
            border: '1px solid #33415e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.1)',
          }}
        >
          <svg width="38" height="38" viewBox="0 0 48 48" fill="none">
            {/* Crest Shield with Blue & Gold accents */}
            <path
              d="M24 4L8 10V22C8 32 15 40 24 44C33 40 40 32 40 22V10L24 4Z"
              fill="url(#crest_grad)"
              stroke="#eab308"
              strokeWidth="2"
            />
            <path
              d="M24 8L12 13V22C12 29.5 17 36 24 39.5C31 36 36 29.5 36 22V13L24 8Z"
              fill="#1e3a8a"
              stroke="#38bdf8"
              strokeWidth="1.5"
            />
            {/* Inner Knight Icon */}
            <circle cx="24" cy="20" r="5" fill="#fde047" />
            <path d="M18 31C18 26 21 24 24 24C27 24 30 26 30 31H18Z" fill="#f8fafc" />
            <defs>
              <linearGradient id="crest_grad" x1="24" y1="4" x2="24" y2="44" gradientUnits="userSpaceOnUse">
                <stop stopColor="#2563eb" />
                <stop offset="1" stopColor="#0f172a" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Content & Details */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#f59e0b',
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
              marginBottom: '4px',
            }}
          >
            CONVITE DE PARTY
          </div>

          <div style={{ fontSize: '13px', color: '#f8fafc', fontWeight: 500, marginBottom: '6px' }}>
            {invitation.inviterName} convidou você para a party
          </div>

          <div style={{ fontSize: '11.5px', color: '#94a3b8', marginBottom: '12px' }}>
            <span style={{ color: '#cbd5e1', fontWeight: 600 }}>{invitation.inviterName}</span>
            <span style={{ marginLeft: '14px' }}>
              Lv. {invitation.inviterLevel ?? 188} · {vocName}
            </span>
          </div>

          {/* Buttons: ENTRAR / RECUSAR */}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: 'auto' }}>
            <button
              type="button"
              onClick={onAccept}
              style={{
                padding: '6px 18px',
                fontSize: '11px',
                fontWeight: 700,
                color: '#e2e8f0',
                backgroundColor: '#1b2230',
                border: '1px solid #3b4861',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15), 0 2px 4px rgba(0,0,0,0.5)',
                borderRadius: '3px',
                cursor: 'pointer',
                letterSpacing: '0.5px',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#243048';
                e.currentTarget.style.borderColor = '#60a5fa';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#1b2230';
                e.currentTarget.style.borderColor = '#3b4861';
                e.currentTarget.style.color = '#e2e8f0';
              }}
            >
              ENTRAR
            </button>

            <button
              type="button"
              onClick={onReject}
              style={{
                padding: '6px 18px',
                fontSize: '11px',
                fontWeight: 700,
                color: '#cbd5e1',
                backgroundColor: '#161a24',
                border: '1px solid #2e3748',
                boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
                borderRadius: '3px',
                cursor: 'pointer',
                letterSpacing: '0.5px',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#1f2533';
                e.currentTarget.style.borderColor = '#475569';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#161a24';
                e.currentTarget.style.borderColor = '#2e3748';
              }}
            >
              RECUSAR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
