---
phase: 05-treinamento-funcional-de-habilidades
plan: 01
subsystem: progression-domain
tags: [training-room, skill-tries, vocation-multipliers, progression]
provides:
  - Arena de treino funcional (Training Room) com bonecos de treino (dummies)
  - Contabilização individual de tentativas de skill (`skillTries`)
  - Fórmulas de custo de avanço de skill com multiplicadores por vocação TFS
  - Reflexo imediato do aumento de skill no dano calculado
  - Especialização vocacional de treino (Melee, Distance, Magic Level)
tech-stack:
  added: []
  patterns: [exponential-progression, vocation-specialization]
key-files:
  created:
    - packages/domain/src/training.ts
    - apps/web/components/TrainingArena.tsx
    - tests/progression.test.ts
completed: 2026-09-01
---

# Phase 5: Treinamento Funcional de Habilidades Summary

Implementação do sistema de treinamento de habilidades em dummies com progressão de tentativas autêntica do TFS.

## Realizações
- Criada a Training Room visual com bonecos de treino e animações dedicadas.
- Implementado cálculo de avanço por tentativas acumuladas (`requiredSkillTries`), respeitando as constantes oficiais de vocação.
- Knights treinam a habilidade correspondente à arma equipada (Sword, Axe ou Club).
- Paladins treinam Distance e Magos (Sorcerer/Druid) treinam Magic Level.
- Aumento de skill reflete instantaneamente no cálculo de dano do personagem.
- Testes cobrindo progressão por vocação e reflexo de atributos (`tests/progression.test.ts`).
