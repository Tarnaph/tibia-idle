# Phase 199 Plan: Resiliência de Salvamento pós-Deploy / Sair da Caçada e Normalização de Sprites de Cadáveres Multi-Tile (Cyclops & Criaturas Grandes)

## 📋 Context & Objectives

1. **Problema do Salvamento pós-Deploy / Sair da Caçada**:
   - Quando o jogador tenta sair da caçada após um reinício de servidor ou troca de conexão, o botão "SAIR DA CAÇADA" falha e impede o retorno a Thais com a mensagem de erro *"Falha ao salvar progresso antes de sair da caçada. Tente novamente."*.
   - A causa raiz identificada nos logs da VPS é o bloqueio por `SESSION_SUPERSEDED` (quando o WebSocket reconecta ou envia um sessionId diferente de uma sessão já encerrada) e concorrência otimista (`OCC_CONFLICT` de `saveVersion`) entre o ciclo periódico de salvamento do Colyseus e as chamadas HTTP do Next.js.
   - **Solução**:
     - No backend (`CharacterService.ts`): quando `activeSession` for nulo (sessão anterior desconectada ou pós-restart), se a requisição vier com token JWT válido pertencente ao dono da conta, adotar o novo `sessionId` sem lançar `SESSION_SUPERSEDED`.
     - No `PrismaPersistenceManager.ts`: sempre reconciliar `(player as any).saveVersion` com `existing.saveVersion` via `Math.max` antes de executar `updateMany`, evitando falhas de OCC desnecessárias entre o Colyseus e o Next.js.
     - No frontend (`GamePrototype.tsx`): na função `exitHunt`, se ocorrer conflito de `saveVersion` (409), re-sincronizar imediatamente com a versão retornada pelo servidor e re-executar o salvamento final antes de prosseguir; nunca travar indefinidamente `isSaveSuspendedRef` em conflitos recuperáveis.

2. **Problema dos Cadáveres (Corpses) Multi-Tile (Cyclops e Criaturas Grandes)**:
   - Cadáveres de criaturas grandes (como Cyclops de 64x64, 2x2 tiles) estavam sendo renderizados com `anchor.set(0.5, 1)` no centro do tile primário, resultando em corpos com partes deslocadas (como os pés destacados do corpo vistos na imagem).
   - **Solução**:
     - No `PixiArena.tsx`: substituir a ancoragem arbitrária de cadáveres por uma fórmula canônica idêntica à de itens de mapa de múltiplos tiles:
       - Calcular a quantidade de tiles de largura e altura (`widthTiles = mapping.appearance?.width ?? Math.round(width / 32)`).
       - Ancorar o sprite no canto superior esquerdo do bounding box (`anchor.set(0, 0)`) e posicionar na coordenada `(point.x - 16 - (widthTiles - 1) * 32, point.y - 16 - (heightTiles - 1) * 32)`.
       - Para 1x1 (32x32): deita perfeitamente dentro do tile `(pos.x, pos.y)`.
       - Para 2x2 (64x64): deita perfeitamente cobrindo o bloco 2x2 de forma coerente e unificada, mantendo os pés e a cabeça como uma única criatura caída.

---

## 🛠️ Execution Waves

### Wave 1: Renderização de Cadáveres Multi-Tile no PixiJS
- Ajustar `apps/web/components/PixiArena.tsx` na camada `corpses` para renderização de sprites de qualquer dimensão (1x1, 2x2, 3x3).

### Wave 2: Auto-Recuperação de Sessão e Reconciliação OCC
- Ajustar `packages/auth/src/characterService.ts` para adoção de sessão segura quando não houver sessão ativa conectada.
- Ajustar `packages/server/src/persistence/PrismaPersistenceManager.ts` para sincronização de `saveVersion` com o banco.
- Ajustar `apps/web/components/GamePrototype.tsx` no `exitHunt` e `saveProgress` para auto-recuperação resiliente.

### Wave 3: Testes, Typecheck e Deploy
- Criar suíte de testes `tests/phase199-save-resilience-and-multi-tile-corpses.test.ts`.
- Validar com `vitest` e `npm run typecheck`.
- Deploy na VPS `187.7.16.210` via script automatizado e validação HTTP 200 OK.
