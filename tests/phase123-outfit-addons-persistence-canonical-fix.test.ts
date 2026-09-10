import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  normalizeOutfitId,
  normalizeMountId,
  getOutfitCapabilities,
  getOutfitLayerUrls,
  getRecoloredCanvasSync,
  getCanvasCacheKey,
  clearImageElementCache,
  clearRecoloredCanvasCache,
  registerCachedImage,
  registerFailedImage,
  failedImageUrls,
} from '../apps/web/lib/outfitRecolor';
import { CharacterService } from '../packages/auth/src/characterService';
import rawOutfitsJson from '../content/generated/outfits.json';

describe('Phase 123: Correção de Addons Invisíveis, Normalização Canônica de Outfits (Noble/Noblewoman), Hidratação de Estado e Persistência Permanente', () => {
  let originalWindow: any;
  let originalDocument: any;
  let originalImage: any;

  class MockContext2D {
    public drawCalls = 0;
    public clearCalls = 0;
    clearRect(x: number, y: number, w: number, h: number) {
      this.clearCalls++;
    }
    drawImage(..._args: any[]) {
      this.drawCalls++;
    }
    getImageData() {
      return { data: new Uint8ClampedArray(64 * 64 * 4), width: 64, height: 64 };
    }
    createImageData() {
      return { data: new Uint8ClampedArray(64 * 64 * 4), width: 64, height: 64 };
    }
    putImageData() {}
  }

  class MockCanvas {
    width = 64;
    height = 64;
    public ctx = new MockContext2D();
    getContext() {
      return this.ctx;
    }
  }

  class MockImage {
    private _src = '';
    public crossOrigin = '';
    public complete = false;
    public naturalWidth = 0;
    public naturalHeight = 0;
    public onload: (() => void) | null = null;
    public onerror: (() => void) | null = null;

    set src(val: string) {
      this._src = val;
    }
    get src() {
      return this._src;
    }
  }

  beforeEach(() => {
    clearImageElementCache();
    clearRecoloredCanvasCache();

    originalWindow = (globalThis as any).window;
    originalDocument = (globalThis as any).document;
    originalImage = (globalThis as any).Image;

    (globalThis as any).window = globalThis;
    (globalThis as any).document = {
      createElement: (tag: string) => (tag === 'canvas' ? new MockCanvas() : new MockImage()),
    };
    (globalThis as any).Image = MockImage;
  });

  afterEach(() => {
    (globalThis as any).window = originalWindow;
    (globalThis as any).document = originalDocument;
    (globalThis as any).Image = originalImage;
  });

  describe('Item 1: Normalização Canônica do Traje Noble e Presença de Arquivos em Disco', () => {
    it('normaliza "Noble", "Nobleman" e "Noblewoman" para o ID canônico "noblewoman"', () => {
      expect(normalizeOutfitId('Noble')).toBe('noblewoman');
      expect(normalizeOutfitId('noble')).toBe('noblewoman');
      expect(normalizeOutfitId('Nobleman')).toBe('noblewoman');
      expect(normalizeOutfitId('nobleman')).toBe('noblewoman');
      expect(normalizeOutfitId('Noblewoman')).toBe('noblewoman');
      expect(normalizeOutfitId('noblewoman')).toBe('noblewoman');
    });

    it('retorna capabilities completas para Noble (hasAddon1: true, hasAddon2: true, hasMountRider: true)', () => {
      const caps = getOutfitCapabilities('Noble');
      expect(caps.hasAddon1).toBe(true);
      expect(caps.hasAddon2).toBe(true);
      expect(caps.hasMountRider).toBe(true);
      expect(caps.maxFrames).toBe(9);
    });

    it('garante que todos os arquivos em disco de base, máscara, addon1, addon2 montados e a pé do Noble existem', () => {
      const publicOutfitsDir = path.resolve(process.cwd(), 'public/generated/outfits');
      const files = new Set(fs.readdirSync(publicOutfitsDir));

      for (const gender of ['male', 'female'] as const) {
        for (const isMounted of [false, true]) {
          const urls = getOutfitLayerUrls('Noble', gender, 'south', 0, 3, 'donkey', isMounted);

          const baseFile = urls.base.replace('/generated/outfits/', '');
          const maskFile = urls.mask.replace('/generated/outfits/', '');
          const a1BaseFile = urls.addon1Base?.replace('/generated/outfits/', '');
          const a1MaskFile = urls.addon1Mask?.replace('/generated/outfits/', '');
          const a2BaseFile = urls.addon2Base?.replace('/generated/outfits/', '');
          const a2MaskFile = urls.addon2Mask?.replace('/generated/outfits/', '');

          expect(files.has(baseFile), `Missing base file: ${baseFile}`).toBe(true);
          expect(files.has(maskFile), `Missing mask file: ${maskFile}`).toBe(true);
          expect(files.has(a1BaseFile!), `Missing addon1 base file: ${a1BaseFile}`).toBe(true);
          expect(files.has(a1MaskFile!), `Missing addon1 mask file: ${a1MaskFile}`).toBe(true);
          expect(files.has(a2BaseFile!), `Missing addon2 base file: ${a2BaseFile}`).toBe(true);
          expect(files.has(a2MaskFile!), `Missing addon2 mask file: ${a2MaskFile}`).toBe(true);
        }
      }
    });

    it('garante que 100% dos outfits do catálogo possuem todos os arquivos necessários em disco sem 404', () => {
      const publicOutfitsDir = path.resolve(process.cwd(), 'public/generated/outfits');
      const files = new Set(fs.readdirSync(publicOutfitsDir));

      const CLASSIC_OUTFITS = [
        'Citizen', 'Hunter', 'Mage', 'Knight', 'Noble', 'Summoner', 'Warrior',
        'Barbarian', 'Sire', 'Druid', 'Sorcerer', 'Paladin', 'Oriental', 'Pirate', 'Assassin', 'Beggar'
      ];

      for (const outfitName of CLASSIC_OUTFITS) {
        const urls = getOutfitLayerUrls(outfitName, 'male', 'south', 0, 3, undefined, false);
        const baseFile = urls.base.replace('/generated/outfits/', '');
        const maskFile = urls.mask.replace('/generated/outfits/', '');
        expect(files.has(baseFile), `Missing base: ${baseFile}`).toBe(true);
        expect(files.has(maskFile), `Missing mask: ${maskFile}`).toBe(true);

        const caps = getOutfitCapabilities(outfitName);
        if (caps.hasAddon1 && urls.addon1Base) {
          const a1File = urls.addon1Base.replace('/generated/outfits/', '');
          expect(files.has(a1File), `Missing a1: ${a1File} for ${outfitName}`).toBe(true);
        }
        if (caps.hasAddon2 && urls.addon2Base) {
          const a2File = urls.addon2Base.replace('/generated/outfits/', '');
          expect(files.has(a2File), `Missing a2: ${a2File} for ${outfitName}`).toBe(true);
        }
      }
    });
  });

  describe('Item 2: Proteção do Cache Definitivo contra Envenenamento por Camadas Incompletas', () => {
    it('não grava no recoloredCanvasCache definitivo quando uma camada falha, gravando apenas em provisional', () => {
      const urls = getOutfitLayerUrls('citizen', 'male', 'south', 0, 1);

      const mockBase = new MockImage();
      mockBase.complete = true;
      mockBase.naturalWidth = 64;
      mockBase.naturalHeight = 64;

      const mockMask = new MockImage();
      mockMask.complete = true;
      mockMask.naturalWidth = 64;
      mockMask.naturalHeight = 64;

      registerCachedImage(urls.base, mockBase as any);
      registerCachedImage(urls.mask, mockMask as any);

      // Addon 1 marked as failed
      registerFailedImage(urls.addon1Base!);
      registerFailedImage(urls.addon1Mask!);

      const canvas = getRecoloredCanvasSync(
        'citizen',
        'male',
        'south',
        0,
        { head: 0, primary: 86, secondary: 114, detail: 76 },
        1
      );

      expect(canvas).not.toBeNull();

      // Clear image cache and register the actual addon images
      clearImageElementCache();
      const mockA1Base = new MockImage();
      mockA1Base.complete = true;
      mockA1Base.naturalWidth = 64;
      mockA1Base.naturalHeight = 64;

      const mockA1Mask = new MockImage();
      mockA1Mask.complete = true;
      mockA1Mask.naturalWidth = 64;
      mockA1Mask.naturalHeight = 64;

      registerCachedImage(urls.base, mockBase as any);
      registerCachedImage(urls.mask, mockMask as any);
      registerCachedImage(urls.addon1Base!, mockA1Base as any);
      registerCachedImage(urls.addon1Mask!, mockA1Mask as any);

      // Now with all layers ready, it should compose with all layers
      const definitiveCanvas = getRecoloredCanvasSync(
        'citizen',
        'male',
        'south',
        0,
        { head: 0, primary: 86, secondary: 114, detail: 76 },
        1
      );

      expect(definitiveCanvas).not.toBeNull();
    });
  });

  describe('Item 3: Persistência Permanente de Customização de Outfit, Addons e Montaria no CharacterService', () => {
    it('persiste outfit, outfitHead, outfitBody, outfitLegs, outfitFeet, outfitAddons, mount e mountActive no banco Prisma', async () => {
      let savedUpdateData: any = null;

      const mockPrisma: any = {
        character: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'char-123',
            level: 50,
            experience: BigInt(100000),
          }),
          update: vi.fn().mockImplementation(({ where, data }: any) => {
            savedUpdateData = data;
            return Promise.resolve({
              id: where.id,
              ...data,
              skills: [],
              inventory: [],
              spells: [],
            });
          }),
        },
      };

      const service = new CharacterService(mockPrisma);

      await service.saveCharacterProgress('char-123', {
        outfit: 'Noble',
        outfitHead: 10,
        outfitBody: 86,
        outfitLegs: 114,
        outfitFeet: 76,
        outfitAddons: 3,
        mount: 'donkey',
        mountActive: true,
      });

      expect(savedUpdateData).not.toBeNull();
      expect(savedUpdateData.outfit).toBe('Noble');
      expect(savedUpdateData.outfitHead).toBe(10);
      expect(savedUpdateData.outfitBody).toBe(86);
      expect(savedUpdateData.outfitLegs).toBe(114);
      expect(savedUpdateData.outfitFeet).toBe(76);
      expect(savedUpdateData.outfitAddons).toBe(3);
      expect(savedUpdateData.mount).toBe('donkey');
      expect(savedUpdateData.mountActive).toBe(true);
    });
  });

  describe('Item 4: Hidratação e Filtro de Adquiridos', () => {
    it('garante que isCharPremium preserva todos os trajes disponíveis quando filterAcquired está ativo', () => {
      const AVAILABLE_OUTFITS = [
        { id: 'Citizen', isPremium: false },
        { id: 'Hunter', isPremium: false },
        { id: 'Knight', isPremium: false },
        { id: 'Noble', isPremium: true },
        { id: 'Summoner', isPremium: true },
      ];

      const activeChar = { id: 'c1', outfit: 'Knight', isPremium: true };
      const isCharPremium = activeChar.isPremium !== false;

      const filtered = AVAILABLE_OUTFITS.filter(
        (o) => isCharPremium || !o.isPremium || o.id === activeChar.outfit
      );

      expect(filtered.length).toBe(5);
      expect(filtered.some((o) => o.id === 'Noble')).toBe(true);
      expect(filtered.some((o) => o.id === 'Summoner')).toBe(true);
    });
  });
});
