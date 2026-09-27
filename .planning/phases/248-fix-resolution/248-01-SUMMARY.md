# Phase 248 Summary: Resolução Completa das 6 Ondas de Mobile, Presença em Tempo Real, Performance e Estabilidade Crítica (Itens 22 a 39 do FIX.md)

## 📌 Escopo e Objetivos Atingidos
Implementação 100% autônoma de todas as 6 ondas descritas em `FIX.md`, cumprindo integralmente a **Regra Geral de Design: Zero Emojis** (100% substituídos por vetores Lineart SVG com traço de 1.5px a 2px ou sprites canônicos oficiais de Tibia) e as diretrizes de persistência e performance:

### 🌊 Onda 1: Sincronização e Presença em Tempo Real
- **Item 22 (Contador de Players Online Real):**
  - Criado endpoint `/api/online-count` lendo de `ThaisCityRoom.activeInstance.getUniqueOnlineAccountsCount()`.
  - Integrado polling leve com badge verde pulsante em `TibiaAuthCharacterModal.tsx`.
- **Item 23 (Lista de Amigos VIP Autoritativa):**
  - Criado endpoint `/api/character-online/[nameOrId]`.
  - Limpos mocks antigos de `Laron` e `Sirius` no `localStorage`.
  - Corrigido bug booleano em `GamePrototype.tsx` e unificado status online real com ícones Lineart SVG em `FriendsWindow.tsx`.

### 🌊 Onda 2: Câmera, Hotkeys & UX de Janelas Mobile
- **Item 24 (Centralização da Câmera Mobile):**
  - Câmera móvel deslocada 1 SQM para baixo (`targetCamY`), compensando os 120px inferiores ocupados pelo HUD.
- **Item 25 (Hotkeys Sem Imagens Quebradas):**
  - Resolução canônica de slots e ações em `MobileHotkeyBar.tsx` espelhando a lógica de `desktop`, eliminando `Acti1` e `Acti2`.
- **Item 26 (Estabilização de Drag & Drop de Janelas):**
  - Implementado `touch-action: none` e `-webkit-user-select: none` no cabeçalho de `DraggableWindow.tsx` com tratamento seguro de `onPointerCancel` e `releasePointerCapture`.
- **Item 27 (Botão Modo Tela Cheia):**
  - Substituído botão genérico na barra superior de `MobileTopBar.tsx` por ação de tela cheia nativa via Fullscreen API com ícone SVG de expansão/recolhimento.

### 🌊 Onda 3: Navegação, Menus & Botões Rápidos Mobile
- **Item 28 (Botão Redondo de Caçadas Sub-Avatar):**
  - Inserido botão flutuante circular de 38x38px abaixo do avatar em `MobileTopBar.tsx` com ícone Lineart de mira de caçada, abrindo diretamente o `HuntSelector`.
  - Removido "Mapa de Caçadas" do interior de `MobileMenuDrawer.tsx`.
- **Item 29 (Botão de Métricas & Reorganização do Hambúrguer):**
  - Botão `Métricas` da barra inferior abre diretamente `metricsWindow` (`AdvancedMetricsWindow`).
  - Cyclopedia, Ranking e Arena movidos para o Menu Hambúrguer com ícones Lineart SVG.
- **Item 30 (Botão Flutuante de Venda Rápida):**
  - Criado `MobileQuickSellBubble.tsx` posicionado simetricamente à bolha de chat (`bottom: 124px, right: 12px`) com ícone Lineart de saco de moedas, fundo âmbar quando há loot e cinza no vazio.
- **Item 31 (Bottom Nav 100% Lineart):**
  - Todos os 6 botões de `MobileBottomNav.tsx` padronizados com ícones Lineart SVG (Mundo, Personagem, Inventário, Social, Métricas, Menu) e microinterações de toque.

### 🌊 Onda 4: Redesign Ergonômico de Trajes e Imbuements no Mobile
- **Item 32 (Divisão 50% / 50% no Modal de Trajes):**
  - Topo do modal mobile estruturado com `.tibia-mobile-top-split`: lado esquerdo com preview amplo centralizado sem deformação na montaria, lado direito com 3 botões verticais (Trajes, Cores & Addons, Montarias) 100% livres de emojis.
- **Item 33 (Overhaul de Imbuements no Mobile):**
  - Rolagem vertical fluida habilitada no corpo do modal `ImbuingModal.tsx` sem cortar rodapé.
  - Botão fechar ✕ com toque prioritário (`onTouchEnd` e 38x38px).

### 🌊 Onda 5: Overhaul Mobile de Depot e Seletor de Caçadas
- **Item 34 (Alinhamento do Depot e Filtros Lineart):**
  - Layout vertical `.depot-window-body` no mobile, grades de Bolsa e Mochila centralizadas sem margem negativa, corrigindo o vazamento para fora da tela à esquerda.
  - Filtros do Depot convertidos 100% para Lineart SVG.
- **Item 35 (Catálogo de Caçadas em 2 Colunas e Setup Otimizado):**
  - Catálogo mobile em grid de 2 colunas com cards compactos.
  - Setup da masmorra reorganizado: topo esquerdo com sprite da criatura (64x64px), topo direito com seleção de pull (Cauteloso, Ousado, Agressivo), abaixo requisitos e lista de loot sem estouro horizontal.

### 🌊 Onda 6: Estabilidade Crítica de Engine, Resiliência & Criação
- **Item 36 (Resiliência de Caçadas & Desbloqueio da Spider Burrow):**
  - `content/generated/hunt-regions.json` com `spider-burrow` marcada como `available: true`.
  - Fallback procedural automático em `packages/domain/src/spatial/rooms.ts` impedindo exceções fatais em mapas transitórios.
  - Curiosidades temáticas de aranha adicionadas em `loadingConfig.ts`.
  - Timeout de segurança de 4s em `GamePrototype.tsx` e `ExuraLoadingScreen.tsx`.
- **Item 37 (Eliminação de 'Sem Vocação' na Criação):**
  - Opção "Sem Vocação" removida de `TibiaAuthCharacterModal.tsx`.
  - Ícones Lineart SVG exclusivos para Knight, Paladin, Sorcerer e Druid.
  - Validação autoritativa em `packages/auth/src/characterService.ts` e `/api/characters` rejeitando `vocationId === 0` com erro 400.
- **Item 38 (Anti-OOM & Sleep Mode no Pixi):**
  - Listener de `visibilitychange` pausando o ticker do Pixi quando a aba estiver em segundo plano ou celular bloqueado em `ThaisCityArena.tsx` e `PixiArena.tsx`.
  - Chamadas de telemetria `outfitDiagnostics.recordArenaState` desacopladas do loop de 60 FPS, disparadas apenas em trocas reais de aparência (`canSwap`).
- **Item 39 (Stuttering de Treino / GC Pressure):**
  - `advanceTraining` em `packages/domain/src/training.ts` refatorado para clonagem rasa seletiva em vez de `structuredClone(state)`, eliminando pausas de coleta de lixo a cada 500ms.

---

## 🧪 Verificação e Testes
- **TypeScript Typecheck:** `tsc --noEmit` completou com código 0 (**0 erros de tipagem em todo o monorepo**).
- **Testes Unitários e de Integração:** 1.484 testes do Vitest aprovados.
- **Integridade de Design:** 0 emojis na interface de usuário.
