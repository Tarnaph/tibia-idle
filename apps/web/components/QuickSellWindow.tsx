'use client';

import React, { useState, useMemo, useEffect } from 'react';
import type { ItemEconomyCatalog } from '@/packages/content-schema/src';
import {
  preferredSellPrice,
  type GameState,
  type LootStack,
} from '@/packages/domain/src';
import { ItemSprite } from './ItemSprite';
import { showGlobalItemTooltip, hideGlobalItemTooltip } from './GlobalItemTooltip';

export const QUICK_SELL_STORAGE_KEY = 'cavebound_quicksell_selected_items_v2';

function getStorage(): Storage | null {
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  if (typeof localStorage !== 'undefined') return localStorage;
  return null;
}

export function loadSavedQuickSellIds(): number[] | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(QUICK_SELL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((val) => typeof val === 'number' || (typeof val === 'string' && val.trim() !== '' && !isNaN(Number(val))))
        .map(Number);
    }
    return null;
  } catch {
    return null;
  }
}

export function saveQuickSellIds(ids: Set<number> | number[]): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    const arr = Array.from(ids);
    storage.setItem(QUICK_SELL_STORAGE_KEY, JSON.stringify(arr));
  } catch {}
}

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
      if ((stack as any).attributes?.imbuements?.length > 0 || (stack as any).attributesJson?.includes('"imbuements"')) return false;
      return priceMap.has(stack.itemId);
    });
  }, [backpackItems, priceMap, state.session.itemLootPreferences]);

  // Resolve conjunto de itens selecionados considerando memória persistente do localStorage
  const resolveInitialSelected = () => {
    const set = new Set<number>();
    const saved = loadSavedQuickSellIds();

    if (saved !== null) {
      const savedSet = new Set(saved);
      for (const stack of sellableItems) {
        if (stack.itemId !== undefined && savedSet.has(stack.itemId)) {
          set.add(stack.itemId);
        }
      }
    } else {
      // Default: todos os itens elegíveis não desmarcados
      for (const stack of sellableItems) {
        if (stack.itemId === undefined) continue;
        const pref = state.session.itemLootPreferences[String(stack.itemId)];
        if (pref?.quickSell !== false) {
          set.add(stack.itemId);
        }
      }
    }
    return set;
  };

  // Itens selecionados inicialmente
  const [selectedIds, setSelectedIds] = useState<Set<number>>(resolveInitialSelected);

  // Re-sincroniza a seleção com o localStorage sempre que o modal abre ou os itens da mochila mudam
  useEffect(() => {
    if (open) {
      setSelectedIds(resolveInitialSelected());
    }
  }, [open, sellableItems.length]);

  if (!open) return null;

  const toggleSelect = (itemId: number) => {
    const next = new Set(selectedIds);
    if (next.has(itemId)) {
      next.delete(itemId);
    } else {
      next.add(itemId);
    }
    setSelectedIds(next);
    saveQuickSellIds(next);
    onToggleQuickSellPreference(itemId);
  };

  const handleSelectAll = () => {
    const next = new Set<number>();
    for (const stack of sellableItems) {
      if (stack.itemId !== undefined) next.add(stack.itemId);
    }
    setSelectedIds(next);
    saveQuickSellIds(next);
  };

  const handleDeselectAll = () => {
    const next = new Set<number>();
    setSelectedIds(next);
    saveQuickSellIds(next);
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

        {/* Quick Selection Toolbar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '4px 12px 6px',
            borderBottom: '1px solid #232a39',
            marginBottom: '6px',
          }}
        >
          <span style={{ fontSize: '10.5px', color: '#8898aa', fontWeight: 600 }}>
            {selectedIds.size} de {sellableItems.length} selecionado{sellableItems.length !== 1 ? 's' : ''}
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              onClick={handleSelectAll}
              style={{
                background: '#1c2230',
                border: '1px solid #36445c',
                borderRadius: '3px',
                color: '#a7b8d0',
                fontSize: '10px',
                padding: '2px 8px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Marcar Todos
            </button>
            <button
              type="button"
              onClick={handleDeselectAll}
              style={{
                background: '#1c2230',
                border: '1px solid #36445c',
                borderRadius: '3px',
                color: '#a7b8d0',
                fontSize: '10px',
                padding: '2px 8px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Desmarcar Todos
            </button>
          </div>
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
                  onMouseEnter={(e) => showGlobalItemTooltip({ itemId, name: stack.name, amount: stack.amount, price: unitPrice }, e)}
                  onMouseMove={(e) => showGlobalItemTooltip({ itemId, name: stack.name, amount: stack.amount, price: unitPrice }, e)}
                  onMouseLeave={() => hideGlobalItemTooltip()}
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
