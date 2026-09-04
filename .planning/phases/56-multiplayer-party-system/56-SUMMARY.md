# Phase 56 Summary: Sistema Multiplayer de Party (Convite Amigos/ContextMenu, Seguir Líder, Caçada Cooperativa e Target Coletivo)

## Status: Complete
**Data:** 2026-09-04  
**Responsável:** Antigravity (GSD Phase)  
**Validação:** 0 erros no `npm run typecheck`, 100% de aprovação no Vitest (56 arquivos de teste, 317 testes).

---

## 🎯 Objetivos Entregues

1. **Convites de Party Multijogador em Tempo Real:**
   - **Lista de Amigos (`FriendsWindow.tsx`):** O botão `👥 Party` dispara `gameNetwork.sendPartyInvite(friend.name)` enviando o convite pelo servidor Colyseus.
   - **Menu de Contexto (Botão Direito):** Clicar com o botão direito em qualquer personagem no mapa de Thais e escolher "Convidar para Party" envia o convite diretamente via WebSocket.
   - **Modal de Convite Autêntico (`PartyInvitationModal.tsx`):**
     - O jogador convidado visualiza um modal com moldura dourada e fundo ardósia estilo Tibia 11:
       `"[Nome do Dono] convidou você para se juntar à Party!"`
     - Botões estilizados `[ ✔ Aceitar Convite ]` e `[ ✕ Recusar ]`.
     - Feedback imediato para ambos os jogadores.

2. **Formação da Party & Sincronização:**
   - No servidor Colyseus (`ThaisCityRoom.ts`), parties são gerenciadas com chaveamento de líder e lista de membros (`partyLeaderId`, `memberSessionIds`).
   - Ao aceitar, o evento `party:sync` sincroniza os dados da party para ambos os clientes.
   - A janela de Party (`PartyWindow.tsx`) exibe os membros reais online com indicadores de HP, nível, vocação e ícone de líder ⭐.
   - Botão `🚪 Sair da Party Multiplayer` permite ao jogador sair do grupo a qualquer momento, ou ao líder dissolver a party.

3. **Mecânica de Seguir o Dono da Party (Follow Leader):**
   - Na cidade de Thais: quando o líder anda, o servidor transmite `party:leaderMoved`.
   - O membro da party que está no grupo calcula a rota com `findCityPath` e caminha suavemente atrás do líder, mantendo-se a 1 SQM de distância.

4. **Caçada Cooperativa Sincronizada:**
   - Quando o dono da party puxa uma caçada (`startSelectedHunt(huntId)`), o evento `party:huntSync` é transmitido para todos os membros da party.
   - Todos os membros da party embarcam e viajam juntos, entrando simultaneamente na mesma caçada (`currentHuntId`).
   - Os membros da party são adicionados no squad/party de combate da caçada.

5. **Combate Coordenado & Target Coletivo:**
   - Quando o dono da caçada clica e foca um monstro (retângulo vermelho), o alvo é sincronizado em tempo real com os membros (`party:targetSync`).
   - Todos os membros da party focam e atacam simultaneamente o mesmo bicho alvejado pelo líder da expedição.

---

## 📂 Arquivos Modificados / Criados

- `packages/server/src/rooms/ThaisCityRoom.ts`: Manipulação das mensagens `party:invite`, `party:acceptInvite`, `party:rejectInvite`, `party:leave`, `party:huntSync`, `party:targetSync` e broadcast de `party:leaderMoved`.
- `apps/web/lib/GameClientNetworkManager.ts`: Métodos de envio de mensagens de party e ouvintes de convites, sincronização, caçadas e alvos.
- `apps/web/components/party/PartyInvitationModal.tsx`: Modal visual clássico de convite de party.
- `apps/web/components/window/PartyWindow.tsx`: Exibição de membros da party multiplayer e botão de saída.
- `apps/web/components/GamePrototype.tsx`: Integração completa de convites, follow leader, caçada compartilhada e sincronização de alvos.
- `tests/phase56-multiplayer-party.test.ts`: Suíte de testes unitários e de integração para o sistema multiplayer de party.
- `.planning/ROADMAP.md` e `.planning/STATE.md`: Atualizados para refletir a Phase 56 concluída.
