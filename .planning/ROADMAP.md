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
| 26. Alinhamento do Inventário, HUD Centralizada, Janela Flutuante, Stances e Distância | 1/1 | Complete | 2026-09-03 |
| 27. Desequipar para Bolsa, Foco Autêntico de Alvo (Retângulo Vermelho) e Anúncio de Level Up | 1/1 | Complete | 2026-09-03 |
| 28. Nova UI de Caçadas (Bestiary, Loots e Countdown de Troca) e Nova UI da Party com Modal Novo Membro | 1/1 | Complete | 2026-09-03 |
| 29. Saída de Caçada a Thais Depot, Sistema de Treino no Dummy, e Nova Janela Skills | 1/1 | Complete | 2026-09-03 |
| 30. Mapa Global de Thais, Início Imediato de Hunt, Skills Escuro e Botão Sair no Dock | 1/1 | Complete | 2026-09-03 |

---

### Phase 26: Alinhamento do Inventário, HUD Centralizada, Janela Flutuante, Stances e Distância

**Goal:** Implementar os ajustes refinados solicitados em `FIX.md` para alinhamento de paperdoll, HUD centralizada, sprite autêntico de backpack, janela flutuante, remoção da aba antiga e controle funcional de stances e distância.  
**Depends on:** Phase 25  
**Requirements:** `FIX.md`, imagens de referência (`media_1788454390455.png` a `media_1788454860183.png`).  
**Success Criteria:**
1. Paperdoll alinhado exatamente como a referência: Colar/Capacete/Backpack no topo, Espada/Armadura/Escudo no meio, Calça centralizada abaixo, Anel/Botas/Ammo na base.
2. Console inferior (hotkeys) fixo e perfeitamente centralizado no meio da tela; botões `DEPOT`, `VENDA RÁPIDA`, `IMBUEMENTS`, `BLESSINGS` menores e centralizados acima das hotkeys.
3. Mochila ao lado das barras de HP/MP com o sprite oficial de backpack de 32x32 px.
4. Remoção definitiva da aba antiga de Equipamentos do topo da tela.
5. Janela de Inventário flutuante (sem overlay escuro de modal que bloqueia a tela), podendo ser arrastada e permitindo interação contínua com o jogo.
6. Botões de Full Atk, Balanced e Full Def funcionais aplicando multiplicadores de ataque e defesa.
7. Seletor de distância `[ - 1 + ]` controlando a distância mínima que o personagem mantém do alvo (1 = melee, 2+ = distância mantida).

Plans:
- [x] 26-01-PLAN: Implementar alinhamento do paperdoll, centralização da HUD, sprite de backpack, inventário flutuante, remoção da aba antiga e sistema funcional de stances e distância.

---

### Phase 27: Desequipar para Bolsa, Foco Autêntico de Alvo (Retângulo Vermelho) e Anúncio de Level Up

**Goal:** Fazer com que o ato de desequipar itens envie os itens diretamente para a Bolsa (`game.session.bag`), garantir que o monstro marcado com o retângulo vermelho autêntico seja perseguido e atacado com prioridade sem desviar para outros alvos, e exibir o anúncio centralizado "You advanced from Level X to Level Y." ao subir de nível.  
**Depends on:** Phase 26  
**Requirements:** `FIX.md`, imagens de referência (`media_1788455221707.png`, `media_1788455241506.png`, `media_1788455331069.png`).  
**Success Criteria:**
1. Desequipar item (por duplo clique ou pelo menu de contexto) envia o item para a Bolsa (`bag`) sem fazê-lo sumir.
2. Equipar item (duplo clique na bolsa/mochila ou pelo menu de contexto) equipa o item no slot correto e, caso haja item anterior equipado, envia o anterior para a bolsa.
3. A marcação do alvo atual é exibida como um retângulo/quadrado vermelho sólido e nítido de 32x32 ao redor da criatura alvejada (idêntico à imagem de referência).
4. O personagem ataca e persegue estritamente o monstro focado pelo alvo vermelho, sem alternar aleatoriamente para outro bicho que esteja próximo.
5. Ao avançar de nível, é exibida no centro da tela a mensagem autêntica "You advanced from Level X to Level Y." com tipografia clássica branca contornada em preto.

Plans:
- [x] 27-01-PLAN: Implementar desequipar para a bolsa, trava de foco e retângulo de alvo autêntico, e anúncio centralizado de level up.

---

### Phase 28: Nova UI de Caçadas (Bestiary, Loots e Countdown de Troca) e Nova UI da Party com Modal Novo Membro

**Goal:** Reformular completamente a janela de Caçadas e a janela de Party de acordo com as referências enviadas: janela de caçadas em 3 colunas (lista de hunts, detalhes do monstro com tooltip de fraquezas/bestiary, loot possível com tags e checkboxes) com countdown de 5s para troca; e janela da Party com barras de HP, MP e Stamina, e modal "NOVO MEMBRO" com seleção de gênero e vocações.  
**Depends on:** Phase 27  
**Requirements:** `FIX.md`, 5 imagens de referência anexadas.  
**Success Criteria:**
1. Janela de caçadas com abas superiores (Caçadas, Treino, Quests, Arena, Bosses) e 3 colunas (Busca/Lista, Detalhes/Recorde, Loot Possível).
2. Sem tamanho do pull; monstro com botão/hover "DETALHES" exibindo tooltip com elementos/fraquezas e progresso do Bestiary.
3. Lista de loot possível com sprite, nome, raridade (always, common, semi-rare, rare) e toggle de auto-loot.
4. Botão "Trocar de caçada" aciona um countdown visual de 5 segundos antes de efetuar a troca de rota/hunt.
5. Janela da Party reformulada com barras de Vida, Mana e Stamina para cada membro, estrela de líder e botão de remover membros.
6. Botão "Adicionar membro" abre o modal "NOVO MEMBRO" com input de nome, botões Masculino/Feminino e cards das vocações (Knight, Monk, Paladin, Sorcerer, Druid).

Plans:
- [x] 28-01-PLAN: Implementar nova UI de Caçadas com Bestiary/Loots/Countdown e nova UI de Party com Modal de Novo Membro.

---

### Phase 29: Saída de Caçada com Teleporte e Caminhada a Thais Depot, Sistema de Treino com Caminhada ao Dummy, e Nova Janela Skills

**Goal:** Implementar o fluxo autêntico de saída de caçada com contagem de 5s, teleporte para Thais (32369, 32241, 7) e caminhada automática ao Depot (32342, 32231, 7); adicionar a aba de Treino com seleção de skill e caminhada ao Dummy de Thais (32349, 32238, 7); e substituir a janela antiga pela janela autêntica de Skills acessada ao clicar no nome do personagem no topo esquerdo.  
**Depends on:** Phase 28  
**Requirements:** `FIX.md`, 2 imagens de referência anexadas.  
**Success Criteria:**
1. Botão "Sair da Caçada" inicia contagem regressiva de 5 segundos; ao finalizar, transporta os personagens para Thais (32369, 32241, 7).
2. Personagem anda sozinho passo a passo da coordenada de chegada até o Depot de Thais (32342, 32231, 7) e permanece em repouso.
3. Aba "TREINO" exibe 6 skills selecionáveis e 3 painéis (Arma de Exercício, Treino Online e Treino Offline); liberado apenas na cidade de Thais.
4. Ao clicar em "Iniciar treino", o personagem anda sozinho da sua posição até o boneco de treino (32349, 32238, 7) e inicia o ciclo de treino e ganho de skill.
5. Antiga janela de personagem removida; nova janela "Skills" fiel à imagem de referência é aberta ao clicar no nome do personagem no canto superior esquerdo.

Plans:
- [x] 29-01-PLAN: Implementar saída com teleporte/caminhada a Thais, aba de Treino com caminhada ao dummy, e janela clássica Skills aberta pelo nome do personagem.

---

### Phase 30: Mapa Global de Thais no Jogo, Início Imediato de Hunt, Cores Escuras em Skills e Botão Sair da Caçada no Dock

**Goal:** Integrar a renderização do mapa global de Thais (1.836 tiles extraídos do realmap.otbm) ao viewport da cidade; ajustar o botão de caçada para "Começar caçada" imediato (sem 5s) quando na cidade; aplicar paleta escura da barra de hotkeys à janela Skills; e adicionar o botão vermelho "SAIR DA CAÇADA" no dock inferior ao lado de BLESSINGS, removendo a janela antiga de hunt/training room.  
**Depends on:** Phase 29  
**Requirements:** `FIX.md`, imagem do dock inferior com hotkeys e blessings anexada.  
**Success Criteria:**
1. Viewport na cidade renderiza os tiles reais do mapa global de Thais (`content/generated/thais-city.json`) cobrindo Templo (32369, 32241, 7), Depot (32342, 32231, 7) e Dummies (32349, 32238, 7).
2. Na janela de caçadas, quando o jogador não estiver em caçada, o botão exibe "Começar caçada" e inicia imediatamente sem os 5 segundos de espera (os 5s permanecem apenas para "Trocar de caçada").
3. Janela de Skills atualizada com as cores escuras idênticas à barra de hotkeys (fundo carvão escuro `#16191d`, bordas sutis e contrastes refinados).
4. Botão vermelho "SAIR DA CAÇADA" adicionado ao dock de ações rápidas inferior ao lado de "BLESSINGS" com timer de 5s.
5. Removida completamente a antiga janela 4 (`id="hunt"`, que continha "training room").

Plans:
- [x] 30-01-PLAN: Integrar arena com mapa real de Thais, início imediato de hunt fora da caçada, tema escuro na janela Skills e botão Sair da Caçada no dock rápido.

---

### Phase 31: Migração para Tibia 10.98/11 (Tibia.dat e Tibia.spr) e Renderização Autêntica do Mapa Global de Thais

**Goal:** Migrar o pipeline de assets para os binários oficiais do Tibia 10.98/11 (`Tibia.dat` e `Tibia.spr`), extraindo todos os pisos e objetos reais de Thais a partir de `realmap11/data/items/items.otb`, eliminando sprites genéricos e garantindo renderização autêntica de templo, colunas, altar, paredes de pedra e depot.  
**Depends on:** Phase 30  
**Requirements:** `FIX.md`, binários oficiais `Tibia 11/Tibia 11/Tibia 11/Tibia.dat` e `Tibia.spr`.  
**Success Criteria:**
1. Pipeline decodifica `Tibia.dat` 10.98 (signature `0x42A3`, 23.725 itens) e `Tibia.spr` (signature `0x57BBD603`, 338.944 sprites com índices u32).
2. Extração de 244 sprites PNGs de alta definição para todos os pisos e objetos do mapa global de Thais (`public/generated/tibia1098/items/`).
3. Templo de Thais com renderização dos pisos xadrez autênticos (406/407), altar sagrado (1448), colunas de mármore (1515/1481) e paredes de pedra clássicas (1049-1057).
4. Separação de camadas no Pixi: pisos em `terrainLayer` e paredes/objetos/colunas/altares em `objectsLayer` com `zIndex` e offsets verticais para ordenação 2.5D precisa.
5. Ao sair da caçada ou morrer, o personagem respawna visivelmente no autêntico Templo de Thais (`32369, 32241, 7`).

Plans:
- [x] 31-01-PLAN: Integrar extrator de assets Tibia 10.98/11, gerar PNGs dos 244 itens de Thais e renderizar camadas de piso e objetos em ThaisCityArena.

---

### Phase 32: Vida, Nome do Personagem, Animação de Caminhada e Elementos Animados do Mapa de Thais (Fogo Azul, Teleporte, Tochas, Fontes)

**Goal:** Implementar o nameplate e a barra de vida verde clássica dos personagens na cidade de Thais; adicionar rotação e ciclo de animação de caminhada com interpolação suave; e extrair/animar todos os frames dos elementos do mapa (fogo azul, luz de teleporte, tochas, candelabros, postes, bacias e fontes).  
**Depends on:** Phase 31  
**Requirements:** `FIX.md`, itens oficiais do servidor `realmap11` e binários `Tibia 11/Tibia 11/Tibia 11/Tibia.dat` e `Tibia.spr`.  
**Success Criteria:**
1. Nome do personagem em verde clássico (`#58f773`) com contorno preto e barra de vida verde (`#4fc977`) sobre fundo vermelho escuro renderizados acima da cabeça de todos os personagens em Thais.
2. Animação de caminhada com troca direcional (`north`, `south`, `east`, `west`), alternância de frames dos passos e interpolação contínua entre tiles.
3. Extração no `extract-tibia1098-thais.mjs` de todos os frames (`animPhases > 1`) para os itens animados de Thais (fogo azul `8058`, teleporte `1387`, tochas `2059/2061`, lâmpadas `2038/2040`, bacias `1481`, fontes `1360-1363`, água `4614/9588-9594`).
4. Ticker do Pixi em `ThaisCityArena.tsx` atualiza a textura dos itens animados em tempo real, gerando movimento contínuo nos elementos da cidade.

Plans:
- [x] 32-01-PLAN: Extrair múltiplos frames dos itens animados de Thais, implementar nameplate/vida verde, direção/passos dos personagens e animação contínua dos elementos no Pixi.

---

### Phase 33: Thais Completa - Fonte Nítida, Velocidade Oficial por Nível e Pathfinding por Clique com Hover de Tile

**Goal:** Refinar a proporção/definição dos nomes e barras de vida conforme as imagens de referência; aplicar a fórmula oficial de velocidade do servidor TFS/Tibia vinculada ao level; expandir Thais para a cidade inteira (18.271 tiles) eliminando áreas pretas; e implementar o cursor quadrado de hover sobre o tile e a caminhada por clique do mouse com pathfinding A*.  
**Depends on:** Phase 32  
**Requirements:** `FIX.md`, screenshots de referência do hover e nomes, arquivos do servidor `realmap11/src/creature.cpp` e `player.h`.  
**Success Criteria:**
1. Nome do personagem e barra de vida com fidelidade às imagens de referência: verde vivo (`#00ff00`), outline preto nítido de 2.5px e barra de HP com moldura preta de 1px e preenchimento verde clássico.
2. Velocidade de movimento calculada pela fórmula oficial do TFS: `baseSpeed = 220 + 2 * (level - 1)` e step duration em milissegundos derivada de `speedA`, `speedB`, `speedC` e velocidade do piso.
3. Mapa de Thais expandido cobrindo 18.271 tiles autênticos sem vazios pretos nas proximidades da cidade.
4. Indicador retangular de hover nos tiles com moldura ciano/amarela idêntica às imagens de referência.
5. Clique com o botão esquerdo em qualquer tile válido aciona o pathfinding A* e move o personagem fluidamente até o destino.

Plans:
- [x] 33-01-PLAN: Implementar fórmula oficial de velocidade do TFS por level, cursor de hover no tile, clique com A* pathfinding e proporções dos nomes/HP bar conforme referência.

---

### Phase 34: Unificação Visual de Nome e Barra de Vida Entre Cidade e Caçada

**Goal:** Padronizar a renderização do nome do personagem e barra de vida na cidade (`ThaisCityArena`) para ficarem 100% idênticos aos da caçada (`PixiArena`), conforme screenshot de referência.  
**Depends on:** Phase 33  
**Requirements:** Screenshot de referência de caçada (`Aldric`), `packages/presentation/src/movement.ts` (`creatureVisualLayout`), `PixiArena.tsx`.  
**Success Criteria:**
1. Nome do personagem em Thais renderizado com fonte, tamanho, cor, resolução e stroke idênticos aos de PixiArena (`Arial 8px 700, fill: 0x67de82, stroke: 0x08120a width 2, resolution: 2, anchor: 0.5, nameplateY: -28`).
2. Barra de vida em Thais renderizada com dimensões e cores idênticas às de PixiArena (`hpBarY: -20, hpBarWidth: 28, height: 3, bg: 0x251010, fill: 0x4fc977`).
3. 100% dos testes passando e 0 erros de tipagem.

Plans:
- [x] 34-01-PLAN: Alinhar visualmente nome e barra de vida de ThaisCityArena com PixiArena usando creatureVisualLayout.

---

### Phase 35: Cadência de Teclado, Velocidade Urbana (+25%) e Viagem para Caçada via Cais de Thais

**Goal:** Corrigir o bug de repetição desenfreada de setinhas na cidade travando os passos na cadência exata do personagem; aplicar bônus de 25% na velocidade de caminhada urbana; e implementar o trajeto imersivo até a caçada através das escadas do cais (`x:32321 y:32211 z:7` -> `x:32321 y:32210 z:6` -> `x:32310 y:32210 z:6`) antes do teleporte.  
**Depends on:** Phase 34  
**Requirements:** `FIX.md`, `content/generated/thais-city.json` (pisos Z:7 e Z:6), `GamePrototype.tsx`, `packages/domain/src/spatial/pathfinding.ts`.  
**Success Criteria:**
1. Manter a tecla de setinha pressionada respeita rigorosamente a velocidade do personagem (`cityStepDurationMs`), impedindo movimentação em alta velocidade descompassada.
2. A velocidade de caminhada na cidade é 25% mais rápida que a velocidade base (`cityStepDurationMs = Math.round(stepDurationMs / 1.25)`).
3. Ao selecionar uma caçada na cidade, o personagem traça e percorre o caminho até a escada `32321, 32211, 7`, sobe para `32321, 32210, 6`, caminha pelo cais até `32310, 32210, 6` e então é teleportado para a caçada escolhida.
4. Suporte aos pisos Z:7 e Z:6 no mapa de Thais e no pathfinding.
5. 100% dos testes passando e 0 erros de tipagem.

Plans:
- [x] 35-01-PLAN: Implementar cadência de teclado, velocidade urbana (+25%), rota z:7 -> z:6 via escada do cais e teleporte para caçada.

---

### Phase 36: Restauração Visual da Cidade (Isolamento de Andares Z:7 e Z:6) e Sistema Canônico de Escadas TFS

**Goal:** Restaurar a cidade de Thais para sua exibição limpa original no piso Z:7, eliminando a sobreposição indevida do segundo andar (Z:6); isolar o piso Z:6 em seu próprio container ativado ao subir escadas; e implementar a transição canônica de escadas do TFS tanto na movimentação manual quanto no trajeto para o barco.  
**Depends on:** Phase 35  
**Requirements:** `FIX.md`, lógica oficial de `Tile::queryDestination` do TFS (`realmap11/src/tile.cpp`), `ThaisCityArena.tsx`, `GamePrototype.tsx`.  
**Success Criteria:**
1. No piso Z:7 (térreo), apenas os tiles de Z:7 são exibidos. O chão, construções, praças e ruas voltam a ficar 100% limpos como antes, sem telhados ou paredes do segundo andar cobrindo a visão.
2. O piso Z:6 é isolado em container dedicado, tornando-se visível quando o personagem sobe a escada para `z: 6`.
3. Ao subir as escadas do cais (`x: 32321, y: 32211, z: 7` subindo ao norte para `x: 32321, y: 32210, z: 6`), a visão alterna para o piso Z:6, o personagem anda pela passarela de madeira do cais e viaja para a caçada ao chegar no barco (`x: 32310, y: 32210, z: 6`).
4. Suporte à transição de escadas também na movimentação manual por teclado (subir ao norte na escada de Z:7 vai para Z:6; descer ao sul no topo de Z:6 volta para Z:7).
5. 100% dos testes passando e 0 erros de tipagem.

Plans:
- [x] 36-01-PLAN: Separar visualmente os andares Z:7 e Z:6 em containers dedicados e implementar transições canônicas de escadas.

---

### Phase 37: Movimento Fluído na Cidade (+50% de Velocidade) e Mapa Completo do Segundo Andar (Z:6)

**Goal:** Aumentar a velocidade urbana para 50% mais rápida que a base para locomoção ultra-dinâmica; suavizar a interpolação de movimento eliminando engasgos visuais; e completar 100% dos sprites do segundo andar (Z:6) mantendo o chão/mar do piso Z:7 como fundação visível para eliminar qualquer vazio preto.  
**Depends on:** Phase 36  
**Requirements:** `FIX.md`, `extract-tibia1098-thais.mjs`, `ThaisCityArena.tsx`, `GamePrototype.tsx`.  
**Success Criteria:**
1. Velocidade urbana configurada em 50% superior à base oficial (`cityStepDurationMs = Math.round(baseStepDurationMs / 1.5)`).
2. Animação de caminhada e interpolação de pixels extremamente fluidas e contínuas sem travamentos.
3. Extração completa dos 1.082 sprites de itens do Tibia 10.98 cobrindo todos os itens do segundo andar (Z:6).
4. Piso Z:7 mantido como camada base sob o Z:6, eliminando qualquer tela preta ou vazio ao redor do barco, píer e telhados.
5. 100% dos testes passando e 0 erros de tipagem.

Plans:
- [x] 37-01-PLAN: Implementar velocidade urbana de +50%, interpolação fluída e mapa completo sem tela preta no segundo andar.

---

### Phase 38: Fontes da Caçada Unificadas, Caminhada Fluída com VisualMotionTrack e Integridade Completa do Barco e Cidade

**Goal:** Unificar o tamanho das fontes flutuantes na caçada (XP, Magia, Dano e Cura para tamanho 7, ligeiramente menor que o nome do personagem tamanho 8); sincronizar a interpolação e animação de passos na cidade com `VisualMotionTrack` proporcionando a mesma fluidez da caçada; eliminar offsets negativos artificiais de multi-tile items alinhando mesas, balcões e paredes divisórias; e extrair/renderizar as estruturas elevadas do barco (mastros, velas e quarterdeck dos pisos Z:5 e Z:4).  
**Depends on:** Phase 37  
**Requirements:** `FIX.md`, 5 imagens de referência do usuário, `PixiArena.tsx`, `ThaisCityArena.tsx`, `extract-thais-region.mjs`, `extract-tibia1098-thais.mjs`.  
**Success Criteria:**
1. Fontes de XP, Magia/Falas, Dano e Cura têm rigorosamente o mesmo tamanho (`fontSize: 7`), ligeiramente menor que o nome do personagem (`fontSize: 8`).
2. Movimentação na cidade utiliza `VisualMotionTrack` com velocidade linear uniforme e sincronização de passos perfeita, eliminando desacelerações bruscas a cada tile.
3. Itens multi-tile e paredes divisórias (itens 1618, 1621, 1626, 1644, 1526) não sofrem offsets negativos artificiais, alinhando-se perfeitamente aos seus tiles de origem e eliminando cortes e colisões indesejadas no banco, depot e escadas.
4. Estruturas superiores do barco (mastros, velas, cabine do capitão e quarterdeck em Z:5 e Z:4) extraídas e renderizadas na camada superior de Thais, totalizando mais de 1.180 sprites de itens autênticos do Tibia 10.98.
5. 100% dos testes passando (33 arquivos de teste, 221/221 testes) e 0 erros de tipagem no TypeScript (`npm run typecheck`).

Plans:
- [x] 38-01-PLAN: Unificar fontes na caçada, sincronizar VisualMotionTrack na cidade, corrigir alinhamento de tiles e renderizar mastros/velas do barco.

---

### Phase 39: Integração de mapaserver.otbm, Resposta Instantânea do Teclado (0ms) e Velocidade Urbana Dobrada (2x)

**Goal:** Substituir o mapa de Thais pelo arquivo oficial fornecido pelo usuário (`mapaserver.otbm`), restaurando os offsets de sprites autênticos do Tibia para todas as paredes, estruturas e itens; dobrar a velocidade de locomoção na cidade (2.0x / +100% de bônus); e eliminar o delay nas setinhas através de resposta imediata com tracking de teclas pressionadas e repetição fluida contínua.  
**Depends on:** Phase 38  
**Requirements:** `FIX.md`, `mapaserver.otbm`, `GamePrototype.tsx`, `ThaisCityArena.tsx`, `extract-thais-region.mjs`, `extract-tibia1098-thais.mjs`.  
**Success Criteria:**
1. O mapa de Thais é 100% extraído diretamente do arquivo do usuário `mapaserver.otbm` (145MB), cobrindo todos os tiles de Z:7 (18.271) e Z:6 (7.722) com pureza de dados.
2. Todas as paredes, construções, portas, árvores e balcões respeitam seus tiles de ancoragem no grid sem deslocamentos fora de lugar.
3. Velocidade urbana dobrada: `cityStepDurationMs = Math.round(baseStepDurationMs / 2.0)` (ex: 250ms no lvl 20 e 200ms no lvl 50).
4. Resposta instantânea de teclado: ao tocar na setinha ou WASD, o personagem dá o passo imediatamente com 0ms de delay (sem aguardar o repeat delay do sistema operacional) e caminha de forma contínua e veloz enquanto a tecla for mantida pressionada.
5. 100% dos testes passando (34 arquivos de teste, 226/226 testes) e 0 erros de tipagem no TypeScript (`npm run typecheck`).

Plans:
- [x] 39-01-PLAN: Integrar mapaserver.otbm, restaurar offsets autênticos, dobrar velocidade urbana e implementar resposta instantânea de teclado.

---

### Phase 40: Velocidade Normal na Cidade, Bloqueio Estrito de Paredes e Âncora Canto Inferior Direito do SQM

**Goal:** Ajustar a velocidade de caminhada na cidade ao segurar a seta para a velocidade normal do personagem (`baseStepDurationMs`), garantindo cadência suave e sem velocidade excessiva; aplicar bloqueio estrito (`!tile || !tile.walkable`) no movimento manual e no pathfinding, impedindo completamente o personagem de subir ou andar em cima de paredes ou transitar por tiles vazios/não mapeados; e alinhar o personagem no canto inferior direito do tile/SQM (`creatureVisualLayout.spriteAnchorX: 1, creatureVisualLayout.spriteAnchorY: 1, creatureVisualLayout.spriteOffsetX: 16, creatureVisualLayout.spriteOffsetY: 16`), unificando a perspectiva visual autêntica do Tibia em todas as arenas.  
**Depends on:** Phase 39  
**Requirements:** `FIX.md`, imagem do usuário, `GamePrototype.tsx`, `pathfinding.ts`, `ThaisCityArena.tsx`, `TrainingArena.tsx`.  
**Success Criteria:**
1. Ao segurar a setinha ou tecla WASD, o personagem caminha na sua velocidade normal baseada na fórmula oficial de nível do TFS (`cityStepDurationMs = baseStepDurationMs`), sem acelerações desproporcionais.
2. O passo inicial responde imediatamente com 0ms de delay ao pressionar a tecla, e a caminhada contínua é sincronizada a cada `cityStepDurationMs`.
3. Bloqueio estrito de colisão: `if (!tile || !tile.walkable) return current;` no `GamePrototype.tsx` e `if (!tile || !tile.walkable) continue;` no `pathfinding.ts`, impedindo que paredes (como a parede de tijolo 1025 e framework 1036) ou coordenadas fora do mapa sejam ultrapassadas.
4. O personagem é posicionado no canto inferior direito do SQM (`anchor(1, 1)` em `+16, +16`), conferindo fidelidade visual absoluta ao Tibia e paridade com a arena de caçada (`PixiArena.tsx`).
5. 100% dos testes passando (35 arquivos de teste, 229/229 testes) e 0 erros de tipagem no TypeScript (`npm run typecheck`).

Plans:
- [x] 40-01-PLAN: Restaurar velocidade normal, aplicar bloqueio estrito de paredes e alinhar personagem no canto inferior direito do SQM.



