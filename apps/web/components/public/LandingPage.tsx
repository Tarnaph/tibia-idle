'use client';
/* eslint-disable @next/next/no-img-element -- Local pixel sprites and provider avatar URLs are intentionally rendered without image optimization. */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useReducer, useState } from 'react';
import { useAuth } from '@/apps/web/auth/AuthProvider';
import { authModalReducer } from '@/packages/auth/src/authActions';
import type { GameUpdateRow } from '@/packages/auth/src/types';
import { AuthModal } from './AuthModal';
import { HeroScene } from './HeroScene';

const features = [
  { icon: '♜', title: 'Monte sua party', text: 'Knight, Paladin, Sorcerer e Druid.' },
  { icon: '✦', title: 'Treine suas skills', text: 'Desenvolva cada personagem.' },
  { icon: '⚔', title: 'Caçadas automáticas', text: 'Escolha uma hunt e acompanhe sua party.' },
  { icon: '◆', title: 'Loot e equipamentos', text: 'Evolua através dos itens encontrados.' },
];

function formatDate(value: string | null): string {
  if (!value) return 'RASCUNHO';
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(new Date(value));
}

export function LandingPage({ updates, authRequired = false, accessDenied = false }: { updates: GameUpdateRow[]; authRequired?: boolean; accessDenied?: boolean }) {
  const auth = useAuth();
  const router = useRouter();
  const [authModal, dispatchAuth] = useReducer(authModalReducer, { open: authRequired, mode: 'login' });
  const [selectedUpdate, setSelectedUpdate] = useState<GameUpdateRow | null>(null);

  const play = () => {
    if (auth.status === 'authenticated') router.push('/game');
    else dispatchAuth({ type: 'open-login' });
  };

  return (
    <div className="public-site">
      <header className="public-header">
        <a className="public-brand" href="#inicio" aria-label="Cavebound — início"><span>C</span><strong>CAVEBOUND</strong></a>
        <nav aria-label="Navegação do site">
          <a href="#inicio">Início</a><a href="#jogo">O jogo</a><a href="#atualizacoes">Atualizações</a>
        </nav>
        <div className="public-account">
          {auth.status === 'authenticated' && auth.viewer ? (
            <>
              <Link className="header-play" href="/game">JOGAR</Link>
              {auth.viewer.role === 'admin' && <Link className="admin-link" href="/admin">ADMIN</Link>}
              <span className="viewer-chip">
                {auth.viewer.avatarUrl ? <img src={auth.viewer.avatarUrl} alt="" /> : <i>{auth.viewer.displayName.charAt(0).toUpperCase()}</i>}
                <b>{auth.viewer.displayName}</b>
              </span>
              <button className="logout-button" type="button" onClick={() => void auth.signOut()}>SAIR</button>
            </>
          ) : (
            <button className="header-play" type="button" onClick={play} disabled={auth.status === 'loading'}>{auth.status === 'loading' ? '…' : 'JOGAR'}</button>
          )}
        </div>
      </header>

      <main>
        {(authRequired || accessDenied) && (
          <div className="site-alert" role="status">
            {accessDenied ? 'Sua conta não possui acesso administrativo.' : 'Entre na sua conta para acessar o cliente do jogo.'}
          </div>
        )}

        <section className="hero-section" id="inicio">
          <div className="hero-copy">
            <span className="eyebrow">MMORPG IDLE · JOGUE NO NAVEGADOR</span>
            <h1>Desça às cavernas.<br /><em>Evolua sem parar.</em></h1>
            <p>Monte sua party, treine cada vocação e enfrente caçadas automáticas em um mundo inspirado nos MMORPGs 2D clássicos.</p>
            <div className="hero-actions">
              <button className="primary-button" type="button" onClick={play}>JOGAR AGORA</button>
              <a className="secondary-button" href="#jogo">CONHECER O JOGO</a>
            </div>
            <small>Protótipo em desenvolvimento · progresso de conta ainda não é salvo</small>
          </div>
          <HeroScene />
        </section>

        <section className="about-section" id="jogo">
          <div className="section-heading"><span className="eyebrow">SOBRE O JOGO</span><h2>Sua expedição continua em movimento.</h2></div>
          <div className="about-copy">
            <p>Cavebound combina decisões de party e equipamentos com o ritmo constante de um jogo idle. Escolha onde caçar, acompanhe o combate e prepare cada personagem para desafios maiores.</p>
            <div className="about-stat"><strong>4</strong><span>vocações jogáveis</span></div>
            <div className="about-stat"><strong>6</strong><span>hunts disponíveis</span></div>
            <div className="about-stat"><strong>∞</strong><span>evolução contínua</span></div>
          </div>
        </section>

        <section className="features-section" aria-labelledby="features-title">
          <div className="section-heading"><span className="eyebrow">PILARES DA EXPEDIÇÃO</span><h2 id="features-title">Prepare. Cace. Evolua.</h2></div>
          <div className="feature-grid">
            {features.map((feature) => <article key={feature.title}><span>{feature.icon}</span><h3>{feature.title}</h3><p>{feature.text}</p></article>)}
          </div>
        </section>

        <section className="updates-section" id="atualizacoes" aria-labelledby="updates-title">
          <div className="section-heading"><span className="eyebrow">DIÁRIO DE DESENVOLVIMENTO</span><h2 id="updates-title">Últimas atualizações</h2></div>
          {updates.length > 0 ? (
            <div className="updates-list">
              {updates.map((update, index) => (
                <article key={update.id}>
                  <span className="update-number">{String(index + 1).padStart(2, '0')}</span>
                  <time dateTime={update.published_at ?? undefined}>{formatDate(update.published_at)}</time>
                  <div><h3>{update.title}</h3><p>{update.summary}</p></div>
                  <button type="button" onClick={() => setSelectedUpdate(update)}>LER MAIS <span>→</span></button>
                </article>
              ))}
            </div>
          ) : (
            <div className="updates-empty"><span>◇</span><h3>O diário será aberto em breve.</h3><p>Atualizações publicadas no Supabase aparecerão automaticamente aqui.</p></div>
          )}
        </section>

        <section className="final-cta">
          <img src="/generated/tibia860/outfit-knight-south-frame-1.png" alt="" />
          <div><span className="eyebrow">A CAVERNA ESPERA</span><h2>Reúna sua party e comece a evoluir.</h2></div>
          <button className="primary-button" type="button" onClick={play}>JOGAR CAVEBOUND</button>
        </section>
      </main>

      <footer className="public-footer">
        <a className="public-brand" href="#inicio"><span>C</span><strong>CAVEBOUND</strong></a>
        <p>MMORPG idle de navegador em desenvolvimento.</p>
        <small>© 2026 Cavebound</small>
      </footer>

      {authModal.open && <AuthModal mode={authModal.mode} onMode={(mode) => dispatchAuth({ type: 'switch', mode })} onClose={() => dispatchAuth({ type: 'close' })} />}
      {selectedUpdate && (
        <div className="auth-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setSelectedUpdate(null); }}>
          <article className="update-dialog" role="dialog" aria-modal="true" aria-labelledby="update-title">
            <button className="modal-close" type="button" onClick={() => setSelectedUpdate(null)} aria-label="Fechar">×</button>
            <time>{formatDate(selectedUpdate.published_at)}</time>
            <h2 id="update-title">{selectedUpdate.title}</h2>
            <p className="update-summary">{selectedUpdate.summary}</p>
            <div className="update-content">{selectedUpdate.content}</div>
          </article>
        </div>
      )}
    </div>
  );
}
