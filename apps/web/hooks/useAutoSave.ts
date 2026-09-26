import { useEffect, useRef, useCallback } from 'react';

export interface UseAutoSaveOptions {
  enabled?: boolean;
  intervalMs?: number;
  throttleMs?: number;
  onSave: (force?: boolean) => Promise<boolean>;
}

export interface UseAutoSaveReturn {
  triggerSave: (force?: boolean) => Promise<boolean>;
  isSaving: () => boolean;
  getLastSaveTime: () => number;
}

export function useAutoSave({
  enabled = true,
  intervalMs = 20000,
  throttleMs = 10000,
  onSave,
}: UseAutoSaveOptions): UseAutoSaveReturn {
  const isSavingRef = useRef<boolean>(false);
  const lastSaveTimeRef = useRef<number>(0);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const triggerSave = useCallback(
    async (force = false): Promise<boolean> => {
      const now = Date.now();
      if (!force && lastSaveTimeRef.current > 0 && now - lastSaveTimeRef.current < throttleMs) {
        return false;
      }

      if (isSavingRef.current) {
        let waited = 0;
        while (isSavingRef.current && waited < 4000) {
          await new Promise((r) => setTimeout(r, 100));
          waited += 100;
        }
        if (isSavingRef.current) return false;
      }

      isSavingRef.current = true;
      try {
        const success = await onSaveRef.current(force);
        if (success) {
          lastSaveTimeRef.current = Date.now();
        }
        return success;
      } catch (err) {
        console.warn('[useAutoSave] Erro ao persistir progresso:', err);
        return false;
      } finally {
        isSavingRef.current = false;
      }
    },
    [throttleMs]
  );

  // Periodic auto-save loop
  useEffect(() => {
    if (!enabled) return;

    const timer = setInterval(() => {
      void triggerSave(false);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [enabled, intervalMs, triggerSave]);

  // Page lifecycle listeners (save on tab hide and window close)
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        void triggerSave(true);
      }
    };

    const handleBeforeUnload = () => {
      void triggerSave(true);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [enabled, triggerSave]);

  return {
    triggerSave,
    isSaving: () => isSavingRef.current,
    getLastSaveTime: () => lastSaveTimeRef.current,
  };
}
