import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  loadImage,
  isImagePermanentlyFailed,
  registerFailedImage,
  clearFailedImageCache,
  clearImageElementCache,
} from '../apps/web/lib/outfitRecolor';

describe('Phase 134: Resiliência de Carregamento de Montaria, Outfit Modal e Atalhos de Interface', () => {
  beforeEach(() => {
    clearFailedImageCache();
    clearImageElementCache();
  });

  it('deve permitir limpar o cache de imagens com falha através de clearFailedImageCache', () => {
    const testUrl = '/generated/mounts/test-mount-error.png';
    expect(isImagePermanentlyFailed(testUrl)).toBe(false);

    registerFailedImage(testUrl);
    expect(isImagePermanentlyFailed(testUrl)).toBe(true);

    clearFailedImageCache();
    expect(isImagePermanentlyFailed(testUrl)).toBe(false);
  });

  it('deve expirar imagens com falha após o TTL para evitar bloqueio permanente de montarias/outfits', () => {
    const testUrl = '/generated/mounts/temporary-network-glitch.png';
    registerFailedImage(testUrl);
    expect(isImagePermanentlyFailed(testUrl)).toBe(true);

    // Simula avanço no tempo além do TTL (15.000 ms)
    const realDateNow = Date.now;
    try {
      Date.now = () => realDateNow() + 16000;
      expect(isImagePermanentlyFailed(testUrl)).toBe(false);
    } finally {
      Date.now = realDateNow;
    }
  });

  it('WindowDockBar deve conter botões dedicados de Outfit e Montaria com atributos data-dock-id', () => {
    const windowDockBarPath = path.resolve(__dirname, '../apps/web/components/window/WindowDockBar.tsx');
    const content = fs.readFileSync(windowDockBarPath, 'utf8');

    expect(content).toContain('data-dock-id="outfit-btn"');
    expect(content).toContain('data-dock-id="mount-btn"');
    expect(content).toContain('isMounted?: boolean');
    expect(content).toContain('onToggleMount?: () => void');
    expect(content).toContain('outfit-btn');
    expect(content).toContain('mount-btn');
  });

  it('GamePrototype deve suportar os atalhos de teclado U (outfit) e Ctrl+R (montaria)', () => {
    const gameProtoPath = path.resolve(__dirname, '../apps/web/components/GamePrototype.tsx');
    const content = fs.readFileSync(gameProtoPath, 'utf8');

    expect(content).toContain("e.key === 'u'");
    expect(content).toContain('handleOpenOutfitModal(activeCharacter.id)');
    expect(content).toContain("e.key === 'r'");
    expect(content).toContain('e.ctrlKey');
    expect(content).toContain('handleToggleMount(activeCharacter.id)');
  });

  it('OutfitModal deve sincronizar activeCharacterId e restaurar mountActive corretamente', () => {
    const outfitModalPath = path.resolve(__dirname, '../apps/web/components/OutfitModal.tsx');
    const content = fs.readFileSync(outfitModalPath, 'utf8');

    expect(content).toContain('clearFailedImageCache()');
    expect(content).toContain('setSelectedCharId(activeCharacterId)');
    expect(content).toContain('hasMountRider && (char.mountActive ?? (char.mount && char.mount !== \'none\'))');
  });
});
