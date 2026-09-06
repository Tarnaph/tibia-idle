import { describe, it, expect } from 'vitest';
import {
  calculateMaxStamina,
  canEnterHunt,
  tickStamina,
  formatStaminaTime,
  getStaminaPercentage,
  BASE_MAX_STAMINA_MINUTES,
  STAMINA_BONUS_PER_LEVEL_MINUTES,
} from '../packages/domain/src/stamina';

describe('Phase 79: Sistema de Estamina da Conta (Account-Wide Stamina System)', () => {
  describe('Capacidade Máxima por Nível do Maior Personagem da Conta', () => {
    it('deve retornar a estamina base de 15 minutos para conta com maior nível 1', () => {
      const maxStamina = calculateMaxStamina(1);
      expect(maxStamina).toBe(BASE_MAX_STAMINA_MINUTES);
      expect(maxStamina).toBe(15);
    });

    it('deve aumentar +1 minuto por nível adicional do personagem de maior nível na conta', () => {
      // Level 5 -> 15 + (5 - 1) * 1 = 19 min
      expect(calculateMaxStamina(5)).toBe(15 + 4 * STAMINA_BONUS_PER_LEVEL_MINUTES);
      expect(calculateMaxStamina(5)).toBe(19);

      // Level 50 -> 15 + 49 * 1 = 64 min
      expect(calculateMaxStamina(50)).toBe(15 + 49 * STAMINA_BONUS_PER_LEVEL_MINUTES);

      // Level 100 -> 15 + 99 * 1 = 114 min
      expect(calculateMaxStamina(100)).toBe(114);
    });

    it('deve tratar níveis inválidos ou zerados retornando a estamina base', () => {
      expect(calculateMaxStamina(0)).toBe(15);
      expect(calculateMaxStamina(-5)).toBe(15);
      expect(calculateMaxStamina(NaN)).toBe(15);
    });
  });

  describe('Consumo em Caçada e Ejeção Compulsória ao Zerar', () => {
    it('deve consumir 1 minuto de estamina por 60 segundos de caçada ativa', () => {
      const result = tickStamina(15, 15, 'hunting', 60);
      expect(result.staminaMinutes).toBe(14);
      expect(result.evicted).toBe(false);
      expect(result.deltaMinutes).toBe(-1);
    });

    it('deve consumir proporcionalmente para frações de segundo', () => {
      // 30 segundos -> -0.5 minutos
      const result = tickStamina(15, 15, 'hunting', 30);
      expect(result.staminaMinutes).toBe(14.5);
      expect(result.evicted).toBe(false);
    });

    it('deve acionar ejeção compulsória (evicted: true) quando a estamina atinge ou ultrapassa 0 em caçada', () => {
      const result = tickStamina(0.5, 15, 'hunting', 60);
      expect(result.staminaMinutes).toBe(0);
      expect(result.evicted).toBe(true);
    });

    it('deve bloquear permissão de entrada em caçada quando a estamina é 0', () => {
      expect(canEnterHunt(0)).toBe(false);
      expect(canEnterHunt(-1)).toBe(false);
      expect(canEnterHunt(0.1)).toBe(true);
      expect(canEnterHunt(15)).toBe(true);
    });
  });

  describe('Regeneração Passiva e Acelerada na Zona de Treinamento', () => {
    it('deve regenerar estamina no repouso passivo (1 minuto por 180 segundos reais)', () => {
      const result = tickStamina(10, 15, 'resting', 180);
      expect(result.staminaMinutes).toBe(11);
      expect(result.evicted).toBe(false);
      expect(result.deltaMinutes).toBe(1);
    });

    it('deve regenerar 3x mais rápido na Zona de Treinamento em Dummies (1 minuto por 60 segundos reais)', () => {
      const result = tickStamina(10, 15, 'training', 60);
      expect(result.staminaMinutes).toBe(11);
      expect(result.evicted).toBe(false);
      expect(result.deltaMinutes).toBe(1);
    });

    it('não deve ultrapassar a capacidade máxima de estamina durante a regeneração', () => {
      const result = tickStamina(14.5, 15, 'training', 120);
      expect(result.staminaMinutes).toBe(15);
    });
  });

  describe('Formatação de Tempo e Porcentagem de Estamina', () => {
    it('deve formatar minutos de estamina corretamente para MM:SS ou HH:MM', () => {
      expect(formatStaminaTime(15)).toBe('15:00');
      expect(formatStaminaTime(1.5)).toBe('01:30');
      expect(formatStaminaTime(0)).toBe('00:00');
      expect(formatStaminaTime(90)).toBe('01:30');
    });

    it('deve calcular a porcentagem de estamina restante com precisão', () => {
      expect(getStaminaPercentage(15, 15)).toBe(100);
      expect(getStaminaPercentage(7.5, 15)).toBe(50);
      expect(getStaminaPercentage(0, 15)).toBe(0);
      expect(getStaminaPercentage(30, 30)).toBe(100);
    });
  });
});
