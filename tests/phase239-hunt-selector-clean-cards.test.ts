import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Phase 239 - Clean Hunt Selector Cards (No Solo/Party Stats)', () => {
  const globalsCssPath = path.resolve(__dirname, '../app/globals.css');
  const huntSelectorTsxPath = path.resolve(__dirname, '../apps/web/components/HuntSelector.tsx');

  it('HuntSelector.tsx should not render solo/party stats or "Sem recorde ainda" in catalog cards', () => {
    const tsx = fs.readFileSync(huntSelectorTsxPath, 'utf-8');

    // Should not have the bottom stat section in catalog cards
    expect(tsx).not.toContain('<div className="hunt-card-bottom">');
    expect(tsx).not.toContain('<div className="hunt-card-no-record">Sem recorde ainda</div>');
    expect(tsx).not.toContain('<span className="hunt-card-stat-label">Solo</span>');
    expect(tsx).not.toContain('<span className="hunt-card-stat-label">Party</span>');

    // Should have clean recommended level badge
    expect(tsx).toContain('className="hunt-card-lvl-badge"');
    expect(tsx).toContain('hunt.recommendedLevel');
  });

  it('HuntSelector.tsx setup banner should display clean requirements rather than solo stats', () => {
    const tsx = fs.readFileSync(huntSelectorTsxPath, 'utf-8');

    expect(tsx).toContain('<span>Requisitos</span>');
    expect(tsx).toContain('Mínimo: Lv.');
    expect(tsx).toContain('Recomendado: Lv.');
    expect(tsx).not.toContain('HUNT_STATS_MAP[selectedHunt.id]?.soloXp');
  });

  it('globals.css should define compact card dimensions and level badge', () => {
    const css = fs.readFileSync(globalsCssPath, 'utf-8');

    expect(css).toMatch(/\.hunt-catalog-card\s*\{[^}]*min-height:\s*56px/);
    expect(css).toMatch(/\.hunt-catalog-card\s*\{[^}]*max-height:\s*68px/);
    expect(css).toMatch(/\.hunt-card-lvl-badge/);
  });
});
