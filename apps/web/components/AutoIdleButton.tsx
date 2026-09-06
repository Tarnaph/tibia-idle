'use client';

import React from 'react';

export interface AutoIdleButtonProps {
  isAutoIdle: boolean;
  onToggle: () => void;
  inHunt?: boolean;
  isTraining?: boolean;
  staminaMinutes?: number;
  maxStaminaMinutes?: number;
  className?: string;
}

export const AutoIdleButton: React.FC<AutoIdleButtonProps> = ({
  isAutoIdle = false,
  onToggle,
  inHunt = false,
  isTraining = false,
  staminaMinutes = 15,
  maxStaminaMinutes = 15,
  className = '',
}) => {
  let statusText = 'Desativado';
  let badgeColor = 'bg-slate-800 text-slate-400 border-slate-700';

  if (isAutoIdle) {
    if (inHunt) {
      statusText = '⚔️ Caçando (Auto Loop)';
      badgeColor = 'bg-amber-950/80 text-amber-300 border-amber-500/50 animate-pulse';
    } else if (isTraining) {
      statusText = '💪 Treinando Dummies (Aguardando 100% Estamina)';
      badgeColor = 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50';
    } else {
      statusText = '🤖 Auto-Idle Ativo (Preparando)';
      badgeColor = 'bg-blue-950/80 text-blue-300 border-blue-500/50';
    }
  }

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <button
        type="button"
        onClick={onToggle}
        className={`group relative flex items-center justify-between gap-3 px-3 py-2 rounded-lg border font-sans font-bold text-xs transition-all duration-200 shadow-md ${
          isAutoIdle
            ? 'bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 text-emerald-300 border-emerald-500/80 shadow-emerald-950/60 ring-1 ring-emerald-500/30'
            : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border-slate-700/80 shadow-slate-950/50'
        }`}
        title="Modo Auto-Idle: O jogo caça sozinho, vende loot, compra poções se acabarem, treina nos dummies ao zerar a estamina e retorna sozinho para a caçada ao recuperar 100% de estamina."
      >
        <div className="flex items-center gap-2">
          <span className={`text-base ${isAutoIdle ? 'animate-spin-slow' : 'opacity-70'}`}>
            🤖
          </span>
          <div className="flex flex-col text-left">
            <span className="text-xs tracking-wider uppercase">
              MODO AUTO-IDLE
            </span>
            <span className="text-[10px] font-normal text-slate-400">
              Caçada ⇄ Dummies ⇄ Loja
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-mono tracking-wider border font-semibold ${
              isAutoIdle
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {isAutoIdle ? 'ON' : 'OFF'}
          </span>
        </div>
      </button>

      {isAutoIdle && (
        <div className={`text-[10px] px-2 py-1 rounded border text-center font-medium ${badgeColor}`}>
          {statusText}
        </div>
      )}
    </div>
  );
};
