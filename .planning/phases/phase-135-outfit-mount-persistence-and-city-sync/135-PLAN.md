# Phase 135: Correção Definitiva de Persistência de Outfit e Montaria, Sincronização do Personagem Ativo em Thais e Resolução de Estado

## Objetivo
Corrigir definitivamente os problemas em que roupas e montarias não salvavam ou revertiam após troca ou recarregamento, sincronizar o personagem ativo no ThaisCityArena através de `activeCharacterId`, padronizar os tokens de autenticação para salvamento direto no banco de dados, e assegurar que a montaria ative e persista de forma estável.

## Tarefas
1. Corrigir tokens de autenticação em `GamePrototype.tsx` (`handleSaveOutfit`, `handleToggleMount`, linha 2125).
2. Adicionar `activeCharacterId` em `ThaisCityArena.tsx` e passar `activeCharacter.id` a partir do `GamePrototype.tsx`.
3. Substituir todo hardcode de `curChars[0]` em `ThaisCityArena.tsx` pela busca dinâmica do personagem ativo.
4. Refatorar `handleToggleMount` para execução determinística com validação de montaria equipada.
5. Ajustar restauração de estado no `OutfitModal.tsx` para evitar que a montaria desative acidentalmente.
6. Criar suíte de testes Vitest `tests/phase135-outfit-mount-persistence-and-city-sync.test.ts` e validar typecheck (0 erros).
7. Documentar em `135-SUMMARY.md` e atualizar `ROADMAP.md` e `STATE.md`.
