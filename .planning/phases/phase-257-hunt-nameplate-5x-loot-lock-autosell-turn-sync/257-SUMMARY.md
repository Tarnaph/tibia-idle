# Phase 257 Summary: Visual Fixes, 5x Loot Rate, Loot Bag Lock, Hunt Auto-Sell & Body Turn Sync

## Overview
Phase 257 addressed critical bugs and essential MMORPG quality-of-life systems requested by the user and tracked in `FIX.md`:
1. **Nameplate Centering:** Fixed horizontally skewed player nameplates in hunt mode (`PixiArena.tsx`).
2. **Rotworm Entity Fix:** Removed test spawn of `rotworm-1` and filtered monsters from rendering as white Knight fallbacks in Thais City (`ThaisCityRoom.ts`, `ThaisCityArena.tsx`).
3. **5x Drop Rate Scaling:** Updated server configuration default to `5.0` and applied TFS-style drop rate scaling across combat drops (`ServerConfigManager.ts`, `server-config.json`, `combat.ts`).
4. **Item Lock Protection on Loot Bag:** Added right-click context menu "Lock item" / "Unlock item", gray SVG padlock badge, immunity against quick-sell and periodic sell, and permanent persistence in Prisma (`economy.ts`, `InventoryWindow.tsx`, `ItemContextMenu.tsx`, `characterHydration.ts`, `GamePrototype.tsx`).
5. **Hunt Auto-Sell & Quick-Sell Cooldown:** 10-minute periodic auto-sell for unprotected loot bag items during active hunts, and a 2-minute cooldown on quick sell with visual countdown badge across desktop and mobile docks (`GamePrototype.tsx`, `QuickSellWindow.tsx`, `BottomDock.tsx`, `QuickActionDock.tsx`, `MobileQuickSellBubble.tsx`, `MobileMenuDrawer.tsx`).
6. **Real-Time Body Orientation Sync:** Broadcasted body direction (`north`, `south`, `east`, `west`) immediately on keystrokes (including Ctrl+arrow turns in place) and updated `ThaisCityArena.tsx` to render remote players' orientation in real-time.

## Changes Made

### Onda 1: Visual Fixes
- `apps/web/components/PixiArena.tsx`: Centered player nameplates without skulls with `anchor.set(0.5, 0.5)` at `position.set(0, creatureVisualLayout.nameplateY)` and ensured ticker does not overwrite non-enemy labels.
- `packages/server/src/rooms/ThaisCityRoom.ts`: Removed static `rotworm-1` test spawn from `spawnInitialMonsters()`.
- `apps/web/components/ThaisCityArena.tsx`: Excluded monster entities and test dummy keys from rendering as human players.

### Onda 2: Economy & Drop Rate 5x
- `content/server-config.json`: Updated `"lootRate": 5`.
- `packages/server/src/config/ServerConfigManager.ts`: Updated `lootRate: 5.0`.
- `packages/domain/src/combat.ts`: Scaled `effectiveChance = Math.min(100_000, Math.round(loot.chance * Math.max(1, multiplier)))`.
- `tests/phase60-admin-panel-server-config.test.ts`: Updated test assertion to expect `5.0`.

### Onda 3: Item Lock Protection
- `packages/domain/src/types.ts`: Added `locked?: boolean;` to `LootStack`.
- `packages/domain/src/economy.ts`: Excluded locked items (`if (stack.locked) return true;`) in `sellAllLoot`, `sellLootStack`, and `executeQuickSell`.
- `app/globals.css`: Added `.item-lock-padlock-badge` with top-left positioning, gray SVG padlock, and shadow.
- `apps/web/components/ItemContextMenu.tsx`: Added `onToggleLockItem` option with padlock icon.
- `apps/web/components/InventoryWindow.tsx`: Rendered padlock badge for locked stacks and bound context menu toggle.
- `apps/web/lib/characterHydration.ts`: Hydrated `locked: Boolean(parsedAttr?.locked)` from `attributesJson`.
- `apps/web/components/GamePrototype.tsx`: Wired `handleToggleLockLootItem` and persisted `attributesJson: JSON.stringify({ locked: true })` in `inventoryPayload`.

### Onda 4: Auto-Sell & Cooldown
- `apps/web/components/GamePrototype.tsx`:
  - Added 600-second (10-minute) periodic interval selling unprotected loot bag items with gold credit, server log, and toast.
  - Added 120-second (2-minute) cooldown for hunt mode quick-sell with countdown calculation.
- `apps/web/components/QuickSellWindow.tsx`: Added `cooldownRemaining` prop, disabled button during cooldown with `Recarga (M:SS)` text.
- `apps/web/components/BottomDock.tsx`: Added `quickSellCooldownRemaining`, disabled state with `REC. M:SS`.
- `apps/web/components/QuickActionDock.tsx`: Added `quickSellCooldownRemaining` and disabled state.
- `apps/web/components/mobile/MobileQuickSellBubble.tsx`: Added `cooldownRemaining` and mini countdown badge.
- `apps/web/components/mobile/MobileMenuDrawer.tsx`: Disabled button and added `(M:SS)` timer label during cooldown.

### Onda 5: Real-Time Direction Sync
- `apps/web/components/GamePrototype.tsx`:
  - Added `gameNetwork.sendTurn(dir)` and `setCityDirection(dir)` in `tickWalking`.
  - Added `gameNetwork.sendTurn(dir)` in `takeCityStep`.
  - Added immediate turn broadcast on arrow/WASD keydown and supported Ctrl+direction turning in place without walking.
- `apps/web/components/ThaisCityArena.tsx`:
  - Prioritized `p.direction` over motion track direction when remote players are stationary, resetting track direction in real time.

## Verification
- **Typecheck:** `npm run typecheck` passed with 0 errors.
- **Unit & Regression Testing:** `tests/phase257-hunt-nameplate-5x-loot-lock-autosell-turn-sync.test.ts` passed 6/6 tests covering all 5 waves.
