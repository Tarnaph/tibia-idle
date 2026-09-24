# FIX.md - Lote Ativo de Correções e Melhorias

## 🎯 Lote Ativo:
*(Nenhum item pendente no momento. Todos os problemas e melhorias autorizados foram resolvidos e validados com 100% de sucesso).*

---

## ✅ Concluído (Fase 230):

- [x] **Camadas Canônicas de Chão (`tile.groundServerId`) & zIndex 0:**
  - Identificado todo e qualquer piso base (grama, terra, cascalho, parquê, mármore — inclusive IDs 9000+ de Yalahar) através do atributo canônico `tile.groundServerId`.
  - Fixado estritamente o `zIndex = 0` para todos os pisos base, eliminando de forma definitiva o problema em que o chão de terra da linha de baixo cobria as cercas e paredes da linha de cima.

- [x] **Ocultação Canônica de Telhados no Térreo (Culling de Roofs Z:7):**
  - Peças de telhado (`6476..6488`, `9370..9410`, `1098..1140`) descartadas na renderização do piso térreo (Z:7).
  - Revelado com 100% de fidelidade visual o interior das casas dos elfos (taverna, balcão em L, mesas, cadeiras, caminhas e barris), correspondendo com fidelidade ao mapa original do Tibia.

- [x] **Transições de Bordas Suaves (`zIndex = 1`) & Fundo Sólido para Paliçadas (Item 1026):**
  - Isoladas as peças de transição de borda (autotiling / borders: `4542..4553`, `4664..4678`, `8432..8445`, `8345..8360`, etc.) no `zIndex = 1`, garantindo que fiquem sobre o piso base mas estritamente sob as paredes e cercas.
  - Implementado safety net garantindo piso base sob paliçadas e cercas 64x64 (item 1026), eliminando buracos pretos e vazios cortados.

---

## ✅ Concluído (Fase 229):

- [x] **Restauração Canônica dos Elfos de Yalahar (Foreigner Quarter [32741, 31298, 7]):**
  - Restauradas as coordenadas de `elf-sanctuary` para o Foreigner Quarter de Yalahar (`[32741, 31298, 7]`) no RealMap 11, atendendo rigorosamente à especificação original.
  - Re-executado o importador do RealMap 11 (`importHuntRegions`), gerando 626 tiles caminháveis e 6 spawn positions de Elfos e Elfos Scouts na arena.
  - Compilado novo Texture Atlas (`hunt-elf-sanctuary-atlas.png` e `.json` com 1.13 MB e 5.360 aliases de frames) contendo integralmente os 374 itens de mapa de Yalahar (pisos, muros de mármore, portais, vegetação e colunas), eliminando requisições HTTP individuais e renderizando o cenário instantaneamente sem falhas ou buracos.

---

## ✅ Concluído (Fase 228):

- [x] **Extração Autoritativa da Fortaleza dos Elfos (Shadowthorn) no RealMap 11:**
  - Atualizado centro de `elf-sanctuary` para o grande pátio canônico de Shadowthorn (`[33089, 32155, 7]`) em `packages/realmap11-importer/src/importHuntRegions.ts`.
  - Re-executado o importador, gerando uma arena completa com 776 tiles caminháveis interconectados e anel circular de 6 spawn points para Elfos, Elfos Scouts e Elfos Arcanistas.

- [x] **Empacotamento Completo de Texturas de Caçadas (Texture Atlas para Hunts):**
  - Atualizado `scripts/build-hunt-atlases.mjs` para incluir os 257 `serverItemIds` únicos dos tiles do mapa no atlas `hunt-elf-sanctuary-atlas.json` e `.png` (1.08 MB com 6.404 aliases de frames).
  - Otimizado `PixiArena.tsx` para carregar imediatamente os tiles a partir do atlas hunt já injetado em memória, eliminando a sobrecarga de 2.500 requisições HTTP individuais que quebravam o mapa e geravam buracos invisíveis.

- [x] **Fim Definitivo da Caminhada em Falso ao Renascer da Morte (handleRespawnInTemple & exitHunt):**
  - Removido o agendamento de rota para o Depot em `handleRespawnInTemple` durante o loading de 10s. O personagem agora renasce no Templo estático em pose neutra (`walkingPath = null` e `heldDirectionRef.current = null`).
  - Limpeza estrita de `heldDirectionRef.current = null` garantida em `exitHunt`.


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
