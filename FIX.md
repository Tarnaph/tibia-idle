# PLANO DE CORREÇÕES & AJUSTES DE UI/UX (Phase 251)

## Onda 1: Navegação & Docks (Mobile / Desktop)
- [x] **1. Ocultar botões de acesso a "Arena" e "Bosses":**
  - Removido botão Arena PvP de `WindowDockBar.tsx` e `QuickActionDock.tsx`.
  - Removido botão Arena PvP de `MobileMenuDrawer.tsx`.
  - Removidas abas 'ARENA' e 'BOSSES' de `HuntSelector.tsx`.
- [x] **2. Remover aba "Mundo" do menu inferior mobile:**
  - Removida a aba 'world' (`Mundo`) de `MobileBottomNav.tsx`, conferindo mais espaçamento e foco visual às 5 abas ativas (`Herói`, `Inventário`, `Social`, `Métricas`, `Menu`).
  - Tipo `MobileTab` e estado inicial em `GamePrototype.tsx` atualizados para `'character'`.

## Onda 2: TopBar & Social Mobile
- [x] **3. Substituir configurações no topo mobile por botão de Som / Mute:**
  - Botão de configurações substituído por controle de áudio dinâmico no `MobileTopBar.tsx`.
  - Integrado com `audioManager` (`toggleAudioMuted()`, `isAudioMuted()`, `onAudioChange()`), com feedback visual em tempo real (ícone e cor verde/vermelho).
- [x] **4. Ajustar Menu Social no Mobile (Party + VIP Amigos):**
  - Em `MobileMenuDrawer.tsx`, mantido o botão de "Party / Grupo".
  - Substituído o botão "Inspecionar Herói" por "VIP (Amigos)", abrindo diretamente a janela de Amigos/VIP (`openWindow('friends')`).

## Onda 3: Caçadas & Quests Responsivo
- [x] **5. Restringir abas de Caçadas no Mobile:**
  - No mobile, o modal de caçadas exibe estritamente as abas `CAÇADAS` e `QUESTS`.
  - Treino isolado e acessível exclusivamente pelo menu inferior (Menu > Treinamento).
- [x] **6. Redesenho UI/UX da Aba Quests (Remover fictícias e Estado 'Em Breve'):**
  - Removido layout de 2 colunas fixas e quests mockadas do `HuntSelector.tsx`.
  - Implementada tela limpa, 100% responsiva em padrão Royal Dark Stone & Dourado Real, com pergaminho glowing, badge "Em Desenvolvimento · Em Breve", cards de destaques futuros e botão de retorno às caçadas.

---

# NOVO BACKLOG DE TRIAGEM & TESTES (Phase 252)

## Sessão & Segurança de Conexão
- [x] **1. Trava de Sessão Única e Conexão Concorrente (PC vs Celular / Múltiplas Abas):**
  - **Implementado:** No servidor Colyseus (`ThaisCityRoom.ts`), rastreamento de sessões ativas por `accountId` / `characterId`. Ao detectar conexão concorrente, executa save atômico (`await persistenceManager.saveCharacter`), emite evento `session:duplicate` com `code: 4001` e desliga o socket antigo (`oldClient.leave(4001)`). No frontend, exibe modal estético Royal Dark Stone com botões `[Reconectar Aqui]` e `[Voltar ao Início]`.

## Mobile UX & Telas de Entrada
- [x] **2. Redesign Completo Mobile: Seleção e Criação de Personagens (`TibiaAuthCharacterModal.tsx`):**
  - **Implementado:** Vídeo do Bardo e botão de áudio flutuante ocultados no mobile (`<= 768px`) liberando 100% da tela e poupando dados/bateria; caixa rígida de 655px substituída por container responsivo em padrão Royal Dark Stone; cards verticais de personagens com botão largo de toque **"JOGAR"** e botão "+ Novo Personagem"; criação com botões táteis largos de gênero (♂ | ♀) e vocações confortáveis para o polegar.

## Modais, Docks & Widgets no Mobile
- [x] **3. Correção Crítica da Janela VIP (Amigos) no Mobile (`FriendsWindow.tsx` & `DraggableWindow`):**
  - **Implementado:** Em `globals.css`, regras `@media (max-width: 768px)` configuram `max-width: 95vw`, `max-height: 85vh`, cabeçalho de 42px e botões de 36x36px com suporte nativo a `onTouchEnd` em `DraggableWindow.tsx`, permitindo fechamento e movimentação responsiva sem cortes de viewport.

- [x] **4. Widget Minimalista de Métricas para Mobile (`MobileHuntMetricsWidget.tsx`):**
  - **Implementado:** Criado componente flutuante minimalista de jogo para celular com taxa de XP/h, Gold/h e monstros mortos em semi-transparência Royal Dark Stone (`backdropFilter`), recolhível para um pill discreto no topo com 1 toque sem atrapalhar a caçada.

- [x] **5. Redesign Minimalista do Bestiário no Mobile (`CyclopediaModal.tsx` / `Bestiary`):**
  - **Implementado:** Banner superior com contagem de concluídos e bônus de XP de Bestiário; lista de criaturas responsiva com cards táteis, barra de progresso dourada de abates e estrelas; subview de detalhes do monstro com botão `◀ Voltar` proeminente e colunas adaptativas.

## Diretrizes de Áudio & Notificações
- [x] **6. Fixar o Banner Menor (`MobileMusicBadge`) como Padrão Oficial Único de Música no Mobile:**
  - **Implementado:** Restringido `<MusicTrackToast>` grande exclusivamente para desktop (`!responsive.isMobile`), eliminando duplicidade no celular e mantendo o `<MobileMusicBadge>` compacto como o padrão canônico definitivo do mobile.

## Caçadas & Loop de Combate Mobile
- [x] **7. Correção Definitiva da Caçada de Aranhas (`Spider Burrow`):**
  - **Implementado:** Coordenadas oficiais `[32094, 32108, 8]`, raio 25, `available: true`, `status: 'available'` integradas em `hunt.ts`, `importHuntRegions.ts` e malha navegável com 6 spawns reais e pisos do RealMap 11 gerados em `content/generated/hunt-regions.json`.

- [x] **8. Resiliência do Ticker de Combate no Mobile:**
  - **Implementado:** O encerramento limpo da sessão concorrente anterior e a persistência atômica evitam a perda de contexto ou desync de conexões que congelavam o ticker de combate no celular.

---

# NOVO BACKLOG DE CORREÇÃO MOBILE & COMBATE (Phase 253)

## 1. Posicionamento do Widget / Pill de Métricas no Mobile
- [x] **Desobstruir Widget de Métricas e Botão de Caçadas:**
  - **Implementado:** Em `MobileHuntMetricsWidget.tsx`, reposicionado o pill compacto para `top: 102px; left: 12px; z-index: 56;` e o card expandido para `top: 102px; left: 12px; z-index: 65;`. Agora o widget fica perfeitamente alinhado abaixo do botão circular de caçadas sob o avatar, com visualização 100% livre e foco tátil claro.

## 2. Janela VIP (Amigos) no Mobile: Fim de Abertura Minimizada & Double-Event Touch
- [x] **Correção do Estado Inicial e Eliminação do Double-Event no Toque:**
  - **Implementado:** 
    1. Em `DraggableWindow.tsx`, removido o evento `onTouchEnd` duplicado nos botões `minimize-btn` e `close-btn`, mantendo apenas `onClick` seguro para eliminar o disparo duplo que abria e fechava a janela no mesmo milissegundo.
    2. Em `WindowManagerContext.tsx`, `openWindow` e `toggleWindow` garantem explicitamente `isMinimized: false`.
    3. Em `app/globals.css`, ajustadas as regras `@media (max-width: 768px)` para `.draggable-window` abrir centralizada (`top: 10vh; left: 2.5vw; width: 95vw; max-height: 80vh; z-index: 70 !important;`) e se minimizada ficar em `top: 102px; left: 12px; z-index: 55;`, sem encavalar na TopBar nem na mira de caçada.

## 3. Descongelamento e Execução Contínua de Caçadas (Rat Cellars e demais)
- [x] **Investigação e Resolução de Travamento de Caçadas:**
  - **Implementado:**
    1. Em `GameClientNetworkManager.ts`, `sendSetInHunt(true, huntId)` atualiza otimisticamente `isHuntContextConfirmed = true` e notifica os listeners na hora do disparo.
    2. Em `GamePrototype.tsx`, criado estado reativo `isHuntContextConfirmed` assinado via `onHuntContextReady`.
    3. No `tickCombat` e `useGameTicker`, removido o bloqueio rígido que travava a simulação caso o ack do WebSocket demorasse alguns frames para responder. A caçada inicia e executa continuamente a 120ms assim que a arena estiver pronta (`isArenaReady && !initialLoadingActive && !transitionLoading?.active`), mantendo o avanço suave e determinístico sem congelamento de monstros ou do personagem.

---

# NOVO BACKLOG DE AJUSTES & UI (Phase 254 - Rastreador de Bestiário & Interface)

## 1. Botão e Comportamento do Rastreador de Bestiário (Desktop & Mobile)
- [x] **Controle de Abertura/Fechamento e Empty State do Bestiário:**
  - **Desktop (Web):** Adicionado botão com ícone lineart SVG de cabeça de monstro ao lado do botão de métricas no `WindowDockBar`, seguindo o estilo visual autêntico do cliente e indicando estado ativo quando aberto.
  - **Mobile:** Adicionado botão circular flutuante (36×36px, proporção igual ao botão de música/caçada) posicionado abaixo do botão de caçada sob o avatar (`top: 94px, left: 5px`). Fica cinza quando desativado e verde com feedback luminoso quando ativo.
  - **Janela & Empty State:** A janela abre normalmente mesmo sem criaturas sendo rastreadas, exibindo a mensagem *"Comece a rastrear monstros"* e um botão `+` ao lado do botão fechar que abre diretamente a Cyclopedia na seção de monstros.

## 2. Limpeza Visual do Topo & Chat: Fim dos Emojis e Adoção de Lineart
- [x] **Padronização Visual Sem Emojis (Header/Dock & Abas de Chat):**
  - **Botão LOJA (`WindowDockBar.tsx`):** Removido qualquer ícone/sacola emoji, deixando exclusivamente a escrita pura `LOJA` com tipografia limpa.
  - **Botão Ranking (`WindowDockBar.tsx`):** Substituído o emoji `🏆` por ícone SVG lineart de troféu/pódio, harmonizado com o restante da barra.
  - **Botão Cyclopedia (`WindowDockBar.tsx`):** Substituído o emoji `📖` por ícone SVG lineart de tomo/livro nos mesmos padrões e espessura de traço dos outros botões.
  - **Abas de Chat (`ChatWindow.tsx`):** Removidos completamente emojis e ícones das abas (`📍` do Local Chat, `🌐` do World Chat e `💬` dos chats privados), deixando apenas a escrita textual direta.

## 3. Sincronização Obrigatória de Presença em Thais (Anti-Ghosting com Fidelidade Total)
- [x] **Visibilidade Mútua Bidirecional & Fim do `inHunt` Fantasma:**
  - **Handshake Urbano Autoritativo (`ThaisCityRoom.ts` & `GameClientNetworkManager.ts`):** Sempre que um personagem estiver na cidade (`mode !== 'hunt'`), enviar e cravar no servidor `inHunt = false`, limpando qualquer resquício antigo do banco de dados e sincronizando a posição real em Thais.
  - **Fidelidade Visual Completa (Sem Placeholders):** O renderizador de Thais desenha o pacote completo do jogador remoto (`outfit`, cores customizadas, addons ativos, `mount` e `mountActive`), preservando a estética e personalização conquistada pelo player.
  - **Eliminação de Filtros Errôneos:** Removida qualquer trava de renderização que oculte jogadores presentes na sala da cidade, garantindo que novos e antigos jogadores se enxerguem simultaneamente nos dois sentidos.

## 4. Calibração de Avanço de Skills & Shielding do Paladino
- [x] **Diferenciação Nítida de Vocações & Treino de Shielding no Dummy:**
  - **Avanço de Distance:** Evidenciada a velocidade canônica do Paladino (base 30 tries vs base 50 melee do Knight) logo nos estágios iniciais, para que a progressão mais veloz do arco/distância seja claramente perceptível.
  - **Shielding no Treino com Arco:** Paladinos avançam `shielding` no boneco de treino mesmo empunhando arco/besta (duas mãos), assegurando paridade de treino defensivo com as demais vocações.
  - **Correção da Arma Padrão (`getDefaultTrainingSkill`):** Verifica primeiro o tipo de arma equipada (Sword, Axe, Club) antes de fallback para o skill mais alto, garantindo treino determinístico.

## 5. Habilitação Completa dos Slots de Equipamento (Ammo/Flechas, Colar/Amuleto, Anel e Mochila)
- [x] **Configuração e Suporte aos Slots Faltantes no Paperdoll:**
  - **Slot de Munição (`ammo`):** Habilitado no motor de regras (`types.ts`, `equipment.ts`, `characterHydration.ts`) o slot `ammo` para equipar flechas (`Arrow`, `Sniper Arrow`, etc.), bolts, tochas e aljavas (`quiver`).
  - **Slot de Colar / Amuleto (`neck` / `necklace`):** Habilitado o slot `neck` mapeado para itens do tipo `necklace` (Platinum Amulet, Scarf, Stone Skin Amulet, etc.), permitindo arrastar e soltar livremente.
  - **Slot de Anel (`ring`):** Suporte completo a anéis (Life Ring, Sword Ring, Stealth Ring) com atributos e efeitos devidamente ativos.
  - **Slot de Mochila (`backpack`):** Habilitado o slot do paperdoll para equipar mochilas personalizadas e exibir a capacidade correspondente.

## 6. Autodefesa no Combate Melee (Fim do Travamento de Alvo) & Linha de Visão (LOS) contra Paredes
- [x] **Desbloqueio Imediato de Melee e Checagem de Paredes (Line of Sight):**
  - **Autodefesa Melee / Retargeting Adjacente (`movement.ts` & `combat.ts`):** Quando o alvo travado estiver fora do alcance corpo a corpo (`dist > 1`) e houver qualquer monstro adjacente (`dist <= 1`) colado no personagem, o Knight prioriza e golpeia imediatamente a criatura adjacente em vez de ficar congelado tentando alcançar o alvo distante.
  - **Linha de Visão Canônica Bresenham (Line of Sight - LOS):** Implementado traçado de linha de visão canônico (`hasLineOfSight`) para ataques de distância de Paladinos e magias/runas de Magos. Nenhum projétil ou feitiço direcionado atravessa paredes sólidas ou obstáculos não-andáveis da caverna.

## 7. Redesign Autoral Exura: Direção de Arte Canônica do Tibia 11/12 & Extinção Total de Emojis
- [x] **Interface Autoral Inspirada no Cliente Oficial do Tibia (Dark Stone Theme):**
  - **Erradicação Completa de Emojis em Todo o Jogo:** Banido terminantemente qualquer emoji de sistema operacional/celular de todas as telas, botões, modais, abas de chat e popups. Toda a iconografia é composta exclusivamente por sprites reais de itens (`/assets/items/`), monstros (`/assets/monsters/`), ícones lineart SVG e tipografia pura.
  - **Novo Card de Perfil & Topbar Canônica (`WindowDockBar.tsx`):**
    - Moldura em pedra escura chanfrada 3D com barras de HP, Mana e XP no verde, azul e dourado canônicos do Tibia.
    - Atributos com sprites reais de armas e escudos do Tibia (Sword `item-2376`, Club `item-2398`, Axe `item-2387`, Bow `item-2456`, Shield `item-2516`, Wand `item-2182`) no lugar de emojis.
    - Contadores de Tibia Coin e Gold Coin em slots rebaixados com numeração dourada e branca.
  - **Rastreador de Bestiário (Bestiary Tracker HUD) Idêntico ao Tibia 11:**
    - Fiel à barra lateral das referências oficiais: cabeçalho de pedra *"Bestiary Tracker"*, linhas de monstros com sprite oficial 32×32px da criatura, nome do monstro no topo, barra de progresso horizontal em âmbar/ouro e contagem numérica de abates restantes.
  - **Abas de Chat Padronizadas:**
    - Abas retangulares clássicas de pedra ("Local Chat", "Server Log", "World Chat", "NPCs") em texto puro e limpo, sem ícones ou emojis.

## 8. Exclusividade e Validação Rígida de Slots de Equipamento (Fim do Bug de Equipar Qualquer Item)
- [x] **Trava Canônica de Compatibilidade de Slots (`equipment.ts` & `InventoryWindow.tsx`):**
  - **Correção da Fallback `preferredSlotForItem` (`equipment.ts`):** Eliminado o retorno padrão cego de `'leftHand'`. Itens que não forem equipamentos válidos (comidas, potions, runas, gold, trash, ferramentas, etc.) retornam estritamente `null`, impedindo que virem armas na mão.
  - **Validação de Destino no Drop (`InventoryWindow.tsx`):** Ao arrastar um item para um slot específico do paperdoll, validação obrigatória via `isCompatibleEquipmentSlot(itemDef, targetSlot)`. Itens incompatíveis são rejeitados e mantidos no inventário.
  - **Suporte a Armas de Duas Mãos:** Ao equipar uma arma de duas mãos (`twoHanded: true`), ela desequipa automaticamente o escudo/item da outra mão e o devolve em segurança à bolsa/loot sem perda de itens.

## 9. Loja da Cidade: Janela Flutuante Arrastável & Abas COMPRAR / VENDER (Seleção de Mochila e Bolsa)
- [x] **Desbloqueio de Janela Flutuante & Sistema de Venda Manual (`ShopWindow.tsx`):**
  - **Correção da Janela com `position: 'fixed'`:** Janela da loja estilizada com `position: 'fixed'` inline, permitindo arrasto livre e suave pela barra superior sem prender na margem esquerda.
  - **Abas Canônicas: COMPRAR e VENDER:**
    - **Aba COMPRAR:** Catálogo completo de armas, armaduras, runas, poções, utilitários e dummies de treino.
    - **Aba VENDER:** Exibe todos os itens contidos na Mochila (`backpackItems`) e na Bolsa (`bagItems`).
    - **Seleção e Venda:** Exibição de sprite, nome, valor unitário em gold, seletor de quantidade com botão "TUDO" e venda instantânea com crédito de GP.
  - **Padronização Visual sem Emojis:** Interface limpa em acabamento Dark Stone sem emojis.

## 10. Priorização de Montarias Disponíveis (Compra por 20.000 GP) & Sistema AFK com Prevenção de Out of Memory
- [x] **Menu de Montarias Ordenado & Compra Direta (`OutfitModal.tsx`):**
  - **Ordenação Canônica (Disponíveis Primeiro):** Montarias desbloqueadas e free listadas no topo.
  - **Compra Direta por 20.000 Gold:** Botão `Comprar 20k GP` integrado com verificação de saldo na party/conta.
  - **Efeito Real de Velocidade Escalonado por Tier (Free +20 / Premium +40 / Loja +60):**
    - Free: +20 Speed (Donkey, War Horse).
    - Premium: +40 Speed.
    - Loja (Store): +60 Speed.
    - Integrado na velocidade de caminhada em Thais (`THAIS_CITY_FIXED_SPEED + mountBonus`), em Caçadas e nos cards de status.
- [x] **Sistema AFK & Eliminação de Vazamento de Memória (Anti-OOM) (`ThaisCityArena.tsx` & `GamePrototype.tsx`):**
  - **Detecção de Ausência (AFK) & Indicador Visual na Cabeça:** Inatividade > 2 min ou aba oculta ativa estado AFK com etiqueta estilizada `[AFK] Zzz` acima da cabeça em Thais e banner flutuante no topo.
  - **Prevenção Radical de Out of Memory (OOM):**
    - `destroyVisualNode` destrói texturas e nós Pixi (`.destroy({ children: true, texture: true })`).
    - Throttling de renderização para 5 FPS durante AFK / aba em segundo plano.
    - Cap rígido de partículas e filas de eventos em 30 itens, eliminando vazamento de RAM.

## 11. Eliminação Definitiva de Clone/Fantasma em Thais Durante a Caçada (Anti-Exploit)
- [x] **Mútua Exclusão Absoluta entre Cidade e Caçada (`ThaisCityRoom.ts`, `CityPartyHandler.ts`, `ThaisCityArena.tsx`):**
  - **Sincronia Forçada no Servidor (`CityPartyHandler.ts` & `ThaisCityRoom.ts`):** `player:syncProgress` com `isHunting === true` crava autoritativamente `player.inHunt = true` e isola coordenadas (`posZ = 8`).
  - **Filtro Rigoroso na Arena de Thais (`ThaisCityArena.tsx`):** Filtra e descarta qualquer jogador remoto com `inHunt === true` ou `posZ > 7`, garantindo que jogadores em masmorra não manifestem clones parados no Templo de Thais.
  - **Isolamento Total:** Extinção de duplicação visual e paridade estrita de estado entre cliente e servidor Colyseus.