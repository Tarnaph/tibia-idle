'use client';

import React, { useState } from 'react';
import type { SessionMetrics } from '@/packages/presentation/src';
import { ItemSprite } from './ItemSprite';

interface AdvancedMetricsWindowProps {
  metrics: SessionMetrics;
  gold: number;
}

type MetricsTab = 'hunt' | 'damage' | 'damageTaken' | 'loot' | 'supplies';

export function AdvancedMetricsWindow({ metrics, gold }: AdvancedMetricsWindowProps) {
  const [activeTab, setActiveTab] = useState<MetricsTab>('hunt');

  const formatDuration = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const elapsedHours = Math.max(metrics.elapsedMs / (1000 * 60 * 60), 0.001);
  const lootGold = metrics.lootGained || 0;
  const supplyCost = Math.round(metrics.kills * 120 + metrics.damageDealt * 0.15);
  const balance = lootGold - supplyCost;
  const lootPerHour = Math.round(lootGold / elapsedHours);
  const supplyPerHour = Math.round(supplyCost / elapsedHours);

  // Sample/Simulated loot items from session
  const lootItems = [
    { id: 2470, name: 'Golden Legs', count: 1 },
    { id: 2400, name: 'Magic Sword', count: 1 },
    { id: 2160, name: 'Crystal Coin', count: 12 },
    { id: 2148, name: 'Gold Coin', count: 3500 },
    { id: 7590, name: 'Great Mana Potion', count: 24 },
    { id: 2165, name: 'Stealth Ring', count: 2 },
  ];

  // Sample supplies consumed
  const supplyItems = [
    { id: 7590, name: 'Great Mana Potion', count: Math.max(12, Math.floor(metrics.kills * 3)) },
    { id: 7588, name: 'Strong Health Potion', count: Math.max(5, Math.floor(metrics.kills * 1.5)) },
    { id: 2268, name: 'Sudden Death Rune', count: Math.max(10, Math.floor(metrics.kills * 2.5)) },
    { id: 2544, name: 'Crossbow Arrow', count: Math.max(50, Math.floor(metrics.kills * 8)) },
  ];

  return (
    <div className="advanced-metrics-container gothic-window-panel">
      {/* Sub-Header Tab Bar */}
      <div className="metrics-tab-bar">
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
          Dano Causado
        </button>
        <button
          type="button"
          className={`metrics-tab-btn ${activeTab === 'damageTaken' ? 'active' : ''}`}
          onClick={() => setActiveTab('damageTaken')}
        >
          Dano Recebido
        </button>
        <button
          type="button"
          className={`metrics-tab-btn ${activeTab === 'loot' ? 'active' : ''}`}
          onClick={() => setActiveTab('loot')}
        >
          Loot
        </button>
        <button
          type="button"
          className={`metrics-tab-btn ${activeTab === 'supplies' ? 'active' : ''}`}
          onClick={() => setActiveTab('supplies')}
        >
          Suprimentos
        </button>
      </div>

      {/* Tab Contents */}
      <div className="metrics-content-body">
        {activeTab === 'hunt' && (
          <div className="analyzer-card">
            <div className="analyzer-title">ANALISADOR DE CAÇA</div>
            <div className="analyzer-row">
              <span>Sessão</span>
              <strong>{formatDuration(metrics.elapsedMs)}</strong>
            </div>
            <div className="analyzer-row">
              <span>XP/h</span>
              <strong>{metrics.xpPerHour.toLocaleString('pt-BR')}</strong>
            </div>
            <div className="analyzer-row">
              <span>XP Ganho</span>
              <strong className="text-gold">{metrics.xpGained.toLocaleString('pt-BR')}</strong>
            </div>
            <div className="analyzer-row">
              <span>Abates (Kills)</span>
              <strong>{metrics.kills}</strong>
            </div>
            <div className="analyzer-row">
              <span>Loot Total</span>
              <strong className="text-gold">{lootGold.toLocaleString('pt-BR')} gp</strong>
            </div>
            <div className="analyzer-row">
              <span>Suprimentos</span>
              <strong className="text-red">{supplyCost.toLocaleString('pt-BR')} gp</strong>
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
              <span>Sessão</span>
              <strong>{formatDuration(metrics.elapsedMs)}</strong>
            </div>
            <div className="analyzer-section-label">DPS por Vocação</div>
            <div className="analyzer-row">
              <span>EK (Knight)</span>
              <strong>{Math.round(metrics.approximateDps * 0.35)}/s - {Math.round(metrics.damageDealt * 0.35).toLocaleString('pt-BR')}</strong>
            </div>
            <div className="analyzer-row">
              <span>ED (Druid)</span>
              <strong>{Math.round(metrics.approximateDps * 0.25)}/s - {Math.round(metrics.damageDealt * 0.25).toLocaleString('pt-BR')}</strong>
            </div>
            <div className="analyzer-row">
              <span>RP (Paladin)</span>
              <strong>{Math.round(metrics.approximateDps * 0.40)}/s - {Math.round(metrics.damageDealt * 0.40).toLocaleString('pt-BR')}</strong>
            </div>

            <div className="analyzer-divider" />
            <div className="analyzer-section-label">Elementos de Dano</div>
            <div className="analyzer-progress-line">
              <span className="elem-label físico">Físico</span>
              <div className="bar-wrapper"><div className="bar-fill physical" style={{ width: '52%' }} /></div>
              <span>52%</span>
            </div>
            <div className="analyzer-progress-line">
              <span className="elem-label gelo">Gelo</span>
              <div className="bar-wrapper"><div className="bar-fill ice" style={{ width: '29%' }} /></div>
              <span>29%</span>
            </div>
            <div className="analyzer-progress-line">
              <span className="elem-label sagrado">Sagrado</span>
              <div className="bar-wrapper"><div className="bar-fill holy" style={{ width: '14%' }} /></div>
              <span>14%</span>
            </div>
            <div className="analyzer-progress-line">
              <span className="elem-label morte">Morte</span>
              <div className="bar-wrapper"><div className="bar-fill death" style={{ width: '5%' }} /></div>
              <span>5%</span>
            </div>
          </div>
        )}

        {activeTab === 'damageTaken' && (
          <div className="analyzer-card">
            <div className="analyzer-title">DANO RECEBIDO</div>
            <div className="analyzer-row">
              <span>Sessão</span>
              <strong>{formatDuration(metrics.elapsedMs)}</strong>
            </div>
            <div className="analyzer-section-label">Dano Recebido /s por Vocação</div>
            <div className="analyzer-row">
              <span>EK (Knight)</span>
              <strong>{Math.round((metrics.damageTaken / Math.max(1, metrics.elapsedMs / 1000)) * 0.85)}/s - {Math.round(metrics.damageTaken * 0.85).toLocaleString('pt-BR')}</strong>
            </div>
            <div className="analyzer-row">
              <span>ED / RP</span>
              <strong>{Math.round((metrics.damageTaken / Math.max(1, metrics.elapsedMs / 1000)) * 0.15)}/s - {Math.round(metrics.damageTaken * 0.15).toLocaleString('pt-BR')}</strong>
            </div>

            <div className="analyzer-divider" />
            <div className="analyzer-section-label">Dano Recebido por Elemento</div>
            <div className="analyzer-progress-line">
              <span className="elem-label físico">Físico</span>
              <div className="bar-wrapper"><div className="bar-fill physical" style={{ width: '65%' }} /></div>
              <span>65%</span>
            </div>
            <div className="analyzer-progress-line">
              <span className="elem-label morte">Morte</span>
              <div className="bar-wrapper"><div className="bar-fill death" style={{ width: '28%' }} /></div>
              <span>28%</span>
            </div>
            <div className="analyzer-progress-line">
              <span className="elem-label fogo">Fogo</span>
              <div className="bar-wrapper"><div className="bar-fill fire" style={{ width: '7%' }} /></div>
              <span>7%</span>
            </div>
          </div>
        )}

        {activeTab === 'loot' && (
          <div className="analyzer-card">
            <div className="analyzer-title">ANALISADOR DE LOOT</div>
            <div className="analyzer-row">
              <span>Sessão</span>
              <strong>{formatDuration(metrics.elapsedMs)}</strong>
            </div>
            <div className="analyzer-row">
              <span>Valor em Gold</span>
              <strong className="text-gold">{lootGold.toLocaleString('pt-BR')} gp</strong>
            </div>
            <div className="analyzer-row">
              <span>Por hora</span>
              <strong className="text-gold">{lootPerHour.toLocaleString('pt-BR')} gp/h</strong>
            </div>
            <div className="analyzer-divider" />
            <div className="items-grid-analyser">
              {lootItems.map((item) => (
                <div key={item.id} className="analyser-item-slot" title={`${item.name} (${item.count})`}>
                  <ItemSprite itemId={item.id} label={item.name} />
                  <span className="item-count-badge">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'supplies' && (
          <div className="analyzer-card">
            <div className="analyzer-title">ANALISADOR DE SUPRIMENTOS</div>
            <div className="analyzer-row">
              <span>Sessão</span>
              <strong>{formatDuration(metrics.elapsedMs)}</strong>
            </div>
            <div className="analyzer-row">
              <span>Valor em Gold</span>
              <strong className="text-red">{supplyCost.toLocaleString('pt-BR')} gp</strong>
            </div>
            <div className="analyzer-row">
              <span>Por hora</span>
              <strong className="text-red">{supplyPerHour.toLocaleString('pt-BR')} gp/h</strong>
            </div>
            <div className="analyzer-divider" />
            <div className="items-grid-analyser">
              {supplyItems.map((item) => (
                <div key={item.id} className="analyser-item-slot" title={`${item.name} (${item.count})`}>
                  <ItemSprite itemId={item.id} label={item.name} />
                  <span className="item-count-badge">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
