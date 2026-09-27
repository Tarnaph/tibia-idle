# Phase 253 Summary: Desobstrução de Métricas Mobile, Correção da Janela VIP e Descongelamento de Caçadas

## Contexto e Objetivos
Após os testes da Phase 252 no celular, o usuário relatou 3 problemas cruciais com capturas de tela:
1. **Colisão Visual das Métricas:** Ao minimizar o widget de métricas, o pill ficava em `top: 64px; left: 12px;`, exatamente sobreposto pela mira amarela da caçada (abaixo do avatar).
2. **Bug da Janela VIP (Amigos) no Mobile:** A janela abria minimizada no topo (também colidindo com a mira); ao tocar na seta (▲/▼) para expandir, a janela abria e fechava instantaneamente devido a double-event firing (`onTouchEnd` + `onClick`).
3. **Congelamento em Caçadas:** Ao entrar na caçada de Rat Cellars (e outras), os monstros e o personagem ficavam estáticos sem se mover nem lutar.

---

## Modificações Realizadas

### 1. Onda 1: Desobstrução de Métricas Mobile
- **Arquivo Modificado:** `apps/web/components/mobile/MobileHuntMetricsWidget.tsx`
- **Ajustes:**
  - Pill compacto reposicionado para `top: 102px; left: 12px; zIndex: 56;` (abaixo da bolinha de caçada que ocupa `top: 60px` a `96px`).
  - Card expandido reposicionado para `top: 102px; left: 12px; zIndex: 65;` com visualização nítida e foco limpo sobre o mapa de jogo.

### 2. Onda 2: Janela VIP (Amigos) Mobile
- **Arquivos Modificados:**
  - `apps/web/components/window/DraggableWindow.tsx`: Removidos listeners redundantes de `onTouchEnd` nos botões `.minimize-btn` e `.close-btn`, mantendo apenas `onClick={(e) => { e.stopPropagation(); ... }}`. Isso eliminou 100% o bug do double-event firing que fechava a janela no mesmo milissegundo do toque.
  - `apps/web/components/window/WindowManagerContext.tsx`: `openWindow` e `toggleWindow` forçam `isMinimized: false` na abertura.
  - `app/globals.css`: No `@media (max-width: 768px)`, `.draggable-window` abre centralizada em `top: 10vh; left: 2.5vw; width: 95vw; max-height: 80vh; z-index: 70 !important;` e `.draggable-window.is-minimized` fica em `top: 102px; left: 12px; z-index: 55;`.

### 3. Onda 3: Descongelamento e Resiliência do Ticker de Combate
- **Arquivos Modificados:**
  - `apps/web/lib/GameClientNetworkManager.ts`: Em `sendSetInHunt(true, huntId)`, define otimisticamente `this.isHuntContextConfirmed = true` e notifica listeners imediatamente; em `sendReturnToCity()` reseta para `false`.
  - `apps/web/components/GamePrototype.tsx`: Adicionado estado reativo `isHuntContextConfirmed` assinado via `gameNetwork.onHuntContextReady`. No `tickCombat` e `useGameTicker`, removido o travamento síncrono que bloqueava o combate caso o ack de rede estivesse pendente. Assim que a arena estiver pronta (`mode === 'hunt' && encounter.status === 'running' && isArenaReady && !initialLoadingActive && !transitionLoading?.active`), a simulação avança deterministicamente a cada 120ms sem congelamento.

---

## Verificação e Testes
- **Typecheck:** 0 erros de tipagem com TypeScript 5.9 (`tsc --noEmit`).
- **Suíte de Testes:** Criada `tests/phase253-mobile-metrics-vip-combat-fixes.test.ts` com 6 novos testes cobrindo todas as correções. Executado Vitest com 13/13 testes aprovados nas fases recentes.
