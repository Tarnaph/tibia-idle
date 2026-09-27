# Phase 249 Summary: Abertura da Janela de Seleção de Venda Rápida de Loot no Mobile via Botão Flutuante e Menu Hambúrguer

## 📌 Escopo e Objetivos Atingidos
Resolução do comportamento do botão de venda rápida no mobile, garantindo que o toque no botão abra a tela interativa de loot para escolha dos itens a serem vendidos, idêntico à versão desktop web:

### 1. Conexão Autoritativa do Botão Flutuante de Venda Rápida
- Em `apps/web/components/GamePrototype.tsx`, a prop `onQuickSell` do componente `<MobileQuickSellBubble>` foi alterada de `{sellLoot}` (venda direta cega em background) para `() => setQuickSellOpen(true)`.
- Ao tocar na bolha dourada flutuante (com badge de contagem de itens vendíveis), a janela modal interativa `QuickSellWindow` é aberta imediatamente na tela.

### 2. Acesso Adicional pelo Menu Hambúrguer Mobile
- Em `apps/web/components/mobile/MobileMenuDrawer.tsx`, adicionada a prop `onOpenQuickSell?: () => void;` e o botão temático "Venda Rápida" com ícone Lineart SVG de saco de moedas/ouro no menu do aventureiro.
- Conectado em `GamePrototype.tsx` para abrir o `QuickSellWindow` também pelo menu drawer.

### 3. Ergonomia e Otimização Touch no `QuickSellWindow.tsx`
- Adicionado `zIndex: 100000` explícito no `inventory-window-overlay`, garantindo que a tela de venda rápida sobreponha perfeitamente todo o HUD mobile (botões de caçada, D-pad, chat, hotkeys e bottom nav).
- Adicionado tratamento prioritário de toque `onTouchEnd` no botão de fechar ✕ do cabeçalho, prevenindo qualquer atraso ou perda de evento em telas touch.
- Adicionados manipuladores táteis nos botões "Marcar Todos", "Desmarcar Todos", "Cancelar" e "Vender por X gp", bem como `touchAction: 'manipulation'` nos cards de itens da lista.
- No `MobileQuickSellBubble.tsx`, adicionado `onTouchEnd` com `e.preventDefault()` e `e.stopPropagation()` para resposta imediata sem atraso de 300ms de touch-to-click.

---

## 🧪 Verificação e Testes
- **TypeScript Typecheck:** `tsc --noEmit` completou com código 0 (**0 erros de tipagem em todo o monorepo**).
- **Testes Unitários:** `tests/phase210-quicksell-persistent-selection.test.ts` aprovado (6 testes passando).
- **Integridade de Design:** 0 emojis adicionados, 100% Lineart SVG.
