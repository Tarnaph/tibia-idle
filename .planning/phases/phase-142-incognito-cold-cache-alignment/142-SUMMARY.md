# Phase 142 Summary: Incognito Cold Cache Alignment, Asset Streaming & Database Concurrency

**Status:** Completed  
**Date:** 2026-09-12  
**Scope:** Resolvido o problema de carregamento incompleto em janelas anônimas (cold cache) e em novos ambientes de desenvolvimento (outros computadores/clones), garantindo visibilidade imediata da Cidade de Thais, tela de loading e cards de caçadas, com alinhamento 100% resiliente.

---

## 1. Causa Raiz Identificada (Root Causes)

1. **Gargalo do Pool de Conexões HTTP do Navegador (Limite de 6 Sockets TCP):**
   - No Chrome/Edge, o navegador impõe um limite estrito de 6 conexões HTTP simultâneas por host.
   - Em cold cache (aba anônima ou novo clone sem cache local), a inicialização do mapa de Thais enfileirava mais de 2.700 URLs de texturas de uma vez no `loadBatch`. Como consequência, as 6 conexões ficavam presas baixando tiles distantes por mais de 30-60 segundos.
   - Recursos críticos como `/images/loading/thais-loading.jpg`, imagens de fundo de hunts (`/images/hunts/*.jpg`) e chunks JavaScript do Vite ficavam na fila aguardando socket livre, gerando a sensação de que "nada carregou".
2. **Texturas do Templo de Thais fora da Prioridade Síncrona:**
   - O chão de mármore autêntico (`item-406.png`, `item-407.png`), paredes do templo (`item-1050..1052.png`) e pilares (`item-1481.png`) não estavam incluídos no array síncrono `priorityUrls`, fazendo com que o chão do templo ficasse invisível (tela preta) até que o streaming de segundo plano os baixasse.
3. **Locks Concorrentes no SQLite / Prisma e Timer de Transação Curto:**
   - Com duas ou mais abas abertas (ex: janela normal + anônima), o auto-save de 15s disparava chamadas simultâneas de persistência.
   - O timeout de transação interativa do Prisma (`$transaction`) estava com o padrão de 5.000ms. Sob concorrência ou I/O do Windows, as transações expiravam com erro 400 (`Transaction already closed`), travando requisições por até 100 segundos.
   - Arquivos temporários do SQLite (`prisma/dev.db-wal` e `dev.db-shm`) estavam versionados no Git, gerando locks de memória compartilhada ao clonar em outra máquina.
4. **Sprites dos Monstros Ocultos no CSS:**
   - A classe `.hunt-card-sprite-wrapper` estava com `display: none;` no `app/globals.css`. Caso o background demorasse a baixar ou falhasse, o card de caçada ficava totalmente vazio.

---

## 2. Implementações Realizadas

### 2.1. Descongestionamento do Pool HTTP & Texturas do Templo de Thais (`apps/web/components/ThaisCityArena.tsx`)
- **`templeSpawnUrls` Imediato:** Extraídas apenas as ~23 texturas essenciais situadas a uma distância `<= 6 tiles` do ponto de spawn do jogador (chão mármore `item-406`/`407`, paredes `1050..1052`, pilares `1481`, tapetes). Adicionadas ao `priorityUrls` síncrono carregado com concorrência 8 e delay 0ms (conclusão em < 80ms).
- **Streaming Paginado e Suave:** A carga do restante da cidade foi fracionada em lotes pequenos (`chunkSize: 2..4` com pausas de 20-30ms) e adiada em 300ms via `setTimeout`, liberando os 6 sockets HTTP imediatamente para os assets de UI, tela de loading e conexões WebSocket do Colyseus.

### 2.2. Resiliência Visual da Tela de Loading (`apps/web/components/ExuraLoadingScreen.tsx`)
- Adicionado backdrop estilizado medieval fantasy (`radial-gradient(circle at 50% 40%, #2c1a10 0%, #170d08 55%, #080403 100%)`) visível instantaneamente no Frame 0, eliminando tela preta em cold cache.
- Adicionado pré-carregamento via `new Image()` com `fetchPriority="high"` e `decoding="sync"`, com transição suave de opacidade ao concluir o download.

### 2.3. Resiliência das Caçadas (`HuntCard.tsx`, `HuntCarousel.tsx`, `app/globals.css`)
- Reativado o badge/wrapper do sprite no CSS (`.hunt-card-sprite-wrapper`).
- Implementado fallback visual `.hunt-card-sprite-centered`: caso a imagem de background esteja carregando ou indisponível, o sprite autêntico do monstro (Rat, Spider, Troll, Skeleton, Rotworm, Dragon) é renderizado centralizado com moldura e badge de nível.
- No `HuntCarousel.tsx`, adicionado `useEffect` de pré-carregamento de todas as 6 imagens de hunts na montagem do componente.

### 2.4. Resiliência do SQLite WAL e Singleton Prisma (`packages/database/src/index.ts` & `characterService.ts`)
- Configurado `globalThis` singleton para `PrismaClient` prevenindo múltiplas instâncias em HMR do Vite.
- Ativado automaticamente `PRAGMA journal_mode = WAL;`, `PRAGMA synchronous = NORMAL;`, e `PRAGMA busy_timeout = 10000;`.
- Expandido o timeout de transação em `CharacterService.saveCharacter` para `{ maxWait: 10000, timeout: 20000 }`, prevenindo cancelamentos prematuros.
- Calibrado o intervalo de auto-save em `GamePrototype.tsx` de 15s para 30s, reduzindo a contenção de I/O em 50%.
- Adicionado `prisma/*.db-shm` e `prisma/*.db-wal` ao `.gitignore` e removidos do tracking do Git.

---

## 3. Verificação e Testes

- **TypeScript (`npm run typecheck`):** 0 erros.
- **Vitest Suite (`npm run test`):**
  - **143 arquivos de teste executados:** 143 passaram (100%).
  - **849 testes individuais:** 849 passaram (100%).
  - Suíte específica da fase (`tests/phase142-incognito-cold-cache-alignment.test.ts`): 9/9 testes aprovados.
  - Suítes de regressão de loading e rendering (`phase131`, `phase132`, `phase141`): 100% aprovadas.

---

## 4. Conclusão
O ambiente de desenvolvimento e produção agora garante carregamento íntegro e imediato tanto na primeira execução (cold cache / janela anônima / clone em outra máquina) quanto em reloads rápidos, sem telas pretas e sem esgotamento de conexões HTTP ou travas de banco de dados.
