import { prisma } from '../packages/database/src';
import {
  CharacterService,
  ServerCharacterContextRegistry,
} from '../packages/auth/src';
import { createGameServer } from '../packages/server/src/server';
import { PrismaPersistenceManager } from '../packages/server/src/persistence/PrismaPersistenceManager';

async function main() {
  console.log('========================================================================');
  console.log('🧪 TESTE ISOLADO DA SEQUÊNCIA REAL DE RESTART (Colyseus, Context, BD)');
  console.log('========================================================================\n');

  const TEST_CHAR_NAME = 'IsolatedRestartHero';
  const TEST_PORT = 2569; // Porta isolada de teste
  process.env.COLYSEUS_PORT = String(TEST_PORT);
  process.env.INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || 'cavebound_internal_core_secret_v1';

  // 1. Iniciar Servidor Colyseus Instância A
  console.log(`[Colyseus A] Iniciando servidor real na porta ${TEST_PORT}...`);
  let gameServerA = createGameServer({ port: TEST_PORT });
  await gameServerA.listen(TEST_PORT);
  console.log(`[Colyseus A] Servidor online em http://127.0.0.1:${TEST_PORT}!\n`);

  const persistenceManager = new PrismaPersistenceManager();
  const characterService = new CharacterService(prisma);

  try {
    // 2. Setup do Personagem de Teste Isolado
    let testAccount = await prisma.account.findFirst();
    if (!testAccount) {
      testAccount = await prisma.account.create({
        data: {
          id: 'isolated-restart-test-account-id',
          email: 'restart-test@cavebound.test',
          passwordHash: 'dummy_hash',
        },
      });
    }

    await prisma.character.deleteMany({ where: { name: TEST_CHAR_NAME } });

    const char = await prisma.character.create({
      data: {
        accountId: testAccount.id,
        name: TEST_CHAR_NAME,
        vocationName: 'Knight',
        level: 20,
        experience: BigInt(120000),
        health: 300,
        maxHealth: 300,
        mana: 100,
        maxMana: 100,
        capacity: 700,
        staminaMinutes: 15,
        saveVersion: 1,
      },
    });

    console.log(`[Personagem] Criado ${char.name} (${char.id}) no Nível ${char.level} (120.000 XP, saveVersion: 1).\n`);

    // 3. Iniciar Caçada (troll-cave)
    console.log('--- PASSO 1: INICIAR CAÇADA ---');
    await persistenceManager.setPlayerHuntStatus(char.id, true, 'troll-cave', 'session-real-1');
    ServerCharacterContextRegistry.setActivity(char.id, {
      isHunting: true,
      huntId: 'troll-cave',
      activeSessionId: 'session-real-1',
      lastActiveSessionId: 'session-real-1',
    });

    const huntCheckBefore = await persistenceManager.getActiveHuntSession(char.id);
    if (!huntCheckBefore?.isHunting) {
      throw new Error('Falha ao persistir sessão de caçada ativa no banco!');
    }
    console.log('✅ Caçada autoritativamente persistida no banco:', huntCheckBefore);

    // 4. Ganho de XP na caçada (+15.000 XP do troll)
    console.log('\n--- PASSO 2: GANHO DE XP NA CAÇADA (+15.000 XP) ---');
    const targetExp1 = 120000 + 15000; // 135.000 XP

    // 5. REINICIAR COLYSEUS (Desliga A, limpa memória 100%, inicia B)
    console.log('\n--- PASSO 3: REINICIAR SERVIÇO COLYSEUS (SIMULAÇÃO DE CRASH/RESTART) ---');
    console.log('[Colyseus A] Encerrando instância A...');
    await gameServerA.close();
    console.log('[Colyseus A] Encerrado com sucesso.');

    console.log('[Memória] Limpando todo o cache em memória (ServerCharacterContextRegistry.clearAll)...');
    ServerCharacterContextRegistry.clearAll();

    if (ServerCharacterContextRegistry.getActivity(char.id) !== undefined) {
      throw new Error('Falha ao limpar registro em memória!');
    }
    console.log('✅ Cache em memória completamente limpo (contexto local é undefined).');

    console.log(`[Colyseus B] Iniciando nova instância B na porta ${TEST_PORT}...`);
    const gameServerB = createGameServer({ port: TEST_PORT });
    await gameServerB.listen(TEST_PORT);
    console.log(`[Colyseus B] Nova instância online em http://127.0.0.1:${TEST_PORT}!\n`);

    // 6. Reconexão e Recuperação de Contexto
    console.log('--- PASSO 4: RECUPERAÇÃO DE CONTEXTO AUTORITATIVO ---');
    // Consultar o endpoint HTTP /api/character-context/:id com a nova instância B
    const secret = process.env.INTERNAL_SERVICE_KEY;
    const resCtx = await fetch(`http://127.0.0.1:${TEST_PORT}/api/character-context/${char.id}`, {
      headers: { 'x-internal-secret': secret! },
    });
    const ctxData = await resCtx.json() as any;
    console.log('[Colyseus B API] Resposta de contexto recuperada do banco:', ctxData);

    if (!ctxData.isHunting || !ctxData.isContextKnown || ctxData.huntId !== 'troll-cave') {
      throw new Error(`Falha na recuperação de contexto após restart! Recebido: ${JSON.stringify(ctxData)}`);
    }
    console.log('✅ Contexto de caçada sobreviveu ao reinício e foi recuperado com sucesso do banco de dados!');

    // 7. Salvar Progresso Acumulado
    console.log('\n--- PASSO 5: SALVAMENTO DE PROGRESSO ACUMULADO (+15.000 XP) ---');
    // Como a instância B está rodando na porta TEST_PORT (2569), a rota HTTP consulta a porta correta
    ServerCharacterContextRegistry.setAuthoritativeSource(false);

    const savedChar = await characterService.saveCharacterProgress(char.id, {
      saveVersion: 1,
      experience: BigInt(targetExp1),
      sessionId: 'session-real-1',
    } as any);

    console.log(`[Save API] Progresso salvo com sucesso! Versão: ${savedChar.saveVersion}, XP: ${savedChar.experience}`);
    if (savedChar.saveVersion !== 2 || Number(savedChar.experience) !== targetExp1) {
      throw new Error(`Dados salvos divergem do esperado! Versão: ${savedChar.saveVersion}, XP: ${savedChar.experience}`);
    }
    console.log('✅ Salvamento pós-reconexão autorizado e persistido com sucesso (saveVersion: 2)!');

    // 8. Retorno ao Templo / Fim da Caçada
    console.log('\n--- PASSO 6: RETORNO AO TEMPLO (SAÍDA DA CAÇADA) ---');
    await persistenceManager.setPlayerHuntStatus(char.id, false);
    ServerCharacterContextRegistry.setActivity(char.id, {
      isHunting: false,
      huntId: undefined,
    });

    const huntCheckAfter = await persistenceManager.getActiveHuntSession(char.id);
    if (huntCheckAfter !== null) {
      throw new Error('Sessão de caçada não foi removida após retorno à cidade!');
    }
    console.log('✅ Sessão de caçada encerrada no banco e contexto urbano restabelecido.');

    // 9. Reconexão na Cidade
    console.log('\n--- PASSO 7: RECONEXÃO NA CIDADE E SALVAMENTO URBANO LEGÍTIMO ---');
    const cityResCtx = await fetch(`http://127.0.0.1:${TEST_PORT}/api/character-context/${char.id}`, {
      headers: { 'x-internal-secret': secret! },
    });
    const cityCtxData = await cityResCtx.json() as any;
    console.log('[Colyseus B API] Contexto urbano verificado:', cityCtxData);
    if (cityCtxData.isHunting !== false || cityCtxData.isContextKnown !== true) {
      throw new Error(`Contexto urbano incorreto! Recebido: ${JSON.stringify(cityCtxData)}`);
    }

    // Salva ganho normal de cidade (+100 XP) -> deve passar
    const citySave = await characterService.saveCharacterProgress(char.id, {
      saveVersion: 2,
      experience: BigInt(targetExp1 + 100),
      sessionId: 'session-real-1',
    } as any);
    console.log(`✅ Salvamento urbano aprovado (saveVersion: ${citySave.saveVersion}, XP: ${citySave.experience})!`);

    // 10. TESTE NEGATIVO: Envio de isHunting: true forjado sem caçada ativa
    console.log('\n--- PASSO 8: TESTE NEGATIVO (isHunting: true FORJADO NA CIDADE) ---');
    let rejectedAsExpected = false;
    try {
      // Tenta ganhar +15.000 XP na cidade enviando isHunting: true no payload
      await characterService.saveCharacterProgress(char.id, {
        saveVersion: citySave.saveVersion,
        experience: BigInt(Number(citySave.experience) + 15000),
        isHunting: true, // tentativa forjada
        sessionId: 'session-real-1',
      } as any, {
        isHunting: true, // opções de cliente
      });
    } catch (err: any) {
      if (err.message.includes('Suspicious XP gain') && err.message.includes('exceeds continuous time budget')) {
        rejectedAsExpected = true;
        console.log('✅ Rejeição autoritativa confirmada:', err.message);
      } else {
        throw err;
      }
    }

    if (!rejectedAsExpected) {
      throw new Error('SEGURANÇA FALHOU: Ganho de 15.000 XP na cidade foi aceito indevidamente com isHunting: true forjado!');
    }
    console.log('✅ Teste Negativo APROVADO: Cliente não consegue liberar orçamento de caçada na cidade!');

    // Cleanup final
    await gameServerB.close();
    await prisma.character.deleteMany({ where: { name: TEST_CHAR_NAME } });

    console.log('\n========================================================================');
    console.log('🎉 TODOS OS 8 PASSOS DA SEQUÊNCIA REAL FORAM EXECUTADOS COM SUCESSO!');
    console.log('========================================================================\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERRO NA EXECUÇÃO DO TESTE ISOLADO:', error);
    try {
      await prisma.character.deleteMany({ where: { name: TEST_CHAR_NAME } });
    } catch {}
    process.exit(1);
  }
}

main().catch(console.error);
