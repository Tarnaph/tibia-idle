# Phase 58: Hunt Viewport Fullscreen, Unified Attack Cadence & Strict Party Target - Summary

## Executive Summary
Phase 58 resolved the black screen/viewport issue during hunt encounters, unified the offensive combat cadence to prevent duplicate damage/actions per tick, and established strict party target synchronization in multiplayer hunts.

## Completed Items

### 1. Viewport de Caçada Fullscreen 100%
- **`app/globals.css`**: Configured `.fullscreen-viewport`, `.pixi-arena`, and canvas styles with `position: absolute; inset: 0; width: 100%; height: 100%; overflow: hidden;` eliminating any black borders or letterboxing.
- **`apps/web/components/PixiArena.tsx`**: Added a native `ResizeObserver` observing `hostRef.current` that invokes `app.resize()`, dynamic reactive resize triggers on transition to hunt (`active = true`), and host style definitions.
- **`apps/web/components/GamePrototype.tsx`**: Rendered the hunt mode container using `fullscreen-viewport` with absolute inset positioning.

### 2. Cadência Ofensiva Única (2s) sem Duplicação de Dano
- **`packages/domain/src/combat.ts`**:
  - Unified offensive actions across basic wand/rod/weapon attacks and spells/runes:
    - Basic attacks advance `actor.nextAttackAt`, `actor.groupCooldowns['attack']`, and `actor.groupCooldowns['rune']` by `actor.attackIntervalMs`.
    - Offensive spells and runes advance `actor.nextAttackAt`, `actor.groupCooldowns['attack']`, and `actor.groupCooldowns['rune']` by `spell.groupCooldownMs`.
    - `usedOffensiveActionThisTick` guarantees at most 1 offensive spell or rune cast per tick.
  - In `defeatEnemy`: When a monster dies, `actor.targetId = null` is cleared and `actor.pendingAttack = null` is immediately discarded so no orphaned attack fires on a dead or missing target.

### 3. Lógica Estrita de Party Target
- **`packages/domain/src/spatial/movement.ts`**:
  - Guarded by `encounter.isMultiplayerParty`: Secondary party members in a multiplayer group strictly mirror the leader's target (`mainTargetEnemy`).
  - If the leader has no target or the target is defeated, followers do not acquire random targets; they clear `actor.targetId = null` and follow the leader.
- **`packages/domain/src/combat.ts`**:
  - In `playerAttacks` and `castAutomaticSpells`: Secondary members in multiplayer only engage the leader's target.

## Verification Results
- **TypeScript Typecheck (`npm run typecheck`)**: 0 errors.
- **Vitest Test Suite (`npm test`)**: 58/58 test files passed, 332/332 tests passed (100%).
