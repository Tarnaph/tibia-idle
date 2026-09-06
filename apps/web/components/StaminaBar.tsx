'use client';

import React from 'react';
import { formatStaminaTime, getStaminaPercentage, type StaminaMode } from '@/packages/domain/src';

export interface StaminaBarProps {
  staminaMinutes: number;
  maxStaminaMinutes: number;
  mode?: StaminaMode;
  showDetails?: boolean;
  className?: string;
}

export const StaminaBar: React.FC<StaminaBarProps> = ({
  staminaMinutes = 15,
  maxStaminaMinutes = 15,
  mode = 'resting',
  showDetails = true,
  className = '',
}) => {
  const percentage = getStaminaPercentage(staminaMinutes, maxStaminaMinutes);
  const formattedCurrent = formatStaminaTime(staminaMinutes);
  const formattedMax = formatStaminaTime(maxStaminaMinutes);

  // Bar color based on remaining percentage
  let barColorClass = 'bg-emerald-500 shadow-emerald-900/50';
  let textColorClass = 'text-emerald-400';
  if (percentage <= 15) {
    barColorClass = 'bg-red-500 shadow-red-900/50 animate-pulse';
    textColorClass = 'text-red-400 font-bold';
  } else if (percentage <= 50) {
    barColorClass = 'bg-amber-500 shadow-amber-900/50';
    textColorClass = 'text-amber-400';
  }

  // Mode badge text & color
  let modeLabel = '💤 Descansando';
  let modeBadgeClass = 'bg-blue-900/40 text-blue-300 border-blue-700/50';
  if (mode === 'hunting') {
    modeLabel = '⚡ Caçando (-1x)';
    modeBadgeClass = 'bg-amber-900/40 text-amber-300 border-amber-700/50 animate-pulse';
  } else if (mode === 'training') {
    modeLabel = '💪 Treinando (3x)';
    modeBadgeClass = 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50';
  }

  return (
    <div
      className={`relative flex flex-col gap-1 p-2 rounded bg-slate-950/80 border border-slate-800 text-xs font-sans ${className}`}
      title={`Estamina: ${formattedCurrent} / ${formattedMax} (${percentage.toFixed(1)}%).\nCapacidade máxima aumenta com o maior nível da conta.\nRecupera 3x mais rápido na Zona de Treinamento.`}
    >
      <div className="flex items-center justify-between font-semibold tracking-wide">
        <span className="flex items-center gap-1.5 text-slate-300">
          <span>⚡ Estamina</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${modeBadgeClass}`}>
            {modeLabel}
          </span>
        </span>
        <span className={`font-mono text-[11px] ${textColorClass}`}>
          {formattedCurrent} <span className="text-slate-500">/ {formattedMax}</span>
        </span>
      </div>

      <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800/80 p-0.5">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColorClass}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {showDetails && (
        <div className="flex justify-between items-center text-[10px] text-slate-400 px-0.5">
          <span>Capacidade: {formattedMax}</span>
          <span>{percentage.toFixed(0)}%</span>
        </div>
      )}
    </div>
  );
};
