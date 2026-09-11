# Phase 133: Correção do Botão Jogar Agora e Blindagem da Navegação Client-Side

## 1. Visão Geral
- **Problema:** Ao clicar no botão "⚔ JOGAR AGORA" na Landing Page, o jogo não entra e surge um popup vermelho de erro:
  `UNHANDLED PROMISE REJECTION: Failed to fetch dynamically imported module: http://localhost:3000/node_modules/.vite/deps/navigation-zwNgyEgu.js?v=199ec087`
- **Causa Raiz Comprovada:**
  1. **Otimização Inconsistente de Dependências no Vite:** O Vite pré-empacotava os shims de navegação do Vinext em `node_modules/.vite/deps/navigation-*.js`. Quando o Vite HMR ou recompilação altera os hashes da build, a tentativa de carregar dinamicamente `navigation-zwNgyEgu.js?v=199ec087` falha com `Failed to fetch dynamically imported module`. O próprio Vite emitiu o alerta: *"client component dependency is inconsistently optimized. It's recommended to add the dependency to 'optimizeDeps.exclude'"*.
  2. **Ausência de `.catch()` em Promises de Navegação:** Tanto o `router.prefetch('/game')` (chamado no mount e em `onMouseEnter={onHoverPlay}`) quanto o `router.push('/game')` (em `play()`) retornam Promises assíncronas. Os blocos `try { router.prefetch() } catch {}` capturavam apenas exceções síncronas, permitindo que a rejeição da Promise disparasse um `UNHANDLED PROMISE REJECTION` na tela.
  3. **Ausência de Fallback para `window.location.assign`:** Quando a navegação client-side via RSC do Vinext falha ou trava, o fluxo não possuía fallback para navegação direta do navegador (`window.location.assign('/game')`), deixando o usuário preso na landing page.

---

## 2. Requisitos & Ações Técnicas

### 2.1. Otimização de Dependências no Vite (`vite.config.ts`)
- [x] Adicionar `'vinext'` em `optimizeDeps.exclude` junto com `'@prisma/client'`, garantindo que os shims do Vinext sejam servidos diretamente como ES modules nativos sem chunks temporários suscetíveis a hash mismatch em `.vite/deps`.

### 2.2. Blindagem do Botão "JOGAR AGORA" (`LandingPage.tsx`)
- [x] Tratar com segurança todas as Promises retornadas por `router.prefetch('/game')` e `router.push('/game')` com `.catch(() => {})`.
- [x] Implementar fallback imediato e safety net com `setTimeout(150ms)` para `window.location.assign('/game')` caso o roteador client-side falhe ou não mude a rota.
- [x] Adicionar listener de segurança para `unhandledrejection` específico de módulos dinâmicos do Vite, impedindo que modais de erro interrompam a navegação do jogador.

### 2.3. Não-Regressão e Compatibilidade
- [x] Manter `router.prefetch('/game')`, `onHoverPlay` e `onMouseEnter={onHoverPlay}` íntegros para satisfazer `tests/phase126-character-selection-perf-and-logout-dialog.test.ts`.
- [x] Suíte de testes dedicada em `tests/phase133-jogar-agora-navigation-fix.test.ts`.
- [x] 0 erros no TypeScript (`npm run typecheck`).
- [x] 100% dos testes Vitest passando (`npm run test`).
