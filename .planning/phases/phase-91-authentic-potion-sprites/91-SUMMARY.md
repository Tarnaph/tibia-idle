# Phase 91: Authentic Tibia 10.98 Potion Sprites & Visual Assets

## Status: Complete ✅

### Objective
Replace all artificial and incorrect potion sprites across the entire game (Action Bar, Hotbar, Inventory, Shop, and Arena) with authentic, crisp 32x32 transparent PNG sprites extracted directly from Tibia 10.98 client files (`Tibia.dat` and `Tibia.spr`) mapped via `realmap11/data/items/items.otb` and `items.xml`.

### Key Changes
1. **OTB Mapping Analysis & Verification:**
   - Mapped all canonical potion server IDs to their exact Tibia 10.98 client IDs:
     - `8704` (Small Health Potion) -> ClientId `7876`
     - `7618` (Health Potion) -> ClientId `266`
     - `7588` (Strong Health Potion) -> ClientId `236`
     - `7591` (Great Health Potion) -> ClientId `239`
     - `8473` (Ultimate Health Potion) -> ClientId `7643` (animated multi-frame)
     - `26031` (Supreme Health Potion) -> ClientId `23375`
     - `7620` (Mana Potion) -> ClientId `268`
     - `7589` (Strong Mana Potion) -> ClientId `237`
     - `7590` (Great Mana Potion) -> ClientId `238`
     - `26029` (Ultimate Mana Potion) -> ClientId `23373`
     - `8472` (Great Spirit Potion) -> ClientId `7642`
     - `26030` (Ultimate Spirit Potion) -> ClientId `23374`
     - `8474` / `10089` (Antidote Potion) -> ClientId `7644`
     - `7439` (Berserk Potion) -> ClientId `7439`
     - `7440` (Mastermind Potion) -> ClientId `7440`
     - `7443` (Bullseye Potion) -> ClientId `7443`
     - `7634`, `7635`, `7636` (Empty Potion Flasks: Small, Medium, Large)
2. **Asset Extractor Pipeline (`packages/tibia1098-assets/src/extractor.ts`):**
   - Added all canonical potion server IDs to `allServerIds` in the extractor.
   - Ran `cli.ts` to extract 8,265 authentic assets and wrote them to `public/generated/tibia1098/items/item-<id>.png`.
   - Updated `content/generated/tibia1098-assets.json` with resolved visual asset mappings for all potions.
3. **Public Potion Sprites (`public/potions/`):**
   - Replaced all synthetic / color-shifted PNGs in `public/potions/` with exact 32x32 transparent PNGs extracted from the 10.98 client.
   - Added missing potion sprites: `antidote-potion.png`, `berserk-potion.png`, `mastermind-potion.png`, `bullseye-potion.png`, and empty flasks.
4. **Action Bar & Hotbar Resolution (`apps/web/components/Tibia11ActionIcon.tsx`):**
   - Added all canonical potion URLs to `ALL_SPELL_ICON_URLS`.
   - Updated `resolveActionImagePath` to correctly distinguish `health-potion.png` (7618) from `small-health-potion.png` (8704), and `mana-potion.png` (7620) from `small-mana-potion.png`.
5. **Item Sprite Component (`apps/web/components/ItemSprite.tsx`):**
   - Inventory, shop, and drop items automatically resolve potion IDs from `visualAssets.items[id]` without falling back to `?`.

### Verification & Testing
- **TypeScript:** `npm run typecheck` passed with 0 errors.
- **Unit & Integration Tests:**
  - `tests/phase91-potions-visual-assets.test.ts`: 5/5 passed (validates 10.98 client IDs, 32x32 dimensions, PNG headers, byte-for-byte equality in `public/potions/`, `ItemSprite` resolution, and action bar icon resolution).
  - `tests/tibia11-action-bar.test.ts`: 7/7 passed.
  - Full test suite: **92 test files passed, 481 tests passed, 0 failures**.
