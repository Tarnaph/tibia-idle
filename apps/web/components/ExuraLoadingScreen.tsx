'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  THAIS_LORE_CURIOSITIES,
  DRAGON_LAIR_LORE_CURIOSITIES,
  DEFAULT_HUNT_LOADING_CONFIG,
  HUNT_LOADING_CONFIGS,
  getLoadingConfigForHunt,
  type HuntLoadingConfig,
} from '@/apps/web/lib/loadingConfig';
import { onAutoplayBlockedChange, unlockAudio } from '@/apps/web/lib/audioManager';
import { assetPreloader } from '@/apps/web/lib/assetPreloader';

export {
  THAIS_LORE_CURIOSITIES,
  DRAGON_LAIR_LORE_CURIOSITIES,
  DEFAULT_HUNT_LOADING_CONFIG,
  HUNT_LOADING_CONFIGS,
  getLoadingConfigForHunt,
  type HuntLoadingConfig,
};

export interface ExuraLoadingScreenProps {
  /**
   * Controls visibility of the loading screen.
   */
  active: boolean;
  /**
   * Total duration in milliseconds for the loading bar to fill 0% -> 100%. Default: 10000ms.
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
  /**
   * Background image path for the loading screen. Default: "/images/loading/thais-loading.jpg".
   */
  bgImage?: string;
  /**
   * List of lore curiosities to rotate every 3 seconds in random order.
   */
  curiosities?: string[];
  /**
   * Interval in milliseconds between curiosity rotations. Default: 5000ms (5 seconds).
   */
  curiosityIntervalMs?: number;
  /**
   * Optional toggle to wait for universal asset preloading before releasing. Default: false.
   */
  waitForAssets?: boolean;
}

export function ExuraLoadingScreen({
  active,
  durationMs = 2000,
  message = 'Carregando o mundo de Thais...',
  onFinish,
  bgImage = '/images/loading/thais-loading.jpg',
  curiosities = THAIS_LORE_CURIOSITIES,
  curiosityIntervalMs = 5000,
  waitForAssets = false,
}: ExuraLoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isVisible, setIsVisible] = useState(active);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [preloaderMessage, setPreloaderMessage] = useState('');
  const [curiosityIndex, setCuriosityIndex] = useState(() =>
    curiosities && curiosities.length > 0 ? Math.floor(Math.random() * curiosities.length) : 0
  );
  const [curiosityFade, setCuriosityFade] = useState<'in' | 'out'>('in');
  const [artworkLoaded, setArtworkLoaded] = useState(false);

  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  // Pre-load loading artwork with highest browser priority
  useEffect(() => {
    if (typeof window === 'undefined' || !active) return;
    const targetUrl = bgImage || '/images/loading/thais-loading.jpg';
    const img = new Image();
    img.src = targetUrl;
    img.onload = () => setArtworkLoaded(true);
    img.onerror = () => {
      const fallback = new Image();
      fallback.src = '/images/loading/loading-bg.jpg';
      fallback.onload = () => setArtworkLoaded(true);
    };
  }, [active, bgImage]);

  useEffect(() => {
    return onAutoplayBlockedChange((blocked) => {
      setAutoplayBlocked(blocked);
    });
  }, []);

  // Sorteia uma curiosidade inicial aleatória toda vez que a tela de loading é ativada
  useEffect(() => {
    if (active && curiosities && curiosities.length > 0) {
      setCuriosityIndex(Math.floor(Math.random() * curiosities.length));
      setCuriosityFade('in');
    }
  }, [active, curiosities]);

  // Rotaciona as curiosidades a cada 5 segundos (5000ms) em ordem aleatória sem repetição consecutiva
  useEffect(() => {
    if (!active) return;
    if (!curiosities || curiosities.length <= 1) return;

    const interval = setInterval(() => {
      setCuriosityFade('out');
      setTimeout(() => {
        setCuriosityIndex((prev) => {
          let next = Math.floor(Math.random() * curiosities.length);
          while (next === prev && curiosities.length > 1) {
            next = Math.floor(Math.random() * curiosities.length);
          }
          return next;
        });
        setCuriosityFade('in');
      }, 250);
    }, curiosityIntervalMs);

    return () => clearInterval(interval);
  }, [active, curiosities, curiosityIntervalMs]);

  // Phase 146: Inscreve o componente ao progresso real do assetPreloader
  useEffect(() => {
    if (!active || !waitForAssets) return;
    return assetPreloader.onProgress((state) => {
      if (state.message) {
        setPreloaderMessage(state.message);
      }
    });
  }, [active, waitForAssets]);

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
    let intervalId: NodeJS.Timeout;
    let finishTimeoutId: NodeJS.Timeout;
    let isHandled = false;

    const finish = () => {
      if (isHandled) return;
      isHandled = true;
      cancelAnimationFrame(animationFrameId);
      clearInterval(intervalId);
      setProgress(100);
      setIsFadingOut(true);
      finishTimeoutId = setTimeout(() => {
        setIsVisible(false);
        setIsFadingOut(false);
        onFinishRef.current?.();
      }, 350);
    };

    const updateProgress = (now: number) => {
      if (isHandled) return;
      const elapsed = now - startTime;
      const effectiveDuration = durationMs;
      const timePct = Math.min(100, (elapsed / effectiveDuration) * 100);

      // Phase 146 & 178 & 223: Sincronização autoritativa com o pré-carregamento e duração configurada
      const isAssetsComplete = !waitForAssets || assetPreloader.isComplete();
      const assetProgressPct = waitForAssets ? assetPreloader.getProgress() : 100;

      const isTimedOut = elapsed >= effectiveDuration + 2000;
      let effectivePct: number;
      if (!waitForAssets || isTimedOut) {
        effectivePct = timePct;
      } else if (!isAssetsComplete) {
        effectivePct = Math.min(99, Math.max(timePct * 0.4, assetProgressPct));
      } else {
        // Quando os assets estão prontos, o progresso acompanha a duração suave da viagem (timePct)
        effectivePct = timePct;
      }

      const pct = Math.min(100, effectivePct);
      setProgress(pct);

      if ((pct >= 100 && (isAssetsComplete || !waitForAssets)) || isTimedOut) {
        finish();
      }
    };

    const tick = (now: number) => {
      if (isHandled) return;
      updateProgress(now);
      if (!isHandled) {
        animationFrameId = requestAnimationFrame(tick);
      }
    };

    animationFrameId = requestAnimationFrame(tick);

    // Heartbeat fallback for background/minimized tabs where requestAnimationFrame is paused by browsers
    intervalId = setInterval(() => {
      if (isHandled) return;
      updateProgress(performance.now());
    }, 100);

    const onVisibilityChange = () => {
      if (isHandled) return;
      updateProgress(performance.now());
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibilityChange);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      clearInterval(intervalId);
      clearTimeout(finishTimeoutId);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibilityChange);
      }
    };
  }, [active, durationMs, waitForAssets]);

  if (!isVisible && !active) return null;

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Carregando o jogo"
      className="exura-loading-overlay"
      onClick={() => {
        void unlockAudio();
      }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100dvh',
        minHeight: '-webkit-fill-available',
        zIndex: 999999999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingBottom: 'max(4.5rem, calc(2.5rem + env(safe-area-inset-bottom, 20px)))',
        backgroundColor: '#080403',
        backgroundImage: `url(${bgImage || '/images/loading/thais-loading.jpg'})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        userSelect: 'none',
        pointerEvents: isFadingOut ? 'none' : 'auto',
        opacity: isFadingOut ? 0 : 1,
        transition: 'opacity 0.4s ease-in-out',
        boxSizing: 'border-box',
        overflow: 'hidden',
        cursor: autoplayBlocked ? 'pointer' : 'default',
      }}
    >
      {/* Instant atmospheric fantasy backdrop gradient while loading in cold cache / incognito */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 50% 40%, #2c1a10 0%, #170d08 55%, #080403 100%)',
          zIndex: 0,
        }}
      />
      {/* Explicit Artwork Layer with Fallback & Priority Fetch */}
      <img
        src={bgImage || '/images/loading/thais-loading.jpg'}
        alt="Loading artwork"
        loading="eager"
        decoding="sync"
        fetchPriority="high"
        onLoad={() => setArtworkLoaded(true)}
        onError={(e) => {
          const target = e.currentTarget as HTMLImageElement;
          if (!target.src.includes('/images/loading/loading-bg.jpg')) {
            target.src = '/images/loading/loading-bg.jpg';
          }
        }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
          zIndex: 1,
          pointerEvents: 'none',
          opacity: artworkLoaded ? 1 : 0.85,
          transition: 'opacity 0.35s ease-in',
        }}
      />

      {/* Atmospheric Vignette & Radial Darkening Overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0.68) 100%)',
          zIndex: 2,
          pointerEvents: 'none',
        }}
      />

      {/* Autoplay Audio Unlock Interactive Hint */}
      {autoplayBlocked && (
        <div
          style={{
            position: 'absolute',
            top: '1.5rem',
            zIndex: 100,
            backgroundColor: 'rgba(15, 10, 8, 0.85)',
            border: '1px solid #d4a359',
            borderRadius: '4px',
            padding: '0.45rem 1.1rem',
            color: '#ffd580',
            fontFamily: 'serif',
            fontSize: '0.85rem',
            letterSpacing: '0.06em',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.7), 0 0 10px rgba(212, 163, 89, 0.35)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            animation: 'pulse 2s infinite',
            pointerEvents: 'none',
          }}
        >
          <span>🎵</span>
          <span>Clique em qualquer lugar para ativar a música de Thais</span>
        </div>
      )}

      {/* Central Content Box anchored near bottom */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
          paddingLeft: '1rem',
          paddingRight: '1rem',
          boxSizing: 'border-box',
        }}
      >
        {/* Curiosidades Rotativas ("Você sabia?") a cada 3 segundos */}
        {curiosities && curiosities.length > 0 && (
          <div
            className="exura-loading-curiosity-box"
            style={{
              marginBottom: '1.25rem',
              width: '92vw',
              maxWidth: '680px',
              background: 'linear-gradient(180deg, rgba(22, 13, 10, 0.9) 0%, rgba(12, 7, 6, 0.95) 100%)',
              border: '1.5px solid #d4a737',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.85), inset 0 0 16px rgba(212, 167, 55, 0.15)',
              borderRadius: '8px',
              padding: '0.85rem 1.35rem',
              textAlign: 'center',
              position: 'relative',
              boxSizing: 'border-box',
              backdropFilter: 'blur(5px)',
              zIndex: 35,
            }}
          >
            {/* Cantoneiras ornamentais em ouro */}
            <div style={{ position: 'absolute', top: '-3px', left: '-3px', width: '7px', height: '7px', backgroundColor: '#ffd875', border: '1px solid #784c16' }} />
            <div style={{ position: 'absolute', top: '-3px', right: '-3px', width: '7px', height: '7px', backgroundColor: '#ffd875', border: '1px solid #784c16' }} />
            <div style={{ position: 'absolute', bottom: '-3px', left: '-3px', width: '7px', height: '7px', backgroundColor: '#ffd875', border: '1px solid #784c16' }} />
            <div style={{ position: 'absolute', bottom: '-3px', right: '-3px', width: '7px', height: '7px', backgroundColor: '#ffd875', border: '1px solid #784c16' }} />

            {/* Cabeçalho "Você sabia?" */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '2px 12px',
                borderRadius: '12px',
                background: 'rgba(212, 167, 55, 0.2)',
                border: '1px solid rgba(255, 216, 117, 0.45)',
                marginBottom: '0.45rem',
              }}
            >
              <span
                style={{
                  fontFamily: 'serif',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  color: '#ffd875',
                  textShadow: '0 1px 2px #000',
                }}
              >
                Você Sabia?
              </span>
            </div>

            {/* Texto da curiosidade com fade suave */}
            <div
              style={{
                minHeight: '42px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: curiosityFade === 'in' ? 1 : 0,
                transform: curiosityFade === 'in' ? 'translateY(0)' : 'translateY(2px)',
                transition: 'opacity 0.22s ease-in-out, transform 0.22s ease-in-out',
              }}
            >
              <p
                className="exura-loading-curiosity-text"
                style={{
                  margin: 0,
                  fontFamily: 'serif',
                  fontSize: '0.96rem',
                  lineHeight: '1.45',
                  color: '#fbf1dc',
                  textShadow: '0 2px 4px rgba(0, 0, 0, 0.95), 0 0 8px rgba(0, 0, 0, 0.8)',
                  letterSpacing: '0.015em',
                }}
              >
                {curiosities[curiosityIndex] || curiosities[0]}
              </p>
            </div>
          </div>
        )}

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
            {(waitForAssets && preloaderMessage) || message} ({Math.round(progress)}%)
          </p>
        </div>
      </div>
    </div>
  );
}

export default ExuraLoadingScreen;
