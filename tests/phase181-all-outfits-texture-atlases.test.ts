import { describe, it, expect, beforeEach } from 'vitest';
import {
  hasOutfitAtlas,
  hasMountAtlas,
  getOutfitAtlasManifest,
  getMountAtlasManifest,
  loadOutfitAtlas,
  loadMountAtlas,
  cancelAtlasScope,
} from '@/apps/web/lib/outfitAtlasLoader';
import {
  OUTFIT_ATLAS_INDEX,
  MOUNT_ATLAS_INDEX,
} from '@/content/generated/atlas-manifests';
import { compileAppearanceManifest } from '@/apps/web/lib/appearanceManifest';
import { outfitDiagnostics } from '@/apps/web/lib/outfitDiagnostics';
import { loadImage } from '@/apps/web/lib/outfitRecolor';
import fs from 'fs';
import path from 'path';

describe('Phase 181: Universal Texture Atlases & Resilient Loading Architecture', () => {
  beforeEach(() => {
    // Reset test attempt in diagnostics
    outfitDiagnostics.startAttempt({ characterName: 'TestHero', outfit: 'Brotherhood' });
  });

  describe('1. Comprehensive Atlas Catalog & Variable Capacity Validation', () => {
    it('covers all 158 outfit variations (79 outfits × 2 genders)', () => {
      const outfitKeys = Object.keys(OUTFIT_ATLAS_INDEX);
      expect(outfitKeys.length).toBe(158);

      // Verify specific variations
      expect(hasOutfitAtlas('brotherhood', 'male')).toBe(true);
      expect(hasOutfitAtlas('citizen', 'male')).toBe(true);
      expect(hasOutfitAtlas('assassin', 'male')).toBe(true);
      expect(hasOutfitAtlas('noble', 'female')).toBe(true);
      expect(hasOutfitAtlas('jersey', 'male')).toBe(true);
    });

    it('covers all 129 mounts without phantom files', () => {
      const mountKeys = Object.keys(MOUNT_ATLAS_INDEX);
      expect(mountKeys.length).toBe(129);

      expect(hasMountAtlas('rapid-boar')).toBe(true);
      expect(hasMountAtlas('midnight-panther')).toBe(true);
      expect(hasMountAtlas('armoured-war-horse')).toBe(true);
      expect(hasMountAtlas('black-sheep')).toBe(true);
      expect(hasMountAtlas('blazebringer')).toBe(true);
    });

    it('respects actual file capacities per outfit rather than assuming 9 frames or addons for all', () => {
      // Noble outfit only has 24 files (no walk cycle 9-frame)
      const nobleMeta = OUTFIT_ATLAS_INDEX['noble-male'];
      expect(nobleMeta).toBeDefined();
      expect(nobleMeta.framesCount).toBe(24);

      // Jersey outfit has 144 files (special structure)
      const jerseyMeta = OUTFIT_ATLAS_INDEX['jersey-male'];
      expect(jerseyMeta).toBeDefined();
      expect(jerseyMeta.framesCount).toBe(144);

      // Standard outfits (e.g. Assassin, Brotherhood, Citizen) have 432 files
      const assassinMeta = OUTFIT_ATLAS_INDEX['assassin-male'];
      expect(assassinMeta.framesCount).toBe(432);

      const brotherhoodMeta = OUTFIT_ATLAS_INDEX['brotherhood-male'];
      expect(brotherhoodMeta.framesCount).toBe(432);
    });

    it('verifies canonical atlas PNG files exist on disk for critical test outfits and mounts', () => {
      const publicDir = path.join(process.cwd(), 'public');
      const filesToCheck = [
        'generated/atlases/outfits/brotherhood-male-atlas.png',
        'generated/atlases/outfits/citizen-male-atlas.png',
        'generated/atlases/outfits/assassin-male-atlas.png',
        'generated/atlases/mounts/rapid-boar-atlas.png',
        'generated/atlases/mounts/midnight-panther-atlas.png',
      ];

      for (const rel of filesToCheck) {
        const fullPath = path.join(publicDir, rel);
        expect(fs.existsSync(fullPath), `Missing atlas file: ${rel}`).toBe(true);
        const stats = fs.statSync(fullPath);
        expect(stats.size).toBeGreaterThan(1000);
      }
    });
  });

  describe('2. Canonical Appearance Manifest Consolidation (0 Discrete Layer PNGs)', () => {
    it('emits only consolidated atlas URLs for Brotherhood + Rapid Boar + Addons', () => {
      const manifest = compileAppearanceManifest({
        outfit: 'brotherhood',
        gender: 'male',
        addons: 3,
        mount: 'rapid-boar',
        isMounted: true,
      });

      // Outfit URLs should ONLY contain the atlas texture URL and thumb
      expect(manifest.outfitUrls).toContain('/generated/atlases/outfits/brotherhood-male.png');
      expect(manifest.outfitUrls).toContain('/generated/outfit-thumbs/brotherhood.png');
      expect(manifest.outfitUrls.length).toBe(2);

      // Mount URLs should ONLY contain the mount atlas texture URL
      expect(manifest.mountUrls).toContain('/generated/atlases/mounts/rapid-boar.png');
      expect(manifest.mountUrls.length).toBe(1);

      // Essential URLs should strictly have 3 items total, not 250+ individual layers
      expect(manifest.allRequiredUrls.length).toBe(3);

      // Confirm NO discrete outfit layers were queued
      const hasDiscreteOutfit = manifest.allRequiredUrls.some(u =>
        u.includes('/generated/outfits/') && u.endsWith('-base.png')
      );
      expect(hasDiscreteOutfit).toBe(false);

      // Confirm NO discrete mount frames were queued
      const hasDiscreteMount = manifest.allRequiredUrls.some(u =>
        u.includes('/generated/mounts/') && u.includes('-south-f')
      );
      expect(hasDiscreteMount).toBe(false);
    });

    it('emits consolidated atlas for Citizen and Assassin + Midnight Panther', () => {
      const citizenManifest = compileAppearanceManifest({
        outfit: 'citizen',
        gender: 'male',
      });
      expect(citizenManifest.outfitUrls).toContain('/generated/atlases/outfits/citizen-male.png');
      expect(citizenManifest.outfitUrls.length).toBe(2);

      const assassinManifest = compileAppearanceManifest({
        outfit: 'assassin',
        gender: 'male',
        addons: 3,
        mount: 'midnight-panther',
        isMounted: true,
      });
      expect(assassinManifest.outfitUrls).toContain('/generated/atlases/outfits/assassin-male.png');
      expect(assassinManifest.mountUrls).toContain('/generated/atlases/mounts/midnight-panther.png');
      expect(assassinManifest.allRequiredUrls.length).toBe(3);
    });
  });

  describe('3. Isolated Telemetry: Preview Preparation vs Arena Preparation', () => {
    it('separates preview preparation from arena preparation without field collision', () => {
      const cur = outfitDiagnostics.getCurrentAttempt()!;
      expect(cur).toBeDefined();

      // Record preview preparation
      outfitDiagnostics.recordPreviewPreparation({
        status: 'ready',
        durationMs: 42,
        totalFramesRequested: 1,
        cachedFramesCount: 1,
        success: true,
      });

      // Check current report
      const repAfterPreview = outfitDiagnostics.getCurrentAttempt()!;
      expect(repAfterPreview.previewPreparation?.status).toBe('ready');
      expect(repAfterPreview.previewPreparation?.durationMs).toBe(42);
      // Arena preparation should remain idle or unset
      expect(repAfterPreview.arenaPreparation?.status ?? 'idle').toBe('idle');

      // Now record arena preparation
      outfitDiagnostics.recordArenaPreparation({
        status: 'ready',
        durationMs: 88,
        totalFramesRequested: 36,
        cachedFramesCount: 36,
        success: true,
      });

      const repAfterArena = outfitDiagnostics.getCurrentAttempt()!;
      expect(repAfterArena.previewPreparation?.status).toBe('ready');
      expect(repAfterArena.previewPreparation?.durationMs).toBe(42);
      expect(repAfterArena.arenaPreparation?.status).toBe('ready');
      expect(repAfterArena.arenaPreparation?.durationMs).toBe(88);
      // Both exist independently and do not overwrite each other
    });

    it('detects and preserves discrete PNG request divergences without being wiped', () => {
      // Simulate discrete PNG request detection
      outfitDiagnostics.recordDivergence(
        'DISCRETE_PNG_REQUESTED_FOR_ATLAS_COVERED_ASSET: /generated/outfits/citizen-male-south-f0-base.png'
      );

      const rep = outfitDiagnostics.getCurrentAttempt()!;
      expect(rep.divergences).toContain(
        'DISCRETE_PNG_REQUESTED_FOR_ATLAS_COVERED_ASSET: /generated/outfits/citizen-male-south-f0-base.png'
      );

      // Even after updateSelection or other actions trigger detectDivergence, divergence must remain
      outfitDiagnostics.updateSelection({ outfit: 'Citizen' });
      const repAfter = outfitDiagnostics.getCurrentAttempt()!;
      expect(repAfter.divergences).toContain(
        'DISCRETE_PNG_REQUESTED_FOR_ATLAS_COVERED_ASSET: /generated/outfits/citizen-male-south-f0-base.png'
      );
    });
  });

  describe('4. Cancelable Atlas Scope & Ref-Counting', () => {
    it('can cancel requests for a scope without throwing', () => {
      expect(() => cancelAtlasScope('modal_preview')).not.toThrow();
      expect(() => cancelAtlasScope('arena')).not.toThrow();
    });

    it('loads manifests on-demand via Node environment without errors', async () => {
      const brotherhoodManifest = await loadOutfitAtlas('brotherhood', 'male', 'test_scope');
      expect(brotherhoodManifest).toBeDefined();

      const boarManifest = await loadMountAtlas('rapid-boar', 'test_scope');
      expect(boarManifest).toBeDefined();
    });
  });
});
