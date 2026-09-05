'use client';

import Link from 'next/link';
import { useState, useEffect, type FormEvent } from 'react';
import { useAuth } from '@/apps/web/auth/AuthProvider';
import { getBrowserSupabase } from '@/packages/auth/src/browser';
import type { GameUpdateRow } from '@/packages/auth/src/types';
import { slugifyUpdateTitle } from '@/packages/updates/src/slug';
import type { ServerConfig } from '@/packages/server/src/config/ServerConfigManager';
import type { LogEntry, LogLevel } from '@/packages/server/src/logging/SystemLogger';

interface UpdateDraft {
  id: string | null;
  title: string;
  summary: string;
  content: string;
  published: boolean;
  publishedAt: string | null;
}

interface PlayerRecord {
  id: string;
  name: string;
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
  updatedAt: string;
}

const emptyDraft: UpdateDraft = { id: null, title: '', summary: '', content: '', published: false, publishedAt: null };

function rowToDraft(row: GameUpdateRow): UpdateDraft {
  return { id: row.id, title: row.title, summary: row.summary, content: row.content, published: row.published, publishedAt: row.published_at };
}

type TabType = 'variables' | 'players' | 'logs' | 'health' | 'updates';

export function AdminPanel({ initialUpdates }: { initialUpdates: GameUpdateRow[] }) {
  const auth = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('variables');
  const [updates, setUpdates] = useState(initialUpdates);
  const [draft, setDraft] = useState<UpdateDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Server config state
  const [serverConfig, setServerConfig] = useState<ServerConfig>({
    expRate: 1.0,
    lootRate: 1.0,
    skillRate: 1.0,
    regenRate: 1.0,
    maxClientsPerRoom: 100,
    periodicSaveIntervalMs: 20000,
    allowReconnectionSec: 20,
    localChatRadius: 8,
    yellChatRadius: 30,
  });

  // Players state
  const [players, setPlayers] = useState<PlayerRecord[]>([]);
  const [playerSearch, setPlayerSearch] = useState('');
  const [selectedVocationFilter, setSelectedVocationFilter] = useState<number | 'all'>('all');

  // Logs state
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logLevelFilter, setLogLevelFilter] = useState<LogLevel | 'ALL'>('ALL');
  const [logQuery, setLogQuery] = useState('');

  const getAuthHeaders = (): Record<string, string> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('colyseus_token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Load server config
  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/admin/config', { headers: getAuthHeaders() });
      const data = (await res.json()) as any;
      if (data.success && data.config) {
        setServerConfig(data.config);
      }
    } catch {}
  };

  // Load players
  const fetchPlayers = async () => {
    try {
      const res = await fetch('/api/admin/players', { headers: getAuthHeaders() });
      const data = (await res.json()) as any;
      if (data.success && Array.isArray(data.players)) {
        setPlayers(data.players);
      }
    } catch {}
  };

  // Load logs
  const fetchLogs = async () => {
    try {
      const params = new URLSearchParams();
      if (logLevelFilter !== 'ALL') params.append('level', logLevelFilter);
      if (logQuery) params.append('query', logQuery);
      const res = await fetch(`/api/admin/logs?${params.toString()}`, { headers: getAuthHeaders() });
      const data = (await res.json()) as any;
      if (data.success && Array.isArray(data.logs)) {
        setLogs(data.logs);
      }
    } catch {}
  };

  useEffect(() => {
    void fetchConfig();
    void fetchPlayers();
    void fetchLogs();
  }, []);

  useEffect(() => {
    if (activeTab === 'logs') {
      void fetchLogs();
    }
  }, [logLevelFilter, logQuery, activeTab]);

  const saveConfig = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(serverConfig),
      });
      const data = (await res.json()) as any;
      if (data.success) {
        setMessage('✅ Variáveis do servidor salvas e aplicadas em tempo real!');
        setServerConfig(data.config);
      } else {
        setMessage(`❌ Erro ao salvar: ${data.error}`);
      }
    } catch (err: any) {
      setMessage(`❌ Erro de conexão: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleGmPlayerAction = async (action: string, player: PlayerRecord, extraParams?: any) => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          action,
          characterId: player.id,
          accountId: player.accountId,
          ...extraParams,
        }),
      });
      const data = (await res.json()) as any;
      if (data.success) {
        setMessage(`✅ GM Action (${action}): ${data.message}`);
        await fetchPlayers();
        await fetchLogs();
      } else {
        setMessage(`❌ Falha ao executar ação: ${data.error}`);
      }
    } catch (err: any) {
      setMessage(`❌ Erro: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const reloadUpdates = async () => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    const { data, error } = await supabase
      .from('game_updates')
      .select('id, title, slug, summary, content, published_at, updated_at, published')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    setUpdates((data ?? []) as GameUpdateRow[]);
  };

  const saveUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft) return;
    const supabase = getBrowserSupabase();
    if (!supabase) {
      setMessage('Supabase não está configurado.');
      return;
    }
    const slug = slugifyUpdateTitle(draft.title);
    if (!slug) {
      setMessage('O título precisa gerar um slug válido.');
      return;
    }

    setBusy(true);
    setMessage(null);
    const payload = {
      title: draft.title.trim(),
      slug,
      summary: draft.summary.trim(),
      content: draft.content.trim(),
      published: draft.published,
      published_at: draft.published ? draft.publishedAt ?? new Date().toISOString() : null,
    };
    const result = draft.id
      ? await supabase.from('game_updates').update(payload).eq('id', draft.id)
      : await supabase.from('game_updates').insert(payload);

    if (result.error) {
      setMessage(result.error.code === '23505' ? 'Já existe uma atualização com este slug.' : result.error.message);
      setBusy(false);
      return;
    }
    await reloadUpdates();
    setDraft(null);
    setMessage('Atualização salva.');
    setBusy(false);
  };

  const filteredPlayers = players.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(playerSearch.toLowerCase()) ||
      p.accountEmail.toLowerCase().includes(playerSearch.toLowerCase()) ||
      p.id.toLowerCase().includes(playerSearch.toLowerCase());

    const matchesVoc = selectedVocationFilter === 'all' || p.vocationId === selectedVocationFilter;

    return matchesSearch && matchesVoc;
  });

  const roleUpper = (auth.viewer?.role || '').toUpperCase();
  const isAdminOrGm = roleUpper === 'ADMIN' || roleUpper === 'GM';

  if (auth.status === 'authenticated' && !isAdminOrGm) {
    return (
      <main className="admin-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0a0d14', color: '#f0d080' }}>
        <div style={{ background: '#171b26', border: '1px solid #c0392b', padding: '32px', borderRadius: '8px', textAlign: 'center', maxWidth: '480px' }}>
          <h2 style={{ fontSize: '24px', color: '#e74c3c', marginBottom: '16px' }}>⚠️ Acesso Negado</h2>
          <p style={{ color: '#ccc', marginBottom: '24px' }}>
            Esta área é restrita a administradores. Sua conta (<strong>{auth.viewer?.displayName}</strong>) possui permissão de nível <code>{auth.viewer?.role}</code>.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Link href="/game" style={{ background: '#f0d080', color: '#000', padding: '10px 20px', borderRadius: '4px', fontWeight: 'bold', textDecoration: 'none' }}>
              Voltar ao Jogo
            </Link>
            <Link href="/" style={{ background: '#2c3e50', color: '#fff', padding: '10px 20px', borderRadius: '4px', textDecoration: 'none' }}>
              Página Inicial
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <Link className="public-brand" href="/">
          <img src="/logo.png" alt="Exura Idle Adventures" style={{ height: '28px', width: 'auto', objectFit: 'contain' }} />
        </Link>
        <div>
          <span>ADMINISTRAÇÃO</span>
          <b>{auth.viewer?.displayName}</b>
          <Link href="/game">JOGO</Link>
          <Link href="/">SITE</Link>
          <button type="button" onClick={() => void auth.signOut()}>SAIR</button>
        </div>
      </header>

      {/* ADMIN NAVIGATION TABS BAR */}
      <nav style={{ display: 'flex', background: '#11161f', borderBottom: '1px solid #3d3122', padding: '0 24px', gap: '8px' }}>
        {[
          { id: 'variables', label: '⚙️ VARIÁVEIS DO SERVIDOR' },
          { id: 'players', label: `👥 JOGADORES (${players.length})` },
          { id: 'logs', label: '📜 LOGS DO SISTEMA' },
          { id: 'health', label: '📊 MÉTRICAS & SAÚDE' },
          { id: 'updates', label: `📰 NOTÍCIAS (${updates.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as TabType)}
            style={{
              padding: '14px 20px',
              fontSize: '12px',
              fontWeight: 'bold',
              letterSpacing: '0.5px',
              color: activeTab === tab.id ? '#f3e5ab' : '#8c8273',
              background: activeTab === tab.id ? '#1b222d' : 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '3px solid #d4a843' : '3px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <section className="admin-content" style={{ padding: '24px' }}>
        {message && (
          <div
            className="admin-message"
            role="status"
            style={{
              padding: '12px 16px',
              backgroundColor: message.includes('❌') ? '#381616' : '#17331f',
              border: `1px solid ${message.includes('❌') ? '#a33' : '#3a8'}`,
              color: '#fff',
              borderRadius: '4px',
              marginBottom: '20px',
              fontSize: '13px',
            }}
          >
            {message}
          </div>
        )}

        {/* TAB 1: SERVER VARIABLES CONTROL */}
        {activeTab === 'variables' && (
          <form onSubmit={saveConfig}>
            <div className="admin-title-row" style={{ marginBottom: '20px' }}>
              <div>
                <span className="eyebrow">CONTROLE GERAL</span>
                <h1>Variáveis & Rates do Servidor</h1>
                <p>Ajuste os multiplicadores e parâmetros de funcionamento do motor de jogo em tempo real.</p>
              </div>
              <button className="primary-button" type="submit" disabled={busy}>
                {busy ? 'SALVANDO…' : '💾 SALVAR VARIÁVEIS'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
              {/* RATES CARD */}
              <div style={{ backgroundColor: '#1b222d', border: '1px solid #3d3122', borderRadius: '6px', padding: '20px' }}>
                <h3 style={{ color: '#d4a843', fontSize: '15px', marginTop: 0, marginBottom: '16px', borderBottom: '1px solid #2b3442', paddingBottom: '8px' }}>
                  ⚡ Multiplicadores de Jogo (Rates)
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: '#c7b299', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Rate de Experiência (EXP Multiplier)</span>
                      <span style={{ color: '#f3e5ab' }}>{serverConfig.expRate}x</span>
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="20"
                      step="0.5"
                      value={serverConfig.expRate}
                      onChange={(e) => setServerConfig({ ...serverConfig, expRate: parseFloat(e.target.value) })}
                      style={{ width: '100%', marginTop: '6px' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', color: '#c7b299', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Rate de Loot / Drops (Gold & Items)</span>
                      <span style={{ color: '#f3e5ab' }}>{serverConfig.lootRate}x</span>
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="10"
                      step="0.5"
                      value={serverConfig.lootRate}
                      onChange={(e) => setServerConfig({ ...serverConfig, lootRate: parseFloat(e.target.value) })}
                      style={{ width: '100%', marginTop: '6px' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', color: '#c7b299', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Rate de Habilidades (Skills & Magic Level)</span>
                      <span style={{ color: '#f3e5ab' }}>{serverConfig.skillRate}x</span>
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="10"
                      step="0.5"
                      value={serverConfig.skillRate}
                      onChange={(e) => setServerConfig({ ...serverConfig, skillRate: parseFloat(e.target.value) })}
                      style={{ width: '100%', marginTop: '6px' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', color: '#c7b299', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Rate de Regeneração (HP & Mana)</span>
                      <span style={{ color: '#f3e5ab' }}>{serverConfig.regenRate}x</span>
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="10"
                      step="0.5"
                      value={serverConfig.regenRate}
                      onChange={(e) => setServerConfig({ ...serverConfig, regenRate: parseFloat(e.target.value) })}
                      style={{ width: '100%', marginTop: '6px' }}
                    />
                  </div>
                </div>
              </div>

              {/* ROOM & NETWORKING CONFIG CARD */}
              <div style={{ backgroundColor: '#1b222d', border: '1px solid #3d3122', borderRadius: '6px', padding: '20px' }}>
                <h3 style={{ color: '#d4a843', fontSize: '15px', marginTop: 0, marginBottom: '16px', borderBottom: '1px solid #2b3442', paddingBottom: '8px' }}>
                  🖥️ Servidor, Redes & Persistência
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: '#8c8273', display: 'block', marginBottom: '4px' }}>Capacidade da Sala (`maxClients`)</label>
                    <input
                      type="number"
                      min="10"
                      max="500"
                      value={serverConfig.maxClientsPerRoom}
                      onChange={(e) => setServerConfig({ ...serverConfig, maxClientsPerRoom: parseInt(e.target.value) || 100 })}
                      style={{ width: '100%', padding: '8px', background: '#11161d', border: '1px solid #3d3122', color: '#fff', borderRadius: '4px' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', color: '#8c8273', display: 'block', marginBottom: '4px' }}>Auto-Save Interval (ms)</label>
                    <input
                      type="number"
                      min="2000"
                      max="120000"
                      step="1000"
                      value={serverConfig.periodicSaveIntervalMs}
                      onChange={(e) => setServerConfig({ ...serverConfig, periodicSaveIntervalMs: parseInt(e.target.value) || 20000 })}
                      style={{ width: '100%', padding: '8px', background: '#11161d', border: '1px solid #3d3122', color: '#fff', borderRadius: '4px' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', color: '#8c8273', display: 'block', marginBottom: '4px' }}>Tempo Reconexão F5 (segundos)</label>
                    <input
                      type="number"
                      min="5"
                      max="300"
                      value={serverConfig.allowReconnectionSec}
                      onChange={(e) => setServerConfig({ ...serverConfig, allowReconnectionSec: parseInt(e.target.value) || 20 })}
                      style={{ width: '100%', padding: '8px', background: '#11161d', border: '1px solid #3d3122', color: '#fff', borderRadius: '4px' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', color: '#8c8273', display: 'block', marginBottom: '4px' }}>Raio do Chat Local (tiles)</label>
                    <input
                      type="number"
                      min="2"
                      max="20"
                      value={serverConfig.localChatRadius}
                      onChange={(e) => setServerConfig({ ...serverConfig, localChatRadius: parseInt(e.target.value) || 8 })}
                      style={{ width: '100%', padding: '8px', background: '#11161d', border: '1px solid #3d3122', color: '#fff', borderRadius: '4px' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </form>
        )}

        {/* TAB 2: PLAYERS TABLE & GM TOOLS */}
        {activeTab === 'players' && (
          <div>
            <div className="admin-title-row" style={{ marginBottom: '20px' }}>
              <div>
                <span className="eyebrow">GERENCIAMENTO DE JOGADORES</span>
                <h1>Tabela de Players & Comandos de GM</h1>
                <p>Consulte todos os personagens cadastrados e execute ações administrativas em tempo real.</p>
              </div>
              <button className="primary-button" type="button" onClick={() => void fetchPlayers()}>
                🔄 RECARREGAR JOGADORES
              </button>
            </div>

            {/* SEARCH AND FILTER BAR */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', background: '#1b222d', padding: '12px', border: '1px solid #2b3442', borderRadius: '4px' }}>
              <input
                type="text"
                placeholder="Buscar por nome, email ou ID..."
                value={playerSearch}
                onChange={(e) => setPlayerSearch(e.target.value)}
                style={{ flex: 1, padding: '8px 12px', background: '#11161d', border: '1px solid #3d3122', color: '#fff', borderRadius: '4px', fontSize: '12px' }}
              />

              <select
                value={selectedVocationFilter}
                onChange={(e) => setSelectedVocationFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                style={{ padding: '8px 12px', background: '#11161d', border: '1px solid #3d3122', color: '#fff', borderRadius: '4px', fontSize: '12px' }}
              >
                <option value="all">Todas as Vocações</option>
                <option value={1}>Sorcerer</option>
                <option value={2}>Druid</option>
                <option value={3}>Paladin</option>
                <option value={4}>Knight</option>
              </select>
            </div>

            {/* PLAYERS TABLE */}
            <div style={{ overflowX: 'auto', background: '#1b222d', border: '1px solid #2b3442', borderRadius: '6px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#11161d', borderBottom: '1px solid #2b3442', color: '#d4a843' }}>
                    <th style={{ padding: '12px' }}>Personagem</th>
                    <th style={{ padding: '12px' }}>Vocação</th>
                    <th style={{ padding: '12px' }}>Level</th>
                    <th style={{ padding: '12px' }}>HP / MP</th>
                    <th style={{ padding: '12px' }}>Posição (X, Y, Z)</th>
                    <th style={{ padding: '12px' }}>Conta / Status</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Ações de GM</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPlayers.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#888' }}>
                        Nenhum jogador encontrado com os filtros atuais.
                      </td>
                    </tr>
                  )}
                  {filteredPlayers.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #232c3a' }}>
                      <td style={{ padding: '12px', fontWeight: 'bold', color: '#fff' }}>
                        {p.name}
                        <div style={{ fontSize: '10px', color: '#666' }}>{p.id}</div>
                      </td>
                      <td style={{ padding: '12px', color: '#c7b299' }}>{p.vocationName}</td>
                      <td style={{ padding: '12px', color: '#f3e5ab', fontWeight: 'bold' }}>Lv. {p.level}</td>
                      <td style={{ padding: '12px', color: '#aaa' }}>
                        <span style={{ color: '#4fc977' }}>{p.health}/{p.maxHealth} HP</span> • <span style={{ color: '#4f8bc9' }}>{p.mana}/{p.maxMana} MP</span>
                      </td>
                      <td style={{ padding: '12px', color: '#888' }}>
                        {p.posX}, {p.posY}, {p.posZ}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ color: '#ddd' }}>{p.accountEmail}</div>
                        {p.isBanned ? (
                          <span style={{ fontSize: '10px', padding: '2px 6px', background: '#661b1b', color: '#ff9999', borderRadius: '3px' }}>BANIDO</span>
                        ) : (
                          <span style={{ fontSize: '10px', padding: '2px 6px', background: '#1b4d24', color: '#88ff99', borderRadius: '3px' }}>ATIVO</span>
                        )}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleGmPlayerAction('teleport', p, { x: 32369, y: 32241, z: 7 })}
                            style={{ padding: '4px 8px', fontSize: '11px', background: '#2c3e50', border: '1px solid #455a64', color: '#fff', borderRadius: '3px', cursor: 'pointer' }}
                          >
                            📍 Templo
                          </button>
                          <button
                            type="button"
                            onClick={() => handleGmPlayerAction('give_exp', p, { value: 10000 })}
                            style={{ padding: '4px 8px', fontSize: '11px', background: '#6e481f', border: '1px solid #8c5d2b', color: '#f3e5ab', borderRadius: '3px', cursor: 'pointer' }}
                          >
                            🎁 +10k EXP
                          </button>
                          <button
                            type="button"
                            onClick={() => handleGmPlayerAction(p.isBanned ? 'unban' : 'ban', p)}
                            style={{
                              padding: '4px 8px',
                              fontSize: '11px',
                              background: p.isBanned ? '#1b4d24' : '#6b1d1d',
                              border: `1px solid ${p.isBanned ? '#2e7d32' : '#992222'}`,
                              color: '#fff',
                              borderRadius: '3px',
                              cursor: 'pointer',
                            }}
                          >
                            {p.isBanned ? '🔓 Desbanir' : '🔨 Banir'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: SYSTEM LOGS & AUDIT TRAIL */}
        {activeTab === 'logs' && (
          <div>
            <div className="admin-title-row" style={{ marginBottom: '20px' }}>
              <div>
                <span className="eyebrow">AUDITORIA DO SISTEMA</span>
                <h1>Logs do Servidor em Tempo Real</h1>
                <p>Inspecione erros, avisos e histórico completo de ações de GM no servidor.</p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="primary-button" type="button" onClick={() => void fetchLogs()}>
                  🔄 ATUALIZAR LOGS
                </button>
              </div>
            </div>

            {/* LOG FILTERS */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', background: '#1b222d', padding: '12px', border: '1px solid #2b3442', borderRadius: '4px' }}>
              <input
                type="text"
                placeholder="Filtrar por palavra-chave no log..."
                value={logQuery}
                onChange={(e) => setLogQuery(e.target.value)}
                style={{ flex: 1, padding: '8px 12px', background: '#11161d', border: '1px solid #3d3122', color: '#fff', borderRadius: '4px', fontSize: '12px' }}
              />

              <select
                value={logLevelFilter}
                onChange={(e) => setLogLevelFilter(e.target.value as any)}
                style={{ padding: '8px 12px', background: '#11161d', border: '1px solid #3d3122', color: '#fff', borderRadius: '4px', fontSize: '12px' }}
              >
                <option value="ALL">Todos os Níveis</option>
                <option value="INFO">INFO</option>
                <option value="WARN">WARN</option>
                <option value="ERROR">ERROR</option>
                <option value="GM_ACTION">GM_ACTION</option>
              </select>
            </div>

            {/* TERMINAL LOG CONSOLE */}
            <div
              style={{
                backgroundColor: '#0c1017',
                border: '1px solid #232c3a',
                borderRadius: '6px',
                padding: '16px',
                fontFamily: 'monospace',
                fontSize: '12px',
                maxHeight: '500px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              {logs.length === 0 && <div style={{ color: '#666', textAlign: 'center' }}>Nenhum registro de log encontrado.</div>}
              {logs.map((l) => (
                <div key={l.id} style={{ display: 'flex', gap: '12px', borderBottom: '1px solid #161e2b', paddingBottom: '6px' }}>
                  <span style={{ color: '#666', fontSize: '11px', minWidth: '140px' }}>{new Date(l.timestamp).toLocaleTimeString()}</span>
                  <span
                    style={{
                      fontWeight: 'bold',
                      minWidth: '80px',
                      color:
                        l.level === 'ERROR' ? '#ff6666' :
                        l.level === 'WARN' ? '#ffcc00' :
                        l.level === 'GM_ACTION' ? '#f3e5ab' : '#66ccff',
                    }}
                  >
                    [{l.level}]
                  </span>
                  <span style={{ color: '#888', minWidth: '90px' }}>[{l.category}]</span>
                  <span style={{ color: '#eee', flex: 1 }}>{l.message}</span>
                  {l.details && <span style={{ color: '#777', fontSize: '11px' }}>{JSON.stringify(l.details)}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: METRICS & HEALTH */}
        {activeTab === 'health' && (
          <div>
            <div className="admin-title-row" style={{ marginBottom: '20px' }}>
              <div>
                <span className="eyebrow">MONITORAMENTO DE RECURSOS</span>
                <h1>Saúde & Métricas do Servidor</h1>
                <p>Status do servidor autoritativo Colyseus e monitor de rede.</p>
              </div>
              <a
                href="http://localhost:2567/colyseus"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '8px 16px',
                  background: 'linear-gradient(180deg, #ba8e54 0%, #7d5c2e 100%)',
                  border: '1px solid #d4a843',
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  borderRadius: '4px',
                  textDecoration: 'none',
                }}
              >
                Abrir @colyseus/monitor ↗
              </a>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              <div style={{ background: '#1b222d', border: '1px solid #3d3122', padding: '16px', borderRadius: '6px' }}>
                <span style={{ fontSize: '11px', color: '#8c8273' }}>SERVIDOR COLYSEUS</span>
                <h3 style={{ color: '#4fc977', margin: '6px 0 0 0' }}>ONLINE (Porta 2567)</h3>
                <p style={{ fontSize: '12px', color: '#aaa', margin: '4px 0 0 0' }}>WebSocket autoritativo ativo.</p>
              </div>

              <div style={{ background: '#1b222d', border: '1px solid #3d3122', padding: '16px', borderRadius: '6px' }}>
                <span style={{ fontSize: '11px', color: '#8c8273' }}>SALAS ATIVAS</span>
                <h3 style={{ color: '#f3e5ab', margin: '6px 0 0 0' }}>ThaisCityRoom</h3>
                <p style={{ fontSize: '12px', color: '#aaa', margin: '4px 0 0 0' }}>Tick autoritativo: 100ms (10 Ticks/s)</p>
              </div>

              <div style={{ background: '#1b222d', border: '1px solid #3d3122', padding: '16px', borderRadius: '6px' }}>
                <span style={{ fontSize: '11px', color: '#8c8273' }}>AUTO-SAVE POSTGRESQL</span>
                <h3 style={{ color: '#4f8bc9', margin: '6px 0 0 0' }}>{serverConfig.periodicSaveIntervalMs / 1000}s</h3>
                <p style={{ fontSize: '12px', color: '#aaa', margin: '4px 0 0 0' }}>Persistência em lote Prisma habilitada.</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: PUBLIC UPDATES */}
        {activeTab === 'updates' && (
          <div>
            <div className="admin-title-row" style={{ marginBottom: '20px' }}>
              <div>
                <span className="eyebrow">CONTEÚDO PÚBLICO</span>
                <h1>Atualizações da Homepage</h1>
                <p>Crie rascunhos e publique notas no diário de novidades.</p>
              </div>
              <button className="primary-button" type="button" onClick={() => setDraft(emptyDraft)}>
                + NOVA ATUALIZAÇÃO
              </button>
            </div>

            <div className="admin-list" style={{ marginTop: '24px' }}>
              {updates.length === 0 && <div className="admin-empty">Nenhuma atualização cadastrada.</div>}
              {updates.map((update) => (
                <article key={update.id}>
                  <span className={update.published ? 'publish-state published' : 'publish-state'}>{update.published ? 'PUBLICADO' : 'RASCUNHO'}</span>
                  <div>
                    <h2>{update.title}</h2>
                    <p>{update.summary}</p>
                    <small>Slug: {update.slug}</small>
                  </div>
                  <div className="admin-actions">
                    <button type="button" onClick={() => setDraft(rowToDraft(update))}>EDITAR</button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* DRAFT MODAL FOR UPDATES */}
      {draft && (
        <div className="auth-backdrop" role="presentation">
          <section className="admin-editor" role="dialog" aria-modal="true" aria-labelledby="editor-title">
            <button className="modal-close" type="button" onClick={() => setDraft(null)} aria-label="Fechar">×</button>
            <span className="eyebrow">{draft.id ? 'EDITAR' : 'NOVA'} ATUALIZAÇÃO</span>
            <h2 id="editor-title">{draft.id ? draft.title : 'Registrar no diário'}</h2>
            <form className="admin-form" onSubmit={saveUpdate}>
              <label>Título<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} minLength={3} maxLength={120} required /></label>
              <label>Resumo<textarea value={draft.summary} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} minLength={3} maxLength={320} rows={3} required /></label>
              <label>Conteúdo<textarea value={draft.content} onChange={(event) => setDraft({ ...draft, content: event.target.value })} minLength={3} maxLength={20000} rows={10} required /></label>
              <label className="publish-check"><input type="checkbox" checked={draft.published} onChange={(event) => setDraft({ ...draft, published: event.target.checked })} /> Publicado</label>
              <div className="editor-actions">
                <button type="button" onClick={() => setDraft(null)}>CANCELAR</button>
                <button className="primary-button" type="submit" disabled={busy}>{busy ? 'SALVANDO…' : 'SALVAR'}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
