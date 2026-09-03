'use client';

import React from 'react';

export interface Tibia11ActionIconProps {
  id: number;
  kind?: 'spell' | 'rune' | 'potion' | 'action';
  name?: string;
  size?: number;
  stackCount?: number;
  showCastBadge?: boolean;
  className?: string;
}

export function Tibia11ActionIcon({
  id,
  kind,
  name = '',
  size = 32,
  stackCount,
  showCastBadge = false,
  className = '',
}: Tibia11ActionIconProps) {
  const lowerName = name.toLowerCase();

  // Helper for rendering the Cast Mode badge (Wizard hat / target icon at bottom-right, as seen on F3 and F4)
  const renderCastBadge = () => (
    <g className="tibia11-cast-badge" transform="translate(19, 19)">
      <circle cx="5" cy="5" r="5" fill="#141c26" stroke="#2c3f56" strokeWidth="0.8" />
      {/* Wizard hat / reticle icon */}
      <path d="M5 2 L2.5 7.5 L7.5 7.5 Z" fill="#69aff0" />
      <ellipse cx="5" cy="7.5" rx="3.2" ry="0.9" fill="#9ed0ff" />
      <circle cx="5" cy="4" r="0.8" fill="#ffffff" />
    </g>
  );

  // Helper for rendering stack count in bottom-right (as seen with '5' on F2)
  const renderStackCount = (count: number) => (
    <text
      x="30"
      y="30"
      textAnchor="end"
      fill="#ffffff"
      fontSize="9"
      fontFamily="Verdana, Tahoma, monospace"
      fontWeight="900"
      style={{
        paintOrder: 'stroke fill',
        stroke: '#000000',
        strokeWidth: '2px',
        strokeLinejoin: 'round',
      }}
    >
      {count}
    </text>
  );

  // 1. HEALING SPELLS (F3 in screenshot: Intense / Ultimate Healing - Radiant white starburst with lower-left crimson fire)
  if (
    lowerName.includes('healing') ||
    lowerName.includes('exura') ||
    lowerName.includes('wound') ||
    id === 1 ||
    id === 2 ||
    id === 3
  ) {
    const isWound = lowerName.includes('wound') || lowerName.includes('exana');
    if (isWound) {
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" className={`tibia11-icon ${className}`}>
          <rect width="32" height="32" fill="#241212" />
          <path d="M6 16 C11 10, 21 10, 26 16 C21 22, 11 22, 6 16 Z" fill="#9e3535" stroke="#e05353" strokeWidth="1.5" />
          <line x1="16" y1="9" x2="16" y2="23" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="9" y1="16" x2="23" y2="16" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
          {showCastBadge && renderCastBadge()}
        </svg>
      );
    }

    // Official Tibia 11 Radiant Healing Starburst with Lower-Left Crimson Burst (Exact F3 match!)
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" className={`tibia11-icon spell-radiant-heal ${className}`}>
        <defs>
          <radialGradient id="heal-bg-deep" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#254366" />
            <stop offset="60%" stopColor="#132338" />
            <stop offset="100%" stopColor="#08101a" />
          </radialGradient>
          <radialGradient id="heal-fire-nebula" cx="15%" cy="85%" r="55%">
            <stop offset="0%" stopColor="#ff4d33" />
            <stop offset="45%" stopColor="#d62e1a" />
            <stop offset="85%" stopColor="#781005" />
            <stop offset="100%" stopColor="#1a0000" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="heal-core-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="35%" stopColor="#e0f7ff" />
            <stop offset="70%" stopColor="#75d4ff" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#2b6b99" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* Background Celestial Blue */}
        <rect width="32" height="32" fill="url(#heal-bg-deep)" />
        {/* Lower-left Crimson Flame Nebula */}
        <rect width="32" height="32" fill="url(#heal-fire-nebula)" />
        {/* Long Diagonal Radiant Rays */}
        <line x1="2" y1="2" x2="30" y2="30" stroke="#bdeeff" strokeWidth="1.2" opacity="0.65" />
        <line x1="30" y1="2" x2="2" y2="30" stroke="#bdeeff" strokeWidth="1.2" opacity="0.65" />
        <line x1="16" y1="1" x2="16" y2="31" stroke="#e8f8ff" strokeWidth="1.6" opacity="0.8" />
        <line x1="1" y1="16" x2="31" y2="16" stroke="#e8f8ff" strokeWidth="1.6" opacity="0.8" />
        {/* Secondary Diamond Flare Rays */}
        <polygon points="16,3 18.5,13.5 29,16 18.5,18.5 16,29 13.5,18.5 3,16 13.5,13.5" fill="#ffffff" opacity="0.9" />
        <polygon points="16,7 18,14 25,16 18,18 16,25 14,18 7,16 14,14" fill="#aeeaff" />
        {/* Glowing Center Corona */}
        <circle cx="16" cy="16" r="6.5" fill="url(#heal-core-glow)" />
        {/* Blinding White Starburst Center */}
        <circle cx="16" cy="16" r="3" fill="#ffffff" />
        {/* Sparkle Particles */}
        <circle cx="8" cy="8" r="0.8" fill="#ffffff" opacity="0.8" />
        <circle cx="24" cy="7" r="1.1" fill="#ffffff" opacity="0.9" />
        <circle cx="25" cy="23" r="0.8" fill="#bfeeff" opacity="0.7" />
        <circle cx="6" cy="22" r="1" fill="#ffb099" opacity="0.9" />
        {showCastBadge && renderCastBadge()}
      </svg>
    );
  }

  // 2. ICE SPELLS (F4 in screenshot: Ice Strike / Ice Wave - Rising Cyan Crystal Spear with frost specks)
  if (lowerName.includes('frigo') || lowerName.includes('ice') || lowerName.includes('avalanche') || id === 2274) {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" className={`tibia11-icon spell-ice-strike ${className}`}>
        <defs>
          <radialGradient id="ice-bg-gradient" cx="50%" cy="45%" r="60%">
            <stop offset="0%" stopColor="#202c38" />
            <stop offset="65%" stopColor="#141c24" />
            <stop offset="100%" stopColor="#0a0f14" />
          </radialGradient>
          <linearGradient id="ice-crystal-core" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="40%" stopColor="#75ebff" />
            <stop offset="85%" stopColor="#259ecc" />
            <stop offset="100%" stopColor="#105f80" />
          </linearGradient>
          <linearGradient id="ice-left-facet" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#9cf2ff" />
            <stop offset="100%" stopColor="#3ac8f0" />
          </linearGradient>
        </defs>
        {/* Dark Slate Ice Background */}
        <rect width="32" height="32" fill="url(#ice-bg-gradient)" />
        {/* Frost Aura / Mist around the projectile */}
        <ellipse cx="16" cy="17" rx="10" ry="12" fill="#2ebfdb" opacity="0.25" />
        {/* Outer Icy Crystal Spikes */}
        <polygon points="16,3 19,10 22,23 18,27 16,29 14,27 10,23 13,10" fill="#1b6b8c" />
        {/* Main Crystal Blade (Upwards pointing) */}
        <polygon points="16,4 20,13 18,25 16,27 14,25 12,13" fill="url(#ice-crystal-core)" />
        {/* Left Highlight Facet */}
        <polygon points="16,4 12,13 14,25 16,27" fill="url(#ice-left-facet)" opacity="0.85" />
        {/* Center Brilliant Spine */}
        <line x1="16" y1="5" x2="16" y2="26" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />
        {/* Lateral Shards (Frost Wings) */}
        <polygon points="16,12 25,18 20,20 16,18" fill="#75ebff" opacity="0.8" />
        <polygon points="16,12 7,18 12,20 16,18" fill="#c4f7ff" opacity="0.85" />
        <polygon points="16,16 23,24 18,24 16,21" fill="#43c8ed" opacity="0.7" />
        <polygon points="16,16 9,24 14,24 16,21" fill="#9deeff" opacity="0.7" />
        {/* Glistening Ice Particles */}
        <circle cx="8" cy="8" r="1" fill="#ffffff" />
        <circle cx="24" cy="9" r="0.9" fill="#c7f6ff" />
        <circle cx="6" cy="14" r="0.7" fill="#8ae5ff" />
        <circle cx="26" cy="16" r="0.7" fill="#8ae5ff" />
        <circle cx="16" cy="5" r="1.5" fill="#ffffff" filter="drop-shadow(0 0 2px #fff)" />
        {showCastBadge && renderCastBadge()}
      </svg>
    );
  }

  // 3. SPIRIT POTIONS (F2 in screenshot: Violet Flask with golden cap & white count)
  if (lowerName.includes('spirit') || id === 8472 || id === 26030) {
    const isUltimate = id === 26030 || lowerName.includes('ultimate');
    const count = stackCount ?? 5; // Default stack to 5 if matching screenshot

    return (
      <svg width={size} height={size} viewBox="0 0 32 32" className={`tibia11-icon potion-spirit ${className}`}>
        <rect width="32" height="32" fill="#141117" />
        {/* Golden Stopper & Collar */}
        <rect x="13" y="4" width="6" height="3.5" rx="1" fill="#c49a31" stroke="#ffd966" strokeWidth="0.8" />
        <rect x="12" y="7" width="8" height="2" rx="0.8" fill="#ffd700" />
        {/* Flask Glass Outline & Fill */}
        <path
          d="M12 9 L8 17 C7 22, 10 27, 16 27 C22 27, 25 22, 24 17 L20 9 Z"
          fill="#521063"
          stroke={isUltimate ? '#ffd700' : '#87219e'}
          strokeWidth="1.2"
        />
        {/* Glowing Purple Liquid */}
        <path
          d="M9.5 17.5 C9.5 22.5, 12 26, 16 26 C20 26, 22.5 22.5, 22.5 17.5 C20.5 18.5, 11.5 18.5, 9.5 17.5 Z"
          fill="#af20d4"
        />
        {/* Liquid Highlight Shimmer */}
        <ellipse cx="16" cy="18" rx="6" ry="1.5" fill="#d954ff" opacity="0.6" />
        <ellipse cx="13" cy="22" rx="2" ry="3" fill="#e982ff" opacity="0.75" />
        <circle cx="18" cy="21" r="1.5" fill="#75d7ff" />
        {/* Golden Filigree Ring */}
        <path d="M8.5 18 Q16 20.5 23.5 18" stroke="#ffd700" strokeWidth="1.2" fill="none" />
        {renderStackCount(count)}
      </svg>
    );
  }

  // 4. HEALTH POTIONS (Classic Red Flask with Golden/Silver ring)
  if (lowerName.includes('health potion') || id === 7618 || id === 7588 || id === 7591 || id === 8473 || id === 26031) {
    const isSupreme = id === 26031 || lowerName.includes('supreme');
    const isUltimate = id === 8473 || lowerName.includes('ultimate');
    const count = stackCount ?? 1;

    return (
      <svg width={size} height={size} viewBox="0 0 32 32" className={`tibia11-icon potion-health ${className}`}>
        <rect width="32" height="32" fill="#140d0d" />
        <rect x="13" y="4" width="6" height="3.5" rx="1" fill="#7a858c" stroke="#a4b3bd" strokeWidth="0.8" />
        <rect x="12" y="7" width="8" height="2" rx="0.8" fill={isSupreme || isUltimate ? '#ffd700' : '#8d9da8'} />
        <path
          d="M12 9 L8 17 C7 22, 10 27, 16 27 C22 27, 25 22, 24 17 L20 9 Z"
          fill="#781111"
          stroke={isSupreme ? '#ffd700' : isUltimate ? '#c9933b' : '#a82727'}
          strokeWidth="1.2"
        />
        <path
          d="M9.5 17.5 C9.5 22.5, 12 26, 16 26 C20 26, 22.5 22.5, 22.5 17.5 C20.5 18.5, 11.5 18.5, 9.5 17.5 Z"
          fill="#d42020"
        />
        <ellipse cx="16" cy="18" rx="6" ry="1.5" fill="#f04a4a" opacity="0.6" />
        <ellipse cx="13" cy="22" rx="2" ry="3" fill="#ff7a7a" opacity="0.75" />
        {(isUltimate || isSupreme) && (
          <path d="M8.5 18 Q16 20.5 23.5 18" stroke="#ffd700" strokeWidth="1.2" fill="none" />
        )}
        {renderStackCount(count)}
      </svg>
    );
  }

  // 5. MANA POTIONS (Classic Blue Flask with Golden/Silver ring)
  if (lowerName.includes('mana potion') || id === 7620 || id === 7589 || id === 7590 || id === 26029) {
    const isUltimate = id === 26029 || lowerName.includes('ultimate');
    const count = stackCount ?? 1;

    return (
      <svg width={size} height={size} viewBox="0 0 32 32" className={`tibia11-icon potion-mana ${className}`}>
        <rect width="32" height="32" fill="#0d1217" />
        <rect x="13" y="4" width="6" height="3.5" rx="1" fill="#7a858c" stroke="#a4b3bd" strokeWidth="0.8" />
        <rect x="12" y="7" width="8" height="2" rx="0.8" fill={isUltimate ? '#ffd700' : '#8d9da8'} />
        <path
          d="M12 9 L8 17 C7 22, 10 27, 16 27 C22 27, 25 22, 24 17 L20 9 Z"
          fill="#0e3d6e"
          stroke={isUltimate ? '#ffd700' : '#2272ba'}
          strokeWidth="1.2"
        />
        <path
          d="M9.5 17.5 C9.5 22.5, 12 26, 16 26 C20 26, 22.5 22.5, 22.5 17.5 C20.5 18.5, 11.5 18.5, 9.5 17.5 Z"
          fill="#1c75cc"
        />
        <ellipse cx="16" cy="18" rx="6" ry="1.5" fill="#4fa8fa" opacity="0.6" />
        <ellipse cx="13" cy="22" rx="2" ry="3" fill="#8ed0ff" opacity="0.75" />
        {isUltimate && (
          <path d="M8.5 18 Q16 20.5 23.5 18" stroke="#ffd700" strokeWidth="1.2" fill="none" />
        )}
        {renderStackCount(count)}
      </svg>
    );
  }

  // 6. GOLD TOKEN / BADGE (F8 in screenshot: Golden coin with number 9)
  if (lowerName.includes('token') || lowerName.includes('coin') || id === 8888) {
    const tokenVal = stackCount ?? 9;
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" className={`tibia11-icon token-gold ${className}`}>
        <rect width="32" height="32" fill="#1b1c1e" />
        <circle cx="16" cy="16" r="10" fill="#2a220a" />
        <circle cx="16" cy="16" r="9" fill="#f7be23" stroke="#876008" strokeWidth="1.5" />
        <circle cx="16" cy="16" r="7.5" fill="none" stroke="#d49b0e" strokeWidth="0.8" />
        <text
          x="16"
          y="20"
          textAnchor="middle"
          fill="#171203"
          fontSize="11"
          fontFamily="Arial, sans-serif"
          fontWeight="900"
        >
          {tokenVal}
        </text>
      </svg>
    );
  }

  // 7. FIRE SPELLS (Flame Strike, Fire Wave, Hell's Core)
  if (lowerName.includes('flam') || lowerName.includes('fire') || id === 2304) {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" className={`tibia11-icon spell-fire ${className}`}>
        <rect width="32" height="32" fill="#210a06" />
        <ellipse cx="16" cy="18" rx="11" ry="11" fill="#e84013" opacity="0.5" />
        <path d="M16 4 C19 10, 26 14, 23 22 C20 27, 12 28, 9 22 C6 16, 12 13, 14 9 Z" fill="#ff6a19" />
        <path d="M16 11 C18 15, 22 17, 20 22 C19 24, 13 25, 12 22 C11 20, 13 18, 15 15 Z" fill="#ffed54" />
        <circle cx="16" cy="19" r="3" fill="#ffffff" />
        {showCastBadge && renderCastBadge()}
      </svg>
    );
  }

  // 8. ENERGY SPELLS (Energy Strike, Energy Wave, Rage of the Skies)
  if (lowerName.includes('vis') || lowerName.includes('energy')) {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" className={`tibia11-icon spell-energy ${className}`}>
        <rect width="32" height="32" fill="#091424" />
        <ellipse cx="16" cy="16" rx="10" ry="10" fill="#2d7ae6" opacity="0.4" />
        <path d="M18 3 L8 16 L15 16 L11 29 L24 14 L17 14 Z" fill="#69b8ff" stroke="#ffffff" strokeWidth="1" />
        <circle cx="15" cy="15" r="2.5" fill="#ffffff" />
        {showCastBadge && renderCastBadge()}
      </svg>
    );
  }

  // 9. BERSERK / PHYSICAL SPELLS (Exori, Exori Gran, Exori Mas)
  if (lowerName.includes('exori') || lowerName.includes('berserk')) {
    const isGran = lowerName.includes('gran');
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" className={`tibia11-icon spell-berserk ${className}`}>
        <rect width="32" height="32" fill="#240c0c" />
        <circle cx="16" cy="16" r="10" fill="#801c1c" opacity="0.5" />
        <path d="M6 16 C9 8, 22 7, 26 15 C21 14, 14 17, 11 22 C9 19, 7 18, 6 16 Z" fill="#ff4242" stroke="#ffb8b8" strokeWidth="0.8" />
        {isGran && (
          <path d="M26 16 C23 24, 10 25, 6 17 C11 18, 18 15, 21 10 C23 13, 25 14, 26 16 Z" fill="#ff8533" stroke="#ffd9b3" strokeWidth="0.8" />
        )}
        <circle cx="16" cy="16" r="2.5" fill="#ffffff" />
        {showCastBadge && renderCastBadge()}
      </svg>
    );
  }

  // 10. HASTE (Utani Hur, Utani Gran Hur)
  if (lowerName.includes('haste') || lowerName.includes('utani')) {
    const isGran = lowerName.includes('gran');
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" className={`tibia11-icon spell-haste ${className}`}>
        <rect width="32" height="32" fill="#0d1c12" />
        <path d="M8 12 L13 12 L15 19 L23 19 C25 19, 26 21, 25 23 L22 24 L10 24 C8 24, 7 23, 7 21 Z" fill={isGran ? '#ffd84a' : '#6fe696'} stroke="#ffffff" strokeWidth="0.8" />
        <path d="M14 11 C18 8, 23 9, 26 12 C23 13, 18 13, 15 15 Z" fill={isGran ? '#fff1b8' : '#bbfce0'} />
        <path d="M13 14 C16 12, 20 13, 22 15 C19 16, 16 16, 14 17 Z" fill="#ffffff" />
        {showCastBadge && renderCastBadge()}
      </svg>
    );
  }

  // 11. SUDDEN DEATH RUNE (ID 2268)
  if (id === 2268 || lowerName.includes('sudden death')) {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" className={`tibia11-icon rune-sd ${className}`}>
        <rect width="32" height="32" fill="#120e17" />
        <circle cx="16" cy="16" r="10" fill="#692294" opacity="0.6" />
        <path d="M11 11 C11 7, 21 7, 21 11 C21 15, 18 17, 18 19 L14 19 C14 17, 11 15, 11 11 Z" fill="#caa1ed" />
        <circle cx="13.5" cy="12" r="1.5" fill="#141117" />
        <circle cx="18.5" cy="12" r="1.5" fill="#141117" />
        <rect x="13.5" y="19.5" width="5" height="3" rx="1" fill="#ab76d4" />
        {renderStackCount(stackCount ?? 1)}
      </svg>
    );
  }

  // DEFAULT / UNKNOWN ACTION
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={`tibia11-icon action-generic ${className}`}>
      <rect width="32" height="32" fill="#1c211e" />
      <polygon points="16,7 23,21 9,21" fill="#8da394" stroke="#d5e0d8" strokeWidth="0.8" />
      <circle cx="16" cy="16" r="3" fill="#ffffff" />
      {showCastBadge && renderCastBadge()}
    </svg>
  );
}
