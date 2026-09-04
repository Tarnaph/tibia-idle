'use client';

import React, { useState } from 'react';
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
  const [searchResult, setSearchResult] = useState<{ name: string; level?: number; vocation?: string } | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setSearched(true);
    const match = allKnownCharacters.find((c) => c.name.toLowerCase() === query.toLowerCase());
    if (match) {
      setSearchResult(match);
    } else {
      // Allow searching and adding any player name explicitly
      setSearchResult({ name: query, level: 1, vocation: 'Player' });
    }
  };

  return (
    <DraggableWindow id="friends" icon="⭐" defaultWidth={340}>
      <div className="friends-window-container" style={{ padding: '8px', color: '#e0e6ed', fontSize: '12px' }}>
        {/* Search Bar */}
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSearched(false);
            }}
            placeholder="Nome do personagem..."
            style={{
              flex: 1,
              padding: '6px 8px',
              fontSize: '11px',
              borderRadius: '4px',
              background: 'rgba(10, 14, 20, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#fff',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            style={{
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: 700,
              borderRadius: '4px',
              background: '#3182ce',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            🔍 Pesquisar
          </button>
        </form>

        {/* Search Result */}
        {searched && searchResult && (
          <div
            style={{
              padding: '8px',
              marginBottom: '10px',
              borderRadius: '4px',
              background: 'rgba(49, 130, 206, 0.15)',
              border: '1px solid rgba(49, 130, 206, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <strong style={{ color: '#63b3ed' }}>{searchResult.name}</strong>
              <div style={{ fontSize: '10px', color: '#a0aec0' }}>
                {searchResult.vocation} · Lv. {searchResult.level || 1}
              </div>
            </div>
            {friends.some((f) => f.name.toLowerCase() === searchResult.name.toLowerCase()) ? (
              <span style={{ fontSize: '10px', color: '#68d391' }}>✔ Já é amigo</span>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onAddFriend(searchResult.name);
                  setSearched(false);
                  setSearchQuery('');
                }}
                style={{
                  padding: '4px 8px',
                  fontSize: '10px',
                  fontWeight: 700,
                  borderRadius: '3px',
                  background: '#48bb78',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                ➕ Adicionar
              </button>
            )}
          </div>
        )}

        {/* Friends List */}
        <div style={{ fontWeight: 700, fontSize: '11px', marginBottom: '6px', color: '#cbd5e0' }}>
          Seus Amigos ({friends.length})
        </div>

        {friends.length === 0 ? (
          <div style={{ fontSize: '11px', color: '#718096', fontStyle: 'italic', textAlign: 'center', padding: '16px 0' }}>
            Nenhum amigo adicionado ainda. Pesquise um nome acima ou clique com botão direito em um jogador para adicionar!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '220px', overflowY: 'auto' }}>
            {friends.map((friend) => (
              <div
                key={friend.id || friend.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 8px',
                  borderRadius: '4px',
                  background: 'rgba(20, 26, 36, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        background: friend.isOnline !== false ? '#48bb78' : '#718096',
                        display: 'inline-block',
                      }}
                      title={friend.isOnline !== false ? 'Online' : 'Offline'}
                    />
                    <strong style={{ color: '#fff', fontSize: '11.5px' }}>{friend.name}</strong>
                  </div>
                  {friend.level && (
                    <span style={{ fontSize: '9.5px', color: '#a0aec0', marginLeft: '13px' }}>
                      {friend.vocation || 'Player'} · Lv. {friend.level}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={() => onPrivateMessage(friend.name)}
                    title="Mandar Mensagem Privada"
                    style={{
                      padding: '3px 6px',
                      fontSize: '10px',
                      borderRadius: '3px',
                      background: 'rgba(255, 215, 0, 0.15)',
                      color: '#ffd700',
                      border: '1px solid rgba(255, 215, 0, 0.3)',
                      cursor: 'pointer',
                    }}
                  >
                    💬 Chat
                  </button>
                  <button
                    type="button"
                    onClick={() => onInviteParty(friend.name)}
                    title="Convidar para Party"
                    style={{
                      padding: '3px 6px',
                      fontSize: '10px',
                      borderRadius: '3px',
                      background: 'rgba(72, 187, 120, 0.15)',
                      color: '#68d391',
                      border: '1px solid rgba(72, 187, 120, 0.3)',
                      cursor: 'pointer',
                    }}
                  >
                    👥 Party
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveFriend(friend.name)}
                    title="Remover Amigo"
                    style={{
                      padding: '3px 6px',
                      fontSize: '10px',
                      borderRadius: '3px',
                      background: 'rgba(245, 101, 101, 0.15)',
                      color: '#fc8181',
                      border: '1px solid rgba(245, 101, 101, 0.3)',
                      cursor: 'pointer',
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DraggableWindow>
  );
}
