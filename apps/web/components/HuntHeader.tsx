import { useEffect, useRef, useState } from 'react';
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
  const [countdown, setCountdown] = useState<number | null>(null);
  const onExitRef = useRef(onExit);

  useEffect(() => {
    onExitRef.current = onExit;
  });

  const isCountingDown = countdown !== null;
  useEffect(() => {
    if (!isCountingDown) return;
    const interval = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          window.clearInterval(interval);
          onExitRef.current();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isCountingDown]);

  const handleExitClick = () => {
    if (countdown !== null) {
      setCountdown(null);
      return;
    }
    setCountdown(5);
  };

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
      <button
        type="button"
        className={`loop-indicator ${countdown !== null ? 'counting-exit' : ''}`}
        onClick={handleExitClick}
        title="Sair da caçada para a cidade de Thais"
      >
        {countdown !== null ? `SAINDO EM ${countdown}S` : 'SAIR DA CAÇADA'}
      </button>
    </header>
  );
}
