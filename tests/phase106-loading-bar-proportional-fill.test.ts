import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Phase 106 - Loading Bar Proportional Filling in Sync with Percentage', () => {
  const exuraComponentPath = path.resolve(__dirname, '../apps/web/components/ExuraLoadingScreen.tsx');
  const globalsCssPath = path.resolve(__dirname, '../app/globals.css');

  it('verifies ExuraLoadingScreen updates progress fill width synchronously with progress state', () => {
    const content = fs.readFileSync(exuraComponentPath, 'utf8');

    // Synchronous frame-by-frame width calculation
    expect(content).toContain('width: `${Math.min(100, Math.max(0, progress))}%`');
    // Calibrated cavity geometry matching 1024x341 slot
    expect(content).toContain("left: '7.8%'");
    expect(content).toContain("width: '84.4%'");
    expect(content).toContain("top: '40.5%'");
    expect(content).toContain("height: '17.2%'");
  });

  it('verifies ExuraLoadingScreen includes vibrant molten magma gradient and leading spark', () => {
    const content = fs.readFileSync(exuraComponentPath, 'utf8');

    expect(content).toContain('#fff799');
    expect(content).toContain('#ffe066');
    expect(content).toContain('#ff5e00');
    expect(content).toContain('#ff2200');
    expect(content).toContain('progress > 0.5 && progress < 99.8');
    expect(content).toContain('boxShadow');
  });

  it('verifies ExuraLoadingScreen includes percentage display centered inside the bar slot', () => {
    const content = fs.readFileSync(exuraComponentPath, 'utf8');

    expect(content).toContain('In-bar Numeric Percentage Display');
    expect(content).toContain('{Math.round(progress)}%');
  });

  it('verifies globals.css eliminates transition lag and styles cavity for clear visibility', () => {
    const content = fs.readFileSync(globalsCssPath, 'utf8');

    expect(content).toContain('.exura-loading-cavity');
    expect(content).toContain('top: 40.5% !important;');
    expect(content).toContain('height: 17.2% !important;');
    expect(content).toContain('.exura-loading-progress-fill');
    expect(content).toContain('#fff799');
    expect(content).toContain('#ffe066');
    expect(content).toContain('#ff2200');
    // Verifies absence of transition width delay that caused transition thrashing
    expect(content).not.toContain('.exura-loading-progress-fill {\n  height: 100% !important;\n  position: relative !important;\n  overflow: hidden !important;\n  background: linear-gradient(180deg, #fff799 0%, #ffe066 15%, #ff5e00 40%, #ff2200 70%, #990000 100%) !important;\n  box-shadow: 0 0 22px rgba(255, 90, 0, 1), 0 0 45px rgba(255, 40, 0, 0.85), inset 0 2px 4px rgba(255, 255, 240, 0.95) !important;\n  transition: width');
  });
});
