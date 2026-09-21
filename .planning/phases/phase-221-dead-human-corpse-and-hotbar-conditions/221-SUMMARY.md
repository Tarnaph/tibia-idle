# Phase 221 Summary: Dead Human Corpse, XP Budget Post-Hunt & Hotbar Conditions Fix

## 1. Visão Geral
- **Objetivo Concluído:**
  1. Geração do corpo oficial de jogador humano (dead human - item 3058 masculino e 3065 feminino) com poça de sangue clássica nas coordenadas exatas da morte em caçadas, com renderização fiel em PixiArena.tsx.
  2. Eliminação do erro de ganho suspeito de XP (Suspicious XP gain exceeds continuous time budget) ao retornar de caçadas para Thais ou sincronizar personagens após hunts, através de tolerância autoritativa de transição de hunt, reconhecimento de data.lastHuntId e elevação do burst de cidade para 100.000 XP.
  3. Correção do bug de compressão CSS no modal de hotbar (HotbarConfigModal.tsx e pp/globals.css), onde o seletor comprido esmagava o .hotbar-stepper para 18px e ocultava o campo numérico e botão +. Agora o stepper possui lex-shrink: 0, min-width: 74px, permitindo digitar diretamente 80% ou ajustar via setas, com avaliação autoritativa no motor de combate.

## 2. Detalhes das Alterações

### A. Dead Human Corpse no Grid de Caçada (combat.ts e PixiArena.tsx)
- Ao detectar dano letal em pplyDamageToPartyActor (	arget.hp <= 0):
  - Gera CorpseState com corpseId: 3058 (ou 3065 se feminino), monsterId: 'human', coordenadas exatas da queda e emite visualEvent creature-died.
- Em PixiArena.tsx:
  - Mapeia diretamente os corpses humanos (corpseId === 3058 || corpseId === 3065) para os assets canônicos /assets/items/item-3058.png e /assets/items/item-3065.png, pré-carregados no batch prioritário sem substituição indevida por esqueletos genéricos.

### B. Resolução de Orçamento de XP Pós-Caçada (characterService.ts, xpRateLimiter.ts e ThaisCityRoom.ts)
- Em characterService.ts:
  - Reconhece evidência de caçada através de hasHuntEvidence, data.lastHuntId, data.isHunting e XpRateLimiter.getAuthorizedExp, mesmo quando a conexão atual está na cidade.
- Em xpRateLimiter.ts:
  - NON_HUNT_MAX_BURST_EXP elevado de 10.000 para 100.000 XP e NON_HUNT_MAX_EXP_PER_SECOND para 2.000 XP/s, acomodando com segurança mortes de monstros em transição de tela.
- Em ThaisCityRoom.ts:
  - Processa player:syncProgress considerando flags de hunt para não rejeitar XP conquistado no fim da hunt.

### C. Stepper e Condições de Hotbar (HotbarConfigModal.tsx e pp/globals.css)
- Em pp/globals.css:
  - .hotbar-stepper com lex-shrink: 0; min-width: 74px; height: 24px; e input numérico estilizado com min-width: 32px; e borda azul destacada.
  - .hotbar-condition-row com lex-wrap: wrap; gap: 6px; para acomodação perfeita em qualquer resolução.
- Em HotbarConfigModal.tsx:
  - Rótulos de operadores compactos (<= (menor ou igual), >= (maior ou igual), etc.).
  - Input seguro que permite apagar para digitar 80 sem travar no NaN.
  - Valor padrão inicial ajustado para 80%.

## 3. Verificação & Testes
- Suíte dedicada 	ests/phase221-dead-human-xp-budget-hotbar-conditions.test.ts: **8/8 testes passando (100%)**.
- Suíte de regressão (fases 217-221): **22/22 testes passando (100%)**.
- TypeScript typecheck: **0 erros** (
pm run typecheck).
