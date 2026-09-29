# Phase 260 Summary: UI de Amigos/Party, Liberdade Urbana, Ciclo de Vida da Party e Sanitização Estrita de Sessão

## 📌 Contexto & Objetivos
Durante os testes de gameplay em grupo (ex: Caos Knight e Brututus Knight/Druid), foram identificados comportamentos que impactavam a experiência multiplayer e geravam risco de desincronização:
1. **Dificuldade na Formação de Party e Feedback de Criação:** A Janela de Amigos não possuía atalho direto para chamar amigos para o grupo. No Gerenciador de Party (`UnifiedPartyModal.tsx`), havia botões duplicados ("+ Adicionar" e "(+)"), a lista de amigos não aparecia no submodal de convite, os botões de gênero na criação de personagem ficavam cinzas sem feedback e membros remotos da mesma vocação (como Caos e Brututus) sumiam do modal por causa de restrição rígida de 1 vaga por vocação (ficando preso em "1/4 vagas").
2. **Condução Forçada do Seguidor na Cidade de Thais:** Ao criar uma party em Thais, o seguidor era involuntariamente puxado e forçado a seguir cada passo do líder através de pathfinding automático (`unsubLeaderMoved` e `isFollowingLeader`), impedindo que membros andassem livremente para comprar suprimentos, treinar nos dummies ou explorar a cidade.
3. **Descompasso Visual e de Nível na Caçada:** Ao entrar na hunt, atores remotos eram inicializados com `gender` default, perdendo o gênero autêntico (ex: feminino virando masculino), sem addons ou lookType correto. Além disso, a experiência do ator remoto era inicializada como 0 em vez de `experienceForLevel(level)`, gerando divergência na exibição do nível.
4. **Ciclo de Vida da Party e Sequestro de Controle de Personagens:** Ao sair ou desfazer a party, o jogador conseguia selecionar e controlar o personagem do outro jogador porque os atores remotos adicionados durante a caçada permaneciam no array `session.characters` do cliente local. Além disso, o líder só possuía a opção de desfazer o grupo, faltando o botão de "Sair da Party" com passagem de liderança para o próximo membro.

---

## 🛠️ Implementação Realizada

### 1. Onda 10: Amigos, Otimização de Party e Feedback Visual de Gênero
- **Botão "Convidar para Party" na Lista de Amigos (`FriendsWindow.tsx`):**
  - Adicionado botão de ação rápida `👤+ Convidar Party` na barra inferior ao selecionar um amigo.
  - Adicionada opção `👤+ Convidar para Party` no menu de contexto ao clicar com botão direito sobre o amigo.
- **Otimização do Gerenciador de Party (`UnifiedPartyModal.tsx` & `app/globals.css`):**
  - Removido o botão retangular duplicado "+ Adicionar", mantendo exclusivamente o círculo `(+)` ampliado para 56px (`font-size: 30px`) com destaque dourado e animação de escala no hover.
  - Adicionada seção dedicada "Seus Amigos" dentro do submodal de convite, listando os amigos da conta com status online/offline, vocação e botão de convite direto com 1 clique.
  - Alocação flexível de vagas: se a vocação do membro remoto já estiver ocupada no grid, ele é alocado no próximo slot livre (`vocOrder.find(v => slotOccupants[v].source === 'empty')`), exibindo corretamente todos os membros e atualizando para `2/4 vagas`.
- **Feedback Visual na Seleção de Gênero (`app/globals.css`):**
  - Estilizadas as classes `.party-gender-toggle` e `.party-gender-toggle.active`.
  - Masculino ativo: borda ciano vibrante (`#38bdf8`), fundo azul-marinho e glow correspondente.
  - Feminino ativo: borda rosa vibrante (`#f472b6`), fundo magenta escuro e glow correspondente.

### 2. Onda 11: Liberdade de Locomoção Urbana e Hidratação Visual
- **Desacoplamento de Movimento em Thais City (`GamePrototype.tsx`):**
  - Definido `isFollowingLeader = false` no modo cidade, garantindo que o seguidor nunca tenha seus comandos de teclado/mouse bloqueados.
  - Neutralizado o listener `unsubLeaderMoved`: membros da party em Thais não são mais forçados a seguir o líder.
  - Removido o teletransporte automático forçado ao aceitar o convite na cidade. Todos os membros exploram Thais livremente.
- **Hidratação Completa de Aparência e Nível (`prepareHuntCharacters` e `partyHudCharacters`):**
  - Enriquecido o snapshot de membros remotos com `gender`, `outfitAddons`, `outfitLookType`, `outfitColors`, `mount` e `mountActive`.
  - Atribuído `newChar.experience = experienceForLevel(newChar.level)` para sincronizar fielmente a barra de progresso e nível do ator remoto.
  - Em `CityPartyHandler.ts`, adicionada transmissão imediata de `broadcastPartySync(leaderId)` no handler `player:syncProgress`, propagando atualizações de HP, MP e Nível em tempo real para todos os membros do grupo.

### 3. Onda 12: Ciclo de Vida da Party e Sanitização Estrita de Sessão
- **Dois Botões para o Líder e Passagem de Liderança (`UnifiedPartyModal.tsx` & `CityPartyHandler.ts`):**
  - Quando o jogador é o líder da party, o rodapé exibe dois botões distintos:
    1. `↺ Desfazer Grupo`: Envia `party:disband`, desfazendo o grupo para todos os membros conectados.
    2. `🚪 Sair da Party`: O líder sai individualmente. No servidor (`CityPartyHandler.ts`), a liderança é transferida automaticamente para o próximo jogador da fila (`memberSessionIds[0]`), notificando a todos com o novo líder sem encerrar o time.
  - Para seguidores, é exibido unicamente o botão `🚪 Sair da Party`.
- **Botão Rápido no HUD Flutuante (`FloatingPartyHUD.tsx`):**
  - Adicionado botão compacto `🚪 Sair` no cabeçalho do `FloatingPartyHUD`, permitindo abandonar a party com 1 clique sem precisar abrir o Gerenciador de Party.
- **Sanitização Estrita de Personagens Sem Clonagem (`GamePrototype.tsx`):**
  - Criada a função `purgeRemoteCharactersFromSession()` que filtra `cur.session.characters` mantendo estritamente apenas os personagens pertencentes à conta do usuário (`savedPoolRef.current` ou `onlineCharacter`).
  - Acionada em:
    - `handleLeaveParty`
    - `handleDisbandParty`
    - `unsubPartyNotification` (ao receber notificação de disband)
    - `unsubPartySync` (quando o snapshot de party se torna nulo)
    - `exitHunt` (ao retornar da caçada para Thais)
  - `selectedCharacterId` e `leaderId` são redefinidos de volta ao personagem online autêntico.
  - `selectPartyCharacter` e a seleção de atalhos agora validam `isOwned`, tornando impossível qualquer tentativa de selecionar ou controlar o personagem de outro jogador.

---

## 🧪 Validação & Testes
1. **Suíte Dedicada Vitest:** Criado `tests/phase260-authoritative-multiplayer-hunts-and-party-lifecycle.test.ts` com 5 testes cobrindo alocação flexível de slots no modal de party, hidratação autêntica de gênero/outfit/addons/experiência, garantia de liberdade urbana no modo cidade, purga estrita de personagens remotos da sessão e blindagem contra seleção de personagens alheios. Aprovado 100% (5/5).
2. **Suíte da Phase 259:** `tests/phase259-lootbag-scroll-party-hud-hunt-loop.test.ts` executado e aprovado com 6/6 testes.
3. **Suíte da Phase 258:** `tests/phase258-party-invites-hunt-sync-weapon-attack.test.ts` executado e aprovado com 5/5 testes.
4. **Verificação de Tipos TypeScript (`npm run typecheck`):** Executado com 0 erros (Exit code 0).
