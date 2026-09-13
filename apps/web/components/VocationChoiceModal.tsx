'use client';

import React, { useState } from 'react';
import type { BaseVocationName } from '@/packages/content-schema/src';
import visualAssetsJson from '@/content/generated/tibia1098-combat-assets.json';
import type { Tibia1098AssetManifest } from '@/packages/tibia1098-assets/src/types';

const assets = visualAssetsJson as unknown as Tibia1098AssetManifest;

interface VocationChoiceModalProps {
  open: boolean;
  characterName: string;
  takenVocations?: Set<BaseVocationName> | BaseVocationName[];
  onSelectVocation: (vocation: BaseVocationName) => void;
}

interface VocationOption {
  id: BaseVocationName;
  name: string;
  role: string;
  description: string;
  icon: string;
  thumbUrl: string;
}

const VOCATIONS: VocationOption[] = [
  {
    id: 'Knight',
    name: 'Knight',
    role: 'Corpo a Corpo & Tank',
    description: 'Mestre no combate de proximidade com espadas, machados e maças. Altíssima vida (HP), armadura pesada e proteção na linha de frente.',
    icon: '⚔️',
    thumbUrl: '/generated/outfit-thumbs/knight.png',
  },
  {
    id: 'Paladin',
    name: 'Paladin',
    role: 'Distância & Precisão',
    description: 'Especialista em arcos, lanças e combate à distância. Equilíbrio entre vida e mana, com alto dano físico e magias sagradas.',
    icon: '🏹',
    thumbUrl: '/generated/outfit-thumbs/hunter.png',
  },
  {
    id: 'Sorcerer',
    name: 'Sorcerer',
    role: 'Magia Ofensiva Destrutiva',
    description: 'Dominador de feitiços devastadores de fogo, energia e morte. Enorme reserva e regeneração acelerada de Mana.',
    icon: '🔮',
    thumbUrl: '/generated/outfit-thumbs/mage.png',
  },
  {
    id: 'Druid',
    name: 'Druid',
    role: 'Magia de Cura & Elementos',
    description: 'Guardião da natureza mestre em magias de cura de grupo, gelo e terra. Suporte indispensável para qualquer grupo.',
    icon: '🌿',
    thumbUrl: '/generated/outfit-thumbs/mage.png',
  },
];

export function VocationChoiceModal({
  open,
  characterName,
  takenVocations,
  onSelectVocation,
}: VocationChoiceModalProps) {
  const takenSet = new Set<BaseVocationName>(
    Array.isArray(takenVocations)
      ? takenVocations
      : takenVocations
      ? Array.from(takenVocations)
      : []
  );

  const firstAvailable = VOCATIONS.find((v) => !takenSet.has(v.id))?.id ?? 'Knight';
  const [selected, setSelected] = useState<BaseVocationName>(firstAvailable);

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
            🏆 Escolha sua Vocação
          </h2>
          <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#9aa4b2' }}>
            Bem-vindo(a) a Thais, <strong>{characterName}</strong>! Escolha sua vocação permanente para definir seu estilo de jogo e habilidades.
          </p>
        </div>

        {/* Options List */}
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {VOCATIONS.map((voc) => {
            const isTaken = takenSet.has(voc.id);
            const isSelected = selected === voc.id && !isTaken;

            return (
              <div
                key={voc.id}
                onClick={() => {
                  if (!isTaken) setSelected(voc.id);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  border: `2px solid ${isTaken ? '#4a2525' : isSelected ? '#ffd700' : '#2b313d'}`,
                  backgroundColor: isTaken
                    ? 'rgba(40, 15, 15, 0.4)'
                    : isSelected
                    ? 'rgba(255, 215, 0, 0.08)'
                    : '#1a1e24',
                  cursor: isTaken ? 'not-allowed' : 'pointer',
                  opacity: isTaken ? 0.55 : 1,
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
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={voc.thumbUrl}
                    alt={voc.name}
                    style={{ width: '36px', height: '36px', objectFit: 'contain', imageRendering: 'pixelated' }}
                    onError={(e) => {
                      // Fallback to combat assets frame if thumbnail fails
                      const fallbackUrl = assets.outfits[voc.id]?.frames.find((f) => f.direction === 'south')?.publicUrl;
                      if (fallbackUrl) {
                        e.currentTarget.src = fallbackUrl;
                      }
                    }}
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '14px', color: isTaken ? '#ff8888' : isSelected ? '#ffd700' : '#ffffff' }}>
                      {voc.name}
                    </strong>
                    {isTaken ? (
                      <span style={{ fontSize: '11px', color: '#ff6666', backgroundColor: 'rgba(255,80,80,0.15)', padding: '2px 6px', borderRadius: '3px', fontWeight: 'bold' }}>
                        🔒 Já em uso na conta
                      </span>
                    ) : (
                      <span style={{ fontSize: '11px', color: '#ffb74d', backgroundColor: 'rgba(255,183,77,0.12)', padding: '2px 6px', borderRadius: '3px' }}>
                        {voc.role}
                      </span>
                    )}
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '11px', color: isTaken ? '#a87575' : '#8b96a5', lineHeight: '1.4' }}>
                    {isTaken ? 'Sua conta já possui um personagem com esta vocação.' : voc.description}
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
