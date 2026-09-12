# Phase 147 Summary: Organização Oficial de Assets, Diretório Canônico e Otimização de Loading

**Phase:** Phase 147
**Status:** Complete
**Date:** 2026-09-12
**Commit:** feat(assets): official assets directory, canonical resolvers, agents rule and fast loading

---

## 🎯 Objetivos Realizados

1. **Pasta Oficial e Junções de Assets (`public/assets/`)**:
   - Criação da pasta oficial unificada `public/assets/` categorizada em 11 subdiretórios canônicos:
     - `public/assets/items/`: 22.181 itens extraídos do Cyclopedia (`item-${id}.png`).
     - `public/assets/spells/`: Todos os ícones canônicos e oficiais de magias.
     - `public/assets/runes/`: Ícones oficiais de runas.
     - `public/assets/potions/`: Ícones oficiais de poções e elixires.
     - `public/assets/mounts/`: Montarias em todas as direções e frames de animação.
     - `public/assets/monsters/`: Sprites de criaturas e chefes do bestiário.
     - `public/assets/outfits/`: Sprites de corpo e máscaras coloríveis de trajes.
     - `public/assets/outfit-thumbs/`: Miniaturas de seleção de trajes.
     - `public/assets/hunts/`: Artes temáticas de fundo de cada área de caça.
     - `public/assets/avatars/`: Avatares de exibição e perfil do jogador.
     - `public/assets/loading/`: Backgrounds e molduras douradas da tela de loading.
   - Implementação de `scripts/ensure-asset-junctions.cjs` conectado ao `postinstall` e `npm run setup:assets` do `package.json`.

2. **Regra de Consulta para o Agente e Atualização de `AGENTS.md`**:
   - Criação de `.agents/rules/asset-paths.md` contendo tabela completa de caminhos, convenções e regras de fallback.
   - Atualização de `AGENTS.md` com a Seção 6 ("Diretriz de Imagens, Sprites e Assets Visuais").

3. **Módulo Central de Resolução (`apps/web/lib/assetPaths.ts`)**:
   - Funções utilitárias exportadas: `getCanonicalItemUrl`, `getCanonicalSpellUrl`, `getCanonicalRuneUrl`, `getCanonicalPotionUrl`, `getCanonicalMonsterUrl`, `getCanonicalHuntUrl`, `getCanonicalAvatarUrl` e constantes `ASSET_BASE_DIRS`.

4. **Carregamento Rápido (~2.5s) e Pulo Instantâneo na Tela de Loading**:
   - `ExuraLoadingScreen.tsx` calibrada para transição rápida de ~2.5s no primeiro login.
   - Suporte a pulo instantâneo (`handleSkip`) via clique em qualquer lugar da tela ou teclas (Space, Enter, Escape).
   - `assetPreloader.ts` otimizado com concorrência para 32 workers, timeouts estritos por imagem (350ms) e timeout global de segurança de 2200ms (`markComplete()`).

5. **Resiliência e Fallback nos Componentes Visuais**:
   - `ItemSprite.tsx`: Resolução resiliente com fallback para os 22.181 itens do Cyclopedia e manipulador `onError` automático.
   - `HuntCard.tsx`: Resolução para monstros do bestiário e manipulador `onError` para `/assets/monsters/`.

---

## 🧪 Verificação e Qualidade

- **TypeScript (`npm run typecheck`)**: 0 erros.
- **Vitest (`tests/phase147-official-asset-directory-and-fast-loading.test.ts`)**: 10 passed (100%).
- **Suíte Completa (`npm run test`)**: 147 arquivos de teste aprovados (887 testes individuais, 0 falhas).
