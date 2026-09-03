---
phase: 02-sistema-de-equipamento-e-atributos-derivados
plan: 01
subsystem: equipment-domain
tags: [equipment, slots, derived-stats, tfs-armor]
provides:
  - Gerenciamento de 6 slots corporais (head, armor, legs, boots, leftHand, rightHand)
  - Starter loadout autêntico do Knight baseado no `firstitems.lua`
  - Derivação de ataque por armas (Sword, Axe, Club) vinculadas à skill ativa
  - Defesa por escudo e redução por armadura
  - Validação e rejeição de slots incompatíveis
tech-stack:
  added: []
  patterns: [derived-computations, slot-constraints]
key-files:
  created:
    - packages/domain/src/equipment.ts
    - packages/domain/src/derivedStats.ts
    - tests/equipment.test.ts
completed: 2026-09-01
---

# Phase 2: Sistema de Equipamento e Atributos Derivados Summary

Implementação do sistema de equipamentos por slots corporais e fórmulas de atributos derivados conforme a engine TFS.

## Realizações
- Criado o modelo de slots corporais: `head`, `armor`, `legs`, `boots`, `leftHand`, `rightHand`.
- Incorporado o loadout inicial clássico do Knight (`firstitems.lua`: Soldier Helmet, Brass Armor, Brass Legs, Leather Boots, Steel Axe, Dwarven Shield).
- Derivação de ataque associada dinamicamente à skill ativa correspondente à arma equipada (Sword, Axe, Club).
- Defesa e armor calculados conforme regras do TFS.
- Testes cobrindo trocas de itens, rejeição de slots incompatíveis e determinismo de combate com loadouts alterados (`tests/equipment.test.ts`).
