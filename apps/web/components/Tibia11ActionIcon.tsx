'use client';

import React from 'react';

interface Tibia11ActionIconProps {
  id: number;
  kind?: 'spell' | 'rune' | 'potion';
  name?: string;
  size?: number;
  className?: string;
}

export function Tibia11ActionIcon({ id, kind, name = '', size = 32, className = '' }: Tibia11ActionIconProps) {
  // 1. RUNES (IDs 2268, 2304, 2274, 2311, 2313)
  if (id === 2268 || name.toLowerCase().includes('sudden death')) {
    // Sudden Death - Dark Skull Rune
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" className={`tibia11-icon rune-sd ${className}`} fill="none">
        <rect x="3" y="3" width="26" height="26" rx="4" fill="#141117" stroke="#4d325c" strokeWidth="1.5" />
        <circle cx="16" cy="16" r="11" fill="url(#sd-glow)" opacity="0.6" />
        <path d="M11 11 C11 7, 21 7, 21 11 C21 15, 18 17, 18 19 L14 19 C14 17, 11 15, 11 11 Z" fill="#b08ccf" />
        <circle cx="13.5" cy="12" r="1.5" fill="#141117" />
        <circle cx="18.5" cy="12" r="1.5" fill="#141117" />
        <rect x="13.5" y="19.5" width="5" height="3" rx="1" fill="#956ab5" />
        <line x1="15" y1="20" x2="15" y2="22.5" stroke="#141117" strokeWidth="0.8" />
        <line x1="17" y1="20" x2="17" y2="22.5" stroke="#141117" strokeWidth="0.8" />
        <defs>
          <radialGradient id="sd-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#8c3eb8" />
            <stop offset="100%" stopColor="#141117" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    );
  }

  if (id === 2304 || name.toLowerCase().includes('great fireball')) {
    // GFB - Fire Rune
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" className={`tibia11-icon rune-gfb ${className}`} fill="none">
        <rect x="3" y="3" width="26" height="26" rx="4" fill="#2b0e0a" stroke="#873523" strokeWidth="1.5" />
        <circle cx="16" cy="16" r="10" fill="url(#gfb-glow)" />
        <path d="M16 7 C18 11, 23 14, 21 20 C19 24, 13 25, 10 21 C8 17, 13 14, 14 11 Z" fill="#ff7a18" />
        <path d="M16 12 C17 15, 20 16, 19 19 C18 21, 14 22, 13 20 C12 18, 14 16, 15 14 Z" fill="#fff159" />
        <defs>
          <radialGradient id="gfb-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#e84a1c" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#2b0e0a" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    );
  }

  if (id === 2274 || name.toLowerCase().includes('avalanche')) {
    // Avalanche - Ice Rune
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" className={`tibia11-icon rune-ava ${className}`} fill="none">
        <rect x="3" y="3" width="26" height="26" rx="4" fill="#091d29" stroke="#256b8f" strokeWidth="1.5" />
        <circle cx="16" cy="16" r="10" fill="url(#ava-glow)" />
        <path d="M16 7 L16 25 M7 16 L25 16 M9.5 9.5 L22.5 22.5 M9.5 22.5 L22.5 9.5" stroke="#9eeeff" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="16" cy="16" r="3" fill="#ffffff" />
        <defs>
          <radialGradient id="ava-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3cb8e6" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#091d29" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    );
  }

  if (id === 2311 || name.toLowerCase().includes('heavy magic missile')) {
    // HMM - Purple Missile Rune
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" className={`tibia11-icon rune-hmm ${className}`} fill="none">
        <rect x="3" y="3" width="26" height="26" rx="4" fill="#1b122c" stroke="#5d418e" strokeWidth="1.5" />
        <path d="M8 24 L20 12 L24 8 L20 16 L12 24 Z" fill="#bc82ff" />
        <circle cx="23" cy="9" r="3" fill="#ffffff" />
        <path d="M10 22 L14 18 M8 18 L12 14" stroke="#e0beff" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (id === 2313 || name.toLowerCase().includes('explosion')) {
    // Explosion - Kinetic Orange Rune
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" className={`tibia11-icon rune-exp ${className}`} fill="none">
        <rect x="3" y="3" width="26" height="26" rx="4" fill="#241708" stroke="#7a4e18" strokeWidth="1.5" />
        <path d="M16 6 L18 12 L24 10 L20 15 L26 18 L20 20 L22 26 L16 22 L11 25 L13 19 L7 17 L13 14 L9 9 L15 12 Z" fill="#ff9924" stroke="#ffde59" strokeWidth="1" />
        <circle cx="16" cy="16" r="3.5" fill="#ffffff" />
      </svg>
    );
  }

  // 2. POTIONS (Health, Mana, Spirit)
  if (name.toLowerCase().includes('health potion') || id === 7618 || id === 7588 || id === 7591 || id === 8473 || id === 26031) {
    const isSupreme = id === 26031 || name.toLowerCase().includes('supreme');
    const isUltimate = id === 8473 || name.toLowerCase().includes('ultimate');
    const isGreat = id === 7591 || name.toLowerCase().includes('great');
    const isStrong = id === 7588 || name.toLowerCase().includes('strong');

    return (
      <svg width={size} height={size} viewBox="0 0 32 32" className={`tibia11-icon potion-health ${className}`} fill="none">
        <rect x="2" y="2" width="28" height="28" rx="3" fill="#180e0e" stroke={isSupreme ? '#ffd700' : isUltimate ? '#c9933b' : '#572525'} strokeWidth={isSupreme ? '1.8' : '1.2'} />
        {/* Flask Neck */}
        <rect x="13" y="5" width="6" height="4" rx="1" fill="#7a858c" />
        <rect x="12" y="8" width="8" height="2" rx="1" fill="#a4b3bd" />
        {/* Flask Body */}
        <path d="M12 10 L8 18 C7 23, 10 27, 16 27 C22 27, 25 23, 24 18 L20 10 Z" fill="#9e1919" stroke="#d63636" strokeWidth="1" />
        {/* Liquid Highlight & Bubbles */}
        <path d="M10 19 C10 24, 13 25.5, 16 25.5 C19 25.5, 22 24, 22 19 C20 20, 12 20, 10 19 Z" fill="#e83838" />
        <circle cx="13" cy="22" r="1.5" fill="#ff8c8c" />
        <circle cx="17.5" cy="20" r="1" fill="#ffbaba" />
        {/* Golden Bands for Ultimate / Supreme */}
        {(isUltimate || isSupreme) && (
          <path d="M9 19 Q16 21 23 19" stroke="#ffd700" strokeWidth="1.8" fill="none" />
        )}
        {isSupreme && (
          <path d="M11 14 Q16 16 21 14" stroke="#ffe866" strokeWidth="1.5" fill="none" />
        )}
      </svg>
    );
  }

  if (name.toLowerCase().includes('mana potion') || id === 7620 || id === 7589 || id === 7590 || id === 26029) {
    const isUltimate = id === 26029 || name.toLowerCase().includes('ultimate');
    const isGreat = id === 7590 || name.toLowerCase().includes('great');
    const isStrong = id === 7589 || name.toLowerCase().includes('strong');

    return (
      <svg width={size} height={size} viewBox="0 0 32 32" className={`tibia11-icon potion-mana ${className}`} fill="none">
        <rect x="2" y="2" width="28" height="28" rx="3" fill="#0c131a" stroke={isUltimate ? '#ffd700' : '#224a6e'} strokeWidth={isUltimate ? '1.8' : '1.2'} />
        {/* Flask Neck */}
        <rect x="13" y="5" width="6" height="4" rx="1" fill="#7a858c" />
        <rect x="12" y="8" width="8" height="2" rx="1" fill="#a4b3bd" />
        {/* Flask Body */}
        <path d="M12 10 L8 18 C7 23, 10 27, 16 27 C22 27, 25 23, 24 18 L20 10 Z" fill="#145899" stroke="#2a8ceb" strokeWidth="1" />
        {/* Liquid Highlight & Bubbles */}
        <path d="M10 19 C10 24, 13 25.5, 16 25.5 C19 25.5, 22 24, 22 19 C20 20, 12 20, 10 19 Z" fill="#2d9bf0" />
        <circle cx="13" cy="22" r="1.5" fill="#8adcff" />
        <circle cx="18" cy="20.5" r="1" fill="#c4efff" />
        {isUltimate && (
          <path d="M9 19 Q16 21 23 19" stroke="#ffd700" strokeWidth="1.8" fill="none" />
        )}
      </svg>
    );
  }

  if (name.toLowerCase().includes('spirit potion') || id === 8472 || id === 26030) {
    const isUltimate = id === 26030 || name.toLowerCase().includes('ultimate');
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" className={`tibia11-icon potion-spirit ${className}`} fill="none">
        <rect x="2" y="2" width="28" height="28" rx="3" fill="#160e1c" stroke={isUltimate ? '#ffd700' : '#572b70'} strokeWidth="1.5" />
        <rect x="13" y="5" width="6" height="4" rx="1" fill="#7a858c" />
        <rect x="12" y="8" width="8" height="2" rx="1" fill="#a4b3bd" />
        <path d="M12 10 L8 18 C7 23, 10 27, 16 27 C22 27, 25 23, 24 18 L20 10 Z" fill="#781e8c" stroke="#b838d4" strokeWidth="1" />
        <path d="M10 19 C10 24, 13 25.5, 16 25.5 C19 25.5, 22 24, 22 19 C20 20, 12 20, 10 19 Z" fill="#b940db" />
        <circle cx="13" cy="22" r="1.5" fill="#ffaffb" />
        <circle cx="18" cy="21" r="1" fill="#9de6ff" />
        {isUltimate && (
          <path d="M9 19 Q16 21 23 19" stroke="#ffd700" strokeWidth="1.8" fill="none" />
        )}
      </svg>
    );
  }

  // 3. HEALING SPELLS (Exura, Exura Gran, Exura Vita, Exana Mort, Exura San, Exura Sio)
  if (name.toLowerCase().includes('healing') || name.toLowerCase().includes('exura') || name.toLowerCase().includes('wound cleansing')) {
    const isVita = name.toLowerCase().includes('vita') || name.toLowerCase().includes('ultimate');
    const isGran = name.toLowerCase().includes('gran') || name.toLowerCase().includes('intense');
    const isSan = name.toLowerCase().includes('san') || name.toLowerCase().includes('divine');
    const isSio = name.toLowerCase().includes('sio') || name.toLowerCase().includes('friend');
    const isWound = name.toLowerCase().includes('wound') || name.toLowerCase().includes('exana');

    if (isSio) {
      // Heal Friend
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" className={`tibia11-icon spell-sio ${className}`} fill="none">
          <rect x="2" y="2" width="28" height="28" rx="3" fill="#0d2417" stroke="#256b43" strokeWidth="1.2" />
          <circle cx="16" cy="16" r="11" fill="url(#sio-glow)" opacity="0.8" />
          <path d="M10 18 C10 14, 14 12, 16 12 C18 12, 22 14, 22 18" stroke="#a3f5c3" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="16" cy="9" r="2.5" fill="#d6ffe6" />
          <path d="M12 23 L20 23" stroke="#6be097" strokeWidth="2" strokeLinecap="round" />
          <defs>
            <radialGradient id="sio-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#43db7b" />
              <stop offset="100%" stopColor="#0d2417" stopOpacity="0" />
            </radialGradient>
          </defs>
        </svg>
      );
    }

    if (isWound) {
      // Wound Cleansing
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" className={`tibia11-icon spell-wound ${className}`} fill="none">
          <rect x="2" y="2" width="28" height="28" rx="3" fill="#241212" stroke="#6e2d2d" strokeWidth="1.2" />
          <path d="M7 16 C12 11, 20 11, 25 16 C20 21, 12 21, 7 16 Z" fill="#9e3535" stroke="#e05353" strokeWidth="1.5" />
          <line x1="16" y1="9" x2="16" y2="23" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
          <line x1="9" y1="16" x2="23" y2="16" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    }

    // Standard Cross Heals (Exura, Exura Gran, Exura Vita, Exura San)
    const crossColor = isSan ? '#fff6a3' : isVita ? '#f2e266' : isGran ? '#9eeaff' : '#7dfac0';
    const bgColor = isSan ? '#2b260e' : isVita ? '#26200a' : isGran ? '#0a1d29' : '#0c2118';
    const borderColor = isSan ? '#bfa32e' : isVita ? '#a18825' : isGran ? '#256d8f' : '#22694b';

    return (
      <svg width={size} height={size} viewBox="0 0 32 32" className={`tibia11-icon spell-heal ${className}`} fill="none">
        <rect x="2" y="2" width="28" height="28" rx="3" fill={bgColor} stroke={borderColor} strokeWidth="1.2" />
        <circle cx="16" cy="16" r="10" fill="url(#heal-pulse)" opacity="0.6" />
        {/* Glowing Healing Cross */}
        <rect x="13.5" y="6" width="5" height="20" rx="1.5" fill={crossColor} filter="drop-shadow(0 0 3px rgba(255,255,255,0.8))" />
        <rect x="6" y="13.5" width="20" height="5" rx="1.5" fill={crossColor} filter="drop-shadow(0 0 3px rgba(255,255,255,0.8))" />
        <defs>
          <radialGradient id="heal-pulse" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={crossColor} />
            <stop offset="100%" stopColor={bgColor} stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    );
  }

  // 4. SUPPORT SPELLS (Haste, Strong Haste, Magic Shield)
  if (name.toLowerCase().includes('haste') || name.toLowerCase().includes('utani')) {
    const isGran = name.toLowerCase().includes('gran') || name.toLowerCase().includes('strong');
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" className={`tibia11-icon spell-haste ${className}`} fill="none">
        <rect x="2" y="2" width="28" height="28" rx="3" fill="#122417" stroke={isGran ? '#d9b336' : '#2b6b3e'} strokeWidth="1.2" />
        {/* Winged Boot */}
        <path d="M8 12 L13 12 L15 19 L23 19 C25 19, 26 21, 25 23 L22 24 L10 24 C8 24, 7 23, 7 21 Z" fill={isGran ? '#ffd84a' : '#7ae89d'} stroke="#ffffff" strokeWidth="0.8" />
        {/* Speed Wings */}
        <path d="M14 11 C18 8, 23 9, 26 12 C23 13, 18 13, 15 15 Z" fill={isGran ? '#ffeaa3' : '#c9ffdb'} />
        <path d="M13 14 C16 12, 20 13, 22 15 C19 16, 16 16, 14 17 Z" fill="#ffffff" />
        {/* Wind motion lines */}
        <line x1="5" y1="16" x2="9" y2="16" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" />
        <line x1="6" y1="20" x2="11" y2="20" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" />
      </svg>
    );
  }

  if (name.toLowerCase().includes('magic shield') || name.toLowerCase().includes('utamo vita')) {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" className={`tibia11-icon spell-shield ${className}`} fill="none">
        <rect x="2" y="2" width="28" height="28" rx="3" fill="#0a1a2b" stroke="#25629c" strokeWidth="1.2" />
        <path d="M16 6 C22 6, 24 9, 24 15 C24 22, 18 25, 16 27 C14 25, 8 22, 8 15 C8 9, 10 6, 16 6 Z" fill="#1c558c" stroke="#68b4ff" strokeWidth="1.5" />
        <circle cx="16" cy="15" r="4" fill="#a8d7ff" />
      </svg>
    );
  }

  // 5. ATTACK SPELLS (Berserk, Strikes, Waves, Ultimate Spells)
  if (name.toLowerCase().includes('berserk') || name.toLowerCase().includes('exori')) {
    const isGran = name.toLowerCase().includes('gran');
    const isMas = name.toLowerCase().includes('mas') || name.toLowerCase().includes('groundshaker');
    const isHur = name.toLowerCase().includes('hur') || name.toLowerCase().includes('whirlwind');
    const isIco = name.toLowerCase().includes('ico');

    return (
      <svg width={size} height={size} viewBox="0 0 32 32" className={`tibia11-icon spell-berserk ${className}`} fill="none">
        <rect x="2" y="2" width="28" height="28" rx="3" fill="#2b0e0e" stroke="#872525" strokeWidth="1.2" />
        <circle cx="16" cy="16" r="10" fill="url(#exori-bg)" />
        {/* Curved Spinning Blades */}
        <path d="M7 16 C10 9, 21 8, 25 15 C21 14, 14 17, 12 21 C10 19, 8 18, 7 16 Z" fill="#ff4d4d" stroke="#ffb3b3" strokeWidth="0.8" />
        {isGran && (
          <path d="M25 16 C22 23, 11 24, 7 17 C11 18, 18 15, 20 11 C22 13, 24 14, 25 16 Z" fill="#ff8533" stroke="#ffd9b3" strokeWidth="0.8" />
        )}
        <circle cx="16" cy="16" r="2.5" fill="#ffffff" />
        <defs>
          <radialGradient id="exori-bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#8a1c1c" />
            <stop offset="100%" stopColor="#2b0e0e" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    );
  }

  if (name.toLowerCase().includes('strike') || name.toLowerCase().includes('flam') || name.toLowerCase().includes('vis') || name.toLowerCase().includes('frigo') || name.toLowerCase().includes('tera') || name.toLowerCase().includes('mort')) {
    const isFire = name.toLowerCase().includes('flam');
    const isEnergy = name.toLowerCase().includes('vis');
    const isIce = name.toLowerCase().includes('frigo');
    const isTerra = name.toLowerCase().includes('tera');
    const isDeath = name.toLowerCase().includes('mort');

    if (isFire) {
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" className={`tibia11-icon spell-flame ${className}`} fill="none">
          <rect x="2" y="2" width="28" height="28" rx="3" fill="#290e09" stroke="#803322" strokeWidth="1.2" />
          <path d="M16 6 C19 11, 24 14, 22 20 C20 25, 12 26, 10 21 C8 16, 13 13, 14 10 Z" fill="#ff621f" />
          <path d="M16 12 C18 15, 20 17, 19 20 C18 22, 14 23, 13 21 C12 19, 14 17, 15 15 Z" fill="#ffeb54" />
        </svg>
      );
    }

    if (isEnergy) {
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" className={`tibia11-icon spell-vis ${className}`} fill="none">
          <rect x="2" y="2" width="28" height="28" rx="3" fill="#0e1729" stroke="#2b477d" strokeWidth="1.2" />
          <path d="M18 5 L10 16 L16 16 L13 27 L23 14 L17 14 Z" fill="#47a3ff" stroke="#d4ebff" strokeWidth="1" />
        </svg>
      );
    }

    if (isIce) {
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" className={`tibia11-icon spell-frigo ${className}`} fill="none">
          <rect x="2" y="2" width="28" height="28" rx="3" fill="#0c1d29" stroke="#25648f" strokeWidth="1.2" />
          <path d="M16 6 L20 14 L16 26 L12 14 Z" fill="#66dbff" stroke="#ffffff" strokeWidth="0.8" />
          <path d="M8 16 L16 13 L24 16 L16 19 Z" fill="#a8ecff" />
        </svg>
      );
    }

    if (isTerra) {
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" className={`tibia11-icon spell-tera ${className}`} fill="none">
          <rect x="2" y="2" width="28" height="28" rx="3" fill="#142410" stroke="#37692b" strokeWidth="1.2" />
          <polygon points="16,6 25,18 20,26 12,26 7,18" fill="#589e40" stroke="#9de084" strokeWidth="1" />
          <polygon points="16,10 21,18 16,23 11,18" fill="#78c95d" />
        </svg>
      );
    }

    if (isDeath) {
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" className={`tibia11-icon spell-mort ${className}`} fill="none">
          <rect x="2" y="2" width="28" height="28" rx="3" fill="#1b0e24" stroke="#5d2c78" strokeWidth="1.2" />
          <circle cx="16" cy="16" r="9" fill="#571775" />
          <circle cx="13" cy="14" r="2" fill="#000000" />
          <circle cx="19" cy="14" r="2" fill="#000000" />
          <path d="M13 20 Q16 23 19 20" stroke="#000000" strokeWidth="1.5" fill="none" />
        </svg>
      );
    }
  }

  // DEFAULT / FALLBACK ACTION ICON
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={`tibia11-icon spell-generic ${className}`} fill="none">
      <rect x="2" y="2" width="28" height="28" rx="3" fill="#1c211e" stroke="#444d47" strokeWidth="1.2" />
      <polygon points="16,7 23,20 9,20" fill="#a4b3a8" stroke="#dce3de" strokeWidth="0.8" />
      <circle cx="16" cy="16" r="3" fill="#ffffff" />
    </svg>
  );
}
