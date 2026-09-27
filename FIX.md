# MUDANÇAS & CORREÇÕES (Phase 250)

- [x] **1. Ao usar diretamente o dummy, começar com a arma/skill principal de cada classe:**
  - Druid, Sorcerer $\rightarrow$ `magicLevel`
  - Paladin $\rightarrow$ `distance`
  - Knight $\rightarrow$ maior nível entre `sword`, `axe` e `club` (desempate por tries, depois por arma melee equipada, fallback para `sword`).
  - Implementado em `packages/domain/src/training.ts` (`getDefaultTrainingSkill`), `GamePrototype.tsx` e limpos emojis no menu de contexto do dummy com lineart SVG.

- [x] **2. Z-Index e Layout do Modal de Outfit (Hotkeys cobrindo botões em telas menores):**
  - Corrigido `z-index: 100000` no backdrop e `z-index: 100001` na janela em `app/globals.css` e inline em `OutfitModal.tsx`.
  - Definido `max-height: calc(100vh - 24px)`, `overflow: hidden`, `flex-direction: column`, garantindo que o rodapé com os botões Salvar, Cancelar e a paleta de cores nunca fiquem encobertos ou fora da tela.

- [x] **3. Exibição e Seleção de Outfit Feminino para Personagens Femininos:**
  - Adicionado suporte a `gender` na interface do `OutfitModal`, no `saveCharacterProgress`, na API `/api/characters/[id]/save`, na rede `sendChangeOutfit` e na persistência Prisma.
  - O modal agora detecta o gênero do personagem e exibe os sprites canônicos femininos (`/generated/outfits/${id}-female-south-f0-base.png`) nos cards e na visualização ao vivo no Canvas, com nomes canônicos femininos (ex: `Noblewoman`).
  - Adicionado seletor visual de Gênero (♂ Masc / ♀ Fem) no titlebar do modal para troca e customização dinâmica.
