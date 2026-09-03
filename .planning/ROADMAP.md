# Roadmap: Cavebound MMORPG Web

## Overview

Cavebound é a construção de um MMORPG 2D idle no navegador, trazendo as mecânicas, dados, fórmulas e estética clássica do Tibia 8.60 (TFS / Styller). O desenvolvimento foi estruturado em fases incrementais, desde o núcleo matemático de combate desacoplado até a integração de assets binários, grupos de múltiplos heróis, rotas contínuas de caça no mapa OTBM e autenticação via Supabase.

## Phases

- [x] **Phase 1: Motor de Simulação e Combate Idle** - Simulação determinística em ticks, RNG por seed e curva de XP do TFS.
- [x] **Phase 2: Sistema de Equipamento e Atributos Derivados** - 6 slots de loadout, starter kit do Knight e cálculo de stats.
- [x] **Phase 3: Espacialidade 2D, Grid e Pathfinding A\*** - Movimentação discreta, prevenção de clipping e máquina de salas.
- [x] **Phase 4: Camada de Apresentação e Interpolação PixiJS** - Renderização visual interpolada, direções de sprites e métricas.
- [x] **Phase 5: Treinamento Funcional de Habilidades** - Dummies na Training Room e avanço de skills por vocação.
- [x] **Phase 6: Importadores de Conteúdo STYLLER (XML / OTBM)** - Parsing de monstros, magias, itens e mapas reais do servidor.
- [x] **Phase 7: Pipeline de Extração de Assets Tibia 8.60 (DAT/SPR)** - Extração de sprites, outfits, criaturas e itens para PNGs.
- [x] **Phase 8: Multi-Personagem, Spells, Promoção e Caçadas OTBM** - Party de 4 vocações, magias, relógios individuais e bosses.
- [x] **Phase 9: Rotas de Caça Contínuas (Continuous Hunt Routes)** - Caçada contínua em loop no OTBM com respawns e monstros raros.
- [x] **Phase 10: Câmera de Expedição e Controles em Tempo Real** - Câmera dinâmica suave, hot-swap de equipamentos e entrada ao vivo.
- [x] **Phase 11: Economia de Party, Loot Pouch e UX Estrutural** - Preferências de loot, venda de stacks, capacidade e peso.
- [x] **Phase 12: Fundação de Autenticação, Contas e Segurança (Supabase)** - Supabase Auth, RLS, painel de updates e rota preview dev.

---

## Phase Details

### Phase 1: Motor de Simulação e Combate Idle

**Goal**: Construir a engine pura de combate em ticks desacoplada da interface gráfica, com determinismo e curvas matemáticas autênticas do Tibia.  
**Depends on**: Initial core  
**Requirements**: Simulação headless, combate por rodadas/ticks (120ms), curva cumulativa de XP do TFS, cooldowns de ataque, 10 waves com boss.  
**Success Criteria**:

  1. Combate executa de forma 100% reproduzível para uma mesma seed.
  2. Acúmulo de XP segue a tabela oficial do Tibia sem desvios.
  3. Ataques respeitam rigorosamente os intervalos de cooldown do atacante.

**Plans**: Concluído (Validado em `tests/domain.test.ts`).

### Phase 2: Sistema de Equipamento e Atributos Derivados

**Goal**: Implementar o gerenciamento de equipamentos nos 6 slots corporais e derivar ataque, defesa e armor a partir dos itens equipados e vocação.  
**Depends on**: Phase 1  
**Requirements**: Slots corporais (head, armor, legs, boots, leftHand, rightHand), loadout inicial do Knight de `firstitems.lua`, derivação por skill de arma (Sword, Axe, Club).  
**Success Criteria**:

  1. Equipar armas altera imediatamente o poder de ataque baseado na skill ativa correspondente.
  2. Equipar escudos e armaduras modifica respectivamente defesa e valor de armor.
  3. Slots rejeitam itens incompatíveis sem corromper o estado do personagem.

**Plans**: Concluído (Validado em `tests/equipment.test.ts`).

### Phase 3: Espacialidade 2D, Grid e Pathfinding A\*

**Goal**: Estabelecer a movimentação espacial no plano discreto 2D com pathfinding e regras estritas de ocupação de tiles.  
**Depends on**: Phase 1  
**Requirements**: Grade de tiles discretos (x, y, z), A* pathfinding, prevenção de atravessar cantos ortogonais fechados (anti-corner clipping), ocupação atômica por criatura viva.  
**Success Criteria**:

  1. A* nunca retorna rotas que atravessem paredes ou colidam com quinas bloqueadas.
  2. Cada criatura ou membro da party ocupa exclusivamente um único tile por tick.
  3. Inimigos perseguem o líder da party e se posicionam em distância de alcance corpo a corpo (melee).

**Plans**: Concluído (Validado em `tests/spatial.test.ts`).

### Phase 4: Camada de Apresentação e Interpolação PixiJS

**Goal**: Desenvolver o pipeline visual em PixiJS que interpola suavemente os movimentos lógicos discretos do domínio.  
**Depends on**: Phase 3  
**Requirements**: Buffer de interpolação `VisualMotionTrack`, animação direcional de passos (4 sentidos), retorno a idle, rastreamento de taxas de sessão (XP/h, gold/h).  
**Success Criteria**:

  1. Movimento visual é suave e não afeta ou atrasa os ticks lógicos autoritativos.
  2. Renderização não consome nem altera o RNG determinístico da simulação.
  3. Sprites alternam corretamente entre direções e fases de caminhada.

**Plans**: Concluído (Validado em `tests/presentation.test.ts` e `apps/web/components/PixiArena.tsx`).

### Phase 5: Treinamento Funcional de Habilidades

**Goal**: Criar o sistema de treino de skills na Training Room com dummies funcionais e progressão vocacional autêntica.  
**Depends on**: Phase 2  
**Requirements**: Dummies de treino, cálculo de tentativas de skill (`skillTries`), multiplicadores de skill por vocação (Knight melee, Paladin distance, Mages magic level).  
**Success Criteria**:

  1. O tempo de treino acumula tentativas e sobe o nível de habilidade quando o limiar for alcançado.
  2. O aumento de skill reflete imediatamente no dano calculado de combate.
  3. Vocações diferentes progridem suas habilidades primárias nas velocidades corretas do TFS.

**Plans**: Concluído (Validado em `tests/progression.test.ts` e `apps/web/components/TrainingArena.tsx`).

### Phase 6: Importadores de Conteúdo STYLLER (XML / OTBM)

**Goal**: Extrair de forma somente leitura o conteúdo real do servidor Styller OpenTibia e normalizar em contratos JSON versionados.  
**Depends on**: Phase 1, Phase 2  
**Requirements**: Parsers de monstros XML, itens e equipamentos (items.xml, items.otb, items.lua), vocações, magias, economia de NPCs e mapas de caça do OTBM.  
**Success Criteria**:

  1. Arquivos originais em `styller-master/` permanecem inalterados após qualquer importação.
  2. JSONs gerados em `content/generated/` atendem aos esquemas validados com tipos TypeScript.
  3. Zonas de caça extraídas do OTBM possuem mapeamento correto de tiles caminháveis vs obstáculos.

**Plans**: Concluído (Validado em `tests/importer.test.ts` e CLI `import:content`).

### Phase 7: Pipeline de Extração de Assets Tibia 8.60 (DAT/SPR)

**Goal**: Criar o extrator binário dos arquivos `Tibia.dat` e `Tibia.spr` para gerar sprites PNG e resolver a correspondência visual de itens, monstros e cenários.  
**Depends on**: Phase 6  
**Requirements**: Leitor binário de DAT e SPR do cliente 8.60, resolução de cadeias OTB Server ID → Client ID → Sprite IDs, exportação para `public/generated/tibia860/` com validação SHA-256.  
**Success Criteria**:

  1. Resolução determinística e sem perda de todos os 62 itens, 12 criaturas, 4 outfits e cenário de treino.
  2. Imagens PNG geradas possuem assinaturas e hashes SHA-256 idênticos entre execuções.
  3. Manifesto central `tibia860-assets.json` registra todo o catálogo gráfico com validação rigorosa.

**Plans**: Concluído (Validado em `tests/tibia860-assets.test.ts` e CLI `extract:tibia860`).

### Phase 8: Multi-Personagem, Spells, Promoção e Caçadas OTBM

**Goal**: Expandir o jogo para suportar grupo de 4 heróis simultâneos, sistema de magia, promoções de vocação e 5 caçadas de 10 waves com chefes.  
**Depends on**: Phase 5, Phase 6, Phase 7  
**Requirements**: Party de 4 vocações únicas, inventários/skills/hotbars isolados, magias ativas com custo de mana e cooldown, fórmulas de dano por Magic Level, promoção por 20k gold no nível 20.  
**Success Criteria**:

  1. Cada membro da party evolui, equipa e usa magias individualmente sem interferir nos companheiros.
  2. Conjuradores executam magias com cooldowns independentes e animação de projéteis/efeitos.
  3. Promoção vocacional (ex.: Elite Knight, Master Sorcerer) altera a taxa de ganho e stats com sucesso.

**Plans**: Concluído (Validado em `tests/phase8.test.ts`).

### Phase 9: Rotas de Caça Contínuas (Continuous Hunt Routes)

**Goal**: Evoluir a caçada de salas fechadas para rotas contínuas em mapa aberto OTBM com zonas de respawn dinâmicas.  
**Depends on**: Phase 8  
**Requirements**: Rota em loop infinito no mapa do OTBM, pré-população de respawns, cooldowns de ressurgimento, área de segurança anti-spawn em cima da party, variantes raras com auras e loot ampliado.  
**Success Criteria**:

  1. Party realiza o percurso em loop continuamente sem travar o estado do jogo.
  2. Inimigos ressurgem respeitando os tempos de cooldown e distância mínima de segurança da party.
  3. Variantes raras surgem com probabilidade controlada por seed e aplicam multiplicadores corretos.

**Plans**: Concluído (Validado em `tests/continuous-hunt.test.ts`).

### Phase 10: Câmera de Expedição e Controles em Tempo Real

**Goal**: Implementar a câmera dinâmica com zoom e suavização acompanhando o grupo, além de permitir manipulação de equipamentos e membros durante a caçada ativa.  
**Depends on**: Phase 9  
**Requirements**: `smoothWorldCamera` com interpolação contínua, seleção de herói independente do alvo da câmera, hot-swap de equipamentos sem cancelar ataques pendentes, entrada ao vivo de novo membro.  
**Success Criteria**:

  1. Câmera centraliza suavemente no líder em movimento sem saltos bruscos.
  2. Jogador pode trocar armadura ou arma no meio da luta sem quebrar o tick de ataque em curso.
  3. Adicionar um membro na party durante a caçada ativa insere o personagem no grid sem overlap.

**Plans**: Concluído (Validado em `tests/expedition-camera.test.ts`).

### Phase 11: Economia de Party, Loot Pouch e UX Estrutural

**Goal**: Estruturar a economia de grupo, bolsa de saques com travas de segurança, venda de itens a NPCs, regras de peso/capacidade e ordenação do inventário.  
**Depends on**: Phase 8, Phase 10  
**Requirements**: Loot Pouch com configurações por item (auto-loot, lock para não vender, quick-sell), venda de stacks pelo preço real de NPC, cálculo de capacidade (`characterCapacity`) e peso (`inventoryWeight`), divisão de XP balanceada para vocações distintas.  
**Success Criteria**:

  1. Itens marcados com trava de venda nunca são vendidos em lote ou individualmente por engano.
  2. Capacidade e peso são recalculados dinamicamente ao mover ou equipar itens.
  3. Venda de loot gera gold correspondente aos preços do Styller com fallbacks auditados.

**Plans**: Concluído (Validado em `tests/party-economy-camera.test.ts` e `tests/structural-ux.test.ts`).

### Phase 12: Fundação de Autenticação, Contas e Segurança (Supabase)

**Goal**: Integrar o Supabase Auth para controle de sessão, contas de usuários, políticas de segurança Row Level Security e gerenciamento de notícias/atualizações.  
**Depends on**: Phase 11  
**Requirements**: Supabase Auth (Email + Google OAuth com PKCE), tabela `profiles` com triggers, RLS impedindo alteração arbitrária de role de admin, painel `/admin` para postagem de updates, guard na rota `/game` e rota `/game-preview` liberada em desenvolvimento local.  
**Success Criteria**:

  1. Visitantes deslogados são redirecionados de `/game` para a landing pública com modal de login.
  2. Usuários comuns não conseguem acessar `/admin` ou alterar suas próprias permissões para admin.
  3. Em ambiente de desenvolvimento local, a rota `/game-preview` permite jogar diretamente sem necessidade de login no Supabase.

**Plans**: Concluído (Validado em `tests/auth-foundation.test.ts` e migration `supabase/migrations/`).

### Phase 13: Remover sinal negativo dos danos recebidos e exibir em vermelho

**Goal:** Ajustar o indicador visual de dano recebido pelos personagens para exibir apenas o valor numérico em vermelho, removendo o sinal negativo (-), alinhado ao padrão visual do Tibia.
**Requirements**: FIX.md
**Depends on:** Phase 12
**Plans:** 0 plans

Plans:

- [ ] TBD (run /gsd-plan-phase 13 to break down)

### Phase 14: Viewport em tela cheia e janelas de UI flutuantes e arrastaveis

**Goal:** Expandir a renderização do jogo (PixiJS) para cobrir 100% da viewport (tela inteira/edge-to-edge) e transformar os módulos de interface (Equipamentos, Inventário, Party, Métricas, Logs e Controles) em janelas flutuantes, arrastáveis (draggable) e organizáveis livremente pelo usuário sobre o jogo.
**Requirements:** Viewport responsivo 100vw/100vh no PixiJS, sistema de janelas modulares flutuantes com cabeçalho arrastável, minimização/fechamento, z-index dinâmico (trazendo a janela clicada para frente) e persistência ou layout inicial intuitivo.
**Depends on:** Phase 13
**Plans:** 0 plans

Plans:

- [ ] TBD (run /gsd-plan-phase 14 to break down)

### Phase 15: Janela compacta de inventario, tooltips de atributos e iluminacao de tocha estilo Tibia

**Goal:** Refinar a UI/UX compactando a janela de equipamentos/inventário, adicionar tooltips com atributos detalhados (ataque, defesa, armadura, peso) ao passar o cursor sobre os itens, e implementar um sistema de iluminação de masmorra no PixiJS simulando a luz quente de tocha do Tibia ao redor do jogador com penumbra nas áreas não exploradas.
**Requirements:** FIX.md (Janela compacta, tooltips informativos, iluminação com raio de tocha)
**Depends on:** Phase 14
**Plans:** 0 plans

Plans:

- [ ] TBD (run /gsd-plan-phase 15 to break down)

### Phase 16: Correcao de arraste de janelas, hotbar customizavel (magias, runas, itens) e boost de XP dos ratos

**Goal:** Corrigir o deslocamento inesperado da janela flutuante ao clicar/arrastar, implementar modal de configuração da hotbar em 3 abas (Magias da vocação, Runas por level/vocação, Poções/Itens de cura e mana), botão Salvar com uso automático em combate/cura, e aumentar a XP dos ratos para 5000 para testes ágeis de magias avançadas.
**Requirements:** FIX.md (Correção do arraste de janelas, hotbar configurável com 3 abas e auto-uso, XP dos ratos = 5000)
**Depends on:** Phase 15
**Plans:** 1/1 complete

Plans:

- [x] 16-01-PLAN: Hotbar customizável com 3 abas, automação de combate/cura com poções/runas, arraste de janelas e XP 5000 para ratos

---

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14 → 15 → 16

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Motor de Simulação e Combate Idle | 1/1 | Complete | 2026-09-01 |
| 2. Sistema de Equipamento e Atributos Derivados | 1/1 | Complete | 2026-09-01 |
| 3. Espacialidade 2D, Grid e Pathfinding A\* | 1/1 | Complete | 2026-09-01 |
| 4. Camada de Apresentação e Interpolação PixiJS | 1/1 | Complete | 2026-09-01 |
| 5. Treinamento Funcional de Habilidades | 1/1 | Complete | 2026-09-01 |
| 6. Importadores de Conteúdo STYLLER (XML / OTBM) | 1/1 | Complete | 2026-09-01 |
| 7. Pipeline de Extração de Assets Tibia 8.60 (DAT/SPR) | 1/1 | Complete | 2026-09-01 |
| 8. Multi-Personagem, Spells, Promoção e Caçadas OTBM | 1/1 | Complete | 2026-09-01 |
| 9. Rotas de Caça Contínuas (Continuous Hunt Routes) | 1/1 | Complete | 2026-09-01 |
| 10. Câmera de Expedição e Controles em Tempo Real | 1/1 | Complete | 2026-09-01 |
| 11. Economia de Party, Loot Pouch e UX Estrutural | 1/1 | Complete | 2026-09-01 |
| 12. Fundação de Autenticação, Contas e Segurança (Supabase) | 1/1 | Complete | 2026-09-02 |
| 13. Ajuste de Indicador Visual de Dano (Remover sinal -) | 1/1 | Complete | 2026-09-02 |
| 14. Viewport em tela cheia e janelas de UI flutuantes e arrastaveis | 1/1 | Complete | 2026-09-02 |
| 15. Janela compacta de inventario, tooltips e iluminacao de tocha | 1/1 | Complete | 2026-09-02 |
| 16. Arraste de janelas, hotbar customizavel e XP 5000 | 1/1 | Complete | 2026-09-03 |
