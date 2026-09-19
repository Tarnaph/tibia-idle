# Phase 211 Summary: Monster Movement AI & 8-SQM Box Formation System

## Overview
A Fase 211 investigou e corrigiu integralmente a inteligência artificial de movimentação de monstros (`Item 47` de `FIX.md`), permitindo que os monstros cerquem o jogador e fechem com precisão o "Box" canônico de 8 SQM em volta do personagem (fundamental para a rotação de `Exori` / Berserk do Knight), eliminando travamentos em quinas e colisões mútuas.

---

### 1. Causas Raiz Identificadas e Corrigidas
1. **Bloqueio Diagonal por Criaturas (`packages/domain/src/spatial/pathfinding.ts`)**:
   - No A* (`findPath`), o passo diagonal checava `!canEnter(horizontal) || !canEnter(vertical)`. Como `canEnter` exigia que o tile não estivesse em `blocked`, a presença de *qualquer monstro* em um tile adjacente tornava o passo diagonal ilegal, tratando monstros como paredes sólidas e forçando rotas em L ("quinas") que causavam congestionamentos.
   - **Correção**: Atualizado para verificar `!isTileWalkable(map, horizontal) || !isTileWalkable(map, vertical)`. Criaturas agora deslizam diagonalmente entre si sem tratar monstros como obstáculos de terreno.
2. **Custo de Diagonal Artificialmente Alto (25 vs 10)**:
   - O custo diagonal de `NEIGHBORS` estava fixado em 25, o que era maior do que dar dois passos retos (10 + 10 = 20). Isso fazia o algoritmo evitar ativamente o caminho diagonal direto até o jogador, preferindo ziguezagues ortogonais que travavam nas quinas.
   - **Correção**: Ajustado para o padrão euclidiano canônico `cost: 14` ($10 \times \sqrt{2} \approx 14.14$). Um passo diagonal (14) agora tem custo inferior a dois passos retos (20), favorecendo aproximações diretas e naturais.
3. **Ordem de Processamento Alfabética Incorreta (`packages/domain/src/spatial/movement.ts`)**:
   - Monstros eram processados em ordem alfabética de ID (`sort(a, b => a.id.localeCompare(b.id))`). Um monstro distante com ID "a" reservava o slot do box mais próximo do jogador antes de um monstro que estava a 1 tile de distância, forçando o monstro próximo a desviar ou travar.
   - **Correção**: Monstros agora são ordenados por **distância até o alvo ascendente (mais próximos primeiro)**, garantindo que os monstros vizinhos preencham imediatamente os slots adjacentes do box.
4. **Priorização e Distribuição Dinâmica das 8 Vagas do Box**:
   - As metas ao redor do jogador (`surroundingPositions(target.position)`) agora são ordenadas por proximidade a cada monstro individual.
   - Se os 8 slots adjacentes estiverem cheios, o 9º monstro se posiciona no anel exterior (distância 2), pronto para preencher qualquer vaga deixada por monstros abatidos.
5. **Passo Alternativo Lateral/Diagonal Anti-Congestionamento**:
   - Caso o primeiro passo do caminho de um monstro esteja momentaneamente ocupado, o monstro avalia alternativas adjacentes que mantenham ou reduzam a distância ao alvo, avançando suavemente ao invés de congelar no lugar.

---

## Verificação & Testes
- **TypeScript**: 0 erros (`npm run typecheck` passou com código 0).
- **Testes Vitest**: 4/4 testes aprovados em `tests/phase211-monster-box-formation-and-corner-movement.test.ts`.
- **Regressão**: 32/32 testes aprovados incluindo fases 211, 210, 209, 208 e 207, além de 10/10 no `tests/spatial.test.ts`.
- **Deploy em Produção**: Deploy executado com sucesso na VPS `187.7.16.210` (Commit `18e66f62c`), com backup e integridade do banco SQLite validados e serviços PM2 (`tibia-web` e `colyseus-server`) online.
