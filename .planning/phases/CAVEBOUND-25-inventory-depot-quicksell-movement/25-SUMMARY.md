# Phase 25 Summary: Novo Inventário com Bolsa, Depot, Venda Rápida, Menu de Contexto, Movimentação Ortogonal e Preços de Loot

## 🎯 Objetivo Cumprido
Implementação do conjunto completo de melhorias de UI e jogabilidade solicitadas em `FIX.md` e referenciadas pelos prints do usuário:
1. **Movimentação Preferencial Ortogonal (A\*)**: o personagem prioriza passos retos (horizontal/vertical) e só utiliza diagonal como último recurso ou para desviar de quinas/obstáculos.
2. **Precificação Canônica 100% dos Loots**: eliminação de todos os itens com preço desconhecido em `item-economy.json`. Todos os 50 itens agora possuem preço oficial canônico.
3. **Novo Inventário Clássico**:
   - Paperdoll com 10 slots e silhuetas escuras quando vazios (Capacete, Amuleto, Mochila, Armadura, Arma, Escudo, Calça, Anel, Botas, Munição).
   - Inset de **Capacidade** (`oz`) calculado dinamicamente com base na vocação, nível e peso dos itens.
   - Compartimento **Bolsa** (12 slots) para itens protegidos.
   - Compartimento **Mochila** (20 slots) para entrada direta de todos os loots obtidos em combate.
   - Rodapé com total de **Gold Coins** formatado com separador de milhar e ícone clássico de moedas.
4. **Menu de Contexto Interativo (Botão Direito)**:
   - Equipar / Desequipar
   - Vender no Market
   - Ver no Market
   - Checkbox *Auto loot* (define se o item é coletado ou destruído)
   - Checkbox *Travar venda* (bloqueia o item contra venda rápida ou acidental)
   - Checkbox *Venda rápida* (marca o item para seleção automática na venda rápida)
   - Ação *Destruir* com confirmação
5. **Barra de Ações Rápidas (Quick Actions Dock)**:
   - Posicionada acima da action bar / console inferior.
   - Botões estilizados: `DEPOT`, `VENDA RÁPIDA` (borda dourada brilhante), `IMBUEMENTS`, `BLESSINGS`.
6. **Janela Depot (Armazém)**:
   - Painel esquerdo: `Armazém` com abas de filtro por tipo de equipamento, campo de busca em tempo real e grid de 63 slots.
   - Painel direito: `Bolsa` (12 slots) e `Mochila` (20 slots) para transferências com clique ou arraste.
7. **Janela Venda Rápida**:
   - Lista interativa de todos os itens vendíveis na Mochila.
   - Seleção com destaque azul, selo dourado no item e cálculo dinâmico de total de moedas.
   - Botão de confirmação para vender e creditar o gold instantaneamente.

---

## 🛠️ Modificações Realizadas

### 1. Spatial & Pathfinding
- `packages/domain/src/spatial/pathfinding.ts`:
  - Custo de passos diagonais elevado de 14 para 25 (passos retos custam 10, logo `10 + 10 = 20 < 25`).
  - Heurística A* alterada para distância de Manhattan `(dx + dy) * 10`.

### 2. Economia de Conteúdo & Fallbacks de Preço
- `packages/styller-importer/src/webPriceFallbacks.ts`:
  - Mapeamento oficial dos 43 itens anteriormente sem preço (bones, mouldy cheese, spears, helmets, shields, meats, creature products, fangs, etc.).
- `content/generated/item-economy.json`:
  - Re-executado `npm run import:content`. 0 itens com `priceUnknown`. 100% dos 50 itens com preço canônico.

### 3. Modelo de Domínio
- `packages/domain/src/types.ts`:
  - Adicionados campos opcionais `bag?: LootStack[]` e `depot?: LootStack[]` em `SessionState`.
- `packages/domain/src/economy.ts`:
  - Implementadas funções canônicas `getContainerItems`, `setContainerItems`, `transferItemBetweenContainers`, `destroyContainerItem` e `executeQuickSell`.

### 4. Componentes React & Design
- `apps/web/components/SlotSilhouette.tsx`:
  - Renderiza silhuetas escuras e limpas para slots vazios de equipamentos.
- `apps/web/components/ItemContextMenu.tsx`:
  - Menu de clique com o botão direito nos itens.
- `apps/web/components/QuickActionDock.tsx`:
  - Barra de 4 botões acima da hotbar.
- `apps/web/components/InventoryWindow.tsx`:
  - Nova janela de Inventário (Paperdoll + Capacidade + Bolsa + Mochila + Gold).
- `apps/web/components/DepotWindow.tsx`:
  - Janela modal do Depot com Armazém e abas de categorias.
- `apps/web/components/QuickSellWindow.tsx`:
  - Janela modal de Venda Rápida com lista, badges e venda em lote.
- `apps/web/components/BottomDock.tsx`:
  - Integrado o `QuickActionDock` acima do console.
- `apps/web/components/GamePrototype.tsx`:
  - Conexão de estado, modais e manipuladores de transferência e venda rápida.
- `app/globals.css`:
  - Estilização pixel-perfect inspirada nas imagens de referência do usuário.

---

## 🧪 Testes e Validação
- `tests/phase25-inventory-depot-quicksell.test.ts`:
  - Suíte com 6 testes cobrindo preferência ortogonal, precificação 100%, cálculo de capacidade, transferência entre recipientes, destruição de itens e venda rápida.
- `npm run typecheck`: 0 erros de tipagem TypeScript.
- `npm run test`: 100% de aprovação em todos os testes.
