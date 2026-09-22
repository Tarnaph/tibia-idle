import { describe, it, expect, vi } from 'vitest';
import {
  consumePotionFromInventory,
  createIdleGame,
} from '../packages/domain/src/combat';
import { getActionSupplyCost } from '../packages/domain/src/hotbarActions';
import { content } from './fixture';
import { destroyVisualNode } from '../apps/web/lib/pixiMemorySafety';

describe('Phase 226 - Wave 1: Estabilidade de Memória, Background Tab e Economia de Poções', () => {
  describe('Economia de Poções e Bloqueio de Consumo Grátis', () => {
    it('deve debitar ouro da Caixa da Party quando não houver a poção na bolsa mas houver gold suficiente', () => {
      const state = createIdleGame('test-session', content);
      const knight = state.session.characters[0];
      const manaCost = getActionSupplyCost(7620); // Mana potion (50 gp)
      expect(manaCost).toBe(50);

      // Limpar inventário compartilhado da party
      state.session.bag = [];
      state.session.loot = [];
      state.session.gold = manaCost + 100;

      const details = { fromGold: false, cost: 0 };
      const success = consumePotionFromInventory(state, 7620, knight.name, details);

      expect(success).toBe(true);
      expect(details.fromGold).toBe(true);
      expect(details.cost).toBe(50);
      expect(state.session.gold).toBe(100);
    });

    it('deve bloquear consumo de poção (retornar false) quando não houver item nem gold suficiente', () => {
      const state = createIdleGame('test-session', content);
      const knight = state.session.characters[0];
      const manaCost = getActionSupplyCost(7620);

      state.session.bag = [];
      state.session.loot = [];
      state.session.gold = manaCost - 1; // 49 gp (insuficiente para poção de 50 gp)

      const details = { fromGold: false, cost: 0 };
      const success = consumePotionFromInventory(state, 7620, knight.name, details);

      expect(success).toBe(false);
      expect(details.fromGold).toBe(false);
      expect(details.cost).toBe(0);
      expect(state.session.gold).toBe(49); // Nenhum débito indevido
    });

    it('deve consumir da mochila com prioridade e custo zero de ouro quando a poção existir no inventário', () => {
      const state = createIdleGame('test-session', content);
      const knight = state.session.characters[0];

      state.session.bag = [
        {
          itemId: 7620, // Mana potion
          name: 'Mana Potion',
          amount: 5,
        },
      ];
      state.session.gold = 1000;

      const details = { fromGold: false, cost: 0 };
      const success = consumePotionFromInventory(state, 7620, knight.name, details);

      expect(success).toBe(true);
      expect(details.fromGold).toBe(false);
      expect(details.cost).toBe(0);
      expect(state.session.bag![0].amount).toBe(4);
      expect(state.session.gold).toBe(1000); // Ouro preservado
    });
  });

  describe('PixiJS Memory Safety: Destruição Completa de Texturas de Text', () => {
    it('deve identificar nós de Text no Pixi v8 e destruir texturas dinâmicas sem lançar exceções', () => {
      const mockDestroyTexture = vi.fn();
      const mockDestroyNode = vi.fn();

      const mockTextNode = {
        style: { fill: 0xffffff, fontSize: 12 },
        renderPipeId: 'text',
        texture: {
          destroy: mockDestroyTexture,
        },
        destroy: mockDestroyNode,
        parent: null,
      };

      destroyVisualNode(mockTextNode);

      expect(mockDestroyTexture).toHaveBeenCalledWith(true);
      expect(mockDestroyNode).toHaveBeenCalledWith({
        texture: true,
        textureSource: true,
        children: true,
      });
    });

    it('deve percorrer containers recursivamente destruindo textos internos e preservando texturas de sprites compartilhadas', () => {
      const mockDestroyTextTexture = vi.fn();
      const mockDestroyText = vi.fn();
      const mockDestroySprite = vi.fn();
      const mockDestroyContainer = vi.fn();

      const textChild = {
        style: { fill: 0xff0000 },
        renderPipeId: 'text',
        texture: { destroy: mockDestroyTextTexture },
        destroy: mockDestroyText,
      };

      const spriteChild = {
        // Sprite compartilhada (sem style, sem renderPipeId 'text')
        destroy: mockDestroySprite,
      };

      const container = {
        children: [textChild, spriteChild],
        destroy: mockDestroyContainer,
        parent: null,
      };

      destroyVisualNode(container);

      // Texto interno tem sua textura canvas destruída
      expect(mockDestroyTextTexture).toHaveBeenCalledWith(true);
      expect(mockDestroyText).toHaveBeenCalled();

      // Sprite compartilhada é destruída sem destruir a textura compartilhada
      expect(mockDestroySprite).toHaveBeenCalledWith({ children: true, texture: false });

      // Container pai é destruído com texture: false
      expect(mockDestroyContainer).toHaveBeenCalledWith({ children: true, texture: false });
    });
  });
});
