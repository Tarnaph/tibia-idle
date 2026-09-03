# Phase 41 Summary: Global Item Tooltip Always On Top & City Player Inspection

## Executive Summary
Phase 41 delivers the two requested game enhancements specified in `FIX.md`:
1. **Global Item Tooltip Always on Top:** Hovering over any item (in Inventory, Paperdoll, Backpack, Bag, Right Sidebar, Depot, or QuickSell) renders full item attributes (sprite preview, gold title, slot/type tag, attack, defense, extra defense, armor, weight in oz, required level, quantity, gold sell value, two-handed badge, locked badge, quicksell badge). Crucially, the tooltip is rendered by a top-level singleton outside floating window stacking contexts with `z-index: 99999999` and dynamic screen-edge viewport clamping, guaranteeing it never gets trapped or obscured behind other windows.
2. **City Player Inspection Card:** Hovering over another player in the city (both other party members and authentic Thais citizens like Vimago, Elane, Harkath Bloodblade, Muriel, Gorn, Quentin) displays an MMORPG inspection card detailing their Name, Level, Vocation, and Account status (`⭐ Premium Account` or `Free Account`).

---

## Deliverables & Changes

### 1. Domain Types (`packages/domain/src/`)
- Added `isPremium?: boolean` to `CharacterState` in `types.ts`.
- Updated `createCharacter` in `party.ts` to initialize player characters with `isPremium: true`.

### 2. Global Tooltip Singleton (`apps/web/components/GlobalItemTooltip.tsx` & `app/globals.css`)
- Created `GlobalItemTooltip`:
  - Fixed position at document root with `z-index: 99999999`.
  - Screen boundary edge-clamping algorithm preventing overflows on right and bottom viewport bounds.
  - Custom window events `show-global-tooltip` and `hide-global-tooltip` for decoupled invocation from any component or canvas.
  - Exported helper functions: `showGlobalItemTooltip`, `hideGlobalItemTooltip`, `showGlobalPlayerTooltip`, `hideGlobalPlayerTooltip`.
  - Item card styles with Tibia gold headers, stat badges, and price indicators.
  - Player inspect card styles with avatar icon, vocation, level badge, and `⭐ Premium Account` / `Free Account` badges.
- Mounted `<GlobalItemTooltip />` inside `<main className="mmorpg-client fullscreen-mode">` in `GamePrototype.tsx`.

### 3. Window & Panel Wiring
Replaced local window-confined tooltips with `showGlobalItemTooltip` / `hideGlobalItemTooltip` across:
- `InventoryWindow.tsx`: Paperdoll equipment slots, Bolsa slots, Mochila slots.
- `RightSidebar.tsx`: Paperdoll equipment slots, Loot pouch cells.
- `DepotWindow.tsx`: Depot container items, Bag items, Backpack items.
- `QuickSellWindow.tsx`: Sellable items catalog.
- `EquipmentPanel.tsx`: Paperdoll slots, Inventory cells.

### 4. City Player Hover & Inspection (`apps/web/components/ThaisCityArena.tsx`)
- Added `AMBIENT_THAIS_PLAYERS`:
  - `Vimago`: Level 45 Master Sorcerer (Premium Account) at Depot/Magic Shop (`x: 32344, y: 32230, z: 7`)
  - `Elane`: Level 32 Royal Paladin (Premium Account) on Main Street (`x: 32358, y: 32225, z: 7`)
  - `Harkath Bloodblade`: Level 68 Elite Knight (Premium Account) near Training Ground (`x: 32348, y: 32222, z: 7`)
  - `Muriel`: Level 54 Sorcerer (Free Account) at Temple Square (`x: 32367, y: 32240, z: 7`)
  - `Gorn`: Level 28 Knight (Free Account) at Square (`x: 32350, y: 32236, z: 7`)
  - `Quentin`: Level 80 Elder Druid (Premium Account) at Temple (`x: 32369, y: 32243, z: 7`)
- Promoted vocation outfit mapping in `getOutfitFrameUrl` (Sorcerer, Paladin, Knight, Druid).
- Added pointer hit testing in `onPointerMove`:
  - Detects mouse hovering over ambient players on active Z floor or party members.
  - Sets `cursor = 'pointer'`.
  - Dispatches `showGlobalPlayerTooltip` with name, level, vocation, and isPremium.
  - Clears tooltip on pointer leave or when moving off the player.

---

## Verification & Tests
- **Test File:** `tests/phase41-item-attributes-tooltip-player-inspect.test.ts` (6/6 passing).
- **TypeScript Typecheck:** `npm run typecheck` passes with 0 errors.
- **Complete Test Suite:** `npm run test` executes all 36 test files with 235 passing tests (100% pass rate).
