# Phase 138 Plan: Correção de Animação de Caminhada/Outfits, Abertura de Personagem no Avatar e Persistência de Bestiário

## Objetivos
1. Corrigir animação de caminhada e carregamento de trajes/montarias em Thais City Arena e motor `outfitRecolor`.
2. Redirecionar o clique no avatar superior para abrir o modal de "Personagem" (Customizar Aparência / Outfits), e não habilidades.
3. Persistir contagem de abates do bestiário permanentemente no banco de dados Prisma por personagem em abates na cidade e caçadas.

## Tarefas
- [x] Task 1: `WindowDockBar.tsx` - Atualizar clique do avatar para chamar `onOpenOutfit`.
- [x] Task 2: `outfitRecolor.ts` & `ThaisCityArena.tsx` - Corrigir capacidades de frames, fallbacks e animação de caminhada.
- [x] Task 3: `GamePrototype.tsx` - Passar `isWalking` estendido, sincronizar `bestiaryKills` e garantir persistência atômica.
- [x] Task 4: `app/api/characters/route.ts` & `[id]/route.ts` - Parsear `bestiaryKillsJson` em `bestiaryKills`.
- [x] Task 5: `ThaisCityRoom.ts` - Disparar persistência imediata no Prisma ao derrotar criaturas.
- [x] Task 6: Criar testes `tests/phase138-outfit-walking-bestiary-persistence.test.ts` e validar `typecheck` e `test`.
