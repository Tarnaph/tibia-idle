'use client';
/* eslint-disable @next/next/no-img-element -- Local pixel sprites and provider avatar URLs are intentionally rendered without image optimization. */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useReducer, useState } from 'react';
import { useAuth } from '@/apps/web/auth/AuthProvider';
import { authModalReducer } from '@/packages/auth/src/authActions';
import type { GameUpdateRow } from '@/packages/auth/src/types';
import { AuthModal } from './AuthModal';

const VOCATION_SHOWCASE = [
  {
    id: 'knight',
    name: 'KNIGHT',
    title: 'Guerreiro do Escudo Inquebrável',
    role: 'Tanque & Linha de Frente',
    icon: '🛡️',
    sprite: '/generated/tibia860/outfit-knight-south-frame-1.png',
    description: 'Especialista em combate corpo a corpo de curta distância e absorção devastadora de dano. Mantém a agressividade dos monstros focada no seu escudo.',
    stats: { damage: '75%', defense: '98%', support: '40%', range: '20%' },
    skills: ['Challenge (Exeta Res)', 'Whirlwind Sword (Exori)', 'Fierce Berserk (Exori Gran)', 'Blood Rage (Utito Tempo)'],
  },
  {
    id: 'paladin',
    name: 'PALADIN',
    title: 'Atirador de Precisão Sagrada',
    role: 'Dps à Distância & Híbrido',
    icon: '🏹',
    sprite: '/generated/tibia860/outfit-paladin-south-frame-1.png',
    description: 'Mestre em armas de distância, lanças encantadas e magias de cura pessoal. Causa dano físico e sagrado contínuo a uma distância segura.',
    stats: { damage: '90%', defense: '65%', support: '60%', range: '95%' },
    skills: ['Divine Missile (Exori San)', 'Divine Caldera (Mas San)', 'Sharpshooter (Utito Tempo San)', 'Salvation (Exura Gran San)'],
  },
  {
    id: 'sorcerer',
    name: 'SORCERER',
    title: 'Mestre das Chamas & Arcane',
    role: 'Dps Elemental em Área',
    icon: '🔥',
    sprite: '/generated/tibia860/outfit-sorcerer-south-frame-1.png',
    description: 'Devastador de hordas inimigas. Canaliza magias de fogo e eletricidade para incinerar grupos inteiros de monstros em frações de segundo.',
    stats: { damage: '100%', defense: '35%', support: '30%', range: '85%' },
    skills: ['Hell\'s Core (Exori Gran Mas Flam)', 'Rage of the Skies (Exori Gran Mas Vis)', 'Great Energy Beam (Exori Vis Lux)', 'Magic Shield (Utamo Vita)'],
  },
  {
    id: 'druid',
    name: 'DRUID',
    title: 'Guardião Primordial da Terra & Gelo',
    role: 'Suporte Vital & Controle',
    icon: '❄️',
    sprite: '/generated/tibia860/outfit-druid-south-frame-1.png',
    description: 'Possui o dom supremo da cura em grupo e restauração vital para toda a expedição, além de conjurar tempestades de gelo e paralisação.',
    stats: { damage: '80%', defense: '45%', support: '100%', range: '80%' },
    skills: ['Eternal Winter (Exori Gran Mas Frigo)', 'Heal Friend (Exura Sio)', 'Mass Healing (Exura Gran Mas Res)', 'Ice Strike (Exori Frigo)'],
  },
];

const GAME_HUNTS = [
  { id: 1, name: 'Caverna dos Goblins', level: 'Nível 1 - 15', danger: 'Fácil', reward: 'Loot Inicial, Moedas de Ouro, Poções', bg: '#1c221a' },
  { id: 2, name: 'Templo Abandonado', level: 'Nível 15 - 35', danger: 'Moderado', reward: 'Esqueletos, Runic Stones, Equipamentos Bronze', bg: '#251e18' },
  { id: 3, name: 'Covil dos Orcs & Elfos', level: 'Nível 35 - 60', danger: 'Perigoso', reward: 'Armas de Aço, Anéis de Mana, Escudos de Batalha', bg: '#1d232a' },
  { id: 4, name: 'Ruínas dos Dragões', level: 'Nível 60 - 90', danger: 'Mortal', reward: 'Dragon Scale Mail, Shield de Dragão, Gemas Raras', bg: '#2a1a15' },
  { id: 5, name: 'Catacumbas dos Demônios', level: 'Nível 90+', danger: 'Pessadelo', reward: 'Equipamentos Lendários, Orbs Mágicos, Demon Armor', bg: '#231215' },
];

function formatDate(value: string | null): string {
  if (!value) return 'RASCUNHO';
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(new Date(value));
}

export function LandingPage({
  updates,
  authRequired = false,
  accessDenied = false,
}: {
  updates: GameUpdateRow[];
  authRequired?: boolean;
  accessDenied?: boolean;
}) {
  const auth = useAuth();
  const router = useRouter();
  const [authModal, dispatchAuth] = useReducer(authModalReducer, { open: authRequired, mode: 'login' });
  const [selectedUpdate, setSelectedUpdate] = useState<GameUpdateRow | null>(null);
  const [activeVocationTab, setActiveVocationTab] = useState<string>('knight');

  const play = () => {
    if (auth.status === 'authenticated') router.push('/game');
    else dispatchAuth({ type: 'open-login' });
  };

  const selectedVocation = VOCATION_SHOWCASE.find((v) => v.id === activeVocationTab) || VOCATION_SHOWCASE[0];

  return (
    <div className="public-site diablo-theme">
      {/* DIABLO IV STYLE TOP HEADER NAV */}
      <header className="public-header diablo-header">
        <a className="public-brand diablo-brand" href="#inicio" aria-label="Exura Idle Adventures — início">
          <img src="/logo.png" alt="Exura Idle Adventures" style={{ height: '42px', width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.9))' }} />
        </a>

        <nav aria-label="Navegação do site" className="diablo-nav">
          <a href="#inicio">INÍCIO</a>
          <a href="#jogo">O JOGO</a>
          <a href="#vocacoes">VOCAÇÕES</a>
          <a href="#hunts">HUNTS</a>
          <a href="#atualizacoes">ATUALIZAÇÕES</a>
        </nav>

        <div className="public-account diablo-account">
          {auth.status === 'authenticated' && auth.viewer ? (
            <>
              <Link className="header-play diablo-cta-btn" href="/game">
                <span>JOGAR AGORA</span>
              </Link>
              {auth.viewer.role === 'admin' && (
                <Link className="admin-link diablo-admin-link" href="/admin">
                  ADMIN
                </Link>
              )}
              <span className="viewer-chip diablo-viewer-chip">
                {auth.viewer.avatarUrl ? (
                  <img src={auth.viewer.avatarUrl} alt="" />
                ) : (
                  <i>{auth.viewer.displayName.charAt(0).toUpperCase()}</i>
                )}
                <b>{auth.viewer.displayName}</b>
              </span>
              <button className="logout-button diablo-logout-btn" type="button" onClick={() => void auth.signOut()}>
                SAIR
              </button>
            </>
          ) : (
            <button
              className="header-play diablo-cta-btn"
              type="button"
              onClick={play}
              disabled={auth.status === 'loading'}
            >
              <span>{auth.status === 'loading' ? 'CARREGANDO...' : 'ENTRAR / JOGAR'}</span>
            </button>
          )}
        </div>
      </header>

      <main>
        {(authRequired || accessDenied) && (
          <div className="site-alert diablo-alert" role="status">
            {accessDenied ? '⚠️ Sua conta não possui acesso administrativo.' : '🔒 Entre na sua conta para acessar o cliente do jogo.'}
          </div>
        )}

        {/* HERO SECTION - DIABLO IV STYLE WITH BACKGROUND VIDEO */}
        <section className="hero-section diablo-hero" id="inicio">
          <div className="diablo-hero-video-container">
            <video
              className="diablo-hero-video"
              src="/songtibia.webm"
              autoPlay
              loop
              muted
              playsInline
            />
            <div className="diablo-hero-video-overlay" />
          </div>

          <div className="diablo-hero-content-centered">
            <div className="diablo-hero-logo-wrap">
              <img
                src="/logo.png"
                alt="Exura Idle Adventures"
                className="diablo-hero-logo"
              />
            </div>
            <div className="diablo-eyebrow">
              <span className="diablo-gem">❖</span> MMORPG IDLE DE NAVEGADOR <span className="diablo-gem">❖</span>
            </div>
            <h1 className="diablo-title">
              DESÇA ÀS CAVERNAS.<br />
              <span className="diablo-title-highlight">CONQUISTE AS SOMBRAS.</span>
            </h1>
            <p className="diablo-subtitle">
              Reúna sua party de Knights, Paladins, Sorcerers e Druids. Treine suas habilidades, conquiste loots lendários e evolua sem parar em uma jornada épica nas profundezas.
            </p>
            <div className="hero-actions diablo-hero-actions">
              <button className="diablo-btn-primary large" type="button" onClick={play}>
                <span className="diablo-btn-glow" />
                <span className="diablo-btn-text">⚔ JOGAR AGORA</span>
              </button>
              <a className="diablo-btn-secondary" href="#vocacoes">
                EXPLORAR VOCAÇÕES ✦
              </a>
            </div>
            <small className="diablo-notice">✦ Gratuito para jogar no navegador · Sem necessidade de download ✦</small>
          </div>
        </section>

        {/* OVERVIEW & STATS BAR */}
        <section className="about-section diablo-about" id="jogo">
          <div className="section-heading diablo-heading">
            <span className="eyebrow diablo-eyebrow">✦ CONHEÇA A EXPEDIÇÃO ✦</span>
            <h2>Sua jornada evolui mesmo quando você estiver offline.</h2>
          </div>
          <div className="about-copy diablo-stats-grid">
            <p>
              Cavebound combina o gerenciamento estratégico de equipamentos, party e vocações com o ritmo constante de progressão idle. Escolha as melhores zonas de caça, acompanhe combates eletrizantes e prepare cada herói para desafios mortais.
            </p>
            <div className="about-stat diablo-stat-card">
              <strong>4</strong>
              <span>Vocações Únicas</span>
            </div>
            <div className="about-stat diablo-stat-card">
              <strong>6+</strong>
              <span>Hunts Emblemáticas</span>
            </div>
            <div className="about-stat diablo-stat-card">
              <strong>∞</strong>
              <span>Evolução Contínua</span>
            </div>
          </div>
        </section>

        {/* VOCATIONS / CLASSES SHOWCASE - DIABLO IV STYLE */}
        <section className="features-section diablo-classes-section" id="vocacoes">
          <div className="section-heading diablo-heading center">
            <span className="eyebrow diablo-eyebrow">✦ ESCOLHA SEU DESTINO ✦</span>
            <h2>As Vocações de Cavebound</h2>
            <p style={{ color: '#a09886', maxWidth: '600px', margin: '10px auto 0', fontSize: '15px' }}>
              Cada vocação traz habilidades devastadoras e papéis essenciais para o combate em grupo nas cavernas.
            </p>
          </div>

          {/* Class Tabs */}
          <div className="diablo-class-tabs">
            {VOCATION_SHOWCASE.map((voc) => (
              <button
                key={voc.id}
                type="button"
                className={`diablo-class-tab ${activeVocationTab === voc.id ? 'active' : ''}`}
                onClick={() => setActiveVocationTab(voc.id)}
              >
                <span className="tab-icon">{voc.icon}</span>
                <span className="tab-name">{voc.name}</span>
              </button>
            ))}
          </div>

          {/* Class Showcase Card */}
          <div className="diablo-class-card">
            <div className="diablo-class-preview">
              <img src={selectedVocation.sprite} alt={selectedVocation.name} className="class-sprite" />
              <div className="class-badge">{selectedVocation.role}</div>
            </div>
            <div className="diablo-class-info">
              <span className="class-icon-badge">{selectedVocation.icon}</span>
              <h3>{selectedVocation.name} — {selectedVocation.title}</h3>
              <p className="class-desc">{selectedVocation.description}</p>

              <div className="class-stats-bars">
                <div className="stat-row">
                  <span>DANO</span>
                  <div className="bar-bg"><div className="bar-fill damage" style={{ width: selectedVocation.stats.damage }} /></div>
                  <small>{selectedVocation.stats.damage}</small>
                </div>
                <div className="stat-row">
                  <span>DEFESA</span>
                  <div className="bar-bg"><div className="bar-fill defense" style={{ width: selectedVocation.stats.defense }} /></div>
                  <small>{selectedVocation.stats.defense}</small>
                </div>
                <div className="stat-row">
                  <span>SUPORTE</span>
                  <div className="bar-bg"><div className="bar-fill support" style={{ width: selectedVocation.stats.support }} /></div>
                  <small>{selectedVocation.stats.support}</small>
                </div>
                <div className="stat-row">
                  <span>ALCANCE</span>
                  <div className="bar-bg"><div className="bar-fill range" style={{ width: selectedVocation.stats.range }} /></div>
                  <small>{selectedVocation.stats.range}</small>
                </div>
              </div>

              <div className="class-skills-list">
                <h4>HABILIDADES PRINCIPAIS</h4>
                <div className="skills-tags">
                  {selectedVocation.skills.map((skill) => (
                    <span key={skill} className="skill-tag">⚡ {skill}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* HUNTS & WORLD SHOWCASE */}
        <section className="diablo-hunts-section" id="hunts">
          <div className="section-heading diablo-heading center">
            <span className="eyebrow diablo-eyebrow">✦ EXPEDIÇÕES & CAVERNAS ✦</span>
            <h2>Territórios de Caça</h2>
            <p style={{ color: '#a09886', maxWidth: '620px', margin: '10px auto 0', fontSize: '15px' }}>
              Enfrente perigos crescentes em masmorras sombrias e conquiste relíquias lendárias.
            </p>
          </div>

          <div className="diablo-hunts-grid">
            {GAME_HUNTS.map((hunt) => (
              <div key={hunt.id} className="diablo-hunt-card">
                <div className="hunt-header">
                  <span className="hunt-number">0{hunt.id}</span>
                  <span className={`hunt-badge ${hunt.danger.toLowerCase()}`}>{hunt.danger}</span>
                </div>
                <h3>{hunt.name}</h3>
                <div className="hunt-level">{hunt.level}</div>
                <p className="hunt-reward"><b>Recompensas:</b> {hunt.reward}</p>
              </div>
            ))}
          </div>
        </section>

        {/* UPDATES & DEV DIARY */}
        <section className="updates-section diablo-updates-section" id="atualizacoes">
          <div className="section-heading diablo-heading">
            <span className="eyebrow diablo-eyebrow">✦ NOTAS DE ATUALIZAÇÃO ✦</span>
            <h2>Diário de Desenvolvimento</h2>
          </div>
          {updates.length > 0 ? (
            <div className="updates-list diablo-updates-list">
              {updates.map((update, index) => (
                <article key={update.id} className="diablo-update-card">
                  <span className="update-number">0{index + 1}</span>
                  <time dateTime={update.published_at ?? undefined}>{formatDate(update.published_at)}</time>
                  <div>
                    <h3>{update.title}</h3>
                    <p>{update.summary}</p>
                  </div>
                  <button type="button" className="diablo-read-more" onClick={() => setSelectedUpdate(update)}>
                    LER NOTA COMPLETA <span>→</span>
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="updates-empty diablo-updates-empty">
              <span>✦</span>
              <h3>O diário de expedição será aberto em breve.</h3>
              <p>Novas atualizações publicadas aparecerão automaticamente nesta seção.</p>
            </div>
          )}
        </section>

        {/* FINAL EPIC CALL TO ACTION */}
        <section className="final-cta diablo-final-cta">
          <div className="diablo-cta-bg" />
          <div className="diablo-cta-content">
            <span className="eyebrow diablo-eyebrow">✦ A CAVERNA ESPERA ✦</span>
            <h2>Reúna sua party e comece sua lenda agora.</h2>
            <p>Jogue diretamente pelo navegador, sem downloads e com evolução idle contínua.</p>
            <button className="diablo-btn-primary large" type="button" onClick={play}>
              <span className="diablo-btn-glow" />
              <span className="diablo-btn-text">⚔ JOGAR CAVEBOUND AGORA</span>
            </button>
          </div>
        </section>
      </main>

      {/* DIABLO IV STYLE FOOTER */}
      <footer className="public-footer diablo-footer">
        <a className="public-brand" href="#inicio">
          <img src="/logo.png" alt="Exura Idle Adventures" style={{ height: '42px', width: 'auto', objectFit: 'contain' }} />
        </a>
        <p className="diablo-footer-text">Cavebound / Exura Idle Adventures — MMORPG idle de navegador em desenvolvimento ativo.</p>
        <div className="diablo-social-links">
          <a href="https://facebook.com" target="_blank" rel="noreferrer" title="Facebook">Facebook</a>
          <span>·</span>
          <a href="https://instagram.com" target="_blank" rel="noreferrer" title="Instagram">Instagram</a>
          <span>·</span>
          <a href="https://tiktok.com" target="_blank" rel="noreferrer" title="TikTok">TikTok</a>
        </div>
        <small>© 2026 Exura Idle Adventures · Todos os direitos reservados.</small>
      </footer>

      {authModal.open && (
        <AuthModal
          mode={authModal.mode}
          onMode={(mode) => dispatchAuth({ type: 'switch', mode })}
          onClose={() => dispatchAuth({ type: 'close' })}
        />
      )}

      {selectedUpdate && (
        <div
          className="auth-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setSelectedUpdate(null);
          }}
        >
          <article className="update-dialog diablo-update-dialog" role="dialog" aria-modal="true" aria-labelledby="update-title">
            <button className="modal-close" type="button" onClick={() => setSelectedUpdate(null)} aria-label="Fechar">
              ×
            </button>
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
