'use client';

import React, { useState } from 'react';
import type { BaseVocationName } from '@/packages/content-schema/src';
import visualAssetsJson from '@/content/generated/tibia860-assets.json';
import type { Tibia860AssetManifest } from '@/packages/tibia860-assets/src/types';

const assets = visualAssetsJson as Tibia860AssetManifest;

interface VocationChoiceModalProps {
  open: boolean;
  characterName: string;
  onSelectVocation: (vocation: BaseVocationName) => void;
}

interface VocationOption {
  id: BaseVocationName;
  name: string;
  role: string;
  description: string;
  icon: string;
}

const VOCATIONS: VocationOption[] = [
  {
    id: 'Knight',
    name: 'Knight',
    role: 'Corpo a Corpo & Tank',
    description: 'Mestre no combate de proximidade, alta vida (HP), armadura pesada e proteção na linha de frente.',
    icon: '⚔️',
  },
  {
    id: 'Paladin',
    name: 'Paladin',
    role: 'Distância & Precisão',
    description: 'Especialista em arcos, lança-dardos e munições de distância com equilíbrio entre HP e Mana.',
    icon: '🏹',
  },
  {
    id: 'Sorcerer',
    name: 'Sorcerer',
    role: 'Magia Ofensiva',
    description: 'Dominador de feitiços devastadores de fogo e energia com regeneração acelerada de Mana.',
    icon: '🔮',
  },
  {
    id: 'Druid',
    name: 'Druid',
    role: 'Magia de Cura & Elementos',
    description: 'Guardião mestre em magias de cura de grupo, gelo e terra com grande reserva mística.',
    icon: '🌿',
  },
];

export function VocationChoiceModal({
  open,
  characterName,
  onSelectVocation,
}: VocationChoiceModalProps) {
  const [selected, setSelected] = useState<BaseVocationName>('Knight');

  if (!open) return null;

  const handleConfirm = () => {
    onSelectVocation(selected);
  };

  return (
    <div
      className="modal-backdrop vocation-choice-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(3px)',
      }}
    >
      <div
        className="vocation-choice-card"
        style={{
          width: '520px',
          maxWidth: '92vw',
          backgroundColor: '#16191e',
          border: '2px solid #3c434f',
          borderRadius: '8px',
          boxShadow: '0 12px 36px rgba(0,0,0,0.8)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: '#e0e6ed',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px',
            backgroundColor: '#1e232b',
            borderBottom: '1px solid #2d333e',
            textAlign: 'center',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '18px', color: '#ffd700', textTransform: 'uppercase', letterSpacing: '1px' }}>
            🏆 Escolha sua Vocação (Nível 8)
          </h2>
          <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#9aa4b2' }}>
            Parabéns <strong>{characterName}</strong>! Você atingiu o Nível 8 e agora deve escolher a sua vocação permanente.
          </p>
        </div>

        {/* Options List */}
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {VOCATIONS.map((voc) => {
            const isSelected = selected === voc.id;
            const outfitFrame =
              assets.outfits[voc.id]?.frames.find((f) => f.direction === 'south') ??
              assets.outfits[voc.id]?.frames[0];

            return (
              <div
                key={voc.id}
                onClick={() => setSelected(voc.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  border: `2px solid ${isSelected ? '#ffd700' : '#2b313d'}`,
                  backgroundColor: isSelected ? 'rgba(255, 215, 0, 0.08)' : '#1a1e24',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease-in-out',
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '6px',
                    backgroundColor: '#101216',
                    border: '1px solid #333b48',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {outfitFrame ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={outfitFrame.publicUrl} alt={voc.name} style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
                  ) : (
                    <span style={{ fontSize: '20px' }}>{voc.icon}</span>
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '14px', color: isSelected ? '#ffd700' : '#ffffff' }}>{voc.name}</strong>
                    <span style={{ fontSize: '11px', color: '#ffb74d', backgroundColor: 'rgba(255,183,77,0.12)', padding: '2px 6px', borderRadius: '3px' }}>
                      {voc.role}
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#8b96a5', lineHeight: '1.4' }}>
                    {voc.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#13161a',
            borderTop: '1px solid #232832',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <small style={{ fontSize: '11px', color: '#7a8594' }}>
            ℹ️ A escolha é permanente. Você poderá trocá-la depois com o Pergaminho de Troca.
          </small>

          <button
            type="button"
            onClick={handleConfirm}
            style={{
              padding: '8px 20px',
              borderRadius: '5px',
              border: 'none',
              backgroundColor: '#28a745',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(40,167,69,0.3)',
            }}
          >
            Confirmar {selected}
          </button>
        </div>
      </div>
    </div>
  );
}
