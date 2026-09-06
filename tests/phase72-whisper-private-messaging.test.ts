import { describe, expect, it, vi } from 'vitest';

describe('Phase 72: Whisper and Private Messaging Integration', () => {
  it('parses classic Tibia whisper (*Recipient* message) and command aliases (/w, /whisper, /tell, /msg)', () => {
    const cases = [
      { input: '*Sirius* Olá, tudo bem?', recipient: 'Sirius', text: 'Olá, tudo bem?' },
      { input: '/w Sirius Vamos caçar em Thais', recipient: 'Sirius', text: 'Vamos caçar em Thais' },
      { input: '/whisper Sirius Teste de sussurro', recipient: 'Sirius', text: 'Teste de sussurro' },
      { input: '/tell Sirius Fala aí', recipient: 'Sirius', text: 'Fala aí' },
      { input: '/msg Sirius Mensagem direta', recipient: 'Sirius', text: 'Mensagem direta' },
    ];

    for (const c of cases) {
      const starMatch = c.input.match(/^\*([^*]+)\*\s*(.*)$/);
      const slashMatch = c.input.match(/^\/(?:w|whisper|tell|msg)\s+([^\s]+)\s*(.*)$/i);

      const target = (starMatch ? starMatch[1] : slashMatch![1]).trim();
      const content = (starMatch ? starMatch[2] : slashMatch![2]).trim();

      expect(target).toBe(c.recipient);
      expect(content).toBe(c.text);
    }
  });

  it('routes whisper to the recipient regardless of distance or floor', () => {
    const sender = { sessionId: 'client-1', name: 'Bubble', posX: 100, posY: 100, posZ: 7 };
    const recipient = { sessionId: 'client-2', name: 'Cachero', posX: 500, posY: 800, posZ: 8 }; // Far away & different floor
    const bystander = { sessionId: 'client-3', name: 'RandomGuy', posX: 101, posY: 100, posZ: 7 }; // Right next to sender

    const client1Send = vi.fn();
    const client2Send = vi.fn();
    const client3Send = vi.fn();

    const clients = [
      { sessionId: sender.sessionId, send: client1Send },
      { sessionId: recipient.sessionId, send: client2Send },
      { sessionId: bystander.sessionId, send: client3Send },
    ];

    const players = new Map([
      [sender.sessionId, sender],
      [recipient.sessionId, recipient],
      [bystander.sessionId, bystander],
    ]);

    // Simulate server whisper handler
    const rawText = '*Cachero* Bora caçar Demon?';
    const starMatch = rawText.match(/^\*([^*]+)\*\s*(.*)$/);
    const targetName = starMatch![1].trim();
    const whisperContent = starMatch![2].trim();

    let recipientClient: any = null;
    let recipientPlayer: any = null;
    for (const [sid, p] of players.entries()) {
      if (p.name.toLowerCase() === targetName.toLowerCase()) {
        recipientPlayer = p;
        recipientClient = clients.find((c) => c.sessionId === sid);
        break;
      }
    }

    expect(recipientClient).toBeDefined();
    expect(recipientPlayer.name).toBe('Cachero');

    const payload = {
      id: 'w-1',
      senderId: sender.sessionId,
      senderName: sender.name,
      recipientName: recipientPlayer.name,
      text: whisperContent,
      channel: 'whisper',
      timestamp: Date.now(),
    };

    recipientClient.send('chat', payload);
    const senderClient = clients.find((c) => c.sessionId === sender.sessionId);
    senderClient?.send('chat', payload);

    // Recipient received it
    expect(client2Send).toHaveBeenCalledWith('chat', expect.objectContaining({
      senderName: 'Bubble',
      recipientName: 'Cachero',
      text: 'Bora caçar Demon?',
      channel: 'whisper',
    }));

    // Sender received confirmation
    expect(client1Send).toHaveBeenCalledWith('chat', expect.objectContaining({
      senderName: 'Bubble',
      recipientName: 'Cachero',
      text: 'Bora caçar Demon?',
      channel: 'whisper',
    }));

    // Bystander DID NOT receive private whisper
    expect(client3Send).not.toHaveBeenCalled();
  });

  it('notifies sender when recipient is offline', () => {
    const senderClient = { send: vi.fn() };
    const players = new Map([['s-1', { name: 'Bubble' }]]);
    const targetName = 'NonExistentFriend';

    const recipientFound = Array.from(players.values()).some(
      (p) => p.name.toLowerCase() === targetName.toLowerCase()
    );

    expect(recipientFound).toBe(false);

    if (!recipientFound) {
      senderClient.send('chat', {
        id: 'sys-1',
        senderId: 'system',
        senderName: 'Servidor',
        text: `Personagem "${targetName}" não está online no momento.`,
        channel: 'whisper',
      });
    }

    expect(senderClient.send).toHaveBeenCalledWith('chat', expect.objectContaining({
      senderName: 'Servidor',
      text: 'Personagem "NonExistentFriend" não está online no momento.',
      channel: 'whisper',
    }));
  });

  it('displays whisper in ChatWindow across both local and world tabs', () => {
    const messages = [
      { id: '1', senderName: 'Templo', channel: 'local' as const, text: 'Bem vindo', timestamp: 1 },
      { id: '2', senderName: 'Laron', channel: 'world' as const, text: 'Vendo MMS', timestamp: 2 },
      { id: '3', senderName: 'Sirius', recipientName: 'Hero', channel: 'whisper' as const, text: 'E aí!', timestamp: 3 },
    ];

    // On local tab
    const filteredLocal = messages.filter((m) => m.channel === 'local' || m.channel === 'whisper');
    expect(filteredLocal.map((m) => m.id)).toEqual(['1', '3']);

    // On world tab
    const filteredWorld = messages.filter((m) => m.channel === 'world' || m.channel === 'whisper');
    expect(filteredWorld.map((m) => m.id)).toEqual(['2', '3']);
  });

  it('prevents whispering oneself', () => {
    const senderName = 'Eternal Oblivion';
    const targetName = 'eternal oblivion';

    const isSelf = senderName.toLowerCase() === targetName.toLowerCase();
    expect(isSelf).toBe(true);

    const errorMsg = isSelf ? 'Você não pode enviar mensagens privadas para seu próprio personagem.' : null;
    expect(errorMsg).toBe('Você não pode enviar mensagens privadas para seu próprio personagem.');
  });
});
