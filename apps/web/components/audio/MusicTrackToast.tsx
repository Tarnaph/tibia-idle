'use client';

import React, { useEffect, useState, useRef } from 'react';
import { onTrackNotification, type MusicTrackInfo } from '../../lib/audioManager';

export interface MusicTrackToastProps {
  isLoading?: boolean;
}

export function MusicTrackToast({ isLoading = false }: MusicTrackToastProps) {
  const [track, setTrack] = useState<MusicTrackInfo | null>(null);
  const [animStage, setAnimStage] = useState<'in' | 'visible' | 'out' | 'idle'>('idle');
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);
  const queuedTrackRef = useRef<MusicTrackInfo | null>(null);
  const prevLoadingRef = useRef<boolean>(isLoading);
  const currentTrackRef = useRef<MusicTrackInfo | null>(null);

  const startToastAnimation = (trackToShow: MusicTrackInfo) => {
    // Clear existing timers if any
    if (timerRef.current) clearTimeout(timerRef.current);
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);

    currentTrackRef.current = trackToShow;
    setTrack(trackToShow);
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
          currentTrackRef.current = null;
        }, 500);
      }, 4500);
    }, 550);
  };

  useEffect(() => {
    return onTrackNotification((newTrack) => {
      // Phase 105: If loading is active, suppress immediate display and queue for post-loading
      if (isLoading) {
        queuedTrackRef.current = newTrack;
        return;
      }

      // Avoid restarting if the same track is already showing
      if (
        currentTrackRef.current &&
        currentTrackRef.current.id === newTrack.id &&
        (animStage === 'in' || animStage === 'visible')
      ) {
        return;
      }

      startToastAnimation(newTrack);
    });
  }, [isLoading, animStage]);

  // Phase 105: Trigger queued track strictly after loading transitions from true to false
  useEffect(() => {
    if (prevLoadingRef.current && !isLoading) {
      if (queuedTrackRef.current) {
        const queued = queuedTrackRef.current;
        queuedTrackRef.current = null;
        // Brief graceful delay (350ms) so the world renders before toast slides in
        const delayTimer = setTimeout(() => {
          startToastAnimation(queued);
        }, 350);
        return () => clearTimeout(delayTimer);
      }
    }
    prevLoadingRef.current = isLoading;
  }, [isLoading]);

  const handleManualClose = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    setAnimStage('out');
    setTimeout(() => {
      setAnimStage('idle');
      setTrack(null);
      currentTrackRef.current = null;
    }, 500);
  };

  // Phase 105: Strictly do not render while loading is active or when idle
  if (isLoading || animStage === 'idle' || !track) {
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
