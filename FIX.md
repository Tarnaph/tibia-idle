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