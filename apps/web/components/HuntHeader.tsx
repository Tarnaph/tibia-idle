import type { HuntEncounterState } from '@/packages/domain/src';
import { formatSessionDuration } from '@/packages/presentation/src';

interface HuntHeaderProps {
  encounter: HuntEncounterState;
  elapsedMs: number;
  aliveEnemies: number;
  onExit(): void;
}

const statusText = {
  ready: 'Pronta',
  running: 'Em execução',
  completed: 'Concluída',
  defeated: 'Derrota',
};

export function HuntHeader({ encounter, elapsedMs, aliveEnemies, onExit }: HuntHeaderProps) {
  const progress = encounter.expeditionProgress;
  const continuous = encounter.continuousProgress;
  return (
    <header className="hunt-header">
      <div className="hunt-title-block">
        <span className={`live-dot status-${encounter.status}`} />
        <span><small>{statusText[encounter.status]}</small><strong>{encounter.hunt.name}</strong></span>
      </div>
      <time>{formatSessionDuration(elapsedMs).slice(3)}</time>
      {!continuous && <div className="room-pips" aria-label={progress ? `Exploração ${progress.explorationPercent}%` : `Room ${encounter.waveIndex + 1} de ${encounter.hunt.waves.length}`}>
        {encounter.hunt.waves.map((wave, index) => <i key={wave.number} className={index < encounter.waveIndex ? 'done' : index === encounter.waveIndex ? 'active' : ''} />)}
      </div>}
      <div className="hunt-room-summary">
        <strong>{continuous ? 'LOOP ATIVO' : progress ? `EXPEDIÇÃO ${progress.explorationPercent}%` : `ROOM ${Math.min(encounter.waveIndex + 1, encounter.hunt.waves.length)}/${encounter.hunt.waves.length}`}</strong>
        <small>{continuous ? `${continuous.kills} kills · ${continuous.rareKills} rare · volta ${continuous.loopCount + 1}` : progress ? `${progress.kills}/${progress.totalEnemies} abates · boss ${progress.bossState === 'ahead' ? 'à frente' : progress.bossState === 'active' ? 'ativo' : 'derrotado'}` : `${aliveEnemies} vivos · saída ${encounter.room.exitUnlocked ? 'aberta' : 'fechada'}`}</small>
      </div>
      <button type="button" className="loop-indicator" onClick={onExit}>SAIR DA HUNT</button>
    </header>
  );
}
