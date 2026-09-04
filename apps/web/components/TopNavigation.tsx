'use client';

import { useEffect, useState } from 'react';

interface TopNavigationProps {
  characterName: string;
  gold: number;
  debug: boolean;
  onEquipment(): void;
  onOpenFriends?(): void;
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
      <div className="brand-cluster">
        <span className="brand-mark">C</span>
        <span className="brand-name">Cavebound<small>idle expeditions</small></span>
        <span className="account-name">{characterName}</span>
        <span className="currency-chip"><i className="coin-dot" />{gold.toLocaleString('pt-BR')}</span>
      </div>

      <nav className="client-navigation" aria-label="Navegação principal">
        <button type="button" className="nav-shortcut active"><span>⌖</span><small>Hunt</small></button>
        <button type="button" className="nav-shortcut" onClick={onEquipment}><span>♜</span><small>Character</small></button>
        <button type="button" className="nav-shortcut" onClick={onOpenFriends} title="Lista de Amigos (Buscar, Mensagens, Party)"><span>⭐</span><small>Amigos</small></button>
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
