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

// Strictly the 8 requested categories
const CATEGORIES = [
  { id: 'level', label: 'Level', desc: 'Top jogadores por nível (desempate por experiência total).' },
  { id: 'magic', label: 'Magic Level', desc: 'Avanço de Magic Level e maestria arcana.' },
  { id: 'fist', label: 'Fist Fighting', desc: 'Habilidade de combate desarmado (Fist Fighting).' },
  { id: 'sword', label: 'Sword Fighting', desc: 'Habilidade com espadas e lâminas cortantes (Sword Fighting).' },
  { id: 'axe', label: 'Axe Fighting', desc: 'Habilidade com machados de corte pesado (Axe Fighting).' },
  { id: 'club', label: 'Club Fighting', desc: 'Habilidade com maças e martelos esmagadores (Club Fighting).' },
  { id: 'distance', label: 'Distance', desc: 'Precisão e maestria com projéteis e arcos (Distance Fighting).' },
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
      {/* Janela Principal: Estilo Arena PvP */}
      <div
        className="highscores-modal-window"
        style={{
          width: '840px',
          maxWidth: '96vw',
          height: '560px',
          maxHeight: '94vh',
          backgroundColor: '#1e2022',
          border: '2px solid #4a4d52',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          color: '#d1d5db',
          display: 'flex',
          flexDirection: 'column',
          userSelect: 'none',
          borderRadius: '4px',
          overflow: 'hidden',
          animation: 'fadeIn 0.15s ease-out',
        }}
      >
        {/* Cabeçalho Oficial (Idêntico ao Arena PvP) */}
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
            Highscores & Ranking Geral
          </h2>

          <div
            style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '11px',
              color: '#9ca3af',
            }}
          >
            {totalPlayers} jogadores catalogados
          </div>

          <button
            onClick={onClose}
            className="highscores-close-btn"
            style={{
              position: 'absolute',
              right: '10px',
              top: '10px',
              width: '38px',
              height: '38px',
              minWidth: '38px',
              minHeight: '38px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '6px',
              color: '#f87171',
              fontSize: '18px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
              touchAction: 'manipulation',
            }}
            title="Fechar Janela"
            aria-label="Fechar Highscores"
          >
            ✕
          </button>
        </div>

        {/* Modal Body: Duas Colunas (Responsivo 1 Coluna no Mobile) */}
        <div
          className="highscores-modal-body"
          style={{
            display: 'flex',
            flex: 1,
            minHeight: 0,
          }}
        >
          {/* COLUNA ESQUERDA: Abas de Categorias */}
          <div
            className="highscores-categories-col"
            style={{
              width: '200px',
              borderRight: '1px solid #33363a',
              backgroundColor: '#1b1c1e',
              padding: '14px 10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              overflowY: 'auto',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.5px' }}>
              Categorias
            </div>
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  className="highscores-category-btn"
                  onClick={() => handleCategoryChange(cat.id)}
                  style={{
                    backgroundColor: isActive ? '#2d3035' : '#151618',
                    border: `1px solid ${isActive ? '#4f535a' : '#282a2e'}`,
                    borderRadius: '4px',
                    color: isActive ? '#f3c769' : '#9ca3af',
                    fontSize: '12px',
                    fontWeight: isActive ? '700' : 'normal',
                    padding: '8px 12px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.12s ease',
                    boxShadow: isActive ? 'inset 0 1px 0 rgba(255,255,255,0.06)' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.color = '#f1f5f9';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.color = '#9ca3af';
                  }}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* COLUNA DIREITA: Tabela e Controles */}
          <div
            className="highscores-content-col"
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              padding: '14px 18px',
              minWidth: 0,
              backgroundColor: '#1e2022',
            }}
          >
            {/* Topo da Coluna Direita: Filtro de Vocação e Descrição */}
            <div
              className="highscores-toolbar-row"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '10px',
                gap: '12px',
              }}
            >
              <div style={{ fontSize: '11.5px', color: '#9ca3af' }}>
                {currentCatObj.desc}
              </div>

              <select
                value={selectedVocation}
                onChange={(e) => handleVocationChange(e.target.value)}
                style={{
                  backgroundColor: '#151618',
                  border: '1px solid #3b3e44',
                  borderRadius: '4px',
                  color: '#f3c769',
                  fontSize: '11.5px',
                  padding: '5px 10px',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="all">Todas as vocações</option>
                <option value="knight">Knight</option>
                <option value="paladin">Paladin</option>
                <option value="sorcerer">Sorcerer</option>
                <option value="druid">Druid</option>
              </select>
            </div>

            {/* Cabeçalho da Tabela */}
            <div
              className="highscores-table-header"
              style={{
                display: 'grid',
                gridTemplateColumns: '48px 1fr 105px 70px 120px',
                gap: '8px',
                padding: '8px 10px',
                fontSize: '11px',
                fontWeight: 'bold',
                color: '#f3c769',
                letterSpacing: '0.6px',
                backgroundColor: '#151618',
                border: '1px solid #33363a',
                borderRadius: '4px 4px 0 0',
                fontFamily: 'Georgia, serif',
              }}
            >
              <span>#</span>
              <span>NOME</span>
              <span className="highscores-col-voc" style={{ textAlign: 'center' }}>VOCACAO</span>
              <span className="highscores-col-lvl" style={{ textAlign: 'right' }}>LEVEL</span>
              <span className="highscores-col-val" style={{ textAlign: 'right' }}>
                {activeCategory === 'level' ? 'XP TOTAL' : 'HABILIDADE'}
              </span>
            </div>

            {/* Linhas da Tabela */}
            <div
              className="highscores-table-body"
              style={{
                flex: 1,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
                border: '1px solid #33363a',
                borderTop: 'none',
                backgroundColor: '#17181a',
              }}
            >
              {loading ? (
                <div style={{ padding: '36px', textAlign: 'center', color: '#9ca3af', fontSize: '12px' }}>
                  Carregando ranking...
                </div>
              ) : entries.length === 0 ? (
                <div style={{ padding: '36px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
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
                      className="highscores-table-row"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '48px 1fr 105px 70px 120px',
                        gap: '8px',
                        padding: '7px 10px',
                        alignItems: 'center',
                        backgroundColor: entry.isCurrentPlayer
                          ? 'rgba(217, 119, 6, 0.16)'
                          : 'transparent',
                        borderLeft: entry.isCurrentPlayer ? '3px solid #f59e0b' : '3px solid transparent',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
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
                        {isTop1 ? (
                          <span style={{ fontSize: '14px' }}>🥇</span>
                        ) : isTop2 ? (
                          <span style={{ fontSize: '14px' }}>🥈</span>
                        ) : isTop3 ? (
                          <span style={{ fontSize: '14px' }}>🥉</span>
                        ) : (
                          <span style={{ color: '#9ca3af', fontWeight: 'bold' }}>#{entry.rank}</span>
                        )}
                      </div>

                      {/* Nome do Personagem */}
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span
                            style={{
                              fontWeight: entry.isCurrentPlayer ? 'bold' : '600',
                              color: entry.isCurrentPlayer ? '#fef08a' : '#f1f5f9',
                            }}
                          >
                            {entry.characterName}
                          </span>
                          {entry.isCurrentPlayer && (
                            <span
                              style={{
                                fontSize: '9px',
                                backgroundColor: 'rgba(245, 158, 11, 0.25)',
                                color: '#fbbf24',
                                padding: '1px 4px',
                                borderRadius: '3px',
                                border: '1px solid rgba(245, 158, 11, 0.4)',
                              }}
                            >
                              VOCE
                            </span>
                          )}
                        </div>
                        {/* Subtítulo visível no mobile com Level e Vocação */}
                        <div className="highscores-mobile-subinfo" style={{ fontSize: '10px', color: '#9ca3af', marginTop: '1px' }}>
                          Lv. {entry.level} · {entry.vocation}
                        </div>
                      </div>

                      {/* Vocação (Coluna oculta no mobile para caber limpo) */}
                      <div className="highscores-col-voc" style={{ textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 6px',
                            borderRadius: '3px',
                            fontSize: '10px',
                            fontWeight: '600',
                            backgroundColor: vocStyle.bg,
                            color: vocStyle.text,
                            border: `1px solid ${vocStyle.border}`,
                          }}
                        >
                          {entry.vocation}
                        </span>
                      </div>

                      {/* Level (Coluna oculta no mobile para caber limpo) */}
                      <div className="highscores-col-lvl" style={{ textAlign: 'right', fontWeight: '600', color: '#e2e8f0' }}>
                        {entry.level}
                      </div>

                      {/* Valor da Categoria */}
                      <div className="highscores-col-val" style={{ textAlign: 'right', fontWeight: 'bold', color: '#f3c769' }}>
                        {entry.displayValue}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Paginação e Salto */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '10px',
                marginTop: 'auto',
              }}
            >
              {/* Botão Minha Posição */}
              <button
                type="button"
                onClick={handleJumpToMyPosition}
                disabled={!myRank}
                style={{
                  backgroundColor: myRank ? 'rgba(217, 119, 6, 0.2)' : '#151618',
                  border: `1px solid ${myRank ? '#b45309' : '#2d3035'}`,
                  borderRadius: '3px',
                  color: myRank ? '#fef08a' : '#64748b',
                  fontSize: '11px',
                  fontWeight: '600',
                  padding: '6px 12px',
                  cursor: myRank ? 'pointer' : 'default',
                  transition: 'all 0.12s ease',
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
                    width: '26px',
                    height: '26px',
                    backgroundColor: page > 1 ? '#25272a' : '#151618',
                    border: `1px solid ${page > 1 ? '#3c4046' : '#2d3035'}`,
                    borderRadius: '3px',
                    color: page > 1 ? '#f1f5f9' : '#475569',
                    fontSize: '13px',
                    cursor: page > 1 ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                  }}
                >
                  ‹
                </button>

                <span style={{ fontSize: '11.5px', color: '#9ca3af' }}>
                  {page} / {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  style={{
                    width: '26px',
                    height: '26px',
                    backgroundColor: page < totalPages ? '#25272a' : '#151618',
                    border: `1px solid ${page < totalPages ? '#3c4046' : '#2d3035'}`,
                    borderRadius: '3px',
                    color: page < totalPages ? '#f1f5f9' : '#475569',
                    fontSize: '13px',
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
      </div>
    </div>
  );
}
