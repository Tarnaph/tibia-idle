import { Client } from '@colyseus/core';
import { persistenceManager } from '../../persistence/PrismaPersistenceManager';
import { ServerCharacterContextRegistry, XpRateLimiter } from '../../../../auth/src';
import { canEnterHunt, getHuntWorldEntrance, levelForExperience } from '../../../../domain/src';
import type { ThaisCityRoom } from '../ThaisCityRoom';

export class CityPartyHandler {
  constructor(private room: ThaisCityRoom) {}

  public register(): void {
    // Party multiplayer messages
    this.room.onMessage('party:invite', (client, data: { targetName?: string; targetSessionId?: string }) => {
      const inviter = this.room.state.players.get(client.sessionId);
      if (!inviter) return;

      const inviterLeaderId = this.room.playerPartyLeader.get(client.sessionId);
      if (inviterLeaderId && inviterLeaderId !== client.sessionId) {
        client.send('party:error', {
          message: 'Apenas o líder da party pode convidar novos membros.',
        });
        return;
      }

      const party = inviterLeaderId ? this.room.parties.get(inviterLeaderId) : null;
      if (party && party.memberSessionIds.length >= 4) {
        client.send('party:error', {
          message: 'A party já está cheia (máximo de 4 integrantes).',
        });
        return;
      }

      let targetClient: Client | undefined;
      let targetPlayer: any | undefined;

      if (data?.targetSessionId) {
        targetClient = this.room.clients.find((c) => c.sessionId === data.targetSessionId);
        targetPlayer = this.room.state.players.get(data.targetSessionId);
      } else if (data?.targetName) {
        const query = data.targetName.trim().toLowerCase();
        for (const [sId, p] of this.room.state.players.entries()) {
          if (p.name && p.name.trim().toLowerCase() === query) {
            targetClient = this.room.clients.find((c) => c.sessionId === sId);
            targetPlayer = p;
            break;
          }
        }
      }

      if (!targetClient || !targetPlayer) {
        client.send('party:error', {
          message: `Jogador "${data?.targetName || 'alvo'}" não encontrado ou não está online na cidade de Thais.`,
        });
        return;
      }

      if (targetClient.sessionId === client.sessionId) {
        client.send('party:error', {
          message: 'Você não pode convidar a si mesmo para a party.',
        });
        return;
      }

      // Verifica se o alvo já faz parte desta party
      if (party && party.memberSessionIds.includes(targetClient.sessionId)) {
        client.send('party:error', {
          message: `${targetPlayer.name} já faz parte da sua party.`,
        });
        return;
      }

      // Verifica se o alvo já é líder ou membro de outra party
      const targetLeaderId = this.room.playerPartyLeader.get(targetClient.sessionId);
      if (targetLeaderId) {
        client.send('party:error', {
          message: `${targetPlayer.name} já pertence a outra party.`,
        });
        return;
      }

      // Envia o convite para o jogador alvo
      targetClient.send('party:invitationReceived', {
        inviterSessionId: client.sessionId,
        inviterName: inviter.name,
        inviterLevel: inviter.level,
        inviterVocationId: inviter.vocationId,
      });

      // Confirma o envio para o líder
      client.send('party:inviteSent', {
        targetName: targetPlayer.name,
      });
    });

    this.room.onMessage('party:acceptInvite', (client, data: { inviterSessionId: string }) => {
      const inviterClient = this.room.clients.find((c) => c.sessionId === data.inviterSessionId);
      const inviterPlayer = this.room.state.players.get(data.inviterSessionId);
      const memberPlayer = this.room.state.players.get(client.sessionId);
      if (!inviterClient || !inviterPlayer || !memberPlayer) return;

      let leaderId = this.room.playerPartyLeader.get(data.inviterSessionId) || data.inviterSessionId;
      let party = this.room.parties.get(leaderId);
      if (!party) {
        party = {
          leaderSessionId: leaderId,
          leaderName: inviterPlayer.name,
          memberSessionIds: [leaderId],
        };
        this.room.parties.set(leaderId, party);
        this.room.playerPartyLeader.set(leaderId, leaderId);
      }

      if (party.memberSessionIds.length >= 4) {
        client.send('party:error', {
          message: 'A party atingiu a capacidade máxima de 4 membros.',
        });
        return;
      }

      if (!party.memberSessionIds.includes(client.sessionId)) {
        party.memberSessionIds.push(client.sessionId);
      }
      this.room.playerPartyLeader.set(client.sessionId, leaderId);

      this.broadcastPartySync(leaderId);
    });

    this.room.onMessage('party:rejectInvite', (client, data: { inviterSessionId: string }) => {
      const inviterClient = this.room.clients.find((c) => c.sessionId === data.inviterSessionId);
      const memberPlayer = this.room.state.players.get(client.sessionId);
      if (inviterClient && memberPlayer) {
        inviterClient.send('party:inviteRejected', {
          memberName: memberPlayer.name,
        });
      }
    });

    this.room.onMessage('party:leave', (client) => {
      this.handlePlayerLeaveParty(client.sessionId);
    });

    this.room.onMessage('party:huntSync', (client, data: { huntId: string; seed?: string }) => {
      const leaderId = this.room.playerPartyLeader.get(client.sessionId);
      if (!leaderId) return;
      const party = this.room.parties.get(leaderId);
      if (!party || party.leaderSessionId !== client.sessionId) return;

      for (const memberId of party.memberSessionIds) {
        const memberPlayer = this.room.state.players.get(memberId);
        if (memberPlayer) {
          this.room.updatePlayerHuntContext(memberPlayer, true, data.huntId);
        }
        const memberClient = this.room.clients.find((c) => c.sessionId === memberId);
        if (memberClient) {
          memberClient.send('party:huntStarted', {
            huntId: data.huntId,
            seed: data.seed,
            leaderName: party.leaderName,
            leaderSessionId: party.leaderSessionId,
            partyId: leaderId,
          });
        }
      }
    });

    this.room.onMessage('party:proposeHunt', (client, data: { huntId: string; huntName: string; seed?: string }) => {
      const leaderId = this.room.playerPartyLeader.get(client.sessionId);
      if (!leaderId) return;
      const party = this.room.parties.get(leaderId);
      if (!party || party.leaderSessionId !== client.sessionId) return;

      const proposal = {
        huntId: data.huntId,
        huntName: data.huntName,
        seed: data.seed || `seed-${Date.now()}`,
        leaderSessionId: client.sessionId,
        approvals: new Set<string>([client.sessionId]),
      };
      this.room.activeHuntProposals.set(leaderId, proposal);

      for (const memberId of party.memberSessionIds) {
        const memberClient = this.room.clients.find((c) => c.sessionId === memberId);
        if (memberClient) {
          memberClient.send('party:huntProposed', {
            huntId: data.huntId,
            huntName: data.huntName,
            leaderName: party.leaderName,
            leaderSessionId: party.leaderSessionId,
            acceptedSessionIds: Array.from(proposal.approvals),
            totalMembers: party.memberSessionIds.length,
          });
        }
      }
    });

    this.room.onMessage('party:acceptHuntProposal', (client) => {
      const leaderId = this.room.playerPartyLeader.get(client.sessionId);
      if (!leaderId) return;
      const party = this.room.parties.get(leaderId);
      const proposal = this.room.activeHuntProposals.get(leaderId);
      if (!party || !proposal) return;

      proposal.approvals.add(client.sessionId);

      const acceptedList = Array.from(proposal.approvals);
      for (const memberId of party.memberSessionIds) {
        const memberClient = this.room.clients.find((c) => c.sessionId === memberId);
        if (memberClient) {
          memberClient.send('party:huntProposalSync', {
            huntId: proposal.huntId,
            huntName: proposal.huntName,
            acceptedSessionIds: acceptedList,
            totalMembers: party.memberSessionIds.length,
          });
        }
      }

      // If all members approved, automatically start the hunt!
      if (proposal.approvals.size >= party.memberSessionIds.length) {
        this.room.activeHuntProposals.delete(leaderId);
        for (const memberId of party.memberSessionIds) {
          const memberPlayer = this.room.state.players.get(memberId);
          if (memberPlayer) {
            this.room.updatePlayerHuntContext(memberPlayer, true, proposal.huntId);
          }
          const memberClient = this.room.clients.find((c) => c.sessionId === memberId);
          if (memberClient) {
            memberClient.send('party:huntStarted', {
              huntId: proposal.huntId,
              seed: proposal.seed,
              leaderName: party.leaderName,
              leaderSessionId: party.leaderSessionId,
              partyId: leaderId,
            });
          }
        }
      }
    });

    this.room.onMessage('party:rejectHuntProposal', (client) => {
      const leaderId = this.room.playerPartyLeader.get(client.sessionId);
      if (!leaderId) return;
      const party = this.room.parties.get(leaderId);
      const proposal = this.room.activeHuntProposals.get(leaderId);
      if (!party || !proposal) return;

      const rejector = this.room.state.players.get(client.sessionId);
      this.room.activeHuntProposals.delete(leaderId);

      for (const memberId of party.memberSessionIds) {
        const memberClient = this.room.clients.find((c) => c.sessionId === memberId);
        if (memberClient) {
          memberClient.send('party:huntProposalRejected', {
            rejectedByName: rejector?.name || 'Um membro',
            huntName: proposal.huntName,
          });
        }
      }
    });

    this.room.onMessage('party:huntExit', (client) => {
      const leaderId = this.room.playerPartyLeader.get(client.sessionId);
      if (!leaderId) return;
      const party = this.room.parties.get(leaderId);
      if (!party || party.leaderSessionId !== client.sessionId) return;

      for (const memberId of party.memberSessionIds) {
        const memberPlayer = this.room.state.players.get(memberId);
        if (memberPlayer) {
          memberPlayer.posX = 32369;
          memberPlayer.posY = 32241;
          memberPlayer.posZ = 7;
          memberPlayer.direction = 'south';
          memberPlayer.isWalking = false;
          memberPlayer.lastStepTime = 0;
          this.room.updatePlayerHuntContext(memberPlayer, false);
        }
        if (memberId !== client.sessionId) {
          const memberClient = this.room.clients.find((c) => c.sessionId === memberId);
          if (memberClient) {
            memberClient.send('party:huntExited', {
              x: 32369,
              y: 32241,
              z: 7,
            });
          }
        }
      }
    });

    this.room.onMessage('party:huntEncounterSync', (client, data: any) => {
      const leaderId = this.room.playerPartyLeader.get(client.sessionId);
      if (!leaderId) return;
      const party = this.room.parties.get(leaderId);
      if (!party || party.leaderSessionId !== client.sessionId) return;

      for (const memberId of party.memberSessionIds) {
        if (memberId === client.sessionId) continue;
        const memberClient = this.room.clients.find((c) => c.sessionId === memberId);
        if (memberClient) {
          memberClient.send('party:huntEncounterSync', data);
        }
      }
    });

    this.room.onMessage('party:followerAttack', (client, data: any) => {
      const leaderId = this.room.playerPartyLeader.get(client.sessionId);
      if (!leaderId) return;
      const party = this.room.parties.get(leaderId);
      if (!party) return;
      const leaderClient = this.room.clients.find((c) => c.sessionId === party.leaderSessionId);
      if (leaderClient) {
        leaderClient.send('party:followerAttack', {
          senderSessionId: client.sessionId,
          ...data,
        });
      }
    });

    this.room.onMessage('player:returnToCity', async (client) => {
      const player = this.room.state.players.get(client.sessionId);
      if (!player || !player.characterId) return;

      // Autoritativo permanente: restaura tag de visibilidade urbana para todos os jogadores imediatamente
      this.room.restorePlayerToThaisCity(player, 32369, 32241, 7);

      try {
        const dbChar = await persistenceManager.loadCharacter(player.characterId);
        if (dbChar) {
          player.level = dbChar.level;
          player.experience = Number(dbChar.experience);
          player.hp = dbChar.health;
          player.maxHp = dbChar.maxHealth;
          player.mp = dbChar.mana;
          player.maxMp = dbChar.maxMana;
          player.capacity = dbChar.capacity;
          (player as any).saveVersion = (dbChar as any).saveVersion ?? 1;
          player.posX = dbChar.posX ?? 32369;
          player.posY = dbChar.posY ?? 32241;
          player.posZ = dbChar.posZ ?? 7;
          if (Array.isArray((dbChar as any).skills)) {
            (player as any).skills = (dbChar as any).skills.map((s: any) => ({
              skillId: s.skillId,
              skillName: s.skillName,
              value: s.value,
              tries: Number(s.tries ?? 0),
            }));
          }
          if ((dbChar as any).bestiaryKills) {
            (player as any).bestiaryKills = (dbChar as any).bestiaryKills;
          }
          if ((dbChar as any).trackedBestiaryId) {
            player.trackedBestiaryId = (dbChar as any).trackedBestiaryId;
          }
          if (typeof (dbChar as any).bossPoints === 'number') {
            (player as any).bossPoints = (dbChar as any).bossPoints;
          }
          if ((dbChar as any).avatarId) {
            player.avatarId = (dbChar as any).avatarId;
          }
        }
      } catch (err: any) {
        console.warn(`[ThaisCityRoom] Error syncing state from DB on player:returnToCity for ${player.characterId}:`, err?.message || err);
      }

      this.room.playerExpSync.set(client.sessionId, { lastSyncTime: Date.now(), lastExperience: player.experience });
    });

    this.room.onMessage('player:setInHunt', async (client, data: { inHunt: boolean; huntId?: string }) => {
      const player = this.room.state.players.get(client.sessionId);
      if (player) {
        const wantsHunt = Boolean(data.inHunt);
        const effectiveHuntId = data.huntId || player.lastHuntId || 'rat-cellars';
        if (data.huntId) {
          player.lastHuntId = data.huntId;
        }
        if (wantsHunt && !canEnterHunt(player.staminaMinutes)) {
          this.room.restorePlayerToThaisCity(player, 32369, 32241, 7);
          client.send('stamina:empty', {
            message: 'Sua estamina acabou! Treine na zona de treinamento ou descanse para recuperar.',
          });
          return;
        }

        if (!wantsHunt) {
          this.room.restorePlayerToThaisCity(player, 32369, 32241, 7);
          if (player.characterId) {
            try {
              const dbChar = await persistenceManager.loadCharacter(player.characterId);
              if (dbChar) {
                player.level = dbChar.level;
                player.experience = Number(dbChar.experience);
                player.hp = dbChar.health;
                player.maxHp = dbChar.maxHealth;
                player.mp = dbChar.mana;
                player.maxMp = dbChar.maxMana;
                player.capacity = dbChar.capacity;
                (player as any).saveVersion = (dbChar as any).saveVersion ?? 1;
                if (Array.isArray((dbChar as any).skills)) {
                  (player as any).skills = (dbChar as any).skills.map((s: any) => ({
                    skillId: s.skillId,
                    skillName: s.skillName,
                    value: s.value,
                    tries: Number(s.tries ?? 0),
                  }));
                }
              }
            } catch {}
          }
        } else {
          this.room.updatePlayerHuntContext(player, true, effectiveHuntId);
          if (effectiveHuntId === 'pvp-arena') {
            player.posX = 33136;
            player.posY = 32969;
            player.posZ = 8;
          } else {
            const entrance = getHuntWorldEntrance(effectiveHuntId, this.room.gameContent);
            player.posX = entrance.worldPosition.x;
            player.posY = entrance.worldPosition.y;
            player.posZ = entrance.worldPosition.z;
          }
          player.isWalking = false;
          player.lastStepTime = 0;
        }
        if (typeof client.send === 'function') {
          client.send('server:huntContextReady', { isHunting: wantsHunt, huntId: effectiveHuntId });
        }
      }
    });

    this.room.onMessage('player:toggleAutoIdle', (client, data?: { enabled?: boolean; huntId?: string }) => {
      const player = this.room.state.players.get(client.sessionId);
      if (player) {
        if (typeof data?.enabled === 'boolean') {
          player.isAutoIdle = data.enabled;
        } else {
          player.isAutoIdle = !player.isAutoIdle;
        }
        if (data?.huntId) {
          player.lastHuntId = data.huntId;
        }
        if (!player.inHunt && !ServerCharacterContextRegistry.isHunting(player.characterId)) {
          void persistenceManager.saveCharacter(player);
        }
        client.send('autoIdle:toggled', {
          isAutoIdle: player.isAutoIdle,
          lastHuntId: player.lastHuntId,
        });
      }
    });

    this.room.onMessage('player:setLastHuntId', (client, data: { huntId: string }) => {
      const player = this.room.state.players.get(client.sessionId);
      if (player && data?.huntId) {
        player.lastHuntId = data.huntId;
        if (!player.inHunt && !ServerCharacterContextRegistry.isHunting(player.characterId)) {
          void persistenceManager.saveCharacter(player);
        }
      }
    });

    this.room.onMessage('player:syncProgress', (client, data: { level?: number; experience?: number; hp?: number; mp?: number; isHunting?: boolean; lastHuntId?: string }) => {
      const player = this.room.state.players.get(client.sessionId);
      if (player) {
        if (typeof data.experience === 'number') {
          if (data.experience > player.experience) {
            const deltaExp = data.experience - player.experience;
            const now = Date.now();
            const charKey = player.characterId || client.sessionId;
            const hasHunt = Boolean(
              player.inHunt ||
              data?.isHunting ||
              data?.lastHuntId ||
              (player.characterId && ServerCharacterContextRegistry.isHunting(player.characterId))
            );
            const check = XpRateLimiter.consume(charKey, deltaExp, now, { isHunting: hasHunt });

            if (!check.allowed) {
              console.warn(
                `[Security][AUDIT_TELEMETRY] Suspicious XP gain via WebSocket for player ${player.name} (${player.characterId}): +${deltaExp} XP exceeds continuous time budget (max allowed: +${check.maxAllowed}).`
              );
              if (process.env.STRICT_SECURITY === 'true') {
                return;
              }
            }
            player.experience = data.experience;
            player.level = Math.max(1, levelForExperience(data.experience));
            if (player.characterId) {
              XpRateLimiter.recordAuthorizedExp(player.characterId, data.experience);
            }
          }
        }
        if (typeof data.hp === 'number') {
          player.hp = Math.max(0, Math.min(data.hp, player.maxHp));
        }
        if (typeof data.mp === 'number') {
          player.mp = Math.max(0, Math.min(data.mp, player.maxMp));
        }
        if (typeof (data as any).equippedRing === 'number') {
          player.equippedRing = (data as any).equippedRing;
        }

        // Phase 254: Authoritative Hunt vs City state locking to eliminate ghost clones in Thais
        if (data.isHunting === true || data.lastHuntId) {
          player.inHunt = true;
          player.posZ = 8; // Offset out of Thais floor 7 viewport to guarantee zero spatial collision/render
          if (player.characterId) {
            ServerCharacterContextRegistry.setActivity(player.characterId, {
              isHunting: true,
              huntId: data.lastHuntId || player.lastHuntId || 'active-hunt',
            });
          }
        } else if (data.isHunting === false) {
          player.inHunt = false;
          if (player.posZ > 7) {
            player.posZ = 7;
          }
          if (player.characterId) {
            ServerCharacterContextRegistry.setActivity(player.characterId, {
              isHunting: false,
            });
          }
        }

        // Phase 260: Broadcast updated party snapshot so party members immediately see live HP, MP and Level changes
        const leaderId = this.room.playerPartyLeader.get(client.sessionId);
        if (leaderId) {
          this.broadcastPartySync(leaderId);
        }
      }
    });

    this.room.onMessage('player:setAfk', (client, data: { isAfk: boolean }) => {
      const player = this.room.state.players.get(client.sessionId);
      if (player) {
        player.isAfk = Boolean(data?.isAfk);
      }
    });

    this.room.onMessage('player:setAvatar', (client, data: { avatarId: number }) => {
      const player = this.room.state.players.get(client.sessionId);
      if (player && typeof data?.avatarId === 'number') {
        player.avatarId = Math.max(1, Math.min(5, Math.floor(data.avatarId)));
        if (!player.inHunt && !ServerCharacterContextRegistry.isHunting(player.characterId)) {
          void persistenceManager.saveCharacter(player);
        }
      }
    });

    this.room.onMessage('bestiary:track', (client, data: { monsterId: string }) => {
      const player = this.room.state.players.get(client.sessionId);
      if (player) {
        player.trackedBestiaryId = data?.monsterId || '';
        (player as any).trackedBestiaryId = player.trackedBestiaryId;
        if (!player.inHunt && !ServerCharacterContextRegistry.isHunting(player.characterId)) {
          void persistenceManager.saveCharacter(player);
        }
      }
    });

    this.room.onMessage('bestiary:setKills', (client, data: { kills: Record<string, number> }) => {
      const player = this.room.state.players.get(client.sessionId);
      if (player && data?.kills && typeof data.kills === 'object') {
        const current = (player as any).bestiaryKills || {};
        const updated = { ...current };
        for (const [k, v] of Object.entries(data.kills)) {
          if (typeof v === 'number') {
            updated[k] = Math.max(Number(current[k] || 0), v);
          }
        }
        (player as any).bestiaryKills = updated;
        if (!player.inHunt && !ServerCharacterContextRegistry.isHunting(player.characterId)) {
          void persistenceManager.saveCharacter(player);
        }
      }
    });
  }

  public broadcastPartySync(leaderId: string): void {
    const party = this.room.parties.get(leaderId);
    if (!party) return;

    const membersInfo = party.memberSessionIds.map((sessionId) => {
      const p = this.room.state.players.get(sessionId);
      return {
        sessionId,
        characterId: p?.characterId || '',
        name: p?.name || 'Unknown',
        vocation: p?.vocationName || 'Knight',
        vocationId: p?.vocationId ?? 1,
        level: p?.level || 1,
        hp: p?.hp || 100,
        maxHp: p?.maxHp || 100,
        x: p?.posX || 32369,
        y: p?.posY || 32241,
        z: p?.posZ || 7,
        isLeader: sessionId === party.leaderSessionId,
        outfit: p?.outfit || 'Warrior',
        outfitLookType: p?.outfitLookType ?? 128,
        outfitAddons: p?.outfitAddons ?? 0,
        gender: (p as any)?.gender || 'male',
        outfitColors: {
          head: p?.outfitHead ?? 0,
          primary: p?.outfitBody ?? 0,
          secondary: p?.outfitLegs ?? 0,
          detail: p?.outfitFeet ?? 0,
        },
        mount: p?.mount || '',
        mountActive: Boolean(p?.mountActive),
        inHunt: Boolean(p?.inHunt),
      };
    });

    for (const memberId of party.memberSessionIds) {
      const memberClient = this.room.clients.find((c) => c.sessionId === memberId);
      if (memberClient) {
        memberClient.send('party:sync', {
          leaderSessionId: party.leaderSessionId,
          leaderName: party.leaderName,
          members: membersInfo,
        });
      }
    }
  }

  public handlePlayerLeaveParty(sessionId: string): void {
    let leaderId = this.room.playerPartyLeader.get(sessionId);
    if (!leaderId) {
      for (const [lId, p] of this.room.parties.entries()) {
        if (p.memberSessionIds.includes(sessionId)) {
          leaderId = lId;
          break;
        }
      }
    }

    this.room.playerPartyLeader.delete(sessionId);

    const leavingClient = this.room.clients.find((c) => c.sessionId === sessionId);
    if (leavingClient) {
      leavingClient.send('party:left', {});
    }

    if (!leaderId) return;
    const party = this.room.parties.get(leaderId);
    if (party) {
      if (party.leaderSessionId === sessionId) {
        // Líder saiu: Se houver outros membros, transfere a liderança para o próximo da fila!
        const remaining = party.memberSessionIds.filter((id) => id !== sessionId);
        if (remaining.length > 0) {
          const newLeaderId = remaining[0];
          const newLeaderPlayer = this.room.state.players.get(newLeaderId);
          party.leaderSessionId = newLeaderId;
          party.leaderName = newLeaderPlayer?.name || 'Novo Líder';
          party.memberSessionIds = remaining;

          this.room.parties.delete(leaderId);
          this.room.parties.set(newLeaderId, party);

          for (const memId of remaining) {
            this.room.playerPartyLeader.set(memId, newLeaderId);
          }

          this.broadcastPartySync(newLeaderId);

          const newLeaderClient = this.room.clients.find((c) => c.sessionId === newLeaderId);
          if (newLeaderClient) {
            newLeaderClient.send('party:notification', {
              type: 'sent',
              message: 'O líder anterior saiu do grupo. Você agora é o novo líder da party!',
            });
          }
        } else {
          this.room.parties.delete(leaderId);
        }
      } else {
        // Regular member left
        party.memberSessionIds = party.memberSessionIds.filter((id) => id !== sessionId);
        this.broadcastPartySync(leaderId);
      }
    }
  }
}
