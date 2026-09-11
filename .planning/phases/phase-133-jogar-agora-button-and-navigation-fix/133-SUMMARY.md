# Phase 133: Correção do Botão Jogar Agora e Blindagem da Navegação Client-Side - Summary

## 1. Problema Relatado
Ao clicar no botão "⚔ JOGAR AGORA" na Landing Page, o usuário recebia um erro crítico do Vite em tela:
`UNHANDLED PROMISE REJECTION: Failed to fetch dynamically imported module: http://localhost:3000/node_modules/.vite/deps/navigation-zwNgyEgu.js?v=199ec087`

---

## 2. Causa Raiz
1. **Otimização Inconsistente de Dependências no Vite:** O Vite pré-empacotava os shims de navegação do Vinext em `node_modules/.vite/deps/navigation-*.js`. Quando o Vite HMR ou recompilação altera os hashes da build, a tentativa de carregar dinamicamente `navigation-zwNgyEgu.js?v=199ec087` falha com `Failed to fetch dynamically imported module`. O próprio Vite emitiu o alerta: *"client component dependency is inconsistently optimized. It's recommended to add the dependency to 'optimizeDeps.exclude'"*.
2. **Ausência de `.catch()` em Promises de Navegação:** Tanto o `router.prefetch('/game')` (chamado no mount e em `onMouseEnter={onHoverPlay}`) quanto o `router.push('/game')` (em `play()`) retornam Promises assíncronas. Os blocos `try { router.prefetch() } catch {}` capturavam apenas exceções síncronas, permitindo que a rejeição da Promise disparasse um `UNHANDLED PROMISE REJECTION` na tela.
3. **Ausência de Fallback para `window.location.assign`:** Quando a navegação client-side via RSC do Vinext falha ou trava, o fluxo não possuía fallback para navegação direta do navegador (`window.location.assign('/game')`), deixando o usuário preso na landing page.

---

## 3. Correções Executadas

### 3.1. Otimização de Dependências no Vite (`vite.config.ts`)
- Adicionado `'vinext'` na lista de `optimizeDeps.exclude` junto com `'@prisma/client'`.
- Os shims e módulos do Vinext agora são servidos diretamente como ES modules nativos sem chunks temporários suscetíveis a hash mismatch em `.vite/deps`.

### 3.2. Blindagem de Promises e Navegação Segura (`LandingPage.tsx`)
- Todas as chamadas para `router.prefetch('/game')` e `router.push('/game')` agora contam com encadeamento seguro `.catch(() => {})`.
- Implementado fallback imediato e safety net de 120ms para `window.location.assign('/game')` caso o roteador client-side do Vinext falhe ou não conclua a transição.
- Registrado listener global de `unhandledrejection` que intercepta falhas de módulos dinâmicos do Vite e redireciona de imediato para `/game`, impedindo modais de erro vermelhos na interface.

---

## 4. Verificação de Qualidade
- **TypeScript:** 0 erros com `npm run typecheck`.
- **Vitest:** 100% de aprovação na nova suíte `tests/phase133-jogar-agora-navigation-fix.test.ts` e `tests/phase126-character-selection-perf-and-logout-dialog.test.ts`.
- **Não-Regressão:** Preservadas todas as assinaturas esperadas por fases anteriores (`router.prefetch('/game')`, `onHoverPlay`, `onMouseEnter={onHoverPlay}`).
