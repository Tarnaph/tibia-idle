'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

export interface AuthAccount {
  id: string;
  email: string;
  displayName: string;
  role: 'ADMIN' | 'PLAYER';
}

export interface CharacterItem {
  id: string;
  name: string;
  gender?: 'male' | 'female';
  vocationId: number;
  level: number;
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  positionX: number;
  positionY: number;
  positionZ: number;
  adminTitle?: string | null;
}

interface TibiaAuthCharacterModalProps {
  onSelectCharacter(token: string, character: CharacterItem, account: AuthAccount): void;
  onGoHome?(): void;
  onLogout?(): void;
}

const VOCATION_NAMES: Record<number, string> = {
  0: 'Sem Vocação',
  1: 'Sorcerer',
  2: 'Druid',
  3: 'Paladin',
  4: 'Knight',
};

const VOCATION_DESCRIPTIONS: Record<number, string> = {
  1: 'Mago mestre em magias ofensivas de alto dano elemental e feitiços devastadores.',
  2: 'Guardião da natureza mestre em artes de cura profunda e magias de gelo/terra.',
  3: 'Atirador de precisão especialista em armas de distância, lanças e arco e flecha.',
  4: 'Guerreiro de elite treinado em combate corpo a corpo e alta defesa com escudos.',
};

export function TibiaAuthCharacterModal({ onSelectCharacter, onGoHome, onLogout }: TibiaAuthCharacterModalProps) {
  // Performance (Phase 126): Synchronous token initialization and SWR local storage cache
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('colyseus_token') || null;
  });
  const [account, setAccount] = useState<AuthAccount | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const cached = localStorage.getItem('cavebound_cached_account');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [characters, setCharacters] = useState<CharacterItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const cached = localStorage.getItem('cavebound_cached_characters');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [isRegistering, setIsRegistering] = useState(false);
  const [isCreatingChar, setIsCreatingChar] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [charName, setCharName] = useState('');
  const [charGender, setCharGender] = useState<'male' | 'female'>('male');
  const [selectedVocation, setSelectedVocation] = useState<number>(4);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [charToDelete, setCharToDelete] = useState<CharacterItem | null>(null);

  // Video Audio & Playback State
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);

  const toggleMute = () => {
    if (videoRef.current) {
      if (isMuted) {
        videoRef.current.muted = false;
        videoRef.current.play().catch(() => {});
        setIsMuted(false);
      } else {
        videoRef.current.muted = true;
        setIsMuted(true);
      }
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const [activeSessionWarning, setActiveSessionWarning] = useState<string | null>(null);
  const sessionChannelRef = useRef<BroadcastChannel | null>(null);
  const currentModalTabIdRef = useRef<string>(
    typeof window !== 'undefined' ? Math.random().toString(36).substring(2, 9) : 'modal'
  );
  const [isVerifyingSession, setIsVerifyingSession] = useState(false);
  const startFadeOutAndEnterRef = useRef<(char: CharacterItem, bypassWarning?: boolean) => Promise<void>>(
    async () => {}
  );

  // Cross-tab active session detector for character selection modal
  useEffect(() => {
    if (typeof window === 'undefined' || !account?.id) return;
    const channelName = `tibia_session_${account.id}`;
    let channel: BroadcastChannel | null = null;
    const currentTabId = currentModalTabIdRef.current;

    try {
      channel = new BroadcastChannel(channelName);
      sessionChannelRef.current = channel;

      channel.onmessage = (event) => {
        if (!event.data) return;

        // NOTE: Character selection modal NEVER responds to SESSION_PING with SESSION_PONG.
        // The modal is only a selection lobby and NOT an active game session!

        // Active in-game tab responded to our ping
        if (
          event.data.type === 'SESSION_PONG' &&
          event.data.targetTabId === currentTabId &&
          event.data.inGame === true
        ) {
          setActiveSessionWarning(
            'Esta conta já está conectada em outra aba do navegador. Apenas uma sessão por conta é permitida.'
          );
        }

        // Active game session was closed (logout, switch character, or tab closed)
        if (event.data.type === 'SESSION_CLOSED') {
          setActiveSessionWarning(null);
          setErrorMsg((prev) => (prev?.includes('outra aba') ? null : prev));
        }
      };

      // Initial query: is there any tab currently actively playing the game?
      channel.postMessage({ type: 'SESSION_PING', tabId: currentTabId });
    } catch {}

    return () => {
      if (channel) {
        channel.close();
        if (sessionChannelRef.current === channel) {
          sessionChannelRef.current = null;
        }
      }
    };
  }, [account?.id]);

  const verifyActiveSession = useCallback(
    async (timeoutMs = 250): Promise<boolean> => {
      if (typeof window === 'undefined' || !account?.id || !sessionChannelRef.current) {
        setActiveSessionWarning(null);
        return false;
      }
      const channel = sessionChannelRef.current;
      const checkTabId = Math.random().toString(36).substring(2, 9);
      let hasActiveInGamePong = false;

      return new Promise<boolean>((resolve) => {
        const handleMessage = (event: MessageEvent) => {
          if (
            event.data &&
            event.data.type === 'SESSION_PONG' &&
            event.data.targetTabId === checkTabId &&
            event.data.inGame === true
          ) {
            hasActiveInGamePong = true;
          }
        };

        channel.addEventListener('message', handleMessage);
        channel.postMessage({ type: 'SESSION_PING', tabId: checkTabId });

        setTimeout(() => {
          channel.removeEventListener('message', handleMessage);
          if (!hasActiveInGamePong) {
            setActiveSessionWarning(null);
            setErrorMsg((prev) => (prev?.includes('outra aba') ? null : prev));
            resolve(false);
          } else {
            setActiveSessionWarning(
              'Esta conta já está conectada em outra aba do navegador. Apenas uma sessão por conta é permitida.'
            );
            resolve(true);
          }
        }, timeoutMs);
      });
    },
    [account?.id]
  );

  const handleForceDisconnectOtherSessions = useCallback(
    async (charToEnter?: CharacterItem) => {
      if (sessionChannelRef.current && account?.id) {
        try {
          sessionChannelRef.current.postMessage({
            type: 'FORCE_DISCONNECT_OTHER_SESSIONS',
            accountId: account.id,
            initiatorTabId: currentModalTabIdRef.current,
          });
        } catch {}
      }
      // Clear warning immediately
      setActiveSessionWarning(null);
      setErrorMsg(null);

      // Brief grace period for the other tab to disconnect and save
      await new Promise((r) => setTimeout(r, 150));

      if (charToEnter && startFadeOutAndEnterRef.current) {
        void startFadeOutAndEnterRef.current(charToEnter, true);
      }
    },
    [account?.id]
  );

  // Check saved token on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('colyseus_token');
    if (savedToken) {
      setToken(savedToken);
      fetchAccountAndCharacters(savedToken);
    }
  }, []);

  const fetchAccountAndCharacters = async (authToken: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [meRes, charRes] = await Promise.all([
        fetch('/api/auth/me', { headers: { Authorization: `Bearer ${authToken}` } }),
        fetch('/api/characters', { headers: { Authorization: `Bearer ${authToken}` } }),
      ]);

      const meData = (await meRes.json()) as any;
      const charData = (await charRes.json()) as any;

      if (meData.success) {
        const nextAccount = {
          ...meData.data,
          displayName: meData.data.displayName || meData.data.email?.split('@')[0] || 'Aventureiro',
        };
        setAccount(nextAccount);
        try {
          localStorage.setItem('cavebound_cached_account', JSON.stringify(nextAccount));
        } catch {}
      } else {
        localStorage.removeItem('colyseus_token');
        localStorage.removeItem('tibia_auth_token');
        localStorage.removeItem('cavebound_cached_account');
        localStorage.removeItem('cavebound_cached_characters');
        if (typeof document !== 'undefined') {
          document.cookie = 'colyseus_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
        }
        setToken(null);
        setAccount(null);
        setCharacters([]);
        onLogout?.();
        return;
      }

      if (charData.success) {
        const charList: CharacterItem[] = charData.data || [];
        setCharacters(charList);
        try {
          localStorage.setItem('cavebound_cached_characters', JSON.stringify(charList));
        } catch {}

        const isManualLogout = typeof window !== 'undefined' && sessionStorage.getItem('cavebound_manual_logout') === 'true';

        if (charList.length === 0) {
          setIsCreatingChar(true);
        } else if (!isManualLogout) {
          const primaryChar = charList[0];
          void startFadeOutAndEnterRef.current(primaryChar, true);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao comunicar com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as any;
      if (!data.success) {
        throw new Error(data.error || 'Falha ao autenticar.');
      }
      const authToken = data.data.token;
      localStorage.setItem('colyseus_token', authToken);
      document.cookie = `colyseus_token=${authToken}; path=/; max-age=604800; SameSite=Lax`;
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('cavebound_manual_logout');
      }
      setToken(authToken);
      setAccount(data.data.account);
      await fetchAccountAndCharacters(authToken);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name: displayName }),
      });
      const data = (await res.json()) as any;
      if (!data.success) {
        throw new Error(data.error || 'Falha no cadastro.');
      }
      const authToken = data.data.token;
      localStorage.setItem('colyseus_token', authToken);
      document.cookie = `colyseus_token=${authToken}; path=/; max-age=604800; SameSite=Lax`;
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('cavebound_manual_logout');
      }
      setToken(authToken);
      setAccount(data.data.account);
      setIsRegistering(false);
      await fetchAccountAndCharacters(authToken);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCharacter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/characters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: charName, vocationId: selectedVocation, gender: charGender }),
      });
      const data = (await res.json()) as any;
      if (!data.success) {
        throw new Error(data.error || 'Falha ao criar personagem.');
      }
      setIsCreatingChar(false);
      setCharName('');
      setCharGender('male');
      setSelectedVocation(4);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('cavebound_manual_logout');
      }
      if (data.data) {
        void startFadeOutAndEnterRef.current(data.data, true);
      } else {
        await fetchAccountAndCharacters(token);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCharacter = async (characterId: string) => {
    if (!token) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/characters/${characterId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = (await res.json()) as any;
      if (!data.success) {
        throw new Error(data.error || 'Falha ao deletar personagem.');
      }
      setCharToDelete(null);
      await fetchAccountAndCharacters(token);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
        videoRef.current.muted = true;
        videoRef.current.removeAttribute('src');
        videoRef.current.load();
      } catch {}
    }
    if (sessionChannelRef.current) {
      try {
        sessionChannelRef.current.postMessage({ type: 'SESSION_CLOSED' });
      } catch {}
    }
    localStorage.removeItem('colyseus_token');
    localStorage.removeItem('tibia_auth_token');
    localStorage.removeItem('cavebound_cached_account');
    localStorage.removeItem('cavebound_cached_characters');
    if (typeof document !== 'undefined') {
      document.cookie = 'colyseus_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
    }
    setToken(null);
    setAccount(null);
    setCharacters([]);
    setActiveSessionWarning(null);
    setErrorMsg(null);
    onLogout?.();
  };

  const [isEnteringGame, setIsEnteringGame] = useState(false);

  const startFadeOutAndEnter = useCallback(
    async (char: CharacterItem, bypassWarning = false) => {
      if (isEnteringGame) return;
      if (!bypassWarning && activeSessionWarning) {
        setIsVerifyingSession(true);
        const isStillActive = await verifyActiveSession(250);
        setIsVerifyingSession(false);
        if (isStillActive) {
          setErrorMsg(
            'Esta conta já está conectada em outra aba do navegador. Apenas uma sessão por conta é permitida.'
          );
          return;
        }
      }
      setIsEnteringGame(true);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('cavebound_manual_logout');
      }

      const currentToken = token || localStorage.getItem('colyseus_token') || '';
      const currentAccount = account || {
        id: char.id,
        email: '',
        displayName: char.name,
        role: 'PLAYER' as const,
      };

      const video = videoRef.current;
      if (video) {
        try {
          video.pause();
          video.currentTime = 0;
          video.muted = true;
          video.removeAttribute('src');
          video.load();
        } catch {}
      }

      onSelectCharacter(currentToken, char, currentAccount);
    },
    [isEnteringGame, activeSessionWarning, verifyActiveSession, token, account, onSelectCharacter]
  );

  useEffect(() => {
    startFadeOutAndEnterRef.current = startFadeOutAndEnter;
  }, [startFadeOutAndEnter]);

  // Guaranteed audio/video stop on modal unmount
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        try {
          videoRef.current.pause();
          videoRef.current.currentTime = 0;
          videoRef.current.muted = true;
          videoRef.current.removeAttribute('src');
          videoRef.current.load();
        } catch {}
      }
    };
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 7, 10, 0.75)',
        backdropFilter: 'blur(3px)',
        zIndex: 999999999,
        pointerEvents: isEnteringGame ? 'none' : 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'sans-serif',
        overflow: 'hidden',
        opacity: isEnteringGame ? 0 : 1,
        transition: 'opacity 0.75s ease-out',
      }}
    >
      {/* Floating Audio Control Toggle Button in top-right corner */}
      <button
        type="button"
        onClick={toggleMute}
        title={isMuted ? 'Ativar Áudio do Bardo (SongTibia)' : 'Mutar Áudio'}
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 1000000000,
          background: 'rgba(27, 34, 45, 0.9)',
          border: '1px solid #7d5c2e',
          borderRadius: '50%',
          width: '42px',
          height: '42px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isMuted ? '#888' : '#f3e5ab',
          fontSize: '18px',
          cursor: 'pointer',
          boxShadow: '0 4px 15px rgba(0,0,0,0.8)',
          backdropFilter: 'blur(6px)',
        }}
      >
        {isMuted ? '🔇' : '🔊'}
      </button>

      {/* Background Static Artwork */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      >
        <img
          src="/images/loading/thais-loading.jpg"
          alt="Tibia Background Artwork"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'translate(-50%, -50%) scale(1.02)',
            filter: 'brightness(0.72) contrast(1.08)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(5, 7, 10, 0.45)',
            backgroundImage: 'radial-gradient(circle at center, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.78) 100%)',
          }}
        />
      </div>

      {/* Main Wrapper */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          maxHeight: '98vh',
        }}
      >
        {/* Exura Logo above character selection modal (Clicking returns to home page) */}
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            if (videoRef.current) {
              try {
                videoRef.current.pause();
                videoRef.current.currentTime = 0;
                videoRef.current.muted = true;
                videoRef.current.removeAttribute('src');
                videoRef.current.load();
              } catch {}
            }
            if (onGoHome) {
              onGoHome();
            } else {
              window.location.href = '/';
            }
          }}
          title="Voltar para a Página Inicial"
          style={{
            cursor: 'pointer',
            display: 'inline-block',
            transition: 'transform 0.2s ease',
          }}
        >
          <img
            src="/logo.png"
            alt="Exura Idle Adventures"
            style={{
              height: '100px',
              maxWidth: '90vw',
              objectFit: 'contain',
              filter: 'drop-shadow(0 6px 24px rgba(0,0,0,0.85))',
            }}
          />
        </a>

        {/* Side-by-side Row: LEFT Selection Box & RIGHT Frameless Bard Video */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0px',
            maxWidth: '98vw',
          }}
        >
          {/* LEFT: Character Selection Modal Box */}
          <div
            style={{
              width: '655px',
              maxWidth: '90vw',
              minHeight: '400px',
              backgroundImage: "url('/auth-box-bg.png')",
              backgroundSize: '100% 100%',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
              backgroundColor: 'transparent',
              padding: '44px 50px 40px',
              boxSizing: 'border-box',
              filter: 'drop-shadow(0 12px 35px rgba(0, 0, 0, 0.95))',
              color: '#d6d2c4',
              position: 'relative',
              zIndex: 2,
            }}
          >
            {/* Header Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
                paddingBottom: '10px',
                borderBottom: '1px solid rgba(212, 168, 67, 0.25)',
              }}
            >
              <span style={{ color: '#f3e5ab', fontSize: '14px', fontWeight: 'bold', letterSpacing: '0.08em', textShadow: '1px 1px 2px #000' }}>
                ✦ SELEÇÃO DE PERSONAGEM
              </span>
              {account && (
                <button
                  onClick={handleLogout}
                  style={{
                    background: 'linear-gradient(180deg, #3d3121 0%, #1c150c 100%)',
                    border: '1px solid #7d5c2e',
                    color: '#ba8e54',
                    fontSize: '11px',
                    padding: '4px 10px',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.5)',
                  }}
                >
                  Desconectar ({account.displayName})
                </button>
              )}
            </div>

            <div>
              {errorMsg && (
                <div
                  style={{
                    backgroundColor: 'rgba(180, 40, 40, 0.25)',
                    border: '1px solid #933',
                    color: '#ff9999',
                    padding: '10px 14px',
                    borderRadius: '4px',
                    fontSize: '13px',
                    marginBottom: '18px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>⚠️ {errorMsg}</span>
                  </div>
                  {errorMsg.includes('outra aba') && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                      <button
                        type="button"
                        onClick={async () => {
                          setIsVerifyingSession(true);
                          await verifyActiveSession(300);
                          setIsVerifyingSession(false);
                        }}
                        disabled={isVerifyingSession}
                        style={{
                          padding: '6px 12px',
                          fontSize: '11px',
                          backgroundColor: '#2b3442',
                          color: '#f3e5ab',
                          border: '1px solid #4a5a73',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                        }}
                      >
                        {isVerifyingSession ? 'Verificando...' : '🔄 Verificar Novamente'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleForceDisconnectOtherSessions()}
                        style={{
                          padding: '6px 12px',
                          fontSize: '11px',
                          backgroundColor: '#8b1e1e',
                          color: '#ffffff',
                          border: '1px solid #c55',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                        }}
                      >
                        ⚡ Desconectar Outra Aba e Liberar
                      </button>
                    </div>
                  )}
                </div>
              )}

              {!token ? (
                /* LOGIN OR REGISTER FORM */
                isRegistering ? (
                  <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <h2 style={{ fontSize: '16px', color: '#f3e5ab', margin: 0 }}>Criar Nova Conta</h2>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: '#a09886', marginBottom: '4px' }}>Nome da Conta / Display Name</label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        required
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          backgroundColor: '#11161d',
                          border: '1px solid #3c4656',
                          color: '#fff',
                          borderRadius: '4px',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: '#a09886', marginBottom: '4px' }}>E-mail</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          backgroundColor: '#11161d',
                          border: '1px solid #3c4656',
                          color: '#fff',
                          borderRadius: '4px',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: '#a09886', marginBottom: '4px' }}>Senha</label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          backgroundColor: '#11161d',
                          border: '1px solid #3c4656',
                          color: '#fff',
                          borderRadius: '4px',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                      <button
                        type="submit"
                        disabled={loading}
                        style={{
                          flex: 1,
                          padding: '10px',
                          background: 'linear-gradient(180deg, #4a7c36 0%, #2a4c1e 100%)',
                          border: '1px solid #629d49',
                          color: '#fff',
                          fontWeight: 'bold',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        {loading ? 'Cadastrando...' : 'Confirmar Cadastro'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsRegistering(false)}
                        style={{
                          padding: '10px 16px',
                          background: '#2b3442',
                          border: '1px solid #48566b',
                          color: '#bbb',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        Voltar
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <h2 style={{ fontSize: '16px', color: '#f3e5ab', margin: 0 }}>Entrar no Servidor</h2>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: '#a09886', marginBottom: '4px' }}>E-mail da Conta</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          backgroundColor: '#11161d',
                          border: '1px solid #3c4656',
                          color: '#fff',
                          borderRadius: '4px',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: '#a09886', marginBottom: '4px' }}>Senha</label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          backgroundColor: '#11161d',
                          border: '1px solid #3c4656',
                          color: '#fff',
                          borderRadius: '4px',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                      <button
                        type="submit"
                        disabled={loading}
                        style={{
                          flex: 1,
                          padding: '10px',
                          background: 'linear-gradient(180deg, #ba8e54 0%, #7d5c2e 100%)',
                          border: '1px solid #d4a843',
                          color: '#fff',
                          fontWeight: 'bold',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        {loading ? 'Autenticando...' : 'ENTRAR NO JOGO'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsRegistering(true)}
                        style={{
                          padding: '10px 16px',
                          background: '#2b3442',
                          border: '1px solid #48566b',
                          color: '#d4a843',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        Criar Conta
                      </button>
                    </div>
                  </form>
                )
              ) : isCreatingChar ? (
                /* CREATE CHARACTER FORM */
                <form onSubmit={handleCreateCharacter} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <h2 style={{ fontSize: '16px', color: '#f3e5ab', margin: 0 }}>Criar Novo Personagem</h2>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#a09886', marginBottom: '4px' }}>Nome do Personagem</label>
                    <input
                      type="text"
                      value={charName}
                      onChange={(e) => setCharName(e.target.value)}
                      placeholder="Ex: Sir Lancelot"
                      required
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        backgroundColor: '#11161d',
                        border: '1px solid #3c4656',
                        color: '#fff',
                        borderRadius: '4px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#a09886', marginBottom: '6px' }}>Sexo / Gênero</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() => setCharGender('male')}
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          padding: '10px 14px',
                          backgroundColor: charGender === 'male' ? '#1c2838' : '#11161d',
                          border: charGender === 'male' ? '2px solid #4a90e2' : '1px solid #2b3442',
                          color: charGender === 'male' ? '#64b5f6' : '#888',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          fontSize: '13px',
                          boxShadow: charGender === 'male' ? '0 0 12px rgba(74, 144, 226, 0.35)' : 'none',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span style={{ fontSize: '16px' }}>♂</span> Masculino
                      </button>
                      <button
                        type="button"
                        onClick={() => setCharGender('female')}
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          padding: '10px 14px',
                          backgroundColor: charGender === 'female' ? '#2f1b2b' : '#11161d',
                          border: charGender === 'female' ? '2px solid #e066a5' : '1px solid #2b3442',
                          color: charGender === 'female' ? '#f48fb1' : '#888',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          fontSize: '13px',
                          boxShadow: charGender === 'female' ? '0 0 12px rgba(224, 102, 165, 0.35)' : 'none',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span style={{ fontSize: '16px' }}>♀</span> Feminino
                      </button>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#a09886', marginBottom: '6px' }}>
                      Vocação Inicial
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                      {[
                        { id: 4, name: 'Knight', icon: '⚔️', desc: 'Espada, Machado & Escudo' },
                        { id: 3, name: 'Paladin', icon: '🏹', desc: 'Arco, Lança & Precisão' },
                        { id: 1, name: 'Sorcerer', icon: '🔮', desc: 'Magia Ofensiva & Varinha' },
                        { id: 2, name: 'Druid', icon: '🌿', desc: 'Cura, Gelo & Varinha' },
                      ].map((voc) => {
                        const isSelected = selectedVocation === voc.id;
                        return (
                          <button
                            key={voc.id}
                            type="button"
                            onClick={() => setSelectedVocation(voc.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '8px 10px',
                              backgroundColor: isSelected ? '#252115' : '#11161d',
                              border: isSelected ? '2px solid #d4a843' : '1px solid #2b3442',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              textAlign: 'left',
                              color: isSelected ? '#f3e5ab' : '#888',
                              boxShadow: isSelected ? '0 0 10px rgba(212, 168, 67, 0.35)' : 'none',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <span style={{ fontSize: '18px' }}>{voc.icon}</span>
                            <div>
                              <div style={{ fontWeight: 'bold', fontSize: '12px', color: isSelected ? '#ffd700' : '#ddd' }}>
                                {voc.name}
                              </div>
                              <div style={{ fontSize: '10px', color: '#777' }}>
                                {voc.desc}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ marginTop: '6px' }}>
                      <button
                        type="button"
                        onClick={() => setSelectedVocation(0)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          padding: '6px 10px',
                          backgroundColor: selectedVocation === 0 ? '#1f2530' : 'transparent',
                          border: selectedVocation === 0 ? '1px solid #4a90e2' : '1px dashed #2b3442',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          color: selectedVocation === 0 ? '#64b5f6' : '#777',
                          fontSize: '11px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span>🛡️</span> {selectedVocation === 0 ? '✓ Sem Vocação (Escolher no Templo de Thais)' : 'Sem Vocação (Escolher no Templo de Thais)'}
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <button
                      type="submit"
                      disabled={loading}
                      style={{
                        flex: 1,
                        padding: '10px',
                        background: 'linear-gradient(180deg, #4a7c36 0%, #2a4c1e 100%)',
                        border: '1px solid #629d49',
                        color: '#fff',
                        fontWeight: 'bold',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      {loading ? 'Criando...' : 'Criar Personagem'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCreatingChar(false)}
                      style={{
                        padding: '10px 16px',
                        background: '#2b3442',
                        border: '1px solid #48566b',
                        color: '#bbb',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                /* CHARACTER SELECTION LIST */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '16px', color: '#f3e5ab', margin: 0 }}>Seus Personagens</h2>
                    {characters.length === 0 ? (
                      <button
                        onClick={() => setIsCreatingChar(true)}
                        style={{
                          width: '180px',
                          height: '38px',
                          backgroundImage: "url('/create-char-btn.png')",
                          backgroundSize: '100% 100%',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'center',
                          backgroundColor: 'transparent',
                          border: 'none',
                          color: '#f3e5ab',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          textShadow: '1px 1px 3px #000',
                          filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.6))',
                        }}
                      >
                        + Criar Personagem
                      </button>
                    ) : (
                      <span style={{ fontSize: '11px', color: '#a09886', fontStyle: 'italic' }}>
                        Heróis adicionais são criados no Squad in-game
                      </span>
                    )}
                  </div>

                  {characters.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#888', background: '#11161d', borderRadius: '4px' }}>
                      Você ainda não possui personagens nesta conta. Clique em &quot;Criar Personagem&quot; acima para começar!
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
                      {characters.map((char) => {
                        const handleSelectThisChar = (e: React.MouseEvent) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('[TibiaAuthCharacterModal] Entrar no jogo clicado com fadeout para:', char.name);
                          startFadeOutAndEnter(char);
                        };

                        return (
                          <div
                            key={char.id}
                            onClick={handleSelectThisChar}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 12px',
                              backgroundColor: 'transparent',
                              borderBottom: '1px solid rgba(212, 168, 67, 0.15)',
                              borderRadius: '0px',
                              cursor: 'pointer',
                              pointerEvents: 'auto',
                              userSelect: 'none',
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: 'bold', color: '#ffffff', fontSize: '15px', textShadow: '1px 1px 2px #000' }}>{char.name}</span>
                                <span
                                  style={{
                                    fontSize: '11px',
                                    padding: '2px 8px',
                                    borderRadius: '3px',
                                    backgroundColor: char.gender === 'female' ? 'rgba(233, 30, 99, 0.25)' : 'rgba(33, 150, 243, 0.25)',
                                    color: char.gender === 'female' ? '#f48fb1' : '#90caf9',
                                    border: char.gender === 'female' ? '1px solid rgba(233, 30, 99, 0.4)' : '1px solid rgba(33, 150, 243, 0.4)',
                                    fontWeight: 'bold',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                  }}
                                >
                                  {char.gender === 'female' ? '♀ Feminino' : '♂ Masculino'}
                                </span>
                              </div>
                              <div style={{ fontSize: '11px', color: '#ffffff', marginTop: '3px', textShadow: '1px 1px 2px #000', opacity: 0.95 }}>
                                Level {char.level} | {VOCATION_NAMES[char.vocationId] || 'No Vocation'} | Spawn: Thais Temple
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setCharToDelete(char);
                                }}
                                title="Deletar Personagem da Conta"
                                style={{
                                  padding: '6px 10px',
                                  background: 'linear-gradient(180deg, #8b1e1e 0%, #521010 100%)',
                                  border: '1px solid #b83232',
                                  color: '#ffcccc',
                                  fontWeight: 'bold',
                                  fontSize: '11px',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                🗑️ Deletar
                              </button>

                              <button
                                type="button"
                                onClick={handleSelectThisChar}
                                style={{
                                  width: '150px',
                                  height: '38px',
                                  backgroundImage: "url('/enter-game-btn.png')",
                                  backgroundSize: '100% 100%',
                                  backgroundRepeat: 'no-repeat',
                                  backgroundPosition: 'center',
                                  backgroundColor: 'transparent',
                                  border: 'none',
                                  color: '#ffffff',
                                  fontWeight: 'bold',
                                  fontSize: '12px',
                                  cursor: 'pointer',
                                  pointerEvents: 'auto',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  textShadow: '1px 1px 3px #000',
                                  filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.6))',
                                }}
                              >
                                ENTRAR NO JOGO
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Frameless & Larger Bard Character Video with Centered Play Button */}
          <div
            style={{
              width: '560px',
              height: '600px',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              boxShadow: 'none',
              overflow: 'visible',
              marginLeft: '-45px',
              zIndex: 1,
            }}
          >
            <BardChromaVideo
              src="/songtibia.webm"
              videoRef={videoRef}
              setIsMuted={setIsMuted}
              setIsPlaying={setIsPlaying}
              onTogglePlay={togglePlay}
              isPlaying={isPlaying}
            />

            {/* Centered Transparent Play Button when Paused */}
            {!isPlaying && (
              <button
                type="button"
                onClick={togglePlay}
                title="Reproduzir Vídeo"
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 10,
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'rgba(10, 14, 20, 0.55)',
                  border: '2px solid rgba(212, 168, 67, 0.85)',
                  boxShadow: '0 0 35px rgba(0, 0, 0, 0.95), inset 0 0 15px rgba(212, 168, 67, 0.35)',
                  backdropFilter: 'blur(6px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#f3e5ab',
                  fontSize: '34px',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease, background 0.2s ease',
                  paddingLeft: '6px', // center the triangle play icon
                }}
              >
                ▶
              </button>
            )}
          </div>
        </div>

        {/* BOTTOM FOOTER STRIP: Players Online & Social Icons */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            marginTop: '4px',
            backgroundColor: 'rgba(12, 16, 22, 0.85)',
            border: '1px solid rgba(212, 168, 67, 0.3)',
            borderRadius: '6px',
            padding: '6px 18px',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div style={{ color: '#ffffff', fontSize: '13px', fontWeight: 'bold', textShadow: '1px 1px 3px #000' }}>
            10 players online
          </div>
          <div style={{ width: '1px', height: '14px', backgroundColor: 'rgba(212, 168, 67, 0.4)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <a href="https://facebook.com" target="_blank" rel="noreferrer" title="Facebook" style={{ opacity: 0.9, transition: 'opacity 0.2s', display: 'flex', alignItems: 'center' }}>
              <img src="/social/facebook.png" alt="Facebook" style={{ height: '16px', width: 'auto', display: 'block', filter: 'drop-shadow(0 1px 3px #000)' }} />
            </a>
            <a href="https://instagram.com" target="_blank" rel="noreferrer" title="Instagram" style={{ opacity: 0.9, transition: 'opacity 0.2s', display: 'flex', alignItems: 'center' }}>
              <img src="/social/instagram.png" alt="Instagram" style={{ height: '16px', width: 'auto', display: 'block', filter: 'drop-shadow(0 1px 3px #000)' }} />
            </a>
            <a href="https://tiktok.com" target="_blank" rel="noreferrer" title="TikTok" style={{ opacity: 0.9, transition: 'opacity 0.2s', display: 'flex', alignItems: 'center' }}>
              <img src="/social/tiktok.png" alt="TikTok" style={{ height: '16px', width: 'auto', display: 'block', filter: 'drop-shadow(0 1px 3px #000)' }} />
            </a>
          </div>
        </div>
      </div>

      {/* DELETE CHARACTER CONFIRMATION MODAL OVERLAY */}
      {charToDelete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.82)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000000005,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              width: '440px',
              maxWidth: '90vw',
              backgroundColor: '#161c24',
              border: '2px solid #b83232',
              borderRadius: '6px',
              padding: '24px',
              boxShadow: '0 12px 35px rgba(0,0,0,0.95)',
              color: '#e2d9c8',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <h3 style={{ margin: 0, color: '#ff6b6b', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⚠️ Deletar Personagem
            </h3>
            <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.5', color: '#c5bdad' }}>
              Tem certeza que deseja deletar permanentemente o personagem <strong style={{ color: '#ffffff' }}>{charToDelete.name}</strong> (Level {charToDelete.level})?
              <br /><br />
              <span style={{ color: '#ff8888', fontSize: '12px' }}>
                Esta ação é irreversível e removerá todos os itens, habilidades e dados do personagem do banco de dados PostgreSQL.
              </span>
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                disabled={loading}
                onClick={() => setCharToDelete(null)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#2c3545',
                  border: '1px solid #48566b',
                  color: '#bbb',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '12px',
                }}
              >
                CANCELAR
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleDeleteCharacter(charToDelete.id)}
                style={{
                  padding: '8px 16px',
                  background: 'linear-gradient(180deg, #c02b2b 0%, #7a1515 100%)',
                  border: '1px solid #e74c3c',
                  color: '#ffffff',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
                }}
              >
                {loading ? 'Deletando...' : 'SIM, DELETAR'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BardChromaVideo({
  src,
  videoRef,
  setIsMuted,
  setIsPlaying,
  onTogglePlay,
  isPlaying = true,
}: {
  src: string;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  setIsMuted: (muted: boolean) => void;
  setIsPlaying?: (playing: boolean) => void;
  onTogglePlay?: () => void;
  isPlaying?: boolean;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    let animId: number;
    let removeInteractionListeners = () => {};

    const setInitialTime = () => {
      if (video.currentTime < 14) {
        video.currentTime = 14;
      }
    };

    setInitialTime();
    video.addEventListener('loadedmetadata', setInitialTime);
    video.addEventListener('timeupdate', setInitialTime);

    const handlePlay = () => setIsPlaying?.(true);
    const handlePause = () => setIsPlaying?.(false);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    const startAudio = async () => {
      try {
        video.muted = false;
        video.volume = 0.8;
        setInitialTime();
        await video.play();
        setIsMuted(false);
        setIsPlaying?.(true);
      } catch {
        // Autoplay policy blocked unmuted audio; start muted initially
        try {
          video.muted = true;
          setInitialTime();
          await video.play();
          setIsMuted(true);
          setIsPlaying?.(true);
        } catch {
          // Ignore
        }

        // Unmute on user interaction
        const unmuteAndPlay = () => {
          if (video && video.isConnected && !video.paused) {
            video.muted = false;
            video.volume = 0.8;
            video
              .play()
              .then(() => {
                setIsMuted(false);
                setIsPlaying?.(true);
              })
              .catch(() => {});
          }
          removeInteractionListeners();
        };

        const removeListeners = () => {
          window.removeEventListener('mousemove', unmuteAndPlay);
          window.removeEventListener('pointermove', unmuteAndPlay);
          window.removeEventListener('mousedown', unmuteAndPlay);
          window.removeEventListener('click', unmuteAndPlay);
          window.removeEventListener('keydown', unmuteAndPlay);
          window.removeEventListener('touchstart', unmuteAndPlay);
        };
        removeInteractionListeners = removeListeners;

        window.addEventListener('mousemove', unmuteAndPlay, { once: true });
        window.addEventListener('pointermove', unmuteAndPlay, { once: true });
        window.addEventListener('mousedown', unmuteAndPlay, { once: true });
        window.addEventListener('click', unmuteAndPlay, { once: true });
        window.addEventListener('keydown', unmuteAndPlay, { once: true });
        window.addEventListener('touchstart', unmuteAndPlay, { once: true });
      }
    };

    void startAudio();

    const renderFrame = () => {
      animId = requestAnimationFrame(renderFrame);

      // Performance: Skip heavy CPU pixel loops if video is paused, ended, or not ready
      if (video.paused || video.ended || video.readyState < 2) {
        return;
      }

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx && video.videoWidth > 0 && video.videoHeight > 0) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const l = frame.data.length / 4;

        for (let i = 0; i < l; i++) {
          const r = frame.data[i * 4 + 0];
          const g = frame.data[i * 4 + 1];
          const b = frame.data[i * 4 + 2];

          const maxC = Math.max(r, g, b);

          // Key out black / dark background around frame
          if (maxC < 14) {
            frame.data[i * 4 + 3] = 0;
          } else if (maxC < 25) {
            // Anti-aliased soft edge transition
            frame.data[i * 4 + 3] = Math.floor(((maxC - 14) / 11) * 255);
          } else if (g > 90 && g > r * 1.25 && g > b * 1.25) {
            // Key out green background if green screen is present
            frame.data[i * 4 + 3] = 0;
          }
        }

        ctx.putImageData(frame, 0, 0);
      }
    };

    animId = requestAnimationFrame(renderFrame);

    return () => {
      cancelAnimationFrame(animId);
      removeInteractionListeners();
      try {
        video.pause();
        video.currentTime = 0;
        video.muted = true;
      } catch {}
      video.removeEventListener('loadedmetadata', setInitialTime);
      video.removeEventListener('timeupdate', setInitialTime);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [src, videoRef, setIsMuted, setIsPlaying]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <video
        ref={videoRef}
        src={src}
        autoPlay
        loop
        playsInline
        preload="auto"
        crossOrigin="anonymous"
        onLoadedMetadata={(e) => {
          if (e.currentTarget.currentTime < 14) {
            e.currentTarget.currentTime = 14;
          }
        }}
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          opacity: 0,
          pointerEvents: 'none',
          zIndex: -1,
        }}
      />
      <canvas
        ref={canvasRef}
        onClick={onTogglePlay}
        title={isPlaying ? 'Clique para Pausar' : 'Clique para Reproduzir'}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          filter: isPlaying
            ? 'drop-shadow(0 10px 30px rgba(0,0,0,0.9))'
            : 'drop-shadow(0 10px 30px rgba(0,0,0,0.9)) brightness(0.45)',
          transition: 'filter 0.3s ease',
          cursor: 'pointer',
        }}
      />
    </div>
  );
}


