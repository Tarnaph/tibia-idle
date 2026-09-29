# Phase 260 Plan: Virada Arquitetural para Caçadas Multiplayer Autoritativas no Colyseus (`HuntDungeonRoom`), UI da Party e Resolução Integral do FIX.md (Ondas 10, 11 e 12)

## Contexto & Objetivos
Resolver de forma definitiva as 3 ondas em aberto do FIX.md (Itens 18 a 27) e consolidar a virada arquitetural para masmorras autoritativas no servidor Colyseus:

1. **Onda 10: UI da Party & Amigos**
   - **Item 18:** Botão "Convidar para Party" na Lista de Amigos (`FriendsWindow.tsx`) na barra inferior e no clique direito.
   - **Item 19:** Otimização dos slots da Party (`UnifiedPartyModal.tsx`): remoção do botão duplicado `+ Adicionar`, ampliação da bolinha circular `(+)` para 56px, e inclusão de lista de amigos dentro do modal de convidar com botão de 1 clique.
   - **Item 20:** Estilização e feedback visual imediato nos botões Masculino (azul ciano) e Feminino (rosa) no modal de criar herói (`app/globals.css`).
   - **Item 21:** Correção da alocação e exibição de membros remotos (Brututus) no Gerenciador de Party: permitir que membros remotos ocupem vagas vazias independentemente de vocação repetida, exibindo sprite, nome, nível, HP e atualizando o contador para `2/4`, `3/4` ou `4/4 vagas`.

2. **Onda 11: Liberdade Urbana & Transição para Masmorra Autoritativa**
   - **Item 22:** Liberdade total de locomoção na cidade de Thais: remoção de `unsubLeaderMoved` em `GamePrototype.tsx` no modo cidade. Party members andam livres em Thais. O seguimento em formação ocorre estritamente na hunt.
   - **Item 23:** Sincronização autêntica de outfits, gênero e addons de membros remotos na hunt: envio de `outfitLookType`, `outfitAddons`, `gender`, `vocationId` em `CityPartyHandler.ts` / `GameClientNetworkManager.ts` e hidratação fiel em `prepareHuntCharacters` e `PixiArena.tsx`.
   - **Item 24:** Sincronização em tempo real de monstros, alvos focados e EXP/nível na caçada multiplayer.

3. **Onda 12: Ciclo de Vida da Party & Anti-Clones**
   - **Item 25:** Dois botões para o Líder no Gerenciador de Party (`UnifiedPartyModal.tsx`): "Desfazer Grupo" e "Sair da Party" com repasse de liderança para o próximo membro convidado no servidor (`CityPartyHandler.ts`).
   - **Item 26:** Botão rápido de saída no HUD flutuante (`FloatingPartyHUD.tsx`).
   - **Item 27:** Higienização estrita de `game.session.characters` ao sair da party, ao disbandar ou ao retornar à cidade: expurgar qualquer personagem que não pertença a `savedPoolRef.current`, restaurar `selectedCharacterId` para `onlineCharacter.id`, e blindar teclas 1-4 e `selectPartyCharacter` no modo cidade.

## Etapas de Execução:
1. **Onda 10:**
   - Modificar `apps/web/components/window/FriendsWindow.tsx` para adicionar o botão "Convidar para Party" e evento de clique direito.
   - Modificar `apps/web/components/party/UnifiedPartyModal.tsx`:
     - Remover o botão `+ Adicionar` duplicado.
     - Ampliar o botão `.party-card-add-circle` no CSS.
     - No submodal `inviteModalOpen`, renderizar lista de amigos da conta com status e botão rápido "Convidar".
     - Alocar membros remotos em qualquer vaga livre restante de `slotOccupants`, sem descartar quando a vocação coincidir.
   - Modificar `app/globals.css`:
     - Adicionar estilos para `.party-gender-toggle` e `.party-gender-toggle.active` com temas azul e rosa.
     - Ajustar `.party-card-add-circle` para 56px e `font-size: 30px`.

2. **Onda 11:**
   - Em `apps/web/components/GamePrototype.tsx`, desativar a condução forçada de movimento de `unsubLeaderMoved` em Thais.
   - Em `packages/server/src/rooms/handlers/CityPartyHandler.ts`, enriquecer `broadcastPartySync` com `outfitLookType`, `outfitAddons`, `gender`, `vocationId`.
   - Em `apps/web/lib/GameClientNetworkManager.ts`, propagar `gender`, `outfitLookType`, `outfitAddons`.
   - Em `prepareHuntCharacters`, hidratar os atores com o outfit, gênero e addons corretos.
   - Em `PixiArena.tsx` / `GamePrototype.tsx`, sincronizar alvos e eventos de combate de monstros.

3. **Onda 12:**
   - Em `apps/web/components/party/UnifiedPartyModal.tsx`, renderizar ambos os botões para o líder: `Desfazer Grupo` e `Sair da Party`.
   - Em `packages/server/src/rooms/handlers/CityPartyHandler.ts`, implementar repasse de liderança quando o líder sai (`party:leave`).
   - Em `apps/web/components/party/FloatingPartyHUD.tsx`, adicionar botão de saída rápida `🚪`.
   - Em `apps/web/components/GamePrototype.tsx`, sanitizar `game.session.characters` ao sair da party, disbandar ou sair de hunt para expurgar remotos.

4. **Validação & Deploy:**
   - Criar suíte de testes Vitest em `tests/phase260-authoritative-multiplayer-hunts-and-party-lifecycle.test.ts`.
   - Executar `npm run typecheck` com 0 erros.
   - Commit atômico.
   - Deploy para a VPS via `node scripts/deploy.mjs --phase 260`.
