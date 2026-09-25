'use client';

import React, { useState, useEffect } from 'react';
import { onTrackNotification, type MusicTrackInfo } from '@/apps/web/lib/audioManager';

interface MobileMusicBadgeProps {
  isLoading?: boolean;
}

export function MobileMusicBadge({ isLoading = false }: MobileMusicBadgeProps) {
  const [track, setTrack] = useState<MusicTrackInfo | null>(null);
  const [visible, setVisible] = useState<boolean>(false);

  useEffect(() => {
    return onTrackNotification((newTrack) => {
      if (isLoading) return;
      setTrack(newTrack);
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
      }, 5500);
      return () => clearTimeout(timer);
    });
  }, [isLoading]);

  if (!visible || !track) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: '64px',
        right: '12px',
        zIndex: 45,
        backgroundColor: '#090d16',
        border: '1px solid #ca8a04',
        borderRadius: '6px',
        padding: '5px 8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.6), 0 0 6px rgba(202, 138, 4, 0.2)',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        maxWidth: '220px',
        animation: 'fadeIn 0.25s ease',
      }}
    >
      <span style={{ fontSize: '13px', color: '#fcd34d' }}>♪</span>
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            color: '#fef08a',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {track.title}
        </span>
        {(track.subtitle || track.location) && (
          <span
            style={{
              fontSize: '9.5px',
              fontStyle: 'italic',
              color: '#94a3b8',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {track.subtitle || track.location}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={() => setVisible(false)}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#64748b',
          fontSize: '11px',
          cursor: 'pointer',
          padding: '2px 4px',
          marginLeft: '2px',
        }}
        title="Ocultar"
      >
        ✕
      </button>
    </div>
  );
}
