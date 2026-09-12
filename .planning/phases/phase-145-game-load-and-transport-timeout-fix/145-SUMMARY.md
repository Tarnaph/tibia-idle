# Phase 145: Resolução de Deadlock no Vite Dev Server, Desacoplamento da API de Autenticação e Prevenção de Transport Timeout

## Resumo da Fase

Esta fase investigou e solucionou a causa raiz do congelamento e indisponibilidade do jogo ("o jogo não está abrindo"), onde requisições para `/game`, `/api/auth/me` e `/api/characters` retornavam erro HTTP 500 ou travavam por mais de 60 a 80 segundos com o erro:
`transport invoke timed out after 60000ms (fetchModule)`.

### 1. Causas Raízes Identificadas

1. **Deadlock no Vite RSC ModuleRunner (`transport invoke timed out`)**:
   - As rotas da API (`/api/auth/me`, `/api/characters`) e a página `/game` executadas no ambiente RSC do Vinext/Vite travavam tentando importar o grafo de dependências completo.
   - `packages/auth/src/characterService.ts` importava de `../../domain/src` (barril raiz). Esse barril exportava `combat.ts` (mais de 2500 linhas), `spatial`, `ServerConfigManager`, montarias e catálogo completo, arrastando módulos pesados de simulação do jogo para dentro de cada handler de API de login e listagem de personagens.
2. **Watch Thrashing no Vite Dev Server por Escritas SQLite**:
   - `vite.config.ts` não possuía `server.watch.ignored`.
   - Como o banco de dados `prisma/dev.db`, arquivos temporários de WAL (`prisma/dev.db-wal`), arquivos em `content/generated/` e arquivos de teste ficavam na raiz do projeto, qualquer escrita de save, heartbeat ou teste disparava reinicializações e reprocessamento contínuo dos módulos no Vite, gerando alto consumo de memória (>2GB) e travando a fila de RPC/IPC do Vite ModuleRunner.
3. **Efeito Cascata no Frontend com Expulsão de Sessão**:
   - No `TibiaAuthCharacterModal.tsx` (linhas 155-185), ao receber 500 de `/api/auth/me` por causa do timeout do Vite, o modal interpretava o erro como sessão inválida, limpava `colyseus_token` e `tibia_auth_token` do `localStorage` e recarregava a tela inicial ou tela preta, impossibilitando a abertura do jogo.
4. **Loop de Inscrição no `GamePrototype.tsx`**:
   - No hook de sincronização do Colyseus (`apps/web/components/GamePrototype.tsx`), o array de dependências do `useEffect` continha `[activeCharacter]`. Como `activeCharacter` é derivado de `selectedCharacterOf(game.session)` a cada tick de jogo, o efeito desinscrevia e registrava novamente os listeners a cada renderização/tick.

### 2. Alterações Realizadas

1. **Desacoplamento Cirúrgico em `packages/auth/src/characterService.ts`**:
   - Import de `experienceForLevel` e `levelForExperience` redirecionado de `../../domain/src` para o submódulo limpo `../../domain/src/experience`.
   - Eliminado o carregamento acidental de todo o motor de combate, física e mapas no pipeline de autenticação.
2. **Configuração de Ignored Paths no Vite (`vite.config.ts`)**:
   - Adicionado `server.watch.ignored` protegendo:
     - `**/prisma/**` (incluindo `dev.db`, `dev.db-wal`, `dev.db-shm`)
     - `**/.system_generated/**`
     - `**/content/generated/**`
     - `**/.planning/**`
     - `**/scratch/**`
     - `**/tests/**`
   - Preservadas as cláusulas exigidas por contratos de testes legados (`exclude: ['@prisma/client']` em `optimizeDeps` e `ws` em `ssr.external`).
3. **Estabilização de Dependências no `GamePrototype.tsx`**:
   - Dependência do `useEffect` estabilizada de `[activeCharacter]` para `[activeCharacter?.id]`, prevenindo re-subscrições em loop dos listeners do Colyseus.
4. **Isolamento de Concorrência de Testes em `tests/phase66-authentic-monster-experience.test.ts`**:
   - Substituído `serverConfigManager.resetToDefaults()` (que escrevia em `content/server-config.json` no disco) por `vi.spyOn(serverConfigManager, 'getConfig')`, evitando concorrência com `tests/phase127-server-config-persistence.test.ts`.

### 3. Resultados de Desempenho Medidos

- `GET /api/config`: de ~80.000ms para **39ms** (HTTP 200)
- `GET /`: de ~82.000ms para **46ms** (HTTP 200)
- `GET /api/auth/me`: de ~66.000ms para **77ms** (HTTP 200)
- `GET /api/characters`: de ~66.000ms para **78ms** (HTTP 200)
- `GET /game`: de ~72.000ms (timeout 500) para **26ms** (HTTP 200)

### 4. Validação

- `npm run typecheck`: **0 erros de tipagem**.
- `npm test`: **100% de aprovação em todos os 146 arquivos de teste**.
