'use client';

import type { CharacterState } from '@/packages/domain/src/types';

interface MobileTopBarProps {
  character: CharacterState;
  isPremium?: boolean;
  avatarUrl?: string;
  isConnected?: boolean;
  onOpenSettings?: () => void;
  onOpenProfile?: () => void;
}

export function MobileTopBar({
  character,
  isPremium = false,
  avatarUrl = '/assets/avatars/avatar-1.png',
  isConnected = true,
  onOpenSettings,
  onOpenProfile,
}: MobileTopBarProps) {
  const currentHp = (character as any)?.currentHp ?? (character as any)?.health ?? 150;
  const maxHp = Math.max(1, (character as any)?.maxHp ?? (character as any)?.maxHealth ?? 150);
  const hpPercent = Math.min(100, Math.max(0, (currentHp / maxHp) * 100));

  const currentMp = (character as any)?.currentMana ?? (character as any)?.mana ?? 35;
  const maxMp = Math.max(1, (character as any)?.maxMana ?? (character as any)?.maxMana ?? 35);
  const mpPercent = Math.min(100, Math.max(0, (currentMp / maxMp) * 100));

  // XP calculation
  const currentExp = Number(character.experience ?? 0);
  const nextLevelExp = (character.level + 1) * 1000;
  const currentLevelBaseExp = character.level * 1000;
  const expNeeded = Math.max(1, nextLevelExp - currentLevelBaseExp);
  const expProgress = Math.max(0, currentExp - currentLevelBaseExp);
  const xpPercent = Math.min(100, Math.max(0, (expProgress / expNeeded) * 100));

  const vocName = character.vocation || character.baseVocation || 'Knight';

  return (
    <header
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        padding: '8px 12px',
        background: 'linear-gradient(180deg, rgba(11, 15, 25, 0.95) 0%, rgba(11, 15, 25, 0.8) 80%, transparent 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        pointerEvents: 'auto',
      }}
    >
      {/* Left: Avatar + Identity + Bars */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
        {/* Avatar Frame */}
        <div
          onClick={onOpenProfile}
          role="button"
          tabIndex={0}
          title="Ver Perfil do Personagem"
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '8px',
            border: '2px solid #ca8a04',
            background: '#090d16',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.6), inset 0 0 4px rgba(202, 138, 4, 0.4)',
            overflow: 'hidden',
            flexShrink: 0,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            src={avatarUrl}
            alt={character.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/generated/outfit-thumbs/citizen.png';
            }}
          />
        </div>

        {/* Identity & Status Bars */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, minWidth: 0 }}>
          {/* Row 1: Name, Voc/Level, Premium badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
            <span
              style={{
                fontSize: '13px',
                fontWeight: 800,
                color: '#fff',
                letterSpacing: '0.2px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {character.name}
            </span>
            <span style={{ fontSize: '11px', color: '#93c5fd', fontWeight: 600, whiteSpace: 'nowrap' }}>
              {vocName} Lv {character.level}
            </span>
            {isPremium ? (
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: 800,
                  backgroundColor: '#854d0e',
                  border: '1px solid #facc15',
                  color: '#fef08a',
                  padding: '1px 5px',
                  borderRadius: '3px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                  lineHeight: '1.2',
                }}
              >
                👑 PREMIUM
              </span>
            ) : (
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  backgroundColor: '#1e293b',
                  color: '#94a3b8',
                  padding: '1px 4px',
                  borderRadius: '3px',
                  lineHeight: '1.2',
                }}
              >
                FREE
              </span>
            )}
          </div>

          {/* Row 2: HP Bar */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '180px',
              height: '11px',
              backgroundColor: '#180808',
              borderRadius: '3px',
              border: '1px solid #7f1d1d',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${hpPercent}%`,
                height: '100%',
                backgroundColor: '#dc2626',
                background: 'linear-gradient(90deg, #b91c1c 0%, #ef4444 100%)',
                transition: 'width 0.2s ease',
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 4px',
                fontSize: '8.5px',
                fontWeight: 700,
                color: '#fff',
                textShadow: '0 1px 2px #000',
              }}
            >
              <span>❤️</span>
              <span>{Math.round(currentHp)} / {maxHp}</span>
            </div>
          </div>

          {/* Row 3: Mana Bar */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '180px',
              height: '11px',
              backgroundColor: '#08101e',
              borderRadius: '3px',
              border: '1px solid #1e3a8a',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${mpPercent}%`,
                height: '100%',
                backgroundColor: '#2563eb',
                background: 'linear-gradient(90deg, #1d4ed8 0%, #3b82f6 100%)',
                transition: 'width 0.2s ease',
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 4px',
                fontSize: '8.5px',
                fontWeight: 700,
                color: '#fff',
                textShadow: '0 1px 2px #000',
              }}
            >
              <span>💧</span>
              <span>{Math.round(currentMp)} / {maxMp}</span>
            </div>
          </div>

          {/* Row 4: Thin Gold XP Bar */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '180px',
              height: '5px',
              backgroundColor: '#1c1503',
              borderRadius: '2px',
              border: '1px solid #713f12',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${xpPercent}%`,
                height: '100%',
                backgroundColor: '#eab308',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>
      </div>

      {/* Right: Quick Action Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        {/* Settings Button */}
        <button
          type="button"
          onClick={onOpenSettings}
          title="Opções / Menu Rápido"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            border: '1px solid #ca8a04',
            background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
            color: '#fef08a',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 5px rgba(0, 0, 0, 0.4)',
          }}
        >
          ⚙️
        </button>

        {/* Network Signal Indicator */}
        <div
          title={isConnected ? 'Conectado ao Servidor Thais' : 'Desconectado'}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            border: '1px solid #334155',
            background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 5px rgba(0, 0, 0, 0.4)',
            gap: '2px',
          }}
        >
          <span style={{ fontSize: '13px' }}>📶</span>
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: isConnected ? '#22c55e' : '#ef4444',
              boxShadow: isConnected ? '0 0 6px #22c55e' : '0 0 6px #ef4444',
            }}
          />
        </div>
      </div>
    </header>
  );
}
