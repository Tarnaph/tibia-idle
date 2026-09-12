# Phase 141 Summary: Eliminação de Tela Preta em Sessão Anônima, Otimização de I/O SQLite/WAL, Resiliência de Sockets e Correção dos Ícones de Caçadas

## 🎯 Objetivos Concluídos

1. **Investigação & Resolução da Tela Preta em Janela Anônima (Cold Cache):**
   - **Diagnóstico:** Em janela anônima (sem cache HTTP pré-existente), o `ThaisCityArena` bloqueava o carregamento síncrono com `await loadBatch(priorityUrls, 35, 0)` contendo 160+ texturas simultâneas (`spawnViewportUrls` com 138 tiles + outfits + efeitos). Isso esgotava o pool de 6 conexões concorrentes do navegador, travando o download de `thais-loading.jpg` (332 KB) e impedindo o início do ticker do Pixi e a montagem do mapa por mais de 30 segundos. Ao expirar o tempo limite do loading, o canvas permanecia vazio (`0x07090b` - tela preta).
   - **Solução:** `priorityUrls` foi reduzido estritamente à base imediata do spawn (<10 texturas, concluído em ~20ms com `chunkSize: 6`). As 138 texturas de viewport e as ruas da cidade foram migradas para streaming em background (`void loadBatch([...spawnViewportUrls], 8, 15)`), aproveitando a arquitetura existente de `registerPendingSprite` e `resolvePendingSprites`. O mapa e a câmera montam instantaneamente e os tiles aparecem em tempo real sem qualquer bloqueio de thread ou rede.

2. **Otimização de I/O de Banco de Dados (SQLite WAL Mode + Transações Atômicas):**
   - **Diagnóstico:** O banco `prisma/dev.db` localizado no diretório sincronizado do OneDrive operava no modo de journal padrão (`delete`). Durante autosaves periódicos (`/api/characters/[id]/save`), eram executadas 11 queries sequenciais desvinculadas, causando lock de disco por 34s a 48s e congelando as respostas do servidor HTTP.
   - **Solução:** Ativado permanentemente o modo `WAL` (`PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA busy_timeout = 10000;`). As operações de salvamento em `packages/auth/src/characterService.ts` foram unificadas dentro de uma transação atômica (`prisma.$transaction`), com fallback resiliente para ambientes de mock. O tempo de gravação despencou de ~48.000ms para ~6ms.

3. **Correção dos Ícones de Monstros nos Cards de Caçadas:**
   - **Diagnóstico:** `HuntCard.tsx` consultava `assets.creatures[primaryMonsterId]` utilizando strings de ID de monstro (`'rat'`, `'spider'`, `'troll'`, `'rotworm'`, `'skeleton'`, `'dragon'`), ao passo que o manifesto `tibia1098-assets.json` indexa o dicionário `creatures` exclusivamente pelo `lookType` numérico (`'15'`, `'21'`, `'26'`, `'30'`, `'33'`, `'34'`). Como resultado, `monsterSpriteUrl` ficava indefinido, exibindo apenas o emoji de fallback `🐾`.
   - **Solução:** Ajustada a resolução do sprite para consultar `primaryMonster?.lookType` (`assets.creatures[String(primaryMonster.lookType)]`), com fallbacks encadeados para `appearanceId`, `primaryMonsterId` e `assets.assets[primaryMonsterId]`. Todos os 6 cards de caçada agora renderizam seus sprites originais extraídos.

4. **Garantia de Prioridade e Pré-carregamento da Arte de Loading:**
   - Adicionado `fetchPriority="high"` e `decoding="sync"` na imagem de arte em `apps/web/components/ExuraLoadingScreen.tsx`.
   - Implementado pré-carregamento proativo de `/images/loading/thais-loading.jpg` na montagem da `LandingPage.tsx`, garantindo que sessões anônimas já tenham o asset em cache antes mesmo da escolha de personagem.

---

## 🧪 Verificação & Testes

- **Suíte de Testes da Fase 141:**
  - `tests/phase141-incognito-loading-sqlite-wal-and-hunt-icons.test.ts` (7/7 testes aprovados).
  - Validação de resolução dos 6 monstros via `lookType`.
  - Validação de atomicidade e transação no salvamento do SQLite.
  - Validação de não-bloqueio de `spawnViewportUrls` no array `priorityUrls`.
  - Validação de atributos de prioridade de rede e preload de landing page.
- **Suítes de Regressão Executadas:**
  - `tests/phase132-loading-bg-audio-and-city-tiles.test.ts` (10/10 testes aprovados).
  - `tests/phase68-full-persistence-audit.test.ts` (7/7 testes aprovados).
- **Verificação de Tipagem TypeScript:**
  - `npm run typecheck` executado com **0 erros** (`tsc --noEmit --incremental false`).

---

## 📂 Arquivos Modificados

- `packages/auth/src/characterService.ts`: Transações atômicas no `saveCharacterProgress` e tolerância a mocks.
- `apps/web/components/ThaisCityArena.tsx`: Descongestionamento de sockets HTTP e streaming assíncrono de viewport.
- `apps/web/components/hunts/HuntCard.tsx`: Resolução de sprites via `lookType` das criaturas.
- `apps/web/components/ExuraLoadingScreen.tsx`: `fetchPriority="high"` e compatibilidade de background.
- `apps/web/components/public/LandingPage.tsx`: Preload antecipado da imagem de loading.
- `prisma/dev.db`: Habilitação permanente do SQLite WAL mode.
- `tests/phase141-incognito-loading-sqlite-wal-and-hunt-icons.test.ts`: Nova suíte de testes automatizados.
