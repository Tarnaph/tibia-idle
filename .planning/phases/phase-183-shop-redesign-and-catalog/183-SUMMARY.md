# Phase 183: Redesign da Loja da Cidade (Shop Window) & Catálogo Canônico de FIX.md

## Visão Geral
A Fase 183 modernizou a Loja da Cidade (`ShopWindow.tsx`) com o design de seleção de categorias em cards no estilo do treino (`.shop-category-card` com realce azul `#58a6ff` e glow). Conforme especificado em `FIX.md`, o catálogo foi estritamente calibrado para conter apenas os 45 equipamentos das categorias básicas de cidade, removendo todos os demais itens não listados (armaduras raras/demoníacas, armas avançadas e afins).

---

## Itens por Categoria Disponíveis na Loja (45 Itens de FIX.md)

### 1. Armors (5)
- **Leather Armor** (`2467`) - Arm: 4, 60 oz, 35 gp
- **Studded Armor** (`2484`) - Arm: 5, 71 oz, 90 gp
- **Chain Armor** (`2464`) - Arm: 6, 100 oz, 200 gp
- **Brass Armor** (`2465`) - Arm: 8, 80 oz, 450 gp
- **Plate Armor** (`2463`) - Arm: 10, 120 oz, 1.200 gp

### 2. Legs (5)
- **Leather Legs** (`2649`) - Arm: 1, 18 oz, 25 gp
- **Studded Legs** (`2468`) - Arm: 2, 26 oz, 50 gp
- **Chain Legs** (`2648`) - Arm: 3, 35 oz, 80 gp
- **Brass Legs** (`2478`) - Arm: 5, 38 oz, 195 gp
- **Plate Legs** (`2647`) - Arm: 7, 50 oz, 500 gp

### 3. Shoes (1)
- **Leather Boots** (`2643`) - Arm: 1, 9 oz, 10 gp

### 4. Helmets (5)
- **Leather Helmet** (`2461`) - Arm: 1, 22 oz, 12 gp
- **Studded Helmet** (`2482`) - Arm: 2, 24 oz, 63 gp
- **Brass Helmet** (`2460`) - Arm: 3, 27 oz, 120 gp
- **Viking Helmet** (`2473`) - Arm: 4, 39 oz, 260 gp
- **Steel Helmet** (`2457`) - Arm: 6, 46 oz, 580 gp

### 5. Shields (4)
- **Studded Shield** (`2526`) - Def: 15, 33 oz, 50 gp
- **Brass Shield** (`2511`) - Def: 16, 60 oz, 65 gp
- **Plate Shield** (`2510`) - Def: 17, 65 oz, 125 gp
- **Spellbook** (`2175`) - Def: 14, 18 oz, 150 gp (Mages)

### 6. Weapons (25)
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

---

## Verificação e Testes
- **TypeScript:** `npm run typecheck` executado com **0 erros**.
- **Vitest:**
  - `tests/phase183-shop-redesign-and-catalog.test.ts`: **8/8 testes aprovados** (100%).
  - Suíte completa de economia (`phase67`, `phase75`, `phase76` e `phase183`): **23/23 testes aprovados** (100%).
