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

/**
 * Resolves an action to an authentic official CipSoft image path extracted in Phase 20
 */
export function resolveActionImagePath(id: number, kind?: string, name: string = ''): string | null {
  const lower = name.toLowerCase();

  // 1. Potions (Authentic transparent flacons)
  if (kind === 'potion' || lower.includes('potion')) {
    if (id === 26031 || lower.includes('supreme')) return '/potions/supreme-health-potion.png';
    if (lower.includes('spirit') || id === 8472 || id === 26030) {
      if (id === 26030 || lower.includes('ultimate')) return '/potions/ultimate-spirit-potion.png';
      return '/potions/great-spirit-potion.png';
    }
    if (lower.includes('mana') || id === 7620 || id === 7589 || id === 7590 || id === 26029) {
      if (id === 26029 || lower.includes('ultimate')) return '/potions/ultimate-mana-potion.png';
      if (id === 7590 || lower.includes('great')) return '/potions/great-mana-potion.png';
      if (id === 7589 || lower.includes('strong')) return '/potions/strong-mana-potion.png';
      return '/potions/small-mana-potion.png';
    }
    // Health Potions
    if (id === 8473 || lower.includes('ultimate')) return '/potions/ultimate-health-potion.png';
    if (id === 7591 || lower.includes('great')) return '/potions/great-health-potion.png';
    if (id === 7588 || lower.includes('strong')) return '/potions/strong-health-potion.png';
    return '/potions/small-health-potion.png';
  }

  // 2. Runes (Authentic CipSoft Rune/Spell Icons)
  if (id === 2268 || lower.includes('sudden death')) return '/spells/sd-rune.png';
  if (id === 2313 || lower.includes('explosion')) return '/spells/explosion-rune.png';
  if (id === 2304 || lower.includes('great fireball')) return '/spells/gfb-rune.png';
  if (id === 2287 || lower.includes('light magic missile') || lower.includes('heavy magic missile')) return '/spells/hmm-rune.png';
  if (id === 2274 || lower.includes('avalanche')) return '/spells/ice-storm.png';

  // 3. Spells (Mapped to the 60 official CipSoft Spell Icons)
  if (lower.includes('exura vita') || lower.includes('ultimate healing') || id === 3) return '/spells/exura-vita.png';
  if (lower.includes('exura gran') || lower.includes('intense healing') || id === 2) return '/spells/exura-gran.png';
  if (lower.includes('exura sio') || lower.includes('heal friend') || id === 4) return '/spells/exura-sio.png';
  if (lower.includes('mas res') || lower.includes('mass healing') || id === 7) return '/spells/exura-gran-mas-res.png';
  if (lower.includes('exura san') || lower.includes('divine healing') || id === 6) return '/spells/exura-san.png';
  if (lower.includes('wound') || lower.includes('exana mort') || id === 5) return '/spells/exana-mort.png';
  if (lower.includes('exura') || lower.includes('light healing') || id === 1) return '/spells/exura.png';

  if (lower.includes('exori gran') || lower.includes('fierce berserk') || id === 10) return '/spells/exori-gran.png';
  if (lower.includes('exori mas') || lower.includes('groundshaker') || id === 12) return '/spells/exori-mas.png';
  if (lower.includes('exori ico') || lower.includes('brutal strike') || id === 11) return '/spells/exori-ico.png';
  if (lower.includes('exori hur') || lower.includes('whirlwind') || id === 13) return '/spells/exori-hur.png';
  if (lower.includes('exori min') || lower.includes('front sweep') || id === 14) return '/spells/exori-min.png';
  if (lower.includes('exori') || lower.includes('berserk') || id === 9) return '/spells/exori.png';

  if (lower.includes('blood rage') || lower.includes('utito tempo') || id === 15) return '/spells/utito-tempo.png';
  if (lower.includes('charge') || lower.includes('swift foot') || lower.includes('tempo hur')) return '/spells/utani-tempo-hur.png';
  if (lower.includes('strong haste') || lower.includes('gran hur') || id === 17) return '/spells/utani-gran-hur.png';
  if (lower.includes('haste') || lower.includes('utani hur') || id === 16) return '/spells/utani-hur.png';
  if (lower.includes('magic shield') || lower.includes('utamo vita') || id === 18) return '/spells/utamo-vita.png';
  if (lower.includes('invisible') || lower.includes('utana vid')) return '/spells/utana-vid.png';
  if (lower.includes('challenge') || lower.includes('exeta res') || id === 8) return '/spells/exeta-res.png';

  if (lower.includes('hell') || lower.includes('mas flam') || id === 21) return '/spells/exevo-gran-mas-flam.png';
  if (lower.includes('fire wave') || lower.includes('flam hur') || id === 20) return '/spells/exevo-flam-hur.png';
  if (lower.includes('flame strike') || lower.includes('exori flam') || id === 19) return '/spells/exori-flam.png';

  if (lower.includes('eternal winter') || lower.includes('mas frigo') || id === 24) return '/spells/exevo-gran-mas-frigo.png';
  if (lower.includes('ice wave') || lower.includes('frigo hur') || id === 23) return '/spells/exevo-frigo-hur.png';
  if (lower.includes('ice strike') || lower.includes('exori frigo') || id === 22) return '/spells/exori-frigo.png';

  if (lower.includes('rage of the skies') || lower.includes('mas vis') || id === 27) return '/spells/exevo-gran-mas-vis.png';
  if (lower.includes('energy wave') || lower.includes('vis hur') || id === 26) return '/spells/exevo-vis-hur.png';
  if (lower.includes('energy strike') || lower.includes('exori vis') || id === 25) return '/spells/exori-vis.png';

  if (lower.includes('wrath of nature') || lower.includes('mas tera') || id === 30) return '/spells/exevo-gran-mas-tera.png';
  if (lower.includes('terra wave') || lower.includes('tera hur') || id === 29) return '/spells/exevo-tera-hur.png';
  if (lower.includes('terra strike') || lower.includes('exori tera') || id === 28) return '/spells/exori-tera.png';

  if (lower.includes('divine caldera') || lower.includes('mas san') || id === 32) return '/spells/exevo-mas-san.png';
  if (lower.includes('holy strike') || lower.includes('exori san') || id === 31) return '/spells/exori-san.png';

  if (lower.includes('exana pox') || id === 33) return '/spells/exana-pox.png';
  if (lower.includes('exana flam') || id === 34) return '/spells/exana-flam.png';
  if (lower.includes('exana vis') || id === 35) return '/spells/exana-vis.png';
  if (lower.includes('exana frigo') || id === 36) return '/spells/exana-frigo.png';
  if (lower.includes('exana kor') || id === 37) return '/spells/exana-kor.png';

  return null;
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
  const officialImagePath = resolveActionImagePath(id, kind, name);

  // Helper for rendering the Cast Mode badge (Wizard hat / target icon at bottom-right)
  const renderCastBadgeSvg = () => (
    <svg width="12" height="12" viewBox="0 0 12 12" className="tibia11-cast-badge-icon" style={{ position: 'absolute', bottom: 1, right: 1, zIndex: 6, pointerEvents: 'none' }}>
      <circle cx="6" cy="6" r="5" fill="#141c26" stroke="#2c3f56" strokeWidth="0.8" />
      <path d="M6 3 L3.5 8 L8.5 8 Z" fill="#69aff0" />
      <ellipse cx="6" cy="8" rx="3" ry="0.8" fill="#9ed0ff" />
      <circle cx="6" cy="5" r="0.8" fill="#ffffff" />
    </svg>
  );

  // Helper for rendering stack count in bottom-right
  const renderStackCount = (count: number) => (
    <span
      className="tibia11-icon-stack"
      style={{
        position: 'absolute',
        bottom: 1,
        right: 2,
        fontFamily: 'Tahoma, Verdana, monospace',
        fontSize: '9px',
        fontWeight: 900,
        color: '#ffffff',
        textShadow: '1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000',
        zIndex: 6,
        pointerEvents: 'none',
      }}
    >
      {count}
    </span>
  );

  // If official image is resolved, render pixel-crisp PNG image!
  if (officialImagePath) {
    return (
      <div
        className={`tibia11-icon-container ${className}`}
        style={{
          position: 'relative',
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <img
          src={officialImagePath}
          alt={name || `Action ${id}`}
          width={size}
          height={size}
          className="tibia11-official-sprite"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            imageRendering: 'pixelated',
            display: 'block',
          }}
          loading="eager"
        />
        {showCastBadge && renderCastBadgeSvg()}
        {stackCount !== undefined && renderStackCount(stackCount)}
      </div>
    );
  }

  // Token / Gold Coin (F8)
  const lowerName = name.toLowerCase();
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

  // Fallback generic action icon
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={`tibia11-icon action-generic ${className}`}>
      <rect width="32" height="32" fill="#1c211e" />
      <polygon points="16,7 23,21 9,21" fill="#8da394" stroke="#d5e0d8" strokeWidth="0.8" />
      <circle cx="16" cy="16" r="3" fill="#ffffff" />
      {showCastBadge && renderCastBadgeSvg()}
      {stackCount !== undefined && renderStackCount(stackCount)}
    </svg>
  );
}
