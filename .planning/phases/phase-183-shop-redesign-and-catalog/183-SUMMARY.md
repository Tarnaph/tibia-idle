# Phase 183: Redesign da Loja da Cidade (Shop Window) com Estilo de Treino & Catálogo Completo

## Visão Geral
A Fase 183 reformulou completamente a Loja da Cidade (`ShopWindow.tsx`), modernizando o visual de seleção de categorias para o design dos cards de treino (`.training-skill-card` / `.training-skills-grid` com bordas ativas em azul `#58a6ff` e efeito glow), além de incluir integralmente o catálogo canônico de 67 equipamentos exibidos no Print 2 do usuário (Armas, Escudos, Capacetes, Armaduras, Calças, Botas e Armas de Exercício com os 3 tiers: Regular, Durable e Lasting).

---

## Entregas Realizadas

### 1. Geração Automatizada de Sprites de Armas de Exercício (`sharp`)
- Script gerador `scripts/generate-exercise-sprites.mjs` criado e executado.
- 21 sprites canônicos gerados em `public/assets/items/item-${id}.png`:
  - **Tier 1 - Regular (500 cargas, aura rosa):**
    - Sword: 31821, Axe: 31822, Club: 31823, Bow: 31824, Rod: 31825, Wand: 31826, Shield: 35279
  - **Tier 2 - Durable (1.800 cargas, aura ciano):**
    - Sword: 32384, Axe: 32385, Club: 32386, Bow: 32387, Rod: 32388, Wand: 32389, Shield: 35285
  - **Tier 3 - Lasting (14.400 cargas, aura verde):**
    - Sword: 32390, Axe: 32391, Club: 32392, Bow: 32393, Rod: 32394, Wand: 32395, Shield: 35286

### 2. Catálogo Canônico e Tipado (`apps/web/lib/shopCatalog.ts`)
- 8 categorias canônicas definidas:
  - `Todos` (all)
  - `Armors` (armors)
  - `Helmets` (helmets)
  - `Legs` (legs)
  - `Shields` (shields)
  - `Weapons` (weapons)
  - `Shoes` (shoes)
  - `Exercise Weapons` (exercise)
- 67 itens cadastrados com atributos precisos (ataque, defesa, armor, range, peso em oz, requisito de nível, vocações compatíveis, preço e descrição).
- Funções utilitárias `getShopItemsByCategory` e `filterShopItems` exportadas e validadas.

### 3. Redesign da Interface da Loja (`apps/web/components/ShopWindow.tsx`)
- **Cabeçalho com Saldo:** Janela arrastável com indicação do ouro total da Party (`totalGold.toLocaleString('pt-BR') gold`).
- **Barra de Busca e Filtro de Vocação:** Pesquisa textual em tempo real combinada com dropdown por vocação (Knight, Paladin, Sorcerer, Druid).
- **Cards de Categoria Estilo Treino:** Grade de cartões baseada na estética do pátio de treino (`.shop-category-card`), com ícone centralizado, rótulo e realce azul (#58a6ff) ao selecionar.
- **Matriz de Slots de Equipamento (Estilo Print 2):** Slots escuros 40x40px com cantoneira diagonal (`.slot-corner-accent`) diferenciando itens comuns (dourado) e armas de exercício por tier (rosa, ciano e verde).
- **Painel de Compra e Detalhes:** Preview do item selecionado, exibição de cargas de treino, atributos de combate, stepper numérico de quantidade (- / +) e botão de compra com validação de saldo de ouro.

### 4. Estilização CSS (`app/globals.css`)
- Novas classes implementadas com rigor visual:
  - `.shop-categories-grid`, `.shop-category-card`, `.shop-category-card.selected`
  - `.shop-items-matrix`, `.shop-slot-item`, `.shop-slot-item.selected`
  - `.slot-corner-accent` (com variações `.tier-regular`, `.tier-durable`, `.tier-lasting`)
  - `.shop-purchase-panel`, `.shop-search-input`

### 5. Compatibilidade e Tipagem
- Ajustes em `ItemSprite.tsx` para aceitar a prop opcional `size?: number`.
- Integração corrigida com `showGlobalItemTooltip`.
- Correção na trava de nível 8 para escolha de vocação (`packages/domain/src/party.ts`).

---

## Verificação e Testes
- **TypeScript:** `npm run typecheck` executado com **0 erros** (código de saída 0).
- **Vitest:**
  - `tests/phase183-shop-redesign-and-catalog.test.ts`: **9/9 testes aprovados** (100%).
  - Suíte completa de economia (`phase67`, `phase75`, `phase76` e `phase183`): **24/24 testes aprovados** (100%).
