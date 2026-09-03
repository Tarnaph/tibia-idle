---
phase: 10-camera-de-expedicao-e-controles-em-tempo-real
plan: 01
subsystem: presentation-camera
tags: [expedition-camera, smooth-camera, hot-swap, live-join, viewport]
provides:
  - Câmera dinâmica de mundo com suavização exponencial (`smoothWorldCamera` e `desiredWorldCamera`)
  - Centralização contínua no líder da party em movimento
  - Desacoplamento entre alvo da câmera e personagem selecionado para inspeção/UI
  - Troca de equipamentos em tempo real (hot-swap) preservando ataques já iniciados
  - Entrada ao vivo de novo membro na party sem reiniciar timers ou causar overlap
tech-stack:
  added: []
  patterns: [smooth-camera-damping, live-state-mutation, decoupled-focus-target]
key-files:
  created:
    - packages/presentation/src/camera.ts
    - apps/web/components/PixiArena.tsx
    - tests/expedition-camera.test.ts
completed: 2026-09-01
---

# Phase 10: Câmera de Expedição e Controles em Tempo Real Summary

Implementação da câmera de mundo dinâmica e capacidade de alterar equipamentos e grupo durante a execução de expedições ao vivo.

## Realizações
- Criado o algoritmo de câmera suave com amortecimento exponencial (`smoothWorldCamera`) e controle de zoom.
- Garantido que projéteis e coordenadas de mundo sejam transformados em conjunto no viewport sem desfasamento visual.
- Desacoplada a seleção de personagem na UI do tracking de câmera da arena.
- Implementado hot-swap de itens durante a caçada ativa: o jogador pode trocar escudo ou arma mantendo ataques já em andamento.
- Adição de novos membros à party durante combate ativo sem interromper clocks ou gerar conflitos de ocupação.
- Testes cobrindo comportamento da câmera e comandos ao vivo (`tests/expedition-camera.test.ts`).
