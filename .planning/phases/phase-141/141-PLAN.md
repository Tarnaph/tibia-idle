# Phase 141 Plan: Eliminação de Tela Preta em Sessão Anônima, Otimização de I/O SQLite/WAL, Resiliência de Sockets e Correção dos Ícones de Caçadas

## Contexto & Causa Raiz
1. **I/O e Bloqueio de Conexões em Cold Cache (Janela Anônima):**
   - No carregamento inicial em uma janela anônima (sem cache prévio no navegador), o `ThaisCityArena` requisitava `spawnViewportUrls` (138 texturas) sincronicamente em `await loadBatch(priorityUrls, 35, 0)`.
   - Isso saturava as 6 conexões HTTP simultâneas do Chromium, represando o download de `thais-loading.jpg` e atrasando a inicialização do mapa de tiles e do ticker do Pixi por mais de 30 segundos.
   - Quando o timer de 10s da tela de loading acabava, o Pixi ainda não havia montado o mapa nem a câmera, resultando na tela preta.
   - Concomitantemente, o SQLite no diretório `OneDrive` operava em modo `delete`, e o endpoint `/api/characters/[id]/save` realizava 11 queries separadas fora de transação, travando o banco por 34s a 48s e congelando o dev server.
2. **Ícones de Caçadas não Carregando:**
   - Em `HuntCard.tsx`, o sprite da criatura da caçada era indexado por `primaryMonsterId` (`'rat'`, `'spider'`, `'troll'`), enquanto o mapa `assets.creatures` de `tibia1098-assets.json` é indexado pelo `lookType` numérico (`'15'`, `'21'`, `'26'`, `'30'`, etc.).
   - Isso deixava `monsterSpriteUrl` sempre nulo, caindo no placeholder `🐾`.

---

## Passos de Execução

### Passo 1: Otimização de Banco de Dados (SQLite WAL Mode & Transação Única)
- Em `packages/database/src/index.ts`:
  - Executar na inicialização do Prisma Client: `PRAGMA journal_mode = WAL;`, `PRAGMA synchronous = NORMAL;`, `PRAGMA busy_timeout = 10000;`.
- Em `packages/auth/src/characterService.ts`:
  - Envolver todas as operações de escrita de `saveCharacterProgress` (skills, inventory, character update) dentro de um único `this.prisma.$transaction(...)`.
  - Reduzir tempo de execução de ~48.000ms para ~10ms.

### Passo 2: Descongestionamento de Sockets & Renderização Sem Bloqueio na Cidade
- Em `apps/web/components/ThaisCityArena.tsx`:
  - Reduzir `priorityUrls` estritamente aos assets essenciais imediatos do spawn (<15 assets).
  - Mover `spawnViewportUrls` e texturas de mapas para streaming em segundo plano (`void loadBatch(...)`) com chunks controlados (tamanho 8-12, com pequeno delay entre chunks).
  - Como `registerPendingSprite` e `resolvePendingSprites` já gerenciam as texturas assincronamente, o mapa monta imediatamente, o ticker inicia sem atrasos e o canvas nunca fica preso em tela preta.

### Passo 3: Priorização da Imagem de Loading
- Em `apps/web/components/ExuraLoadingScreen.tsx`:
  - Adicionar atributo `fetchPriority="high"` na tag `<img>` de background.
  - Implementar verificação imediata de carregamento para garantir que a arte apareça no instante em que o loading for ativado.

### Passo 4: Correção Definitiva dos Ícones de Caçadas
- Em `apps/web/components/hunts/HuntCard.tsx`:
  - Resolver o sprite da criatura prioritariamente por `primaryMonster.lookType` em `assets.creatures` (`assets.creatures[String(primaryMonster.lookType)]`).
  - Adicionar fallbacks para `appearanceId`, `primaryMonsterId` e `assets.assets[primaryMonsterId]`.
  - Garantir que todas as caçadas (Rat Cellars, Spider Burrow, Troll Camp, Old Crypt, Rotworm Cave, Dragon Lair) exibam o sprite autêntico de 32x32 / 64x64 da criatura.

### Passo 5: Suíte de Testes & Verificação
- Criar `tests/phase141-incognito-loading-sqlite-wal-and-hunt-icons.test.ts`.
- Rodar `npm run typecheck` e `npm test`.
- Criar `141-SUMMARY.md` e atualizar `ROADMAP.md` e `STATE.md`.
