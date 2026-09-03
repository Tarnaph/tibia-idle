---
phase: 08-multi-personagem-spells-promocao-e-cacadas-otbm
plan: 01
subsystem: multi-character-domain
tags: [party, 4-members, spells, promotion, otbm-hunts, bosses]
provides:
  - Grupo de até 4 membros de vocações distintas (Knight, Paladin, Sorcerer, Druid)
  - Isolamento estrito de inventário, equipamentos, habilidades e hotbars entre membros
  - Clocks independentes de movimento vs ataque
  - Sistema de conjuração de magias com custo de mana, cooldown e fórmulas por Magic Level
  - Sistema de promoção de vocação (20k gold, level 20)
  - 5 caçadas de 10 waves baseadas no mapa OTBM com chefes finais derivados
tech-stack:
  added: []
  patterns: [independent-actor-clocks, spell-formula-pipeline, variant-scaling]
key-files:
  created:
    - packages/domain/src/party.ts
    - packages/domain/src/spells.ts
    - packages/domain/src/promotion.ts
    - tests/phase8.test.ts
completed: 2026-09-01
---

# Phase 8: Multi-Personagem, Spells, Promoção e Caçadas OTBM Summary

Expansão completa do domínio para suportar grupo de múltiplos heróis, magias vocacionais, promoção e encontros com chefes.

## Realizações
- Implementada a estrutura de grupo com até 4 vocações únicas (Knight, Paladin, Sorcerer, Druid).
- Garantido isolamento total: equipar itens, treinar ou alterar hotbar em um membro não afeta o estado dos outros.
- Clocks de ataque e movimento desacoplados para jogadores e monstros.
- Implementado sistema de magias com validação de vocação, level, mana atual, cooldown e efeitos/mísseis visuais.
- Sistema de promoção vocacional autêntico (Elite Knight, Master Sorcerer, Elder Druid, Royal Paladin) aplicando ganhos de vida/mana por tick.
- 5 caçadas estruturadas de 10 waves com chefes baseados em multiplicadores dos monstros reais do Styller.
- Testes cobrindo toda a integração de party, spells, promoções e economia (`tests/phase8.test.ts`).
