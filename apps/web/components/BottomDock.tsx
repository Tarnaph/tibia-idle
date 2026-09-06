import { useEffect, useRef, useState } from 'react';
import type { SpellDefinition } from '@/packages/content-schema/src';
import type { CharacterState, CombatLogEntry, CombatStance, HuntEncounterState, PartyActorState } from '@/packages/domain/src';
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
}: BottomDockProps) {
  const [logOpen, setLogOpen] = useState(false);
  const handleExitClick = () => {
    onExitHunt?.();
  };

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
      />
    </footer>
  );
}

