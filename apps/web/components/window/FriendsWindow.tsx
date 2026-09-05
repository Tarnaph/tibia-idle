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
  onAddFriend: (name: string) => void;
  onRemoveFriend: (name: string) => void;
  onPrivateMessage: (name: string) => void;
  onInviteParty: (name: string) => void;
}

export function FriendsWindow({
  friends,
  allKnownCharacters = [],
  onAddFriend,
  onRemoveFriend,
  onPrivateMessage,
  onInviteParty,
}: FriendsWindowProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFriend, setSelectedFriend] = useState<FriendItem | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;
    onAddFriend(query);
    setSearchQuery('');
  };

  const handleFriendClick = (friend: FriendItem, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedFriend(friend);
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenuPos(null);
        setSelectedFriend(null);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const onlineFriends = friends.filter((f) => f.isOnline !== false);
  const offlineFriends = friends.filter((f) => f.isOnline === false);

  return (
    <DraggableWindow id="friends" icon="⭐" defaultWidth={380}>
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
        {/* Subtitle from Image 1 */}
        <div style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '10px' }}>
          Veja quem está online e mantenha sua party por perto.
        </div>

        {/* Search Bar + Adicionar Button */}
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#0d1117',
              border: '1px solid #232936',
              borderRadius: '3px',
              padding: '0 8px',
            }}
          >
            <span style={{ color: '#64748b', marginRight: '6px', fontSize: '12px' }}>🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
            style={{
              padding: '6px 14px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: '#1b2230',
              border: '1px solid #3b4861',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 2px 4px rgba(0,0,0,0.4)',
              color: '#d1d5db',
              borderRadius: '3px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#263044')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1b2230')}
          >
            Adicionar
          </button>
        </form>

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
            gap: '1px',
            minHeight: '130px',
            maxHeight: '220px',
            overflowY: 'auto',
            marginBottom: '14px',
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
              onContextMenu={(e) => handleFriendClick(friend, e)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 8px',
                borderRadius: '2px',
                backgroundColor: selectedFriend?.name === friend.name ? '#1e293b' : 'transparent',
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
              <span style={{ color: '#94a3b8', fontSize: '11px' }}>
                Lv. {friend.level ?? 188}
              </span>
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
                  onContextMenu={(e) => handleFriendClick(friend, e)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 8px',
                    borderRadius: '2px',
                    backgroundColor: selectedFriend?.name === friend.name ? '#1e293b' : 'transparent',
                    cursor: 'pointer',
                    opacity: 0.65,
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
                  <span style={{ color: '#64748b', fontSize: '11px' }}>
                    Lv. {friend.level ?? 1}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>

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

        {/* Context Menu Matching Image 1 */}
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
              minWidth: '190px',
              fontSize: '11.5px',
              animation: 'fadeIn 0.12s ease-out',
            }}
          >
            <div
              onClick={() => {
                onPrivateMessage(selectedFriend.name);
                setContextMenuPos(null);
                setSelectedFriend(null);
              }}
              style={{
                padding: '7px 12px',
                color: '#f1f5f9',
                cursor: 'pointer',
                transition: 'background-color 0.1s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1e293b')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              Mandar mensagem para {selectedFriend.name}
            </div>

            <div
              onClick={() => {
                onInviteParty(selectedFriend.name);
                setContextMenuPos(null);
                setSelectedFriend(null);
              }}
              style={{
                padding: '7px 12px',
                color: '#f1f5f9',
                cursor: 'pointer',
                transition: 'background-color 0.1s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1e293b')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              Convidar para a party
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
                transition: 'background-color 0.1s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1e293b')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              Remover dos amigos
            </div>
          </div>
        )}
      </div>
    </DraggableWindow>
  );
}
