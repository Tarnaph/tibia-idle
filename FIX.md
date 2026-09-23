# FIX.md - Lote Ativo de Correções e Melhorias

## 🎯 Lote Ativo:
*(Nenhum item pendente no momento. Todos os problemas e melhorias autorizados foram resolvidos e validados com 100% de sucesso).*

---

## ✅ Concluído (Fase 227):

- [x] **Exeta Res apenas se configurado nas Hotkeys do Knight:**
  - `executeKnightChallenge` em `packages/domain/src/combat.ts` agora valida estritamente a presença e ativação da magia `Exeta res` (spell ID 93) na hotbar do Knight (`knightChar.hotbar.includes(93)` e `hotbarConfigs.enabled !== false`), respeitando as mesmas regras de todas as magias.

- [x] **Bônus Permanente de Bestiário (+1% EXP na Conta por Criatura Concluída):**
  - Implementado em `packages/domain/src/bestiary.ts` com cálculo de criaturas completas (`getCompletedBestiaryCount` e `getBestiaryExpBonusPercent`).
  - Integrado ao multiplicador efetivo de experiência (`getEffectiveExpMultiplier` / `progressionStages.ts`) e na concessão de experiência em combate (`grantSharedExperience`).
  - Refletido no HUD superior (`WindowDockBar.tsx`), exibindo claramente o ganho acumulado dos bestiários completados (ex: `EXP 50× (+3%)`).

- [x] **Correção da Animação de Caminhada em Falso ao Retornar a Thais:**
  - Sincronização visual em `ThaisCityArena.tsx` corrigida: a animação de passos (`charWalkFrame`) está condicionada estritamente à movimentação física real (`sample.moving` do `VisualMotionTrack`). Ao estar parado, o frame é fixado em 0 (pose neutra).
  - Fluxo de `exitHunt` em `GamePrototype.tsx` limpa `walkingPath`, garantindo que ao retornar à cidade o personagem permaneça imóvel sem loop de passos.

- [x] **Correção do Valor Real do Loot no Analisador de Caça (Fim do unitVal = 100 gp):**
  - Corrigido `GamePrototype.tsx` (linha 3091): substituído o valor genérico de 100 gp pela cotação real do catálogo de economia de NPCs (`preferredSellPrice(econItem)` e `canonicalSellPrice`), garantindo paridade exata de ouro entre o Hunt Analyzer e a venda no NPC.

- [x] **Resolução Definitiva de Vazamento de Memória ("Out of Memory") em Thais City:**
  - `ThaisCityArena.tsx` atualizado para chamar `destroyVisualNode` na remoção de containers de textos e efeitos de feitiço/treino (`timedCityVisuals` e `actorViews`), eliminando vazamentos de texturas WebGL de canvas no heap da GPU/Chrome.
  - Destruição segura de texturas e textureSources dinâmicas anteriores ao reatribuir texturas de canvas do jogador e seguidores em `Texture.from(canvas)`.
  - Reciclagem contínua de canvas de passos eliminada quando o personagem estiver imóvel.

- [x] **Renderização Correta de Objetos e Criaturas Multi-Tile (Paredes, Escadas e Corpos 2x2):**
  - Implementado cálculo dinâmico de `wTiles` e `hTiles` a partir da resolução real da textura (`tex.width` e `tex.height`), aplicando os deslocamentos canônicos `(wTiles - 1) * 32` e `(hTiles - 1) * 32` tanto para itens do cenário (paredes altas de 64px, escadas) quanto para corpos de monstros 2x2 (Cyclops).
  - Camadas ordenadas com `sortableChildren = true` e zIndex diferenciado: pisos em zIndex 0 e paredes/escadas em `point.y + 16`, eliminando sobreposições e quinas cortadas.

- [x] **Carregamento Instantâneo das Caçadas (Fim do Bloqueio de 1.300+ Requisições HTTP):**
  - Limitado o lote síncrono bloqueante de itens de mapa em `PixiArena.tsx` para 80 frames prioritários fundamentais, transferindo as variações de padrões secundários para o fluxo de background streaming assíncrono. O cenário e a arena abrem em < 500ms.

---

## ✅ Concluído (Fase 226):

- [x] **Unificação da Tela de Loading em Fluxo Único (0% a 100%):**
  - Eliminado duplo loading ao selecionar o personagem (1º loading baixando bundle + 2º loading conectando mundo).
  - Unificado em uma única experiência fluida e contínua sem piscar ou resetar barra de progresso.

- [x] **Sincronização de Morte Visual e Floaters de Dano:**
  - Corrigida a dessincronização onde monstros atingidos caíam como esqueleto antes do float de dano subir.
  - Sincronizada a queda visual do monstro exatamente com o impacto da magia e a subida do dano.

- [x] **Substituição das Telas de Loading Oficiais (Cyclops e Elfos):**
  - Substituídos os arquivos provisórios pelas ilustrações canônicas de caverna vulcânica (Cyclops) e floresta/árvore com ponte (Elfos).

- [x] **Transição de Loading e Execução em Aba em Segundo Plano:**
  - Resolvido o congelamento do loading quando minimizado ou em outra aba através de temporizador desacoplado de renderização.

- [x] **Fim do Bypass de Poções Grátis / Mana Infinita sem Gold:**
  - Corrigido `consumePotionFromInventory` para bloquear consumo sem dinheiro ou suprimento.

- [x] **Analisador de Caça (AdvancedMetricsWindow) 100% Funcional e Dinâmico:**
  - Removida barra horizontal, vinculados loot real, suprimentos reais, dano causado e sofrido, cabeçalho de última hunt e botão de reset.

- [x] **Resolução de Vazamento de Memória (Memory Leak) no PixiJS v8:**
  - Destruição recursiva de texturas WebGL de textos e gráficos na arena de caça.
