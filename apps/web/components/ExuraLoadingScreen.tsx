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
  durationMs = 5000,
  message = 'Loading, please wait...',
  onFinish,
}: ExuraLoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isVisible, setIsVisible] = useState(active);

  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  useEffect(() => {
    if (!active) {
      setIsFadingOut(false);
      setIsVisible(false);
      setProgress(0);
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
        // Bar reached 100% after durationMs (5s)
        setIsFadingOut(true);
        finishTimeoutId = setTimeout(() => {
          setIsVisible(false);
          onFinishRef.current?.();
        }, 350);
      }
    };

    animationFrameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationFrameId);
      clearTimeout(finishTimeoutId);
    };
  }, [active, durationMs]);

  if (!isVisible) return null;

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Carregando o jogo"
      className={`fixed inset-0 z-[999999] select-none pointer-events-auto flex flex-col items-center justify-end pb-12 md:pb-16 transition-opacity duration-350 ease-in-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        backgroundImage: `radial-gradient(ellipse at center, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.65) 100%), url('/images/loading/loading-bg.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#070202',
      }}
    >
      {/* Central Content Box anchored near bottom */}
      <div className="flex flex-col items-center w-full px-4">
        {/* Loading Bar Frame Container matching 1024x341 ratio */}
        <div className="relative w-[92vw] max-w-[620px] md:max-w-[700px] lg:max-w-[760px] aspect-[1024/341] flex items-center justify-center">
          {/* 1. Inner Cavity Slot (Dark Groove) */}
          <div
            className="absolute z-10 overflow-hidden"
            style={{
              left: '7.5%',
              width: '85.0%',
              top: '39.8%',
              height: '15.2%',
              background: 'linear-gradient(180deg, #0d0202 0%, #1a0404 50%, #080101 100%)',
              boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.95), inset 0 0 8px rgba(0,0,0,0.85)',
              borderRadius: '2px',
            }}
          >
            {/* 2. Red Progress Fill */}
            <div
              className="h-full relative overflow-hidden transition-[width] duration-75 ease-out exura-bar-glow"
              style={{
                width: `${Math.min(100, Math.max(0, progress))}%`,
                background:
                  'linear-gradient(90deg, #600303 0%, #a81010 20%, #ef2323 50%, #ff5252 80%, #ef2323 100%)',
                boxShadow:
                  '0 0 14px rgba(255, 30, 30, 0.9), inset 0 1px 2px rgba(255, 220, 220, 0.65)',
              }}
            >
              {/* Animated Magma / Fiery Shimmer */}
              <div
                className="absolute inset-0 exura-loading-shimmer"
                style={{
                  background:
                    'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.45) 50%, transparent 100%)',
                  width: '60%',
                  pointerEvents: 'none',
                }}
              />

              {/* Glowing tip / ember spark */}
              {progress > 2 && progress < 99 && (
                <div
                  className="absolute right-0 top-0 bottom-0 w-2"
                  style={{
                    background: '#ffffff',
                    boxShadow: '0 0 10px #ffffff, 0 0 20px #ff3333',
                    opacity: 0.85,
                  }}
                />
              )}
            </div>
          </div>

          {/* 3. Ornamental Golden Frame with Rubies (Sits on top of the cavity) */}
          <img
            src="/images/loading/loading-bar-frame.png"
            alt="Moldura ornamental Exura"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none z-20 drop-shadow-[0_8px_16px_rgba(0,0,0,0.9)]"
          />
        </div>

        {/* Text label below the frame */}
        <div className="mt-2 md:mt-3 text-center z-30">
          <p className="font-serif text-[#e0c9a6] text-xs md:text-sm lg:text-base tracking-[0.2em] exura-loading-text uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}

export default ExuraLoadingScreen;
