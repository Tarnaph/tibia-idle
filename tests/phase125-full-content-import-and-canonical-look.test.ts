import { describe, expect, it } from 'vitest';
import equipmentJson from '../content/generated/equipment.json';
import monstersJson from '../content/generated/monsters.json';
import spellsJson from '../content/generated/spells.json';
import { formatTibiaLookText } from '../packages/domain/src/itemLook';
import type { EquipmentDefinition } from '../packages/content-schema/src';

describe('Phase 125: Importação Total do Acervo RealMap 11 e Formatação Canônica de Look', () => {
  describe('Acervo Completo de Itens e Equipamentos', () => {
    it('importa o acervo massivo completo sem filtros restritivos (20.000+ itens)', () => {
      const items = (equipmentJson as unknown as { items: EquipmentDefinition[] }).items;
      expect(items.length).toBeGreaterThan(20_000);
    });

    it('extrai descrição canônica, atributos e peso do Demon Helmet (id 2493)', () => {
      const items = (equipmentJson as unknown as { items: EquipmentDefinition[] }).items;
      const dh = items.find((i) => i.id === 2493);
      expect(dh).toBeDefined();
      expect(dh?.name).toBe('demon helmet');
      expect(dh?.armor).toBe(10);
      expect(dh?.slot).toBe('head');
      expect(dh?.description).toBe('You hear an evil whispering from inside.');
      expect(dh?.weight?.ounces).toBe(29.5);
    });

    it('extrai requerimento de nível e atributos da Magic Sword (id 2400)', () => {
      const items = (equipmentJson as unknown as { items: EquipmentDefinition[] }).items;
      const ms = items.find((i) => i.id === 2400);
      expect(ms).toBeDefined();
      expect(ms?.name).toBe('magic sword');
      expect(ms?.attack).toBe(48);
      expect(ms?.defense).toBe(35);
      expect(ms?.extraDefense).toBe(3);
      expect(ms?.requirements.level).toBe(80);
      expect(ms?.weight?.ounces).toBe(42.0);
    });

    it('extrai vocações e nível requeridos para Snakebite Rod (id 2182)', () => {
      const items = (equipmentJson as unknown as { items: EquipmentDefinition[] }).items;
      const rod = items.find((i) => i.id === 2182);
      expect(rod).toBeDefined();
      expect(rod?.name).toBe('snakebite rod');
      expect(rod?.requirements.level).toBe(7);
      expect(rod?.requirements.vocations).toEqual(expect.arrayContaining(['Druid']));
    });

    it('preserva os 21 itens do loadout e Knight originais', () => {
      const items = (equipmentJson as unknown as { items: EquipmentDefinition[] }).items;
      const ids = [2376, 2388, 2398, 2512, 2526, 2458, 2461, 2464, 2467, 2648, 2649, 2643, 2645, 2457, 2463, 2647, 2525, 8601, 2389, 2190, 2182];
      for (const id of ids) {
        const found = items.find((i) => i.id === id);
        expect(found, `Item ${id} should be present in equipment catalog`).toBeDefined();
      }
    });
  });

  describe('Acervo Completo de Monstros', () => {
    it('importa o acervo massivo de monstros do RealMap 11 (900+ criaturas)', () => {
      const monsters = (monstersJson as unknown as { monsters: Array<{ id: string; name: string }> }).monsters;
      expect(monsters.length).toBeGreaterThan(900);
    });

    it('possui criaturas clássicas com estatísticas autênticas do Tibia', () => {
      const monsters = (monstersJson as unknown as { monsters: Array<{ id: string; name: string; maxHp: number; experience: number }> }).monsters;
      
      const rotworm = monsters.find((m) => m.id === 'rotworm');
      expect(rotworm).toBeDefined();
      expect(rotworm?.maxHp).toBe(65);
      expect(rotworm?.experience).toBe(40);

      const demon = monsters.find((m) => m.name.toLowerCase() === 'demon');
      expect(demon).toBeDefined();
      expect(demon?.maxHp).toBe(8200);
      expect(demon?.experience).toBe(6000);

      const dragon = monsters.find((m) => m.id === 'dragon');
      expect(dragon).toBeDefined();
      expect(dragon?.maxHp).toBe(1000);
      expect(dragon?.experience).toBe(700);
    });
  });

  describe('Acervo Completo de Magias', () => {
    it('importa magias autênticas para todas as 4 vocações sem filtros restritivos', () => {
      const spells = (spellsJson as unknown as { spells: Array<{ name: string; vocations: string[]; words: string }> }).spells;
      expect(spells.length).toBeGreaterThanOrEqual(80);

      const berserk = spells.find((s) => s.name === 'Berserk');
      expect(berserk).toBeDefined();
      expect(berserk?.words).toBe('exori');
      expect(berserk?.vocations).toContain('Knight');

      const healing = spells.find((s) => s.name === 'Light Healing');
      expect(healing).toBeDefined();
      expect(healing?.words).toBe('exura');
      expect(healing?.vocations).toEqual(expect.arrayContaining(['Sorcerer', 'Druid', 'Paladin']));

      const challenge = spells.find((s) => s.name === 'Challenge');
      expect(challenge).toBeDefined();
      expect(challenge?.words).toBe('exeta res');
    });
  });

  describe('Formatação Canônica de Look (formatTibiaLookText)', () => {
    it('formata o look canônico do Demon Helmet com Arm, descrição e peso', () => {
      const items = (equipmentJson as unknown as { items: EquipmentDefinition[] }).items;
      const dh = items.find((i) => i.id === 2493)!;
      const look = formatTibiaLookText(dh);

      expect(look.title).toBe('You see a demon helmet (Arm:10).');
      expect(look.lines).toContain('You hear an evil whispering from inside.');
      expect(look.lines).toContain('It weighs 29.50 oz.');
      expect(look.canonicalText).toContain('You see a demon helmet (Arm:10).');
      expect(look.canonicalText).toContain('You hear an evil whispering from inside.');
      expect(look.canonicalText).toContain('It weighs 29.50 oz.');
    });

    it('formata o look canônico da Magic Sword com Atk, Def (+extraDef), level e peso', () => {
      const items = (equipmentJson as unknown as { items: EquipmentDefinition[] }).items;
      const ms = items.find((i) => i.id === 2400)!;
      const look = formatTibiaLookText(ms);

      expect(look.title).toBe('You see a magic sword (Atk:48, Def:35 +3).');
      expect(look.lines).toContain('It can only be wielded properly by players of level 80 or higher.');
      expect(look.lines).toContain("It's the Sword of Valor.");
      expect(look.lines).toContain('It weighs 42.00 oz.');
      expect(look.minLevel).toBe(80);
    });

    it('formata o look canônico de Snakebite Rod com restrição de druida e nível', () => {
      const items = (equipmentJson as unknown as { items: EquipmentDefinition[] }).items;
      const rod = items.find((i) => i.id === 2182)!;
      const look = formatTibiaLookText(rod);

      expect(look.title).toBe('You see a snakebite rod.');
      expect(look.lines).toContain('It can only be wielded properly by druids of level 7 or higher.');
      expect(look.lines).toContain('It weighs 19.00 oz.');
      expect(look.vocationNames).toEqual(expect.arrayContaining(['Druid']));
    });

    it('formata corretamente itens empilháveis com quantidade e plural', () => {
      const look = formatTibiaLookText({
        name: 'platinum coin',
        weightOunces: 0.1,
      }, 50);

      expect(look.title).toBe('You see 50 platinum coins.');
      expect(look.lines).toContain('It weighs 5.00 oz.');
    });
  });
});
