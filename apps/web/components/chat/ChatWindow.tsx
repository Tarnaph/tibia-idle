'use client';

import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';

export interface ChatMessageItem {
  id: string;
  senderId?: string;
  senderName: string;
  channel: 'local' | 'world';
  text: string;
  timestamp: number;
}

export interface ChatWindowHandle {
  focusInput: (channel?: 'local' | 'world') => void;
  setActiveChannel: (channel: 'local' | 'world') => void;
}

interface ChatWindowProps {
  messages: ChatMessageItem[];
  onSendMessage: (text: string, channel: 'local' | 'world') => void;
  characterName: string;
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

export const ChatWindow = forwardRef<ChatWindowHandle, ChatWindowProps>(function ChatWindow(
  { messages, onSendMessage, characterName },
  ref
) {
  const [activeTab, setActiveTab] = useState<'local' | 'world'>('local');
  const [inputText, setInputText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    focusInput: (channel?: 'local' | 'world') => {
      if (channel) {
        setActiveTab(channel);
      }
      setTimeout(() => {
        inputRef.current?.focus();
      }, 20);
    },
    setActiveChannel: (channel: 'local' | 'world') => {
      setActiveTab(channel);
    },
  }));

  // Auto-scroll on new message
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, activeTab]);

  const filteredMessages = messages.filter((m) => m.channel === activeTab);

  const handleSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    onSendMessage(trimmed, activeTab);
    setInputText('');
    // Re-focus or maintain focus
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    } else if (e.key === 'Escape') {
      inputRef.current?.blur();
    }
  };

  return (
    <div className="chat-window-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '190px' }}>
      {/* Tabs Header */}
      <div
        className="chat-tabs-header"
        style={{
          display: 'flex',
          gap: '4px',
          padding: '4px 6px',
          background: 'rgba(10, 14, 18, 0.75)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <button
          type="button"
          onClick={() => {
            setActiveTab('local');
            inputRef.current?.focus();
          }}
          style={{
            padding: '3px 10px',
            fontSize: '11px',
            fontWeight: 700,
            borderRadius: '3px',
            cursor: 'pointer',
            border: activeTab === 'local' ? '1px solid #ffd700' : '1px solid rgba(255,255,255,0.08)',
            background: activeTab === 'local' ? 'rgba(255, 215, 0, 0.15)' : 'rgba(20, 24, 30, 0.5)',
            color: activeTab === 'local' ? '#ffff55' : '#889098',
            transition: 'all 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          <span style={{ fontSize: '10px' }}>📍</span>
          <span>Local Chat</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('world');
            inputRef.current?.focus();
          }}
          style={{
            padding: '3px 10px',
            fontSize: '11px',
            fontWeight: 700,
            borderRadius: '3px',
            cursor: 'pointer',
            border: activeTab === 'world' ? '1px solid #00bfff' : '1px solid rgba(255,255,255,0.08)',
            background: activeTab === 'world' ? 'rgba(0, 191, 255, 0.15)' : 'rgba(20, 24, 30, 0.5)',
            color: activeTab === 'world' ? '#55ffff' : '#889098',
            transition: 'all 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          <span style={{ fontSize: '10px' }}>🌐</span>
          <span>World Chat</span>
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', fontSize: '9px', color: '#68727d', gap: '4px' }}>
          <span>Enter para focar</span>
        </div>
      </div>

      {/* Messages List */}
      <div
        ref={listRef}
        className="chat-messages-scroll"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '6px 8px',
          background: 'rgba(5, 7, 10, 0.65)',
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: '11px',
          lineHeight: '1.4',
          minHeight: '110px',
          maxHeight: '180px',
        }}
      >
        {filteredMessages.length === 0 ? (
          <div style={{ color: '#55606d', fontStyle: 'italic', fontSize: '10px', padding: '12px 4px', textAlign: 'center' }}>
            {activeTab === 'local'
              ? 'Nenhuma mensagem local recente (alcance de proximidade).'
              : 'Nenhuma mensagem no World Chat (chat global do servidor).'}
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const isLocal = msg.channel === 'local';
            const isSelf = msg.senderName === characterName;
            const senderColor = isLocal ? '#ffff55' : '#55ffff';
            const textColor = isLocal ? '#fffce8' : '#e8f8ff';

            return (
              <div
                key={msg.id}
                style={{
                  marginBottom: '3px',
                  wordBreak: 'break-word',
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '5px',
                }}
              >
                <time style={{ color: '#606a74', fontSize: '9.5px', flexShrink: 0 }}>
                  {formatTime(msg.timestamp)}
                </time>
                <span
                  style={{
                    color: senderColor,
                    fontWeight: 700,
                    flexShrink: 0,
                    textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                  }}
                >
                  {msg.senderName}
                  {isSelf ? ' (Você)' : ''}:
                </span>
                <span style={{ color: textColor }}>{msg.text}</span>
              </div>
            );
          })
        )}
      </div>

      {/* Chat Input Bar */}
      <div
        className="chat-input-bar"
        style={{
          display: 'flex',
          gap: '4px',
          padding: '4px 6px',
          background: 'rgba(10, 14, 18, 0.9)',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <input
          ref={inputRef}
          id="tibia-city-chat-input"
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            activeTab === 'local'
              ? 'Diga algo no Local Chat... (amarelo, só quem está perto)'
              : 'Diga algo no World Chat... (azul, visível no servidor inteiro)'
          }
          maxLength={180}
          style={{
            flex: 1,
            background: 'rgba(0, 0, 0, 0.5)',
            border: activeTab === 'local' ? '1px solid rgba(255, 215, 0, 0.35)' : '1px solid rgba(0, 191, 255, 0.35)',
            borderRadius: '3px',
            padding: '4px 8px',
            color: '#f0f3f6',
            fontSize: '11px',
            outline: 'none',
          }}
        />
        <button
          type="button"
          onClick={handleSend}
          title="Enviar Mensagem (Enter)"
          style={{
            padding: '4px 12px',
            fontSize: '11px',
            fontWeight: 700,
            borderRadius: '3px',
            border: activeTab === 'local' ? '1px solid #ffd700' : '1px solid #00bfff',
            background: activeTab === 'local' ? 'rgba(255, 215, 0, 0.2)' : 'rgba(0, 191, 255, 0.2)',
            color: activeTab === 'local' ? '#ffff55' : '#55ffff',
            cursor: 'pointer',
          }}
        >
          Enviar
        </button>
      </div>
    </div>
  );
});
