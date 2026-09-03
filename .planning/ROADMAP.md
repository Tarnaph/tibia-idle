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

### Phase 17: Migracao para Tibia 11, Icones Oficiais e Action Bar Autentica

**Goal:** Realizar o upgrade do ecossistema do jogo para o Tibia 11 utilizando as fontes de dados do servidor `realmap11` e os assets do cliente `Tibia 11`, integrando os novos ícones oficiais de magias, runas e poções/itens, e construindo a Hotbar/Action Bar moderna autêntica do Tibia 11 com grid de atalhos, cooldown sweeps e visual graphite.
**Requirements:** FIX.md (Upgrade de versão para Tibia 11, ícones de magias/poções/runas na hotbar, Action Bar estilo Tibia 11)
**Depends on:** Phase 16
**Plans:** 1/1 complete

Plans:

- [x] 17-01-PLAN: Migracao para Tibia 11, novos dados de pocoes, icones oficiais de magias e Action Bar autentica

### Phase 18: Action Bar F1-F12 e Icones Identicos ao Tibia 11 Original

**Goal:** Reconstruir a Action Bar exatamente com o design, proporções e formato da imagem de referência do Tibia 11: barra horizontal com slots F1 a F12 (e slots adicionais), botões laterais de rolagem (`<`, `|<<`, `>`, `>>|`), botão de cadeado (lock/unlock), textura de ardósia chanfrada com indicador de 4 pontos (`▫ ▫ ▫ ▫`) nos slots vazios, badges F1-F12 no canto superior direito com fonte e brilho autênticos, contadores de itens no canto inferior direito, indicador de cast mode (chapéu de mago / target) e renderização pixel-perfect dos ícones de magias e poções exatamente iguais aos do jogo original.
**Requirements:** Screenshot da Action Bar do Tibia 11 (Layout F1-F12, moldura e controles laterais, ícones idênticos ao jogo original)
**Depends on:** Phase 17
**Plans:** 1/1 complete

Plans:

- [x] 18-01-PLAN: Action Bar F1-F12 com botões de scroll, cadeado, indicador de 4 pontos, badges no canto superior direito e ícones autênticos

### Phase 19: Console Inferior Completo de Batalha e Acoes (HUD Estilo Tibia/Ravendawn Idle)

**Goal:** Reestruturar todo o console inferior de combate e ações com base na referência visual enviada pelo usuário:
1. **Painel Esquerdo de Status do Jogador:** Barra de Vida (Verde) com valor atual/máximo e taxa de regeneração (+15), Barra de Mana (Azul) com valor atual/máximo e taxa (+5), Badge de Nível com porcentagem de XP, e Barra de Stamina/Bônus listrada verde com tempo restante (+).
2. **Botão de Mochila Rápida:** Slot quadrado de acesso rápido ao inventário/mochila.
3. **Barra Central Dupla de Ações (2 fileiras):** Duas fileiras de slots de ações com suporte a contadores de poções, custos de mana em azul, bordas coloridas temáticas por categoria e slots vazios com `+`.
4. **Painel Direito de Estratégia e Posturas:** Dropdowns "CONJUNTO" e "ALVO", botões de Postura de Combate (Defensiva, Equilibrada, Ofensiva com destaque ativo), Retículo de Alvo e controle numérico de alvos (- 1 +).
**Requirements:** Screenshot do console inferior de batalha e ações (HUD de status do jogador, mochila rápida, hotbar dupla de 2 fileiras, seletores de conjunto/alvo e posturas de combate)
**Depends on:** Phase 18
**Plans:** 1/1 complete

Plans:

- [x] 19-01-PLAN: Console inferior completo com HUD de status, mochila rápida, hotbar dupla de 2 fileiras e painel tático

### Phase 20: Extração e Integração Oficial dos Ícones de Magias e Poções do Tibia 11

**Goal:** Extrair da planilha oficial do CipSoft os 60 ícones autênticos de magias (5 linhas × 12 colunas) e os 5 frascos de poções (Normal, Strong, Great, Ultimate, Supreme), salvá-los no diretório público da aplicação e conectar em `Tibia11ActionIcon.tsx`, `BottomConsoleHUD.tsx` e `HotbarConfigModal.tsx` para que cada magia e poção exiba o seu sprite exato e oficial do Tibia 11.
**Requirements:** Planilha de Spell Icons (CipSoft 2010, 60 ícones) e sprite sheet de Poções do Tibia 11.
**Depends on:** Phase 19
**Plans:** 1/1 complete

Plans:

- [x] 20-01-PLAN: Extração automatizada de 60 ícones de magias e 15 variantes de poções da CipSoft e integração em ActionIcon e HUD

### Phase 21: Magias, Poções, Runas, Hotkeys Inteligentes e Animações Oficiais

**Goal:** Tornar 100% funcional o ecossistema de magias, poções e runas: inicializar hotkeys vazias por default para configuração do jogador; implementar execução automática inteligente (auto-cast reativo ao tomar hit para curas/poções, recast contínuo de suporte como haste e magic shield ao expirar, e uso de magias de ataque ao ver alvos no alcance); suporte a acionamento manual; e importação completa de todas as animações de magias e projéteis do Tibia.
**Requirements:** `c:\Users\desig\OneDrive\Documentos\TibiaWeb\Tibia\FIX.md`
**Depends on:** Phase 20
**Plans:** 1 plan

Plans:

- [x] 21-01-PLAN: Implementação de hotkeys vazias por default, auto-cast inteligente (cura/poções reativas ao dano, buffs de suporte contínuos, ataques no range), acionamento manual (F1-F12/1-0) e extração de 100% dos efeitos mágicos e projéteis do Tibia.

### Phase 22: Autenticidade de Combate Tibia (Animações, Retículo Alvo, Speech Flutuante, Chase IA e Cooldown Visual)

**Goal:** Implementar as correções detalhadas no FIX.md: animação de Whirlwind Throw e projéteis com weapon-type; ajuste da regeneração de vida (1 HP por ciclo conforme realmap11); retículo vermelho (target box) ao mirar monstros; falas flutuantes das magias (e "Aaaah..." para poções); perseguição inteligente (chase) ao mirar em monstros; e overlay de cooldown com contagem regressiva em segundos nas hotkeys.
**Requirements:** `c:\Users\desig\OneDrive\Documentos\TibiaWeb\Tibia\FIX.md`
**Depends on:** Phase 21
**Plans:** 1 plan

Plans:

- [x] 22-01-PLAN: Animações de armas/Whirlwind Throw, retículo vermelho, speech flutuante, regen autêntica, IA de perseguição e cooldown overlay nas hotkeys.

### Phase 23: Cooldowns Oficiais, Fluidez de Movimento Inicial, Seleção Inteligente de Alvo, XP 50000 e Cave Rats no Respawn

**Goal:** Implementar as correções detalhadas no FIX.md: verificação e alinhamento rigoroso dos cooldowns com realmap11; eliminação do delay/parada no início das caçadas (movimento imediato e busca fluida de alvos); seleção de alvo inteligente priorizando monstros acessíveis e frontais (sem travar em monstros bloqueados atrás); ajuste de XP dos Ratos para 50.000; e inclusão de Cave Rats com 50.000 XP nos mesmos respawns dos Ratos.
**Requirements:** `c:\Users\desig\OneDrive\Documentos\TibiaWeb\Tibia\FIX.md`
**Depends on:** Phase 22
**Plans:** 1 plan

Plans:

- [x] 23-01-PLAN: Movimento inicial imediato em rotas contínuas, targeting inteligente frontal em `nearestEnemy`, XP 50k em Rat/Cave Rat, Cave Rats no respawn de Rat Cellars e auditoria de cooldowns.

### Phase 24: Área Autêntica da Magia Exori (SQUARE1X1 nos 8 Tiles, Efeito Visual em Toda a Área e Dano Oficial realmap11)

**Goal:** Implementar o comportamento 100% autêntico da magia Berserk (`exori`) conforme os arquivos oficiais de `realmap11` e do Tibia:
1. Área de efeito `AREA_SQUARE1X1` cobrindo o quadrado 3x3 (todos os 8 tiles ao redor do conjurador).
2. Efeito visual `CONST_ME_HITAREA` (efeito 10) projetado e renderizado simultaneamente em todos os 8 tiles da área 3x3 no `PixiArena`, criando o impacto visual de área clássico do Tibia em vez de animar apenas em monstros individuais.
3. Capacidade de conjuração de área instantânea mesmo sem alvo travado, acertando todos os monstros adjacentes no raio de 1 tile.
4. Fórmula oficial de dano alinhada com `realmap11/data/spells/scripts/attack/berserk.lua` (`skillAttack`: 0.07 e 0.09).
**Requirements:** Arquivos oficiais `realmap11` (`spells.xml`, `berserk.lua`, `spells.lua`) e `Tibia 11`.
**Depends on:** Phase 23
**Plans:** 1 plan

Plans:

- [x] 24-01-PLAN: Área 3x3 completa de `exori`, efeito visual nos 8 tiles simultâneos em `PixiArena`, conjuração de área e fórmula de dano de `realmap11`.

### Phase 25: Novo Inventário com Bolsa, Depot, Venda Rápida, Menu de Contexto, Movimentação Ortogonal e Preços de Loot

**Goal:** Implementar a reformulação completa do sistema de inventário, equipamentos, armazenamento e movimentação conforme especificações visuais do usuário e do Tibia:
1. **Movimentação Preferencial Ortogonal (Horizontal/Vertical)**: Ajustar custos e heurística do pathfinding A* para preferir movimentos retos, utilizando passos diagonais apenas como último recurso ou desobstrução.
2. **Novo Layout do Inventário (Visual Idêntico ao Print)**:
   - Coluna esquerda: slots de equipamentos no layout autêntico com silhuetas oficiais quando vazios, e badge inferior de Capacidade (`oz`).
   - Coluna direita: compartimento `Bolsa` (12 slots) para itens protegidos e `Mochila` (20 slots) onde todo loot cai diretamente.
   - Rodapé com contagem de gold formatada com ícone de moedas de ouro.
   - Drag & drop fluido entre slots de equipamentos, Mochila e Bolsa.
3. **Menu de Contexto de Item (Botão Direito)**:
   - Opções: Equipar/Desequipar, Vender no Market, Ver no Market, Auto loot (checkbox), Travar venda (checkbox), Venda rápida (checkbox) e Destruir.
4. **Botões de Atalho Acima das Hotkeys**:
   - Barra superior contendo botões `DEPOT`, `VENDA RÁPIDA` (em destaque dourado), `IMBUEMENTS` e `BLESSINGS`.
5. **Janela do Depot (Armazém)**:
   - Modal com abas de filtros por categoria, busca textual, grid espaçoso do Armazém e visualização lateral da Bolsa/Mochila para transferências rápidas.
6. **Janela de Venda Rápida**:
   - Modal listando itens elegíveis da Mochila com cálculo de valor em tempo real e botão de venda em massa com crédito instantâneo de gold.
7. **Preços Completos de Todos os Itens**:
   - Atribuir preços de venda canônicos a todos os 43 itens anteriormente sem preço em `item-economy.json`.
**Requirements:** Prints fornecidos pelo usuário, `FIX.md`, `vocations.xml` e `items.xml` de `realmap11`.
**Depends on:** Phase 24
**Plans:** 1 plan

Plans:

- [x] 25-01-PLAN: Movimentação ortogonal no A*, novo layout de Inventário (Bolsa + Mochila + Capacidade), menu de contexto botão direito, janelas Depot e Venda Rápida, botões de ação e precificação de todo o loot.

---

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14 → 15 → 16 → 17 → 18 → 19 → 20 → 21 → 22 → 23 → 24 → 25

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
| 17. Migracao para Tibia 11, Icones Oficiais e Action Bar | 1/1 | Complete | 2026-09-03 |
| 18. Action Bar F1-F12 e Icones Identicos ao Tibia 11 Original | 1/1 | Complete | 2026-09-03 |
| 19. Console Inferior Completo de Batalha e Acoes | 1/1 | Complete | 2026-09-03 |
| 20. Extração e Integração Oficial de Ícones e Poções | 1/1 | Complete | 2026-09-03 |
| 21. Magias, Poções, Runas, Hotkeys e Animações Oficiais | 1/1 | Complete | 2026-09-03 |
| 22. Autenticidade de Combate Tibia (Animações, Retículo, Fala, Chase e Cooldown) | 1/1 | Complete | 2026-09-03 |
| 23. Cooldowns Oficiais, Fluidez Inicial, Target Inteligente, XP 50k e Cave Rats | 1/1 | Complete | 2026-09-03 |
| 24. Área Autêntica da Magia Exori (SQUARE1X1 3x3 e Efeito Visual) | 1/1 | Complete | 2026-09-03 |
| 25. Novo Inventário, Depot, Venda Rápida, Movimento Reto e Preços | 1/1 | Complete | 2026-09-03 |
