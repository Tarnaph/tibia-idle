---
phase: 06-importadores-de-conteudo-styller-xml-otbm
plan: 01
subsystem: content-import
tags: [styller, xml-parser, otbm, content-schema, read-only]
provides:
  - Leitura somente leitura de arquivos XML e binários em `styller-master/`
  - Normalização de monstros (`monsters.json`), magias (`spells.json`), vocações (`vocations.json`) e loadouts (`starter-loadouts.json`)
  - Catálogo de equipamentos (`equipment.json`) derivado de `items.otb`, `items.xml` e `items.lua`
  - Catálogo de economia de NPCs (`item-economy.json`)
  - Extração de 5 mapas de caça do OTBM (`hunt-regions.json`) com classificação de walkability
tech-stack:
  added: [fast-xml-parser]
  patterns: [immutable-import, schema-validation, otbm-tile-classification]
key-files:
  created:
    - packages/styller-importer/src/cli.ts
    - packages/styller-importer/src/importMonsters.ts
    - packages/styller-importer/src/importEquipment.ts
    - packages/styller-importer/src/importEconomy.ts
    - packages/styller-importer/src/importHuntRegions.ts
    - packages/content-schema/src/index.ts
    - tests/importer.test.ts
completed: 2026-09-01
---

# Phase 6: Importadores de Conteúdo STYLLER (XML / OTBM) Summary

Criação dos importadores automatizados de conteúdo em tempo de compilação a partir das fontes originais do servidor Styller OpenTibia.

## Realizações
- Importador 100% somente leitura: arquivos originais em `styller-master/` nunca são modificados.
- Extraídos atributos de 12 monstros, 21 equipamentos, 8 vocações, 16 magias e 50 itens de economia.
- Extraídas 5 regiões reais do mapa `data/world/styller.otbm` com análise detalhada de flags de itens para determinação de tiles caminháveis vs obstáculos.
- Validação tipada rigorosa com TypeScript em `packages/content-schema/`.
- Testes garantindo imutabilidade das fontes e fidelidade dos dados importados (`tests/importer.test.ts`).
