import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Phase 251: UI/UX Mobile and Desktop Polish & Fixes', () => {
  const windowDockBar = fs.readFileSync(path.resolve('apps/web/components/window/WindowDockBar.tsx'), 'utf8');
  const quickActionDock = fs.readFileSync(path.resolve('apps/web/components/QuickActionDock.tsx'), 'utf8');
  const mobileMenuDrawer = fs.readFileSync(path.resolve('apps/web/components/mobile/MobileMenuDrawer.tsx'), 'utf8');
  const mobileBottomNav = fs.readFileSync(path.resolve('apps/web/components/mobile/MobileBottomNav.tsx'), 'utf8');
  const mobileTopBar = fs.readFileSync(path.resolve('apps/web/components/mobile/MobileTopBar.tsx'), 'utf8');
  const huntSelector = fs.readFileSync(path.resolve('apps/web/components/HuntSelector.tsx'), 'utf8');
  const gamePrototype = fs.readFileSync(path.resolve('apps/web/components/GamePrototype.tsx'), 'utf8');

  it('1. WindowDockBar and QuickActionDock do not display Arena PvP access buttons', () => {
    expect(windowDockBar).not.toContain('pvp-btn');
    expect(windowDockBar).not.toContain('Arena PvP');
    expect(quickActionDock).not.toContain('btn-pvp');
    expect(quickActionDock).not.toContain('Arena PvP');
  });

  it('2. MobileMenuDrawer removes Arena PvP and replaces Inspect Hero with VIP (Amigos)', () => {
    expect(mobileMenuDrawer).not.toContain('Arena PvP');
    expect(mobileMenuDrawer).not.toContain('Inspecionar Herói');
    expect(mobileMenuDrawer).toContain('VIP (Amigos)');
    expect(mobileMenuDrawer).toContain('onOpenVip');
  });

  it('3. MobileBottomNav removes world tab to give more room for essential navigation', () => {
    expect(mobileBottomNav).not.toContain("'world'");
    expect(mobileBottomNav).not.toContain("label: 'Mundo'");
  });

  it('4. MobileTopBar replaces duplicate settings button with quick audio sound/mute toggle', () => {
    expect(mobileTopBar).toContain('isAudioMuted()');
    expect(mobileTopBar).toContain('toggleAudioMuted()');
    expect(mobileTopBar).toContain('onAudioChange');
    expect(mobileTopBar).toContain('Desmutar Áudio do Jogo');
  });

  it('5. HuntSelector on mobile restricts tabs to Caçadas and Quests, with responsive Em Breve view', () => {
    expect(huntSelector).toContain('isMobile');
    expect(huntSelector).toContain("isMobileView");
    expect(huntSelector).toContain("['CAÇADAS', 'QUESTS']");
    expect(huntSelector).toContain('Diário de Missões & Quests');
    expect(huntSelector).toContain('Em Desenvolvimento · Em Breve');
    expect(huntSelector).toContain('Voltar para as Caçadas');
  });

  it('6. GamePrototype wires mobile VIP window, passes isMobile to HuntSelector, and sets initial tab', () => {
    expect(gamePrototype).toContain("mobileActiveTab, setMobileActiveTab] = useState<MobileTab>('character')");
    expect(gamePrototype).toContain("isMobile={responsive.isMobile}");
    expect(gamePrototype).toContain("onOpenVip={() => openWindow('friends')}");
  });
});
