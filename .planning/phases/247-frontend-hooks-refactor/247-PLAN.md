# Phase 247 Plan: Onda 3 - Desacoplamento e Performance do Frontend

## Objetivo
Desacoplar subsistemas pesados do monólito frontend `GamePrototype.tsx` (5.834 linhas / 254 KB) em Custom Hooks isolados e testáveis na pasta `apps/web/hooks/`, aliviando o componente principal, otimizando o ciclo de renderização e facilitando a manutenção futura.

## Escopo Técnico
1. **Criação de `apps/web/hooks/useAutoSave.ts`:**
   - Extrair a lógica de auto-save periódico debounced.
   - Encapsular a reconciliação dinâmica de UUID de alts e verificação de integridade no banco de dados.
   - Tratar eventos de descarregamento de página (`beforeunload`, `visibilitychange`) com persistência em beacon.
2. **Criação de `apps/web/hooks/useHotbarShortcuts.ts`:**
   - Centralizar o listener de teclado para atalhos F1-F12 e teclas 1-0.
   - Acionamento das ações de hotbar com cooldowns visuais e preventDefault em teclas do sistema.
3. **Refatoração no `GamePrototype.tsx`:**
   - Importar e plugar os novos hooks no fluxo de execução do componente.
   - Reduzir linhas de código no monólito e garantir 0 regressões de interface ou de regras de negócio.
4. **Validação e Testes:**
   - `npm run typecheck` (0 erros).
   - Criação de `tests/phase247-frontend-hooks-refactor.test.ts`.
