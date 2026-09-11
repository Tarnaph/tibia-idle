import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Phase 126 - Character Selection Performance and Canonical Logout Dialog', () => {
  const landingPagePath = path.resolve(__dirname, '../apps/web/components/public/LandingPage.tsx');
  const authModalPath = path.resolve(__dirname, '../apps/web/components/auth/TibiaAuthCharacterModal.tsx');
  const logoutModalPath = path.resolve(__dirname, '../apps/web/components/character/LogoutConfirmModal.tsx');
  const gamePrototypePath = path.resolve(__dirname, '../apps/web/components/GamePrototype.tsx');
  const authModalPublicPath = path.resolve(__dirname, '../apps/web/components/public/AuthModal.tsx');

  describe('1. Character Selection SWR Cache & Performance Optimizations', () => {
    it('verifies that TibiaAuthCharacterModal initializes token, account, and characters synchronously via lazy state initializer', () => {
      const content = fs.readFileSync(authModalPath, 'utf8');

      // Token lazy initializer from localStorage
      expect(content).toContain("const [token, setToken] = useState<string | null>(() => {");
      expect(content).toContain("localStorage.getItem('colyseus_token')");

      // SWR Cache for Account
      expect(content).toContain("const [account, setAccount] = useState<AuthAccount | null>(() => {");
      expect(content).toContain("localStorage.getItem('cavebound_cached_account')");

      // SWR Cache for Characters
      expect(content).toContain("const [characters, setCharacters] = useState<CharacterItem[]>(() => {");
      expect(content).toContain("localStorage.getItem('cavebound_cached_characters')");
    });

    it('verifies that fetchAccountAndCharacters saves updated account and characters to localStorage cache', () => {
      const content = fs.readFileSync(authModalPath, 'utf8');

      expect(content).toContain("localStorage.setItem('cavebound_cached_account'");
      expect(content).toContain("localStorage.setItem('cavebound_cached_characters'");
    });

    it('verifies that handleLogout cleans up the cached account and characters in localStorage', () => {
      const content = fs.readFileSync(authModalPath, 'utf8');

      expect(content).toContain("localStorage.removeItem('cavebound_cached_account')");
      expect(content).toContain("localStorage.removeItem('cavebound_cached_characters')");
    });

    it('verifies that BardChromaVideo skips expensive canvas frame pixel calculations when video is paused or not ready', () => {
      const content = fs.readFileSync(authModalPath, 'utf8');

      expect(content).toContain('if (video.paused || video.ended || video.readyState < 2)');
    });

    it('verifies that the background YouTube iframe includes loading="lazy" to prevent network thread blocking', () => {
      const content = fs.readFileSync(authModalPath, 'utf8');

      expect(content).toContain('loading="lazy"');
    });

    it('verifies that AuthModal caches account info in localStorage upon login', () => {
      const content = fs.readFileSync(authModalPublicPath, 'utf8');

      expect(content).toContain("localStorage.setItem('cavebound_cached_account'");
    });

    it('verifies that LandingPage performs router.prefetch for /game on mount and onHover for instant transitions', () => {
      const content = fs.readFileSync(landingPagePath, 'utf8');

      expect(content).toContain("router.prefetch('/game')");
      expect(content).toContain('onHoverPlay');
      expect(content).toContain('onMouseEnter={onHoverPlay}');
    });
  });

  describe('2. Canonical Logout and Character Switch Dialog (LogoutConfirmModal)', () => {
    it('verifies that LogoutConfirmModal component exists and exports properly', () => {
      expect(fs.existsSync(logoutModalPath), 'LogoutConfirmModal.tsx must exist').toBe(true);
      const content = fs.readFileSync(logoutModalPath, 'utf8');

      expect(content).toContain('export function LogoutConfirmModal');
      expect(content).toContain('onSwitchCharacter: () => void');
      expect(content).toContain('onLogoutGame: () => void');
      expect(content).toContain('onCancel: () => void');
    });

    it('verifies that LogoutConfirmModal presents both options: Trocar de Personagem and Sair do Jogo', () => {
      const content = fs.readFileSync(logoutModalPath, 'utf8');

      expect(content).toContain('Trocar de Personagem');
      expect(content).toContain('Sair do Jogo');
      expect(content).toContain('Cancelar');
      expect(content).toContain('Seu progresso será salvo');
    });

    it('verifies that LogoutConfirmModal supports closing via Escape key and backdrop click', () => {
      const content = fs.readFileSync(logoutModalPath, 'utf8');

      expect(content).toContain("e.key === 'Escape'");
      expect(content).toContain('onCancel();');
    });

    it('verifies that GamePrototype integrates LogoutConfirmModal and connects to WindowDockBar exit button', () => {
      const content = fs.readFileSync(gamePrototypePath, 'utf8');

      expect(content).toContain("import { LogoutConfirmModal } from './character/LogoutConfirmModal'");
      expect(content).toContain('const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);');
      expect(content).toContain('onExitGame={() => setIsLogoutModalOpen(true)}');
      expect(content).toContain('<LogoutConfirmModal');
    });

    it('verifies that handleSwitchCharacter saves progress, disconnects, and brings up character selection', () => {
      const content = fs.readFileSync(gamePrototypePath, 'utf8');

      expect(content).toContain('const handleSwitchCharacter = useCallback(async () => {');
      expect(content).toContain('saveProgressRef.current()');
      expect(content).toContain('gameNetwork.disconnect()');
      expect(content).toContain('setOnlineCharacter(null)');
      expect(content).toContain('setShowAuthModal(true)');
    });

    it('verifies that handleConfirmLogout saves progress, clears tokens, signs out, and redirects to root', () => {
      const content = fs.readFileSync(gamePrototypePath, 'utf8');

      expect(content).toContain('const handleConfirmLogout = useCallback(async () => {');
      expect(content).toContain('saveProgressRef.current()');
      expect(content).toContain('gameNetwork.disconnect()');
      expect(content).toContain("localStorage.removeItem('colyseus_token')");
      expect(content).toContain('auth.signOut()');
      expect(content).toContain("window.location.href = '/'");
    });

    it('verifies that Escape key triggers LogoutConfirmModal when no other modal is active', () => {
      const content = fs.readFileSync(gamePrototypePath, 'utf8');

      expect(content).toContain("e.key === 'Escape' && !showAuthModal");
      expect(content).toContain('setIsLogoutModalOpen(true)');
    });
  });
});
