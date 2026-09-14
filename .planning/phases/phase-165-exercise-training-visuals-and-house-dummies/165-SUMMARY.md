# Fase 165: Animações de Treino em Dummies, Projéteis Vocacionais e Dummies Residenciais — Resumo de Entrega

## 🎯 Objetivo da Fase
Implementar a experiência visual e mecânica completa de treino nos bonecos (*Training Dummies*) em Thais e estruturar o suporte extensível para futuros bonecos de treino residenciais (*house dummies*):
1. **Orientação Corporal Automática**: O personagem se vira de frente para o dummy (`directionBetween(playerPos, dummyPos)`).
2. **Pulso de Animação de Golpe/Ataque**: A cada ação de treino (~2s), o personagem executa uma investida visual (`charWalkFrame = 1` com duração de 250ms e nudge de 3px na direção do dummy).
3. **Projéteis e Efeitos Vocacionais Autênticos (`realmap11` / `exercise_training.lua`)**:
   - **Knights (Melee)**: Efeito de impacto físico `CONST_ME_HITAREA` (Efeito 10) diretamente no dummy.
   - **Paladins (Distance)**: Flecha canônica `CONST_ANI_ARROW` (Míssil 3 ou 54) voando do jogador até o dummy com rotação direcional de 8 ângulos, seguida de impacto físico 10.
   - **Sorcerers (Wand / Magia)**: Míssil de fogo `CONST_ANI_FIRE` (4) ou energia `CONST_ANI_ENERGY` (5) com impacto `CONST_ME_HITBYFIRE` (16) ou `CONST_ME_ENERGYHIT` (12).
   - **Druids (Rod / Magia)**: Míssil de gelo `CONST_ANI_ICE` (29) ou terra `CONST_ANI_EARTH` (15) com impacto `CONST_ME_ICEATTACK` (44) ou `CONST_ME_ENERGYHIT` (12).
4. **Carregamento Autônomo de Texturas no PixiJS**: Mísseis e efeitos de impacto pré-carregados e instanciados sem depender do atlas restrito de magias do jogador.
5. **Arquitetura Extensível para Dummies de Casas (*House Dummies*)**: Registro centralizado dos itens `31827` (exercise dummy), `31828`/`31829` (ferumbras), `31830`/`31831` (demon), `31832`/`31833` (monk) e `5787` (Thais classic dummy).
6. **Sincronização Multiplayer no Colyseus (`ThaisCityRoom.ts`)**: Transmissão dos eventos visuais de treino via `combatEvent` para todos os jogadores presentes no Depot.

---

## 🛠️ O que foi Implementado

### 1. Extensão do Catálogo de Dummies e Resolução Visual (`packages/domain/src/training.ts`)
- **Catálogo Canônico de Dummies:**
  - `CANONICAL_TRAINING_DUMMIES` mapeando todos os IDs do TFS / Realmap 11:
    - `5787`: Training Dummy clássico (Depot de Thais)
    - `31827`: Exercise Dummy comum
    - `31828` / `31829`: Ferumbras Exercise Dummy
    - `31830` / `31831`: Demon Exercise Dummy
    - `31832` / `31833`: Monk Exercise Dummy
  - Helper `isTrainingDummyId(itemId: number): boolean` e `getTrainingDummyDefinition(itemId)`.
- **Resolução de Ação Visual (`resolveTrainingVisualAction`):**
  - Mapeamento determinístico de projéteis (`projectileId`) e impactos (`effectId`) de acordo com a vocação do personagem (suporte completo a vocações base e promoções: *Knight*, *Elite Knight*, *Paladin*, *Royal Paladin*, *Sorcerer*, *Master Sorcerer*, *Druid*, *Elder Druid*).
  - Tipagem resiliente garantindo 0 erros de narrowing TypeScript (`TS2367`).
- **Geração de Eventos em `advanceTraining`:**
  - A cada tick de treino concluído, emite o evento `'training-action'` contendo `projectileId`, `effectId`, `targetPos` e `style`.

### 2. Motor Gráfico PixiJS (`apps/web/components/ThaisCityArena.tsx`)
- **Cálculo de Trajetória e 8 Direções Canônicas:**
  - Função `getMissileDirection(dx, dy)` que converte o vetor de deslocamento nos 8 ângulos autênticos do Tibia (`east`, `north-east`, `north`, `north-west`, `west`, `south-west`, `south`, `south-east`).
- **Pré-carregamento Automático de Sprites:**
  - Efeitos pré-carregados: 10 (físico), 12 (energia), 16 (fogo), 17 (fogo sutil), 18 (explosão), 37 (chamas), 38 (terra), 44 (gelo).
  - Mísseis pré-carregados: 3 (flecha), 4 (fogo), 5 (energia), 11 (bolt), 15 (spear/terra), 28 (sniper arrow), 29 (gelo), 54 (flecha simples).
  - Dummies pré-carregados: `item-5787.png`, `item-31827.png` a `item-31833.png`.
- **Orientação e Pulso de Ataque Corporal:**
  - `playerDirection` ajustado instantaneamente de frente para o dummy enquanto estiver treinando.
  - Pulso `lastAttackPoseUntil = now + 250ms`: altera o sprite do personagem para `charWalkFrame = 1` com avanço de 3px em direção ao dummy, simulando o golpe de arma/disparo.
  - Suporte multiplayer para jogadores remotos atacando (`rIsAttacking`).

### 3. Integração de Rede e Multiplayer
- **Cliente (`GamePrototype.tsx` e `GameClientNetworkManager.ts`):**
  - Passagem de `trainingDummyPos` para o `<ThaisCityArena />`.
  - Despacho de mensagem `training:action` a cada tick de treino.
- **Servidor (`ThaisCityRoom.ts`):**
  - Handler `onMessage('training:action', ...)` que valida a posição e transmite um `combatEvent` para todos os clientes conectados na sala de Thais.

---

## 🧪 Cobertura de Testes
- **Testes Unitários:** `tests/phase165-exercise-training-visuals-and-house-dummies.test.ts` (9 testes criados e 100% aprovados):
  - Validação de todos os IDs de dummies clássicos e residenciais (`5787`, `31827`-`31833`).
  - Resolução visual autêntica para Knight (melee sem míssil, efeito 10).
  - Resolução visual autêntica para Paladin (projétil de flecha 3 ou 54, efeito 10).
  - Resolução visual autêntica para Sorcerer (míssil de fogo 4 ou energia 5, efeito 16 ou 12).
  - Resolução visual autêntica para Druid (míssil de gelo 29 ou energia 5, efeito 44 ou 12).
  - Resolução para vocações promovidas (*Elite Knight*, *Royal Paladin*, etc.).
  - Emissão de eventos `training-action` com projéteis e efeitos corretos em `advanceTraining`.
- **TypeScript:** 0 erros com `tsc --noEmit`.
