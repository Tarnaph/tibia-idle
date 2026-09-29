# BACKLOG DE CORREÇÃO & NOVAS FEATURES (Phase 257)

## Onda 1: Correções Visuais Imediatas (Hunt Nameplate & Rotworm Fantasma)
- [x] **1. Alinhamento Centralizado do Nameplate na Hunt (`PixiArena.tsx`):**
  - Ajustado a âncora horizontal para `anchor.set(0.5, 0.5)` e posição `position.set(0, creatureVisualLayout.nameplateY)` quando o jogador não possui skull, garantindo alinhamento horizontal perfeitamente centralizado com a barra de vida.
- [x] **2. Extinção do Rotworm Fantasma na Cidade de Thais:**
  - Removido o spawn estático de teste `rotworm-1` em `packages/server/src/rooms/ThaisCityRoom.ts`.
  - Filtrado entidades de monstros em `ThaisCityArena.tsx` e `GameClientNetworkManager.ts` para que nunca renderizem como players humanos com outfit padrão.

## Onda 2: Economia & Drop Rate (Servidor & Motor de Caçada)
- [x] **3. Elevação do Drop Rate do Servidor para 5x:**
  - Atualizado `lootRate: 5.0` em `ServerConfigManager.ts`, `content/server-config.json` e aplicado scaling proporcional de chance no motor de loot de combate (`packages/domain/src/combat.ts`).

## Onda 3: Proteção de Itens da Loot Bag (Lock / Unlock & Ícone de Cadeado)
- [x] **4. Menu de Contexto no Clique Direito de Itens na Loot Bag:**
  - Adicionada ação "Lock item" / "Unlock item" com ícone de cadeado no menu de contexto de itens (`ItemContextMenu.tsx`) em `InventoryWindow.tsx`.
- [x] **5. Indicador Visual de Cadeado Cinza:**
  - Renderizado badge `.item-lock-padlock-badge` com SVG de cadeado cinza no canto superior esquerdo do slot na Loot Bag e Bag.
- [x] **6. Blindagem Contra Venda de Itens Bloqueados:**
  - Implementado `stack.locked` em `packages/domain/src/economy.ts` (`sellAllLoot`, `sellLootStack`, `executeQuickSell`) e filtragem na lista do `QuickSellWindow.tsx`.
- [x] **7. Persistência Permanente do Estado de Lock:**
  - Persistido `attributesJson: JSON.stringify({ locked: true })` no `saveProgress` de `GamePrototype.tsx` e hidratado via `characterHydration.ts`.

## Onda 4: Ciclo de Auto-Venda nas Hunts & Cooldown do Venda Rápida
- [x] **8. Auto-Venda Periódica a Cada 10 Minutos nas Hunts:**
  - Temporizador de 600 segundos (10 minutos) ativo durante o modo caçada (`mode === 'hunt'`) que vende automaticamente itens desprotegidos da Loot Bag, creditando gold e emitindo log no chat e toast.
- [x] **9. Cooldown de 2 Minutos no Botão Venda Rápida nas Hunts:**
  - Cooldown de 120s acionado após execução de Venda Rápida em hunts, desabilitando o botão e exibindo contagem regressiva em `BottomDock`, `QuickActionDock`, `MobileQuickSellBubble`, `MobileMenuDrawer` e `QuickSellWindow`.

## Onda 5: Sincronização em Tempo Real da Direção/Orientação do Jogador em Thais
- [x] **10. Transmissão Imediata da Direção do Corpo via Colyseus:**
  - Disparo de `gameNetwork.sendTurn` no `keydown` (inclusive Ctrl+setas/WASD para virar no mesmo quadrado), em `takeCityStep` e no `tickWalking`.
- [x] **11. Sincronização e Renderização Imediata em ThaisCityArena:**
  - Atualizada a resolução de direção em `ThaisCityArena.tsx` para priorizar `p.direction` do servidor quando o player remoto estiver parado, resetando a orientação da trilha visual em tempo real.

## Onda 6: Sistema de Convites de Party Multiplayer em Thais City (Colyseus)
- [x] **12. Reativação e Resolução do Convite de Party entre Jogadores Reais:**
  - Reativar o handler `party:invite` em `packages/server/src/rooms/handlers/CityPartyHandler.ts`.
  - Localizar o jogador alvo conectado em Thais City pelo nome (`targetName`), validando se está online, se não é o próprio jogador e se o grupo não atingiu o limite de 4 membros.
  - Disparar mensagem de rede `targetClient.send('party:invitationReceived', ...)` contendo dados do líder (nome, vocação, nível).
  - Integrar com o modal de aceite existente no cliente (`PartyInvitationModal`), sincronizando a party em tempo real para ambos os jogadores (`party:sync`).

## Onda 7: Desacoplamento do Auto-Ataque de Armas (Bows/Arrows, Wands, Melee) e Magias Ofensivas
- [x] **13. Auto-Ataque Concorrente com Magias Ofensivas e Runas (Tibia Canônico):**
  - Em `packages/domain/src/combat.ts` (`castAutomaticSpells` e `triggerManualHotbarAction`), remover o travamento e adiamento de `actor.nextAttackAt` e `actor.groupCooldowns['attack']` ao disparar magias ofensivas ou usar runas.
  - Manter o relógio de auto-ataque da arma (`nextAttackAt`) rodando de forma estritamente independente a cada 2,0 segundos (cadência da arma).
  - Permitir que Paladinos atirem flechas/bolts simultaneamente com magias de ataque (*Exori Con*, *Exori San*), Mages disparem Wands/Rods junto com magias (*Exori Flam/Vis/Mort*) e Knights desferam golpes físicos em conjunto com *Exori*, disparando projéteis e danos em paralelo no mesmo turno.

## Onda 8: Transição Perfeita de Caçada em Grupo para o Seguidor e Zero Clones
- [x] **14. Transição Perfeita de Caçada em Grupo para o Seguidor e Zero Clones:**
  - Em `GamePrototype.tsx`, ao concluir o loading de transição (`onFinish`), acionar `setMode('hunt')` e `restartHunt(prepareHuntCharacters(current), pending.nextSeed, content, pending.huntId)` para o seguidor.
  - Garantir que ambos os jogadores compartilhem a mesma seed de caçada, vejam todos os membros na `PixiArena.tsx` com o Knight liderando o combate na linha de frente (1 sqm) e os atacantes à distância (3+ sqm).
  - Preservar o isolamento urbano (`posZ: 8` e `inHunt: true`) durante a caçada e restaurar ambos ao templo de Thais (`32369, 32241, 7`) no término ou saída do grupo.

## Onda 9: Grade Rolável da Loot Bag e Ajustes Finais de Party Multiplayer (HUD & Loop de Loading)
- [x] **15. Grade Rolável e Dinâmica na Loot Bag (`InventoryWindow.tsx` & `DepotWindow.tsx`):**
  - Eliminar o teto rígido de 20 slots estáticos na Loot Bag do Inventário e do Depot.
  - Tornar o container rolável com barra de rolagem estilizada (`overflow-y: auto`, altura fixa de 4 linhas) e gerar dinamicamente slots em múltiplos de 5 conforme caem itens adicionais (ex: 25, 30, 40 slots), exibindo Crown Legs, Two-Handed Sword, Wedding Ring, Potions e todos os drops sem cortes.
- [x] **16. HUD Flutuante de Party (`FloatingPartyHUD`) para Jogadores Reais em Tempo Real:**
  - Conectar o `FloatingPartyHUD` ao estado `multiplayerParty` além de `game.session.characters`, permitindo que o quadro flutuante (com avatar, nome, vocação, barras de vida, mana e nível) seja exibido na tela logo após o aceite de convite em Thais e permaneça ativo durante a caçada.
  - Sincronizar em tempo real as barras de HP e Mana dos membros remotos via dados de rede do Colyseus.
- [x] **17. Extinção do Loop Infinito de Loading ao Iniciar Caçada em Grupo:**
  - Em `GamePrototype.tsx`, remover o disparo redundante de `sendPartyHuntSync` dentro do `onFinish` do `ExuraLoadingScreen`.
  - Como o servidor já dispara `party:huntStarted` após a aprovação da proposta de caçada, o `sendPartyHuntSync` pós-loading estava reativando o evento no servidor e forçando ambos os jogadores a saírem da hunt recém-iniciada para um novo ciclo de loading infinito.

## Onda 10: Lista de Amigos com Convite, Otimização da UI da Party, Feedback de Gênero e Sincronização de Membros Remotos no Gerenciador
- [x] **18. Botão "Convidar para Party" na Lista de Amigos (`FriendsWindow.tsx`):**
  - Adicionado botão de ação "Convidar para Party" (ícone `👤+`) na barra de ações inferiores ao selecionar um amigo, ao lado de "Mandar Mensagem".
  - Incluído também a opção "Convidar para Party" no menu de contexto de clique direito no amigo.
  - Integrado com `gameNetwork.sendPartyInvite(friend.name)` com validação e feedback caso o amigo esteja offline ou o grupo cheio.
- [x] **19. Otimização do Slot de Adicionar e Lista de Amigos no Convidar Jogador (`UnifiedPartyModal.tsx` & `app/globals.css`):**
  - Removida a duplicidade eliminando o botão retangular "+ Adicionar" dos cards de vocação vazios.
  - Ampliada a bolinha circular `(+)` para 56px com ícone de 30px, borda dourada e hover destacado.
  - No submodal "Convidar Jogador", adicionada logo abaixo do input de busca uma seção dedicada "Seus Amigos" exibindo a lista de amigos da conta com status online/offline, vocação e botão de 1 clique "Convidar".
- [x] **20. Feedback Visual na Seleção de Gênero no Modal de Criar Herói (`app/globals.css`):**
  - Declaradas as classes CSS `.party-gender-toggle` e `.party-gender-toggle.active`.
  - Implementado feedback visual instantâneo e evidente ao selecionar: Masculino com borda ciano vibrante (`#38bdf8`) e fundo azul escuro, e Feminino com borda rosada vibrante (`#f472b6`) e fundo magenta escuro.
- [x] **21. Correção da Alocação e Exibição de Membros Remotos no Gerenciador de Party (`UnifiedPartyModal.tsx` & `CityPartyHandler.ts`):**
  - Corrigida a omissão de jogadores remotos (ex: Brututus na party de Caos) que sumiam do Gerenciador de Party mantendo o modal em `1/4 vagas`.
  - Em `CityPartyHandler.ts`, padronizado o envio de `vocation`, `vocationId`, `outfitLookType`, `outfitAddons` e `gender` no `party:sync`.
  - Em `GamePrototype.tsx`, mapeada `vocation` de membros remotos com fallback resiliente para evitar fallback nulo para Knight.
  - Em `UnifiedPartyModal.tsx`, membros remotos ocupam qualquer vaga vazia disponível mesmo quando duas pessoas tiverem a mesma vocação, exibindo o card completo com sprite, nome, nível, HP e atualizando corretamente a contagem de vagas (`X/4 vagas`).

## Onda 11: Liberdade de Locomoção Urbana e Sincronização Fiel da Caçada Multiplayer
- [x] **22. Liberdade de Locomoção na Cidade de Thais (Desacoplamento do Seguir Líder):**
  - Removida a condução forçada de movimento do seguidor em Thais (`unsubLeaderMoved` em `GamePrototype.tsx` e desativação de `isFollowingLeader`).
  - Membros da party em Thais ficam 100% livres para andar para onde quiserem, conversar com NPCs e treinar sem serem puxados pela caminhada do líder.
  - O agrupamento de combate tático (seguir posições e lutar em formação) é ativado exclusivamente **dentro do modo caçada (`mode === 'hunt'`)**.
- [x] **23. Sincronização Autêntica de Outfits, Gênero e Addons de Membros Remotos na Caçada:**
  - Em `CityPartyHandler.ts`, incluídos todos os metadados visuais no `party:sync` (`outfitLookType`, `outfitAddons`, `gender`, `vocationId`).
  - Em `prepareHuntCharacters` e `partyHudCharacters`, hidratados os atores remotos da `PixiArena.tsx` com o outfit exato do jogador remoto (preservando gênero feminino/masculino, addons, lookType e cores reais), eliminando o bug em que Brututus mudava de roupa ou virava outro modelo genérico.
- [x] **24. Sincronização em Tempo Real de Monstros, Alvos Focados e Nível/EXP Compartilhado na Hunt:**
  - Sincronização de nível e experiência na hidratação remota (`experienceForLevel(level)`).
  - Em `CityPartyHandler.ts`, transmissão imediata de `broadcastPartySync` quando qualquer membro sincroniza progresso (`player:syncProgress`), propagando HP, MP e Nível em tempo real para todo o grupo.
  - Foco de ataque em tempo real via `party:targetSync` e compartilhamento de combate na hunt.

## Onda 12: Ciclo de Vida da Party (Liderança, Desfazer, Sair e Limpeza Estrita de Personagens Sem Clonagem)
- [x] **25. Dois Botões para o Líder ("Desfazer Grupo" e "Sair da Party") com Passagem de Liderança (`UnifiedPartyModal.tsx` & `CityPartyHandler.ts`):**
  - No `UnifiedPartyModal.tsx`, quando o jogador for o líder da party, exibidos **ambos os botões**:
    1. **"Desfazer Grupo"**: Encerra a party para todos os membros simultaneamente (`party:disband`), limpando o estado em todos os clientes conectados.
    2. **"Sair da Party"**: O líder sai do grupo individualmente. No servidor (`CityPartyHandler.ts`), a liderança é repassada automaticamente para o próximo jogador da fila (`memberSessionIds[0]`), notificando a todos com o novo líder sem desfazer o time.
  - Para jogadores que não são líderes, exibido unicamente o botão **"Sair da Party"**.
- [x] **26. Botão Rápido de "Sair da Party" no HUD Flutuante (`FloatingPartyHUD.tsx`):**
  - Adicionado botão de atalho `🚪 Sair` no cabeçalho do `FloatingPartyHUD`, permitindo sair do grupo com agilidade direto pela tela sem necessidade de abrir o Gerenciador de Party.
- [x] **27. Limpeza Estrita de Personagens ao Sair/Desfazer Party (Extinção de Clones e Controle de Personagens de Outros Jogadores):**
  - Eliminada a causa raiz pela qual jogadores conseguiam controlar o personagem do colega:
    - Função dedicada `purgeRemoteCharactersFromSession()` acionada em `onLeaveParty`, `onDisbandParty`, `unsubPartySync` (disband) e em `exitHunt`.
    - `cur.session.characters` é estritamente filtrado para conter apenas personagens pertencentes à conta do usuário (`savedPool`), forçando `selectedCharacterId` e `leaderId` de volta ao personagem online autêntico (`onlineCharacter.id`).
    - Blindagem em `selectPartyCharacter` verificando `isOwned` para impedir qualquer seleção ou controle de personagens remotos.

## Onda 13: Desacoplamento Total Urbano, Isolamento Estrito de Contas, Sincronização Autoritativa da Hunt e Isolamento de Level-Up
- [x] **28. Isolamento Estrito de Conta e Imunização do `savedPool` (`GamePrototype.tsx`):**
  - Removida a contaminação em que `game.session.characters` na hunt injetava personagens de outros jogadores no `savedPool` da conta local.
  - `savedPool` restrito estritamente a personagens carregados de `/api/characters` ou criados localmente nesta conta.
  - Blindagem total contra seleção de personagens de terceiros em hotbars, modal host e dock.
- [x] **29. Extinção Definitiva do Snake Follow em Thais City (`ThaisCityArena.tsx` & `GamePrototype.tsx`):**
  - Desativado o squad follow em Thais City (`squadFollowEnabled = false`).
  - Passagem estrita de `characters={[activeCharacter]}` em Thais City online, garantindo que jogadores da party sejam renderizados exclusivamente via `remotePlayers` em suas posições reais.
- [x] **30. Sincronização Autoritativa de Monstros na Hunt via Líder da Party (`CityPartyHandler.ts` & `GamePrototype.tsx`):**
  - Transmissão de `party:huntEncounterSync` (5 Hz) pelo líder autoritativo com HP, IDs e posições de todos os monstros.
  - Reconciliação dos monstros nos seguidores: monstros perdem vida e morrem simultaneamente na tela de todos os membros da party.
  - Ataques de seguidores enviados via `party:followerAttack` e aplicados na vida do monstro autoritativo.
- [x] **31. Isolamento Pessoal de Notificações e Banners de Level-Up (`GamePrototype.tsx`):**
  - Filtragem estrita de `level-up` em `GamePrototype.tsx` para validar se `characterId === activeCharacter.id`.
  - Banners dourados e diagnósticos de level-up exibidos apenas para o jogador que subiu de nível.
- [x] **32. Ação Imediata e Resiliente dos Botões "Sair da Party" (HUD & Gerenciador) (`CityPartyHandler.ts` & `GamePrototype.tsx`):**
  - Limpeza síncrona e incondicional do estado da party, removendo o Floating HUD e limpando slots no ato do clique em "Sair".
  - Fallback de busca de grupo no servidor em `handlePlayerLeaveParty` garantindo disparo de `party:left` e remapeamento imediato mesmo sob falhas de índice.