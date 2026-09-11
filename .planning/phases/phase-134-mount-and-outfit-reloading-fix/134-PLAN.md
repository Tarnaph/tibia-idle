# Phase 134: Correção Definitiva de Carregamento de Montaria, Troca de Outfit e Interatividade

## 1. Contexto e Problema
O usuário relatou: *"a montaria não está carregando, não consigo troca de outfit parece que deu problema novamente"*.

### Causas Raiz Identificadas:
1. **Deadlock do RSC Runner do Vite (`transport invoke timed out after 60000ms`):**
   - Na Phase 133, a exclusão de `'vinext'` em `optimizeDeps.exclude` em `vite.config.ts` causou um deadlock de 60 segundos entre o processo principal do Vite e o runner SSR/RSC.
   - Isso travou qualquer requisição a `/game` e ao endpoint de salvar personagem `/api/characters/[id]/save`, fazendo com que o salvamento de customizações não respondesse e o cliente ficasse congelado.
2. **Lockout Permanente de Imagens no Cache (`failedImageUrls` em `outfitRecolor.ts`):**
   - Quando requisições atrasavam devido à lentidão ou compilação, o timeout de 3500ms do `loadImage` registrava 3 falhas e inseria a URL da montaria em `failedImageUrls`.
   - Uma vez em `failedImageUrls`, a função `loadImage` rejeitava imediatamente e `getRecoloredCanvasSync` definia `mountImg = undefined`, descartando a montaria e forçando o jogador a pé pelo resto da sessão.
3. **Ausência de Botão de Outfit e Montaria na Barra Superior (`WindowDockBar.tsx`):**
   - O `GamePrototype.tsx` enviava a prop `onOpenOutfit`, mas o `WindowDockBar.tsx` simplesmente não renderizava nenhum botão correspondente, deixando os jogadores sem acesso direto à troca de visual.
4. **Ausência dos Atalhos Clássicos `U` (Outfit) e `Ctrl+R` (Montaria):**
   - Não havia atalhos rápidos para abrir a janela de outfit ou alternar entre estar montado ou a pé.
5. **Dessincronização de `selectedCharId` e `mountActive` no `OutfitModal.tsx`:**
   - Ao reabrir o modal para um personagem diferente, `selectedCharId` mantinha o valor anterior da inicialização do `useState`.
   - Ao selecionar uma montaria, o estado de `mountActive` precisa garantir ativação e pré-carregamento confiável.

---

## 2. Objetivos
1. **Restauração de Estabilidade no Vite (`vite.config.ts`):**
   - Manter `optimizeDeps.exclude: ['@prisma/client']` sem exclusão de `'vinext'`, prevenindo timeouts de 60s no runner de RSC.
2. **Resiliência no Carregador de Sprites (`outfitRecolor.ts`):**
   - Aumentar o timeout de `loadImage` de 3500ms para 10000ms.
   - Substituir o banimento permanente por expiração com cooldown (`canRetryImage`), permitindo que imagens recuperem o carregamento após atrasos transitórios.
   - Adicionar função de limpeza e expiração de falhas transitórias.
3. **Acesso Direto à Customização (`WindowDockBar.tsx` & `GamePrototype.tsx`):**
   - Adicionar botão "🥋 Outfit" e "🐎 Montaria" na barra superior `WindowDockBar`.
   - Implementar atalhos `U` para abrir customização de outfit e `Ctrl+R` para montar/desmontar.
4. **Sincronização Perfeita no Modal (`OutfitModal.tsx`):**
   - Atualizar `selectedCharId` sempre que o modal abre com `activeCharacterId`.
   - Ativar `mountActive` instantaneamente ao clicar em uma montaria e exibir o preview com ela ativa.
5. **Pré-Carregamento da Montaria Ativa (`ThaisCityArena.tsx` & `PixiArena.tsx`):**
   - Garantir que a montaria atual do personagem seja incluída nas prioridades de renderização sem depender apenas do donkey padrão.

---

## 3. Plano de Verificação
- `npm run typecheck` (0 erros).
- `npx vitest run tests/phase134-mount-and-outfit-reloading-fix.test.ts` e suítes correlatas (100% aprovadas).
- Teste e confirmação de resposta rápida nos endpoints e na interface.
