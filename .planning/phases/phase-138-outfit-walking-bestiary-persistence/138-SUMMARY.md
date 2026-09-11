# Phase 138 Summary: Correção de Animação de Caminhada/Outfits, Abertura de Personagem no Avatar e Persistência de Bestiário

## Visão Geral
A Phase 138 entregou com sucesso as três correções solicitadas em `FIX.md`:
1. **Restauração da Animação de Caminhada e Blindagem de Outfits/Montarias:**
   - Mapeamento estrito de trajes com 3 frames (`OUTFITS_MAX_FRAMES_3 = ['noble', 'paladin', 'sire', 'sorcerer']`) versus 9 frames (todos os demais 74 trajes com 8 frames de caminhada completos).
   - Otimização do `preloadOutfitAllFrames` com pré-carregamento ordenado por direção e aumento do timeout de segurança para 12 segundos, prevenindo bloqueio do pool de conexões HTTP do navegador e falsos positivos de imagem falha.
   - Eliminação de fallbacks que desciam personagens montados para poses desmotadas ou substituíam sprites ativos por frame 0 voltado para o sul.
   - Sincronização contínua de movimento `charIsMoving = isMoving || Boolean(curWalk)` e repasse do estado de teclas direcionais/pathfinding (`walkingPath !== null || heldDirectionRef.current !== null`) pelo `GamePrototype.tsx`.
2. **Redirecionamento do Clique no Avatar Superior para "Personagem":**
   - Alteração do handler `onClick` no avatar card de `WindowDockBar.tsx` para acionar prioritariamente `onOpenOutfit()` (abrindo a janela de "Personagem" / Customização de Aparência e Outfits).
3. **Persistência Permanente de Bestiário no Banco de Dados (Diretriz MMORPG):**
   - Parseamento autoritativo de `bestiaryKillsJson` nas rotas REST `app/api/characters/route.ts` e `app/api/characters/[id]/route.ts`.
   - Hidratação e salvamento de `bestiaryKills` mesclados no `GamePrototype.tsx`.
   - Persistência imediata no Prisma via `void persistenceManager.saveCharacter(killer)` no `ThaisCityRoom.ts` assim que qualquer criatura é eliminada.

## Arquivos Modificados
- `apps/web/components/window/WindowDockBar.tsx`: Clique no avatar chama `onOpenOutfit`.
- `apps/web/lib/outfitRecolor.ts`: Capacidades de frames para trajes de 3 e 9 frames, ordenação de preload e fallbacks consistentes.
- `apps/web/components/ThaisCityArena.tsx`: Detecção de movimento contínua, limpeza de cache na troca de assinatura e remoção de fallback desmotado sul.
- `apps/web/components/GamePrototype.tsx`: Repasse de `isWalking` ativo para teclado/mouse, hidratação resiliente e persistência permanente de bestiário.
- `app/api/characters/route.ts` & `app/api/characters/[id]/route.ts`: Parse de `bestiaryKillsJson` em `bestiaryKills` no payload dos personagens.
- `packages/server/src/rooms/ThaisCityRoom.ts`: Persistência imediata de abates de bestiário no Prisma DB.
- `tests/phase138-outfit-walking-bestiary-persistence.test.ts`: Suíte de testes automatizada para a Phase 138.

## Verificação e Conformidade
- `cmd.exe /c npm run typecheck`: 0 erros de tipagem TypeScript.
- `cmd.exe /c npx vitest run tests/phase138-outfit-walking-bestiary-persistence.test.ts`: 8/8 testes aprovados.
- Testes de regressão: 5 test suites (28 testes) passaram com 100% de sucesso.
