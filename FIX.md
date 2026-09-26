# FIX.md — Plano de Resolução e Checklist Mobile (Phase 237)

## Status Geral: CONCLUÍDO E VALIDADO ✅ (100% dos itens resolvidos)

### Itens de Resolução:
- [x] **Item 1: Tela de seleção de personagens (`TibiaAuthCharacterModal.tsx`)**
  - [x] Ocultar vídeo do bardo em telas mobile (`<= 768px`) para evitar explosão de largura horizontal (>1170px).
  - [x] Ajustar largura do card para `min(94vw, 440px)` com padding ergonômico (`24px 16px 20px`).
  - [x] Dispor linhas de personagens em coluna no mobile (nome/nível em cima, botões de ação "Deletar" e "ENTRAR NO JOGO" alinhados abaixo sem estourar a tela).

- [x] **Item 2: Pop-up de promoção de vocação (`PromotionModal.tsx`)**
  - [x] Repensar e condensar informações: cabeçalho compacto com ícone de coroa e título em uma linha só.
  - [x] Botão de fechar ✕ de 38x38px de alto contraste visível no topo direito.
  - [x] Card de preview compacto com avatar 48px e selo "FULL ADDONS UNLOCKED".
  - [x] Vantagens em 4 chips/pills compactos em grade 2x2 (sem parágrafos gigantescos empurrando a tela).
  - [x] Barra de custo e saldo enxuta e botões de ação ergonômicos ("Comprar Promoção" e "Decidir Depois").

- [x] **Item 3: Janela Personagem sem scroll lateral (`CharacterProfileModal.tsx`)**
  - [x] Corrigir Row 1 de `minmax(360px, 1fr)` para `minmax(min(100%, 260px), 1fr)`.
  - [x] Tornar o Identity Card flexível (avatar 64px no mobile, barras de HP/MP/XP compactas).
  - [x] Aplicar `overflow-x: hidden` estrito na janela e no corpo para erradicar 100% o scroll horizontal.

- [x] **Item 4: Customizar Aparência / Outfit no Mobile (`OutfitModal.tsx`)**
  - [x] Criar visualização mobile com preview compacto fixo no topo (canvas 64px, girar ⟳, nome do traje e setas da party).
  - [x] 3 abas móveis limpas: `[Trajes]`, `[Cores & Addons]` e `[Montaria]`.
  - [x] Ocultar botões de debug/diagnóstico no mobile para não esmagar o rodapé.
  - [x] Botões grandes e acessíveis de "Cancelar" e "Salvar Alterações".

- [x] **Item 5: Ranking e Highscores (`HighscoresModal.tsx`)**
  - [x] Mudar layout de 2 colunas lado a lado para 1 coluna no mobile.
  - [x] Categorias em barra de abas horizontal com rolagem ou dropdown compacto.
  - [x] Tabela condensada e 100% responsiva (sem overflow lateral, vocação/nível em subtítulo inline `Lv. 82 · Knight`).
  - [x] Botão de fechar ✕ de 38x38px no cabeçalho.

- [x] **Item 6: Mapa de Caçadas compacto e sem scroll horizontal (`HuntSelector.tsx` & CSS)**
  - [x] Redesenhar cards de caçadas no mobile para altura compacta (68px-74px), densos de informação sem espaços vazios inúteis.
  - [x] Informações organizadas: sprite na esquerda, nome + monstros no meio, XP/GP em badges compactos na direita.
  - [x] Eliminar transbordamento de texto que causava barra de rolagem horizontal.
  - [x] Corrigir fallback de imagem para Corym Mine e demais criaturas com assets canônicos.

- [x] **Item 7: Tela da Arena PvP (`ArenaPvPModal.tsx`)**
  - [x] Conter tamanho da janela: `max-width: 96vw; max-height: 92vh; overflow-y: auto`.
  - [x] Botão de fechar ✕ de 38x38px de alto contraste no cabeçalho.
  - [x] Layout mobile em 1 coluna vertical empilhada com botão inferior "Fechar Arena".

- [x] **Item 8: Tela de Imbuements (`ImbuingModal.tsx`)**
  - [x] Conter modal para `max-width: 96vw; max-height: 92vh`.
  - [x] Botão de fechar ✕ de 38x38px no cabeçalho.
  - [x] Layout mobile em 1 coluna com rolagem vertical suave sem cortes.

- [x] **Item 9: Refinamento de Loading e Bestiário no Mobile**
  - [x] Safe-area padding no rodapé da tela de loading para não cortar "SALVANDO PROGRESSO".
  - [x] Bestiário flutuante com contenção no mobile e safe-area padding.

- [x] **Item 10: Seletor de Caçadas Web Desktop (`HuntSelector.tsx` & `globals.css`)**
  - [x] Layout vertical em 4 colunas compactas com rolagem vertical suave (sem scroll horizontal).
  - [x] Janela contida em proporções ideais (`min(840px, 94vw)` e `min(540px, 86vh)`).
  - [x] Micro-grid de 3 colunas para status Solo/Party sem transbordamento (`28px 1fr 1fr`).
  - [x] Identidade visual autêntica TibiaWeb / Cavebound (ardósia medieval, abas douradas/âmbar e tipografia Cinzel).

- [x] **Item 11: Remoção de Informações de Solo/Party e Números/Hora dos Cards de Caçada (`HuntSelector.tsx` & `globals.css`)**
  - [x] Remover seção de métricas `hunt-card-bottom` (Solo, Party, XP/h, gp/h, Sem recorde ainda) dos cards.
  - [x] Cards ultra-compactos e limpos com miniatura do monstro, título da caçada, badge de nível recomendado, criaturas e botão de favorito.
  - [x] Substituir bloco de recordes na tela de setup por dados limpos de requisitos (Nível Mínimo e Recomendado).

- [x] **Item 12: Redesign Minimalista do Gerenciador de Party (`UnifiedPartyModal.tsx` & `globals.css`)**
  - [x] Remover abas "Táticas & Sinergia" e concentrar a interface em um único painel limpo e minimalista.
  - [x] Redesenhar os 4 cards de vocação conforme imagem de referência: moldura circular de retrato com nível e tag de líder, descrição concisa de 1 linha para vagas abertas, divisor de diamante ◈ e botão limpo `+ Adicionar`.
  - [x] Cabeçalho compacto com brasão de espadas, título, subtítulo "Monte sua composição ideal para caçar", ícones de formação recomendada e contador `X/4 vagas`.
  - [x] Barra inferior harmoniosa com botões secundários (`Convidar Jogador`, `Autopreencher`), botão primário dourado de destaque (`⚔️ Iniciar Caçada`) e botão de desfazer grupo.

- [x] **Item 13: Retrato do Personagem Grande, Centralizado e com Réplica Exata do Outfit e Montaria (`UnifiedPartyModal.tsx`, `GamePrototype.tsx` & `globals.css`)**
  - [x] Extrair réplica autêntica completa do personagem: outfit específico (Hunter, Warrior, etc.), montaria ativa (`mount` e `mountActive`), cores customizadas (`outfitColors` / head, body, legs, feet), addons e gênero para personagem ativo, alts da conta e remotos.
  - [x] Centralização e ampliação automática no círculo: calcular bounding box dos pixels não-transparentes via canvas offscreen para posicionar e escalar o personagem e sua montaria perfeitamente centralizados e destacados na moldura circular de 72px.
  - [x] Renderização em alta resolução nítida (144x144 canvas em 72px com `image-rendering: pixelated`) sem borrões ou cortes.

- [x] **Item 14: Loading Real de Caçadas com Pré-carregamento Integral dos Monstros e Animações (`huntAssetPreloader.ts`, `ExuraLoadingScreen.tsx`, `PixiArena.tsx` & `GamePrototype.tsx`)**
  - [x] Compilar no `huntAssetPreloader` todos os frames direcionais reais (Norte, Sul, Leste, Oeste) de todos os monstros de cada masmorra (a partir de `tibia1098-combat-assets.json`), além de suportar hunts futuras dinamicamente via `initialHunts`.
  - [x] Conectar `ExuraLoadingScreen` ao `huntAssetPreloader`: a transição só conclui quando 100% dos monstros, efeitos e mapas daquela hunt estiverem baixados e cacheados em memória.
  - [x] Pré-aquecer e registrar as texturas no PixiJS para que no Frame 1 da abertura da hunt os monstros já apareçam instantaneamente desenhados e animados, sem atraso ou invisibilidade.

- [x] **Item 15: Correção do Botão ✕ de Remover Monstro do Rastreador de Bestiário (`BestiaryTrackerHUD.tsx` / `BestiaryModal.tsx` / `GamePrototype.tsx`)**
  - [x] Identificar e corrigir a falha no evento de clique do botão ✕ de remoção individual do rastreador de criaturas.
  - [x] Garantir que o evento pare a propagação (`e.stopPropagation()` / `e.preventDefault()`), atualize o estado local via `dismissedTrackerMonsterIds` e sincronize a remoção com o backend/Colyseus imediatamente.

- [x] **Item 16: Desfazer Grupo Durante Caçada com Abandono e Retorno Seguro ao Templo (`UnifiedPartyModal.tsx` & `GamePrototype.tsx`)**
  - [x] Corrigir `onDisbandParty` quando executado durante uma caçada (`mode === 'hunt'`).
  - [x] Executar o fluxo canônico de encerramento de caçada: limpar os membros da party do estado e do Colyseus, salvar progresso com segurança, reposicionar o jogador seguro no Templo de Thais (`x: 32369, y: 32241, z: 7`), restaurar `mode = 'training'`, parar BGM de caçada e habilitar Thais City normalmente sem travamento.

- [x] **Item 17: IA Tática de Posicionamento e Combate: Step-In para Magias de Curto Alcance & Alinhamento Cardinal de Waves com Knight na Box (`combat.ts`, `pathfinding.ts` & `hotbarActions.ts`)**
  - [x] 1. **Step-In & Cast (Avanço Tático para Strikes e Magias Curtas):**
    - Quando um conjurador/ranged (Sorcerer, Druid, Paladin) estiver com magia de strike ou alcance curto (como `Exori Flam`, `Exori Vis`, `Exori Hur` com range 3) sem cooldown e com mana suficiente, mas o monstro alvo estiver a 4 passos (alcance da wand/arma), a IA avança 1 SQM em direção ao alvo para entrar no range 3 e disparar a magia.
    - Após a conjuração, se o monstro tentar se aproximar ou ultrapassar a distância tática segura, a IA mantém o comportamento de kiting/recuo seguro.
  - [x] 2. **Alinhamento Cardinal Tático para Waves com Knight na Box (Line-up Tático):**
    - Quando o personagem tiver magia de wave (como `Fire Wave`, `Energy Wave`, `Ice Wave`, `Terra Wave`, etc.) configurada na hotbar e pronta/quase pronta para conjuração:
    - Se houver um Knight na party engajado com monstros ao redor (box 3x3 ou cluster de inimigos), a IA dos mages procura ativamente se posicionar em linha reta cardinal (mesmo X ou mesmo Y do Knight) a uma distância segura (ex: 2 a 4 SQMs).
    - Vira na direção do Knight e dispara a wave, atravessando a box inteira do Knight e maximizando o dano em área em 3 a 8 criaturas simultâneas sem desperdiçar ondas no vazio.