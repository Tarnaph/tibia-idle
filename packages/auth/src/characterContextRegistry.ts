/**
 * ServerCharacterContextRegistry: Registro autoritativo do contexto de jogo do personagem no servidor.
 * Mantém o estado real verificado pelo Colyseus / motor de jogo (ex: se o jogador está em caçada ativa ou na cidade),
 * prevenindo que rotas HTTP ou validações confiem em flags arbitrárias enviadas pelo cliente.
 */

export interface CharacterActivityContext {
  isHunting: boolean;
  huntId?: string;
  lastUpdated: number;
  activeSessionId?: string;
  lastActiveSessionId?: string;
}

export interface CharacterContextQueryResult {
  isHunting: boolean;
  huntId?: string;
  activeSessionId?: string;
  lastActiveSessionId?: string;
  isServiceAvailable: boolean;
  isContextKnown: boolean;
}

export class ServerCharacterContextRegistry {
  private static registry = new Map<string, CharacterActivityContext>();
  private static isAuthoritativeSource: boolean = false;

  public static setAuthoritativeSource(authoritative: boolean): void {
    this.isAuthoritativeSource = authoritative;
  }

  public static getIsAuthoritativeSource(): boolean {
    return this.isAuthoritativeSource;
  }

  public static setActivity(
    characterId: string,
    activity: { isHunting: boolean; huntId?: string; activeSessionId?: string; lastActiveSessionId?: string }
  ): void {
    if (!characterId) return;
    const existing = this.registry.get(characterId);
    const lastSession = activity.lastActiveSessionId ?? activity.activeSessionId ?? existing?.lastActiveSessionId ?? existing?.activeSessionId;
    this.registry.set(characterId, {
      isHunting: Boolean(activity.isHunting),
      huntId: activity.huntId ?? existing?.huntId,
      lastUpdated: Date.now(),
      activeSessionId: activity.activeSessionId ?? existing?.activeSessionId,
      lastActiveSessionId: lastSession,
    });
  }

  public static setActiveSession(characterId: string, sessionId: string): void {
    if (!characterId) return;
    const existing = this.registry.get(characterId);
    this.registry.set(characterId, {
      isHunting: existing?.isHunting ?? false,
      huntId: existing?.huntId,
      lastUpdated: Date.now(),
      activeSessionId: sessionId,
      lastActiveSessionId: sessionId,
    });
  }

  public static setPlayerOffline(characterId: string): void {
    if (!characterId) return;
    const existing = this.registry.get(characterId);
    if (existing) {
      this.registry.set(characterId, {
        isHunting: existing.isHunting,
        huntId: existing.huntId,
        lastUpdated: Date.now(),
        activeSessionId: undefined,
        lastActiveSessionId: existing.activeSessionId || existing.lastActiveSessionId,
      });
    }
  }

  public static getActiveSession(characterId: string): string | undefined {
    if (!characterId) return undefined;
    return this.registry.get(characterId)?.activeSessionId;
  }

  public static getLastActiveSession(characterId: string): string | undefined {
    if (!characterId) return undefined;
    const ctx = this.registry.get(characterId);
    return ctx?.lastActiveSessionId ?? ctx?.activeSessionId;
  }

  public static async getContextAsync(characterId: string): Promise<CharacterContextQueryResult> {
    if (!characterId) {
      return { isHunting: false, isServiceAvailable: true, isContextKnown: false };
    }

    const local = this.registry.get(characterId);

    if (this.isAuthoritativeSource) {
      return {
        isHunting: local?.isHunting ?? false,
        huntId: local?.huntId,
        activeSessionId: local?.activeSessionId,
        lastActiveSessionId: local?.lastActiveSessionId ?? local?.activeSessionId,
        isServiceAvailable: true,
        isContextKnown: local !== undefined,
      };
    }

    try {
      const colyseusPort = process.env.COLYSEUS_PORT || 2567;
      const secret = process.env.INTERNAL_SERVICE_KEY || 'cavebound_internal_core_secret_v1';
      const res = await fetch(`http://127.0.0.1:${colyseusPort}/api/character-context/${encodeURIComponent(characterId)}`, {
        headers: { 'x-internal-secret': secret },
        signal: AbortSignal.timeout(400),
      });

      if (res.ok) {
        const data = (await res.json()) as any;
        const activeSessionId = typeof data.activeSessionId === 'string' ? data.activeSessionId : undefined;
        const lastActiveSessionId =
          typeof data.lastActiveSessionId === 'string'
            ? data.lastActiveSessionId
            : activeSessionId || local?.lastActiveSessionId || local?.activeSessionId;
        const isContextKnown = typeof data.isContextKnown === 'boolean' ? data.isContextKnown : true;

        if (isContextKnown) {
          this.setActivity(characterId, {
            isHunting: Boolean(data.isHunting),
            huntId: data.huntId,
            activeSessionId,
            lastActiveSessionId,
          });
        }

        return {
          isHunting: Boolean(data.isHunting),
          huntId: data.huntId,
          activeSessionId,
          lastActiveSessionId,
          isServiceAvailable: true,
          isContextKnown,
        };
      }
    } catch {
      // Colyseus service unreachable or timed out
    }

    // Context service is unavailable - return cached local state but flag service availability and unknown context
    return {
      isHunting: local?.isHunting ?? false,
      huntId: local?.huntId,
      activeSessionId: local?.activeSessionId,
      lastActiveSessionId: local?.lastActiveSessionId ?? local?.activeSessionId,
      isServiceAvailable: false,
      isContextKnown: false,
    };
  }

  public static async getActiveSessionAsync(characterId: string): Promise<string | undefined> {
    const ctx = await this.getContextAsync(characterId);
    return ctx.activeSessionId;
  }

  public static getActivity(characterId: string): CharacterActivityContext | undefined {
    if (!characterId) return undefined;
    return this.registry.get(characterId);
  }

  public static isHunting(characterId: string): boolean {
    if (!characterId) return false;
    const ctx = this.registry.get(characterId);
    return ctx ? ctx.isHunting : false;
  }

  public static async isHuntingAsync(characterId: string): Promise<boolean> {
    const ctx = await this.getContextAsync(characterId);
    return ctx.isHunting;
  }

  public static clear(characterId: string): void {
    if (!characterId) return;
    this.registry.delete(characterId);
  }

  public static clearAll(): void {
    this.registry.clear();
  }

  public static getActiveCount(): number {
    return this.registry.size;
  }

  public static async getUniqueOnlineAccountsCountAsync(): Promise<number> {
    try {
      const colyseusPort = process.env.COLYSEUS_PORT || 2567;
      const res = await fetch(`http://127.0.0.1:${colyseusPort}/api/online-count`);
      if (res.ok) {
        const data = (await res.json()) as any;
        if (typeof data.count === 'number' && data.count > 0) return data.count;
      }
    } catch {}
    return 1;
  }
}
