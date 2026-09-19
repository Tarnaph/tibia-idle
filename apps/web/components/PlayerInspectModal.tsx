'use client';

import React, { useEffect, useState } from 'react';
import type { EquipmentDefinition } from '@/packages/content-schema/src';
import { ItemSprite } from './ItemSprite';
import { showGlobalItemTooltip, hideGlobalItemTooltip } from './GlobalItemTooltip';
import equipmentJson from '@/content/generated/equipment.json';

const equipmentCatalog = (equipmentJson as unknown as { items: EquipmentDefinition[] }).items;
const equipmentById = new Map<number, EquipmentDefinition>();
for (const eq of equipmentCatalog) {
  equipmentById.set(eq.id, eq);
}

export interface PlayerInspectModalProps {
  isOpen: boolean;
  characterName: string;
  isOnlineLocal?: boolean;
  onClose: () => void;
  onPrivateMessage?: (name: string) => void;
}

interface InspectedCharacterData {
  id: string;
  name: string;
  level: number;
  vocationName: string;
  promotion?: string | null;
  health?: number;
  maxHealth?: number;
  mana?: number;
  maxMana?: number;
  isOnline: boolean;
  skills: Array<{ skillId: number; skillName: string; value: number }>;
  inventory: Array<{ slot: string; serverId: number; amount?: number; attributesJson?: string | null }>;
}

const PAPERDOLL_SLOTS = [
  { key: 'necklace', label: 'Colar', x: 0, y: 0 },
  { key: 'head', label: 'Elmo', x: 1, y: 0 },
  { key: 'backpack', label: 'Mochila', x: 2, y: 0 },
  { key: 'leftHand', label: 'Arma', x: 0, y: 1 },
  { key: 'armor', label: 'Armadura', x: 1, y: 1 },
  { key: 'rightHand', label: 'Escudo', x: 2, y: 1 },
  { key: 'ring', label: 'Anel', x: 0, y: 2 },
  { key: 'legs', label: 'Calça', x: 1, y: 2 },
  { key: 'ammo', label: 'Munição', x: 2, y: 2 },
  { key: 'boots', label: 'Botas', x: 1, y: 3 },
];

export function PlayerInspectModal({
  isOpen,
  characterName,
  isOnlineLocal,
  onClose,
  onPrivateMessage,
}: PlayerInspectModalProps) {
  const [data, setData] = useState<InspectedCharacterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !characterName) {
      setData(null);
      setError(null);
      return;
    }

    let isSubscribed = true;
    setLoading(true);
    setError(null);

    fetch(`/api/characters/lookup?name=${encodeURIComponent(characterName)}`)
      .then((res) => res.json())
      .then((res: any) => {
        if (!isSubscribed) return;
        if (res.success && res.character) {
          setData(res.character);
        } else {
          setError(res.error || 'Personagem não encontrado.');
        }
      })
      .catch((err) => {
        if (!isSubscribed) return;
        setError(err.message || 'Erro ao carregar dados do personagem.');
      })
      .finally(() => {
        if (isSubscribed) setLoading(false);
      });

    return () => {
      isSubscribed = false;
      hideGlobalItemTooltip();
    };
  }, [isOpen, characterName]);

  if (!isOpen) return null;

  const equippedMap = new Map<string, { serverId: number; attributesJson?: string | null }>();
  if (data?.inventory) {
    for (const item of data.inventory) {
      if (item.slot && !item.slot.startsWith('backpack_') && !item.slot.startsWith('bag_')) {
        equippedMap.set(item.slot, { serverId: item.serverId, attributesJson: item.attributesJson });
      }
    }
  }

  const skillsMap = new Map<string, number>();
  if (data?.skills) {
    for (const sk of data.skills) {
      skillsMap.set(sk.skillName.toLowerCase(), sk.value);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999999,
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '540px',
          maxWidth: '94vw',
          backgroundColor: '#1b1e22',
          border: '1.5px solid #3c424d',
          borderRadius: '8px',
          boxShadow: '0 16px 40px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.08)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: '#e5e7eb',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '12px 18px',
            borderBottom: '1px solid #2e343d',
            backgroundColor: '#141619',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🔍</span>
            <h3
              style={{
                margin: 0,
                color: '#f3d37a',
                fontFamily: 'Cinzel, Georgia, serif',
                fontSize: '18px',
                fontWeight: 700,
                letterSpacing: '0.5px',
              }}
            >
              Inspecionar Jogador
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#9ca3af',
              fontSize: '20px',
              cursor: 'pointer',
              lineHeight: 1,
              padding: '2px 6px',
            }}
            title="Fechar"
          >
            ×
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {loading ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#9ca3af' }}>
              Carregando dados de {characterName}...
            </div>
          ) : error || !data ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#ef4444' }}>
              {error || 'Não foi possível obter os dados do jogador.'}
            </div>
          ) : (
            <>
              {/* Character Summary Bar */}
              {(() => {
                const effectiveIsOnline = isOnlineLocal !== undefined ? isOnlineLocal : Boolean(data.isOnline);
                return (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      backgroundColor: '#141619',
                      borderRadius: '6px',
                      border: '1px solid #2b3038',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px', fontWeight: 700, color: '#f3d37a' }}>
                          {data.name}
                        </span>
                        <span
                          style={{
                            fontSize: '10px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: effectiveIsOnline ? 'rgba(34, 197, 94, 0.2)' : 'rgba(156, 163, 175, 0.2)',
                            color: effectiveIsOnline ? '#4ade80' : '#9ca3af',
                            fontWeight: 600,
                          }}
                        >
                          {effectiveIsOnline ? '● Online' : '○ Offline'}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                        {data.promotion || data.vocationName} · Nível {data.level}
                      </div>
                    </div>

                    {data.health !== undefined && data.maxHealth !== undefined && (
                      <div style={{ textAlign: 'right', fontSize: '11px', color: '#9ca3af' }}>
                        <div>
                          Vida: <b style={{ color: '#4ade80' }}>{data.health}</b>/{data.maxHealth}
                        </div>
                        {data.mana !== undefined && data.maxMana !== undefined && (
                          <div>
                            Mana: <b style={{ color: '#60a5fa' }}>{data.mana}</b>/{data.maxMana}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Grid with 2 Columns: Equipment Paperdoll (Left) + Skills (Right) */}
              <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '16px' }}>
                {/* Equipment Paperdoll */}
                <div
                  style={{
                    backgroundColor: '#141619',
                    border: '1px solid #2b3038',
                    borderRadius: '6px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', marginBottom: '8px' }}>
                    EQUIPAMENTOS
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 44px)',
                      gridTemplateRows: 'repeat(4, 44px)',
                      gap: '6px',
                    }}
                  >
                    {PAPERDOLL_SLOTS.map((slot) => {
                      const item = equippedMap.get(slot.key);
                      const itemDef = item?.serverId ? equipmentById.get(item.serverId) : null;
                      const hasItem = Boolean(item && item.serverId);

                      return (
                        <div
                          key={slot.key}
                          style={{
                            gridColumn: slot.x + 1,
                            gridRow: slot.y + 1,
                            width: '44px',
                            height: '44px',
                            backgroundColor: '#0f1113',
                            border: hasItem ? '1.5px solid #475569' : '1px solid #23272e',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: hasItem ? 'pointer' : 'default',
                            boxShadow: hasItem ? 'inset 0 0 6px rgba(0,0,0,0.5)' : 'none',
                          }}
                          onMouseEnter={(e) => {
                            if (hasItem && item) {
                              let parsedAttr = null;
                              if (item.attributesJson) {
                                try {
                                  parsedAttr = JSON.parse(item.attributesJson);
                                } catch {}
                              }
                              showGlobalItemTooltip(
                                {
                                  item: itemDef,
                                  itemId: item.serverId,
                                  name: itemDef?.name,
                                  slot: slot.label,
                                  attributes: parsedAttr,
                                  equippedInName: data.name,
                                },
                                e
                              );
                            }
                          }}
                          onMouseMove={(e) => {
                            if (hasItem && item) {
                              let parsedAttr = null;
                              if (item.attributesJson) {
                                try {
                                  parsedAttr = JSON.parse(item.attributesJson);
                                } catch {}
                              }
                              showGlobalItemTooltip(
                                {
                                  item: itemDef,
                                  itemId: item.serverId,
                                  name: itemDef?.name,
                                  slot: slot.label,
                                  attributes: parsedAttr,
                                  equippedInName: data.name,
                                },
                                e
                              );
                            }
                          }}
                          onMouseLeave={() => hideGlobalItemTooltip()}
                        >
                          {hasItem && item ? (
                            <ItemSprite itemId={item.serverId} label={itemDef?.name || slot.label} size={32} />
                          ) : (
                            <span style={{ fontSize: '9px', color: '#4b5563', userSelect: 'none' }}>
                              {slot.label}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Skills Table */}
                <div
                  style={{
                    backgroundColor: '#141619',
                    border: '1px solid #2b3038',
                    borderRadius: '6px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', marginBottom: '8px' }}>
                    HABILIDADES (SKILLS)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {[
                      { label: 'Magic Level', key: 'magiclevel' },
                      { label: 'Shielding', key: 'shielding' },
                      { label: 'Sword Fighting', key: 'sword' },
                      { label: 'Axe Fighting', key: 'axe' },
                      { label: 'Club Fighting', key: 'club' },
                      { label: 'Distance Fighting', key: 'distance' },
                      { label: 'Fist Fighting', key: 'fist' },
                      { label: 'Fishing', key: 'fishing' },
                    ].map((s) => {
                      const val = skillsMap.get(s.key) ?? skillsMap.get(s.label.toLowerCase()) ?? 10;
                      return (
                        <div
                          key={s.key}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '4px 8px',
                            backgroundColor: '#1a1d22',
                            borderRadius: '4px',
                            fontSize: '12px',
                          }}
                        >
                          <span style={{ color: '#d1d5db' }}>{s.label}</span>
                          <b style={{ color: '#f3d37a' }}>{val}</b>
                        </div>
                      );
                    })}
                  </div>

                  {onPrivateMessage && (
                    <button
                      type="button"
                      onClick={() => {
                        onPrivateMessage(data.name);
                        onClose();
                      }}
                      style={{
                        marginTop: 'auto',
                        padding: '8px 12px',
                        backgroundColor: '#2563eb',
                        border: 'none',
                        borderRadius: '4px',
                        color: '#ffffff',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      💬 Mandar Mensagem
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '10px 18px',
            borderTop: '1px solid #2e343d',
            backgroundColor: '#141619',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px 16px',
              backgroundColor: '#374151',
              border: 'none',
              borderRadius: '4px',
              color: '#f3f4f6',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
