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