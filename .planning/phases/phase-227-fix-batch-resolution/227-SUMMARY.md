# Phase 227 Summary: Resolução Completa do Lote FIX.md

## Visão Geral
A Phase 227 implementou com sucesso a totalidade das 7 correções e melhorias catalogadas no `FIX.md`, divididas em 3 ondas lógicas com 0 erros de tipagem TypeScript e 100% de aprovação na suíte de testes Vitest.

---

### 🌊 Onda 1: Lógica de Domínio, Combate e Economia
1. **Exeta Res Restrito à Hotbar do Knight:**
   - Em `packages/domain/src/combat.ts` (`executeKnightChallenge`), adicionada validação estrita checando se o Knight possui a magia 93 (`Exeta res`) equipada e habilitada na hotbar (`knightChar.hotbar.includes(93)` e `hotbarConfigs.enabled !== false`). Se não estiver configurada, a magia não é conjurada pela IA, alinhando o Knight às mesmas regras das demais vocações.
2. **Bônus Permanente de Bestiário (+1% EXP na Conta por Criatura Concluída):**
   - Criado `packages/domain/src/bestiary.ts` com a tabela canônica `CANONICAL_BESTIARY_KILLS_NEEDED` e utilitários `getCompletedBestiaryCount` e `getBestiaryExpBonusPercent`.
   - Integrado ao cálculo de multiplicador de estágios (`getEffectiveExpMultiplier` em `progressionStages.ts`) e na concessão de experiência em combate (`grantSharedExperience` em `combat.ts`).
   - HUD superior (`WindowDockBar.tsx`) atualizado com badge dinâmico refletindo o ganho acumulado dos bestiários completados (ex: `EXP 50× (+3%)`).
3. **Paridade Real de Preços no Analisador de Caça (Fim do unitVal = 100 gp):**
   - Corrigido `GamePrototype.tsx` (linha 3091): substituído o valor arbitrário de 100 gp pela consulta ao catálogo de economia de NPCs (`preferredSellPrice(econItem)` e `canonicalSellPrice`), garantindo que o gold exibido no Hunt Analyzer reflita com 100% de precisão o montante obtido na venda na cidade.

---

### 🌊 Onda 2: Apresentação Urbana e Estabilidade de Memória em Thais City
1. **Fim da Animação de Caminhada em Falso ao Retornar à Cidade:**
   - Em `ThaisCityArena.tsx`, o ciclo de passos (`charWalkFrame`) foi desacoplado de flags estáticas de rota e atrelado estritamente à movimentação física real (`sample.moving` do `VisualMotionTrack`). Ao estar parado, o frame é fixado em 0 (pose neutra).
   - Em `GamePrototype.tsx`, o fluxo de retorno de caçada (`exitHunt`) agora limpa o `walkingPath` (`setWalkingPath(null)`), garantindo pose estática imediata no Templo de Thais.
2. **Resolução Definitiva de Vazamento de Memória ("Out of Memory") em Thais:**
   - Em `ThaisCityArena.tsx`, substituído `vis.root.destroy({ children: true })` por `destroyVisualNode(vis.root)` na reciclagem de `timedCityVisuals` e `actorViews`, garantindo que texturas de Text e Graphics sejam liberadas da GPU/heap do Chrome.
   - Texturas de canvas anteriores são explicitamente destruídas com `oldTex.destroy(true)` antes da alocação de novos frames em `Texture.from(canvas)`.

---

### 🌊 Onda 3: Renderização Multi-Tile e Carregamento Rápido de Hunts
1. **Renderização Correta de Objetos e Criaturas Multi-Tile (Paredes, Escadas e Corpos 2x2):**
   - Em `PixiArena.tsx`, tanto itens de cenário quanto corpos de criaturas calculam `wTiles` e `hTiles` a partir da resolução real da textura (`tex.width` e `tex.height`).
   - Aplicados deslocamentos canônicos `(wTiles - 1) * 32` e `(hTiles - 1) * 32`, garantindo que corpos grandes (Cyclops 64x64) e paredes altas (64px) não fiquem cortados ou no quadrante incorreto.
   - Camadas configuradas com `sortableChildren = true` e zIndex ordenado (chão em zIndex 0, paredes e obstáculos em `point.y + 16`).
2. **Carregamento Instantâneo de Caçadas (< 500ms):**
   - Limitado o lote bloqueante inicial de itens de mapa em `PixiArena.tsx` para 80 frames prioritários fundamentais, transferindo as variações secundárias de padrões para streaming assíncrono em background sem atrasar a inicialização da arena.

---

## Verificação e Qualidade
- **Typecheck:** 0 erros de tipagem TypeScript (`npm run typecheck`).
- **Suíte de Testes:**
  - `tests/phase227-wave1-bestiary-bonus-and-exeta.test.ts` (100% aprovado).
  - `tests/phase227-wave2-and-3.test.ts` (100% aprovado).
  - `tests/phase214-exeta-res-and-phantom-cooldown.test.ts` (100% aprovado).
- **FIX.md:** 7/7 itens concluídos e marcados com `[x]`.
