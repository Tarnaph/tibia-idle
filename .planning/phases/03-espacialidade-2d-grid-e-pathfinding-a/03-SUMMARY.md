---
phase: 03-espacialidade-2d-grid-e-pathfinding-a
plan: 01
subsystem: spatial-domain
tags: [2d-grid, pathfinding, a-star, tile-occupancy, rooms]
provides:
  - Sistema de grade espacial discreta (x, y, z)
  - Algoritmo A* pathfinding otimizado para grid 2D
  - Proteção anti corner-clipping em quinas ortogonais fechadas
  - Ocupação atômica por tile para criaturas vivas (`occupancy`)
  - Máquina de estados de salas (`RoomPhase`) e aproximação corpo-a-corpo (melee)
tech-stack:
  added: []
  patterns: [a-star-search, tilemap-indexing, spatial-hash]
key-files:
  created:
    - packages/domain/src/spatial/tileMap.ts
    - packages/domain/src/spatial/pathfinding.ts
    - packages/domain/src/spatial/movement.ts
    - packages/domain/src/spatial/rooms.ts
    - packages/domain/src/spatial/types.ts
    - tests/spatial.test.ts
completed: 2026-09-01
---

# Phase 3: Espacialidade 2D, Grid e Pathfinding A\* Summary

Implementação da física de grade 2D, navegação com A* e máquina de ocupação atômica de tiles para combate espacial.

## Realizações
- Criado o sistema de `TileMap` discreto com coordenadas tridimensionais (x, y, z).
- Implementado algoritmo A* garantindo que obstáculos nunca sejam transpostos e quinas diagonais bloqueadas impeçam atravessamento (anti corner-clipping).
- Sistema de reserva e ocupação estrita por tile: duas criaturas vivas nunca compartilham a mesma posição lógica.
- Movimentação inteligente de perseguição até a distância de golpe corpo-a-corpo (`isMeleeRange`).
- Máquina de fases de sala implementada (`entering` -> `combat` -> `room-cleared` -> `exiting` -> `transitioning`).
- Testes cobrindo bloqueio de paredes, integridade de ocupação e reprodução com seed idêntica (`tests/spatial.test.ts`).
