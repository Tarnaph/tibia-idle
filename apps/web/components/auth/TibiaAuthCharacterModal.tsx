'use client';

import React, { useState, useEffect } from 'react';

export interface AuthAccount {
  id: string;
  email: string;
  displayName: string;
  role: 'ADMIN' | 'PLAYER';
}

export interface CharacterItem {
  id: string;
  name: string;
  vocationId: number;
  level: number;
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  positionX: number;
  positionY: number;
  positionZ: number;
}

interface TibiaAuthCharacterModalProps {
  onSelectCharacter(token: string, character: CharacterItem, account: AuthAccount): void;
  onGoHome?(): void;
}

const VOCATION_NAMES: Record<number, string> = {
  1: 'Knight',
  2: 'Paladin',
  3: 'Sorcerer',
  4: 'Druid',
};

const VOCATION_DESCRIPTIONS: Record<number, string> = {
  1: 'Guerreiro de elite treinado em combate corpo a corpo e alta defesa com escudos.',
  2: 'Atirador de precisão especialista em armas de distância, lanças e arco e flecha.',
  3: 'Mago mestre em magias ofensivas de alto dano elemental e feitiços devastadores.',
  4: 'Guardião da natureza mestre em artes de cura profunda e magias de gelo/terra.',
};

export function TibiaAuthCharacterModal({ onSelectCharacter, onGoHome }: TibiaAuthCharacterModalProps) {
  const [token, setToken] = useState<string | null>(null);
  const [account, setAccount] = useState<AuthAccount | null>(null);
  const [characters, setCharacters] = useState<CharacterItem[]>([]);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isCreatingChar, setIsCreatingChar] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [charName, setCharName] = useState('');
  const [selectedVocation, setSelectedVocation] = useState<number>(1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Video Audio State
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [isMuted, setIsMuted] = useState(false);

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
        setAccount({
          ...meData.data,
          displayName: meData.data.displayName || meData.data.email?.split('@')[0] || 'Aventureiro',
        });
      } else {
        localStorage.removeItem('colyseus_token');
        setToken(null);
        return;
      }

      if (charData.success) {
        setCharacters(charData.data);
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
        body: JSON.stringify({ name: charName, vocationId: selectedVocation }),
      });
      const data = (await res.json()) as any;
      if (!data.success) {
        throw new Error(data.error || 'Falha ao criar personagem.');
      }
      setIsCreatingChar(false);
      setCharName('');
      await fetchAccountAndCharacters(token);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('colyseus_token');
    setToken(null);
    setAccount(null);
    setCharacters([]);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 7, 10, 0.75)',
        backdropFilter: 'blur(3px)',
        zIndex: 999999999,
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'sans-serif',
        overflow: 'hidden',
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

      {/* Background Video Frame */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      >
        <iframe
          src="https://www.youtube.com/embed/b3Q0iWCTuZI?autoplay=1&mute=1&controls=0&loop=1&playlist=b3Q0iWCTuZI&playsinline=1"
          title="Vídeo de Fundo - Seleção de Personagem"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '100vw',
            height: '56.25vw',
            minHeight: '100vh',
            minWidth: '177.77vh',
            transform: 'translate(-50%, -50%) scale(1.08)',
            border: 'none',
            pointerEvents: 'none',
          }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(5, 7, 10, 0.55)',
            backgroundImage: 'radial-gradient(circle at center, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.75) 100%)',
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
                  ⚠️ {errorMsg}
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
                    <label style={{ display: 'block', fontSize: '12px', color: '#a09886', marginBottom: '8px' }}>Escolha a Vocação</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      {[1, 2, 3, 4].map((vocId) => (
                        <button
                          key={vocId}
                          type="button"
                          onClick={() => setSelectedVocation(vocId)}
                          style={{
                            padding: '10px',
                            backgroundColor: selectedVocation === vocId ? '#3d3121' : '#11161d',
                            border: selectedVocation === vocId ? '2px solid #d4a843' : '1px solid #2b3442',
                            borderRadius: '4px',
                            textAlign: 'left',
                            cursor: 'pointer',
                            color: selectedVocation === vocId ? '#f3e5ab' : '#aaa',
                          }}
                        >
                          <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{VOCATION_NAMES[vocId]}</div>
                          <div style={{ fontSize: '10px', color: '#888', marginTop: '3px' }}>{VOCATION_DESCRIPTIONS[vocId]}</div>
                        </button>
                      ))}
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
                          console.log('[TibiaAuthCharacterModal] Entrar no jogo clicado para:', char.name);
                          const currentToken = token || localStorage.getItem('colyseus_token') || '';
                          const currentAccount = account || {
                            id: char.id,
                            email: '',
                            displayName: char.name,
                            role: 'PLAYER' as const,
                          };
                          onSelectCharacter(currentToken, char, currentAccount);
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
                              <div style={{ fontWeight: 'bold', color: '#ffffff', fontSize: '15px', textShadow: '1px 1px 2px #000' }}>{char.name}</div>
                              <div style={{ fontSize: '11px', color: '#ffffff', marginTop: '3px', textShadow: '1px 1px 2px #000', opacity: 0.95 }}>
                                Level {char.level} | {VOCATION_NAMES[char.vocationId] || 'No Vocation'} | Spawn: Thais Temple
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={handleSelectThisChar}
                              style={{
                                width: '170px',
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
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Frameless & Larger Bard Character Video */}
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
            <BardChromaVideo src="/songtibia.webm" videoRef={videoRef} setIsMuted={setIsMuted} />
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
    </div>
  );
}

function BardChromaVideo({
  src,
  videoRef,
  setIsMuted,
}: {
  src: string;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  setIsMuted: (muted: boolean) => void;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    let animId: number;

    const startAudio = async () => {
      try {
        video.muted = false;
        video.volume = 0.8;
        await video.play();
        setIsMuted(false);
      } catch {
        // Autoplay policy blocked unmuted audio; start muted initially
        try {
          video.muted = true;
          await video.play();
          setIsMuted(true);
        } catch {
          // Ignore
        }

        // Unmute on user interaction
        const unmuteAndPlay = () => {
          if (video) {
            video.muted = false;
            video.volume = 0.8;
            video.play().then(() => {
              setIsMuted(false);
            }).catch(() => {});
          }
          removeListeners();
        };

        const removeListeners = () => {
          window.removeEventListener('mousemove', unmuteAndPlay);
          window.removeEventListener('pointermove', unmuteAndPlay);
          window.removeEventListener('mousedown', unmuteAndPlay);
          window.removeEventListener('click', unmuteAndPlay);
          window.removeEventListener('keydown', unmuteAndPlay);
          window.removeEventListener('touchstart', unmuteAndPlay);
        };

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
      if (video.paused || video.ended) {
        animId = requestAnimationFrame(renderFrame);
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

      animId = requestAnimationFrame(renderFrame);
    };

    animId = requestAnimationFrame(renderFrame);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [src, videoRef, setIsMuted]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <video
        ref={videoRef}
        src={src}
        autoPlay
        loop
        playsInline
        style={{ display: 'none' }}
      />
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.9))',
        }}
      />
    </div>
  );
}


