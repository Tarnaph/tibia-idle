import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { content } from './fixture';
import {
  SHOP_CATEGORIES,
  SHOP_ITEMS_CATALOG,
  getShopItemsByCategory,
  filterShopItems,
} from '../apps/web/lib/shopCatalog';
import { buyShopItem, createIdleGame } from '../packages/domain/src';

describe('Phase 183 - Redesign da Loja da Cidade: Categorias Estilo Treino & Catálogo Completo', () => {
  describe('1. Validação de Categorias e Catálogo', () => {
    it('deve conter as 8 categorias solicitadas (Todos + 7 categorias do treino)', () => {
      expect(SHOP_CATEGORIES).toHaveLength(8);
      const categoryIds = SHOP_CATEGORIES.map((c) => c.id);
      expect(categoryIds).toEqual([
        'all',
        'armors',
        'helmets',
        'legs',
        'shields',
        'weapons',
        'shoes',
        'exercise',
      ]);

      const categoryLabels = SHOP_CATEGORIES.map((c) => c.label);
      expect(categoryLabels).toEqual([
        'Todos',
        'Armors',
        'Helmets',
        'Legs',
        'Shields',
        'Weapons',
        'Shoes',
        'Exercise Weapons',
      ]);
    });

    it('deve conter exatamente os 67 equipamentos do catálogo do Print 2', () => {
      expect(SHOP_ITEMS_CATALOG).toHaveLength(67);

      // Todos os itens devem possuir ID único e atributos válidos
      const idSet = new Set<number>();
      for (const item of SHOP_ITEMS_CATALOG) {
        expect(item.id).toBeGreaterThan(0);
        expect(item.name).toBeTruthy();
        expect(item.price).toBeGreaterThan(0);
        expect(item.category).toBeTruthy();
        expect(idSet.has(item.id)).toBe(false);
        idSet.add(item.id);
      }
    });

    it('deve filtrar corretamente por categoria específica', () => {
      const armors = getShopItemsByCategory('armors');
      expect(armors.length).toBe(5); // Plate, Noble, Mammoth Fur, Golden, Demon
      expect(armors.every((item) => item.category === 'armors')).toBe(true);

      const helmets = getShopItemsByCategory('helmets');
      expect(helmets.length).toBe(5); // Leather, Iron, Straw, Horned, Crusader
      expect(helmets.every((item) => item.category === 'helmets')).toBe(true);

      const legs = getShopItemsByCategory('legs');
      expect(legs.length).toBe(5); // Leather, Studded, Chain, Golden, Demon
      expect(legs.every((item) => item.category === 'legs')).toBe(true);

      const shields = getShopItemsByCategory('shields');
      expect(shields.length).toBe(4); // Wooden, Griffin, Tower, Spellbook
      expect(shields.every((item) => item.category === 'shields')).toBe(true);

      const shoes = getShopItemsByCategory('shoes');
      expect(shoes.length).toBe(1); // Leather Boots
      expect(shoes[0].name).toBe('Leather Boots');

      const exercise = getShopItemsByCategory('exercise');
      expect(exercise.length).toBe(21); // 7 weapons * 3 tiers
      expect(exercise.every((item) => item.category === 'exercise')).toBe(true);

      const all = getShopItemsByCategory('all');
      expect(all.length).toBe(67);
    });

    it('deve validar os 3 tiers de armas de treino com cargas e atributos corretos', () => {
      const exerciseItems = getShopItemsByCategory('exercise');

      // Regular: 500 cargas
      const regularItems = exerciseItems.filter((i) => i.tier === 'regular');
      expect(regularItems).toHaveLength(7);
      expect(regularItems.every((i) => i.charges === 500)).toBe(true);
      expect(regularItems.every((i) => i.price === 262500)).toBe(true);

      // Durable: 1.800 cargas
      const durableItems = exerciseItems.filter((i) => i.tier === 'durable');
      expect(durableItems).toHaveLength(7);
      expect(durableItems.every((i) => i.charges === 1800)).toBe(true);
      expect(durableItems.every((i) => i.price === 945000)).toBe(true);

      // Lasting: 14.400 cargas
      const lastingItems = exerciseItems.filter((i) => i.tier === 'lasting');
      expect(lastingItems).toHaveLength(7);
      expect(lastingItems.every((i) => i.charges === 14400)).toBe(true);
      expect(lastingItems.every((i) => i.price === 7560000)).toBe(true);
    });

    it('deve realizar busca textual e filtro de vocação corretamente', () => {
      // Busca textual por nome
      const swordResults = filterShopItems({ query: 'sword' });
      expect(swordResults.length).toBeGreaterThan(0);
      expect(swordResults.every((i) => i.name.toLowerCase().includes('sword'))).toBe(true);

      // Filtro de vocação Paladin (deve incluir arcos e escudos)
      const paladinResults = filterShopItems({ vocation: 'Paladin' });
      expect(paladinResults.some((i) => i.name === 'Bow')).toBe(true);
      expect(paladinResults.some((i) => i.name === 'Crossbow')).toBe(true);
      expect(paladinResults.some((i) => i.name === 'Tower Shield')).toBe(true);
      // Não deve incluir armas exclusivas de Sorcerer
      expect(paladinResults.some((i) => i.name === 'Wand of Vortex')).toBe(false);
    });
  });

  describe('2. Verificação de Sprites Gerados de Armas de Exercício', () => {
    it('deve confirmar a existência de todos os 21 arquivos de sprites de exercício em public/assets/items/', () => {
      const exerciseIds = [
        // Regular
        31821, 31822, 31823, 31824, 31825, 31826, 35279,
        // Durable
        32384, 32385, 32386, 32387, 32388, 32389, 35285,
        // Lasting
        32390, 32391, 32392, 32393, 32394, 32395, 35286,
      ];

      const publicDir = path.resolve(__dirname, '..', 'public', 'assets', 'items');

      for (const id of exerciseIds) {
        const filePath = path.join(publicDir, `item-${id}.png`);
        expect(fs.existsSync(filePath), `Sprite item-${id}.png deve existir`).toBe(true);
        const stats = fs.statSync(filePath);
        expect(stats.size).toBeGreaterThan(100);
      }
    });
  });

  describe('3. Integração com a Economia e Compra de Equipamentos', () => {
    const seed = 'test-shop-183';

    it('deve debitar o ouro e adicionar o equipamento ao inventário com sucesso', () => {
      const game = createIdleGame(seed, content);
      game.session.gold = 50000;
      const initialGold = game.session.gold;

      const activeChar = game.session.characters.find(
        (c) => c.id === (game.session.selectedCharacterId || game.session.leaderId)
      )!;
      activeChar.inventory.equipmentIds = [];

      // Compra um Knight Armor (item 2476) por 5.000 gold
      const result = buyShopItem(game, 2476, 'Knight Armor', 5000, 1, content);

      expect(result.ok).toBe(true);
      expect(result.state.session.gold).toBe(initialGold - 5000);
      const updatedChar = result.state.session.characters.find((c) => c.id === activeChar.id)!;
      expect(updatedChar.inventory.equipmentIds).toContain(2476);
    });

    it('deve permitir a compra de múltiplos itens com o stepper', () => {
      const game = createIdleGame(seed, content);
      game.session.gold = 10000;

      // Compra 3 Bows (item 2456) por 150 gold cada = 450 gold
      const result = buyShopItem(game, 2456, 'Bow', 150, 3, content);

      expect(result.ok).toBe(true);
      expect(result.state.session.gold).toBe(10000 - 450);
    });

    it('deve rejeitar compra quando o jogador não possui ouro suficiente', () => {
      const game = createIdleGame(seed, content);
      game.session.gold = 1000;

      // Tenta comprar Demon Armor (item 2494) por 80.000 gold com apenas 1.000 gold
      const result = buyShopItem(game, 2494, 'Demon Armor', 80000, 1, content);

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Gold insuficiente');
      expect(result.state.session.gold).toBe(1000);
    });
  });
});
