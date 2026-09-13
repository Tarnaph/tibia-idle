import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Phase 102 - Exura Loading Screen 10s Duration & Magma Fill Visibility', () => {
  const exuraComponentPath = path.resolve(__dirname, '../apps/web/components/ExuraLoadingScreen.tsx');
  const gamePrototypePath = path.resolve(__dirname, '../apps/web/components/GamePrototype.tsx');
  const globalsCssPath = path.resolve(__dirname, '../app/globals.css');

  it('verifies ExuraLoadingScreen durationMs parameter is supported', () => {
    const content = fs.readFileSync(exuraComponentPath, 'utf8');
    expect(content).toMatch(/durationMs/);
  });

  it('verifies ExuraLoadingScreen includes animated fiery magma gradient, ember spark, and percentage display', () => {
    const content = fs.readFileSync(exuraComponentPath, 'utf8');
    // Check magma gradient
    expect(content).toContain('#ffe066');
    expect(content).toContain('#ff5e00');
    expect(content).toContain('#ff2200');
    // Check ember spark / leading head
    expect(content).toContain('boxShadow');
    expect(content).toContain('Math.round(progress)');
    // Check cavity dimensions calibrated for loading-bar-frame.png
    expect(content).toContain('7.8%');
    expect(content).toContain('84.4%');
  });

  it('verifies GamePrototype transitions are calibrated with durationMs', () => {
    const content = fs.readFileSync(gamePrototypePath, 'utf8');
    expect(content).toMatch(/durationMs/);
    expect(content).toMatch(/durationMs=\{transitionLoading\?\.durationMs \?\? \d+\}/);
  });

  it('verifies globals.css contains high-visibility magma gradient and obsidian cavity styles', () => {
    const content = fs.readFileSync(globalsCssPath, 'utf8');
    expect(content).toContain('.exura-loading-cavity');
    expect(content).toContain('.exura-loading-progress-fill');
    expect(content).toContain('#ffe066');
    expect(content).toContain('#ff2200');
  });
});
