'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface HighscoreEntry {
  rank: number;
  id: string;
  name: string;
  characterName: string;
  accountName: string;
  vocation: string;
  level: number;
  displayValue: string;
  secondaryValue: string;
  isCurrentPlayer?: boolean;
}

interface HighscoresModalProps {
  open: boolean;
  currentCharacterId?: string;
  onClose: () => void;
}

const CATEGORIES = [
  { id: 'level', label: 'Level', desc: 'Top jogadores por level (desempate por experiência).' },
  { id: 'guild', label: 'Guild', desc: 'Classificação de guildas ativas no servidor.' },
  { id: 'speedrun', label: 'Speedrun', desc: 'Recordes de tempo em limpeza de caçadas.' },
  { id: 'hunt', label: 'Por hunt', desc: 'Estatísticas de caçadas completadas com sucesso.' },
  { id: 'achievements', label: 'Conquistas', desc: 'Pontos acumulados de conquistas e marcos.' },
  { id: 'bosses', label: 'Bosses', desc: 'Pontuação de chefes derrotados (Boss Points).' },
  { id: 'bestiary', label: 'Bestiário', desc: 'Monstros catalogados e desbloqueados no Bestiário.' },
  { id: 'deaths', label: 'Mortes', desc: 'Histórico de bravura e perdas em combate.' },
  { id: 'magic', label: 'Magic', desc: 'Avanço de Magic Level e maestria arcana.' },
  { id: 'fist', label: 'Fist', desc: 'Habilidade de combate desarmado (Fist Fighting).' },
  { id: 'melee', label: 'Melee', desc: 'Maior habilidade em combate corpo a corpo (Sword, Axe ou Club).' },
  { id: 'distance', label: 'Distance', desc: 'Precisão e dano com projéteis (Distance Fighting).' },
  { id: 'shielding', label: 'Shielding', desc: 'Defesa e bloqueio de escudo (Shielding).' },
];

export function HighscoresModal({ open, currentCharacterId, onClose }: HighscoresModalProps) {
  const [activeCategory, setActiveCategory] = useState<string>('level');
  const [selectedVocation, setSelectedVocation] = useState<string>('all');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalPlayers, setTotalPlayers] = useState<number>(0);
  const [entries, setEntries] = useState<HighscoreEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [myPage, setMyPage] = useState<number | null>(null);

  const fetchHighscores = useCallback(async (cat: string, voc: string, pg: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        category: cat,
        vocation: voc,
        page: pg.toString(),
        pageSize: '10',
      });
      if (currentCharacterId) {
        params.set('characterId', currentCharacterId);
      }

      const res = await fetch(`/api/highscores?${params.toString()}`);
      const data = (await res.json()) as any;

      if (data.success) {
        setEntries(data.entries || []);
        setTotalPages(data.totalPages || 1);
        setTotalPlayers(data.totalCount || 0);
        setMyRank(data.myRank ?? null);
        setMyPage(data.myPage ?? null);
      }
    } catch (err) {
      console.error('[HIGHSCORES] Falha ao consultar ranking:', err);
    } finally {
      setLoading(false);
    }
  }, [currentCharacterId]);

  useEffect(() => {
    if (open) {
      fetchHighscores(activeCategory, selectedVocation, page);
    }
  }, [open, activeCategory, selectedVocation, page, fetchHighscores]);

  const handleCategoryChange = (catId: string) => {
    setActiveCategory(catId);
    setPage(1);
  };

  const handleVocationChange = (voc: string) => {
    setSelectedVocation(voc);
    setPage(1);
  };

  const handleJumpToMyPosition = () => {
    if (myPage) {
      setPage(myPage);
    }
  };

  if (!open) return null;

  const currentCatObj = CATEGORIES.find((c) => c.id === activeCategory) || CATEGORIES[0];

  const getVocationBadgeStyle = (voc: string) => {
    const v = voc.toLowerCase();
    if (v.includes('druid')) {
      return { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', border: 'rgba(16, 185, 129, 0.3)' };
    }
    if (v.includes('sorcerer')) {
      return { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)' };
    }
    if (v.includes('knight')) {
      return { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' };
    }
    if (v.includes('paladin')) {
      return { bg: 'rgba(168, 85, 247, 0.15)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.3)' };
    }
    return { bg: 'rgba(148, 163, 184, 0.15)', text: '#cbd5e1', border: 'rgba(148, 163, 184, 0.3)' };
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(5px)',
        zIndex: 2500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        fontFamily: 'Verdana, Geneva, sans-serif',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Janela Principal Highscore */}
      <div
        style={{
          width: '740px',
          maxWidth: '96vw',
          height: '540px',
          maxHeight: '94vh',
          backgroundColor: '#16171d',
          border: '2px solid #282a36',
          borderRadius: '6px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.95), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeIn 0.15s ease-out',
        }}
      >
        {/* Barra Superior de Título */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 18px 10px 18px',
            backgroundColor: '#13141a',
            borderBottom: '1px solid #232532',
          }}
        >
          <span
            style={{
              fontSize: '13px',
              fontWeight: '800',
              color: '#f8fafc',
              letterSpacing: '1.2px',
              textTransform: 'uppercase',
            }}
          >
            HIGHSCORE
          </span>

          <span
            style={{
              fontSize: '11px',
              color: '#94a3b8',
            }}
          >
            {totalPlayers} jogadores
          </span>
        </div>

        {/* Corpo: Duas Colunas (Menu Lateral + Tabela) */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          {/* Coluna Esquerda: Abas de Categorias */}
          <div
            style={{
              width: '140px',
              backgroundColor: '#13141a',
              borderRight: '1px solid #232532',
              display: 'flex',
              flexDirection: 'column',
              padding: '8px 6px',
              gap: '2px',
              overflowY: 'auto',
            }}
          >
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategoryChange(cat.id)}
                  style={{
                    backgroundColor: isActive ? '#242735' : 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    color: isActive ? '#ffffff' : '#94a3b8',
                    fontSize: '11.5px',
                    fontWeight: isActive ? '700' : 'normal',
                    padding: '6px 12px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.12s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.color = '#f1f5f9';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.color = '#94a3b8';
                  }}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Coluna Direita: Tabela e Controles */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              padding: '12px 16px',
              minWidth: 0,
            }}
          >
            {/* Descrição da Categoria */}
            <div
              style={{
                fontSize: '11.5px',
                color: '#94a3b8',
                marginBottom: '8px',
              }}
            >
              {currentCatObj.desc}
            </div>

            {/* Dropdown de Vocação */}
            <div style={{ marginBottom: '12px' }}>
              <select
                value={selectedVocation}
                onChange={(e) => handleVocationChange(e.target.value)}
                style={{
                  backgroundColor: '#1c1f2b',
                  border: '1px solid #2d3246',
                  borderRadius: '4px',
                  color: '#e2e8f0',
                  fontSize: '11.5px',
                  padding: '5px 10px',
                  cursor: 'pointer',
                  outline: 'none',
                  minWidth: '180px',
                }}
              >
                <option value="all">Todas as vocacoes</option>
                <option value="knight">Knight</option>
                <option value="paladin">Paladin</option>
                <option value="sorcerer">Sorcerer</option>
                <option value="druid">Druid</option>
              </select>
            </div>

            {/* Cabeçalho da Tabela */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '44px 1fr 100px 70px 130px',
                gap: '8px',
                padding: '6px 8px',
                fontSize: '10.5px',
                fontWeight: '700',
                color: '#60a5fa',
                letterSpacing: '0.6px',
                borderBottom: '1px solid #252837',
              }}
            >
              <span>#</span>
              <span>NOME</span>
              <span style={{ textAlign: 'center' }}>VOCACAO</span>
              <span style={{ textAlign: 'right' }}>LEVEL</span>
              <span style={{ textAlign: 'right' }}>
                {activeCategory === 'level' ? 'XP' : activeCategory === 'bosses' ? 'POINTS' : 'VALOR'}
              </span>
            </div>

            {/* Linhas da Tabela */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
              }}
            >
              {loading ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '11.5px' }}>
                  Carregando ranking...
                </div>
              ) : entries.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '11.5px' }}>
                  Nenhum jogador classificado nesta categoria.
                </div>
              ) : (
                entries.map((entry) => {
                  const vocStyle = getVocationBadgeStyle(entry.vocation);
                  const isTop1 = entry.rank === 1;
                  const isTop2 = entry.rank === 2;
                  const isTop3 = entry.rank === 3;

                  return (
                    <div
                      key={entry.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '44px 1fr 100px 70px 130px',
                        gap: '8px',
                        padding: '6px 8px',
                        alignItems: 'center',
                        backgroundColor: entry.isCurrentPlayer
                          ? 'rgba(59, 130, 246, 0.12)'
                          : 'transparent',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                        fontSize: '11px',
                        transition: 'background-color 0.1s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!entry.isCurrentPlayer) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                      }}
                      onMouseLeave={(e) => {
                        if (!entry.isCurrentPlayer) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {/* Rank com Medalhas para Top 3 */}
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        {isTop1 && (
                          <div
                            style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              backgroundColor: '#ca8a04',
                              background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
                              color: '#1c1917',
                              fontWeight: '800',
                              fontSize: '10.5px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 0 8px rgba(234, 179, 8, 0.4)',
                            }}
                          >
                            1
                          </div>
                        )}
                        {isTop2 && (
                          <div
                            style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              backgroundColor: '#94a3b8',
                              background: 'linear-gradient(135deg, #cbd5e1 0%, #64748b 100%)',
                              color: '#0f172a',
                              fontWeight: '800',
                              fontSize: '10.5px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 0 6px rgba(148, 163, 184, 0.3)',
                            }}
                          >
                            2
                          </div>
                        )}
                        {isTop3 && (
                          <div
                            style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              backgroundColor: '#b45309',
                              background: 'linear-gradient(135deg, #d97706 0%, #78350f 100%)',
                              color: '#ffffff',
                              fontWeight: '800',
                              fontSize: '10.5px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 0 6px rgba(180, 83, 9, 0.3)',
                            }}
                          >
                            3
                          </div>
                        )}
                        {!isTop1 && !isTop2 && !isTop3 && (
                          <span style={{ color: '#94a3b8', paddingLeft: '4px' }}>
                            {entry.rank}
                          </span>
                        )}
                      </div>

                      {/* Nome do Personagem */}
                      <div
                        style={{
                          fontWeight: '700',
                          color: entry.isCurrentPlayer ? '#93c5fd' : '#f8fafc',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {entry.name}
                      </div>

                      {/* Badge da Vocação */}
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '10px',
                            backgroundColor: vocStyle.bg,
                            color: vocStyle.text,
                            border: `1px solid ${vocStyle.border}`,
                            fontSize: '9.5px',
                            fontWeight: '600',
                          }}
                        >
                          {entry.vocation}
                        </span>
                      </div>

                      {/* Nível */}
                      <div style={{ textAlign: 'right', fontWeight: '700', color: '#e2e8f0' }}>
                        {entry.level.toLocaleString('pt-BR')}
                      </div>

                      {/* XP ou Métrica */}
                      <div
                        style={{
                          textAlign: 'right',
                          color: '#94a3b8',
                          fontSize: '10.5px',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {entry.secondaryValue || entry.displayValue}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Rodapé Interno: Minha Posição + Paginação */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '10px',
                borderTop: '1px solid #232532',
                marginTop: 'auto',
              }}
            >
              {/* Botão Minha Posição */}
              <button
                type="button"
                onClick={handleJumpToMyPosition}
                disabled={!myRank}
                style={{
                  backgroundColor: myRank ? '#222634' : '#171922',
                  border: `1px solid ${myRank ? '#3b435a' : '#262a38'}`,
                  borderRadius: '3px',
                  color: myRank ? '#f1f5f9' : '#64748b',
                  fontSize: '11px',
                  fontWeight: '600',
                  padding: '5px 12px',
                  cursor: myRank ? 'pointer' : 'default',
                  transition: 'all 0.12s ease',
                }}
                onMouseEnter={(e) => {
                  if (myRank) e.currentTarget.style.backgroundColor = '#2d3345';
                }}
                onMouseLeave={(e) => {
                  if (myRank) e.currentTarget.style.backgroundColor = '#222634';
                }}
                title={myRank ? `Pular para seu rank #${myRank}` : 'Não classificado'}
              >
                Minha posição {myRank ? `(#${myRank})` : ''}
              </button>

              {/* Paginação */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  style={{
                    width: '24px',
                    height: '24px',
                    backgroundColor: page > 1 ? '#222634' : '#171922',
                    border: `1px solid ${page > 1 ? '#3b435a' : '#262a38'}`,
                    borderRadius: '3px',
                    color: page > 1 ? '#f1f5f9' : '#475569',
                    fontSize: '12px',
                    cursor: page > 1 ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                  }}
                >
                  ‹
                </button>

                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  {page} / {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  style={{
                    width: '24px',
                    height: '24px',
                    backgroundColor: page < totalPages ? '#222634' : '#171922',
                    border: `1px solid ${page < totalPages ? '#3b435a' : '#262a38'}`,
                    borderRadius: '3px',
                    color: page < totalPages ? '#f1f5f9' : '#475569',
                    fontSize: '12px',
                    cursor: page < totalPages ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                  }}
                >
                  ›
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé Externo com Botão Fechar */}
        <div
          style={{
            padding: '8px 16px',
            backgroundColor: '#111218',
            borderTop: '1px solid #1f212c',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              backgroundColor: '#202430',
              border: '1px solid #363d52',
              borderRadius: '4px',
              color: '#e2e8f0',
              fontSize: '11.5px',
              fontWeight: '600',
              padding: '5px 16px',
              cursor: 'pointer',
              boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.08)',
              transition: 'all 0.12s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#2a3040';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#202430';
            }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
