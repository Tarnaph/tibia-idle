# Phase 43: Servidor de Jogo Autoritativo com Colyseus.js & Game Loop em Ticks - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-09
**Phase:** 43-Servidor de Jogo Autoritativo com Colyseus.js & Game Loop em Ticks
**Areas discussed:** Process layout, Rooms & join, Movement anti-cheat, Combat & tick
**Mode:** `--auto` (autonomous) — recommended option selected for every question

---

## Process & package layout

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated `apps/game-server` + `packages/game-server` | Long-lived Node process, domain wrap in a testable package | ✓ |
| Colyseus inside Next.js API / Vinext | Would fight the 100ms tick loop and Workers types | |
| Rewrite domain inside the server | Duplicates TFS formulas already in `packages/domain` | |

**User's choice:** [auto] Accept all recommended
**Notes:** ROADMAP requires a dedicated Node process. Existing `vinext` app is not a game loop host.

---

## Rooms & join contract

| Option | Description | Selected |
|--------|-------------|----------|
| Three rooms + JWT `{ token, characterId }` | `thais_city`, `hunt` (filterBy huntId), `training`; ownership + ban + duplicate-online checks | ✓ |
| Single mega-room for city+hunt+training | Mixes occupancy/combat rules; harder tests | |
| Trust client character snapshot | Breaks Phase 42 as source of truth | |

**User's choice:** [auto] Accept all recommended
**Notes:** PvP deferred. Persistence flush deferred to Phase 46.

---

## Movement anti-cheat

| Option | Description | Selected |
|--------|-------------|----------|
| Intent `{ dir }` + OTBM walkability + `calculateStepDurationMs` | Anti-noclip + anti-speedhack with 1-tick slack | ✓ |
| Trust client `x,y,z` | Enables teleport/speedhack | |
| Use hunt `stepDuration()` clamp (420–1100ms) | Not the TFS formula; ROADMAP names `baseStepDurationMs` | |

**User's choice:** [auto] Accept all recommended

---

## Combat authority & tick

| Option | Description | Selected |
|--------|-------------|----------|
| 100ms `setSimulationInterval`; domain formulas in ms; `attack`/`castSpell`/`usePotion` | Matches ROADMAP; `exori` + `exura` required | ✓ |
| Change domain `MOVEMENT_TICK_MS` from 120 → 100 | Would perturb existing singleplayer tests | |
| Schema interest management + chat in this phase | Phase 44 scope | |

**User's choice:** [auto] Accept all recommended

---

## Claude's Discretion

- Hunt spawn seeding, schema field names, city tile-index source, potion payload id vs slot.

## Deferred Ideas

- Phase 44: interest management, combat FX broadcast, chat
- Phase 45: frontend client + auth UI + monitor
- Phase 46: Prisma batch persist + reconnection + E2E
