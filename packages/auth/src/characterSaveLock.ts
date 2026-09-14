/**
 * In-memory serialization lock manager per characterId.
 * Guarantees that concurrent saves (e.g. rapid HTTP save and Colyseus WebSocket autosave)
 * for the same character run sequentially in an atomic chain, preventing dirty reads and SQLite lock contention.
 */
export class CharacterSaveLockManager {
  private static locks = new Map<string, Promise<any>>();

  static async withLock<T>(characterId: string, fn: () => Promise<T>): Promise<T> {
    if (!characterId) return fn();

    const previousLock = this.locks.get(characterId) || Promise.resolve();
    let releaseLock!: () => void;
    const currentLock = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    const chainPromise = previousLock.then(() => currentLock);
    this.locks.set(characterId, chainPromise);

    try {
      await previousLock;
      return await fn();
    } finally {
      releaseLock();
      if (this.locks.get(characterId) === chainPromise) {
        this.locks.delete(characterId);
      }
    }
  }

  static getActiveLockCount(): number {
    return this.locks.size;
  }
}
