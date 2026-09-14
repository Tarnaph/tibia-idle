import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { getCombatTextColor } from '../apps/web/components/PixiArena';

describe('Phase 161: Cores Autênticas de Dano Elemental do Tibia & Propagação Visual de Elementos', () => {
  const PROJECT_ROOT = process.cwd();

  describe('1. Mapeamento Canônico de Cores de Dano Elemental (getCombatTextColor)', () => {
    it('returns official CipSoft colors for all primary combat elements', () => {
      // 🩸 Physical (Vermelho sangue)
      expect(getCombatTextColor('physical')).toEqual({ fill: 0xff4444, stroke: 0x1a0504 });
      expect(getCombatTextColor()).toEqual({ fill: 0xff4444, stroke: 0x1a0504 });

      // 🔥 Fire (Laranja incandescente)
      expect(getCombatTextColor('fire')).toEqual({ fill: 0xff8800, stroke: 0x331100 });
      expect(getCombatTextColor('Fire')).toEqual({ fill: 0xff8800, stroke: 0x331100 });

      // ⚡ Energy (Ciano elétrico)
      expect(getCombatTextColor('energy')).toEqual({ fill: 0x00e6e6, stroke: 0x002b2b });
      expect(getCombatTextColor('ENERGY')).toEqual({ fill: 0x00e6e6, stroke: 0x002b2b });

      // 🌿 Earth & Poison (Verde vibrante tóxico)
      expect(getCombatTextColor('earth')).toEqual({ fill: 0x2cd92c, stroke: 0x062b06 });
      expect(getCombatTextColor('poison')).toEqual({ fill: 0x2cd92c, stroke: 0x062b06 });

      // ❄️ Ice (Azul celeste gélido)
      expect(getCombatTextColor('ice')).toEqual({ fill: 0x66ccff, stroke: 0x0a2638 });

      // ☀️ Holy (Amarelo solar dourado)
      expect(getCombatTextColor('holy')).toEqual({ fill: 0xffea33, stroke: 0x383300 });

      // 💀 Death (Roxo místico / Violeta profundo)
      expect(getCombatTextColor('death')).toEqual({ fill: 0xb84dff, stroke: 0x240638 });

      // 💚 Healing (Verde claro restaurador)
      expect(getCombatTextColor('healing')).toEqual({ fill: 0x62e58a, stroke: 0x072611 });
      expect(getCombatTextColor(undefined, true)).toEqual({ fill: 0x62e58a, stroke: 0x072611 });

      // 💧 Mana (Azul cobalto)
      expect(getCombatTextColor('mana')).toEqual({ fill: 0x3399ff, stroke: 0x051a33 });
    });
  });

  describe('2. Verificação de Fraquezas, Resistências e Imunidades Canônicas no Acervo Oficial', () => {
    const catalogPath = path.resolve(PROJECT_ROOT, 'content', 'generated', 'monsters.json');
    const catalogRaw = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    const monsters: any[] = Array.isArray(catalogRaw.monsters)
      ? catalogRaw.monsters
      : Object.values(catalogRaw.monsters);

    it('validates Dragon has fire immunity and ice weakness (-10%)', () => {
      const dragon = monsters.find((m) => m.id === 'dragon');
      expect(dragon).toBeDefined();
      expect(dragon.immunities).toContain('fire');
      expect(dragon.elementalPercent.earth).toBe(80);
      expect(dragon.elementalPercent.energy).toBe(20);
      expect(dragon.elementalPercent.ice).toBe(-10); // -10% de resistência = 10% fraqueza a gelo
    });

    it('validates Demon has fire immunity and holy/ice weaknesses (-10%)', () => {
      const demon = monsters.find((m) => m.id === 'demon');
      expect(demon).toBeDefined();
      expect(demon.immunities).toContain('fire');
      expect(demon.elementalPercent.physical).toBe(30);
      expect(demon.elementalPercent.energy).toBe(50);
      expect(demon.elementalPercent.earth).toBe(40);
      expect(demon.elementalPercent.ice).toBe(-10); // Fraqueza a gelo
      expect(demon.elementalPercent.holy).toBe(-10); // Fraqueza a holy
    });

    it('validates Ghost is 100% immune to physical damage', () => {
      const ghost = monsters.find((m) => m.id === 'ghost');
      expect(ghost).toBeDefined();
      expect(ghost.immunities).toContain('physical');
    });

    it('validates Skeleton is immune to death and weak to holy (-5%)', () => {
      const skeleton = monsters.find((m) => m.id === 'skeleton');
      expect(skeleton).toBeDefined();
      expect(skeleton.immunities).toContain('death');
      expect(skeleton.elementalPercent.holy).toBe(-5);
    });

    it('validates Rat and Cave Rat have ice and death weaknesses (-10%)', () => {
      const rat = monsters.find((m) => m.id === 'rat');
      const caveRat = monsters.find((m) => m.id === 'cave-rat');
      expect(rat).toBeDefined();
      expect(rat.elementalPercent.ice).toBe(-10);
      expect(rat.elementalPercent.death).toBe(-10);

      expect(caveRat).toBeDefined();
      expect(caveRat.elementalPercent.fire).toBe(-10); // Cave rat é fraco contra fogo (-10%)
    });
  });

  describe('3. Verificação de Propagação do Elemento no Código de Combate', () => {
    it('verifies packages/domain/src/types.ts defines element? on combat events', () => {
      const typesPath = path.resolve(PROJECT_ROOT, 'packages', 'domain', 'src', 'types.ts');
      const content = fs.readFileSync(typesPath, 'utf8');

      expect(content).toContain("type: 'player-attack'; sourceId: string; targetId: string; damage: number; element?: string");
      expect(content).toContain("type: 'enemy-attack'; sourceId: string; targetId: string; damage: number; element?: string");
      expect(content).toContain("type: 'spell-cast'; sourceId: string; targetId: string; spellId: number; amount: number; healing: boolean; speech?: string; delayMs?: number; element?: string");
    });

    it('verifies packages/domain/src/combat.ts propagates element in all player-attack and spell-cast events', () => {
      const combatPath = path.resolve(PROJECT_ROOT, 'packages', 'domain', 'src', 'combat.ts');
      const content = fs.readFileSync(combatPath, 'utf8');

      // Basic attack propagates element
      expect(content).toContain("encounter.events.push({ type: 'player-attack', sourceId: actor.characterId, targetId: target.id, damage, element: pending.element || 'physical' });");

      // Automated rune propagates element
      expect(content).toContain("element: rune.combatType");

      // Spells propagate element
      expect(content).toContain("element: spell.combatType");

      // Healing propagates element: 'healing'
      expect(content).toContain("element: 'healing'");
    });

    it('verifies PixiArena.tsx uses getCombatTextColor and element in pendingImpacts', () => {
      const arenaPath = path.resolve(PROJECT_ROOT, 'apps', 'web', 'components', 'PixiArena.tsx');
      const content = fs.readFileSync(arenaPath, 'utf8');

      expect(content).toContain('interface PendingImpact { targetId: string; amount: number; impactAt: number; element?: string }');
      expect(content).toContain('getCombatTextColor(element, isHealing)');
      expect(content).toContain('fill: colorConfig.fill');
      expect(content).toContain('stroke: { color: colorConfig.stroke, width: 2 }');
    });
  });
});
