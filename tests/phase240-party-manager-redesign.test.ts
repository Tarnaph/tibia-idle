import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Phase 240 - Minimalist Party Manager Redesign', () => {
  const globalsCssPath = path.resolve(__dirname, '../app/globals.css');
  const partyModalTsxPath = path.resolve(__dirname, '../apps/web/components/party/UnifiedPartyModal.tsx');

  it('UnifiedPartyModal.tsx should not render tactics & synergy tabs', () => {
    const tsx = fs.readFileSync(partyModalTsxPath, 'utf-8');

    // Should not have the tabs navigation
    expect(tsx).not.toContain('TÁTICAS & SINERGIA');
    expect(tsx).not.toContain("activeTab === 'tactics'");
    expect(tsx).not.toContain('party-tabs-nav');
    expect(tsx).not.toContain('party-synergies-section');
  });

  it('UnifiedPartyModal.tsx should render compact header, circular portrait, and 4 clean vocation cards', () => {
    const tsx = fs.readFileSync(partyModalTsxPath, 'utf-8');

    // Header elements
    expect(tsx).toContain('className="party-header-compact"');
    expect(tsx).toContain('Gerenciador de Party');
    expect(tsx).toContain('Monte sua composição ideal para caçar.');
    expect(tsx).toContain('className="party-recommended-formation"');
    expect(tsx).toContain('Formação recomendada');
    expect(tsx).toContain('className="party-slots-counter-pill"');

    // Card structure
    expect(tsx).toContain('className="party-card-portrait-circle"');
    expect(tsx).toContain('className="party-card-circle-lvl"');
    expect(tsx).toContain('className="party-card-circle-tag leader"');
    expect(tsx).toContain('className="party-card-hp-fill"');
    expect(tsx).toContain('PRONTO PARA CAÇAR');
    expect(tsx).toContain('className="party-card-short-role"');
    expect(tsx).toContain('className="party-btn-add-slot"');
  });

  it('UnifiedPartyModal.tsx should render compact footer with Autopreencher and Iniciar Caçada', () => {
    const tsx = fs.readFileSync(partyModalTsxPath, 'utf-8');

    // Footer elements
    expect(tsx).toContain('className="party-footer-compact"');
    expect(tsx).toContain('Autopreencher');
    expect(tsx).toContain('Convidar Jogador');
    expect(tsx).toContain('className="party-start-hunt-gold-btn"');
    expect(tsx).toContain('Iniciar Caçada');
    expect(tsx).toContain('Desfazer Grupo');
  });

  it('globals.css should define minimal compact party manager styles', () => {
    const css = fs.readFileSync(globalsCssPath, 'utf-8');

    expect(css).toContain('.party-header-compact');
    expect(css).toContain('.party-recommended-formation');
    expect(css).toContain('.party-card-portrait-circle');
    expect(css).toContain('.party-footer-compact');
    expect(css).toContain('.party-start-hunt-gold-btn');
  });
});
