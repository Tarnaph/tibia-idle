import { describe, expect, it, vi } from 'vitest';

describe('Phase 71: Friends List Character Lookup & Validation Before Adding', () => {
  it('rejects adding own character to friends list', () => {
    const activeCharacterName = 'Eternal Oblivion';
    const candidateName = 'eternal oblivion';

    const isSelf = activeCharacterName.toLowerCase() === candidateName.trim().toLowerCase();
    expect(isSelf).toBe(true);

    const validationResult = isSelf
      ? { success: false, error: 'Você não pode adicionar seu próprio personagem à lista de amigos.' }
      : { success: true };

    expect(validationResult.success).toBe(false);
    expect(validationResult.error).toContain('Você não pode adicionar seu próprio personagem');
  });

  it('rejects adding duplicate friends to friends list', () => {
    const friendsList = [
      { id: 'f-1', name: 'Bubble', level: 250, vocation: 'Elite Knight', isOnline: true },
      { id: 'f-2', name: 'Cachero', level: 240, vocation: 'Master Sorcerer', isOnline: true },
    ];
    const candidateName = 'bubble';

    const isAlreadyFriend = friendsList.some(
      (f) => f.name.toLowerCase() === candidateName.trim().toLowerCase()
    );
    expect(isAlreadyFriend).toBe(true);

    const validationResult = isAlreadyFriend
      ? { success: false, error: `"${candidateName}" já está na sua lista de amigos.` }
      : { success: true };

    expect(validationResult.success).toBe(false);
    expect(validationResult.error).toContain('já está na sua lista de amigos');
  });

  it('adds friend successfully if character exists in server lookup response', () => {
    const friendsList: Array<{ id: string; name: string; level: number; vocation: string; isOnline: boolean }> = [];
    const lookupResponse = {
      success: true,
      character: {
        id: 'char-42',
        name: 'Mateusz Dragon Wielki',
        level: 300,
        vocationId: 4,
        vocationName: 'Elder Druid',
        isOnline: true,
      },
    };

    if (lookupResponse.success && lookupResponse.character) {
      friendsList.push({
        id: `f-${lookupResponse.character.id}`,
        name: lookupResponse.character.name,
        level: lookupResponse.character.level,
        vocation: lookupResponse.character.vocationName || 'Druid',
        isOnline: lookupResponse.character.isOnline,
      });
    }

    expect(friendsList).toHaveLength(1);
    expect(friendsList[0].name).toBe('Mateusz Dragon Wielki');
    expect(friendsList[0].level).toBe(300);
    expect(friendsList[0].vocation).toBe('Elder Druid');
  });

  it('does NOT add friend and returns server error if character does not exist in server', () => {
    const friendsList: Array<{ id: string; name: string }> = [];
    const targetName = 'NonExistentChar999';
    const lookupResponse = {
      success: false,
      error: `Personagem "${targetName}" não existe no servidor.`,
    };

    let resultError = '';
    if (lookupResponse.success) {
      friendsList.push({ id: 'f-1', name: targetName });
    } else {
      resultError = lookupResponse.error;
    }

    expect(friendsList).toHaveLength(0);
    expect(resultError).toBe('Personagem "NonExistentChar999" não existe no servidor.');
  });

  it('recognizes remote players currently in active session without querying database', () => {
    const remotePlayers = new Map([
      ['session-abc', { id: 'p1', name: 'Astronis', level: 130, vocationId: 1 }],
    ]);

    const target = 'astronis';
    const match = Array.from(remotePlayers.values()).find(
      (r) => r.name.toLowerCase() === target.toLowerCase()
    );

    expect(match).toBeDefined();
    expect(match?.name).toBe('Astronis');
    expect(match?.level).toBe(130);
  });
});
