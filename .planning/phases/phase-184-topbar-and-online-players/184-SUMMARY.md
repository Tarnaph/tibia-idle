# Phase 184: Redesign da TopBar (HUD Superior), Reativação Dinâmica de Players Online e Renomeação para Exura Coins

## Visão Geral
A Fase 184 reorganizou a barra de navegação superior (`WindowDockBar.tsx` e `app/globals.css`) em 3 clusters balanceados e semânticos (Esquerda, Centro e Direita), conectou o contador de jogadores online em tempo real ao estado do Colyseus (`remotePlayers`), substituiu a imagem de moeda única pelo clássico monte de 100 moedas de ouro do Tibia (`gold-stack.png`), aumentou o tamanho das moedas e renomeou "Huntera Coins" para "Exura Coins".

---

## 🏛️ Nova Estrutura em 3 Clusters

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [Logo] [Avatar/Nome]  [🪙 Exura Coins] [💰 Monte de Gold]  │   ● X Jogadores Online   │  [🏪 Loja] [⚔️ Caçadas] [👥 Party] [📖]... │
│ <────────────── ESQUERDA (Patrimônio & Perfil) ────────────> │ <── CENTRO (Mundo) ──>   │ <────────── DIREITA (Ações & Janelas) ──────────> │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

1. **Cluster Esquerdo (`.huntera-left-cluster`):**
   - Logo da marca (`/logo.png`) com título "Exura Online".
   - Card de Perfil/Avatar com nome do personagem, nível, vocação e barra de EXP.
   - **Grupo de Moedas (`.huntera-currency-group`):**
     - **Exura Coins (`coins-badge`):** Ícone ampliado para 26x26px, valor em ciano `#7dd3fc` com text-shadow suave, botão `+` para aquisição.
     - **Gold Coins (`gold-badge`):** Ícone atualizado para `/images/gold-stack.png` (o clássico monte de 100 gold coins extraído do sprite 417 do Tibia), ampliado para 26x26px, valor em dourado `#ffd700` com text-shadow.

2. **Cluster Central (`.huntera-center-cluster`):**
   - Status de Jogadores Online centralizado (`.huntera-online-status`).
   - Dot verde com animação pulsante em CSS (`@keyframes onlineStatusPulse`).
   - Contagem dinâmica e reativa conectada via WebSocket ao Colyseus (`Math.max(1, remotePlayers ? remotePlayers.size : 1)`), atualizando instantaneamente quando jogadores entram ou saem sem necessidade de refresh.

3. **Cluster Direito (`.huntera-right-cluster`):**
   - **Botão da Loja (`huntera-shop-btn`):** Dourado e destacado com ícone de sacola/vitrine, posicionado logo ao lado das ações do jogador.
   - Botão de Auto-Idle (`AutoIdleButton`).
   - Grid de utilitários e janelas (`huntera-actions-grid`): Seleção de Caçadas, Party, Amigos, Métricas, Outfits, Cyclopedia, Mudo/Áudio e Logout.

---

## 🧪 Verificação e Testes
- **Testes Vitest:**
  - `tests/phase184-topbar-and-online-players.test.ts`: **8/8 testes aprovados** (100%).
  - `tests/phase183-shop-redesign-and-catalog.test.ts`: **8/8 testes aprovados** (100%).
- **TypeScript:** `npm run typecheck` executado com **0 erros**.
