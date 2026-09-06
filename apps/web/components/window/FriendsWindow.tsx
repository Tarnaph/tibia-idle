'use client';

import React, { useState, useRef, useEffect } from 'react';
import { DraggableWindow } from './DraggableWindow';

export interface FriendItem {
  id: string;
  name: string;
  level?: number;
  vocation?: string;
  isOnline?: boolean;
}

interface FriendsWindowProps {
  friends: FriendItem[];
  allKnownCharacters?: { name: string; level?: number; vocation?: string }[];
  onAddFriend: (name: string) => Promise<{ success: boolean; error?: string } | void> | void;
  onRemoveFriend: (name: string) => void;
  onPrivateMessage: (name: string) => void;
  onInviteParty?: (name: string) => void;
}

export function FriendsWindow({
  friends,
  allKnownCharacters = [],
  onAddFriend,
  onRemoveFriend,
  onPrivateMessage,
}: FriendsWindowProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [selectedFriend, setSelectedFriend] = useState<FriendItem | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query || isSearching) return;
    setFeedback(null);
    setIsSearching(true);

    try {
      const result = await onAddFriend(query);
      if (result && !result.success) {
        setFeedback({ type: 'error', message: result.error || `Personagem "${query}" não encontrado.` });
      } else {
        setSearchQuery('');
        setFeedback({ type: 'success', message: `Personagem "${query}" adicionado com sucesso!` });
        setTimeout(() => {
          setFeedback((prev) => (prev?.type === 'success' ? null : prev));
        }, 4000);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Erro ao consultar personagem.' });
    } finally {
      setIsSearching(false);
    }
  };

  const handleFriendClick = (friend: FriendItem, e: React.MouseEvent) => {
    e.preventDefault();
    setSelectedFriend(friend);
  };

  const handleFriendContextMenu = (friend: FriendItem, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedFriend(friend);
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenuPos(null);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const onlineFriends = friends.filter((f) => f.isOnline !== false);
  const offlineFriends = friends.filter((f) => f.isOnline === false);

  return (
    <DraggableWindow id="friends" icon="⭐" defaultWidth={390}>
      <div
        aria-label="Seus Amigos"
        style={{
          padding: '12px 14px',
          color: '#cbd5e1',
          fontSize: '11px',
          fontFamily: 'Verdana, Arial, sans-serif',
          userSelect: 'none',
        }}
      >
        {/* Subtitle */}
        <div style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '10px' }}>
          Veja quem está online e mantenha contato com seus amigos.
        </div>

        {/* Search Bar + Adicionar Button */}
        <form
          onSubmit={handleAdd}
          style={{ display: 'flex', gap: '8px', marginBottom: feedback ? '8px' : '14px' }}
        >
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#0d1117',
              border: '1px solid #232936',
              borderRadius: '3px',
              padding: '0 8px',
              opacity: isSearching ? 0.7 : 1,
            }}
          >
            <span style={{ color: '#64748b', marginRight: '6px', fontSize: '12px' }}>🔍</span>
            <input
              type="text"
              value={searchQuery}
              disabled={isSearching}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (feedback) setFeedback(null);
              }}
              placeholder="Buscar personagem..."
              style={{
                flex: 1,
                padding: '6px 0',
                fontSize: '11px',
                background: 'transparent',
                border: 'none',
                color: '#e2e8f0',
                outline: 'none',
              }}
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            style={{
              padding: '6px 14px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: isSearching ? '#151a24' : '#1b2230',
              border: '1px solid #3b4861',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 2px 4px rgba(0,0,0,0.4)',
              color: isSearching ? '#64748b' : '#d1d5db',
              borderRadius: '3px',
              cursor: isSearching ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (!isSearching) e.currentTarget.style.backgroundColor = '#263044';
            }}
            onMouseLeave={(e) => {
              if (!isSearching) e.currentTarget.style.backgroundColor = '#1b2230';
            }}
          >
            {isSearching ? 'Verificando...' : 'Adicionar'}
          </button>
        </form>

        {/* Feedback Message (Error or Success) */}
        {feedback && (
          <div
            role="alert"
            style={{
              padding: '6px 10px',
              marginBottom: '12px',
              borderRadius: '3px',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor:
                feedback.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
              border: feedback.type === 'error' ? '1px solid #b91c1c' : '1px solid #15803d',
              color: feedback.type === 'error' ? '#fca5a5' : '#86efac',
              lineHeight: '1.4',
            }}
          >
            <span style={{ fontSize: '12px' }}>{feedback.type === 'error' ? '⚠️' : '✅'}</span>
            <span style={{ flex: 1 }}>{feedback.message}</span>
            <span
              onClick={() => setFeedback(null)}
              style={{
                cursor: 'pointer',
                opacity: 0.7,
                padding: '0 4px',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              ✕
            </span>
          </div>
        )}

        {/* Section Header: ONLINE (N) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontWeight: 700,
            fontSize: '11px',
            color: '#a3e635',
            letterSpacing: '0.5px',
            marginBottom: '8px',
            borderBottom: '1px solid #1e293b',
            paddingBottom: '4px',
          }}
        >
          <span style={{ fontSize: '9px' }}>🟢</span>
          <span>ONLINE ({onlineFriends.length})</span>
        </div>

        {/* Friends List Container */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            minHeight: '120px',
            maxHeight: '200px',
            overflowY: 'auto',
            marginBottom: '10px',
          }}
        >
          {onlineFriends.length === 0 && offlineFriends.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: '#64748b', fontStyle: 'italic' }}>
              Nenhum amigo adicionado ainda. Digite um nome acima e clique em Adicionar!
            </div>
          ) : null}

          {/* Online Friends List */}
          {onlineFriends.map((friend) => (
            <div
              key={friend.id || friend.name}
              onClick={(e) => handleFriendClick(friend, e)}
              onContextMenu={(e) => handleFriendContextMenu(friend, e)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '5px 8px',
                borderRadius: '3px',
                backgroundColor: selectedFriend?.name === friend.name ? '#1e293b' : 'transparent',
                border: selectedFriend?.name === friend.name ? '1px solid #334155' : '1px solid transparent',
                cursor: 'pointer',
                transition: 'background-color 0.1s',
              }}
              onMouseEnter={(e) => {
                if (selectedFriend?.name !== friend.name) e.currentTarget.style.backgroundColor = '#151d2c';
              }}
              onMouseLeave={(e) => {
                if (selectedFriend?.name !== friend.name) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    backgroundColor: '#4ade80',
                    display: 'inline-block',
                    boxShadow: '0 0 4px #22c55e',
                  }}
                />
                <span style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '11.5px' }}>{friend.name}</span>
              </div>

              {/* Action Buttons & Level on Row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ color: '#94a3b8', fontSize: '11px', marginRight: '4px' }}>
                  Lv. {friend.level ?? 1}
                </span>

                {/* Direct Message Button */}
                <button
                  type="button"
                  title={`Mandar mensagem para ${friend.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onPrivateMessage(friend.name);
                  }}
                  style={{
                    padding: '3px 8px',
                    fontSize: '10.5px',
                    fontWeight: 600,
                    backgroundColor: '#1b2a40',
                    border: '1px solid #3b5984',
                    borderRadius: '3px',
                    color: '#93c5fd',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#253d61';
                    e.currentTarget.style.color = '#bfdbfe';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#1b2a40';
                    e.currentTarget.style.color = '#93c5fd';
                  }}
                >
                  <span>💬</span>
                  <span>Mensagem</span>
                </button>
              </div>
            </div>
          ))}

          {/* Offline Friends List */}
          {offlineFriends.length > 0 && (
            <>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 700,
                  fontSize: '11px',
                  color: '#64748b',
                  letterSpacing: '0.5px',
                  marginTop: '10px',
                  marginBottom: '6px',
                  borderBottom: '1px solid #1e293b',
                  paddingBottom: '4px',
                }}
              >
                <span style={{ fontSize: '9px' }}>⚪</span>
                <span>OFFLINE ({offlineFriends.length})</span>
              </div>
              {offlineFriends.map((friend) => (
                <div
                  key={friend.id || friend.name}
                  onClick={(e) => handleFriendClick(friend, e)}
                  onContextMenu={(e) => handleFriendContextMenu(friend, e)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '5px 8px',
                    borderRadius: '3px',
                    backgroundColor: selectedFriend?.name === friend.name ? '#1e293b' : 'transparent',
                    border: selectedFriend?.name === friend.name ? '1px solid #334155' : '1px solid transparent',
                    cursor: 'pointer',
                    opacity: 0.8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        backgroundColor: '#64748b',
                        display: 'inline-block',
                      }}
                    />
                    <span style={{ color: '#cbd5e1', fontSize: '11.5px' }}>{friend.name}</span>
                  </div>

                  {/* Actions for offline friend */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ color: '#64748b', fontSize: '11px', marginRight: '4px' }}>
                      Lv. {friend.level ?? 1}
                    </span>

                    <button
                      type="button"
                      title={`Deixar mensagem para ${friend.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onPrivateMessage(friend.name);
                      }}
                      style={{
                        padding: '3px 8px',
                        fontSize: '10.5px',
                        fontWeight: 600,
                        backgroundColor: '#1b2a40',
                        border: '1px solid #3b5984',
                        borderRadius: '3px',
                        color: '#93c5fd',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                    >
                      <span>💬</span>
                      <span>Mensagem</span>
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Selected Friend Action Card */}
        {selectedFriend && (
          <div
            style={{
              backgroundColor: '#111726',
              border: '1px solid #2d3b55',
              borderRadius: '4px',
              padding: '8px 10px',
              marginBottom: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '11px' }}>
                Selecionado: <strong style={{ color: '#60a5fa' }}>{selectedFriend.name}</strong>
              </span>
              <span style={{ color: '#94a3b8', fontSize: '10.5px' }}>
                Lv. {selectedFriend.level ?? 1}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => onPrivateMessage(selectedFriend.name)}
                style={{
                  flex: 1,
                  padding: '5px 8px',
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: '#2563eb',
                  border: '1px solid #60a5fa',
                  borderRadius: '3px',
                  color: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1d4ed8')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
              >
                <span>💬</span>
                <span>Mandar Mensagem</span>
              </button>

              <button
                type="button"
                title={`Remover ${selectedFriend.name} dos amigos`}
                onClick={() => {
                  onRemoveFriend(selectedFriend.name);
                  setSelectedFriend(null);
                }}
                style={{
                  padding: '5px 8px',
                  fontSize: '11px',
                  backgroundColor: '#331515',
                  border: '1px solid #7f1d1d',
                  borderRadius: '3px',
                  color: '#f87171',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#451a1a')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#331515')}
              >
                ❌
              </button>
            </div>
          </div>
        )}

        {/* Footer: Amigos: X | Online: Y + Fechar Button */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid #1e293b',
            paddingTop: '10px',
            color: '#64748b',
            fontSize: '11px',
          }}
        >
          <div>
            Amigos: <strong style={{ color: '#94a3b8' }}>{friends.length}</strong> | Online:{' '}
            <strong style={{ color: '#4ade80' }}>{onlineFriends.length}</strong>
          </div>
          <button
            type="button"
            onClick={() => {
              const el = document.querySelector('[data-window-id="friends"]');
              if (el) (el as HTMLElement).style.display = 'none';
            }}
            style={{
              padding: '5px 16px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: '#1b2230',
              border: '1px solid #3b4861',
              color: '#d1d5db',
              borderRadius: '3px',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#263044')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1b2230')}
          >
            Fechar
          </button>
        </div>

        {/* Context Menu Matching Right-Click */}
        {contextMenuPos && selectedFriend && (
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: `${contextMenuPos.y}px`,
              left: `${contextMenuPos.x}px`,
              backgroundColor: '#111726',
              border: '1px solid #334155',
              boxShadow: '0 8px 24px rgba(0,0,0,0.8), 0 0 1px rgba(255,255,255,0.2)',
              borderRadius: '4px',
              padding: '4px 0',
              zIndex: 999999,
              minWidth: '200px',
              fontSize: '11.5px',
              animation: 'fadeIn 0.12s ease-out',
            }}
          >
            <div
              onClick={() => {
                onPrivateMessage(selectedFriend.name);
                setContextMenuPos(null);
              }}
              style={{
                padding: '7px 12px',
                color: '#60a5fa',
                cursor: 'pointer',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'background-color 0.1s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1e293b')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <span>💬</span>
              <span>Mandar mensagem para {selectedFriend.name}</span>
            </div>

            <div
              onClick={() => {
                onRemoveFriend(selectedFriend.name);
                setContextMenuPos(null);
                setSelectedFriend(null);
              }}
              style={{
                padding: '7px 12px',
                color: '#f87171',
                borderTop: '1px solid #1e293b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'background-color 0.1s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1e293b')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <span>❌</span>
              <span>Remover dos amigos</span>
            </div>
          </div>
        )}
      </div>
    </DraggableWindow>
  );
}
