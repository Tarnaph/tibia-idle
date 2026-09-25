# Resumo da Fase 235: Refinamento de UI/UX Mobile & Limpeza de Interface

**Data**: 25 de Setembro de 2026  
**Status**: Concluída com Sucesso (100% Validada)  
**Validação**: 0 erros no TypeScript (`npm run typecheck`), 100% de aprovação no Vitest (`tests/phase235-mobile-ui-polish.test.ts` e `tests/phase234-mobile-and-admin-premium.test.ts`).

---

## 🎯 Objetivos Concluídos

Com base nos testes realizados em smartphone real na VPS (`187.7.16.210:3000`), a Fase 235 refinou e poliu a experiência do usuário móvel sem introduzir qualquer regressão ao desktop:

1. **Chat em Botão Circular Flutuante ("Bolinha") & Ocultação no Mobile:**
   - A barra fixa de chat de desktop (`.fixed-chat-dock`) agora é ocultada em visualização móvel (`!responsive.isMobile`).
   - Implementado o componente `MobileChatBubble.tsx`: botão circular dourado estilizado, posicionado estrategicamente a `bottom: 124px; left: 12px;` (acima das hotkeys, sem obstruir ações ou navegação).
   - O botão conta com badge contador de mensagens não lidas (`99+` para valores altos) e animação pulsante ao receber novas mensagens.
   - Ao tocar na bolinha, abre-se o `MobileChatModal.tsx`, modal deslizante (slide-up sheet) com abas (Local, World, Whispers), visualizador rolável, input adaptado para teclado virtual e botão de fechar (✕).

2. **Remoção de Badges e Avisos de Debug:**
   - O badge invasivo `🗺️ RealMap OTBM · Entrada: (32102, 32205, 8) · Sala: ...` que sobrepunha a tela de caçada foi totalmente removido do jogo, tanto no mobile quanto no desktop.
   - O `city-location-hud` em caçadas foi desativado em dispositivos móveis.

3. **Bestiário Compacto e Não Obstrutivo:**
   - Em `BestiaryTrackerHUD.tsx`, adicionada detecção de mobile (`window.innerWidth <= 768`).
   - Em telas móveis, o bestiário agora inicializa **minimizado por padrão** (`isMinimized: true`), apresentando-se como uma elegante pílula arrastável no topo (`📖 Bestiário (4)`), liberando 100% do centro da arena de combate.
   - Quando expandido pelo jogador, possui largura compacta de `195px` (vs 255px no desktop), sprites de monstro enxutos (26px), tipografia proporcional e lista com scroll vertical suave (`max-height: 160px`).

4. **Seletor de Caçadas em Lista Vertical com Rolagem Natural:**
   - Em `app/globals.css`, no seletor de caçadas (`.hunt-catalog-grid`), adicionada regra móvel que converte o grid de 4 colunas em **lista vertical única de 1 coluna** (`grid-template-columns: 1fr`).
   - Os cards passam a ocupar 100% da largura, com rolagem natural para baixo (`overflow-y: auto`), eliminando cortes de títulos, criaturas e taxas de XP/GP.
   - **Correção dos Sprites de Corym:** Identificado e corrigido que os arquivos de criaturas da Corym Mine (`corym-vanguard.png`, `corym-skirmisher.png`, etc.) estavam desrastreados (untracked) no git. Foram rastreados e commitados, e adicionado no `HuntSelector.tsx` um fallback resiliente em cascata para evitar qualquer ícone quebrado.

5. **Zoom de Câmera Reduzido no Mobile (0.85x) & Safe Area no Loading:**
   - Em `zoomManager.ts`, criado multiplicador padrão de `0.85x` para mobile (contra `1.25x` no desktop) e chave isolada no localStorage (`tibia_camera_zoom_mobile`), garantindo visualização ampla de ~7-8 tiles horizontalmente em smartphones verticais ("folga pros olhos do jogador").
   - Em `ExuraLoadingScreen.tsx`, adotado `100dvh`, `minHeight: -webkit-fill-available` e `paddingBottom: max(4.5rem, calc(2.5rem + env(safe-area-inset-bottom, 20px)))`, impedindo que barras inferiores de navegadores móveis cortem mensagens ("SALVANDO PROGRESSO E...").

---

## 🧪 Testes e Validação

- `npm run typecheck`: **0 erros** de compilação TypeScript em todo o monorepo.
- `npx vitest run tests/phase235-mobile-ui-polish.test.ts`: **8/8 testes aprovados**.
- `npx vitest run tests/phase234-mobile-and-admin-premium.test.ts`: **12/12 testes aprovados**.
