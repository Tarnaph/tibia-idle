'use client';

import React, { useEffect, useState, useRef } from 'react';

export interface ExuraLoadingScreenProps {
  /**
   * Controls visibility of the loading screen.
   */
  active: boolean;
  /**
   * Total duration in milliseconds for the loading bar to fill 0% -> 100%. Default: 5000ms.
   */
  durationMs?: number;
  /**
   * Status or descriptive text displayed below the loading bar. Default: "Loading, please wait...".
   */
  message?: string;
  /**
   * Optional callback triggered when the 5s loading period finishes and the fade-out completes.
   */
  onFinish?: () => void;
}

export function ExuraLoadingScreen({
  active,
  durationMs = 10000,
  message = 'Carregando o mundo de Thais...',
  onFinish,
}: ExuraLoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isVisible, setIsVisible] = useState(active);

  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  useEffect(() => {
    if (!active) {
      if (isVisible && !isFadingOut) {
        setIsFadingOut(true);
        const timeout = setTimeout(() => {
          setIsVisible(false);
          setIsFadingOut(false);
          setProgress(0);
        }, 350);
        return () => clearTimeout(timeout);
      }
      return;
    }

    // Activated
    setIsVisible(true);
    setIsFadingOut(false);
    setProgress(0);

    const startTime = performance.now();
    let animationFrameId: number;
    let finishTimeoutId: NodeJS.Timeout;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const pct = Math.min(100, (elapsed / durationMs) * 100);
      setProgress(pct);

      if (pct < 100) {
        animationFrameId = requestAnimationFrame(tick);
      } else {
        // Bar reached 100% after durationMs (10s)
        setIsFadingOut(true);
        finishTimeoutId = setTimeout(() => {
          setIsVisible(false);
          setIsFadingOut(false);
          onFinishRef.current?.();
        }, 400);
      }
    };

    animationFrameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationFrameId);
      clearTimeout(finishTimeoutId);
    };
  }, [active, durationMs]);

  if (!isVisible && !active) return null;

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Carregando o jogo"
      className="exura-loading-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 999999999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingBottom: '3.5rem',
        backgroundImage: `radial-gradient(ellipse at center, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.65) 100%), url('/images/loading/loading-bg.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#070202',
        userSelect: 'none',
        pointerEvents: isFadingOut ? 'none' : 'auto',
        opacity: isFadingOut ? 0 : 1,
        transition: 'opacity 0.4s ease-in-out',
        boxSizing: 'border-box',
      }}
    >
      {/* Central Content Box anchored near bottom */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
          paddingLeft: '1rem',
          paddingRight: '1rem',
          boxSizing: 'border-box',
        }}
      >
        {/* Loading Bar Frame Container matching 1024x341 ratio */}
        <div
          className="exura-loading-frame-wrapper"
          style={{
            position: 'relative',
            width: '92vw',
            maxWidth: '680px',
            aspectRatio: '1024 / 341',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* 1. Inner Cavity Slot (Dark Obsidian Groove) */}
          <div
            className="exura-loading-cavity"
            style={{
              position: 'absolute',
              left: '7.8%',
              width: '84.4%',
              top: '40.2%',
              height: '14.8%',
              background: '#0a0303',
              boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.98), inset 0 0 10px rgba(0,0,0,0.95)',
              borderRadius: '3px',
              overflow: 'hidden',
              zIndex: 10,
            }}
          >
            {/* 2. Vibrant Magma Red/Orange Progress Fill */}
            <div
              className="exura-bar-glow exura-loading-progress-fill"
              style={{
                width: `${Math.min(100, Math.max(0, progress))}%`,
                height: '100%',
                position: 'relative',
                overflow: 'hidden',
                transition: 'width 0.08s linear',
                background:
                  'linear-gradient(180deg, #ffe066 0%, #ff5e00 25%, #ff2200 55%, #c80000 85%, #7a0000 100%)',
                boxShadow:
                  '0 0 16px rgba(255, 60, 0, 0.95), 0 0 32px rgba(255, 30, 0, 0.75), inset 0 1px 3px rgba(255, 255, 240, 0.9)',
              }}
            >
              {/* Top specular highlight edge line */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '2px',
                  background:
                    'linear-gradient(90deg, rgba(255,255,255,0.85) 0%, rgba(255,235,170,0.9) 50%, rgba(255,255,255,0.85) 100%)',
                  opacity: 0.85,
                }}
              />

              {/* Animated Magma / Fiery Shimmer */}
              <div
                className="exura-loading-shimmer"
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.65) 50%, transparent 100%)',
                  width: '50%',
                  pointerEvents: 'none',
                }}
              />

              {/* Glowing leading spark / ember head */}
              {progress > 1 && progress < 99.8 && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: '6px',
                    background: '#ffffff',
                    boxShadow: '0 0 10px #ffffff, 0 0 20px #ffaa00, 0 0 32px #ff2200',
                    borderRadius: '2px',
                    opacity: 1,
                  }}
                />
              )}
            </div>
          </div>

          {/* 3. Ornamental Golden Frame with Rubies (Sits on top of the cavity) */}
          <img
            src="/images/loading/loading-bar-frame.png"
            alt="Moldura ornamental Exura"
            className="exura-loading-frame-img"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              pointerEvents: 'none',
              zIndex: 20,
              filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.9))',
            }}
          />
        </div>

        {/* Text label below the frame with percentage */}
        <div style={{ marginTop: '0.85rem', textAlign: 'center', zIndex: 30 }}>
          <p
            className="exura-loading-text"
            style={{
              fontFamily: 'serif',
              color: '#e0c9a6',
              fontSize: '0.95rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,1))',
              margin: 0,
            }}
          >
            {message} ({Math.round(progress)}%)
          </p>
        </div>
      </div>
    </div>
  );
}

export default ExuraLoadingScreen;
