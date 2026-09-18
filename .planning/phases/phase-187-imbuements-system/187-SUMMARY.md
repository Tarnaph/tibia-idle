# Phase 187 Summary: Imbuements System (Imbuir)

## Overview
Implemented the complete authentic Imbuements System ("Imbuir") in Exura / TibiaWeb, faithfully reproducing the visual layout and mechanics from the provided reference screenshots and specifications.

## Delivered Capabilities

### 1. Canonical Domain & Rules (`packages/domain/src/imbuements.ts` & `imbuingSlots.json`)
- **17 Canonical Imbuements**:
  - Weapon Skills: Slash (Sword), Chop (Axe), Bash (Club), Precision (Distance), Blockade (Shielding), Epiphany (Magic Level).
  - Combat Effects: Strike (Critical Hit 10% chance, up to +50% extra dmg), Vampirism (Life Leech up to 25%), Void (Mana Leech up to 8%).
  - Elemental Protections: Dragon Hide (Fire 15%), Quara Scale (Ice 15%), Snake Skin (Earth 15%), Cloud Fabric (Energy 15%), Lich Shroud (Death 15%), Demon Presence (Holy 15%).
  - Utility: Swiftness (Speed +20 on boots), Featherweight (Capacity +15% on backpack).
- **Canonical Tier Costs**:
  - Basic: 7,500 gold (1 red tier dot)
  - Intricate: 60,000 gold (2 red tier dots)
  - Powerful: 250,000 gold (3 red tier dots)
- **Active Hunting Time & Auto-Renewal**:
  - 24 hours (`86,400s`) of active hunting time. Timer ticks down strictly during active combat/hunts (`advanceCombat`). Timer stays paused in Thais City/temple.
  - Automatic renewal toggle debits the Party Vault (`session.gold`) on expiration; cleanly expires if funds are insufficient.
- **Item Imbuing Slots Lookup**:
  - Realmap item definitions cataloged in `imbuingSlots.json` (340 items) with automatic slot resolution (e.g. Terra Helmet: 1 slot, Demon Helmet: 2 slots, Giant Sword: 3 slots).

### 2. Derived Stats & Combat Integration (`packages/domain/src/derivedStats.ts` & `combat.ts`)
- Imbuement stat bonuses are aggregated dynamically when items are equipped.
- Combat engine applies:
  - Critical strike rolls (10% chance) and amplified critical damage (+15% / +25% / +50%).
  - Life Leech healing on physical and spell damage dealt to enemies.
  - Mana Leech restoration on damage dealt.
  - Elemental damage mitigations against incoming enemy spells and attacks.
  - Skill, speed, and capacity enhancements.

### 3. Database Persistence & Hydration (`packages/auth/src/characterService.ts` & `apps/web/lib/characterHydration.ts`)
- Imbuement state is persisted in Prisma DB (`InventoryItem.attributesJson`) on session autosave, hunt completions, and manual imbuing.
- Fully hydrated upon login and room join for all characters in the party loadout.

### 4. UI & Modal Parity (`apps/web/components/ImbuingModal.tsx`, `BottomDock.tsx`)
- Modal accessible via the "IMBUEMENTS" button on the bottom dock (`BottomDock.tsx`).
- Character switcher tabs at top-left ([EK], [ED], [RP]) with vocation badges and animated outfit sprites.
- Tibia paperdoll set layout (9 slots) with dimmed slots (reduced opacity) for items without imbuement slots.
- Mochila quick-select row underneath the paperdoll.
- Real-time Party Vault gold balance display in bottom-left.
- Right-hand action pane:
  - Selected item preview with name and total slots.
  - Active imbuement slots with remaining time (e.g. `24h00m`, `22h17m`), auto-renewal toggle switch, and "Limpar slot (grátis)" button.
  - Tier selection buttons (`Basic · 7.500`, `Intricate · 60.000`, `Powerful · 250.000`).
  - Applicable imbuements grid with custom SVG icons, tier dots, and category filtering.
  - Auto-renew checkbox with explanation and big golden "IMBUIR" action button.

### 5. Shop & QuickSell Protection (`QuickSellWindow.tsx`, `RightSidebar.tsx`)
- Items with active imbuements (`remainingSeconds > 0`) are strictly excluded from "Vender tudo" / QuickSell to prevent accidental loss of imbued gear.

### 6. Item Tooltip Enhancements (`GlobalItemTooltip.tsx`)
- Renders green `Imbuements:` section displaying active imbuement name, tier, stat bonus, and remaining hunt time (e.g. `Slash Powerful — melee +4 · 22h17m`).
- Renders amber/yellow warning notice:
  - `Imbuement ativo`
  - `Sai no "Vender tudo", ou espere o imbuement acabar.`
- Displays `Equipado em {Nome}` when inspected on an equipped character.

## Verification
- **Automated Tests**: Vitest test suite (`tests/phase187-imbuements-system.test.ts`) covering 23 comprehensive test assertions — 100% pass rate.
- **Type Safety**: `npm run typecheck` passed with **0 errors**.
