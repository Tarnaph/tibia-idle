# Phase 114: Troca Rápida de Habilidades e Ações na Hotbar via Drag-and-Drop (Arrastar e Soltar Slots F1 a F12)

## 📋 Resumo Executivo

Na Phase 114, foi implementado o suporte completo a arrastar e soltar (HTML5 Drag and Drop) diretamente nos slots de ações da hotbar inferior (`BottomConsoleHUD`), permitindo aos jogadores reorganizar e trocar (swap) rapidamente suas magias, poções e runas entre os slots F1 a F12 (linha superior) e 1 a 0 (linha inferior).

A funcionalidade preserva a integridade de cliques simples normais (execução de ação/magia) e cliques com o botão direito (abrir menu de configuração do slot), além de sincronizar de forma atômica e permanente as alterações no banco de dados SQLite/Prisma.

---

## 🎯 Entregas & Modificações Realizadas

### 1. Camada de Domínio (`packages/domain/src/spells.ts`)
- Refatoração da função `reorderHotbar(character: CharacterState, fromIndex: number, toIndex: number): CharacterState`:
  - Efetua a troca atômica (swap) dos identificadores de ação entre `fromIndex` e `toIndex` sem efeito cascata indesejado sobre slots intermediários.
  - Ao arrastar para um slot vazio, move a ação para o destino e limpa o slot de origem (`0`).
  - Troca simultaneamente os objetos de configuração de auto-uso (`hotbarConfigs`) entre os dois slots, garantindo que regras de HP/Mana configuradas acompanhem a magia/poção correspondente.
  - Suporta preenchimento transparente (padding) para até 20 slots de ação.

### 2. Interface e Interação Drag-and-Drop (`apps/web/components/BottomConsoleHUD.tsx`)
- Adicionada prop `onReorderSpell?: (fromIndex: number, toIndex: number) => void`.
- Integrados manipuladores de eventos HTML5 DnD:
  - `draggable={Boolean(hasAction)}` em slots com ações equipadas.
  - `onDragStart`: Armazena o índice de origem via `dataTransfer` (`text/plain`) e ativa estado visual de arrastando (`dragging`).
  - `onDragOver` e `onDragLeave`: Ativa feedback visual de destaque (`drag-over`) no slot alvo receptor.
  - `onDrop`: Extrai o índice de origem e dispara `onReorderSpell(fromIndex, slotIndex)` tanto em slots ocupados (troca) quanto em slots vazios (movimentação).
  - `onDragEnd`: Limpa estados de arraste e bloqueia acionamento acidental de clique pós-arraste através de `isDraggingRef`.

### 3. Conexão de Componentes (`apps/web/components/BottomDock.tsx`)
- Desestruturada a propriedade `onReorderSpell` em `BottomDock` e repassada ao componente filho `<BottomConsoleHUD onReorderSpell={onReorderSpell} ... />`.

### 4. Persistência Permanente MMORPG (`apps/web/components/GamePrototype.tsx`)
- Em `reorderSelectedHotbar`, integrada a chamada imediata a `/api/characters/${updatedChar.id}/save`:
  - Persiste `hotbar` e `hotbarConfigs` atualizados no banco de dados Prisma.
  - Garante persistência permanente entre recarregamentos de página (F5), trocas de personagem e restarts do servidor, conforme a Regra 5 de diretriz de estado do MMORPG.

### 5. Estilização e Feedback Visual (`app/globals.css`)
- `.hud-action-slot > * { pointer-events: none; }`: Garante que sprites/ícones internos não interceptem o evento de arraste do botão.
- `.hud-action-slot.dragging`: Reduz opacidade para 40% com borda pontilhada durante o arraste.
- `.hud-action-slot.drag-over`: Borda dourada brilhante (`#ffd700`) com `box-shadow` pulsante e leve escala de destaque ao sobrevoar qualquer slot receptor.

---

## 🧪 Verificação & Testes

1. **Vitest Unit Tests (`tests/phase114-hotbar-drag-drop.test.ts`):**
   - 7 testes automatizados criados e validados com 100% de aprovação:
     - Troca adjacente F1 <-> F2.
     - Troca não adjacente F1 <-> F3 sem alterar F2.
     - Movimentação para slot vazio (limpeza da origem).
     - Troca de `hotbarConfigs` entre slots.
     - Migração de `hotbarConfigs` para slot vazio.
     - Padding do array para 20 slots.
     - Operações idempotentes / limites fora de alcance.
2. **Compatibilidade Regressiva (`tests/phase8.test.ts`, `tests/phase97-hotbar-conditions.test.ts`):**
   - 100% de aprovação em todos os testes legados de hotbar e combate.
3. **TypeScript Typecheck (`npm run typecheck`):**
   - 0 erros em todo o workspace.
