'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { PvPTierInfo, PvPMatchRecord, PvPTacticBoard } from '@/packages/domain/src/pvp';
import { getPvPTierInfo, getNextRankProgress, canDisplaySkull, PVP_TIERS } from '@/packages/domain/src/pvp';
import { gameNetwork, type PvPMatchFoundEvent } from '../lib/GameClientNetworkManager';

interface ArenaPvPModalProps {
  open: boolean;
  onClose: () => void;
  currentCharacterId?: string;
  onOpenHighscores?: () => void;
  onOpenRotation?: (characterId: string) => void;
  onOpenHelper?: (characterId: string) => void;
  onStartPvPDuel?: (matchEvent: PvPMatchFoundEvent) => void;
  onToggleSkull?: (displaySkull: boolean) => void;
}

interface PvPStatusData {
  elo: number;
  tier: string;
  tierLabel: string;
  skull: string;
  skullAsset: string | null;
  badgeColor: string;
  wins: number;
  losses: number;
  draws: number;
  arenaCoins: number;
  seasonRemaining: string;
  displaySkull: boolean;
  skullUnlocked?: boolean;
  rankProgress?: any;
  matchHistory: PvPMatchRecord[];
  tactics: PvPTacticBoard[];
  accountCharacters: { id: string; name: string; vocationName: string; level: number }[];
}

export function ArenaPvPModal({
  open,
  onClose,
  currentCharacterId,
  onOpenHighscores,
  onOpenRotation,
  onOpenHelper,
  onStartPvPDuel,
  onToggleSkull,
}: ArenaPvPModalProps) {
  const [loading, setLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchCountdown, setSearchCountdown] = useState(30);
  const [searchTimeoutMessage, setSearchTimeoutMessage] = useState<string | null>(null);
  const [data, setData] = useState<PvPStatusData | null>(null);
  const [lastMatchResult, setLastMatchResult] = useState<any | null>(null);
  const [editingTacticIndex, setEditingTacticIndex] = useState<number | null>(null);
  const [displaySkull, setDisplaySkull] = useState(true);

  // Carregar dados de PvP do personagem
  const loadPvPStatus = useCallback(async () => {
    if (!currentCharacterId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/pvp/status?characterId=${currentCharacterId}`);
      const json = (await res.json()) as any;
      if (json.success) {
        setData(json);
        setDisplaySkull(json.displaySkull);
      }
    } catch (err) {
      console.error('[ARENA PVP] Falha ao carregar status:', err);
    } finally {
      setLoading(false);
    }
  }, [currentCharacterId]);

  useEffect(() => {
    if (open) {
      loadPvPStatus();
      setLastMatchResult(null);
      setSearchTimeoutMessage(null);
    } else {
      if (isSearching) {
        gameNetwork.sendPvPQueueLeave();
        setIsSearching(false);
      }
    }
  }, [open, loadPvPStatus]);

  // Listener de eventos do Colyseus (Match Found, Queue Searching, Queue Timeout, Duplicate Session)
  useEffect(() => {
    if (!open) return;

    const unsubSearching = gameNetwork.onPvPQueueSearching(({ timeoutSeconds }) => {
      setIsSearching(true);
      setSearchCountdown(timeoutSeconds || 30);
      setSearchTimeoutMessage(null);
    });

    const unsubTimeout = gameNetwork.onPvPQueueTimeout(({ message }) => {
      setIsSearching(false);
      setSearchTimeoutMessage(message || 'Nenhum oponente disponível no momento. Tente novamente em instantes!');
    });

    const unsubMatch = gameNetwork.onPvPMatchFound((event) => {
      setIsSearching(false);
      setSearchTimeoutMessage(null);
      onClose();
      onStartPvPDuel?.(event);
    });

    const unsubDuplicate = gameNetwork.onDuplicateSession((message) => {
      setIsSearching(false);
      setSearchTimeoutMessage(`Desconectado: ${message || 'Sua conta foi conectada em outra janela ou dispositivo.'}`);
    });

    return () => {
      unsubSearching();
      unsubTimeout();
      unsubMatch();
      unsubDuplicate();
    };
  }, [open, onClose, onStartPvPDuel]);

  // Temporizador visual regressivo da busca com auto-cancelamento ao zerar
  useEffect(() => {
    if (!isSearching) return;
    const interval = setInterval(() => {
      setSearchCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsSearching(false);
          gameNetwork.sendPvPQueueLeave();
          setSearchTimeoutMessage('Nenhum oponente disponível no momento. Tente novamente em instantes!');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isSearching]);

  // Ação de entrar na fila ranqueada de jogadores online
  const handleEnterQueue = () => {
    if (!currentCharacterId || isSearching) return;
    setIsSearching(true);
    setSearchCountdown(30);
    setSearchTimeoutMessage(null);
    setLastMatchResult(null);
    gameNetwork.sendPvPQueueJoin(currentCharacterId, data?.elo ?? 1000);
  };

  // Cancelar busca na fila
  const handleCancelQueue = () => {
    gameNetwork.sendPvPQueueLeave();
    setIsSearching(false);
    setSearchTimeoutMessage(null);
  };

  // Toggle de exibição da caveira com sincronização no Colyseus e React state
  const handleToggleSkull = async () => {
    if (!currentCharacterId) return;
    const nextVal = !displaySkull;
    setDisplaySkull(nextVal);
    gameNetwork.sendToggleSkull(nextVal);
    onToggleSkull?.(nextVal);
    try {
      await fetch('/api/pvp/toggle-skull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId: currentCharacterId, displaySkull: nextVal }),
      });
    } catch (err) {
      console.error('[ARENA PVP] Erro ao alternar caveira:', err);
    }
  };

  if (!open) return null;

  const currentElo = data?.elo ?? 1000;
  const currentTier = data?.tier ?? 'Bronze';
  const tierInfo = getPvPTierInfo(currentElo);
  const skullAsset = data?.skullAsset || tierInfo.skullAsset;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        backdropFilter: 'blur(3px)',
        padding: '16px',
        fontFamily: 'Verdana, Arial, sans-serif',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '840px',
          maxWidth: '96vw',
          backgroundColor: '#1e2022',
          border: '2px solid #4a4d52',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          color: '#d1d5db',
          display: 'flex',
          flexDirection: 'column',
          userSelect: 'none',
          borderRadius: '4px',
          overflow: 'hidden',
        }}
      >
        {/* Cabeçalho Oficial */}
        <div
          style={{
            textAlign: 'center',
            padding: '14px 20px',
            backgroundColor: '#18191b',
            borderBottom: '1px solid #33363a',
            position: 'relative',
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#f3c769',
              letterSpacing: '1px',
              textShadow: '0 2px 4px rgba(0,0,0,0.8)',
              fontFamily: 'Georgia, serif',
            }}
          >
            Arena PvP
          </h2>

          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              right: '12px',
              top: '12px',
              background: 'transparent',
              border: 'none',
              color: '#8b8e93',
              fontSize: '18px',
              cursor: 'pointer',
              lineHeight: 1,
            }}
            title="Fechar Janela"
          >
            ✕
          </button>
        </div>

        {/* Modal Body: Duas Colunas */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            minHeight: '480px',
          }}
        >
          {/* COLUNA ESQUERDA: Classificação, Estatísticas e Histórico */}
          <div
            style={{
              width: '340px',
              borderRight: '1px solid #33363a',
              backgroundColor: '#1b1c1e',
              padding: '20px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            {/* Banner de Elo e Patente */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {/* Escudo / Caveira de Patente */}
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '6px',
                  backgroundColor: '#27292c',
                  border: `2px solid ${tierInfo.badgeColor}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 0 12px ${tierInfo.badgeColor}33`,
                  position: 'relative',
                }}
              >
                {skullAsset ? (
                  <img
                    src={skullAsset}
                    alt={tierInfo.skull}
                    style={{ width: '32px', height: '32px', imageRendering: 'pixelated' }}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <span style={{ fontSize: '24px' }}>🛡️</span>
                )}
              </div>

              <div>
                <div
                  style={{
                    fontSize: '26px',
                    fontWeight: 'bold',
                    color: '#facc15',
                    lineHeight: 1.1,
                    fontFamily: 'Georgia, serif',
                  }}
                >
                  {currentElo} <span style={{ fontSize: '14px', color: '#9ca3af', fontWeight: 'normal' }}>pontos</span>
                </div>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: tierInfo.badgeColor,
                    letterSpacing: '0.5px',
                  }}
                >
                  {currentTier} {tierInfo.rankLevel > 0 ? `(Rank ${tierInfo.rankLevel})` : '(Sem Rank)'}
                </div>
              </div>
            </div>

            {/* Barra de Progresso para o Próximo Rank (250 pts por rank) */}
            <div
              style={{
                backgroundColor: '#161719',
                borderRadius: '4px',
                padding: '10px 12px',
                border: '1px solid #2a2c30',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#9ca3af' }}>
                <span>{tierInfo.rankLevel >= 6 ? 'Patente Máxima' : `Próximo: ${PVP_TIERS[tierInfo.rankLevel + 1]?.label}`}</span>
                <span style={{ fontWeight: 'bold', color: '#facc15' }}>
                  {tierInfo.rankLevel >= 6 ? '1500+ pts' : `${currentElo % 250} / 250 pts`}
                </span>
              </div>
              <div style={{ width: '100%', height: '6px', backgroundColor: '#111214', borderRadius: '3px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${tierInfo.rankLevel >= 6 ? 100 : Math.min(100, Math.max(0, ((currentElo % 250) / 250) * 100))}%`,
                    height: '100%',
                    backgroundColor: tierInfo.badgeColor,
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
              {tierInfo.rankLevel < 6 && (
                <div style={{ fontSize: '10px', color: '#6b7280', display: 'flex', justifyContent: 'space-between' }}>
                  <span>+20 pts por vitória</span>
                  <span>Faltam {250 - (currentElo % 250)} pts</span>
                </div>
              )}
            </div>

            {/* Toggle de exibição de caveira no outfit (Requer Rank 1 / 250 pontos) */}
            {canDisplaySkull(currentElo) ? (
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '11px',
                  color: '#facc15',
                  cursor: 'pointer',
                  backgroundColor: '#1c1917',
                  padding: '8px 10px',
                  borderRadius: '4px',
                  border: '1px solid #78350f',
                }}
              >
                <input
                  type="checkbox"
                  checked={displaySkull}
                  onChange={handleToggleSkull}
                  style={{ cursor: 'pointer', accentColor: '#facc15' }}
                />
                <span>Exibir caveira de patente no personagem</span>
              </label>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '11px',
                  color: '#9ca3af',
                  backgroundColor: '#18191b',
                  padding: '8px 10px',
                  borderRadius: '4px',
                  border: '1px dashed #4b5563',
                }}
                title="Atinja 250 pontos (Rank 1 / Caveira Verde) para desbloquear a exibição no personagem"
              >
                <span style={{ fontSize: '13px' }}>🔒</span>
                <span>Bloqueado: requer Rank 1 (250 pts)</span>
              </div>
            )}

            {/* Estatísticas Numéricas */}
            <div
              style={{
                backgroundColor: '#161719',
                borderRadius: '4px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                border: '1px solid #2a2c30',
                fontSize: '13px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#9ca3af' }}>Vitórias</span>
                <span style={{ color: '#4ade80', fontWeight: 'bold' }}>{data?.wins ?? 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#9ca3af' }}>Derrotas</span>
                <span style={{ color: '#f87171', fontWeight: 'bold' }}>{data?.losses ?? 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#9ca3af' }}>Empates</span>
                <span style={{ color: '#cbd5e1', fontWeight: 'bold' }}>{data?.draws ?? 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#9ca3af' }}>Arena coins</span>
                <span style={{ color: '#facc15', fontWeight: 'bold' }}>{data?.arenaCoins ?? 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#9ca3af' }}>Temporada</span>
                <span style={{ color: '#e2e8f0', fontWeight: 'bold' }}>{data?.seasonRemaining ?? '2d'}</span>
              </div>
            </div>

            {/* Seção HISTÓRICO */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div
                style={{
                  textAlign: 'center',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  color: '#f3c769',
                  letterSpacing: '1px',
                  paddingBottom: '8px',
                  borderBottom: '1px solid #2e3135',
                  fontFamily: 'Georgia, serif',
                }}
              >
                HISTÓRICO
              </div>

              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  paddingTop: '10px',
                  maxHeight: '160px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                {data?.matchHistory && data.matchHistory.length > 0 ? (
                  data.matchHistory.map((m) => (
                    <div
                      key={m.id}
                      style={{
                        fontSize: '11px',
                        padding: '6px 8px',
                        backgroundColor: '#161719',
                        borderRadius: '3px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderLeft: `3px solid ${
                          m.result === 'win' ? '#22c55e' : m.result === 'loss' ? '#ef4444' : '#94a3b8'
                        }`,
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 'bold', color: '#f1f5f9' }}>{m.opponentName}</div>
                        <div style={{ color: '#64748b', fontSize: '10px' }}>
                          Nível {m.opponentLevel} · {m.opponentVocation}
                        </div>
                      </div>
                      <div
                        style={{
                          fontWeight: 'bold',
                          color: (m.pointsChange ?? m.eloChange ?? 0) >= 0 ? '#4ade80' : '#f87171',
                        }}
                      >
                        {(m.pointsChange ?? m.eloChange ?? 0) >= 0
                          ? `+${m.pointsChange ?? m.eloChange ?? 0}`
                          : `${m.pointsChange ?? m.eloChange ?? 0}`}
                      </div>
                    </div>
                  ))
                ) : (
                  <div
                    style={{
                      color: '#8b8e93',
                      fontSize: '12px',
                      lineHeight: 1.4,
                      textAlign: 'center',
                      padding: '24px 8px',
                    }}
                  >
                    Você ainda não jogou partidas nesta temporada.
                  </div>
                )}
              </div>
            </div>

            {/* Botão Highscores */}
            <button
              onClick={() => {
                if (onOpenHighscores) {
                  onClose();
                  onOpenHighscores();
                }
              }}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#2b2d31',
                border: '1px solid #45484f',
                borderRadius: '3px',
                color: '#e2e8f0',
                fontSize: '13px',
                fontWeight: 'bold',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#383a40';
                e.currentTarget.style.borderColor = '#facc15';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#2b2d31';
                e.currentTarget.style.borderColor = '#45484f';
              }}
            >
              Highscores
            </button>
          </div>

          {/* COLUNA DIREITA: Ações, Loadout e Táticas */}
          <div
            style={{
              flex: 1,
              padding: '20px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              backgroundColor: '#1e2022',
            }}
          >
            {/* Botões do Topo: Entrar na fila & Desafiar amigo */}
            {isSearching ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  backgroundColor: '#272210',
                  padding: '12px 16px',
                  borderRadius: '4px',
                  border: '1px solid #ca8a04',
                  boxShadow: '0 0 16px rgba(202, 138, 4, 0.3)',
                }}
              >
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      border: '2px solid #facc15',
                      borderTopColor: 'transparent',
                      animation: 'spin 1s linear infinite',
                    }}
                  />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#fef08a' }}>
                      Buscando oponente online no seu rank...
                    </div>
                    <div style={{ fontSize: '11px', color: '#eab308' }}>
                      Tempo limite: {searchCountdown}s restantes
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleCancelQueue}
                  style={{
                    padding: '8px 14px',
                    backgroundColor: '#7f1d1d',
                    border: '1px solid #ef4444',
                    borderRadius: '4px',
                    color: '#fef2f2',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#991b1b')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#7f1d1d')}
                >
                  Cancelar Busca
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={handleEnterQueue}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    backgroundColor: '#facc15',
                    border: '1px solid #ca8a04',
                    borderRadius: '4px',
                    color: '#1e1b4b',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.4)',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fde047')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#facc15')}
                >
                  ⚔️ Entrar na fila ranqueada
                </button>

                <button
                  disabled
                  title="Disponível para contas VIP na próxima atualização"
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    backgroundColor: '#2b2d31',
                    border: '1px solid #3f4248',
                    borderRadius: '4px',
                    color: '#6b7280',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    cursor: 'not-allowed',
                    textAlign: 'center',
                  }}
                >
                  Desafiar amigo (VIP)
                </button>
              </div>
            )}

            {/* AVISO DE NENHUM OPONENTE ENCONTRADO (TIMEOUT) */}
            {searchTimeoutMessage && (
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(234, 179, 8, 0.12)',
                  border: '1px solid #eab308',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: '#fef08a',
                  fontSize: '13px',
                }}
              >
                <span style={{ fontSize: '18px' }}>⏳</span>
                <div style={{ flex: 1 }}>{searchTimeoutMessage}</div>
                <button
                  onClick={() => setSearchTimeoutMessage(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#ca8a04',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  ✕
                </button>
              </div>
            )}

            {/* BANNER DE CELEBRAÇÃO DE AVANÇO DE RANK */}
            {lastMatchResult?.promotion && (
              <div
                style={{
                  padding: '14px 18px',
                  borderRadius: '6px',
                  background: 'linear-gradient(135deg, rgba(161, 98, 7, 0.45), rgba(202, 138, 4, 0.25))',
                  border: '2px solid #facc15',
                  boxShadow: '0 0 24px rgba(250, 204, 21, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                }}
              >
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '8px',
                    backgroundColor: '#18191b',
                    border: `2px solid ${lastMatchResult.promotion.newTier?.badgeColor || '#facc15'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 0 12px rgba(250, 204, 21, 0.5)',
                  }}
                >
                  {lastMatchResult.skullAsset ? (
                    <img
                      src={lastMatchResult.skullAsset}
                      alt="Nova Caveira"
                      style={{ width: '36px', height: '36px', imageRendering: 'pixelated' }}
                    />
                  ) : (
                    <span style={{ fontSize: '26px' }}>🏆</span>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: '15px',
                      fontWeight: 'bold',
                      color: '#fef08a',
                      textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                      fontFamily: 'Georgia, serif',
                    }}
                  >
                    🎉 PARABÉNS! VOCÊ AVANÇOU PARA O RANK {lastMatchResult.promotion.newTier?.label.toUpperCase()}!
                  </div>
                  <div style={{ fontSize: '12px', color: '#fef9c3', marginTop: '2px' }}>
                    {lastMatchResult.promotion.newTier?.skull !== 'none'
                      ? `Você conquistou a Caveira ${lastMatchResult.promotion.newTier?.skull.toUpperCase()}!`
                      : 'Você ingressou nas ranqueadas da Arena!'}
                    {lastMatchResult.promotion.nextGoalPoints > 0
                      ? ` Próximo rank em ${lastMatchResult.promotion.nextGoalPoints - (lastMatchResult.newPoints ?? 0)} pontos (+250 pts).`
                      : ' Você atingiu a patente máxima!'}
                  </div>
                  {lastMatchResult.unlockedSkullToggle && (
                    <div style={{ fontSize: '11px', color: '#4ade80', fontWeight: 'bold', marginTop: '4px' }}>
                      ✨ Opção de exibir caveira no outfit liberada!
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Alerta de Resultado da Partida e Telemetria do Duelo */}
            {lastMatchResult && (
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: '4px',
                  backgroundColor:
                    lastMatchResult.result === 'win'
                      ? 'rgba(34, 197, 94, 0.12)'
                      : lastMatchResult.result === 'loss'
                      ? 'rgba(239, 68, 68, 0.12)'
                      : 'rgba(148, 163, 184, 0.12)',
                  border: `1px solid ${
                    lastMatchResult.result === 'win'
                      ? '#22c55e'
                      : lastMatchResult.result === 'loss'
                      ? '#ef4444'
                      : '#94a3b8'
                  }`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '14px' }}>
                      {lastMatchResult.result === 'win'
                        ? '🏆 VITÓRIA NA ARENA!'
                        : lastMatchResult.result === 'loss'
                        ? '💀 DERROTA NA ARENA'
                        : '🤝 EMPATE!'}
                    </div>
                    <div style={{ color: '#cbd5e1', fontSize: '12px', marginTop: '2px' }}>
                      Adversário: <span style={{ color: '#facc15' }}>{lastMatchResult.opponent?.name}</span> (
                      {lastMatchResult.opponent?.vocation} · Nvl {lastMatchResult.opponent?.level})
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div
                      style={{
                        fontWeight: 'bold',
                        fontSize: '15px',
                        color: lastMatchResult.pointsDelta >= 0 ? '#4ade80' : '#f87171',
                      }}
                    >
                      {lastMatchResult.pointsDelta >= 0
                        ? `+${lastMatchResult.pointsDelta} Pontos`
                        : `${lastMatchResult.pointsDelta} Pontos`}
                    </div>
                    <div style={{ color: '#facc15', fontSize: '11px' }}>
                      +{lastMatchResult.arenaCoinsDelta} Arena Coins
                    </div>
                  </div>
                </div>

                {/* Detalhes de Arena: Spawns e Poções Automáticas */}
                <div
                  style={{
                    backgroundColor: 'rgba(0,0,0,0.3)',
                    padding: '8px 10px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    color: '#9ca3af',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px',
                    borderLeft: '3px solid #3b82f6',
                  }}
                >
                  <div>
                    📍 <strong style={{ color: '#cbd5e1' }}>Spawns de Duelo:</strong> Seu spawn:{' '}
                    <span style={{ color: '#60a5fa' }}>
                      {lastMatchResult.playerSpawn ? `Spawn ${lastMatchResult.playerSpawn.id} (${lastMatchResult.playerSpawn.x}, ${lastMatchResult.playerSpawn.y})` : 'Spawn 1'}
                    </span>{' '}
                    vs Oponente:{' '}
                    <span style={{ color: '#f87171' }}>
                      {lastMatchResult.opponentSpawn ? `Spawn ${lastMatchResult.opponentSpawn.id} (${lastMatchResult.opponentSpawn.x}, ${lastMatchResult.opponentSpawn.y})` : 'Spawn 2'}
                    </span>
                  </div>
                  <div>
                    🧪 <strong style={{ color: '#cbd5e1' }}>Suprimentos de Duelo:</strong> 100 Health e 100 Mana Potions automáticas{' '}
                    {lastMatchResult.potionsUsed && (
                      <span style={{ color: '#94a3b8' }}>
                        (Gastas: {lastMatchResult.potionsUsed.health} HP / {lastMatchResult.potionsUsed.mana} MP)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* SEÇÃO: LOADOUT DE PVP */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: '#f3c769',
                  letterSpacing: '0.5px',
                  fontFamily: 'Georgia, serif',
                }}
              >
                LOADOUT DE PVP
              </div>

              <div style={{ fontSize: '11px', color: '#8b8e93', lineHeight: 1.4 }}>
                A arena usa a sua BUILD de caçada (é uma só). Aqui você ajusta apenas rotação e helper:
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  backgroundColor: '#161719',
                  padding: '12px 14px',
                  borderRadius: '4px',
                  border: '1px solid #2a2c30',
                }}
              >
                {data?.accountCharacters && data.accountCharacters.length > 0 ? (
                  data.accountCharacters.map((char) => (
                    <div
                      key={char.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '4px 0',
                        borderBottom: '1px solid #232528',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '13px', color: '#f1f5f9' }}>
                          {char.name}
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                          ({char.vocationName} · Lvl {char.level})
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => onOpenRotation?.(char.id)}
                          style={{
                            padding: '4px 10px',
                            backgroundColor: '#27292c',
                            border: '1px solid #3f4248',
                            borderRadius: '3px',
                            color: '#e2e8f0',
                            fontSize: '11px',
                            cursor: 'pointer',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#facc15')}
                          onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#3f4248')}
                        >
                          Rotação
                        </button>
                        <button
                          onClick={() => onOpenHelper?.(char.id)}
                          style={{
                            padding: '4px 10px',
                            backgroundColor: '#27292c',
                            border: '1px solid #3f4248',
                            borderRadius: '3px',
                            color: '#e2e8f0',
                            fontSize: '11px',
                            cursor: 'pointer',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#facc15')}
                          onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#3f4248')}
                        >
                          Helper
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ color: '#8b8e93', fontSize: '11px' }}>Carregando personagens da conta...</div>
                )}
              </div>
            </div>

            {/* SEÇÃO: TÁTICAS DA ARENA */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: '#f3c769',
                  letterSpacing: '0.5px',
                  fontFamily: 'Georgia, serif',
                }}
              >
                TÁTICAS DA ARENA
              </div>

              <div style={{ fontSize: '11px', color: '#8b8e93', lineHeight: 1.4 }}>
                Três pranchas; o jogo usa a que mais casa com a comp adversária.
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  backgroundColor: '#161719',
                  padding: '12px 14px',
                  borderRadius: '4px',
                  border: '1px solid #2a2c30',
                }}
              >
                {data?.tactics && data.tactics.length > 0 ? (
                  data.tactics.map((t, idx) => (
                    <div
                      key={t.id}
                      style={{
                        fontSize: '12px',
                        color: '#cbd5e1',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span style={{ fontWeight: 'bold', color: '#facc15' }}>{idx + 1} ·</span>
                      <span>
                        {t.title} — <span style={{ color: '#94a3b8' }}>{t.formation}</span>
                      </span>
                    </div>
                  ))
                ) : (
                  <>
                    <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
                      <span style={{ fontWeight: 'bold', color: '#facc15' }}>1 ·</span> Contra EK · ED · RP —{' '}
                      <span style={{ color: '#94a3b8' }}>formação linha</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
                      <span style={{ fontWeight: 'bold', color: '#facc15' }}>2 ·</span> Contra Burst Mage —{' '}
                      <span style={{ color: '#94a3b8' }}>formação defensiva</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
                      <span style={{ fontWeight: 'bold', color: '#facc15' }}>3 ·</span> Guerra de Atrito —{' '}
                      <span style={{ color: '#94a3b8' }}>formação dispersa</span>
                    </div>
                  </>
                )}

                <div style={{ paddingTop: '6px' }}>
                  <button
                    onClick={() => {
                      alert('As táticas foram calibradas automaticamente pela IA para a melhor formação de batalha da sua composição.');
                    }}
                    style={{
                      padding: '4px 12px',
                      backgroundColor: '#27292c',
                      border: '1px solid #3f4248',
                      borderRadius: '3px',
                      color: '#e2e8f0',
                      fontSize: '11px',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#facc15')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#3f4248')}
                  >
                    Configurar
                  </button>
                </div>
              </div>
            </div>

            {/* Rodapé Direito: Botão Fechar */}
            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={onClose}
                style={{
                  padding: '8px 24px',
                  backgroundColor: '#2b2d31',
                  border: '1px solid #45484f',
                  borderRadius: '3px',
                  color: '#e2e8f0',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#383a40';
                  e.currentTarget.style.borderColor = '#facc15';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#2b2d31';
                  e.currentTarget.style.borderColor = '#45484f';
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
