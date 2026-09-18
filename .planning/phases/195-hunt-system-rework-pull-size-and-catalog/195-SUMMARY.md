# Phase 195: Hunt System Complete Rework (Two-Screen Catalog, Pull Size & Monster Variants) & PvP Arena Loading Fix

## Resumo da Fase

Nesta fase, implementamos a refatoração completa do sistema de caçadas (Hunt System), transformando o antigo carrossel em uma interface moderna de duas telas estritamente fiel às referências visuais do usuário, com mecânica de tamanho de pull (Cauteloso, Ousado e Agressivo), variantes dinâmicas de monstros por dificuldade, e eliminamos em definitivo o travamento de loading na Arena PvP.

---

## 1. Correção do Travamento na Arena PvP

### Causa Raiz Investigada
- Na transição para a Arena (`pvp-arena`), dois jogadores online ficavam presos indefinidamente na tela de carregamento (`ExuraLoadingScreen`).
- O callback `onSceneReady` do componente `PixiArena.tsx` utilizava uma flag em `useRef` (`sceneReadyNotified = true`) que **não era reiniciada** ao alternar entre cidade e hunt/arena. Como o mapa continuava o mesmo em memória ou os nós anteriores já tinham sido processados, `onSceneReady` nunca mais disparava.
- No `GamePrototype.tsx`, a condição `waitForAssets = (mode === 'hunt' && !isArenaReady)` aguardava essa prontidão, mantendo o jogador preso a 99% eternamente.
- Além disso, `getHuntWorldEntrance` retornava `(0, 0, 0)` para `pvp-arena` em falhas silenciosas, fazendo o servidor Colyseus atribuir coordenadas incorretas.

### Solução Aplicada
1. **`apps/web/components/PixiArena.tsx`**:
   - Adicionada função e ref `resetSceneReadyRef`, invocada automaticamente no hook `useEffect([active])` sempre que o componente se torna ativo em uma hunt/arena.
   - Atualizada a checagem de prontidão: `(cameraInitialized || state.encounter.partyActors.length > 0) && !sceneReadyNotified`.
2. **`apps/web/components/ExuraLoadingScreen.tsx`**:
   - Adicionado timeout de segurança garantindo que após o término da barra (`effectiveDuration + 2000ms`), o loading screen seja concluído mesmo se houver atraso na entrega de assets assíncronos.
3. **`apps/web/components/GamePrototype.tsx`**:
   - Adicionado `setTimeout(() => setIsArenaReady(true), 1200)` no manipulador `onFinish()` para garantir desmontagem limpa e início instantâneo de combate.
4. **`packages/domain/src/hunt.ts` & `packages/server/src/rooms/ThaisCityRoom.ts`**:
   - Coordenadas oficiais de entrada da `pvp-arena` fixadas em `{ x: 33136, y: 32969, z: 8 }` tanto no fallback de entrada do cliente quanto no servidor autoritativo.

---

## 2. Refatoração do Sistema de Caçadas (Hunt System Two-Screen)

### Tela 1: Catálogo (Screen 1)
- Barra de título com "Organizar caçada" e botão de fechar `[✕]`.
- 5 abas de atividades no topo: `[ CAÇADAS ]` (ativo), `[ TREINO ]`, `[ QUESTS ]`, `[ ARENA ]` e `[ BOSSES ]`.
  - Clicar em `[ ARENA ]` abre a Arena PvP diretamente.
  - Clicar em `[ TREINO ]` exibe os 6 dummies de treinamento da cidade.
- Subcabeçalho com:
  - Indicador `‹ Caçadas`
  - Filtro `★ Favoritos` (filtra apenas caçadas marcadas com estrela amarela)
  - Pill `Organizar caçada` (aba atual destacada)
  - Botão `Encontrar time` (abre modal de party/party finder)
- Campo de busca em tempo real com contador: `"{count} caçadas disponíveis"`.
- Grid de 4 colunas com cards elegantes:
  - Sprite em caixa escura da criatura com triplo fallback de erro.
  - Nome da caçada e subtítulo das criaturas.
  - Botão de estrela para favoritar com salvamento no `localStorage`.
  - Métricas de Solo XP/h e GP/h (ou `Sem recorde ainda`).
  - Clique no card abre imediatamente a Tela 2 (Setup).

### Tela 2: Setup da Caçada & Tamanho do Pull (Screen 2)
- Cabeçalho com nome da caçada, lore descritiva e caixa de histórico "Seu recorde" com stats.
- **Coluna da Esquerda: Tamanho do pull & Criaturas**:
  - 3 botões estilizados: `[ Cauteloso ]`, `[ Ousado ]`, `[ Agressivo ]`.
  - Contagem de monstros por pull:
    - **Cauteloso (Fácil)**: 2 a 3 monstros por pack.
    - **Ousado (Médio)**: 4 monstros por pack.
    - **Agressivo (Difícil)**: 5 a 6 monstros de uma vez só.
  - **Variações de Composição de Monstros**:
    - **Elf Fortress**: Cauteloso (`elf`) | Ousado (`elf`, `elf-scout`) | Agressivo (`elf`, `elf-scout`, `elf-arcanist`).
    - **Rat Cellars**: Cauteloso (`rat`) | Ousado (`rat`, `cave-rat`) | Agressivo (`rat`, `cave-rat` em densidade máxima).
    - **Cyclops Camp**: Cauteloso (`cyclops`) | Ousado (`cyclops`, `cyclops-smith`) | Agressivo (`cyclops`, `cyclops-smith` em densidade máxima).
    - **Dragon Lair**: Cauteloso (`dragon`) | Ousado (`dragon` x4) | Agressivo (`dragon`, `dragon-lord` x5-6).
    - Demais caçadas: preservam criaturas nativas alterando densidade do pack (2-3, 4, 5-6).
  - Painel "Monstros deste pull" com sprites, nomes e botão `[ DETALHES ]` que abre o Bestiário na Cyclopedia.
- **Coluna da Direita: Loot Possível**:
  - Tabela agregada de loots de todos os monstros do pull ativo.
  - Ícone do item, nome e badge de raridade (`Comum`, `Incomum`, `Raro`, `Muito raro`).
  - Coluna `PEGAR` com checkbox de auto-loot persistido. Para Gold Coin, exibe `✓` dourado obrigatório.
  - Coluna `VENDER` com checkbox de auto-venda persistido. Para Gold Coin, exibe `—`.
- **Rodapé de Navegação**:
  - `‹ Voltar ao catálogo` (retorna para Tela 1).
  - `Fechar` (fecha a modal).
  - `[ Iniciar caçada ]` (ou `[ Iniciar com time ]` se for líder de party), enviando `pullSize` para o motor de combate.

---

## 3. Verificações & Testes

- `tests/phase195-hunt-pull-size-and-catalog.test.ts`: **100% aprovado** (3/3 testes).
- `tests/phase194-live-pvp-arena.test.ts`: **100% aprovado** (13/13 testes).
- `tests/phase193-cyclops-elf-and-arena-pvp.test.ts`: **100% aprovado** (13/13 testes).
- `tests/continuous-hunt.test.ts`: **100% aprovado** (10/10 testes).
- `tsc --noEmit`: **0 erros de tipagem**.
