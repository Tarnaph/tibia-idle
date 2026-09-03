'use client';

import React, { useState, useMemo } from 'react';
import type { ItemEconomyCatalog } from '@/packages/content-schema/src';
import {
  preferredSellPrice,
  type GameState,
  type LootStack,
} from '@/packages/domain/src';
import { ItemSprite } from './ItemSprite';

interface QuickSellWindowProps {
  open: boolean;
  backpackItems: LootStack[];
  economy: ItemEconomyCatalog;
  state: GameState;
  onClose: () => void;
  onExecuteSell: (selectedItemIds: number[]) => void;
  onToggleQuickSellPreference: (itemId: number) => void;
}

export function QuickSellWindow({
  open,
  backpackItems,
  economy,
  state,
  onClose,
  onExecuteSell,
  onToggleQuickSellPreference,
}: QuickSellWindowProps) {
  // Preço por itemId
  const priceMap = useMemo(() => {
    const map = new Map<number, number>();
    for (const item of economy.items) {
      const p = preferredSellPrice(item)?.price;
      if (p !== undefined && p !== null) map.set(item.itemId, p);
    }
    return map;
  }, [economy]);

  // Lista de itens vendíveis da mochila (que possuem preço e não estão travados)
  const sellableItems = useMemo(() => {
    return backpackItems.filter((stack) => {
      if (stack.itemId === undefined) return false;
      const pref = state.session.itemLootPreferences[String(stack.itemId)];
      if (pref?.lockSell) return false; // Travar venda exclui da venda rápida
      return priceMap.has(stack.itemId);
    });
  }, [backpackItems, priceMap, state.session.itemLootPreferences]);

  // Itens selecionados inicialmente: todos os que têm quickSell marcado (ou por padrão se nenhum foi alterado)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => {
    const set = new Set<number>();
    for (const stack of sellableItems) {
      if (stack.itemId === undefined) continue;
      const pref = state.session.itemLootPreferences[String(stack.itemId)];
      if (pref?.quickSell) {
        set.add(stack.itemId);
      } else if (pref?.quickSell === undefined) {
        set.add(stack.itemId); // default selecionado se elegível
      }
    }
    return set;
  });

  if (!open) return null;

  const toggleSelect = (itemId: number) => {
    const next = new Set(selectedIds);
    if (next.has(itemId)) {
      next.delete(itemId);
    } else {
      next.add(itemId);
    }
    setSelectedIds(next);
    onToggleQuickSellPreference(itemId);
  };

  // Totais calculados
  let totalCount = 0;
  let totalPrice = 0;

  for (const stack of sellableItems) {
    if (stack.itemId !== undefined && selectedIds.has(stack.itemId)) {
      const unitPrice = priceMap.get(stack.itemId) ?? 0;
      totalCount += stack.amount;
      totalPrice += unitPrice * stack.amount;
    }
  }

  const formattedTotalPrice = totalPrice.toLocaleString('pt-BR');

  return (
    <div className="inventory-window-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="quicksell-window-container" role="dialog" aria-modal="true" aria-label="Venda Rápida">
        {/* Header */}
        <div className="quicksell-window-header">
          <span className="quicksell-header-title">VENDA RÁPIDA</span>
          <button type="button" className="inventory-close-btn" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>

        {/* Description Banner */}
        <div className="quicksell-description-text">
          Tudo o que a loja da cidade compra da sua mochila. Clique em um item para colocar ou tirar da venda rápida — só os marcados são vendidos, e as marcas ficam salvas para a próxima.
        </div>

        {/* Items List */}
        <div className="quicksell-items-list">
          {sellableItems.length === 0 ? (
            <div className="quicksell-empty-message">Nenhum item vendível na mochila no momento.</div>
          ) : (
            sellableItems.map((stack) => {
              const itemId = stack.itemId!;
              const unitPrice = priceMap.get(itemId) ?? 0;
              const lineTotal = unitPrice * stack.amount;
              const isSelected = selectedIds.has(itemId);

              return (
                <div
                  key={`quicksell-${itemId}`}
                  className={`quicksell-item-card ${isSelected ? 'selected' : 'unselected'}`}
                  onClick={() => toggleSelect(itemId)}
                >
                  <div className="quicksell-item-icon-box">
                    <ItemSprite itemId={itemId} label={stack.name} />
                    {isSelected && <span className="item-quicksell-ribbon" />}
                  </div>

                  <div className="quicksell-item-info">
                    <span className="quicksell-item-name">{stack.name}</span>
                    <span className="quicksell-unit-price">
                      {stack.amount} × {unitPrice.toLocaleString('pt-BR')} gp
                    </span>
                  </div>

                  <div className="quicksell-item-total">
                    {lineTotal.toLocaleString('pt-BR')} gp
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="quicksell-window-footer">
          <div className="quicksell-summary-info">
            <span className="gold-coin-dot" />
            <span className="quicksell-total-label">
              {totalCount} itens · {formattedTotalPrice} gp
            </span>
          </div>

          <div className="quicksell-footer-actions">
            <button type="button" className="quicksell-btn-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="button"
              className="quicksell-btn-confirm"
              disabled={totalCount === 0}
              onClick={() => {
                onExecuteSell([...selectedIds]);
                onClose();
              }}
            >
              Vender por {formattedTotalPrice} gp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
