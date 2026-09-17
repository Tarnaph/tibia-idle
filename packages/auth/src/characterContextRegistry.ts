/**
 * ServerCharacterContextRegistry: Registro autoritativo do contexto de jogo do personagem no servidor.
 * Mantém o estado real verificado pelo Colyseus / motor de jogo (ex: se o jogador está em caçada ativa ou na cidade),
 * prevenindo que rotas HTTP ou validações confiem em flags arbitrárias enviadas pelo cliente.
 */

export interface CharacterActivityContext {
  isHunting: boolean;
  huntId?: string;
  lastUpdated: number;
}

export class ServerCharacterContextRegistry {
  private static registry = new Map<string, CharacterActivityContext>();

  public static setActivity(
    characterId: string,
    activity: { isHunting: boolean; huntId?: string }
  ): void {
    if (!characterId) return;
    this.registry.set(characterId, {
      isHunting: Boolean(activity.isHunting),
      huntId: activity.huntId,
      lastUpdated: Date.now(),
    });
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
    if (!characterId) return false;
    const local = this.isHunting(characterId);
    if (local) return true;

    // Check Colyseus server endpoint if running in a separate process
    try {
      const colyseusPort = process.env.COLYSEUS_PORT || 2567;
      const res = await fetch(`http://127.0.0.1:${colyseusPort}/api/character-context/${encodeURIComponent(characterId)}`, {
        signal: AbortSignal.timeout(200),
      });
      if (res.ok) {
        const data = (await res.json()) as any;
        if (data && typeof data.isHunting === 'boolean') {
          this.setActivity(characterId, { isHunting: data.isHunting, huntId: data.huntId });
          return data.isHunting;
        }
      }
    } catch {}

    return false;
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
}
