'use client';

import { useMemo, useState } from 'react';
import visualAssetsJson from '@/content/generated/tibia860-assets.json';
import type { HuntDefinition } from '@/packages/domain/src';
import type { MonsterDefinition } from '@/packages/content-schema/src';
import type { Tibia860AssetManifest } from '@/packages/tibia860-assets/src/types';

const assets = visualAssetsJson as Tibia860AssetManifest;

interface Props { open: boolean; hunts: HuntDefinition[]; monsters: MonsterDefinition[]; level: number; onClose(): void; onSelect(huntId: string): void }

export function HuntSelector({ open, hunts, monsters, level, onClose, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => hunts.filter((hunt) => {
    const monsterNames = hunt.monsters.map((id) => monsters.find((monster) => monster.id === id)?.name ?? id).join(' ');
    return `${hunt.name} ${monsterNames}`.toLowerCase().includes(query.trim().toLowerCase());
  }), [hunts, monsters, query]);
  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="hunt-selector" role="dialog" aria-modal="true" aria-label="Selecionar hunt">
        <header><div><p className="eyebrow">EXPEDIÇÕES INICIAIS</p><h2>Hunts — escolha onde caçar</h2></div><button type="button" onClick={onClose}>×</button></header>
        <div className="hunt-selector-tools">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar hunt ou monstro..." autoFocus />
          <span>Seu level: <b>{level}</b></span>
        </div>
        <div className="hunt-level-rail"><span className="unlocked">5 habitats do mapa STYLLER</span><span className="unlocked">6 zonas por rota</span><span>Loop contínuo · variantes raras</span></div>
        <div className="hunt-card-grid">
          {filtered.map((hunt) => {
            const locked = level < hunt.minimumLevel;
            return (
              <button type="button" key={hunt.id} className={`hunt-card ${locked ? 'locked' : ''}`} disabled={locked} onClick={() => onSelect(hunt.id)}>
                <span className="hunt-card-sprites">
                  {hunt.monsters.map((monsterId) => {
                    const monster = monsters.find((candidate) => candidate.id === monsterId);
                    const frame = assets.creatures[monsterId]?.frames.find((candidate) => candidate.direction === 'south') ?? assets.creatures[monsterId]?.frames[0];
                    // Pixel art generated locally must not pass through image optimization.
                    // eslint-disable-next-line @next/next/no-img-element
                    return frame ? <img key={monsterId} src={frame.publicUrl} alt={monster?.name ?? monsterId} /> : null;
                  })}
                </span>
                <span className="hunt-card-copy"><strong>{hunt.name}</strong><small>{hunt.monsters.map((id) => monsters.find((monster) => monster.id === id)?.name ?? id).join(' · ')}</small></span>
                <span className="hunt-card-badges"><b>XP</b><i>{locked ? `🔒 Lv ${hunt.minimumLevel}` : 'loop ativo'}</i></span>
                <span className="hunt-card-level"><b>{hunt.environment.label}</b> · recomendado Lv {hunt.recommendedLevel} · 6 zonas de respawn</span>
              </button>
            );
          })}
        </div>
        <footer>O level recomendado é um aviso de dificuldade; as cinco hunts permanecem acessíveis neste protótipo.</footer>
      </section>
    </div>
  );
}
