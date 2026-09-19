'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { clientErrorLogger, type ClientLogEntry, type ErrorLogLevel } from '@/apps/web/lib/errorLogger';

interface AdminDebugModalProps {
  open: boolean;
  onClose: () => void;
  isAdmin: boolean;
  character?: any;
  gameNetwork?: any;
  onForceSave?: () => Promise<boolean | void>;
  onReconnect?: () => void;
}

export function AdminDebugModal({
  open,
  onClose,
  isAdmin,
  character,
  gameNetwork,
  onForceSave,
  onReconnect,
}: AdminDebugModalProps) {
  const [activeTab, setActiveTab] = useState<'logs' | 'telemetry' | 'actions'>('logs');
  const [logs, setLogs] = useState<ClientLogEntry[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<ErrorLogLevel | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [fps, setFps] = useState(60);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Subscribe to real-time client error logs
  useEffect(() => {
    setLogs(clientErrorLogger.getLogs());
    const unsubscribe = clientErrorLogger.subscribe((_entry, allLogs) => {
      setLogs([...allLogs]);
    });
    return () => unsubscribe();
  }, []);

  // Simple live FPS counter
  useEffect(() => {
    if (!open) return;
    let frameCount = 0;
    let lastTime = performance.now();
    let animId: number;

    const measureFps = () => {
      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        setFps(Math.round((frameCount * 1000) / (now - lastTime)));
        frameCount = 0;
        lastTime = now;
      }
      animId = requestAnimationFrame(measureFps);
    };

    animId = requestAnimationFrame(measureFps);
    return () => cancelAnimationFrame(animId);
  }, [open]);

  // Filter logs based on severity and search query
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (selectedLevel !== 'ALL' && log.level !== selectedLevel) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesMsg = log.message.toLowerCase().includes(q);
        const matchesCat = log.category.toLowerCase().includes(q);
        const matchesDetails = log.details && JSON.stringify(log.details).toLowerCase().includes(q);
        if (!matchesMsg && !matchesCat && !matchesDetails) return false;
      }
      return true;
    });
  }, [logs, selectedLevel, searchQuery]);

  const errorCount = logs.filter((l) => l.level === 'ERROR').length;
  const warnCount = logs.filter((l) => l.level === 'WARN').length;

  const handleCopyLogs = () => {
    const json = clientErrorLogger.exportJson();
    navigator.clipboard.writeText(json);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  const handleSimulateError = () => {
    clientErrorLogger.error(
      'DEBUG_SIMULATION',
      `Erro de teste acionado manualmente por [${character?.name || 'ADMIN'}] às ${new Date().toLocaleTimeString()}`,
      { simulated: true, timestamp: Date.now(), testUser: character?.name }
    );
  };

  const handleClearLogs = () => {
    clientErrorLogger.clear();
    setLogs([]);
  };

  if (!open || !isAdmin) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
        fontFamily: 'Verdana, Arial, sans-serif',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '780px',
          maxWidth: '96vw',
          height: '620px',
          maxHeight: '92vh',
          backgroundColor: '#18191b',
          border: '2px solid #58a6ff',
          borderRadius: '8px',
          boxShadow: '0 12px 48px rgba(0, 0, 0, 0.95), 0 0 16px rgba(88, 166, 255, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: '#e6ded0',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '12px 18px',
            backgroundColor: '#121315',
            borderBottom: '1px solid #333',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>🛠️</span>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#58a6ff', letterSpacing: '0.5px' }}>
                PAINEL DE DEBUG & LOGS CENTRALIZADOS
              </div>
              <div style={{ fontSize: '10px', color: '#9ea49c' }}>
                Ferramenta exclusiva autoritativa para Administradores e GMs
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#9ea49c',
              fontSize: '20px',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            ✕
          </button>
        </div>

        {/* Tabs Bar */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #282a2d',
            backgroundColor: '#1b1d20',
            padding: '4px 16px 0',
            gap: '8px',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderBottom: activeTab === 'logs' ? '3px solid #58a6ff' : '3px solid transparent',
              background: 'none',
              color: activeTab === 'logs' ? '#58a6ff' : '#9ea49c',
              fontWeight: 800,
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>📋 Logs do Sistema</span>
            {errorCount > 0 && (
              <span
                style={{
                  backgroundColor: '#ef4444',
                  color: '#fff',
                  borderRadius: '10px',
                  padding: '1px 6px',
                  fontSize: '10px',
                  fontWeight: 900,
                }}
              >
                {errorCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('telemetry')}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderBottom: activeTab === 'telemetry' ? '3px solid #58a6ff' : '3px solid transparent',
              background: 'none',
              color: activeTab === 'telemetry' ? '#58a6ff' : '#9ea49c',
              fontWeight: 800,
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>⚡ Telemetria & Engine</span>
            <span style={{ color: '#22c55e', fontSize: '11px', fontWeight: 800 }}>({fps} FPS)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('actions')}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderBottom: activeTab === 'actions' ? '3px solid #58a6ff' : '3px solid transparent',
              background: 'none',
              color: activeTab === 'actions' ? '#58a6ff' : '#9ea49c',
              fontWeight: 800,
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            <span>🧰 Ações Rápidas de GM</span>
          </button>
        </div>

        {/* Tab Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
          {/* TAB 1: LOGS DE ERROS */}
          {activeTab === 'logs' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>
              {/* Controls Header */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {(['ALL', 'ERROR', 'WARN', 'INFO'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setSelectedLevel(lvl)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '4px',
                        border: '1px solid #444',
                        backgroundColor: selectedLevel === lvl ? '#374151' : '#1f2937',
                        color:
                          lvl === 'ERROR' ? '#f87171' :
                          lvl === 'WARN' ? '#fbbf24' :
                          lvl === 'INFO' ? '#60a5fa' : '#e5e7eb',
                        fontSize: '11px',
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      {lvl === 'ALL' ? `TODOS (${logs.length})` :
                       lvl === 'ERROR' ? `ERROS (${errorCount})` :
                       lvl === 'WARN' ? `ALERTAS (${warnCount})` : lvl}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={handleSimulateError}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '4px',
                      border: '1px solid #f59e0b',
                      backgroundColor: 'rgba(245, 158, 11, 0.15)',
                      color: '#fbbf24',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    🧪 Testar Erro
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyLogs}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '4px',
                      border: '1px solid #3b82f6',
                      backgroundColor: 'rgba(59, 130, 246, 0.15)',
                      color: '#93c5fd',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {copiedNotification ? '✓ Copiado!' : '📋 Copiar JSON'}
                  </button>
                  <button
                    type="button"
                    onClick={handleClearLogs}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '4px',
                      border: '1px solid #ef4444',
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      color: '#fca5a5',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    🗑️ Limpar
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filtrar logs por mensagem, categoria ou detalhes..."
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#111214',
                  border: '1px solid #333',
                  borderRadius: '4px',
                  color: '#fff',
                  fontSize: '12px',
                  outline: 'none',
                }}
              />

              {/* Logs List */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  backgroundColor: '#111214',
                  border: '1px solid #282a2d',
                  borderRadius: '4px',
                  padding: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                {filteredLogs.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#6b7280', padding: '32px 0', fontSize: '13px' }}>
                    Nenhum log encontrado para os critérios selecionados.
                  </div>
                ) : (
                  filteredLogs.map((log) => {
                    const isExpanded = expandedLogId === log.id;
                    const isError = log.level === 'ERROR';
                    const isWarn = log.level === 'WARN';

                    return (
                      <div
                        key={log.id}
                        style={{
                          backgroundColor: isError ? 'rgba(239, 68, 68, 0.08)' : isWarn ? 'rgba(245, 158, 11, 0.06)' : 'rgba(255, 255, 255, 0.02)',
                          border: `1px solid ${isError ? 'rgba(239, 68, 68, 0.3)' : isWarn ? 'rgba(245, 158, 11, 0.25)' : '#26292d'}`,
                          borderRadius: '4px',
                          padding: '8px 10px',
                          fontSize: '11px',
                          cursor: 'pointer',
                        }}
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              style={{
                                padding: '2px 5px',
                                borderRadius: '3px',
                                fontSize: '9px',
                                fontWeight: 900,
                                backgroundColor: isError ? '#ef4444' : isWarn ? '#f59e0b' : '#3b82f6',
                                color: '#fff',
                              }}
                            >
                              {log.level}
                            </span>
                            <span style={{ color: '#9ca3af', fontSize: '10px' }}>{log.timestamp}</span>
                            <span style={{ color: '#a78bfa', fontWeight: 800 }}>[{log.category}]</span>
                            <span style={{ color: isError ? '#fca5a5' : isWarn ? '#fde68a' : '#e5e7eb', fontWeight: 600 }}>
                              {log.message}
                            </span>
                          </div>
                          <span style={{ color: '#6b7280', fontSize: '10px' }}>
                            {isExpanded ? '▲ recolher' : '▼ detalhes'}
                          </span>
                        </div>

                        {isExpanded && (
                          <div
                            style={{
                              marginTop: '8px',
                              padding: '8px',
                              backgroundColor: '#0a0a0c',
                              border: '1px solid #222',
                              borderRadius: '3px',
                              fontSize: '10px',
                              fontFamily: 'monospace',
                              whiteSpace: 'pre-wrap',
                              color: '#d1d5db',
                              maxHeight: '200px',
                              overflowY: 'auto',
                            }}
                          >
                            {log.details && (
                              <div>
                                <div style={{ color: '#58a6ff', fontWeight: 700, marginBottom: '4px' }}>Detalhes:</div>
                                {typeof log.details === 'object' ? JSON.stringify(log.details, null, 2) : String(log.details)}
                              </div>
                            )}
                            {log.stack && (
                              <div style={{ marginTop: '6px' }}>
                                <div style={{ color: '#f87171', fontWeight: 700, marginBottom: '4px' }}>Stack Trace:</div>
                                {log.stack}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 2: TELEMETRIA & DIAGNÓSTICO */}
          {activeTab === 'telemetry' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ backgroundColor: '#111214', border: '1px solid #282a2d', borderRadius: '6px', padding: '14px' }}>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#58a6ff', marginBottom: '10px' }}>
                  ⚡ Desempenho do Cliente
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#9ca3af' }}>Taxa de Quadros (FPS):</span>
                    <span style={{ color: fps >= 50 ? '#22c55e' : fps >= 30 ? '#f59e0b' : '#ef4444', fontWeight: 800 }}>
                      {fps} FPS
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#9ca3af' }}>Resolução de Tela:</span>
                    <span style={{ color: '#e5e7eb' }}>{typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#9ca3af' }}>Pixel Ratio:</span>
                    <span style={{ color: '#e5e7eb' }}>{typeof window !== 'undefined' ? window.devicePixelRatio : 1}x</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#9ca3af' }}>Memória JS Heap:</span>
                    <span style={{ color: '#e5e7eb' }}>
                      {typeof (performance as any)?.memory?.usedJSHeapSize === 'number'
                        ? `${Math.round((performance as any).memory.usedJSHeapSize / (1024 * 1024))} MB`
                        : 'Disponível no Chrome/Edge'}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ backgroundColor: '#111214', border: '1px solid #282a2d', borderRadius: '6px', padding: '14px' }}>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#22c55e', marginBottom: '10px' }}>
                  🌐 Conexão e Rede (Colyseus)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#9ca3af' }}>Status WebSocket:</span>
                    <span style={{ color: gameNetwork?.IsConnected ? '#22c55e' : '#ef4444', fontWeight: 800 }}>
                      {gameNetwork?.IsConnected ? '● CONECTADO' : '○ DESCONECTADO'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#9ca3af' }}>ID da Sessão:</span>
                    <span style={{ color: '#e5e7eb', fontFamily: 'monospace', fontSize: '11px' }}>
                      {gameNetwork?.LocalPlayerId || 'N/A'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#9ca3af' }}>Hunt Context:</span>
                    <span style={{ color: gameNetwork?.IsHuntContextConfirmed ? '#22c55e' : '#f59e0b', fontWeight: 700 }}>
                      {gameNetwork?.IsHuntContextConfirmed ? 'Confirmado' : 'Pendente / Cidade'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#9ca3af' }}>Jogadores na Sala:</span>
                    <span style={{ color: '#e5e7eb', fontWeight: 700 }}>
                      {gameNetwork?.Players?.size ?? 0}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ backgroundColor: '#111214', border: '1px solid #282a2d', borderRadius: '6px', padding: '14px', gridColumn: '1 / -1' }}>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#f59e0b', marginBottom: '10px' }}>
                  🧙 Estado do Personagem Ativo
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', fontSize: '12px' }}>
                  <div><span style={{ color: '#9ca3af' }}>Nome:</span> <strong style={{ color: '#fff' }}>{character?.name}</strong></div>
                  <div><span style={{ color: '#9ca3af' }}>Nível:</span> <strong style={{ color: '#fff' }}>{character?.level}</strong></div>
                  <div><span style={{ color: '#9ca3af' }}>Vocação:</span> <strong style={{ color: '#fff' }}>{character?.vocation}</strong></div>
                  <div><span style={{ color: '#9ca3af' }}>Vida:</span> <strong style={{ color: '#22c55e' }}>{character?.currentHp} / {character?.maxHp}</strong></div>
                  <div><span style={{ color: '#9ca3af' }}>Mana:</span> <strong style={{ color: '#3b82f6' }}>{character?.currentMana} / {character?.maxMana}</strong></div>
                  <div><span style={{ color: '#9ca3af' }}>Título Admin:</span> <strong style={{ color: '#ffd700' }}>[{character?.adminTitle || 'Nenhum'}]</strong></div>
                  <div><span style={{ color: '#9ca3af' }}>Rank PvP ELO:</span> <strong style={{ color: '#f59e0b' }}>{character?.pvpElo ?? 0} ({character?.pvpTier || 'Iniciante'})</strong></div>
                  <div><span style={{ color: '#9ca3af' }}>Caveira Visível:</span> <strong style={{ color: character?.displaySkull !== false ? '#22c55e' : '#ef4444' }}>{character?.displaySkull !== false ? 'SIM' : 'NÃO'}</strong></div>
                  <div><span style={{ color: '#9ca3af' }}>Estamina:</span> <strong style={{ color: '#fff' }}>{character?.staminaMinutes ?? 15} min</strong></div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AÇÕES DE GM */}
          {activeTab === 'actions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '13px', color: '#9ea49c' }}>
                Ações de depuração e recuperação rápida autorizadas exclusivamente para Administradores:
              </div>

              {actionFeedback && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(34, 197, 94, 0.15)',
                    border: '1px solid #22c55e',
                    color: '#86efac',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}
                >
                  {actionFeedback}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      if (onForceSave) {
                        setActionFeedback('Salvamento manual em andamento...');
                        await onForceSave();
                        setActionFeedback('✓ Progresso do personagem salvo com sucesso no banco de dados!');
                      } else {
                        setActionFeedback('Trigger de salvamento não disponível neste contexto.');
                      }
                    } catch (e: any) {
                      setActionFeedback(`Erro ao salvar: ${e.message}`);
                    }
                  }}
                  style={{
                    padding: '14px',
                    borderRadius: '6px',
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    color: '#f3f4f6',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#22c55e' }}>💾 Forçar Salvamento Imediato</div>
                  <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                    Grava o estado atual de vida, mana, inventário e XP diretamente no Prisma DB.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (onReconnect) {
                      setActionFeedback('Reiniciando conexão Colyseus...');
                      onReconnect();
                      setActionFeedback('✓ Sinal de reconexão disparado.');
                    } else {
                      setActionFeedback('Handler de reconexão não configurado.');
                    }
                  }}
                  style={{
                    padding: '14px',
                    borderRadius: '6px',
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    color: '#f3f4f6',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#3b82f6' }}>🔄 Reconectar ao Servidor</div>
                  <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                    Fecha o socket WebSocket ativo e inicia um novo aperto de mão autoritativo.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    try {
                      localStorage.clear();
                      sessionStorage.clear();
                      setActionFeedback('✓ LocalStorage e SessionStorage limpos com sucesso. Recarregue a página se necessário.');
                    } catch (e: any) {
                      setActionFeedback(`Erro ao limpar storage: ${e.message}`);
                    }
                  }}
                  style={{
                    padding: '14px',
                    borderRadius: '6px',
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    color: '#f3f4f6',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#f59e0b' }}>🧹 Limpar Cache Local</div>
                  <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                    Remove dados em cache do navegador para testar fluxo de primeiro login.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleCopyLogs}
                  style={{
                    padding: '14px',
                    borderRadius: '6px',
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    color: '#f3f4f6',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#a855f7' }}>📋 Exportar Diagnóstico Completo</div>
                  <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                    Copia JSON com telemetria, logs de erro e estado da engine para a área de transferência.
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
