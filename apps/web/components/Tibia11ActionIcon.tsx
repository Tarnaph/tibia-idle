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

export const ALL_SPELL_ICON_URLS: string[] = [
  '/spells/exura.png',
  '/spells/exura-gran.png',
  '/spells/exura-vita.png',
  '/spells/exura-sio.png',
  '/spells/exura-san.png',
  '/spells/exura-ico.png',
  '/spells/exana-mort.png',
  '/spells/exori.png',
  '/spells/exori-ico.png',
  '/spells/exori-gran.png',
  '/spells/exori-mas.png',
  '/spells/exori-hur.png',
  '/spells/exori-min.png',
  '/spells/exori-vis.png',
  '/spells/exori-flam.png',
  '/spells/exori-frigo.png',
  '/spells/exori-tera.png',
  '/spells/exori-mort.png',
  '/spells/exori-san.png',
  '/spells/energy-beam.png',
  '/spells/exori-min-flam.png',
  '/spells/exori-gran-flam.png',
  '/spells/exori-max-flam.png',
  '/spells/exori-gran-vis.png',
  '/spells/exori-max-vis.png',
  '/spells/exori-gran-tera.png',
  '/spells/exori-max-tera.png',
  '/spells/exori-gran-frigo.png',
  '/spells/exori-max-frigo.png',
  '/spells/exevo-vis-lux.png',
  '/spells/exevo-gran-vis-lux.png',
  '/spells/exevo-gran-frigo-hur.png',
  '/spells/3g.png',
  '/spells/3h.png',
  '/spells/3i.png',
  '/spells/3j.png',
  '/spells/3l.png',
  '/spells/4g.png',
  '/spells/4h.png',
  '/spells/4j.png',
  '/spells/2g.png',
  '/spells/2h.png',
  '/spells/2i.png',
  '/spells/utamo-vita.png',
  '/spells/utani-hur.png',
  '/spells/utani-gran-hur.png',
  '/spells/utito-tempo.png',
  '/spells/exeta-res.png',
  '/spells/exevo-vis-hur.png',
  '/spells/exevo-flam-hur.png',
  '/spells/exevo-frigo-hur.png',
  '/spells/exevo-tera-hur.png',
  '/spells/exevo-gran-mas-flam.png',
  '/spells/exevo-gran-mas-frigo.png',
  '/spells/exevo-gran-mas-vis.png',
  '/spells/exevo-gran-mas-tera.png',
  '/spells/exevo-mas-san.png',
  '/runes/sudden-death-rune.png',
  '/runes/great-fireball-rune.png',
  '/runes/avalanche-rune.png',
  '/runes/heavy-magic-missile-rune.png',
  '/runes/light-magic-missile-rune.png',
  '/runes/explosion-rune.png',
  '/runes/ultimate-healing-rune.png',
  '/runes/fireball-rune.png',
  '/runes/icicle-rune.png',
  '/runes/stone-shower-rune.png',
  '/runes/thunderstorm-rune.png',
  '/runes/magic-wall-rune.png',
  '/runes/wild-growth-rune.png',
  '/runes/paralyze-rune.png',
  '/runes/holy-missile-rune.png',
  '/runes/stalagmite-rune.png',
  '/runes/destroy-field-rune.png',
  '/runes/desintegrate-rune.png',
  '/runes/convince-creature-rune.png',
  '/runes/chameleon-rune.png',
  '/runes/animate-dead-rune.png',
  '/runes/cure-poison-rune.png',
  '/runes/intense-healing-rune.png',
  '/runes/energy-field-rune.png',
  '/runes/energy-wall-rune.png',
  '/runes/energy-bomb-rune.png',
  '/runes/fire-field-rune.png',
  '/runes/fire-wall-rune.png',
  '/runes/fire-bomb-rune.png',
  '/runes/poison-field-rune.png',
  '/runes/poison-wall-rune.png',
  '/runes/poison-bomb-rune.png',
  '/runes/soulfire-rune.png',
  '/runes/blank-rune.png',
  '/potions/small-health-potion.png',
  '/potions/health-potion.png',
  '/potions/strong-health-potion.png',
  '/potions/great-health-potion.png',
  '/potions/ultimate-health-potion.png',
  '/potions/supreme-health-potion.png',
  '/potions/small-mana-potion.png',
  '/potions/mana-potion.png',
  '/potions/strong-mana-potion.png',
  '/potions/great-mana-potion.png',
  '/potions/ultimate-mana-potion.png',
  '/potions/great-spirit-potion.png',
  '/potions/ultimate-spirit-potion.png',
  '/potions/antidote-potion.png',
  '/potions/berserk-potion.png',
  '/potions/mastermind-potion.png',
  '/potions/bullseye-potion.png',
  '/potions/empty-potion-flask.png',
  ...Array.from({ length: 146 }, (_, i) => `/spells/canonical/spell-${i}.png`),
];

/**
 * Resolves an action to an authentic official CipSoft image path extracted in Phase 20 / Phase 91 / Phase 93 / Phase 94
 */
export function resolveActionImagePath(id?: number | string, kind?: string, name?: string): string | null {
  const numId = typeof id === 'number' ? id : typeof id === 'string' && !isNaN(Number(id)) && id.trim() !== '' ? Number(id) : undefined;
  const lower = (name || '').toLowerCase();

  // 1. Potions (Authentic transparent flacons from Tibia 10.98 client)
  if (kind === 'potion' || lower.includes('potion') || lower.includes('flask')) {
    if (numId === 26031 || lower.includes('supreme health') || (numId === undefined && lower.includes('supreme') && !lower.includes('mana') && !lower.includes('spirit'))) return '/potions/supreme-health-potion.png';
    if (lower.includes('spirit') || numId === 8472 || numId === 26030) {
      if (numId === 26030 || lower.includes('ultimate') || lower.includes('supreme')) return '/potions/ultimate-spirit-potion.png';
      return '/potions/great-spirit-potion.png';
    }
    if (lower.includes('mana') || numId === 7620 || numId === 7589 || numId === 7590 || numId === 26029) {
      if (numId === 26029 || lower.includes('ultimate') || lower.includes('supreme')) return '/potions/ultimate-mana-potion.png';
      if (numId === 7590 || lower.includes('great')) return '/potions/great-mana-potion.png';
      if (numId === 7589 || lower.includes('strong')) return '/potions/strong-mana-potion.png';
      if (lower.includes('small')) return '/potions/small-mana-potion.png';
      return '/potions/mana-potion.png';
    }
    if (numId === 8474 || numId === 10089 || lower.includes('antidote')) return '/potions/antidote-potion.png';
    if (numId === 7439 || lower.includes('berserk')) return '/potions/berserk-potion.png';
    if (numId === 7440 || lower.includes('mastermind')) return '/potions/mastermind-potion.png';
    if (numId === 7443 || lower.includes('bullseye')) return '/potions/bullseye-potion.png';
    if (numId === 7634) return '/potions/empty-potion-flask-small.png';
    if (numId === 7635) return '/potions/empty-potion-flask-medium.png';
    if (numId === 7636 || lower.includes('flask')) return '/potions/empty-potion-flask.png';

    // Health Potions
    if (numId === 8473 || lower.includes('ultimate')) return '/potions/ultimate-health-potion.png';
    if (numId === 7591 || lower.includes('great')) return '/potions/great-health-potion.png';
    if (numId === 7588 || lower.includes('strong')) return '/potions/strong-health-potion.png';
    if (numId === 8704 || lower.includes('small')) return '/potions/small-health-potion.png';
    return '/potions/health-potion.png';
  }

  // 2. Runes (Authentic Tibia 10.98 Rune Item Sprites)
  if (kind === 'rune' || (numId !== undefined && numId >= 2260 && numId <= 2316) || lower.includes('rune')) {
    if (numId === 2268 || lower.includes('sudden death')) return '/runes/sudden-death-rune.png';
    if (numId === 2304 || lower.includes('great fireball')) return '/runes/great-fireball-rune.png';
    if (numId === 2274 || lower.includes('avalanche')) return '/runes/avalanche-rune.png';
    if (numId === 2311 || lower.includes('heavy magic missile')) return '/runes/heavy-magic-missile-rune.png';
    if (numId === 2287 || lower.includes('light magic missile')) return '/runes/light-magic-missile-rune.png';
    if (numId === 2313 || lower.includes('explosion')) return '/runes/explosion-rune.png';
    if (numId === 2273 || lower.includes('ultimate healing rune') || (lower.includes('ultimate healing') && kind === 'rune')) return '/runes/ultimate-healing-rune.png';
    if (numId === 2265 || lower.includes('intense healing rune')) return '/runes/intense-healing-rune.png';
    if (numId === 2266 || lower.includes('cure poison rune')) return '/runes/cure-poison-rune.png';
    if (numId === 2302 || lower.includes('fireball rune') || lower === 'fireball') return '/runes/fireball-rune.png';
    if (numId === 2271 || lower.includes('icicle')) return '/runes/icicle-rune.png';
    if (numId === 2288 || lower.includes('stone shower')) return '/runes/stone-shower-rune.png';
    if (numId === 2315 || lower.includes('thunderstorm')) return '/runes/thunderstorm-rune.png';
    if (numId === 2293 || lower.includes('magic wall')) return '/runes/magic-wall-rune.png';
    if (numId === 2269 || lower.includes('wild growth')) return '/runes/wild-growth-rune.png';
    if (numId === 2278 || lower.includes('paralyze')) return '/runes/paralyze-rune.png';
    if (numId === 2295 || lower.includes('holy missile')) return '/runes/holy-missile-rune.png';
    if (numId === 2292 || lower.includes('stalagmite')) return '/runes/stalagmite-rune.png';
    if (numId === 2261 || lower.includes('destroy field')) return '/runes/destroy-field-rune.png';
    if (numId === 2310 || lower.includes('desintegrate')) return '/runes/desintegrate-rune.png';
    if (numId === 2290 || lower.includes('convince creature')) return '/runes/convince-creature-rune.png';
    if (numId === 2291 || lower.includes('chameleon')) return '/runes/chameleon-rune.png';
    if (numId === 2316 || lower.includes('animate dead')) return '/runes/animate-dead-rune.png';
    if (numId === 2308 || lower.includes('soulfire')) return '/runes/soulfire-rune.png';
    if (numId === 2301 || lower.includes('fire field')) return '/runes/fire-field-rune.png';
    if (numId === 2303 || lower.includes('fire wall')) return '/runes/fire-wall-rune.png';
    if (numId === 2305 || lower.includes('fire bomb')) return '/runes/fire-bomb-rune.png';
    if (numId === 2277 || lower.includes('energy field')) return '/runes/energy-field-rune.png';
    if (numId === 2279 || lower.includes('energy wall')) return '/runes/energy-wall-rune.png';
    if (numId === 2262 || lower.includes('energy bomb')) return '/runes/energy-bomb-rune.png';
    if (numId === 2285 || lower.includes('poison field')) return '/runes/poison-field-rune.png';
    if (numId === 2289 || lower.includes('poison wall')) return '/runes/poison-wall-rune.png';
    if (numId === 2286 || lower.includes('poison bomb')) return '/runes/poison-bomb-rune.png';
    if (numId === 2260 || lower.includes('blank rune')) return '/runes/blank-rune.png';

    if (numId !== undefined && numId >= 2260 && numId <= 2316) {
      return `/runes/item-${numId}.png`;
    }
  }

  // 3. Spells (Mapped to official CipSoft Spell Icons)
  // Healing
  if (lower.includes('mas res') || lower.includes('mass healing') || id === 82 || id === 7) return '/spells/exura-gran-mas-res.png';
  if (lower.includes('exura gran san') || lower.includes('salvation')) return '/spells/exura-gran-san.png';
  if (lower.includes('exura san') || lower.includes('divine healing') || id === 125) return '/spells/exura-san.png';
  if (lower.includes('exura gran ico') || lower.includes('intense wound cleansing')) return '/spells/exura-gran-ico.png';
  if (lower.includes('exura ico') || lower.includes('wound cleansing') || id === 123) return '/spells/exura-ico.png';
  if (lower.includes('exura vita') || lower.includes('ultimate healing') || id === 3) return '/spells/exura-vita.png';
  if (lower.includes('exura gran') || lower.includes('intense healing') || id === 2) return '/spells/exura-gran.png';
  if (lower.includes('exura sio') || lower.includes('heal friend') || id === 84 || id === 4) return '/spells/exura-sio.png';
  if (lower.includes('exura') || lower.includes('light healing') || id === 1) return '/spells/exura.png';

  // Support & Haste
  if (lower.includes('strong haste') || lower.includes('utani gran hur') || id === 39 || id === 17) return '/spells/utani-gran-hur.png';
  if (lower.includes('haste') || lower.includes('utani hur') || id === 6 || id === 16) return '/spells/utani-hur.png';
  if (lower.includes('charge') || lower.includes('utani tempo hur') || id === 131) return '/spells/utani-tempo-hur.png';
  if (lower.includes('magic shield') || lower.includes('utamo vita') || id === 44 || id === 18) return '/spells/utamo-vita.png';
  if (lower.includes('sharpshooter') || lower.includes('utito tempo san')) return '/spells/utito-tempo-san.png';
  if (lower.includes('swift foot') || lower.includes('utamo tempo san')) return '/spells/utamo-tempo-san.png';
  if (lower.includes('blood rage') || lower.includes('utito tempo') || id === 133 || id === 15) return '/spells/utito-tempo.png';
  if (lower.includes('protector') || lower.includes('utamo tempo') || id === 132) return '/spells/utamo-tempo.png';
  if (lower.includes('invisible') || lower.includes('utana vid') || id === 45) return '/spells/utana-vid.png';
  if (lower.includes('challenge') || lower.includes('exeta res') || id === 93 || id === 8) return '/spells/exeta-res.png';

  // Sorcerer & Master Sorcerer - Specific Strikes (Check Ultimate & Strong first to prevent prefix collisions)
  if (lower.includes("apprentice's strike") || lower.includes("apprentice strike") || lower.includes("exori min flam") || id === 169) return '/spells/exori-min-flam.png';

  if (lower.includes('ultimate flame strike') || lower.includes('exori max flam') || id === 154) return '/spells/exori-max-flam.png';
  if (lower.includes('strong flame strike') || lower.includes('exori gran flam') || id === 150) return '/spells/exori-gran-flam.png';
  if (lower === 'flame strike' || lower.includes('exori flam') || id === 89) return '/spells/exori-flam.png';

  if (lower.includes('ultimate energy strike') || lower.includes('exori max vis') || id === 155) return '/spells/exori-max-vis.png';
  if (lower.includes('strong energy strike') || lower.includes('exori gran vis') || id === 151) return '/spells/exori-gran-vis.png';
  if (lower === 'energy strike' || lower.includes('exori vis') || id === 88) return '/spells/exori-vis.png';

  if (lower.includes('ultimate ice strike') || lower.includes('exori max frigo') || id === 156) return '/spells/exori-max-frigo.png';
  if (lower.includes('strong ice strike') || lower.includes('exori gran frigo') || id === 152) return '/spells/exori-gran-frigo.png';
  if (lower === 'ice strike' || lower.includes('exori frigo') || id === 112) return '/spells/exori-frigo.png';

  if (lower.includes('ultimate terra strike') || lower.includes('exori max tera') || id === 157) return '/spells/exori-max-tera.png';
  if (lower.includes('strong terra strike') || lower.includes('exori gran tera') || id === 153) return '/spells/exori-gran-tera.png';
  if (lower === 'terra strike' || lower.includes('exori tera') || id === 113) return '/spells/exori-tera.png';

  if (lower.includes('death strike') || lower.includes('exori mort') || id === 87) return '/spells/exori-mort.png';
  if (lower.includes('physical strike') || lower.includes('exori moe ico') || id === 148) return '/spells/physical-strike.png';

  // Knight Strikes
  if (lower.includes('annihilation') || lower.includes('exori gran ico') || id === 62) return '/spells/exori-gran-ico.png';
  if (lower.includes('exori gran') || lower.includes('fierce berserk') || id === 105) return '/spells/exori-gran.png';
  if (lower.includes('exori mas') || lower.includes('groundshaker') || id === 106) return '/spells/exori-mas.png';
  if (lower.includes('exori ico') || lower.includes('brutal strike') || id === 61) return '/spells/exori-ico.png';
  if (lower.includes('exori hur') || lower.includes('whirlwind') || id === 107) return '/spells/exori-hur.png';
  if (lower.includes('exori min') || lower.includes('front sweep') || lower.includes('lesser front sweep') || id === 59) return '/spells/exori-min.png';
  if (lower.includes('exori') || lower.includes('berserk') || id === 80) return '/spells/exori.png';

  // Beams & Waves
  if (lower.includes('great energy beam') || lower.includes('exevo gran vis lux') || id === 23) return '/spells/exevo-gran-vis-lux.png';
  if (lower.includes('energy beam') || lower.includes('exevo vis lux') || id === 22) return '/spells/exevo-vis-lux.png';

  if (lower.includes('great fire wave') || lower.includes('exevo gran flam hur') || id === 201) return '/spells/exevo-gran-flam-hur.png';
  if (lower.includes('fire wave') || lower.includes('flam hur') || id === 19 || id === 20) return '/spells/exevo-flam-hur.png';

  if (lower.includes('ultimate ice wave') || lower.includes('exevo gran frigo hur') || id === 43) return '/spells/exevo-gran-frigo-hur.png';
  if (lower.includes('ice wave') || lower.includes('frigo hur') || id === 121 || id === 23) return '/spells/exevo-frigo-hur.png';

  if (lower.includes('energy wave') || lower.includes('vis hur') || id === 13 || id === 26) return '/spells/exevo-vis-hur.png';
  if (lower.includes('terra wave') || lower.includes('tera hur') || id === 120 || id === 29) return '/spells/exevo-tera-hur.png';

  // Ultimate Area Spells
  if (lower.includes("hell's core") || lower.includes('hells core') || lower.includes('exevo gran mas flam') || id === 24 || id === 21) return '/spells/exevo-gran-mas-flam.png';
  if (lower.includes('rage of the skies') || lower.includes('exevo gran mas vis') || id === 119 || id === 27) return '/spells/exevo-gran-mas-vis.png';
  if (lower.includes('eternal winter') || lower.includes('exevo gran mas frigo') || id === 118 || id === 24) return '/spells/exevo-gran-mas-frigo.png';
  if (lower.includes('wrath of nature') || lower.includes('exevo gran mas tera') || id === 56 || id === 30) return '/spells/exevo-gran-mas-tera.png';

  if (lower.includes('divine caldera') || lower.includes('mas san') || id === 124 || id === 32) return '/spells/exevo-mas-san.png';
  if (lower.includes('holy strike') || lower.includes('divine missile') || lower.includes('exori san') || id === 122 || id === 31) return '/spells/exori-san.png';
  if (lower.includes('strong ethereal spear') || lower.includes('exori gran con')) return '/spells/exori-gran-con.png';
  if (lower.includes('ethereal spear') || lower.includes('exori con')) return '/spells/exori-con.png';
  if (lower.includes('holy flash') || lower.includes('utori san')) return '/spells/utori-san.png';

  if (lower.includes('exana pox') || id === 29 || id === 33) return '/spells/exana-pox.png';
  if (lower.includes('exana flam') || id === 145 || id === 34) return '/spells/exana-flam.png';
  if (lower.includes('exana vis') || id === 146 || id === 35) return '/spells/exana-vis.png';
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
