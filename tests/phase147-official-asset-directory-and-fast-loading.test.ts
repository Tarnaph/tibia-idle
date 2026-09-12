import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  ASSET_BASE_DIRS,
  getCanonicalItemUrl,
  getCanonicalSpellUrl,
  getCanonicalRuneUrl,
  getCanonicalPotionUrl,
  getCanonicalMonsterUrl,
  getCanonicalHuntUrl,
  getCanonicalAvatarUrl,
} from '../apps/web/lib/assetPaths';

describe('Phase 147: Organização Oficial de Assets, Regras de Resolução e Loading Ultrarrápido', () => {
  const rootDir = path.resolve(__dirname, '..');
  const exuraComponentPath = path.join(rootDir, 'apps/web/components/ExuraLoadingScreen.tsx');
  const assetPreloaderPath = path.join(rootDir, 'apps/web/lib/assetPreloader.ts');
  const itemSpritePath = path.join(rootDir, 'apps/web/components/ItemSprite.tsx');
  const huntCardPath = path.join(rootDir, 'apps/web/components/hunts/HuntCard.tsx');
  const agentsRulePath = path.join(rootDir, '.agents/rules/asset-paths.md');
  const agentsDocPath = path.join(rootDir, 'AGENTS.md');
  const setupScriptPath = path.join(rootDir, 'scripts/ensure-asset-junctions.cjs');

  describe('1. Módulo Central assetPaths.ts', () => {
    it('exporta constantes de diretórios canônicos para todas as categorias', () => {
      expect(ASSET_BASE_DIRS.items).toBe('/generated/cyclopedia/items');
      expect(ASSET_BASE_DIRS.itemsOfficial).toBe('/assets/items');
      expect(ASSET_BASE_DIRS.spells).toBe('/spells');
      expect(ASSET_BASE_DIRS.spellsOfficial).toBe('/assets/spells');
      expect(ASSET_BASE_DIRS.bestiary).toBe('/generated/bestiary');
      expect(ASSET_BASE_DIRS.monstersOfficial).toBe('/assets/monsters');
      expect(ASSET_BASE_DIRS.outfitsOfficial).toBe('/assets/outfits');
      expect(ASSET_BASE_DIRS.mountsOfficial).toBe('/assets/mounts');
    });

    it('resolve URLs canônicas corretamente para itens, monstros, magias, runas, poções e caçadas', () => {
      expect(getCanonicalItemUrl(2152)).toBe('/generated/cyclopedia/items/item-2152.png');
      expect(getCanonicalMonsterUrl('Amazon')).toBe('/generated/bestiary/amazon.png');
      expect(getCanonicalSpellUrl('exura')).toBe('/spells/exura.png');
      expect(getCanonicalSpellUrl(1)).toBe('/spells/canonical/spell-1.png');
      expect(getCanonicalRuneUrl('Sudden Death')).toBe('/runes/sudden-death-rune.png');
      expect(getCanonicalPotionUrl('Great Health')).toBe('/potions/great-health-potion.png');
      expect(getCanonicalHuntUrl('troll-caves')).toBe('/images/hunts/troll-caves.jpg');
      expect(getCanonicalAvatarUrl(1)).toBe('/images/avatars/avatar-1.png');
    });
  });

  describe('2. Regra .agents/rules/asset-paths.md e AGENTS.md', () => {
    it('garante que a regra oficial .agents/rules/asset-paths.md existe e contém a especificação', () => {
      expect(fs.existsSync(agentsRulePath)).toBe(true);
      const ruleContent = fs.readFileSync(agentsRulePath, 'utf8');
      expect(ruleContent).toContain('description:');
      expect(ruleContent).toContain('public/assets/items/');
      expect(ruleContent).toContain('public/assets/spells/');
      expect(ruleContent).toContain('public/assets/monsters/');
      expect(ruleContent).toContain('public/assets/outfits/');
      expect(ruleContent).toContain('public/assets/mounts/');
      expect(ruleContent).toContain('apps/web/lib/assetPaths.ts');
    });

    it('garante que AGENTS.md contém a Seção 6 de Diretriz de Imagens e Assets', () => {
      const agentsContent = fs.readFileSync(agentsDocPath, 'utf8');
      expect(agentsContent).toContain('6. **🖼️ Diretriz de Imagens, Sprites e Assets Visuais (Asset Paths):**');
      expect(agentsContent).toContain('public/assets/');
      expect(agentsContent).toContain('.agents/rules/asset-paths.md');
    });
  });

  describe('3. Tela de Loading Otimizada (ExuraLoadingScreen & assetPreloader)', () => {
    it('garante calibração de duração máxima efetiva de 2.5s para entrada rápida no jogo', () => {
      const exuraContent = fs.readFileSync(exuraComponentPath, 'utf8');
      expect(exuraContent).toContain('const effectiveDuration = waitForAssets ? Math.min(durationMs, 2500) : durationMs');
    });

    it('implementa mecanismo de pulo instantâneo por clique ou tecla na tela de loading', () => {
      const exuraContent = fs.readFileSync(exuraComponentPath, 'utf8');
      expect(exuraContent).toContain('handleSkip');
      expect(exuraContent).toContain("window.addEventListener('keydown', handleKeyDown)");
      expect(exuraContent).toContain('Clique na tela ou pressione qualquer tecla para entrar imediatamente');
    });

    it('garante que assetPreloader possui timeout de segurança (2200ms) e método markComplete', () => {
      const preloaderContent = fs.readFileSync(assetPreloaderPath, 'utf8');
      expect(preloaderContent).toContain('public markComplete(): void');
      expect(preloaderContent).toContain('this.safetyTimer = setTimeout(');
      expect(preloaderContent).toContain('2200');
    });
  });

  describe('4. Resiliência de Sprites (ItemSprite & HuntCard)', () => {
    it('garante que ItemSprite utiliza fallback para os 22.181 itens do Cyclopedia', () => {
      const itemSpriteContent = fs.readFileSync(itemSpritePath, 'utf8');
      expect(itemSpriteContent).toContain('resolveItemSpriteUrl');
      expect(itemSpriteContent).toContain('/generated/cyclopedia/items/item-');
      expect(itemSpriteContent).toContain('onError=');
    });

    it('garante que HuntCard possui fallback robusto para monstros do bestiário', () => {
      const huntCardContent = fs.readFileSync(huntCardPath, 'utf8');
      expect(huntCardContent).toContain('/generated/bestiary/');
      expect(huntCardContent).toContain('onError=');
    });

    it('garante que o script de garantia de junções de assets existe', () => {
      expect(fs.existsSync(setupScriptPath)).toBe(true);
    });
  });
});
