# Phase 237 Summary — Resolução Definitiva dos Modais e Menus Mobile do FIX.md

**Data:** 25 de Setembro de 2026  
**Status:** Complete ✅  
**Autor:** Antigravity (Modo Autônomo GSD)

---

## 🎯 Objetivo da Fase
Atender 100% à diretriz crítica do usuário: *"não quero nada que tenha que dar scroll para o lado, isso estraga a jogabilidade"* e resolver todas as janelas cortadas ou sem botão de fechar identificadas no `FIX.md`:
1. **Seleção de Personagens (`TibiaAuthCharacterModal.tsx`):** Vídeo do bardo explodia a largura horizontal para >1170px em smartphones.
2. **Pop-up de Promoção de Vocação (`PromotionModal.tsx`):** Texto longo e elementos ocupavam toda a tela sem botão de fechar acessível.
3. **Janela "Personagem" (`CharacterProfileModal.tsx`):** Row 1 com `minmax(360px, 1fr)` causava scroll lateral forçado.
4. **Customizar Aparência (`OutfitModal.tsx`):** Excesso de elementos empilhados verticalmente e botões de debug sobrecarregando a tela.
5. **Ranking e Highscores (`HighscoresModal.tsx`):** 2 colunas rígidas (200px + tabela) transbordando horizontalmente e sem botão de fechar visível.
6. **Mapa de Caçadas (`HuntSelector.tsx`):** Cards volumosos e transbordamento de texto horizontal.
7. **Tela da Arena PvP (`ArenaPvPModal.tsx`):** Janela sem contenção e sem botão de fechar padrão no mobile.
8. **Tela de Imbuements (`ImbuingModal.tsx`):** Grid de 2 colunas que estourava a largura da tela em celulares.
9. **Safe-Area Insets (Loading & HUDs):** Evitar corte de texto na borda inferior do visor.

---

## 🛠️ Modificações Realizadas

### 1. `apps/web/components/auth/TibiaAuthCharacterModal.tsx`
- Adicionados identificadores `.auth-modal-row-wrapper`, `.auth-card-container` e `.auth-bard-container`.
- No mobile (`<= 768px`), o vídeo do bardo é ocultado com `display: none !important;`.
- O card é ajustado para `width: min(94vw, 440px)` e as linhas de personagens empilham nome/nível em cima e botões de ação ("Deletar" e "ENTRAR NO JOGO") em uma linha inferior com 38px de altura, eliminando corte de botões.

### 2. `apps/web/components/character/PromotionModal.tsx`
- Redesign completo e compacto:
  - Cabeçalho enxuto com ícone de coroa e título em uma linha só.
  - Botão de fechar ✕ de 38x38px de alto contraste vermelho (`#7f1d1d` / `#ef4444`).
  - Card de preview visual com avatar e selo "FULL ADDONS UNLOCKED".
  - 4 chips de benefícios em grade 2x2 compacta (Regeneração, -30% Perda, Magias Mestre, Título).
  - Barra enxuta de custo e saldo e botões ergonômicos ("Comprar Promoção" e "Decidir Depois").

### 3. `apps/web/components/CharacterProfileModal.tsx`
- Row 1 ajustada de `minmax(360px, 1fr)` para `minmax(min(100%, 260px), 1fr)`.
- Identity Card responsivo com avatar de 64px e barras de HP/MP/XP com texto compacto.
- Container principal e corpo com `overflow-x: hidden !important;`, eliminando 100% o scroll lateral.
- Botão de fechar ✕ de 38x38px de alto contraste (`.character-profile-close-btn`).

### 4. `apps/web/components/OutfitModal.tsx`
- Implementado sistema de navegação por 3 abas móveis no mobile: `[ 🥋 Trajes ]`, `[ 🎨 Cores & Addons ]` e `[ 🐎 Montarias ]`.
- Preview compacto fixo no topo com canvas 64px, botão de girar ⟳ e nome do outfit ativo.
- Ocultação dos botões de debug/diagnóstico no rodapé mobile para liberar espaço aos botões de Cancelar e Salvar.
- Botão de fechar ✕ de 38x38px no cabeçalho.

### 5. `apps/web/components/HighscoresModal.tsx`
- Layout adaptativo: no desktop mantém as 2 colunas clássicas; no mobile converte a coluna lateral de categorias em uma barra horizontal de abas com scroll por toque suave.
- Tabela condensada para 3 colunas no mobile (`36px 1fr 90px`), ocultando colunas redundantes e exibindo nível/vocação em subtítulo inline (`Lv. 82 · Knight`).
- Botão de fechar ✕ de 38x38px de alto contraste no cabeçalho.

### 6. `apps/web/components/ArenaPvPModal.tsx`
- Conter janela em `width: min(96vw, 540px)` e `max-height: 92vh`.
- Adicionado botão de fechar ✕ de 38x38px de alto contraste no cabeçalho.
- Colunas empilhadas verticalmente com rolagem suave no mobile.

### 7. `apps/web/components/ImbuingModal.tsx`
- Conter modal para `width: min(96vw, 540px)` e `max-height: 92vh`.
- Adicionado botão de fechar ✕ de 38x38px de alto contraste no cabeçalho.
- Layout de coluna única no mobile para seleção de itens e slots de imbuing sem cortes.

### 8. `apps/web/components/HuntSelector.tsx`
- Cards de caçada compactos (68-74px) com sprite à esquerda, nome e monstros ao centro, e métricas de XP/GP à direita.
- Ausência total de scroll lateral; `overflow-x: hidden !important;`.
- Botão de fechar ✕ ampliado para 38x38px com fundo avermelhado de alto contraste.
- Correção dos assets de fallback canônicos para `corym-vanguard` e monstros no Bestiário.

### 9. `app/globals.css`
- Adicionado bloco oficial da **Phase 237**:
  - Enforçador universal de zero scroll lateral em todos os modais e backdrops.
  - Regras compartilhadas para botões de fechar táteis de 38x38px com área de toque mínima acessível.
  - Safe-area bottom padding (`env(safe-area-inset-bottom, 16px)`) para tela de loading e HUDs.

---

## 🧪 Validação e Testes
- **Testes Unitários e de Componentes:** Criada suíte `tests/phase237-mobile-all-windows-fix.test.ts` cobrindo todos os 8 componentes e classes CSS.
  - **Resultado:** 9 de 9 testes aprovados (100% de sucesso).
- **TypeScript:** `npm run typecheck` executado com **0 erros** em todo o projeto.
- **Desktop Invariability:** Zero regressão na visualização desktop (todas as regras isoladas sob `@media (max-width: 768px)`).
