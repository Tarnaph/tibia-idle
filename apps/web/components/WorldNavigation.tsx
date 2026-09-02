'use client';

import { useState } from 'react';

interface Props { mode: 'training' | 'hunt'; onTraining(): void; onHunts(): void }

export function WorldNavigation({ mode, onTraining, onHunts }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className="world-navigation">
      <button type="button" className="world-navigation-trigger" onClick={() => setOpen((value) => !value)}>
        {mode === 'training' ? 'Training Room' : 'Hunts'} <span>▾</span>
      </button>
      {open && (
        <nav aria-label="Áreas do jogo">
          <button type="button" className={mode === 'training' ? 'active' : ''} onClick={() => { onTraining(); setOpen(false); }}>Training Room<small>Treino ativo</small></button>
          <button type="button" className={mode === 'hunt' ? 'active' : ''} onClick={() => { onHunts(); setOpen(false); }}>Hunts<small>Progressão 1–20</small></button>
          <button type="button" disabled>Bosses<small>Em breve</small></button>
          <button type="button" disabled>Dungeons<small>Em breve</small></button>
        </nav>
      )}
    </div>
  );
}
