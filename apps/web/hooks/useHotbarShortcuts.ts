import { useEffect } from 'react';

export interface UseHotbarShortcutsOptions {
  enabled?: boolean;
  onHotbarAction: (slotIndex: number) => void;
  onTurn?: (direction: 'north' | 'south' | 'east' | 'west') => void;
  onOpenOutfit?: () => void;
  onToggleMount?: () => void;
  onEscape?: () => void;
  isInputFocused?: () => boolean;
}

export function useHotbarShortcuts({
  enabled = true,
  onHotbarAction,
  onTurn,
  onOpenOutfit,
  onToggleMount,
  onEscape,
  isInputFocused,
}: UseHotbarShortcutsOptions): void {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if (isInputFocused && isInputFocused()) {
        return;
      }

      // Escape
      if (e.key === 'Escape') {
        if (onEscape) {
          onEscape();
        }
        return;
      }

      // Ctrl + Direcionais / WASD: Girar o corpo no próprio eixo sem locomoção
      const isTurnArrow =
        e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight' ||
        e.key === 'w' || e.key === 'W' || e.key === 's' || e.key === 'S' ||
        e.key === 'a' || e.key === 'A' || e.key === 'd' || e.key === 'D';

      if ((e.ctrlKey || e.metaKey) && isTurnArrow && onTurn) {
        e.preventDefault();
        const turnDir: 'north' | 'south' | 'east' | 'west' =
          (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') ? 'north' :
          (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') ? 'south' :
          (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') ? 'west' : 'east';
        onTurn(turnDir);
        return;
      }

      // Hotkey U: Abrir customização de outfit / aparência
      if ((e.key === 'u' || e.key === 'U') && !e.ctrlKey && !e.altKey && !e.metaKey && onOpenOutfit) {
        onOpenOutfit();
        return;
      }

      // Hotkey Ctrl+R: Montar / Desmontar
      if ((e.key === 'r' || e.key === 'R') && (e.ctrlKey || e.metaKey) && onToggleMount) {
        e.preventDefault();
        onToggleMount();
        return;
      }

      // F1 a F12: Disparo de ações da hotbar (slots 0 a 11)
      if (e.key.startsWith('F') && e.key.length <= 3) {
        const fNum = parseInt(e.key.slice(1), 10);
        if (fNum >= 1 && fNum <= 12) {
          e.preventDefault();
          onHotbarAction(fNum - 1);
        }
      } else if (e.key >= '0' && e.key <= '9' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // Teclas 1-9 e 0: Disparo de ações da barra secundária (slots 10 a 19)
        const keyNum = e.key === '0' ? 9 : parseInt(e.key, 10) - 1;
        onHotbarAction(10 + keyNum);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, onHotbarAction, onTurn, onOpenOutfit, onToggleMount, onEscape, isInputFocused]);
}
