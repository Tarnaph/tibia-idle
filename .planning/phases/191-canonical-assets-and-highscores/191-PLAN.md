# Phase 191: Assets Canônicos de Blessings/Imbuements, Botões de Ação e Sistema de Highscores

## 🎯 Objetivo
Integrar os sprites e charms canônicos oficiais da CipSoft nas telas de Blessings (`item-11258` a `item-11262`) e Imbuements (itens de criaturas reais e runas), adicionar os botões de controle de "PVP" e "RANKING" no HUD, e construir a tela completa de Highscores com backend autoritativo ordenado, filtros por vocação, paginação e medalhas para os 3 primeiros colocados.

---

## 📋 Planos de Execução

### Plan 191-01: Sprites Canônicos de Blessings e Imbuements
- Atualizar `apps/web/components/BlessingsModal.tsx` para usar os Charms Canônicos oficiais:
  - `11262` (The Wisdom of Solitude)
  - `11258` (The Spark of the Phoenix)
  - `11261` (The Fire of the Suns)
  - `11260` (The Spiritual Shielding)
  - `11259` (The Embrace of Tibia)
- Atualizar `apps/web/components/imbuements/ImbuingModal.tsx` para utilizar os itens reais de criaturas e ícones de atributos canônicos.

### Plan 191-02: Botões de Ação no HUD (PVP e RANKING)
- Adicionar botões `RANKING` e `ARENA PVP` no `BottomDock.tsx` e `QuickActionDock.tsx` com callbacks dedicados.

### Plan 191-03: API Autoritativa de Highscores (`/api/highscores`)
- Criar endpoint REST `/api/highscores` com suporte a:
  - Categorias: `level`, `magic`, `melee` (`sword`/`axe`/`club`), `distance`, `shielding`, `fist`, `bosses`, `bestiary`, `deaths`.
  - Filtro por vocação: `all`, `knight`, `paladin`, `sorcerer`, `druid`.
  - Paginação eficiente (`page`, `pageSize = 25`, contagem total de jogadores).
  - Identificação da posição do jogador atual para o botão "Minha posição".

### Plan 191-04: Componente de Interface `HighscoresModal.tsx`
- Construir a janela com alta fidelidade visual baseada no anexo fornecido:
  - Barra lateral com abas de categoria.
  - Dropdown com filtro de vocação.
  - Tabela com medalhas circulares estilizadas (#1 Ouro, #2 Prata, #3 Bronze).
  - Badges coloridos de vocação (`[Druid]`, `[Sorcerer]`, etc.).
  - Botão "Minha posição" e controles de navegação de páginas `[ < ] 1 / 8 [ > ]`.
  - Integração no `GamePrototype.tsx`.

### Plan 191-05: Testes, Typecheck e Deploy na VPS
- Testes automatizados no Vitest cobrindo a ordenação e paginação da API de highscores.
- Validação TypeScript (0 erros).
- Commit convencional e deploy na VPS 187.7.16.210.
