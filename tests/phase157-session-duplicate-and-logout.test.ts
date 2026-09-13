import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Phase 157 - Cross-Tab Active Session Detection & Clean Logout/Switch Resolution', () => {
  const authModalPath = path.resolve(__dirname, '../apps/web/components/auth/TibiaAuthCharacterModal.tsx');
  const gamePrototypePath = path.resolve(__dirname, '../apps/web/components/GamePrototype.tsx');

  describe('1. Character Selection Modal (TibiaAuthCharacterModal)', () => {
    it('verifies that TibiaAuthCharacterModal never sends SESSION_PONG in response to SESSION_PING', () => {
      const content = fs.readFileSync(authModalPath, 'utf8');

      // The modal must NEVER respond to SESSION_PING with SESSION_PONG
      // It is only a selection lobby, not an in-game session.
      expect(content).not.toMatch(/if\s*\([^)]*SESSION_PING[^)]*\)\s*\{[^}]*SESSION_PONG/);
      expect(content).toContain('// NOTE: Character selection modal NEVER responds to SESSION_PING with SESSION_PONG.');
    });

    it('verifies that TibiaAuthCharacterModal only sets warning if SESSION_PONG comes from a verified in-game session', () => {
      const content = fs.readFileSync(authModalPath, 'utf8');

      expect(content).toContain("event.data.type === 'SESSION_PONG'");
      expect(content).toContain('event.data.inGame === true');
      expect(content).toContain('setActiveSessionWarning');
    });

    it('verifies that TibiaAuthCharacterModal listens for SESSION_CLOSED to automatically clear active session warning', () => {
      const content = fs.readFileSync(authModalPath, 'utf8');

      expect(content).toContain("event.data.type === 'SESSION_CLOSED'");
      expect(content).toContain('setActiveSessionWarning(null)');
    });

    it('verifies that TibiaAuthCharacterModal implements verifyActiveSession for live on-demand verification', () => {
      const content = fs.readFileSync(authModalPath, 'utf8');

      expect(content).toContain('const verifyActiveSession = useCallback(');
      expect(content).toContain("channel.postMessage({ type: 'SESSION_PING', tabId: checkTabId });");
    });

    it('verifies that TibiaAuthCharacterModal provides handleForceDisconnectOtherSessions for user autonomy', () => {
      const content = fs.readFileSync(authModalPath, 'utf8');

      expect(content).toContain('const handleForceDisconnectOtherSessions = useCallback(');
      expect(content).toContain("type: 'FORCE_DISCONNECT_OTHER_SESSIONS'");
    });

    it('verifies that the multi-tab error banner provides recovery buttons: Verificar Novamente and Desconectar Outra Aba', () => {
      const content = fs.readFileSync(authModalPath, 'utf8');

      expect(content).toContain('🔄 Verificar Novamente');
      expect(content).toContain('⚡ Desconectar Outra Aba e Liberar');
      expect(content).toContain('handleForceDisconnectOtherSessions');
    });

    it('verifies that handleLogout cleans up session state and broadcasts SESSION_CLOSED', () => {
      const content = fs.readFileSync(authModalPath, 'utf8');

      expect(content).toContain("sessionChannelRef.current.postMessage({ type: 'SESSION_CLOSED' });");
      expect(content).toContain('setActiveSessionWarning(null)');
    });
  });

  describe('2. Game Client Tab (GamePrototype)', () => {
    it('verifies that GamePrototype tracks onlineCharacterRef and showAuthModalRef for real-time listener synchronization', () => {
      const content = fs.readFileSync(gamePrototypePath, 'utf8');

      expect(content).toContain('const onlineCharacterRef = useRef(onlineCharacter);');
      expect(content).toContain('const showAuthModalRef = useRef(showAuthModal);');
      expect(content).toContain('const gameSessionChannelRef = useRef<BroadcastChannel | null>(null);');
    });

    it('verifies that GamePrototype only responds to SESSION_PING if character is loaded and auth modal is closed', () => {
      const content = fs.readFileSync(gamePrototypePath, 'utf8');

      expect(content).toContain("event.data.type === 'SESSION_PING'");
      expect(content).toContain('Boolean(onlineCharacterRef.current && !showAuthModalRef.current)');
      expect(content).toContain("type: 'SESSION_PONG'");
      expect(content).toContain('inGame: true');
    });

    it('verifies that GamePrototype responds to FORCE_DISCONNECT_OTHER_SESSIONS gracefully saving and disconnecting', () => {
      const content = fs.readFileSync(gamePrototypePath, 'utf8');

      expect(content).toContain("event.data.type === 'FORCE_DISCONNECT_OTHER_SESSIONS'");
      expect(content).toContain('saveProgressRef.current(false, true)');
      expect(content).toContain('gameNetwork.disconnect()');
      expect(content).toContain('setOnlineCharacter(null)');
      expect(content).toContain('setShowAuthModal(true)');
    });

    it('verifies that handleSwitchCharacter emits SESSION_CLOSED and resets duplicateSessionError', () => {
      const content = fs.readFileSync(gamePrototypePath, 'utf8');

      expect(content).toContain("gameSessionChannelRef.current.postMessage({ type: 'SESSION_CLOSED' });");
      expect(content).toContain('setDuplicateSessionError(null);');
    });

    it('verifies that handleConfirmLogout emits SESSION_CLOSED before clearing credentials and signing out', () => {
      const content = fs.readFileSync(gamePrototypePath, 'utf8');

      expect(content).toContain("gameSessionChannelRef.current.postMessage({ type: 'SESSION_CLOSED' });");
      expect(content).toContain("localStorage.removeItem('colyseus_token');");
      expect(content).toContain('window.location.href =');
    });

    it('verifies that beforeunload handler emits SESSION_CLOSED when closing tab', () => {
      const content = fs.readFileSync(gamePrototypePath, 'utf8');

      expect(content).toContain("window.addEventListener('beforeunload', handleBeforeUnload);");
      expect(content).toContain("channel?.postMessage({ type: 'SESSION_CLOSED', tabId: currentTabId });");
    });
  });
});
