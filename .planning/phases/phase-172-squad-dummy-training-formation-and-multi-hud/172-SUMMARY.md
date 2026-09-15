# Phase 172 Summary: Formação de Treino da Party ao Redor do Dummy & HUD Superior Multi-Personagem

## Status: Complete
**Data:** 2026-09-14

---

## 1. Visão Geral e Entregas

Nesta fase foi implementado o comportamento canônico de treino em squad no dummy e a expansão do HUD de progresso para toda a party:
1. **Desacoplamento e Posicionamento em Volta do Dummy:**
   - Ao iniciar o treino nos dummies de Thais, os integrantes do squad "soltam" o personagem principal (desacoplam da fila indiana) e ocupam posições adjacentes livres ao redor do training dummy (Oeste, Leste, Norte, Sul ou diagonais).
   - Todos os personagens viram a sua orientação visual (`direction`) de frente para o boneco de treino.
2. **Treino Simultâneo das Vocações:**
   - O líder/personagem ativo treina a skill escolhida no menu/HUD (ex: `Sword Fighting`, `Club Fighting`, `Axe Fighting`, `Shielding`).
   - Os seguidores da party treinam automaticamente a sua skill vocacional autêntica:
     - Knight: arma equipada ou maior skill melee (`sword`/`axe`/`club`).
     - Paladin: `distance`.
     - Sorcerer: `magicLevel`.
     - Druid: `magicLevel`.
3. **Animações e Projéteis Individuais dos Seguidores:**
   - Eventos de `training-action` identificam a origem (`sourceId`).
   - Seguidores realizam animação física de ataque (`fIsAttacking` com micro-avanço de 3px em direção ao dummy).
   - Projéteis físicos (flechas do Paladin) e mágicos (fogo/energia do Sorcerer, gelo/terra do Druid) são emitidos a partir da coordenada real do seguidor em direção ao dummy.
4. **HUD Superior Multi-Personagem (`TrainingProgressHUD`):**
   - Painel superior redesenhado no padrão medieval Exura:
     - Suporta 1 até 4 personagens simultâneos em cards estilizados.
     - Cada card exibe: Nome do personagem, badge colorido da vocação, ícone da skill, nível atual → próximo nível, barra de progresso dourada animada com porcentagem, e tempo estimado para upar (`formattedTime`).
     - Botão "Parar Treino" para interromper o treino de todo o grupo de uma só vez.
5. **Restauração da Fila Indiana:**
   - Ao cancelar o treino ("Parar Treino" ou mover o líder), os personagens deixam as vagas do dummy e retornam imediatamente para a formação em fila indiana atrás do líder.

---

## 2. Arquivos Modificados e Criados

- `packages/domain/src/training.ts`:
  - `trainingSkillFor`: suporte robusto a vocações sem arma equipada (Knight: melee, Paladin: distance, Sorcerer/Druid: magicLevel).
  - `advanceTraining`: líder treina `targetSkill`, seguidores treinam sua skill vocacional respectiva; emissão de eventos visuais com `sourceId`.
  - `calculatePartyTrainingPositions`: cálculo das vagas adjacentes ao redor do dummy com orientação visual para o boneco.
- `apps/web/components/ThaisCityArena.tsx`:
  - Lógica de alocação de tiles dos seguidores ao redor do dummy quando `curTrain` está ativo.
  - Retorno suave para a fila indiana atrás do líder ao sair do treino.
  - Animação física de ataque e disparos de projéteis com origem nos tiles reais dos seguidores.
- `apps/web/components/TrainingProgressHUD.tsx`:
  - Suporte a multi-personagem (`TrainingMemberEstimate[]`) com layout responsivo de até 4 cards.
- `apps/web/components/GamePrototype.tsx`:
  - `partyTrainingEstimates`: cálculo de tempo e progresso de cada membro da party em tempo real.
  - `tickTraining`: sincronização contínua com `savedPoolRef.current` e broadcast de ações visuais da party.
- `tests/phase172-squad-dummy-training-formation-and-multi-hud.test.ts`:
  - 4 testes unitários e de integração validando vocações, progresso em grupo, distribuição geométrica ao redor do dummy e estimativas de tempo.

---

## 3. Validação

- **Vitest:**
  - `tests/phase172-squad-dummy-training-formation-and-multi-hud.test.ts`: 4/4 aprovados.
  - Suíte completa de party e treino (5 arquivos, 30 testes): 100% aprovados.
- **Typecheck (`tsc`):**
  - Concluído com **0 erros** (Exit code 0).
