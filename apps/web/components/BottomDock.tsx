import { useState } from 'react';
import type { SpellDefinition } from '@/packages/content-schema/src';
import type { CharacterState, CombatLogEntry, HuntEncounterState, PartyActorState } from '@/packages/domain/src';
import { BottomConsoleHUD } from './BottomConsoleHUD';

interface BottomDockProps {
  logs: CombatLogEntry[];
  seed?: string;
  status?: HuntEncounterState['status'];
  character: CharacterState;
  actor?: PartyActorState;
  spells: SpellDefinition[];
  elapsedMs: number;
  onSeed?(value: string): void;
  onBegin?(): void;
  onReset?(): void;
  onReorderSpell?(fromIndex: number, toIndex: number): void;
  onConfigureSlot?: (slotIndex: number) => void;
  onToggleBackpack?: () => void;
}

export function BottomDock({
  logs,
  character,
  actor,
  spells,
  elapsedMs,
  onConfigureSlot,
  onToggleBackpack,
}: BottomDockProps) {
  const [logOpen, setLogOpen] = useState(false);

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

      {/* Full Bottom Console HUD matching user reference screenshot */}
      <BottomConsoleHUD
        character={character}
        actor={actor}
        spells={spells}
        elapsedMs={elapsedMs}
        onConfigureSlot={onConfigureSlot}
        onToggleBackpack={onToggleBackpack}
        onToggleCombatLog={() => setLogOpen((v) => !v)}
        logCount={logs.length}
      />
    </footer>
  );
}

