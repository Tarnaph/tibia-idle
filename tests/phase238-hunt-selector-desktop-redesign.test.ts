import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Phase 238 - Hunt Selector Desktop Vertical Redesign', () => {
  const globalsCssPath = path.resolve(__dirname, '../app/globals.css');
  const huntSelectorTsxPath = path.resolve(__dirname, '../apps/web/components/HuntSelector.tsx');

  it('globals.css should define desktop hunt window dimensions and prevent horizontal scroll', () => {
    const css = fs.readFileSync(globalsCssPath, 'utf-8');

    // Bounded window dimensions
    expect(css).toMatch(/width:\s*min\(840px,\s*94vw\)/);
    expect(css).toMatch(/height:\s*min\(540px,\s*86vh\)/);
    expect(css).toMatch(/overflow-x:\s*hidden\s*!important/);

    // 4-column vertical grid
    expect(css).toMatch(/grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/);
    expect(css).toMatch(/overflow-y:\s*auto\s*!important/);
  });

  it('globals.css should format hunt card stats with a non-overflowing 3-column micro-grid', () => {
    const css = fs.readFileSync(globalsCssPath, 'utf-8');

    expect(css).toMatch(/grid-template-columns:\s*28px\s+1fr\s+1fr/);
    expect(css).toMatch(/text-overflow:\s*ellipsis/);
    expect(css).toMatch(/white-space:\s*nowrap/);
  });

  it('HuntSelector.tsx should have enriched hunt stats and clean search placeholder', () => {
    const tsx = fs.readFileSync(huntSelectorTsxPath, 'utf-8');

    expect(tsx).toContain('placeholder="Buscar caçadas..."');
    expect(tsx).toContain("'rat-cellars'");
    expect(tsx).toContain("soloXp: '2.0K XP/h'");
    expect(tsx).toContain("soloGp: '1.3K gp/h'");
    expect(tsx).toContain("'rotworm-cave'");
    expect(tsx).toContain("soloXp: '37.2K XP/h'");
    expect(tsx).toContain("soloGp: '8.4K gp/h'");
  });
});
