# Phase 23 Summary: Cooldowns Oficiais, Fluidez de Movimento Inicial, Seleção Inteligente de Alvo, XP 50k e Cave Rats no Respawn

## Objetivo da Fase
Atender a todas as correções e comportamentos detalhados em `FIX.md`:
1. **Auditoria e Confirmação de Cooldowns Oficiais**:
   - Confirmada integridade nos arquivos oficiais `realmap11/data/spells/spells.xml`:
     - Magias de cura (`exura`, `exura gran`, `exura sio`): `exhaustion="1000"` (1s) e `groupcooldown="1000"` (1s).
     - Magias de ataque (strikes como `exori vis`, `exori flam`, `exori con`): `exhaustion="2000"` (2s) e `groupcooldown="2000"` (2s).
     - Magias de suporte (`utani hur`, `utamo vita`): `exhaustion="2000"` (2s) e `groupcooldown="2000"` (2s).
     - Magias de área (`exori`, `exori hur`): `exhaustion="2000"`/`3000"` e `groupcooldown="2000"`.
     - Poções: `groupcooldown="1000"` (1s).
2. **Fluidez e Início Imediato da Caçada (Sem Paradas Estáticas)**:
   - Identificada a causa raiz da parada estática na entrada: o cálculo de `routeThroughMap` selecionava o tile de maior distância Manhattan sem checar conectividade, resultando em rota de comprimento 1 quando o mapa OTBM possuía setores desconectados. Corrigido com busca gulosa reversa por nós alcançáveis.
   - Em `advanceContinuousHunt`, adicionado avanço imediato para `objective.target` quando o líder não possui monstro adjacente em alcance nem caminho imediato curto para um alvo individual. A party agora marcha instantaneamente desde o tick 1.
3. **Seleção Inteligente de Alvo Frontal (`nearestEnemy`)**:
   - Eliminada a fixação cega no monstro anterior quando bloqueado.
   - Refatorada a busca de alvo para avaliar todos os inimigos válidos:
     - Prioridade 1: Inimigos já em alcance de ataque corpo a corpo/distância.
     - Prioridade 2: Menor extensão de caminho desobstruído real (`path.length`).
     - Prioridade 3: Menor distância euclidiana/direta.
     - Troca dinâmica instantânea: se o alvo anterior se mover para trás de outro monstro ou ficar bloqueado em corredor estreito, o personagem foca e ataca imediatamente o monstro da frente.
4. **Experiência do Rato para 50.000**:
   - `rat` e `cave-rat` atualizados para 50.000 XP em `packages/styller-importer/src/importMonsters.ts` e propagados via `import:content` para `content/generated/monsters.json`.
5. **Cave Rats no Respawn de Rat Cellars**:
   - Adicionado `'cave-rat'` ao pool de monstros em `rat-cellars` (`packages/domain/src/hunt.ts`).
   - Atualizado `packages/domain/src/huntRoute.ts` para compor respawns dinamicamente com base em `hunt.monsters`, gerando tanto Rats quanto Cave Rats simultaneamente.

---

## Verificação e Testes
- **Testes Automatizados (Vitest)**:
  - Criada suíte dedicada: `tests/phase23-fluid-combat.test.ts` (5/5 testes passando).
  - Execução completa: **18/18 suítes passando, 153/153 testes unitários e de integração aprovados (100%)**.
- **Typecheck**:
  - `npm run typecheck`: **0 erros de tipagem**.
