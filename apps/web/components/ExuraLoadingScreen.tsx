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
              top: '40.5%',
              height: '17.2%',
              background: 'linear-gradient(180deg, #140a08 0%, #070303 50%, #140a08 100%)',
              boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.99), inset 0 0 14px rgba(0,0,0,0.95), 0 0 2px rgba(255,120,0,0.25)',
              borderRadius: '3px',
              overflow: 'hidden',
              zIndex: 10,
            }}
          >
            {/* 2. Vibrant Magma Red/Orange Progress Fill - Fills in sync with percentage */}
            <div
              className="exura-bar-glow exura-loading-progress-fill"
              style={{
                width: `${Math.min(100, Math.max(0, progress))}%`,
                height: '100%',
                position: 'relative',
                overflow: 'hidden',
                background:
                  'linear-gradient(180deg, #fff799 0%, #ffe066 15%, #ff5e00 40%, #ff2200 70%, #990000 100%)',
                boxShadow:
                  '0 0 22px rgba(255, 90, 0, 1), 0 0 45px rgba(255, 40, 0, 0.85), inset 0 2px 4px rgba(255, 255, 240, 0.95)',
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
              {progress > 0.5 && progress < 99.8 && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: '8px',
                    background: '#ffffff',
                    boxShadow: '0 0 12px #ffffff, 0 0 24px #ffbb00, 0 0 36px #ff3300',
                    borderRadius: '2px',
                    opacity: 1,
                  }}
                />
              )}
            </div>

            {/* In-bar Numeric Percentage Display */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
                zIndex: 15,
              }}
            >
              <span
                style={{
                  fontFamily: 'sans-serif',
                  fontWeight: 900,
                  fontSize: '0.82rem',
                  color: '#ffffff',
                  textShadow: '0 1px 3px #000000, 0 0 8px #000000, 0 0 12px rgba(0, 0, 0, 0.95)',
                  letterSpacing: '0.08em',
                }}
              >
                {Math.round(progress)}%
              </span>
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
              filter: 'drop-shadow(0 4px 10px rgba(0, 0, 0, 0.65))',
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
