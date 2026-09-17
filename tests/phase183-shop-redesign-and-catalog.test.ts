import { describe, it, expect } from 'vitest';
import { content } from './fixture';
import {
  SHOP_CATEGORIES,
  SHOP_ITEMS_CATALOG,
  getShopItemsByCategory,
  filterShopItems,
} from '../apps/web/lib/shopCatalog';
import { buyShopItem, createIdleGame } from '../packages/domain/src';

describe('Phase 183 - Catálogo da Loja da Cidade: Equipamentos de FIX.md & Exercise Weapons', () => {
  describe('1. Validação de Categorias e Catálogo', () => {
    it('deve conter as 8 categorias da loja (Todos + 6 categorias de equipamentos + Exercise Weapons)', () => {
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

    it('deve conter exatamente os 66 itens (45 equipamentos de FIX.md + 21 armas de exercício)', () => {
      expect(SHOP_ITEMS_CATALOG).toHaveLength(66);

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

    it('deve conter rigorosamente os itens por categoria especificados em FIX.md', () => {
      // 1. Armors (5): Leather, Studded, Chain, Brass, Plate
      const armors = getShopItemsByCategory('armors');
      expect(armors.length).toBe(5);
      expect(armors.map((i) => i.name)).toEqual([
        'Leather Armor',
        'Studded Armor',
        'Chain Armor',
        'Brass Armor',
        'Plate Armor',
      ]);

      // 2. Legs (5): Leather, Studded, Chain, Brass, Plate
      const legs = getShopItemsByCategory('legs');
      expect(legs.length).toBe(5);
      expect(legs.map((i) => i.name)).toEqual([
        'Leather Legs',
        'Studded Legs',
        'Chain Legs',
        'Brass Legs',
        'Plate Legs',
      ]);

      // 3. Shoes (1): Leather Boots
      const shoes = getShopItemsByCategory('shoes');
      expect(shoes.length).toBe(1);
      expect(shoes[0].name).toBe('Leather Boots');

      // 4. Helmets (5): Leather, Studded, Brass, Viking, Steel
      const helmets = getShopItemsByCategory('helmets');
      expect(helmets.length).toBe(5);
      expect(helmets.map((i) => i.name)).toEqual([
        'Leather Helmet',
        'Studded Helmet',
        'Brass Helmet',
        'Viking Helmet',
        'Steel Helmet',
      ]);

      // 5. Shields (4): Studded, Brass, Plate, Spellbook
      const shields = getShopItemsByCategory('shields');
      expect(shields.length).toBe(4);
      expect(shields.map((i) => i.name)).toEqual([
        'Studded Shield',
        'Brass Shield',
        'Plate Shield',
        'Spellbook',
      ]);

      // 6. Weapons (25)
      const weapons = getShopItemsByCategory('weapons');
      expect(weapons.length).toBe(25);

      // 7. Exercise (21): 7 regular + 7 durable + 7 lasting
      const exercise = getShopItemsByCategory('exercise');
      expect(exercise.length).toBe(21);
      expect(exercise.filter((i) => i.tier === 'regular')).toHaveLength(7);
      expect(exercise.filter((i) => i.tier === 'durable')).toHaveLength(7);
      expect(exercise.filter((i) => i.tier === 'lasting')).toHaveLength(7);
    });

    it('NÃO deve conter equipamentos fora da lista de FIX.md (Demon Armor, Golden Armor, Crusader Helmet, etc.)', () => {
      const allItemNames = SHOP_ITEMS_CATALOG.map((i) => i.name.toLowerCase());
      expect(allItemNames).not.toContain('demon armor');
      expect(allItemNames).not.toContain('golden armor');
      expect(allItemNames).not.toContain('golden legs');
      expect(allItemNames).not.toContain('demon legs');
      expect(allItemNames).not.toContain('crusader helmet');
      expect(allItemNames).not.toContain('horned helmet');
      expect(allItemNames).not.toContain('tower shield');
      expect(allItemNames).not.toContain('griffin shield');
    });

    it('deve realizar busca textual e filtro de vocação corretamente', () => {
      const swordResults = filterShopItems({ query: 'sword' });
      expect(swordResults.length).toBeGreaterThan(0);

      const paladinResults = filterShopItems({ vocation: 'Paladin' });
      expect(paladinResults.some((i) => i.name === 'Bow')).toBe(true);
      expect(paladinResults.some((i) => i.name === 'Exercise Bow')).toBe(true);
      expect(paladinResults.some((i) => i.name === 'Wand of Inferno')).toBe(false);
    });
  });

  describe('2. Integração com a Economia e Compra de Equipamentos', () => {
    const seed = 'test-shop-fix-md-and-exercise';

    it('deve debitar o ouro e adicionar o Plate Armor (2463) ao inventário com sucesso', () => {
      const game = createIdleGame(seed, content);
      game.session.gold = 50000;
      const initialGold = game.session.gold;

      const activeChar = game.session.characters.find(
        (c) => c.id === (game.session.selectedCharacterId || game.session.leaderId)
      )!;
      activeChar.inventory.equipmentIds = [];

      const result = buyShopItem(game, 2463, 'Plate Armor', 1200, 1, content);

      expect(result.ok).toBe(true);
      expect(result.state.session.gold).toBe(initialGold - 1200);
      const updatedChar = result.state.session.characters.find((c) => c.id === activeChar.id)!;
      expect(updatedChar.inventory.equipmentIds).toContain(2463);
    });

    it('deve permitir a compra de armas de exercício', () => {
      const game = createIdleGame(seed, content);
      game.session.gold = 500000;

      const result = buyShopItem(game, 31821, 'Exercise Sword', 262500, 1, content);

      expect(result.ok).toBe(true);
      expect(result.state.session.gold).toBe(500000 - 262500);
    });

    it('deve rejeitar compra quando o jogador não possui ouro suficiente', () => {
      const game = createIdleGame(seed, content);
      game.session.gold = 10;

      const result = buyShopItem(game, 2187, 'Wand of Inferno', 15000, 1, content);

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Gold insuficiente');
      expect(result.state.session.gold).toBe(10);
    });
  });
});
