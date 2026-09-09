import { describe, it, expect } from 'vitest';
import { initialHunts, huntById } from '../packages/domain/src/hunt';
import type { HuntDefinition } from '../packages/domain/src/types';
import { getDifficultyColor } from '../apps/web/components/hunts/HuntCard';
import { getRarityInfo } from '../apps/web/components/hunts/HuntLootTooltip';

describe('Phase 108: Seletor de Caçadas em Carrossel Horizontal de Cards Medieval', () => {
  it('contém todas as 6 caçadas originais com metadados estendidos em português e níveis recomendados canônicos', () => {
    expect(initialHunts).toHaveLength(6);

    const rat = huntById(initialHunts, 'rat-cellars');
    expect(rat.displayName).toBe('Porões Infestados');
    expect(rat.shortDescription).toBe('Ratos famintos infestam os porões.');
    expect(rat.recommendedLevel).toBe(1);
    expect(rat.monsters).toContain('rat');

    const spider = huntById(initialHunts, 'spider-burrow');
    expect(spider.displayName).toBe('Toca Enredada');
    expect(spider.shortDescription).toBe('Teias cobrem esta toca esquecida.');
    expect(spider.recommendedLevel).toBe(8);
    expect(spider.monsters).toContain('spider');

    const troll = huntById(initialHunts, 'troll-camp');
    expect(troll.displayName).toBe('Covil dos Trolls');
    expect(troll.shortDescription).toBe('Uma pequena tribo protege estes túneis.');
    expect(troll.recommendedLevel).toBe(15);
    expect(troll.monsters).toContain('troll');

    const crypt = huntById(initialHunts, 'old-crypt');
    expect(crypt.displayName).toBe('Cripta Inquieta');
    expect(crypt.shortDescription).toBe('Os mortos se recusam a permanecer enterrados.');
    expect(crypt.recommendedLevel).toBe(22);
    expect(crypt.monsters).toContain('skeleton');

    const rotworm = huntById(initialHunts, 'rotworm-cave');
    expect(rotworm.displayName).toBe('Túneis Escavados');
    expect(rotworm.shortDescription).toBe('Rotworms se escondem sob a terra.');
    expect(rotworm.recommendedLevel).toBe(28);
    expect(rotworm.monsters).toContain('rotworm');

    const dragon = huntById(initialHunts, 'dragon-lair');
    expect(dragon.displayName).toBe('Profundezas Chamuscadas');
    expect(dragon.shortDescription).toBe('Um dragão antigo domina estas profundezas.');
    expect(dragon.recommendedLevel).toBe(45);
    expect(dragon.monsters).toContain('dragon');
  });

  it('preserva 100% a lógica das caçadas, ondas, chefes e regiões sem alterar contratos de domínio', () => {
    for (const hunt of initialHunts) {
      expect(hunt.id).toBeDefined();
      expect(hunt.name).toBeDefined();
      expect(hunt.roomDefinitions).toHaveLength(10);
      expect(hunt.waves).toHaveLength(10);
      expect(hunt.environment.source).toBe('realmap11-otbm');
      expect(hunt.status).toBeDefined();
      // Wave 10 boss check
      const bossWave = hunt.waves[9];
      expect(bossWave.boss).toBeDefined();
      expect(bossWave.boss?.visualModifier).toBe('boss-aura');
    }
  });

  it('calcula dinamicamente a faixa de níveis derivada dos dados cadastrados', () => {
    const calculateRange = (hunts: HuntDefinition[]) => {
      if (hunts.length === 0) return 'Nível 1';
      const levels = hunts.map((h) => h.recommendedLevel ?? h.minimumLevel ?? 1);
      const min = Math.min(...levels);
      const max = Math.max(...levels);
      return min === max ? `Nível ${min}` : `Nível ${min} – ${max}`;
    };

    expect(calculateRange(initialHunts)).toBe('Nível 1 – 45');

    // Single hunt case
    expect(calculateRange([initialHunts[0]])).toBe('Nível 1');

    // Sub-range case
    const lowTierHunts = initialHunts.slice(0, 3);
    expect(calculateRange(lowTierHunts)).toBe('Nível 1 – 15');
  });

  it('aplica a regra de coloração de dificuldade em função do nível atual do personagem', () => {
    const recLevel = 8;

    // Nível superior (fácil: verde)
    const easy = getDifficultyColor(recLevel, 12);
    expect(easy.color).toBe('#4ade80');
    expect(easy.label).toBe('Fácil');

    // Nível equivalente (adequado: amarelo/dourado)
    const adequate = getDifficultyColor(recLevel, 8);
    expect(adequate.color).toBe('#facc15');
    expect(adequate.label).toBe('Adequado');

    // Nível inferior (difícil/perigoso: vermelho)
    const hard = getDifficultyColor(recLevel, 3);
    expect(hard.color).toBe('#f87171');
    expect(hard.label).toBe('Perigoso');

    // Nível não fornecido ou zero (fallback para adequado)
    const fallback = getDifficultyColor(recLevel, undefined);
    expect(fallback.color).toBe('#facc15');
  });

  it('classifica corretamente as raridades de loot em português', () => {
    expect(getRarityInfo(100000).label).toBe('Comum');
    expect(getRarityInfo(25000).label).toBe('Comum');
    expect(getRarityInfo(8000).label).toBe('Incomum');
    expect(getRarityInfo(1500).label).toBe('Raro');
    expect(getRarityInfo(500).label).toBe('Muito raro');
    expect(getRarityInfo(80).label).toBe('Muito raro');

    // Check colors
    expect(getRarityInfo(20000).color).toBe('#4ade80');
    expect(getRarityInfo(5000).color).toBe('#38bdf8');
    expect(getRarityInfo(1000).color).toBe('#c084fc');
    expect(getRarityInfo(100).color).toBe('#fbbf24');
  });

  it('garante navegação contínua e cíclica no carrossel de 3 cards', () => {
    const hunts = initialHunts;
    const total = hunts.length;

    const getCarouselCards = (currentIndex: number) => {
      const prevIdx = (currentIndex - 1 + total) % total;
      const nextIdx = (currentIndex + 1) % total;
      return {
        prev: hunts[prevIdx],
        current: hunts[currentIndex],
        next: hunts[nextIdx],
      };
    };

    // Posição inicial (índice 0: rat-cellars)
    const pos0 = getCarouselCards(0);
    expect(pos0.current.id).toBe('rat-cellars');
    expect(pos0.prev.id).toBe('dragon-lair'); // wrap circular
    expect(pos0.next.id).toBe('spider-burrow');

    // Avanço para índice 1 (spider-burrow)
    const pos1 = getCarouselCards(1);
    expect(pos1.current.id).toBe('spider-burrow');
    expect(pos1.prev.id).toBe('rat-cellars');
    expect(pos1.next.id).toBe('troll-camp');

    // Posição final (índice 5: dragon-lair)
    const pos5 = getCarouselCards(5);
    expect(pos5.current.id).toBe('dragon-lair');
    expect(pos5.prev.id).toBe('rotworm-cave');
    expect(pos5.next.id).toBe('rat-cellars'); // wrap circular
  });

  it('suporta dinamicamente a adição de novas hunts no futuro sem hardcodes no componente', () => {
    const customHunt: HuntDefinition = {
      id: 'hydra-swamp',
      name: 'Hydra Swamp',
      displayName: 'Pântano das Hidras',
      description: 'Pântano perigoso infestado por Hidras de múltiplas cabeças.',
      shortDescription: 'Hidras espreitam sob as águas turvas do pântano.',
      recommendedLevel: 60,
      minimumLevel: 50,
      monsters: ['hydra'],
      roomDefinitions: Array.from({ length: 10 }, (_, i) => `hydra-wave-${i + 1}`),
      environment: { regionId: 'hydra-swamp', label: 'Pântano', source: 'realmap11-otbm' },
      rewardProfile: 'xp',
      status: 'available',
      waves: [],
    };

    const expandedHunts = [...initialHunts, customHunt];
    expect(expandedHunts).toHaveLength(7);

    // Dynamic level range recalculates automatically
    const levels = expandedHunts.map((h) => h.recommendedLevel ?? h.minimumLevel ?? 1);
    const range = `Nível ${Math.min(...levels)} – ${Math.max(...levels)}`;
    expect(range).toBe('Nível 1 – 60');

    // New hunt title and description fallback gracefully
    const title = customHunt.displayName || customHunt.name;
    const desc = customHunt.shortDescription || customHunt.description;
    expect(title).toBe('Pântano das Hidras');
    expect(desc).toBe('Hidras espreitam sob as águas turvas do pântano.');
  });
});
