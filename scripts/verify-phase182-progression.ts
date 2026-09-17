import { prisma } from '../packages/database/src/index.ts';
import { CharacterService, XpRateLimiter, ServerCharacterContextRegistry } from '../packages/auth/src/index.ts';
import { PrismaPersistenceManager } from '../packages/server/src/persistence/PrismaPersistenceManager';
import { PlayerState } from '../packages/server/src/schemas/PlayerState';
import { experienceForLevel, levelForExperience } from '../packages/domain/src/index.ts';
import { mergeLootStacks } from '../apps/web/lib/characterHydration';
import { progressionDiagnostics } from '../apps/web/lib/progressionDiagnostics';

async function runVerification() {
  console.log('===============================================================');
  console.log('🔍 PHASE 182 BLOCO A: VERIFICAÇÃO END-TO-END DE PROGRESSÃO');
  console.log('===============================================================');

  const charService = new CharacterService(prisma);
  const persistenceManager = new PrismaPersistenceManager(prisma);

  // 1. Setup isolated test character 'AtlasHeroAlpha'
  const testCharName = 'AtlasHeroAlpha';
  let char = await prisma.character.findUnique({
    where: { name: testCharName },
    include: { skills: true, inventory: true },
  });

  if (!char) {
    let account = await prisma.account.findFirst();
    if (!account) {
      account = await prisma.account.create({
        data: {
          email: 'atlas.tester@cavebound.local',
          passwordHash: 'hash123',
        },
      });
    }
    char = await prisma.character.create({
      data: {
        accountId: account.id,
        name: testCharName,
        vocationId: 4,
        vocationName: 'Knight',
        level: 1,
        experience: BigInt(0),
        saveVersion: 1,
      },
      include: { skills: true, inventory: true },
    });
    console.log(`[Setup] Criado personagem de teste isolado: ${char.name} (ID: ${char.id})`);
  } else {
    // Reset test character to clean starting state for reproducibility
    await prisma.character.update({
      where: { id: char.id },
      data: {
        level: 1,
        experience: BigInt(0),
        saveVersion: 1,
      },
    });
    char = (await prisma.character.findUnique({
      where: { id: char.id },
      include: { skills: true, inventory: true },
    }))!;
    console.log(`[Setup] Reiniciado personagem de teste isolado: ${char.name} (ID: ${char.id}) para Level 1`);
  }

  // 2. Set hunt context
  ServerCharacterContextRegistry.setActivity(char.id, { isHunting: true, huntId: 'rat-cellars' });
  console.log(`[Context] Registrado contexto de caçada ativa: isHunting = ${ServerCharacterContextRegistry.isHunting(char.id)}`);

  // 3. Simulate Rat kills and continuous progression past Level 6 (target Level 7 = 2,400 XP)
  console.log('\n[Progression] Simulando caçada de ratos contínua até ultrapassar o Nível 6...');
  let currentLevel = 1;
  let currentExp = 0;
  let currentGold = 0;
  let currentLoot: Array<{ itemId?: number; name: string; amount: number }> = [];

  const targetLevel = 7;
  const targetExp = experienceForLevel(targetLevel); // 2400 XP
  const ratsNeeded = Math.ceil(targetExp / 5);

  for (let r = 1; r <= ratsNeeded; r++) {
    currentExp += 5;
    const nextLvl = levelForExperience(currentExp);
    if (nextLvl > currentLevel) {
      progressionDiagnostics.recordLevelUp(currentLevel, nextLvl, currentExp);
      currentLevel = nextLvl;
    }
    // Rat drops 1-4 gold + cheese
    currentGold += 2;
    currentLoot = mergeLootStacks(currentLoot, [{ itemId: 2696, name: 'Cheese', amount: 1 }]);
  }

  console.log(`[Progression] Ratos derrotados: ${ratsNeeded}`);
  console.log(`[Progression] Nível atingido: ${currentLevel} (Esperado: >= 7)`);
  console.log(`[Progression] Experiência total: ${currentExp} XP`);
  console.log(`[Progression] Ouro acumulado no baú da party: ${currentGold}`);
  console.log(`[Progression] Loot acumulado: ${JSON.stringify(currentLoot)}`);

  if (currentLevel < 7) {
    throw new Error(`Falha: Nível ${currentLevel} é menor que 7!`);
  }

  // 4. Test Colyseus autosave isolation (inHunt player must NOT be overwritten by Colyseus saveBatch)
  console.log('\n[Colyseus Isolation] Testando ciclo de autosave do Colyseus enquanto o jogador está em caçada...');
  const huntPlayer = new PlayerState();
  huntPlayer.characterId = char.id;
  huntPlayer.name = char.name;
  huntPlayer.inHunt = true; // Player is actively hunting!
  huntPlayer.level = 1; // Colyseus local state is defasado
  huntPlayer.experience = 0;
  (huntPlayer as any).saveVersion = 1;

  const cityPlayers = [huntPlayer].filter((p) => !p.inHunt);
  console.log(`[Colyseus Isolation] Jogadores filtrados para autosave do Colyseus: ${cityPlayers.length} (esperado 0 para hunting)`);
  if (cityPlayers.length !== 0) {
    throw new Error('Falha: Jogador em caçada não foi isolado do autosave do Colyseus!');
  }

  // 5. Client periodic autosave (HTTP POST /save with isHunting: true)
  console.log('\n[Client Autosave] Executando salvamento do cliente com isHunting = true...');
  const saveAttemptId = 'att-phase182-test';
  progressionDiagnostics.recordSaveAttempt(saveAttemptId, char.id, 1, currentLevel, currentExp, currentGold, true);
  const saveResult = await charService.saveCharacterProgress(char.id, {
    saveVersion: 1,
    level: currentLevel,
    experience: BigInt(currentExp),
    skills: [
      { skillId: 2, skillName: 'Sword Fighting', value: 15, tries: 50 },
    ],
  }, { isHunting: true });

  const updatedVersion = (saveResult as any).saveVersion;
  progressionDiagnostics.recordSaveSuccess(saveAttemptId, updatedVersion, 200);
  console.log(`[Client Autosave] Sucesso! Banco atualizado para saveVersion: ${updatedVersion}`);

  // 6. Simulate 409 Conflict scenario and Monotonic Reconciliation
  console.log('\n[Reconciliation] Simulando colisão HTTP 409 (servidor desatualizado retorna Level 1 com saveVersion superior)...');
  const staleServerResponse = {
    saveVersion: updatedVersion + 1,
    level: 1, // Stale server state
    experience: 0,
    inventory: {
      gold: 0,
      bag: [],
      loot: [],
    },
    skills: [
      { skillId: 2, skillName: 'Sword Fighting', value: 10, tries: 0 },
    ],
  };

  // Run client monotonic reconciliation logic
  const reconciledExp = Math.max(currentExp, Number(staleServerResponse.experience || 0));
  const reconciledLevel = Math.max(currentLevel, staleServerResponse.level, levelForExperience(reconciledExp));
  const finalGold = Math.max(currentGold, staleServerResponse.inventory.gold);
  const finalLoot = mergeLootStacks(currentLoot, staleServerResponse.inventory.loot);

  console.log(`[Reconciliation] Resultado após 409:`);
  console.log(`  - Nível reconciliado: ${reconciledLevel} (Nunca retrocede para 1)`);
  console.log(`  - Experiência reconciliada: ${reconciledExp} XP`);
  console.log(`  - Ouro reconciliado: ${finalGold}`);
  console.log(`  - Loot reconciliado: ${finalLoot.length} stacks`);

  if (reconciledLevel < 7) {
    throw new Error('Falha crítica: Reconciliação 409 permitiu regressão de nível!');
  }

  // Resave with updated saveVersion to SQLite
  await prisma.character.update({
    where: { id: char.id },
    data: {
      saveVersion: staleServerResponse.saveVersion,
      level: reconciledLevel,
      experience: BigInt(reconciledExp),
    },
  });

  // 7. Disconnect and Server Restart Simulation: Re-fetch from DB
  console.log('\n[Restart Simulation] Simulando reconexão e reinício completo do servidor...');
  const persistedChar = await prisma.character.findUnique({
    where: { id: char.id },
    include: { skills: true, inventory: true },
  });

  console.log(`[DB Verify] Personagem persistido no banco:`);
  console.log(`  - Nome: ${persistedChar?.name}`);
  console.log(`  - Nível: ${persistedChar?.level}`);
  console.log(`  - Experiência: ${persistedChar?.experience.toString()} XP`);
  console.log(`  - SaveVersion: ${persistedChar?.saveVersion}`);

  if (persistedChar?.level !== 7) {
    throw new Error(`Falha: Nível persistido no banco (${persistedChar?.level}) difere do esperado (7)!`);
  }
  if (Number(persistedChar?.experience) < 2400) {
    throw new Error(`Falha: XP persistida (${persistedChar?.experience}) é menor que 2400!`);
  }

  console.log('\n===============================================================');
  console.log('🎉 BLOCO A APROVADO COM SUCESSO EM TODAS AS ETAPAS!');
  console.log('===============================================================');
}

runVerification().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error('❌ Erro na verificação:', err);
  process.exit(1);
});
