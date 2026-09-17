import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Phase 184: Redesign da TopBar (HUD Superior), Reativação Dinâmica de Players Online e Exura Coins', () => {
  const rootDir = process.cwd();

  it('1. verifies that the classic gold-stack.png sprite exists on disk', () => {
    const goldStackPath = path.join(rootDir, 'public', 'images', 'gold-stack.png');
    expect(fs.existsSync(goldStackPath)).toBe(true);
    const stat = fs.statSync(goldStackPath);
    expect(stat.size).toBeGreaterThan(100);
  });

  it('2. verifies that tibia-coin.png exists on disk for Exura Coins', () => {
    const tibiaCoinPath = path.join(rootDir, 'public', 'images', 'tibia-coin.png');
    expect(fs.existsSync(tibiaCoinPath)).toBe(true);
  });

  it('3. verifies that WindowDockBar.tsx has the 3 semantic clusters (left, center, right)', () => {
    const dockPath = path.join(rootDir, 'apps', 'web', 'components', 'window', 'WindowDockBar.tsx');
    const content = fs.readFileSync(dockPath, 'utf8');

    expect(content).toContain('huntera-left-cluster');
    expect(content).toContain('huntera-center-cluster');
    expect(content).toContain('huntera-right-cluster');
  });

  it('4. verifies that currency badges are placed in the left cluster with Exura Coins and gold-stack.png', () => {
    const dockPath = path.join(rootDir, 'apps', 'web', 'components', 'window', 'WindowDockBar.tsx');
    const content = fs.readFileSync(dockPath, 'utf8');

    // Left cluster should contain currencies
    const leftClusterIdx = content.indexOf('huntera-left-cluster');
    const currencyGroupIdx = content.indexOf('huntera-currency-group');
    const centerClusterIdx = content.indexOf('huntera-center-cluster');

    expect(leftClusterIdx).toBeLessThan(currencyGroupIdx);
    expect(currencyGroupIdx).toBeLessThan(centerClusterIdx);

    // Verify gold-stack.png and Exura Coins
    expect(content).toContain('/images/gold-stack.png');
    expect(content).toContain('Exura Coins');
    expect(content).not.toContain('title="Huntera Coins"');
  });

  it('5. verifies that online players status is in the center cluster with pulsing dot', () => {
    const dockPath = path.join(rootDir, 'apps', 'web', 'components', 'window', 'WindowDockBar.tsx');
    const content = fs.readFileSync(dockPath, 'utf8');

    const centerClusterIdx = content.indexOf('huntera-center-cluster');
    const onlineStatusIdx = content.indexOf('huntera-online-status');
    const rightClusterIdx = content.indexOf('huntera-right-cluster');

    expect(centerClusterIdx).toBeLessThan(onlineStatusIdx);
    expect(onlineStatusIdx).toBeLessThan(rightClusterIdx);
    expect(content).toContain('status-dot green pulse');
    expect(content).toContain('jogadores online');
  });

  it('6. verifies that the shop button is inside the right cluster alongside utility actions', () => {
    const dockPath = path.join(rootDir, 'apps', 'web', 'components', 'window', 'WindowDockBar.tsx');
    const content = fs.readFileSync(dockPath, 'utf8');

    const rightClusterIdx = content.indexOf('huntera-right-cluster');
    const shopBtnIdx = content.indexOf('huntera-shop-btn');
    const actionsGridIdx = content.indexOf('huntera-actions-grid');

    expect(rightClusterIdx).toBeLessThan(shopBtnIdx);
    expect(shopBtnIdx).toBeLessThan(actionsGridIdx);
  });

  it('7. verifies that GamePrototype.tsx passes reactive onlinePlayersCount to WindowDockBar', () => {
    const protoPath = path.join(rootDir, 'apps', 'web', 'components', 'GamePrototype.tsx');
    const content = fs.readFileSync(protoPath, 'utf8');

    expect(content).toContain('onlinePlayersCount={Math.max(1, remotePlayers ? remotePlayers.size : 1)}');
  });

  it('8. verifies that globals.css includes styles for center cluster, right cluster, and pulse animation', () => {
    const cssPath = path.join(rootDir, 'app', 'globals.css');
    const content = fs.readFileSync(cssPath, 'utf8');

    expect(content).toContain('.huntera-center-cluster');
    expect(content).toContain('.huntera-right-cluster');
    expect(content).toContain('onlineStatusPulse');
  });
});
