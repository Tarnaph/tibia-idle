import { Client } from '@colyseus/core';
import { ChatMessageSchema } from '../../schemas/ChatMessageSchema';
import { serverConfigManager } from '../../config/ServerConfigManager';
import {
  isInViewport,
  isWithinDistance,
  LOCAL_CHAT_RADIUS,
  YELL_CHAT_RADIUS,
} from '../../utils/spatialGrid';
import type { ThaisCityRoom } from '../ThaisCityRoom';

export class CityChatHandler {
  constructor(private room: ThaisCityRoom) {}

  public register(): void {
    this.room.onMessage('chat', (client, data: { text: string; channel?: string }) => {
      this.handleChatMessage(client, data?.text || '', data?.channel || 'say');
    });
  }

  public handleChatMessage(client: Client, rawText: string, channel: string): void {
    const player = this.room.state.players.get(client.sessionId);
    if (!player || !rawText.trim()) return;

    const rawTrimmed = rawText.trim();
    const timestamp = Date.now();

    // Check if message is a private whisper (*Recipient* message or /w Recipient message or /tell Recipient message)
    const starMatch = rawTrimmed.match(/^\*([^*]+)\*\s*(.*)$/);
    const slashMatch = rawTrimmed.match(/^\/(?:w|whisper|tell|msg)\s+(?:"([^"]+)"|(\S+))\s*(.*)$/i);

    if (starMatch || slashMatch) {
      let targetName = (starMatch ? starMatch[1] : (slashMatch![1] || slashMatch![2])).trim();
      let whisperContent = (starMatch ? starMatch[2] : slashMatch![3]).trim();

      // Find recipient among connected players
      let recipientClient: Client | null = null;
      let recipientPlayer: any = null;

      for (const [sid, p] of this.room.state.players.entries()) {
        if (p.name.trim().toLowerCase() === targetName.toLowerCase()) {
          recipientPlayer = p;
          recipientClient = this.room.clients.find((c) => c.sessionId === sid) || null;
          break;
        }
      }

      // Fallback: If slash command was used without quotes and targetName was split on space, check if any online player name matches start of text
      if (!recipientPlayer && slashMatch && !slashMatch[1]) {
        const afterCmd = rawTrimmed.replace(/^\/(?:w|whisper|tell|msg)\s+/i, '').trim();
        for (const [sid, p] of this.room.state.players.entries()) {
          const pNameLower = p.name.trim().toLowerCase();
          if (afterCmd.toLowerCase().startsWith(pNameLower)) {
            recipientPlayer = p;
            recipientClient = this.room.clients.find((c) => c.sessionId === sid) || null;
            targetName = p.name;
            whisperContent = afterCmd.slice(p.name.length).trim();
            break;
          }
        }
      }

      if (!whisperContent) {
        if (typeof client.send === 'function') {
          client.send('chat', {
            id: `sys-${timestamp}-${Math.random().toString(36).slice(2, 6)}`,
            senderId: 'system',
            senderName: 'Servidor',
            text: `Por favor, digite a mensagem a ser enviada para ${targetName}.`,
            channel: 'whisper',
            timestamp,
          });
        }
        return;
      }

      if (targetName.toLowerCase() === player.name.trim().toLowerCase()) {
        if (typeof client.send === 'function') {
          client.send('chat', {
            id: `sys-${timestamp}-${Math.random().toString(36).slice(2, 6)}`,
            senderId: 'system',
            senderName: 'Servidor',
            text: 'Você não pode enviar mensagens privadas para seu próprio personagem.',
            channel: 'whisper',
            timestamp,
          });
        }
        return;
      }

      const msgId = `whisper-${timestamp}-${Math.random().toString(36).slice(2, 7)}`;

      if (recipientClient && recipientPlayer && typeof recipientClient.send === 'function') {
        // Send to recipient
        const recipientPayload = {
          id: msgId,
          senderId: client.sessionId,
          senderName: player.name,
          senderTitle: player.adminTitle || '',
          recipientName: recipientPlayer.name,
          text: whisperContent,
          channel: 'whisper',
          timestamp,
        };
        recipientClient.send('chat', recipientPayload);

        // Send to sender for local chat history confirmation
        if (typeof client.send === 'function') {
          const senderPayload = {
            id: msgId,
            senderId: client.sessionId,
            senderName: player.name,
            senderTitle: player.adminTitle || '',
            recipientName: recipientPlayer.name,
            text: whisperContent,
            channel: 'whisper',
            timestamp,
          };
          client.send('chat', senderPayload);
        }
      } else {
        // Recipient not found online
        if (typeof client.send === 'function') {
          client.send('chat', {
            id: `sys-${timestamp}-${Math.random().toString(36).slice(2, 6)}`,
            senderId: 'system',
            senderName: 'Servidor',
            senderTitle: '',
            text: `Personagem "${targetName}" não está online no momento.`,
            channel: 'whisper',
            timestamp,
          });
        }
      }

      // Whisper handled privately; do not broadcast to public room or world chat
      return;
    }

    const normalizedChannel =
      channel === 'world' || channel === 'global' ? 'world' :
      channel === 'yell' ? 'yell' : 'local';

    const text = normalizedChannel === 'yell' ? rawTrimmed.toUpperCase() : rawTrimmed;

    const msg = new ChatMessageSchema();
    msg.id = `msg-${timestamp}-${Math.random()}`;
    msg.senderId = client.sessionId;
    msg.senderName = player.name;
    msg.senderTitle = player.adminTitle || '';
    msg.text = text;
    msg.channel = normalizedChannel;
    msg.timestamp = timestamp;

    this.room.state.chatMessages.push(msg);

    // Keep chat message history bounded (max 50 recent messages)
    if (this.room.state.chatMessages.length > 50) {
      this.room.state.chatMessages.shift();
    }

    // Distance routing for local and yell channels
    this.room.clients.forEach((c) => {
      try {
        const recipient = this.room.state.players.get(c.sessionId);
        if (!recipient) return;

        let canReceive = false;
        if (c.sessionId === client.sessionId) {
          canReceive = true;
        } else if (normalizedChannel === 'world') {
          canReceive = true;
        } else if (normalizedChannel === 'local') {
          const localRadius = serverConfigManager.getConfig().localChatRadius || LOCAL_CHAT_RADIUS;
          canReceive =
            player.posZ === recipient.posZ &&
            (isWithinDistance(player.posX, player.posY, recipient.posX, recipient.posY, localRadius) ||
             isInViewport(player.posX, player.posY, recipient.posX, recipient.posY));
        } else if (normalizedChannel === 'yell') {
          const yellRadius = serverConfigManager.getConfig().yellChatRadius || YELL_CHAT_RADIUS;
          canReceive = isWithinDistance(player.posX, player.posY, recipient.posX, recipient.posY, yellRadius);
        } else {
          canReceive = true;
        }

        if (canReceive && typeof c.send === 'function') {
          const payload = {
            id: msg.id,
            senderId: client.sessionId,
            senderName: player.name,
            senderTitle: player.adminTitle || '',
            text,
            channel: normalizedChannel,
            timestamp,
          };
          c.send('chat', payload);
          c.send('chat_message', payload);
        }
      } catch (err) {
        // Safe ignore broken socket on stale client
      }
    });
  }
}
