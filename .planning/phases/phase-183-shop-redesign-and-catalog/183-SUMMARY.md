# Phase 183: Redesign da Loja da Cidade (Shop Window), Catálogo de FIX.md & Armas de Treino

## Visão Geral
A Fase 183 modernizou a Loja da Cidade (`ShopWindow.tsx`) implementando o design de seleção de categorias em cards no estilo do treino (`.shop-category-card` com realce azul `#58a6ff` e glow). O catálogo foi estritamente calibrado para conter **66 itens no total**:
1. Os **45 equipamentos** solicitados em `FIX.md` divididos nas categorias Armors, Legs, Shoes, Helmets, Shields e Weapons.
2. As **21 armas de exercício** (3 tiers: Regular com 500 cargas, Durable com 1.800 cargas e Lasting com 14.400 cargas) para treino nos training dummies.
3. Todos os itens que não faziam parte dessa lista foram removidos do catálogo da loja.
4. O componente `ItemSprite.tsx` foi recalibrado para priorizar a pasta canônica da Cyclopedia (`/generated/cyclopedia/items/item-${id}.png`) com fallback para `/generated/tibia1098/` e `/assets/items/`, além de um fallback SVG limpo, eliminando qualquer ícone de imagem quebrada ("corrupted flag").

---

## Estrutura do Catálogo da Loja (66 Itens)

### 1. Armors (5 Itens de FIX.md)
- **Leather Armor** (`2467`) - Arm: 4, 60 oz, 35 gp
- **Studded Armor** (`2484`) - Arm: 5, 71 oz, 90 gp
- **Chain Armor** (`2464`) - Arm: 6, 100 oz, 200 gp
- **Brass Armor** (`2465`) - Arm: 8, 80 oz, 450 gp
- **Plate Armor** (`2463`) - Arm: 10, 120 oz, 1.200 gp

### 2. Legs (5 Itens de FIX.md)
- **Leather Legs** (`2649`) - Arm: 1, 18 oz, 25 gp
- **Studded Legs** (`2468`) - Arm: 2, 26 oz, 50 gp
- **Chain Legs** (`2648`) - Arm: 3, 35 oz, 80 gp
- **Brass Legs** (`2478`) - Arm: 5, 38 oz, 195 gp
- **Plate Legs** (`2647`) - Arm: 7, 50 oz, 500 gp

### 3. Shoes (1 Item de FIX.md)
- **Leather Boots** (`2643`) - Arm: 1, 9 oz, 10 gp

### 4. Helmets (5 Itens de FIX.md)
- **Leather Helmet** (`2461`) - Arm: 1, 22 oz, 12 gp
- **Studded Helmet** (`2482`) - Arm: 2, 24 oz, 63 gp
- **Brass Helmet** (`2460`) - Arm: 3, 27 oz, 120 gp
- **Viking Helmet** (`2473`) - Arm: 4, 39 oz, 260 gp
- **Steel Helmet** (`2459`) - Arm: 6, 46 oz, 580 gp

### 5. Shields (4 Itens de FIX.md)
- **Studded Shield** (`2526`) - Def: 15, 33 oz, 50 gp
- **Brass Shield** (`2511`) - Def: 16, 60 oz, 65 gp
- **Plate Shield** (`2510`) - Def: 17, 65 oz, 125 gp
- **Spellbook** (`2175`) - Def: 14, 18 oz, 150 gp (Mages)

### 6. Weapons (25 Itens de FIX.md)
- **Hand Axe** (`2380`) - Atk: 10, Def: 5, 18 oz, 8 gp
- **Sabre** (`2385`) - Atk: 12, Def: 10, 25 oz, 35 gp
- **Spear** (`2389`) - Atk: 25, Range: 3, 20 oz, 10 gp
- **Mace** (`2398`) - Atk: 16, Def: 11, 38 oz, 90 gp
- **Scythe** (`2550`) - Atk: 8, Def: 3, 30 oz, 50 gp
- **Sword** (`2376`) - Atk: 14, Def: 12, 35 oz, 85 gp
- **Hatchet** (`2388`) - Atk: 15, Def: 8, 35 oz, 85 gp
- **Longsword** (`2397`) - Atk: 17, Def: 14, 42 oz, 160 gp
- **Orcish Axe** (`2428`) - Atk: 23, Def: 12, 45 oz, 500 gp
- **Morning Star** (`2394`) - Atk: 25, Def: 11, 54 oz, 430 gp
- **Bow** (`2456`) - Range: 6, 31 oz, 150 gp
- **Crossbow** (`2455`) - Range: 5, 40 oz, 500 gp
- **Double Axe** (`2387`) - Atk: 35, Def: 12, 70 oz, 800 gp
- **Wand of Dragonbreath** (`2191`) - Lvl 13+, 23 oz, 1.000 gp
- **Moonlight Rod** (`2186`) - Lvl 13+, 21 oz, 1.000 gp
- **Broadsword** (`2413`) - Atk: 26, Def: 23, 52 oz, 1.500 gp
- **Serpent Sword** (`2409`) - Atk: 18, Def: 15, 41 oz, 2.500 gp
- **Wand of Decay** (`2188`) - Lvl 19+, 23 oz, 5.000 gp
- **Necrotic Rod** (`2185`) - Lvl 19+, 23 oz, 5.000 gp
- **Wand of Draconia** (`8921`) - Lvl 22+, 27 oz, 7.500 gp
- **Northwind Rod** (`8911`) - Lvl 22+, 27 oz, 7.500 gp
- **Wand of Cosmic Energy** (`2189`) - Lvl 26+, 25 oz, 10.000 gp
- **Terra Rod** (`2181`) - Lvl 26+, 26 oz, 10.000 gp
- **Wand of Inferno** (`2187`) - Lvl 33+, 27 oz, 15.000 gp
- **Hailstorm Rod** (`2183`) - Lvl 33+, 27 oz, 15.000 gp

### 7. Exercise Weapons (21 Itens - 3 Tiers)
- **Tier 1 (Regular - 500 Cargas, 262.500 gp):**
  - Exercise Sword (`31821`), Exercise Axe (`31822`), Exercise Club (`31823`), Exercise Bow (`31824`), Exercise Rod (`31825`), Exercise Wand (`31826`), Exercise Shield (`35279`).
- **Tier 2 (Durable - 1.800 Cargas, 945.000 gp):**
  - Durable Exercise Sword (`32384`), Durable Exercise Axe (`32385`), Durable Exercise Club (`32386`), Durable Exercise Bow (`32387`), Durable Exercise Rod (`32388`), Durable Exercise Wand (`32389`), Durable Exercise Shield (`35285`).
- **Tier 3 (Lasting - 14.400 Cargas, 7.560.000 gp):**
  - Lasting Exercise Sword (`32390`), Lasting Exercise Axe (`32391`), Lasting Exercise Club (`32392`), Lasting Exercise Bow (`32393`), Lasting Exercise Rod (`32394`), Lasting Exercise Wand (`32395`), Lasting Exercise Shield (`35286`).

---

## Verificação e Testes
- **TypeScript:** `npm run typecheck` executado com **0 erros**.
- **Vitest:**
  - `tests/phase183-shop-redesign-and-catalog.test.ts`: **8/8 testes aprovados** (100%).
