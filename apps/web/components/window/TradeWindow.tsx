'use client';

import React, { useState } from 'react';
import { DraggableWindow } from './DraggableWindow';
import { ItemSprite } from '../ItemSprite';
import type { EquipmentDefinition } from '@/packages/content-schema/src';

export interface TradeOfferItem {
  id: string;
  item: EquipmentDefinition;
  amount?: number;
}

interface TradeWindowProps {
  partnerName: string;
  myOffers: TradeOfferItem[];
  partnerOffers: TradeOfferItem[];
  availableInventoryItems: EquipmentDefinition[];
  myAccepted: boolean;
  partnerAccepted: boolean;
  onOfferItem: (item: EquipmentDefinition) => void;
  onRemoveOffer: (itemId: string) => void;
  onAcceptTrade: () => void;
  onCancelTrade: () => void;
}

export function TradeWindow({
  partnerName,
  myOffers,
  partnerOffers,
  availableInventoryItems,
  myAccepted,
  partnerAccepted,
  onOfferItem,
  onRemoveOffer,
  onAcceptTrade,
  onCancelTrade,
}: TradeWindowProps) {
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<EquipmentDefinition | null>(null);

  return (
    <DraggableWindow id={"trade" as any} icon="🤝" defaultWidth={440}>
      <div className="trade-window-container" style={{ padding: '10px', color: '#e0e6ed', fontSize: '11px' }}>
        <div style={{ textAlign: 'center', marginBottom: '8px', fontWeight: 700, color: '#f3c766' }}>
          SISTEMA DE TROCAS (TRADE COM {partnerName.toUpperCase()})
        </div>

        {/* 2 Panels: My Offers vs Partner Offers */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
          {/* My Offers Panel */}
          <div
            style={{
              background: 'rgba(15, 20, 28, 0.75)',
              border: myAccepted ? '1px solid #48bb78' : '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '5px',
              padding: '8px',
            }}
          >
            <div style={{ fontWeight: 700, color: '#63b3ed', marginBottom: '6px', fontSize: '10.5px' }}>
              Suas Ofertas ({myOffers.length})
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', minHeight: '80px', marginBottom: '8px' }}>
              {myOffers.map((offer) => (
                <div
                  key={offer.id}
                  onClick={() => onRemoveOffer(offer.id)}
                  title={`Clique para remover ${offer.item.name}`}
                  style={{
                    width: '38px',
                    height: '38px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 215, 0, 0.3)',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    position: 'relative',
                  }}
                >
                  <ItemSprite itemId={offer.item.id} label={offer.item.name} />
                </div>
              ))}
            </div>

            {/* Selector to add item from backpack */}
            <div style={{ display: 'flex', gap: '4px' }}>
              <select
                value={selectedInventoryItem?.id || ''}
                onChange={(e) => {
                  const found = availableInventoryItems.find((i) => String(i.id) === e.target.value);
                  setSelectedInventoryItem(found || null);
                }}
                style={{
                  flex: 1,
                  fontSize: '10px',
                  background: 'rgba(0,0,0,0.5)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '3px',
                  padding: '2px 4px',
                }}
              >
                <option value="">Oferecer item da mochila...</option>
                {availableInventoryItems.map((item, idx) => (
                  <option key={`${item.id}-${idx}`} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!selectedInventoryItem}
                onClick={() => {
                  if (selectedInventoryItem) {
                    onOfferItem(selectedInventoryItem);
                    setSelectedInventoryItem(null);
                  }
                }}
                style={{
                  padding: '2px 8px',
                  fontSize: '10px',
                  fontWeight: 700,
                  background: selectedInventoryItem ? '#3182ce' : '#4a5568',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: selectedInventoryItem ? 'pointer' : 'default',
                }}
              >
                ➕
              </button>
            </div>
          </div>

          {/* Partner Offers Panel */}
          <div
            style={{
              background: 'rgba(15, 20, 28, 0.75)',
              border: partnerAccepted ? '1px solid #48bb78' : '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '5px',
              padding: '8px',
            }}
          >
            <div style={{ fontWeight: 700, color: '#f6ad55', marginBottom: '6px', fontSize: '10.5px' }}>
              Ofertas de {partnerName} ({partnerOffers.length})
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', minHeight: '80px', marginBottom: '8px' }}>
              {partnerOffers.map((offer) => (
                <div
                  key={offer.id}
                  title={`${offer.item.name} (Oferecido por ${partnerName})`}
                  style={{
                    width: '38px',
                    height: '38px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(246, 173, 85, 0.3)',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ItemSprite itemId={offer.item.id} label={offer.item.name} />
                </div>
              ))}
            </div>

            <div style={{ fontSize: '10px', color: partnerAccepted ? '#48bb78' : '#a0aec0', fontStyle: 'italic' }}>
              {partnerAccepted ? '✔ Parceiro aceitou a troca!' : 'Aguardando confirmação do parceiro...'}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <button
            type="button"
            onClick={onCancelTrade}
            style={{
              padding: '6px 14px',
              fontSize: '11px',
              fontWeight: 700,
              borderRadius: '4px',
              background: '#e53e3e',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            ✕ Cancelar Troca
          </button>

          <button
            type="button"
            onClick={onAcceptTrade}
            style={{
              padding: '6px 18px',
              fontSize: '11px',
              fontWeight: 700,
              borderRadius: '4px',
              background: myAccepted ? '#38a169' : '#319795',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
            }}
          >
            {myAccepted ? '✔ Troca Aceita (Aguardando)' : '🤝 Aceitar Troca'}
          </button>
        </div>
      </div>
    </DraggableWindow>
  );
}
