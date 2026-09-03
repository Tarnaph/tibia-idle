---
phase: 11-economia-de-party-loot-pouch-e-ux-estrutural
plan: 01
subsystem: economy-and-ux
tags: [loot-pouch, party-economy, inventory-weight, capacity, shared-xp]
provides:
  - Bolsa de saques (Loot Pouch) com travas de proteção (`lockSell`) e preferências (`autoLoot`, `quickSell`)
  - Venda atômica de stacks de itens elegíveis utilizando os preços reais de NPCs do Styller
  - Cálculo dinâmico de capacidade máxima (`characterCapacity`) e peso acumulado (`inventoryWeight`)
  - Suporte a reorganização de mochilas (reorder via drag-and-drop e clique)
  - Divisão proporcional e bonificada de experiência compartilhada entre vocações distintas
tech-stack:
  added: []
  patterns: [loot-lock-protection, weight-capacity-derivation, shared-party-rewards]
key-files:
  created:
    - packages/domain/src/economy.ts
    - apps/web/components/EquipmentPanel.tsx
    - apps/web/components/BottomDock.tsx
    - tests/party-economy-camera.test.ts
    - tests/structural-ux.test.ts
completed: 2026-09-01
---

# Phase 11: Economia de Party, Loot Pouch e UX Estrutural Summary

Desenvolvimento do sistema completo de Loot Pouch, precificação por NPCs, mecânicas de peso/capacidade e UX da interface de itens.

## Realizações
- Criado o painel de Loot Pouch com travas explícitas (`lockSell`) que impedem a venda acidental de itens preciosos ou de treino.
- Implementada venda de stacks completos (`sellLootStack` e `sellAllLoot`) convertendo itens em gold com preços auditados.
- Implementadas as regras clássicas de capacidade e peso do Tibia por vocação e nível.
- Interface de inventário com reorganização de itens em mochilas e feedback visual de peso.
- Divisão de XP da party com aplicação do multiplicador oficial de vocações distintas.
- Testes cobrindo preferências de loot, vendas protegidas, cálculos de peso e estabilidade de rotas (`tests/structural-ux.test.ts`).
