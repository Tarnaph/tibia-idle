# Phase 82: Correção de Runtime TexturePool no PixiJS v8 e Efeitos Visuais das Wands de Sorcerer

**Data de Conclusão:** 07 de Setembro de 2026  
**Status:** Complete  
**Meta da Fase:** Eliminar o crash de runtime `Cannot read properties of undefined (reading 'push')` do PixiJS v8 no retorno de texturas de texto/nameplates e restaurar os efeitos visuais canônicos de projéteis e impacto de Wands de Sorcerer (Wand of Vortex) no combate e no treino na cidade.

---

## 1. Problemas Diagnosticados & Causas Raízes

1. **Crash Crítico de Runtime PixiJS v8 (`TexturePool.returnTexture`):**
   - *Causa:* No PixiJS v8, ao destruir nós de `Text` (nameplates de personagens, flutuantes de dano e overhead speech) durante a troca ou criação de personagens, a rotina `TexturePool.returnTexture(texture)` tenta inserir a textura renderizada de volta no bucket `this._texturePool[key]`. Se o pool tiver sido limpo ou a chave não tiver sido inicializada como array, ocorre a exceção `Cannot read properties of undefined (reading 'push')`, interrompendo o ciclo de renderização e congelando a tela.
2. **Wands de Sorcerer Inoperantes / Sem Efeito Visual:**
   - *Causas Identificadas:*
     - A verificação de alcance corpo a corpo no servidor autoritativo (`ThaisCityRoom.ts`) permitia apenas Paladins atacarem a distância (`player.vocationId === 3`), impedindo Sorcerers (`vocationId === 1`) e Druids (`vocationId === 2`) de dispararem contra dummies ou monstros a mais de 1 tile de distância.
     - A skill primária de treino do Sorcerer na cidade estava mapeada erroneamente como `'sword'`.
     - Os IDs canônicos do Tibia 8.60 para projéteis de energia (`CONST_ANI_ENERGY = 5`) e impacto de energia (`CONST_ME_ENERGYHIT = 12`) estavam divergentes no disparo de wands.
     - O componente `ThaisCityArena.tsx` não carregava previamente as spritesheets de mísseis (`visualAssets.missiles`) e efeitos (`visualAssets.effects`), nem processava os `visualEvents` para instanciar as animações temporizadas de projéteis e impactos.

---

## 2. Soluções Implementadas

### A. Polyfill Universal & Blindagem do PixiJS v8
- Criado `apps/web/lib/pixiPolyfill.ts` monkey-patching `TexturePool.returnTexture` para:
  1. Garantir que `(this as any)._texturePool` e `_texturePool[key]` sejam inicializados como arrays válidos caso estejam ausentes.
  2. Envolver a devolução da textura em bloco `try/catch` à prova de falhas durante descarte de instâncias do PixiJS.
- Importado universalmente em `ThaisCityArena.tsx`, `PixiArena.tsx` e `TrainingArena.tsx`.
- Envolvidos todos os descartes de containers e instâncias de aplicação (`app.destroy(true, { children: true })`) em `try/catch` defensivos.

### B. Efeitos Canônicos de Wands & Projéteis
- Atualizado `packages/domain/src/combat.ts`:
  - Mapeado projétil canônico de energia `projectileId = 5` (`CONST_ANI_ENERGY`) para Wand of Vortex, Wand of Cosmic Energy e Starfall.
  - Mapeado efeito canônico de impacto de energia `effectId = 12` (`CONST_ME_ENERGYHIT`).
- Atualizado `packages/domain/src/training.ts`:
  - Configurado para emitir projéteis e efeitos visuais correspondentes à arma equipada durante o treino de `magicLevel` nos dummies.
- Atualizado `packages/domain/src/party.ts`:
  - Definido `targetDistance = 2` para vocações mágicas (Sorcerer e Druid), permitindo que iniciem combate à distância nativamente.

### C. Servidor Autoritativo (`ThaisCityRoom.ts`)
- Suporte a ataque à distância para vocações mágicas (`vocationId === 1 || 2 || 3`) com raio de alcance até 4 tiles.
- Corrigida a evolução primária de Sorcerer para treinar `magicLevel`.
- Estendido `pushCombatEvent` com `projectileId`, `effectId`, `fromX` e `fromY`.

### D. Renderização e Preload na Cidade (`ThaisCityArena.tsx`)
- Pré-carregamento automático de todas as animações de projéteis (`visualAssets.missiles`) e impactos (`visualAssets.effects`) em `allUrls`.
- Implementado buffer `timedCityVisuals` que interpola linearmente a trajetória do míssil da posição do jogador até o alvo (dummy ou monstro) e reproduz as sprites do impacto.

---

## 3. Verificação & Qualidade

- **TypeScript (`npm run typecheck`):** 0 erros.
- **Suíte de Testes Automatizados (`npm run test`):**
  - Total: **85 test suites aprovadas (466 testes passando)**, incluindo a nova suíte `tests/phase82-pixi-cleanup-and-sorcerer-wand.test.ts`.
- **Compatibilidade Retroativa:** Preservada compatibilidade integral com `tests/phase57-bugfixes-visual-parity.test.ts` e `tests/continuous-hunt.test.ts`.
