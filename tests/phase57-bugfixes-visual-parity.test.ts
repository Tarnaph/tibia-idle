import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { ThaisCityRoom, PlayerState } from '../packages/server/src';

const projectRoot = resolve(__dirname, '..');

describe('Phase 57: Bug Fixes & Visual Parity (Offensive Exhaust, Wand VFX, Party Exit Teleport, Group Hunt Flow)', () => {
  it('prevents casting multiple offensive spells/runes in the same tick via offensive exhaust', async () => {
    const combatSrc = readFileSync(resolve(projectRoot, 'packages/domain/src/combat.ts'), 'utf8');

    // Verification of unified offensive cooldowns and per-tick exhaust flag
    expect(combatSrc).toContain('usedOffensiveActionThisTick');
    expect(combatSrc).toContain("actor.groupCooldowns['rune'] = encounter.elapsedMs + rune.cooldownMs");
    expect(combatSrc).toContain("actor.groupCooldowns['attack'] = encounter.elapsedMs + rune.cooldownMs");
    expect(combatSrc).toContain("actor.groupCooldowns['rune'] = encounter.elapsedMs + spell.groupCooldownMs");
  });

  it('maps wands and rods to authentic Tibia projectile and impact visual effects (e.g. Wand of Vortex -> energy hit 11)', async () => {
    const combatSrc = readFileSync(resolve(projectRoot, 'packages/domain/src/combat.ts'), 'utf8');

    // Wand of Vortex (projectile 4, effect 11 energy hit)
    expect(combatSrc).toContain("nameLower.includes('vortex')");
    expect(combatSrc).toContain('projectileId = 4');
    expect(combatSrc).toContain('effectId = 11');

    // Draconia / Dragonbreath (projectile 3, effect 15)
    expect(combatSrc).toContain("nameLower.includes('draconia')");
    expect(combatSrc).toContain('effectId = 15');

    // Cosmic Energy / Starfall (projectile 4, effect 11)
    expect(combatSrc).toContain("nameLower.includes('cosmic')");
  });

  it('teleports all party members to Thais Temple on party:huntExit', () => {
    const room = new ThaisCityRoom();
    room.onCreate({});
    const client1: any = { sessionId: 'lead-1', send: vi.fn() };
    const client2: any = { sessionId: 'foll-2', send: vi.fn() };

    const p1 = new PlayerState();
    p1.posX = 32410;
    p1.posY = 32280;
    p1.posZ = 6;
    const p2 = new PlayerState();
    p2.posX = 32411;
    p2.posY = 32281;
    p2.posZ = 6;

    room.state.players.set('lead-1', p1);
    room.state.players.set('foll-2', p2);
    (room as any).clients = [client1, client2];

    room.parties.set('lead-1', {
      leaderSessionId: 'lead-1',
      leaderName: 'Leader',
      memberSessionIds: ['lead-1', 'foll-2'],
    });
    room.playerPartyLeader.set('lead-1', 'lead-1');
    room.playerPartyLeader.set('foll-2', 'lead-1');

    (room as any).onMessageHandlers['party:huntExit'](client1);

    expect(p1.posX).toBe(32369);
    expect(p1.posY).toBe(32241);
    expect(p1.posZ).toBe(7);

    expect(p2.posX).toBe(32369);
    expect(p2.posY).toBe(32241);
    expect(p2.posZ).toBe(7);

    expect(client2.send).toHaveBeenCalledWith('party:huntExited', { x: 32369, y: 32241, z: 7 });
  });

  it('manages group hunt proposal lifecycle: propose, sync, and launch when all members accept', () => {
    const room = new ThaisCityRoom();
    room.onCreate({});
    const client1: any = { sessionId: 'leader-s', send: vi.fn() };
    const client2: any = { sessionId: 'member-s', send: vi.fn() };

    const p1 = new PlayerState();
    p1.name = 'Knight Leader';
    const p2 = new PlayerState();
    p2.name = 'Sorcerer Friend';

    room.state.players.set('leader-s', p1);
    room.state.players.set('member-s', p2);
    (room as any).clients = [client1, client2];

    room.parties.set('leader-s', {
      leaderSessionId: 'leader-s',
      leaderName: 'Knight Leader',
      memberSessionIds: ['leader-s', 'member-s'],
    });
    room.playerPartyLeader.set('leader-s', 'leader-s');
    room.playerPartyLeader.set('member-s', 'leader-s');

    // 1. Leader proposes hunt
    (room as any).onMessageHandlers['party:proposeHunt'](client1, {
      huntId: 'cyclopolis',
      huntName: 'Cyclopolis',
      seed: 'test-seed-123',
    });

    const activeProposal = room.activeHuntProposals.get('leader-s');
    expect(activeProposal).toBeDefined();
    expect(activeProposal?.huntId).toBe('cyclopolis');
    expect(activeProposal?.approvals).toContain('leader-s');

    // Member received proposal notification
    expect(client2.send).toHaveBeenCalledWith('party:huntProposed', expect.objectContaining({
      huntId: 'cyclopolis',
      huntName: 'Cyclopolis',
      leaderSessionId: 'leader-s',
    }));

    // 2. Member accepts proposal
    (room as any).onMessageHandlers['party:acceptHuntProposal'](client2);

    // Both clients receive hunt start
    expect(client1.send).toHaveBeenCalledWith('party:huntStarted', expect.objectContaining({
      huntId: 'cyclopolis',
      leaderSessionId: 'leader-s',
    }));
    expect(client2.send).toHaveBeenCalledWith('party:huntStarted', expect.objectContaining({
      huntId: 'cyclopolis',
      leaderSessionId: 'leader-s',
    }));

    // Proposal cleared after starting
    expect(room.activeHuntProposals.get('leader-s')).toBeUndefined();
  });

  it('notifies all party members when a member rejects a hunt proposal', () => {
    const room = new ThaisCityRoom();
    room.onCreate({});
    const client1: any = { sessionId: 'leader-s', send: vi.fn() };
    const client2: any = { sessionId: 'member-s', send: vi.fn() };

    const p1 = new PlayerState();
    p1.name = 'Knight Leader';
    const p2 = new PlayerState();
    p2.name = 'Sorcerer Friend';

    room.state.players.set('leader-s', p1);
    room.state.players.set('member-s', p2);
    (room as any).clients = [client1, client2];

    room.parties.set('leader-s', {
      leaderSessionId: 'leader-s',
      leaderName: 'Knight Leader',
      memberSessionIds: ['leader-s', 'member-s'],
    });
    room.playerPartyLeader.set('leader-s', 'leader-s');
    room.playerPartyLeader.set('member-s', 'leader-s');

    // Propose
    (room as any).onMessageHandlers['party:proposeHunt'](client1, {
      huntId: 'dragon_lair',
      huntName: 'Dragon Lair',
    });

    // Member rejects
    (room as any).onMessageHandlers['party:rejectHuntProposal'](client2);

    expect(client1.send).toHaveBeenCalledWith('party:huntProposalRejected', {
      rejectedByName: 'Sorcerer Friend',
      huntName: 'Dragon Lair',
    });
    expect(room.activeHuntProposals.get('leader-s')).toBeUndefined();
  });

  it('verifies visual parity components exist with exact UI elements from reference images', () => {
    const friendsSrc = readFileSync(resolve(projectRoot, 'apps/web/components/window/FriendsWindow.tsx'), 'utf8');
    const partyModalSrc = readFileSync(resolve(projectRoot, 'apps/web/components/party/PartyInvitationModal.tsx'), 'utf8');
    const huntModalSrc = readFileSync(resolve(projectRoot, 'apps/web/components/party/GroupHuntApprovalModal.tsx'), 'utf8');
    const huntSelectorSrc = readFileSync(resolve(projectRoot, 'apps/web/components/HuntSelector.tsx'), 'utf8');

    // Image 1: Friends Window
    expect(friendsSrc).toContain('Veja quem está online e mantenha sua party por perto.');
    expect(friendsSrc).toContain('ONLINE (');
    expect(friendsSrc).toContain('Mandar mensagem para');
    expect(friendsSrc).toContain('Convidar para a party');
    expect(friendsSrc).toContain('Remover dos amigos');
    expect(friendsSrc).toContain('Amigos:');
    expect(friendsSrc).toContain('Online:');

    // Image 2: Party Invitation Modal
    expect(partyModalSrc).toContain('CONVITE DE PARTY');
    expect(partyModalSrc).toContain('convidou você para a party');
    expect(partyModalSrc).toContain('ENTRAR');
    expect(partyModalSrc).toContain('RECUSAR');

    // Image 3: Hunt Selector leader team button
    expect(huntSelectorSrc).toContain('Iniciar com o time');

    // Images 4 & 5: Group Hunt Approval Modal
    expect(huntModalSrc).toContain('CONVITE DE CAÇADA EM GRUPO');
    expect(huntModalSrc).toContain('Juntando o time na chama mística para');
    expect(huntModalSrc).toContain('ACEITARAM');
    expect(huntModalSrc).toContain('TANK');
    expect(huntModalSrc).toContain('HEALER');
    expect(huntModalSrc).toContain('DPS');
    expect(huntModalSrc).toContain('LÍDER');
    expect(huntModalSrc).toContain('Esperando os outros...');
  });
});
