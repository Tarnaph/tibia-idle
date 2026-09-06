'use client';

import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';

export interface ChatMessageItem {
  id: string;
  senderId?: string;
  senderName: string;
  recipientName?: string;
  channel: 'local' | 'world' | 'whisper';
  text: string;
  timestamp: number;
}

export interface ChatWindowHandle {
  focusInput: (channel?: string, prefill?: string) => void;
  setActiveChannel: (channel: string) => void;
  prefillInput: (text: string) => void;
  openPrivateTab: (characterName: string) => void;
  closePrivateTab: (characterName: string) => void;
}

interface ChatWindowProps {
  messages: ChatMessageItem[];
  onSendMessage: (text: string, channel: 'local' | 'world' | 'whisper', recipientName?: string) => void;
  characterName: string;
  onClosePrivateTab?: (targetName: string) => void;
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

export const ChatWindow = forwardRef<ChatWindowHandle, ChatWindowProps>(function ChatWindow(
  { messages, onSendMessage, characterName, onClosePrivateTab },
  ref
) {
  const [activeTab, setActiveTab] = useState<string>('local');
  const [privateTabs, setPrivateTabs] = useState<string[]>([]);
  const [unreadTabs, setUnreadTabs] = useState<Set<string>>(new Set());
  const [inputText, setInputText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const handleSelectTab = (tab: string) => {
    setActiveTab(tab);
    setUnreadTabs((prev) => {
      const next = new Set(prev);
      next.delete(tab.toLowerCase());
      return next;
    });
    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
  };

  const openPrivateTab = (targetName: string) => {
    const trimmed = targetName.trim();
    if (!trimmed) return;
    setPrivateTabs((prev) => {
      if (!prev.some((p) => p.toLowerCase() === trimmed.toLowerCase())) {
        return [...prev, trimmed];
      }
      return prev;
    });
    handleSelectTab(trimmed);
  };

  const handleCloseTab = (targetName: string) => {
    setPrivateTabs((prev) => prev.filter((p) => p.toLowerCase() !== targetName.toLowerCase()));
    setUnreadTabs((prev) => {
      const next = new Set(prev);
      next.delete(targetName.toLowerCase());
      return next;
    });
    onClosePrivateTab?.(targetName);
    if (activeTab.toLowerCase() === targetName.toLowerCase()) {
      setActiveTab('local');
    }
  };

  useImperativeHandle(ref, () => ({
    focusInput: (channel?: string, prefill?: string) => {
      if (channel) {
        if (channel === 'local' || channel === 'world') {
          handleSelectTab(channel);
        } else {
          openPrivateTab(channel);
        }
      }
      if (typeof prefill === 'string') {
        setInputText(prefill);
      }
      setTimeout(() => {
        inputRef.current?.focus();
        if (inputRef.current && typeof prefill === 'string') {
          inputRef.current.selectionStart = inputRef.current.value.length;
          inputRef.current.selectionEnd = inputRef.current.value.length;
        }
      }, 20);
    },
    setActiveChannel: (channel: string) => {
      if (channel === 'local' || channel === 'world') {
        handleSelectTab(channel);
      } else {
        openPrivateTab(channel);
      }
    },
    prefillInput: (text: string) => {
      setInputText(text);
      setTimeout(() => {
        inputRef.current?.focus();
        if (inputRef.current) {
          inputRef.current.selectionStart = inputRef.current.value.length;
          inputRef.current.selectionEnd = inputRef.current.value.length;
        }
      }, 20);
    },
    openPrivateTab: (targetName: string) => {
      openPrivateTab(targetName);
    },
    closePrivateTab: (targetName: string) => {
      handleCloseTab(targetName);
    },
  }));

  // Track incoming whispers to dynamically register private tabs and mark unread
  useEffect(() => {
    if (messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.channel === 'whisper') {
      const isSelf = lastMsg.senderName.toLowerCase() === characterName.toLowerCase();
      const partner = isSelf ? lastMsg.recipientName : (lastMsg.senderName !== 'Servidor' ? lastMsg.senderName : null);
      if (partner) {
        setPrivateTabs((prev) => {
          if (!prev.some((p) => p.toLowerCase() === partner.toLowerCase())) {
            return [...prev, partner];
          }
          return prev;
        });
        if (activeTab.toLowerCase() !== partner.toLowerCase() && !isSelf) {
          setUnreadTabs((prev) => new Set(prev).add(partner.toLowerCase()));
        }
      }
    }
  }, [messages, characterName, activeTab]);

  // Auto-scroll on new message or tab change
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, activeTab]);

  // Strict channel isolation:
  // - local tab: ONLY local messages
  // - world tab: ONLY world messages
  // - private tab: ONLY whisper messages with that specific partner
  const filteredMessages = messages.filter((m) => {
    if (activeTab === 'local') {
      return m.channel === 'local';
    }
    if (activeTab === 'world') {
      return m.channel === 'world';
    }
    // Private tab for specific partner character
    const targetLower = activeTab.toLowerCase();
    if (m.channel === 'whisper') {
      const senderMatches = m.senderName.toLowerCase() === targetLower;
      const recipientMatches = m.recipientName?.toLowerCase() === targetLower;
      const isServerNotice = m.senderName === 'Servidor' && m.text.toLowerCase().includes(targetLower);
      return senderMatches || recipientMatches || isServerNotice;
    }
    return false;
  });

  const handleSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;

    if (activeTab === 'local') {
      onSendMessage(trimmed, 'local');
    } else if (activeTab === 'world') {
      onSendMessage(trimmed, 'world');
    } else {
      // Direct message inside private tab
      onSendMessage(trimmed, 'whisper', activeTab);
    }

    setInputText('');
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

  const isPrivateActive = activeTab !== 'local' && activeTab !== 'world';

  let inputPlaceholder = 'Diga algo no Local Chat... (amarelo, só quem está perto)';
  let inputBorderColor = 'rgba(255, 215, 0, 0.35)';
  let sendButtonBorder = '#ffd700';
  let sendButtonBg = 'rgba(255, 215, 0, 0.2)';
  let sendButtonColor = '#ffff55';

  if (activeTab === 'world') {
    inputPlaceholder = 'Diga algo no World Chat... (azul, visível no servidor inteiro)';
    inputBorderColor = 'rgba(0, 191, 255, 0.35)';
    sendButtonBorder = '#00bfff';
    sendButtonBg = 'rgba(0, 191, 255, 0.2)';
    sendButtonColor = '#55ffff';
  } else if (isPrivateActive) {
    inputPlaceholder = `Mensagem privada para ${activeTab}... (Enter para enviar)`;
    inputBorderColor = 'rgba(192, 132, 252, 0.45)';
    sendButtonBorder = '#c084fc';
    sendButtonBg = 'rgba(192, 132, 252, 0.25)';
    sendButtonColor = '#e9d5ff';
  }

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
          overflowX: 'auto',
          alignItems: 'center',
        }}
      >
        {/* Local Chat Tab */}
        <button
          type="button"
          onClick={() => handleSelectTab('local')}
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
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: '10px' }}>📍</span>
          <span>Local Chat</span>
        </button>

        {/* World Chat Tab */}
        <button
          type="button"
          onClick={() => handleSelectTab('world')}
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
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: '10px' }}>🌐</span>
          <span>World Chat</span>
        </button>

        {/* Dynamic Private Chat Tabs */}
        {privateTabs.map((tabName) => {
          const isActive = activeTab.toLowerCase() === tabName.toLowerCase();
          const hasUnread = unreadTabs.has(tabName.toLowerCase());

          return (
            <div
              key={tabName}
              onClick={() => handleSelectTab(tabName)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 8px',
                fontSize: '11px',
                fontWeight: 700,
                borderRadius: '3px',
                cursor: 'pointer',
                border: isActive
                  ? '1px solid #c084fc'
                  : hasUnread
                  ? '1px solid #f59e0b'
                  : '1px solid rgba(255,255,255,0.08)',
                background: isActive
                  ? 'rgba(147, 51, 234, 0.25)'
                  : hasUnread
                  ? 'rgba(245, 158, 11, 0.18)'
                  : 'rgba(20, 24, 30, 0.5)',
                color: isActive ? '#f3e8ff' : hasUnread ? '#fbbf24' : '#c084fc',
                transition: 'all 0.15s ease',
                flexShrink: 0,
                boxShadow: isActive ? '0 0 6px rgba(192, 132, 252, 0.25)' : 'none',
              }}
              title={`Conversa privada com ${tabName}`}
            >
              <span style={{ fontSize: '10px' }}>💬</span>
              <span>{tabName}</span>
              {hasUnread && !isActive && (
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: '#f59e0b',
                    display: 'inline-block',
                  }}
                  title="Nova mensagem não lida"
                />
              )}
              {/* Close Tab Button (✕) */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCloseTab(tabName);
                }}
                title={`Fechar aba de ${tabName}`}
                style={{
                  marginLeft: '4px',
                  background: 'transparent',
                  border: 'none',
                  color: isActive ? '#e9d5ff' : '#64748b',
                  fontSize: '11px',
                  lineHeight: 1,
                  padding: '1px 3px',
                  cursor: 'pointer',
                  borderRadius: '2px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#ef4444';
                  e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = isActive ? '#e9d5ff' : '#64748b';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                ✕
              </button>
            </div>
          );
        })}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', fontSize: '9px', color: '#68727d', gap: '4px', flexShrink: 0 }}>
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
              : activeTab === 'world'
              ? 'Nenhuma mensagem no World Chat (chat global do servidor).'
              : `Nenhuma mensagem nesta conversa privada com ${activeTab}. Diga olá!`}
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const isWhisper = msg.channel === 'whisper';
            const isLocal = msg.channel === 'local';
            const isSelf = msg.senderName.toLowerCase() === characterName.toLowerCase();

            let senderLabel = `${msg.senderName}${isSelf ? ' (Você)' : ''}:`;
            let senderColor = isLocal ? '#ffff55' : '#55ffff';
            let textColor = isLocal ? '#fffce8' : '#e8f8ff';

            if (isWhisper) {
              if (msg.senderName === 'Servidor') {
                senderLabel = '[Servidor]:';
                senderColor = '#f87171';
                textColor = '#fca5a5';
              } else if (isSelf) {
                senderLabel = `Você:`;
                senderColor = '#c084fc';
                textColor = '#f3e8ff';
              } else {
                senderLabel = `${msg.senderName}:`;
                senderColor = '#38bdf8';
                textColor = '#e0f2fe';
              }
            }

            return (
              <div
                key={msg.id}
                style={{
                  marginBottom: '3px',
                  wordBreak: 'break-word',
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '5px',
                  backgroundColor: isWhisper ? 'rgba(88, 28, 135, 0.12)' : 'transparent',
                  borderRadius: '2px',
                  padding: isWhisper ? '1px 4px' : '0',
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
                    cursor: isWhisper && !isSelf && msg.senderName !== 'Servidor' ? 'pointer' : 'default',
                  }}
                  title={isWhisper && !isSelf && msg.senderName !== 'Servidor' ? `Conversando com ${msg.senderName}` : undefined}
                >
                  {senderLabel}
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
          placeholder={inputPlaceholder}
          maxLength={180}
          style={{
            flex: 1,
            background: 'rgba(0, 0, 0, 0.5)',
            border: `1px solid ${inputBorderColor}`,
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
            border: `1px solid ${sendButtonBorder}`,
            background: sendButtonBg,
            color: sendButtonColor,
            cursor: 'pointer',
          }}
        >
          Enviar
        </button>
      </div>
    </div>
  );
});
