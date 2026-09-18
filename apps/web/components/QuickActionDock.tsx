'use client';

import React from 'react';

interface QuickActionDockProps {
  onOpenDepot: () => void;
  onOpenQuickSell: () => void;
  onOpenImbuements?: () => void;
  onOpenBlessings?: () => void;
  onOpenRanking?: () => void;
  onOpenPvP?: () => void;
}

export function QuickActionDock({
  onOpenDepot,
  onOpenQuickSell,
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
        className="quick-action-btn btn-quicksell highlighted-gold"
        onClick={onOpenQuickSell}
        title="Venda Rápida de Itens da Mochila"
      >
        VENDA RÁPIDA
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

      <button
        type="button"
        className="quick-action-btn btn-pvp"
        onClick={onOpenPvP}
        title="Arena PvP Ranqueada"
        style={{ color: '#f87171', borderColor: '#7f1d1d' }}
      >
        ARENA PVP
      </button>
    </nav>
  );
}
