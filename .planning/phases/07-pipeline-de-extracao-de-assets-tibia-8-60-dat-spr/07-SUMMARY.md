---
phase: 07-pipeline-de-extracao-de-assets-tibia-8-60-dat-spr
plan: 01
subsystem: asset-pipeline
tags: [tibia-860, dat-parser, spr-parser, otb-resolution, png-export]
provides:
  - Parser binário do `Tibia.dat` (11.703 itens, 367 criaturas, 70 efeitos, 42 mísseis)
  - Parser binário do `Tibia.spr` (36.386 sprites)
  - Resolução da cadeia OTB Server ID → Client ID → Sprite IDs
  - Exportação de PNGs com verificação de integridade via SHA-256
  - Manifesto central `tibia860-assets.json` para criaturas, outfits, corpses, itens e cenário
tech-stack:
  added: []
  patterns: [binary-buffer-parsing, sprite-compositing, sha256-manifest-verification]
key-files:
  created:
    - packages/tibia860-assets/src/dat.ts
    - packages/tibia860-assets/src/spr.ts
    - packages/tibia860-assets/src/otb.ts
    - packages/tibia860-assets/src/extractor.ts
    - packages/tibia860-assets/src/png.ts
    - tests/tibia860-assets.test.ts
completed: 2026-09-01
---

# Phase 7: Pipeline de Extração de Assets Tibia 8.60 (DAT/SPR) Summary

Construção do extrator binário dos arquivos de assets do cliente oficial Tibia 8.60 e geração do catálogo gráfico da aplicação.

## Realizações
- Implementados parsers binários eficientes em TypeScript para os formatos `.dat` e `.spr`.
- Resolução precisa da equivalência entre IDs do servidor (OTB) e IDs de aparência do cliente (DAT/SPR).
- Exportados deterministamente 829 arquivos PNG para `public/generated/tibia860/` cobrindo itens, monstros, corpses, outfits e cenário de treino.
- Criado o manifesto `tibia860-assets.json` contendo mapeamento de direções, dimensões e hashes SHA-256 auditáveis.
- Testes confirmando reprodutibilidade exata byte-a-byte e preservação das fontes do cliente (`tests/tibia860-assets.test.ts`).
