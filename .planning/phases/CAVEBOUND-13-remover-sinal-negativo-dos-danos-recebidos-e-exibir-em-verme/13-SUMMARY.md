---
phase: 13-remover-sinal-negativo-dos-danos-recebidos-e-exibir-em-verme
plan: 01
subsystem: presentation-damage-text
tags: [pixijs, damage-indicator, authentic-tibia, visual-feedback]
provides:
  - Exibição de valores numéricos de dano em vermelho sem prefixo negativo (-)
  - Preservação do prefixo positivo (+) e cor verde para eventos de cura
  - Atualização dos mocks visuais da HeroScene
key-files:
  modified:
    - apps/web/components/PixiArena.tsx
    - apps/web/components/public/HeroScene.tsx
completed: 2026-09-02
---

# Phase 13: Remover sinal negativo dos danos recebidos e exibir em vermelho Summary

Ajuste do indicador visual de dano recebido e desferido na renderização PixiJS do jogo para respeitar o formato clássico do Tibia 8.60 (apenas valor numérico em vermelho, sem o sinal de menos `-`).

## Realizações
- Em `apps/web/components/PixiArena.tsx`, o texto flutuante de dano agora é formatado sem sinal negativo (ex: `18` em vermelho `#ff766b`), enquanto curas mantêm o prefixo `+` em verde (`#62e58a`).
- Em `apps/web/components/public/HeroScene.tsx`, os balões de dano na cena do hero foram alinhados para exibir `18` e `24` sem o prefixo `-`.
- Todos os 121 testes do Vitest e a checagem de tipos com TypeScript continuam passando com 100% de sucesso.
