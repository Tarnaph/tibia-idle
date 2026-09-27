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