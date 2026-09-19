# Phase 198 Plan: Padronização Visual Integral do Sistema (Identidade Royal Dark Stone da Arena PvP & Ranking)

## Objetivos
1. **Globals CSS & Design Tokens**:
   - Estabelecer tokens e classes compartilhadas para janelas e modais.
   - Atualizar `.draggable-window`, `.window-header`, `.window-title`, `.window-controls`, `.fixed-chat-dock` para pedra de carvão `#1e2022`, bordas metálicas `#4a4d52` e tipografia `Georgia, serif` `#f3c769`.
2. **Caçadas (Hunts Catalog & Setup)**:
   - Harmonizar `.hunt-frame-container`, catálogo de 4 colunas, tela de setup, seletores de pull e botão iniciar caçada.
3. **Pátio de Treinamento (Aba TREINO)**:
   - Transformar os cards das 6 skills de treino para `#161719` com borda `#2d3035` / `#f3c769` e botão dourado.
4. **Quests (Aba QUESTS)**:
   - Renderizar o Quest Log com lista de missões, lore, objetivos e status ("Em Progresso" / "Concluída") no mesmo design system.
5. **Lista de Amigos / VIP (`FriendsWindow.tsx`)**:
   - Janela dark stone `#1e2022`, borda `#4a4d52`, header `#18191b`, botão adicionar dourado e lista com status.
6. **Party (`UnifiedPartyModal.tsx`)**:
   - Remover placa octogonal antiga; aplicar container 840x560px `#1e2022`, header `#18191b`, títulos `#f3c769`, cards `#161719` e botões dourados.
7. **Chat Console (`ChatWindow.tsx` & `BottomConsoleHUD.tsx`)**:
   - Abas dark com indicador dourado `#f3c769`, área de mensagens `#121315`, borda `#4a4d52`, input dark `#18191b` com botão dourado.
8. **Hotkeys Config (`HotbarConfigModal.tsx`)**:
   - Janela `#1e2022`, bordas `#4a4d52`, cards de feitiços/runas/poções `#161719` e regras de autocast com botões dourados.

## Critérios de Sucesso
- 100% dos 7 menus compartilham rigorosamente as mesmas cores, proporções e tipografia da Arena PvP.
- Zero erros de TypeScript (`npm run typecheck`).
- Suíte automatizada com 100% de aprovação.
- Deploy concluído com sucesso na VPS de produção.
