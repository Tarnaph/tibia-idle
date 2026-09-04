# Phase 43: Servidor de Jogo Autoritativo com Colyseus.js & Game Loop em Ticks - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning
**Mode:** Autonomous smart-discuss (`--auto`) — recommended defaults accepted

<domain>
## Phase Boundary

This phase delivers a **dedicated Node.js Colyseus game server** that owns simulation: 100ms ticks, OTBM collision, movement anti-cheat, monster AI/chase, TFS combat formulas, spells (`exori`, `exura`), potions, and dummy training.

Players join with `{ token, characterId }`. The server validates JWT + character ownership and injects the entity into a room.

**In scope:**
- Dedicated process `apps/game-server` using `@colyseus/core` + `@colyseus/ws-transport`
- Rooms: `ThaisCityRoom`, `HuntDungeonRoom`, `TrainingRoom`
- Authoritative `setSimulationInterval(100)` game loop
- Intent messages: `move`, `attack`, `castSpell`, `usePotion`
- Movement validation against OTBM walkability + `calculateStepDurationMs` (anti-noclip, anti-speedhack)
- Combat resolved 100% server-side using `packages/domain`
- Vitest coverage of server logic (join, move reject, combat, ticks)

**Out of scope (later phases):**
- Spatial interest management, combat visual event broadcast, chat (Phase 44)
- Frontend `colyseus.js` client, login/character screens, PixiJS consuming room.state (Phase 45)
- Prisma batch persist, `allowReconnection`, full E2E multiplayer (Phase 46)
- PvP between players
- New spells/monsters/maps beyond existing domain content
- Changing the existing singleplayer Pixi client in this phase

</domain>

<decisions>
## Implementation Decisions

### Process & package layout
- **D-01:** Dedicated Node process at `apps/game-server/` (not Next.js API routes, not Cloudflare Workers). Colyseus needs a long-lived tick loop.
- **D-02:** Dependencies: `colyseus`, `@colyseus/core`, `@colyseus/ws-transport`, `@colyseus/schema`. Default listen port `2567`.
- **D-03:** Simulation logic lives in `packages/game-server/` (pure, testable without binding a port). `apps/game-server` is the thin process entry (`listen`, transport, room register).
- **D-04:** Reuse `packages/domain` and `packages/auth` — do **not** rewrite combat/pathfinding/spells. Wrap them with a server clock and intent handlers.

### Rooms & join contract
- **D-05:** Three room types, registered by name:
  - `thais_city` → `ThaisCityRoom` (shared singleton city; movement + occupancy; no wild monster combat)
  - `hunt` → `HuntDungeonRoom` (filterBy `huntId`; monsters from existing hunt region content; chase + combat + corpse/respawn)
  - `training` → `TrainingRoom` (dummies; uses `advanceTraining` / skill-try formulas; dummies do not die)
- **D-06:** `onJoin` options: `{ token: string, characterId: string }`. Server calls `verifyAuthToken(token)`, loads character via Prisma `CharacterService`, checks `accountId` ownership, rejects banned accounts, rejects if that `characterId` is already online in any room.
- **D-07:** On successful join, spawn at persisted `posX/posY/posZ` (city) or hunt/training spawn tiles. Direction from persisted `direction`.
- **D-08:** One character online at a time. Duplicate join of the same character is rejected. Same account may not occupy two rooms with the same character.

### Movement validation (anti-cheat)
- **D-09:** Client sends **intent only**: `move` with `{ dir }` where `dir` is one of 8 Tibia directions (`north|south|east|west|northeast|northwest|southeast|southwest`). Server computes next tile. Never trust client coordinates.
- **D-10:** Walkability: reuse `isTileWalkable` / corner-blocking rules from `packages/domain/src/spatial/movement.ts` (`isMovementStepLegal` — no wall, no corner clip, destination unoccupied).
- **D-11:** Step clock: `baseStepDurationMs = calculateStepDurationMs(calculatePlayerSpeed(level, vocationBaseSpeed))`. Reject a step if `nowMs < lastStepAtMs + baseStepDurationMs` (anti-speedhack). Allow 1 tick (100ms) slack only to absorb interval jitter, never enough to skip a full step.
- **D-12:** Export `baseStepDurationMs` (alias/wrapper around `calculateStepDurationMs`) so tests and ROADMAP wording match.
- **D-13:** Occupancy is exclusive per tile for living creatures (existing domain invariant). Reject step onto occupied tile.

### Combat authority
- **D-14:** All damage, healing, mana spend, cooldowns, armor/defense, death, and monster respawn are resolved on the server. Client cannot apply HP changes.
- **D-15:** Messages: `attack { targetId }`, `castSpell { spellId, targetId? }`, `usePotion { potionId }`.
- **D-16:** Must work for Knight `exori` (SQUARE1x1 / 3×3 area) and healing `exura`, plus existing potion heal/mana from `hotbarActions`. Other learned spells may reuse domain spell formulas if already implemented.
- **D-17:** Hunt monsters chase with existing pathfinding (`moveEnemiesTowardParty` / A* melee approach). Training dummies never chase or die.
- **D-18:** City room does not run hunt combat. Attack/spell against players is rejected (no PvP this phase).

### Tick loop
- **D-19:** `this.setSimulationInterval(() => this.tick(), 100)` — 10 ticks/second, `elapsedMs += 100` per tick.
- **D-20:** Do **not** change `packages/domain` `MOVEMENT_TICK_MS = 120` for the existing singleplayer client. Server clock is 100ms; domain combat/move intervals stay in **milliseconds** (`nextAttackAt`, `nextMoveAt`, `attackIntervalMs`) compared against `elapsedMs`.
- **D-21:** Each tick: apply pending intents that passed validation → advance monster AI → resolve due attacks/spells/regeneration → emit in-memory combat events (schema broadcast is Phase 44; keep events on room for tests).

### State & persistence boundary
- **D-22:** Minimal `@colyseus/schema` so rooms have a state object (`players` map with id, name, x, y, z, direction, hp, maxHp). Full interest management and combat-event schemas are Phase 44 — do not build viewport filtering here.
- **D-23:** Load character from Prisma on join. **Do not** implement periodic auto-save or `allowReconnection` (Phase 46). `onLeave` drops the in-memory entity; `isOnline` may be toggled if cheap, but flush of XP/inventory is out of scope.
- **D-24:** Tests may inject an in-memory Prisma mock / fake character snapshot so Vitest does not require a live PostgreSQL.

### Claude's Discretion
- Exact Colyseus room class file split, schema field names beyond the minimum above, hunt spawn seeding, and how HuntDungeonRoom maps `huntId` → OTBM region.
- Whether city walkability uses a compact in-memory tile index extracted from existing Thais OTBM JSON/content vs a sliced TileMap — pick the approach that reuses existing importer output without loading the whole client sprite pipeline.
- Potion ID vs hotbar slot in `usePotion` payload — prefer potion item/server id consistent with `HOTBAR_POTIONS`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope
- `.planning/ROADMAP.md` — Phase 43 Goal, Requirements, Success Criteria (100ms ticks, JWT join, OTBM move validation, authoritative combat, Vitest)
- `.planning/PROJECT.md` — domain/presentation split, determinism, Node >= 22.13
- `.planning/STATE.md` — Phase 43 Ready to Plan; Phase 42 complete
- `.planning/phases/phase-42-postgresql-prisma-auth/42-SUMMARY.md` — Account/Character Prisma models, JWT claims, Thais temple spawn

### Auth & persistence (join path)
- `packages/auth/src/jwt.ts` — `createAuthToken` / `verifyAuthToken`, payload `{ accountId, email, role, isPremium }`
- `packages/auth/src/characterService.ts` — ownership, vocation kits, `THAIS_TEMPLE_SPAWN`
- `packages/auth/src/accountService.ts` — banned accounts, roles
- `prisma/schema.prisma` — `Account`, `Character` (`posX/posY/posZ`, `isOnline`, skills, inventory, spells)

### Simulation engine to wrap (do not rewrite)
- `packages/domain/src/combat.ts` — `advanceCombat`, armor/defense, death, `MOVEMENT_TICK_MS`
- `packages/domain/src/spatial/movement.ts` — `isMovementStepLegal`, occupancy, chase
- `packages/domain/src/spatial/tileMap.ts` — `isTileWalkable`, `positionKey`, occupancy map
- `packages/domain/src/spatial/pathfinding.ts` — A*, `findCityPath`, melee range
- `packages/domain/src/spatial/rooms.ts` — hunt OTBM region → TileMap
- `packages/domain/src/progression/speed.ts` — `calculatePlayerSpeed`, `calculateStepDurationMs` (TFS formula)
- `packages/domain/src/spells.ts` — formula range, unlock rules
- `packages/domain/src/hotbarActions.ts` — potions/runes/spells
- `packages/domain/src/training.ts` — `advanceTraining`, dummy skill tries
- `packages/domain/src/derivedStats.ts` — attack/defense/armor from equipment

### Tests / conventions
- `tests/phase42-postgresql-prisma-auth.test.ts` — phase test file pattern, JWT fixtures
- `vitest.config.ts` — `tests/**/*.test.ts`, node environment
- `package.json` — scripts `test`, `typecheck`; Node `>=22.13.0`

No Colyseus code exists yet. No `.planning/codebase/` maps.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/domain` — full idle/Tibia simulation (combat, spatial, spells, training, hunts)
- `packages/auth` — JWT + Prisma account/character services
- `packages/database` — `getPrismaClient()` (throws in browser)
- `packages/content-schema` + `content/generated/*.json` — monsters, spells, hunt regions, vocations
- `calculateStepDurationMs` / `calculatePlayerSpeed` — canonical step clock (not the hunt helper `stepDuration()` clamp in `movement.ts`)

### Established Patterns
- Headless domain: pure functions, seeded RNG, Vitest in `tests/`
- Phase tests named `tests/phaseNN-*.test.ts`
- Auth services take `PrismaClient` in the constructor (easy to mock)
- Strict TypeScript, path alias `@/*` → repo root
- Single package.json at repo root (not a formal npm workspaces monorepo)

### Integration Points
- New `apps/game-server` process alongside existing `vinext` web app
- Join consumes Phase 42 JWT + Prisma characters
- Rooms wrap domain; do not import Pixi/`apps/web`
- `npm run test` / `npm run typecheck` must stay green including new suite

### Creative options
- Headless `GameLoop` class testable without Colyseus, then Room delegates to it — preferred for Vitest
- Colyseus `@colyseus/testing` optional; not required if GameLoop unit tests cover success criteria

</code_context>

<specifics>
## Specific Ideas

- ROADMAP names `baseStepDurationMs` — implement as named export wrapping TFS `calculateStepDurationMs`.
- Success criteria explicitly require `exori` and `exura`.
- Thais temple spawn already locked: `{ x: 32369, y: 32241, z: 7 }`.
- Keep the existing browser singleplayer prototype working; this phase adds the server beside it.

</specifics>

<deferred>
## Deferred Ideas

- Spatial Interest Management 15×11, combat visual broadcast, chat `/say` `/yell` — Phase 44
- `colyseus.js` frontend, auth/character UI, Pixi interpolating `room.state` — Phase 45
- Prisma batch save, `allowReconnection(20)`, E2E multiplayer — Phase 46
- PvP, GM commands `/kick` `/ban` `/teleport`, `@colyseus/monitor` — Phase 45
- None of these should leak into Phase 43 plans

</deferred>

---

*Phase: 43-Servidor de Jogo Autoritativo com Colyseus.js & Game Loop em Ticks*
*Context gathered: 2026-04-09*
