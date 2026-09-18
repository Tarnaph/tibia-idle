# Phase 195: Hunt System Rework (Two-Screen Catalog, Pull Size Difficulties & Monster Variants) & PvP Arena Loading Fix

## Context & Objectives
1. **PvP Arena Loading Fix**:
   - Investigate and eliminate the hang where 2 players accepting a PvP duel get permanently stuck on the loading screen and have to restart the client.
   - Root causes:
     - `sceneReadyNotified` in `PixiArena.tsx` was not reset when transitioning into hunt mode, preventing `onSceneReady` from firing.
     - `isLoadingActive` in `GamePrototype.tsx` had `mode === 'hunt' && !isArenaReady`, causing an infinite loading screen loop when `onFinish` had already cleared the pending transition.
     - `getHuntWorldEntrance` returned `(0, 0, 0)` for `pvp-arena` on server `ThaisCityRoom.ts`, causing player coordinate corruption.
     - Add safety timeouts in `ExuraLoadingScreen` and `GamePrototype` ensuring loading screens always dismiss reliably.

2. **Hunt System Overhaul (Visual & Mechanical Parity with References)**:
   - **Screen 1 (Catalog Grid)**:
     - Header: `Organizar caçada` with close button `[x]`.
     - Navigation tabs: `[ CAÇADAS ]` (active), `[ TREINO ]`, `[ QUESTS ]`, `[ ARENA ]`, `[ BOSSES ]`.
     - Subheader: `< Caçadas`, `★ Favoritos`, `Organizar caçada` (selected pill), `Encontrar time`.
     - Search input: `Buscar uma caçada ou criatura` + counter of available hunts.
     - 4-column grid of hunt cards with creature sprite, hunt name, favorite star toggle, monster names, Solo & Party XP/h and GP/h stats.
     - Clicking a card navigates to Screen 2.
   - **Screen 2 (Hunt Details & Pull Size)**:
     - Header: Title, star, lore text, and `Seu recorde` box (`Solo XP/h | gp/h`).
     - "Tamanho do pull" difficulty selector:
       - **Cauteloso (Fácil)**: 2-3 monsters per pack. Base creature.
       - **Ousado (Médio)**: 4 monsters per pack. Mid-tier creature added (e.g. Elf Scout, Cave Rat, Cyclops Smith).
       - **Agressivo (Difícil)**: 5-6 monsters per pack. Apex creature added (e.g. Elf Arcanist, Dragon Lord).
     - "Monstros deste pull": Miniature creature sprites with name and `[ DETALHES ]` button linking to Bestiary.
     - "Loot possível": Table with item sprite, name, rarity badge (`Comum`, `Incomum`, `Muito raro`) and `PEGAR` / `VENDER` checkboxes.
     - Footer: `< Voltar ao catálogo`, `Fechar`, and `[ Iniciar caçada ]` / `[ Iniciar com time ]`.
   - **Domain & Engine**:
     - Parameterize `createContinuousHuntRoute` and `restartHunt` with `pullSize?: HuntPullSize`.
     - Scale respawn zone monster counts (`[2, 3]`, `[4, 4]`, `[5, 6]`) and dynamically inject variant monster pools.

## Verification Gates
- Vitest tests covering pull size scaling, monster pool variants, loot preferences, and PvP Arena transition safety.
- Typecheck with 0 TypeScript errors.
- Build and deployment to VPS with HTTP 200 verification.
