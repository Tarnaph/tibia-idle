'use client';

import React from 'react';

interface QuickActionDockProps {
  onOpenDepot: () => void;
  onOpenQuickSell: () => void;
  quickSellCooldownRemaining?: number;
  onOpenImbuements?: () => void;
  onOpenBlessings?: () => void;
  onOpenRanking?: () => void;
  onOpenPvP?: () => void;
}

export function QuickActionDock({
  onOpenDepot,
  onOpenQuickSell,
  quickSellCooldownRemaining = 0,
  onOpenImbuements,
  onOpenBlessings,
  onOpenRanking,
  onOpenPvP,
}: QuickActionDockProps) {
  return (
    <nav className="quick-action-dock" aria-label="Ações Rápidas de Cidade">
      <button
        type="button"
        className="quick-action-btn btn-depot"
        onClick={onOpenDepot}
        title="Abrir Depot (Armazém)"
      >
        DEPOT
      </button>

      <button
        type="button"
        className={`quick-action-btn btn-quicksell highlighted-gold ${quickSellCooldownRemaining > 0 ? 'is-cooldown' : ''}`}
        onClick={quickSellCooldownRemaining > 0 ? undefined : onOpenQuickSell}
        disabled={quickSellCooldownRemaining > 0}
        title={quickSellCooldownRemaining > 0 ? `Venda Rápida em recarga: ${quickSellCooldownRemaining}s` : "Venda Rápida de Itens da Mochila"}
      >
        {quickSellCooldownRemaining > 0
          ? `REC. ${Math.floor(quickSellCooldownRemaining / 60)}:${(quickSellCooldownRemaining % 60).toString().padStart(2, '0')}`
          : 'VENDA RÁPIDA'}
      </button>

      <button
        type="button"
        className="quick-action-btn btn-imbuements"
        onClick={onOpenImbuements}
        title="Gerenciar Imbuements"
      >
        IMBUEMENTS
      </button>

      <button
        type="button"
        className="quick-action-btn btn-blessings"
        onClick={onOpenBlessings}
        title="Bênçãos dos Deuses (Blessings)"
      >
        BLESSINGS
      </button>

      <button
        type="button"
        className="quick-action-btn btn-ranking"
        onClick={onOpenRanking}
        title="Highscores e Ranking Geral"
        style={{ color: '#fde047', borderColor: '#854d0e' }}
      >
        RANKING
      </button>


    </nav>
  );
}
