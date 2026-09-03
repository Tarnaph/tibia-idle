---
phase: 01-motor-de-simulacao-e-combate-idle
plan: 01
subsystem: simulation-domain
tags: [idle-combat, rng, tfs-formulas, tick-engine]
provides:
  - Loop de combate em ticks (120ms) desacoplado da interface
  - RNG determinístico baseado em semente (seed)
  - Curva cumulativa de experiência do TFS
  - Cooldowns e intervalos de ataque independentes
  - Encontros de 10 waves com chefes baseados em monstros reais
tech-stack:
  added: [vitest, typescript]
  patterns: [pure-functional-domain, immutable-state-snapshots]
key-files:
  created:
    - packages/domain/src/combat.ts
    - packages/domain/src/rng.ts
    - packages/domain/src/experience.ts
    - tests/domain.test.ts
completed: 2026-09-01
---

# Phase 1: Motor de Simulação e Combate Idle Summary

Construção da engine matemática de combate em ticks com determinismo via seed e cálculo fiel de experiência oficial do Tibia TFS.

## Realizações
- Implementado loop de combate discreto em passos de 120ms.
- Garantido determinismo estrito: a mesma seed produz exatamente os mesmos desfechos de combate.
- Implementada a curva oficial cumulativa de XP do TFS (`experienceForLevel`).
- Cooldowns e temporizadores de ataque implementados de forma independente para atores e monstros.
- Suíte de testes automatizados cobrindo combate, acúmulo de XP e determinismo (`tests/domain.test.ts`).
