# FIX.md — Plano de Resolução e Checklist Contínuo (Phase 248)

## 📌 Status Geral: TODAS AS 6 ONDAS CONCLUÍDAS COM SUCESSO (Phase 248) ✅
> **Itens de 22 a 39 implementados, validados com typecheck (0 erros) e testados.**

---

## 🎨 REGRA GERAL DE DESIGN OBRIGATÓRIA: ZERO EMOJIS (WEB & MOBILE)
> **DIRETRIZ DE DESIGN ESTREITA:**
> - É **terminantemente proibido o uso de caracteres de emoji** em qualquer parte da interface (Web Desktop e Mobile).
> - Isso se aplica a **botões, abas, cabeçalhos, títulos de modais, menus, filtros, badges, indicadores e diálogos**.
> - **Padrão Obrigatório:** Substituir 100% dos emojis por **ícones vetoriais em SVG formato Lineart** (traços finos e elegantes de 1.5px a 2px, monocromáticos ou com acento dourado/âmbar, estilo moderno e minimalista de jogos de alta fidelidade) ou **sprites canônicos oficiais** (do diretório canônico `public/assets/` ou `/spells/`, `/potions/`, `/runes/`, `/items/`).

---

## 🚀 NOVO LOTE (Mobile, Presença Real, Performance e Overhauls de Telas — Dividido em 6 Ondas Lógicas):

### 🌊 ONDA 1: Sincronização e Presença em Tempo Real (Core & Backend Sync)
- [x] **Item 22: Contador de Players em Tempo Real na Seleção de Personagens (`TibiaAuthCharacterModal.tsx`)**
  - [x] Substituir o texto estático `"10 players online"` por estado dinâmico no componente.
  - [x] Conectar ao endpoint autoritativo `/api/online-count` do servidor Colyseus (`ThaisCityRoom.activeInstance.getUniqueOnlineAccountsCount()`).
  - [x] Configurar polling leve e resiliente (a cada 5 a 10 segundos) sem travar renderização.
  - [x] Exibir `"X players online"` real com animação sutil de atualização.

- [x] **Item 23: Sincronização Autoritativa da Lista de Amigos / VIP (`GamePrototype.tsx` & `FriendsWindow.tsx`)**
  - [x] Limpar do `localStorage` os mocks iniciais estáticos (`Laron` e `Sirius` pré-marcados como `isOnline: true`).
  - [x] Corrigir o bug lógico do operador booleano na linha 644 (`|| f.isOnline === true`) que congelava o status de online indefinidamente após o amigo deslogar.
  - [x] Integrar sincronização periódica e sob demanda via rota `/api/character-online/:nameOrId` para verificar no servidor Colyseus o status real de conexão de cada amigo adicionado.

---

### 🌊 ONDA 2: Câmera, Hotkeys & UX de Janelas no Mobile
- [x] **Item 24: Centralização Visual da Câmera no Mobile Compensando as Hotkeys (`ThaisCityArena.tsx` & `PixiArena.tsx`)**
  - [x] Ajustar o cálculo do centro da câmera no mobile para compensar os ~110px-120px ocupados na parte inferior pelo HUD (D-pad, chat, hotkeys e bottom nav).
  - [x] Deslocar o centro visual da câmera 1 SQM para baixo (`targetCamY`), posicionando o personagem no ponto focal exato da área livre jogável da tela vertical.

- [x] **Item 25: Correção das Imagens Quebradas nas Hotkeys Mobile (`MobileHotkeyBar.tsx`)**
  - [x] Investigar e corrigir a resolução de ações nos slots de atalho: atualmente o componente procura por `action.type === 'spell'`, enquanto o hotbar armazena IDs/estruturas canônicas da engine.
  - [x] Utilizar a mesma resolução canônica do desktop (`findHotbarAction(slot, spells)` e mapeamento canônico de sprites de runas, poções e magias) para renderizar os sprites nítidos sem ícone quebrado (`Acti1`, `Acti2`).

- [x] **Item 26: Estabilização de Arraste (Drag & Drop) de Janelas no Mobile (`DraggableWindow.tsx` & CSS)**
  - [x] Adicionar `touch-action: none` e `-webkit-user-select: none` no cabeçalho das janelas para impedir que o navegador confunda o arraste com rolagem ou swipe.
  - [x] Tratar adequadamente `onPointerCancel` junto a `onPointerUp` com liberação segura do ponteiro (`releasePointerCapture`).
  - [x] Implementar captura global de coordenadas para que a janela nunca "solte" se o dedo deslizar rápido ou sair da barra de título.

- [x] **Item 27: Botão de Modo Tela Cheia Nativo no Topo (Ocultação de Barra do Navegador)**
  - [x] Remover o botão amarelo sem utilidade da barra superior.
  - [x] Inserir botão de ação rápida "Tela Cheia" (Fullscreen) com ícone lineart em SVG de expansão/recolhimento (sem emojis).
  - [x] Disparar a Fullscreen API nativa (`document.documentElement.requestFullscreen()` / `webkitRequestFullscreen()`) para esconder a barra de endereço e navegador no mobile.

---

### 🌊 ONDA 3: Navegação, Menus & Botões Rápidos Mobile (Padrão 100% Lineart)
- [x] **Item 28: Botão Redondo de Caçadas no Canto Superior Esquerdo (`MobileTopBar.tsx` / `GamePrototype.tsx`)**
  - [x] Adicionar botão flutuante circular logo abaixo do avatar do jogador (canto superior esquerdo) com ícone Lineart de mira/alvo de caçada em SVG.
  - [x] Ao tocar, abrir diretamente a tela de seleção de caçadas (`HuntSelector`).
  - [x] Remover a opção "Mapa de Caçadas" de dentro do menu hambúrguer, centralizando o acesso no novo botão redondo de ação direta.

- [x] **Item 29: Correção do Botão de Métricas & Reorganização do Menu Hambúrguer (`MobileBottomNav.tsx` & `MobileMenuDrawer.tsx`)**
  - [x] Corrigir o botão `Métricas` da barra inferior para abrir diretamente a janela de Métricas reais do jogador (`AdvancedMetricsWindow`).
  - [x] Mover os 3 itens que abriam indevidamente em métricas (`Bestiário & Cyclopedia`, `Ranking & Highscores`, `Arena PvP`) para dentro do Menu Hambúrguer.
  - [x] Substituir todos os emojis do Menu Hambúrguer por ícones Lineart vetorizados em SVG.

- [x] **Item 30: Botão Flutuante Redondo de Venda Rápida no Mobile (`MobileQuickSellBubble.tsx` / `GamePrototype.tsx`)**
  - [x] Criar botão flutuante circular de 46x46px no canto inferior direito (`bottom: 124px, right: 12px`), simétrico à bolha redonda de chat do lado esquerdo.
  - [x] Ícone Lineart em SVG de moeda/saco de ouro (sem emojis).
  - [x] **Estado Com Itens:** Fundo vermelho chamativo com badge numérico de itens prontos para venda.
  - [x] **Estado Vazio:** Fundo cinza fosco quando não houver itens de loot vendíveis.
  - [x] Disparar venda rápida imediata ou painel de confirmação de venda instantânea.

- [x] **Item 31: Redesign dos Ícones do Menu Inferior Mobile para Estilo Lineart (`MobileBottomNav.tsx`)**
  - [x] Eliminar 100% dos emojis (🎯, 🛡️, 🎒, 👥, 📊, ☰) da barra inferior.
  - [x] Substituir por ícones vetoriais modernos em estilo **Lineart** (SVG com traços finos de 1.5px a 2px sem preenchimento pesado):
    - `Mundo`: Bússola / mira de exploração Lineart SVG
    - `Personagem`: Escudo medieval Lineart SVG
    - `Inventário`: Mochila de aventureiro Lineart SVG
    - `Social`: Grupo de pessoas / aliança Lineart SVG
    - `Métricas`: Gráfico de barras analítico Lineart SVG
    - `Menu`: Menu hambúrguer de três linhas elegante Lineart SVG
  - [x] Manter iluminação ativa âmbar/dourada com microinterações de toque responsivas.

---

### 🌊 ONDA 4: Redesign Ergonômico de Trajes e Imbuements no Mobile (Zero Emojis)
- [x] **Item 32: Divisão 50% / 50% de Visualizador e Botões Laterais no Modal de Trajes (`OutfitModal.tsx` & CSS)**
  - [x] Reestruturar o topo do modal mobile em layout horizontal lado a lado (50% / 50%):
    - **Lado Esquerdo (50%):** Visualizador de preview amplo, centralizado, de tamanho fixo que não expande ao colocar montaria, garantindo exibição integral do corpo do personagem e da montaria com centralização perfeita.
    - **Lado Direito (50%):** 3 botões em coluna, limpos e **100% livres de emojis** (usando ícones Lineart SVG ou tipografia nobre):
      - `Trajes` (com ícone Lineart de túnica/armadura)
      - `Cores & Addons` (com ícone Lineart de paleta/pincel)
      - `Montarias` (com ícone Lineart de rédea/ferradura)
  - [x] Remover abas repetidas/redundantes abaixo do preview para liberar espaço vertical, permitindo que a lista de trajes e paletas de cores respire sem esmagar a tela.

- [x] **Item 33: Overhaul Ergonômico da Tela de Imbuir no Mobile (`ImbuingModal.tsx` & CSS)**
  - [x] Corrigir o esmagamento das informações: habilitar rolagem vertical fluida (`overflow-y: auto`) no corpo do modal mobile para que os slots e painel de imbuements não fiquem cortados no rodapé.
  - [x] Reorganizar o fluxo mobile: ao tocar no item (ex: Ratana), expandir suavemente um card moderno de aplicação com os slots `[+]`, seleção de tiers, lista de materiais e botão `IMBUIR` grande e ergonômico.
  - [x] Corrigir o botão de fechar ✕ do cabeçalho com evento de toque prioritário (`onTouchEnd` / `pointer-events: auto`), garantindo fechamento instantâneo no celular.

---

### 🌊 ONDA 5: Overhaul Mobile de Depot e Seletor de Caçadas (100% Lineart)
- [x] **Item 34: Correção de Alinhamento e Ícones Lineart no Depot (`DepotWindow.tsx` & CSS)**
  - [x] Corrigir o bug de alinhamento CSS onde as grades da **Bolsa** e da **Mochila** vazavam para fora da tela pelo lado esquerdo: centralizar os containers (`width: 100%`, `justify-content: center`) e remover margens negativas ou overflows deslocados.
  - [x] **Erradicação de Emojis nos Filtros do Depot:** Substituir todos os emojis de categoria (📿, ⚔️, 🛡️, 🪖, 🥋, 👖, 🥾, 💍, 🏹) por ícones vetoriais **Lineart SVG** minimalistas de alta precisão (amuleto, espada, escudo, elmo, armadura, calça, bota, anel, arco).

- [x] **Item 35: Catálogo de Caçadas em Grid 2 Colunas e Redesign do Setup no Mobile (`HuntSelector.tsx` & CSS)**
  - [x] **Catálogo Mobile (Lista de Caçadas):**
    - Substituir a lista longa apertada por uma grade responsiva em 2 colunas (`grid-cols-2`) de cards quadrados/compactos.
    - Exibir apenas o sprite nítido da criatura principal, título da masmorra (`Dragon Lair`) e selo de nível (`Lv. 45+`).
    - Omitir a lista de nomes de criaturas secundárias no mobile para eliminar poluição visual, mantendo espaçamento limpo e rolagem vertical suave.
  - [x] **Setup da Caçada Mobile (Menu do Bicho):**
    - Reorganizar completamente o layout:
      - **Topo Esquerdo:** Sprite da criatura em destaque.
      - **Topo Direito (ao lado do monstro):** Seleção de tamanho do pull (`Cauteloso`, `Ousado`, `Agressivo`).
      - **Abaixo do Topo:** Nome da caçada, requisitos de nível (`Mínimo: Lv. X · Recomendado: Lv. Y`) e descrição concisa.
      - **Seção de Loot:** Grid/lista compacta de drops sem transbordamento ou corte de texto das etiquetas de raridade (ex: "comum", "raro").
      - **Rodapé:** Botões ergonômicos de voltar e iniciar caçada.

---

### 🌊 ONDA 6: Estabilidade Crítica de Engine, Resiliência de Caçadas & Criação de Personagens
- [x] **Item 36: Resiliência de Caçadas & Desbloqueio da Spider Burrow (Correção do Personagem "Caos")**
  - [x] **Diagnóstico da Causa Raiz:** Em `content/generated/hunt-regions.json`, a caçada `spider-burrow` estava marcada com `"available": false` e `tiles: []`. Ao tentar entrar, `roomDefinitionAt` disparava `throw new Error(...)` dentro do setState do React (`setGame`), abortando a criação da arena e congelando a tela no loading com o background de Thais (fallback genérico).
  - [x] **Fallback Procedural Automático:** Modificar `packages/domain/src/spatial/rooms.ts` para que, caso uma região OTBM não esteja disponível ou não possua tiles suficientes, o engine acione imediatamente os templates procedurais (`layouts`) sem lançar exceção fatal, garantindo que o jogo nunca trave na tela de transição.
  - [x] **Ativação da Spider Burrow:** Atualizar a definição em `hunt-regions.json` e `importHuntRegions.ts` para `available: true`, garantindo o spawn dos monstros (Spider, Bug, Poison Spider) e a progressão contínua.
  - [x] **Artes e Lore Canônicas no Loading:** Adicionar entrada para `spider-burrow` em `apps/web/lib/loadingConfig.ts` com arte temática de caverna/aranha e curiosidades do bestiário, eliminando o background genérico de Thais.
  - [x] **Timeout de Segurança de Renderização:** Adicionar timeout de segurança (máximo 4s) em `GamePrototype.tsx` e `ExuraLoadingScreen.tsx` para forçar `isArenaReady: true` caso ocorra qualquer atraso anormal de asset, impedindo clientes travados para sempre.

- [x] **Item 37: Remoção Definitiva da Opção "Sem Vocação" na Criação de Personagens (`TibiaAuthCharacterModal.tsx` & Backend)**
  - [x] Remover o botão *"Sem Vocação (Escolher no Templo de Thais)"* do formulário de criação de novo personagem em `TibiaAuthCharacterModal.tsx`.
  - [x] Restringir a seleção estritamente às 4 vocações base canônicas: **Knight (padrão), Paladin, Sorcerer ou Druid**.
  - [x] **Regra Zero Emojis:** Substituir os emojis dos cards de seleção (⚔️, 🏹, 🔮, 🌿) por ícones vetoriais modernos em **Lineart SVG** monocromáticos/dourados de alta precisão.
  - [x] Blindagem no Backend (`packages/auth/src/characterService.ts` e `/api/characters`): rejeitar qualquer requisição com `vocationId === 0` ou valores fora do intervalo 1..4 com erro explicativo 400.

- [x] **Item 38: Prevenção Definitiva de Out of Memory (OOM) em Sessões Longas / AFK (`ThaisCityArena.tsx` & `PixiArena.tsx`)**
  - [x] **Modo Sleep de Baixo Consumo (AFK / Aba Oculta):** Implementar listener nativo de `document.addEventListener('visibilitychange')`. Quando `document.hidden === true` (aba em segundo plano ou celular bloqueado), pausar o ticker de renderização gráfica a 0 FPS, cessando o consumo de GPU/VRAM.
  - [x] **Cache Estrito de Texturas WebGL:** Desacoplar telemetria do loop de 60 FPS, chamando `recordArenaState` exclusivamente em momentos de swap efetivo de outfit (`canSwap`), eliminando o vazamento de memória.
  - [x] **Desacoplamento de Telemetria:** Removidas chamadas contínuas de telemetria a cada frame no estado idle de gameplay.

- [x] **Item 39: Eliminação de Travadinhas (Stuttering de Garbage Collection) no Mobile (`packages/domain/src/training.ts`)**
  - [x] **Diagnóstico da Causa Raiz:** O método `advanceTraining` executava `structuredClone(state)` a cada 500ms (duas vezes por segundo), alocando e destruindo megabytes da árvore completa de estado do jogo. No V8 de dispositivos móveis, isso desencadeia pausas frequentes de GC (Garbage Collection), causando travamentos rítmicos a cada 1 a 2 segundos.
  - [x] **Substituição por Shallow Clone:** Refatorar `advanceTraining` para utilizar mutações rasas apenas nos nós modificados (`character.skills`, `trainingState`, `session.characters`), zerando a pressão de GC no celular.

---

## 🏛️ HISTÓRICO DE ONDAS ANTERIORES CONCLUÍDAS (Phase 237 - 246):
- [x] **Item 1: Tela de seleção de personagens (`TibiaAuthCharacterModal.tsx`)**
- [x] **Item 2: Pop-up de promoção de vocação (`PromotionModal.tsx`)**
- [x] **Item 3: Janela Personagem sem scroll lateral (`CharacterProfileModal.tsx`)**
- [x] **Item 4: Customizar Aparência / Outfit no Mobile (`OutfitModal.tsx`)**
- [x] **Item 5: Ranking e Highscores (`HighscoresModal.tsx`)**
- [x] **Item 6: Mapa de Caçadas compacto e sem scroll horizontal (`HuntSelector.tsx` & CSS)**
- [x] **Item 7: Tela da Arena PvP (`ArenaPvPModal.tsx`)**
- [x] **Item 8: Tela de Imbuements (`ImbuingModal.tsx`)**
- [x] **Item 9: Refinamento de Loading e Bestiário no Mobile**
- [x] **Item 10: Seletor de Caçadas Web Desktop (`HuntSelector.tsx` & `globals.css`)**
- [x] **Item 11: Remoção de Informações de Solo/Party e Números/Hora dos Cards de Caçada (`HuntSelector.tsx` & `globals.css`)**
- [x] **Item 12: Redesign Minimalista do Gerenciador de Party (`UnifiedPartyModal.tsx` & `globals.css`)**
- [x] **Item 13: Retrato do Personagem Grande, Centralizado e com Réplica Exata do Outfit e Montaria (`UnifiedPartyModal.tsx`)**
- [x] **Item 14: Loading Real de Caçadas com Pré-carregamento Integral dos Monstros e Animações (`huntAssetPreloader.ts`)**
- [x] **Item 15: Correção do Botão ✕ de Remover Monstro do Rastreador de Bestiário (`BestiaryTrackerHUD.tsx`)**
- [x] **Item 16: Desfazer Grupo Durante Caçada com Abandono e Retorno Seguro ao Templo (`UnifiedPartyModal.tsx`)**
- [x] **Item 17: IA Tática de Posicionamento e Combate: Step-In para Magias de Curto Alcance & Alinhamento de Waves**
- [x] **Item 18: Blindagem Total de Persistência (UUID de Novos Alts, Graceful Shutdown no Servidor e Flush Pré-Deploy)**
- [x] **Item 19: Onda 1 - Limpeza e Unificação da Infraestrutura de Scripts (`scripts/deploy.mjs`)**
- [x] **Item 20: Onda 2 - Modularização Arquitetural do Servidor Colyseus (`ThaisCityRoom.ts` Domain Handlers)**
- [x] **Item 21: Onda 3 - Desacoplamento e Performance do Frontend (`GamePrototype.tsx`)**
