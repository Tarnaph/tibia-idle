# Phase 59: Correção de Caçada em Grupo ("Iniciar com o Time"), Congelamento na Cidade e Duplicação de Personagens (FIX.md)

## Contexto e Objetivos
Esta fase resolve os problemas reportados em `FIX.md`:
1. Quando o líder aperta "Iniciar com o time" e todos aceitam, o líder ficava travado na cidade de Thais e apenas o convidado ia para a caçada.
2. O jogador convidado ia para a caçada, mas seu personagem continuava visível e parado na cidade de Thais.
3. Duplicação de personagens: cada jogador deve ter uma única versão no jogo, impossibilitando clones ou duplicações entre cidade e caçada.

## Tarefas de Implementação

### 1. Servidor Colyseus (`packages/server`)
- [ ] `PlayerState.ts`: Adicionar `@type('boolean') inHunt: boolean = false;`.
- [ ] `ThaisCityRoom.ts`:
  - Enviar dados visuais completos em `broadcastPartySync` (`outfit`, `outfitLookType`, `outfitColors`, `mount`, `mountActive`).
  - Marcar `memberPlayer.inHunt = true` ao iniciar caçada (`party:huntStarted`).
  - Marcar `memberPlayer.inHunt = false` ao sair da caçada (`party:huntExit`).
  - Suportar handler `player:setInHunt` (`data: { inHunt: boolean }`).

### 2. Frontend Web (`apps/web`)
- [ ] `ThaisCityArena.tsx`:
  - Ocultar/ignorar qualquer jogador com `p.inHunt === true` no loop de renderização de jogadores remotos.
- [ ] `GamePrototype.tsx`:
  - `onPartyHuntStart`: remover condição de pular o líder, garantindo que líder e convidados entrem juntos na hunt.
  - `prepareHuntCharacters`:
    - Reordenar com líder no índice 0 (`characters[0]`).
    - Configurar `session.leaderId = leaderMember.characterId` e `session.selectedCharacterId = localChar.id`.
    - Deduplicação estrita de personagens por ID e Nome.
    - Sincronizar outfits e montarias reais dos membros da party.
  - `exitHunt`: garantir retorno unificado de todos ao Templo de Thais com limpeza de membros extras do squad local e notificação `inHunt = false`.

### 3. Testes
- [ ] Criar suíte `tests/phase59-group-hunt-and-character-deduplication.test.ts`.
- [ ] Validar com `npm run typecheck` e `npm test`.
