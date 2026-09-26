import { Client } from '@colyseus/core';
import { prisma } from '../../../../database/src';
import { persistenceManager } from '../../persistence/PrismaPersistenceManager';
import { getPvPTierInfo, checkRankPromotion, PVP_ARENA_SPAWNS } from '../../../../domain/src';
import type { ThaisCityRoom } from '../ThaisCityRoom';

export interface PvPQueueEntry {
  sessionId: string;
  characterId: string;
  name: string;
  level: number;
  vocation: string;
  outfit?: string;
  outfitLookType?: number;
  hp?: number;
  maxHp?: number;
  attackPower?: number;
  defensePower?: number;
  armorPower?: number;
  elo: number;
  joinedAt: number;
  timeoutRef: any;
}

export interface ActiveDuel {
  duelId: string;
  player1: { sessionId: string; characterId: string; name: string; spawn: { id: number; x: number; y: number; z: number } };
  player2: { sessionId: string; characterId: string; name: string; spawn: { id: number; x: number; y: number; z: number } };
  createdAt: number;
}

export class CityPvPHandler {
  public pvpQueue = new Map<string, PvPQueueEntry>();
  public activeDuels = new Map<string, ActiveDuel>();

  constructor(private room: ThaisCityRoom) {}

  public register(): void {
    this.room.onMessage('pvp:queue:join', async (client, data?: { characterId?: string }) => {
      const player = this.room.state.players.get(client.sessionId);
      if (!player) return;
      const charId = data?.characterId || player.characterId;
      if (!charId) return;

      // Se já estava na fila, cancela o timeout anterior
      if (this.pvpQueue.has(client.sessionId)) {
        const existing = this.pvpQueue.get(client.sessionId);
        if (existing?.timeoutRef) clearTimeout(existing.timeoutRef);
        this.pvpQueue.delete(client.sessionId);
      }

      // Procura outro jogador ONLINE na fila:
      // 1. Melhor match: diferença de rank <= 250 pontos
      // 2. Match expandido: diferença <= 500 pontos
      // 3. Match de fallback: qualquer outro jogador disponível na fila
      let matchedSessionId: string | null = null;
      const playerElo = typeof player.pvpElo === 'number' ? player.pvpElo : ((data as any)?.elo ?? 0);

      // Prioridade 1: rank próximo (<= 250)
      for (const [sId, entry] of this.pvpQueue.entries()) {
        if (sId === client.sessionId || entry.characterId === charId) continue;
        const oppClient = this.room.clients.find((c) => c.sessionId === sId);
        if (!oppClient) {
          if (entry.timeoutRef) clearTimeout(entry.timeoutRef);
          this.pvpQueue.delete(sId);
          continue;
        }
        const diff = Math.abs(entry.elo - playerElo);
        if (diff <= 250) {
          matchedSessionId = sId;
          break;
        }
      }

      // Prioridade 2: rank moderado (<= 500)
      if (!matchedSessionId) {
        for (const [sId, entry] of this.pvpQueue.entries()) {
          if (sId === client.sessionId || entry.characterId === charId) continue;
          const oppClient = this.room.clients.find((c) => c.sessionId === sId);
          if (!oppClient) {
            if (entry.timeoutRef) clearTimeout(entry.timeoutRef);
            this.pvpQueue.delete(sId);
            continue;
          }
          const diff = Math.abs(entry.elo - playerElo);
          if (diff <= 500) {
            matchedSessionId = sId;
            break;
          }
        }
      }

      // Prioridade 3: Fallback de pareamento imediato
      if (!matchedSessionId) {
        for (const [sId, entry] of this.pvpQueue.entries()) {
          if (sId === client.sessionId || entry.characterId === charId) continue;
          const oppClient = this.room.clients.find((c) => c.sessionId === sId);
          if (!oppClient) {
            if (entry.timeoutRef) clearTimeout(entry.timeoutRef);
            this.pvpQueue.delete(sId);
            continue;
          }
          matchedSessionId = sId;
          break;
        }
      }

      if (matchedSessionId) {
        const oppEntry = this.pvpQueue.get(matchedSessionId)!;
        if (oppEntry.timeoutRef) clearTimeout(oppEntry.timeoutRef);
        this.pvpQueue.delete(matchedSessionId);

        const oppClient = this.room.clients.find((c) => c.sessionId === matchedSessionId)!;
        const oppPlayer = this.room.state.players.get(matchedSessionId)!;

        const duelId = `duel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const isPlayerSpawn1 = Math.random() < 0.5;
        const spawn1 = isPlayerSpawn1 ? PVP_ARENA_SPAWNS[0] : PVP_ARENA_SPAWNS[1];
        const spawn2 = isPlayerSpawn1 ? PVP_ARENA_SPAWNS[1] : PVP_ARENA_SPAWNS[0];

        this.activeDuels.set(duelId, {
          duelId,
          player1: { sessionId: client.sessionId, characterId: charId, name: player.name, spawn: spawn1 },
          player2: { sessionId: matchedSessionId, characterId: oppEntry.characterId, name: oppEntry.name, spawn: spawn2 },
          createdAt: Date.now(),
        });

        client.send('pvp:match:found', {
          duelId,
          opponent: {
            sessionId: oppPlayer.id,
            characterId: oppPlayer.characterId,
            name: oppPlayer.name,
            vocation: oppPlayer.vocationName,
            level: oppPlayer.level,
            outfit: oppPlayer.outfit,
            outfitLookType: oppPlayer.outfitLookType,
            outfitColors: {
              head: oppPlayer.outfitHead,
              primary: oppPlayer.outfitBody,
              secondary: oppPlayer.outfitLegs,
              detail: oppPlayer.outfitFeet,
            },
            addons: oppPlayer.outfitAddons,
            gender: oppPlayer.gender,
            mount: oppPlayer.mount,
            mountActive: oppPlayer.mountActive,
            hp: oppPlayer.hp || oppPlayer.maxHp || 100,
            maxHp: oppPlayer.maxHp || 100,
            attackPower: oppPlayer.attackPower || 20,
            defensePower: oppPlayer.defensePower || 10,
            armorPower: oppPlayer.armorPower || 10,
            elo: oppPlayer.pvpElo ?? oppEntry.elo,
            tier: oppPlayer.pvpTier || 'Iniciante',
            displaySkull: oppPlayer.displaySkull,
            spawn: spawn1,
          },
          spawn: spawn1,
        });

        oppClient.send('pvp:match:found', {
          duelId,
          opponent: {
            sessionId: player.id,
            characterId: player.characterId,
            name: player.name,
            vocation: player.vocationName,
            level: player.level,
            outfit: player.outfit,
            outfitLookType: player.outfitLookType,
            outfitColors: {
              head: player.outfitHead,
              primary: player.outfitBody,
              secondary: player.outfitLegs,
              detail: player.outfitFeet,
            },
            addons: player.outfitAddons,
            gender: player.gender,
            mount: player.mount,
            mountActive: player.mountActive,
            hp: player.hp || player.maxHp || 100,
            maxHp: player.maxHp || 100,
            attackPower: player.attackPower || 20,
            defensePower: player.defensePower || 10,
            armorPower: player.armorPower || 10,
            elo: player.pvpElo ?? playerElo,
            tier: player.pvpTier || 'Iniciante',
            displaySkull: player.displaySkull,
            spawn: spawn2,
          },
          spawn: spawn2,
        });
      } else {
        // Enfileira o jogador e define timeout de 30 segundos
        const timeoutSeconds = 30;
        const timeoutRef = setTimeout(() => {
          if (this.pvpQueue.has(client.sessionId)) {
            this.pvpQueue.delete(client.sessionId);
            client.send('pvp:queue:timeout', {
              message: 'Nenhum oponente online encontrado no momento. Tente novamente mais tarde!',
            });
          }
        }, timeoutSeconds * 1000);

        this.pvpQueue.set(client.sessionId, {
          sessionId: client.sessionId,
          characterId: charId,
          name: player.name,
          level: player.level,
          vocation: player.vocationName,
          outfit: player.outfit,
          outfitLookType: player.outfitLookType,
          hp: player.hp,
          maxHp: player.maxHp,
          attackPower: player.attackPower,
          defensePower: player.defensePower,
          armorPower: player.armorPower,
          elo: playerElo,
          joinedAt: Date.now(),
          timeoutRef,
        });

        client.send('pvp:queue:searching', {
          timeoutSeconds,
          playerElo,
        });
      }
    });

    this.room.onMessage('pvp:queue:leave', (client) => {
      const entry = this.pvpQueue.get(client.sessionId);
      if (entry) {
        if (entry.timeoutRef) clearTimeout(entry.timeoutRef);
        this.pvpQueue.delete(client.sessionId);
      }
      client.send('pvp:queue:left', { success: true });
    });

    this.room.onMessage('player:toggleSkull', async (client, data?: { displaySkull?: boolean }) => {
      const player = this.room.state.players.get(client.sessionId);
      if (!player) return;
      const nextVal = typeof data?.displaySkull === 'boolean' ? data.displaySkull : !player.displaySkull;
      player.displaySkull = nextVal;
      if (player.characterId) {
        try {
          await (prisma as any).character.update({
            where: { id: player.characterId },
            data: { displaySkull: nextVal },
          });
        } catch (err: any) {
          console.warn('[ThaisCityRoom] Erro ao persistir displaySkull:', err?.message || err);
        }
      }
    });

    this.room.onMessage('pvp:duel:complete', async (client, data: { duelId: string; winnerCharacterId: string; loserCharacterId: string }) => {
      const duel = this.activeDuels.get(data.duelId);
      if (!duel) return;
      this.activeDuels.delete(data.duelId);

      try {
        const winner = await persistenceManager.loadCharacter(data.winnerCharacterId);
        const loser = await persistenceManager.loadCharacter(data.loserCharacterId);

        let promoData: any = null;
        let newWinnerPoints = 0;

        if (winner) {
          const oldPoints = (winner as any).pvpElo ?? 0;
          newWinnerPoints = oldPoints + 20; // +20 pontos fixos
          const tierInfo = getPvPTierInfo(newWinnerPoints);
          promoData = checkRankPromotion(oldPoints, newWinnerPoints);

          await prisma.character.update({
            where: { id: winner.id },
            data: {
              pvpElo: newWinnerPoints,
              pvpTier: tierInfo.tier,
              pvpWins: ((winner as any).pvpWins ?? 0) + 1,
              arenaCoins: ((winner as any).arenaCoins ?? 0) + 15,
              displaySkull: newWinnerPoints >= 250 ? true : (winner as any).displaySkull,
            },
          });

          const winnerPlayer = Array.from(this.room.state.players.values()).find((p) => p.characterId === data.winnerCharacterId);
          if (winnerPlayer) {
            winnerPlayer.pvpElo = newWinnerPoints;
            winnerPlayer.pvpTier = tierInfo.tier;
            if (newWinnerPoints >= 250) winnerPlayer.displaySkull = true;
          }
        }

        if (loser) {
          await prisma.character.update({
            where: { id: loser.id },
            data: {
              pvpLosses: ((loser as any).pvpLosses ?? 0) + 1,
              arenaCoins: ((loser as any).arenaCoins ?? 0) + 5,
            },
          });
        }

        // Restaura ambos os participantes imediatamente para visibilidade total em Thais
        const winnerPlayer = Array.from(this.room.state.players.values()).find((p) => p.characterId === data.winnerCharacterId);
        const loserPlayer = Array.from(this.room.state.players.values()).find((p) => p.characterId === data.loserCharacterId);
        if (winnerPlayer) {
          this.room.restorePlayerToThaisCity(winnerPlayer, 32369, 32241, 7);
        }
        if (loserPlayer) {
          this.room.restorePlayerToThaisCity(loserPlayer, 32369, 32241, 7);
        }

        // Notifica ambos os combatentes sobre o encerramento do duelo
        const p1Client = this.room.clients.find((c) => c.sessionId === duel.player1.sessionId);
        const p2Client = this.room.clients.find((c) => c.sessionId === duel.player2.sessionId);

        const endPayload = {
          duelId: data.duelId,
          winnerCharacterId: data.winnerCharacterId,
          pointsAwarded: 20,
          promotion: promoData,
          returnCoords: { x: 32369, y: 32241, z: 7 }, // Thais Temple
        };

        if (p1Client) p1Client.send('pvp:duel:ended', endPayload);
        if (p2Client) p2Client.send('pvp:duel:ended', endPayload);
      } catch (err: any) {
        console.error('[ThaisCityRoom] Erro ao persistir resultado do duelo PvP:', err?.message || err);
      }
    });
  }
}
