import { describe, it, expect } from 'vitest';
import { content } from './fixture';
import {
  SHOP_CATEGORIES,
  SHOP_ITEMS_CATALOG,
  getShopItemsByCategory,
  filterShopItems,
} from '../apps/web/lib/shopCatalog';
import { buyShopItem, createIdleGame } from '../packages/domain/src';

describe('Phase 183 - Catálogo Curado da Loja da Cidade conforme FIX.md', () => {
  describe('1. Validação de Categorias e Itens de FIX.md', () => {
    it('deve conter as 7 categorias da loja (Todos + 6 categorias de equipamentos)', () => {
      expect(SHOP_CATEGORIES).toHaveLength(7);
      const categoryIds = SHOP_CATEGORIES.map((c) => c.id);
      expect(categoryIds).toEqual([
        'all',
        'armors',
        'helmets',
        'legs',
        'shields',
        'weapons',
        'shoes',
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
      ]);
    });

    it('deve conter exatamente os 45 equipamentos listados em FIX.md', () => {
      expect(SHOP_ITEMS_CATALOG).toHaveLength(45);

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
      const weaponNames = weapons.map((w) => w.name);
      expect(weaponNames).toContain('Hand Axe');
      expect(weaponNames).toContain('Sabre');
      expect(weaponNames).toContain('Spear');
      expect(weaponNames).toContain('Mace');
      expect(weaponNames).toContain('Scythe');
      expect(weaponNames).toContain('Sword');
      expect(weaponNames).toContain('Hatchet');
      expect(weaponNames).toContain('Longsword');
      expect(weaponNames).toContain('Orcish Axe');
      expect(weaponNames).toContain('Morning Star');
      expect(weaponNames).toContain('Bow');
      expect(weaponNames).toContain('Crossbow');
      expect(weaponNames).toContain('Double Axe');
      expect(weaponNames).toContain('Wand of Dragonbreath');
      expect(weaponNames).toContain('Moonlight Rod');
      expect(weaponNames).toContain('Broadsword');
      expect(weaponNames).toContain('Serpent Sword');
      expect(weaponNames).toContain('Wand of Decay');
      expect(weaponNames).toContain('Necrotic Rod');
      expect(weaponNames).toContain('Wand of Draconia');
      expect(weaponNames).toContain('Northwind Rod');
      expect(weaponNames).toContain('Wand of Cosmic Energy');
      expect(weaponNames).toContain('Terra Rod');
      expect(weaponNames).toContain('Wand of Inferno');
      expect(weaponNames).toContain('Hailstorm Rod');
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
      // Busca textual por nome
      const swordResults = filterShopItems({ query: 'sword' });
      expect(swordResults.length).toBeGreaterThan(0);
      expect(swordResults.every((i) => i.name.toLowerCase().includes('sword'))).toBe(true);

      // Filtro de vocação Paladin (deve incluir arcos e lanças)
      const paladinResults = filterShopItems({ vocation: 'Paladin' });
      expect(paladinResults.some((i) => i.name === 'Bow')).toBe(true);
      expect(paladinResults.some((i) => i.name === 'Crossbow')).toBe(true);
      expect(paladinResults.some((i) => i.name === 'Spear')).toBe(true);
      // Não deve incluir varinhas exclusivas de Sorcerer
      expect(paladinResults.some((i) => i.name === 'Wand of Inferno')).toBe(false);
    });
  });

  describe('2. Integração com a Economia e Compra de Equipamentos', () => {
    const seed = 'test-shop-fix-md';

    it('deve debitar o ouro e adicionar o Plate Armor (2463) ao inventário com sucesso', () => {
      const game = createIdleGame(seed, content);
      game.session.gold = 50000;
      const initialGold = game.session.gold;

      const activeChar = game.session.characters.find(
        (c) => c.id === (game.session.selectedCharacterId || game.session.leaderId)
      )!;
      activeChar.inventory.equipmentIds = [];

      // Compra um Plate Armor (item 2463) por 1.200 gold
      const result = buyShopItem(game, 2463, 'Plate Armor', 1200, 1, content);

      expect(result.ok).toBe(true);
      expect(result.state.session.gold).toBe(initialGold - 1200);
      const updatedChar = result.state.session.characters.find((c) => c.id === activeChar.id)!;
      expect(updatedChar.inventory.equipmentIds).toContain(2463);
    });

    it('deve permitir a compra de múltiplos itens com o stepper (3 Spears por 10 gp = 30 gp)', () => {
      const game = createIdleGame(seed, content);
      game.session.gold = 1000;

      const result = buyShopItem(game, 2389, 'Spear', 10, 3, content);

      expect(result.ok).toBe(true);
      expect(result.state.session.gold).toBe(1000 - 30);
    });

    it('deve rejeitar compra quando o jogador não possui ouro suficiente', () => {
      const game = createIdleGame(seed, content);
      game.session.gold = 10;

      // Tenta comprar Wand of Inferno por 15.000 gold com apenas 10 gold
      const result = buyShopItem(game, 2187, 'Wand of Inferno', 15000, 1, content);

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Gold insuficiente');
      expect(result.state.session.gold).toBe(10);
    });
  });
});
