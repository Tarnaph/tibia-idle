'use client';

import React, { useState } from 'react';
import type { SpellDefinition } from '@/packages/content-schema/src';
import { Tibia11ActionIcon } from './Tibia11ActionIcon';
import {
  HOTBAR_POTIONS,
  HOTBAR_RUNES,
  findHotbarAction,
  isHotbarActionUnlocked,
  type CharacterState,
  type GameContent,
  type HotbarActionItem,
  type HotbarPotionDefinition,
  type HotbarRuneDefinition,
} from '@/packages/domain/src';

interface HotbarConfigModalProps {
  open: boolean;
  slotIndex: number;
  character: CharacterState;
  content: GameContent;
  onClose: () => void;
  onSave: (slotIndex: number, actionId: number | null) => void;
}

type TabKey = 'spells' | 'runes' | 'potions';

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
  const [selectedId, setSelectedId] = useState<number | null>(currentActionId);

  if (!open) return null;

  // Filter spells for this character's vocation
  const availableSpells = content.spells.filter((spell) =>
    spell.vocations.includes(character.vocation)
  );

  // Filter runes
  const availableRunes = HOTBAR_RUNES.filter((rune) =>
    rune.vocations.includes(character.vocation)
  );

  // Filter potions
  const availablePotions = HOTBAR_POTIONS.filter((potion) =>
    potion.vocations.includes(character.vocation)
  );

  const selectedAction = selectedId !== null ? findHotbarAction(selectedId, content) : null;

  const handleSelect = (id: number) => {
    setSelectedId(id);
  };

  const handleSave = () => {
    onSave(slotIndex, selectedId);
    onClose();
  };

  const handleClear = () => {
    onSave(slotIndex, null);
    onClose();
  };

  return (
    <div className="hotbar-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="hotbar-modal-window" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="hotbar-modal-header">
          <div className="hotbar-modal-title">
            <span>⚙️ Configurar Slot {slotIndex + 1}</span>
            <small>Personagem: {character.name} ({character.vocation} · Lv {character.level})</small>
          </div>
          <button type="button" className="hotbar-modal-close" onClick={onClose} title="Fechar">
            ✕
          </button>
        </div>

        {/* 3 Tabs */}
        <div className="hotbar-modal-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'spells'}
            className={`hotbar-tab-btn ${activeTab === 'spells' ? 'active' : ''}`}
            onClick={() => setActiveTab('spells')}
          >
            🔮 Magias ({availableSpells.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'runes'}
            className={`hotbar-tab-btn ${activeTab === 'runes' ? 'active' : ''}`}
            onClick={() => setActiveTab('runes')}
          >
            📜 Runas ({availableRunes.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'potions'}
            className={`hotbar-tab-btn ${activeTab === 'potions' ? 'active' : ''}`}
            onClick={() => setActiveTab('potions')}
          >
            🧪 Itens & Poções ({availablePotions.length})
          </button>
        </div>

        {/* Content Area */}
        <div className="hotbar-modal-list">
          {activeTab === 'spells' && (
            <div className="hotbar-cards-grid">
              {availableSpells.map((spell) => {
                const unlocked = character.level >= spell.requiredLevel;
                const isSelected = selectedId === spell.spellId;
                return (
                  <div
                    key={spell.spellId}
                    className={`hotbar-action-card ${isSelected ? 'selected' : ''} ${!unlocked ? 'locked' : ''}`}
                    onClick={() => handleSelect(spell.spellId)}
                  >
                    <div className="action-card-top">
                      <Tibia11ActionIcon id={spell.spellId} kind="spell" name={spell.name} size={32} />
                      <div className="action-card-header">
                        <span className="action-name">{spell.name}</span>
                        <span className="action-words">{spell.words}</span>
                      </div>
                    </div>
                    <div className="action-card-meta">
                      <span className="badge mana">{spell.mana} MP</span>
                      <span className="badge group">{spell.group.toUpperCase()}</span>
                      <span className={`badge req ${unlocked ? 'ok' : 'req-fail'}`}>
                        {unlocked ? `Lv ${spell.requiredLevel}` : `Requer Lv ${spell.requiredLevel}`}
                      </span>
                    </div>
                    <div className="action-card-desc">
                      Recarga: {(spell.cooldownMs / 1000).toFixed(1)}s · Alcance: {spell.range > 0 ? `${spell.range} tiles` : 'Auto'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'runes' && (
            <div className="hotbar-cards-grid">
              {availableRunes.map((rune) => {
                const unlocked =
                  character.level >= rune.requiredLevel &&
                  character.skills.magicLevel >= rune.requiredMagicLevel;
                const isSelected = selectedId === rune.id;
                return (
                  <div
                    key={rune.id}
                    className={`hotbar-action-card ${isSelected ? 'selected' : ''} ${!unlocked ? 'locked' : ''}`}
                    onClick={() => handleSelect(rune.id)}
                  >
                    <div className="action-card-top">
                      <Tibia11ActionIcon id={rune.id} kind="rune" name={rune.name} size={32} />
                      <div className="action-card-header">
                        <span className="action-name">{rune.name}</span>
                        <span className="action-words">{rune.words}</span>
                      </div>
                    </div>
                    <div className="action-card-meta">
                      <span className="badge type">{rune.combatType.toUpperCase()}</span>
                      <span className={`badge req ${character.level >= rune.requiredLevel ? 'ok' : 'req-fail'}`}>
                        Lv {rune.requiredLevel}
                      </span>
                      <span className={`badge req ${character.skills.magicLevel >= rune.requiredMagicLevel ? 'ok' : 'req-fail'}`}>
                        ML {rune.requiredMagicLevel}
                      </span>
                    </div>
                    <div className="action-card-desc">{rune.description}</div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'potions' && (
            <div className="hotbar-cards-grid">
              {availablePotions.map((potion) => {
                const unlocked = character.level >= potion.requiredLevel;
                const isSelected = selectedId === potion.id;
                return (
                  <div
                    key={potion.id}
                    className={`hotbar-action-card ${isSelected ? 'selected' : ''} ${!unlocked ? 'locked' : ''}`}
                    onClick={() => handleSelect(potion.id)}
                  >
                    <div className="action-card-top">
                      <Tibia11ActionIcon id={potion.id} kind="potion" name={potion.name} size={32} />
                      <div className="action-card-header">
                        <span className="action-name">{potion.name}</span>
                        <span className="action-badge-tag">{potion.category === 'healing' ? '❤️ VIDA' : '💙 MANA'}</span>
                      </div>
                    </div>
                    <div className="action-card-meta">
                      <span className={`badge req ${unlocked ? 'ok' : 'req-fail'}`}>
                        {unlocked ? `Lv ${potion.requiredLevel}` : `Requer Lv ${potion.requiredLevel}`}
                      </span>
                      <span className="badge group">Recarga 1.0s</span>
                    </div>
                    <div className="action-card-desc">{potion.description}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer / Actions */}
        <div className="hotbar-modal-footer">
          <div className="hotbar-selected-info">
            {selectedAction ? (
              <div className="selected-preview-box">
                <Tibia11ActionIcon
                  id={selectedAction.kind === 'spell' ? selectedAction.spell.spellId : selectedAction.kind === 'rune' ? selectedAction.rune.id : selectedAction.potion.id}
                  kind={selectedAction.kind}
                  name={selectedAction.kind === 'spell' ? selectedAction.spell.name : selectedAction.kind === 'rune' ? selectedAction.rune.name : selectedAction.potion.name}
                  size={24}
                />
                <span>
                  Selecionado:{' '}
                  <strong>
                    {selectedAction.kind === 'spell'
                      ? selectedAction.spell.name
                      : selectedAction.kind === 'rune'
                      ? selectedAction.rune.name
                      : selectedAction.potion.name}
                  </strong>{' '}
                  ({selectedAction.kind.toUpperCase()})
                </span>
              </div>
            ) : (
              <span className="text-muted">Nenhuma ação selecionada (slot ficará vazio: +)</span>
            )}
          </div>
          <div className="hotbar-footer-buttons">
            <button type="button" className="btn-modal-clear" onClick={handleClear} title="Esvaziar este slot">
              Limpar Slot (+)
            </button>
            <button type="button" className="btn-modal-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button type="button" className="btn-modal-save" onClick={handleSave}>
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
