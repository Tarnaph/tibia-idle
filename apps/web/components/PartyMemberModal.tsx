'use client';

import { useEffect, useState } from 'react';
import visualAssetsJson from '@/content/generated/tibia860-assets.json';
import type { BaseVocationName, VocationName } from '@/packages/content-schema/src';
import type { Tibia860AssetManifest } from '@/packages/tibia860-assets/src/types';

const assets = visualAssetsJson as Tibia860AssetManifest;

export type Gender = 'Masculino' | 'Feminino';
export type SelectableVocation = BaseVocationName | 'Monk';

interface Props {
  open: boolean;
  used: VocationName[];
  onClose(): void;
  onCreate(name: string, vocation: BaseVocationName, gender?: Gender): string | null;
}

interface VocationCardData {
  id: SelectableVocation;
  base: BaseVocationName;
  name: string;
  roleDescription: string;
}

const VOCATION_OPTIONS: VocationCardData[] = [
  { id: 'Knight', base: 'Knight', name: 'Knight', roleDescription: 'Tank · corpo a corpo' },
  { id: 'Monk', base: 'Knight', name: 'Monk', roleDescription: 'Tank · punhos' },
  { id: 'Paladin', base: 'Paladin', name: 'Paladin', roleDescription: 'Atirador · distância' },
  { id: 'Sorcerer', base: 'Sorcerer', name: 'Sorcerer', roleDescription: 'Atirador · magia' },
  { id: 'Druid', base: 'Druid', name: 'Druid', roleDescription: 'Atirador · magia + cura' },
];

export function PartyMemberModal({ open, used, onClose, onCreate }: Props) {
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('Masculino');
  const [selectedVocation, setSelectedVocation] = useState<SelectableVocation>('Knight');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setError('');
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Por favor, informe o nome do personagem.');
      return;
    }

    const vocOption = VOCATION_OPTIONS.find((v) => v.id === selectedVocation);
    const targetBase = vocOption ? vocOption.base : 'Knight';

    const result = onCreate(name.trim(), targetBase, gender);
    if (result) {
      setError(result);
    } else {
      setName('');
      setError('');
      onClose();
    }
  };

  return (
    <div
      className="modal-backdrop new-member-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="new-member-modal-card" role="dialog" aria-modal="true" aria-label="Novo Membro">
        {/* Modal Header */}
        <div className="new-member-header">
          <h2 className="new-member-title">NOVO MEMBRO</h2>
          <p className="new-member-subtitle">
            Digite o nome e escolha a vocação do novo membro da party.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="new-member-form">
          {/* Character Name Input */}
          <div className="new-member-input-group">
            <input
              type="text"
              value={name}
              maxLength={18}
              onChange={(e) => setName(e.target.value)}
              placeholder="nome do personagem"
              className="new-member-input"
              autoFocus
            />
          </div>

          {/* Gender Selector */}
          <div className="new-member-gender-row">
            <button
              type="button"
              className={`new-member-gender-btn ${gender === 'Masculino' ? 'active' : ''}`}
              onClick={() => setGender('Masculino')}
            >
              Masculino
            </button>
            <button
              type="button"
              className={`new-member-gender-btn ${gender === 'Feminino' ? 'active' : ''}`}
              onClick={() => setGender('Feminino')}
            >
              Feminino
            </button>
          </div>

          {/* Vocation Grid (2 columns) */}
          <div className="new-member-vocations-grid">
            {VOCATION_OPTIONS.map((option) => {
              const isSelected = selectedVocation === option.id;
              const outfitFrame =
                assets.outfits[option.base]?.frames.find((f) => f.direction === 'south') ??
                assets.outfits[option.base]?.frames[0];

              return (
                <div
                  key={option.id}
                  className={`new-member-voc-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedVocation(option.id)}
                >
                  <div className="voc-card-sprite">
                    {outfitFrame ? (
                      <img
                        src={outfitFrame.publicUrl}
                        alt={option.name}
                        className="voc-sprite-img"
                      />
                    ) : (
                      <span className="voc-placeholder-icon">⚔️</span>
                    )}
                  </div>
                  <div className="voc-card-info">
                    <strong className="voc-card-name">{option.name}</strong>
                    <small className="voc-card-role">{option.roleDescription}</small>
                  </div>
                </div>
              );
            })}
          </div>

          {error && <p className="new-member-error">{error}</p>}

          {/* Action Buttons */}
          <div className="new-member-actions">
            <button type="submit" className="new-member-btn-create">
              Criar personagem
            </button>
            <button type="button" className="new-member-btn-cancel" onClick={onClose}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
