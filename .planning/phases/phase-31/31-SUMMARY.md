# Phase 31 Summary: Migração para Tibia 10.98 DAT/SPR e Renderização Autêntica do Mapa Global de Thais

## 1. Contexto e Motivação
Anteriormente, o sistema utilizava os arquivos `Tibia.dat` e `Tibia.spr` do Tibia 8.60 (`tibia-860-client`). Com a evolução para a base do Tibia 11 e a integração do mapa global `realmap.otbm` (extraído do servidor `realmap11`), os client IDs definidos no `items.otb` oficial correspondiam à versão **Tibia 10.98**. Por conta desse descasamento de versões, os pisos, paredes, colunas e objetos da cidade de Thais não tinham correspondência correta ou recorriam a pisos genéricos de dungeon (`trainingFloor`/`trainingWall`), dando a impressão visual de estar em uma parte aleatória do mapa.

## 2. Implementações Realizadas

### 2.1 Parser e Pipeline de Assets para Tibia 10.98
- Decodificação do binário oficial `Tibia 11/Tibia 11/Tibia 11/Tibia.dat` (assinatura `0x42A3`, 23.725 itens, 903 criaturas, 175 efeitos, 54 mísseis) com suporte a atributos de mercado e deslocamento de flags pós-10.10.
- Decodificação do binário oficial `Tibia 11/Tibia 11/Tibia 11/Tibia.spr` (assinatura `0x57BBD603`, 338.944 sprites com índices de 32-bit).
- Mapeamento direto de `realmap11/data/items/items.otb` (32.155 itens mapeados).

### 2.2 Extração Completa de Itens de Thais (`scripts/extract-tibia1098-thais.mjs`)
- Extraídos 244 itens exclusivos presentes nos 1.836 tiles da cidade de Thais (`public/generated/tibia1098/items/item-${id}.png`).
- Exportado catálogo estruturado em `content/generated/tibia1098-thais-assets.json` e integrado em `content/generated/tibia860-assets.json` (`mapItems`).
- Resolução e extração de marcos autênticos:
  - Pisos xadrez do Templo de Thais (`item-406.png`, `item-407.png`).
  - Colunas de mármore do templo (`item-1515.png`, `item-1481.png`).
  - Altar sagrado do templo (`item-1448.png`).
  - Paredes de pedra autênticas (`item-1049.png` a `item-1057.png`).
  - Baús e balcões de madeira do Depot (`item-2598.png`, `item-1618.png` a `item-1645.png`).

### 2.3 Renderização com Profundidade 2.5D no Pixi (`ThaisCityArena.tsx`)
- Divisão rigorosa em duas camadas:
  1. `terrainLayer`: Desenha pisos e chão (`isGround: true`), cobrindo 99.95% dos tiles de Thais com piso autêntico.
  2. `objectsLayer`: Desenha paredes, colunas, altares, estátuas e balcões com ordenação de profundidade `zIndex = py + 32` e compensação de altura `offsetY = -(height - 32)` para itens multi-tile.
- Remoção de decorativos provisórios no corredor do depot.
- Personagens e party caminham e respiram dentro do autêntico Templo de Thais e da cidade histórica.

---

## 3. Validação e Qualidade
- **Testes Automatizados:** Nova suíte `tests/phase31-tibia1098-thais-assets.test.ts` adicionada e validada.
- **Vitest:** **193 testes passando em 26 suítes (100% de aprovação)**.
- **TypeScript:** `npm run typecheck` com **0 erros**.
