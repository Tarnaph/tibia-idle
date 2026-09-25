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