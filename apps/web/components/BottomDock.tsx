import { useState } from 'react';
import type { SpellDefinition } from '@/packages/content-schema/src';
import type { CharacterState, CombatLogEntry, HuntEncounterState, PartyActorState } from '@/packages/domain/src';
import { Tibia11ActionBar } from './Tibia11ActionBar';

interface BottomDockProps {
  logs: CombatLogEntry[];
  seed: string;
  status: HuntEncounterState['status'];
  character: CharacterState;
  actor?: PartyActorState;
  spells: SpellDefinition[];
  elapsedMs: number;
  onSeed(value: string): void;
  onBegin(): void;
  onReset(): void;
  onReorderSpell(fromIndex: number, toIndex: number): void;
  onConfigureSlot?: (slotIndex: number) => void;
}

export function BottomDock({
  logs,
  seed,
  status,
  character,
  actor,
  spells,
  elapsedMs,
  onSeed,
  onBegin,
  onReset,
  onReorderSpell,
  onConfigureSlot,
}: BottomDockProps) {
  const [logOpen, setLogOpen] = useState(false);
  const running = status === 'running';

  return (
    <footer className="bottom-dock">
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

      <div className="dock-tabs">
        <button
          type="button"
          className={logOpen ? 'active' : ''}
          onClick={() => setLogOpen((current) => !current)}
        >
          Combate <b>{logs.length}</b>
        </button>
        <button type="button" disabled title="Em breve">Geral</button>
        <button type="button" disabled title="Em breve">Sistema</button>
      </div>

      {/* Official Tibia 11 Action Bar matching reference screenshot */}
      <Tibia11ActionBar
        character={character}
        actor={actor}
        spells={spells}
        elapsedMs={elapsedMs}
        onConfigureSlot={onConfigureSlot}
        onReorderSlot={onReorderSpell}
      />
      <label className="seed-control"><span>Seed</span><input value={seed} onChange={(event) => onSeed(event.target.value)} disabled={running} /></label>
      <div className="dock-actions">
        <button type="button" className="reset-action" onClick={onReset} disabled={running}>Reset</button>
        <button type="button" className="primary-action" onClick={onBegin} disabled={running}>Entrar na hunt</button>
      </div>
    </footer>
  );
}
