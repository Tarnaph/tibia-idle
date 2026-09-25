'use client';

import React from 'react';
import { ChatWindow, type ChatMessageItem, type ChatWindowHandle } from '../chat/ChatWindow';

interface MobileChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessageItem[];
  onSendMessage: (text: string, channel: 'local' | 'world' | 'whisper', recipientName?: string) => void;
  characterName: string;
  chatWindowRef?: React.RefObject<ChatWindowHandle | null>;
}

export function MobileChatModal({
  isOpen,
  onClose,
  messages,
  onSendMessage,
  characterName,
  chatWindowRef,
}: MobileChatModalProps) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 95,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          height: '62vh',
          maxHeight: '480px',
          backgroundColor: '#090d16',
          borderTop: '2px solid #ca8a04',
          borderTopLeftRadius: '12px',
          borderTopRightRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.85)',
          overflow: 'hidden',
          animation: 'slideUp 0.25s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '10px 14px',
            backgroundColor: '#121826',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px' }}>💬</span>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#fef08a' }}>
              Chat do Jogo
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '18px',
              cursor: 'pointer',
              padding: '4px 8px',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Chat Window Component */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <ChatWindow
            ref={chatWindowRef as any}
            messages={messages}
            onSendMessage={onSendMessage}
            characterName={characterName}
          />
        </div>
      </div>
    </div>
  );
}
