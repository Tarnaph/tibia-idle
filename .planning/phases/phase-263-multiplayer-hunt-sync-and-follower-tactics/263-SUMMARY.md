# Phase 263 Summary: Multiplayer Hunt Sync, Fluid Movement & Follower Tactics (Onda 16)

## Executed Work

### 1. Descongelamento do Seguidor & IA Tática Autônoma
- **Root Cause:** Em `packages/domain/src/spatial/movement.ts`, quando um personagem secundário (`actor.characterId !== mainActor?.characterId`) operava em `encounter.isMultiplayerParty` e o líder ainda não possuía um alvo travado (`!mainTargetEnemy`), o código executava `actor.targetId = null; actor.path = []; continue;`, paralisando completamente o seguidor (ex: Caos).
- **Correção:** Implementada busca autônoma do seguidor pelo inimigo vivo mais próximo (`nearestEnemy`). Quando o líder não tem alvo travado ou o alvo principal está inacessível, o seguidor engaja imediatamente a criatura mais próxima, mantendo o combate fluido e contínuo.

### 2. Eliminação do Conflito de Simulação Dupla (Tug-of-War)
- **Root Cause:** Na tela do seguidor, o cliente executava `movePartyTowardTargets` e `movePartyTowardPoint` simulando localmente a movimentação de TODOS os atores da party, inclusive do líder remoto (Brututus). Como o líder enviava seu snapshot autoritativo de rede a cada 200ms, o líder dava um passo simulado pelo seguidor e era puxado de volta pelo pacote de rede, criando o efeito de "andar para frente e para trás". Além disso, o seguidor executava `moveEnemiesTowardParty` e `enemyAttacks`, disputando a posição dos Cyclops com o líder e causando o stuttering/teleporte travado das criaturas.
- **Correção:** 
  - Adicionado o parâmetro `localCharacterId` (`state.session.selectedCharacterId`) em `movePartyTowardTargets`, `movePartyTowardPoint` e `movePartyToExit`. Atores remotos nunca têm sua movimentação simulada localmente.
  - Guardas estritas em `advanceSpatialCombat` e `advanceContinuousHunt` (`isMultiplayerFollower = encounter.isMultiplayerParty && state.session.leaderId !== state.session.selectedCharacterId`): seguidores não executam `moveEnemiesTowardParty` nem `enemyAttacks`, mantendo o líder como autoridade exclusiva do estado das criaturas.

### 3. Enriquecimento do Snapshot de Caçada (`PartyHuntEncounterData`)
- Em `apps/web/lib/GameClientNetworkManager.ts`, a interface `PartyHuntEncounterData` foi enriquecida com:
  - `partyActors`: array completo dos membros da equipe com `characterId`, `hp`, `maxHp`, `mana`, `maxMana`, `x`, `y`, `z`, `direction`, `targetId`, `alive`.
  - `currentZoneIndex`: sincronização do índice da zona de respawn para alinhamento contínuo da masmorra.
  - Coordenadas Z e direção em monstros (`enemies`).

### 4. Reconciliação Fluida com Interpolação Lerp (60 FPS no PixiJS)
- Em `apps/web/components/GamePrototype.tsx` (`unsubHuntEncounterSync`):
  - Ao receber o snapshot do líder, compara posições anteriores de atores remotos e monstros com as novas coordenadas.
  - Emite eventos de movimento autênticos: `{ type: 'movement', actorId, from, to, durationMs: 200 }`.
  - O pipeline de apresentação do PixiJS (`VisualMotionTrack`) consome os eventos e interpola a caminhada a 60 FPS contínuos, eliminando saltos bruscos e congelamentos.
  - Sincronização do mapa de ocupação (`synchronizeEncounterOccupancy`) para consistência total da grade.

### 5. Pré-Carregamento Imediato no Seguidor Sob a Tela de Loading
- No `unsubHuntStart`, chamada síncrona imediata de `preloadHunt`, `restartHunt`, `setMode('hunt')`, `setCityPos` e `gameNetwork.sendSetInHunt(true)`.
- Redução da duração da tela de transição para 3 segundos, garantindo que o seguidor entre na sincronização em tempo real desde o primeiro instante sem defasagem de 10 segundos em relação ao líder.

## Verificação e Qualidade
- **Testes Automatizados:** 4/4 testes aprovados em `tests/phase263-multiplayer-hunt-sync-and-follower-tactics.test.ts`.
- **TypeScript:** 0 erros de tipagem em `npm run typecheck`.
- **Documentação:** Atualizados `FIX.md` (Onda 16, itens 41 a 45), `ROADMAP.md` e `STATE.md`.
