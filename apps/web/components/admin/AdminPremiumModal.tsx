'use client';

import React, { useState } from 'react';

export interface AdminPlayerRecord {
  id: string;
  name: string;
  adminTitle?: string | null;
  vocationId: number;
  vocationName: string;
  level: number;
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  posX: number;
  posY: number;
  posZ: number;
  accountId: string;
  accountEmail: string;
  isBanned: boolean;
  role: string;
  isPremium?: boolean;
  premiumUntil?: string | null;
  updatedAt: string;
}

interface Props {
  player: AdminPlayerRecord;
  onClose: () => void;
  onSuccess: (updatedAccount: { id: string; email: string; isPremium: boolean; premiumUntil: string | null }) => void;
  getAuthHeaders: () => Record<string, string>;
}

export function AdminPremiumModal({ player, onClose, onSuccess, getAuthHeaders }: Props) {
  const [daysInput, setDaysInput] = useState<number>(30);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showConfirmFree, setShowConfirmFree] = useState<boolean>(false);

  const now = new Date();
  const currentUntil = player.premiumUntil ? new Date(player.premiumUntil) : null;
  const isCurrentlyActive = Boolean(player.isPremium && currentUntil && currentUntil.getTime() > now.getTime());

  // Helper for format remaining time
  const getRemainingTimeText = () => {
    if (!isCurrentlyActive || !currentUntil) {
      return 'Nenhum tempo restante (Free Account)';
    }
    const diffMs = currentUntil.getTime() - now.getTime();
    if (diffMs <= 0) return 'Expirado';

    const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));

    if (days > 0) {
      return `${days} dia${days > 1 ? 's' : ''} e ${hours} hora${hours > 1 ? 's' : ''} restantes`;
    }
    return `${hours} hora${hours > 1 ? 's' : ''} e ${minutes} minuto${minutes > 1 ? 's' : ''} restantes`;
  };

  // Helper to project future expiration
  const getProjectedDate = (days: number, isAdding: boolean): string => {
    if (isNaN(days) || days <= 0) return '-';
    const base = isCurrentlyActive && currentUntil ? currentUntil.getTime() : now.getTime();
    const targetMs = isAdding ? base + days * 86400000 : base - days * 86400000;
    if (!isAdding && targetMs <= now.getTime()) {
      return 'Expirará imediatamente (tornará Free Account)';
    }
    const projected = new Date(targetMs);
    return `${projected.toLocaleString('pt-BR')} (${projected.toUTCString()})`;
  };

  const executeAction = async (action: 'add_days' | 'remove_days' | 'add_30_days' | 'set_free', daysVal?: number) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/admin/premium', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          accountId: player.accountId,
          action,
          days: daysVal ?? daysInput,
        }),
      });

      const data = (await res.json()) as any;
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Falha ao processar solicitação de Premium.');
      }

      setSuccessMessage(data.message || 'Operação realizada com sucesso!');
      setShowConfirmFree(false);
      if (data.account) {
        onSuccess(data.account);
      }
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro inesperado.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 5, 8, 0.85)',
        backdropFilter: 'blur(6px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.15s ease',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#111827',
          border: '2px solid #ca8a04',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '540px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 20px rgba(202, 138, 4, 0.2)',
          color: '#e5e7eb',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Title Bar */}
        <div
          style={{
            padding: '14px 18px',
            backgroundColor: '#1f2937',
            borderBottom: '1px solid #374151',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>💎</span>
            <span style={{ fontWeight: 800, fontSize: '15px', color: '#fef08a', letterSpacing: '0.5px' }}>
              Gerenciamento de Assinatura Premium
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#9ca3af',
              fontSize: '18px',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {errorMessage && (
            <div
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #ef4444',
                color: '#fca5a5',
                padding: '10px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                lineHeight: 1.4,
              }}
            >
              ⚠️ {errorMessage}
            </div>
          )}

          {successMessage && (
            <div
              style={{
                backgroundColor: 'rgba(34, 197, 94, 0.15)',
                border: '1px solid #22c55e',
                color: '#86efac',
                padding: '10px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                lineHeight: 1.4,
              }}
            >
              🎉 {successMessage}
            </div>
          )}

          {/* Account & Player Details Card */}
          <div
            style={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Conta / Jogador</span>
              <span style={{ fontSize: '11px', color: '#cbd5e1', fontFamily: 'monospace' }}>ID: {player.accountId}</span>
            </div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>
              {player.accountEmail}{' '}
              <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: '13px' }}>
                (Personagem: <strong style={{ color: '#fcd34d' }}>{player.name}</strong>, Lv. {player.level})
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>Status Atual:</span>
              {isCurrentlyActive ? (
                <span
                  style={{
                    backgroundColor: '#854d0e',
                    border: '1px solid #facc15',
                    color: '#fef08a',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  👑 PREMIUM ACCOUNT
                </span>
              ) : (
                <span
                  style={{
                    backgroundColor: '#334155',
                    border: '1px solid #64748b',
                    color: '#cbd5e1',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 800,
                  }}
                >
                  🛡️ FREE ACCOUNT
                </span>
              )}
            </div>

            {/* Expiration Details */}
            <div
              style={{
                marginTop: '6px',
                paddingTop: '6px',
                borderTop: '1px solid #334155',
                fontSize: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '3px',
              }}
            >
              <div>
                <span style={{ color: '#94a3b8' }}>Vencimento Local: </span>
                <strong style={{ color: isCurrentlyActive ? '#a7f3d0' : '#f87171' }}>
                  {currentUntil ? currentUntil.toLocaleString('pt-BR') : 'Sem assinatura ativa'}
                </strong>
              </div>
              <div>
                <span style={{ color: '#94a3b8' }}>Vencimento UTC: </span>
                <span style={{ color: '#cbd5e1', fontFamily: 'monospace', fontSize: '11px' }}>
                  {currentUntil ? currentUntil.toUTCString() : 'N/A'}
                </span>
              </div>
              <div>
                <span style={{ color: '#94a3b8' }}>Tempo Restante: </span>
                <span style={{ color: isCurrentlyActive ? '#fef08a' : '#94a3b8', fontWeight: 600 }}>
                  {getRemainingTimeText()}
                </span>
              </div>
            </div>
          </div>

          {/* Days Input and Quick Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600 }}>
              Quantidade de Dias (24h por dia):
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="number"
                min="1"
                step="1"
                value={daysInput}
                onChange={(e) => setDaysInput(Math.max(1, parseInt(e.target.value, 10) || 1))}
                disabled={isSubmitting}
                style={{
                  backgroundColor: '#0f172a',
                  border: '1px solid #475569',
                  borderRadius: '6px',
                  color: '#fff',
                  padding: '8px 12px',
                  fontSize: '14px',
                  width: '100px',
                  textAlign: 'center',
                  fontWeight: 'bold',
                }}
              />
              <button
                type="button"
                onClick={() => executeAction('add_30_days', 30)}
                disabled={isSubmitting}
                style={{
                  backgroundColor: '#1e3a8a',
                  border: '1px solid #3b82f6',
                  color: '#93c5fd',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                ⭐ Atalho +30 Dias
              </button>
            </div>

            {/* Projected Date Preview */}
            <div
              style={{
                backgroundColor: '#090d16',
                border: '1px dashed #374151',
                borderRadius: '6px',
                padding: '8px 10px',
                fontSize: '11px',
                color: '#94a3b8',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}
            >
              <div>
                ➕ <strong style={{ color: '#86efac' }}>Se adicionar {daysInput} dias:</strong>{' '}
                {getProjectedDate(daysInput, true)}
              </div>
              {isCurrentlyActive && (
                <div>
                  ➖ <strong style={{ color: '#fca5a5' }}>Se remover {daysInput} dias:</strong>{' '}
                  {getProjectedDate(daysInput, false)}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>
            <button
              type="button"
              onClick={() => executeAction('add_days')}
              disabled={isSubmitting || daysInput <= 0}
              style={{
                backgroundColor: '#15803d',
                border: '1px solid #22c55e',
                color: '#fff',
                padding: '10px 14px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              ➕ Adicionar {daysInput} Dias
            </button>

            <button
              type="button"
              onClick={() => executeAction('remove_days')}
              disabled={isSubmitting || !isCurrentlyActive || daysInput <= 0}
              style={{
                backgroundColor: isCurrentlyActive ? '#991b1b' : '#374151',
                border: `1px solid ${isCurrentlyActive ? '#ef4444' : '#4b5563'}`,
                color: isCurrentlyActive ? '#fff' : '#9ca3af',
                padding: '10px 14px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: !isCurrentlyActive || isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              ➖ Remover {daysInput} Dias
            </button>
          </div>

          {/* Revoke / Make Free Account */}
          <div style={{ borderTop: '1px solid #374151', paddingTop: '12px', marginTop: '6px' }}>
            {!showConfirmFree ? (
              <button
                type="button"
                onClick={() => setShowConfirmFree(true)}
                disabled={isSubmitting || !isCurrentlyActive}
                style={{
                  width: '100%',
                  backgroundColor: 'transparent',
                  border: '1px solid #6b7280',
                  color: isCurrentlyActive ? '#f87171' : '#6b7280',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: !isCurrentlyActive || isSubmitting ? 'not-allowed' : 'pointer',
                }}
              >
                🚫 Tornar Free Account (Encerrar Benefícios)
              </button>
            ) : (
              <div
                style={{
                  backgroundColor: 'rgba(185, 28, 28, 0.2)',
                  border: '1px solid #ef4444',
                  borderRadius: '6px',
                  padding: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '12px', color: '#fca5a5', fontWeight: 600 }}>
                  ⚠️ Tem certeza que deseja revogar o Premium de {player.accountEmail} imediatamente?
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                  <button
                    type="button"
                    onClick={() => executeAction('set_free')}
                    disabled={isSubmitting}
                    style={{
                      backgroundColor: '#dc2626',
                      border: 'none',
                      color: '#fff',
                      padding: '6px 14px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Sim, Tornar Free Account
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConfirmFree(false)}
                    disabled={isSubmitting}
                    style={{
                      backgroundColor: '#374151',
                      border: 'none',
                      color: '#e5e7eb',
                      padding: '6px 14px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
