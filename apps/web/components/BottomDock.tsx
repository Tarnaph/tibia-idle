import { useEffect, useRef, useState } from 'react';
import type { SpellDefinition } from '@/packages/content-schema/src';
import type { CharacterState, CombatLogEntry, CombatStance, HuntEncounterState, PartyActorState, TargetSelectionStrategy } from '@/packages/domain/src';
import { BottomConsoleHUD } from './BottomConsoleHUD';

interface BottomDockProps {
  logs: CombatLogEntry[];
  seed?: string;
  status?: HuntEncounterState['status'];
  character: CharacterState;
  actor?: PartyActorState;
  spells: SpellDefinition[];
  elapsedMs: number;
  isHunting?: boolean;
  isAutoIdle?: boolean;
  onToggleAutoIdle?: () => void;
  onExitHunt?: () => void;
  onSeed?(value: string): void;
  onBegin?(): void;
  onReset?(): void;
  onReorderSpell?(fromIndex: number, toIndex: number): void;
  onConfigureSlot?: (slotIndex: number) => void;
  onSlotClick?: (slotIndex: number) => void;
  onToggleBackpack?: () => void;
  onOpenDepot?: () => void;
  onOpenQuickSell?: () => void;
  onSelectHunt?: () => void;
  onChangeStance?: (stance: CombatStance) => void;
  onChangeTargetDistance?: (distance: number) => void;
  onChangeTargetStrategy?: (strategy: TargetSelectionStrategy) => void;
}

export function BottomDock({
  logs,
  character,
  actor,
  spells,
  elapsedMs,
  isHunting = false,
  isAutoIdle = false,
  onToggleAutoIdle,
  onExitHunt,
  onConfigureSlot,
  onSlotClick,
  onToggleBackpack,
  onOpenDepot,
  onOpenQuickSell,
  onSelectHunt,
  onChangeStance,
  onChangeTargetDistance,
  onChangeTargetStrategy,
}: BottomDockProps) {
  const [logOpen, setLogOpen] = useState(false);
  const handleExitClick = () => {
    onExitHunt?.();
  };

  const hasteUntil = actor?.hasteUntil ?? character.combatState?.hasteUntil ?? 0;
  const magicShieldUntil = actor?.magicShieldUntil ?? character.combatState?.magicShieldUntil ?? 0;
  const bloodRageUntil = actor?.bloodRageUntil ?? character.combatState?.bloodRageUntil ?? 0;

  const getRemainingSec = (untilTime: number) => {
    if (!untilTime || untilTime <= elapsedMs) return 0;
    return (untilTime - elapsedMs) / 1000;
  };

  const formatBuffTime = (seconds: number) => {
    const total = Math.max(0, Math.ceil(seconds));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const hasteSec = getRemainingSec(hasteUntil);
  const magicShieldSec = getRemainingSec(magicShieldUntil);
  const bloodRageSec = getRemainingSec(bloodRageUntil);

  const activeBuffs: Array<{ id: string; name: string; icon: string; remainingSec: number; formattedTime: string }> = [];

  if (hasteSec > 0) {
    const isGranHur = (character as any)?.lastHasteSpell === 'utani gran hur';
    activeBuffs.push({
      id: 'haste',
      name: isGranHur ? 'Utani Gran Hur' : 'Utani Hur',
      icon: isGranHur ? '/spells/utani-gran-hur.png' : '/spells/utani-hur.png',
      remainingSec: hasteSec,
      formattedTime: formatBuffTime(hasteSec),
    });
  }

  if (magicShieldSec > 0) {
    activeBuffs.push({
      id: 'magic-shield',
      name: 'Utamo Vita',
      icon: '/spells/utamo-vita.png',
      remainingSec: magicShieldSec,
      formattedTime: formatBuffTime(magicShieldSec),
    });
  }

  if (bloodRageSec > 0) {
    activeBuffs.push({
      id: 'blood-rage',
      name: 'Utito Tempo',
      icon: '/spells/utito-tempo.png',
      remainingSec: bloodRageSec,
      formattedTime: formatBuffTime(bloodRageSec),
    });
  }

  return (
    <footer className="bottom-dock-wrapper" aria-label="Console de Batalha e Ações">
      {logOpen && (
        <section className="combat-log-drawer">
          <header>
            <strong>Combat log</strong>
            <small>{logs.length} registros desta execução</small>
            <button type="button" onClick={() => setLogOpen(false)}>×</button>
          </header>
          <ol>
            {logs.map((entry) => (
              <li key={entry.id}>
                <time>#{entry.round.toString().padStart(2, '0')}</time>
                <span>{entry.message}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Floating Active Support Spell Duration Counters (Centered Above Hotbar) */}
      {activeBuffs.length > 0 && (
        <div
          className="active-buff-counters-floating"
          aria-label="Contadores de Magias de Suporte Ativas"
          style={{
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '4px',
            pointerEvents: 'auto',
            zIndex: 40,
          }}
        >
          {activeBuffs.map((buff) => (
            <div
              key={buff.id}
              className="active-buff-badge"
              title={`${buff.name}: ${buff.formattedTime} restante`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '3px 10px 3px 4px',
                backgroundColor: 'rgba(14, 20, 29, 0.94)',
                border: '1.5px solid #2d3b4e',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(4px)',
              }}
            >
              <img
                src={buff.icon}
                alt={buff.name}
                width={22}
                height={22}
                style={{
                  borderRadius: '3px',
                  border: '1px solid #4a5a6e',
                  display: 'block',
                  imageRendering: 'pixelated',
                }}
              />
              <span
                style={{
                  fontFamily: 'Verdana, Arial, sans-serif',
                  fontSize: '13.5px',
                  fontWeight: 800,
                  color: '#e3d5b0',
                  textShadow: '1px 1px 2px #000, 0 0 4px rgba(0, 0, 0, 0.9)',
                  letterSpacing: '0.5px',
                }}
              >
                {buff.formattedTime}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Top Quick Action Bar above console centered matching Image 4 */}
      {onOpenDepot && onOpenQuickSell && (
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center', pointerEvents: 'auto', marginBottom: '3px' }}>
          <nav className="quick-action-bar" aria-label="Ações Rápidas">
            {onSelectHunt && (
              <button
                type="button"
                className="quick-action-btn btn-hunts highlighted-gold"
                onClick={onSelectHunt}
                title="Abrir Seleção de Caçadas"
                style={{ borderColor: '#f0d080', backgroundColor: 'rgba(240, 208, 128, 0.25)', color: '#fff8d0' }}
              >
                🎯 CAÇADAS
              </button>
            )}
            <button
              type="button"
              className="quick-action-btn btn-depot"
              onClick={onOpenDepot}
              title="Abrir Armazém do Depot"
            >
              DEPOT
            </button>
            <button
              type="button"
              className="quick-action-btn btn-quicksell highlighted-gold"
              onClick={onOpenQuickSell}
              title="Venda Rápida de Itens da Mochila"
            >
              VENDA RÁPIDA
            </button>
            <button
              type="button"
              className="quick-action-btn btn-imbuements"
              onClick={() => {}}
              title="Imbuements"
            >
              IMBUEMENTS
            </button>
            <button
              type="button"
              className="quick-action-btn btn-blessings"
              onClick={() => {}}
              title="Blessings"
            >
              BLESSINGS
            </button>
            <button
              type="button"
              className="quick-action-btn btn-leave-hunt"
              onClick={handleExitClick}
              disabled={!isHunting}
              title={!isHunting ? 'Você não está em uma caçada' : 'Sair da caçada para o templo de Thais'}
            >
              SAIR DA CAÇADA
            </button>
          </nav>
        </div>
      )}

      {/* Full Bottom Console HUD matching user reference screenshot */}
      <BottomConsoleHUD
        character={character}
        actor={actor}
        spells={spells}
        elapsedMs={elapsedMs}
        isAutoIdle={isAutoIdle}
        onToggleAutoIdle={onToggleAutoIdle}
        onConfigureSlot={onConfigureSlot}
        onSlotClick={onSlotClick}
        onToggleBackpack={onToggleBackpack}
        onToggleCombatLog={() => setLogOpen((v) => !v)}
        logCount={logs.length}
        onChangeStance={onChangeStance}
        onChangeTargetDistance={onChangeTargetDistance}
        onChangeTargetStrategy={onChangeTargetStrategy}
      />
    </footer>
  );
}

