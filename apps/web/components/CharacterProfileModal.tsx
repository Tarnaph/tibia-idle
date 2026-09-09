'use client';

import React, { useState, useMemo } from 'react';
import type { CharacterState, GameContent } from '@/packages/domain/src/types';
import type { EquipmentDefinition, VocationDefinition } from '@/packages/content-schema/src';
import { deriveStats } from '@/packages/domain/src/derivedStats';
import { experienceForLevel, experienceProgress } from '@/packages/domain/src/experience';
import { skillProgress } from '@/packages/domain/src/training';
import { calculatePlayerSpeed } from '@/packages/domain/src/progression/speed';
import { characterCapacity } from '@/packages/domain/src/equipment';
import type { TrainableSkill } from '@/packages/domain/src/types';

export interface AvatarItem {
  id: number;
  name: string;
  vocation: string;
  image: string;
  description: string;
}

export const AVAILABLE_AVATARS: AvatarItem[] = [
  { id: 1, name: 'Cavaleiro de Aço', vocation: 'Knight', image: '/images/avatars/avatar-1.svg', description: 'Guerreiro de elmo forjado e brasão imperial.' },
  { id: 2, name: 'Mago Arcano', vocation: 'Sorcerer', image: '/images/avatars/avatar-2.svg', description: 'Conjurador sombrio envolto em runas místicas.' },
  { id: 3, name: 'Guardião Élfico', vocation: 'Paladin', image: '/images/avatars/avatar-3.svg', description: 'Atirador ágil da floresta com olhar penetrante.' },
  { id: 4, name: 'Arquidruida Ancestral', vocation: 'Druid', image: '/images/avatars/avatar-4.svg', description: 'Protetor dos bosques com chifres sagrados da natureza.' },
  { id: 5, name: 'Lorde de Thais', vocation: 'Champion', image: '/images/avatars/avatar-5.svg', description: 'Nobre paladino coroado em ouro e rubis do reino.' },
];

export interface CharacterProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  characters: CharacterState[];
  selectedCharacterId?: string;
  onSelectCharacter?: (characterId: string) => void;
  onOpenOutfit?: () => void;
  content: GameContent;
  avatarId?: number;
  onSelectAvatar?: (avatarId: number) => void;
}

export function CharacterProfileModal({
  isOpen,
  onClose,
  characters,
  selectedCharacterId,
  onSelectCharacter,
  onOpenOutfit,
  content,
  avatarId = 1,
  onSelectAvatar,
}: CharacterProfileModalProps) {
  const [activeTab, setActiveTab] = useState<'personagem' | 'outfit'>('personagem');
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);

  // Character switching within squad/account
  const selectedIndex = useMemo(() => {
    if (!characters || characters.length === 0) return 0;
    const idx = characters.findIndex((c) => c.id === selectedCharacterId);
    return idx >= 0 ? idx : 0;
  }, [characters, selectedCharacterId]);

  const activeChar = characters[selectedIndex] || characters[0];

  const handlePrevChar = () => {
    if (characters.length <= 1) return;
    const nextIdx = (selectedIndex - 1 + characters.length) % characters.length;
    onSelectCharacter?.(characters[nextIdx].id);
  };

  const handleNextChar = () => {
    if (characters.length <= 1) return;
    const nextIdx = (selectedIndex + 1) % characters.length;
    onSelectCharacter?.(characters[nextIdx].id);
  };

  if (!isOpen || !activeChar) return null;

  // Derived stats & Calculations
  const vocationDef = content.vocations.find((v) => v.name.toLowerCase() === activeChar.vocation.toLowerCase()) || content.vocations[0];
  const derived = deriveStats(activeChar, content.equipment, vocationDef);
  const playerSpeed = calculatePlayerSpeed(activeChar.level);
  const totalCapacity = characterCapacity(activeChar, content);

  const currentLevelExp = experienceForLevel(activeChar.level);
  const nextLevelExp = experienceForLevel(activeChar.level + 1);
  const expProgressPct = Math.round(experienceProgress(activeChar.level, activeChar.experience) * 100);
  const expRemaining = Math.max(0, nextLevelExp - activeChar.experience);

  // Format stamina (minutes -> H:MMh)
  const staminaMin = activeChar.staminaMinutes ?? 15;
  const staminaHours = Math.floor(staminaMin / 60);
  const staminaRemainder = staminaMin % 60;
  const staminaFormatted = `${staminaHours}:${staminaRemainder.toString().padStart(2, '0')}h`;

  // Health / Mana regen
  const hpRegen = vocationDef?.name === 'Knight' ? 2 : vocationDef?.name === 'Paladin' ? 1.5 : 1;
  const mpRegen = vocationDef?.name === 'Sorcerer' || vocationDef?.name === 'Druid' ? 3 : vocationDef?.name === 'Paladin' ? 2 : 1;

  // Skills table
  const skillEntries = [
    { id: 'fist', name: 'Fist Fighting', icon: '👊', level: activeChar.skills.fist, key: 'fist' as const },
    { id: 'club', name: 'Club Fighting', icon: '🔨', level: activeChar.skills.club, key: 'club' as const },
    { id: 'sword', name: 'Sword Fighting', icon: '🗡️', level: activeChar.skills.sword, key: 'sword' as const },
    { id: 'axe', name: 'Axe Fighting', icon: '🪓', level: activeChar.skills.axe, key: 'axe' as const },
    { id: 'distance', name: 'Distance Fighting', icon: '🏹', level: activeChar.skills.distance, key: 'distance' as const },
    { id: 'shielding', name: 'Shielding', icon: '🛡️', level: activeChar.skills.shielding, key: 'shielding' as const },
    { id: 'fishing', name: 'Fishing', icon: '🐟', level: activeChar.skills.fishing ?? 10, key: 'fishing' as const },
    { id: 'magicLevel', name: 'Magic Level', icon: '🔮', level: activeChar.skills.magicLevel, key: 'magicLevel' as const },
  ];

  const currentAvatar = AVAILABLE_AVATARS.find((a) => a.id === avatarId) || AVAILABLE_AVATARS[0];

  return (
    <div
      className="character-profile-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(6px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="character-profile-modal-window"
        style={{
          width: '100%',
          maxWidth: '920px',
          maxHeight: '94vh',
          backgroundColor: '#0d111a',
          backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(35, 48, 77, 0.45) 0%, rgba(13, 17, 26, 0.98) 100%)',
          border: '1.5px solid #d4af37',
          borderRadius: '10px',
          boxShadow: '0 16px 48px rgba(0, 0, 0, 0.95), inset 0 0 20px rgba(212, 175, 55, 0.12)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: '#e2e8f0',
          fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        }}
      >
        {/* Top Window Title Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.65rem 1.25rem',
            borderBottom: '1px solid #2d3748',
            backgroundColor: '#0a0d14',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.1rem' }}>📜</span>
            <span
              style={{
                fontFamily: 'serif',
                fontSize: '1rem',
                fontWeight: 700,
                color: '#f6d88c',
                letterSpacing: '0.05em',
              }}
            >
              {activeChar.name.toUpperCase()}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '1.3rem',
              cursor: 'pointer',
              lineHeight: 1,
              padding: '2px 6px',
            }}
            title="Fechar Ficha do Personagem"
          >
            ✕
          </button>
        </div>

        {/* Navigation Tabs ([PERSONAGEM] and [OUTFIT]) */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #1e293b',
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            padding: '0 1.25rem',
            gap: '8px',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('personagem')}
            style={{
              padding: '0.75rem 2rem',
              fontSize: '0.85rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: activeTab === 'personagem' ? '#ffd875' : '#94a3b8',
              backgroundColor: activeTab === 'personagem' ? 'rgba(212, 175, 55, 0.12)' : 'transparent',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              borderBottom: activeTab === 'personagem' ? '2.5px solid #ffd875' : '2.5px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Personagem
          </button>

          <button
            type="button"
            onClick={() => {
              if (onOpenOutfit) {
                onClose();
                onOpenOutfit();
              } else {
                setActiveTab('outfit');
              }
            }}
            style={{
              padding: '0.75rem 2rem',
              fontSize: '0.85rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: activeTab === 'outfit' ? '#ffd875' : '#94a3b8',
              backgroundColor: activeTab === 'outfit' ? 'rgba(212, 175, 55, 0.12)' : 'transparent',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              borderBottom: activeTab === 'outfit' ? '2.5px solid #ffd875' : '2.5px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Outfit
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div
          style={{
            padding: '1.25rem',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          {/* Row 1: Identity Card (Left) & Core Attributes Grid (Right) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
              gap: '1rem',
            }}
          >
            {/* Top-Left: Identity Card with Avatar & Health/Mana/XP bars */}
            <div
              style={{
                backgroundColor: 'rgba(20, 27, 41, 0.75)',
                border: '1px solid #293548',
                borderRadius: '8px',
                padding: '1rem',
                display: 'flex',
                gap: '1.2rem',
                alignItems: 'center',
                position: 'relative',
              }}
            >
              {/* Square Avatar Box with edit trigger */}
              <div
                style={{
                  position: 'relative',
                  width: '90px',
                  height: '90px',
                  flexShrink: 0,
                  backgroundColor: '#0a0e17',
                  border: '2px solid #d4af37',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.6), inset 0 0 10px rgba(212, 175, 55, 0.25)',
                  cursor: 'pointer',
                  overflow: 'hidden',
                }}
                onClick={() => setIsAvatarPickerOpen((prev) => !prev)}
                title="Clique para escolher seu Avatar"
              >
                <img
                  src={currentAvatar.image}
                  alt={currentAvatar.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    color: '#ffd875',
                    fontSize: '0.65rem',
                    textAlign: 'center',
                    padding: '2px 0',
                    fontWeight: 700,
                  }}
                >
                  AVATAR
                </div>
              </div>

              {/* Avatar Selector Dropdown / Popover */}
              {isAvatarPickerOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '105px',
                    left: '1rem',
                    zIndex: 100,
                    backgroundColor: '#0f172a',
                    border: '1.5px solid #d4af37',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.9)',
                    width: '280px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f6d88c' }}>ESCOLHA SEU AVATAR</span>
                    <button
                      type="button"
                      onClick={() => setIsAvatarPickerOpen(false)}
                      style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                      ✕
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                    {AVAILABLE_AVATARS.map((av) => (
                      <button
                        key={av.id}
                        type="button"
                        onClick={() => {
                          onSelectAvatar?.(av.id);
                          setIsAvatarPickerOpen(false);
                        }}
                        style={{
                          aspectRatio: '1/1',
                          backgroundColor: av.id === avatarId ? 'rgba(212, 175, 55, 0.35)' : '#1e293b',
                          border: av.id === avatarId ? '2px solid #ffd875' : '1px solid #334155',
                          borderRadius: '6px',
                          padding: 0,
                          cursor: 'pointer',
                          overflow: 'hidden',
                        }}
                        title={`${av.name} (${av.vocation})`}
                      >
                        <img src={av.image} alt={av.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Name, Level, Vocation and Gauges */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Name row with squad cycle arrows */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                  <h3
                    style={{
                      margin: 0,
                      fontFamily: 'serif',
                      fontSize: '1.25rem',
                      fontWeight: 800,
                      color: '#ffffff',
                      letterSpacing: '0.04em',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {activeChar.name.toUpperCase()}
                  </h3>

                  {characters.length > 1 && (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={handlePrevChar}
                        style={{
                          background: '#1e293b',
                          border: '1px solid #334155',
                          color: '#ffd875',
                          borderRadius: '4px',
                          padding: '2px 8px',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                        }}
                        title="Personagem anterior"
                      >
                        ◀
                      </button>
                      <button
                        type="button"
                        onClick={handleNextChar}
                        style={{
                          background: '#1e293b',
                          border: '1px solid #334155',
                          color: '#ffd875',
                          borderRadius: '4px',
                          padding: '2px 8px',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                        }}
                        title="Próximo personagem"
                      >
                        ▶
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '2px 0 8px' }}>
                  Level {activeChar.level} — <span style={{ color: '#60a5fa' }}>{activeChar.promotion || activeChar.vocation}</span>
                </div>

                {/* Health Bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.75rem', width: '90px', color: '#f87171', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    ❤️ Pontos de vida
                  </span>
                  <div style={{ flex: 1, height: '10px', backgroundColor: '#1c1917', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.min(100, Math.max(0, (activeChar.currentHp / (activeChar.maxHp || 1)) * 100))}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #dc2626 0%, #ef4444 100%)',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#fca5a5', minWidth: '70px', textAlign: 'right', fontWeight: 600 }}>
                    {activeChar.currentHp.toLocaleString('pt-BR')} / {activeChar.maxHp.toLocaleString('pt-BR')}
                  </span>
                </div>

                {/* Mana Bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.75rem', width: '90px', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    💧 Mana
                  </span>
                  <div style={{ flex: 1, height: '10px', backgroundColor: '#1c1917', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.min(100, Math.max(0, (activeChar.currentMana / (activeChar.maxMana || 1)) * 100))}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #2563eb 0%, #3b82f6 100%)',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#93c5fd', minWidth: '70px', textAlign: 'right', fontWeight: 600 }}>
                    {activeChar.currentMana.toLocaleString('pt-BR')} / {activeChar.maxMana.toLocaleString('pt-BR')}
                  </span>
                </div>

                {/* Experience Bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.75rem', width: '90px', color: '#c084fc', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    ⭐ Experiência
                  </span>
                  <div style={{ flex: 1, height: '10px', backgroundColor: '#1c1917', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.min(100, Math.max(0, expProgressPct))}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #9333ea 0%, #c084fc 100%)',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#d8b4fe', minWidth: '70px', textAlign: 'right', fontWeight: 600 }}>
                    {expProgressPct}%
                  </span>
                </div>
              </div>
            </div>

            {/* Top-Right: Core Attributes 6-item Grid */}
            <div
              style={{
                backgroundColor: 'rgba(20, 27, 41, 0.75)',
                border: '1px solid #293548',
                borderRadius: '8px',
                padding: '1rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '0.65rem 1rem',
                alignContent: 'center',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  🌀 Velocidade
                </span>
                <strong style={{ color: '#ffffff' }}>{playerSpeed}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  🎒 Capacidade
                </span>
                <strong style={{ color: '#ffffff' }}>{totalCapacity.toFixed(2)} oz</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  🔮 Magic Level
                </span>
                <strong style={{ color: '#ffffff' }}>{activeChar.skills.magicLevel}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  💚 Regen. de vida
                </span>
                <strong style={{ color: '#4ade80' }}>+{hpRegen} / s</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  💙 Regen. de mana
                </span>
                <strong style={{ color: '#60a5fa' }}>+{mpRegen} / s</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  ⌛ Stamina
                </span>
                <strong style={{ color: '#fbbf24' }}>{staminaFormatted}</strong>
              </div>
            </div>
          </div>

          {/* Row 2: Combat Skills Table (Left) & Progression / Bonuses (Right) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
              gap: '1rem',
            }}
          >
            {/* Middle-Left: Combat Skills Table */}
            <div
              style={{
                backgroundColor: 'rgba(20, 27, 41, 0.75)',
                border: '1px solid #293548',
                borderRadius: '8px',
                padding: '1rem',
              }}
            >
              <div
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: '#f6d88c',
                  letterSpacing: '0.08em',
                  marginBottom: '0.65rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                ⚔️ SKILLS DE COMBATE
              </div>

              {/* Table Header */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.4fr 0.6fr 1.6fr',
                  fontSize: '0.72rem',
                  color: '#64748b',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  borderBottom: '1px solid #1e293b',
                  paddingBottom: '4px',
                  marginBottom: '6px',
                }}
              >
                <span>Skill</span>
                <span style={{ textAlign: 'center' }}>Level</span>
                <span style={{ textAlign: 'right' }}>Progresso</span>
              </div>

              {/* Skill Rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {skillEntries.map((sk) => {
                  const pct = sk.key === 'fishing' ? 0 : Math.round(skillProgress(activeChar, sk.key as TrainableSkill, vocationDef) * 100);

                  return (
                    <div
                      key={sk.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1.4fr 0.6fr 1.6fr',
                        alignItems: 'center',
                        fontSize: '0.82rem',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#cbd5e1' }}>
                        <span>{sk.icon}</span>
                        <span>{sk.name}</span>
                      </span>

                      <span style={{ textAlign: 'center', fontWeight: 700, color: '#f1f5f9' }}>
                        {sk.level}
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                        <div
                          style={{
                            width: '90px',
                            height: '8px',
                            backgroundColor: '#0f172a',
                            borderRadius: '3px',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${Math.min(100, Math.max(0, pct))}%`,
                              height: '100%',
                              backgroundColor: '#22c55e',
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8', width: '32px', textAlign: 'right' }}>
                          {pct}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Middle-Right: Progression & XP Bonuses */}
            <div
              style={{
                backgroundColor: 'rgba(20, 27, 41, 0.75)',
                border: '1px solid #293548',
                borderRadius: '8px',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
              }}
            >
              <div
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: '#f6d88c',
                  letterSpacing: '0.08em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                📈 PROGRESSÃO E BÔNUS
              </div>

              {/* Next Level Progression */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                  <span style={{ color: '#cbd5e1', fontWeight: 600 }}>↑ PRÓXIMO LEVEL</span>
                  <span style={{ color: '#94a3b8' }}>faltam {expRemaining.toLocaleString('pt-BR')} de experiência</span>
                </div>
                <div style={{ height: '8px', backgroundColor: '#0f172a', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${Math.min(100, Math.max(0, expProgressPct))}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #9333ea 0%, #c084fc 100%)',
                    }}
                  />
                </div>
              </div>

              {/* Bestiary Progression */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                  <span style={{ color: '#cbd5e1', fontWeight: 600 }}>📖 PROGRESSO NO BESTIARY</span>
                  <span style={{ color: '#94a3b8' }}>4 de 93 criaturas (4.3%)</span>
                </div>
                <div style={{ height: '8px', backgroundColor: '#0f172a', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: '4.3%', height: '100%', backgroundColor: '#10b981' }} />
                </div>
              </div>

              {/* XP Bonus Breakdown */}
              <div style={{ borderTop: '1px solid #1e293b', paddingTop: '0.65rem' }}>
                <div style={{ fontSize: '0.76rem', color: '#f6d88c', fontWeight: 700, marginBottom: '6px' }}>
                  ⭐ BÔNUS DE EXPERIÊNCIA
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.76rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                    <span>Progresso no Bestiary</span>
                    <span style={{ color: '#4ade80' }}>+5%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                    <span>Experience Scroll</span>
                    <span>—</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                    <span>Bônus da guild</span>
                    <span>—</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                    <span>Bônus de Premium</span>
                    <span>—</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                    <span>Bônus de level</span>
                    <span>—</span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontWeight: 700,
                      color: '#ffd875',
                      borderTop: '1px dashed #334155',
                      paddingTop: '4px',
                      marginTop: '2px',
                    }}
                  >
                    <span>Bônus total de experiência</span>
                    <span>+5%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: Detalhes de Combate (Horizontal Strip matching reference) */}
          <div
            style={{
              backgroundColor: 'rgba(20, 27, 41, 0.75)',
              border: '1px solid #293548',
              borderRadius: '8px',
              padding: '0.85rem 1rem',
            }}
          >
            <div
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#f6d88c',
                letterSpacing: '0.08em',
                marginBottom: '0.65rem',
              }}
            >
              DETALHES DE COMBATE
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                gap: '0.5rem',
              }}
            >
              <div style={{ backgroundColor: '#0f172a', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid #1e293b' }}>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>🛡️ Armadura</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#f1f5f9' }}>{derived.armor}</div>
              </div>

              <div style={{ backgroundColor: '#0f172a', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid #1e293b' }}>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>🔵 Defesa</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#f1f5f9' }}>{derived.defense}</div>
              </div>

              <div style={{ backgroundColor: '#0f172a', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid #1e293b' }}>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>⚔️ Dano</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#f1f5f9' }}>
                  {Math.round(derived.attack * 0.7)} - {derived.attack}
                </div>
              </div>

              <div style={{ backgroundColor: '#0f172a', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid #1e293b' }}>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>💥 Chance Crítico</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#f1f5f9' }}>0%</div>
              </div>

              <div style={{ backgroundColor: '#0f172a', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid #1e293b' }}>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>🩸 Life Leech</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#f1f5f9' }}>0%</div>
              </div>

              <div style={{ backgroundColor: '#0f172a', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid #1e293b' }}>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>💧 Mana Leech</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#f1f5f9' }}>0%</div>
              </div>

              <div style={{ backgroundColor: '#0f172a', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid #1e293b' }}>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>📖 Dano Bestiary</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#f1f5f9' }}>+0%</div>
              </div>
            </div>
          </div>

          {/* Row 4: Última Morte (Attachment 3 reference) */}
          <div
            style={{
              backgroundColor: 'rgba(20, 27, 41, 0.75)',
              border: '1px solid #293548',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: '0.72rem', color: '#f6d88c', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '2px' }}>
                ÚLTIMA MORTE
              </div>
              <div style={{ fontSize: '0.8rem', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>💀</span>
                <span>Nenhuma morte recente registrada neste ciclo de caçada.</span>
              </div>
            </div>

            <button
              type="button"
              disabled
              style={{
                backgroundColor: 'rgba(51, 65, 85, 0.4)',
                border: '1px solid #475569',
                color: '#94a3b8',
                borderRadius: '6px',
                padding: '4px 12px',
                fontSize: '0.75rem',
                cursor: 'not-allowed',
              }}
            >
              Ver o último minuto
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CharacterProfileModal;
