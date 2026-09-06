'use client';

import React from 'react';

interface DeathModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

export function DeathModal({ open, onConfirm, onCancel }: DeathModalProps) {
  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        fontFamily: 'Verdana, Arial, sans-serif',
      }}
    >
      {/* Authentic Classic Tibia Modal Box */}
      <div
        style={{
          width: '450px',
          maxWidth: '92vw',
          backgroundColor: '#535353',
          borderTop: '2px solid #858585',
          borderLeft: '2px solid #858585',
          borderRight: '2px solid #242424',
          borderBottom: '2px solid #242424',
          boxShadow: '0 8px 32px rgba(0,0,0,0.85)',
          padding: '2px',
          userSelect: 'none',
        }}
      >
        {/* Title Bar */}
        <div
          style={{
            backgroundColor: '#434343',
            borderTop: '1px solid #707070',
            borderLeft: '1px solid #707070',
            borderRight: '1px solid #1a1a1a',
            borderBottom: '1px solid #1a1a1a',
            textAlign: 'center',
            padding: '3px 0 4px 0',
            fontSize: '11px',
            fontWeight: '700',
            color: '#dfdfdf',
            textShadow: '1px 1px 0 #000',
            letterSpacing: '0.5px',
          }}
        >
          You are dead
        </div>

        {/* Content Box with Inset Frame */}
        <div
          style={{
            margin: '3px',
            backgroundColor: '#5c5c5c',
            borderTop: '2px solid #262626',
            borderLeft: '2px solid #262626',
            borderRight: '2px solid #808080',
            borderBottom: '2px solid #808080',
            padding: '16px 18px 14px 18px',
          }}
        >
          {/* Main Canonical Text */}
          <div
            style={{
              fontSize: '11px',
              lineHeight: '1.45',
              color: '#dedede',
              textShadow: '1px 1px 0 #181818',
              fontWeight: '700',
              fontFamily: 'Verdana, Tahoma, sans-serif',
            }}
          >
            <p style={{ margin: '0 0 12px 0' }}>
              Alas! Brave adventurer, you have met a sad fate.
              <br />
              But do not despair, for the gods will bring you back
              <br />
              into the world in exchange for a small sacrifice.
            </p>

            <p style={{ margin: '0 0 14px 0' }}>
              Simply click on &apos;Ok&apos; to resume your journeys in Tibia!
            </p>
          </div>

          {/* Canonical Tibia Etched Horizontal Divider */}
          <div
            style={{
              height: '0px',
              borderTop: '1px solid #2a2a2a',
              borderBottom: '1px solid #7a7a7a',
              margin: '14px 0 12px 0',
            }}
          />

          {/* Action Buttons */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '8px',
            }}
          >
            <button
              type="button"
              onClick={onConfirm}
              style={{
                minWidth: '58px',
                height: '22px',
                backgroundColor: '#525252',
                borderTop: '2px solid #8a8a8a',
                borderLeft: '2px solid #8a8a8a',
                borderRight: '2px solid #202020',
                borderBottom: '2px solid #202020',
                color: '#e6e6e6',
                fontSize: '11px',
                fontWeight: '700',
                textShadow: '1px 1px 0 #000',
                cursor: 'pointer',
                fontFamily: 'Verdana, Arial, sans-serif',
                padding: '0 10px',
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.borderTop = '2px solid #202020';
                e.currentTarget.style.borderLeft = '2px solid #202020';
                e.currentTarget.style.borderRight = '2px solid #8a8a8a';
                e.currentTarget.style.borderBottom = '2px solid #8a8a8a';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.borderTop = '2px solid #8a8a8a';
                e.currentTarget.style.borderLeft = '2px solid #8a8a8a';
                e.currentTarget.style.borderRight = '2px solid #202020';
                e.currentTarget.style.borderBottom = '2px solid #202020';
              }}
            >
              Ok
            </button>

            <button
              type="button"
              onClick={onCancel ?? onConfirm}
              style={{
                minWidth: '58px',
                height: '22px',
                backgroundColor: '#525252',
                borderTop: '2px solid #8a8a8a',
                borderLeft: '2px solid #8a8a8a',
                borderRight: '2px solid #202020',
                borderBottom: '2px solid #202020',
                color: '#c0c0c0',
                fontSize: '11px',
                fontWeight: '700',
                textShadow: '1px 1px 0 #000',
                cursor: 'pointer',
                fontFamily: 'Verdana, Arial, sans-serif',
                padding: '0 10px',
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.borderTop = '2px solid #202020';
                e.currentTarget.style.borderLeft = '2px solid #202020';
                e.currentTarget.style.borderRight = '2px solid #8a8a8a';
                e.currentTarget.style.borderBottom = '2px solid #8a8a8a';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.borderTop = '2px solid #8a8a8a';
                e.currentTarget.style.borderLeft = '2px solid #8a8a8a';
                e.currentTarget.style.borderRight = '2px solid #202020';
                e.currentTarget.style.borderBottom = '2px solid #202020';
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
