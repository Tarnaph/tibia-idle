# Phase 136: Inspeção de Habilidades e Estatísticas no Avatar e Limpeza da Barra de Ações Superior

## Contexto & Objetivos
O usuário solicitou uma limpeza visual nos botões da barra superior de ações (`WindowDockBar`) e a criação de uma janela/popover suspenso de inspeção rápida do personagem ao passar o mouse sobre o avatar (e/ou clicar), em total conformidade com a imagem de referência fornecida (`media_1789165875834.png`).

## Requisitos de Implementação

### 1. Limpeza dos Botões da Barra Superior (`WindowDockBar.tsx`):
- Remover da grid de ações do canto superior direito (`huntera-actions-grid`):
  1. Ícone de Skills (`onOpenSkills`).
  2. Ícone de Equipamentos e Armadura (`toggleWindow('equipment')`).
  3. Ícone de Montaria (`mount-btn`).
  4. Ícone de Customizar Aparência / Outfit (`outfit-btn`).
  5. Ícone de Organizar Janelas / Reset Layout (`resetLayout`).
- Manter acessibilidade:
  - Atalhos de teclado `U` (outfit) e `Ctrl+R` (montaria) continuam plenamente funcionais no `GamePrototype.tsx`.
  - Ação de "Organizar Janelas / Reset Layout" é incorporada com elegância ao menu dropdown de configurações (⚙️).
  - Janela completa de Skills continua acessível clicando nas habilidades ou através do card de personagem.

### 2. Cabeçalho do Perfil ao lado do Avatar:
- Nome do Personagem em destaque dourado/âmbar (`#f3b749`, bold, uppercase).
- Subtítulo com Vocação e Nível em ciano/azul (`#5ca2e8`, bold, uppercase, ex: `ELITE KNIGHT  LV 266`).
- Badge arredondada de bônus de XP (`XP +5%`).

### 3. Tooltip & Card Flutuante de Inspeção de Personagem (Hover/Click no Avatar):
- Tooltip com a etiqueta `"Personagem"` ao passar o mouse sobre o avatar.
- Popover escuro com design premium (`#10141e`), sombras profundas e borda sutil.
- **Cabeçalho:** Nome do Personagem, Vocação + Nível e tag de status (`GRÁTIS` ou `PREMIUM`).
- **Barras de Recursos:**
  - Vida (Hit Points): barra em degradê rosa/vermelho (`#de4a6e`) e contagem textual `currentHp / maxHp`.
  - Mana: barra em degradê azul (`#4b77be`) e contagem textual `currentMana / maxMana`.
  - Experiência / Nível: barra em degradê dourado (`#c9933b`) e porcentagem calculada (`experienceProgress * 100`%).
- **Grid de Habilidades (7 Skills):**
  - Linha 1: Fist (✊), Club (🔨), Sword (⚔️), Axe (🪓) com seus respectivos valores.
  - Linha 2: Distance (🏹), Shielding (🛡️), Magic Level (🔮) com seus respectivos valores.
- **Resumo de Combate (3 Colunas):**
  - `DANO`: faixa de dano (min - max) em destaque dourado.
  - `ARMADURA`: valor de armadura do personagem em branco/cinza claro.
  - `DEFESA`: valor de defesa do personagem em branco/cinza claro.
- **Informações Extras:**
  - `DANO BESTIÁRIO`: `+0%` (verde/âmbar).
  - `COMPARTILHAR EXP`: faixa de level share calculada pela fórmula clássica do Tibia (`Math.ceil(level * 2 / 3)` a `Math.floor(level * 3 / 2)`).

### 4. Integração no `GamePrototype.tsx`:
- Passar `character={activeCharacter}` e `stats={activeStats}` para o `<WindowDockBar />`.

### 5. Verificação & Testes:
- Criar suíte de testes `tests/phase136-avatar-skills-inspect-and-dock-cleanup.test.ts`.
- Ajustar asserções de `tests/phase134-mount-and-outfit-reloading-fix.test.ts`.
- Validar typecheck (`npm run typecheck`) com 0 erros.
- Validar testes (`npm test`) com 100% de aprovação.
