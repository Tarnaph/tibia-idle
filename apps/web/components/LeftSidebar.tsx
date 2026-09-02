import type { CharacterState, DerivedStats, PartyActorState, TrainableSkill } from '@/packages/domain/src';
import { formatSessionDuration, type SessionMetrics } from '@/packages/presentation/src';
import type { StatsDelta } from './EquipmentPanel';
import { ClientPanel } from './ClientPanel';

const compactNumber = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1, notation: 'compact' });

interface LeftSidebarProps {
  character: CharacterState;
  characters: CharacterState[];
  actor?: PartyActorState;
  skillProgress: Record<TrainableSkill, number>;
  stats: DerivedStats;
  statsDelta: StatsDelta | null;
  xpToNext: number;
  xpProgress: number;
  metrics: SessionMetrics;
  mobileOpen: boolean;
  gold: number;
  promotionName: string;
  canPromote: boolean;
  promotionMessage: string;
  onSelectCharacter(characterId: string): void;
  onPromote(): void;
  onMobileClose(): void;
}

function ValueRow({ label, value, changed = false }: { label: string; value: string | number; changed?: boolean }) {
  return <div className={changed ? 'compact-value-row changed' : 'compact-value-row'}><span>{label}</span><strong>{value}</strong></div>;
}

export function LeftSidebar({ character, characters, actor, skillProgress, stats, statsDelta, xpToNext, xpProgress, metrics, mobileOpen, gold, promotionName, canPromote, promotionMessage, onSelectCharacter, onPromote, onMobileClose }: LeftSidebarProps) {
  const skills = [
    ['Fist', character.skills.fist],
    ['Club', character.skills.club],
    ['Sword', character.skills.sword],
    ['Axe', character.skills.axe],
    ['Distance', character.skills.distance],
    ['Shielding', character.skills.shielding],
    ['Magic level', character.skills.magicLevel],
  ] as const;

  return (
    <aside className={`client-sidebar left-sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      <button type="button" className="sidebar-mobile-close" onClick={onMobileClose}>Fechar personagem ×</button>
      <ClientPanel title="Skills" meta={character.name} className="skills-module">
        <div className="character-tabs" role="tablist" aria-label="Selecionar personagem para skills">
          {characters.map((candidate) => <button type="button" role="tab" aria-selected={candidate.id === character.id} className={candidate.id === character.id ? 'selected' : ''} key={candidate.id} onClick={() => onSelectCharacter(candidate.id)}>{candidate.name}</button>)}
        </div>
        <div className="selected-character-summary">
          <span><strong>{character.name}</strong><small>{character.vocation} · Lv {character.level} · {stats.weaponName}</small></span>
          <span className="selected-stats"><b>ATK {stats.attack}</b><b>DEF {stats.defense}</b><b>ARM {stats.armor}</b></span>
        </div>
        <div className="resource-line"><span>HP</span><div className="compact-meter"><i className="hp-fill" style={{ width: `${100 * (actor?.hp ?? character.currentHp) / character.maxHp}%` }} /></div><b>{actor?.hp ?? character.currentHp}/{character.maxHp}</b></div>
        {character.maxMana > 0 && <div className="resource-line"><span>MP</span><div className="compact-meter"><i className="mana-fill" style={{ width: `${100 * (actor?.mana ?? character.currentMana) / character.maxMana}%` }} /></div><b>{actor?.mana ?? character.currentMana}/{character.maxMana}</b></div>}
        <div className="resource-line"><span>XP</span><div className="compact-meter"><i className="xp-fill" style={{ width: `${xpProgress}%` }} /></div><b>{Math.round(xpProgress)}%</b></div>
        <div className="xp-caption">{character.experience.toLocaleString('pt-BR')} / {xpToNext.toLocaleString('pt-BR')}</div>

        {statsDelta && <div className="stat-change-summary" aria-live="polite">Loadout: ATK {statsDelta.attack.from}→{statsDelta.attack.to} · DEF {statsDelta.defense.from}→{statsDelta.defense.to} · ARM {statsDelta.armor.from}→{statsDelta.armor.to}</div>}
        <div className="skill-list">
          {skills.map(([name, value]) => {
            const key = name === 'Magic level' ? 'magicLevel' : name.toLowerCase() as TrainableSkill;
            return (
            <div className="skill-line" key={name}>
              <span>{name}</span><b>{value}</b>
              <div className="skill-track"><i style={{ width: `${100 * skillProgress[key]}%` }} /></div>
            </div>
          );})}
        </div>
        {!character.promotion && character.level >= 20 && (
          <div className="promotion-card">
            <span><small>Promotion available</small><strong>{promotionName}</strong><i>Level 20 · 20.000 gold</i></span>
            <button type="button" disabled={!canPromote} onClick={onPromote}>Promover</button>
            <em>{promotionMessage || (gold < 20_000 ? `Faltam ${(20_000 - gold).toLocaleString('pt-BR')} gold.` : 'Requisitos atendidos.')}</em>
          </div>
        )}
      </ClientPanel>

      <ClientPanel title="Session" meta={formatSessionDuration(metrics.elapsedMs)}>
        <div className="analyzer-grid">
          <ValueRow label="Tempo" value={formatSessionDuration(metrics.elapsedMs)} />
          <ValueRow label="XP" value={compactNumber.format(metrics.xpGained)} />
          <ValueRow label="XP/h" value={compactNumber.format(metrics.xpPerHour)} />
          <ValueRow label="Kills" value={metrics.kills} />
          <ValueRow label="Loot" value={metrics.lootGained} />
          <ValueRow label="Rooms" value={metrics.roomsReached} />
        </div>
      </ClientPanel>

      <ClientPanel title="Damage" meta={`${metrics.approximateDps.toFixed(1)} DPS`} defaultOpen={false}>
        <div className="analyzer-grid">
          <ValueRow label="Causado" value={metrics.damageDealt.toLocaleString('pt-BR')} />
          <ValueRow label="Recebido" value={metrics.damageTaken.toLocaleString('pt-BR')} />
          <ValueRow label="DPS aproximado" value={metrics.approximateDps.toFixed(1)} />
        </div>
      </ClientPanel>
    </aside>
  );
}
