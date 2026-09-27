# Phase 251 Summary: Refinamentos de UI/UX Mobile & Desktop (Docks, Áudio, Quests Em Breve & VIP)

## Execução & Entrega

Nesta fase foram implementados e validados todos os 6 itens requisitados no `FIX.md`, organizados em 3 ondas lógicas:

### Onda 1: Navegação & Docks (Mobile / Desktop)
1. **Ocultar botões de acesso a Arena e Bosses**:
   - Removido o botão de Arena PvP de `apps/web/components/window/WindowDockBar.tsx` e `apps/web/components/QuickActionDock.tsx`.
   - Removido o botão de Arena PvP de `apps/web/components/mobile/MobileMenuDrawer.tsx`.
   - Removidas as abas `'ARENA'` e `'BOSSES'` de `apps/web/components/HuntSelector.tsx`.
2. **Remover aba "Mundo" do menu inferior mobile**:
   - Removida a aba `'world'` de `apps/web/components/mobile/MobileBottomNav.tsx`.
   - Agora a barra inferior mobile possui 5 botões bem espaçados: Herói, Inventário, Social, Métricas e Menu.
   - Atualizado o tipo `MobileTab` e o estado inicial em `apps/web/components/GamePrototype.tsx` para `'character'`.

### Onda 2: TopBar & Social Mobile
3. **Substituir botão de configurações no topo mobile por Som / Mute**:
   - No `apps/web/components/mobile/MobileTopBar.tsx`, o botão duplicado de configurações foi substituído por um botão de controle de áudio instantâneo com 1 toque.
   - Integrado de forma reativa ao `audioManager` (`toggleAudioMuted`, `isAudioMuted`, `onAudioChange`), refletindo estados de som ativo (verde com ondas sonoras) e som mudo (vermelho com ícone mudo riscado).
4. **Ajustar Menu Social no Mobile**:
   - No `apps/web/components/mobile/MobileMenuDrawer.tsx`, mantido o botão de "Party / Grupo" e substituído o botão "Inspecionar Herói" por "VIP (Amigos)".
   - Conectado em `GamePrototype.tsx` para abrir a janela nativa de Amigos/VIP (`openWindow('friends')`).

### Onda 3: Caçadas & Quests Responsivo
5. **Restringir abas de Caçadas no Mobile**:
   - No mobile, o modal de caçadas exibe apenas as abas `CAÇADAS` e `QUESTS`.
   - O acesso a Treino permanece isolado pelo Menu > Treinamento.
6. **Redesenho UI/UX da Aba Quests**:
   - Removido o layout amassado com colunas fixas e as missões fictícias de `apps/web/components/HuntSelector.tsx`.
   - Implementada interface 100% responsiva no padrão Royal Dark Stone & Dourado Real com pergaminho glowing, badge "Em Desenvolvimento · Em Breve", cards explicativos sobre futuras mecânicas (Missões canônicas, Addons e Recompensas) e botão de retorno às caçadas.

---

## Verificação e Qualidade
- `npm run typecheck`: **0 erros de tipagem**.
- `npm run test -- tests/phase251-ui-ux-mobile-and-desktop-polish.test.ts`: **6 testes aprovados**.
- `npm run test -- tests/phase198-design-system-unification.test.ts`: **9 testes aprovados**.
- `npm run test -- tests/phase234* tests/phase235* tests/phase236* tests/phase237* tests/phase238* tests/phase239* tests/phase250*`: **52 testes aprovados**.
