import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Phase 133: Correção do Botão Jogar Agora e Blindagem da Navegação Client-Side', () => {
  const projectRoot = path.resolve(__dirname, '..');
  const landingPagePath = path.resolve(projectRoot, 'apps/web/components/public/LandingPage.tsx');
  const viteConfigPath = path.resolve(projectRoot, 'vite.config.ts');

  describe('1. Blindagem de Erros de Módulos Dinâmicos no Vite (vite.config.ts)', () => {
    it('excludes vinext from optimizeDeps to prevent stale pre-bundled chunk hash errors', () => {
      const viteConfig = fs.readFileSync(viteConfigPath, 'utf8');

      expect(viteConfig).toContain('optimizeDeps: {');
      expect(viteConfig).toContain("exclude: ['@prisma/client', 'vinext']");
    });
  });

  describe('2. Blindagem de Promises e Navegação Segura (LandingPage.tsx)', () => {
    it('safely handles router.prefetch with catch to prevent unhandled promise rejections on hover/mount', () => {
      const landingSrc = fs.readFileSync(landingPagePath, 'utf8');

      expect(landingSrc).toContain("router.prefetch('/game')");
      expect(landingSrc).toContain('onHoverPlay');
      expect(landingSrc).toContain('onMouseEnter={onHoverPlay}');
      expect(landingSrc).toContain('catch(() => {})');
    });

    it('implements global unhandledrejection listener for dynamic module failures', () => {
      const landingSrc = fs.readFileSync(landingPagePath, 'utf8');

      expect(landingSrc).toContain('unhandledrejection');
      expect(landingSrc).toContain('Failed to fetch dynamically imported module');
      expect(landingSrc).toContain("window.location.assign('/game')");
    });

    it('implements robust fallback in play() with window.location.assign for authenticated users', () => {
      const landingSrc = fs.readFileSync(landingPagePath, 'utf8');

      expect(landingSrc).toContain("auth.status === 'authenticated'");
      expect(landingSrc).toContain("router.push('/game')");
      expect(landingSrc).toContain("window.location.assign('/game')");
      expect(landingSrc).toContain("dispatchAuth({ type: 'open-login' })");
    });
  });
});
