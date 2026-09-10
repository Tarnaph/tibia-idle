'use client';

import { useEffect, useState } from 'react';

interface TopNavigationProps {
  characterName: string;
  gold: number;
  debug: boolean;
  onEquipment(): void;
  onOpenFriends?(): void;
  onOpenShop?(): void;
  onToggleDebug(): void;
  onToggleLeftSidebar(): void;
  onToggleRightSidebar(): void;
}

const futureNavigation = ['Progress', 'Daily', 'Storage', 'Trade'];

export function TopNavigation({
  characterName,
  gold,
  debug,
  onEquipment,
  onOpenFriends,
  onOpenShop,
  onToggleDebug,
  onToggleLeftSidebar,
  onToggleRightSidebar,
}: TopNavigationProps) {
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const update = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, []);

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  };

  return (
    <header className="client-topbar">
      <div className="brand-cluster" style={{ alignItems: 'center' }}>
        <img src="/logo.png" alt="Exura Idle Adventures" style={{ height: '30px', width: 'auto', objectFit: 'contain' }} />
        <span className="account-name">{characterName}</span>
        <span className="currency-chip"><i className="coin-dot" />{gold.toLocaleString('pt-BR')}</span>
      </div>

      <nav className="client-navigation" aria-label="Navegação principal">
        <button type="button" className="nav-shortcut active"><span>⌖</span><small>Hunt</small></button>
        <button type="button" className="nav-shortcut" onClick={onEquipment}><span>♜</span><small>Character</small></button>
        <button type="button" className="nav-shortcut" onClick={onOpenFriends} title="Lista de Amigos (Buscar, Mensagens, Party)"><span>⭐</span><small>Amigos</small></button>
        <button type="button" className="nav-shortcut shop-btn" onClick={onOpenShop} title="Abrir Loja de Itens (NPC Store)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
          <small>Loja</small>
        </button>
        {futureNavigation.map((label) => (
          <button type="button" className="nav-shortcut future" key={label} disabled title="Em breve">
            <span>◇</span><small>{label}</small>
          </button>
        ))}
      </nav>

      <div className="topbar-actions">
        <button type="button" className="top-action mobile-only" onClick={onToggleLeftSidebar} title="Personagem">CHAR</button>
        <button type="button" className="top-action mobile-only" onClick={onToggleRightSidebar} title="Backpack">PACK</button>
        <button type="button" className={debug ? 'top-action active' : 'top-action'} onClick={onToggleDebug} title="Grid de desenvolvimento">DBG</button>
        <button type="button" className="top-action" onClick={toggleFullscreen} title={fullscreen ? 'Sair da tela cheia' : 'Tela cheia'}>{fullscreen ? '↙' : '↗'}</button>
        <button type="button" className="top-action" disabled title="Configurações em breve">⚙</button>
      </div>
    </header>
  );
}
