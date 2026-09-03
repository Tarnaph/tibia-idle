---
phase: 09-rotas-de-caca-continuas-continuous-hunt-routes
plan: 01
subsystem: continuous-hunt
tags: [continuous-routes, loop-hunting, dynamic-respawn, rare-spawns, otbm-regions]
provides:
  - Rotas de caça contínuas em loop no mapa aberto do OTBM
  - Zonas de respawn pré-populadas ao longo do percurso
  - Temporizadores de respawn com verificação de distância segura (sem spawn em cima da party)
  - Variantes raras de monstros com auras visuais e multiplicadores de combate/recompensa
  - Saída segura da caçada sem perda de experiência ou tempo de treino acumulado
tech-stack:
  added: []
  patterns: [spatial-patrol-route, safe-respawn-distance, rare-variant-generation]
key-files:
  created:
    - packages/domain/src/huntRoute.ts
    - packages/domain/src/hunt.ts
    - tests/continuous-hunt.test.ts
completed: 2026-09-01
---

# Phase 9: Rotas de Caça Contínuas (Continuous Hunt Routes) Summary

Evolução das caçadas para rotas contínuas em loop no mapa aberto com zonas de respawn dinâmicas e surgimento de monstros raros.

## Realizações
- Substituído o modelo de salas fechadas por rotas de percurso contínuo sobre os mapas extraídos do OTBM.
- Respawns pré-populados de forma distribuída ao longo dos caminhos navegáveis.
- Regra de respawn seguro: monstros derrotados só ressurgem se a party estiver a uma distância mínima do centro do respawn.
- Mecânica de monstros raros acionada por seed probabilística, aplicando auras visuais e multiplicadores de XP/loot.
- Implementada a ação `leaveHunt` permitindo interromper ou trocar de rota mantendo o progresso da sessão intacto.
- Testes cobrindo ciclo de rotas, respawns seguros e integridade de sessão (`tests/continuous-hunt.test.ts`).
