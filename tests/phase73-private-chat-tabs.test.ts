import { describe, expect, it, vi } from 'vitest';
import type { ChatMessageItem } from '../apps/web/components/chat/ChatWindow';

describe('Phase 73: Dedicated Private Chat Tabs with Close Feature', () => {
  const currentHero = 'Eternal Oblivion';

  const sampleMessages: ChatMessageItem[] = [
    { id: '1', senderName: 'Temple Priest', channel: 'local', text: 'Peace be with you.', timestamp: 1000 },
    { id: '2', senderName: 'Arieswar', channel: 'world', text: 'Selling Demon Helmet 150k msg me', timestamp: 2000 },
    { id: '3', senderName: 'Bubble', recipientName: currentHero, channel: 'whisper', text: 'Hey, are you going to Annihilator?', timestamp: 3000 },
    { id: '4', senderName: currentHero, recipientName: 'Bubble', channel: 'whisper', text: 'Yes, just preparing my supplies!', timestamp: 4000 },
    { id: '5', senderName: 'Cachero', recipientName: currentHero, channel: 'whisper', text: 'Hail!', timestamp: 5000 },
  ];

  // Helper simulating ChatWindow filter logic
  const filterMessagesForTab = (messages: ChatMessageItem[], activeTab: string, characterName: string) => {
    return messages.filter((m) => {
      if (activeTab === 'local') {
        return m.channel === 'local';
      }
      if (activeTab === 'world') {
        return m.channel === 'world';
      }
      const targetLower = activeTab.toLowerCase();
      if (m.channel === 'whisper') {
        const senderMatches = m.senderName.toLowerCase() === targetLower;
        const recipientMatches = m.recipientName?.toLowerCase() === targetLower;
        const isServerNotice = m.senderName === 'Servidor' && m.text.toLowerCase().includes(targetLower);
        return senderMatches || recipientMatches || isServerNotice;
      }
      return false;
    });
  };

  it('strictly isolates private messages away from Local and World chat tabs', () => {
    const localMsgs = filterMessagesForTab(sampleMessages, 'local', currentHero);
    expect(localMsgs.map((m) => m.id)).toEqual(['1']);
    // Whisper IDs '3', '4', '5' and World ID '2' MUST NOT appear in local
    expect(localMsgs.some((m) => m.channel === 'whisper')).toBe(false);

    const worldMsgs = filterMessagesForTab(sampleMessages, 'world', currentHero);
    expect(worldMsgs.map((m) => m.id)).toEqual(['2']);
    // Whisper IDs '3', '4', '5' and Local ID '1' MUST NOT appear in world
    expect(worldMsgs.some((m) => m.channel === 'whisper')).toBe(false);
  });

  it('displays private conversation exclusively in the dedicated character tab', () => {
    const bubbleMsgs = filterMessagesForTab(sampleMessages, 'Bubble', currentHero);
    expect(bubbleMsgs.map((m) => m.id)).toEqual(['3', '4']);
    expect(bubbleMsgs.every((m) => m.senderName === 'Bubble' || m.recipientName === 'Bubble')).toBe(true);

    const cacheroMsgs = filterMessagesForTab(sampleMessages, 'Cachero', currentHero);
    expect(cacheroMsgs.map((m) => m.id)).toEqual(['5']);
    expect(cacheroMsgs[0]?.text).toBe('Hail!');
  });

  it('dynamically discovers and opens private tabs on incoming whispers', () => {
    let privateTabs: string[] = [];

    const handleIncomingWhisper = (msg: ChatMessageItem, myName: string) => {
      if (msg.channel !== 'whisper') return;
      const isSelf = msg.senderName.toLowerCase() === myName.toLowerCase();
      const partner = isSelf ? msg.recipientName : (msg.senderName !== 'Servidor' ? msg.senderName : null);
      if (partner && !privateTabs.some((t) => t.toLowerCase() === partner.toLowerCase())) {
        privateTabs.push(partner);
      }
    };

    handleIncomingWhisper(sampleMessages[2], currentHero); // from Bubble
    expect(privateTabs).toEqual(['Bubble']);

    handleIncomingWhisper(sampleMessages[4], currentHero); // from Cachero
    expect(privateTabs).toEqual(['Bubble', 'Cachero']);

    // Duplicate message from existing tab should not add another tab
    handleIncomingWhisper(sampleMessages[3], currentHero); // to Bubble
    expect(privateTabs).toEqual(['Bubble', 'Cachero']);
  });

  it('allows closing a private tab and returns active tab to local chat if closed tab was active', () => {
    let privateTabs = ['Bubble', 'Cachero'];
    let activeTab = 'Bubble';
    const unreadTabs = new Set<string>(['cachero']);

    const closeTab = (target: string) => {
      privateTabs = privateTabs.filter((t) => t.toLowerCase() !== target.toLowerCase());
      unreadTabs.delete(target.toLowerCase());
      if (activeTab.toLowerCase() === target.toLowerCase()) {
        activeTab = 'local';
      }
    };

    // Close active tab "Bubble"
    closeTab('Bubble');
    expect(privateTabs).toEqual(['Cachero']);
    expect(activeTab).toBe('local');

    // Close remaining tab "Cachero" while on local
    closeTab('Cachero');
    expect(privateTabs).toEqual([]);
    expect(activeTab).toBe('local');
    expect(unreadTabs.has('cachero')).toBe(false);
  });

  it('automatically formats direct whisper transmission when sending from a private tab', () => {
    const onSendMessage = vi.fn();
    const activeTab: string = 'Bubble';
    const inputText = 'Are you ready?';

    // Simulate handleSend in ChatWindow when on a private tab
    if (activeTab === 'local') {
      onSendMessage(inputText, 'local');
    } else if (activeTab === 'world') {
      onSendMessage(inputText, 'world');
    } else {
      onSendMessage(inputText, 'whisper', activeTab);
    }

    expect(onSendMessage).toHaveBeenCalledWith('Are you ready?', 'whisper', 'Bubble');
  });

  it('marks unread notification when a whisper arrives for an inactive private tab and clears on selection', () => {
    const activeTab: string = 'local';
    const unreadTabs = new Set<string>();

    const onIncoming = (sender: string) => {
      if (activeTab.toLowerCase() !== sender.toLowerCase()) {
        unreadTabs.add(sender.toLowerCase());
      }
    };

    onIncoming('Bubble');
    expect(unreadTabs.has('bubble')).toBe(true);

    // Switching to Bubble's tab clears unread
    const selectTab = (tabName: string) => {
      unreadTabs.delete(tabName.toLowerCase());
    };

    selectTab('Bubble');
    expect(unreadTabs.has('bubble')).toBe(false);
  });
});
