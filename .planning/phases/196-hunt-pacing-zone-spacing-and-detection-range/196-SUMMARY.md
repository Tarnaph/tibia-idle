# Phase 196: Hunt Pacing, Zone Spacing & Single Pull Arena Engine

## Resumo Executivo
Nesta fase, reformulamos integralmente a dinâmica das caçadas para atender à mecânica de **Arena de Pulls Contínuos** orientada pela dificuldade escolhida pelo jogador (Cauteloso, Ousado, Agressivo). Eliminamos o congestionamento com dezenas de monstros e resolvemos o problema de criaturas congeladas, transformando a caçada em ondas ativas que surgem no local de combate.

## Comportamento Especificado & Entregue
1. **Dificuldade e Dimensionamento Estrito de Pulls:**
   - **Cauteloso:** Spawnam apenas **2 a 3 monstros** no mapa por vez.
   - **Ousado:** Spawnam exatamente **4 monstros**.
   - **Agressivo:** Spawnam **5 a 6 monstros**, com composição mais desafiadora (no Acampamento de Cíclopes, garante pelo menos 2 Cyclops Smiths e 60% de chance nos demais slots).
2. **Mecânica de Arena Idle (In-Place Respawn):**
   - A party não fica andando por longos labirintos desnecessariamente quando está caçando em arena de pulls: o personagem permanece na área e as criaturas surgem ao redor (2 a 4 tiles de distância em tiles caminháveis).
   - **Garantia de 1 Único Pull Ativo:** Se qualquer monstro estiver vivo, nenhum novo monstro é gerado.
   - **Respawn Imediato pós-Limpeza:** Quando o último monstro da onda morre, é disparado um cooldown de 1 segundo (1000ms), após o qual um novo pull surge no local para o char continuar upando sem interrupções.
   - **Limpeza de Memória & Cadáveres:** Cadáveres são limitados aos últimos 15 e a lista de inimigos mortos é podada para suportar sessões infinitas de treino/caçada idle.
3. **Inimigos Ativos (Fim do Congelamento):**
   - Monstros recém-spawnados recebem `detectionRange: 25`, `behavior: 'chase'`, `targetId: leader.characterId` e `nextMoveAt: elapsedMs + 100`.
   - Ao surgirem, eles imediatamente localizam o jogador, calculam o pathfinding e avançam para o combate corpo a corpo, atacando sem ficarem parados.

## Arquivos Modificados
- `packages/domain/src/combat.ts`: Implementação de `populatePullAroundParty`, `choosePullMonsterId`, `findPullSpawnPositions`, gancho de respawn em `defeatEnemy`, e contenção de movimento da party em arena.
- `packages/domain/src/spatial/movement.ts`: Preservação do target lock e movimentação de aproximação sem bloqueios.
- `apps/web/components/GamePrototype.tsx`: Fallback seguro para `pullSize: 'cauteloso'` caso não especificado.
- `tests/phase196-hunt-pacing-and-arena-pulls.test.ts`: Suíte de testes validando quantidade de monstros, ondas sucessivas, composição e perseguição ativa.

## Verificação e Testes
- **Testes Unitários:** Todas as 7 suítes de combate e movimentação aprovadas (43/43 testes).
- **TypeScript:** 0 erros de tipagem via `npm run typecheck`.
- **Deploy em Produção:** Realizado com sucesso na VPS `187.7.16.210` (Commit `820cb6722`, PM2 `tibia-web` e `colyseus-server` online e saudáveis).

