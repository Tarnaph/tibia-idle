'use client';

import React from 'react';

interface QuickActionDockProps {
  onOpenDepot: () => void;
  onOpenQuickSell: () => void;
  onOpenImbuements?: () => void;
  onOpenBlessings?: () => void;
}

export function QuickActionDock({
  onOpenDepot,
  onOpenQuickSell,
  onOpenImbuements,
  onOpenBlessings,
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
    </nav>
  );
}
