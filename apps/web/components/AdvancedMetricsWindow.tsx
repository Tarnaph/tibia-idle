'use client';

import React, { useState } from 'react';
import type { SessionMetrics } from '@/packages/presentation/src';
import { ItemSprite } from './ItemSprite';

export interface HuntAnalyzerItem {
  id: number;
  name: string;
  count: number;
  unitValue: number;
  totalValue: number;
}

export interface HuntAnalyzerSupply {
  id: number;
  name: string;
  count: number;
  unitCost: number;
  totalCost: number;
}

export interface HuntAnalyzerData {
  huntName: string;
  isLive: boolean;
  elapsedMs: number;
  kills: number;
  xpGained: number;
  damageDealt: number;
  damageTaken: number;
  damageByVocation: {
    knight: number;
    druid: number;
    sorcerer: number;
    paladin: number;
  };
  damageByElement: Record<string, number>;
  damageTakenByVocation: {
    knight: number;
    druid: number;
    sorcerer: number;
    paladin: number;
  };
  damageTakenByElement: Record<string, number>;
  lootGold: number;
  lootItems: HuntAnalyzerItem[];
  supplyItems: HuntAnalyzerSupply[];
  totalSupplyCost: number;
}

export interface AdvancedMetricsWindowProps {
  data?: HuntAnalyzerData;
  metrics?: SessionMetrics;
  gold?: number;
  onReset?: () => void;
}

type MetricsTab = 'hunt' | 'damage' | 'damageTaken' | 'loot' | 'supplies';

const ELEMENT_COLORS: Record<string, string> = {
  physical: '#95a5a6',
  fire: '#e67e22',
  ice: '#3498db',
  energy: '#9b59b6',
  earth: '#27ae60',
  holy: '#f1c40f',
  death: '#34495e',
};

const ELEMENT_LABELS: Record<string, string> = {
  physical: 'Físico',
  fire: 'Fogo',
  ice: 'Gelo',
  energy: 'Energia',
  earth: 'Terra',
  holy: 'Sagrado',
  death: 'Morte',
};

export function AdvancedMetricsWindow({ data, metrics, gold, onReset }: AdvancedMetricsWindowProps) {
  const [activeTab, setActiveTab] = useState<MetricsTab>('hunt');

  const formatDuration = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Derive dynamic state either from dedicated HuntAnalyzerData or legacy SessionMetrics
  const elapsedMs = data ? data.elapsedMs : metrics ? metrics.elapsedMs : 0;
  const elapsedHours = Math.max(elapsedMs / (1000 * 60 * 60), 0.0001);
  const elapsedSecs = Math.max(elapsedMs / 1000, 1);

  const kills = data ? data.kills : metrics ? metrics.kills : 0;
  const xpGained = data ? data.xpGained : metrics ? metrics.xpGained : 0;
  const xpPerHour = Math.round(xpGained / elapsedHours);

  const lootGoldOnly = data ? data.lootGold : metrics ? metrics.lootGained : 0;
  const lootItems = data?.lootItems ?? [];
  const lootItemsValue = lootItems.reduce((acc, it) => acc + it.totalValue, 0);
  const totalLootValue = lootGoldOnly + lootItemsValue;
  const lootPerHour = Math.round(totalLootValue / elapsedHours);

  const supplyItems = data?.supplyItems ?? [];
  const totalSupplyCost = data ? data.totalSupplyCost : Math.round(kills * 120 + (metrics?.damageDealt ?? 0) * 0.15);
  const supplyPerHour = Math.round(totalSupplyCost / elapsedHours);

  const balance = totalLootValue - totalSupplyCost;

  const totalDamageDealt = data ? data.damageDealt : metrics ? metrics.damageDealt : 0;
  const dps = Math.round(totalDamageDealt / elapsedSecs);

  const totalDamageTaken = data ? data.damageTaken : metrics ? metrics.damageTaken : 0;
  const damageTakenPerSec = Math.round(totalDamageTaken / elapsedSecs);

  const damageByVocation = data?.damageByVocation ?? {
    knight: Math.round(totalDamageDealt * 0.4),
    druid: Math.round(totalDamageDealt * 0.25),
    sorcerer: Math.round(totalDamageDealt * 0.2),
    paladin: Math.round(totalDamageDealt * 0.15),
  };

  const damageTakenByVocation = data?.damageTakenByVocation ?? {
    knight: Math.round(totalDamageTaken * 0.8),
    druid: Math.round(totalDamageTaken * 0.08),
    sorcerer: Math.round(totalDamageTaken * 0.06),
    paladin: Math.round(totalDamageTaken * 0.06),
  };

  const damageByElement = data?.damageByElement ?? {
    physical: Math.round(totalDamageDealt * 0.6),
    fire: Math.round(totalDamageDealt * 0.2),
    ice: Math.round(totalDamageDealt * 0.2),
  };

  const damageTakenByElement = data?.damageTakenByElement ?? {
    physical: Math.round(totalDamageTaken * 0.7),
    fire: Math.round(totalDamageTaken * 0.15),
    death: Math.round(totalDamageTaken * 0.15),
  };

  const huntTitle = data ? (data.isLive ? data.huntName : `Última: ${data.huntName}`) : 'Caçada Ativa';

  return (
    <div className="advanced-metrics-container gothic-window-panel">
      {/* Sub-Header Tab Bar + Reset Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%', boxSizing: 'border-box' }}>
        <div className="metrics-tab-bar" style={{ flex: 1 }}>
          <button
            type="button"
            className={`metrics-tab-btn ${activeTab === 'hunt' ? 'active' : ''}`}
            onClick={() => setActiveTab('hunt')}
          >
            Caça
          </button>
          <button
            type="button"
            className={`metrics-tab-btn ${activeTab === 'damage' ? 'active' : ''}`}
            onClick={() => setActiveTab('damage')}
          >
            Dano
          </button>
          <button
            type="button"
            className={`metrics-tab-btn ${activeTab === 'damageTaken' ? 'active' : ''}`}
            onClick={() => setActiveTab('damageTaken')}
          >
            Recebido
          </button>
          <button
            type="button"
            className={`metrics-tab-btn ${activeTab === 'loot' ? 'active' : ''}`}
            onClick={() => setActiveTab('loot')}
          >
            Loot ({lootItems.length})
          </button>
          <button
            type="button"
            className={`metrics-tab-btn ${activeTab === 'supplies' ? 'active' : ''}`}
            onClick={() => setActiveTab('supplies')}
          >
            Gastos ({supplyItems.length})
          </button>
        </div>

        {onReset && (
          <button
            type="button"
            onClick={onReset}
            style={{
              background: '#241310',
              border: '1px solid #7a2820',
              color: '#ff9c90',
              fontSize: '8.5px',
              fontWeight: 800,
              padding: '3px 6px',
              borderRadius: '2px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              transition: 'all 0.15s ease',
            }}
            title="Zerar métricas do analisador"
          >
            <span>🔄</span>
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Tab Contents */}
      <div className="metrics-content-body">
        {activeTab === 'hunt' && (
          <div className="analyzer-card">
            <div className="analyzer-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>ANALISADOR DE CAÇA</span>
              <span style={{ fontSize: '9px', color: data?.isLive ? '#2ecc71' : '#a09587', fontWeight: 700 }}>
                {data?.isLive ? '● EM ANDAMENTO' : '○ FINALIZADA'}
              </span>
            </div>
            <div className="analyzer-row">
              <span>Caçada</span>
              <strong style={{ color: '#f3e5ab' }}>{huntTitle}</strong>
            </div>
            <div className="analyzer-row">
              <span>Duração</span>
              <strong>{formatDuration(elapsedMs)}</strong>
            </div>
            <div className="analyzer-row">
              <span>XP/h</span>
              <strong>{xpPerHour.toLocaleString('pt-BR')}</strong>
            </div>
            <div className="analyzer-row">
              <span>XP Ganho</span>
              <strong className="text-gold">+{xpGained.toLocaleString('pt-BR')}</strong>
            </div>
            <div className="analyzer-row">
              <span>Abates (Kills)</span>
              <strong>{kills} criaturas</strong>
            </div>
            <div className="analyzer-row">
              <span>Loot Total</span>
              <strong className="text-gold">{totalLootValue.toLocaleString('pt-BR')} gp</strong>
            </div>
            <div className="analyzer-row">
              <span>Suprimentos Gastos</span>
              <strong className="text-red">-{totalSupplyCost.toLocaleString('pt-BR')} gp</strong>
            </div>
            <div className="analyzer-row highlight">
              <span>Balanço</span>
              <strong className={balance >= 0 ? 'text-green' : 'text-red'}>
                {balance >= 0 ? `+${balance.toLocaleString('pt-BR')}` : balance.toLocaleString('pt-BR')} gp
              </strong>
            </div>
          </div>
        )}

        {activeTab === 'damage' && (
          <div className="analyzer-card">
            <div className="analyzer-title">DANO CAUSADO</div>
            <div className="analyzer-row">
              <span>Dano Total</span>
              <strong className="text-gold">{totalDamageDealt.toLocaleString('pt-BR')}</strong>
            </div>
            <div className="analyzer-row">
              <span>DPS Médio</span>
              <strong>{dps.toLocaleString('pt-BR')}/s</strong>
            </div>
            <div className="analyzer-section-label">Dano por Integrante da Party</div>
            {(['knight', 'druid', 'sorcerer', 'paladin'] as const).map((voc) => {
              const vocNames: Record<string, string> = {
                knight: 'Knight (EK)',
                druid: 'Druid (ED)',
                sorcerer: 'Sorcerer (MS)',
                paladin: 'Paladin (RP)',
              };
              const dmg = damageByVocation[voc] || 0;
              const vocDps = Math.round(dmg / elapsedSecs);
              const pct = totalDamageDealt > 0 ? Math.round((dmg / totalDamageDealt) * 100) : 0;
              return (
                <div key={voc} className="analyzer-row">
                  <span>{vocNames[voc]}</span>
                  <strong>
                    {vocDps}/s ({pct}%) - {dmg.toLocaleString('pt-BR')}
                  </strong>
                </div>
              );
            })}

            <div className="analyzer-divider" />
            <div className="analyzer-section-label">Elementos de Dano</div>
            {Object.entries(damageByElement)
              .filter(([, amt]) => amt > 0)
              .map(([elem, amt]) => {
                const pct = totalDamageDealt > 0 ? Math.round((amt / totalDamageDealt) * 100) : 0;
                const barColor = ELEMENT_COLORS[elem] || '#e5c04b';
                const label = ELEMENT_LABELS[elem] || elem;
                return (
                  <div key={elem} className="analyzer-progress-line">
                    <span style={{ width: '54px', color: barColor }}>{label}</span>
                    <div className="bar-wrapper">
                      <div className="bar-fill" style={{ width: `${Math.min(100, pct)}%`, background: barColor }} />
                    </div>
                    <span style={{ width: '60px', textAlign: 'right' }}>
                      {pct}% ({amt.toLocaleString('pt-BR')})
                    </span>
                  </div>
                );
              })}
            {Object.keys(damageByElement).length === 0 && (
              <div style={{ color: '#888', fontSize: '9px', textAlign: 'center', padding: '4px 0' }}>
                Nenhum dano registrado ainda.
              </div>
            )}
          </div>
        )}

        {activeTab === 'damageTaken' && (
          <div className="analyzer-card">
            <div className="analyzer-title">DANO RECEBIDO</div>
            <div className="analyzer-row">
              <span>Dano Recebido Total</span>
              <strong className="text-red">{totalDamageTaken.toLocaleString('pt-BR')}</strong>
            </div>
            <div className="analyzer-row">
              <span>Dano /s Médio</span>
              <strong>{damageTakenPerSec.toLocaleString('pt-BR')}/s</strong>
            </div>
            <div className="analyzer-section-label">Dano Recebido por Integrante</div>
            {(['knight', 'druid', 'sorcerer', 'paladin'] as const).map((voc) => {
              const vocNames: Record<string, string> = {
                knight: 'Knight (EK)',
                druid: 'Druid (ED)',
                sorcerer: 'Sorcerer (MS)',
                paladin: 'Paladin (RP)',
              };
              const dmg = damageTakenByVocation[voc] || 0;
              const vocDps = Math.round(dmg / elapsedSecs);
              const pct = totalDamageTaken > 0 ? Math.round((dmg / totalDamageTaken) * 100) : 0;
              return (
                <div key={voc} className="analyzer-row">
                  <span>{vocNames[voc]}</span>
                  <strong>
                    {vocDps}/s ({pct}%) - {dmg.toLocaleString('pt-BR')}
                  </strong>
                </div>
              );
            })}

            <div className="analyzer-divider" />
            <div className="analyzer-section-label">Dano Recebido por Elemento</div>
            {Object.entries(damageTakenByElement)
              .filter(([, amt]) => amt > 0)
              .map(([elem, amt]) => {
                const pct = totalDamageTaken > 0 ? Math.round((amt / totalDamageTaken) * 100) : 0;
                const barColor = ELEMENT_COLORS[elem] || '#e74c3c';
                const label = ELEMENT_LABELS[elem] || elem;
                return (
                  <div key={elem} className="analyzer-progress-line">
                    <span style={{ width: '54px', color: barColor }}>{label}</span>
                    <div className="bar-wrapper">
                      <div className="bar-fill" style={{ width: `${Math.min(100, pct)}%`, background: barColor }} />
                    </div>
                    <span style={{ width: '60px', textAlign: 'right' }}>
                      {pct}% ({amt.toLocaleString('pt-BR')})
                    </span>
                  </div>
                );
              })}
            {Object.keys(damageTakenByElement).length === 0 && (
              <div style={{ color: '#888', fontSize: '9px', textAlign: 'center', padding: '4px 0' }}>
                Nenhum dano recebido registrado.
              </div>
            )}
          </div>
        )}

        {activeTab === 'loot' && (
          <div className="analyzer-card">
            <div className="analyzer-title">ANALISADOR DE LOOT</div>
            <div className="analyzer-row">
              <span>Valor Total em Gold</span>
              <strong className="text-gold">{totalLootValue.toLocaleString('pt-BR')} gp</strong>
            </div>
            <div className="analyzer-row">
              <span>Moedas (Gold Coins)</span>
              <strong className="text-gold">{lootGoldOnly.toLocaleString('pt-BR')} gp</strong>
            </div>
            <div className="analyzer-row">
              <span>Rendimento por Hora</span>
              <strong className="text-gold">{lootPerHour.toLocaleString('pt-BR')} gp/h</strong>
            </div>
            <div className="analyzer-divider" />
            <div className="analyzer-section-label" style={{ marginBottom: '4px' }}>
              Itens Dropados ({lootItems.length})
            </div>
            {lootItems.length === 0 ? (
              <div style={{ color: '#888', textAlign: 'center', padding: '12px 0', fontSize: '9.5px' }}>
                Nenhum item dropado nesta caçada ainda.
              </div>
            ) : (
              <div
                className="items-grid-analyser"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(38px, 1fr))',
                  gap: '6px',
                  maxHeight: '140px',
                  overflowY: 'auto',
                }}
              >
                {lootItems.map((item) => (
                  <div
                    key={`${item.id}-${item.name}`}
                    className="analyser-item-slot"
                    title={`${item.name} (${item.count}x) · Total: ${item.totalValue.toLocaleString('pt-BR')} gp`}
                  >
                    <ItemSprite itemId={item.id} label={item.name} />
                    <span className="item-count-badge">{item.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'supplies' && (
          <div className="analyzer-card">
            <div className="analyzer-title">ANALISADOR DE SUPRIMENTOS</div>
            <div className="analyzer-row">
              <span>Custo Total em Gold</span>
              <strong className="text-red">-{totalSupplyCost.toLocaleString('pt-BR')} gp</strong>
            </div>
            <div className="analyzer-row">
              <span>Gasto por Hora</span>
              <strong className="text-red">-{supplyPerHour.toLocaleString('pt-BR')} gp/h</strong>
            </div>
            <div className="analyzer-divider" />
            <div className="analyzer-section-label" style={{ marginBottom: '4px' }}>
              Poções e Runas Gastas ({supplyItems.length})
            </div>
            {supplyItems.length === 0 ? (
              <div style={{ color: '#888', textAlign: 'center', padding: '12px 0', fontSize: '9.5px' }}>
                Nenhum suprimento consumido nesta caçada ainda.
              </div>
            ) : (
              <div
                className="items-grid-analyser"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(38px, 1fr))',
                  gap: '6px',
                  maxHeight: '140px',
                  overflowY: 'auto',
                }}
              >
                {supplyItems.map((item) => (
                  <div
                    key={`${item.id}-${item.name}`}
                    className="analyser-item-slot"
                    title={`${item.name} (${item.count}x) · Custo: ${item.totalCost.toLocaleString('pt-BR')} gp`}
                  >
                    <ItemSprite itemId={item.id} label={item.name} />
                    <span className="item-count-badge">{item.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
