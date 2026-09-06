# Phase 80 Plan: Modo Caçada Auto-Idle Autônoma (Full Auto-Idle Hunt & Training Loop)

## Objetivo
Implementar o sistema de **Modo Caçada Auto-Idle Autônoma**, que gerencia de forma 100% automatizada e contínua a rotação do jogador entre a caçada no mapa, a gestão econômica (auto-venda de loot e auto-compra de poções) e o treinamento em Dummies na cidade quando a estamina zerar, retornando automaticamente à caçada quando a estamina for totalmente restaurada.

## Contexto & Regras de Negócio
1. **Persistência Permanente no Banco Prisma**:
   - `isAutoIdle` (Boolean, default `false`): estado permanente do modo auto-idle ativado/desativado.
   - `lastHuntId` (String, opcional): armazena o ID da última região de caçada selecionada pelo jogador (ex: `'rat-cellars'`, `'rotworm-caves'`).
   - Persistência em `Character` no `schema.prisma`, `PrismaPersistenceManager.ts` e sincronização no Colyseus `PlayerState`.

2. **Ciclo Autônomo da Caçada (`isAutoIdle === true`)**:
   - **Caçada & Loot:** Ao ativar o Modo Auto-Idle, o jogador ingressa/permanece na caçada ativa (`lastHuntId`).
   - **Auto-Gestão de Poções & Consumíveis:**
     - Consome poções de HP/MP conforme regras da hotbar.
     - Se o estoque de poções zerar durante a caçada e o jogador tiver Gold Coins no inventário/banco, o bot realiza o auto-abastecimento no NPC/Shop.
   - **Auto-Venda de Loot:** Periodicamente ou quando a mochila/pouch estiver cheia, executa a venda automática dos drops liberados no NPC Shop.
   - **Rotação ao Zerar Estamina (`staminaMinutes <= 0`)**:
     - Ao esgotar a estamina em caçada, o bot executa a ejeção segura para a cidade e inicia **imediatamente o treino em Dummies** (acelerando a recuperação de estamina em 3x).
   - **Retorno Automático à Caçada (`staminaMinutes >= maxStaminaMinutes`)**:
     - Ao atingir estamina cheia (100%) na Zona de Treinamento, se a flag `isAutoIdle` continuar ativa, o bot **inicia automaticamente a caçada na última região (`lastHuntId`)** sem necessitar de clique ou intervenção do usuário!

3. **Interface de Usuário (HUD)**:
   - Botão de alternância proeminente `"🤖 MODO AUTO-IDLE"` no HUD.
   - Status visual com indicação clara do estado atual:
     - `🤖 Auto-Idle: Caçando em [Nome da Área]`
     - `🤖 Auto-Idle: Reabastecendo Poções na Loja`
     - `🤖 Auto-Idle: Treinando em Dummies (Estamina 45%)`
   - O jogador pode pausar/desativar o Modo Auto-Idle a qualquer momento pelo botão no HUD.

## Tarefas de Implementação

### 1. Banco de Dados Prisma & Persistência (`prisma/schema.prisma` & `PrismaPersistenceManager.ts`)
- Adicionar os campos `isAutoIdle Boolean @default(false)` e `lastHuntId String?` no model `Character`.
- Executar `npx prisma db push` e `npx prisma generate`.
- Atualizar `saveCharacter` e `loadCharacter` em `PrismaPersistenceManager.ts`.

### 2. Motor de Simulação Server-Side (`packages/server/src/schemas/PlayerState.ts` & `ThaisCityRoom.ts`)
- Adicionar `@type('boolean') isAutoIdle: boolean = false;` e `@type('string') lastHuntId: string = '';` em `PlayerState.ts`.
- No `ThaisCityRoom.ts`:
  - Adicionar mensagem WebSocket `player:toggleAutoIdle` para alternar o modo e persistir no banco.
  - No `gameTick`: se `player.isAutoIdle === true`:
    - Se estiver zerado de estamina em caçada -> ejetar para a cidade e iniciar treino em Dummies (`player.isTraining = true`).
    - Se estiver em treino e atingir `staminaMinutes >= maxStaminaMinutes` -> acionar a volta automática para `lastHuntId` (`player.inHunt = true`).
    - Se poções acabarem durante caçada -> executar verificação e compra automática no NPC shop se tiver Gold Coins.

### 3. Componente de UI no Cliente (`apps/web/components/BottomConsoleHUD.tsx` ou TopNavigation)
- Adicionar o botão proeminente `"🤖 MODO AUTO-IDLE"` com badge de estado ativo/inativo.
- Exibir toast/notificação informando as transições de estado do bot (ex.: "Estamina zerada: Modo Auto-Idle levou o personagem para o Treino em Dummies").

### 4. Suíte de Testes Automatizados (`tests/phase80-full-auto-idle-loop.test.ts`)
- Testar a persistência do estado `isAutoIdle` e `lastHuntId`.
- Testar a transição automática Caçada -> Treino em Dummies ao zerar estamina.
- Testar a transição automática Treino -> Caçada ao recuperar 100% de estamina.
- Testar compra/venda automática em estado Auto-Idle.
- Garantir 0 erros de TypeScript em `npm run typecheck` e 100% de aprovação nos testes.

## Critérios de Aceite (UAT)
1. Botão de Modo Auto-Idle visível e interativo no HUD.
2. Ativar o Modo Auto-Idle salva o estado no banco Prisma para ser permanente entre relogs.
3. Quando a estamina zera em caçada, o personagem vai automaticamente para o treino em dummies.
4. Quando a estamina enche 100% no treino, o personagem retorna sozinho para a caçada.
5. Auto-compra de poções no NPC caso faltem consumíveis e existam Gold Coins.
