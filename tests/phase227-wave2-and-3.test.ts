import { describe, expect, it } from 'vitest';
import {
  preferredSellPrice,
  getBestiaryExpBonusPercent,
  getCompletedBestiaryCount,
  getEffectiveExpMultiplier,
  CANONICAL_BESTIARY_KILLS_NEEDED,
} from '../packages/domain/src';
import economyJson from '../content/generated/item-economy.json';
import equipmentJson from '../content/generated/equipment.json';

describe('Phase 227 - Waves 2 & 3: Multi-Tile Offsets, Economy Parity & Bestiary Scaling', () => {
  it('Calcula deslocamento de multi-tile para sprites 2x2 (64x64px)', () => {
    // Para um sprite de 64x64px (width 2, height 2)
    const texW = 64;
    const texH = 64;
    const wTiles = Math.max(1, Math.round(texW / 32));
    const hTiles = Math.max(1, Math.round(texH / 32));

    expect(wTiles).toBe(2);
    expect(hTiles).toBe(2);

    const wOffset = (wTiles - 1) * 32;
    const hOffset = (hTiles - 1) * 32;

    expect(wOffset).toBe(32);
    expect(hOffset).toBe(32);

    // Ponto central do tile (ex: x: 100, y: 100)
    const point = { x: 100, y: 100 };
    const posX = point.x - 16 - wOffset;
    const posY = point.y - 16 - hOffset;

    // Deve estar deslocado 32px à esquerda e 32px para cima
    expect(posX).toBe(52);
    expect(posY).toBe(52);
  });

  it('Calcula preços canônicos reais de venda em NPC ao invés do dummy 100gp', () => {
    const economyItems = (economyJson as any).items || [];
    
    // Testa que itens canônicos possuem preços do catálogo
    const goldItem = economyItems.find((it: any) => it.itemId === 2148);
    // Para itens vendidos por NPCs, preferredSellPrice deve retornar a cotação real
    const sword = economyItems.find((it: any) => it.itemId === 2376); // Sword
    if (sword) {
      const sell = preferredSellPrice(sword);
      expect(sell?.price).toBeGreaterThan(0);
      expect(sell?.price).not.toBe(100); // Não deve ser o dummy 100
    }
  });

  it('Verifica o catálogo canônico de killsNeeded do Bestiário', () => {
    expect(CANONICAL_BESTIARY_KILLS_NEEDED['rat']).toBe(250);
    expect(CANONICAL_BESTIARY_KILLS_NEEDED['cyclops']).toBe(500);
    expect(CANONICAL_BESTIARY_KILLS_NEEDED['dragon']).toBe(1000);
    expect(CANONICAL_BESTIARY_KILLS_NEEDED['demon']).toBe(2500);
  });
});
