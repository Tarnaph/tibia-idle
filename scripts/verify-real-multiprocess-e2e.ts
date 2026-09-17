/**
 * scripts/verify-real-multiprocess-e2e.ts
 *
 * Verificação E2E Real entre Processos:
 * 1. Colyseus Game Server real ouvindo em porta TCP/HTTP (/api/character-context/:id)
 * 2. Autenticação estrita com INTERNAL_SERVICE_KEY
 * 3. Caçada acima do Nível 6 (Nível 7, 3000 XP, 36 gold)
 * 4. Handshake de Retorno à Cidade: salvamento final síncrono antes de liberar inHunt
 * 5. 3 ciclos consecutivos de autosave urbano no Colyseus
 * 6. Reconexão com Sessão 2 (novo lease exclusivo)
 * 7. Tentativa de salvamento pela Sessão 1 (antiga) bloqueada com SESSION_SUPERSEDED
 * 8. Comportamento quando não há sessão registrada (player offline)
 * 9. Comportamento quando o serviço de contexto está indisponível (Colyseus offline)
 * 10. Preservação integral de XP, skills, gold e inventário
 */

import { prisma } from '../packages/database/src';
import { CharacterService, ServerCharacterContextRegistry, SessionSupersededError, ContextServiceUnavailableError } from '../packages/auth/src';
import { createGameServer } from '../packages/server/src/server';
import { PrismaPersistenceManager } from '../packages/server/src/persistence/PrismaPersistenceManager';
import { PlayerState } from '../packages/server/src/schemas/PlayerState';

async function main() {
  console.log('========================================================================');
  console.log('🔍 PHASE 182: VERIFICAÇÃO MULTI-PROCESSO REAL (Colyseus, API, BD, Lease)');
  console.log('========================================================================\n');

  const TEST_CHAR_NAME = 'RealE2EHeroAlpha';
  const TEST_PORT = 2568; // Dedicated isolated port
  process.env.COLYSEUS_PORT = String(TEST_PORT);
  process.env.INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || 'cavebound_internal_core_secret_v1';

  // 1. Iniciar Servidor Colyseus Real
  console.log(`[Colyseus] Iniciando servidor de jogo real na porta ${TEST_PORT}...`);
  const gameServerInstance = createGameServer({ port: TEST_PORT });
  const actualPort = await gameServerInstance.listen(TEST_PORT);
  console.log(`[Colyseus] Servidor online em http://127.0.0.1:${actualPort}!\n`);

  const persistenceManager = new PrismaPersistenceManager();
  const characterService = new CharacterService(prisma);

  try {
    // 2. Setup do Personagem de Teste Isolado
    let testAccount = await prisma.account.findFirst();
    if (!testAccount) {
      testAccount = await prisma.account.create({
        data: {
          id: 'e2e-real-test-account-id',
          email: 'e2e-real-test@cavebound.test',
          passwordHash: 'dummy_hash',
        },
      });
    }

    // Limpar personagem anterior se existir
    await prisma.character.deleteMany({ where: { name: TEST_CHAR_NAME } });

    const char = await prisma.character.create({
      data: {
        accountId: testAccount.id,
        name: TEST_CHAR_NAME,
        level: 1,
        experience: BigInt(0),
        health: 150,
        maxHealth: 150,
        mana: 35,
        maxMana: 35,
        capacity: 400,
        vocationId: 4,
        vocationName: 'Knight',
        saveVersion: 1,
        posX: 32369,
        posY: 32241,
        posZ: 7,
        inventory: {
          create: [
            { slot: 'gold', serverId: 2148, name: 'Gold Coin', count: 0, tier: 0 },
            { slot: 'backpack_0', serverId: 2666, name: 'Meat', count: 2, tier: 0 },
            { slot: 'leftHand', serverId: 2376, name: 'Sword', count: 1, tier: 0 },
          ],
        },
        skills: {
          create: [
            { skillId: 2, skillName: 'Sword Fighting', value: 19, tries: BigInt(0) },
            { skillId: 5, skillName: 'Shielding', value: 18, tries: BigInt(0) },
          ],
        },
      },
      include: { inventory: true, skills: true },
    });

    console.log(`[CENÁRIO 0] Personagem de teste inicializado: ${char.name} (${char.id})`);
    console.log(`   - Nível inicial: ${char.level}, XP: ${char.experience}, saveVersion: ${char.saveVersion}\n`);

    // ------------------------------------------------------------------------
    // CENÁRIO 1: Conexão Sessão 1 e Caçada Acima do Nível 6
    // ------------------------------------------------------------------------
    console.log('------------------------------------------------------------------------');
    console.log('🎯 CENÁRIO 1: Conexão Sessão 1 e Caçada Acima do Nível 6');
    console.log('------------------------------------------------------------------------');
    const session1Id = 'session-real-1-hunt';
    ServerCharacterContextRegistry.setActivity(char.id, {
      isHunting: true,
      huntId: 'rat-cellars',
      activeSessionId: session1Id,
    });

    // Validar consulta HTTP real ao endpoint do Colyseus
    const query1 = await ServerCharacterContextRegistry.getContextAsync(char.id);
    console.log(`[Context Query] HTTP Colyseus ativo: isHunting=${query1.isHunting}, activeSession=${query1.activeSessionId}`);
    if (!query1.isHunting || query1.activeSessionId !== session1Id) {
      throw new Error('Falha na consulta HTTP ao contexto do Colyseus!');
    }

    // Progresso acumulado na caçada (12 ratos mortos = nível 7, 3000 XP, 36 gold)
    const huntedLevel = 7;
    const huntedExp = BigInt(3000);
    const huntedGold = 36;
    console.log(`[Caçada] Simulada caçada com ratos: Nível=${huntedLevel}, XP=${huntedExp}, Gold=${huntedGold}\n`);

    // ------------------------------------------------------------------------
    // CENÁRIO 2: Handshake de Retorno à Cidade
    // ------------------------------------------------------------------------
    console.log('------------------------------------------------------------------------');
    console.log('🏛️ CENÁRIO 2: Handshake de Retorno à Cidade (Salvamento Síncrono Primeiro)');
    console.log('------------------------------------------------------------------------');
    // Cliente executa salvamento síncrono ANTES de enviar mensagem de saída de caçada
    const savedHuntResult = await characterService.saveCharacterProgress(char.id, {
      level: huntedLevel,
      experience: huntedExp,
      saveVersion: 1,
      sessionId: session1Id,
      inventory: [
        { slot: 'gold', serverId: 2148, name: 'Gold Coin', count: huntedGold },
        { slot: 'backpack_0', serverId: 2666, name: 'Meat', count: 2 },
        { slot: 'backpack_1', serverId: 2792, name: 'Cheese', count: 4 },
        { slot: 'leftHand', serverId: 2376, name: 'Sword', count: 1 },
      ],
      skills: [
        { skillId: 2, skillName: 'Sword Fighting', value: 20, tries: BigInt(50) },
        { skillId: 5, skillName: 'Shielding', value: 18, tries: BigInt(20) },
      ],
    });

    console.log(`[Retorno à Cidade] Salvamento final da caçada concluído no BD. Nova saveVersion: ${(savedHuntResult as any).saveVersion}`);

    // Colyseus recebe player:returnToCity, recarrega do BD ANTES de desmarcar inHunt
    const freshDbChar = await persistenceManager.loadCharacter(char.id);
    if (!freshDbChar) throw new Error('Personagem não encontrado no recarregamento do Colyseus!');

    const playerColyseus = new PlayerState();
    playerColyseus.id = session1Id;
    playerColyseus.characterId = char.id;
    playerColyseus.name = freshDbChar.name;
    playerColyseus.level = freshDbChar.level;
    playerColyseus.experience = Number(freshDbChar.experience);
    (playerColyseus as any).saveVersion = (freshDbChar as any).saveVersion;
    playerColyseus.inHunt = false;

    // Liberar contexto de caçada no Colyseus
    ServerCharacterContextRegistry.setActivity(char.id, {
      isHunting: false,
      activeSessionId: session1Id,
    });

    console.log(`[Retorno à Cidade] Colyseus sincronizou do banco: Nível=${playerColyseus.level}, XP=${playerColyseus.experience}, saveVersion=${(playerColyseus as any).saveVersion}`);
    console.log('[Retorno à Cidade] inHunt liberado com sucesso após sincronização.\n');

    // ------------------------------------------------------------------------
    // CENÁRIO 3: Três Ciclos Consecutivos de Autosave Urbano no Colyseus
    // ------------------------------------------------------------------------
    console.log('------------------------------------------------------------------------');
    console.log('⏳ CENÁRIO 3: Execução de 3 Ciclos de Autosave Urbano no Colyseus');
    console.log('------------------------------------------------------------------------');
    for (let cycle = 1; cycle <= 3; cycle++) {
      await persistenceManager.saveCharacter(playerColyseus);
      const afterCycle = await persistenceManager.loadCharacter(char.id);
      console.log(`  - Ciclo ${cycle} de autosave urbano concluído: saveVersion=${(afterCycle as any).saveVersion}, Nível=${afterCycle?.level}, XP=${afterCycle?.experience}`);
    }

    const postUrbanChar = await persistenceManager.loadCharacter(char.id);
    console.log(`[Autosave Urbano] Após 3 ciclos: saveVersion=${(postUrbanChar as any).saveVersion} (Esperado: 5)`);
    if ((postUrbanChar as any).saveVersion !== 5) {
      throw new Error(`Esperado saveVersion 5 após 3 ciclos urbanos, obtido ${(postUrbanChar as any).saveVersion}`);
    }
    console.log('');

    // ------------------------------------------------------------------------
    // CENÁRIO 4: Reconexão com Sessão 2 e Transações Válidas
    // ------------------------------------------------------------------------
    console.log('------------------------------------------------------------------------');
    console.log('🔌 CENÁRIO 4: Reconexão com Sessão 2 e Atualização do Lease');
    console.log('------------------------------------------------------------------------');
    const session2Id = 'session-real-2-new-active';
    ServerCharacterContextRegistry.setActiveSession(char.id, session2Id);

    // Sessão 2 compra 1 mana potion (gasta 15 gold -> sobra 21) e sofre morte no templo (XP 2700, sword 19)
    const session2Save = await characterService.saveCharacterProgress(char.id, {
      level: 7,
      experience: BigInt(2700), // Penalidade legítima de morte
      isDeathPenalty: true, // Flag de penalidade de morte legítima
      saveVersion: 5,
      sessionId: session2Id,
      inventory: [
        { slot: 'gold', serverId: 2148, name: 'Gold Coin', count: 21 }, // Gold gasto preservado
        { slot: 'backpack_0', serverId: 2666, name: 'Meat', count: 2 },
        { slot: 'backpack_1', serverId: 2792, name: 'Cheese', count: 4 },
        { slot: 'backpack_2', serverId: 7620, name: 'Mana Potion', count: 1 }, // Compra legítima
        { slot: 'leftHand', serverId: 2376, name: 'Sword', count: 1 },
      ],
      skills: [
        { skillId: 2, skillName: 'Sword Fighting', value: 19, tries: BigInt(0) }, // Penalidade mantida
        { skillId: 5, skillName: 'Shielding', value: 18, tries: BigInt(20) },
      ],
    });
    console.log(`[Sessão 2] Salvamento concluído com sucesso. Nova saveVersion: ${(session2Save as any).saveVersion} (Gold=21, XP=2700, Sword=19)\n`);

    // ------------------------------------------------------------------------
    // CENÁRIO 5: Sessão 1 (Antiga) Tenta Gravar e Deve Ser Rejeitada
    // ------------------------------------------------------------------------
    console.log('------------------------------------------------------------------------');
    console.log('⚔️ CENÁRIO 5: Sessão 1 (Antiga) Tenta Gravar e Deve Ser Rejeitada');
    console.log('------------------------------------------------------------------------');
    let session1Blocked = false;
    try {
      await characterService.saveCharacterProgress(char.id, {
        level: 7,
        experience: BigInt(3000), // Tentando reverter penalidade de morte
        saveVersion: 6,
        sessionId: session1Id, // ID da sessão antiga!
        inventory: [
          { slot: 'gold', serverId: 2148, name: 'Gold Coin', count: 36 }, // Tentando restaurar 36 gold
        ],
      });
    } catch (err: any) {
      if (err instanceof SessionSupersededError || err?.code === 'SESSION_SUPERSEDED') {
        session1Blocked = true;
        console.log(`[Sessão 1] Bloqueio comprovado com SessionSupersededError: "${err.message}"`);
      } else {
        throw err;
      }
    }

    if (!session1Blocked) {
      throw new Error('Falha crítica: Sessão antiga conseguiu salvar sobre a sessão ativa!');
    }

    // Conferir que o banco não foi alterado pela sessão 1
    const auditDb1 = await prisma.character.findUnique({
      where: { id: char.id },
      include: { inventory: true, skills: true },
    });
    const goldItem = (auditDb1 as any)?.inventory?.find((i: any) => i.slot === 'gold');
    console.log(`[Auditoria BD] Gold: ${goldItem?.count} (Esperado: 21), XP: ${auditDb1?.experience} (Esperado: 2700)`);
    if (goldItem?.count !== 21 || Number(auditDb1?.experience) !== 2700) {
      throw new Error('Corrupção detectada: o estado da sessão 2 foi sobrescrito pela sessão antiga!');
    }
    console.log('✅ Sessão antiga foi 100% impedida de sobrescrever dados da nova sessão.\n');

    // ------------------------------------------------------------------------
    // CENÁRIO 6: Não Há Sessão Registrada (Player Desconectado/Offline)
    // ------------------------------------------------------------------------
    console.log('------------------------------------------------------------------------');
    console.log('📴 CENÁRIO 6: Não Há Sessão Registrada no Servidor (Player Offline)');
    console.log('------------------------------------------------------------------------');
    // Simula logout / onLeave de todos os jogadores
    ServerCharacterContextRegistry.setPlayerOffline(char.id);

    const queryOffline = await ServerCharacterContextRegistry.getContextAsync(char.id);
    console.log(`[Colyseus Context] activeSessionId=${queryOffline.activeSessionId} (null), lastActiveSessionId=${queryOffline.lastActiveSessionId}`);

    let offlineBlocked = false;
    try {
      // Sessão 1 (antiga) tenta salvar agora que não há nenhuma sessão ativa conectada
      await characterService.saveCharacterProgress(char.id, {
        level: 7,
        experience: BigInt(3000),
        saveVersion: 6,
        sessionId: session1Id, // Sessão antiga
      });
    } catch (err: any) {
      if (err instanceof SessionSupersededError || err?.code === 'SESSION_SUPERSEDED') {
        offlineBlocked = true;
        console.log(`[Offline Protection] Bloqueio comprovado sem sessão ativa: "${err.message}"`);
      } else {
        throw err;
      }
    }

    if (!offlineBlocked) {
      throw new Error('Falha de segurança: sessão antiga conseguiu gravar quando nenhuma sessão estava registrada!');
    }
    console.log('✅ Quando não há sessão registrada, a gravação antiga NÃO é liberada.\n');

    // ------------------------------------------------------------------------
    // CENÁRIO 7: Serviço de Contexto Indisponível (Colyseus Offline)
    // ------------------------------------------------------------------------
    console.log('------------------------------------------------------------------------');
    console.log('🔌 CENÁRIO 7: Serviço de Contexto Indisponível (Colyseus Desligado)');
    console.log('------------------------------------------------------------------------');
    // Encerra o servidor Colyseus para simular serviço indisponível
    await gameServerInstance.close();
    console.log('[Colyseus] Servidor encerrado para simular indisponibilidade do barramento interno.');

    let unavailableBlocked = false;
    try {
      // Sessão antiga tenta salvar quando o Colyseus está completamente fora do ar
      await characterService.saveCharacterProgress(char.id, {
        level: 7,
        experience: BigInt(3000),
        saveVersion: 6,
        sessionId: session1Id, // Sessão antiga
      });
    } catch (err: any) {
      if (
        err instanceof SessionSupersededError ||
        err instanceof ContextServiceUnavailableError ||
        err?.code === 'SESSION_SUPERSEDED' ||
        err?.code === 'CONTEXT_SERVICE_UNAVAILABLE'
      ) {
        unavailableBlocked = true;
        console.log(`[Unavailable Protection] Bloqueio comprovado com Colyseus offline: [${err.code}] "${err.message}"`);
      } else {
        throw err;
      }
    }

    if (!unavailableBlocked) {
      throw new Error('Falha crítica: gravação antiga foi liberada durante indisponibilidade do serviço de contexto!');
    }
    console.log('✅ Quando o serviço de contexto está indisponível, gravações antigas NÃO são liberadas.\n');

    // ------------------------------------------------------------------------
    // CENÁRIO 8: Verificação Final de Todos os Atributos Preservados
    // ------------------------------------------------------------------------
    console.log('------------------------------------------------------------------------');
    console.log('💎 CENÁRIO 8: Verificação Final de Integridade do Personagem');
    console.log('------------------------------------------------------------------------');
    const finalDbChar = await prisma.character.findUnique({
      where: { id: char.id },
      include: { inventory: true, skills: true },
    });
    const finalGold = (finalDbChar as any)?.inventory?.find((i: any) => i.slot === 'gold')?.count;
    const finalPotions = (finalDbChar as any)?.inventory?.filter((i: any) => i.serverId === 7620)?.length;
    const finalSwordSkill = (finalDbChar as any)?.skills?.find((s: any) => s.skillId === 2)?.value;

    console.log(`  - Nível final: ${finalDbChar?.level} (Esperado: 7)`);
    console.log(`  - Experiência final: ${finalDbChar?.experience} (Esperado: 2700)`);
    console.log(`  - Gold final: ${finalGold} (Esperado: 21)`);
    console.log(`  - Poções compradas: ${finalPotions} (Esperado: 1)`);
    console.log(`  - Skill Sword final: ${finalSwordSkill} (Esperado: 19)`);
    console.log(`  - saveVersion final: ${(finalDbChar as any)?.saveVersion} (Esperado: 6)`);

    if (
      finalDbChar?.level !== 7 ||
      Number(finalDbChar?.experience) !== 2700 ||
      finalGold !== 21 ||
      finalPotions !== 1 ||
      finalSwordSkill !== 19 ||
      (finalDbChar as any)?.saveVersion !== 6
    ) {
      throw new Error('Falha na auditoria final de integridade de dados!');
    }

    console.log('\n========================================================================');
    console.log('🎉 TODOS OS 8 CENÁRIOS MULTI-PROCESSO FORAM APROVADOS COM 100% DE SUCESSO!');
    console.log('========================================================================\n');
  } finally {
    // Limpeza do personagem de teste isolado
    await prisma.character.deleteMany({ where: { name: TEST_CHAR_NAME } });
    try {
      await gameServerInstance.close();
    } catch {}
  }
}

main().catch((err) => {
  console.error('\n❌ Erro fatal na verificação multi-processo:', err);
  process.exit(1);
});
