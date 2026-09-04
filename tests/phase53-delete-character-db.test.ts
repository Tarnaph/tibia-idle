import { describe, expect, it } from 'vitest';
import { CharacterService, validateCharacterName } from '../packages/auth/src';

describe('Phase 53: Deletar Personagem na Seleção de Personagem & Banco de Dados', () => {
  it('valida o nome do personagem antes da criação', () => {
    expect(validateCharacterName('Sir Knight')).toBe(true);
    expect(validateCharacterName('Ab')).toBe(false);
    expect(validateCharacterName('Invalid123')).toBe(false);
  });

  it('permite deletar um personagem usando o serviço da conta', async () => {
    const mockPrisma = {
      character: {
        findUnique: async ({ where }: { where: { id: string } }) => {
          if (where.id === 'char-1') {
            return {
              id: 'char-1',
              name: 'Tester Delete',
              accountId: 'acc-100',
              vocationId: 1,
            };
          }
          return null;
        },
        delete: async ({ where }: { where: { id: string } }) => {
          return { id: where.id, name: 'Tester Delete' };
        },
      },
    } as any;

    const service = new CharacterService(mockPrisma);

    // Tentativa de deletar com conta errada deve lançar erro
    await expect(service.deleteCharacter('wrong-acc', 'char-1')).rejects.toThrow('permissão');

    // Deletar com conta correta deve retornar o registro deletado
    const deleted = await service.deleteCharacter('acc-100', 'char-1');
    expect(deleted).toBeDefined();
    expect(deleted.id).toBe('char-1');
  });
});
