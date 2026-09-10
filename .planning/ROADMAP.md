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
- [x] **Phase 41: Tooltip Global de Atributos de Itens e Inspeção de Jogadores na Cidade**
- [x] **Phase 42: Arquitetura PostgreSQL + Prisma ORM e Autenticação Multi-Role (Admin / Player)** - Modelagem relacional para VPS padrão com Prisma, contas com hashing bcrypt, múltiplos personagens, inventário, skills, roles (admin/player) e endpoints REST de auth.
- [x] **Phase 43: Servidor de Jogo Autoritativo com Colyseus.js & Game Loop em Ticks** - Servidor Node.js com Colyseus Room (`ThaisCityRoom`, `HuntRoom`), engine de combate autoritativa (100ms ticks), colisão OTBM, IA de monstros e validação anti-cheat.
- [x] **Phase 45: Refatoração do Frontend para Colyseus.js Client & Telas de Auth/Admin** - Telas de Login, Cadastro, Seleção/Criação de Personagem, Painel de Admin (`@colyseus/monitor` + GM commands) e PixiJS consumindo delta-snapshots com interpolação suave.
- [x] **Phase 46: Persistência PostgreSQL em Lote, Reconexão Nativa Colyseus e Testes E2E** - Auto-save periódico via Prisma, grace period de reconexão após F5 (`allowReconnection`) e suíte de testes multiplayer automatizada no Vitest.
- [x] **Phase 47: Correção de Cores ao Andar, +100 Velocidade na Cidade e Chat Local/World com Texto Flutuante** - Preload de frames de caminhada e fallback seguro de recolor, bônus de +100 pontos de velocidade na cidade, janela de Chat com abas Local/World, atalho Enter para foco imediato e falas flutuantes em amarelo (local) e azul (world).
- [x] **Phase 60: Painel de Administração Completo (Controle de Variáveis do Servidor, Tabela de Players Online, Logs do Sistema e Métricas)** - Painel administrativo em /admin com controle dinâmico de variáveis do servidor, tabela pesquisável de players com comandos GM, logs do sistema e saúde do servidor.
- [x] **Phase 61: Desativação Temporária do Convite de Party de Outros Jogadores Reais** - Ocultação da opção no menu de contexto, desativação do modal de convite e desativação dos handlers WebSocket mantendo intacto o Squad individual de 4 heróis do jogador.
- [x] **Phase 62: Remoção do Sistema de Trade entre Personagens** - Remoção da opção no menu de contexto, da janela de Trade, do registro no WindowManagerContext e do gerenciamento de estado de troca no frontend.
- [x] **Phase 63: Correção de Vulnerabilidades de Segurança & Blindagem Server-Side (Anti-Cheat, Autenticação de APIs Admin e Autenticidade WebSocket)** - Autenticação JWT estrita com verificação de role `ADMIN` em todas as rotas `/api/admin/*`, restrição de teleporte (`player:teleport`) apenas para GMs, eliminação de noclip em `handlePlayerMove`, remoção de personificação via `mockCharacter` em produção e validação estrita no servidor.
- [x] **Phase 64: Unificação da Engine Server-Side, Persistência Relacional Completa (Inventário/Gold/Depot), Validação de Posse de Personagem e Progressão Offline Real** - Validação estrita `dbChar.accountId === accountId` no `onJoin`, persistência relacional de inventário/skills/gold/depot no Prisma, visualização real-time de todos os players online na Thais City e cálculo de progresso offline.
- [x] **Phase 65: Visibilidade e Persistência de Jogadores Remotos na Thais City Arena** - Eliminação de evicção de jogadores remotos, preservação de estado multiplayer e estabilidade na cidade.
- [x] **Phase 66: Experiência Autêntica de Monstros e Progressão de Nível** - Valores canônicos de XP para criaturas e fórmula autêntica de level up sem inflação.
- [x] **Phase 67: Loja da Cidade (NPC Item Shop) com Filtros por Categoria, Vocação e Compra por Gold Coins** - ShopWindow com compras de armas, armaduras, consumíveis e validação de ouro.
- [x] **Phase 68: Modal Autêntico de Morte ("You are dead"), Sistema de Penalidade por Morte (XP, Skills e Loot) e Controles de Penalidade no Painel Admin** - Janela clássica "You are dead" ao morrer, perda configurável de 10% de XP, 10% de skills e loot da caçada, teleporte ao Templo de Thais e controles dinâmicos de penalidade no Painel de Administração (/admin).
- [x] **Phase 69: Auditoria e Conexão Integral de Progressão (XP, Skills e Magic Level)** - Sincronização completa de evolução entre cliente e banco de dados.
- [x] **Phase 70: Botão de Mandar Mensagem e Ações Diretas na Lista de Amigos** - Botão e atalhos para interagir e conversar diretamente com amigos da lista.
- [x] **Phase 71: Verificação de Existência de Personagem na Lista de Amigos** - Consulta ao banco de dados e jogadores ativos antes de adicionar amigo.
- [x] **Phase 72: Roteamento de Mensagens Privadas (Whisper) e Entrega Multijogador** - Roteamento autoritativo de whispers no Colyseus e entrega direta ponta a ponta.
- [x] **Phase 73: Abas Privadas Dedicadas no Chat para Mensagens Diretas (1-to-1 PMs) com Fechamento** - Abas com o nome do personagem na ChatWindow para conversas privadas isoladas do World/Local Chat, envio direto e botão de fechar (✕).
- [x] **Phase 74: Personagens Novos em Nível 1 e Verificação de Visibilidade Urbana em Thais** - Inicialização de novos personagens estritamente no Nível 1 (0 XP, 150 HP, 35 MP, 400 cap), e auditoria completa com verificação das tags de visibilidade urbana no Templo de Thais (inHunt: false, posZ: 7, outfit, vocation e nameplate).
- [x] **Phase 75: Itens de Teste na Loja (Nível, Skills e Gold por 0 GP)** - Adição de itens de teste gratuitos na loja (0 gold) para avançar 1 nível (com recálculo de stats), avançar 1 ponto em cada skill e comprar pacotes de gold livremente.
- [x] **Phase 76: Escolha de Vocação no Nível 8+, Remoção da Escolha na Criação e Item de Troca de Vocação (Gold & 0 GP)** - Remoção do seletor de vocação na criação de personagem (todos nascem sem vocação / None no nível 1), trava de escolha de vocação ao atingir Nível 8+ (irreversível), e inclusão do Pergaminho de Troca de Vocação na Loja por Gold Coins e na Loja de Testes por 0 GP.
- [x] **Phase 77: Progressão Difícil de Desbloqueio de Slots de Personagem e Restrição de Vocações Únicas por Conta** - Trava progressiva de nível mais exigente para liberação dos 4 slots de personagens por conta (Slots no Nível 1, 50, 100 e 150) e restrição estrita de vocações únicas por conta (sem vocações repetidas no grupo/conta: 1 Knight, 1 Paladin, 1 Sorcerer, 1 Druid).
- [x] **Phase 78: Auditoria de Progressão de Skills, Vantagens por Atributo e Tooltips na UI** - Bônus de velocidade e ataque para melee, resistência mágica para ML, mitigação física para Shielding e tooltips descritivos na UI.
- [x] **Phase 79: Sistema de Estamina da Conta (Account-Wide Stamina System)** - Estamina proporcional ao personagem de maior nível na conta, consumo em caçada, ejeção compulsória ao zerar (0 min), regeneração passiva por tempo e regeneração acelerada na Zona de Treinamento.
- [x] **Phase 80: Modo Caçada Auto-Idle Autônoma (Full Auto-Idle Hunt & Training Loop)** - Botão/estado de Auto-Idle persistido no banco Prisma DB (`isAutoIdle`), ciclo autônomo de caçada, auto-venda de loot, auto-compra de poções ao esgotar, rotação automática para a zona de treino (dummies) ao zerar estamina e retorno automático à caçada ao regenerar estamina total.
- [x] **Phase 81: Sistema de Poção Automática Inteligente, Auto-Configuração de Hotbar e Cura de Emergência Anti-Morte com Persistência Prisma** - Auto-equipamento da melhor poção de cura no menu/hotbar do personagem, sistema de cura preditiva de emergência antes do golpe fatal e salvamento permanente do array da hotbar no Prisma DB (`Character.hotbarJson`).
- [x] **Phase 82: Correção de Runtime TexturePool no PixiJS v8 e Efeitos Visuais das Wands de Sorcerer** - Polyfill/blindagem universal de `TexturePool.returnTexture` no PixiJS v8 (eliminando o crash `Cannot read properties of undefined (reading 'push')` na troca/criação de personagem), inclusão canônica de projéteis (`projectileId = 5` / `CONST_ANI_ENERGY`) e impactos (`effectId = 12` / `CONST_ME_ENERGYHIT`) de Wands (Wand of Vortex), pré-carregamento e renderização de projéteis no `ThaisCityArena`, range de ataque para vocações mágicas na cidade e avanço de `magicLevel` para Sorcerers nos dummies.
- [x] **Phase 84: Migração dos Importadores para Dados Autorizativos do Tibia 11 e Pré-Carregamento das Texturas do Mapa de Thais** - Atualização de `packages/styller-importer` para ler diretamente arquivos do Tibia 11 / `realmap11` (`items.otb`, `items.xml`, `monsters.xml`, `spells.xml`, `vocations.xml`, `npc/`), importação de magias e fórmulas do TFS 1.x, e correção do carregamento visual das texturas dos itens de mapa (pisos, paralelepípedos, paredes e telhados) no `ThaisCityArena.tsx`.
- [ ] **Phase 85: Início Direto de Caçada sem Caminhada Prévia, Alinhamento de Magias de Knight e Modal de Configuração de Ação Avançado com Regras/Condições Customizadas** - Eliminação da caminhada prévia até o cais ao clicar em "Iniciar Caçada" (transição imediata), alinhamento completo do catálogo de magias de Knight no importador e motor de jogo, e reformulação visual/funcional do modal `Configurar ação` (`HotbarConfigModal.tsx`) com abas (Magias/Runas/Itens), busca, detalhes do poder/fórmula, monstros ignorados e regras de disparo/condições por slot com suporte a persistência no Prisma DB.
- [x] **Phase 86: Botão de Remover Slot em Hotkeys, Trava de Nível Mínimo para Magias/Runas, Catálogo Completo e Correção de Ícones** - Adição do botão de remoção/limpeza de ação do slot na hotbar, restrição estrita de nivelamento mínimo (não permite equipar magias/runas sem level necessário), auditoria e inclusão de todas as magias ausentes da vocação no catálogo e correção dos mapeamentos de ícones das magias no `Tibia11ActionIcon`.
- [x] **Phase 87: Acionamento Manual de Magias por Hotkeys (F1 a F10 / F12) em Thais e Caçadas** - Habilitação do disparo manual de magias de cura (`exura`, `exura gran`), buffs (`utani hur`, `utamo vita`), poções e magias ofensivas pressionando F1 a F10 (e 1-0) via teclado tanto na cidade de Thais quanto nas caçadas com animação de slot e acionamento de cooldown.
- [x] **Phase 88: Sincronização Dinâmica da Barra de Progresso de XP (XP Progress Bar Tracking)** - Substituição dos cálculos estáticos/lineares pela fórmula autoritativa `experienceProgress(level, experience) * 100` do domínio no `BottomConsoleHUD`, `SkillsWindow`, `LeftSidebar` e `RightSidebar`, garantindo que a barra de XP atualize em tempo real a cada monstro derrotado e ganho de experiência.
- [x] **Phase 89: Tela de Carregamento de Login e Sincronização Atômica de Estado do Personagem** - Ocultação total do personagem provisório no templo de Thais durante a entrada no jogo, exibição de tela de carregamento autêntica estilo Tibia e inicialização direta com nome, outfit e coordenadas salvas do banco de dados.
- [x] **Phase 90: Perseguição Universal de Monstros e Seleção Dinâmica de Alvos (ALVO - Mais próximo, Menor vida, Maior vida)** - Expansão do raio de detecção de monstros para 50+ tiles garantindo perseguição agressiva de todos as criaturas no mapa, e implementação funcional do dropdown ALVO no BottomConsoleHUD integrando as estratégias `'closest'`, `'lowest-hp'` e `'highest-hp'` na ordenação de alvos no combate.
- [x] **Phase 91: Extração e Correção de Sprites Autênticas de Poções (Health, Mana, Spirit e Variações) via Tibia 10.98 & RealMap 11** - Mapeamento e extração determinística via items.otb e Tibia.dat/Tibia.spr de todas as poções de cura, mana, spirit e elixires do jogo (7618, 7620, 7588, 7589, 7590, 7591, 8472, 8473, 26029, 26030, 26031, 8704, 7439, 7440, 7443, 8474), substituição dos ícones sintéticos/embaçados no Tibia11ActionIcon e ItemSprite pelas sprites transparentes originais e integração total na Action Bar, Hotbar e Loja.
- [x] **Phase 92: Animação Autêntica de Poções (APNG Star Glint), Remoção de Quantidade no Menu de Ações e Travas de Nível por Vocação** - Geração de PNGs animados nativos (APNG) com 12 frames de brilho estelar autêntico extraídos do Tibia.spr para poções de alto nível (Ultimate/Supreme) e loop de brilho no vidro para poções canônicas, remoção das badges numéricas de quantidade no modal de configurar ação e aplicação estrita de nível mínimo e vocação para seleção/uso de poções.
- [x] **Phase 93: Ícones Oficiais de Magias de Sorcerer via Tibia 11 (graphics_resources.rcc)** - Extração dos ícones 32x32 oficiais do Tibia 11 RCC para todas as magias de Sorcerer, garantindo 100% de paridade visual em toda a interface.
- [x] **Phase 94: Ícones e Sprites Autênticos de Runas via Tibia 10.98 Client** - Extração direta das 34 runas canônicas do Tibia 10.98, eliminando o reuso de ícones de magias e unificando o visual nas 4 áreas da interface.
- [x] **Phase 95: Efeitos Visuais, Projéteis e Áreas de Impacto Autênticas de Runas via RealMap 11** - Correção autoritativa de effectId e projectileId de todas as 34 runas canônicas de acordo com realmap11 scripts e const.h (SD 18/32, Avalanche 42/29, GFB 7/4, Explosion 5/41, Thunderstorm 12/36, Stone Shower 45/30), detonação sincronizada de área no impacto (+240ms) na PixiArena e ThaisCityArena, preservando os ícones corrigidos e regras de combate.
- [x] **Phase 96: Sincronização de Impacto de Projéteis, Números de Dano, Redução de HP e Área das Runas** - Adoção da duração única de 240ms para voo e impacto, sincronização simultânea de dano e área para alvos múltiplos, estabilidade na vida em golpes sucessivos e surgimento de corpo apenas no impacto em golpes fatais.
- [x] **Phase 97: Correção do Sistema de Condições para Uso Automático de Poções, Magias e Runas** - Cada slot da hotbar respeita rigorosamente as condições customizadas salvas (alvo, métrica, operador, valor e % ou absoluto), eliminando hardcodes (como limite fixo de 50%), garantindo que slots desativados nunca executem, condições não interfiram entre slots, e persistência permanente no Prisma DB entre relogs.
- [x] **Phase 98: Sprites Autênticos de Monstros, Ícones Canônicos de Magias Tibia 11, Efeitos Visuais das Magias e Coordenadas da Caçada dos Ratos** - Geração de thumbnails 32x32 nítidos e centralizados para todos os 13 monstros do jogo com suporte a `thumbUrl` no `HuntSelector`, alinhamento de 146 ícones oficiais 32x32 do Tibia 11 para todas as vocações, importação autoritativa de `effectId` e `projectileId` do `realmap11/src/const.h` para 86+ magias, e garantia estrita da caçada dos ratos iniciando em (32102, 32205, 8) com HUD de coordenadas RealMap e inicialização instantânea sem congelamento na `PixiArena`.
- [x] **Phase 99: Tela Épica de Carregamento Exura (5s), Prevenção da Perda de XP ao Sair da Hunt e Persistência Atômica de Transição** - Implementação da tela de loading oficial de 5 segundos utilizando os assets Exura Idle Adventures (`loading-bg.jpg` e `loading-bar-frame.png`), com barra vermelha pulsante/magma dentro da moldura ornamental, ativação nas 3 transições (login/seleção, saída da caçada e início/troca de caçada), correção da causa raiz da perda indevida de XP ao sair de hunts (substituição de `respawnInTemple` por `leaveHunt`, 0% perda de XP/skills) e sincronização atômica imediata via `saveProgress()` no Prisma DB.
- [x] **Phase 100: Correção Crítica da Inicialização de Jogo, Remoção de Bloqueio de Tela Preta e Exibição Confiável da Tela de Loading Exura na Cidade e Hunts** - Inicialização imediata do PixiJS sem display: none, ResizeObserver dinâmico, eliminação de race conditions na troca de tela e conversão segura de BigInt no save.
- [x] **Phase 101: Correção Visual da Tela de Loading Exura (Vanilla CSS) e Restauração Integral do Mapa de Thais com Dynamic Texture Binding** - Loading screen com Vanilla CSS puro inline e global, ordenação de texturas por proximidade ao Templo (32369, 32241, 7) e Dynamic Texture Binding sem pisos substitutos de madeira.
- [x] **Phase 102: Visibilidade da Barra de Progresso de Loading e Duração de 10 Segundos** - Calibração visual da barra de preenchimento (gradiente de magma vibrante, realce de topo, centelha incandescente frontal e porcentagem em tempo real) e expansão da duração da tela de loading para 10 segundos (10000ms) no login, transições de caçada e /game-preview.
- [x] **Phase 103: Trilha Sonora de Thais em Loop (Sunset in the Village), Opções de Volume e Botão de Mute Rápido** - Reprodução da música Sunset in the Village iniciando ainda na tela de carregamento, loop contínuo durante toda a estadia em Thais, pausa em caçadas, seção de volume completa dentro do menu sanduíche e botão de mute/desmutar rápido (🔊 / 🔇) ao lado do botão de sair com atalho de teclado 'M'.
- [x] **Phase 104: Notificação Flutuante de Música Atual ("Thais Theme") com Transição Deslizante da Direita** - Notificação com banner "Now Playing" para Thais Theme com animação deslizante lateral da direita, equalizador e barra de contagem regressiva.
- [x] **Phase 105: Exibição da Caixa de Notificação de Música ("Thais Theme") Estritamente Após a Tela de Carregamento (Loading)** - Enfileiramento e exibição do banner de música somente após a tela de carregamento de 10s terminar.
- [x] **Phase 106: Preenchimento Proporcional Contínuo e Visual da Barra de Loading Conforme a Porcentagem** - Sincronização e calibração estrita da barra de progresso da tela de carregamento Exura a 60fps em sincronia com a porcentagem, indicador numérico interno e cavidade geométrica alinhada.
- [x] **Phase 107: Diferimento da Entrada e Visibilidade do Personagem até o Fim do Loading (Spawn Seguro Pós-Loading e Proteção Anti-Morte em Caçadas)** - Bloqueio do loop de combate durante o loading, ocultação do personagem até 100% da barra e inicialização segura da hunt somente ao término do loading para evitar mortes precoces.
- [x] **Phase 108: Seletor de Caçadas em Carrossel Horizontal de Cards (Design Exura Medieval / RPG Clássico)** - Refatoração visual completa da janela de caçadas para carrossel horizontal de 3 cards simultâneos com design medieval autêntico, ilustrações temáticas em pixel art, sprites pixelados, medalhões de nível, coloração dinâmica de dificuldade, botão de mochila com tooltip flutuante de loot e botão principal "INICIAR CAÇADA".
- [x] **Phase 109: Trilha Sonora do Dragon Lair (Dragons Pride) no Loading e Notificação Pós-Carregamento** - Reprodução de "Dragons Pride" iniciando imediatamente na tela de loading ao entrar no Dragon Lair, pausa da trilha de Thais, e exibição da caixa de notificação musical deslizante ("Dragons Pride") estritamente após a conclusão do carregamento com o personagem já visível no mapa.
- [x] **Phase 110: Tela de Carregamento de Thais (Nova Ilustração do Templo) e Sistema de Curiosidades Rotativas ("Você Sabia?")** - Integração da nova arte oficial do Templo de Thais no loading, e introdução do sistema de curiosidades/lore de Tibia que alternam aleatoriamente a cada 3 segundos com transições suaves acima da barra de carregamento.
- [x] **Phase 111: Telas de Carregamento Modulares por Caçada & Loading de Dragon Lair** - Arquitetura de loadings temáticos individuais por caçada com fallback para Thais, e configuração do Dragon Lair com a nova ilustração do Dragão na caverna e curiosidades sobre Garsharak e Dragon Lords.
- [x] **Phase 112: Correção de Nível/XP Autoritativo, Acessibilidade de Respawns do Dragon Lair e Modal de Ficha do Personagem com 5 Avatares** - Reconciliação e sincronização monótona de XP/nível, validação de caminho A* no respawn do Dragon Lair e reset de views no PixiArena, e novo Modal de Ficha do Personagem com abas e 5 avatares persistidos.
- [x] **Phase 113: Tela de Carregamento de Thais na Morte do Personagem (Death Loading Transition)** - Ativação da tela de carregamento oficial de Thais com curiosidades rotativas de lore e transição de áudio ao morrer e confirmar o respawn no templo, com pausa da caminhada durante os 10s.
- [x] **Phase 114: Troca Rápida de Habilidades e Ações na Hotbar via Drag-and-Drop (Arrastar e Soltar Slots F1 a F12)** - Suporte a arrastar e soltar (HTML5 DnD) magias, runas e poções entre slots da hotbar (F1 a F12 e 1 a 0), troca atômica de posições e configurações sem efeito cascata em slots intermediários, feedback visual (borda dourada brilhante e opacidade) e persistência permanente no banco de dados via `/api/characters/[id]/save`.
- [x] **Phase 116: Blindagem de Sessão/Auth Admin, Cadastro Seguro e Correção de Frame Parado (Idle Pose)** - Centralização da gestão de sessão com limpeza atômica de cookies/tokens/conexões no logout; bloqueio absoluto de escalação de privilégios no cadastro público (apenas PLAYER) e validação estrita de JWT_SECRET; desacoplamento entre caminho pendente e movimento físico real, eliminação de callbacks assíncronos desatualizados e atualização contínua de texturas provisórias para restaurar a pose de repouso (frame 0) exata.
- [x] **Phase 117: Pipeline Autêntico de Animação Tibia 10.98 (Idle Frame 0 Canônico e Ciclo Completo de Caminhada com 8 Frames)** - Separação canônica entre FrameGroup 0 (Idle / Repouso com pés juntos) e FrameGroup 1 (Moving com 8 frames completos) no extrator de DAT/SPR, exportação dos assets f0 (idle) e f1..f8 (caminhada fluida), e sincronização dos motores de renderização PixiJS da cidade e caçada com o ciclo completo de 8 passos do Tibia 10.98.
- [x] **Phase 118: Identidade Visual Exura e Janela de Autenticação Estilo Tibia** - Substituição do logo Cavebound pela nova marca Exura e estilização autêntica estilo Tibia para o modal de autenticação.
- [x] **Phase 119: Substituição dos Avatares do Jogo pelas Novas Ilustrações** - Troca dos 5 avatares do perfil do jogador pelas artes ilustradas canônicas com suporte retroativo.
- [x] **Phase 120: Correção de Montarias, Alinhamento Relativo por DAT Displacement, Cache Definitivo e Addons Montados** - Preservação do ThingAttrDisplacement (atributo 24) do Tibia.dat, extração completa de addons montados (z=1) em idle e walk cycle, cálculo de offset relativo sem constantes arbitrárias, e blindagem estrita contra cache poisoning no getRecoloredCanvasSync.


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
| 47. Correção de Cores ao Andar, +100 Velocidade na Cidade e Chat Local/World com Texto Flutuante | 1/1 | Complete | 2026-09-04 |
| 53. Deletar Personagem na Seleção de Personagem & Banco de Dados | 1/1 | Complete | 2026-09-04 |
| 54. Inicialização Solo do Squad & Desbloqueio de Slots por Nível (Lv 50, 90, 120 + Isenção Admin/GM) | 1/1 | Complete | 2026-09-04 |
| 55. Renderização Multiplayer de Jogadores Remotos na Cidade (ThaisCityArena) | 1/1 | Complete | 2026-09-04 |
| 56. Sistema Multiplayer de Party (Convite Amigos/ContextMenu, Seguir Líder, Caçada Cooperativa e Target Coletivo) | 1/1 | Complete | 2026-09-04 |
| 57. Correções Críticas de Combate/Rede e Fidelidade Visual (FIX.md) | 1/1 | Complete | 2026-09-05 |
| 58. Correção da Tela de Hunt (Fullscreen/Viewport), Ataque Único sem Duplicação e Lógica Estrita de Party Target | 1/1 | Complete | 2026-09-05 |
| 59. Transição Síncrona de Caçada em Grupo ("Iniciar com o Time"), Ocultação em Hunt e Fim da Duplicação de Personagens | 1/1 | Complete | 2026-09-05 |
| 60. Painel de Administração Completo (Controle de Variáveis do Servidor, Tabela de Players Online, Logs do Sistema e Métricas) | 1/1 | Complete | 2026-09-05 |
| 61. Desativação Temporária do Convite de Party de Outros Jogadores Reais | 1/1 | Complete | 2026-09-05 |
| 62. Remoção do Sistema de Trade entre Personagens | 1/1 | Complete | 2026-09-05 |
| 63. Correção de Vulnerabilidades de Segurança & Blindagem Server-Side | 1/1 | Complete | 2026-09-05 |
| 64. Unificação da Engine Server-Side, Persistência Relacional e Progressão Offline | 1/1 | Complete | 2026-09-05 |
| 68. Modal Autêntico de Morte ("You are dead"), Sistema de Penalidade e Painel Admin | 1/1 | Complete | 2026-09-05 |
| 69. Auditoria e Conexão Integral de Progressão (XP, Skills e Magic Level) | 1/1 | Complete | 2026-09-05 |
| 70. Botão de Mandar Mensagem e Ações Diretas na Lista de Amigos | 1/1 | Complete | 2026-09-05 |
| 71. Verificação de Existência de Personagem na Lista de Amigos | 1/1 | Complete | 2026-09-05 |
| 72. Roteamento de Mensagens Privadas (Whisper) e Entrega Multijogador | 1/1 | Complete | 2026-09-05 |
| 73. Abas Privadas Dedicadas no Chat para Mensagens Diretas (1-to-1 PMs) com Fechamento | 1/1 | Complete | 2026-09-06 |
| 91. Extração e Correção de Sprites Autênticas de Poções via Tibia 10.98 | 1/1 | Complete | 2026-09-09 |

-----

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

---

### Phase 41: Tooltip Global de Atributos de Itens (Sempre no Topo) e Inspeção de Jogadores na Cidade (Level, Vocação e Status Premium)

**Goal:** Implementar o sistema singleton de tooltip global para itens no nível raiz do app (`z-index: 99999999` com clamping contra bordas), eliminando de vez casos onde o card de atributos ficava atrás de outras janelas ou era cortado; exibir atributos completos (ataque, defesa, armadura, peso, level requerido, slot, tipo, badges especiais e preços) ao passar o mouse em itens no inventário, paperdoll, bolsa, mochila, depot e barra lateral; e implementar inspeção interativa ao passar o mouse sobre outro player na cidade de Thais, exibindo card dedicado com nome, level, vocação e status de conta (Premium/Free).  
**Depends on:** Phase 40  
**Requirements:** `FIX.md`, `InventoryWindow.tsx`, `RightSidebar.tsx`, `DepotWindow.tsx`, `EquipmentPanel.tsx`, `ThaisCityArena.tsx`, `GamePrototype.tsx`.  
**Success Criteria:**
1. Ao passar o mouse em qualquer item (equipamento, consumível, stack) no inventário, mochila, bolsa, depot ou barra lateral, seus atributos completos são exibidos.
2. O tooltip de atributos é renderizado na camada global com `position: fixed` e `z-index: 99999999`, permanecendo 100% visível sobre qualquer janela flutuante, modal ou HUD sem nunca ficar por trás.
3. Ao passar o mouse em cima de outro jogador na cidade de Thais (membros do grupo ou outros aventureiros), surge um card de inspeção exibindo o Nome, Level, Vocação e Status de Conta (Premium Account com badge dourada ou Free Account).
4. O card de inspeção de jogadores na cidade também é renderizado na camada de topo (`z-index: 99999999`) sem ser bloqueado pelo canvas ou janelas.
5. 100% dos testes passando (36 arquivos de teste) e 0 erros de tipagem no TypeScript (`npm run typecheck`).

Plans:
- [x] 41-01-PLAN: Implementar tooltip global de atributos de itens e inspeção de jogadores na cidade.

---

## Milestone 2: Backend Autoritativo (Colyseus.js), Banco de Dados (PostgreSQL + Prisma) e Multiplayer em Tempo Real

### Phase 42: Arquitetura PostgreSQL + Prisma ORM e Autenticação Multi-Role (Admin / Player)

**Goal:** Estruturar o banco de dados relacional leve e robusto para qualquer VPS padrão usando PostgreSQL e Prisma ORM, contemplando contas de usuário (`Account`), papéis de acesso (`role: 'ADMIN' | 'PLAYER'`), múltiplos personagens por conta (`Character`), inventário (`InventoryItem`), skills (`CharacterSkill`), depot (`DepotItem`) e magias conhecidas (`LearnedSpell`), acompanhado de API REST com JWT, bcrypt e validação de regras de criação de personagens (vocações, loadouts de `firstitems.lua` e spawn no templo de Thais).  
**Depends on:** Phase 41  
**Requirements:** `schema.prisma`, migrações SQL para PostgreSQL (compatível com SQLite em testes de CI), hashing seguro de senhas com `bcryptjs`, endpoints de Auth (`/api/auth/register`, `/api/auth/login`, `/api/auth/me`), endpoints de Personagem (`/api/characters/create`, `/api/characters/list`, `/api/characters/delete`).  
**Success Criteria:**
1. Schema Prisma define com integridade referencial: `Account` (email, password_hash, role, coins, is_banned), `Character` (account_id, name, vocation_id, level, xp, hp, max_hp, mp, max_mp, cap, pos_x, pos_y, pos_z, outfit), `CharacterSkill`, `InventoryItem`, `DepotItem` e `LearnedSpell`.
2. Compatibilidade total com VPS padrão: funciona com PostgreSQL nativo via conexão padrão `DATABASE_URL=postgresql://user:pass@localhost:5432/tibia_idle`.
3. API de autenticação permite registro e login, retornando JWT com claims tipadas e verificação de role `ADMIN` vs `PLAYER`.
4. Criação de novo personagem aplica regras estritas do Styller/TFS: nome único, vocação válida (Knight, Paladin, Sorcerer, Druid), atribuição de itens iniciais de `firstitems.lua` e coordenadas no templo de Thais (32369, 32241, 7).
5. 100% dos testes unitários e de integração de banco/auth passando com 0 erros de tipagem no TypeScript (`npm run typecheck`).

Plans:
- [x] 42-01-PLAN: Implementar schema Prisma para PostgreSQL, migrações, serviços de autenticação multi-role (JWT/bcrypt) e endpoints de gestão de personagens.

---

### Phase 43: Servidor de Jogo Autoritativo com Colyseus.js & Game Loop em Ticks

**Goal:** Implementar o servidor de simulação de jogo autoritativo utilizando **Colyseus.js (`colyseus`)**, criando as salas de jogo (`ThaisCityRoom`, `HuntDungeonRoom`, `TrainingRoom`) com game loop em ticks determinísticos de 100ms (`setSimulationInterval`), extraindo toda a física, colisão de tiles OTBM, IA de monstros, perseguição (chase), fórmulas de combate TFS e resolução de cooldowns para o backend.  
**Depends on:** Phase 42  
**Requirements:** Servidor dedicado Node.js com `@colyseus/core` e `@colyseus/ws-transport`, classes de Room (`ThaisCityRoom`, `HuntDungeonRoom`), importadores de dados e mapas OTBM reaproveitados server-side, validação estrita anti-cheat de passos baseada em `baseStepDurationMs`.  
**Success Criteria:**
1. Servidor Colyseus roda em processo Node.js dedicado com game loop de 100ms (10 ticks/segundo) autoritativo e contínuo.
2. Entrada no mundo: o jogador autenticado entra na sala `ThaisCityRoom` enviando o `token` JWT e o `characterId`; o servidor valida a posse do personagem e injeta a entidade no estado da sala.
3. Movimentação validada no backend: intenções de passo (`move`) são validadas contra o mapa OTBM e tempo mínimo entre passos, rejeitando atravessamento de paredes (anti-noclip) e teletransporte (anti-speedhack).
4. Combate autoritativo: ataques, magias (`exori`, `exura`), poções, cálculo de armor/defesa e morte/respawn de monstros são resolvidos 100% no servidor.
5. 100% dos testes de lógica do motor server-side passando no Vitest.

Plans:
- [x] 43-01-PLAN: Construir o servidor Colyseus.js com salas dedicadas, ciclo de vida de entidades, validação de movimento e combate centralizado.

---

### Phase 44: Sincronização de Estado com Colyseus Schema, Interest Management e Chat

**Goal:** Implementar a sincronização de estado em tempo real com **Colyseus Schema (`@colyseus/schema`)** utilizando compressão binária de deltas, sistema de Spatial Interest Management (transmissão de entidades em raio de visão de 15x11 tiles), broadcasting de eventos visuais de combate (dano, curas, feitiços) e canais de chat multiplayer em tempo real.  
**Depends on:** Phase 43  
**Requirements:** Schemas Colyseus (`PlayerSchema`, `MonsterSchema`, `CombatEventSchema`, `WorldRoomState`), Spatial Grid para filtragem de visibilidade, canais de chat (Local, Global, Party).  
**Success Criteria:**
1. Todos os jogadores conectados na mesma região visualizam a movimentação, direção e animação de passos uns dos outros em tempo real com sincronização de deltas binários do Colyseus.
2. Spatial Interest Management: Clientes só recebem atualizações de monstros e outros jogadores que estejam dentro ou próximos do seu viewport (15x11 tiles), otimizando a banda de rede e performance.
3. Eventos de combate efêmeros (danos numéricos flutuantes, animação de cura, projéteis e magias de área) são despachados de forma síncrona para todos os jogadores na área afetada.
4. Chat multiplayer funcional com suporte a `/say` (raio local de 8 tiles), `/yell` (raio de 30 tiles), canal Global e canal de Party.
5. Teste automatizado com múltiplos clientes virtuais simulando concorrência e troca de mensagens em tempo real.

Plans:
- [x] 44-01-PLAN: Desenvolver os Colyseus Schemas, Spatial Interest Management, broadcast de eventos de combate e sistema de chat multiplayer.

---

### Phase 45: Refatoração do Frontend para Colyseus.js Client & Telas de Auth/Admin

**Goal:** Refatorar a aplicação web frontend para atuar como um cliente fino conectado via **`colyseus.js`**, implementando telas estilizadas de Login, Cadastro, Seleção e Criação de Personagens (com prévias visuais), integrando o painel administrativo (`@colyseus/monitor` + comandos de GM) e conectando o canvas PixiJS para renderizar os schemas do Colyseus com interpolação `VisualMotionTrack`.  
**Depends on:** Phase 44  
**Requirements:** `colyseus.js` SDK no frontend, Telas de Login/Registro e Seleção de Personagens no design autêntico do Tibia 11, integração do `@colyseus/monitor` acessível em rota protegida `/admin`, refatoração de `ThaisCityArena.tsx` e `PixiArena.tsx` para consumir o `room.state`.  
**Success Criteria:**
1. Fluxo de entrada do usuário: Tela inicial de Login / Cadastro -> Tela de Seleção de Personagens (com botão de criar novo personagem escolhendo vocação e nome) -> Conexão à sala do Colyseus -> Transição suave para o jogo.
2. O frontend despacha apenas intenções (`room.send('move', { dir })`, `room.send('castSpell', { spellId })`, `room.send('attack', { targetId })`), eliminando simulação de física no cliente.
3. Renderização PixiJS se conecta aos listeners do Colyseus (`room.state.players.onAdd`, `onRemove`, `onChange`) interpolando coordenadas com `VisualMotionTrack` a 60 FPS estáveis.
4. Administradores autenticados (`role === 'ADMIN'`) têm acesso ao painel `@colyseus/monitor` para inspecionar salas, jogadores online, consumo de RAM e comandos de GM (`/kick`, `/ban`, `/teleport`).
5. 100% dos testes de componentes de UI e integração frontend-colyseus passando.

Plans:
- [x] 45-01-PLAN: Criar telas de Auth/Personagem, painel de administração e converter componentes PixiJS para o SDK `colyseus.js`.

---

### Phase 46: Persistência PostgreSQL em Lote, Reconexão Nativa Colyseus e Testes E2E

**Goal:** Implementar persistência otimizada no PostgreSQL via Prisma (auto-save periódico a cada 30 segundos e flush imediato no logout), retenção de sessão com reconexão nativa do Colyseus (`allowReconnection`) para proteção contra refresh de página ou perda transitória de rede, e suíte completa de testes E2E para validação de estabilidade do ecossistema cliente-servidor.  
**Depends on:** Phase 45  
**Requirements:** Serviço de persistência assíncrona em lote (`PrismaPersistenceManager`), `room.allowReconnection(client, 20)` no Colyseus, suíte de testes E2E com Vitest simulando o ciclo completo de múltiplos jogadores.  
**Success Criteria:**
1. O estado dos personagens (XP, level, skills, HP/MP, inventário, equipamentos e coordenadas no mundo) é persistido no PostgreSQL periodicamente em lote e salvo imediatamente no logout.
2. Reconexão sem perda: Se o jogador recarregar a página (F5) ou sofrer instabilidade de rede por até 20 segundos, ele reconecta à mesma sala e mesmo personagem sem ser removido do mundo.
3. Proteção transacional: Nenhuma duplicação de itens ou perda de progresso ocorre em casos de encerramento inesperado do servidor.
4. Suíte de testes E2E executando o fluxo completo: Cadastro -> Criação de Personagem -> Login no Colyseus -> Movimento e Combate Multiplayer -> Flush no PostgreSQL -> Reconexão.
5. `npm run typecheck` e `npm run test` passando com 100% de aprovação e 0 erros em todo o repositório.

---

### Phase 47: Correção de Cores ao Andar, +100 Velocidade na Cidade e Chat Local/World com Texto Flutuante

**Goal:** Resolver a alternância de cores ao andar após alterar outfit, adicionar bônus de +100 pontos de velocidade na cidade, e implementar a Janela de Chat no estilo autêntico do Tibia 11 com abas Local e World, atalho Enter para foco imediato e falas flutuantes em amarelo (local) e azul (world).  
**Depends on:** Phase 46  
**Requirements:** Preload de frames de caminhada e fallback seguro de recolor em `outfitRecolor.ts`, cálculo de velocidade na cidade com +100 pontos, Janela de Chat com abas Local e World, foco imediato ao pressionar Enter na cidade, textos flutuantes acima dos personagens em amarelo (`#ffff00`) para Local e azul (`#55ffff`) para World.  
**Success Criteria:**
1. A cor customizada do outfit é preservada continuamente durante todo o ciclo de caminhada (0 -> 1 -> 0 -> 2) e em todas as direções (north, south, east, west), eliminando qualquer alternância para o sprite base descolorido.
2. A velocidade dos jogadores na cidade é incrementada em +100 pontos (`calculateStepDurationMs(playerSpeed + 100)`), tornando a movimentação sensivelmente mais ágil.
3. Janela de Chat autêntica do Tibia 11 com abas 'Local Chat' e 'World Chat', rolagem automática e atalho no dock bar.
4. Ao pressionar `Enter` na cidade, o cursor foca diretamente no campo de texto do chat local.
5. Mensagens enviadas no chat local geram texto flutuante em amarelo (`#ffff00`) com contorno preto acima da cabeça do personagem; mensagens enviadas no chat world geram texto flutuante em azul (`#55ffff`) com contorno preto.
6. 100% dos testes passando (`46/46` arquivos de teste e `289/289` testes) e 0 erros de TypeScript.

Plans:
- [x] 47-01-PLAN: Implementar preload de walk frames, bônus de velocidade na cidade, janela de chat com abas Local/World e textos flutuantes.

---

### Phase 53: Deletar Personagem na Seleção de Personagem & Banco de Dados

**Goal:** Permitir a exclusão de personagens na tela de seleção de personagem (`TibiaAuthCharacterModal.tsx`) com confirmação prévia, apagando o personagem e todas as suas dependências do banco de dados PostgreSQL (`DELETE /api/characters/:id`).  
**Depends on:** Phase 52  
**Requirements:** Botão "Deletar" 🗑️ em cada item de personagem, modal de confirmação estilizado, chamada à API `DELETE /api/characters/:id`, atualização imediata da listagem de personagens e persistência relacional.  
**Success Criteria:**
1. Botão de exclusão 🗑️ presente em cada personagem da lista na tela de seleção de personagens.
2. Ao clicar, exibe modal de confirmação com detalhes do personagem.
3. Ao confirmar, envia requisição `DELETE /api/characters/:id` e remove o personagem do banco de dados PostgreSQL.
4. Atualiza em tempo real a listagem sem necessidade de atualizar a página.
5. 100% de aprovação nos testes e 0 erros de TypeScript (`npm run typecheck` e `npm run test`).

Plans:
- [x] 53-01-PLAN: Implementar exclusão de personagem na UI com modal de confirmação e integração com API DELETE PostgreSQL.

---

### Phase 54: Inicialização Solo do Squad & Desbloqueio de Slots por Nível (Lv 50, 90, 120 + Isenção Admin/GM)

**Goal:** Garantir que todo personagem novo/recém-criado inicie sozinho no squad sem carregar personagens mock automaticamente, e implementar travas de nível para os slots adicionais do squad (Slot 2 no Lv 50, Slot 3 no Lv 90 e Slot 4 no Lv 120), isentando contas ADMIN and GM.  
**Depends on:** Phase 53  
**Requirements:** Inicialização do squad contendo apenas o personagem ativo (`characters: [userChar]`), visualização de slots bloqueados com cadeado 🔒 e nível requerido, travamento na janela do squad e engrenagem, bypass irrestrito para contas ADMIN e GM.  
**Success Criteria:**
1. Novos personagens iniciam 100% sozinhos no squad ao entrar no jogo.
2. Slot 2 bloqueado até o Nível 50, Slot 3 bloqueado até o Nível 90 e Slot 4 bloqueado até o Nível 120 para contas comuns.
3. Indicadores visuais de travamento (`🔒 Slot Bloqueado · Requer Nível X`) na janela de Squad e Engrenagem.
4. Contas ADMIN e GM possuem todos os 4 slots do squad desbloqueados imediatamente no Nível 1.
5. 100% dos testes aprovados e 0 erros de TypeScript.

Plans:
- [x] 54-01-PLAN: Inicialização solo do squad, travas de nível para slots 2, 3 e 4 (Lv 50/90/120) e bypass de permissão Admin/GM.

---

### Phase 55: Renderização Multiplayer de Jogadores Remotos na Cidade (ThaisCityArena)

**Goal:** Garantir a perfeita visualização em tempo real de múltiplos jogadores no mesmo mapa (`ThaisCityArena.tsx`), sincronizando posições, animações de caminhada suave, cores de outfits, tooltips e falas sobre a cabeça.  
**Depends on:** Phase 54  
**Requirements:** Filtro do próprio personagem local para evitar duplicidade (`key === myPlayerId || curChars.some(...)`), interpolação suave de passos via `VisualMotionTrack`, recolorização de outfits pelas cores do Colyseus snapshot (`lookHead`, `lookBody`, `lookLegs`, `lookFeet`), tooltips ao passar o mouse (`showGlobalPlayerTooltip`), suporte ao menu de contexto e limpeza automática de atores desconectados.  
**Success Criteria:**
1. Jogadores logados simultaneamente em diferentes navegadores/contas veem uns aos outros em tempo real no mapa de Thais.
2. Movimentação dos jogadores remotos é interpolada suavemente a 60fps sem sobressaltos.
3. Cores de outfit customizadas dos jogadores remotos são renderizadas fielmente.
4. Passar o mouse sobre um jogador remoto exibe o tooltip com Nome, Nível, Vocação e Barra de Vida.
5. 100% de aprovação nos testes (`tests/phase55-multiplayer-remote-rendering.test.ts`) e 0 erros no `npm run typecheck`.

Plans:
- [x] 55-01-PLAN: Sincronização e renderização multiplayer de jogadores remotos no PixiJS (`ThaisCityArena.tsx`).

---

### Phase 56: Sistema Multiplayer de Party (Convite Amigos/ContextMenu, Seguir Líder, Caçada Cooperativa e Target Coletivo)

**Goal:** Implementar o sistema completo de Party multiplayer: convidar jogadores através do botão "Party" na lista de amigos ou pelo clique com botão direito ("Convidar para a party"), exibição de modal de convite estilizado com botões de Aceitar e Recusar no jogador convidado, mecânica de seguir o dono da party (follow leader) na cidade de Thais e na caçada, transição sincronizada de caçada para todos os membros da party quando o líder iniciar uma caçada, e mira/ataque coordenado no mesmo monstro que o dono da caçada alvejar.  
**Depends on:** Phase 55  
**Requirements:**
1. **Convites de Party:**
   - Ao clicar no botão `👥 Party` na lista de amigos (`FriendsWindow.tsx`) ou na opção "👥 Convidar para Party" no menu de contexto do jogador (`CharacterContextMenu`), o cliente emite `party:invite` via WebSocket com `targetName`.
   - O servidor Colyseus (`ThaisCityRoom.ts`) roteia o convite para o jogador destinatário.
   - O jogador convidado recebe o evento e exibe modal visual: `"[Nome] convidou você para entrar na Party. Deseja aceitar?"` com botões estilizados `[ Aceitar ]` e `[ Recusar ]`.
2. **Formação da Party & Sincronização:**
   - Ao aceitar, o servidor define o dono da party (`partyLeaderId`) e os membros (`partyMembers`), notificando ambos os clientes com `party:sync`.
   - A janela de Party (`PartyWindow.tsx`) e a interface do jogo exibem todos os membros conectados com barras de HP/MP e ícone de líder/membro.
3. **Mecânica de Seguir o Líder (Follow Leader):**
   - O jogador que aceitou a party entra no modo de seguir o dono da party (`followLeader = true`).
   - Na cidade de Thais: quando o líder anda, o personagem do membro calcula rota e caminha mantendo-se próximo (1 SQM ou na trilha de passos do líder).
4. **Caçada Cooperativa Sincronizada:**
   - Quando o dono da party puxar uma caçada (no cais ou pela seleção de caçada), o evento `party:startHunt` é transmitido para todos os membros da party.
   - Todos os membros da party são transportados juntos para a mesma caçada em tempo real.
5. **Combate e Target Coletivo:**
   - Na caçada, os membros acompanham o líder e, quando o líder ataca ou foca um monstro (retângulo vermelho), todos os membros da party focam e atacam aquele mesmo monstro em conjunto.
**Success Criteria:**
1. Convite de party enviado com sucesso via lista de amigos e botão direito em jogador.
2. Modal de aceite/recusa renderizado no jogador convidado com feedback imediato para ambos.
3. Membro da party segue o líder na cidade de Thais de forma fluida.
4. Ao iniciar caçada, todos os membros da party entram juntos na caçada.
5. Todos os membros da party atacam o mesmo bicho alvejado pelo líder.
6. 100% de testes passando (`npm test`) e 0 erros de TypeScript (`npm run typecheck`).

Plans:
- [x] 56-01-PLAN: Sistema Multiplayer de Party (Convite, Modal de Aceite, Follow Leader, Caçada Cooperativa e Target Coletivo)

---

### Phase 57: Correções Críticas de Combate/Rede e Fidelidade Visual (FIX.md)

**Goal:** Solucionar os três problemas centrais descritos no FIX.md (deslocamento para a água/clone no retorno da caçada, dano duplicado com 2 magias por tick, ausência de efeito visual das wands de mago) e atingir paridade visual estrita com as Imagens 1 a 5 fornecidas pelo usuário.  
**Depends on:** Phase 56  
**Requirements:**
1. **Bug 1: Coordenada de Retorno da Caçada & Prevenção de Andar na Água:**
   - No encerramento da caçada (`party:huntExit` e `exitHunt`), teletransportar instantaneamente o líder e todos os membros para o Templo de Thais (`32369, 32241, 7`).
   - Sincronizar as posições via `player:teleport` e suprimir pacotes de follow leader por 2.5 segundos para evitar que seguidores sigam o avatar do líder na água antes do spawn no templo.
2. **Bug 2: Eliminação de Dano Duplicado / 2 Magias por Tick:**
   - Unificar o cooldown de ofensivas (`'attack'` e `'rune'`) para 2000ms compartilhados e instituir a trava `usedOffensiveActionThisTick` por personagem para garantir que no máximo 1 magia/runa ofensiva seja executada por tick.
3. **Bug 3: Efeitos Visuais Autênticos de Wands & Rods:**
   - Mapear projéteis e efeitos de impacto de wands e rods aos efeitos autênticos do Tibia (Wand of Vortex / Cosmic / Starfall -> projétil 4 Energy e impacto 11 CONST_ME_ENERGYHIT; Draconia / Dragonbreath -> projétil 3 e impacto 15; Decay / Voodoo / Necrotic -> projétil 31 e impacto 17; Terra / Snakebite -> projétil 14 e impacto 8; Hailstorm / Moonlight -> projétil 28 e impacto 43).
4. **Fidelidade Visual às Imagens 1 a 5:**
   - **Imagem 1 (`FriendsWindow.tsx`):** Header "Lista de amigos", subtítulo "Veja quem está online e mantenha sua party por perto.", barra de busca com botão `[Adicionar]`, seção `🟢 ONLINE (N)`, menu de contexto com 3 ações ("Mandar mensagem para [Name]", "Convidar para a party", "Remover dos amigos"), e rodapé "Amigos: X | Online: Y" com botão `[Fechar]`.
   - **Imagem 2 (`PartyInvitationModal.tsx`):** Card flutuante superior com brasão azul, título dourado "CONVITE DE PARTY", detalhe "[Nome] convidou você para a party", vocação/nível e botões `[ ENTRAR ]` e `[ RECUSAR ]`.
   - **Imagem 3 (`HuntSelector.tsx`):** Botão `[ Iniciar com o time ]` em destaque azul no rodapé da seleção de caçadas quando o jogador for líder da party.
   - **Imagens 4 & 5 (`GroupHuntApprovalModal.tsx`):** Card de aprovação de caçada em grupo "CONVITE DE CAÇADA EM GRUPO", "Juntando o time na chama mística para [HuntName].", "X DE Y ACEITARAM", badges de função (`TANK`, `HEALER`, `DPS`), indicador de líder, status de confirmação e rodapé "Esperando os outros...".
**Success Criteria:**
1. Zero teletransporte ou caminhada sobre a água ao sair da hunt.
2. No máximo 1 magia ofensiva lançada por tick sem duplicação de dano.
3. Wand of Vortex e varinhas mágicas exibindo seus efeitos elementais nos monstros.
4. Componentes visuais fiéis às Imagens 1 a 5.
5. 100% dos testes passando (`npm test` - 57/57 suites, 327 testes) e 0 erros de TypeScript (`npm run typecheck`).

Plans:
- [x] 57-01-PLAN: Correções Críticas de Combate/Rede e Fidelidade Visual Concluída.

---

### Phase 58: Correção da Tela de Hunt (Fullscreen/Viewport), Ataque Único sem Duplicação e Lógica Estrita de Party Target

**Goal:** Eliminar a área preta da tela de hunt expandindo o PixiArena para 100% da tela com ResizeObserver e app.resize(); remover a duplicação de ataques compartilhando a cadência entre ataques básicos e magias ofensivas; e implementar a regra estrita de party onde todos os membros atacam unicamente o mesmo alvo do líder e aguardam o líder alvejar o próximo inimigo quando o atual morre.  
**Depends on:** Phase 57  
**Requirements:**
1. **Correção do Viewport de Caçada (Fim da Área Preta):**
   - Garantir que `.fullscreen-viewport`, `.pixi-arena` e o canvas do Pixi ocupem 100% da largura e altura da tela (`position: absolute; inset: 0; width: 100%; height: 100%`).
   - Disparar `app.resize()` e reset de câmera ao alternar para o modo hunt (`active = true`) e escutar redimensionamento via `ResizeObserver` no `hostRef.current`.
2. **Eliminação Definitiva de Ataques Duplicados (Cadência Única de 2s):**
   - Unificar o cooldown ofensivo entre ataques básicos (varinha/arma) e magias/runas ofensivas. Quando um ataque básico é disparado, consome o cooldown de ataque e runa (`2000ms`); quando uma magia ofensiva é lançada, consome `nextAttackAt` e o cooldown de ataque.
   - Cada personagem realiza no máximo 1 ataque por intervalo de 2 segundos, eliminando múltiplos golpes simultâneos.
3. **Lógica Estrita de Target de Party (Mirror do Líder e Espera na Morte):**
   - Somente o líder da party pode selecionar e engajar novos alvos.
   - Todos os membros da party atacam unicamente o mesmo monstro que o líder estiver atacando (`leaderTarget`).
   - Membros secundários nunca selecionam alvos aleatórios por conta própria; se o líder não tiver alvo ou o monstro morrer (`defeatEnemy`), todos limpam o `targetId` e aguardam o líder atacar outro monstro.
**Success Criteria:**
1. Tela de caçada preenche 100% da tela sem bordas ou áreas pretas.
2. Personagens não disparam ataques duplicados (magia + wand no mesmo tick).
3. Membros da party atacam apenas o monstro do líder e param/aguardam quando ele morre.
4. 0 erros de TypeScript (`npm run typecheck`) e 100% dos testes passando (`npm test`).

Plans:
- [x] 58-01-PLAN: Correção de Viewport, Ataque Único e Lógica Estrita de Party Target Concluída.

---

### Phase 59: Transição Síncrona de Caçada em Grupo ("Iniciar com o Time"), Ocultação em Hunt e Fim da Duplicação de Personagens

**Goal:** Resolver os bugs críticos descritos em FIX.md: garantir que líder e membros entrem juntos de forma síncrona na caçada ao aprovar a proposta ("Iniciar com o time"), suprimir a exibição de jogadores em caçada na cidade de Thais para evitar avatares congelados/parados, e aplicar deduplicação estrita garantindo que cada player tenha apenas uma versão única no jogo com posicionamento do líder no índice 0 e sincronização fiel de outfits e montarias.  
**Depends on:** Phase 58  
**Requirements:** `FIX.md`
**Success Criteria:**
1. Ao aprovar a caçada em grupo, o líder e todos os membros entram juntos na hunt (`restartHunt` e `mode = 'hunt'`).
2. Jogadores em caçada têm `inHunt = true` no servidor e não são renderizados congelados na cidade de Thais.
3. Líder da party é deterministicamente o índice 0 (`characters[0]`) em todos os clientes.
4. Deduplicação estrita por ID e Nome impede que qualquer personagem exista duplicado.
5. Outfits, cores e montarias reais dos membros da party são sincronizados fielmente no combate.
6. 100% dos testes passando (`npm test` - 59/59 suítes, 337 testes) e 0 erros no TypeScript (`npm run typecheck`).

Plans:
- [x] 59-01-PLAN: Transição Síncrona de Caçada em Grupo, Ocultação em Hunt e Fim da Duplicação de Personagens Concluída.

---

### Phase 60: Painel de Administração Completo (Controle de Variáveis do Servidor, Tabela de Players Online, Logs do Sistema e Métricas)

**Goal:** Construir o Painel de Administração completo na rota `/admin` permitindo ao Administrador gerenciar em tempo real todas as variáveis do jogo (Rates de EXP/Loot/Skills/Regen, parâmetros de salas Colyseus, auto-save), visualizar tabela completa de jogadores online e salvos com busca/filtros e comandos de GM (`kick`, `ban`, `teleport`, `give exp/gold`), visualizar estatísticas/métricas de servidores e explorar os logs do sistema com auditoria de eventos.  
**Depends on:** Phase 59  
**Requirements:** Solicitado pelo usuário (`/admin` completo com variáveis, tabela de players, métricas, logs e GM tools).  
**Success Criteria:**
1. Aba "Variáveis do Servidor" permitindo visualizar e ajustar dinamicamente Rates (EXP, Loot, Skills, HP/MP Regen), Cooldowns e Intervalos de Auto-Save.
2. Aba "Jogadores & GM Tools" exibindo contagem total de players online/offline, tabela pesquisável com filtros e ações de GM ao vivo (`/kick`, `/ban`, `/teleport`, `/addexp`, `/addgold`).
3. Aba "Logs do Sistema" com visualizador em tempo real dos logs de eventos do servidor, erros e histórico de ações administrativas.
4. Aba "Métricas & Saúde" com informações de salas ativas do Colyseus, latência, uso de memória e integração direta ao `@colyseus/monitor`.
5. 0 erros de TypeScript (`npm run typecheck`) e 100% de testes aprovados no Vitest (`npm test`).

Plans:
- [x] 60-01-PLAN: Implementação do Painel de Administração Completo (/admin) com Controle de Variáveis, Tabela de Players, GM Tools e Sistema de Logs Concluída.

---

### Phase 61: Desativação Temporária do Convite de Party de Outros Jogadores Reais

**Goal:** Ocultar e desativar temporariamente o sistema de convites de party para outros jogadores reais (multiplayer real), mantendo o Squad individual de 4 heróis do próprio usuário perfeitamente funcional.  
**Depends on:** Phase 60  
**Requirements:** Solicitado pelo usuário (`/gsd-phase` desativar temporariamente convite de party entre players).  
**Success Criteria:**
1. Botão `👥 Convidar para Party` oculto/desativado no menu de contexto de outros personagens (`CharacterContextMenu.tsx`).
2. Listener de convite de party no cliente não exibe o modal flutuante (`PartyInvitationModal.tsx` desativado).
3. Servidor WebSocket recusa amigavelmente qualquer tentativa direta de mensagem `party:invite` informando que a funcionalidade está em manutenção.
4. O sistema de Party do próprio Squad de 4 heróis do jogador permanece 100% funcional.
5. 0 erros de TypeScript (`npm run typecheck`) e suíte de testes Vitest passando.

Plans:
- [x] 61-01-PLAN: Desativação Temporária do Convite de Party de Outros Jogadores Reais Concluída.

---

### Phase 62: Remoção do Sistema de Trade entre Personagens

**Goal:** Remover o sistema de trocas diretas (Trade) entre personagens na cidade, simplificando o fluxo do jogo e removendo a opção do menu de contexto e o componente de janela de trade.  
**Depends on:** Phase 61  
**Requirements:** Solicitado pelo usuário (`/gsd-phase` remover trade entre os personagens).  
**Success Criteria:**
1. Remoção da opção `🤝 Trade (Trocar Itens)` no menu contextual de outros personagens (`CharacterContextMenu.tsx`).
2. Remoção do ID de janela `'trade'` em `WindowManagerContext.tsx`.
3. Remoção do estado de sessão de trocas e handlers de trade em `GamePrototype.tsx`.
4. 0 erros de TypeScript (`npm run typecheck`) e 100% dos testes Vitest passando.

Plans:
- [x] 62-01-PLAN: Remoção do Sistema de Trade entre Personagens.

---

### Phase 65: Visibilidade e Persistência de Jogadores Remotos na Thais City Arena

**Goal:** Investigar e corrigir a causa raiz dos personagens remotos desaparecerem/piscarem ao surgirem na sala `ThaisCityRoom`/`ThaisCityArena`, garantindo visibilidade contínua e comunicação multiplayer em tempo real via Colyseus no backend.  
**Depends on:** Phase 64  
**Requirements:** Solicitado pelo usuário (`/gsd-audit-fix` corrigir bug em que personagens somem da Thais City Room mantendo a validação no backend com Colyseus).  
**Success Criteria:**
1. Eliminar a filtragem por nome de personagem e checagem duplicada em `ThaisCityArena.tsx` que destruía o sprite PixiJS de jogadores remotos no ticker cleanup (`actorViews.delete(id)`).
2. Corrigir a remoção por nome em `ThaisCityRoom.ts` para que novos jogadores não desconectem nem expulsem jogadores já conectados com nomes genéricos/similares.
3. Garantir a correta alternância do flag `inHunt = false` ao entrar/renascer na cidade.
4. Suíte de testes `tests/phase65-thais-arena-remote-players-visibility.test.ts` 100% aprovada no Vitest.
5. 0 erros de TypeScript (`npm run typecheck`).

Plans:
- [x] 65-01-PLAN: Correção do Bug de Visibilidade e Evicção de Jogadores Remotos na Thais Arena via Colyseus.

---

### Phase 66: Experiência Autêntica de Monstros e Progressão de Nível

**Goal:** Corrigir os valores de experiência base dos monstros (restaurando Rat = 5 XP, Cave Rat = 10 XP) e a fórmula de avanço de nível no servidor para que personagens só subam de nível ao atingir a XP necessária do Tibia 8.60.  
**Depends on:** Phase 65  
**Requirements:** Solicitado pelo usuário (`/gsd-phase` ajustar XP dos monstros para o valor autêntico, mantendo o multiplicador de rates em 1x no Admin).  
**Success Criteria:**
1. Remoção do override de 50.000 XP em `importMonsters.ts` e restauração de XP autêntico em `monsters.json` (Rat: 5 XP, Cave Rat: 10 XP).
2. Remoção do incremento forçado `killer.level += 1` em `ThaisCityRoom.ts`.
3. Adição de cálculo de nível autoritativo via `experienceForLevel(level)` do Tibia 8.60.
4. Suíte de testes `tests/phase66-authentic-monster-experience.test.ts` 100% aprovada.
5. 0 erros de TypeScript (`npm run typecheck`).

Plans:
- [x] 66-01-PLAN: Experiência Autêntica de Monstros e Progressão de Nível Concluída.

---

### Phase 67: Loja da Cidade (NPC Item Shop) com Filtros por Categoria, Vocação e Compra por Gold Coins

**Goal:** Implementar a Loja de Itens (Item Shop/Store) acessível pelo menu superior do jogo (`TopNavigation.tsx`), permitindo que jogadores comprem equipamentos melhores, poções e runas utilizando Gold Coins acumulados, organizados por categorias e filtráveis pela vocação do personagem.  
**Depends on:** Phase 66  
**Requirements:** Solicitado pelo usuário (`/gsd-plan-phase` criar loja no menu do jogo com compra de itens por categoria e vocação).  
**Success Criteria:**
1. Botão `🛍️ Loja` ativo no menu superior (`TopNavigation.tsx`) e atalhos de ações rápidas.
2. Componente `ShopWindow.tsx` funcional com abas de categorias (Armas, Escudos, Armaduras/Defesa, Consumíveis, Acessórios) e filtro por vocação (Knight, Paladin, Sorcerer, Druid, Todas).
3. Campo de busca por nome de item em tempo real.
4. Exibição de atributos do item (Ataque, Defesa, Armor, Peso), nível mínimo e destaque de compatibilidade com a vocação ativa.
5. Botão "Comprar" verifica o saldo de `game.session.gold`, deduz o valor em moedas de ouro e entrega o item na Bolsa (`bag`) ou equipamentos do personagem.
6. 0 erros de TypeScript (`npm run typecheck`) e 100% de testes Vitest aprovados (`tests/phase67-shop-purchases.test.ts`).

Plans:
- [x] 67-01-PLAN: Implementação da Loja de Itens da Cidade (ShopWindow) com Filtros por Categoria/Vocação, Validação de Gold Coins e Entrega de Itens.

---

### Phase 68: Modal Autêntico de Morte ("You are dead"), Sistema de Penalidade por Morte (XP, Skills e Loot) e Controles de Penalidade no Painel Admin

**Goal:** Implementar a janela clássica de morte autêntica do Tibia ("You are dead") com o texto canônico e botão "Ok" para renascer na cidade de Thais; aplicar o sistema completo e autoritativo de penalidade por morte (perda de 10% de XP com recálculo de nível, perda de 10% de skills e perda do loot da caçada atual); e integrar as taxas de penalidade de forma dinâmica e editável no Painel do Administrador (`/admin`).  
**Depends on:** Phase 67  
**Requirements:**
1. **Modal Clássico "You are dead":**
   - Janela cinza chanfrada com barra de título "You are dead" e o texto canônico exato da imagem de referência:
     > "Alas! Brave adventurer, you have met a sad fate.
     > But do not despair, for the gods will bring you back
     > into the world in exchange for a small sacrifice.
     > 
     > Simply click on 'Ok' to resume your journeys in Tibia!"
   - Botões "Ok" e "Cancel".
   - Texto flutuante sobre a criatura/personagem: "You are dead."
   - Ao clicar em "Ok":
     - Aplica a penalidade de morte ativa.
     - Respawna o jogador com vida e mana cheias no Templo de Thais (`32369, 32241, 7`).
     - Encerra o modo caçada (`mode = 'training'` / cidade) e aciona a rota de caminhada até o Depot de Thais.
2. **Sistema de Penalidade por Morte (Death Penalty):**
   - **Perda de XP**: Deduz 10% da experiência total do personagem (`experience = Math.max(0, Math.floor(experience * (1 - expLossPercent / 100)))`).
   - **Recálculo de Level**: Se a experiência pós-penalidade for menor que o requisito para o nível atual (`experienceForLevel(level)`), regredir o nível do personagem para o nível correspondente à nova XP (downgrade clássico do Tibia).
   - **Perda de Skills**: Reduz 10% em todas as habilidades (`sword`, `axe`, `club`, `distance`, `shielding`, `fist`, `magicLevel` ou pontos de avanço).
   - **Perda de Loot da Caçada**: Esvazia o inventário de loot acumulado na caçada atual (`session.loot = []`), preservando os equipamentos equipados e os itens guardados na Bolsa (`bag`).
   - Mensagem de log no console/chat detalhando as perdas sofridas na morte.
3. **Controles de Penalidade no Painel de Administração (`/admin`):**
   - Aba "Variáveis do Servidor" do `AdminPanel.tsx` com novas opções configuráveis:
     - `Rate de Perda de XP na Morte (%)` (default: 10)
     - `Rate de Perda de Skills na Morte (%)` (default: 10)
     - `Perder Loot da Caçada na Morte` (toggle checkbox, default: true)
   - Integração com `ServerConfigManager.ts` e persistência nas configurações do servidor.
4. **Qualidade e Validação:**
   - 0 erros de TypeScript (`npm run typecheck`).
   - Suíte de testes automatizados Vitest cobrindo a aplicação de penalidades, recálculo de level e persistência.

**Success Criteria:**
1. Modal "You are dead" abre fielmente com o texto do Tibia ao morrer em caçada ou na cidade.
2. Clicar em "Ok" renasce o personagem no Templo de Thais com HP/MP cheios e caminhando para o depot.
3. Personagem perde 10% de XP e tem seu nível recalculado fielmente caso a XP caia abaixo do nível.
4. Personagem perde 10% de skills e todo o loot recolhido da caçada atual.
5. As taxas de penalidade são customizáveis em tempo real no painel `/admin`.
6. 0 erros de TypeScript e 100% dos testes Vitest passando.

Plans: Concluído (Validado em `tests/phase68-death-penalty-and-modal.test.ts` e `68-SUMMARY.md`).

- [x] 68-01-PLAN: Modal Autêntico de Morte ("You are dead"), Sistema de Penalidade por Morte e Configuração no Painel Admin.

### Phase 69: Auditoria e Conexão Integral de Progressão (XP de Nível, Skills e Magic Level em Combate e Treino)

**Goal:** Auditar e integrar ponta a ponta o sistema de progressão contínua de personagens (ganho de XP, subida de nível com HP/Mana proporcionais por vocação, evolução de Skills físicas e de distância em combate e no dummy, e evolução de Magic Level ao gastar mana em magias ativas durante caçadas).  
**Depends on:** Phase 68  
**Requirements:**
1. **Auditoria de Progressão de Nível e XP:**
   - Validação da fórmula oficial cúbica do TFS `experienceForLevel(level)`.
   - Garantir que a XP ganha de monstros avança o nível imediatamente, concedendo `gainHp`, `gainMana` e `gainCap` exatos por vocação (Knight, Paladin, Sorcerer, Druid e promoções).
   - Emissão do evento oficial `level-up` e mensagem no chat: "You advanced from Level X to Level Y."
2. **Auditoria e Conexão de Progressão de Skills:**
   - Validação dos multiplicadores oficiais de vocação e fórmulas de tries (`requiredSkillTries`).
   - Conectar o avanço de skills no combate real (`advanceCombat`):
     - Ataque corpo a corpo ou à distância com sucesso concede tries na skill ativa da arma (`sword`, `axe`, `club`, `distance`, `fist`).
     - Bloqueio de ataques de monstros com escudo equipado concede tries em `shielding`.
     - Multiplicador de skill rate do servidor (`serverConfig.skillRate`) aplicado em tempo real.
     - Emissão do evento `skill-up` e mensagem canônica: "You advanced in [Skill]."
3. **Auditoria e Conexão de Progressão de Magic Level:**
   - Validação da fórmula oficial de mana necessária por nível mágico (`requiredMagicTries`).
   - Conectar o ganho de tries de Magic Level ao gastar mana conjurando magias durante o combate (`advanceCombat` e `triggerManualHotbarAction`).
   - Multiplicador de magic rate do servidor (`serverConfig.skillRate` / `content.rateMagic`) aplicado.
   - Emissão do evento `skill-up` com mensagem: "You advanced to Magic Level X."
4. **Qualidade e Testes:**
   - 0 erros de TypeScript (`npm run typecheck`).
   - Suíte de testes automatizados Vitest validando a progressão completa em combate de Level, Skills e Magic Level.

**Success Criteria:**
1. Matar monstros concede XP e sobe o nível com os atributos exatos da vocação.
2. Desferir ataques e bloquear danos em caçadas avança as barras e níveis de skills.
3. Gastar mana em magias em combate real avança a barra e nível de Magic Level.
4. Suíte de testes cobrindo todos os cenários de progressão com 100% de aprovação.
5. 0 erros de tipagem TypeScript.

Plans: Concluído (Validado em `tests/phase69-progression-audit.test.ts` e `69-SUMMARY.md`).

- [x] 69-01-PLAN: Auditoria, conexão de ganho de Skills e Magic Level em combate e suíte de testes de progressão.

### Phase 70: Botão de Mandar Mensagem e Ações Diretas na Lista de Amigos

**Goal:** Implementar o botão visual explícito e direto de "Mandar Mensagem" na lista de amigos (`FriendsWindow`), barra de ações para o amigo selecionado, e integração com o sistema de chat para focar a janela e pré-preencher o whisper clássico (`*Nome* `).  
**Depends on:** Phase 69  
**Requirements:**
1. **Botão de Mensagem por Amigo:**
   - Cada linha de amigo (online e offline) deve exibir um botão direto e visível `[ 💬 Mensagem ]` ou ícone com tooltip claro.
   - Clicar no botão aciona o callback `onPrivateMessage(friend.name)`.
2. **Barra de Ações do Amigo Selecionado:**
   - Ao clicar ou selecionar um amigo na lista, exibir uma seção de ações destacada:
     - Nome e Nível do amigo selecionado.
     - Botão `[ 💬 Mandar Mensagem ]` com destaque visual.
     - Botão `[ ⚔️ Convidar Party ]`.
     - Botão `[ ❌ Remover ]`.
3. **Integração com a Janela de Chat:**
   - `ChatWindowHandle` atualizado com suporte a pré-preenchimento de input (`prefillInput` ou `focusInput(channel, prefill)`).
   - Ao clicar em "Mandar Mensagem", abrir a janela de chat, trazê-la para frente e colocar no campo de texto `*NomeDoAmigo* `, posicionando o cursor pronto para digitação.
4. **Qualidade e Validação:**
   - 0 erros de TypeScript (`npm run typecheck`).
   - Teste automatizado Vitest verificando a presença e disparo do botão de mensagem e integração.

**Success Criteria:**
1. O usuário vê claramente o botão de mandar mensagem em cada amigo da lista.
2. Clicar em "Mandar Mensagem" abre o chat e prepara o envio para o amigo selecionado.
3. 0 erros de tipagem TypeScript e testes Vitest passando.

Plans: Concluído (Validado em `tests/phase70-friends-message.test.ts` e `70-SUMMARY.md`).

- [x] 70-01-PLAN: Botão de Mandar Mensagem, Barra de Ações Rápidas e Integração de Whisper no Chat.

### Phase 71: Verificação de Existência de Personagem na Lista de Amigos

**Goal:** Impedir a adição de personagens inexistentes na lista de amigos (`FriendsWindow`), consultando a existência do personagem no banco de dados via endpoint `/api/characters/lookup` e jogadores remotos ativos na sessão antes de persistir, com feedback visual em tempo real.  
**Depends on:** Phase 70  
**Requirements:**
1. **Endpoint de Consulta `/api/characters/lookup`:**
   - Consulta o banco de dados via Prisma buscando o personagem por nome (com correspondência insensível a maiúsculas/minúsculas).
   - Retorna os dados oficiais do personagem (`id`, `name`, `level`, `vocationName`, `isOnline`) caso exista.
   - Retorna 404 e mensagem de erro amigável se não for encontrado.
2. **Validações no Frontend (`GamePrototype.tsx`):**
   - Bloquear auto-adição com mensagem clara ("Você não pode adicionar seu próprio personagem à lista de amigos.").
   - Bloquear duplicatas com aviso informativo.
   - Reconhecer jogadores remotos ativos na sessão multijogador.
   - Consultar o endpoint de lookup do servidor antes de adicionar.
3. **Feedback Visual na Janela de Amigos (`FriendsWindow.tsx`):**
   - Estado de carregamento no botão ("Verificando...") enquanto consulta o servidor.
   - Alerta visual estilizado logo abaixo do formulário de busca (vermelho para erro e verde para sucesso).
4. **Qualidade e Testes:**
   - 0 erros de compilação TypeScript (`npm run typecheck`).
   - Suíte de testes Vitest em `tests/phase71-friends-character-lookup.test.ts` com 100% de aprovação.

**Success Criteria:**
1. Personagens que não existem não são adicionados à lista de amigos e o usuário recebe feedback visual claro.
2. Personagens existentes no servidor são adicionados com level e vocação autênticos.
3. 0 erros no typecheck e testes Vitest aprovados.

Plans: Concluído (Validado em `tests/phase71-friends-character-lookup.test.ts` e `71-SUMMARY.md`).

- [x] 71-01-PLAN: Verificação de Existência de Personagem, Endpoint de Lookup e Feedback Visual na FriendsWindow.

### Phase 72: Roteamento de Mensagens Privadas (Whisper) e Entrega Multijogador

**Goal:** Resolver a falha onde mensagens privadas enviadas pela lista de amigos não eram recebidas pelo outro jogador, implementando roteamento autoritativo de whispers no servidor Colyseus (`ThaisCityRoom`), entrega direta sem restrição de distância física, visibilidade em ambas as abas do chat (`ChatWindow`) e abertura automática para o destinatário.  
**Depends on:** Phase 71  
**Requirements:**
1. **Roteamento de Whisper no Servidor (`ThaisCityRoom.ts`):**
   - Detectar sintaxe padrão de whisper (`*Destinatário* mensagem` ou `/w Destinatário mensagem`).
   - Localizar o jogador destinatário conectado na sala autoritativa.
   - Enviar payload com canal `whisper` diretamente ao socket do destinatário e do remetente, sem restrição de proximidade/raio de visão.
   - Fornecer feedback amigável ao remetente caso o destinatário esteja offline (`Personagem "X" não está online no momento.`).
2. **Recepção e Visibilidade no Cliente (`GamePrototype.tsx` & `ChatWindow.tsx`):**
   - Permitir que mensagens com `channel === 'whisper'` sejam visíveis em ambas as abas (`Local` e `World`).
   - Exibir estilização clássica de whisper (azul ciano para mensagens recebidas, magenta/roxo para mensagens enviadas).
   - Abrir automaticamente a janela de chat do destinatário ao receber mensagem privada para que nenhuma mensagem seja perdida.
3. **Qualidade e Testes:**
   - 0 erros no `npm run typecheck`.
   - Suíte de testes dedicada em `tests/phase72-whisper-private-messaging.test.ts` com 100% de aprovação.

**Success Criteria:**
1. Mensagens enviadas para amigos chegam instantaneamente ao destinatário independentemente de distância ou aba aberta.
2. Destinatário é notificado com abertura da janela de chat e cores diferenciadas de whisper.
3. Remetente recebe confirmação do que foi enviado ou aviso caso o amigo esteja offline.

Plans: Concluído (Validado em `tests/phase72-whisper-private-messaging.test.ts` e `72-SUMMARY.md`).

- [x] 72-01-PLAN: Roteamento de Whisper no Servidor, Entrega Direta e Visibilidade no ChatWindow.

### Phase 73: Abas Privadas Dedicadas no Chat para Mensagens Diretas (1-to-1 PMs) com Fechamento

**Goal:** Implementar o sistema autêntico de mensagens privadas no estilo Tibia na `ChatWindow`, abrindo abas dedicadas com o nome do personagem correspondente ao clicar em "Mandar Mensagem" na lista de amigos ou ao receber uma mensagem direta, isolando a conversa fora dos chats Local e World, com suporte a envio automático de whisper e botão para fechar a aba (`✕`).  
**Depends on:** Phase 72  
**Requirements:**
1. **Abas Dinâmicas de Conversa Privada (`ChatWindow.tsx`):**
   - Suporte a abas dinâmicas além de `Local` e `World`: cada conversa privada ativa possui sua própria aba identificada pelo nome do personagem (`characterName`).
   - Cada aba de conversa privada possui um botão de fechar (`✕`) permitindo que o jogador encerre e oculte aquela conversa quando desejar.
   - Indicador visual elegante quando houver novas mensagens não lidas em uma aba privada inativa (badge de notificação ou cor destacada).
2. **Isolamento de Mensagens Privadas:**
   - Mensagens privadas (whispers) trocadas com um personagem específico são exibidas exclusivamente na aba dedicada daquele personagem, não poluindo o `World Chat` (global) nem o `Local Chat`.
   - Na aba do personagem, a conversa exibe o histórico direto entre o jogador e o destinatário com horário, nomes estilizados e texto legível.
3. **Envio Direto e Fluido (Input Bar):**
   - Quando a aba do personagem estiver selecionada, o input de texto direciona o envio automaticamente para aquele personagem (via protocolo de whisper do Colyseus/gameNetwork), sem exigir que o usuário digite `*Nome*` manualmente.
   - Placeholder contextualizado: `Mensagem privada para [Nome]...`.
4. **Integração com Lista de Amigos (`FriendsWindow.tsx` e `GamePrototype.tsx`):**
   - Clicar em "Mandar Mensagem" na lista de amigos abre diretamente a janela de chat, cria ou foca a aba correspondente ao amigo e foca o campo de digitação pronto para escrever.
   - Receber uma mensagem privada de outro jogador abre automaticamente a janela de chat (se minimizada) e cria/atualiza a aba daquele jogador.
5. **Qualidade e Testes:**
   - 0 erros de TypeScript (`npm run typecheck`).
   - Suíte de testes dedicada no Vitest cobrindo: abertura de abas privadas, isolamento das mensagens fora do global/world, envio direto e fechamento da aba com o botão `✕`.

**Success Criteria:**
1. Clicar em mandar mensagem para um amigo abre uma aba com o nome dele no chat.
2. A conversa privada aparece apenas na aba dedicada daquele personagem, sem poluir o World Chat.
3. Cada aba privada pode ser fechada individualmente pelo botão `✕`.
4. 0 erros no typecheck e 100% dos testes Vitest passando.

Plans: Concluído (Validado em `tests/phase73-private-chat-tabs.test.ts` e `73-SUMMARY.md`).

- [x] 73-01-PLAN: Abas Privadas Dedicadas no Chat para Mensagens Diretas (1-to-1 PMs) com Fechamento.

### Phase 74: Personagens Novos em Nível 1 e Verificação de Visibilidade Urbana em Thais

**Goal:** Configurar novos personagens para começarem no Nível 1 (0 XP, 150 HP, 35 MP, 400 de capacidade) e verificar minuciosamente que possuam as tags e propriedades corretas (`inHunt: false`, `posZ: 7`, coordenadas do Templo de Thais `(32369, 32241, 7)`, outfit de vocação e nameplate) para serem perfeitamente vistos por outros jogadores na cidade de Thais.  
**Depends on:** Phase 73  
**Requirements:**
1. **Inicialização em Nível 1:**
   - Todos os novos personagens criados via `CharacterService` e rotas `/api/characters` iniciam com `level: 1` e `experience: 0`.
   - Atributos base padronizados para o início canônico de nível 1 (150 HP, 35 MP, 400 de capacidade).
   - Defaults do Prisma Schema e esquemas Colyseus (`PlayerState`) alinhados a nível 1.
2. **Verificação de Visibilidade Urbana em Thais:**
   - Auditoria e validação de que os novos personagens recebem `inHunt: false` (o filtro primário que oculta heróis em caçadas).
   - Confirmação de spawn no piso térreo de Thais (`posZ: 7`), coincidindo com o plano de visualização do cliente (`curPos.z = 7`).
   - Confirmação de renderização com nameplate verde estilizado (`0x67de82`), layout de sprite e outfit da vocação correspondente.
3. **Qualidade e Testes:**
   - Suíte de testes dedicada no Vitest cobrindo a criação em nível 1 e todos os requisitos de visibilidade urbana.
   - 0 erros de tipagem no TypeScript (`npm run typecheck`).

**Success Criteria:**
1. Novos personagens são criados com nível 1 e 0 de experiência.
2. Novos personagens possuem a tag `inHunt: false` e coordenadas `posZ: 7` no Templo de Thais, garantindo visibilidade imediata no cliente de outros jogadores.
3. 0 erros no typecheck e 100% dos testes Vitest passando.

Plans: Concluído (Validado em `tests/phase74-new-characters-level-1.test.ts` e `74-SUMMARY.md`).

- [x] 74-01-PLAN: Personagens Novos em Nível 1 e Verificação de Visibilidade Urbana em Thais.

### Phase 75: Itens de Teste na Loja (Nível, Skills e Gold por 0 GP)

**Goal:** Implementar itens de teste especiais na loja (`ShopWindow`) com custo zero de gold, permitindo aos desenvolvedores e jogadores avançar 1 nível imediatamente (com atualização de vida, mana e capacidade por vocação), avançar cada uma das habilidades (Sword, Axe, Club, Distance, Shielding, Magic Level, Fist, Fishing) e adquirir grandes quantias de gold sem custo.  
**Depends on:** Phase 74  
**Requirements:**
1. **Pacote de Gold Grátis (0 GP):**
   - Disponibilizar pacote de 10.000 Gold Coins custando 0 de gold na loja.
   - Ao comprar, adiciona imediatamente o gold ao saldo do jogador.
2. **Item de Nível (+1 Level) por 0 GP:**
   - Disponibilizar item "Tome of Knowledge (+1 Nível)" custando 0 de gold.
   - Ao comprar ou usar, avança 1 nível completo do personagem ativo, definindo a XP canônica correspondente e concedendo os ganhos de HP, Mana e Cap da vocação.
3. **Itens de Skill (+1 Skill) por 0 GP:**
   - Disponibilizar um tomo para cada habilidade: Sword, Axe, Club, Distance, Shielding, Magic Level, Fist e Fishing.
   - Ao comprar ou usar, avança +1 ponto na respectiva habilidade do personagem.
4. **Usabilidade e Feedback Visual:**
   - Categoria visual clara na loja (`consumables` e suporte a filtro de testes).
   - Suporte a uso direto na Bag com duplo-clique.
   - Notificação visual de Level Up e Skill Up.
5. **Qualidade e Testes:**
   - Suíte de testes dedicada no Vitest cobrindo compra por 0 gold, avanço de nível com vocações, avanço de cada skill e adição de gold.
   - 0 erros no TypeScript (`npm run typecheck`).

**Success Criteria:**
1. Comprar o pacote de gold na loja por 0 GP adiciona gold ao saldo sem cobrar nada.
2. Comprar ou usar o tomo de nível eleva o personagem em 1 nível e recalcula atributos.
3. Comprar ou usar cada tomo de skill eleva a habilidade correspondente em +1.
4. 0 erros no typecheck e 100% dos testes Vitest passando.

Plans: Concluído com sucesso.

- [x] 75-01-PLAN: Itens de Teste na Loja (Nível, Skills e Gold por 0 GP).
- Resumo de entrega: `.planning/phases/phase-75-testing-shop-items/75-SUMMARY.md`

### Phase 76: Escolha de Vocação no Nível 8+, Remoção da Escolha na Criação e Item de Troca de Vocação (Gold & 0 GP)

**Goal:** Remover a escolha de vocação na tela de criação de personagem (todos nascem sem vocação / `None` no Nível 1 com atributos iniciais de aprendiz), implementar o modal de escolha de vocação permanente ao atingir Nível 8 ou superior, e disponibilizar o item "Pergaminho de Troca de Vocação" (Change Vocation Scroll) tanto na Loja por Gold quanto na Loja de Testes por 0 GP para permitir a redefinição de vocação.  
**Depends on:** Phase 75  
**Requirements:**
1. **Remoção de Vocação na Criação:**
   - Na tela e modal de criação de personagem (`PartyMemberModal`, `TibiaAuthCharacterModal`), remover a seleção de vocação (Knight, Paladin, Sorcerer, Druid).
   - Todos os novos personagens criados iniciam como `None` (Sem vocação) no Nível 1.
2. **Escolha de Vocação ao Alcançar Nível 8+:**
   - Quando um personagem de vocação `None` atinge o Nível 8 ou superior (seja caçando ou usando item de nível), um modal ou aviso em tela permite escolher uma das 4 vocações (Knight, Paladin, Sorcerer, Druid).
   - A escolha é permanente e gravada no estado do personagem.
3. **Item de Troca de Vocação (Change Vocation Scroll):**
   - Item `Pergaminho de Troca de Vocação` (ID 9912).
   - Disponível na Loja Normal (`consumables`) por custo em Gold Coins (ex: 5.000 GP) e na Loja de Testes (`testing`) por 0 GP.
   - Ao ser usado na Bolsa/Mochila ou comprado, reverte a vocação do personagem para `None` ou abre o seletor de vocação para permitir uma nova escolha.
4. **Qualidade e Testes:**
   - Suíte de testes no Vitest cobrindo criação sem vocação, trava até nível 8, escolha de vocação e reset por item.
   - `npm run typecheck` com 0 erros.

**Success Criteria:**
1. Criar personagem não exibe opção de vocação; o personagem nasce Nível 1 como `None`.
2. Ao atingir Nível 8+, a interface abre a seleção de vocação e salva permanentemente.
3. Pergaminho de Troca de Vocação está presente na loja de gold e na de 0 GP.
4. Usar o pergaminho permite redefinir a vocação do personagem.
5. 0 erros no typecheck e 100% dos testes Vitest passando.

Plans: Concluído com sucesso.

- [x] 76-01-PLAN: Escolha de Vocação no Nível 8+, Remoção na Criação e Item de Troca.
- Resumo de entrega: `.planning/phases/phase-76-vocation-choice-level8/76-SUMMARY.md`

### Phase 77: Progressão Difícil de Desbloqueio de Slots de Personagem e Restrição de Vocações Únicas por Conta

**Goal:** Implementar uma progressão mais difícil de nível para liberar os 4 slots de personagens do grupo na conta (Slot 1 no Nível 1, Slot 2 no Nível 50, Slot 3 no Nível 100 e Slot 4 no Nível 150) e impor a regra estrita de vocações únicas por conta (cada conta só pode possuir 1 personagem de cada vocação: Knight, Paladin, Sorcerer, Druid, sem repetição).  
**Depends on:** Phase 76  
**Requirements:**
1. **Progressão Difícil para Liberação de Slots da Conta:**
   - Slot 1: Liberado imediatamente ao criar a conta / primeiro personagem (Nível 1).
   - Slot 2: Requer que o jogador possua ao menos um personagem no **Nível 50** ou superior.
   - Slot 3: Requer que o jogador possua ao menos um personagem no **Nível 100** ou superior.
   - Slot 4: Requer que o jogador possua ao menos um personagem no **Nível 150** ou superior.
   - Bloqueio visual nos slots travados (`🔒 Slot 2 Requer Nível 50`, `🔒 Slot 3 Requer Nível 100`, `🔒 Slot 4 Requer Nível 150`) e trava na criação/adição de personagens no squad.
   - Bypass irrestrito mantido para contas com role `ADMIN` ou `GM`.
2. **Restrição Estrita de Vocações Únicas por Conta:**
   - Cada conta só pode ter no máximo **1 Knight**, **1 Paladin**, **1 Sorcerer** e **1 Druid**.
   - No modal de escolha de vocação no Nível 8+ (`VocationChoiceModal`), desabilitar e indicar visualmente como indisponíveis as vocações que outros personagens da mesma conta já possuem.
   - Se o personagem utilizar o Pergaminho de Troca de Vocação (ID 9912), ele só poderá mudar para uma vocação que ainda esteja vaga/livre na conta.
   - Uma conta com os 4 slots liberados e 4 personagens terá exatamente 1 herói de cada vocação sem nenhuma duplicata.
3. **Qualidade e Testes:**
   - Suíte de testes no Vitest cobrindo a progressão difícil dos 4 slots, bloqueio de vocação duplicada na conta e exceções de Admin.
   - `npm run typecheck` com 0 erros.

**Success Criteria:**
1. Os slots 2, 3 e 4 exigem Nível 50, 100 e 150 respectivamente.
2. Contas normais não conseguem criar ou equipar personagens nos slots bloqueados.
3. Vocações já escolhidas por um personagem da conta não podem ser repetidas por outros personagens da mesma conta.
4. Ao completar 4 personagens, a conta possui rigorosamente 1 Knight, 1 Paladin, 1 Sorcerer e 1 Druid.
5. 0 erros no typecheck e 100% dos testes Vitest passando.

Plans: Concluído com sucesso.

- [x] 77-01-PLAN: Progressão Difícil de Desbloqueio de Slots e Vocações Únicas por Conta.
- Resumo de entrega: `.planning/phases/phase-77-hard-slot-unlocks-unique-vocations/77-SUMMARY.md`

### Phase 78: Auditoria de Progressão de Skills, Vantagens por Atributo (Velocidade e Attack Speed para Melee, Resistência Mágica para Magic/Shielding) e Tooltips Informativos de UI

**Goal:** Auditar e aprimorar a matemática de progressão de habilidades, concedendo vantagens tangíveis por nível: bônus de velocidade de movimento e velocidade de ataque (redução do intervalo de ataques) para skills físicas/corpo a corpo (Sword, Axe, Club, Distance, Fist); bônus de resistência a danos mágicos/elementais e eficiência para Magic Level; mitigação de dano físico e bloqueio para Shielding; além de tooltips visuais detalhados na interface (hover sobre as skills na SkillsWindow) exibindo os bônus ativos e ganhos do próximo nível.  
**Depends on:** Phase 77  
**Requirements:**
1. **Bônus de Skills Físicas / Melee (Sword, Axe, Club, Distance, Fist):**
   - **Velocidade de Movimento:** Conceder bônus de velocidade de locomoção em tiles/segundo proporcional ao nível da skill física ativa.
   - **Velocidade de Ataque:** Reduzir o intervalo entre ataques básicos (`attackIntervalMs`) com base na skill física ativa do herói (ex.: -0.4% por nível, até o limite mínimo de intervalo).
2. **Bônus de Skills Mágicas e Defensivas (Magic Level, Shielding):**
   - **Magic Level:** Conceder porcentagem de resistência a danos mágicos/elementais e aumento na eficiência de recuperação de mana/custo de spells.
   - **Shielding:** Conceder mitigação percentual contra danos físicos recebidos e maior eficácia de bloqueio de armadura/escudo.
3. **Tooltips Informativos na Interface (`SkillsWindow`):**
   - Ao passar o mouse por cima de cada skill na `SkillsWindow`, exibir um tooltip explicativo rico detalhando:
     - Descrição da skill.
     - Bônus ativos aplicados no nível atual (ex.: `+X Dano Físico`, `+Y% Vel. Ataque`, `+Z Vel. Movimento`, `+W% Resistência Mágica`).
     - Ganhos exatos ao alcançar o próximo nível da skill.
4. **Qualidade e Testes:**
   - Suíte no Vitest validando o cálculo de derivados de skills, velocidade de movimento, redução de intervalo de ataque, resistência mágica e mitigação física.
   - 0 erros no `npm run typecheck` e 100% dos testes Vitest passando.

**Success Criteria:**
1. Habilidades corporais (Sword/Axe/Club/Distance/Fist) concedem velocidade de movimento e aumentam a velocidade de ataque.
2. Magic Level concede resistência a danos mágicos e Shielding concede mitigação física.
3. Passar o mouse sobre as skills na `SkillsWindow` exibe tooltips detalhados com os bônus atuais e do próximo nível.
4. 0 erros de TypeScript e 100% dos testes passando no Vitest.

Plans: Concluído com sucesso.

- [x] 78-01-PLAN: Auditoria de Progressão de Skills, Atributos Derivados (Velocidade, Attack Speed, Resistência Mágica, Mitigação Física) e Tooltips na UI.
- Resumo de entrega: `.planning/phases/phase-78-skill-progression-perks-and-tooltips/78-SUMMARY.md`

### Phase 79: Sistema de Estamina da Conta (Account-Wide Stamina System)

**Goal:** Implementar o sistema completo de estamina com capacidade máxima escalando pelo maior nível da conta, consumo contínuo durante caçadas, ejeção compulsória da caçada ao atingir 0 de estamina, bloqueio de entrada sem estamina, regeneração passiva por tempo decorrido e regeneração acelerada na Zona de Treinamento (dummies/skills).  
**Depends on:** Phase 78  
**Requirements:**
1. **Capacidade Máxima de Estamina (Max Stamina):**
   - Calculada proporcionalmente com base no personagem de maior nível da conta.
   - Fórmula: `MaxStamina = 2520 + (highestLevel - 1) * 30` minutos.
2. **Consumo em Caçada e Ejeção Compulsória:**
   - Consumo contínuo de 1 minuto por 60s reais em caçada ativa.
   - Ao zerar a estamina (`staminaMinutes <= 0`), encerra a caçada imediatamente (`inHunt: false`), teleporta o herói/squad para a zona segura (Templo) e exibe notificação visual.
   - Bloqueia nova entrada em caçada caso `staminaMinutes <= 0`.
3. **Regeneração Passiva e Acelerada:**
   - **Passiva (Cidade / Repouso / Offline):** Regenera +1 minuto a cada 3 minutos reais.
   - **Treinamento (Dummies / Skills):** Regenera +1 minuto a cada 1 minuto de treino ativo (3x mais rápido).
4. **Sincronização e Persistência:**
   - Sincronização via `PlayerState` do Colyseus (`staminaMinutes`, `maxStaminaMinutes`) e persistência relacional Prisma (`Character` / `Account`).
5. **Qualidade e Testes:**
   - Suíte de testes no Vitest cobrindo capacidade por nível, consumo, ejeção, bloqueio e taxas de regeneração.
   - `npm run typecheck` com 0 erros.

**Success Criteria:**
1. Capacidade total de estamina escala com o maior nível da conta.
2. Estamina é consumida em caçada e zerar ejeta compulsoriamente para a cidade.
3. Não permite entrar em caçadas com estamina zerada.
4. Regeneração na zona de treinamento é 3x mais rápida do que em descanso passivo.
5. 0 erros no typecheck e 100% dos testes Vitest passando.

Plans: Concluído com sucesso.

- [x] 79-01-PLAN: Sistema de Estamina da Conta.
- Resumo de entrega: `.planning/phases/phase-79-stamina-system/79-SUMMARY.md`

### Phase 80: Modo Caçada Auto-Idle Autônoma (Full Auto-Idle Hunt & Training Loop)

**Goal:** Criar o sistema completo e botão de Modo Auto-Idle permanente na conta (`isAutoIdle`), que gerencia de forma autônoma o ciclo contínuo do jogo: caçar monstros, coletar loot, auto-vender itens no shop/NPC, consumir poções e auto-comprar suprimentos com gold ao esgotar, rotacionar para os Dummies de Treino na cidade ao zerar a estamina e retornar automaticamente para a última área de caçada ao atingir a estamina máxima.  
**Depends on:** Phase 79  
**Requirements:**
1. **Persistência Permanente no Banco Prisma:**
   - Adicionar campo `isAutoIdle Boolean @default(false)` e `lastHuntId String?` em `Character` / `Account` no Prisma.
   - Sincronização via `PlayerState` do Colyseus e carregamento autoritativo no `onJoin`.
2. **Ciclo Autônomo de Caçada & Economia:**
   - **Combate & Loot:** Caçar criaturas no mapa, coletar drops e gerenciar HP/MP com poções automáticas.
   - **Auto-Venda & Auto-Compra de Poções:** Vender itens do Loot Pouch quando permitido/cheio e comprar poções adicionais na loja com os Gold Coins acumulados caso o estoque acabe.
3. **Rotação Automática Caçada <-> Treinamento:**
   - **Quando Zerar Estamina (0 min):** Ejeção para o Templo/Treino e início automático do treinamento em Dummies (acelerando a recuperação de estamina 3x).
   - **Quando Estamina Ficar Máxima (Max Stamina):** Se a flag `isAutoIdle` continuar ativa, retornar automaticamente para a última região de caçada (`lastHuntId`) e retomar o combate sem intervenção do jogador.
4. **Interface do Usuário (HUD):**
   - Botão de alternância proeminente `"🤖 MODO AUTO-IDLE"` no HUD com indicador de status (`Ativo` / `Inativo`), estado do loop (`Caçando`, `Abastecendo Loja`, `Treinando Dummies`) e modal de configurações de auto-loop.
5. **Qualidade e Testes:**
   - Suíte de testes Vitest validando a máquina de estados do loop autônomo, persistência Prisma, rotação por estamina e compra/venda automática de itens.
   - 0 erros no `npm run typecheck` com 0 erros.

**Success Criteria:**
1. Botão de ativar/desativar Modo Auto-Idle na interface visual do jogo.
2. Estado `isAutoIdle` e `lastHuntId` persistidos permanentemente no banco de dados Prisma.
3. Ao zerar estamina em caçada, o bot vai automaticamente para o treino em dummies.
4. Ao recuperar estamina total no treino, o bot retorna automaticamente à última caçada.
5. Auto-compra de poções e auto-venda de itens operando durante a caçada idle.
6. 0 erros no typecheck e 100% dos testes Vitest passando.

Plans: Concluído com sucesso.

- [x] 80-01-PLAN: Modo Caçada Auto-Idle Autônoma.
- Resumo de entrega: `.planning/phases/phase-80-full-auto-idle-loop/80-SUMMARY.md`

### Phase 81: Poção Automática Inteligente, Auto-Configuração de Hotbar e Cura de Emergência

**Goal:** Sistema de cura de emergência automático e auto-configuração de hotbars com as melhores poções de vida e mana para a vocação e nível do herói.
**Success Criteria:** Auto-uso inteligente de poções ao cair HP/MP, auto-população de poções na hotbar, 0 erros no typecheck e 100% testes aprovados.
Plans: Concluído com sucesso.
- [x] 81-01-PLAN: Poção Automática Inteligente e Auto-Configuração de Hotbar.
- Resumo de entrega: `.planning/phases/phase-81-smart-emergency-auto-potion/81-SUMMARY.md`

### Phase 82: Correção de Runtime TexturePool no PixiJS v8 e Efeitos Visuais das Wands de Sorcerer

**Goal:** Eliminação de runtime crashes de TexturePool no PixiJS v8 ao destruir containers e restauração de efeitos autênticos de projétil/impacto para a Wand of Vortex.
**Success Criteria:** Proteção no polyfill de TexturePool, projétil 5 e impacto 12 para Wand of Vortex em Thais e caçadas, 0 erros no typecheck e 100% testes aprovados.
Plans: Concluído com sucesso.
- [x] 82-01-PLAN: Correção de Runtime TexturePool e Efeitos Visuais de Wands.
- Resumo de entrega: `.planning/phases/phase-82-pixi-cleanup-and-sorcerer-wand/82-SUMMARY.md`

### Phase 83: Diagnóstico e Correção de Tela Preta no Viewport e Magias Direcionais em Onda (Exevo Flam Hur)

**Goal:** Eliminar o bloqueio de carregamento de texturas que causava tela preta no viewport ao entrar no jogo e implementar a geometria canônica de cone de 17 SQMs na direção que o conjurador olha para a magia Fire Wave (Exevo Flam Hur).
**Success Criteria:**
1. Viewport do PixiJS monta o palco imediatamente sem tela preta, carregando assets prioritários em lotes rápidos de ~50ms.
2. Magia `Fire Wave` (`exevo flam hur`) propaga em cone canônico de 17 SQMs na direção do conjurador sem lançar projétil teleguiado.
3. Todas as criaturas dentro da onda sofrem dano em área; criaturas fora da onda permanecem ilesas.
4. Suporte a `exevo flam hur` no servidor multiplayer com eventos de área nos 17 SQMs.
5. 0 erros no typecheck e 100% dos testes Vitest passando.
Plans: Concluído com sucesso.
- [x] 83-01-PLAN: Correção de Tela Preta e Magias Direcionais em Onda.
- Resumo de entrega: `.planning/phases/phase-83-directional-wave-spells-and-viewport-fix/83-SUMMARY.md`

### Phase 86: Botão de Remover Slot em Hotkeys, Trava de Nível Mínimo para Magias/Runas, Catálogo Completo e Correção de Ícones

**Goal:** Aprimorar a UX e integridade da Hotbar e do modal `HotbarConfigModal`: adicionar o botão de remover/limpar slot de hotkey, impor trava estrita prevenindo adicionar magias e runas quando o personagem não possuir o nível mínimo necessário (`minLevel`), auditando e garantindo que nenhuma magia da vocação esteja ausente da listagem e corrigindo os mapeamentos e ícones visuais em `Tibia11ActionIcon.tsx`.
**Depends on:** Phase 85
**Requirements:**
1. **Botão de Remover/Limpar Slot:**
   - Adicionar botão explícito `[ 🗑️ Remover do Slot ]` / `[ Limpar Slot ]` em `HotbarConfigModal.tsx`.
   - Ao ser clicado, limpa a ação associada ao slot (`onSave(slotIndex, null)`) e fecha o modal.
2. **Trava Estrita de Nível Mínimo (`minLevel`):**
   - Verificar se `character.level >= spell.minLevel` (ou `rune.minLevel`).
   - Se o nível do personagem for menor que o exigido, desabilitar o card/seleção da magia ou runa no modal, exibindo um badge vermelho indicando `🔒 Requer Nível X`.
3. **Catálogo Completo de Magias:**
   - Auditar todas as magias cadastradas em `spells.json` / `realmap11` e garantir que todas as magias pertencentes à vocação (e promoções) do personagem apareçam na listagem.
4. **Correção de Ícones Visuais (`Tibia11ActionIcon`):**
   - Corrigir o mapeamento de ícones de magias em `Tibia11ActionIcon.tsx` para que cada magia renderize o ícone canônico oficial correto.
**Success Criteria:**
1. Botão de remover ação do slot funcional no modal.
2. Magias e runas com nível superior ao do herói ficam travadas e desabilitadas para equipar.
3. Todas as magias do arquivo de conteúdo são exibidas no catálogo.
4. Todos os ícones visuais de magias estão fiéis e corretos.
5. 0 erros no `npm run typecheck` e 100% de testes aprovados no Vitest.

Plans: 0 plans
- [ ] TBD (run /gsd-plan-phase 86 to break down)

### Phase 87: Acionamento Manual de Magias por Hotkeys (F1 a F10 / F12) em Thais e Caçadas

**Goal:** Habilitar a execução manual instantânea de magias, runas e poções associadas às hotkeys pressionando as teclas F1 a F10 (e F1-F12 / 1-0) no teclado, permitindo ao jogador se curar (`exura`, `exura gran`, `exura vita`), usar suporte (`utani hur`, `utamo vita`) e disparar magias de combate em tempo real tanto na cidade de Thais quanto durante as caçadas.
**Depends on:** Phase 86
**Requirements:**
1. **Captura Global de Teclas de Atalho (F1 a F10 / F12 & 1-0):**
   - Ouvir eventos de teclado `keydown` quando não houver foco em elementos de entrada de texto (`input`, `textarea`).
2. **Disparo Manual Unificado em Qualquer Ambiente (Cidade / Caçada):**
   - Executar `triggerManualHotbarAction` no personagem ativo para a ação configurada no slot correspondente (F1 -> Slot 0, F2 -> Slot 1, etc.).
   - Suporte imediato a magias de cura, buffs de movimento (`utani hur`), escudos (`utamo vita`), poções e magias de ataque.
3. **Feedback Visual de Tecla Pressionada e Cooldown:**
   - Destacar o slot da hotbar com a classe de animação visual `tibia11-slot-pressed` ao ser disparado pelo teclado e acionar o sweep de cooldown da ação.
4. **Qualidade e Testes:**
   - Suíte de testes no Vitest validando o acionamento de hotkeys via teclado em Thais e em caçadas.
   - 0 erros de TypeScript (`npm run typecheck`).

**Success Criteria:**
1. Pressionar F1 a F10 (e 1-0) dispara instantaneamente a magia ou poção do slot configurado.
2. Magias de cura e buffs (`utani hur`) funcionam perfeitamente na cidade de Thais e nas áreas de caça.
3. 0 erros no typecheck e 100% dos testes Vitest passando.

Plans: 0 plans
- [ ] TBD (run /gsd-plan-phase 87 to break down)

### Phase 88: Sincronização Dinâmica da Barra de Progresso de XP (XP Progress Bar Tracking)

**Goal:** Integrar a fórmula autoritativa cúbica do Tibia 11 (`experienceProgress(level, experience) * 100`) em todas as barras de experiência do frontend (`BottomConsoleHUD.tsx`, `SkillsWindow.tsx`, `LeftSidebar.tsx`, `RightSidebar.tsx`), garantindo que o progresso da barra avance de forma precisa e fluida à medida que os personagens sobem de nível e ganham experiência.
**Depends on:** Phase 87
**Requirements:**
1. **Fórmula Autoritativa de Progresso de XP:**
   - Importar e utilizar `experienceProgress(character.level, character.experience)` do pacote `@/packages/domain`.
2. **Atualização da Barra do Console Inferior (`BottomConsoleHUD.tsx`):**
   - Substituir o cálculo linear obsoleto pela fórmula de progresso cúbica e formatar a porcentagem com 1 casa decimal.
3. **Atualização da Janela de Skills (`SkillsWindow.tsx`):**
   - Substituir a largura estática/hardcoded (`width: '45%'`) da barra de level pelo progresso real `experienceProgress(level, experience) * 100`.
4. **Qualidade e Testes:**
   - Suíte de testes dedicada no Vitest validando a cálculo e sincronização da barra de XP em tempo real.
   - 0 erros no `npm run typecheck`.

**Success Criteria:**
1. A barra de XP no HUD central e na janela de Skills avança proporcionalmente com o ganho de experiência.
2. Ao subir de nível, a barra reinicia em 0% para o novo nível.
3. 0 erros no typecheck e 100% dos testes Vitest passando.

Plans: Concluído com sucesso.
- [x] 88-01-PLAN: Sincronização Dinâmica da Barra de Progresso de XP.

### Phase 89: Tela de Carregamento de Login e Sincronização Atômica de Estado do Personagem

**Goal:** Ocultar o personagem provisório ("Hero" Knight no Templo de Thais) durante a transição do modal de login/seleção de personagem, exibindo uma tela de carregamento retrô estilo Tibia até que os dados autoritativos reais (nome, vocação, outfit, e posição salva x/y/z) estejam 100% commitados no canvas PixiJS.
**Depends on:** Phase 88
**Requirements:**
1. **Ocultação do Personagem Provisório:**
   - `<ThaisCityArena>` só fica visível e ativo (`active={true}`) quando `isCharacterReady === true` e `showAuthModal === false`.
2. **Tela de Carregamento Autêntica Tibia:**
   - Exibir overlay full-screen com design escuro, detalhes ornamentados, ícone giratório de escudo e barra de progresso pulsante durante a sincronização dos dados do personagem (`(!isCharacterReady || isLoadingCharacter) && !showAuthModal`).
3. **Commit Sincronizado do Estado:**
   - Transição fluida utilizando `requestAnimationFrame` duplo após atualizar `cityPos` e `userChar`, garantindo 0 saltos de câmera ou flickers visuais de outfit.
4. **Qualidade e Testes:**
   - Suíte de testes `tests/phase89-login-hydration-loading.test.ts` (3/3 testes aprovados).
   - 0 erros no `npm run typecheck`.

**Success Criteria:**
1. Personagem provisório nunca aparece visualmente no Templo de Thais ao entrar no jogo.
2. Tela de carregamento exibida durante a sincronização de dados.
3. Personagem aparece diretamente na sua posição salva com nome e outfit corretos.
4. 0 erros no typecheck e 100% dos testes aprovados.

Plans: Concluído com sucesso.
- [x] 89-01-PLAN: Tela de Carregamento de Login e Sincronização Atômica do Personagem.

### Phase 90: Perseguição Universal de Monstros e Seleção Dinâmica de Alvos (ALVO)

**Goal:** Expandir a perseguição agressiva de criaturas no mapa e integrar o dropdown de estratégia de alvo ('closest', 'lowest-hp', 'highest-hp') no BottomConsoleHUD.
**Depends on:** Phase 89
**Plans:** Concluído com sucesso.
- [x] 90-01-PLAN: Perseguição Universal de Monstros e Seleção Dinâmica de Alvos.

### Phase 91: Extração e Correção de Sprites Autênticas de Poções (Health, Mana, Spirit e Variações) via Tibia 10.98 & RealMap 11

**Goal:** Extrair diretamente do `items.otb` e `Tibia.dat`/`Tibia.spr` do Tibia 10.98 todas as poções de vida, mana, espírito e elixires do jogo, integrando-as ao manifesto `tibia1098-assets.json`, substituindo imagens sintéticas no `Tibia11ActionIcon` e garantindo renderização nítida em Action Bar, Hotbar, Loja e Inventário.
**Depends on:** Phase 90
**Requirements:**
1. Extração de todos os Server IDs de poções via `packages/tibia1098-assets/src/extractor.ts`:
   - Health Potions: 8704, 7618, 7588, 7591, 8473, 26031.
   - Mana Potions: 7620, 7589, 7590, 26029.
   - Spirit Potions: 8472, 26030.
   - Antidotes & Elixires: 8474, 10089, 7439, 7440, 7443, 7634, 7635, 7636.
2. Atualização dos caminhos de imagem no `Tibia11ActionIcon.tsx` e substituição das sprites em `public/potions/` pelos PNGs autênticos.
3. Testes automatizados cobrindo resolução, dimensões de sprites e mapeamentos de ação.
**Success Criteria:**
1. Todas as poções possuem sprites originais do Tibia 10.98 renderizadas em 32x32 pixels.
2. Action Bar e Hotbar exibem as poções autênticas.
3. Loja e Inventário renderizam poções via `ItemSprite` sem ícones ausentes (`?`).
4. 0 erros de tipagem e 100% dos testes Vitest passando.

Plans:
- [x] 91-01-PLAN: Extração e Correção de Sprites Autênticas de Poções.

### Phase 92: Animação Autêntica de Poções (APNG), Remoção de Quantidade no Menu de Ações e Requisitos de Nível Canônicos

**Goal:** Implementar animações nativas APNG de 12 frames para todas as poções e elixires do jogo (com cintilação de frascos e brilhos estelares autênticos do Tibia 10.98), remover o indicador numérico de quantidade no menu de configuração de ações e aplicar travas de nível e vocação fiéis ao Tibia.
**Depends on:** Phase 91
**Requirements:**
1. Remoção de badges de quantidade no modal de configurar ação (`HotbarConfigModal.tsx`).
2. Mapeamento dos requisitos de nível canônicos por vocação para todas as poções.
3. Bloqueio visual e funcional para equipar poções acima do nível do personagem.
4. Geração e codificação de APNG (Animated PNG) de 12 frames no pacote `tibia1098-assets` para animações fluidas sem overhead de CPU.
**Success Criteria:**
1. Menu de ações não exibe contagem estática de poções.
2. Poções de nível superior ao do personagem são travadas com indicação de level necessário.
3. Poções exibem animações cintilantes nativas de 12 frames na interface.
4. 0 erros no typecheck e 100% dos testes Vitest passando.

Plans:
- [x] 92-01-PLAN: Animações APNG, Remoção de Quantidade e Requisitos de Nível de Poções.

### Phase 93: Ícones Oficiais de Magias de Sorcerer via Tibia 11 (graphics_resources.rcc)

**Goal:** Extrair diretamente do arquivo local `graphics_resources.rcc` do Tibia 11 todos os ícones canônicos de 32x32 pixels das magias e corrigir as magias do Sorcerer para que tenham a aparência exata da referência oficial na lista, nos detalhes e na barra de ações.
**Depends on:** Phase 92
**Requirements:**
1. Extração da spritesheet oficial `fonts/images/spells/spell-icons-32x32.png` do binário Qt RCC (`graphics_resources.rcc`).
2. Mapeamento das magias de Sorcerer com seus índices e nomes canônicos:
   - Apprentice's Strike (`exori min flam`): ícone #126 com o capelo de formando no canto.
   - Light Healing (`exura`): ícone #5 (cruz radiante com frasco vermelho).
   - Energy Strike (`exori vis`): ícone #28 (redemoinho de energia magenta).
   - Terra Strike (`exori tera`): ícone #34 (mão canalizando terra e folhas).
   - Flame Strike (`exori flam`): ícone #25 (mão disparando labareda concentrada).
   - Haste (`utani hur`): ícone #100 (silhueta correndo com rastro ciano).
   - Magic Shield (`utamo vita`): ícone #123 (escudo dourado com aura ciano).
   - E todas as demais magias de Sorcerer (Waves, Beams, Strikes, Ultimates).
3. Atualização de `Tibia11ActionIcon.tsx` e substituição dos assets em `public/spells/` pelos PNGs 32x32 canônicos.
4. Preservação estrita do mapa OTBM, arquivos DAT/SPR de simulação e regras/fórmulas de dano.
**Success Criteria:**
1. Magias de Sorcerer exibem exatamente a mesma aparência do print de referência na lista, no painel de detalhes e na hotbar/action bar.
2. Apprentice's Strike exibe o ícone #126 oficial com capelo integrado.
3. O mapa do jogo, DAT/SPR do motor e regras de magias permanecem intactos.
4. 0 erros no typecheck e 100% dos testes Vitest passando.

Plans:
- [x] 93-01-PLAN: Extração de Ícones do Tibia 11 RCC e Alinhamento Visual das Magias de Sorcerer.

### Phase 94: Ícones e Sprites Autênticos de Runas via Tibia 10.98 Client

**Goal:** Extrair diretamente do client oficial Tibia 10.98 (`Tibia.dat`, `Tibia.spr`, `items.otb`) todas as imagens reais dos itens de runa com seus Server IDs canônicos, eliminando o reuso de ícones de magias e garantindo aparência 100% idêntica na lista de ações, nos detalhes, no inventário e na barra de ações, com reprodutibilidade permanente no pipeline de assets.
**Depends on:** Phase 93
**Requirements:**
1. Extração de todas as 34 runas canônicas do Tibia 10.98 (Sudden Death, Great Fireball, Avalanche, Explosion, HMM, UH, Fireball, Icicle, Stone Shower, Thunderstorm, Magic Wall, Paralyze, Holy Missile, Blank Rune, etc.) diretamente das tabelas binárias do client.
2. Eliminação do reuso de ícones de magias (`/spells/*-rune.png` e `/spells/ice-storm.png`), mapeando cada runa para seu sprite autêntico de item em `/runes/${slug}.png` e `/generated/tibia1098/items/item-${id}.png`.
3. Integração das runas no manifesto `content/generated/tibia1098-assets.json`, permitindo que o `ItemSprite` no inventário, loja, trade, depot e tooltips exiba o item com total fidelidade sem fallback (`?`).
4. Atualização de `packages/tibia1098-assets/src/extractor.ts` com `CANONICAL_RUNE_SERVER_IDS` e `CANONICAL_RUNE_METADATA`, garantindo que regenerar assets preserve os arquivos automaticamente.
5. Preservação estrita das magias, poções e regras/fórmulas de combate.
**Success Criteria:**
1. Todas as runas exibem a sprite oficial do item de runa nas 4 áreas: lista do modal, painel de detalhes, inventário e barra de ações.
2. Nenhuma runa reutiliza ícone de magia.
3. A reconstrução de assets via `npm run extract:tibia1098` gera e preserva todas as runas.
4. 0 erros no typecheck e 100% dos testes Vitest passando.

Plans:
- [x] 94-01-PLAN: Extração de Sprites de Runas do Tibia 10.98 e Unificação Visual em Toda a Interface.

### Phase 95: Efeitos Visuais, Projéteis e Áreas de Impacto Autênticas de Runas via RealMap 11

**Goal:** Alinhar com 100% de fidelidade aos scripts de `realmap11/data/spells/scripts/` e constantes de `realmap11/src/const.h` todos os efeitos visuais (`effectId`) e projéteis (`projectileId`) das 34 runas canônicas do jogo, corrigindo associações incorretas (SD com efeito 18/projétil 32, Avalanche com projétil 29/efeito 42, Great Fireball com projétil 4/efeito 7, Explosion com projétil 41/efeito 5, etc.) e implementando a sincronização visual de impacto em área (+240ms no pouso do projétil) tanto na PixiArena quanto na ThaisCityArena.
**Depends on:** Phase 94
**Requirements:**
1. Correção de `effectId` e `projectileId` no catálogo `HOTBAR_RUNES` em `packages/domain/src/hotbarActions.ts` para todas as 34 runas canônicas de acordo com `realmap11/src/const.h`.
2. Mapeamento de tipos de área (`target`, `circle-3x3`, `cross-1x1`, `square-1x1`) e cálculo de coordenadas de detonação em área (`packages/domain/src/combat.ts`).
3. Suporte a `delayMs` em eventos visuais (`spell-visual`), permitindo que as detonações em área de runas com projétil aconteçam exatamente no impacto (+240ms) nos renderizadores WebGL `PixiArena` e `ThaisCityArena`.
4. Pré-carregamento universal de todas as spritesheets de mísseis e efeitos visuais no `ThaisCityArena.tsx` para evitar frames vazios no WebGL.
5. Inclusão das constantes completas de efeitos e projéteis em `packages/realmap11-importer/src/importSpells.ts`.
6. Preservação estrita dos ícones de runas corrigidos na Phase 94, das magias de Sorcerer da Phase 93, das poções das Phases 91-92 e das fórmulas de dano/regras de combate.
**Success Criteria:**
1. Sudden Death emite projétil 32 e efeito 18 no alvo.
2. Great Fireball emite projétil 4 e efeito 7 em área 3x3 circular sincronizada com a chegada do projétil (+240ms).
3. Avalanche emite projétil 29 e efeito 42 em área 3x3 circular sincronizada com a chegada do projétil (+240ms).
4. Explosion emite projétil 41 e efeito 5 em cruz 1x1 sincronizada (+240ms).
5. Todas as 34 runas possuem mapeamentos autênticos verificados contra realmap11.
6. 0 erros no typecheck e 100% dos testes Vitest passando (505/505 testes).

Plans:
- [x] 95-01-PLAN: Alinhamento de Efeitos Visuais, Projéteis e Detonação em Área das Runas.

### Phase 96: Sincronização de Impacto de Projéteis, Números de Dano, Redução de HP e Área das Runas

**Goal:** Sincronizar o impacto do projétil no alvo com a explosão visual do efeito, o surgimento do número flutuante de dano e a redução da barra de vida no momento exato em que o míssil atinge a criatura alvo (~240ms). Em ataques em área, sincronizar todos os monstros atingidos no raio da explosão. Em ataques seguidos, manter a barra de vida estável sem oscilações, e em golpes fatais, exibir o corpo no chão somente no momento do impacto.
**Depends on:** Phase 95
**Requirements:**
1. Adoção da constante única compartilhada `RUNE_PROJECTILE_FLIGHT_MS = 240` entre domínio e camada visual WebGL.
2. Atualização do contrato de eventos `spell-cast` para incluir `delayMs?: number`, propagando a latência de chegada do projétil para todos os alvos afetados (alvo único e alvos múltiplos em área).
3. Adaptação do `PixiArena.tsx` para postergar a visibilidade e subida do texto de dano até o instante `now >= startedAt` (+240ms).
4. Implementação de amortecedor de dano pendente (`pendingDamage`) para preservar a barra de vida no valor anterior durante o trajeto do míssil e deduze-la sem oscilações.
5. Retardo visual da renderização de corpos (`corpses`) e preservação do sprite do monstro vivo em pé até a colisão do projétil fatal.
6. Preservação estrita dos efeitos da Phase 95, sprites da Phase 94, ícones da Phase 93 e fórmulas de dano/cooldowns.
**Success Criteria:**
1. O míssil chega ao alvo exatamente junto com a explosão visual, número flutuante de dano e redução do HP.
2. Em ataques em área (Great Fireball, Avalanche, Explosion), todos os alvos atingidos no raio têm seus danos e barras de vida atualizados simultaneamente.
3. Ataques seguidos no mesmo alvo não causam oscilação na barra de vida.
4. Em mortes, o monstro fica em pé durante o voo e o corpo só aparece no impacto.
5. 0 erros no typecheck e 100% dos testes Vitest passando (512/512 testes).

Plans:
- [x] 96-01-PLAN: Sincronização de Voo de Projéteis, Impacto Visual, Números de Dano e Redução de Vida das Runas.

### Phase 97: Correção do Sistema de Condições para Uso Automático de Poções, Magias e Runas

**Goal:** Corrigir integralmente o sistema de condições e regras de uso automático para todas as poções, magias, runas e consumíveis configuráveis na hotbar. Cada ação passa a respeitar exatamente as condições configuradas pelo jogador em seu slot: alvo (`self`, `target`, `leader`, `lowest_hp`), métrica (`hp`, `mana`, `monsters`), operador (`lte`, `gte`, `lt`, `gt`, `eq`), valor numérico e modo (% ou absoluto). Eliminar completamente regras hardcoded fixas (como 50% de HP/MP) que sobrepunham as escolhas do jogador, garantir isolamento total entre slots, desativação estrita (`enabled: false`), e persistência permanente no banco de dados Prisma (`hotbarConfigs` em `hotbarJson`) entre sessões e relogs.
**Depends on:** Phase 96
**Requirements:**
1. Motor de avaliação determinístico de condições (`evaluateHotbarCondition` e `isHotbarSlotConditionsMet` em `packages/domain/src/hotbarActions.ts`) cobrindo alvos (`self`, `target`, `leader`, `lowest_hp`), métricas (`hp`, `mana`, `monsters`), operadores (`lte`, `gte`, `lt`, `gt`, `eq`) e valores percentuais ou absolutos.
2. Refatoração do auto-cast em `packages/domain/src/combat.ts` (`castAutomaticSpells`), avaliando individualmente cada slot da hotbar com base em seu respectivo `hotbarConfigs[slotIndex]`, verificando desativação do slot (`enabled === false`), lista de monstros ignorados (`ignoredMonsters`), cooldowns individuais e de grupo.
3. Eliminação de limites hardcoded (ex: fallback fixo de 50% de vida ou mana) que antes ignoravam ou substituíam os limiares configurados pelo jogador.
4. Sincronização e controle no modal `HotbarConfigModal.tsx`, garantindo que edições salvas sejam imediatamente aplicadas no estado da caçada e persistidas.
5. Persistência permanente via banco de dados Prisma (`PrismaPersistenceManager.ts`, `CharacterService.ts` e `/api/characters/[id]/save`), armazenando `{ hotbar, hotbarConfigs }` de forma retrocompatível em `hotbarJson`.
6. Preservação estrita de todos os efeitos visuais, sprites de itens, animações, projéteis e fórmulas canônicas.
**Success Criteria:**
1. "Você → Mana → menor ou igual a → 75%" permite o uso da poção de mana ao atingir 75% ou menos, sem esperar 50%.
2. Slots desativados (`enabled === false`) nunca disparam automaticamente sob nenhuma circunstância.
3. Múltiplas condições em um mesmo slot combinam por conjunção lógica AND (todas devem ser verdadeiras).
4. Condições de um slot não interferem nas condições de outros slots.
5. Filtro de monstros ignorados (`ignoredMonsters`) é respeitado, impedindo o disparo de runas ou magias em criaturas excluídas.
6. Configurações persistem após logout/login e reinicializações do servidor.
7. 0 erros no typecheck e 100% dos testes Vitest passando (525/525 testes).

Plans:
- [x] 97-01-PLAN: Correção Integral do Sistema de Condições da Hotbar e Persistência Permanente.

### Phase 98: Sprites Autênticos de Monstros, Ícones Canônicos de Magias Tibia 11, Efeitos Visuais das Magias e Coordenadas da Caçada dos Ratos

**Goal:** Restaurar e calibrar com precisão os 4 pilares solicitados na transição de versão do Tibia: (1) Sprites e imagens de todos os 13 monstros do jogo (`rat`, `cave-rat`, `spider`, `bug`, `poison-spider`, `troll`, `swamp-troll`, `rotworm`, `skeleton`, `minotaur`, `dwarf`, `carrion-worm`, `dragon`), gerando miniaturas 32x32 perfeitamente centralizadas e pixeladas via detecção de bounding-box alpha e exibição nítida com `object-fit: contain;` no `HuntSelector`; (2) Mapeamento e alinhamento universal de 146 ícones canônicos 32x32 do Tibia 11 extraídos diretamente de `graphics_resources.rcc` para todas as vocações (Knight, Paladin, Sorcerer, Druid); (3) Importação de efeitos de impacto (`effectId`) e projéteis (`projectileId`) canônicos para todas as magias de ataque e suporte a partir das 175 constantes `CONST_ME_*` e 54 constantes `CONST_ANI_*` de `realmap11/src/const.h`; (4) Fixação estrita do spawn e entrada da caçada dos ratos nas coordenadas canônicas `X=32102, Y=32205, Z=8` com tiles e pisos autênticos do RealMap OTBM, HUD em tempo real de coordenadas da caçada e eliminação do congelamento de carregamento de texturas na `PixiArena.tsx` via streaming e carregamento em lotes resilientes.
**Depends on:** Phase 97
**Requirements:**
1. Algoritmo de thumbnail centralizado `createThumbnailRgba` no extrator de assets `packages/tibia1098-assets/src/extractor.ts`, gerando `monster-${entry.id}-thumb.png` com recorte nos pixels visíveis e dimensionamento pixel-art 32x32 para todos os 13 monstros e outfits.
2. Atualização de `packages/tibia1098-assets/src/types.ts` com o campo opcional `thumbUrl?: string` em `VisualAssetMapping` e integração nos cards e box de detalhes de `apps/web/components/HuntSelector.tsx`.
3. Extração e catalogação dos 146 ícones oficiais 32x32 do Tibia 11 para `public/spells/canonical/` e sincronização de todos os 84 nomes de slugs em `public/spells/`, com mapeamento completo de Knight, Paladin, Sorcerer e Druid em `apps/web/components/Tibia11ActionIcon.tsx`.
4. Mapeamento de efeitos (`effectId`) e projéteis (`projectileId`) para 86+ magias em `packages/realmap11-importer/src/importSpells.ts` e `content/generated/spells.json` lidos de `realmap11/src/const.h`.
5. Validação das coordenadas da Caçada dos Ratos em `(32102, 32205, 8)` e inclusão do HUD de localização RealMap no topo da viewport quando `mode === 'hunt'`.
6. Refatoração do carregamento de texturas na `PixiArena.tsx`, substituindo o `Assets.load` síncrono de milhares de itens pelo pré-carregamento imediato dos itens da sala ativa e streaming não-bloqueante em segundo plano.
**Success Criteria:**
1. Todos os 13 monstros exibem miniaturas centralizadas, proporcionais e nítidas no seletor de caçadas e na arena.
2. Ícones de magias de Knight, Paladin, Sorcerer e Druid correspondem exatamente aos oficiais do Tibia 11.
3. Magias de ataque e suporte disparam com seus respectivos efeitos e projéteis canônicos (ex: Terra Strike com carniphila 47 / terra 39; Ice Strike com ice 44 / ice projectile 37).
4. A caçada dos ratos inicia em (32102, 32205, 8) com pisos autênticos e HUD exibindo a coordenada RealMap.
5. `npm.cmd run typecheck` passa com 0 erros.
6. `npm.cmd test` passa com 100% de sucesso em todas as 99 suítes (531 testes aprovados).

Plans:
- [x] 98-01-PLAN: Sprites de Monstros, Ícones Canônicos Tibia 11, Efeitos de Magias e Coordenadas RealMap da Caçada dos Ratos.

### Phase 99: Tela de Carregamento Exura (5s), Prevenção de Perda de XP ao Sair da Hunt e Persistência Atômica

**Goal:** Implementar tela de loading ornamental de 5 segundos utilizando os assets oficiais Exura Idle Adventures (`loading-bg.jpg` e `loading-bar-frame.png`) com barra de magma animada avermelhada, ativação ao entrar no jogo e nas transições cidade ↔ caçada, substituição do método `respawnInTemple` por `leaveHunt` (garantindo 0% perda de XP e 0% perda de skills ao sair da caçada) e persistência imediata atômica no banco de dados Prisma via `saveProgress()`.
**Depends on:** Phase 98
**Plans:**
- [x] 99-01-PLAN: Tela de Carregamento Exura 5s, Prevenção de Perda de XP e Persistência de Transição.

### Phase 100: Correção Crítica da Inicialização de Jogo, Remoção de Bloqueio de Tela Preta e Exibição Confiável da Tela de Loading Exura na Cidade e Hunts

**Goal:** Eliminar a causa raiz da tela preta na inicialização de `/game`, garantindo que: (1) O container do WebGL canvas em `ThaisCityArena` nunca seja inicializado com `display: none` ou dimensões zero, acoplando `ResizeObserver` com `app.resize()`; (2) A transição da seleção de personagem transfira o controle imediatamente para a `ExuraLoadingScreen` de 5s, eliminando o intervalo escuro intermediário; (3) O ticker do PixiJS nunca fique parado por race conditions; (4) O endpoint `/api/characters/[id]/save` converta `BigInt` com segurança via `safeBigInt` sem lançar erro 400; e (5) O personagem surja renderizado com perfeição no Templo de Thais após os 5 segundos da tela de carregamento.
**Depends on:** Phase 99
**Plans:**
- [x] 100-01-PLAN: Resolução de Tela Preta, Redimensionamento Dinâmico PixiJS, Exibição Imediata do Loading Exura e Inicialização Garantida do Personagem em Thais.

### Phase 101: Correção Visual da Tela de Loading Exura (Vanilla CSS) e Restauração Integral do Mapa de Thais com Dynamic Texture Binding

**Goal:** Diagnosticar e solucionar em definitivo a ausência da tela de carregamento e o mapa bugado de Thais: (1) Reestruturação integral de `ExuraLoadingScreen.tsx` e `app/globals.css` com Vanilla CSS puro (`position: fixed; inset: 0; zIndex: 999999999`), garantindo exibição instantânea no login e em transições de caçada de forma 100% resiliente a classes do Tailwind; (2) Ordenação por proximidade das texturas de Thais (spawn no Templo `32369, 32241, 7`), assegurando que as ~450 texturas imediatas da área visível sejam pré-carregadas durante a tela de loading de 5s; (3) Implementação de Dynamic Texture Binding em `ThaisCityArena.tsx` eliminando qualquer substituição indevida de pisos autênticos por dummy floors de madeira; (4) Remoção de `object-fit: cover` dos canvas PixiJS para eliminar distorções de resolução e desalinhamentos de câmera.
**Depends on:** Phase 100
**Plans:**
- [x] 101-01-PLAN: Loading Screen com Vanilla CSS, Ordenação por Proximidade e Restauração Autêntica de Thais com Dynamic Texture Binding.

### Phase 102: Visibilidade da Barra de Progresso de Loading e Duração de 10 Segundos

**Goal:** Calibrar o preenchimento visual da barra de carregamento dentro da moldura ornamental `loading-bar-frame.png` para que o jogador veja nitidamente a barra de magma enchendo de 0% a 100% (gradiente de alta luminosidade, realce especular de 2px, centelha de brasa incandescente na frente do preenchimento e contador de porcentagem numérico em tempo real), além de aumentar a duração universal do loading para 10 segundos (10000ms) em todas as entradas de jogo, preview e transições de caçada.
**Depends on:** Phase 101
**Plans:**
- [x] 102-01-PLAN: Barra de Loading Magma Visível, Centelha Incandescente, Contador Numérico e Duração de 10 Segundos.

### Phase 103: Trilha Sonora de Thais em Loop (Sunset in the Village), Opções de Volume e Botão de Mute Rápido

**Goal:** Integrar a música temática de Thais `Sunset in the Village.mp3`: (1) Iniciar a música ainda durante a tela de loading ao entrar no jogo ou retornar a Thais; (2) Manter a música tocando em loop infinito enquanto o jogador estiver em Thais, pausando ao entrar em caçadas e retomando ao retornar à cidade; (3) Inserir controles completos de volume dentro do menu sanduíche (slider de 0% a 100%, badges de porcentagem, botões de predefinição rápida e status da trilha); (4) Inserir botão de silenciamento rápido (🔊 / 🔇) ao lado do botão de sair na barra superior com atalho 'M'; (5) Persistência de volume e mute no localStorage.
**Depends on:** Phase 102
**Plans:**
- [x] 103-01-PLAN: Trilha Sonora de Thais em Loop, Controles de Volume no Menu Sanduíche e Botão de Mute Rápido.

### Phase 104: Notificação Flutuante de Música Atual ("Thais Theme") com Transição Deslizante da Direita

**Goal:** Implementar uma caixa/banner elegante ("Now Playing" toast) que desliza suavemente a partir do lado direito da tela ao iniciar uma música (no caso de Thais, "Thais Theme"), permanece visível por um intervalo (~4.5s) com animação de equalizador e barra de contagem regressiva, e em seguida desliza suavemente para fora da tela pela direita até sumir completamente.
**Depends on:** Phase 103
**Requirements:**
1. Módulo `MusicTrackToast.tsx` conectado ao barramento de eventos do `audioManager.ts` através de `onTrackNotification` e `triggerTrackNotification`.
2. Identificação da trilha de Thais como "Thais Theme" com subtítulo "Sunset in the Village" e localização "Cidade de Thais".
3. Animações CSS em `app/globals.css`: `@keyframes music-toast-slide-in` (desliza da direita de 125% para 0%), `@keyframes music-toast-slide-out` (desliza para fora pela direita de 0% para 130%), animação do equalizador em vinil pulsante e linha de progresso (`music-timer-drain`).
4. Possibilidade de re-exibir a notificação ao desmutar o áudio ou clicando na trilha de áudio no menu de opções.
5. 0 erros de TypeScript no `typecheck` e 100% dos testes Vitest passando.
**Plans:**
- [x] 104-01-PLAN: Caixa Flutuante de Notificação da Música "Thais Theme" com Animação Deslizante da Direita.

### Phase 105: Exibição da Caixa de Notificação de Música ("Thais Theme") Estritamente Após a Tela de Carregamento (Loading)

**Goal:** Assegurar que a caixa de notificação da música ("Now Playing" toast de "Thais Theme") nunca seja exibida sobre a tela de carregamento (loading), mas sim apareça estritamente depois que a tela de loading de 10s (login inicial ou retorno da caçada) é finalizada e o jogador já está com visão total de Thais.
**Depends on:** Phase 104
**Requirements:**
1. Parametrização do componente `MusicTrackToast.tsx` com a prop `isLoading?: boolean`, silenciando qualquer renderização visual e enfileirando a trilha recebida em `queuedTrackRef` enquanto `isLoading` for `true`.
2. Detecção de transição de loading (`prevLoadingRef.current && !isLoading`) em `MusicTrackToast.tsx`, disparando o toast enfileirado com um breve delay estético (350ms) após o sumiço do loading.
3. Passagem de `isLoading={initialLoadingActive || Boolean(transitionLoading?.active)}` em `GamePrototype.tsx`.
4. Disparo autoritativo de `triggerTrackNotification(THAIS_THEME_TRACK)` no callback `onFinish` da `ExuraLoadingScreen` quando `mode === 'training'`.
5. 0 erros no `typecheck` e 100% de aprovação nos testes Vitest (18/18 testes em 103, 104 e 105).
**Plans:**
- [x] 105-01-PLAN: Enfileiramento e Exibição Pós-Loading da Caixa de Notificação de Música "Thais Theme".

### Phase 106: Preenchimento Proporcional Contínuo e Visual da Barra de Loading Conforme a Porcentagem

**Goal:** Calibrar e sincronizar perfeitamente a barra de carregamento dentro da moldura ornamental `loading-bar-frame.png` para que o jogador veja nitidamente a barra de magma enchendo continuamente da esquerda para a direita em tempo real conforme a porcentagem aumenta de 0% a 100%: (1) Eliminação do `transition: width 0.08s` no CSS e componente, permitindo renderização a 60fps sem cancelamentos de transição; (2) Calibração geométrica estrita da cavidade interna (`top: 40.5%`, `height: 17.2%`, `left: 7.8%`, `width: 84.4%`) preenchendo exatamente o vão transparente da moldura de 1024x341; (3) Inclusão do indicador numérico de porcentagem `{Math.round(progress)}%` centralizado diretamente dentro da cavidade da barra em harmonia com o texto descritivo inferior; (4) Magma incandescente com gradiente de alta luminosidade, ponta de brasa incandescente (`ember head`) e redução do drop-shadow interno da moldura.
**Depends on:** Phase 105
**Requirements:**
1. Ajuste em `apps/web/components/ExuraLoadingScreen.tsx` removendo CSS transition inline e sincronizando a largura da barra `width: ${Math.min(100, Math.max(0, progress))}%` em tempo real.
2. Inclusão de indicador numérico de porcentagem centralizado dentro do slot da barra.
3. Ajuste em `app/globals.css` eliminando `transition: width 0.08s linear !important;` e calibrando `top: 40.5% !important;`, `height: 17.2% !important;`.
4. 0 erros no `typecheck` e 100% de sucesso nos testes automatizados Vitest (40/40 testes nas fases 100-106).
**Plans:**
- [x] 106-01-PLAN: Preenchimento Contínuo da Barra de Loading em Sincronia com a Porcentagem e Centralização Geométrica.

### Phase 107: Diferimento da Entrada e Visibilidade do Personagem até o Fim do Loading (Spawn Seguro Pós-Loading e Proteção Anti-Morte em Caçadas)

**Goal:** Resolver a vulnerabilidade crítica de combate e renderização em que o personagem carregava e iniciava o combate em segundo plano sob a tela de loading de 10 segundos, expondo o jogador a ataques e morte por monstros antes mesmo da barra carregar: (1) Ocultação integral do personagem (`isCharacterVisible = !initialLoadingActive && !transitionLoading?.active`) em `ThaisCityArena` e `PixiArena`, fazendo com que ele só apareça visualmente junto com o término da tela de carregamento; (2) Diferimento estrito do início da caçada (`startSelectedHunt` e `onPartyHuntStart`) via `pendingHuntTransitionRef`, mantendo o jogador em estado pacífico seguro durante os 10s e executando `restartHunt(...)`, `setMode('hunt')` e o teleporte autoritativo apenas no callback `onFinish`; (3) Bloqueio determinístico do ticker de combate (`tickCombat`) enquanto qualquer loading estiver ativo, garantindo 0 ticks de combate e 0 dano recebido enquanto a tela de loading estiver visível; (4) Reinicialização do relógio de combate no primeiro tick pós-loading para transição fluida.
**Depends on:** Phase 106
**Requirements:**
1. Parametrização de `PixiArena.tsx` e `ThaisCityArena.tsx` com `isCharacterVisible?: boolean`, ocultando o container de visualização (`view.root.visible = false`) e retículo de alvo enquanto `isCharacterVisible` for falso.
2. Atualização de `GamePrototype.tsx` calculando `isCharacterVisible = !initialLoadingActive && !transitionLoading?.active`, travando o loop de combate em `tickCombat` e `tickCityAutoSpells` caso qualquer loading esteja ativo.
3. Criação de `pendingHuntTransitionRef` em `GamePrototype.tsx` para enfileirar as informações da hunt e executá-las estritamente no `onFinish` da `ExuraLoadingScreen`.
4. Suíte de testes automatizados `tests/phase107-character-spawn-post-loading-safety.test.ts` validando todas as garantias de segurança e visibilidade.
5. 0 erros de tipagem no `npm run typecheck` e 100% de sucesso nos testes Vitest.
**Plans:**
- [x] 107-01-PLAN: Diferimento da Entrada e Visibilidade do Personagem até o Término da Tela de Carregamento.

### Phase 108: Seletor de Caçadas em Carrossel Horizontal de Cards (Design Exura Medieval / RPG Clássico)

**Goal:** Refatorar completamente a interface do seletor de caçadas do Exura (`HuntSelector.tsx`), substituindo a janela azul de 3 colunas por um carrossel horizontal de cards baseado na referência visual medieval clássica com 3 cards simultâneos (`[ card anterior ] [ CARD SELECIONADO ] [ card seguinte ]`), destacando o card central com moldura dourada radiante e gemas de rubi, navegação contínua por setas `<` e `>`, clique direto para centralizar cards laterais, topo com placa octagonal "ESCOLHA SUA CAÇADA" e badge de nível dinâmica, cards individuais com ilustração de cenário temática, sprite pixelado, medalhão de nível, nome e descrição, nível sugerido com indicador de dificuldade por cor e botão de mochila com tooltip flutuante de possíveis drops (sem corte de overflow), além do botão principal de ação "INICIAR CAÇADA", preservando 100% da lógica e dados existentes.
**Depends on:** Phase 107
**Requirements:**
1. Extensão de `HuntDefinition` com `displayName?: string;` e `shortDescription?: string;` e enriquecimento de `initialHunts` com títulos em português e níveis canônicos sem alterar IDs, regras ou tabelas de combate.
2. Componentes modulares `HuntCard.tsx`, `HuntCarousel.tsx` e `HuntLootTooltip.tsx` sob `apps/web/components/hunts/` sem duplicação ou hardcodes fixos de hunts.
3. Posicionamento dinâmico de `HuntLootTooltip.tsx` garantindo visibilidade total sem corte por `overflow: hidden`.
4. Estilização Vanilla CSS em `app/globals.css` fiel à estética medieval clássica do Exura (pedra escura, ouro envelhecido, vermelho profundo e transições de 200–300ms).
5. Cobertura de testes automatizados via Vitest e 0 erros de TypeScript no `npm run typecheck`.
**Plans:**
- [x] 108-01-PLAN: Seletor de Caçadas em Carrossel Horizontal de Cards (Design Exura Medieval / RPG Clássico).

### Phase 109: Trilha Sonora do Dragon Lair (Dragons Pride) no Loading e Notificação Pós-Carregamento

**Goal:** Integrar a música "Dragons Pride" (`songs/Dragons pride.mp3`) para que comece a tocar imediatamente na tela de loading ao entrar na caçada de Dragon Lair (`dragon-lair`), pausando a música de Thais, e após a conclusão do carregamento com o personagem já visível no mapa, exibir a caixa de notificação musical deslizante ("Dragons Pride").
**Depends on:** Phase 108, Phase 105, Phase 107
**Requirements:**
1. Cópia e publicação de `songs/Dragons pride.mp3` para `public/songs/`.
2. Extensão do `audioManager.ts` com a faixa `DRAGONS_PRIDE_TRACK` e controle de reprodução (`playDragonLairBgm`, `pauseDragonLairBgm`, `stopDragonLairBgm`).
3. Disparo imediato da reprodução da música durante a tela de loading ao entrar no Dragon Lair (líder e membros de party).
4. Disparo da notificação flutuante de faixa musical estritamente após a conclusão do carregamento e aparecimento do personagem no mapa.
5. Retomada harmônica da música da cidade ao sair da caçada ou retornar ao templo.
6. Cobertura de testes automatizados via Vitest e 0 erros de TypeScript.
**Plans:**
- [x] 109-01-PLAN: Trilha Sonora do Dragon Lair (Dragons Pride) no Loading e Notificação Pós-Carregamento.

### Phase 110: Tela de Carregamento de Thais (Nova Ilustração do Templo) e Sistema de Curiosidades Rotativas ("Você Sabia?")

**Goal:** Substituir a imagem de fundo da tela de carregamento de Thais pela nova arte oficial do Templo de Thais (`public/images/loading/thais-loading.jpg`) e introduzir um sistema dinâmico de curiosidades históricas/lore de Tibia na tela de carregamento, alternando aleatoriamente a cada 3 segundos com transições suaves.
**Depends on:** Phase 109, Phase 106, Phase 102
**Requirements:**
1. Publicação e vinculação da nova ilustração oficial do Templo de Thais em `public/images/loading/thais-loading.jpg` e `public/images/loading/loading-bg.jpg`.
2. Array canônico `THAIS_LORE_CURIOSITIES` contendo os 3 fatos históricos de Thais/Tradespot/Tibianus I.
3. Rotação randômica periódica de curiosidades a cada 3000ms (3 segundos) com fade suave e sem repetição consecutiva imediata.
4. Placa medieval estilizada com moldura dourada e tipografia marfim serifada posicionada harmonicamente acima da barra de carregamento.
5. Cobertura de testes automatizados no Vitest e 0 erros de TypeScript.
**Plans:**
- [x] 110-01-PLAN: Tela de Carregamento de Thais (Nova Ilustração do Templo) e Sistema de Curiosidades Rotativas ("Você Sabia?").

### Phase 111: Telas de Carregamento Modulares por Caçada & Loading de Dragon Lair

**Goal:** Permitir que cada caçada possua sua própria tela de carregamento com imagem de fundo temática e curiosidades históricas exclusivas, mantendo o fallback padrão para a tela de Thais, e configurar imediatamente o Dragon Lair (`dragon-lair`) com a nova arte do dragão verde na caverna e suas 3 curiosidades sobre Garsharak e Dragon Lords.
**Depends on:** Phase 110, Phase 109
**Requirements:**
1. Publicação e vinculação da ilustração do Dragão na caverna em `public/images/loading/dragon-lair-loading.jpg`.
2. Criação do catálogo `DRAGON_LAIR_LORE_CURIOSITIES` e dicionário modular `HUNT_LOADING_CONFIGS`.
3. Função auxiliar `getLoadingConfigForHunt(huntId)` provendo a arte e as curiosidades apropriadas com fallback limpo para Thais.
4. Vinculação do `activeHuntId` no `GamePrototype.tsx` ao invocar `ExuraLoadingScreen`.
5. Cobertura de testes automatizados no Vitest e 0 erros de TypeScript.
**Plans:**
- [x] 111-01-PLAN: Telas de Carregamento Modulares por Caçada & Loading de Dragon Lair.

### Phase 112: Correção de Nível/XP Autoritativo, Acessibilidade de Respawns do Dragon Lair e Modal de Ficha do Personagem com 5 Avatares

**Goal:** Atender integralmente às 3 correções de `FIX.md`: sincronização e autoridade de Nível e XP (impedindo perdas ou valores 0), garantia de acessibilidade A* para spawns de dragões e visibilidade limpa no PixiArena, e implementação do Modal de Ficha do Personagem ao clicar no quadrado da barra de navegação com abas `[PERSONAGEM]` / `[OUTFIT]` e seletor de 5 avatares.
**Depends on:** Phase 111
**Requirements:**
1. Inicialização correta de `player.experience` no `ThaisCityRoom.onJoin` e reconciliação monótona no `PrismaPersistenceManager.ts` e `characterService.ts`.
2. Script de reconciliação de dados em `prisma/dev.db` garantindo que nenhum personagem perca progresso.
3. Validação de caminho navegável no `populateRespawnZone` em `packages/domain/src/combat.ts`.
4. Reset limpo de entidades ao reentrar na mesma hunt em `apps/web/components/PixiArena.tsx`.
5. Modal `CharacterProfileModal.tsx` com visual fiel às referências, atributos, skills, progressão, combate, histórico de morte e 5 avatares persistidos.
6. Cobertura de testes automatizados no Vitest e 0 erros de TypeScript.
**Plans:**
- [x] 112-01-PLAN: Correção de Nível/XP Autoritativo, Acessibilidade de Respawns do Dragon Lair e Modal de Ficha do Personagem com 5 Avatares.

### Phase 113: Tela de Carregamento de Thais na Morte do Personagem (Death Loading Transition)

**Goal:** Quando o personagem morre em caçada e o jogador confirma o respawn, passar obrigatoriamente pela tela de carregamento de Thais (10 segundos, com a arte do Templo de Thais e as curiosidades de Thais), parando a trilha sonora da hunt, iniciando o tema de Thais, sincronizando penalidades autoritativamente e teleportando o personagem para o Templo de Thais.
**Depends on:** Phase 112, Phase 111, Phase 102
**Requirements:**
1. Ativação de `setTransitionLoading` com duração de 10s (`durationMs: 10000`), `huntId: undefined` (fallback canônico para Thais) e mensagem "Renasceu no Templo de Thais..." ao confirmar a morte em `handleConfirmDeath`.
2. Interrupção imediata da música da caçada (`stopDragonLairBgm()`) e início imediato do tema de Thais (`playCityBgm()`) durante o loading.
3. Notificação do servidor Colyseus com `sendTeleport(THAIS_TEMPLE_POSITION)` e `sendSetInHunt(false)`.
4. Salvamento de progresso com flag autoritativa de penalidade de morte (`saveProgressRef.current(true)`).
### Phase 114: Troca Rápida de Habilidades e Ações na Hotbar via Drag-and-Drop (Arrastar e Soltar Slots F1 a F12)

**Goal:** Implementar o suporte nativo e intuitivo a arrastar e soltar (HTML5 Drag and Drop) entre os slots da Action Bar inferior (`BottomConsoleHUD`), permitindo ao jogador reordenar e trocar instantaneamente magias, runas e poções entre os slots de F1 a F10 e 1 a 0 com preservação de condições de disparo e persistência no banco de dados.
**Depends on:** Phase 113, Phase 97, Phase 86
**Requirements:**
1. Habilitação de drag-and-drop nos 20 slots de ação da hotbar.
2. Função canônica de domínio `reorderHotbar(character, fromIndex, toIndex)` com troca atômica sem efeito dominó.
3. Migração consistente de `hotbarConfigs` entre slots.
4. Feedback visual responsivo (`dragging` e `drag-over`).
5. Persistência atômica via `onSave` e rota `/api/characters/[id]/save`.
6. Cobertura de testes automatizados no Vitest e 0 erros de TypeScript.
**Plans:**
- [x] 114-01-PLAN: Troca Rápida de Habilidades e Ações na Hotbar via Drag-and-Drop.

### Phase 115: Auditoria Completa de Correções do FIX.md (Outfits/Addons/Mounts, Spawns e Movimentação no Dragon Lair, Poções de Mana e Efeitos, Promoção no Nível 20, Ajustes Visuais de TopNav/Loading e Wands/Rods em Combate)

**Goal:** Resolver integralmente os 7 itens solicitados em `FIX.md`: (1) Importação completa de outfits, addons e montarias de `outfits.xml` e `mounts.xml` com renderização correta do personagem montado; (2) Garantia de spawn, acessibilidade de monstros e movimentação no Dragon Lair na entrada (32741,31294,11) sem congelamentos; (3) Auto-uso confiável de poções de mana respeitando condições salvas com sincronização de texto "Aahhh...", ícone e efeito visual no personagem; (4) Trava de Nível 20 para exibição dinâmica do botão de Promoção na janela de Skills; (5) Remoção dos emojis de "Você Sabia?", emoji da Loja e botão de caçadas redundante; (6) Reposicionamento do painel de conta/avatar mais à esquerda e uso dos ícones oficiais de Gold Coin e Tibia Coins; (7) Combate e troca em tempo real de Wands e Rods com dano, elemento, consumo de mana e projéteis autoritativos.
**Depends on:** Phase 114, Phase 113, Phase 112
**Requirements:**
1. Importador / catálogo expandido de outfits e montarias com suporte a gênero e renderização de montaria.
2. Inicialização segura do Dragon Lair em (32741, 31294, 11) com validação de caminho A* e loop de caminhada ativo pós-loading.
3. Disparo automático de poções de mana respeitando as condições salvas, com recuperação, overhead speech "Aaaah..." e efeito visual no personagem.
4. Botão de Promoção na `SkillsWindow` oculto para personagens abaixo do nível 20 e visível automaticamente no nível 20+.
5. Remoção de emojis em `ExuraLoadingScreen`, remoção do emoji da Loja e remoção do botão redundante "Caçadas" ao lado de Depot no TopNavigation.
6. Ajuste de layout no TopNavigation: painel de conta/avatar mais à esquerda, ícones maiores e troca por sprites autênticos de Gold Coin e Tibia Coin.
7. Ataque contínuo e troca de Wands/Rods em combate com alcance, mana, elemento e projéteis sincronizados sem necessidade de relogar.
8. Cobertura de testes automatizados no Vitest e 0 erros de TypeScript.
### Phase 116: Blindagem de Sessão/Auth Admin, Cadastro Seguro e Correção de Frame Parado (Idle Pose)

**Goal:** Eliminar vulnerabilidades críticas de autenticação/autorização e desincronizações visuais de movimentação identificadas no `FIX.md`: (1) Centralizar login, logout e troca de conta com expiração atômica de cookies (`colyseus_token`), limpeza de localStorage, desconexão de rede e descarte de permissões administrativas residuais; (2) Blindar o cadastro público contra injeção de `role: "admin"`, restringindo o registro estritamente para `PLAYER` e validando `JWT_SECRET`; (3) Corrigir o estado de pose parada (idle pose) em `ThaisCityArena.tsx` e renderizadores PixiJS, separando o caminho pendente (`walkingPath`) do deslocamento visual físico real (`sample.moving`), eliminando callbacks assíncronos que sobrescreviam o frame parado com texturas antigas de caminhada e garantindo a transição imediata para o frame 0 ao parar.
**Depends on:** Phase 115, Phase 63, Phase 47
**Requirements:**
1. Centralização do ciclo de vida de sessão: `handleLogout` em `TibiaAuthCharacterModal` e `signOut` em `AuthProvider` expiram o cookie `colyseus_token` (`max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`), removem tokens do localStorage, encerram conexão ativa com o servidor de jogo e resetam o estado de `onlineAccount` / `onlineCharacter`.
2. Em `GamePrototype.tsx`, o papel administrativo (`isAdmin`) deve ser derivado exclusivamente da sessão validada ativa do usuário conectado (`onlineAccount?.role`), sem fallback ou sobreposição permissiva de identidades passadas de provedores divergentes.
3. Rota `/api/auth/register` e camada de serviço `AccountService.register` forçam incondicionalmente a role `PLAYER` em qualquer requisição de cadastro público, rejeitando tentativas de autopromoção para `admin` ou `gm`.
4. Em `packages/auth/src/jwt.ts`, exigir `JWT_SECRET` válido e configurado no ambiente, fornecendo chave segura no `.env`.
5. Em `ThaisCityArena.tsx` e `GamePrototype.tsx`, o frame de caminhada deve ser ativado estritamente quando há movimento físico interpolado (`charIsMoving` / `sample.moving`), forçando o frame 0 (pose de repouso) assim que o movimento cessa, independentemente de haver waypoints remanescentes ou parada abrupta.
6. Em `ThaisCityArena.tsx`, eliminar callbacks assíncronos de textura que aplicam frames de caminhada desatualizados e implementar diferenciação entre texturas provisórias e definitivas via `recoloredCanvasCache` para evitar travas em frames incorretos.
7. Cobertura de testes automatizados no Vitest e 0 erros de TypeScript.
**Plans:**
- [x] 116-01-PLAN: Blindagem de Sessão/Auth Admin, Cadastro Seguro e Correção de Frame Parado (Idle Pose).

### Phase 117: Pipeline Autêntico de Animação Tibia 10.98 (Idle Frame 0 Canônico e Ciclo Completo de Caminhada com 8 Frames)

**Goal:** Resolver a causa raiz definitiva da pose de repouso e da animação de caminhada incompleta: (1) Corrigir o extrator de appearances (`scripts/extract-complete-appearances.mjs`) para extrair o `FrameGroup 0 (Idle)` (1 frame) como o verdadeiro `f0` (pose estática neutra com pés alinhados) e todos os 8 frames de `FrameGroup 1 (Moving)` para compor a caminhada completa da CipSoft; (2) Atualizar o cache e carregador de texturas (`apps/web/lib/outfitRecolor.ts`) para suportar a pose `f0` neutra e o ciclo de 8 frames; (3) Integrar o ciclo fluido de 8 frames em `ThaisCityArena.tsx` e `PixiArena.tsx`, eliminando truncamentos e garantindo que o personagem parado permaneça em repouso neutro e ao andar execute a caminhada autêntica com as duas pernas; (4) Suíte de testes automatizados e validação de 0 erros no TypeScript.
**Depends on:** Phase 116, Phase 47, Phase 44
**Requirements:**
1. No extrator de appearances, distinguir estritamente `FrameGroup 0` (Idle) e `FrameGroup 1` (Moving) para cada creature e mount.
2. Salvar `f0` a partir do `FrameGroup 0` (pose de repouso neutra).
3. Salvar os frames de caminhada a partir do `FrameGroup 1` (8 frames de caminhada completos).
4. Adaptar `outfitRecolor.ts` e renderizadores PixiJS para utilizar `f0` parado e o ciclo de 8 passos do Tibia 10.98 em movimento.
5. Cobertura de testes automatizados no Vitest e 0 erros de TypeScript.
**Plans:**
- [x] 117-01-PLAN: Pipeline Autêntico de Animação Tibia 10.98 (Idle Frame 0 Canônico e Ciclo Completo de Caminhada com 8 Frames).

### Phase 118: Identidade Visual Exura e Janela de Autenticação com Estilo Autêntico In-Game

**Goal:** Atualizar o modal público de autenticação (`AuthModal.tsx`) e sua estilização (`globals.css`) para substituir a marca legada Cavebound pelo logo oficial do Exura e aplicar a paleta e acabamentos de interface autênticos do jogo (janela de pedra/ardósia, chanfros metálicos medievais em bronze/ouro tibiano, botões beveled com relevo e inputs escavados).
**Depends on:** Phase 117, Phase 116, Phase 45
**Requirements:**
1. Substituir o logo e monograma Cavebound em `AuthModal.tsx` pela imagem do logo oficial do Exura (`/logo.png`).
2. Reformular a janela `.auth-dialog` com a paleta autêntica in-game (Tibia 11 / Exura Online): degradê radial de ardósia escura, borda beveled em bronze dourado medieval (`#6b5329`), chanfro interno iluminado e sombra de alta profundidade.
3. Estilizar o botão de fechar no padrão Tibia 11 com hover em alerta de combate vermelho.
4. Harmonizar a tipografia (eyebrow em ouro tibiano, título em branco radiante, subtítulo em ardósia).
5. Inputs escavados na pedra com borda metálica e iluminação ao focar.
6. Botão de ação primário dourado com relevo 3D chanfrado e brilho ao passar o mouse.
7. Botão do Google em pedra/aço chanfrado e links de alternância em âmbar.
8. 0 erros de TypeScript e aprovação nos testes automatizados.
**Plans:**
- [x] 118-01-PLAN: Identidade Visual Exura e Janela de Autenticação com Estilo Autêntico In-Game.

### Phase 119: Substituição dos Avatares do Jogo pelas Novas Ilustrações

**Goal:** Substituir os 5 avatares do perfil do personagem pelas novas ilustrações de alta resolução fornecidas pelo usuário, cobrindo as vocações e arquétipos do Exura (Knight com elmo de chifres, Sorcerer arquimago púrpura, Paladin valquíria alada, Druid feiticeira de chapéu azul e Champion guerreiro de Thais).
**Depends on:** Phase 118, Phase 112
**Requirements:**
1. Instalar os novos assets ilustrados em `public/images/avatars/` nos formatos `.png`, `.jpg` e `.svg` com compatibilidade retroativa.
2. Atualizar o catálogo de avatares `AVAILABLE_AVATARS` em `CharacterProfileModal.tsx` com as novas rotas, títulos e descrições.
3. Atualizar a exibição na barra superior `WindowDockBar.tsx` para usar o novo avatar nativo.
4. Manter 100% de aprovação na suíte de testes do Vitest e 0 erros de TypeScript.
**Plans:**
- [x] 119-01-PLAN: Substituição dos Avatares do Jogo pelas Novas Ilustrações.

### Phase 120: Correção de Montarias, Alinhamento Relativo por DAT Displacement, Cache Definitivo e Addons Montados

**Goal:** Resolver os problemas estruturais de composição, renderização e cache de montarias: preservar o `ThingAttrDisplacement` (atributo 24) do `Tibia.dat`, extrair addons montados (`z = 1`) para idle e caminhada, aplicar o deslocamento relativo exato `(outfit.displacement - mount.displacement)` sem constantes globais arbitrárias, e impedir envenenamento prematuro de cache no `getRecoloredCanvasSync` durante o carregamento de texturas.
**Depends on:** Phase 119, Phase 117, Phase 115
**Requirements:**
1. Preservar `ThingAttrDisplacement` no parser DAT (`dat.ts` / `types.ts`) e exportar nos manifests `outfits.json` e `mounts.json`.
2. Extrair addons montados (`z = 1`) para ambos os sexos, 4 direções e todos os frames (`f0` a `f8`) no script extrator.
3. No compositor `outfitRecolor.ts`, calcular o alinhamento relativo da montaria e do cavaleiro usando os metadados do DAT (`getMountDisplacementOffset`), conferindo paridade com War Bear, Black Sheep e Citizen.
4. No `getRecoloredCanvasSync`, só gravar no cache definitivo quando todas as camadas necessárias estiverem completamente carregadas e válidas. Manter fallbacks como provisórios sem poluir a chave definitiva.
5. Manter 100% de aprovação na suíte de testes do Vitest e 0 erros de TypeScript.
**Plans:**
- [x] 120-01-PLAN: Correção de Montarias, Alinhamento Relativo por DAT Displacement, Cache Definitivo e Addons Montados.














