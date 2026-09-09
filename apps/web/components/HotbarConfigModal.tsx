'use client';

import React, { useState } from 'react';
import type { SpellDefinition } from '@/packages/content-schema/src';
import { Tibia11ActionIcon } from './Tibia11ActionIcon';
import {
  HOTBAR_POTIONS,
  HOTBAR_RUNES,
  findHotbarAction,
  type CharacterState,
  type GameContent,
} from '@/packages/domain/src';

export interface HotbarCondition {
  id: string;
  target: 'self' | 'target' | 'leader';
  metric: 'hp' | 'mana' | 'monsters';
  operator: 'lte' | 'gte' | 'lt';
  value: number;
  isPercent: boolean;
}

export interface HotbarSlotConfig {
  enabled: boolean;
  healingTarget?: 'self' | 'lowest_hp' | 'party_leader';
  ignoredMonsters?: string[];
  conditions?: HotbarCondition[];
}

interface HotbarConfigModalProps {
  open: boolean;
  slotIndex: number;
  character: CharacterState;
  content: GameContent;
  onClose: () => void;
  onSave: (slotIndex: number, actionId: number | null, config?: HotbarSlotConfig) => void;
}

type TabKey = 'spells' | 'runes' | 'items';

export function HotbarConfigModal({
  open,
  slotIndex,
  character,
  content,
  onClose,
  onSave,
}: HotbarConfigModalProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('spells');
  const currentActionId = character.hotbar[slotIndex] ?? null;
  const [selectedId, setSelectedId] = useState<number | null>(
    currentActionId ?? (content.spells.find((s) => s.name === 'Lesser Front Sweep')?.spellId ?? 168)
  );
  const [subTab, setSubTab] = useState<'details' | 'preview'>('details');

  // Config states
  const [isEnabled, setIsEnabled] = useState<boolean>(true);
  const [healingTarget, setHealingTarget] = useState<'self' | 'lowest_hp' | 'party_leader'>('self');
  const [ignoredMonsters, setIgnoredMonsters] = useState<string[]>([]);
  const [isAddingIgnored, setIsAddingIgnored] = useState<boolean>(false);
  const [ignoredInput, setIgnoredInput] = useState<string>('');
  const [conditions, setConditions] = useState<HotbarCondition[]>([
    { id: '1', target: 'self', metric: 'hp', operator: 'lte', value: 75, isPercent: true },
  ]);

  if (!open) return null;

  // Spells filtered for vocation
  const availableSpells = content.spells.filter((spell) =>
    spell.vocations.includes(character.vocation) || spell.vocations.includes(character.baseVocation)
  );

  // Runes filtered for vocation
  const availableRunes = HOTBAR_RUNES.filter((rune) =>
    rune.vocations.includes(character.vocation) || rune.vocations.includes(character.baseVocation)
  );

  // Potions/items filtered for vocation
  const availablePotions = HOTBAR_POTIONS.filter((potion) =>
    potion.vocations.includes(character.vocation) || potion.vocations.includes(character.baseVocation)
  );

  const selectedAction = selectedId !== null ? findHotbarAction(selectedId, content) : null;

  const handleSelect = (id: number, isLocked: boolean) => {
    if (isLocked) return;
    setSelectedId(id);
  };

  const handleClearSlot = () => {
    onSave(slotIndex, null);
    onClose();
  };

  const handleSave = () => {
    onSave(slotIndex, selectedId, {
      enabled: isEnabled,
      healingTarget,
      ignoredMonsters,
      conditions,
    });
    onClose();
  };

  const handleAddCondition = () => {
    setConditions((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        target: 'self',
        metric: 'hp',
        operator: 'lte',
        value: 75,
        isPercent: true,
      },
    ]);
  };

  const handleRemoveCondition = (id: string) => {
    setConditions((prev) => prev.filter((c) => c.id !== id));
  };

  const handleUpdateCondition = (id: string, patch: Partial<HotbarCondition>) => {
    setConditions((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const handleAddIgnoredMonster = () => {
    const trimmed = ignoredInput.trim();
    if (trimmed && !ignoredMonsters.includes(trimmed)) {
      setIgnoredMonsters((prev) => [...prev, trimmed]);
      setIgnoredInput('');
      setIsAddingIgnored(false);
    }
  };

  const handleRemoveIgnoredMonster = (name: string) => {
    setIgnoredMonsters((prev) => prev.filter((m) => m !== name));
  };

  return (
    <div className="hotbar-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="hotbar-config-window" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="hotbar-config-header">
          <span className="hotbar-config-title">Configurar ação (Slot {slotIndex + 1})</span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {currentActionId !== null && (
              <button
                type="button"
                className="hotbar-clear-slot-btn"
                onClick={handleClearSlot}
                title="Remover ação deste slot"
                style={{
                  background: '#7a1818',
                  color: '#ffffff',
                  border: '1px solid #d94242',
                  borderRadius: '3px',
                  padding: '2px 8px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                🗑️ Remover do Slot
              </button>
            )}
            <button type="button" className="hotbar-config-close" onClick={onClose} title="Fechar">
              ✕
            </button>
          </div>
        </div>

        {/* Top Tabs */}
        <div className="hotbar-top-tabs" role="tablist">
          <button
            type="button"
            className={`hotbar-top-tab ${activeTab === 'spells' ? 'active' : ''}`}
            onClick={() => setActiveTab('spells')}
          >
            Magias
          </button>
          <button
            type="button"
            className={`hotbar-top-tab ${activeTab === 'runes' ? 'active' : ''}`}
            onClick={() => setActiveTab('runes')}
          >
            Runas
          </button>
          <button
            type="button"
            className={`hotbar-top-tab ${activeTab === 'items' ? 'active' : ''}`}
            onClick={() => setActiveTab('items')}
          >
            Itens
          </button>
        </div>

        {/* 2-Column Body Layout */}
        <div className="hotbar-config-body">
          {/* Left Column: Vertical Action List */}
          <div className="hotbar-left-column">
            {activeTab === 'spells' &&
              availableSpells.map((spell) => {
                const isSelected = selectedId === spell.spellId;
                const reqLevel = spell.requiredLevel ?? 0;
                const isLocked = character.level < reqLevel;
                return (
                  <div
                    key={spell.spellId}
                    className={`hotbar-list-card ${isSelected ? 'selected' : ''} ${isLocked ? 'locked' : ''}`}
                    onClick={() => handleSelect(spell.spellId, isLocked)}
                    style={isLocked ? { opacity: 0.5, cursor: 'not-allowed', filter: 'grayscale(0.6)' } : {}}
                    title={isLocked ? `Nível ${reqLevel} necessário (Você está no Nível ${character.level})` : spell.name}
                  >
                    <Tibia11ActionIcon id={spell.spellId} kind="spell" name={spell.name} size={32} />
                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <span className="hotbar-card-name">{spell.name}</span>
                      {isLocked && (
                        <span style={{ fontSize: '10px', color: '#ff6b6b', fontWeight: 'bold' }}>
                          🔒 Requer Lv {reqLevel}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

            {activeTab === 'runes' &&
              availableRunes.map((rune) => {
                const isSelected = selectedId === rune.id;
                const reqLevel = rune.requiredLevel ?? 0;
                const isLocked = character.level < reqLevel;
                const goldBadge =
                  rune.id === 2273 ? '160'
                  : rune.id === 2311 ? '15'
                  : rune.id === 2302 ? '30'
                  : rune.id === 2271 ? '30'
                  : rune.id === 2288 ? '40'
                  : '45';
                return (
                  <div
                    key={rune.id}
                    className={`hotbar-list-card ${isSelected ? 'selected' : ''} ${isLocked ? 'locked' : ''}`}
                    onClick={() => handleSelect(rune.id, isLocked)}
                    style={isLocked ? { opacity: 0.5, cursor: 'not-allowed', filter: 'grayscale(0.6)' } : {}}
                    title={isLocked ? `Nível ${reqLevel} necessário (Você está no Nível ${character.level})` : rune.name}
                  >
                    <div className="hotbar-icon-container">
                      <Tibia11ActionIcon id={rune.id} kind="rune" name={rune.name} size={32} />
                      <span className="hotbar-rune-badge">{goldBadge}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <span className="hotbar-card-name">{rune.name}</span>
                      {isLocked && (
                        <span style={{ fontSize: '10px', color: '#ff6b6b', fontWeight: 'bold' }}>
                          🔒 Requer Lv {reqLevel}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

            {activeTab === 'items' &&
              availablePotions.map((potion) => {
                const isSelected = selectedId === potion.id;
                const reqLevel = potion.requiredLevel ?? 0;
                const isLocked = character.level < reqLevel;
                return (
                  <div
                    key={potion.id}
                    className={`hotbar-list-card ${isSelected ? 'selected' : ''} ${isLocked ? 'locked' : ''}`}
                    onClick={() => handleSelect(potion.id, isLocked)}
                    style={isLocked ? { opacity: 0.5, cursor: 'not-allowed', filter: 'grayscale(0.6)' } : {}}
                    title={isLocked ? `Nível ${reqLevel} necessário (Você está no Nível ${character.level})` : potion.name}
                  >
                    <div className="hotbar-icon-container">
                      <Tibia11ActionIcon id={potion.id} kind="potion" name={potion.name} size={32} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <span className="hotbar-card-name">{potion.name}</span>
                      {isLocked ? (
                        <span style={{ fontSize: '10px', color: '#ff6b6b', fontWeight: 'bold' }}>
                          🔒 Requer Lv {reqLevel}
                        </span>
                      ) : (
                        <span style={{ fontSize: '10px', color: '#8ec07c' }}>
                          Lv {reqLevel}+
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Right Column: Detailed Action Config Panel */}
          <div className="hotbar-right-column">
            {selectedAction ? (
              <>
                {/* Header info */}
                <div className="hotbar-detail-header">
                  <Tibia11ActionIcon
                    id={
                      selectedAction.kind === 'spell' ? selectedAction.spell.spellId
                      : selectedAction.kind === 'rune' ? selectedAction.rune.id
                      : selectedAction.potion.id
                    }
                    kind={selectedAction.kind}
                    name={
                      selectedAction.kind === 'spell' ? selectedAction.spell.name
                      : selectedAction.kind === 'rune' ? selectedAction.rune.name
                      : selectedAction.potion.name
                    }
                    size={36}
                  />
                  <h3 className="hotbar-detail-title">
                    {selectedAction.kind === 'spell' ? selectedAction.spell.name
                    : selectedAction.kind === 'rune' ? selectedAction.rune.name
                    : selectedAction.potion.name}
                  </h3>
                </div>

                {/* Sub-tabs */}
                <div className="hotbar-sub-tabs">
                  <button
                    type="button"
                    className={`hotbar-sub-tab ${subTab === 'details' ? 'active' : ''}`}
                    onClick={() => setSubTab('details')}
                  >
                    Detalhes
                  </button>
                  <button
                    type="button"
                    className={`hotbar-sub-tab ${subTab === 'preview' ? 'active' : ''}`}
                    onClick={() => setSubTab('preview')}
                  >
                    Prévia
                  </button>
                </div>

                {/* Details Tab Content */}
                {subTab === 'details' && (
                  <div className="hotbar-detail-content">
                    {/* Classification */}
                    <div className="hotbar-class-desc">
                      {selectedAction.kind === 'spell' && (
                        selectedAction.spell.group === 'attack'
                          ? 'Magia em área — atinge os inimigos ao seu redor.'
                          : selectedAction.spell.group === 'healing'
                          ? 'Magia de cura — restaura vida instantaneamente.'
                          : 'Magia de suporte — confere efeitos benéficos.'
                      )}
                      {selectedAction.kind === 'rune' && (
                        selectedAction.rune.category === 'healing'
                          ? 'Runa de cura — lançada em você ou em um aliado por perto.'
                          : 'Runa de ataque — disparada contra inimigos.'
                      )}
                      {selectedAction.kind === 'potion' && 'Bebe sozinha quando a regra dela passa.'}
                    </div>

                    {/* Flavour Description */}
                    <div className="hotbar-flavour-text">
                      {selectedAction.kind === 'spell' && (
                        selectedAction.spell.name === 'Lesser Front Sweep'
                          ? "A novice's sweep across the three tiles ahead — cheap, weak, and the first attack spell a knight learns."
                          : selectedAction.spell.name === 'Wound Cleansing'
                          ? "Heals a knight's wounds in battle using stamina and focus."
                          : `${selectedAction.spell.words} — ${selectedAction.spell.group} spell.`
                      )}
                      {selectedAction.kind === 'rune' && selectedAction.rune.description}
                      {selectedAction.kind === 'potion' && selectedAction.potion.description}
                    </div>

                    {/* Stats Line */}
                    <div className="hotbar-stats-line">
                      {selectedAction.kind === 'spell' && (
                        `${selectedAction.spell.mana} de mana · ${(selectedAction.spell.cooldownMs / 1000).toFixed(0)}s de cooldown`
                      )}
                      {selectedAction.kind === 'rune' && (
                        `Custa ${selectedAction.rune.id === 2273 ? 160 : 40} gold por uso.`
                      )}
                      {selectedAction.kind === 'potion' && (
                        selectedAction.potion.id === 8704 ? 'Uso gratuito — não custa gold.' : `Recupera vida/mana com recarga de 1.0s.`
                      )}
                    </div>

                    {/* Damage / Heal Range */}
                    <div className="hotbar-formula-line">
                      {selectedAction.kind === 'spell' && (
                        selectedAction.spell.name === 'Lesser Front Sweep' ? 'Causa 51–90 de dano em cada inimigo atingido'
                        : selectedAction.spell.name === 'Wound Cleansing' ? 'Cura 80–140 de vida'
                        : selectedAction.spell.group === 'healing' ? 'Cura vida proporcional ao seu nível e Magic Level'
                        : 'Causa dano físico/elemental nos alvos atingidos'
                      )}
                      {selectedAction.kind === 'rune' && (
                        selectedAction.rune.id === 2273 ? 'Cura 168–272 de vida' : 'Causa dano com base no seu Magic Level'
                      )}
                      {selectedAction.kind === 'potion' && (
                        selectedAction.potion.id === 8704 ? 'Cura 63–88 de vida' : `Cura ${selectedAction.potion.healMin ?? 150}–${selectedAction.potion.healMax ?? 200} de vida`
                      )}
                    </div>

                    {/* Mitigation / Note */}
                    <div className="hotbar-note-line">
                      {selectedAction.kind === 'spell' && selectedAction.spell.group === 'attack' && 'Antes da armadura e das resistências do alvo.'}
                    </div>

                    {/* Requirement */}
                    <div className="hotbar-req-line">
                      {selectedAction.kind === 'spell' && `Requer: knight only, level ${selectedAction.spell.requiredLevel}+`}
                      {selectedAction.kind === 'rune' && `Requer: level ${selectedAction.rune.requiredLevel}+`}
                      {selectedAction.kind === 'potion' &&
                        `Requer: level ${selectedAction.potion.requiredLevel}+ · ${
                          selectedAction.potion.vocations.length === 8 ? 'Todas as vocações' : selectedAction.potion.vocations.join(', ')
                        }`}
                    </div>

                    {/* Monstros ignorados (for area spells) */}
                    {selectedAction.kind === 'spell' && selectedAction.spell.group === 'attack' && (
                      <div className="hotbar-section-block">
                        <div className="hotbar-section-header">
                          <span className="hotbar-section-title">Monstros ignorados</span>
                          <button
                            type="button"
                            className="hotbar-section-btn"
                            onClick={() => setIsAddingIgnored(true)}
                          >
                            + Ignorar um monstro...
                          </button>
                        </div>
                        <p className="hotbar-section-desc">
                          Este slot nunca dispara contra eles, e eles nunca contam nas condições de área dele. Nenhum outro slot da barra é afetado.
                        </p>
                        {isAddingIgnored && (
                          <div className="hotbar-inline-add">
                            <input
                              type="text"
                              placeholder="Nome do monstro (ex: Rat)"
                              value={ignoredInput}
                              onChange={(e) => setIgnoredInput(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleAddIgnoredMonster()}
                            />
                            <button type="button" onClick={handleAddIgnoredMonster}>Ignorar</button>
                            <button type="button" onClick={() => setIsAddingIgnored(false)}>Cancelar</button>
                          </div>
                        )}
                        <div className="hotbar-ignored-list">
                          {ignoredMonsters.length === 0 ? (
                            <span className="hotbar-empty-text">Nada ignorado — este slot ataca tudo.</span>
                          ) : (
                            ignoredMonsters.map((m) => (
                              <span key={m} className="hotbar-tag">
                                {m} <button type="button" onClick={() => handleRemoveIgnoredMonster(m)}>✕</button>
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    {/* Alvo da cura Dropdown (for healing actions) */}
                    {((selectedAction.kind === 'spell' && selectedAction.spell.group === 'healing') ||
                      (selectedAction.kind === 'rune' && selectedAction.rune.category === 'healing')) && (
                      <div className="hotbar-section-block">
                        <label className="hotbar-section-title">Alvo da cura</label>
                        <select
                          className="hotbar-select-input"
                          value={healingTarget}
                          onChange={(e) => setHealingTarget(e.target.value as any)}
                        >
                          <option value="self">Você mesmo</option>
                          <option value="lowest_hp">Aliado com menor HP</option>
                          <option value="party_leader">Líder da party</option>
                        </select>
                      </div>
                    )}

                    {/* Condições Section */}
                    <div className="hotbar-section-block">
                      <div className="hotbar-section-header">
                        <span className="hotbar-section-title">Condições</span>
                        <button
                          type="button"
                          className="hotbar-section-btn"
                          onClick={handleAddCondition}
                        >
                          + Adicionar condição
                        </button>
                      </div>

                      {conditions.length === 0 ? (
                        <p className="hotbar-section-desc">
                          Todas as condições precisam bater. Sem condições, dispara sempre.
                        </p>
                      ) : (
                        <div className="hotbar-conditions-list">
                          {conditions.map((cond) => (
                            <div key={cond.id} className="hotbar-condition-row">
                              <select
                                className="hotbar-cond-select"
                                value={cond.target}
                                onChange={(e) => handleUpdateCondition(cond.id, { target: e.target.value as any })}
                              >
                                <option value="self">Você</option>
                                <option value="target">Alvo</option>
                                <option value="leader">Líder</option>
                              </select>

                              <select
                                className="hotbar-cond-select"
                                value={cond.metric}
                                onChange={(e) => handleUpdateCondition(cond.id, { metric: e.target.value as any })}
                              >
                                <option value="hp">HP</option>
                                <option value="mana">MP</option>
                                <option value="monsters">Monstros</option>
                              </select>

                              <select
                                className="hotbar-cond-select"
                                value={cond.operator}
                                onChange={(e) => handleUpdateCondition(cond.id, { operator: e.target.value as any })}
                              >
                                <option value="lte">menor ou igual a</option>
                                <option value="gte">maior ou igual a</option>
                                <option value="lt">menor que</option>
                              </select>

                              <div className="hotbar-stepper">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateCondition(cond.id, { value: Math.max(1, cond.value - 5) })}
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  value={cond.value}
                                  onChange={(e) => handleUpdateCondition(cond.id, { value: Number(e.target.value) })}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleUpdateCondition(cond.id, { value: cond.value + 5 })}
                                >
                                  +
                                </button>
                              </div>

                              <label className="hotbar-percent-checkbox">
                                <input
                                  type="checkbox"
                                  checked={cond.isPercent}
                                  onChange={(e) => handleUpdateCondition(cond.id, { isPercent: e.target.checked })}
                                />
                                <span>%</span>
                              </label>

                              <button
                                type="button"
                                className="hotbar-remove-cond-btn"
                                onClick={() => handleRemoveCondition(cond.id)}
                                title="Remover condição"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="hotbar-empty-right">
                <span>Nenhuma ação selecionada</span>
              </div>
            )}

            {/* Right Column Bottom Footer */}
            <div className="hotbar-right-footer">
              <label className="hotbar-active-checkbox">
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={(e) => setIsEnabled(e.target.checked)}
                />
                <span>Ativada</span>
              </label>

              <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                {currentActionId !== null && (
                  <button
                    type="button"
                    className="hotbar-clear-btn"
                    onClick={handleClearSlot}
                    style={{
                      background: '#4a1515',
                      color: '#ff9999',
                      border: '1px solid #7a2828',
                      borderRadius: '3px',
                      padding: '4px 10px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                    }}
                  >
                    Limpar Slot
                  </button>
                )}
                <button type="button" className="hotbar-save-btn" onClick={handleSave}>
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
