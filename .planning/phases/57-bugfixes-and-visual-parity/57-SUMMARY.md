# Phase 57 Summary: Bug Fixes & Visual Parity (FIX.md + Images 1-5)

**Execution Mode:** Full GSD Lifecycle / Autonomous (Allow All & Accept All)  
**Status:** Complete  
**Date:** 2026-09-05  

---

## 1. Accomplishments & Deliverables

### Bug 1: Party Exit Coordinate & Water Walking Prevention
- **Root Cause:** When party leader exited the hunt, client reset `cityPos` to temple locally without sending explicit teleport coordinates to server. Server rejected movements as step-distance too far from previous pier/boat coordinates, causing pathfinding into water tiles, followed by follower's `leaderMoved` packets walking through water behind the leader clone.
- **Solution:**
  - `ThaisCityRoom.ts`: On `party:huntExit`, automatically sets all party members and leader coordinates to Thais Temple (`32369, 32241, 7`), resets walking flags (`isWalking = false`, `lastStepTime = 0`), and broadcasts `party:huntExited` with coordinates. Added `player:teleport` message handler for immediate client-server position alignment without distance clamping.
  - `GamePrototype.tsx`: On `exitHunt()` and `onPartyHuntExit`, instantly executes `gameNetwork.sendTeleport(32369, 32241, 7)` and suppresses `leaderMoved` packets for 2500ms (`followSuppressedUntilRef`) to guarantee clean, synchronized spawns inside Thais Temple.
  - Deduplicated character IDs in `prepareHuntCharacters` preventing avatar duplication.

### Bug 2: Duplicate Damage & Simultaneous Spell Casting
- **Root Cause:** Runes and offensive spells tracked separate tick flags (`usedRuneThisTick` and `usedSpellThisTick`), and runes only locked `groupCooldowns['rune']`, allowing an attack rune (e.g. Sudden Death, HMM, GFB) and an offensive spell (e.g. Exori, Exori Vis, Exevo Gran Mas Vis) to fire simultaneously on the exact same tick.
- **Solution:**
  - `packages/domain/src/combat.ts`: Unified offensive exhaust. Casting either a rune or an offensive spell enforces both `groupCooldowns['attack']` and `groupCooldowns['rune']` (2000ms). Introduced `usedOffensiveActionThisTick` per character per tick, strictly ensuring no character can cast more than 1 offensive spell or rune per tick.

### Bug 3: Authentic Visual Effects for Wands and Rods
- **Root Cause:** In `combat.ts`, projectile hits were hardcoded to `effectId: 10` (blood splash), omitting elemental wand visuals.
- **Solution:**
  - `packages/domain/src/combat.ts`: Mapped wands and rods to authentic Tibia projectile and impact visual effects:
    - Wand of Vortex / Cosmic Energy / Starfall: Projectile 4 (Energy spark) & Impact `effectId: 11` (CONST_ME_ENERGYHIT with 8 authentic animated frames).
    - Wand of Draconia / Dragonbreath: Projectile 3 & Impact `effectId: 15` (CONST_ME_HITBYFIRE).
    - Wand of Decay / Voodoo / Necrotic: Projectile 31 & Impact `effectId: 17` (CONST_ME_MORTAREA).
    - Snakebite Rod / Terra Rod: Projectile 14 & Impact `effectId: 8` (CONST_ME_GREEN_RINGS).
    - Moonlight Rod / Hailstorm Rod: Projectile 28 & Impact `effectId: 43` (CONST_ME_ICEATTACK).

### Visual Parity with Reference Images 1 to 5
- **Image 1: Friends Window (`FriendsWindow.tsx`):**
  - Header "Lista de amigos", subtitle "Veja quem está online e mantenha sua party por perto."
  - Search input with `[Adicionar]` button.
  - Online section `🟢 ONLINE (N)` with green indicator dots and level badges (`Lv. 188`).
  - Context menu on click / right-click with exact actions:
    1. "Mandar mensagem para [Name]"
    2. "Convidar para a party"
    3. "Remover dos amigos"
  - Footer with "Amigos: X | Online: Y" and `[Fechar]` button.
- **Image 2: Party Invitation Modal (`PartyInvitationModal.tsx`):**
  - Floating top card with blue crest shield SVG icon.
  - Gold uppercase title "CONVITE DE PARTY".
  - Text "[Nome] convidou você para a party" with vocation and level.
  - Primary gold `[ ENTRAR ]` and muted `[ RECUSAR ]` buttons.
- **Image 3: Hunt Selector Leader Controls (`HuntSelector.tsx`):**
  - Added highlighted blue button `[ Iniciar com o time ]` when player is party leader and has teammates.
- **Images 4 & 5: Group Hunt Approval Modal (`GroupHuntApprovalModal.tsx`):**
  - Top floating card with crossed swords badge and gold title "CONVITE DE CAÇADA EM GRUPO".
  - Subtitle "Juntando o time na chama mística para [HuntName].".
  - Status "X DE Y ACEITARAM".
  - Member table with role badges (`TANK`, `HEALER`, `DPS`), leader indicator (`LÍDER`), and checkmark (`✓`) or waiting indicator (`···`).
  - Dynamic button states (`[ CONFIRMAR PRESENÇA ]` / `[ CANCELAR ]`) and footer "Esperando os outros...".
  - Server auto-starts group hunt and teleports all party members together when all members accept.

---

## 2. Verification Results
- **TypeScript Typecheck:** `npm run typecheck` (`tsc --noEmit --incremental false`) -> **0 errors**.
- **Vitest Test Suite:** `npm test` -> **57/57 test files passed, 327/327 tests passed (100%)**.
  - New test suite `tests/phase57-bugfixes-visual-parity.test.ts` covers all bug fixes and visual parity contracts.

---

## 3. Modified Files
- `packages/domain/src/combat.ts`
- `packages/server/src/rooms/ThaisCityRoom.ts`
- `apps/web/lib/GameClientNetworkManager.ts`
- `apps/web/components/window/FriendsWindow.tsx`
- `apps/web/components/party/PartyInvitationModal.tsx`
- `apps/web/components/party/GroupHuntApprovalModal.tsx`
- `apps/web/components/HuntSelector.tsx`
- `apps/web/components/GamePrototype.tsx`
- `tests/phase56-multiplayer-party.test.ts`
- `tests/phase57-bugfixes-visual-parity.test.ts`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
