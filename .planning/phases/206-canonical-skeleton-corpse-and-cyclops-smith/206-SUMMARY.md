# Phase 206 Summary: Canonical Skeleton Corpse & Cyclops Smith Hunt Integration

## Overview
A Fase 206 resolveu com precisão dois pontos essenciais do roadmap de caçadas e fidelidade canônica do Tibia (`FIX.md`):

1. **Substituição Canônica dos Cadáveres em Caçadas por Corpo de Skeleton (Item 5972 / remains of a skeleton)**:
   - Em vez de pedaços multi-tile cortados de monstros grandes ou sprites ausentes, todos os inimigos derrotados nas caçadas agora deixam no chão o cadáver canônico clássico de Skeleton (`item-5972.png` / sprite 3853 do Tibia).
   - O sprite 3853 é perfeitamente dimensionado em 32x32 (1x1 sqm), centralizando exatamente na grade de piso do tile sem sobrepor paredes, quinas ou gerar artefatos visuais.
   - Textura adicionada aos `priorityUrls` em `PixiArena.tsx`, garantindo que o cadáver de ossos apareça instantaneamente no frame de impacto da morte.
   - No domínio TypeScript (`defeatEnemy`), preserva-se o determinismo e integridade dos testes de backend.

2. **Integração Integral do Cyclops Smith na Escolha da Caçada e no Jogo**:
   - **Definição da Caçada (`hunt.ts`)**: Adicionado `'cyclops-smith'` ao array canônico `monsters: ['cyclops', 'cyclops-smith']` do Acampamento dos Ciclopes (`cyclops-camp`).
   - **Seleção de Caçada (`HuntSelector.tsx`)**: O card do catálogo agora exibe "Cyclops, Cyclops Smith". Na tela de setup do pull (Ousado e Agressivo), o card da criatura Cyclops Smith é exibido com sua miniatura canônica, botão de Detalhes, stats e tabela agregada de loot (com itens raros como Battle hammer, Heavy machete, Dark helmet, Spiked squelcher e Strong health potion).
   - **Bestiário da Cyclopedia (`cyclopediaData.ts`)**: Registrado `Cyclops Smith` com dificuldade `Difícil`, 3 estrelas, 435 HP, 255 EXP, resistências elementais e tabela oficial de drops.
   - **Texture Atlas do Acampamento dos Ciclopes (`hunt-cyclops-camp-atlas.json` e `.png`)**: Reconstruído com border-extrusion de 1px contendo todos os 12 frames direcionais de caminhada do Cyclops Smith (lookType 277), permitindo animação fluida e renderização imediata na arena.

---

## Verificação & Testes
- **TypeScript**: 0 erros (`npm run typecheck` passou com código de saída 0).
- **Testes Vitest**: 7/7 testes aprovados em `tests/phase206-canonical-skeleton-corpse-and-cyclops-smith.test.ts`.
- **Testes de Regressão**: 21/21 testes aprovados (`phase193`, `phase195`, `phase196`).
