# Phase 68: Death Penalty, Classic Death Modal, and Admin Configuration Summary

## Executive Summary

Phase 68 implemented the authentic Tibia death experience:
1. **Authentic Classic "Você está morto" Modal in Portuguese**: A pixel-accurate modal matching the classic Tibia client UI, displaying the canonical lore text in Portuguese, dark beveled background, engraved divider, and clickable "Ok" and "Cancelar" buttons.
2. **Visual Penalty Breakdown in Modal (Lista de Perdas Detalhada)**:
   - Exact XP Lost & Remaining (`-X XP (-10%)` with previous and new XP).
   - Character Level / De-leveling alert (`🔻 Nível: Reduzido de X ➔ Y (De-level!)` or `🛡️ Nível: Mantém Nível X`).
   - Skills Reduced breakdown grid (`Skill: Before ➔ After (-Loss)`).
   - Hunt Loot Lost counter and item badges with authentic `ItemSprite` icons.
   - Protective reassurance that equipped gear and base backpack (`bag`) are preserved.
3. **Comprehensive Death Penalty Mechanics**:
   - 10% Experience Loss calculated and deducted upon respawn.
   - De-leveling support: If the player's XP drops below the threshold for their current level (calculated via `levelForExperience`), the character is accurately de-leveled.
   - 10% Skill Loss across all combat skills (`axe`, `club`, `sword`, `distance`, `shielding`, `fist`, `magic`).
   - Loss of Hunt Loot: All loot collected during the hunt (`session.loot`) is dropped/cleared on death, while player gear and base bag items remain safe.
   - Temple Respawn: Character HP and MP are restored, hunt mode is disengaged, and the character is positioned in Thais Temple (`32369, 32241, 7`) with a walk target to Thais Depot/plaza.
4. **Dynamic Admin Panel Integration**:
   - Added server configuration fields: `deathPenaltyExpPercent` (default: 10%), `deathPenaltySkillPercent` (default: 10%), and `deathPenaltyLoseLoot` (default: true).
   - Dedicated UI card in `/admin` under "Variáveis do Servidor" with range sliders and switches allowing dynamic real-time adjustment of penalties.
5. **Validation**:
   - 6 dedicated unit and integration tests passing in Vitest (`phase68-death-penalty-and-modal.test.ts`).
   - 0 TypeScript compiler errors across the entire codebase.

---

## Changes Made

### 1. Domain & Server Config
- [packages/server/src/config/ServerConfigManager.ts](file:///c:/Users/rapha/Documents/Tibia%202/packages/server/src/config/ServerConfigManager.ts): Added `deathPenaltyExpPercent`, `deathPenaltySkillPercent`, and `deathPenaltyLoseLoot` to `ServerConfig`, `defaultConfig`, and `updateConfig`.
- [packages/domain/src/experience.ts](file:///c:/Users/rapha/Documents/Tibia%202/packages/domain/src/experience.ts): Exported `levelForExperience(experience: number): number` for accurate de-leveling.
- [packages/domain/src/combat.ts](file:///c:/Users/rapha/Documents/Tibia%202/packages/domain/src/combat.ts): Implemented `calculateDeathPenaltyReport` and `respawnInTemple` with `DeathPenaltyOptions` support to calculate XP loss, de-leveling, skill loss, and hunt loot loss while maintaining equipped items.

### 2. Client UI & Interactions
- [apps/web/components/DeathModal.tsx](file:///c:/Users/rapha/Documents/Tibia%202/apps/web/components/DeathModal.tsx): Created authentic modal component styled with Tibia classic 90s/2000s beveled border, engraved lines, canonical lore text in Portuguese, and an inset dark preview card listing all penalties (XP, level/de-level, skills, loot lost with `ItemSprite` icons, and bag protection notice).
- [apps/web/components/GamePrototype.tsx](file:///c:/Users/rapha/Documents/Tibia%202/apps/web/components/GamePrototype.tsx): Integrated `DeathModal`, overhead animated `"You are dead."` floating text on player death, and `handleConfirmDeath` which dispatches `respawnInTemple` with admin-configured penalty values and logs penalty notifications in server chat.
- [apps/web/components/admin/AdminPanel.tsx](file:///c:/Users/rapha/Documents/Tibia%202/apps/web/components/admin/AdminPanel.tsx): Added death penalty control card to Server Variables tab.

### 3. Tests
- [tests/phase68-death-penalty-and-modal.test.ts](file:///c:/Users/rapha/Documents/Tibia%202/tests/phase68-death-penalty-and-modal.test.ts): Verified:
  - 10% XP deduction and de-leveling.
  - 10% skill reduction across all skills.
  - Hunt loot clearance without affecting bag or equipment.
  - Dynamic admin config penalties (custom percentages).
  - `calculateDeathPenaltyReport` computing exact XP losses, de-level flag, skill changes, and loot list.

---

## Verification

- `npx vitest run tests/phase68-death-penalty-and-modal.test.ts`: 6/6 passing (100%).
- `npm run typecheck`: 0 errors.
