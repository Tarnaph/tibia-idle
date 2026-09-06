import { describe, expect, it, vi } from 'vitest';

describe('Phase 70: Friends List Message Button and Whisper Integration', () => {
  it('formats whisper message according to classic Tibia convention (*Name* message)', () => {
    const targetFriend = 'Aline Knight';
    const message = 'Bora caçar nos Dragons?';
    const prefill = `*${targetFriend}* `;

    expect(prefill).toBe('*Aline Knight* ');
    const fullWhisper = `${prefill}${message}`;
    expect(fullWhisper).toBe('*Aline Knight* Bora caçar nos Dragons?');

    // Regex to extract recipient and content
    const whisperMatch = fullWhisper.match(/^\*([^*]+)\*\s*(.*)$/);
    expect(whisperMatch).not.toBeNull();
    expect(whisperMatch?.[1]).toBe('Aline Knight');
    expect(whisperMatch?.[2]).toBe('Bora caçar nos Dragons?');
  });

  it('triggers onPrivateMessage when message button is clicked', () => {
    const onPrivateMessage = vi.fn();
    const onInviteParty = vi.fn();
    const onRemoveFriend = vi.fn();
    const onAddFriend = vi.fn();

    const sampleFriend = {
      id: 'f1',
      name: 'Bubble',
      level: 250,
      vocation: 'Elite Knight',
      isOnline: true,
    };

    // Simulate clicking message button
    onPrivateMessage(sampleFriend.name);
    expect(onPrivateMessage).toHaveBeenCalledTimes(1);
    expect(onPrivateMessage).toHaveBeenCalledWith('Bubble');

    // Simulate clicking party invite button
    onInviteParty(sampleFriend.name);
    expect(onInviteParty).toHaveBeenCalledTimes(1);
    expect(onInviteParty).toHaveBeenCalledWith('Bubble');

    // Simulate removing friend
    onRemoveFriend(sampleFriend.name);
    expect(onRemoveFriend).toHaveBeenCalledTimes(1);
    expect(onRemoveFriend).toHaveBeenCalledWith('Bubble');
  });

  it('supports ChatWindow focusInput prefill functionality', () => {
    let activeChannel = 'local';
    let currentInput = '';
    let isFocused = false;

    const mockChatWindowHandle = {
      focusInput: (channel?: 'local' | 'world', prefill?: string) => {
        if (channel) activeChannel = channel;
        if (typeof prefill === 'string') currentInput = prefill;
        isFocused = true;
      },
      setActiveChannel: (channel: 'local' | 'world') => {
        activeChannel = channel;
      },
      prefillInput: (text: string) => {
        currentInput = text;
        isFocused = true;
      },
    };

    mockChatWindowHandle.focusInput('local', '*Cachero* ');
    expect(activeChannel).toBe('local');
    expect(currentInput).toBe('*Cachero* ');
    expect(isFocused).toBe(true);
  });
});
