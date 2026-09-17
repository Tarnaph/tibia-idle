import { describe, it, expect, vi } from 'vitest';
import { createAuthToken, verifyAuthToken, decideAccess } from '../packages/auth/src';
import { POST } from '../app/api/admin/players/route';
import { prisma } from '../packages/database/src';
import { systemLogger } from '../packages/server/src/logging/SystemLogger';

describe('Phase 186 Bloco C - Promover jogador a GM pelo ADMIN', () => {
  it('1. Token JWT e autorização suportam papel GM no painel administrativo', () => {
    const gmToken = createAuthToken({
      accountId: 'acc-test-gm-1',
      email: 'gm.tester@exura.com',
      role: 'gm',
      isPremium: true,
    });

    const decoded = verifyAuthToken(gmToken);
    expect(decoded.role).toBe('gm');
    expect(decoded.accountId).toBe('acc-test-gm-1');

    // GM tem acesso permitido ao painel administrativo
    const access = decideAccess('admin', { role: 'gm' });
    expect(access).toBe('allow');

    // Jogador normal não tem acesso
    const playerAccess = decideAccess('admin', { role: 'player' });
    expect(playerAccess).toBe('forbidden');
  });

  it('2. Tentativa de promoção a GM por quem não é GOD/ADMIN é rejeitada com 403 Forbidden', async () => {
    const gmToken = createAuthToken({
      accountId: 'acc-gm-caller',
      email: 'gm@exura.com',
      role: 'gm',
      isPremium: true,
    });

    const req = new Request('http://localhost/api/admin/players', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${gmToken}`,
      },
      body: JSON.stringify({
        action: 'promote_gm',
        accountId: 'acc-target-player',
        characterId: 'char-target-player',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const data = (await res.json()) as any;
    expect(data.success).toBe(false);
    expect(data.error).toContain('Apenas o GOD/Administrador pode promover ou remover');
  });

  it('3. Promoção autorizada por GOD/ADMIN persiste Account.role = GM e Character.adminTitle = GM com auditoria', async () => {
    const godToken = createAuthToken({
      accountId: 'acc-god-master',
      email: 'wolfy.god@exura.com',
      role: 'admin',
      isPremium: true,
    });

    const targetAccount = {
      id: 'acc-target-promoted',
      email: 'brave.player@exura.com',
      role: 'PLAYER',
    };
    const targetCharacter = {
      id: 'char-target-promoted',
      name: 'BraveKnight',
      accountId: targetAccount.id,
      adminTitle: null,
      account: targetAccount,
    };

    const spyAccountFind = vi.spyOn(prisma.account, 'findUnique').mockResolvedValue(targetAccount as any);
    const spyCharFind = vi.spyOn(prisma.character, 'findUnique').mockResolvedValue(targetCharacter as any);
    const spyAccountUpdate = vi.spyOn(prisma.account, 'update').mockResolvedValue({ ...targetAccount, role: 'GM' } as any);
    const spyCharUpdate = vi.spyOn(prisma.character, 'update').mockResolvedValue({ ...targetCharacter, adminTitle: 'GM' } as any);
    const spyLogger = vi.spyOn(systemLogger, 'gmAction');

    const req = new Request('http://localhost/api/admin/players', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${godToken}`,
      },
      body: JSON.stringify({
        action: 'promote_gm',
        accountId: targetAccount.id,
        characterId: targetCharacter.id,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.success).toBe(true);
    expect(data.message).toContain('promovido a GM com sucesso');

    // Confirma chamadas ao Prisma para persistência permanente
    expect(spyAccountUpdate).toHaveBeenCalledWith({
      where: { id: targetAccount.id },
      data: { role: 'GM' },
    });
    expect(spyCharUpdate).toHaveBeenCalledWith({
      where: { id: targetCharacter.id },
      data: { adminTitle: 'GM' },
    });

    // Confirma auditoria
    expect(spyLogger).toHaveBeenCalled();

    spyAccountFind.mockRestore();
    spyCharFind.mockRestore();
    spyAccountUpdate.mockRestore();
    spyCharUpdate.mockRestore();
    spyLogger.mockRestore();
  });

  it('4. Proteção de GOD: Não permite rebaixar, alterar ou promover GOD para GM', async () => {
    const godToken = createAuthToken({
      accountId: 'acc-god-master',
      email: 'wolfy.god@exura.com',
      role: 'admin',
      isPremium: true,
    });

    const godAccount = {
      id: 'acc-wolfy-god',
      email: 'wolfy@exura.com',
      role: 'ADMIN',
    };
    const godChar = {
      id: 'char-wolfy',
      name: 'Wolfy',
      accountId: godAccount.id,
      adminTitle: 'GOD',
      account: godAccount,
    };

    vi.spyOn(prisma.account, 'findUnique').mockResolvedValue(godAccount as any);
    vi.spyOn(prisma.character, 'findUnique').mockResolvedValue(godChar as any);

    const req = new Request('http://localhost/api/admin/players', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${godToken}`,
      },
      body: JSON.stringify({
        action: 'promote_gm',
        accountId: godAccount.id,
        characterId: godChar.id,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = (await res.json()) as any;
    expect(data.success).toBe(false);
    expect(data.error).toContain('Não é permitido alterar ou rebaixar um GOD');
  });

  it('5. Remoção de GM (demote_gm) restaura PLAYER e limpa adminTitle', async () => {
    const godToken = createAuthToken({
      accountId: 'acc-god-master',
      email: 'wolfy.god@exura.com',
      role: 'admin',
      isPremium: true,
    });

    const gmAccount = {
      id: 'acc-gm-demote',
      email: 'old.gm@exura.com',
      role: 'GM',
    };
    const gmChar = {
      id: 'char-gm-demote',
      name: 'OldGmChar',
      accountId: gmAccount.id,
      adminTitle: 'GM',
      account: gmAccount,
    };

    vi.spyOn(prisma.account, 'findUnique').mockResolvedValue(gmAccount as any);
    vi.spyOn(prisma.character, 'findUnique').mockResolvedValue(gmChar as any);
    const spyAccountUpdate = vi.spyOn(prisma.account, 'update').mockResolvedValue({ ...gmAccount, role: 'PLAYER' } as any);
    const spyCharUpdate = vi.spyOn(prisma.character, 'update').mockResolvedValue({ ...gmChar, adminTitle: null } as any);

    const req = new Request('http://localhost/api/admin/players', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${godToken}`,
      },
      body: JSON.stringify({
        action: 'demote_gm',
        accountId: gmAccount.id,
        characterId: gmChar.id,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.success).toBe(true);

    expect(spyAccountUpdate).toHaveBeenCalledWith({
      where: { id: gmAccount.id },
      data: { role: 'PLAYER' },
    });
    expect(spyCharUpdate).toHaveBeenCalledWith({
      where: { id: gmChar.id },
      data: { adminTitle: null },
    });
  });
});
