'use client';

import { useState } from 'react';
import type { BaseVocationName, VocationName } from '@/packages/content-schema/src';

interface Props { open: boolean; used: VocationName[]; onClose(): void; onCreate(name: string, vocation: BaseVocationName): string | null }
const vocations: BaseVocationName[] = ['Knight', 'Paladin', 'Sorcerer', 'Druid'];

export function PartyMemberModal({ open, used, onClose, onCreate }: Props) {
  const [name, setName] = useState(''); const [vocation, setVocation] = useState<BaseVocationName>('Paladin'); const [error, setError] = useState('');
  if (!open) return null;
  const submit = () => { const result = onCreate(name, vocation); if (result) setError(result); else { setName(''); setError(''); onClose(); } };
  return (
    <div className="modal-backdrop party-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="party-create-modal" role="dialog" aria-modal="true" aria-label="Criar membro">
        <header><div><p className="eyebrow">PARTY</p><h2>Criar membro</h2></div><button type="button" onClick={onClose}>×</button></header>
        <label>Nome<input value={name} maxLength={18} onChange={(event) => setName(event.target.value)} placeholder="Nome do personagem" autoFocus /></label>
        <fieldset><legend>Vocação</legend>{vocations.map((option) => <button type="button" key={option} disabled={used.includes(option)} className={vocation === option ? 'selected' : ''} onClick={() => setVocation(option)}>{option}<small>{used.includes(option) ? 'Já utilizada' : option === 'Knight' ? 'Tank' : option === 'Druid' ? 'Support' : 'DPS'}</small></button>)}</fieldset>
        {error && <p className="form-error">{error}</p>}
        <footer><button type="button" onClick={onClose}>Cancelar</button><button type="button" className="primary-action" onClick={submit}>Adicionar</button></footer>
      </section>
    </div>
  );
}
