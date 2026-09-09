'use client';

import React, { useEffect, useState, useRef } from 'react';
import { onTrackNotification, type MusicTrackInfo } from '../../lib/audioManager';

export function MusicTrackToast() {
  const [track, setTrack] = useState<MusicTrackInfo | null>(null);
  const [animStage, setAnimStage] = useState<'in' | 'visible' | 'out' | 'idle'>('idle');
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return onTrackNotification((newTrack) => {
      // Clear existing timers if any
      if (timerRef.current) clearTimeout(timerRef.current);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);

      setTrack(newTrack);
      setAnimStage('in');

      // After slide-in animation finishes (550ms)
      timerRef.current = setTimeout(() => {
        setAnimStage('visible');

        // Stay on screen for 4.5 seconds then start slide-out
        dismissTimerRef.current = setTimeout(() => {
          setAnimStage('out');

          // After slide-out animation finishes (500ms), unmount
          setTimeout(() => {
            setAnimStage('idle');
            setTrack(null);
          }, 500);
        }, 4500);
      }, 550);
    });
  }, []);

  const handleManualClose = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    setAnimStage('out');
    setTimeout(() => {
      setAnimStage('idle');
      setTrack(null);
    }, 500);
  };

  if (animStage === 'idle' || !track) {
    return null;
  }

  const animClass = animStage === 'in' ? 'music-toast-slide-in' : animStage === 'out' ? 'music-toast-slide-out' : '';

  return (
    <div
      className={`music-toast-container ${animClass}`}
      role="status"
      aria-live="polite"
      title={`Música atual: ${track.title} - ${track.subtitle || ''}`}
    >
      {/* Animated Equalizer Vinyl Icon */}
      <div
        style={{
          width: '38px',
          height: '38px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #2b2012 0%, #171008 100%)',
          border: '1.5px solid #d4a737',
          boxShadow: '0 0 10px rgba(212, 167, 55, 0.4), inset 0 0 6px rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '3px',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            width: '3px',
            backgroundColor: '#ffd875',
            borderRadius: '1px',
            animation: 'music-eq-bounce-1 0.8s infinite ease-in-out',
          }}
        />
        <span
          style={{
            width: '3px',
            backgroundColor: '#ffb938',
            borderRadius: '1px',
            animation: 'music-eq-bounce-2 0.7s infinite ease-in-out',
          }}
        />
        <span
          style={{
            width: '3px',
            backgroundColor: '#ffd875',
            borderRadius: '1px',
            animation: 'music-eq-bounce-3 0.9s infinite ease-in-out',
          }}
        />
      </div>

      {/* Track Metadata Info */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
        <div
          style={{
            fontSize: '9px',
            fontWeight: 800,
            color: '#e5c04b',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span>♫</span>
          <span>TOCANDO AGORA • {track.location || 'REINO DE THAIS'}</span>
        </div>

        <div
          style={{
            fontSize: '15px',
            fontWeight: 800,
            color: '#ffffff',
            textShadow: '0 1px 4px rgba(0,0,0,0.9), 0 0 10px rgba(255, 216, 117, 0.3)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {track.title}
        </div>

        {track.subtitle && (
          <div
            style={{
              fontSize: '11px',
              color: '#b5a995',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontStyle: 'italic',
            }}
          >
            {track.subtitle}
          </div>
        )}
      </div>

      {/* Dismiss Button */}
      <button
        type="button"
        onClick={handleManualClose}
        title="Fechar notificação"
        style={{
          background: 'transparent',
          border: 'none',
          color: '#8c7e6c',
          cursor: 'pointer',
          fontSize: '16px',
          lineHeight: 1,
          padding: '2px 4px',
          alignSelf: 'flex-start',
          transition: 'color 0.15s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#8c7e6c')}
      >
        ×
      </button>

      {/* Countdown Timer Line at the bottom */}
      <div className="music-toast-timer-line" />
    </div>
  );
}

export default MusicTrackToast;
