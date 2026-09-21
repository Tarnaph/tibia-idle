# Phase 222: Persistent Hotkeys & Slot Configurations for Party Alts — Summary

## O que foi Implementado e Corrigido
1. **Hidratação Canônica em `hydrateDbCharacter` (`GamePrototype.tsx`):**
   - Implementado o parsing de `c.hotbarJson` e fallback para `c.hotbar` no momento em que os personagens da conta são carregados da API `/api/characters`.
   - População rigorosa de `ch.hotbar` e `ch.hotbarConfigs` em todos os membros do `savedPool`, garantindo que alts adicionados à party ou restaurados da sessão anterior possuam suas hotkeys intactas.
2. **Inclusão de Hotbar no Autosave Periódico de Alts (`GamePrototype.tsx`):**
   - Adicionados os campos `hotbar: alt.hotbar` e `hotbarConfigs: (alt as any).hotbarConfigs` ao payload POST montado no loop de alts (`ownedAlts`).
   - Todos os membros da party agora salvam continuamente suas barras de ação e regras condicionais a cada ciclo de persistência.
3. **Resolução de Erro HTTP 400 por Falta de `saveVersion` (`GamePrototype.tsx`):**
   - As funções de alteração pontual `handleSaveHotbarSlot` e `reorderSelectedHotbar` agora incluem obrigatoriamente `saveVersion: targetVersion` extraído de `characterSaveVersionsRef`.
   - Atualização imediata de `characterSaveVersionsRef` nas respostas 200/201 e 409 (conflito de versão).
   - Sincronização em tempo real de `savedPool` e `savedPoolRef.current` para o personagem alterado em memória.
4. **Mesclagem Não-Destrutiva de `hotbarJson` (`packages/auth/src/characterService.ts`):**
   - O serviço do backend agora mescla a hotbar recebida com as configurações condicionais existentes (ou vice-versa), garantindo que atualizações parciais nunca apaguem a hotbar ou suas condições.
5. **Suíte de Testes Automatizada (`tests/phase222-party-alts-hotbar-persistence.test.ts`):**
   - 5 testes automatizados cobrindo hidratação, compatibilidade legada, isolamento entre alts e mesclagem de payload.

## Verificação
- `npm run test -- tests/phase222-party-alts-hotbar-persistence.test.ts` -> 5/5 aprovados.
- `npm run test -- tests/phase221-dead-human-xp-budget-hotbar-conditions.test.ts` -> 8/8 aprovados.
- `npm run typecheck` -> 0 erros de tipagem em todo o monorepo.
